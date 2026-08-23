import { Fragment } from "react";

/**
 * Renders `text` with search matches wrapped in `<mark>`.
 *
 * The matched substrings are emitted as React children, never as an HTML
 * string, so a query cannot inject markup — which is the failure mode of the
 * usual `text.replace(re, "<mark>$1</mark>")` shortcut. The pattern itself is
 * built by `highlightPattern`, which escapes and length-caps every term.
 */
export function Highlight({
  text,
  pattern,
}: {
  text: string;
  pattern: RegExp | null;
}) {
  if (!pattern) return <>{text}</>;

  // A single capturing group means split() interleaves matches at odd indices.
  const parts = text.split(pattern);
  if (parts.length < 2) return <>{text}</>;

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="rounded-[2px] bg-gold-soft px-[0.1em] text-ink"
          >
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
