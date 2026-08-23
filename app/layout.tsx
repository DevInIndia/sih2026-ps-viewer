import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono, Newsreader } from "next/font/google";

import "./globals.css";

/**
 * Fonts are downloaded at build time and served from our own origin, which
 * keeps the Content-Security-Policy in next.config.ts free of any third-party
 * host and removes a render-blocking round trip to Google.
 */
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-archivo",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-newsreader",
  display: "swap",
});

function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "SIH 2026 Problem Statements",
    template: "%s · SIH 2026",
  },
  description:
    "Search, filter and shortlist every Smart India Hackathon 2026 problem statement — by theme, organisation, department and category.",
  applicationName: "SIH 2026 Problem Statements",
  keywords: [
    "Smart India Hackathon",
    "SIH 2026",
    "problem statements",
    "hackathon",
  ],
  openGraph: {
    type: "website",
    siteName: "SIH 2026 Problem Statements",
    title: "SIH 2026 Problem Statements",
    description:
      "Search, filter and shortlist every Smart India Hackathon 2026 problem statement.",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f1c" },
  ],
};

/**
 * Applies a saved theme choice before first paint.
 *
 * "system" is represented by the *absence* of `data-theme`, which the CSS
 * already handles through `prefers-color-scheme` — so this only has to act on
 * an explicit light/dark override, and cannot flash on a fresh visit.
 */
const themeBootstrap = `
try {
  var v = localStorage.getItem("sih2026.theme");
  if (v === "light" || v === "dark") {
    document.documentElement.setAttribute("data-theme", v);
  }
} catch (e) {}
`.trim();

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${archivo.variable} ${plexMono.variable} ${newsreader.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="antialiased">
        <a
          href="#results"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-pop"
        >
          Skip to results
        </a>
        {children}
      </body>
    </html>
  );
}
