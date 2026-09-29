import { describe, expect, it } from "vitest";
import {
  advance,
  FOLLOW_ACCEL,
  FOLLOW_BRAKE,
  FOLLOW_MAX,
  followTarget,
  frameStep,
  initRide,
  MAX_FRAME_STEP,
  ramp,
  RIDE_SETTLE_MS,
  rideStep,
  trailBehind,
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

/**
 * The speed constants on this layer are quoted per *reference frame* — one
 * 60 Hz tick — and the loop that spends them runs at whatever rate the display
 * asks for. `frameStep` is the conversion, and these pin the two ends of it
 * that actually bite: a 120 Hz monitor must not walk the cats twice as fast,
 * and a tab returning from the background must not teleport them.
 */
describe("frameStep", () => {
  it("is exactly one at 60 Hz — the rate every constant on this layer is quoted in", () => {
    expect(frameStep(1000 / 60)).toBeCloseTo(1, 9);
  });

  it("halves at 120 Hz and doubles at 30 Hz", () => {
    expect(frameStep(1000 / 120)).toBeCloseTo(0.5, 9);
    expect(frameStep(1000 / 30)).toBeCloseTo(2, 9);
  });

  it("clamps a long gap, so a tab returning from the background does not teleport them", () => {
    expect(frameStep(10_000)).toBe(MAX_FRAME_STEP);
    expect(frameStep(1000 / 20)).toBeCloseTo(MAX_FRAME_STEP, 9);
  });

  it("is zero for a gap of zero or less, rather than negative", () => {
    expect(frameStep(0)).toBe(0);
    expect(frameStep(-5)).toBe(0);
  });
});

/**
 * Round 17: the same class of defect the globe next door had. Every constant
 * here is px per reference frame, and `advance` used to spend one of them per
 * *callback* — so the cats crossed the page in half the time on a 120 Hz
 * display and double on a 30 Hz one. These pin the property that fixes it:
 * equal wall-clock time buys equal distance, whatever the display is doing.
 *
 * The subtlety is that `advance` is two rules in one. The `maxSpeed` cap is a
 * linear rate and scales by multiplication; the `dist * 0.14` arrival ease is
 * a gap-closer and has to *compound*, because closing 14% twice is 26%, not
 * 28%. Getting that wrong overshoots at low frame rates, which is exactly
 * where an arrival ease is supposed to be gentlest.
 */
describe("advance across refresh rates", () => {
  it("covers the same ground per unit time at 30, 60 and 120 Hz while the speed cap is what binds", () => {
    const far = { x: 100_000, y: 0 };
    const travel = (frames: number, ticks: number) => {
      const pos = { x: 0, y: 0 };
      for (let i = 0; i < ticks; i += 1) advance(pos, far, 4.4, frames);
      return pos.x;
    };
    // One second of wall clock, three different displays.
    expect(travel(0.5, 120)).toBeCloseTo(travel(1, 60), 6);
    expect(travel(2, 30)).toBeCloseTo(travel(1, 60), 6);
  });

  it("compounds the arrival ease rather than multiplying it — one long frame equals two short ones", () => {
    // Close enough in that the ease is the binding term, not the cap.
    const near = { x: 10, y: 0 };
    const once = { x: 0, y: 0 };
    advance(once, near, 1000, 2);

    const twice = { x: 0, y: 0 };
    advance(twice, near, 1000, 1);
    advance(twice, near, 1000, 1);

    expect(once.x).toBeCloseTo(twice.x, 9);
    // And the naive form — 0.14 * 2 = 28% — would have gone further.
    expect(once.x).toBeLessThan(10 * 0.28);
  });

  it("still never exceeds the speed its frames are worth, however far the target jumped", () => {
    for (const frames of [0.25, 0.5, 1, 2, MAX_FRAME_STEP]) {
      const pos = { x: 0, y: 0 };
      const step = advance(pos, { x: 500_000, y: 0 }, 4.4, frames);
      expect(step).toBeCloseTo(4.4 * frames, 6);
    }
  });

  it("never overshoots the target, even on the longest frame it will ever be handed", () => {
    const pos = { x: 0, y: 0 };
    advance(pos, { x: 3, y: 0 }, 1000, MAX_FRAME_STEP);
    expect(pos.x).toBeLessThanOrEqual(3);
  });

  it("does nothing on a frame worth no time at all", () => {
    const pos = { x: 0, y: 0 };
    expect(advance(pos, { x: 500, y: 500 }, 4.4, 0)).toBe(0);
    expect(pos).toEqual({ x: 0, y: 0 });
  });

  it("defaults to one reference frame, so every existing caller reads the same", () => {
    const withDefault = { x: 0, y: 0 };
    const explicit = { x: 0, y: 0 };
    advance(withDefault, { x: 900, y: 0 }, 4.4);
    advance(explicit, { x: 900, y: 0 }, 4.4, 1);
    expect(withDefault).toEqual(explicit);
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

  it("spends acceleration per unit time, not per callback", () => {
    // A limiter quoted in px/frame/frame has the same defect `advance` had:
    // on a 120 Hz display she would reach top speed in half the wall-clock
    // time, which is the difference between a cat gathering herself and a cat
    // snapping to a sprint.
    expect(ramp(0, 1000, 2)).toBeCloseTo(FOLLOW_ACCEL * 2, 6);
    expect(ramp(0, 1000, 0.5)).toBeCloseTo(FOLLOW_ACCEL * 0.5, 6);
    expect(ramp(FOLLOW_MAX, 0, 2)).toBeCloseTo(FOLLOW_MAX - FOLLOW_BRAKE * 2, 6);
  });

  it("still never overshoots, however long the frame", () => {
    expect(ramp(0, FOLLOW_MAX, MAX_FRAME_STEP)).toBeLessThanOrEqual(FOLLOW_MAX);
    expect(ramp(FOLLOW_MAX, 0, MAX_FRAME_STEP)).toBeGreaterThanOrEqual(0);
  });

  it("defaults to one reference frame, so every existing caller reads the same", () => {
    expect(ramp(0, 1000, 1)).toBe(ramp(0, 1000));
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

/**
 * WP-R round 15's second follow-up ("the follower trails the lead on long
 * walks"): a long walk toward a fixed point used to send both cats
 * independently toward two *separately computed* targets, and two animals
 * each closing on their own point at their own capped speed can cross paths
 * on the way however clear the two endpoints are — axe caught the follower
 * transiting through the lead's own toggle clearance for seconds at a time,
 * gap measured as low as -36px. `trailBehind` is the structural fix: for as
 * long as the lead is still walking, the follower's target is *his live
 * position*, not a fixed point of her own — so there is no second path left
 * to cross. This is not new geometry (it is the exact offset the philosophy
 * mood's lap and the ordinary pointer-chase already used), only a shared,
 * pure home for it so a third long walk can reuse it rather than invent a
 * fourth copy.
 */
describe("trailBehind", () => {
  it("offsets by exactly width + gap along x, opposite the lead's facing", () => {
    const lead = { x: 500, y: 500 };
    const right = trailBehind(lead, 1, 50, 26);
    expect(right.x).toBe(lead.x - 76);
    const left = trailBehind(lead, -1, 50, 26);
    expect(left.x).toBe(lead.x + 76);
  });

  it("offsets by the given dy, defaulting to the small downward nudge every existing caller used", () => {
    const lead = { x: 0, y: 0 };
    expect(trailBehind(lead, 1, 50, 26).y).toBe(3);
    expect(trailBehind(lead, 1, 50, 26, 12).y).toBe(12);
  });

  it("never lands on the lead itself — trailing always keeps real separation", () => {
    for (const facing of [1, -1] as const) {
      const lead = { x: 300, y: 300 };
      const follow = trailBehind(lead, facing, 50, 26);
      expect(Math.hypot(follow.x - lead.x, follow.y - lead.y)).toBeGreaterThan(0);
    }
  });

  it("translates with the lead — the offset itself does not depend on where he is", () => {
    const a = trailBehind({ x: 100, y: 100 }, 1, 50, 26);
    const b = trailBehind({ x: 9100, y: -400 }, 1, 50, 26);
    expect(b.x - a.x).toBe(9000);
    expect(b.y - a.y).toBe(-500);
  });

  /**
   * The clearance property `FOLLOW_LONG_WALK_GAP` (Companion.tsx) exists to
   * guarantee: a long-walk trail has to clear the WCAG 2.5.8 minimum on its
   * own, every frame, not merely once she arrives — a visitor who has
   * stopped touching the page could be looking at any one of them. Pinned
   * here against the exact padded box `leadControlRect` (Companion.tsx)
   * draws around the lead's own live button, so a future change to either
   * the gap or the padding fails this before it ever reaches a browser.
   */
  it("a wide-enough gap clears the WCAG 2.5.8 minimum from the lead's own padded control box, every frame — not just at rest", () => {
    const CAT_W = 50;
    const CAT_H = 42;
    const LEAD_PAD_X = 4;
    const LEAD_PAD_Y = 3;
    const WCAG_MIN = 24;
    const FOLLOW_LONG_WALK_GAP = 34; // must match Companion.tsx's own constant
    const lead = { x: 500, y: 500 };
    const rect = {
      left: lead.x - LEAD_PAD_X,
      top: lead.y - LEAD_PAD_Y,
      right: lead.x - LEAD_PAD_X + CAT_W + LEAD_PAD_X * 2,
      bottom: lead.y - LEAD_PAD_Y + CAT_H + LEAD_PAD_Y * 2,
    };
    for (const facing of [1, -1] as const) {
      const follow = trailBehind(lead, facing, CAT_W, FOLLOW_LONG_WALK_GAP);
      const box = { left: follow.x, top: follow.y, right: follow.x + CAT_W, bottom: follow.y + CAT_H };
      const dxOut = Math.max(box.left - rect.right, rect.left - box.right);
      const dyOut = Math.max(box.top - rect.bottom, rect.top - box.bottom);
      expect(Math.max(dxOut, dyOut)).toBeGreaterThanOrEqual(WCAG_MIN);
    }
  });

  it("the ordinary FOLLOW_GAP, by contrast, does not clear the minimum — trailing at chase distance is motion, not rest, and is not held to this bar", () => {
    const CAT_W = 50;
    const CAT_H = 42;
    const LEAD_PAD_X = 4;
    const LEAD_PAD_Y = 3;
    const FOLLOW_GAP = 26; // Companion.tsx's own ordinary chase/lap distance
    const lead = { x: 500, y: 500 };
    const rect = {
      left: lead.x - LEAD_PAD_X,
      top: lead.y - LEAD_PAD_Y,
      right: lead.x - LEAD_PAD_X + CAT_W + LEAD_PAD_X * 2,
      bottom: lead.y - LEAD_PAD_Y + CAT_H + LEAD_PAD_Y * 2,
    };
    const follow = trailBehind(lead, 1, CAT_W, FOLLOW_GAP);
    const box = { left: follow.x, top: follow.y, right: follow.x + CAT_W, bottom: follow.y + CAT_H };
    const dxOut = Math.max(box.left - rect.right, rect.left - box.right);
    // Documents the deliberate gap this file's own note explains: ordinary
    // trailing is watched motion, and this test would break the day someone
    // "simplifies" the two gaps back down to one without reading why they
    // are not the same number.
    expect(dxOut).toBeLessThan(24);
  });
});
