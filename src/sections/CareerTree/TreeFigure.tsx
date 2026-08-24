"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The tree figure's one client island: two unrelated jobs share it because
 * both need the same wrapper and neither justifies a wrapper of its own.
 *
 * ## Job one — cross-highlighting
 *
 * Every server-rendered node in the figure that participates already carries
 * a plain `data-tree-*` attribute naming what it is: `data-tree-tech` on a
 * technology leaf, `data-tree-root` on a root label, `data-tree-lateral` on
 * its underground path, `data-tree-branch` on a whole career entry's `<li>`,
 * `data-tree-panel` on its summary card, `data-tree-entry` on a leaf. None of
 * that is new data — every one of those attributes is a value the server
 * already had in hand from `buildCareerTree()` or `skillCategories`. This
 * island reads them; it invents nothing.
 *
 * On `pointerover`/`focus` it walks up from the event target to the nearest
 * attribute it recognises, works out what that thing highlights — the
 * category below is where `hitTech`/`hitRoot` puts that authored logic —
 * clears whatever was highlighted a moment ago, and stamps `data-tree-hit` on
 * the new set. The CSS in `globals.css`'s "Career tree figure" block does the
 * actual brightening; this file only ever decides *which* elements qualify.
 *
 * Round 12 retired a third case, `hitLens`: through round 11 a root label
 * also brightened every lens panel `category.lenses` named it feeding, and a
 * hover on a lens panel or leaf brightened the roots feeding it back. That
 * edge existed only because a lens was a whole branch of the drawing; now the
 * branches are career entries and there is no lens left to feed, so
 * `RootLabels.tsx` no longer prints a "Feeds …" line and this file no longer
 * looks for one. A root now highlights only itself and its own lateral root
 * underground — see `hitRoot` below.
 *
 * Two things this deliberately does not do. It never touches React state —
 * every mutation here is a DOM attribute, so re-rendering this component
 * (which nothing here would ever trigger anyway) cannot desync from what is
 * on screen, and there is no serialised state to blow the client bundle up
 * with. And it adds no tab stops: `focus`/`blur` are listened for in the
 * *capture* phase (the third `addEventListener` argument), which is what
 * lets a wrapper this high up the tree hear an event that does not bubble,
 * without turning anything new into something a keyboard visitor tabs to.
 * The keyboard "reverse map" the plan calls for — a leaf's own disclosure
 * trigger already existed and already receives focus; this only listens.
 *
 * `pointerover` bubbles and re-resolves the hit set on every entry, so
 * moving from one tag straight to another swaps the highlight with no gap.
 * `pointerleave`, by contrast, does *not* bubble — attached directly to the
 * wrapper (not delegated), it fires only when the pointer leaves the whole
 * figure, which is exactly the one moment nothing inside should stay lit.
 *
 * ## Job two — the reveal group boundary
 *
 * `data-ink-root` marks this wrapper as one reveal group for the shared
 * `InkReveal` primitive (Workstream 3): once it stamps `data-inked` here (on
 * intersection, or synchronously if the tree is already on screen), the tree
 * growth CSS treats the drawing as run rather than pending — see the "Career
 * tree figure" block in `globals.css`. This island does not implement that
 * observer itself; it only carries the attribute InkReveal looks for.
 * `data-tree-figure` is this file's own hook for the same CSS, orthogonal to
 * `data-ink-root` and never reused for anything else.
 */
interface TreeFigureProps {
  readonly children: ReactNode;
  readonly className?: string;
}

/** The one attribute this file ever writes. Removed before every fresh
 *  resolution, so at most one hit set is ever marked at a time. */
const HIT_ATTR = "data-tree-hit";

/** The attributes an event target might be standing on, or standing inside —
 *  checked in this order because a leaf row (`data-tree-entry`) can itself
 *  sit inside a branch `<li>` that is not what the pointer landed on. */
const MATCH_SELECTOR = "[data-tree-tech], [data-tree-root], [data-tree-panel], [data-tree-entry]";

