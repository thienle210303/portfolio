"use client";

/**
 * Client island: filter state (All / Work / Learning / Milestones) plus the
 * timeline list itself. Sort is by `sortKey` descending, compared as plain
 * strings — several keys carry an `-a`/`-b`/... suffix specifically so a
 * plain reverse-lexicographic sort produces the right order; parsing them
 * as dates would be wrong.
 *
 * `FilterGroup` (src/components/ui/FilterGroup.tsx) only renders the chip
 * selector — it has no visibility into how many results the current
 * selection actually matched, so this component owns a polite `aria-live`
 * region announcing the filtered count on every change. It is rendered as
 * ordinary visible text rather than a visually-hidden-only announcement, so
 * sighted and assistive-technology users get the same information from the
 * same place.
 *
 * ## Timeline line anchoring (why it can't dangle or gap after filtering)
 * There is no single absolutely-positioned line sized against the whole
 * list container — that is the naive approach that dangles: a container's
 * top/bottom edges rarely land exactly on the first/last marker once any
 * padding exists, and a height computed once does not shrink when
 * filtering removes entries from either end.
 *
 * Instead each `TimelineEntry` draws its own connector segment, anchored to
 * its own `<li>` box (`inset-y-0`, which includes that `<li>`'s own
 * padding) from a fixed offset near the top — where its own marker sits —
 * down to the bottom of its own box. Consecutive `<li>`s are contiguous in
 * normal flow (inter-entry spacing is padding, never margin/gap), so one
 * entry's segment meets the next entry's start with no visible seam. The
 * first rendered entry has nothing above its marker's fixed offset, so
 * there is never a stub above the list. The entry that is *currently last*
 * is passed `isLast` and skips drawing a segment entirely, so nothing
 * dangles below the list. Because "last" is recomputed from the filtered
 * array on every render (`index === filtered.length - 1`), this holds
 * automatically after any filter change — no special-casing for filtering
 * anywhere.
 */
import { useState } from "react";
import type { CareerEntry, CareerEntryType } from "@/types/portfolio";
import { FilterGroup, type FilterOption } from "@/components/ui/FilterGroup";
import { TimelineEntry } from "./TimelineEntry";

interface TimelineProps {
  readonly entries: readonly CareerEntry[];
}

type FilterValue = "all" | CareerEntryType;

const FILTERS: ReadonlyArray<{ readonly id: FilterValue; readonly label: string }> = [
  { id: "all", label: "All" },
  { id: "work", label: "Work" },
  { id: "learning", label: "Learning" },
  { id: "milestone", label: "Milestones" },
];

function isFilterValue(id: string): id is FilterValue {
  return FILTERS.some((filter) => filter.id === id);
}

/** Descending sort on `sortKey`, compared as plain strings — never parsed
 * as a date. Copies before sorting so the shared content array from
 * `@/content/portfolio` is never mutated in place. */
function sortByKeyDescending(entries: readonly CareerEntry[]): CareerEntry[] {
  return [...entries].sort((a, b) => {
    if (a.sortKey < b.sortKey) return 1;
    if (a.sortKey > b.sortKey) return -1;
    return 0;
  });
}

export default function Timeline({ entries }: TimelineProps) {
  const [filter, setFilter] = useState<FilterValue>("all");

  const sorted = sortByKeyDescending(entries);
  const options: FilterOption[] = FILTERS.map(({ id, label }) => ({
    id,
    label,
    count: id === "all" ? sorted.length : sorted.filter((entry) => entry.type === id).length,
  }));
  const filtered = filter === "all" ? sorted : sorted.filter((entry) => entry.type === filter);

  function handleFilterChange(id: string) {
    if (isFilterValue(id)) setFilter(id);
  }

  const noun = filtered.length === 1 ? "entry" : "entries";
  const resultText =
    filter === "all"
      ? `Showing all ${filtered.length} ${noun}`
      : `Showing ${filtered.length} of ${sorted.length} ${noun}`;

  return (
    <div>
      <FilterGroup
        label="Filter career entries by type"
        options={options}
        value={filter}
        onChange={handleFilterChange}
        idPrefix="journey-filter"
      />

      <p
        role="status"
        aria-live="polite"
        className="mt-4 font-mono text-[length:var(--step--1)] uppercase tracking-[0.06em] text-[color:var(--fg-subtle)]"
      >
        {resultText}
      </p>

      <div className="mt-8 md:mt-10">
        {filtered.length === 0 ? (
          <div className="border border-[color:var(--rule-color)] p-6">
            <p className="text-[length:var(--step-0)] leading-[1.6] text-[color:var(--fg-muted)]">
              No entries match this filter yet. Choose a different category above.
            </p>
          </div>
        ) : (
          <ol role="list" aria-label="Career timeline">
            {filtered.map((entry, index) => (
              <TimelineEntry
                key={entry.id}
                entry={entry}
                isFirst={index === 0}
                isLast={index === filtered.length - 1}
              />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
