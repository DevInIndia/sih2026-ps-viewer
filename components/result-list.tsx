"use client";

import Link from "next/link";
import { memo } from "react";

import { Highlight } from "@/components/highlight";
import { RowStar } from "@/components/star-button";
import { Tag, toneForCategory } from "@/components/ui";
import { cx } from "@/lib/cx";
import type { ListItem } from "@/lib/types";

function Row({
  item,
  active,
  pattern,
}: {
  item: ListItem;
  active: boolean;
  pattern: RegExp | null;
}) {
  return (
    <li
      data-ps={item.ps}
      className="relative border-b border-rule-soft last:border-b-0"
    >
      <RowStar ps={item.ps} label={item.ps} />
      <Link
        href={`/ps/${item.ps}`}
        scroll={false}
        aria-current={active ? "true" : undefined}
        className={cx(
          "block border-l-[3px] py-3 pr-10 pl-3 transition-colors",
          active
            ? "border-l-accent bg-surface"
            : "border-l-transparent hover:bg-surface-2",
        )}
      >
        <span className="mb-1 flex items-center gap-2">
          <span
            className={cx(
              "font-mono text-[0.7rem] font-semibold tracking-[0.05em] tnum",
              active ? "text-accent-ink" : "text-ink-3",
            )}
          >
            <Highlight text={item.ps} pattern={pattern} />
          </span>
          <Tag tone={toneForCategory(item.category)}>{item.category}</Tag>
          {item.hasDataset ? (
            <span
              title="Has a dataset link"
              aria-label="Has a dataset link"
              className="size-1.5 rounded-full bg-good"
            />
          ) : null}
        </span>

        <h3 className="mb-1 text-[0.9rem] leading-[1.34] font-semibold text-balance text-ink">
          <Highlight text={item.title} pattern={pattern} />
        </h3>

        <span className="block text-[0.74rem] leading-[1.4] text-ink-3">
          <Highlight text={item.org} pattern={pattern} />
          <span aria-hidden="true"> · </span>
          {item.theme}
        </span>
      </Link>
    </li>
  );
}

const MemoRow = memo(Row);

export function ResultList({
  items,
  activePs,
  pattern,
  onClearFilters,
}: {
  items: readonly ListItem[];
  activePs: string | null;
  pattern: RegExp | null;
  onClearFilters: () => void;
}) {
  if (!items.length) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-[0.88rem] font-medium text-ink-2">
          No statement matches these filters.
        </p>
        <p className="mx-auto mt-1.5 max-w-[34ch] text-[0.8rem] text-ink-3">
          Try clearing the search box or unselecting a theme.
        </p>
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-4 font-mono text-[0.68rem] tracking-[0.08em] text-accent-ink uppercase underline underline-offset-4 hover:text-accent"
        >
          Reset all filters
        </button>
      </div>
    );
  }

  return (
    <ul id="results" className="list-none">
      {items.map((item) => (
        <MemoRow
          key={item.ps}
          item={item}
          active={item.ps === activePs}
          pattern={pattern}
        />
      ))}
    </ul>
  );
}
