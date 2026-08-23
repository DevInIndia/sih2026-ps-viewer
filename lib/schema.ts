import { z } from "zod";

/**
 * The dataset is produced by `sih_scraper.py` against a third-party portal, so
 * its shape is not under our control: a portal layout change can silently turn
 * a string field into `null`, drop a column, or inject something unexpected.
 *
 * Everything is validated here, once, at module load. Rows that cannot be
 * repaired are dropped with a build-time warning rather than being allowed to
 * crash a page render or leak an unexpected value into the UI.
 */

/**
 * PS numbers end up in URLs (`/ps/SIH26001`), in `id` attributes and in
 * localStorage keys, so the character set is restricted to something that is
 * unambiguous everywhere. Anything else is treated as a malformed row.
 */
const PS_NUMBER = /^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/;

/** Trim, and coerce the handful of fields the portal sometimes omits. */
const text = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => (v === null || v === undefined ? "" : String(v).trim()));

export const problemStatementSchema = z.object({
  sno: text,
  ps_number: text.pipe(
    z.string().regex(PS_NUMBER, "ps_number contains unsupported characters"),
  ),
  title: text.pipe(z.string().min(1, "title is empty")),
  org: text,
  department: text,
  category: text,
  theme: text,
  deadline: text,
  deadline_date: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" && v.trim() ? v.trim() : null)),
  ideas: text,
  dataset_link: text,
  contact: text,
  youtube: text,
  description: text,
  scraped_at: text,
});

export type ProblemStatement = z.infer<typeof problemStatementSchema>;

export type ParseResult = {
  records: ProblemStatement[];
  dropped: { index: number; reason: string }[];
};

/**
 * Parse the raw JSON export into validated records.
 *
 * Deliberately tolerant per row and strict overall: one bad row should not take
 * the whole site down, but a completely unusable file should be obvious.
 */
export function parseDataset(raw: unknown): ParseResult {
  if (!Array.isArray(raw)) {
    throw new Error(
      "sih2026_ps.json must contain a JSON array of problem statements",
    );
  }

  const records: ProblemStatement[] = [];
  const dropped: { index: number; reason: string }[] = [];
  const seen = new Set<string>();

  raw.forEach((row, index) => {
    const parsed = problemStatementSchema.safeParse(row);
    if (!parsed.success) {
      dropped.push({
        index,
        reason: parsed.error.issues
          .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("; "),
      });
      return;
    }
    if (seen.has(parsed.data.ps_number)) {
      dropped.push({
        index,
        reason: `duplicate ps_number ${parsed.data.ps_number}`,
      });
      return;
    }
    seen.add(parsed.data.ps_number);
    records.push(parsed.data);
  });

  if (records.length === 0) {
    throw new Error(
      "No valid problem statements survived validation — re-run sih_scraper.py",
    );
  }

  return { records, dropped };
}
