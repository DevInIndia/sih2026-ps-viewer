import { buildSearchIndex } from "@/lib/records";

/**
 * The full-text haystack, keyed by PS number.
 *
 * Prerendered to a static document at build time (`force-static`), so it is a
 * plain CDN asset with no server work per request. Keeping the descriptions
 * here rather than in the initial page payload cuts roughly 200 KB (gzipped)
 * off first load; the client fetches it in the background and upgrades search
 * from metadata-only to full-text once it arrives.
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json(buildSearchIndex(), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
