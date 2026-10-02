"use client";

import { CAT_H, CAT_W } from "./CompanionCat";
import {
  clampToViewport,
  clearsControls,
  findClearSpot,
  isClearSpot,
  randomViewportPoint,
  safeTop,
  standingSpots,
  viewport,
  type Point,
} from "./companion-space";

/**
 * Section moods: the quiet ways the pair show they know where the visitor is.
 *
 * The companion already knows *that* somebody is reading — the presence clock
 * in `Companion` is built on it. What it never knew is *what* they are reading,
 * so two cats parked in the same margin looked identical whether the visitor
 * was three paragraphs into the Journey or standing on the contact card. This
 * module answers the second question, and nothing else: it turns "the visitor
 * is in the Journey" into a pair of coordinates.
 *
 * Four rules, and they are the same four the rest of the companion lives by —
 * this module is deliberately not allowed to be the exception:
 *
 *  1. **It only ever proposes places to stop.** Every spot returned here has
 *     been through `isClearSpot`, which is the same probe the resting spots and
 *     the scenes use. A mood that cannot find clear ground *declines* — returns
 *     null — and the caller falls back to the ordinary settle behaviour rather
 *     than parking a cat on a paragraph to make a point.
 *  2. **Every coordinate goes through `clampToViewport`.** That is the one
 *     function that knows about both viewport edges and the opaque sticky
 *     header painting over the companion layer, so a mood cannot invent the two
 *     ways a cat has historically become invisible.
 *  3. **Nothing here is announced.** No DOM is written, no attribute is set, no
 *     live region is touched. The cats are decoration; a decoration that starts
 *     narrating itself to a screen reader is noise, and the moods are the most
 *     tempting place to get that wrong.
 *  4. **It reads the page rather than modelling it.** The anchors are resolved
 *     with `querySelector` against markup owned by other components, so every
 *     lookup is written to fail soft: a selector that stops matching costs the
 *     mood, not the companion. That is why `planMood` returns null so freely.
 *
 * Cancellation needs no code here at all, which is the point of returning plain
 * geometry: a mood is only ever consulted on the frames the loop has already
 * decided the pair are parked, so the pointer moving drops it the same frame it
 * drops any other settled position.
 *
 * The wander planner at the foot of the file is here rather than in the loop
 * for one reason: it answers the same question these do, and it has to answer
 * it the same way. Round 9 gave the visitor a mode with no cursor in it, and
 * the pair need somewhere to go every few seconds — which is exactly "a place
 * to stop", exactly the four rules above, and exactly the two mechanisms
 * already written down here.
 */

export type MoodKind = "hero" | "tree" | "contact";

export interface MoodSpots {
  readonly lead: Point;
  readonly follow: Point;
}

export interface MoodPlan {
  readonly kind: MoodKind;
  readonly spots: MoodSpots;
  /**
   * A lap the lead walks before settling, in order. Waypoints are *crossed*,
   * not stopped on — the same licence a cat trailing the pointer already has —
   * so they are clamped but not probed. Empty for the moods that are simply a
   * place to sit.
   */
  readonly path: readonly Point[];
}

/** How far off an anchor's edge a cat comes to rest. */
const MARGIN = 14;

/** Two spots this close together are one badly drawn cat — the same threshold
 *  `companion-space` uses internally, restated here because the pair are placed
 *  from an anchor rather than from each other. */
function overlaps(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < CAT_W * 0.7 && Math.abs(a.y - b.y) < CAT_H * 0.7;
}

/**
 * Is this anchor worth walking to?
 *
 * A section can be "active" while the specific element a mood hangs off has
 * already scrolled past, and a cat sent to a rectangle above the header or
 * below the fold is a cat sent nowhere.
 */
function onScreen(rect: DOMRect): boolean {
  const view = viewport();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > safeTop() + CAT_H * 0.5 &&
    rect.top < view.height - CAT_H * 0.5
  );
}

function rectOf(element: Element | null | undefined): DOMRect | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return onScreen(rect) ? rect : null;
}

/**
 * Which side of an anchor to sit on: the ones with room for a cat first,
 * nearest to where the cats already are as the tie-break. Crossing the whole
 * page to reach the "correct" margin would undo the calm the mood is for.
 */
