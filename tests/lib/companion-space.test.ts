import { beforeEach, describe, expect, it, vi } from "vitest";
import { CAT_H, CAT_W } from "@/components/companion/CompanionCat";
import {
  boundsFor,
  clampToViewport,
  clearsControls,
  EXPLORE_COLUMN,
  EXPLORE_MIN_GAP,
  EXPLORE_TRIES,
  exploreApart,
  findClearSpot,
  isClearSpot,
  keepClearOfControl,
  pickExploreSpot,
  placeBeside,
  randomFacing,
  searchClearOfToggle,
  setControlRects,
  setReservedRects,
  TOGGLE_CLEARANCE,
  boxAt,
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
 * its own settled spot as occupied by itself every time `onPageMoved`
 * (Companion.tsx) re-probes the explorers' held stop, dropping every stop
 * the instant he stood on it. `clearsControls` is consulted only by `findClearSpot` here and by
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
 * WP-R round 15's second follow-up: `keepClearOfControl`'s own four-point
 * push can land on content, because it knows nothing about content at all —
 * it was built to widen a gap from a control rect, full stop. Accepting a
 * push that lands on a paragraph trades one violation for a worse one;
 * refusing it outright and keeping the original spot only trades it back —
 * the follower still *rests* too close to the toggle, which is what axe
 * caught live. `searchClearOfToggle` is the actual fix: widen the search
 * instead of accepting either compromise, over a candidate pool the caller
 * supplies (`standingSpots`' own page-spanning sweep, in production) with a
 * DOM-free `isClear` predicate the caller also supplies — which is what
 * keeps this pure and testable without a browser in the room.
 */
describe("searchClearOfToggle", () => {
  it("skips a nearer candidate that fails content-clearance for a farther one that clears both", () => {
    const leadRect = leadControlRect({ x: 500, y: 500 });
    // Nearest first, the shape `standingSpots` itself returns: the first two
    // clear the control but not content (a paragraph sits there), the third
    // clears both.
    const candidates: Point[] = [
      { x: leadRect.left - CAT_W - TOGGLE_CLEARANCE, y: 500 }, // clears control, on content
      { x: leadRect.right + TOGGLE_CLEARANCE, y: 500 }, // clears control, on content
      { x: 900, y: 900 }, // clears both
    ];
    const onContent = new Set([0, 1]);
    const isClear = (p: Point) => !onContent.has(candidates.indexOf(p));
    expect(searchClearOfToggle(candidates, leadRect, isClear)).toEqual(candidates[2]);
  });

  it("never returns a content-conflicted candidate, even one with a better control gap than every clear alternative", () => {
    const leadRect = leadControlRect({ x: 500, y: 500 });
    const onTop: Point = { x: 500, y: 500 }; // deep control overlap, but content-clear
    const farButConflicted: Point = { x: 2000, y: 2000 }; // huge control gap, on content
    const isClear = (p: Point) => p !== farButConflicted;
    // The conflicted candidate would win on control-gap alone by a mile;
    // content-clearance still has to rule it out.
    const result = searchClearOfToggle([farButConflicted, onTop], leadRect, isClear);
    expect(result).toEqual(onTop);
  });

  it("resolves a pool of only conflicted-near spots to the farther, content-clear one that actually satisfies both", () => {
    const leadRect = leadControlRect({ x: 500, y: 500 });
    const near1: Point = { x: 495, y: 495 }; // overlapping the control, on content
    const near2: Point = { x: 505, y: 505 }; // overlapping the control, on content
    const farClear: Point = { x: 900, y: 500 }; // well clear of both
    const isClear = (p: Point) => p === farClear;
    const result = searchClearOfToggle([near1, near2, farClear], leadRect, isClear);
    expect(result).toEqual(farClear);
    const box = { left: result!.x, top: result!.y, right: result!.x + CAT_W, bottom: result!.y + CAT_H };
    const gap = Math.max(
      Math.max(box.left - leadRect.right, leadRect.left - box.right),
      Math.max(box.top - leadRect.bottom, leadRect.top - box.bottom),
    );
    expect(gap).toBeGreaterThanOrEqual(TOGGLE_CLEARANCE);
  });

  it("falls back to the content-clear candidate with the best gap when none reach the full clearance — distance is always available, overlap never is", () => {
    const leadRect = leadControlRect({ x: 500, y: 500 });
    // Every candidate is content-clear but short of TOGGLE_CLEARANCE; the
    // one with the largest real gap should win rather than the first or a
    // null "give up".
    const worse: Point = { x: leadRect.left - CAT_W - 10, y: 500 };
    const better: Point = { x: leadRect.left - CAT_W - 18, y: 500 };
    const result = searchClearOfToggle([worse, better], leadRect, () => true);
    expect(result).toEqual(better);
  });

  it("returns null only when nothing in the pool is content-clear at all", () => {
    const leadRect = leadControlRect({ x: 500, y: 500 });
    const candidates: Point[] = [
      { x: 0, y: 0 },
      { x: 900, y: 900 },
    ];
    expect(searchClearOfToggle(candidates, leadRect, () => false)).toBeNull();
  });
});

/**
 * `boundsFor` is the box every position is clamped into, made pure so the
 * explorer picker samples exactly that box rather than re-deriving it.
 */
describe("boundsFor", () => {
  it("insets the viewport by the edge margin and the chrome above it", () => {
    expect(boundsFor({ width: 1440, height: 900 }, 64)).toEqual({
      minX: 8,
      maxX: 1440 - CAT_W - 8,
      minY: 64 + 8,
      maxY: 900 - CAT_H - 8,
    });
  });

  it("is the box clampToViewport clamps into", () => {
    // jsdom: no chrome measured, and a 1024×768 window (`viewport()` falls
    // back to innerWidth/innerHeight — see that function's own note).
    const box = boundsFor({ width: 1024, height: 768 }, 0);
    expect(clampToViewport({ x: -500, y: -500 })).toEqual({ x: box.minX, y: box.minY });
    expect(clampToViewport({ x: 5000, y: 5000 })).toEqual({ x: box.maxX, y: box.maxY });
  });

  it("never inverts on a window too small for a cat", () => {
    const box = boundsFor({ width: 20, height: 20 }, 0);
    expect(box.maxX).toBeGreaterThanOrEqual(box.minX);
    expect(box.maxY).toBeGreaterThanOrEqual(box.minY);
  });
});

describe("exploreApart", () => {
  it("needs both the gap and a column of its own", () => {
    // Far apart, different columns.
    expect(exploreApart({ x: 100, y: 100 }, { x: 900, y: 100 })).toBe(true);
    // Different columns, but closer than the gap.
    expect(exploreApart({ x: 100, y: 100 }, { x: 200, y: 100 })).toBe(false);
    // Far apart, but one above the other in the same column.
    expect(exploreApart({ x: 100, y: 100 }, { x: 110, y: 600 })).toBe(false);
  });

  it("puts the gap's boundary at exactly EXPLORE_MIN_GAP", () => {
    expect(exploreApart({ x: 0, y: 0 }, { x: EXPLORE_MIN_GAP, y: 0 })).toBe(true);
    expect(exploreApart({ x: 0, y: 0 }, { x: EXPLORE_MIN_GAP - 1, y: 0 })).toBe(false);
  });

  it("measures columns by left edge", () => {
    // 59 and 60 straddle a column boundary; 60 and 119 share one.
    expect(exploreApart({ x: 59, y: 0 }, { x: 60, y: EXPLORE_MIN_GAP })).toBe(true);
    expect(exploreApart({ x: 60, y: 0 }, { x: 119, y: EXPLORE_MIN_GAP })).toBe(false);
  });
});

/**
 * Explorer spots (companion-explorers, task 3): one cat per half of the
 * viewport, anywhere the probe says is clear. The picker is pure — the probe,
 * the viewport, the header height and the rng are all arguments — so every
 * rule is stated here without a DOM, and each loop below runs over a seeded
 * rng so a failure names the seed that broke it.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("pickExploreSpot", () => {
  const VIEW = { width: 1440, height: 900 };
  const TOP = 64;
  const open = () => true;
  const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);

  it("pins its published numbers", () => {
    expect([EXPLORE_TRIES, EXPLORE_MIN_GAP, EXPLORE_COLUMN]).toEqual([12, 160, 60]);
  });

  it("never returns a spot the probe rejects", () => {
    const probe = (p: Point) => p.x >= 600;
    let found = 0;
    for (const seed of SEEDS) {
      const spot = pickExploreSpot("left", null, VIEW, TOP, probe, mulberry32(seed));
      if (spot) {
        found += 1;
        expect(spot.x, `seed ${seed}`).toBeGreaterThanOrEqual(600);
      }
    }
    // Guard: the left half runs to ~695, so some seeds land in [600, 695) and
    // the rest cross; a loop that never saw a spot would assert nothing.
    expect(found).toBeGreaterThan(0);
  });

  it("puts the two cats in different halves, at least 160px apart, never in one column", () => {
    for (const seed of SEEDS) {
      const rng = mulberry32(seed);
      const lead = pickExploreSpot("left", null, VIEW, TOP, open, rng);
      expect(lead, `seed ${seed}`).not.toBeNull();
      const follow = pickExploreSpot("right", lead, VIEW, TOP, open, rng);
      expect(follow, `seed ${seed}`).not.toBeNull();
      expect(lead!.x + CAT_W / 2, `seed ${seed}`).toBeLessThan(VIEW.width / 2);
      expect(follow!.x + CAT_W / 2, `seed ${seed}`).toBeGreaterThanOrEqual(VIEW.width / 2);
      expect(Math.hypot(lead!.x - follow!.x, lead!.y - follow!.y), `seed ${seed}`).toBeGreaterThanOrEqual(
        EXPLORE_MIN_GAP,
      );
      expect(Math.floor(lead!.x / EXPLORE_COLUMN), `seed ${seed}`).not.toBe(
        Math.floor(follow!.x / EXPLORE_COLUMN),
      );
    }
  });

  it("crosses to the other half when its own half is full", () => {
    const probe = (p: Point) => p.x + CAT_W / 2 >= VIEW.width / 2;
    for (const seed of SEEDS) {
      const spot = pickExploreSpot("left", null, VIEW, TOP, probe, mulberry32(seed));
      expect(spot, `seed ${seed}`).not.toBeNull();
      expect(spot!.x + CAT_W / 2, `seed ${seed}`).toBeGreaterThanOrEqual(VIEW.width / 2);
    }
  });

  it("gives up with null when nothing is clear", () => {
    for (const seed of SEEDS) {
      expect(pickExploreSpot("left", null, VIEW, TOP, () => false, mulberry32(seed))).toBeNull();
      expect(pickExploreSpot("right", null, VIEW, TOP, () => false, mulberry32(seed))).toBeNull();
    }
  });

  it("probes at most EXPLORE_TRIES points per half", () => {
    const probe = vi.fn(() => false);
    pickExploreSpot("left", null, VIEW, TOP, probe, mulberry32(7));
    expect(probe).toHaveBeenCalledTimes(EXPLORE_TRIES * 2);
  });

  it("stays inside the viewport and below the header", () => {
    let checked = 0;
    for (const seed of SEEDS) {
      for (const half of ["left", "right"] as const) {
        const spot = pickExploreSpot(half, null, VIEW, TOP, open, mulberry32(seed));
        expect(spot, `seed ${seed}`).not.toBeNull();
        checked += 1;
        expect(spot!.x).toBeGreaterThanOrEqual(8);
        expect(spot!.x).toBeLessThanOrEqual(VIEW.width - 8 - CAT_W);
        expect(spot!.y).toBeGreaterThanOrEqual(TOP + 8);
        expect(spot!.y).toBeLessThanOrEqual(VIEW.height - 8 - CAT_H);
      }
    }
    expect(checked).toBe(SEEDS.length * 2);
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

/**
 * The round-18 final fix wave. Measured at 1440×900 on the four-section hero:
 * the only whitespace beside the hero's content is the right-hand gutter, so
 * the pair settle in one 50px column, the follower one stride (76px) below the
 * lead. "Above the follower" is then the gap the lead stands over, and
 * `e2e/companion.spec.ts`'s occupied-ground test caught a cat inside a bubble
 * or caption box five runs in five. These pin the placement rule that fixes
 * it, on that geometry.
 */
describe("placeBeside — overlays are never painted over a cat", () => {
  const FRAME = { viewportWidth: 1440, viewportHeight: 900, safeTop: 64 };
  const BUBBLE = { width: 143, height: 25 };
  const CAPTION = { width: 214, height: 25 };
  const lead: Point = { x: 1381, y: 540 };
  const follower: Point = { x: 1381, y: 616 };
  const cats = [boxAt(lead, CAT_W, CAT_H), boxAt(follower, CAT_W, CAT_H)];
  const hits = (a: RectLike, b: RectLike) =>
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

  it("keeps the old answer — above the cat, clamped in from the edge — when nothing is in the way", () => {
    expect(placeBeside(follower, CAT_W, CAT_H, BUBBLE, FRAME)).toEqual({
      x: 1440 - BUBBLE.width - 8,
      y: follower.y - BUBBLE.height - 6,
    });
  });

  it("keeps the old fallback — below the cat — when above would sit under the header", () => {
    const high: Point = { x: 400, y: 70 };
    expect(placeBeside(high, CAT_W, CAT_H, BUBBLE, FRAME)).toEqual({ x: 400, y: high.y + CAT_H + 6 });
  });

  it("moves the follower's bubble off the lead standing over it", () => {
    // At rest the old answer clears the lead by 3px; the lead walks in along
    // its own row, though, and a lead five pixels lower is inside it.
    const lower = [boxAt({ x: 1381, y: 545 }, CAT_W, CAT_H), cats[1]];
    const stale = placeBeside(follower, CAT_W, CAT_H, BUBBLE, FRAME);
    expect(hits(boxAt(stale, BUBBLE.width, BUBBLE.height), lower[0]), "the case this fixes").toBe(true);
    const moved = placeBeside(follower, CAT_W, CAT_H, BUBBLE, FRAME, lower);
    for (const cat of lower) expect(hits(boxAt(moved, BUBBLE.width, BUBBLE.height), cat)).toBe(false);
  });

  it("keeps mini-Thien's caption off both cats and off the bubble", () => {
    // He stands beside the speaking follower on the side away from the lead —
    // here, both share a column, so to its left — and his caption is wider
    // than the gap, so the edge clamp drags it back across the column.
    const thien: Point = { x: 1313, y: 612 };
    const bubble = boxAt(placeBeside(follower, CAT_W, CAT_H, BUBBLE, FRAME, cats), BUBBLE.width, BUBBLE.height);
    const keepOut = [...cats, bubble, boxAt(thien, 30, 54)];
    const stale = placeBeside(thien, 30, 54, CAPTION, FRAME);
    expect(
      [...cats, bubble].some((box) => hits(boxAt(stale, CAPTION.width, CAPTION.height), box)),
      "the case this fixes",
    ).toBe(true);
    const at = placeBeside(thien, 30, 54, CAPTION, FRAME, keepOut);
    for (const box of keepOut) expect(hits(boxAt(at, CAPTION.width, CAPTION.height), box)).toBe(false);
  });

  it("stays on screen, and falls back to the old answer when no side is clear", () => {
    const everywhere = [{ left: 0, top: 0, right: 1440, bottom: 900 }];
    expect(placeBeside(follower, CAT_W, CAT_H, BUBBLE, FRAME, everywhere)).toEqual(
      placeBeside(follower, CAT_W, CAT_H, BUBBLE, FRAME),
    );
    const low: Point = { x: 600, y: 900 - CAT_H - 8 };
    const at = placeBeside(low, CAT_W, CAT_H, BUBBLE, FRAME, [boxAt({ x: 600, y: low.y - 30 }, CAT_W, CAT_H)]);
    expect(at.y + BUBBLE.height).toBeLessThanOrEqual(900 - 8);
    expect(at.y).toBeGreaterThanOrEqual(64 + 8);
  });
});
