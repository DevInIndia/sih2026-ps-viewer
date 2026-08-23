/**
 * URL handling for links that come out of the scraped dataset.
 *
 * Everything the portal supplies is treated as hostile input. A link is only
 * ever rendered as an anchor after `safeHref` has parsed it and confirmed it is
 * an ordinary http(s) URL — which is what stops a `javascript:` or
 * `data:text/html` payload in a Dataset Link field from becoming a clickable
 * script.
 */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/** Longest first, so `gov.in` wins over `in` when both could match. */
const TLDS = [
  "gov.in",
  "nic.in",
  "res.in",
  "ac.in",
  "org.in",
  "edu.in",
  "co.in",
  "net.in",
  "com",
  "org",
  "net",
  "edu",
  "gov",
  "int",
  "dev",
  "app",
  "info",
  "ai",
  "io",
  "co",
  "in",
];

/**
 * Matches an explicit URL, or a bare hostname with a recognised TLD.
 *
 * The bare-hostname half only runs against the Dataset Link and Youtube fields,
 * where the portal routinely writes `tkdl.res.in` with no scheme. It is never
 * applied to description prose, where an unspaced sentence ("…the model.Data
 * shows…") could otherwise be mistaken for a domain.
 */
const LINK_RE = new RegExp(
  [
    // scheme-qualified
    "(?:https?:\\/\\/|www\\.)[^\\s<>\"'`()\\[\\]{}]+",
    // bare host + optional path
    `(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+(?:${TLDS.join("|")})\\b(?:\\/[^\\s<>"'\`()\\[\\]{}]*)?`,
  ].join("|"),
  "gi",
);

/** Trailing sentence punctuation is almost never part of the URL. */
const TRAILING_JUNK = /[.,;:!?)\]}>'"`]+$/;

/**
 * Normalise a candidate link and return a safe `href`, or `null` to refuse it.
 *
 * Refused: any non-http(s) scheme (`javascript:`, `data:`, `file:`, `vbscript:`),
 * URLs carrying embedded credentials (`https://user:pass@host` — a classic
 * phishing disguise), and anything `URL` cannot parse.
 */
export function safeHref(candidate: string): string | null {
  const trimmed = candidate.trim();
  if (!trimmed || trimmed.length > 2048) return null;

  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed.replace(/^\/+/, "")}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null;
  if (url.username || url.password) return null;
  if (!url.hostname || !url.hostname.includes(".")) return null;

  return url.toString();
}

/** Host shown next to a link, e.g. `idd.insaan.iiit.ac.in`. */
export function hostOf(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; href: string };

export type LinkItem = {
  /** `"•"` only when this part was actually bulleted in the source. */
  marker: string | null;
  segments: Segment[];
};

/** Split one line into plain-text and verified-link segments. */
export function toSegments(line: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;

  LINK_RE.lastIndex = 0;
  for (let m = LINK_RE.exec(line); m !== null; m = LINK_RE.exec(line)) {
    const raw = m[0].replace(TRAILING_JUNK, "");
    if (!raw) continue;

    const start = m.index;
    const href = safeHref(raw);

    if (start > cursor) {
      segments.push({ kind: "text", text: line.slice(cursor, start) });
    }
    if (href) {
      segments.push({ kind: "link", text: raw, href });
    } else {
      // Not a link we are willing to render — keep the characters as text so
      // nothing is silently lost from the record.
      segments.push({ kind: "text", text: raw });
    }
    cursor = start + raw.length;
  }

  if (cursor < line.length) {
    segments.push({ kind: "text", text: line.slice(cursor) });
  }
  return segments.length ? segments : [{ kind: "text", text: line }];
}

/**
 * Turn a Dataset Link / Youtube Link blob into renderable items.
 *
 * The portal packs several references into one cell, separated by `<br>` or by
 * `&#8226;` bullets; `unmangle` has already turned those into newlines and `•`
 * by the time this runs.
 */
export function toLinkItems(cleanText: string): LinkItem[] {
  return cleanText
    .split(/\n+|(?=•\s)/)
    .map((part) => {
      const trimmed = part.trim();
      // Keep the distinction: the portal often writes a lead-in sentence and
      // *then* a bulleted list, so only the bulleted parts get a marker.
      const bulleted = /^[•●▪‣*]\s*/.test(trimmed);
      const text = trimmed.replace(/^[•●▪‣*]\s*/, "").trim();
      return { bulleted, text };
    })
    .filter((part) => part.text.length > 0)
    .map(({ bulleted, text }) => ({
      marker: bulleted ? "•" : null,
      segments: toSegments(text),
    }));
}
