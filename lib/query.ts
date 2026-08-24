/**
 * Keyword query parsing and matching.
 *
 * The first version of this searched with `haystack.includes(term)`, which made
 * short acronyms useless: "rag" matched *frag*ile and sto*rag*e, "ar" matched
 * all 226 records through sm*ar*t. Terms are now anchored to word starts, which
 * keeps prefix search ("drone" finds "drones") without matching mid-word.
 *
 * Supported syntax:
 *   drone mapping        both terms must appear (AND)
 *   "flash flood"        exact phrase
 *   -blockchain          exclude
 *   org:isro             restrict a term to one field
 *   theme:"smart edu"    the two combine
 */

export const QUERY_FIELDS = [
  "ps",
  "title",
  "org",
  "dept",
  "theme",
  "cat",
] as const;

export type QueryField = (typeof QUERY_FIELDS)[number];

/** Aliases so the obvious spelling works. */
const FIELD_ALIASES: Record<string, QueryField> = {
  ps: "ps",
  id: "ps",
  no: "ps",
  title: "title",
  name: "title",
  org: "org",
  organisation: "org",
  organization: "org",
  ministry: "org",
  dept: "dept",
  department: "dept",
  theme: "theme",
  cat: "cat",
  category: "cat",
  type: "cat",
};

export type QueryTerm = {
  /** Folded, lowercase text to look for. */
  value: string;
  /** A phrase came from quotes; internal whitespace matches loosely. */
  phrase: boolean;
  /** `-term` — the record must NOT match. */
  negated: boolean;
  /** `org:isro` — restrict to one field; null searches everything. */
  field: QueryField | null;
};

export type ParsedQuery = {
  terms: QueryTerm[];
  /** True when the raw text held something we could not turn into a term. */
  incomplete: boolean;
};

/** Hard caps keep a pathological query from producing pathological work. */
export const MAX_QUERY_LENGTH = 160;
const MAX_TERMS = 12;
const MAX_TERM_LENGTH = 64;

/**
 * Case-fold and strip diacritics so "kvatha" finds "Kvātha".
 *
 * NFKD also decomposes ligatures and compatibility forms, which the portal's
 * copy-pasted text contains in places.
 */
export function fold(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Split a raw query box value into terms.
 *
 * Deliberately forgiving: an unclosed quote is treated as a phrase running to
 * the end of the input, and a bare `-` or `org:` with nothing after it is
 * dropped rather than rejected — people type queries left to right, and the
 * results should not blank out mid-keystroke.
 */
export function parseQuery(raw: string): ParsedQuery {
  const text = fold(raw.slice(0, MAX_QUERY_LENGTH));
  const terms: QueryTerm[] = [];
  let incomplete = false;

  let i = 0;
  while (i < text.length && terms.length < MAX_TERMS) {
    const ch = text[i]!;

    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    let negated = false;
    if (ch === "-") {
      negated = true;
      i += 1;
      if (i >= text.length) {
        incomplete = true;
        break;
      }
    }

    // field:
    let field: QueryField | null = null;
    const fieldMatch = /^([a-z]+):/.exec(text.slice(i));
    if (fieldMatch) {
      const candidate = FIELD_ALIASES[fieldMatch[1]!];
      if (candidate) {
        field = candidate;
        i += fieldMatch[0].length;
        if (i >= text.length) {
          incomplete = true;
          break;
        }
      }
    }

    let value: string;
    let phrase = false;

    if (text[i] === '"') {
      phrase = true;
      const close = text.indexOf('"', i + 1);
      if (close === -1) {
        value = text.slice(i + 1);
        incomplete = true;
        i = text.length;
      } else {
        value = text.slice(i + 1, close);
        i = close + 1;
      }
    } else {
      const rest = text.slice(i);
      const end = /\s/.exec(rest);
      value = end ? rest.slice(0, end.index) : rest;
      i += value.length;
    }

    value = value.trim().slice(0, MAX_TERM_LENGTH);
    if (!value) {
      incomplete = true;
      continue;
    }
    terms.push({ value, phrase, negated, field });
  }

  return { terms, incomplete };
}

export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * A term matches at the start of a word.
 *
 * `\b` is not used: it is defined on `[A-Za-z0-9_]`, so it behaves
 * unhelpfully for terms that begin with a digit or symbol. An explicit
 * "start of string, or preceded by a non-alphanumeric" is predictable for
 * everything the dataset contains, including "3d", "5g" and "c++".
 */
export function termPattern(term: QueryTerm, flags = ""): RegExp {
  const body = escapeRegExp(term.value).replace(/\s+/g, "\\s+");
  return new RegExp(`(?:^|[^a-z0-9])(${body})`, flags);
}

/** Regex used to paint matches onto the original, unfolded text. */
export function highlightPattern(terms: QueryTerm[]): RegExp | null {
  const bodies = terms
    .filter((t) => !t.negated && t.value.length > 0)
    .sort((a, b) => b.value.length - a.value.length)
    .map((t) => escapeRegExp(t.value).replace(/\s+/g, "\\s+"));

  if (!bodies.length) return null;
  return new RegExp(`(?:^|[^a-z0-9])(${bodies.join("|")})`, "gi");
}
