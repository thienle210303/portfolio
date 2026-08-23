"use client";

import { Moon, Sun } from "lucide-react";

/**
 * Day/night switch.
 *
 * The visible state is driven entirely by CSS off `[data-theme]` on <html>
 * (see the `.theme-*-only` rules in globals.css), not by React state. That is
 * the whole reason this component has no `useState` or `useEffect`: the theme
 * is already resolved and stamped by the inline script in layout.tsx before
 * first paint, so there is no server/client disagreement to reconcile and no
 * frame in which the wrong icon is showing.
 *
 * Both labels are always in the markup and the inactive one is `display: none`,
 * which removes it from the accessibility tree — so the button's accessible
 * name is "Switch to night" or "Switch to day" and never both at once.
 *
 * A sun/moon crossfade was considered and rejected (Workstream 3, P6): the
 * click that triggers it also flips `data-theme` on `<html>`, which
 * recalculates every semantic colour alias on the page at once — a genuine
 * full-tree style recompute, not a scoped one — and repaints
 * `.blueprint-grid`'s `background-attachment: fixed` ruling on `<body>`
 * along with it. Animating this one icon on top of that same frame means
 * racing a moment the browser is already busy with, and the two crossfading
 * glyphs sit directly against the global `::selection` and focus-ring
 * colours that are themselves mid-swap — a smear, not a polish. The icon
 * flip stays instant (the `display: none` swap above); this control gets
 * only the mechanical press every other boxed clickable on the site now
 * carries.
 */

const STORAGE_KEY = "theme";

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "night" ? "day" : "night";

    root.dataset.theme = next;

    // A visitor who has expressed a preference keeps it across visits. Private
    // browsing modes can throw on write, and a failed persist is not worth
    // breaking the toggle over — the theme still changes for this page view.
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* no-op: preference is simply not remembered */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex h-11 w-11 items-center justify-center border border-rule text-fg transition-colors duration-150 hover:border-accent hover:text-accent active:translate-y-px"
    >
      <span className="theme-day-only">
        <Moon aria-hidden="true" focusable="false" size={17} />
        <span className="sr-only">Switch to night theme</span>
      </span>
      <span className="theme-night-only">
        <Sun aria-hidden="true" focusable="false" size={17} />
        <span className="sr-only">Switch to day theme</span>
      </span>
    </button>
  );
}

export default ThemeToggle;
