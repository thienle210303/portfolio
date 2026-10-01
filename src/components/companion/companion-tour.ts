"use client";

import { navItems } from "@/content/portfolio";

/**
 * The guided play: the accessible half of D5.
 *
 * The duet's ambient banter (companion-dialogue.ts) is decorative; this is the
 * opposite — a visitor presses "Show me around" in the toolkit panel, and the
 * pair walk the page's own four sections, performing a short scene at each
 * stop through the HUD's `role="status"`. It is the only thing the companion
 * narrates out loud, on purpose: everything else it does is a drawing, and a
 * drawing that starts talking to a screen reader unprompted is noise. Asked
 * for, it is a small guided performance of the page rather than a feature
 * nobody who cannot see the cats has any way to reach.
 *
 * `TOUR_STOPS` is derived from `navItems` rather than kept as a parallel
 * list, so the tour can never visit a section the nav does not, or skip one
 * it does — the two are structurally the same four entries. `stopsFor`
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
 * order the page itself is laid out in (the builder's route, the world
 * first and then the chronology behind it), `tabby`'s runs it backwards
 * (the curious route, starting from what she finds most interesting and
 * working back to how it was built). See `stopsFor`.
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
 *  Round 18 took it from four to two. The page lost Selected Work and
 *  Skills (their case studies now render inside the Journey's branches), so
 *  Worlds and Journey are all that is left between About and Contact, and
 *  taking the two ids out of this list and out of `navItems` is the whole of
 *  what the tour had to unlearn: `TOUR_STOPS` already derives from `navItems`
 *  and `stopsFor` derives the middle from this one list. A section added to
 *  `navItems` and forgotten here would be visited by neither route —
 *  `stopsFor`'s filter drops nothing, but the middle it builds would simply
 *  never name it — which is the silent skip
 *  `tests/lib/companion-tour.test.ts`'s "visits every nav section" case
 *  exists to catch. */
const GREY_MIDDLE = ["worlds", "tree"] as const;

const STOP_BY_SECTION = new Map(TOUR_STOPS.map((stop) => [stop.sectionId, stop]));

/**
 * The stops in the order one route walks them — four today, for a
 * well-formed `GREY_MIDDLE`. Both routes are the same *set* — nothing is
 * skipped, nothing is invented — and they agree only on the first stop
 * (About) and the last (Contact); everything between the two is
 * `GREY_MIDDLE`, in order or reversed, per `TourRoute`'s own doc comment.
 *
 * The `filter` below (rather than a non-null assertion on the `Map.get`)
 * stops *this function* from throwing on a typo or a stale id in
 * `GREY_MIDDLE` — it drops that one stop instead. That is only half a
 * safety net by itself: the array this returns is then shorter than
 * `TOUR_STOPS.length`, and every caller has to measure against *this*
 * array's own length rather than assume the two agree, or the walk goes
 * looking for a stop one past the real end and throws there instead —
 * `Companion.tsx`'s own render, one function call away. See `isLastStop`.
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

/**
 * `totalStops` must be the length of `stopsFor(route)` for whichever route
 * is actually running — never `TOUR_STOPS.length`. The two only agree when
 * `GREY_MIDDLE` is well-formed; a caller that passes the fixed length
 * instead would keep this returning `false` one stop past the real end,
 * sending the walk looking for a stop `stopsFor` never produced.
 */
export function isLastStop(index: number, totalStops: number): boolean {
  return index >= totalStops - 1;
}
