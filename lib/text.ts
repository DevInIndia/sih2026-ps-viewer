/**
 * Text normalisation for the scraped portal fields.
 *
 * The SIH portal stores several fields with HTML that was escaped twice, so the
 * scrape faithfully captures literal `<br>` and `&#8226;` as *text*. This module
 * turns that back into readable plain text.
 *
 * Every function here returns a **string**, never markup. The result is handed
 * to React as a text child, so even if the portal ever served an actual
 * `<script>` payload it would be displayed, not executed. No scraped value is
 * ever passed to `dangerouslySetInnerHTML` anywhere in this app — the single
 * use of that API is the fixed theme-bootstrap literal in app/layout.tsx.
 */

/** Named entities the portal actually emits, plus the usual suspects. */
const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ensp: " ",
  emsp: " ",
  thinsp: " ",
  shy: "",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  bull: "•",
  middot: "·",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  sbquo: "‚",
  bdquo: "„",
  prime: "′",
  Prime: "″",
  deg: "°",
  micro: "µ",
  plusmn: "±",
  times: "×",
  divide: "÷",
  frac12: "½",
  frac14: "¼",
  sup2: "²",
  sup3: "³",
  copy: "©",
  reg: "®",
  trade: "™",
  euro: "€",
  pound: "£",
  yen: "¥",
  rarr: "→",
  larr: "←",
  harr: "↔",
  ge: "≥",
  le: "≤",
  ne: "≠",
  eacute: "é",
  egrave: "è",
  agrave: "à",
  ntilde: "ñ",
  ouml: "ö",
  uuml: "ü",
  auml: "ä",
};

