"use client";

import { navItems } from "@/content/portfolio";

/**
 * The guided play: the accessible half of D5.
 *
 * The duet's ambient banter (companion-dialogue.ts) is decorative; this is the
 * opposite — a visitor presses "Show me around" in the toolkit panel, and the
 * pair walk the page's own five sections, performing a short scene at each
 * stop through the HUD's `role="status"`. It is the only thing the companion
 * narrates out loud, on purpose: everything else it does is a drawing, and a
 * drawing that starts talking to a screen reader unprompted is noise. Asked
 * for, it is a small guided performance of the page rather than a feature
 * nobody who cannot see the cats has any way to reach.
 *
 * `TOUR_STOPS` is derived from `navItems` rather than kept as a parallel
 * list, so the tour can never visit a section the nav does not, or skip one
 * it does — the two are structurally the same five entries. `stopsFor`
 * re-orders that same set for the one fork in the walk — see `TourRoute` —
 * without ever adding to or subtracting from it. The lines spoken at each
 * stop are not here: they come from companion-dialogue.ts's `tour-*` scenes,
 * the same scene bank the ambient banter draws from; the choreography each
 * stop performs while its scene plays lives in `Companion.tsx`, alongside the
 * rest of the pair's movement.
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
 * The one fork in the walk. Both cats narrate the first two stops and the
 * last one identically — the visitor has not chosen anyone yet at Work, and
 * Contact is where every route ends up regardless — so the routes only ever
 * disagree about the two stops in between: `grey`'s is the order the page
 * itself is laid out in (the builder's route, work outward through the
 * evidence), `tabby`'s runs it backwards (the curious route, starting from
 * what she finds most interesting and working back to how it was built). See
 * `stopsFor`.
 */
export type TourRoute = "grey" | "tabby";

/** The two stops between Work and Contact, in `grey`'s order — the
 *  same order `TOUR_STOPS` already puts them in, named here rather than
 *  re-sliced at every call site. `tabby`'s route is this, reversed.
 *
 *  Round 10: the tree absorbed Journey, so this list is one shorter than it
 *  used to be — `journey` retired as a section id, and the tree's own tour
 *  scene (`companion-dialogue.ts`) narrates both faces at its one stop.
 *  Round 16: Philosophy's removal dropped it to three and shifted the fork
 *  to the second stop, now Work rather than Philosophy; the Lab's removal
 *  dropped it again, to two. */
const GREY_MIDDLE = ["skills", "tree"] as const;

const STOP_BY_SECTION = new Map(TOUR_STOPS.map((stop) => [stop.sectionId, stop]));

/**
 * The five stops in the order one route walks them. Both routes are the
 * same *set* of five — nothing is skipped, nothing is invented — and they
 * agree on the first two (About, Work) and the last one (Contact); only the
 * two in between change order, per `TourRoute`'s own doc comment.
 */
export function stopsFor(route: TourRoute): readonly TourStop[] {
  const middle = route === "grey" ? GREY_MIDDLE : [...GREY_MIDDLE].reverse();
  return [
    TOUR_STOPS[0],
    TOUR_STOPS[1],
    ...middle.map((sectionId) => STOP_BY_SECTION.get(sectionId)!),
    TOUR_STOPS[TOUR_STOPS.length - 1],
  ];
}

/**
 * The tour in progress. `index` is the stop the pair are walking to or
 * standing at; `arrivedAt` is zero until `phase` becomes `"arrived"`, which is
 * what lets the caller tell "just got here" from "has been standing here a
 * while" without a second clock. `route` decides which order `index` counts
 * through — see `stopsFor` — and starts at `"grey"` before the visitor has
 * picked anyone, which is also what a tour that ends (or is asked for again)
 * without ever reaching the fork quietly falls back to. `routeChosen` is
 * false until the HUD's fork is answered; it is what tells the HUD to keep
 * offering the choice rather than which way the walk currently leans.
 */
export interface TourRun {
  index: number;
  phase: TourPhase;
  arrivedAt: number;
  route: TourRoute;
  routeChosen: boolean;
}

export function startTour(): TourRun {
  return { index: 0, phase: "walking", arrivedAt: 0, route: "grey", routeChosen: false };
}

export function isLastStop(index: number): boolean {
  return index >= TOUR_STOPS.length - 1;
}
