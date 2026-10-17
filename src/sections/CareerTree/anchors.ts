/**
 * Every id the Journey owns that is not its own section id, and that something
 * outside this directory might name: the per-entry fragments, the retired
 * section ids, and the case-study ids at the bottom of the file. They live here,
 * next to the section that renders them, because a jump link that disagrees with
 * its target by one character fails silently — the browser simply does nothing.
 * (Selected Work kept its own `anchors.ts` for the same reason until round 18
 * deleted the section.) This file imports nothing, so anything may read it.
 *
 * The per-entry fragments are derived from `entry.id`, never authored, so an
 * entry added to or removed from `careerEntries` needs no edit anywhere else.
 *
 * ## State of the guarantee
 *
 * A drawn entry's fragment is its timeline row (`./KnowledgeTreeList.tsx`); a
 * demoted entry's is its line on the credentials strip
 * (`./CredentialsStrip.tsx`). Between them every career entry has exactly one
 * element. (Round 18's pinned stage carried them as zero-size spans inside its
 * acts; round 20 retired the stage and put them back on real content.)
 *
 * Both halves of that are asserted, because neither is worth much alone:
 * `tests/sections/CareerTree.test.tsx` requires an element for every
 * `careerEntries` entry after rendering the section, and
 * `e2e/legacy-anchors.spec.ts` requires the ids to be in the server-rendered
 * HTML and to land a real browser on the Journey with JavaScript disabled —
 * which is the case a jsdom test cannot reach.
 *
 * They exist first for links the site does not control: old bookmarks, a
 * shared résumé PDF, a search result. Round 20 links to them in-page too: the
 * highlight cards and the drawing's branch labels each point at a row.
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

/**
 * Section ids the Journey answers besides its own `#tree`: the nav targets of
 * the sections rounds 16 and 18 deleted. `CareerTree.tsx` renders one zero-size
 * span per id; nothing on the site links to any of them, and nothing may — they
 * exist for inbound links the site does not control, and
 * `tests/lib/answers.test.ts` fails if a chat citation starts using one.
 *
 * Written out rather than derived, because a deleted section leaves nothing
 * behind to derive from: the list is a record of what used to exist, so it only
 * ever grows. `tests/sections/CareerTree.test.tsx` and
 * `e2e/legacy-anchors.spec.ts` keep their own copies on purpose, so removing an
 * id from here fails them rather than silently narrowing what is checked.
 */
export const LEGACY_SECTION_IDS = ["journey", "work", "skills", "workshop"] as const;

/** Anchor id for one career entry's fragment; see the note above for which
 *  element carries it and what is asserted about that. */
export function journeyEntryAnchorId(entryId: string): string {
  return `journey-entry-${entryId}`;
}

/* -------------------------------------------------------------------------- */
/* Case studies                                                                */
/* -------------------------------------------------------------------------- */

/*
 * The two identifiers a case-study article and anything linking at it have to
 * agree on. They moved here from `SelectedWork/anchors.ts` in round 18 along
 * with `CaseStudy.tsx` itself, because the case studies now render inside the
 * Journey; the section they used to live in, and its `anchors.ts`,
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
