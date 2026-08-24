/**
 * The merged section's outer "Tree / List" presentation switch — an
 * imperative, DOM-attribute-driven contract in the same idiom as
 * `TreeFigure.tsx`'s cross-highlighting and `WatchOrigin.tsx`'s lazy player,
 * rather than React state threaded through props. Three call sites need to
 * agree on "which face is showing" without importing each other or sharing a
 * context: `ViewToggle.tsx` (the two buttons), `Timeline.tsx` (which must
 * force the list face visible before it scrolls a revealed entry into a
 * container that might currently be `display: none`), and — implicitly —
 * every leaf's `JourneyEntryCrossLink` (`./cross-link.tsx`), which needs no
 * code of its own here because it is a plain `<a href="#journey-entry-…">`
 * and Timeline's own hashchange/click listeners already do the switching.
 *
 * ## Why DOM attributes and inline styles, not `useState` + context
 *
 * A leaf's timeline link and the toggle buttons are rendered by unrelated
 * component trees (`KnowledgeTree`'s leaves vs. this section's own toggle),
 * so sharing view state through props would mean threading it through
 * `KnowledgeTree` → `DrawnTree`/`KnowledgeTreeList` → `Leaf`, components that
 * have nothing else to do with presentation switching. A `useState` at the
 * section level plus a context would work, but `Timeline.tsx`'s own reveal
 * flow runs from a raw `hashchange`/`click` listener outside React's
 * synthetic event system — a `setState` call there is batched by React 18's
 * scheduler and would not have committed to the DOM by the time that same
 * handler calls `scrollIntoView`/`.focus()` a few lines later, so the target
 * would still measure as `display: none` at the moment the scroll happens.
 * Direct DOM mutation, in the same function, sidesteps that race entirely —
 * the same reason `TreeFigure.tsx`'s cross-highlighting never touches React
 * state either.
 *
 * ## The contract
 *
 * Every panel this switch controls carries `data-tree-view-panel="tree"` or
 * `"list"`. Before any interaction, visibility is CSS-only — the class list
 * each panel is given inline in `CareerTree.tsx` (`hidden lg:block` for the
 * tree face, `block lg:hidden` for the list face) — so "desktop defaults to
 * the drawn tree; mobile defaults to the list" holds with no JavaScript at
 * all. `forceCareerTreeView` then sets an explicit inline `display`, which
 * beats those classes at every breakpoint (inline style outranks any class
 * selector, media query or not) until the page reloads. Nothing here ever
 * clears an inline style back to `""`: once a visitor has switched, or once a
 * leaf's link has revealed an entry, the explicit choice sticks through a
 * resize, matching how every other explicit toggle on this page behaves.
 *
 * Every toggle button carries `data-tree-view-toggle="tree"` or `"list"`;
 * `setCareerTreeTogglePressed` is the one place `aria-pressed` is ever
 * written, so the two buttons and the two panels can never disagree about
 * which face is current.
 */

export type CareerTreeView = "tree" | "list";

/** Matches the `lg:` breakpoint (1024px) every other responsive default on
 *  this page switches at — see `DrawnTree`/`KnowledgeTreeList`'s own split. */
export const DESKTOP_VIEW_QUERY = "(min-width: 1024px)";

export const CAREER_TREE_VIEW_PANEL_ATTR = "data-tree-view-panel";
export const CAREER_TREE_VIEW_TOGGLE_ATTR = "data-tree-view-toggle";

/** Marks every toggle button as pressed or not, by comparing its own
 *  `data-tree-view-toggle` value against `view`. Safe to call before any
 *  panel has been forced — it only ever touches the buttons. */
export function setCareerTreeTogglePressed(view: CareerTreeView): void {
  if (typeof document === "undefined") return;
  document
    .querySelectorAll<HTMLElement>(`[${CAREER_TREE_VIEW_TOGGLE_ATTR}]`)
    .forEach((button) => {
      const isThisOne = button.getAttribute(CAREER_TREE_VIEW_TOGGLE_ATTR) === view;
      button.setAttribute("aria-pressed", String(isThisOne));
    });
}

/**
 * Forces `view` to be the one visible face, and keeps the toggle buttons'
 * `aria-pressed` in step with it. Called from the toggle buttons themselves
 * and from `Timeline.tsx`'s reveal flow — the only two ways the visible face
 * ever changes.
 */
export function forceCareerTreeView(view: CareerTreeView): void {
  if (typeof document === "undefined") return;
  document
    .querySelectorAll<HTMLElement>(`[${CAREER_TREE_VIEW_PANEL_ATTR}]`)
    .forEach((panel) => {
      const isThisOne = panel.getAttribute(CAREER_TREE_VIEW_PANEL_ATTR) === view;
      panel.style.display = isThisOne ? "block" : "none";
    });
  setCareerTreeTogglePressed(view);
}
