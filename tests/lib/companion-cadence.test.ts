import { describe, expect, it } from "vitest";
import { type Cadence, IDLE_TICK_MS, nextCadence } from "@/components/companion/companion-cadence";

describe("nextCadence", () => {
  it.each<[string, boolean, boolean, boolean, Cadence]>([
    // name, busy, asleep, animating, expected
    ["still, awake, nothing animating", false, false, false, "idle"],
    ["still, awake, animating", false, false, true, "frame"],
    ["still, asleep, nothing animating", false, true, false, "stop"],
    ["still, asleep, animating", false, true, true, "frame"],
    ["busy, awake, nothing animating", true, false, false, "frame"],
    ["busy, awake, animating", true, false, true, "frame"],
    ["busy, asleep, nothing animating", true, true, false, "frame"],
    ["busy, asleep, animating", true, true, true, "frame"],
  ])("%s → busy=%s asleep=%s animating=%s → %s", (_name, busy, asleep, animating, expected) => {
    expect(nextCadence({ busy, asleep, animating })).toBe(expected);
  });

  it("blink active → frame", () => {
    expect(nextCadence({ busy: false, asleep: false, animating: true })).toBe("frame");
  });

  it("flourish (groom, bat, stretch) active → frame", () => {
    expect(nextCadence({ busy: false, asleep: false, animating: true })).toBe("frame");
  });

  it("seated, awake, still → idle", () => {
    expect(nextCadence({ busy: false, asleep: false, animating: false })).toBe("idle");
  });

  it("asleep, still → stop", () => {
    expect(nextCadence({ busy: false, asleep: true, animating: false })).toBe("stop");
  });

  it("idles at four ticks a second", () => {
    expect(IDLE_TICK_MS).toBe(250);
  });
});
