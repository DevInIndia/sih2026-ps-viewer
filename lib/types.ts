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

export const SORT_KEYS = ["ps", "title", "org", "theme"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  ps: "PS number",
  title: "Title A–Z",
  org: "Organisation",
  theme: "Theme",
};

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
