/**
 * First focusable element on the page. Invisible until it receives
 * keyboard focus, at which point `.skip-link` (globals.css — Workstream 3,
 * P6) makes it visible as a fixed plate in the top-left corner, above the
 * sticky header (`z-index: 60` against the header's `z-50`).
 *
 * Not `.sr-only-focusable`, the class every other hidden-until-focused
 * element on the site shares: that class reveals at `position: static`,
 * which put this link back in normal document flow the instant it was
 * focused — pushing the header down by one line height for exactly the
 * frame this link was visible, a real layout jump on the very first Tab
 * press of the page. `.skip-link`'s focus state is `position: fixed`
 * instead, so revealing it can never move anything else.
 */
export default function SkipLink() {
  return (
    <a href="#main" className="skip-link">
      Skip to main content
    </a>
  );
}
