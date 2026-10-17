import { describe, expect, it } from "vitest";
import { settleMotion, type Motion } from "@/sections/Worlds/settle";

const ARRIVAL = { spin: -1.2, tilt: -0.3 };

function still(overrides: Partial<Motion> = {}): Motion {
  return {
    spin: 0.4,
    tilt: -0.2,
    vSpin: 0,
    vTilt: 0,
    target: null,
    playing: false,
    flight: 0,
    landed: false,
    robot: -1,
    walking: false,
    ...overrides,
  };
}

describe("settleMotion: everything moving goes to where it was going", () => {
  it("lands a flight in the air on the arrival pin, robot already still and lit, and says it landed", () => {
    const m = still({ playing: true, flight: 0.4, spin: 0.1, tilt: 0.05 });
    expect(settleMotion(m, ARRIVAL)).toBe(true);
    expect(m).toMatchObject({
      playing: false,
      flight: 1,
      landed: true,
      robot: 1,
      walking: false,
      spin: ARRIVAL.spin,
      tilt: ARRIVAL.tilt,
      target: null,
    });
  });

  it("ends a robot mid-walk at its lit end, and stops the walk", () => {
    const m = still({ robot: 0.3, walking: true });
    expect(settleMotion(m, ARRIVAL)).toBe(false);
    expect(m.robot).toBe(1);
    expect(m.walking).toBe(false);
  });

  it("finishes a camera still easing, without claiming a landing", () => {
    const m = still({ landed: true, flight: 1, target: { spin: 2, tilt: 0.1 }, vSpin: 0.2 });
    expect(settleMotion(m, ARRIVAL)).toBe(false);
    expect(m).toMatchObject({ spin: 2, tilt: 0.1, target: null, vSpin: 0, vTilt: 0 });
  });

  it("leaves a still globe exactly as it was", () => {
    const m = still();
    const before = { ...m };
    expect(settleMotion(m, ARRIVAL)).toBe(false);
    expect(m).toEqual(before);
  });

  it("leaves a crossing the visitor is dragging part-way where their hand left it", () => {
    // Only the played flight is the globe's to finish. A part-dragged one is
    // the visitor's, and it waits for them.
    const m = still({ flight: 0.5 });
    expect(settleMotion(m, ARRIVAL)).toBe(false);
    expect(m.flight).toBe(0.5);
    expect(m.landed).toBe(false);
  });
});
