import type { MetadataRoute } from "next";

import { RECORDS, SUMMARY } from "@/lib/records";
import { siteUrl } from "@/lib/site";

/**
 * Every indexable page, and nothing else.
 *
 * `lastModified` is the date the dataset was scraped, not the build time. Using
 * the build time marked all 227 URLs as freshly modified on every deploy even
 * when the content was identical, which is exactly the signal that teaches a
 * crawler to stop trusting the field.
 *
 * Machine artifacts are excluded: /search-index is JSON for the client and
 * carries `X-Robots-Tag: noindex`; /robots.txt and /sitemap.xml are not content.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();

  // `scraped_at` is an ISO date (2026-08-23). Fall back to now only if the
  // dataset ever loses the field, rather than emitting an Invalid Date.
  const captured = new Date(SUMMARY.capturedAt);
  const lastModified = Number.isNaN(captured.valueOf()) ? new Date() : captured;

  return [
    {
      // No trailing slash: Next normalises the home page's canonical to the
      // bare origin, and the sitemap has to name the same URL it declares.
      url: base,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...RECORDS.map((record) => ({
      url: `${base}/ps/${record.ps_number}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
