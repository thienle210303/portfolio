import { describe, expect, it } from "vitest";
import {
  advance,
  FOLLOW_ACCEL,
  FOLLOW_BRAKE,
  FOLLOW_MAX,
  followTarget,
  ramp,
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
