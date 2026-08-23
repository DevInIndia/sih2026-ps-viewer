import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DetailView } from "@/components/detail-view";
import { RECORDS, getRecord } from "@/lib/records";
import { unmangle } from "@/lib/text";

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

  const summary = unmangle(record.description).replace(/\s+/g, " ").slice(0, 200);

  return {
    title: `${record.ps_number} · ${record.title}`,
    description:
      summary || `${record.title} — ${record.org}, ${record.theme}.`,
    alternates: { canonical: `/ps/${record.ps_number}` },
    openGraph: {
      type: "article",
      title: `${record.ps_number} · ${record.title}`,
      description: summary || `${record.org} · ${record.theme}`,
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

  return <DetailView record={record} />;
}
