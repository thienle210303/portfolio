/**
 * The cross-references between this section and the two it still stands
 * apart from.
 *
 * The rule they follow: **one quiet link per direction, and no restated
 * facts.** Work and Skills each keep their own job — the case studies, the
 * inventory — and the tree is the one place their content is shown as a
 * single shape alongside the chronology. Journey used to be the third of
 * these, a separate section this one pointed back at; round 10 folded the
 * timeline into this section as its own "List" face, and round 18 replaced
 * both the timeline and the toggle over it with the pinned stage (see
 * `CareerTree.tsx` and `Stage.tsx`; `Timeline.tsx` is deleted). So there is
 * no longer a third section to point at — only Work and Skills end with a
 * pointer here (`TreeCrossLink`, below), and the tree needs no pointer back
 * the other way, because the chronology it used to point at is now inside it.
 *
 * Two pointers *out* of the tree went the same way, and neither is a link any
 * more. Its branch panels used to link to the case studies in `#work`; since
 * round 18 each panel renders its case study inline, in full, so there is
 * nothing left to point at — `DrawnTree.tsx` carries no `#work` link and no
 * `caseStudyAnchorId`. Its roots used to link to the skill groups in
 * `#skills`; the roots are `RootLabels.tsx`, which only `KnowledgeTree.tsx`
 * ever mounted, and that file has no importer today, so no root label is on
 * the page to link from. Nothing anywhere explains the relationship in prose;
 * the link is the explanation.
 *
 * Rendered from one component in both inbound places rather than typed out
 * twice: identical text pointing at an identical href is also the correct
 * accessibility answer — a screen-reader user listing the page's links hears
 * one repeated destination, not two differently-worded ones that turn out to
 * be the same place.
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

/** The pointer into the tree, rendered at the end of Work and Skills.
 *  Deliberately says nothing about *what* connects — the section it points
 *  at is where that is shown. */
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
