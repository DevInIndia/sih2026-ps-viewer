import type { Metadata } from "next";

import { DatabaseIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { AUTHOR } from "@/lib/author";
import { LIST_ITEMS, SUMMARY } from "@/lib/records";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

export default function WorkspaceHome() {
  const base = siteUrl();

  /**
   * `WebSite` plus the author already named in the footer, and an `ItemList` of
   * the statements the page genuinely lists — all 226 are in the rendered HTML,
   * so the markup matches what a reader and a crawler both see.
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

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Smart India Hackathon 2026 problem statements",
    numberOfItems: LIST_ITEMS.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: LIST_ITEMS.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${item.ps} · ${item.title}`,
      url: `${base}/ps/${item.ps}`,
    })),
  };

  return (
    <>
      <JsonLd data={website} />
      <JsonLd data={itemList} />

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
