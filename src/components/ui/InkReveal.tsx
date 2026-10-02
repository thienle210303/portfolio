"use client";

import { useEffect, useLayoutEffect } from "react";

/**
 * The one reveal primitive behind every settle on the page — the hero's own
 * load choreography is a separate, `data-motion`-gated system (see
 * layout.tsx's THEME_SCRIPT and the hero keyframes in globals.css), but
 * every per-section settle (`Section`/`SectionHeading`) keys off exactly the
 * two attributes this component owns: `html[data-ink-ready]`, the observer-
 * live gate, and `[data-inked]`, stamped once per `[data-ink-root]` the
 * moment it enters view. Nothing else in the codebase is allowed to set
 * either attribute — that is what makes "one observer, N roots" true rather
 * than aspirational.
 *
 * Two independent jobs share this file because they share the "small,
 * global, client-only, renders nothing" shape — same reasoning `Companion`
 * documents for why the cats are one mount rather than several:
 *
 *   1. Ink reveal — stamps `[data-inked]` on every `[data-ink-root]` as it
 *      crosses into view, once, so the pending-state CSS in globals.css
 *      (`[data-ink-ready] [data-ink-root]:not([data-inked]) [data-ink]`) can
 *      resolve to "settled" and never revert.
 *   2. Header hairline — a second, tiny, non-motion observer that toggles
 *      `html[data-at-top]` off the 1px sentinel `layout.tsx` renders as
 *      `body`'s first child, so the sticky header's bottom rule can etch in
 *      on first scroll (globals.css, P6). This one is *not* gated on
 *      reduced-motion: it swaps a border colour, not a transform, and the
 *      global reduced-motion block already zeroes every `transition`
 *      site-wide — there is nothing here for that preference to collapse.
 *
 * Job 1 bails outright under reduced motion or with no `IntersectionObserver`
 * (old browser, or a test harness that never polyfills it): with the effect
 * a no-op, `html` never gains `data-ink-ready`, so the pending-state CSS
 * above never matches anything and every settling element renders at its
 * final, fully-visible state from first paint. That is also exactly what a
 * no-JS visit gets, for free, because this component never runs at all —
 * the finished page is the default in every one of these cases, not a
 * fallback bolted on afterwards.
 *
 * `useLayoutEffect` (guarded for SSR, since React only ever executes it on
 * the client — see `useIsomorphicLayoutEffect` below) is load-bearing for
 * job 1's own anti-flash guarantee. Reveal groups already on screen at
 * mount — the hero's own tone-base sibling, on a normal top-of-page load, or
 * literally anything on a `goto("/#contact")` deep link — get `[data-inked]`
 * stamped *before* `[data-ink-ready]` goes on `<html>`, in the same
 * synchronous pass, before the browser has painted the frame that would
 * otherwise show them mid-vanish. Order matters here, not just timing: once
 * an element already carries `[data-inked]`, the pending selector's
 * `:not([data-inked])` clause never matches it, so setting `data-ink-ready`
 * a statement later can't hide something that was already on screen. A
 * plain `useEffect` runs *after* the browser paints, which is precisely the
 * one-frame flash this is built to prevent.
 */
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function InkReveal() {
  useIsomorphicLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    const roots = Array.from(document.querySelectorAll<HTMLElement>("[data-ink-root]"));
    if (roots.length === 0) return;

    // Synchronous pre-stamp, same task as the `data-ink-ready` write below:
    // anything already inside the viewport is marked settled immediately,
    // never routed through the pending state at all.
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    for (const root of roots) {
      const rect = root.getBoundingClientRect();
      if (rect.top < viewportHeight && rect.bottom > 0) {
        root.setAttribute("data-inked", "");
      }
    }

    // Only now does the pending-state CSS become live — and only for the
    // roots that did *not* just get pre-stamped above.
    document.documentElement.setAttribute("data-ink-ready", "");

    // rootMargin's negative bottom bias means a root has to clear ~12% past
    // the viewport's lower edge before it counts as "arrived" — the same
    // margin the tree's own growth draw-in relies on (Workstream 2) — so a
    // section doesn't start settling while its top sliver is still hidden
    // behind the sticky header.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-inked", "");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );

    for (const root of roots) {
      if (!root.hasAttribute("data-inked")) observer.observe(root);
    }

    return () => observer.disconnect();
    // Reveal groups are static for the life of the page (every section is
    // server-rendered, none mount or unmount after hydration), so a plain
    // one-time query on mount is enough — there is no route change on this
    // single-page site that would require re-scanning the DOM.
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const sentinel = document.querySelector("[data-scroll-sentinel]");
    if (!sentinel) return;

    const html = document.documentElement;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      html.toggleAttribute("data-at-top", entry.isIntersecting);
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return null;
}

export default InkReveal;
