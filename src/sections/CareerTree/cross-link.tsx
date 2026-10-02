/**
 * The cross-references into and out of the career tree.
 *
 * **State of the file after round 18 — read this first.** `TreeCrossLink` below
 * has no caller: it was rendered at the end of Selected Work and at the end of
 * Skills, and round 18 deleted both sections. The Journey is now the only place
 * the case studies and the roles are shown, so there is nothing left that needs
 * to point at it from a sibling section. What does still have an importer is
 * `CROSS_LINK_CLASS`, which `RootLabels.tsx` reads — and `RootLabels.tsx` is
 * itself mounted only by `KnowledgeTree.tsx`, which nothing imports. So nothing
 * in this file reaches the page, and whether `TreeCrossLink` and the root
 * labels come back or go is the owner's call rather than a refactor's.
 *
 * The rule the links followed while they were live: **one quiet link per
 * direction, and no restated facts.** Journey used to be a separate section
 * this one pointed back at; round 10 folded the timeline into the tree as its
 * own "List" face, and round 18 replaced both the timeline and the toggle over
 * it with the pinned stage (see `CareerTree.tsx` and `Stage.tsx`;
 * `Timeline.tsx` is deleted).
 *
 * Two pointers *out* of the tree went the same way, and neither is a link any
 * more. Its branch panels used to link to the case studies in `#work`; since
 * round 18 each panel renders its case study inline, in full, so there is
 * nothing left to point at — `DrawnTree.tsx` carries no `#work` link and no
 * `caseStudyAnchorId`. Its roots used to link to the skill groups in
 * `#skills`; the roots are `RootLabels.tsx`, which only `KnowledgeTree.tsx`
 * ever mounted, and that file has no importer today, so no root label is on
 * the page to link from — and the `#skills` section it linked to is gone too.
 * Nothing anywhere explains the relationship in prose; the link was the
 * explanation.
 *
 * `TreeCrossLink` was one component rendered in both inbound places rather
 * than typed out twice: identical text pointing at an identical href is also
 * the correct accessibility answer — a screen-reader user listing the page's
 * links hears one repeated destination, not two differently-worded ones that
 * turn out to be the same place.
 *
 * `min-h-11` is not decoration either. These sit on their own line rather
 * than inside a sentence, so WCAG 2.2's target-size minimum (2.5.8) applies
 * to them in full; the site already sets 44px as its floor in the header,
 * the footer and every Disclosure trigger.
 *
 * ## The per-branch link, retired in round 18
 *
 * `JourneyEntryCrossLink` was the same idea one level down: a branch pointing
 * at the one timeline entry it was built from, rendered inside that branch's
 * open panel only. Round 12 moved it from the leaf to the branch, and round 18
 * removed the timeline it pointed at — a branch *is* the entry now, so a link
 * from it back to itself would be circular, and its visible text ("Find it on
 * the timeline") named a presentation the page no longer has.
 *
 * It was kept through the section deletions on the grounds that it built the
 * `journey-entry-<id>` fragments, which nothing rendered at the time. Those
 * fragments resolve again — `Stage.tsx` renders one per entry, on the act that
 * draws it — so the grounds are gone, and keeping a component to build links
 * nobody wants is not the same as keeping the links working. The fragments
 * exist for inbound links the site does not control; `./anchors.ts` builds them
 * and `e2e/legacy-anchors.spec.ts` is what proves they land.
 */

// `.ink-link-quiet` (Workstream 3, P3 — the only piece of this file
// Workstream 3 owns, per that pass's file scope): these cross-links stand
// alone on their own line rather than sitting in a run of prose, so they
// take the "decoration transparent -> currentColor" quiet-link treatment
// rather than `.ink-link`'s always-underlined prose variant. `text-accent`
// stays: it is already the link's rest colour (unusual for this site, where
// blue is normally reserved for hover/active states), and the plan for
// this pass is confined to the hover *mechanism*, not to re-litigating that
// colour choice.
export const CROSS_LINK_CLASS =
  "ink-link-quiet eyebrow inline-flex min-h-11 items-center text-accent";

/** The pointer into the tree. It was rendered at the end of Selected Work and
 *  of Skills; both are deleted, so nothing renders it today (see the file
 *  comment). Deliberately says nothing about *what* connects — the section it
 *  points at is where that is shown. */
export function TreeCrossLink() {
  return (
    <p className="mt-8">
      <a href="#tree" className={CROSS_LINK_CLASS}>
        See how this connects — the career tree
      </a>
    </p>
  );
}

export default TreeCrossLink;
