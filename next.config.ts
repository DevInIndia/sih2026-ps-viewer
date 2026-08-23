import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy.
 *
 * Everything the page needs is served from our own origin: fonts are
 * self-hosted by `next/font`, there are no analytics, no CDN scripts and no
 * runtime network calls beyond the statically generated search index. So the
 * policy can be closed down to `'self'` almost everywhere.
 *
 * `'unsafe-inline'` stays on `script-src` because Next.js emits a small inline
 * bootstrap script for hydration; removing it needs a per-request nonce, which
 * would force every page out of static generation. It is a low-value relaxation
 * here: no scraped text is ever injected as HTML — every field goes through
 * React as a text child (see lib/text.ts), so there is no injection point for
 * an attacker to reach in the first place.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "camera=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "payment=()",
      "usb=()",
      "interest-cohort=()",
    ].join(", "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  // The dataset is read at build time only; nothing here should ever be
  // rendered from a request, so fail loudly rather than silently degrading.
  typescript: { ignoreBuildErrors: false },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // The search index is content-addressed by the build, so it can be
        // cached hard and revalidated on deploy.
        source: "/search-index",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
