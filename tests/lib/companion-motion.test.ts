import { describe, expect, it } from "vitest";
import {
  advance,
  FOLLOW_ACCEL,
  FOLLOW_BRAKE,
  FOLLOW_MAX,
  followTarget,
  initRide,
  ramp,
  RIDE_SETTLE_MS,
  rideStep,
} from "@/components/companion/companion-motion";

/**
 * WP-P round 14 ("scroll must not speed them up"): the cats are
 * `position: fixed` while almost every target they walk to is content
 * -anchored, so a fast scroll can move `want` hundreds — or thousands — of
 * pixels between two calls. These pin the one property that has to survive
 * that: a single call never moves an animal by more than its own speed
 * constant allows, however far the target jumped.
 */

describe("advance", () => {
  it("never exceeds maxSpeed in one call, no matter how far the target has jumped", () => {
    const pos = { x: 100, y: 100 };
    // Bigger than any real viewport — the shape of a violent scroll
    // teleporting a content-anchored target clean across the page.
    const step = advance(pos, { x: 100 + 20000, y: 100 }, 4.4);
    expect(step).toBeCloseTo(4.4, 5);
    expect(Math.hypot(pos.x - 100, pos.y - 100)).toBeCloseTo(4.4, 5);
  });

  it("caps the same way on a diagonal jump, not just an axis-aligned one", () => {
    const pos = { x: 0, y: 0 };
    const step = advance(pos, { x: 9000, y: -9000 }, 8.6);
    expect(step).toBeCloseTo(8.6, 5);
    expect(Math.hypot(pos.x, pos.y)).toBeCloseTo(8.6, 5);
  });

  it("eases into the last few pixels rather than overshooting the target", () => {
    const pos = { x: 0, y: 0 };
    const step = advance(pos, { x: 10, y: 0 }, 20);
    // 10 * 0.14 = 1.4, well under the 20px speed cap.
    expect(step).toBeCloseTo(1.4, 5);
    expect(pos.x).toBeLessThan(10);
  });

  it("settles rather than jittering once within a fraction of a pixel", () => {
    const pos = { x: 10, y: 10 };
    const step = advance(pos, { x: 10.2, y: 10 }, 5);
    expect(step).toBe(0);
    expect(pos).toEqual({ x: 10, y: 10 });
  });

  it("does nothing at zero or negative speed", () => {
    const pos = { x: 0, y: 0 };
    expect(advance(pos, { x: 500, y: 500 }, 0)).toBe(0);
    expect(advance(pos, { x: 500, y: 500 }, -3)).toBe(0);
    expect(pos).toEqual({ x: 0, y: 0 });
  });
});

describe("followTarget", () => {
  it("saturates at FOLLOW_MAX — a scroll-sized gap asks for no more speed than an ordinary far-off one", () => {
    const ordinary = followTarget(10_000, 0);
    const scrollJump = followTarget(200_000, 0);
    expect(scrollJump).toBeCloseTo(ordinary, 5);
    expect(scrollJump).toBeLessThanOrEqual(FOLLOW_MAX);
  });

  it("never exceeds FOLLOW_MAX at any distance", () => {
    for (const away of [0, 50, 199, 200, 201, 5000, 1_000_000]) {
      expect(followTarget(away, 0)).toBeLessThanOrEqual(FOLLOW_MAX + 1e-9);
    }
  });

  it("is zero at or inside the gap she is entitled to keep", () => {
    expect(followTarget(30, 30)).toBe(0);
    expect(followTarget(10, 30)).toBe(0);
  });
});

