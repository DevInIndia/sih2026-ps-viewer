import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DetailView } from "@/components/detail-view";
import { JsonLd } from "@/components/json-ld";
import { RECORDS, getRecord } from "@/lib/records";
import { metaDescription, statementTitle } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

type Params = { ps: string };

/**
 * Every statement is prerendered at build time, and `dynamicParams = false`
 * means anything not in that list is a 404 rather than a request-time render.
 * A crafted `/ps/<anything>` therefore never reaches application code.
 */
export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return RECORDS.map((record) => ({ ps: record.ps_number }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { ps } = await params;
  const record = getRecord(ps);
  if (!record) return { title: "Statement not found" };

  const title = statementTitle(record.ps_number, record.title);
  const description = metaDescription(
    record.description,
    `${record.title} — ${record.org}, ${record.theme}.`,
  );

  return {
    title,
    description,
    alternates: { canonical: `/ps/${record.ps_number}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/ps/${record.ps_number}`,
    },
  };
}

export default async function ProblemStatementPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { ps } = await params;
  const record = getRecord(ps);
  if (!record) notFound();

  /**
   * Describes exactly what the page shows, using only fields the portal
   * published: the title, the brief, the PS number, the issuing organisation
   * and the theme. No author, date, rating or price is claimed, because the
   * dataset has none — and this site did not write the statement.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: record.title,
    identifier: record.ps_number,
    description: metaDescription(
      record.description,
      `${record.title} — ${record.org}, ${record.theme}.`,
    ),
    url: `${siteUrl()}/ps/${record.ps_number}`,
    inLanguage: "en",
    ...(record.org
      ? { publisher: { "@type": "Organization", name: record.org } }
      : {}),
    ...(record.theme ? { about: { "@type": "Thing", name: record.theme } } : {}),
    isPartOf: {
      "@type": "WebSite",
      name: "SIH 2026 Problem Statements",
      url: `${siteUrl()}/`,
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <DetailView record={record} />
    </>
  );
}
