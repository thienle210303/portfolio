import { describe, expect, it } from "vitest";
import { FRAME_MS } from "@/lib/globe";
import {
  ROBOT_HOLDS,
  ROBOT_WALK_FRAMES,
  lightLevel,
  robotLights,
  robotPass,
  robotSky,
} from "@/sections/Worlds/gl/robot";

describe("the robot's two passes", () => {
  it("darkens on the first lap", () => {
    const early = robotPass(0.4);
    expect(early.pass).toBe(1);
    // Behind it, the lights are out.
    expect(early.cityLight).toBeLessThan(0.5);
  });

  it("relights brighter than it started on the second", () => {
    const late = robotPass(0.9);
    expect(late.pass).toBe(2);
    expect(late.cityLight).toBeGreaterThan(1);
  });

  it("walks a full circle on each lap", () => {
    expect(robotPass(0).lonDegrees).toBeCloseTo(-180);
    expect(robotPass(0.5).lonDegrees).toBeCloseTo(-180);
    expect(robotPass(0.999).lonDegrees).toBeGreaterThan(170);
  });

  it("ends lit, not dark", () => {
    // The argument the content layer already makes is that accountability
    // stays human-owned. Ending on the dark pass would make the opposite one.
    expect(robotPass(1).pass).toBe(2);
    expect(robotPass(1).cityLight).toBeGreaterThan(1);
  });
});

describe("where the lights are on", () => {
  it("puts the lap's old level ahead of the robot and its new level behind it", () => {
    // First lap: lit ahead, out behind. Second: still out ahead, relit behind.
    expect(robotLights(0.2)).toMatchObject({ pass: 1, ahead: 1, behind: 0 });
    expect(robotLights(0.7)).toMatchObject({ pass: 2, ahead: 0, behind: robotPass(1).cityLight });
  });

  it("reads behind for every longitude the robot has walked this lap, ahead for the rest", () => {
    const lights = robotLights(0.25)!; // pass 1, robot at 0°
    expect(lights.lonDegrees).toBeCloseTo(0);
    expect(lightLevel(lights, -90)).toBe(lights.behind);
    expect(lightLevel(lights, 90)).toBe(lights.ahead);
  });

  it("is cityLight, spread round the globe: the mean over longitude equals robotPass", () => {
    // The drawing and the pure function are one quantity, so `cityLight` is
    // what the planet shows on average rather than a second number beside it.
    for (const progress of [0.1, 0.3, 0.45, 0.55, 0.7, 0.95]) {
      const lights = robotLights(progress)!;
      let sum = 0;
      const samples = 3600;
      for (let i = 0; i < samples; i += 1) sum += lightLevel(lights, -180 + (i + 0.5) * (360 / samples));
      expect(sum / samples, `progress ${progress}`).toBeCloseTo(robotPass(progress).cityLight, 2);
    }
  });

  it("is absent below zero, which is how the sphere is told there is no robot", () => {
    expect(robotLights(-1)).toBeNull();
  });
});

describe("the walk's length and its two held states", () => {
  it("takes about six seconds, counted in reference frames like every other rate", () => {
    const ms = ROBOT_WALK_FRAMES * FRAME_MS;
    expect(ms).toBeGreaterThan(5_500);
    expect(ms).toBeLessThan(6_500);
  });

  it("holds 'Unsupervised' at the end of the dark lap: every light out", () => {
    const lights = robotLights(ROBOT_HOLDS.unsupervised)!;
    expect(lights.pass).toBe(1);
    for (let lon = -179; lon <= 179; lon += 1) expect(lightLevel(lights, lon)).toBe(0);
  });

  it("holds 'Human in the loop' where the walk ends: lit, brighter than it started", () => {
    expect(ROBOT_HOLDS["human-in-the-loop"]).toBe(1);
    const lights = robotLights(ROBOT_HOLDS["human-in-the-loop"])!;
    expect(lights.pass).toBe(2);
    for (let lon = -179; lon <= 179; lon += 1) {
      expect(lightLevel(lights, lon)).toBeGreaterThan(robotPass(0).cityLight);
    }
  });
});

describe("the body over each lap", () => {
  it("is nothing below zero, a Moon over the dark lap and a Sun over the lit one", () => {
    expect(robotSky(-1)).toBeNull();
    expect(robotSky(0)).toBe("moon");
    expect(robotSky(0.49)).toBe("moon");
    expect(robotSky(0.5)).toBe("sun");
    expect(robotSky(1)).toBe("sun");
  });

  it("agrees with the two still holds", () => {
    expect(robotSky(ROBOT_HOLDS.unsupervised)).toBe("moon");
    expect(robotSky(ROBOT_HOLDS["human-in-the-loop"])).toBe("sun");
  });
});