function sides(rect: DOMRect, lead: Point): Array<1 | -1> {
  const need = CAT_W + MARGIN * 2;
  const room = { right: viewport().width - rect.right, left: rect.left };
  const fits: Array<1 | -1> = [];
  if (room.right >= need) fits.push(1);
  if (room.left >= need) fits.push(-1);
  if (fits.length === 2) {
    const nearer: 1 | -1 = lead.x + CAT_W / 2 > (rect.left + rect.right) / 2 ? 1 : -1;
    return nearer === 1 ? [1, -1] : [-1, 1];
  }
  // Nothing fits cleanly: try both anyway and let the probe decide. The clamp
  // will have pulled the candidate into the page, and a narrow viewport's only
  // whitespace is often exactly there.
  return fits.length === 1 ? [fits[0], (fits[0] * -1) as 1 | -1] : room.right >= room.left ? [1, -1] : [-1, 1];
}

/** Where the second cat goes once the first has claimed a spot: behind, above,
 *  or a cat-width further out — and only if that place is clear too, and
 *  clear of the companion's own fixed controls (`clearsControls`) — the
 *  toolkit toggle chief among them, since it is wherever the lead itself is
 *  currently standing. */
function mateSpot(lead: Point, side: 1 | -1): Point | null {
  const tries: Point[] = [
    { x: lead.x, y: lead.y + CAT_H + 6 },
    { x: lead.x, y: lead.y - CAT_H - 6 },
    { x: lead.x - side * (CAT_W + 10), y: lead.y },
  ];
  for (const want of tries) {
    const spot = clampToViewport(want);
    if (!overlaps(spot, lead) && isClearSpot(spot) && clearsControls(spot)) return spot;
  }
  return null;
}

/**
 * Sit down beside a rectangle, on whichever side has room — the shared shape
 * every "beside this element" mood below is built from.
 *
 * Extracted from the Work mood, which used to be the only mood that walked a
 * side/offset grid to find a spot beside a moving target. Every mood added in
 * round 11 wants exactly the same thing — a place next to *an* anchor,
 * wherever that anchor currently is on screen — so the grid is shared rather
 * than copied once per mood with a chance to drift apart each time. (Round 18
 * deleted the Work and Skills moods along with their sections.)
 */
