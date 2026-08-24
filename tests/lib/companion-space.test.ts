import { beforeEach, describe, expect, it, vi } from "vitest";
import { CAT_H, CAT_W } from "@/components/companion/CompanionCat";
import {
  clearsControls,
  findClearSpot,
  isClearSpot,
  keepClearOfControl,
  randomFacing,
  randomViewportPoint,
  setControlRects,
  setReservedRects,
  TOGGLE_CLEARANCE,
  type Point,
  type RectLike,
} from "@/components/companion/companion-space";

/**
 * The collision fix (WP-A, round 10): a cat parking on top of the duet's own
 * speech bubble or mini-Thien's caption was possible because neither is
 * visible to the ordinary content probe — `elementBehind` deliberately looks
 * straight through everything inside `[data-companion]`, or two cats
 * standing near each other would each read the other as occupied ground.
 * `setReservedRects` is the second, narrower gate `isClearSpot` now also
 * consults, and this is what proves it actually gates the same three points
 * (belly, both feet) the ordinary DOM scan does.
 *
 * `document.elementsFromPoint` is stubbed to return nothing behind every
 * probe, which isolates the reserved-rect gate from the DOM occupancy scan
 * this file is not testing (jsdom does not implement the real thing anyway).
 */
function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

const LEAD_PAD_X = 4;
const LEAD_PAD_Y = 3;

/** The exact shape `Companion.tsx`'s `leadControlRect` builds from `grey.pos`. */
function leadControlRect(pos: Point): RectLike {
  return {
    left: pos.x - LEAD_PAD_X,
    top: pos.y - LEAD_PAD_Y,
    right: pos.x - LEAD_PAD_X + CAT_W + LEAD_PAD_X * 2,
    bottom: pos.y - LEAD_PAD_Y + CAT_H + LEAD_PAD_Y * 2,
  };
}

describe("setReservedRects", () => {
  beforeEach(() => {
    document.elementsFromPoint = vi.fn(() => []);
    setReservedRects([]);
  });

  it("treats a spot inside a registered rect as occupied", () => {
    const point: Point = { x: 100, y: 100 };
    expect(isClearSpot(point)).toBe(true);
    // Wide enough to cover the belly and both foot probes `isClearSpot`
    // samples off this point — see the file banner.
    setReservedRects([rect(90, 90, 80, 60)]);
    expect(isClearSpot(point)).toBe(false);
  });

  it("clears the instant the caller registers nothing, not just when it shrinks", () => {
    setReservedRects([rect(90, 90, 80, 60)]);
    expect(isClearSpot({ x: 100, y: 100 })).toBe(false);
    setReservedRects([]);
    expect(isClearSpot({ x: 100, y: 100 })).toBe(true);
  });

  it("only blocks the probe's own three points, not the whole viewport", () => {
    // Far from every point isClearSpot actually samples off {x:100, y:100}.
    setReservedRects([rect(900, 900, 20, 20)]);
    expect(isClearSpot({ x: 100, y: 100 })).toBe(true);
  });

  it("blocks a spot the caller only partly registered — one probe point is enough", () => {
    // Covers only the belly sample (x+25, y+25.2), missing both foot samples
    // (y + 36) entirely — the probe has to be an AND of independent points,
    // not a single centre check, or a cat could straddle the reserved rect
    // with its feet outside it.
    const point: Point = { x: 100, y: 100 };
    setReservedRects([rect(120, 120, 10, 10)]);
    expect(isClearSpot(point)).toBe(false);
  });
});

/**
 * The target-size regression (round 10, post-integration): axe caught the
 * toolkit toggle — the lead cat's own button — with only a sliver of its
 * target left clickable, because the follower had been placed on top of it.
 * `elementBehind` deliberately looks straight through the companion's own
 * subtree (see the file banner above `setReservedRects`), which is exactly
 * why `isClearSpot` alone never saw the conflict: the toggle is *inside*
 * `[data-companion]`, invisible to the DOM occupancy scan by the same rule
 * that lets two cats stand near each other at all.
 *
 * `setControlRects`/`clearsControls` is deliberately a *second*, separate
 * registry from `setReservedRects`/`isClearSpot` above — not folded into
 * it — because the toolkit toggle, unlike a bubble, *is* the lead cat's own
 * current position. Folding it into `isClearSpot` would make the lead read
 * its own settled spot as occupied by itself every frame `restingPlaces()`
 * re-validates a held mood, dropping every mood the instant it was taken
 * up. `clearsControls` is consulted only by `findClearSpot` here and by
 * `mateSpot` in companion-moods.ts — the two places that ever compute one
 * cat's position relative to the *other's* — never by a cat validating its
 * own.
 */
