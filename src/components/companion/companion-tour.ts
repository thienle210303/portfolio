"use client";

import { navItems } from "@/content/portfolio";

/**
 * The guided tour: the accessible half of D5.
 *
 * The duet's ambient banter (companion-dialogue.ts) is decorative; this is the
 * opposite — a visitor presses "Show me around" in the toolkit panel, and the
 * pair walk the page's own eight sections in order, saying one factual line
 * at each stop through the HUD's `role="status"`. It is the only thing the
 * companion narrates out loud, on purpose: everything else it does is a
 * drawing, and a drawing that starts talking to a screen reader unprompted is
 * noise. Asked for, it is a small guided reading of the page rather than a
 * feature nobody who cannot see the cats has any way to reach.
 *
 * `TOUR_STOPS` is derived from `navItems` rather than kept as a parallel
 * list, so the tour can never visit a section the nav does not, or skip one
 * it does — the two are structurally the same eight entries. The lines
 * spoken at each stop are not here: they come from companion-dialogue.ts's
 * `tour-*` scenes, the same scene bank the ambient banter draws from.
 */

export interface TourStop {
  readonly sectionId: string;
  readonly label: string;
}

export const TOUR_STOPS: readonly TourStop[] = navItems.map((item) => ({
  sectionId: item.sectionId,
  label: item.label,
}));

/** `walking` while the pair are on their way to a stop; `arrived` once they
 *  are standing at it and the HUD has something to say. */
export type TourPhase = "walking" | "arrived";

/**
 * The tour in progress. `index` is the stop the pair are walking to or
 * standing at; `arrivedAt` is zero until `phase` becomes `"arrived"`, which is
 * what lets the caller tell "just got here" from "has been standing here a
 * while" without a second clock.
 */
export interface TourRun {
  index: number;
  phase: TourPhase;
  arrivedAt: number;
}

export function startTour(): TourRun {
  return { index: 0, phase: "walking", arrivedAt: 0 };
}

export function isLastStop(index: number): boolean {
  return index >= TOUR_STOPS.length - 1;
}