const ENTITY_RE = /&(#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[a-zA-Z][a-zA-Z0-9]{1,31});/g;

/**
 * Decode HTML entities without touching the DOM.
 *
 * A DOM-based decoder (`innerHTML = s; return textContent`) is the common
 * shortcut and is a latent XSS sink — an `<img onerror>` in the input fires
 * during the assignment. This is a pure string transform, and code points are
 * range-checked so a malformed `&#1114112;` cannot throw out of a render.
 */
export function decodeEntities(input: string): string {
  if (!input || input.indexOf("&") === -1) return input;

  return input.replace(ENTITY_RE, (match, body: string) => {
    if (body.charCodeAt(0) === 35 /* # */) {
      const isHex = body[1] === "x" || body[1] === "X";
      const digits = isHex ? body.slice(2) : body.slice(1);
      const code = Number.parseInt(digits, isHex ? 16 : 10);

      if (!Number.isFinite(code)) return match;
      // Reject noncharacters, lone surrogates and C0/C1 controls (except the
      // whitespace we actually want to keep).
      if (code > 0x10ffff) return match;
      if (code >= 0xd800 && code <= 0xdfff) return match;
      if (code < 0x20 && code !== 0x09 && code !== 0x0a) return " ";
      if (code >= 0x7f && code <= 0x9f) return " ";

      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }

    const named = NAMED_ENTITIES[body];
    return named === undefined ? match : named;
  });
}

/** Block-level tags whose removal should leave a line break behind. */
const BLOCK_TAG_RE =
  /<\s*\/?\s*(?:br|p|div|li|tr|h[1-6]|hr|blockquote|table|ul|ol)\b[^<>]*>/gi;
/** Any remaining HTML-looking tag. Linear time: `[^<>]*` cannot backtrack. */
const ANY_TAG_RE = /<\s*\/?\s*[a-zA-Z][a-zA-Z0-9-]*(?:\s[^<>]*)?\/?>/g;
/**
 * The portal truncates Dataset Link cells at ~350 characters, which regularly
 * chops a tag in half and leaves a dangling `<br` at the end of the value. It
 * has no closing `>`, so the tag patterns above cannot see it.
 */
const DANGLING_TAG_RE = /<\s*\/?\s*[a-zA-Z][a-zA-Z0-9-]*(?:\s[^<>]*)?$/;

/**
 * Undo the portal's double-escaped markup and return clean plain text.
 *
 * The stored JSON is left untouched by this — the "raw scraped record" panel in
 * the detail view still shows exactly what the scraper captured.
 */
export function unmangle(input: string | null | undefined): string {
  if (!input) return "";

  let out = String(input);
  out = out.replace(BLOCK_TAG_RE, "\n");
  out = out.replace(ANY_TAG_RE, "");
  out = out.replace(DANGLING_TAG_RE, "");
  out = decodeEntities(out);

  return out
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* --------------------------------------------------------------- prose ---- */

export type ProseBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: { marker: string | null; text: string }[] };

/**
 * A line is a section heading only if it is a short label ending in a colon.
 * Descriptions are full of lead-in sentences that also end in a colon
 * ("A scalable platform with:"), so cap the word count and reject openers that
 * mark a continuing sentence rather than a new section.
 */
const HEAD_RE = /^[•●\-*]?\s*([A-Z][^.!?]{2,58}):$/;
const HEAD_STOP =
  /^(a|an|the|this|these|those|it|they|we|you|our|its|following|below|include|includes|including)\b/i;

function headingOf(line: string): string | null {
  const m = HEAD_RE.exec(line);
  if (!m || !m[1]) return null;
  const core = m[1].trim();
  if (core.split(/\s+/).length > 5) return null;
  if (HEAD_STOP.test(core)) return null;
  return core;
}

/** `•`, `-`, `a.`, `a)`, `(a)`, `1.`, `1)` — the markers the portal actually uses. */
const BULLET_RE =
  /^(?:([•●▪‣*]|[-–—])\s+|\(?([a-zA-Z]|\d{1,2})[.)]\s+)/;

function bulletOf(line: string): { marker: string; text: string } | null {
  const m = BULLET_RE.exec(line);
  if (!m) return null;
  const text = line.slice(m[0].length).trim();
  if (!text) return null;
  // A glyph bullet renders as a dot; a lettered/numbered marker carries meaning
  // ("a. Collect …" is referenced elsewhere in the brief), so keep it visible.
  const marker = m[1] ? "•" : `${m[2]}.`;
  return { marker, text };
}

/**
 * Split a description into headings, paragraphs and lists.
 *
 * Conservative by design: a run of bullet lines only becomes a list when there
 * are at least two of them, so a paragraph that happens to open with "a." is
 * left alone.
 */
export function toProse(text: string | null | undefined): ProseBlock[] {
  const clean = unmangle(text);
  if (!clean) return [];

  const lines = clean.split("\n");
  const blocks: ProseBlock[] = [];

  let paragraph: string[] = [];
  let bullets: { marker: string; text: string }[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ kind: "paragraph", text: paragraph.join("\n") });
      paragraph = [];
    }
  };
  const flushBullets = () => {
    if (bullets.length >= 2) {
      blocks.push({ kind: "list", items: bullets });
    } else if (bullets.length === 1) {
      const only = bullets[0]!;
      paragraph.push(`${only.marker} ${only.text}`);
    }
    bullets = [];
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      flushBullets();
      flushParagraph();
      continue;
    }

    const bullet = bulletOf(line);
    if (bullet) {
      flushParagraph();
      bullets.push(bullet);
      continue;
    }
    flushBullets();

    const heading = headingOf(line);
    if (heading) {
      flushParagraph();
      blocks.push({ kind: "heading", text: heading });
      continue;
    }

    paragraph.push(line);
  }

  flushBullets();
  flushParagraph();

  return blocks;
}

/* -------------------------------------------------------------- search ---- */

/** Hard caps keep a pathological query from producing a pathological regex. */
const MAX_TERMS = 8;
const MAX_TERM_LENGTH = 64;
export const MAX_QUERY_LENGTH = 120;

/** Normalise a raw query box value into the terms used for AND-matching. */
export function tokenize(query: string): string[] {
  return query
    .slice(0, MAX_QUERY_LENGTH)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.slice(0, MAX_TERM_LENGTH))
    .slice(0, MAX_TERMS);
}

export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build the alternation used to highlight matches.
 *
 * Every term is escaped (so a query of `.*` matches a literal `.*`), single
 * characters are skipped to avoid marking up half the page, and longer terms
 * sort first so overlapping matches prefer the more specific one.
 */
export function highlightPattern(terms: string[]): RegExp | null {
  const useful = terms
    .filter((t) => t.length > 1)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);
  if (!useful.length) return null;
  return new RegExp(`(${useful.join("|")})`, "gi");
}
