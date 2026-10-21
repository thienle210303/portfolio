import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CAT_H, CAT_W } from "@/components/companion/CompanionCat";
import {
  CORNER_INSET,
  PEEK,
  pickCorner,
  boundsFor,
  clampToViewport,
  clearsControls,
  EXPLORE_COLUMN,
  EXPLORE_MIN_GAP,
  EXPLORE_TRIES,
  exploreApart,
  findClearSpot,
  headClear,
  invalidateGround,
  invalidateViewport,
  isClearSpot,
  keepClearOfControl,
  pickExploreSpot,
  placeBeside,
  pointInRects,
  randomFacing,
  refreshGround,
  refreshSafeArea,
  searchClearOfToggle,
  setControlRects,
  setReservedRects,
  shiftGround,
  syncGround,
  syncTone,
  followerMuted,
  TOGGLE_CLEARANCE,
  viewport,
  boxAt,
  type Point,
  type RectLike,
} from "@/components/companion/companion-space";

/**
 * The collision fix (WP-A, round 10): a cat parking on top of the duet's own
 * speech bubble or mini-Thien's caption was possible because neither is
 * visible to the ordinary content probe — it deliberately looks
 * straight through everything inside `[data-companion]`, or two cats
 * standing near each other would each read the other as occupied ground.
 * `setReservedRects` is the second, narrower gate `isClearSpot` now also
 * consults, and this is what proves it actually gates the same three points
 * (belly, both feet) the ordinary DOM scan does.
 *
 * The page starts every test empty (see the file-level `beforeEach`), which
 * isolates the reserved-rect gate from the DOM occupancy scan. Tests that need
 * content put `<p>`s with stubbed boxes on the page through `ground()` —
 * jsdom has no layout, so every real box is zero-area and ignored.
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

/** Start a new ground epoch with a `<p>` at each of these boxes. */
function ground(...boxes: DOMRect[]): void {
  document.body.innerHTML = "";
  for (const box of boxes) {
    const prose = document.createElement("p");
    prose.getBoundingClientRect = () => box;
    document.body.append(prose);
  }
  invalidateGround();
}

beforeEach(() => {
  ground();
  invalidateViewport();
});

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
 * The ground probe deliberately looks straight through the companion's own
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
/**
 * The head band (final fix wave, item 1). `isClearSpot` reads the belly at 60%
 * of the drawing's height and both feet, so a spot whose ears and face are on
 * a line of prose passes it — measured in the final review at 4 of 30 explorer
 * stops. `headClear` reads six more points, rows at y+6 and y+16, each at 12px
 * in from both sides and at the centre, by the same rule. What is pinned here
 * is exactly that: each of the six alone is enough to refuse, nothing below the
 * band is its business, and it is the band `isClearSpot` never sees.
 */
describe("headClear", () => {
  const at: Point = { x: 100, y: 100 };
  const HEAD_POINTS: Array<[number, number]> = [6, 16].flatMap((dy) =>
    [12, CAT_W / 2, CAT_W - 12].map((dx) => [at.x + dx, at.y + dy] as [number, number]),
  );

  /** Prose under exactly the one point (x, y), and nowhere else. */
  const proseAt = (px: number, py: number) => ground(rect(px - 0.4, py - 0.4, 0.8, 0.8));

  beforeEach(() => {
    setReservedRects([]);
  });

  it("passes a spot with nothing under any of the six points", () => {
    expect(headClear(at)).toBe(true);
  });

  it("refuses a spot when any one of the six points is on content", () => {
    for (const [x, y] of HEAD_POINTS) {
      proseAt(x, y);
      expect(headClear(at), `content at ${x},${y}`).toBe(false);
    }
  });

  it("is the band isClearSpot never reads: a head on prose passes the three-point probe", () => {
    // A line of prose across the face row, and nothing lower down.
    ground(rect(0, at.y + 12, 1024, 8));
    expect(isClearSpot(at)).toBe(true);
    expect(headClear(at)).toBe(false);
  });

  it("is not about the feet or the belly: content below the band leaves it clear", () => {
    ground(rect(0, at.y + 22, 1024, 1000));
    expect(headClear(at)).toBe(true);
    expect(isClearSpot(at)).toBe(false);
  });

  it("reads a whitespace container as clear, like the other probe does", () => {
    const container = document.createElement("div");
    container.getBoundingClientRect = () => rect(0, 0, 1024, 768);
    document.body.append(container);
    invalidateGround();
    expect(headClear(at)).toBe(true);
  });

  it("refuses a head under one of the companion's own bubbles", () => {
    // Covers the left-hand ear point only.
    setReservedRects([rect(at.x + 10, at.y + 4, 4, 4)]);
    expect(headClear(at)).toBe(false);
  });
});

