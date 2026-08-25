import type { Metadata } from "next";

import { DatabaseIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { AUTHOR } from "@/lib/author";
import { SUMMARY } from "@/lib/records";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

export default function WorkspaceHome() {
  const base = siteUrl();

  /**
   * `WebSite`, plus the author already named in the footer.
   *
   * An `ItemList` of all 226 statements was tried here and removed: it added
   * 24 KB gzipped to the home page to restate URLs that are already present as
   * real anchors in the HTML and again in the sitemap. Nothing was discoverable
   * only through it, so the weight bought nothing.
   */
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SIH 2026 Problem Statements",
    url: `${base}/`,
    description:
      "Search, filter and shortlist every Smart India Hackathon 2026 problem statement — by theme, organisation, department and category.",
    inLanguage: "en",
    author: {
      "@type": "Person",
      name: AUTHOR.name,
      url: AUTHOR.github,
      ...(AUTHOR.linkedin ? { sameAs: [AUTHOR.github, AUTHOR.linkedin] } : {}),
    },
  };

  return (
    <>
      <JsonLd data={website} />

      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-8 py-16 text-center">
        <DatabaseIcon className="size-9 text-rule" />
        <p className="max-w-[38ch] text-[0.88rem] text-ink-3">
          Pick a statement from the list to read its full brief, dataset links
          and submission details.
        </p>
        <p className="max-w-[42ch] text-[0.78rem] text-ink-3/80">
          {SUMMARY.total} statements from {SUMMARY.organisations} organisations
          across {SUMMARY.themes} themes, captured on {SUMMARY.capturedAt}.
        </p>
        <p className="mt-2 font-mono text-[0.68rem] tracking-[0.08em] text-ink-3/70 uppercase">
          Press{" "}
          <kbd className="rounded border border-rule px-1 py-0.5">/</kbd> to
          search ·{" "}
          <kbd className="rounded border border-rule px-1 py-0.5">?</kbd> for
          shortcuts
        </p>
      </div>
    </>
  );
}
