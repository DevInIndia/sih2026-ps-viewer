import { ExternalIcon } from "@/components/icons";
import { hostOf, toLinkItems } from "@/lib/safe-url";
import { unmangle } from "@/lib/text";

/**
 * Renders a Dataset Link / Youtube Link blob.
 *
 * Only segments that `safeHref` accepted as ordinary http(s) URLs become
 * anchors; anything else stays plain text, so nothing is lost from the record
 * and nothing unsafe becomes clickable. Every anchor is `noopener noreferrer`
 * (the new tab cannot reach back through `window.opener`) and `nofollow ugc`,
 * since these destinations are third-party content we do not vouch for.
 */
export function LinkList({ value }: { value: string }) {
  const items = toLinkItems(unmangle(value));
  if (!items.length) return null;

  if (items.length === 1 && items[0]!.marker === null) {
    return (
      <span className="text-[0.84rem] leading-[1.45] break-words">
        {renderSegments(items[0]!.segments)}
      </span>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2 text-[0.84rem] leading-[1.45]">
          {item.marker ? (
            <span aria-hidden="true" className="shrink-0 text-ink-3">
              {item.marker}
            </span>
          ) : null}
          <span className="break-words">{renderSegments(item.segments)}</span>
        </li>
      ))}
    </ul>
  );
}

function renderSegments(
  segments: ReturnType<typeof toLinkItems>[number]["segments"],
) {
  return segments.map((segment, index) => {
    if (segment.kind === "text") return <span key={index}>{segment.text}</span>;
    return (
      <a
        key={index}
        href={segment.href}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
        title={segment.href}
        className="inline-flex items-baseline gap-1 text-accent-ink underline decoration-from-font underline-offset-[0.18em] hover:decoration-2"
      >
        <span className="break-all">{segment.text}</span>
        <ExternalIcon className="size-3 shrink-0 self-center opacity-70" />
        <span className="sr-only">
          (opens {hostOf(segment.href)} in a new tab)
        </span>
      </a>
    );
  });
}
