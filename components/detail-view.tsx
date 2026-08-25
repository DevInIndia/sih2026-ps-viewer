import { Newsreader } from "next/font/google";

import { Brief } from "@/components/brief";
import { CopyButton } from "@/components/copy-button";
import { CopyLinkButton } from "@/components/copy-link-button";
import { ExternalIcon } from "@/components/icons";
import { LinkList } from "@/components/link-list";
import { StarButton } from "@/components/star-button";
import {
  SectionLabel,
  Tag,
  buttonClass,
  toneForCategory,
} from "@/components/ui";
import { cx } from "@/lib/cx";
import type { ProblemStatement } from "@/lib/schema";
import { unmangle } from "@/lib/text";

const PORTAL_URL = "https://sih.gov.in/sih2026PS";

/**
 * The serif used for the problem brief, declared here rather than in the root
 * layout.
 *
 * This module is only reachable from /ps/[ps], so Next preloads the face on
 * statement pages and nowhere else. Declared globally it was 58 KB — the
 * largest single font file — downloaded on the landing page, where it painted
 * no characters at all.
 *
 * `--font-newsreader` therefore only exists inside this subtree; `--font-read`
 * in globals.css falls through to Georgia elsewhere, which no other rule uses.
 */
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-newsreader",
  display: "swap",
});

function Fact({
  label,
  value,
  blank = "Not listed on the portal",
  extra,
  wide = false,
  children,
}: {
  label: string;
  value?: string;
  blank?: string;
  extra?: React.ReactNode;
  wide?: boolean;
  children?: React.ReactNode;
}) {
  const hasContent = children !== undefined ? children !== null : !!value;

  return (
    <div
      className={cx(
        // The 1px grid gap is drawn by each cell's own hairline shadow rather
        // than by a background showing through, so a row that auto-fit leaves
        // half-empty does not end up with a stray coloured block in it.
        "flex flex-col gap-0.5 bg-surface-2 px-3 py-2.5",
        "shadow-[0_0_0_1px_var(--rule-soft)]",
        wide && "col-span-full",
      )}
    >
      <dt className="font-mono text-[0.62rem] font-medium tracking-[0.1em] text-ink-3 uppercase">
        {label}
      </dt>
      <dd
        className={cx(
          "text-[0.84rem] leading-[1.42] break-words",
          hasContent ? "text-ink" : "text-ink-3 italic",
        )}
      >
        {hasContent ? (children ?? value) : blank}
        {hasContent ? extra : null}
      </dd>
    </div>
  );
}

export function DetailView({ record }: { record: ProblemStatement }) {
  const datasetText = unmangle(record.dataset_link);
  const youtubeText = unmangle(record.youtube);
  const contactText = unmangle(record.contact);

  return (
    <article
      className={cx(
        newsreader.variable,
        "serif-scope",
        "mx-auto max-w-[78ch] px-4 pt-5 pb-24 wide:px-8 wide:pt-8",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <Tag tone={toneForCategory(record.category)}>{record.category}</Tag>
        <Tag tone="theme">{record.theme}</Tag>
        <span className="micro tnum">{record.ps_number}</span>
      </div>

      {/* The page's H1: the statement this page is about. Same classes as
          before, so nothing moves. */}
      <h1 className="mb-1 text-[clamp(1.3rem,2.3vw,1.7rem)] leading-[1.22] font-bold tracking-[-0.02em] text-balance">
        {record.title}
      </h1>
      <p className="mb-5 text-[0.92rem] text-ink-2">{record.org}</p>

      <div className="no-print mb-7 flex flex-wrap gap-2">
        <StarButton ps={record.ps_number} />
        <CopyButton value={record.ps_number} label="Copy PS number" />
        <CopyLinkButton ps={record.ps_number} />
        <a
          href={PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
        >
          <ExternalIcon className="size-3.5" />
          Open sih.gov.in
        </a>
      </div>

      <dl className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-px overflow-hidden rounded-lg border border-rule-soft bg-surface-2">
        <Fact label="Organisation" value={record.org} />
        <Fact label="Department" value={record.department} />
        <Fact label="Category" value={record.category} />
        <Fact label="Theme" value={record.theme} />
        <Fact
          label="Submission deadline"
          value={record.deadline}
          extra={
            record.deadline_date ? (
              <span className="ml-1.5 font-mono text-[0.72rem] text-ink-3">
                {record.deadline_date}
              </span>
            ) : null
          }
        />
        <Fact label="Ideas submitted" value={record.ideas} />
        <Fact label="Serial number" value={record.sno} />
        <Fact label="Data captured on" value={record.scraped_at} />

        <Fact label="Dataset link" wide blank="No dataset link published">
          {datasetText ? <LinkList value={record.dataset_link} /> : null}
        </Fact>
        <Fact label="Contact info" wide blank="No contact published">
          {contactText || null}
        </Fact>
        <Fact label="Youtube link" wide blank="No video published">
          {youtubeText ? <LinkList value={record.youtube} /> : null}
        </Fact>
      </dl>

      <SectionLabel>Problem brief</SectionLabel>
      <Brief description={record.description} />
    </article>
  );
}
