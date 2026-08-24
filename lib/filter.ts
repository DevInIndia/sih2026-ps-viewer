import type { Filters, ListItem, SortKey } from "./types";
import { fold, termPattern, type QueryField, type QueryTerm } from "./query";

/**
 * Pure filtering, scoring and sorting, shared by the results list and the live
 * facet counts. Kept free of React and of the full dataset so it can run in the
 * browser on the slim `ListItem[]` — and so it can be tested headlessly.
 */

export type FilterField =
  | "query"
  | "category"
  | "theme"
  | "org"
  | "department"
  | "dataset"
  | "shortlist";

/** Per-record folded text, one entry per searchable field. */
export type RecordText = {
  ps: string;
  title: string;
  org: string;
  dept: string;
  theme: string;
  cat: string;
  /** Metadata only — always available. */
  meta: string;
  /** Metadata plus the description; equals `meta` until the index loads. */
  all: string;
};

export type MatchContext = {
  filters: Filters;
  terms: QueryTerm[];
  themeSet: Set<string>;
  shortlist: Set<string>;
  text: Map<string, RecordText>;
};

/** Fold a `ListItem` once; the description is merged in separately. */
export function buildRecordText(
  item: ListItem,
  description: string | undefined,
): RecordText {
  const ps = fold(item.ps);
  const title = fold(item.title);
  const org = fold(item.org);
  const dept = fold(item.department);
  const theme = fold(item.theme);
  const cat = fold(item.category);
  const meta = `${ps}  ${title}  ${org}  ${dept}  ${theme}  ${cat}`;
  return {
    ps,
    title,
    org,
    dept,
    theme,
    cat,
    meta,
    all: description ? `${meta}  ${description}` : meta,
  };
}

function haystackFor(text: RecordText, field: QueryField | null): string {
  switch (field) {
    case "ps":
      return text.ps;
    case "title":
      return text.title;
    case "org":
      return text.org;
    case "dept":
      return text.dept;
    case "theme":
      return text.theme;
    case "cat":
      return text.cat;
    default:
      return text.all;
  }
}

/**
 * Does every non-negated term match, and no negated term?
 *
 * Terms combine with AND, which is what people expect from a search box: each
 * word you add should narrow the list.
 */
export function matchesQuery(text: RecordText, terms: QueryTerm[]): boolean {
  for (const term of terms) {
    const hit = termPattern(term).test(haystackFor(text, term.field));
    if (term.negated ? hit : !hit) return false;
  }
  return true;
}

/**
 * Relevance score for a record against the query.
 *
 * Weighted by where the match lands: a hit in the title or the PS number says
 * far more than the tenth mention buried in a description. Repeat occurrences
 * count, but with a low ceiling so one long statement cannot dominate purely by
 * being long.
 */
export function scoreQuery(text: RecordText, terms: QueryTerm[]): number {
  let score = 0;
  for (const term of terms) {
    if (term.negated) continue;
    if (termPattern(term).test(text.ps)) score += 40;
    if (termPattern(term).test(text.title)) score += 12;
    if (termPattern(term).test(text.theme)) score += 5;
    if (termPattern(term).test(text.org) || termPattern(term).test(text.dept)) {
      score += 4;
    }
    const global = termPattern(term, "g");
    let occurrences = 0;
    while (occurrences < 5 && global.exec(text.all) !== null) occurrences += 1;
    score += occurrences;
    if (term.phrase) score += 3;
  }
  return score;
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
    const text = ctx.text.get(item.ps);
    if (!text || !matchesQuery(text, ctx.terms)) return false;
  }
  if (
    skip !== "category" &&
    filters.category &&
    item.category !== filters.category
  ) {
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

/**
 * Sort the surviving items.
 *
 * Relevance needs the query, so comparators are built per call rather than held
 * in a static table. Every comparator falls back to PS number, which makes the
 * order total and therefore stable across re-renders.
 */
export function sortItems(
  items: ListItem[],
  sort: SortKey,
  scores: Map<string, number> | null,
): ListItem[] {
  const compare: Record<SortKey, (a: ListItem, b: ListItem) => number> = {
    ps: byPs,
    title: (a, b) => collator.compare(a.title, b.title) || byPs(a, b),
    org: (a, b) => collator.compare(a.org, b.org) || byPs(a, b),
    theme: (a, b) => collator.compare(a.theme, b.theme) || byPs(a, b),
    relevance: (a, b) =>
      (scores?.get(b.ps) ?? 0) - (scores?.get(a.ps) ?? 0) || byPs(a, b),
  };
  return items.sort(compare[sort]);
}

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
    filters.query.trim() ||
      filters.category ||
      filters.themes.length ||
      filters.org ||
      filters.department ||
      filters.datasetOnly ||
      filters.shortlistedOnly,
  );
}
