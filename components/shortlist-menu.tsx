"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ExportShortlist } from "@/components/export-shortlist";
import { StarIcon, XIcon } from "@/components/icons";
import { useShortlist } from "@/components/shortlist-provider";
import { Tag, buttonClass, toneForCategory } from "@/components/ui";
import { cx } from "@/lib/cx";
import type { ListItem } from "@/lib/types";

/**
 * The shortlist count, as a menu.
 *
 * It used to be a bare label, which told you a number and gave you nowhere to
 * go: seeing what was actually on the list meant switching on the "Shortlisted
 * only" filter and losing whatever filters you already had.
 *
 * The panel is portalled to <body> deliberately. Its natural parent is the
 * sticky list header, which carries `backdrop-blur` — and a backdrop filter
 * establishes a containing block, so a `position: fixed` child would be
 * positioned against the header rather than the viewport, and clipped by the
 * scrolling column.
 */
export function ShortlistMenu({
  items,
  shortlistedOnly,
  onToggleFilter,
}: {
  items: readonly ListItem[];
  shortlistedOnly: boolean;
  onToggleFilter: () => void;
}) {
  const { items: shortlisted, toggle, clear } = useShortlist();
  const [open, setOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const chosen = items.filter((item) => shortlisted.has(item.ps));

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;
    const rect = trigger.getBoundingClientRect();
    const width = panel.offsetWidth;
    setCoords({
      top: Math.min(rect.bottom + 6, window.innerHeight - panel.offsetHeight - 8),
      // Right-align to the trigger, but never off either edge.
      left: Math.max(
        8,
        Math.min(rect.right - width, window.innerWidth - width - 8),
      ),
    });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place, chosen.length]);

  // Reposition rather than drift when the page moves underneath it.
  useEffect(() => {
    if (!open) return;
    const handler = () => place();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [open, place]);

  // Light dismiss: click outside, or Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      // Do not let the shell also act on this Escape.
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  // Opening a statement from the menu should close it.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) setConfirmClear(false);
  }, [open]);

  // Nothing to show, and nothing to say.
  if (shortlisted.size === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cx(
          "inline-flex items-center gap-1 rounded px-1.5 py-0.5",
          "micro transition-colors hover:bg-surface-3 hover:text-ink",
          open && "bg-surface-3 text-ink",
        )}
      >
        <StarIcon filled className="size-3 text-gold" />
        {shortlisted.size} shortlisted
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={cx("size-2.5 transition-transform", open && "rotate-180")}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Your shortlist"
              style={{ top: coords.top, left: coords.left }}
              className="fixed z-90 flex max-h-[min(26rem,70vh)] w-[min(24rem,92vw)] flex-col rounded-lg border border-rule bg-surface shadow-pop"
            >
              <div className="flex items-baseline justify-between gap-2 border-b border-rule-soft px-3 py-2">
                <span className="text-[0.82rem] font-semibold">
                  Your shortlist
                </span>
                <span className="text-[0.68rem] text-ink-3">
                  saved in this browser only
                </span>
              </div>

              <ul className="pane min-h-0 flex-1 overflow-y-auto py-1">
                {chosen.map((item) => (
                  <li key={item.ps} className="relative">
                    <Link
                      href={`/ps/${item.ps}`}
                      scroll={false}
                      className="block py-1.5 pr-9 pl-3 transition-colors hover:bg-surface-2"
                    >
                      <span className="mb-0.5 flex items-center gap-1.5">
                        <span className="font-mono text-[0.66rem] font-semibold text-ink-3 tnum">
                          {item.ps}
                        </span>
                        <Tag tone={toneForCategory(item.category)}>
                          {item.category}
                        </Tag>
                      </span>
                      <span className="block text-[0.8rem] leading-snug font-medium text-ink">
                        {item.title}
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggle(item.ps)}
                      aria-label={`Remove ${item.ps} from shortlist`}
                      title="Remove from shortlist"
                      className="absolute top-1.5 right-2 grid size-6 place-items-center rounded text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-1.5 border-t border-rule-soft px-2 py-2">
                <button
                  type="button"
                  onClick={onToggleFilter}
                  aria-pressed={shortlistedOnly}
                  className={cx(
                    buttonClass,
                    "h-7 px-2 text-[0.72rem]",
                    shortlistedOnly && "border-accent text-accent-ink",
                  )}
                >
                  {shortlistedOnly ? "Showing only these" : "Show only these"}
                </button>

                <ExportShortlist
                  items={items}
                  className="h-7 px-2 text-[0.72rem]"
                />

                <button
                  type="button"
                  onClick={() => {
                    if (!confirmClear) {
                      setConfirmClear(true);
                      return;
                    }
                    clear();
                    setOpen(false);
                  }}
                  className={cx(
                    buttonClass,
                    "ml-auto h-7 px-2 text-[0.72rem]",
                    confirmClear && "border-gold-rule bg-gold-soft text-gold",
                  )}
                >
                  {/* Two-step rather than a confirm(): losing a shortlist to a
                      stray click is annoying, and it is only in this browser. */}
                  {confirmClear ? "Clear all?" : "Clear"}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