function clearHits(scope: ParentNode): void {
  scope.querySelectorAll(`[${HIT_ATTR}]`).forEach((el) => el.removeAttribute(HIT_ATTR));
}

function mark(scope: ParentNode, selector: string): void {
  scope.querySelectorAll(selector).forEach((el) => el.setAttribute(HIT_ATTR, ""));
}

/** A technology leaf: every other leaf — in either presentation, on any
 *  branch — carrying the exact same `data-tree-tech` slug. Since round 12
 *  each technology is its own leaf mark rather than a tag nested inside a
 *  bigger entry row, so an exact attribute match is the whole query; there is
 *  no wrapping row left that also needs to light up. */
function hitTech(scope: ParentNode, slug: string): void {
  mark(scope, `[data-tree-tech="${slug}"]`);
}

/** A root label: its own lateral underground. Through round 11 this also
 *  brightened every lens panel `category.lenses` named it feeding; round 12
 *  retires the lens branches that line fed, so a root now highlights only
 *  itself and its lateral, honestly — see the file banner and
 *  `RootLabels.tsx`. */
function hitRoot(scope: ParentNode, categoryId: string): void {
  const label = scope.querySelector(`[data-tree-root="${categoryId}"]`);
  label?.setAttribute(HIT_ATTR, "");
  mark(scope, `[data-tree-lateral="${categoryId}"]`);
}

export function TreeFigure({ children, className }: TreeFigureProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = ref.current;
    if (!wrapper) return;

    // Shared by both event families below: walk up from wherever the event
    // actually landed to the nearest thing this figure knows how to
    // highlight, clear the last hit set, and mark the new one. Called on
    // every `pointerover`/`focus`, so the highlighted set always matches
    // whatever the pointer or focus is on right now — there is no separate
    // "did the target change" check to keep in sync with it.
    const resolve = (target: EventTarget | null): void => {
      const el = target instanceof Element ? target.closest(MATCH_SELECTOR) : null;
      clearHits(wrapper);
      if (!el) return;

      if (el.hasAttribute("data-tree-tech")) {
        hitTech(wrapper, el.getAttribute("data-tree-tech") ?? "");
      } else if (el.hasAttribute("data-tree-root")) {
        hitRoot(wrapper, el.getAttribute("data-tree-root") ?? "");
      } else {
        // data-tree-panel (a branch's own card) or data-tree-entry (an
        // impact leaf, which carries no data-tree-tech): nothing else on the
        // drawing shares either one's identity, so hovering or focusing it
        // highlights only itself.
        el.setAttribute(HIT_ATTR, "");
      }
    };

    const handleOver = (event: PointerEvent) => resolve(event.target);
    const handleFocus = (event: FocusEvent) => resolve(event.target);
    const handleLeave = () => clearHits(wrapper);

    wrapper.addEventListener("pointerover", handleOver);
    wrapper.addEventListener("pointerleave", handleLeave);
    // Capture phase: focus/blur do not bubble, so listening here is the only
    // way one wrapper can hear them from every descendant without wiring a
    // listener onto each focusable element individually.
    wrapper.addEventListener("focus", handleFocus, true);
    wrapper.addEventListener("blur", handleLeave, true);

    // Stamped only once every listener above is actually attached: the one
    // honest "this island is live" signal for anything that needs to know
    // hydration has reached this far before it hovers or focuses something.
    // (e2e/sections.spec.ts's cross-highlighting tests wait on it instead of
    // trusting `networkidle` — that only means the JS finished downloading,
    // not that this effect has run, and dev-mode compilation plus a slower
    // machine is enough of a gap between the two for a hover to land in it.)
    wrapper.setAttribute("data-tree-live", "");

    return () => {
      wrapper.removeEventListener("pointerover", handleOver);
      wrapper.removeEventListener("pointerleave", handleLeave);
      wrapper.removeEventListener("focus", handleFocus, true);
      wrapper.removeEventListener("blur", handleLeave, true);
      wrapper.removeAttribute("data-tree-live");
    };
  }, []);

  return (
    <div ref={ref} data-tree-figure data-ink-root className={className}>
      {children}
    </div>
  );
}

export default TreeFigure;
