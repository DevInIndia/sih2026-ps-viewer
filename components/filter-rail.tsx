"use client";

import { useId } from "react";

import { SearchIcon, XIcon } from "@/components/icons";
import {
  Field,
  buttonClass,
  inputClass,
  selectClass,
} from "@/components/ui";
import { cx } from "@/lib/cx";
import { MAX_QUERY_LENGTH } from "@/lib/query";
import {
  CATEGORIES,
  SORT_KEYS,
  SORT_LABELS,
  isCategory,
  isSortKey,
  type Facet,
  type Filters,
  type SortKey,
} from "@/lib/types";

export type FacetCounts = {
  categories: Map<string, number>;
  themes: Map<string, number>;
  orgs: Map<string, number>;
  departments: Map<string, number>;
};

const CATEGORY_LABEL: Record<string, string> = {
  "": "All",
  Software: "Software",
  Hardware: "Hardware",
};

export function SearchBox({
  value,
  onChange,
  inputRef,
  placeholder = "Title, description, org…",
  showHint = false,
  id,
}: {
  value: string;
  onChange: (next: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
  placeholder?: string;
  showHint?: boolean;
  id?: string;
}) {
  return (
    <div className="relative flex">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-3" />
      <input
        id={id}
        ref={inputRef}
        type="search"
        value={value}
        // Hard cap: the value feeds a dynamically built highlight regex.
        maxLength={MAX_QUERY_LENGTH}
        spellCheck={false}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label="Search problem statements"
        className={cx(inputClass, "pr-8 pl-8")}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded text-ink-3 hover:bg-surface-3 hover:text-ink"
        >
          <XIcon className="size-3.5" />
        </button>
      ) : showHint ? (
        <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded-[3px] border border-rule px-1 font-mono text-[0.66rem] text-ink-3">
          /
        </kbd>
      ) : null}
    </div>
  );
}

function CountedSelect({
  label,
  value,
  onChange,
  facets,
  counts,
  allLabel,
  total,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  facets: readonly Facet[];
  counts: Map<string, number>;
  allLabel: string;
  total: number;
}) {
  const id = useId();
  return (
    <Field label={label}>
      <select
        id={id}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        className={selectClass}
      >
        <option value="">
          {allLabel} ({total})
        </option>
        {facets.map((facet) => (
          <option key={facet.name} value={facet.name}>
            {facet.name} ({counts.get(facet.name) ?? 0})
          </option>
        ))}
      </select>
    </Field>
  );
}

