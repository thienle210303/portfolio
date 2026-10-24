/**
 * In-page navigation (round 21 phase 8): the page glides to its destination
 * through a View Transition, the old screen sliding out as the new one slides
 * in (globals.css, `html[data-glide]`).
 *
 * `jump` puts the page at the destination instantly; it runs inside the
 * transition, between the two snapshots. Returns false, having done nothing,
 * under reduced motion or without View Transitions: the caller's plain scroll
 * is the fallback.
 */
export function glide(target: Element, jump: () => void): boolean {
  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const html = document.documentElement;
  html.dataset.glide = target.getBoundingClientRect().top >= 0 ? "down" : "up";
  document.startViewTransition(jump).finished.finally(() => delete html.dataset.glide);
  return true;
}

/**
 * Clicks on links to a fragment of this page glide there, then make the
 * browser's own fragment navigation (so `:target`, `hashchange`, the history
 * entry and the focus starting point are all the browser's). A modifier,
 * another button, a target not on this page, or no View Transitions: left to
 * the browser, which jumps.
 */
export function glideOnFragmentClick(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!link || link.closest("[data-companion]")) return;
  const url = new URL(link.getAttribute("href")!, location.href);
  if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search) return;
  const target = url.hash ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : null;
  if (!target) return;
  const glided = glide(target, () => {
    // The same fragment again is no navigation: scroll it back into view.
    if (location.hash === url.hash) target.scrollIntoView({ block: "start" });
    else location.hash = url.hash;
  });
  if (glided) event.preventDefault();
}
