"use client";

/**
 * Focus restoration for the guide.
 *
 * There are two launchers — the margin cats (≥64rem) and the compact
 * header button (<64rem) — and exactly one is visible at any width. Which one
 * to return focus to on close therefore depends on the viewport, and asking
 * the DOM is both simpler and more reliable than threading the opener through
 * the store and hoping it is still mounted.
 */

export const LAUNCHER_ATTRIBUTE = "data-guide-launcher";

/**
 * Focuses the currently visible guide launcher, if any.
 *
 * `offsetParent === null` is the cheap, reliable test for "not rendered":
 * it is true for `display: none` at any depth, which is exactly how the two
 * launchers are switched. It would also report `position: fixed` elements as
 * hidden, which is why the *lane* is the fixed element and the button inside
 * it is not.
 */
export function focusVisibleLauncher(): void {
  const launchers = document.querySelectorAll<HTMLElement>(`[${LAUNCHER_ATTRIBUTE}]`);
  for (const launcher of launchers) {
    if (launcher.offsetParent !== null) {
      launcher.focus();
      return;
    }
  }
}
