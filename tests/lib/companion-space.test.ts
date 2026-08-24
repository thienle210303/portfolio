import { beforeEach, describe, expect, it, vi } from "vitest";
import { CAT_W } from "@/components/companion/CompanionCat";
import {
  clearsControls,
  findClearSpot,
  isClearSpot,
  setControlRects,
  setReservedRects,
  type Point,
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