describe("ramp", () => {
  it("never overshoots the target it is easing toward", () => {
    expect(ramp(0, FOLLOW_MAX)).toBeLessThanOrEqual(FOLLOW_MAX);
    expect(ramp(FOLLOW_MAX, 0)).toBeGreaterThanOrEqual(0);
  });

  it("caps the per-call change to FOLLOW_ACCEL when speeding up", () => {
    const result = ramp(0, 1000);
    expect(result).toBeCloseTo(FOLLOW_ACCEL, 5);
  });

  it("caps the per-call change to FOLLOW_BRAKE when slowing down — braking is quicker than accelerating", () => {
    const result = ramp(FOLLOW_MAX, 0);
    expect(result).toBeCloseTo(FOLLOW_MAX - FOLLOW_BRAKE, 5);
    expect(FOLLOW_BRAKE).toBeGreaterThan(FOLLOW_ACCEL);
  });

  it("a target that jumps under a fast scroll still only moves her speed by one ramp step, not straight to top speed", () => {
    // She was standing still; the target then teleports far away (the
    // scroll case). `followTarget` saturates at FOLLOW_MAX for that jump,
    // but `ramp` still only lets her speed climb by FOLLOW_ACCEL this frame.
    const wish = followTarget(200_000, 0);
    expect(wish).toBe(FOLLOW_MAX);
    const speed = ramp(0, wish);
    expect(speed).toBeCloseTo(FOLLOW_ACCEL, 5);
    expect(speed).toBeLessThan(FOLLOW_MAX);
  });
});

/**
 * WP-R round 15 ("the cat is moving really forward and backward" on scroll):
 * round 14 capped the speed a cat *chases* a target at, but a settled cat
 * chases nothing — `want` and `pos` already agree, so `advance` correctly
 * does nothing while the fixed cat holds its viewport pixel and the whole
 * page slides past underneath it. `rideStep` is the other half: not a speed
 * cap, but the exact, uncapped correction that keeps a fixed element's
 * *content-relative* position constant across a real scroll, so there is
 * nothing left for `advance` to chase in the first place.
 */
describe("rideStep", () => {
  it("reports no delta and is not riding before the page has ever scrolled", () => {
    const tracker = initRide(0, 500);
    const frame = rideStep(tracker, 0, 500, 1000);
    expect(frame).toEqual({ dx: 0, dy: 0, riding: false });
  });

  it("reports the exact, uncapped offset a fixed element needs to hold its place over the content", () => {
    // Scrolling down by 800 (the page's own y growing) moves the content
    // *up* by 800 in the viewport — so a rider follows it up, not down.
    const tracker = initRide(0, 500);
    const frame = rideStep(tracker, 0, 500 + 800, 1000);
    expect(frame.dx).toBe(0);
    expect(frame.dy).toBe(-800);
    expect(frame.riding).toBe(true);
  });

  it("is not capped the way advance() is — a scroll-sized jump reports the whole distance in one call", () => {
    // The very case round 14 exists to cap for a *chase* is exactly the case
    // riding must not cap at all: the correction has to be exact or the cat
    // visibly drifts off the content it was meant to hold its place beside.
    const tracker = initRide(0, 0);
    const frame = rideStep(tracker, 0, 20_000, 1000);
    expect(frame.dy).toBe(-20_000);
  });

  it("keeps riding for a beat after the delta stops, then settles", () => {
    const tracker = initRide(0, 0);
    rideStep(tracker, 0, 300, 1000);
    // The scroll position has stopped changing, but not long enough ago.
    const stillRiding = rideStep(tracker, 0, 300, 1000 + RIDE_SETTLE_MS - 1);
    expect(stillRiding).toEqual({ dx: 0, dy: 0, riding: true });
    // Now it has been quiet for the full settle window.
    const settled = rideStep(tracker, 0, 300, 1000 + RIDE_SETTLE_MS + 1);
    expect(settled).toEqual({ dx: 0, dy: 0, riding: false });
  });

  it("a momentum scroll's own sparse, sub-pixel ticks still read as one continuous ride", () => {
    // Real momentum scrolling does not deliver a delta every frame — a tick
    // arrives, then a gap under the settle window, then another tick. None
    // of those gaps should read as "settled" on their own.
    const tracker = initRide(0, 0);
    let now = 0;
    let y = 0;
    for (let tick = 0; tick < 5; tick += 1) {
      y += 40;
      const frame = rideStep(tracker, 0, y, now);
      expect(frame.riding).toBe(true);
      now += RIDE_SETTLE_MS - 40; // a gap, but inside the settle window
    }
  });

  it("moves the axis the page actually scrolled, and only that axis", () => {
    const tracker = initRide(100, 100);
    const frame = rideStep(tracker, 260, 100, 1000);
    expect(frame.dx).toBe(-160);
    expect(frame.dy).toBe(0);
  });
});