export function FilterRail({
  filters,
  update,
  reset,
  facets,
  counts,
  total,
  searchRef,
  sort,
  setSort,
  hasQuery,
  onShowSyntax,
}: {
  filters: Filters;
  update: (patch: Partial<Filters>) => void;
  reset: () => void;
  facets: {
    themes: readonly Facet[];
    orgs: readonly Facet[];
    departments: readonly Facet[];
  };
  counts: FacetCounts;
  total: number;
  searchRef: React.Ref<HTMLInputElement>;
  /** The sort actually in effect, which may be chosen for you — see the shell. */
  sort: SortKey;
  setSort: (sort: SortKey) => void;
  hasQuery: boolean;
  onShowSyntax: () => void;
}) {
  const themeSet = new Set(filters.themes);

  function toggleTheme(name: string) {
    const next = new Set(themeSet);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    update({ themes: [...next] });
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-4 pb-16">
      <Field
        label="Search"
        action={
          <button
            type="button"
            onClick={onShowSyntax}
            className="font-mono text-[0.64rem] tracking-[0.08em] text-accent-ink uppercase underline underline-offset-[3px] hover:text-accent"
          >
            syntax
          </button>
        }
      >
        <SearchBox
          value={filters.query}
          onChange={(query) => update({ query })}
          inputRef={searchRef}
          showHint
        />
        <p className="px-0.5 font-mono text-[0.63rem] leading-relaxed text-ink-3">
          {'"exact phrase" · -exclude · org:isro'}
        </p>
      </Field>

      <Field label="Category">
        <div
          role="group"
          aria-label="Category"
          className="grid grid-cols-3 gap-[3px] rounded-md border border-rule bg-surface-2 p-[3px]"
        >
          {CATEGORIES.map((category) => {
            const on = filters.category === category;
            const count = category
              ? (counts.categories.get(category) ?? 0)
              : [...counts.categories.values()].reduce((a, b) => a + b, 0);
            return (
              <button
                key={category || "all"}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  update({ category: isCategory(category) ? category : "" })
                }
                className={cx(
                  "h-7 rounded text-[0.78rem] transition-colors",
                  on
                    ? "bg-surface font-semibold text-ink shadow-card"
                    : "font-medium text-ink-2 hover:text-ink",
                )}
              >
                {CATEGORY_LABEL[category] ?? category}
                <span className="ml-1 font-mono text-[0.62rem] text-ink-3 tnum">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </Field>

      <Field
        label="Theme"
        action={
          filters.themes.length ? (
            <button
              type="button"
              onClick={() => update({ themes: [] })}
              className="font-mono text-[0.64rem] tracking-[0.08em] text-accent-ink uppercase underline underline-offset-[3px] hover:text-accent"
            >
              clear
            </button>
          ) : null
        }
      >
        <div className="flex flex-col">
          {facets.themes.map((facet) => {
            const on = themeSet.has(facet.name);
            const count = counts.themes.get(facet.name) ?? 0;
            return (
              <label
                key={facet.name}
                className={cx(
                  "grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-2",
                  "rounded px-1.5 py-1 text-[0.82rem] transition-colors hover:bg-surface-2",
                  on ? "font-medium text-ink" : "text-ink-2 hover:text-ink",
                  count === 0 && !on && "opacity-45",
                )}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleTheme(facet.name)}
                  className="size-3.5 accent-accent"
                />
                <span className="truncate" title={facet.name}>
                  {facet.name}
                </span>
                <span className="font-mono text-[0.7rem] text-ink-3 tnum">
                  {count}
                </span>
              </label>
            );
          })}
        </div>
      </Field>

      <CountedSelect
        label="Organisation"
        allLabel="All organisations"
        value={filters.org}
        onChange={(org) => update({ org })}
        facets={facets.orgs}
        counts={counts.orgs}
        total={total}
      />

      <CountedSelect
        label="Department"
        allLabel="All departments"
        value={filters.department}
        onChange={(department) => update({ department })}
        facets={facets.departments}
        counts={counts.departments}
        total={total}
      />

      <Field label="Refine">
        <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[0.82rem] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
          <input
            type="checkbox"
            checked={filters.datasetOnly}
            onChange={(event) => update({ datasetOnly: event.target.checked })}
            className="size-3.5 accent-accent"
          />
          Has a dataset link
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[0.82rem] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
          <input
            type="checkbox"
            checked={filters.shortlistedOnly}
            onChange={(event) =>
              update({ shortlistedOnly: event.target.checked })
            }
            className="size-3.5 accent-accent"
          />
          Shortlisted only
        </label>
      </Field>

      <Field label="Sort">
        <select
          value={sort}
          aria-label="Sort results"
          onChange={(event) => {
            const next = event.target.value;
            if (isSortKey(next)) setSort(next);
          }}
          className={selectClass}
        >
          {SORT_KEYS.map((key) => (
            <option
              key={key}
              value={key}
              // Relevance ranks against the query; with no query there is
              // nothing to rank, so it would silently behave as PS order.
              disabled={key === "relevance" && !hasQuery}
            >
              {SORT_LABELS[key]}
            </option>
          ))}
        </select>
      </Field>

      <button type="button" onClick={reset} className={buttonClass}>
        Reset all filters
      </button>
    </div>
  );
}
