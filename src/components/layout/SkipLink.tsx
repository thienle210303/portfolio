/**
 * First focusable element on the page. Invisible until it receives
 * keyboard focus, at which point `.sr-only-focusable` (globals.css) makes
 * it visible so keyboard users can jump past the header straight to
 * `<main id="main">`.
 */
export default function SkipLink() {
  return (
    <a href="#main" className="sr-only-focusable">
      Skip to main content
    </a>
  );
}
