import { cx } from "@/lib/cx";

/** Shared presentational primitives. Safe on the server and in client trees. */

export const buttonClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-rule " +
  "bg-surface-2 px-2.5 text-[0.82rem] font-medium text-ink-2 transition-colors " +
  "hover:bg-surface-3 hover:text-ink active:translate-y-px disabled:pointer-events-none " +
  "disabled:opacity-50";

export const inputClass =
  "h-9 w-full rounded-md border border-rule bg-surface-2 px-2.5 text-[0.86rem] " +
  "text-ink placeholder:text-ink-3 transition-colors hover:border-ink-3/60 " +
  "focus:border-accent focus:bg-surface";

export const selectClass = cx(inputClass, "cursor-pointer pr-8 truncate");

type TagTone = "software" | "hardware" | "theme" | "neutral" | "good";

const tagTones: Record<TagTone, string> = {
  software: "bg-accent-soft text-accent-ink",
  hardware: "bg-gold-soft text-gold",
  theme: "bg-surface-3 text-ink-2",
  neutral: "bg-surface-3 text-ink-3",
  good: "bg-good-soft text-good",
};

export function Tag({
  tone = "neutral",
  className,
  children,
}: {
  tone?: TagTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center gap-1 rounded-[3px] px-1.5 py-[0.16rem]",
        "font-mono text-[0.62rem] font-medium tracking-[0.07em] uppercase whitespace-nowrap",
        tagTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function toneForCategory(category: string): TagTone {
  return category.toLowerCase().startsWith("hard") ? "hardware" : "software";
}

/** A labelled block in the filter rail. */
export function Field({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="micro">{label}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Section divider used inside the detail view. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3.5 flex items-center gap-3">
      <span className="micro">{children}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-rule-soft" />
    </div>
  );
}