describe("setControlRects / clearsControls — the toolkit-toggle fix", () => {
  beforeEach(() => {
    document.elementsFromPoint = vi.fn(() => []);
    setReservedRects([]);
    setControlRects([]);
  });

  it("treats a spot inside a registered control rect as blocked, and clears the instant nothing is registered", () => {
    const point: Point = { x: 200, y: 200 };
    expect(clearsControls(point)).toBe(true);
    setControlRects([rect(190, 190, 80, 60)]);
    expect(clearsControls(point)).toBe(false);
    setControlRects([]);
    expect(clearsControls(point)).toBe(true);
  });

  it("is a gate entirely separate from setReservedRects — each clears independently of the other", () => {
    const point: Point = { x: 200, y: 200 };
    setReservedRects([rect(190, 190, 80, 60)]);
    expect(isClearSpot(point)).toBe(false);
    // clearsControls is a different registry, and nothing is registered on
    // it in this test — the bubble reservation above must not leak into it.
    expect(clearsControls(point)).toBe(true);
  });

  it("findClearSpot's primary candidate is deliberately NOT gated on controls — that gate broke the guided tour", () => {
    // `want` here stands for the follower's own current position, the way
    // `mateSpot`'s fallback and `restSpots` both pass it in — routinely a
    // few tens of pixels from the lead by construction (ordinary trailing
    // distance), which used to read as "standing on the toggle" the instant
    // a control rect happened to be registered nearby, and rejecting it
    // every frame never let a tour stop's own recomputed spots converge.
    // `mateSpot` (companion-moods.ts) is where the real toggle protection
    // lives instead, checked against its own placement candidates rather
    // than against the caller's already-current position.
    const wantsToStandOnIt: Point = { x: 300, y: 300 };
    setControlRects([rect(295, 295, 60, 50)]);
    const result = findClearSpot(wantsToStandOnIt, { x: 900, y: 700 });
    expect(result).toEqual(wantsToStandOnIt);
  });

  it("findClearSpot's corner fallback still respects a registered control", () => {
    // Blocks `want` and every `nearbyWhitespace` candidate via the ordinary
    // content gate, so the walk actually reaches the home fallback — the
    // one candidate this module still checks against `clearsControls`,
    // because `home` is a fixed point rather than the caller's own moving
    // position and cannot create the tour's feedback loop.
    setReservedRects([rect(-1000, -1000, 4000, 4000)]);
    const home: Point = { x: 900, y: 700 };
    const avoid: Point = { x: 100, y: 100 };
    setControlRects([rect(home.x - 5, home.y - 5, 60, 50)]);
    const result = findClearSpot({ x: 300, y: 300 }, home, avoid);
    expect(result).not.toEqual(home);
    expect(clearsControls(result)).toBe(true);
  });

  it("the home fallback nudges away from a cat or control already standing on it, rather than handing back a known conflict", () => {
    // Blocks `want` and every `nearbyWhitespace` candidate via the ordinary
    // content gate, so the walk actually reaches the home fallback rather
    // than succeeding earlier by coincidence.
    setReservedRects([rect(-1000, -1000, 4000, 4000)]);
    const home: Point = { x: 500, y: 400 };
    // The other cat (or a control) is standing exactly on the corner.
    const result = findClearSpot({ x: 500, y: 400 }, home, home);
    expect(result).not.toEqual(home);
    expect(Math.abs(result.x - home.x)).toBeGreaterThanOrEqual(CAT_W);
  });
});

/**
 * The staleness regression (round 10, second pass): the control rect used
 * to be read off the DOM on a throttle (320ms, then 120ms), and axe caught
 * it going stale under load — the follower placed against a coordinate the
 * lead had already walked away from mid-huddle. `Companion.tsx` now
 * computes this rect directly from `grey.pos` and the fixed padded box a
 * roaming lead is drawn in, every frame, with no `getBoundingClientRect()`
 * and no interval to fall behind.
 *
 * That only works if `setControlRects` genuinely accepts a bare
 * `{ left, top, right, bottom }` — the `RectLike` this module now types it
 * as — rather than secretly wanting a real `DOMRect` (`width`, `height`,
 * `x`, `y`, `toJSON`). This pins that promise with the exact arithmetic
 * `Companion.tsx` builds, and proves a second call — the loop's next frame
 * — takes effect immediately, with nothing left over from the position it
 * replaces.
 */
