"use client";

import type { ResumeLensId } from "@/types/portfolio";

/**
 * The résumé explorer's active lens, hoisted out of component state so it can
 * be set from outside the section — specifically by the site guide, which
 * offers "Show the résumé through the X lens" as a command.
 *
 * ## Why a store and not URL state
 *
 * `ResumeExplorerClient` deliberately rejected URL state ("adds a
 * hydration-mismatch and history-pollution risk that isn't worth it for a
 * same-page filter"), and that reasoning still holds — this does not overturn
 * it. A module-scope store keeps both properties the note was protecting: the
 * initial value is a constant on server and client alike, so there is nothing
 * to mismatch, and nothing touches history.
 *
 * ## Why it lives here rather than with the guide
 *
 * The résumé section owns its own filter. The guide *reads* this module; the
 * section does not import anything from the guide. Putting the store in
 * `components/guide/` would invert that and make a core section depend on an
 * optional enhancement.
 *
 * State is ephemeral by design — module scope means a fresh page load starts at
 * "all", which is what a visitor arriving at a résumé expects.
 */

export type LensValue = ResumeLensId | "all";

const listeners = new Set<() => void>();

let lens: LensValue = "all";

export function subscribeToLens(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLens(): LensValue {
  return lens;
}

/**
 * Server snapshot. A constant, and identical to the initial client value, so
 * hydration has nothing to reconcile.
 */
export function getLensServerSnapshot(): LensValue {
  return "all";
}

export function setLens(next: LensValue): void {
  if (lens === next) return;
  lens = next;
  for (const listener of listeners) listener();
}
