"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ExportShortlist } from "@/components/export-shortlist";
import { FilterRail, SearchBox } from "@/components/filter-rail";
import type { FacetCounts } from "@/components/filter-rail";
import {
  ChevronLeftIcon,
  KeyboardIcon,
  SlidersIcon,
  XIcon,
} from "@/components/icons";
import { ResultList } from "@/components/result-list";
import { ShortcutsDialog } from "@/components/shortcuts-dialog";
import {
  ShortlistProvider,
  useShortlist,
} from "@/components/shortlist-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonClass } from "@/components/ui";
import {
  COMPARATORS,
  countBy,
  hasActiveFilters,
  metaHaystack,
  passes,
  type MatchContext,
} from "@/lib/filter";
import { cx } from "@/lib/cx";
import { highlightPattern, tokenize } from "@/lib/text";
import {
  EMPTY_FILTERS,
  type Facet,
  type Filters,
  type ListItem,
  type Summary,
} from "@/lib/types";

type Facets = {
  themes: readonly Facet[];
  orgs: readonly Facet[];
  departments: readonly Facet[];
};

/**
 * Loads the full-text search index in the background.
 *
 * The descriptions are ~200 KB gzipped, so they are kept out of the initial
 * payload and fetched once, after mount. Until it lands, search runs against
 * the metadata that is already in memory — so the box is never dead, it just
 * gets deeper a moment later.
 */
function useFullTextIndex(): Map<string, string> | null {
  const [index, setIndex] = useState<Map<string, string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/search-index", {
            signal: controller.signal,
          });
          if (!res.ok) return;

          const payload: unknown = await res.json();
          if (
            cancelled ||
            payload === null ||
            typeof payload !== "object" ||
            Array.isArray(payload)
          ) {
            return;
          }

          const next = new Map<string, string>();
          for (const [key, value] of Object.entries(
            payload as Record<string, unknown>,
          )) {
            if (typeof value === "string") next.set(key, value);
          }
          setIndex(next);
        } catch {
          // Offline, aborted, or the index is unavailable — metadata search
          // keeps working, so there is nothing to report to the user.
        }
      })();
    }, 200);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, []);

  return index;
}

function Figure({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dd className="font-mono text-[0.95rem] leading-none font-semibold tnum">
        {value}
      </dd>
      <dt className="text-[0.62rem] tracking-[0.1em] text-ink-3 uppercase">
        {label}
      </dt>
    </div>
  );
}

function ActiveChip({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-rule bg-surface-2 py-0.5 pr-1 pl-2 text-[0.72rem] text-ink-2">
      <span className="max-w-[16ch] truncate">{children}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove this filter"
        className="grid size-4 place-items-center rounded-full text-ink-3 hover:bg-surface-3 hover:text-ink"
      >
        <XIcon className="size-3" />
      </button>
    </span>
  );
}

export function WorkspaceShell({
  listItems,
  facets,
  summary,
  children,
}: {
  listItems: ListItem[];
  facets: Facets;
  summary: Summary;
  children: React.ReactNode;
}) {
  const knownIds = useMemo(() => listItems.map((item) => item.ps), [listItems]);
  return (
    <ShortlistProvider knownIds={knownIds}>
      <WorkspaceBody listItems={listItems} facets={facets} summary={summary}>
        {children}
      </WorkspaceBody>
    </ShortlistProvider>
  );
}

