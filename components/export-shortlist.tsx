"use client";

import { DownloadIcon } from "@/components/icons";
import { useShortlist } from "@/components/shortlist-provider";
import { buttonClass } from "@/components/ui";
import { downloadBlob } from "@/lib/clipboard";
import { cx } from "@/lib/cx";
import type { ListItem } from "@/lib/types";

/**
 * Escape one CSV cell.
 *
 * As well as the usual quote doubling, a leading `=`, `+`, `-`, `@`, tab or CR
 * is prefixed with an apostrophe. Spreadsheet software treats those as the
 * start of a formula, so an organisation name beginning with `=` would execute
 * on open — CSV injection. The scraped text is third-party data, so it gets the
 * same treatment as user input.
 */
function csvCell(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${guarded.replace(/"/g, '""')}"`;
}

const COLUMNS = [
  "ps_number",
  "title",
  "organisation",
  "department",
  "category",
  "theme",
  "url",
] as const;

export function ExportShortlist({
  items,
  className,
}: {
  items: readonly ListItem[];
  className?: string;
}) {
  const { items: shortlisted } = useShortlist();

  if (shortlisted.size === 0) return null;

  function onExport() {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    const rows = items
      .filter((item) => shortlisted.has(item.ps))
      .map((item) =>
        [
          item.ps,
          item.title,
          item.org,
          item.department,
          item.category,
          item.theme,
          `${origin}/ps/${item.ps}`,
        ]
          .map(csvCell)
          .join(","),
      );

    // A BOM so Excel opens the UTF-8 correctly on Windows.
    const csv = `\uFEFF${COLUMNS.join(",")}\n${rows.join("\n")}\n`;
    const stamp = new Date().toISOString().slice(0, 10);
    downloadBlob(`sih2026-shortlist-${stamp}.csv`, "text/csv", csv);
  }

  return (
    <button
      type="button"
      onClick={onExport}
      title={`Download ${shortlisted.size} shortlisted statement(s) as CSV`}
      className={cx(buttonClass, "h-7 px-2 text-[0.72rem]", className)}
    >
      <DownloadIcon className="size-3.5" />
      Export
    </button>
  );
}
