"use client";

import { CAT_H, CAT_W } from "./CompanionCat";
import {
  clampToViewport,
  findClearSpot,
  isClearSpot,
  safeTop,
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
 */

export type MoodKind = "work" | "contact" | "loop";

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
 *  or a cat-width further out — and only if that place is clear too. */
function mateSpot(lead: Point, side: 1 | -1): Point | null {
  const tries: Point[] = [
    { x: lead.x, y: lead.y + CAT_H + 6 },
    { x: lead.x, y: lead.y - CAT_H - 6 },
    { x: lead.x - side * (CAT_W + 10), y: lead.y },
  ];
  for (const want of tries) {
    const spot = clampToViewport(want);
    if (!overlaps(spot, lead) && isClearSpot(spot)) return spot;
  }
  return null;
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

  for (const side of sides(rect, lead)) {
    const x = side > 0 ? rect.right + MARGIN : rect.left - CAT_W - MARGIN;
    // Down the study's edge, starting level with its masthead — where the
    // numeral and the title are, so the pair read as sitting *with* the row
    // rather than as having stopped somewhere arbitrary.
    for (const dy of [16, 96, 190, -CAT_H - 10]) {
      const spot = clampToViewport({ x, y: rect.top + dy });
      if (!isClearSpot(spot)) continue;
      const mate = mateSpot(spot, side) ?? findClearSpot(follow, home, spot);
      return { kind: "work", spots: { lead: spot, follow: mate }, path: [] };
    }
  }
  return null;
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

  for (const want of perches) {
    const spot = clampToViewport(want);
    if (!isClearSpot(spot)) continue;
    // Only *one* of them perches — the other keeps her own place, wherever the
    // page allows it. Two cats lined up on a business card is a logo.
    return {
      kind: "contact",
      spots: { lead: spot, follow: findClearSpot(follow, home, spot) },
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
 */
function loopDiagram(): DOMRect | null {
  const labelled = document.querySelector('#philosophy ol[aria-labelledby="philosophy-loop-label"]');
  if (labelled) return rectOf(labelled);
  const lists = document.querySelectorAll("#philosophy ol");
  return rectOf(lists[lists.length - 1]);
}

/** Drop waypoints that land on top of the one before them — a clamped lap on a
 *  narrow viewport collapses to a straight line, and a "lap" of two identical
 *  points is a cat twitching in place. */
function trim(points: readonly Point[], settle: Point): Point[] {
  const kept: Point[] = [];
  for (const point of points) {
    const previous = kept[kept.length - 1];
    if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < CAT_W * 0.6) continue;
    kept.push(point);
  }
  // And the last one, if it is already where they are going to sit.
  while (
    kept.length > 0 &&
    Math.hypot(kept[kept.length - 1].x - settle.x, kept[kept.length - 1].y - settle.y) < CAT_W * 0.6
  ) {
    kept.pop();
  }
  return kept;
}

function loopMood(follow: Point, home: Point): MoodPlan | null {
  const rect = loopDiagram();
  if (!rect) return null;

  const view = viewport();
  // The visible slice of the diagram: it is usually taller than the window, so
  // the "outer edge" a cat can actually walk is the part of it on screen.
  const top = Math.max(rect.top + 8, safeTop() + 10);
  const bottom = Math.min(rect.bottom - CAT_H - 8, view.height - CAT_H - 10);
  if (bottom - top < CAT_H) return null;

  const right = rect.right + MARGIN;
  const left = rect.left - CAT_W - MARGIN;

  for (const dy of [0, 70, 150, -CAT_H - 10]) {
    const spot = clampToViewport({ x: left, y: top + dy });
    if (!isClearSpot(spot)) continue;
    const lap = [
      { x: right, y: top },
      { x: right, y: bottom },
      { x: left, y: bottom },
    ].map(clampToViewport);
    return {
      kind: "loop",
      spots: { lead: spot, follow: mateSpot(spot, -1) ?? findClearSpot(follow, home, spot) },
      path: trim(lap, spot),
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
  if (section === "work") return workMood(lead, follow, home);
  if (section === "contact") return contactMood(follow, home);
  if (section === "philosophy") return loopMood(follow, home);
  return null;
}