describe("setControlRects computed straight from state, no DOM object and no staleness", () => {
  beforeEach(() => {
    document.elementsFromPoint = vi.fn(() => []);
    setReservedRects([]);
    setControlRects([]);
  });

  it("blocks the lead's own current position using a bare computed rectangle, no DOMRect required", () => {
    const leadPos: Point = { x: 500, y: 500 };
    setControlRects([leadControlRect(leadPos)]);
    expect(clearsControls(leadPos)).toBe(false);
  });

  it("has no staleness window — a fresh position takes effect on the very next call, not after an interval", () => {
    const oldPos: Point = { x: 500, y: 500 };
    const newPos: Point = { x: 900, y: 500 };
    setControlRects([leadControlRect(oldPos)]);
    expect(clearsControls(oldPos)).toBe(false);
    // The loop moved on — a live rAF caller would register this on the very
    // next frame, not after any elapsed time.
    setControlRects([leadControlRect(newPos)]);
    expect(clearsControls(oldPos)).toBe(true);
    expect(clearsControls(newPos)).toBe(false);
  });
});

/**
 * The invariant fix (round 10, third pass): `clearsControls` only ever
 * gated a *placement candidate* — it stopped the follower being placed on
 * the toggle, but nothing stopped the *lead* independently walking towards
 * wherever the follower already stood (cats look through each other by
 * design), which is what a watch scene's own huddle did. `keepClearOfControl`
 * is the invariant itself: a correction applied to the follower's already-
 * final position, regardless of which path produced it.
 *
 * `TOGGLE_CLEARANCE` is pinned against the WCAG 2.5.8 figure directly — if
 * anyone ever "simplifies" it back down below the spec's own minimum, this
 * fails without needing a browser or an axe scan to say so.
 */
describe("keepClearOfControl — the target-size invariant", () => {
  it("enforces at least the WCAG 2.5.8 minimum (24px), not merely close to it", () => {
    expect(TOGGLE_CLEARANCE).toBeGreaterThanOrEqual(24);
  });

  it("leaves an already-clear position untouched", () => {
    const rectAt = leadControlRect({ x: 500, y: 500 });
    const farPos: Point = { x: 900, y: 500 };
    expect(keepClearOfControl(farPos, rectAt)).toEqual(farPos);
  });

  it("pushes a position that overlaps the control out to at least the clearance", () => {
    const leadRect = leadControlRect({ x: 500, y: 500 });
    // Squarely on top of the lead's own button.
    const onTop: Point = { x: 500, y: 500 };
    const result = keepClearOfControl(onTop, leadRect);
    expect(result).not.toEqual(onTop);
    const box = { left: result.x, top: result.y, right: result.x + CAT_W, bottom: result.y + CAT_H };
    const gap = Math.max(
      Math.max(box.left - leadRect.right, leadRect.left - box.right),
      Math.max(box.top - leadRect.bottom, leadRect.top - box.bottom),
    );
    expect(gap).toBeGreaterThanOrEqual(TOGGLE_CLEARANCE);
  });

  it("pushes a position that is merely too close (not yet overlapping) out to the clearance too", () => {
    // Ordinary FOLLOW_GAP trailing distance: a 22px gap, short of
    // TOGGLE_CLEARANCE by a couple of pixels but not overlapping at all —
    // the case that must not be confused with "already fine".
    const leadRect = leadControlRect({ x: 500, y: 500 });
    const almostClear: Point = { x: leadRect.left - CAT_W - 22, y: 500 };
    const result = keepClearOfControl(almostClear, leadRect);
    expect(result.x).toBeLessThan(almostClear.x);
  });

  it("falls through to a vertical candidate when the viewport is too narrow for either horizontal one — round 10's own clamp-collapse bug, closed for the invariant too", () => {
    // A viewport narrow enough that pushing the follower to either side of
    // the lead gets clamped straight back into it — the exact shape that
    // let a clamp silently re-introduce an overlap in round 10's first
    // pass. `window.innerHeight` stays generous, so the vertical
    // candidates below/above still have room; this proves the fallback
    // chain actually reaches them rather than settling for a clamped,
    // still-conflicting horizontal one.
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 150 });
    try {
      const leadPos: Point = { x: 40, y: 400 };
      const leadRect = leadControlRect(leadPos);
      const onTop: Point = { x: leadPos.x, y: leadPos.y };
      const result = keepClearOfControl(onTop, leadRect);
      const box = { left: result.x, top: result.y, right: result.x + CAT_W, bottom: result.y + CAT_H };
      const gap = Math.max(
        Math.max(box.left - leadRect.right, leadRect.left - box.right),
        Math.max(box.top - leadRect.bottom, leadRect.top - box.bottom),
      );
      expect(gap).toBeGreaterThanOrEqual(TOGGLE_CLEARANCE);
      // And it moved vertically to get there, not horizontally into an
      // edge it could never have cleared at this width.
      expect(result.y).not.toBe(onTop.y);
    } finally {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
    }
  });
});

