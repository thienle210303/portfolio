"use client";

import { CAT_H, CAT_W } from "./CompanionCat";
import {
  clampToViewport,
  clearsControls,
  exploreApart,
  findClearSpot,
  headClear,
  isClearSpot,
  pickExploreSpot,
  safeTop,
  viewport,
  type Half,
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
 *     null — and the caller falls back to its own ordinary answer (exploring,
 *     or the tour's spot by the section's top edge) rather than parking a cat
 *     on a paragraph to make a point.
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
 * geometry: outside the guided tour, a mood is only ever consulted by the
 * explorers, on frames the loop has already decided the pair are parked, so a
 * pointer moving within `CHASE_RADIUS` of the lead — the only pointer that
 * unparks them (see `parked` in `Companion`) — drops it the same frame it drops
 * any other parked position. A pointer moving further off drops nothing.
 *
 * The explorer planner at the foot of the file is here rather than in the loop
 * for one reason: it answers the same question these do, and it has to answer
 * it the same way. While the reader is about and not steering them with the
 * pointer the pair need somewhere to go every few seconds — which is exactly
 * "a place to stop", exactly the four rules
 * above, and exactly the mechanisms already written down here: a section mood
 * for the first stop in a section, and clear ground anywhere else.
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
   * A lap for the lead to walk before settling, in order. Waypoints would be
   * *crossed*, not stopped on — the same licence a cat trailing the pointer
   * already has — so they are clamped but not probed. Empty for every mood
   * today, and nothing in `Companion` walks one: the branch that did was the
   * pointer-stopped settle, which the explorers replaced.
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

/* -------------------------------------------------------------------------- */
/* Exploring: the same question with nobody asking it                          */
/*                                                                             */
/* While the reader is about but not steering the cats with the pointer, the   */
/* question the loop asks every few seconds — "where now?" — has no answer     */
/* coming from the visitor at all. It is answered here, and deliberately with  */
/* the same mechanisms everything else uses: the section moods above for the   */
/* first stop in a section, and the ordinary clear ground probe for everywhere */
/* else. There is no second placement engine, because a second placement       */
/* engine is a second set of rules about content to keep in step with this one.*/
/* -------------------------------------------------------------------------- */

/** An explorer plan: where each cat goes, and whether that is the section's
 *  perch (which seats them side by side) rather than an ordinary stop. */
export interface ExploreSpots extends MoodSpots {
  readonly perch: boolean;
}

/**
 * How far from its spot an explorer may come to rest, which is how far a stop's
 * ground is checked on every side. `advance` (companion-motion.ts) stops a cat
 * once it is within 0.6px of where it was going, and it eases in from wherever
 * it came from, so the cat stands up to 0.6px off the point that was probed. A
 * head-band row that cleared a button's bottom edge by a fraction of a pixel
 * therefore stopped with the ears across it, about one pick in ten in a gap
 * that narrow, and the whole stop was bad rather than slightly bad. One pixel
 * is the whole tolerance and a little over.
 */
const EXPLORE_REST_MARGIN = 1;

/**
 * Clear ground for an explorer's stop: feet and belly (`isClearSpot`), then the
 * head band (`headClear`) — at the spot and at each corner of the
 * `EXPLORE_REST_MARGIN` square round it, so the cat is clear wherever within
 * its arrival tolerance it comes to rest, not only at the exact point. A stop
 * drawn from anywhere on the page must clear the whole cat, not just where it
 * stands. `planExplore` and `repickExploreSpot` pick their half-page stops with
 * it; perches and scene stages are picked by the three-point `isClearSpot`
 * alone, and the `findClearSpot` fallbacks prefer a clear head band without
 * requiring one (see `findClearSpot`). A held stop is re-checked by
 * `heldExploreClear`, not by this.
 */
export function exploreClear(point: Point): boolean {
  if (!isClearSpot(point) || !headClear(point)) return false;
  for (const dx of [-EXPLORE_REST_MARGIN, EXPLORE_REST_MARGIN]) {
    for (const dy of [-EXPLORE_REST_MARGIN, EXPLORE_REST_MARGIN]) {
      const rest = { x: point.x + dx, y: point.y + dy };
      if (!isClearSpot(rest) || !headClear(rest)) return false;
    }
  }
  return true;
}

/**
 * A held explorer stop, as the re-check after a page move sees it.
 * `headLead`/`headFollow` record whether each cat's head band was clear when
 * the stop was planned (`holdExplore`) — true for every half-page pick, and
 * whatever the ground said for a `findClearSpot` fallback or a declined plan's
 * `nearbySpots()`, which only prefer a clear head band. Never
 * read for a perch.
 */
export interface HeldExplore {
  readonly spots: MoodSpots;
  readonly perch: boolean;
  readonly headLead: boolean;
  readonly headFollow: boolean;
}

/** Records, once, at plan time, what `heldExploreClear` later compares
 *  against. A perch's head band is not read: it is re-checked by the
 *  three-point probe it was picked with. */
export function holdExplore(spots: MoodSpots, perch: boolean): HeldExplore {
  return {
    spots,
    perch,
    headLead: !perch && headClear(spots.lead),
    headFollow: !perch && headClear(spots.follow),
  };
}

/**
 * Whether a held stop still stands on clear ground — `Companion`'s re-check
 * once a scroll settles (`onPageMoved`). The stop rides with the page, so
 * after an ordinary scroll the ground under it is the ground it was planned
 * on, and the re-check must accept that ground or the stop is dropped on every
 * scroll and the pair never arrive.
 *
 * - A perch: the lead's three-point probe alone (her spot is never walked to).
 * - Otherwise, per cat: the three-point probe always, and the head band only
 *   if that head was clear when the stop was planned. That still drops a
 *   head-clear stop when the page's `position: sticky` margin rail slides
 *   over a riding cat's head with the feet clear, and leaves a fallback whose
 *   head was already on content where it was put.
 *
 * `groundSettled` is for the re-checks that are not a scroll: any animation
 * on the page ending — anywhere, not only under the cats — or the body
 * resizing. With it set, every non-perch head must be clear, however it was
 * planned and whether or not the ground under the stop actually moved — most
 * of those re-checks find it unchanged. So a fallback planned with its head
 * already on content is dropped for a re-plan at the next animation end or
 * body resize, and the re-plan may land on the same spot. The case it exists
 * for: at phone widths the hero's first screen is prose to its bottom edge,
 * and the explorers plan their first stop while the hero's load choreography
 * still has the prose offset by a few pixels — no head-clear ground at all,
 * so the fallback stood with both heads on the last paragraph once the
 * animation ended. Not applied
 * after a scroll, for the reason in the first paragraph; animation ends and
 * body resizes are finite, so a stop that is re-planned onto the same ground
 * cannot churn.
 */
export function heldExploreClear(held: HeldExplore, groundSettled = false): boolean {
  if (held.perch) return isClearSpot(held.spots.lead);
  const still = (spot: Point, headWasClear: boolean) =>
    isClearSpot(spot) && (!(headWasClear || groundSettled) || headClear(spot));
  return still(held.spots.lead, held.headLead) && still(held.spots.follow, held.headFollow);
}

/** The explorers' `findClearSpot` fallbacks choose a stop once and hold it,
 *  so they opt in to its head-band preference; the per-frame callers (mood
 *  perches, tour stops) do not — see `findClearSpot`. */
const HELD = { preferHead: true } as const;

/**
 * Where the pair go next, or null for "stay put" — which the caller answers by
 * leaving them exactly where they are until it asks again.
 *
 * The first stop after the visitor reaches a section is that section's mood
 * (`planMood`), so arriving somewhere still earns a remark; a section with no
 * mood, or one that cannot find clear ground, falls through to exploring. After
 * that the lead takes a clear spot in the left half of the page and the
 * follower one in the right (`pickExploreSpot`), so between them they cover the
 * page instead of crowding one patch of it.
 *
 * A cat that finds nothing in either half is placed by `findClearSpot`
 * instead, exactly as a settling cat is — and placed *first*, so its partner is
 * then picked (or kept) against where it will really be, and the pair rule
 * (`exploreApart`: 160px, a column each) still holds between them whenever the
 * page has room for it. Only when *both* come up empty is there nothing to
 * propose.
 */
export function planExplore(
  section: string | null,
  lead: Point,
  follow: Point,
  home: Point,
  firstInSection: boolean,
  rng: () => number = Math.random,
): ExploreSpots | null {
  if (firstInSection) {
    const mood = planMood(section, lead, follow, home);
    // A mood's lap (`path`) is not walked here — no mood supplies one today —
    // so what exploring wants from a mood is the pair of places it chose.
    if (mood) return { ...mood.spots, perch: true };
  }

  const view = viewport();
  const top = safeTop();
  // The perch above is picked by the three-point probe alone, and the
  // `findClearSpot` fallbacks below only prefer a clear head band; the
  // half-page picks require one.
  const pick = (half: Half, other: Point | null) =>
    pickExploreSpot(half, other, view, top, exploreClear, rng);
  const leadSpot = pick("left", follow);
  const followSpot = pick("right", leadSpot);
  if (leadSpot && followSpot) return { lead: leadSpot, follow: followSpot, perch: false };
  if (!leadSpot && !followSpot) return null;

  if (!leadSpot) {
    const leadAt = findClearSpot(lead, home, undefined, HELD);
    return {
      lead: leadAt,
      follow: pick("right", leadAt) ?? findClearSpot(follow, home, leadAt, HELD),
      perch: false,
    };
  }
  // The lead's spot was picked against where she *was*; check it against where
  // she is going, and pick again if the fallback moved her into his way.
  const followAt = findClearSpot(follow, home, undefined, HELD);
  const leadAt = exploreApart(leadSpot, followAt)
    ? leadSpot
    : (pick("left", followAt) ?? findClearSpot(lead, home, followAt, HELD));
  return { lead: leadAt, follow: followAt, perch: false };
}

/**
 * Where one explorer goes next while its partner stays where it is: the stop
 * for a cat whose own stay is up, picked against the partner's *current*
 * target rather than a fresh plan for both. The same machinery as
 * `planExplore` — the cat's own half of the page (`"left"` for the lead,
 * `"right"` for the follower), `exploreClear`'s head-band probe, and the pair
 * rule (`exploreApart`: 160px, a column each) measured against the partner's
 * spot — and, when neither half has a spot that does, the same fallback it
 * makes for a single null pick: `findClearSpot` from where the cat stands,
 * keeping off the partner. That fallback only prefers a clear head band, so
 * the caller records the head band of whatever comes back
 * (`headClear`) for `heldExploreClear`, as `holdExplore` does at plan time.
 *
 * The partner is never moved: if the fallback cannot keep the pair rule the
 * pair simply break it until the partner's own stay is up, which is the
 * cost of not re-planning a cat that is standing still.
 */
export function repickExploreSpot(
  cat: "lead" | "follow",
  current: Point,
  partner: Point,
  home: Point,
  rng: () => number = Math.random,
): Point {
  const half: Half = cat === "lead" ? "left" : "right";
  return (
    pickExploreSpot(half, partner, viewport(), safeTop(), exploreClear, rng) ??
    findClearSpot(current, home, partner, HELD)
  );
}
