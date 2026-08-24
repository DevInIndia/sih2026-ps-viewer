"use client";

import { useEffect, useId, useRef, useState } from "react";

import { XIcon } from "@/components/icons";
import { cx } from "@/lib/cx";

/**
 * Help, in two panels.
 *
 * There are two ways in — the masthead button and the "syntax" link beside the
 * search box — and they used to open the same undifferentiated dialog, which
 * made one of them redundant. Each now lands on its own tab: the masthead is
 * the general "how do I drive this", the rail link answers the question you
 * have while your cursor is in the search box.
 */

export type HelpSection = "shortcuts" | "syntax";

const SHORTCUTS: [keys: string[], description: string][] = [
  [["/"], "Focus the search box"],
  [["↓", "↑"], "Move through the results"],
  [["Enter"], "Open the highlighted statement"],
  [["s"], "Shortlist the open statement"],
  [["Esc"], "Close the filters drawer or the detail sheet"],
  [["?"], "Open this help"],
];

const SYNTAX: [example: string, description: string][] = [
  ["drone mapping", "Both words must appear"],
  ['"flash flood"', "Exact phrase"],
  ["-blockchain", "Exclude a word"],
  ["org:isro", "Match only the organisation"],
  ["dept:space", "Match only the department"],
  ["theme:health", "Match only the theme"],
  ["cat:hardware", "Match only the category"],
  ["ps:sih26045", "Jump to one statement"],
];

const TABS: [id: HelpSection, label: string][] = [
  ["shortcuts", "Shortcuts"],
  ["syntax", "Search syntax"],
];

export function HelpDialog({
  section,
  onClose,
}: {
  /** Which tab to open on; `null` keeps the dialog closed. */
  section: HelpSection | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const baseId = useId();
  const [active, setActive] = useState<HelpSection>("shortcuts");

  const tabId = (id: HelpSection) => `${baseId}-tab-${id}`;
  const panelId = (id: HelpSection) => `${baseId}-panel-${id}`;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (section) {
      setActive(section);
      if (!node.open) node.showModal();
    } else if (node.open) {
      node.close();
    }
  }, [section]);

  /** Left/right arrows move between tabs, per the ARIA tabs pattern. */
  function onTabKeyDown(event: React.KeyboardEvent) {
    const delta =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    event.stopPropagation();
    const index = TABS.findIndex(([id]) => id === active);
    const next = TABS[(index + delta + TABS.length) % TABS.length]!;
    setActive(next[0]);
    document.getElementById(tabId(next[0]))?.focus();
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-label="Help"
      className="m-auto w-[min(30rem,92vw)] rounded-xl border border-rule bg-surface p-0 text-ink shadow-pop backdrop:bg-[var(--scrim)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-rule-soft px-3 pt-2.5">
        <div role="tablist" aria-label="Help sections" className="flex gap-1">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              id={tabId(id)}
              role="tab"
              type="button"
              aria-selected={active === id}
              aria-controls={panelId(id)}
              tabIndex={active === id ? 0 : -1}
              onClick={() => setActive(id)}
              onKeyDown={onTabKeyDown}
              className={cx(
                "-mb-px rounded-t border-b-2 px-2.5 pb-2 text-[0.85rem] transition-colors",
                active === id
                  ? "border-accent font-semibold text-ink"
                  : "border-transparent text-ink-3 hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="mb-1.5 grid size-7 shrink-0 place-items-center rounded text-ink-3 hover:bg-surface-3 hover:text-ink"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      <div
        role="tabpanel"
        id={panelId("shortcuts")}
        aria-labelledby={tabId("shortcuts")}
        hidden={active !== "shortcuts"}
      >
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
      </div>

      <div
        role="tabpanel"
        id={panelId("syntax")}
        aria-labelledby={tabId("syntax")}
        hidden={active !== "syntax"}
      >
        <dl className="px-4 py-3">
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
        </dl>
        <p className="border-t border-rule-soft px-4 py-3 text-[0.78rem] leading-relaxed text-ink-3">
          Words match from the start of a word, so <code>drone</code> finds
          &ldquo;drones&rdquo; but <code>rag</code> does not match
          &ldquo;storage&rdquo;. Accents are ignored, and results are ranked by
          best match while you are searching.
        </p>
      </div>
    </dialog>
  );
}
