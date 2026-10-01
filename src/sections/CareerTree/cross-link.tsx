/**
 * The cross-references into and out of the career tree.
 *
 * **State of the file after round 18 — read this first.** Neither component
 * below has a caller. `TreeCrossLink` was rendered at the end of Selected Work
 * and at the end of Skills, and round 18 deleted both sections; the Journey is
 * now the only place the case studies and the roles are shown, so there is
 * nothing left that needs to point at it from a sibling section.
 * `JourneyEntryCrossLink` had already lost its only caller when the pinned
 * stage replaced the timeline (see its own note below). What does still have an
 * importer is `CROSS_LINK_CLASS`, which `RootLabels.tsx` reads — and
 * `RootLabels.tsx` is itself mounted only by `KnowledgeTree.tsx`, which nothing
 * imports. So the whole file is on the page nowhere. It was kept rather than
 * deleted because `journey-entry-<id>` links are what the next task of round 18
 * exists to make resolvable, and the builder for them is here.
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
 * ## The per-branch link, and why it is not on every leaf
 *
 * `JourneyEntryCrossLink` is the same idea one level down: a branch pointing
 * at the one timeline entry it was built from. Round 12 moved this from the
 * leaf to the branch along with the rest of the tree's interaction (see the
 * "Why the branch panel alone is interactive" note in `DrawnTree.tsx`) — a
 * leaf is now a single authored fact (a technology, an impact line) with no
 * link of its own to carry, so there was exactly one of these per branch —
 * one per branch, not one per leaf — and it was rendered **only inside that
 * branch's open panel**, never on the row that summarises it, because one
 * link per branch on the collapsed drawing would be one new tab stop per
 * branch through a figure whose entire interaction is "open the one you
 * want". (Round 12 drew fourteen branches; round 18 draws eleven, the nine
 * demoted entries having become the credentials strip. No count is written
 * here on purpose — see the round-18 note at the end of this comment:
 * nothing renders this component at all today.) `Disclosure`
 * flips its panel to `visibility: hidden` while collapsed, so a closed
 * branch's link is out of the tab order and out of the accessibility tree,
 * and the cost is paid only by the branches a visitor actually opened.
 *
 * It renders nothing at all when the entry has no anchor on the timeline
 * (`journeyEntryAnchor` returns `undefined`), because a fragment pointing at
 * an element that does not exist is a link that silently does nothing — worse
 * than no link.
 *
 * Round 18 removed the timeline this pointed at (and the Tree / List toggle
 * that chose between it and the drawing): the stage replaced both. This
 * component has **no caller in the Journey today** — a branch is the entry, so
 * a link from it back to itself would be circular — and the anchors it builds
 * (`journey-entry-<id>`) are rendered by nothing until the stage's acts take
 * them over (Task 13 of round 18). It is left in place for that, not because
 * anything still carries those ids: `/resume` does not.
 */
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { journeyEntryAnchor } from "./anchors";

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

interface JourneyEntryCrossLinkProps {
  /** The career entry this leaf was built from — `TreeBranch.id`, which is
   *  the entry's own id carried through `buildKnowledgeTree()` verbatim. */
  readonly entryId: string;
  /** The leaf's own label and organisation, for the hidden half of the
   *  accessible name. Passed in rather than looked up: the caller is already
   *  rendering both, and nothing here should be able to disagree with it. */
  readonly label: string;
  readonly organization: string | undefined;
  /** Merged onto the wrapping `<p>`, for callers that space their children
   *  themselves rather than with a `space-y-*` container. Kept on the element
   *  this renders — rather than on a wrapper around it — so a leaf whose entry
   *  has no anchor contributes nothing at all, not an empty box with a
   *  margin. */
  readonly className?: string;
}

/**
 * The pointer from one leaf to the timeline entry it came from. Render it
 * inside the leaf's panel only — see the note above.
 *
 * The visible text is short because, when something rendered this, there was
 * one per drawn branch; the entry it points at is named in the hidden half,
 * so a screen-reader user listing the page's links hears one distinct
 * destination per branch rather than a run of identical ones. Nothing renders
 * it today (see the file comment), so the live count is zero. The explicit
 * `{" "}` before it is the same fix Disclosure
 * documents: a space written inside the hidden span is trimmed when its
 * contribution to the accessible name is computed, a sibling text node is not.
 */
export function JourneyEntryCrossLink({
  entryId,
  label,
  organization,
  className,
}: JourneyEntryCrossLinkProps) {
  const anchor = journeyEntryAnchor(entryId);
  if (anchor === undefined) return null;

  return (
    <p className={className}>
      <a href={`#${anchor}`} className={CROSS_LINK_CLASS}>
        Find it on the timeline
        {" "}
        <VisuallyHidden>
          — {label}
          {organization ? `, ${organization}` : ""}
        </VisuallyHidden>
      </a>
    </p>
  );
}

export default TreeCrossLink;
