"use client";

import { useEffect, useRef } from "react";

import { XIcon } from "@/components/icons";

const SHORTCUTS: [keys: string[], description: string][] = [
  [["/"], "Focus the search box"],
  [["↓", "↑"], "Move through the results"],
  [["Enter"], "Open the highlighted statement"],
  [["s"], "Shortlist the open statement"],
  [["Esc"], "Close the filters drawer or the detail sheet"],
  [["?"], "Show this list"],
];

const SYNTAX: [example: string, description: string][] = [
  ["drone mapping", "Both words must appear"],
  ['"flash flood"', "Exact phrase"],
  ["-blockchain", "Exclude a word"],
  ["org:isro", "Match only the organisation"],
  ["theme:health", "Match only the theme"],
  ["cat:hardware", "Match only the category"],
];

/**
 * Keyboard and search help.
 *
 * Uses the native `<dialog>` element so focus trapping, the backdrop and
 * Escape-to-close come from the platform rather than from hand-rolled
 * focus management.
 */
export function ShortcutsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        // Clicking the backdrop targets the dialog element itself.
        if (event.target === ref.current) onClose();
      }}
      className="m-auto w-[min(26rem,92vw)] rounded-xl border border-rule bg-surface p-0 text-ink shadow-pop backdrop:bg-[var(--scrim)]"
    >
      <div className="flex items-center justify-between border-b border-rule-soft px-4 py-3">
        <h2 className="text-[0.95rem] font-semibold">Keyboard shortcuts</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-7 place-items-center rounded text-ink-3 hover:bg-surface-3 hover:text-ink"
        >
          <XIcon className="size-4" />
        </button>
      </div>
      <dl className="px-4 py-3">
        {SHORTCUTS.map(([keys, description]) => (
          <div
            key={description}
            className="flex items-center justify-between gap-4 py-1.5"
          >
            <dt className="text-[0.85rem] text-ink-2">{description}</dt>
            <dd className="flex shrink-0 gap-1">
              {keys.map((key) => (
                <kbd
                  key={key}
                  className="rounded border border-rule bg-surface-2 px-1.5 py-0.5 font-mono text-[0.7rem] text-ink-2"
                >
                  {key}
                </kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>

      <h3 className="border-t border-rule-soft px-4 pt-3 pb-1 text-[0.95rem] font-semibold">
        Search syntax
      </h3>
      <dl className="px-4 pt-1 pb-4">
        {SYNTAX.map(([example, description]) => (
          <div
            key={example}
            className="flex items-baseline justify-between gap-4 py-1.5"
          >
            <dt className="shrink-0">
              <code className="rounded border border-rule bg-surface-2 px-1.5 py-0.5 font-mono text-[0.72rem] text-accent-ink">
                {example}
              </code>
            </dt>
            <dd className="text-right text-[0.8rem] text-ink-3">
              {description}
            </dd>
          </div>
        ))}
        <p className="mt-2 text-[0.78rem] leading-relaxed text-ink-3">
          Words match from the start of a word, so <code>drone</code> finds
          &ldquo;drones&rdquo; but <code>rag</code> does not match
          &ldquo;storage&rdquo;. Accents are ignored.
        </p>
      </dl>
    </dialog>
  );
}
