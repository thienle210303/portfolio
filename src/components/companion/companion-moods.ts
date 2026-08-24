"use client";

import { CAT_H, CAT_W } from "./CompanionCat";
import {
  clampToViewport,
  clearsControls,
  findClearSpot,
  isClearSpot,
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
 * was three paragraphs into a case study or standing on the contact card. This
 * module answers the second question, and nothing else: it turns "the visitor
 * is in Work" into a pair of coordinates and, once, a short lap.
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

export type MoodKind = "hero" | "work" | "skills" | "tree" | "lab" | "contact" | "loop";

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
 * Extracted from `workMood`, which used to be the only mood that walked a
 * side/offset grid to find a spot beside a moving target. Every mood added in
 * round 11 wants exactly the same thing — a place next to *an* anchor,
 * wherever that anchor currently is on screen — so the grid is shared rather
 * than copied five times with five chances to drift apart.
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
/* Skills: beside the list of categories                                       */
/* -------------------------------------------------------------------------- */

function skillsMood(lead: Point, follow: Point, home: Point): MoodPlan | null {
  const rect = rectOf(document.querySelector('#skills ul[role="list"]'));
  if (!rect) return null;
  return besideRect(rect, lead, follow, home, "skills");
}

/* -------------------------------------------------------------------------- */
/* Tree: beside the plinth, not on it                                          */
/* -------------------------------------------------------------------------- */

/**
 * `#tree [data-cat-nap]` is the plinth the nap contract already sleeps
 * beneath — see `Companion`'s `napRef` and `KnowledgeTree.tsx:112`, which
 * this module does not touch. That contract calls the pair *under* the
 * element on pointer dwell or focus; this is a different, narrower question —
 * a settle mood that sits *beside* the same element while the visitor is
 * simply reading the section, which is why it is a fifth mood and not a
 * second reader of the nap attribute.
 */
function treeMood(lead: Point, follow: Point, home: Point): MoodPlan | null {
  const rect = rectOf(document.querySelector("#tree [data-cat-nap]"));
  if (!rect) return null;
  return besideRect(rect, lead, follow, home, "tree");
}

/* -------------------------------------------------------------------------- */
/* Lab: beside the workflow tabs                                               */
/* -------------------------------------------------------------------------- */

function labMood(lead: Point, follow: Point, home: Point): MoodPlan | null {
  const rect = rectOf(document.querySelector('#lab [role="tablist"]'));
  if (!rect) return null;
  return besideRect(rect, lead, follow, home, "lab");
}

/* -------------------------------------------------------------------------- */
/* Work: beside the case study you are actually reading                        */
/* -------------------------------------------------------------------------- */

/**
 * The case study currently in the reading band.
 *
 * Read off `ProjectIndex`'s own `aria-current`, which is that component's
 * answer to exactly this question — computed from the shared `useActiveSection`
 * hook against the case-study anchors. Reading its answer rather than
 * recomputing one is what keeps the cats and the index from disagreeing about
 * which study the visitor is on, and costs one `querySelector`.
 */
function activeCaseStudy(): DOMRect | null {
  const current = document.querySelector<HTMLAnchorElement>('#work [aria-current="true"]');
  const href = current?.getAttribute("href") ?? "";
  const anchored = href.startsWith("#") ? document.getElementById(href.slice(1)) : null;
  return rectOf(anchored) ?? rectOf(document.querySelector("#work article"));
}

function workMood(lead: Point, follow: Point, home: Point): MoodPlan | null {
  const rect = activeCaseStudy();
  if (!rect) return null;
  // Down the study's edge, starting level with its masthead — where the
  // numeral and the title are, so the pair read as sitting *with* the row
  // rather than as having stopped somewhere arbitrary.
  return besideRect(rect, lead, follow, home, "work");
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
/* Philosophy: one lap of the loop diagram                                     */
/* -------------------------------------------------------------------------- */

/**
 * The loop diagram, which is the last ordered list in the section — the first
 * is the principles. Named by its own label id where that still holds, and by
 * position where it does not, because this is markup another component owns.
 *
 * And measured through its parent whenever the list itself has collapsed. A
 * diagram is a *drawing* of a list: at desktop widths the steps are positioned
 * absolutely against the wrapper, which leaves the `<ol>` a full-width box
 * nine items tall and zero pixels high. Walking the outer edge of that is
 * walking a horizontal line through the middle of the picture.
 */
function loopDiagram(): DOMRect | null {
  const lists = document.querySelectorAll("#philosophy ol");
  const list =
    document.querySelector('#philosophy ol[aria-labelledby="philosophy-loop-label"]') ??
    lists[lists.length - 1];
  if (!list) return null;
  const own = list.getBoundingClientRect();
  const drawn = own.height >= CAT_H ? list : (list.parentElement ?? list);
  return rectOf(drawn);
}

/**
 * How far the lead is willing to walk to trace an edge, in px.
 *
 * The diagram is a thousand pixels across and six hundred tall, so a full
 * circuit of it is well over three thousand pixels — a quarter of a minute of
 * two cats trotting round the screen while somebody reads the thing they are
 * trotting round. That is not a mood, it is a screensaver. The budget cuts the
 * circuit off wherever it runs out and they sit down there instead, which on a
 * big diagram traces one long edge and on a small one goes the whole way round.
 */
const LAP_BUDGET = 1100;

function loopMood(lead: Point, follow: Point, home: Point): MoodPlan | null {
  const rect = loopDiagram();
  if (!rect) return null;

  const view = viewport();
  // The visible slice of it: the diagram is usually taller than the window, so
  // the "outer edge" a cat can actually walk is the part of it on screen.
  const top = Math.max(rect.top + 8, safeTop() + 10);
  const bottom = Math.min(rect.bottom - CAT_H - 8, view.height - CAT_H - 10);
  if (bottom - top < CAT_H) return null;

  const right = rect.right + MARGIN;
  const left = rect.left - CAT_W - MARGIN;
  // Start on the side they are already standing, and at the end of it they are
  // already nearest: a lap whose first leg is a walk across the whole page is a
  // lap that reads as one long walk with a circuit attached.
  const near = lead.x + CAT_W / 2 > (rect.left + rect.right) / 2 ? right : left;
  const far = near === right ? left : right;
  const from = Math.abs(lead.y - top) <= Math.abs(lead.y - bottom) ? top : bottom;
  const to = from === top ? bottom : top;

  const circuit = [
    { x: near, y: from },
    { x: near, y: to },
    { x: far, y: to },
    { x: far, y: from },
  ].map(clampToViewport);

  // Walk it until the budget runs out, dropping any leg the clamp has already
  // collapsed — a "lap" of two identical points is a cat twitching in place.
  const path: Point[] = [];
  let spent = 0;
  let at = lead;
  for (const point of circuit) {
    const step = Math.hypot(point.x - at.x, point.y - at.y);
    if (step < CAT_W * 0.6) continue;
    if (spent + step > LAP_BUDGET) break;
    spent += step;
    path.push(point);
    at = point;
  }
  if (path.length === 0) return null;

  // And they sit down where the trace stopped — on the edge, which is the whole
  // point of having walked it. Backing off one waypoint at a time rather than
  // hunting elsewhere: any spot on this route is still "beside the diagram".
  for (let i = path.length - 1; i >= 0; i -= 1) {
    const spot = path[i];
    if (!isClearSpot(spot)) continue;
    const side: 1 | -1 = spot.x + CAT_W / 2 > (rect.left + rect.right) / 2 ? 1 : -1;
    return {
      kind: "loop",
      spots: { lead: spot, follow: mateSpot(spot, side) ?? findClearSpot(follow, home, spot) },
      path: path.slice(0, i),
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
  if (section === "work") return workMood(lead, follow, home);
  if (section === "skills") return skillsMood(lead, follow, home);
  if (section === "tree") return treeMood(lead, follow, home);
  if (section === "lab") return labMood(lead, follow, home);
  if (section === "contact") return contactMood(follow, home);
  if (section === "philosophy") return loopMood(lead, follow, home);
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

  const options = wanderCandidates(standingSpots(lead), lead);
  for (let tries = 0; tries < WANDER_TRIES && options.length > 0; tries += 1) {
    const [spot] = options.splice(Math.floor(Math.random() * options.length), 1);
    if (!isClearSpot(spot)) continue;
    // Outward from the middle of the window, so she takes the side with the
    // page's own margin on it rather than the side with the content.
    const outward: 1 | -1 = spot.x + CAT_W / 2 > viewport().width / 2 ? 1 : -1;
    return { lead: spot, follow: mateSpot(spot, outward) ?? findClearSpot(follow, home, spot) };
  }
  return null;
}
