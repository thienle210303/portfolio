/**
 * The one identifier the timeline and anything linking into it have to agree
 * on. It lives here, next to the section that renders it, for the same reason
 * `SelectedWork/anchors.ts` exists: a jump link that disagrees with its target
 * by one character fails silently — the browser simply does nothing.
 *
 * Derived from `entry.id`, never authored, so an entry added to or removed
 * from `careerEntries` needs no edit anywhere else.
 *
 * ## Why `journey-entry-…` and not the heading's `journey-…-role`
 *
 * `TimelineEntry` already emits `journey-${entry.id}-role` on its `<h3>` and
 * hands `journey-${entry.id}` to `Disclosure`, which derives `-trigger` and
 * `-panel` from it. A fourth id in that namespace one suffix away from the
 * other three is how a duplicate id gets shipped, and the heading is the wrong
 * target regardless: it is the second thing in the entry. Below the `md`
 * breakpoint the date range and the type tag are stacked *above* it, so
 * landing on the heading puts them behind the sticky header — the entry would
 * arrive without its own date. The anchor is the `<li>`, which is the whole
 * entry in both layouts.
 */
import { careerEntries } from "@/content/portfolio";

/** Anchor id for one career entry's `<li>` on the timeline. */
export function journeyEntryAnchorId(entryId: string): string {
  return `journey-entry-${entryId}`;
}

const RENDERED_IDS: ReadonlySet<string> = new Set(careerEntries.map((entry) => entry.id));

/**
 * The anchor for an entry the timeline actually renders, or `undefined` when
 * no such entry exists.
 *
 * Callers link only when this returns a string. That is the difference between
 * a cross-reference and a dead fragment: `Timeline` renders exactly
 * `careerEntries` (its filter hides entries, and the fragment handler in
 * Timeline.tsx un-hides them again), so membership here is the same question
 * as "will an element with this id be in the document".
 */
export function journeyEntryAnchor(entryId: string): string | undefined {
  return RENDERED_IDS.has(entryId) ? journeyEntryAnchorId(entryId) : undefined;
}