function besideRect(
  rect: DOMRect,
  lead: Point,
  follow: Point,
  home: Point,
  kind: MoodKind,
  dys: readonly number[] = [16, 96, 190, -CAT_H - 10],
): MoodPlan | null {
  for (const side of sides(rect, lead)) {
    const x = side > 0 ? rect.right + MARGIN : rect.left - CAT_W - MARGIN;
    for (const dy of dys) {
      const spot = clampToViewport({ x, y: rect.top + dy });
      if (!isClearSpot(spot)) continue;
      const mate = mateSpot(spot, side) ?? findClearSpot(follow, home, spot);
      return { kind, spots: { lead: spot, follow: mate }, path: [] };
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Hero: on the scroll-cue row                                                 */
/* -------------------------------------------------------------------------- */

/** `Hero.tsx`'s scroll-cue row — the one-liner adds `data-cat-perch` to it,
 *  which is the whole of what this mood needs from that file. */
function heroMood(lead: Point, follow: Point, home: Point): MoodPlan | null {
  const rect = rectOf(document.querySelector("[data-cat-perch]"));
  if (!rect) return null;
  return besideRect(rect, lead, follow, home, "hero");
}

/* -------------------------------------------------------------------------- */
/* Tree: beside the plinth, not on it (declines since round 18)               */
/* -------------------------------------------------------------------------- */

/**
 * A settle mood that sits *beside* the career tree's plinth while the visitor
 * is simply reading the section — a different, narrower question from the
 * nap contract (`Companion`'s `napRef`), which calls the pair *under* a
 * `data-cat-nap` element on pointer dwell or focus.
 *
 * **It always declines today.** The plinth was the only element on the site
 * carrying `data-cat-nap`; the pinned stage never mounted it, and round 18
 * retired it (`KnowledgeTree.tsx`). So `#tree [data-cat-nap]` matches
 * nothing, `rectOf` returns null, and the Journey gets exactly what every
 * mood-less section gets — the ordinary resting spots. Nothing in
 * `e2e/companion.spec.ts` asserts a tree mood (its mood test checks the
 * contact perch only), so this costs nothing and claims nothing; giving the
 * Journey a mood again means choosing a new anchor on the stage, which is a
 * design question rather than a selector fix.
 */
function treeMood(lead: Point, follow: Point, home: Point): MoodPlan | null {
  const rect = rectOf(document.querySelector("#tree [data-cat-nap]"));
  if (!rect) return null;
  return besideRect(rect, lead, follow, home, "tree");
}

/* -------------------------------------------------------------------------- */
/* Contact: one of them on the edge of the card                                */
/* -------------------------------------------------------------------------- */

function contactMood(follow: Point, home: Point): MoodPlan | null {
  const rect = rectOf(document.querySelector("#contact aside"));
  if (!rect) return null;

  /*
   * Perches, best first. The first two put a cat's feet three pixels inside the
   * card's top rule with everything else above it — which is what "on the edge"
   * has to mean for a drawing with no depth, and which the probe still reads as
   * the clear band *above* the card rather than as the card itself. The last two
   * are the ordinary fallbacks for a layout that has stacked the card under the
   * form, where there is no band above it to sit in.
   */
  const perches: Point[] = [
    { x: rect.right - CAT_W - 26, y: rect.top - CAT_H + 3 },
    { x: rect.left + 20, y: rect.top - CAT_H + 3 },
    { x: rect.left - CAT_W - MARGIN, y: rect.top + 26 },
    { x: rect.right + MARGIN, y: rect.top + 26 },
  ];

  const middle = (rect.left + rect.right) / 2;
  for (const want of perches) {
    const spot = clampToViewport(want);
    if (!isClearSpot(spot)) continue;
    // Only *one* of them perches — the pair lined up along a business card is a
    // logo, not two animals. She takes the nearest clear place off it, and only
    // keeps her own if there is none: two cats a viewport apart have stopped
    // being a pair.
    const outward: 1 | -1 = spot.x + CAT_W / 2 >= middle ? 1 : -1;
    return {
      kind: "contact",
      spots: { lead: spot, follow: mateSpot(spot, outward) ?? findClearSpot(follow, home, spot) },
      path: [],
    };
  }
  return null;
}

/* -------------------------------------------------------------------------- */

/**
 * What the pair should do about the section the visitor is in, or null for
 * "behave exactly as before" — which is both the answer for every other section
 * and the answer whenever a mood cannot find clear ground.
 *
 * `home` is the corner, and it is only ever used as the last-resort fallback
 * for the *second* cat, exactly as the ordinary resting spots use it.
 */
export function planMood(
  section: string | null,
  lead: Point,
  follow: Point,
  home: Point,
): MoodPlan | null {
  if (section === "about") return heroMood(lead, follow, home);
  if (section === "tree") return treeMood(lead, follow, home);
  if (section === "contact") return contactMood(follow, home);
  return null;
}

/* -------------------------------------------------------------------------- */
/* Wandering: the same question with nobody asking it                          */
/*                                                                             */
/* In `wander` the pointer is not one of the forces acting on the pair, so the */
/* question the loop asks every few seconds — "where now?" — has no answer     */
/* coming from the visitor at all. It is answered here, and deliberately with  */
/* the same two mechanisms everything else uses: the section moods above for   */
/* the places on this page worth being, and the standing-spot sweep for        */
/* everywhere else. There is no second placement engine, because a second      */
/* placement engine is a second set of rules about content to keep in step     */
/* with this one.                                                              */
/* -------------------------------------------------------------------------- */

/**
 * How far a wandering cat insists on going.
 *
 * A destination thirty pixels away is not a decision, it is a shuffle, and a
 * pair that shuffle look like a pair that cannot settle. Roughly three
 * cat-widths, which at every viewport this page renders at leaves the sweep
 * plenty of candidates while ruling out the ones beside their own feet.
 */
export const WANDER_MIN = 180;

/** How often they go and sit where the page says the visitor is, rather than
 *  somewhere of their own choosing. Low enough that the mood stays a remark
 *  rather than a habit. */
const WANDER_MOOD = 0.34;

/** How many places they are willing to consider before deciding there is
 *  nowhere to go. Bounded because each one costs three hit tests, and a page
 *  with no whitespace on it must not turn a stroll into a reflow. */
const WANDER_TRIES = 8;

/** How many uniformly random points `planWander` tries before it gives up on
 *  "genuinely anywhere" and falls back to `standingSpots`'s own, edge-biased
 *  pool. A handful: each one is three hit tests same as `WANDER_TRIES`
 *  above, and a page that is mostly prose will fail most of them, which is
 *  the whole reason there is a fallback rather than a bigger number here. */
const WANDER_UNIFORM_TRIES = 10;

/**
 * Of everywhere a cat could stand, the places far enough away to read as
 * having gone somewhere.
 *
 * Split out from the walk below because it is the only part of wandering that
 * is a rule rather than a roll of the dice, and rules are worth being able to
 * state without a browser in the room.
 */
export function wanderCandidates(spots: readonly Point[], from: Point): Point[] {
  return spots.filter((spot) => Math.hypot(spot.x - from.x, spot.y - from.y) >= WANDER_MIN);
}

/**
 * Somewhere else to be, or null for "stay put" — which the caller answers by
 * leaving them exactly where they are until it asks again.
 *
 * Drawn from the candidates rather than taken in order: `standingSpots` returns
 * them nearest-first, and a wanderer who always takes the nearest one paces the
 * same short hop for the rest of the visit.
 */
/* -------------------------------------------------------------------------- */
/* Scroll anticipation                                                         */
/*                                                                             */
/* A visitor scrolling flat out is not reading — they are travelling — and a    */
/* pair that keep trailing the stale pointer position through that read as     */
/* oblivious rather than company. `detectRush` answers one narrow question,     */
/* in pure arithmetic so it can be tested without a scroll event in the room:   */
/* has the page been moving fast enough, for long enough, that this counts as   */
/* a dash rather than an ordinary scroll. `Companion` accumulates the distance  */
/* and elapsed time from its own scroll handler and asks this on every event;   */
/* the geometry of what to do about a rush — which corner, which gutter —       */
/* stays there, because it needs the viewport and the safe area this module     */
/* never touches.                                                              */
/* -------------------------------------------------------------------------- */

/** Sustained speed, in px of scroll per ms, that counts as a rush. */
export const RUSH_VELOCITY = 1.4;
/** How long that speed has to hold before it counts as one. A single fast
 *  flick of the wheel is not a rush; a visitor who keeps it up is. */
export const RUSH_HOLD_MS = 280;

export function detectRush(distancePx: number, elapsedMs: number): boolean {
  if (elapsedMs < RUSH_HOLD_MS) return false;
  return distancePx / elapsedMs >= RUSH_VELOCITY;
}

/**
 * Where a candidate lands relative to the middle of the window, which is the
 * one thing every wander candidate — uniform or pooled — decides the second
 * cat's side by: outward, so she takes the side with the page's own margin
 * on it rather than the side with the content.
 */
function settleAt(spot: Point, follow: Point, home: Point): MoodSpots {
  const outward: 1 | -1 = spot.x + CAT_W / 2 > viewport().width / 2 ? 1 : -1;
  return { lead: spot, follow: mateSpot(spot, outward) ?? findClearSpot(follow, home, spot) };
}

export function planWander(
  section: string | null,
  lead: Point,
  follow: Point,
  home: Point,
): MoodSpots | null {
  if (Math.random() < WANDER_MOOD) {
    const mood = planMood(section, lead, follow, home);
    // The lap a mood may come with belongs to the settle branch, which owns the
    // walking of it; what wandering wants from a mood is the pair of places it
    // chose.
    if (mood) return mood.spots;
  }

  // Genuinely anywhere first: every point in the viewport is equally likely,
  // so a page with clear ground in the middle of it is no longer invisible to
  // the planner — see the file banner on `randomViewportPoint`. Each
  // candidate still has to clear the ordinary content probe; a uniform draw
  // finds whitespace exactly as often as the page actually has whitespace to
  // find, which is why this still needs the retries rather than taking the
  // first roll on faith.
  for (let tries = 0; tries < WANDER_UNIFORM_TRIES; tries += 1) {
    const spot = randomViewportPoint();
    if (Math.hypot(spot.x - lead.x, spot.y - lead.y) < WANDER_MIN) continue;
    if (!isClearSpot(spot)) continue;
    return settleAt(spot, follow, home);
  }

  // A page with genuinely little clear ground outside its own margins — the
  // old pool, tried second rather than dropped: it still finds *somewhere*
  // on pages a uniform draw keeps missing, at the cost of the edge bias the
  // owner's report was about.
  const options = wanderCandidates(standingSpots(lead), lead);
  for (let tries = 0; tries < WANDER_TRIES && options.length > 0; tries += 1) {
    const [spot] = options.splice(Math.floor(Math.random() * options.length), 1);
    if (!isClearSpot(spot)) continue;
    return settleAt(spot, follow, home);
  }
  return null;
}
