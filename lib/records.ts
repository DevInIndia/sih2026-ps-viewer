import "server-only";

// The scraper's own output, imported directly so there is a single source of
// truth: re-running `python sih_scraper.py` and rebuilding is the whole update
// path, with no copy step to forget.
import rawDataset from "@/sih2026_ps.json";
import { parseDataset, type ProblemStatement } from "@/lib/schema";
import type { Facet, ListItem, Summary } from "@/lib/types";

/**
 * Server-side view of the dataset.
 *
 * `server-only` makes it a build error for a client component to pull this in —
 * without it, one stray import would ship all 226 full descriptions (~700 KB)
 * into the browser bundle. Client code gets the slim `ListItem[]` instead, and
 * fetches the full-text index on demand from /search-index.
 */

const { records, dropped } = parseDataset(rawDataset);

if (dropped.length > 0) {
  console.warn(
    `[sih] dropped ${dropped.length} invalid record(s) during validation:\n` +
      dropped.map((d) => `  row ${d.index}: ${d.reason}`).join("\n"),
  );
}

export const RECORDS: readonly ProblemStatement[] = records;

const BY_PS = new Map(records.map((r) => [r.ps_number, r] as const));

export function getRecord(psNumber: string): ProblemStatement | undefined {
  return BY_PS.get(psNumber);
}

export function isHardware(category: string): boolean {
  return category.toLowerCase().startsWith("hard");
}

/* --------------------------------------------------------------- client ---- */

export const LIST_ITEMS: ListItem[] = records.map((r) => ({
  ps: r.ps_number,
  title: r.title,
  org: r.org,
  department: r.department,
  category: r.category,
  theme: r.theme,
  hasDataset: r.dataset_link.length > 0,
}));

function facet(field: (r: ProblemStatement) => string): Facet[] {
  const counts = new Map<string, number>();
  for (const r of records) {
    const key = field(r) || "—";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const FACETS = {
  themes: facet((r) => r.theme),
  orgs: facet((r) => r.org),
  departments: facet((r) => r.department),
} as const;

const hardwareCount = records.filter((r) => isHardware(r.category)).length;

export const SUMMARY: Summary = {
  total: records.length,
  software: records.length - hardwareCount,
  hardware: hardwareCount,
  themes: FACETS.themes.length,
  organisations: FACETS.orgs.length,
  departments: FACETS.departments.length,
  deadline: records[0]?.deadline ?? "—",
  capturedAt: records[0]?.scraped_at ?? "—",
};

/**
 * Full-text haystack, keyed by PS number.
 *
 * Served as a separate statically generated document so the first paint does
 * not carry every description; the client fetches it once, in the background.
 */
export function buildSearchIndex(): Record<string, string> {
  const index: Record<string, string> = {};
  for (const r of records) {
    index[r.ps_number] = [
      r.ps_number,
      r.title,
      r.org,
      r.department,
      r.theme,
      r.category,
      r.description,
    ]
      .join("  ")
      .toLowerCase();
  }
  return index;
}
