import { toProse } from "@/lib/text";

/**
 * Renders a problem brief.
 *
 * The portal writes descriptions as one long run of text with `<br>`-separated
 * pseudo-headings and lettered sub-points. `toProse` turns that into typed
 * blocks; each block is emitted as ordinary React elements, so the scraped text
 * can only ever become text.
 */
export function Brief({ description }: { description: string }) {
  const blocks = toProse(description);

  if (!blocks.length) {
    return (
      <p className="font-read text-[1.045rem] text-ink-3 italic">
        The portal lists no description for this statement.
      </p>
    );
  }

  return (
    <div className="brief">
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <h3
              key={index}
              className="mt-7 mb-2 border-b border-rule-soft pb-1.5 font-sans text-[0.7rem] font-semibold tracking-[0.13em] text-accent-ink uppercase first:mt-0"
            >
              {block.text}
            </h3>
          );
        }

        if (block.kind === "list") {
          return (
            <ul key={index} className="mb-4 flex flex-col gap-1.5">
              {block.items.map((item, i) => (
                <li key={i} className="flex gap-2.5">
                  <span
                    aria-hidden="true"
                    className="mt-[0.42em] shrink-0 font-mono text-[0.72rem] leading-none font-medium text-accent-ink"
                  >
                    {item.marker}
                  </span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          );
        }

        return <p key={index}>{block.text}</p>;
      })}
    </div>
  );
}
