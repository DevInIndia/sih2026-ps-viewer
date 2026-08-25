/**
 * The site's absolute base URL.
 *
 * Resolution order matters for correctness of canonicals:
 *
 *  1. `NEXT_PUBLIC_SITE_URL` — set this once a custom domain is attached.
 *  2. `VERCEL_PROJECT_PRODUCTION_URL` — the *production* host, which Vercel
 *     supplies even during a preview build. That is what makes a preview
 *     deployment canonicalise to production instead of to itself.
 *  3. `VERCEL_URL` — this specific deployment; only reached when there is no
 *     production domain yet.
 *  4. localhost, for development.
 *
 * Returned without a trailing slash so callers can append their own path.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
