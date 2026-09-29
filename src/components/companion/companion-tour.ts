"use client";

import { navItems } from "@/content/portfolio";

/**
 * The guided play: the accessible half of D5.
 *
 * The duet's ambient banter (companion-dialogue.ts) is decorative; this is the
 * opposite — a visitor presses "Show me around" in the toolkit panel, and the
 * pair walk the page's own six sections, performing a short scene at each
 * stop through the HUD's `role="status"`. It is the only thing the companion
 * narrates out loud, on purpose: everything else it does is a drawing, and a
 * drawing that starts talking to a screen reader unprompted is noise. Asked
 * for, it is a small guided performance of the page rather than a feature
 * nobody who cannot see the cats has any way to reach.
 *
 * `TOUR_STOPS` is derived from `navItems` rather than kept as a parallel
 * list, so the tour can never visit a section the nav does not, or skip one
 * it does — the two are structurally the same six entries. `stopsFor`
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
 * The one fork in the walk. Both cats narrate the first stop and the last
 * one identically — the visitor has not chosen anyone yet at About, and
 * Contact is where every route ends up regardless — so the routes only
 * ever disagree about the stops in between, `GREY_MIDDLE`: `grey`'s is the
 * order the page itself is laid out in (the builder's route, work outward
 * through the evidence), `tabby`'s runs it backwards (the curious route,
 * starting from what she finds most interesting and working back to how it
 * was built). See `stopsFor`.
 */
export type TourRoute = "grey" | "tabby";

/** Every stop between the first (About) and the last (Contact), in `grey`'s
 *  order — the order the page itself is laid out in. `tabby`'s route is
 *  this, reversed. `stopsFor` derives the *whole* middle from this one list
 *  rather than hard-coding a second shared stop, which is what keeps a
 *  section added to `navItems` from silently being visited twice (if it
 *  lands in both the hard-coded prefix and this list) or never (if it lands
 *  in neither).
 *
 *  Round 10: the tree absorbed Journey, so this list is one shorter than it
 *  used to be — `journey` retired as a section id, and the tree's own tour
 *  scene (`companion-dialogue.ts`) narrates both faces at its one stop.
 *  Round 16: Philosophy's removal dropped it to three and shifted the fork
 *  to the second stop, now Work rather than Philosophy; the Lab's removal
 *  dropped it again, to two. Playground Earth's addition put Work back into
 *  the middle — rather than growing a second hard-coded prefix stop in
 *  `stopsFor` — so the list is four again: Worlds, Work, Skills, Journey. */
const GREY_MIDDLE = ["worlds", "work", "skills", "tree"] as const;

const STOP_BY_SECTION = new Map(TOUR_STOPS.map((stop) => [stop.sectionId, stop]));

/**
 * The six stops in the order one route walks them. Both routes are the
 * same *set* of six — nothing is skipped, nothing is invented — and they
 * agree only on the first stop (About) and the last (Contact); everything
 * between the two is `GREY_MIDDLE`, in order or reversed, per `TourRoute`'s
 * own doc comment.
 *
 * The `filter` below (rather than a non-null assertion on the `Map.get`)
 * is deliberate: a typo or a stale id in `GREY_MIDDLE` now drops that one
 * stop instead of throwing partway through a visitor's tour.
 */
export function stopsFor(route: TourRoute): readonly TourStop[] {
  const middle = route === "grey" ? GREY_MIDDLE : [...GREY_MIDDLE].reverse();
  const stops = middle
    .map((sectionId) => STOP_BY_SECTION.get(sectionId))
    .filter((stop): stop is TourStop => stop !== undefined);
  return [TOUR_STOPS[0], ...stops, TOUR_STOPS[TOUR_STOPS.length - 1]];
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
