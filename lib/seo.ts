import { unmangle } from "./text";

/**
 * Helpers for building page metadata out of the scraped text.
 *
 * The portal's titles run past 200 characters and its descriptions open with a
 * bare "Background:" label, so neither can be used verbatim. Everything here is
 * a pure transform of existing content — nothing is invented, and no keywords
 * are inserted.
 */

/** Google renders roughly this much of each before truncating. */
export const META_TITLE_LENGTH = 60;
export const META_DESCRIPTION_LENGTH = 160;

/**
 * A leading section label carries no information in a search result: the
 * description should start with the sentence that follows it.
 */
const SECTION_LABEL =
  /^(background|description|overview|context|introduction|problem statement)\s*[:–—-]\s*/i;

/** Trailing punctuation left dangling by a cut. */
const TRAILING_PUNCTUATION = /[\s.,;:!?–—/|•·-]+$/;

/**
 * Tidy the end of a truncated string.
 *
 * As well as trailing punctuation, this drops a final token carrying no letters
 * or digits: the portal's briefs are full of bullet glyphs, and a cut that
 * lands just past one leaves a description ending on a stray "•".
 */
function trimTail(text: string): string {
  let out = text.replace(TRAILING_PUNCTUATION, "");
  for (;;) {
    const match = /\s(\S+)$/.exec(out);
    if (!match?.[1] || /[\p{L}\p{N}]/u.test(match[1])) break;
    out = out.slice(0, match.index).replace(TRAILING_PUNCTUATION, "");
  }
  return out;
}

/**
 * Shorten to `max` characters without splitting a word.
 *
 * Falls back to a hard cut only if the text has no space in its second half —
 * a single very long token — which would otherwise collapse the result to
 * almost nothing.
 */
export function clampWords(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;

  const window = clean.slice(0, max + 1);
  const lastSpace = window.lastIndexOf(" ");
  const body = lastSpace > max / 2 ? window.slice(0, lastSpace) : clean.slice(0, max);

  return `${trimTail(body)}…`;
}

/**
 * Build a meta description from a problem statement's brief.
 *
 * `fallback` is used when the portal published no description, which it does
 * for a handful of the AICTE "Student Innovation" slots.
 */
export function metaDescription(description: string, fallback: string): string {
  const clean = unmangle(description)
    .replace(/\s+/g, " ")
    .replace(SECTION_LABEL, "")
    .trim();

  return clampWords(clean || fallback, META_DESCRIPTION_LENGTH);
}

/**
 * Title for a statement page.
 *
 * The PS number leads because it is the identifier people search and quote; the
 * title is clamped so the whole thing, plus the site suffix the template adds,
 * stays close to what a result actually shows.
 */
export function statementTitle(psNumber: string, title: string): string {
  return `${psNumber} · ${clampWords(title, META_TITLE_LENGTH)}`;
}
