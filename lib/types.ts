/** Shared shapes that cross the server → client boundary. */

/** The slim projection of a problem statement the browser filters and sorts on. */
export type ListItem = {
  ps: string;
  title: string;
  org: string;
  department: string;
  category: string;
  theme: string;
  hasDataset: boolean;
};

export type Facet = { name: string; count: number };

export type Summary = {
  total: number;
  software: number;
  hardware: number;
  themes: number;
  organisations: number;
  departments: number;
  deadline: string;
  capturedAt: string;
};

export const SORT_KEYS = [
  "relevance",
  "ps",
  "title",
  "org",
  "theme",
] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  relevance: "Best match",
  ps: "PS number",
  title: "Title A–Z",
  org: "Organisation",
  theme: "Theme",
};

/** Sorting by relevance is meaningless without something to be relevant to. */
export const DEFAULT_SORT: SortKey = "ps";
export const QUERY_SORT: SortKey = "relevance";

/**
 * Decide which sort is actually in effect.
 *
 * Relevance is the natural default while searching and nonsense otherwise, so
 * it is chosen automatically for a query and falls back when the query is
 * cleared — including when the reader had pinned it, which would otherwise
 * leave the dropdown reading "Best match" over what is really PS order.
 * Choosing any other sort pins it and overrides the automatic behaviour.
 */
export function resolveSort(
  chosen: SortKey,
  pinned: boolean,
  hasQuery: boolean,
): SortKey {
  if (hasQuery) return pinned ? chosen : QUERY_SORT;
  return pinned && chosen !== "relevance" ? chosen : DEFAULT_SORT;
}

export const CATEGORIES = ["", "Software", "Hardware"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Filters = {
  query: string;
  category: Category;
  themes: string[];
  org: string;
  department: string;
  datasetOnly: boolean;
  shortlistedOnly: boolean;
  sort: SortKey;
};

export const EMPTY_FILTERS: Filters = {
  query: "",
  category: "",
  themes: [],
  org: "",
  department: "",
  datasetOnly: false,
  shortlistedOnly: false,
  sort: "ps",
};

export function isSortKey(value: string): value is SortKey {
  return (SORT_KEYS as readonly string[]).includes(value);
}

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}
