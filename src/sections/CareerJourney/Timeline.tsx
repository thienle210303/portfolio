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
 *
 * ## Fragment links into a filtered list
 *
 * The career tree's leaves link at individual entries here
 * (`journey-entry-<id>`, see ./anchors.ts). A filter is a client-side
 * decision this component owns, so an entry the current filter excludes is
 * simply not in the document: the browser follows such a link, finds no
 * element, and does nothing at all — a link that visibly fails.
 *
 * So this island watches for its own fragments and makes sure the entry is
 * showing before anything is scrolled to:
 *
 *   mount        a cold load of `/#journey-entry-x`. The filter starts at
 *                "all", so the entry is already rendered; this pass exists to
 *                move focus there as well as the viewport.
 *   hashchange   every in-page activation that *changes* the fragment —
 *                whether the target was rendered at the time or not, because
 *                the fragment updates either way. This is the case that
 *                matters: it fires with the filter still set, the filter is
 *                widened, and the scroll happens on the render after.
 *   click        the one gap hashchange leaves: re-activating a link to the
 *                fragment the page is *already* on fires no event at all,
 *                and that is precisely the state a visitor reaches by
 *                following a leaf and then filtering the entry away again.
 *
 * Nothing here calls `preventDefault()`. The browser still owns the URL and
 * the history entry; this only widens the filter and finishes the scroll the
 * browser could not perform.
 *
 * Without JavaScript this end of the link still holds up: the filter's
 * initial state is "all", so every entry is in the document and the browser's
 * own fragment navigation lands on one unaided (the `<li>` carries
 * `scroll-margin-top: 80px`, so it arrives clear of the sticky header too).
 * What does not survive is the other end. The links live inside the career
 * tree's leaves, and a leaf is a Disclosure: at >=1024px all 25 of the drawn
 * tree's leaves are collapsed, and the list presentation that would hold the
 * other 25 is `display: none` there, so zero of the 50 links are reachable at
 * all. Below 1024px it is 12 — the leaves of the one lens whose panel starts
 * open. So this is progressive enhancement of the *target*, not of the
 * journey: it means a link that is reachable always works, not that every
 * link is reachable.
 *
 * A filter that already includes the entry is left alone rather than reset to
 * "all" — the visitor's choice survives a jump that did not need it undone,
 * and the live region announces nothing it does not have to.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { CareerEntry, CareerEntryType } from "@/types/portfolio";
import { FilterGroup, type FilterOption } from "@/components/ui/FilterGroup";
import { journeyEntryAnchorId } from "./anchors";
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

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function Timeline({ entries }: TimelineProps) {
  const [filter, setFilter] = useState<FilterValue>("all");
  /** An anchor `reveal` could not land on yet because the entry was filtered
   *  out at the time. A ref rather than state: it is a hand-off between an
   *  event and the very next commit, never something rendered, and writing it
   *  must not itself schedule a render. */
  const pendingAnchorRef = useRef<string | null>(null);

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

  /** The entry a fragment points at, matched against the anchors the entries
   *  themselves render rather than parsed out of the hash — a fragment that
   *  merely looks like one of ours can never name an entry that isn't here. */
  const entryForHash = useCallback(
    (hash: string): CareerEntry | undefined => {
      const id = hash.startsWith("#") ? hash.slice(1) : hash;
      if (id === "") return undefined;
      return entries.find((entry) => journeyEntryAnchorId(entry.id) === id);
    },
    [entries],
  );

  /** Land on an anchor if the entry it names is on the page right now.
   *  Returns false when it is not, which is the whole filtered-out case. */
  const landOn = useCallback((anchor: string): boolean => {
    const target = document.getElementById(anchor);
    if (target === null) return false;
    // Focus first, without scrolling: the entry carries tabindex="-1" for
    // exactly this, so a keyboard visitor continues from the entry rather
    // than from the link they left, and a screen reader announces the entry
    // (the <li> is labelled by its own role heading). The scroll below stays
    // in charge of position.
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
    return true;
  }, []);

  /** Make sure `entry` is showing, then land on it. Two paths, because the
   *  entry is only sometimes already there: if the current filter includes it
   *  nothing needs to change and this lands immediately; if it does not, the
   *  filter widens and the effect below finishes the job on the commit that
   *  puts the entry back in the document. */
  const reveal = useCallback(
    (entry: CareerEntry) => {
      const anchor = journeyEntryAnchorId(entry.id);
      pendingAnchorRef.current = anchor;
      setFilter((current) => (current === "all" || current === entry.type ? current : "all"));
      if (landOn(anchor)) pendingAnchorRef.current = null;
    },
    [landOn],
  );

  // The second half of `reveal`, for the case where the entry had to be
  // un-filtered first. Runs on every filter change; the ref is null for all
  // the ones a visitor made themselves, so those scroll nothing. Cleared
  // whether or not it lands, so a handed-off anchor can never fire later
  // against an unrelated filter change.
  useEffect(() => {
    const anchor = pendingAnchorRef.current;
    pendingAnchorRef.current = null;
    if (anchor !== null) landOn(anchor);
  }, [filter, landOn]);

  // A fragment already in the URL at load, and every later change to it
  // (in-page links, and Back/Forward between two of them).
  useEffect(() => {
    function handleHash() {
      const entry = entryForHash(window.location.hash);
      if (entry) reveal(entry);
    }

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [entryForHash, reveal]);

  // The gap hashchange leaves: a link to the fragment the page is already on
  // navigates nowhere and fires nothing, so a second visit to the same entry
  // after filtering it away would do nothing. Only that case is handled here
  // — everything else is left to the listener above, so a normal click is
  // never processed twice — and modified clicks are ignored, because
  // opening a link in a new tab must not touch this page's filter.
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a");
      if (link === null) return;
      if (link.hash === "" || link.hash !== window.location.hash) return;
      if (link.origin !== window.location.origin || link.pathname !== window.location.pathname) {
        return;
      }

      const entry = entryForHash(link.hash);
      if (entry) reveal(entry);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [entryForHash, reveal]);

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
