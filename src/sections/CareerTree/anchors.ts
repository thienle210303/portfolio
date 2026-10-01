/**
 * The one identifier the Journey's per-entry fragments and anything linking
 * into them have to agree on. It lives here, next to the section that renders
 * it, because a jump link that disagrees with its target by one character
 * fails silently — the browser simply does nothing. (Selected Work kept its
 * own `anchors.ts` for the same reason until round 18 deleted the section.)
 *
 * Derived from `entry.id`, never authored, so an entry added to or removed
 * from `careerEntries` needs no edit anywhere else.
 *
 * ## State of the guarantee — read this before trusting `journeyEntryAnchor`
 *
 * These ids were rendered by `TimelineEntry`'s `<li>`, deleted in round 18 when
 * the pinned stage replaced the timeline. **Nothing renders a
 * `journey-entry-<id>` element today.** `journeyEntryAnchor` therefore says
 * "this id is one the Journey will own", not "this id is in the document", and
 * a link built from it is a dead fragment until the stage's acts re-add the
 * anchors (Task 13 of round 18, which also asserts that every one resolves).
 * Do not add a caller before then.
 *
 * ## Why `journey-entry-…` and not `journey-…-role`
 *
 * The timeline used to emit `journey-${entry.id}-role` on an `<h3>` and hand
 * `journey-${entry.id}` to `Disclosure`, which derives `-trigger` and `-panel`
 * from it. The anchor kept a different suffix on purpose, and still does:
 * a fourth id in that namespace one suffix from the others is how a duplicate
 * id gets shipped.
 *
 * The `journey-` prefix outlives the section of the same name: every existing
 * fragment — old bookmarks, the tree's own former leaf links — names entries
 * this way, so the prefix stays rather than forcing every existing link to
 * learn a new one.
 */
import { careerEntries } from "@/content/portfolio";

/** Anchor id for one career entry's fragment. See the note above: nothing
 *  renders an element with this id until the stage's acts do. */
export function journeyEntryAnchorId(entryId: string): string {
  return `journey-entry-${entryId}`;
}

const RENDERED_IDS: ReadonlySet<string> = new Set(careerEntries.map((entry) => entry.id));

/**
 * The anchor for a career entry that exists, or `undefined` when no such entry
 * exists.
 *
 * What this guarantees is that the id names a real entry — an id the Journey is
 * meant to own — and rejects a round-tripped anchor or a typo. It does **not**
 * guarantee an element with that id is in the document: through round 17 it
 * did, because `Timeline` rendered exactly `careerEntries`; since round 18
 * nothing renders these ids, and until the stage's acts re-add them a link
 * built from this is a dead fragment. Task 13 closes that, and its e2e spec is
 * what will make the stronger claim true again.
 */
export function journeyEntryAnchor(entryId: string): string | undefined {
  return RENDERED_IDS.has(entryId) ? journeyEntryAnchorId(entryId) : undefined;
}

/* -------------------------------------------------------------------------- */
/* Case studies                                                                */
/* -------------------------------------------------------------------------- */

/*
 * The two identifiers a case-study article and anything linking at it have to
 * agree on. They moved here from `SelectedWork/anchors.ts` in round 18 along
 * with `CaseStudy.tsx` itself, because the case studies now render inside the
 * Journey's branches; the section they used to live in, and its `anchors.ts`,
 * are deleted.
 *
 * Derived from `project.id`, never authored: a project added to or removed
 * from `projects` renumbers everything without anyone editing a list.
 */

/**
 * Anchor id for a case study's `<article>`.
 *
 * Deliberately not `case-study-${id}`: `Disclosure` already derives
 * `case-study-${id}-trigger` and `case-study-${id}-panel` from that string
 * inside every case study, and two id namespaces one suffix apart is how a
 * duplicate id gets shipped.
 */
export function caseStudyAnchorId(projectId: string): string {
  return `work-${projectId}`;
}

/** Two-digit index numeral, e.g. `03`. */
export function caseStudyNumeral(index: number): string {
  return String(index + 1).padStart(2, "0");
}
