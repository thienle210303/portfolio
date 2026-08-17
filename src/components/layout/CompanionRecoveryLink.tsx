"use client";

import { setCompanionMode, useCompanionMode } from "@/components/companion/companion-state";

/**
 * The one way back from "Turn the cats off" — see companion-state.ts.
 *
 * That action is deliberately permanent from the companion's own UI: nothing
 * on `Companion` itself offers a way to undo it, because the toolkit already
 * *is* the cats, and a control cannot appear on furniture that no longer
 * exists. That is exactly how the owner stranded himself — "off" has no
 * companion-side surface left to click. This is the page's one exit from
 * that state, and it lives here rather than inside `companion/` because it
 * has to keep existing after the thing it recovers is gone.
 *
 * A tiny client island rather than promoting the whole footer to one: this
 * is the only interactive piece down here, `useCompanionMode` is a
 * `useSyncExternalStore` read (SSR-safe, server snapshot `"roam"`), and
 * everything else in `SiteFooter` stays a plain server-rendered anchor that
 * works with JavaScript disabled.
 *
 * Renders `null` — not a hidden node — whenever the mode is not `"off"`,
 * which is every load except the one this exists for: a conditionally
 * *absent* element takes up no box, so there is nothing here to cause a
 * layout shift while the cats are on. `setCompanionMode("roam")` is the same
 * call `RestingBox`'s wake button makes, so clicking this reaches every
 * mounted `useCompanionMode` listener — including the `Companion` component
 * itself — and the cats resume roaming without a reload.
 */
export function CompanionRecoveryLink() {
  const mode = useCompanionMode();

  if (mode !== "off") return null;

  return (
    <button
      type="button"
      onClick={() => setCompanionMode("roam")}
      className="inline-flex min-h-11 items-center font-mono text-[length:var(--step--1)] uppercase tracking-[0.1em] text-fg-subtle transition-colors duration-150 hover:text-fg"
    >
      Bring the cats back
    </button>
  );
}

export default CompanionRecoveryLink;
