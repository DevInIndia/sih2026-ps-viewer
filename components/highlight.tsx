import { Fragment } from "react";

/**
 * Renders `text` with search matches wrapped in `<mark>`.
 *
 * Matches are emitted as React children, never as an HTML string, so a query
 * cannot inject markup — which is the failure mode of the usual
 * `text.replace(re, "<mark>$1</mark>")` shortcut. The pattern comes from
 * `highlightPattern`, which escapes and length-caps every term.
 *
 * The pattern includes a leading "start, or non-alphanumeric" guard so it marks
 * word starts only, matching what the search actually matched. That guard is a
 * non-capturing group and the term itself is group 1, so the separator
 * character is preserved outside the `<mark>`.
 */
export function Highlight({
  text,
  pattern,
}: {
  text: string;
  pattern: RegExp | null;
}) {
  if (!pattern || !text) return <>{text}</>;

  const parts: { text: string; mark: boolean }[] = [];
  let cursor = 0;

  // A fresh regex per call: `pattern` carries /g, and sharing lastIndex across
  // renders would make highlighting depend on render order.
  const re = new RegExp(pattern.source, pattern.flags);

  for (let m = re.exec(text); m !== null; m = re.exec(text)) {
    const term = m[1];
    if (term === undefined) break;

    const start = m.index + m[0].length - term.length;
    if (start > cursor) {
      parts.push({ text: text.slice(cursor, start), mark: false });
    }
    parts.push({ text: term, mark: true });
    cursor = start + term.length;

    // A zero-length match would spin forever.
    if (re.lastIndex === m.index) re.lastIndex += 1;
  }

  if (!parts.length) return <>{text}</>;
  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), mark: false });
  }

  return (
    <>
      {parts.map((part, i) =>
        part.mark ? (
          <mark
            key={i}
            className="rounded-[2px] bg-gold-soft px-[0.1em] text-ink"
          >
            {part.text}
          </mark>
        ) : (
          <Fragment key={i}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}
