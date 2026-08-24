/**
 * The cross-references between this section and the two it still stands
 * apart from.
 *
 * The rule they follow: **one quiet link per direction, and no restated
 * facts.** Work and Skills each keep their own job — the case studies, the
 * inventory — and the tree is the one place their content is shown as a
 * single shape alongside the chronology. Journey used to be the third of
 * these, a separate section this one pointed back at; round 10 folded the
 * timeline into this section as its own "List" face (see `CareerTree.tsx`
 * and `Timeline.tsx`), so there is no longer a third section to point at —
 * only Work and Skills end with a pointer here (`TreeCrossLink`, below), and
 * the tree no longer needs a pointer back the other way, because the
 * chronology it used to point at is now inside it. Its leaves still link to
 * the case studies in `#work`, and its roots still link to the skill groups
 * in `#skills`. Nothing anywhere explains the relationship in prose; the
 * link is the explanation.
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
 * ## The per-leaf link, and why it is not on the leaf
 *
 * `JourneyEntryCrossLink` is the same idea one level down: a leaf pointing at
 * the one timeline entry it was built from. There are twenty-five leaves, so
 * it is rendered **only inside a leaf's open panel**, never on the row that
 * summarises it — one link per leaf on the collapsed drawing would be
 * twenty-five new tab stops through a figure whose entire interaction is
 * "open the one you want". `Disclosure` flips its panel to `visibility:
 * hidden` while collapsed, so a closed leaf's link is out of the tab order
 * and out of the accessibility tree, and the cost is paid only by the leaves
 * a visitor actually opened.
 *
 * It renders nothing at all when the entry has no anchor on the timeline
 * (`journeyEntryAnchor` returns `undefined`), because a fragment pointing at
 * an element that does not exist is a link that silently does nothing — worse
 * than no link.
 *
 * Following it does more than navigate: the timeline it points at is this
 * same section's own "List" face, which may not be the one currently on
 * screen. `Timeline.tsx`'s own hashchange/click handling is what switches the
 * face and lands the scroll — see `./view-state.ts` for why that lives there
 * rather than here.
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
 * The visible text is short because twenty-five of these exist; the entry it
 * points at is named in the hidden half, so a screen-reader user listing the
 * page's links hears twenty-five distinct destinations rather than twenty-five
 * identical ones. The explicit `{" "}` before it is the same fix Disclosure
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
