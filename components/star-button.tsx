"use client";

import { StarIcon } from "@/components/icons";
import { useShortlist } from "@/components/shortlist-provider";
import { buttonClass } from "@/components/ui";
import { cx } from "@/lib/cx";

/** Full-width shortlist toggle used in the detail view. */
export function StarButton({
  ps,
  className,
}: {
  ps: string;
  className?: string;
}) {
  const { has, toggle } = useShortlist();
  const on = has(ps);

  return (
    <button
      type="button"
      onClick={() => toggle(ps)}
      aria-pressed={on}
      className={cx(
        buttonClass,
        on && "border-gold-rule bg-gold-soft text-gold",
        className,
      )}
    >
      <StarIcon filled={on} className="size-3.5" />
      {on ? "Shortlisted" : "Add to shortlist"}
    </button>
  );
}

/**
 * Compact star for a results row.
 *
 * Rendered as a real `<button>` positioned over the row link rather than nested
 * inside it — a control inside an anchor is invalid markup and behaves badly
 * with keyboard and screen-reader navigation.
 */
export function RowStar({ ps, label }: { ps: string; label: string }) {
  const { has, toggle } = useShortlist();
  const on = has(ps);

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={
        on ? `Remove ${label} from shortlist` : `Add ${label} to shortlist`
      }
      title={on ? "Remove from shortlist" : "Add to shortlist"}
      onClick={() => toggle(ps)}
      className={cx(
        "absolute top-2.5 right-2.5 z-1 grid size-6 place-items-center rounded",
        "transition-colors hover:bg-surface-3",
        on ? "text-gold" : "text-ink-3/40 hover:text-ink-2",
      )}
    >
      <StarIcon filled={on} className="size-3.5" />
    </button>
  );
}