describe("setControlRects / clearsControls — the toolkit-toggle fix", () => {
  beforeEach(() => {
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
    invalidateViewport();
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
      invalidateViewport();
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

describe("findClearSpot's preferHead option", () => {
  beforeEach(() => {
    setReservedRects([]);
    setControlRects([]);
  });

  it("moves off a spot whose feet are clear but whose head is on a line, when a head-clear spot is near", () => {
    // A line of prose across the head band of a cat standing at `want`, the
    // full width of the page; nothing else anywhere. Feet and belly sit below
    // it, so the old three-point rule would have kept `want`.
    const want: Point = { x: 300, y: 300 };
    ground(rect(0, want.y + 4, 1024, 14));
    expect(isClearSpot(want)).toBe(true);
    expect(headClear(want)).toBe(false);
    const got = findClearSpot(want, { x: 900, y: 700 }, undefined, { preferHead: true });
    expect(got).not.toEqual(want);
    expect(isClearSpot(got)).toBe(true);
    expect(headClear(got)).toBe(true);
  });

  it("still keeps the feet-clear spot when no head-clear ground exists anywhere near", () => {
    // Every head band on the page is on prose (a line every 20px through the
    // top half of each cat-height) but the feet clear: the old answer stands.
    const want: Point = { x: 300, y: 300 };
    const period = CAT_H + 26;
    const lines: DOMRect[] = [];
    for (let top = want.y - period * 20; top < 1000; top += period) lines.push(rect(0, top, 1024, 19.9));
    ground(...lines);
    expect(isClearSpot(want)).toBe(true);
    expect(findClearSpot(want, { x: 900, y: 700 }, undefined, { preferHead: true })).toEqual(want);
  });

  it("leaves the preference off unless asked — the per-frame callers' default", () => {
    const want: Point = { x: 300, y: 300 };
    ground(rect(0, want.y + 4, 1024, 14));
    expect(headClear(want)).toBe(false);
    expect(findClearSpot(want, { x: 900, y: 700 })).toEqual(want);
  });
});

describe("pointInRects", () => {
  const rects = [rect(10, 10, 20, 20)];

  it("is true inside a rect", () => {
    expect(pointInRects(15, 15, rects)).toBe(true);
  });

  it("is true on the edge — edges are inclusive", () => {
    expect(pointInRects(10, 30, rects)).toBe(true);
    expect(pointInRects(30, 10, rects)).toBe(true);
  });

  it("is false outside every rect", () => {
    expect(pointInRects(31, 15, rects)).toBe(false);
  });

  it("is false for an empty list", () => {
    expect(pointInRects(15, 15, [])).toBe(false);
  });
});

describe("the ground probe reads rects cached per layout epoch", () => {
  const at: Point = { x: 100, y: 100 };

  beforeEach(() => {
    document.body.innerHTML = "";
    invalidateGround();
    setReservedRects([]);
    vi.restoreAllMocks();
  });

  it("queries the DOM once per epoch", () => {
    const query = vi.spyOn(document, "querySelectorAll");
    for (let i = 0; i < 50; i += 1) isClearSpot(at);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("invalidates on resize-observer epoch", () => {
    expect(isClearSpot(at)).toBe(true);
    const prose = document.createElement("p");
    prose.getBoundingClientRect = () => rect(0, 0, 400, 400);
    document.body.append(prose);
    // Same epoch: the cached list predates the paragraph.
    expect(isClearSpot(at)).toBe(true);
    invalidateGround();
    expect(isClearSpot(at)).toBe(false);
  });

  it("shiftGround translates cached rects", () => {
    const prose = document.createElement("p");
    prose.getBoundingClientRect = () => rect(0, 200, 400, 200);
    document.body.append(prose);
    invalidateGround();
    const query = vi.spyOn(document, "querySelectorAll");
    expect(isClearSpot(at)).toBe(true);
    // The page scrolled 100px down, so the paragraph is now 100px higher.
    shiftGround(0, 100);
    expect(isClearSpot(at)).toBe(false);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("shiftGround does nothing when there is no cache", () => {
    const prose = document.createElement("p");
    prose.getBoundingClientRect = () => rect(0, 200, 400, 200);
    document.body.append(prose);
    invalidateGround();
    shiftGround(0, 100);
    // Built fresh after the shift, from the layout as it now stands.
    expect(isClearSpot(at)).toBe(true);
  });

  it("caches a box just below the window, so a shift can scroll it into view", () => {
    const prose = document.createElement("p");
    prose.getBoundingClientRect = () => rect(0, window.innerHeight + 100, 400, 200);
    document.body.append(prose);
    invalidateGround();
    expect(isClearSpot(at)).toBe(true);
    shiftGround(0, window.innerHeight);
    expect(isClearSpot(at)).toBe(false);
  });

  it("syncGround: a rebuild at the live offset is not shifted again", () => {
    const prose = document.createElement("p");
    prose.getBoundingClientRect = () => rect(0, 200, 400, 200);
    document.body.append(prose);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 100 });
    try {
      invalidateGround();
      expect(isClearSpot(at)).toBe(true); // built at offset 100
      syncGround(0, 100);
      expect(isClearSpot(at)).toBe(true); // no shift: already measured there
    } finally {
      Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    }
  });

  it("syncGround at the recorded offset leaves the cache untouched", () => {
    const prose = document.createElement("p");
    prose.getBoundingClientRect = () => rect(0, 200, 400, 200);
    document.body.append(prose);
    invalidateGround();
    expect(isClearSpot(at)).toBe(true);
    // The cache array is private, so "same reference" is observed as "not re-mapped".
    const map = vi.spyOn(Array.prototype, "map");
    syncGround(0, 0);
    expect(map).not.toHaveBeenCalled();
    map.mockRestore();
  });

  it("syncGround: several syncs net to the total movement", () => {
    const prose = document.createElement("p");
    prose.getBoundingClientRect = () => rect(0, 200, 400, 200);
    document.body.append(prose);
    invalidateGround();
    expect(isClearSpot(at)).toBe(true);
    syncGround(0, 30);
    syncGround(0, 30);
    syncGround(0, 100);
    expect(isClearSpot(at)).toBe(false); // moved 100 up, once
    syncGround(0, 0);
    expect(isClearSpot(at)).toBe(true); // and back
  });

  it("scroll does not rebuild", () => {
    const query = vi.spyOn(document, "querySelectorAll");
    isClearSpot(at);
    for (let i = 0; i < 20; i += 1) {
      shiftGround(0, 40);
      isClearSpot(at);
    }
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("trailing recheck rebuilds", () => {
    const query = vi.spyOn(document, "querySelectorAll");
    isClearSpot(at);
    shiftGround(0, 40);
    // What `scheduleRecheck`'s timer does once the scroll has stopped.
    refreshGround();
    expect(query).toHaveBeenCalledTimes(2);
    isClearSpot(at);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("ignores companion's own nodes", () => {
    const root = document.createElement("div");
    root.setAttribute("data-companion", "");
    const button = document.createElement("button");
    button.getBoundingClientRect = () => rect(0, 0, 400, 400);
    root.append(button);
    document.body.append(root);
    invalidateGround();
    expect(isClearSpot(at)).toBe(true);
  });

  it("looks through what a hit test looks through: pointer-events none, or hidden", () => {
    for (const style of ["pointer-events: none", "visibility: hidden"]) {
      document.body.innerHTML = "";
      const ink = document.createElement("svg");
      ink.setAttribute("style", style);
      ink.getBoundingClientRect = () => rect(0, 0, 400, 400);
      document.body.append(ink);
      invalidateGround();
      expect(isClearSpot(at), style).toBe(true);
      ink.removeAttribute("style");
      invalidateGround();
      expect(isClearSpot(at), `${style} removed`).toBe(false);
    }
  });
});

describe("viewport cache", () => {
  it("returns the same object until invalidated or the safe area is refreshed", () => {
    vi.stubGlobal("window", { innerWidth: 1000, innerHeight: 700 });
    const root = { clientWidth: 1000, clientHeight: 700 };
    vi.stubGlobal("document", { documentElement: root, querySelector: () => null });
    invalidateViewport();
    const a = viewport();
    root.clientWidth = 800;
    expect(viewport()).toBe(a);
    invalidateViewport();
    expect(viewport()).toEqual({ width: 800, height: 700 });
    root.clientWidth = 600;
    refreshSafeArea();
    expect(viewport().width).toBe(600);
  });
  afterEach(() => vi.unstubAllGlobals());
});

describe("syncTone", () => {
  // jsdom has no layout, so the element under the point is stubbed. This is
  // what pins the full-inversion (FB-9.2) arm now that no <section> is
  // `contrast`: the footer strip is the last contrast surface.
  const over = (el: Element) => {
    document.elementsFromPoint = () => [el];
  };
  const cat = () => document.createElement("div");

  afterEach(() => {
    document.body.innerHTML = "";
    // @ts-expect-error jsdom does not define it; remove the stub
    delete document.elementsFromPoint;
  });

  it("applies tone-contrast over the footer strip", () => {
    document.body.innerHTML = '<footer class="tone-contrast"><p id="x">hi</p></footer>';
    over(document.getElementById("x")!);
    const node = cat();
    syncTone(node, { x: 1, y: 1 });
    expect(node.classList.contains("tone-contrast")).toBe(true);
    expect(node.classList.contains("tone-deep")).toBe(false);
  });

  it("applies tone-deep over a deep section and neither over a base one", () => {
    document.body.innerHTML =
      '<section class="tone-deep"><p id="d">d</p></section><section class="tone-base"><p id="b">b</p></section>';
    const node = cat();
    over(document.getElementById("d")!);
    syncTone(node, { x: 1, y: 1 });
    expect(node.classList.contains("tone-deep")).toBe(true);
    expect(node.classList.contains("tone-contrast")).toBe(false);
    over(document.getElementById("b")!);
    syncTone(node, { x: 1, y: 1 });
    expect(node.classList.contains("tone-deep")).toBe(false);
    expect(node.classList.contains("tone-contrast")).toBe(false);
  });

  it("stamps data-paper over a bg-surface card and clears it off one", () => {
    document.body.innerHTML =
      '<section class="tone-deep"><div class="bg-surface"><p id="c">c</p></div><p id="s">s</p></section>';
    const node = cat();
    over(document.getElementById("c")!);
    syncTone(node, { x: 1, y: 1 });
    expect(node.hasAttribute("data-paper")).toBe(true);
    expect(node.classList.contains("tone-deep")).toBe(true);
    over(document.getElementById("s")!);
    syncTone(node, { x: 1, y: 1 });
    expect(node.hasAttribute("data-paper")).toBe(false);
  });
});

describe("followerMuted", () => {
  const lead = { left: 100, right: 158, top: 100, bottom: 148 };
  const at = (left: number, top: number) => ({ left, right: left + 50, top, bottom: top + 42 });

  it("mutes only on a true overlap", () => {
    expect(followerMuted(lead, at(140, 110))).toBe(true);
    expect(followerMuted(lead, at(60, 120))).toBe(true);
  });

  it("leaves touching and separated boxes pressable, the 22px chase gap included", () => {
    expect(followerMuted(lead, at(158, 100))).toBe(false); // touching
    expect(followerMuted(lead, at(180, 100))).toBe(false); // 22px apart
    expect(followerMuted(lead, at(120, 148))).toBe(false); // touching below
    expect(followerMuted(lead, at(0, 0))).toBe(false);
  });
});

describe("pickCorner", () => {
  const view = { width: 390, height: 844 };
  const size = { width: 108, height: 48 };
  it("stays in the bottom-right corner when nothing is there", () => {
    expect(pickCorner(view, size, [])).toEqual({ side: "right", lift: 0 });
  });

  it("moves to the other corner, then up, off a control", () => {
    const tagRight = { left: 210, right: 370, top: 700, bottom: 840 };
    expect(pickCorner(view, size, [tagRight])).toEqual({ side: "left", lift: 0 });
    const row = { left: 0, right: 390, top: 760, bottom: 830 };
    const placed = pickCorner(view, size, [row]);
    expect(placed.lift).toBeGreaterThan(0);
    const bottom = view.height - CORNER_INSET - placed.lift;
    expect(bottom).toBeLessThanOrEqual(row.top);
  });

  it("peeks in from the right edge when every corner spot covers a control", () => {
    // Full-width rows with 40px gaps: a 48px pair fits in none of them.
    const rows = Array.from({ length: 12 }, (_, i) => ({ left: 16, right: 374, top: i * 88, bottom: i * 88 + 48 }));
    const placed = pickCorner(view, size, rows);
    // No spot is clear, and the peek covers least: a sliver of the rows'
    // right-hand padding, x 360..374, never what is written in them.
    expect(placed.peek).toBe(true);
    expect(view.width - PEEK).toBeGreaterThan(374 - 18);
  });

  it("never sits on the focused control", () => {
    const everything = { left: 0, right: 390, top: 0, bottom: 844 };
    const focused = { left: 300, right: 390, top: 700, bottom: 844 };
    const placed = pickCorner(view, size, [everything], focused);
    const bottom = view.height - CORNER_INSET - placed.lift;
    expect(bottom <= focused.top || placed.side === "left").toBe(true);
  });
});
