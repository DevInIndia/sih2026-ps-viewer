import type { Filters, ListItem, SortKey } from "@/lib/types";

/**
 * Pure filtering and sorting, shared by the results list and the live facet
 * counts. Kept free of React and of the full dataset so it can run in the
 * browser on the slim `ListItem[]`.
 */

export type FilterField =
  | "query"
  | "category"
  | "theme"
  | "org"
  | "department"
  | "dataset"
  | "shortlist";

export type MatchContext = {
  filters: Filters;
  /** Query split into lowercase terms; all must match (AND). */
  terms: string[];
  themeSet: Set<string>;
  shortlist: Set<string>;
  /** PS number → lowercase full-text blob. Empty until /search-index arrives. */
  fullText: Map<string, string> | null;
  /** PS number → lowercase metadata blob; always available. */
  metaText: Map<string, string>;
};

/** Metadata-only haystack — enough to search on before the index loads. */
export function metaHaystack(item: ListItem): string {
  return [
    item.ps,
    item.title,
    item.org,
    item.department,
    item.theme,
    item.category,
  ]
    .join("  ")
    .toLowerCase();
}

/**
 * `skip` excludes one facet from its own count, so the theme list keeps showing
 * the alternatives you could switch to rather than collapsing to your current
 * selection.
 */
export function passes(
  item: ListItem,
  ctx: MatchContext,
  skip?: FilterField,
): boolean {
  const { filters } = ctx;

  if (skip !== "query" && ctx.terms.length) {
    const hay =
      ctx.fullText?.get(item.ps) ?? ctx.metaText.get(item.ps) ?? "";
    for (const term of ctx.terms) {
      if (!hay.includes(term)) return false;
    }
  }
  if (skip !== "category" && filters.category && item.category !== filters.category) {
    return false;
  }
  if (skip !== "theme" && ctx.themeSet.size && !ctx.themeSet.has(item.theme)) {
    return false;
  }
  if (skip !== "org" && filters.org && item.org !== filters.org) return false;
  if (
    skip !== "department" &&
    filters.department &&
    item.department !== filters.department
  ) {
    return false;
  }
  if (skip !== "dataset" && filters.datasetOnly && !item.hasDataset) return false;
  if (
    skip !== "shortlist" &&
    filters.shortlistedOnly &&
    !ctx.shortlist.has(item.ps)
  ) {
    return false;
  }
  return true;
}

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

const byPs = (a: ListItem, b: ListItem) => collator.compare(a.ps, b.ps);

export const COMPARATORS: Record<SortKey, (a: ListItem, b: ListItem) => number> =
  {
    ps: byPs,
    title: (a, b) => collator.compare(a.title, b.title) || byPs(a, b),
    org: (a, b) => collator.compare(a.org, b.org) || byPs(a, b),
    theme: (a, b) => collator.compare(a.theme, b.theme) || byPs(a, b),
  };

/** Count how many items survive every filter *except* the named one. */
export function countBy(
  items: readonly ListItem[],
  ctx: MatchContext,
  skip: FilterField,
  key: (item: ListItem) => string,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (!passes(item, ctx, skip)) continue;
    const k = key(item) || "—";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

/** True when anything at all is narrowing the result set. */
export function hasActiveFilters(filters: Filters): boolean {
  return Boolean(
    filters.query ||
      filters.category ||
      filters.themes.length ||
      filters.org ||
      filters.department ||
      filters.datasetOnly ||
      filters.shortlistedOnly,
  );
}