/**
 * The wander-goes-random fix (WP-P round 14): `standingSpots` sweeps a grid
 * of five columns — the two gutters, the content column's middle, the two
 * quarter points — built to find the whitespace *between* blocks of prose,
 * which on an ordinary page is the margins. Wander used that same pool for
 * its own destinations, and "they always try to come to corners or edges"
 * is exactly what that grid was always going to produce. `randomViewportPoint`
 * is the other kind of pool: every point in the margin-inset box equally
 * likely, sampled rather than swept.
 */
describe("randomViewportPoint", () => {
  it("draws the exact corners of the box at the extremes of the rng", () => {
    const min = randomViewportPoint(() => 0);
    const max = randomViewportPoint(() => 1);
    // jsdom's default viewport: window.innerWidth/innerHeight (1024×768),
    // since `document.documentElement.clientWidth/Height` are 0 there and
    // `viewport()` falls back — see that function's own note.
    expect(min).toEqual({ x: 8, y: 8 });
    expect(max).toEqual({ x: 1024 - CAT_W - 8, y: 768 - CAT_H - 8 });
  });

  it("is linear in the rng draw, not clustered towards either end", () => {
    const mid = randomViewportPoint(() => 0.5);
    const min = randomViewportPoint(() => 0);
    const max = randomViewportPoint(() => 1);
    expect(mid.x).toBeCloseTo((min.x + max.x) / 2, 5);
    expect(mid.y).toBeCloseTo((min.y + max.y) / 2, 5);
  });

  it("defaults to Math.random and always lands inside the box, middle included", () => {
    let sawMiddleColumn = false;
    for (let i = 0; i < 200; i += 1) {
      const point = randomViewportPoint();
      expect(point.x).toBeGreaterThanOrEqual(8);
      expect(point.x).toBeLessThanOrEqual(1024 - CAT_W - 8);
      expect(point.y).toBeGreaterThanOrEqual(8);
      expect(point.y).toBeLessThanOrEqual(768 - CAT_H - 8);
      // Unlike `standingSpots`'s five fixed columns, a uniform draw is not
      // confined to the gutters — this is the property the fix is for.
      if (Math.abs(point.x - 512) < 100) sawMiddleColumn = true;
    }
    expect(sawMiddleColumn).toBe(true);
  });
});

describe("randomFacing", () => {
  it("is deterministic — the same seed always answers the same way", () => {
    const seed = "lead:12345:600:400";
    expect(randomFacing(seed)).toBe(randomFacing(seed));
  });

  it("only ever answers 1 or -1", () => {
    for (let i = 0; i < 50; i += 1) {
      const face = randomFacing(`seed-${i}`);
      expect(face === 1 || face === -1).toBe(true);
    }
  });

  it("answers both ways across enough different seeds — it is not secretly constant", () => {
    const faces = new Set<number>();
    for (let i = 0; i < 50; i += 1) faces.add(randomFacing(`arrival-${i}`));
    expect(faces).toEqual(new Set([1, -1]));
  });

  it("two different seeds are not guaranteed the same answer — the hash actually depends on the input", () => {
    // Not every pair of seeds has to differ, but at least one of a spread
    // of them must, or this would be a constant function wearing a seed
    // parameter.
    const answers = new Set<number>();
    for (const seed of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
      answers.add(randomFacing(seed));
    }
    expect(answers.size).toBeGreaterThan(1);
  });
});