function WorkspaceBody({
  listItems,
  facets,
  summary,
  children,
}: {
  listItems: ListItem[];
  facets: Facets;
  summary: Summary;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const shortlist = useShortlist();

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [railOpen, setRailOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLElement>(null);

  const fullText = useFullTextIndex();

  /** `/ps/SIH26001` → `SIH26001`. */
  const activePs = useMemo(() => {
    const match = /^\/ps\/([^/]+)\/?$/.exec(pathname ?? "");
    if (!match?.[1]) return null;
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return null;
    }
  }, [pathname]);

  const detailOpen = activePs !== null;

  const update = useCallback((patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setFilters(EMPTY_FILTERS), []);

  // Typing stays responsive: the list re-filters at a lower priority.
  const deferredQuery = useDeferredValue(filters.query);
  const terms = useMemo(() => tokenize(deferredQuery), [deferredQuery]);
  const pattern = useMemo(() => highlightPattern(terms), [terms]);

  const metaText = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of listItems) map.set(item.ps, metaHaystack(item));
    return map;
  }, [listItems]);

  const ctx = useMemo<MatchContext>(
    () => ({
      filters: { ...filters, query: deferredQuery },
      terms,
      themeSet: new Set(filters.themes),
      shortlist: shortlist.items,
      fullText,
      metaText,
    }),
    [filters, deferredQuery, terms, shortlist.items, fullText, metaText],
  );

  const visible = useMemo(
    () =>
      listItems
        .filter((item) => passes(item, ctx))
        .sort(COMPARATORS[filters.sort]),
    [listItems, ctx, filters.sort],
  );

  const counts = useMemo<FacetCounts>(
    () => ({
      categories: countBy(listItems, ctx, "category", (i) => i.category),
      themes: countBy(listItems, ctx, "theme", (i) => i.theme),
      orgs: countBy(listItems, ctx, "org", (i) => i.org),
      departments: countBy(listItems, ctx, "department", (i) => i.department),
    }),
    [listItems, ctx],
  );

  const filtering = hasActiveFilters(filters);

  /* ------------------------------------------------------------ navigation */

  const openStatement = useCallback(
    (ps: string) => {
      router.push(`/ps/${encodeURIComponent(ps)}`, { scroll: false });
    },
    [router],
  );

  const step = useCallback(
    (delta: number) => {
      if (!visible.length) return;
      const at = activePs
        ? visible.findIndex((item) => item.ps === activePs)
        : -1;
      const next = Math.min(
        visible.length - 1,
        Math.max(0, at === -1 ? 0 : at + delta),
      );
      const target = visible[next];
      if (target) openStatement(target.ps);
    },
    [visible, activePs, openStatement],
  );

  // Keep the selected row on screen and reset the detail scroll on every
  // change of statement.
  useEffect(() => {
    if (!activePs) return;
    if (detailRef.current) detailRef.current.scrollTop = 0;

    const escaped =
      typeof CSS !== "undefined" && CSS.escape
        ? CSS.escape(activePs)
        : activePs.replace(/["\\]/g, "\\$&");
    listRef.current
      ?.querySelector(`[data-ps="${escaped}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activePs]);

  // Close the mobile drawer once a statement is opened from it.
  useEffect(() => {
    setRailOpen(false);
  }, [pathname]);

  /* -------------------------------------------------------------- keyboard */

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (/^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName) ||
          target.isContentEditable);

      if (event.key === "Escape") {
        if (helpOpen) {
          setHelpOpen(false);
        } else if (railOpen) {
          setRailOpen(false);
        } else if (
          detailOpen &&
          window.matchMedia("(max-width: 1079.98px)").matches
        ) {
          router.push("/", { scroll: false });
        }
        return;
      }

      if (typing) {
        if (event.key === "Enter" && target === searchRef.current) {
          const first = visible[0];
          if (first) {
            event.preventDefault();
            openStatement(first.ps);
          }
        }
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        setRailOpen(true);
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (event.key === "?") {
        event.preventDefault();
        setHelpOpen((open) => !open);
        return;
      }
      if (event.key === "s" && activePs) {
        event.preventDefault();
        shortlist.toggle(activePs);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        step(1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        step(-1);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [
    activePs,
    detailOpen,
    helpOpen,
    openStatement,
    railOpen,
    router,
    shortlist,
    step,
    visible,
  ]);

  /* ----------------------------------------------------------------- chips */

  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (filters.category) {
    chips.push({
      key: "category",
      label: filters.category,
      remove: () => update({ category: "" }),
    });
  }
  for (const theme of filters.themes) {
    chips.push({
      key: `theme:${theme}`,
      label: theme,
      remove: () =>
        update({ themes: filters.themes.filter((t) => t !== theme) }),
    });
  }
  if (filters.org) {
    chips.push({
      key: "org",
      label: filters.org,
      remove: () => update({ org: "" }),
    });
  }
  if (filters.department) {
    chips.push({
      key: "department",
      label: filters.department,
      remove: () => update({ department: "" }),
    });
  }
  if (filters.datasetOnly) {
    chips.push({
      key: "dataset",
      label: "Has dataset",
      remove: () => update({ datasetOnly: false }),
    });
  }
  if (filters.shortlistedOnly) {
    chips.push({
      key: "shortlisted",
      label: "Shortlisted",
      remove: () => update({ shortlistedOnly: false }),
    });
  }

  /* ------------------------------------------------------------------ view */

  return (
    <div className="flex h-dvh min-h-0 flex-col">
      <header className="no-print flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-rule bg-surface px-4 py-2.5">
        <div className="mr-auto flex items-baseline gap-2.5">
          <span className="rounded-[3px] bg-ink px-1.5 py-1 font-mono text-[0.66rem] font-semibold tracking-[0.14em] text-surface">
            SIH 2026
          </span>
          <div>
            <h1 className="text-[1.08rem] leading-tight font-bold tracking-[-0.015em] text-balance">
              <Link href="/" className="hover:text-accent-ink">
                Problem Statements
              </Link>
            </h1>
            <p className="text-[0.75rem] text-ink-3">
              Smart India Hackathon · sih.gov.in
            </p>
          </div>
        </div>

        <dl className="hidden flex-wrap items-end gap-x-5 gap-y-2 md:flex">
          <Figure value={summary.total} label="statements" />
          <Figure value={summary.software} label="software" />
          <Figure value={summary.hardware} label="hardware" />
          <Figure value={summary.themes} label="themes" />
          <Figure value={summary.organisations} label="organisations" />
          <Figure value={summary.deadline} label="submission closes" />
          <Figure value={summary.capturedAt} label="data captured" />
        </dl>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className={cx(buttonClass, "hidden w-9 px-0 wide:inline-flex")}
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
          >
            <KeyboardIcon className="size-4" />
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Compact controls for narrow screens; the rail becomes a drawer. */}
      <div className="no-print flex items-center gap-2 border-b border-rule bg-surface px-3 py-2 wide:hidden">
        <button
          type="button"
          onClick={() => setRailOpen(true)}
          className={buttonClass}
          aria-expanded={railOpen}
          aria-controls="filter-rail"
        >
          <SlidersIcon className="size-4" />
          Filters
          {chips.length ? (
            <span className="ml-0.5 rounded-full bg-accent-soft px-1.5 font-mono text-[0.65rem] text-accent-ink">
              {chips.length}
            </span>
          ) : null}
        </button>
        <div className="flex-1">
          <SearchBox
            value={filters.query}
            onChange={(query) => update({ query })}
            placeholder="Search statements"
          />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 wide:grid-cols-[276px_minmax(340px,420px)_1fr]">
        <aside
          id="filter-rail"
          aria-label="Filters"
          className={cx(
            "pane min-h-0 overflow-y-auto overscroll-contain border-r border-rule bg-surface",
            "max-wide:fixed max-wide:inset-y-0 max-wide:left-0 max-wide:z-60",
            "max-wide:w-[min(310px,86vw)] max-wide:shadow-pop max-wide:transition-transform max-wide:duration-200",
            railOpen ? "max-wide:translate-x-0" : "max-wide:-translate-x-[101%]",
          )}
        >
          <div className="flex items-center justify-between border-b border-rule px-4 py-2 wide:hidden">
            <span className="micro">Filters</span>
            <button
              type="button"
              onClick={() => setRailOpen(false)}
              aria-label="Close filters"
              className="grid size-7 place-items-center rounded text-ink-3 hover:bg-surface-3 hover:text-ink"
            >
              <XIcon className="size-4" />
            </button>
          </div>
          <FilterRail
            filters={filters}
            update={update}
            reset={reset}
            facets={facets}
            counts={counts}
            total={summary.total}
            searchRef={searchRef}
          />
        </aside>

        <section
          ref={listRef}
          aria-label="Results"
          className="pane min-h-0 overflow-y-auto overscroll-contain border-r border-rule bg-ground"
        >
          <div className="sticky top-0 z-5 border-b border-rule bg-ground/95 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2 px-3.5 py-2">
              <span className="micro" aria-live="polite">
                {visible.length === summary.total
                  ? `${summary.total} statements`
                  : `${visible.length} of ${summary.total} statements`}
              </span>
              <span className="flex items-center gap-2">
                {shortlist.items.size ? (
                  <span className="micro">
                    {shortlist.items.size} shortlisted
                  </span>
                ) : null}
                <ExportShortlist items={listItems} />
              </span>
            </div>

            {chips.length ? (
              <div className="flex flex-wrap items-center gap-1.5 px-3.5 pb-2">
                {chips.map((chip) => (
                  <ActiveChip key={chip.key} onRemove={chip.remove}>
                    {chip.label}
                  </ActiveChip>
                ))}
                <button
                  type="button"
                  onClick={reset}
                  className="ml-0.5 font-mono text-[0.64rem] tracking-[0.08em] text-accent-ink uppercase underline underline-offset-[3px] hover:text-accent"
                >
                  clear all
                </button>
              </div>
            ) : null}
          </div>

          <ResultList
            items={visible}
            activePs={activePs}
            pattern={pattern}
            onClearFilters={reset}
          />

          {filtering && visible.length ? (
            <p className="px-3.5 py-4 text-center text-[0.72rem] text-ink-3">
              End of {visible.length} filtered result
              {visible.length === 1 ? "" : "s"}
            </p>
          ) : null}
        </section>

        <main
          ref={detailRef}
          aria-label="Problem statement"
          className={cx(
            "pane min-h-0 overflow-y-auto overscroll-contain bg-surface",
            "max-wide:fixed max-wide:inset-0 max-wide:z-70",
            detailOpen ? "max-wide:block" : "max-wide:hidden",
          )}
        >
          <div className="sticky top-0 z-2 px-4 pt-3 wide:hidden">
            <Link
              href="/"
              scroll={false}
              className={cx(buttonClass, "bg-surface shadow-card")}
            >
              <ChevronLeftIcon className="size-4" />
              Back to list
            </Link>
          </div>
          {children}
        </main>
      </div>

      {/* Drawer backdrop. */}
      <button
        type="button"
        tabIndex={railOpen ? 0 : -1}
        aria-label="Close filters"
        onClick={() => setRailOpen(false)}
        className={cx(
          "fixed inset-0 z-50 bg-[var(--scrim)] transition-opacity duration-200 wide:hidden",
          railOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <ShortcutsDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
