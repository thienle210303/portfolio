import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { clampTilt } from "@/lib/globe";
import { buildStops } from "@/lib/origin-stops";
import GlobeCanvas from "@/sections/Worlds/GlobeCanvas";
import type { GlobeControls } from "@/sections/Worlds/WorldsStage";
import { ROBOT_WALK_FRAMES } from "@/sections/Worlds/gl/robot";
import type { SphereState } from "@/sections/Worlds/gl/sphere";

/*
 * The globe's motion, driven by a hand-cranked `requestAnimationFrame`. What
 * the GL surface is told to draw is the observable: every `draw()` hands it
 * the spin, tilt and robot progress of that frame. jsdom has no WebGL2 or 2D
 * canvas, so the context, the sphere and the 2D context are stand-ins.
 */

const fake = vi.hoisted(() => ({ states: [] as SphereState[] }));

vi.mock("@/sections/Worlds/gl/context", async (importActual) => ({
  ...(await importActual<typeof import("@/sections/Worlds/gl/context")>()),
  acquireRenderer: () => ({ kind: "webgl", gl: {} }),
}));

vi.mock("@/sections/Worlds/gl/sphere", async (importActual) => {
  const actual = await importActual<typeof import("@/sections/Worlds/gl/sphere")>();
  return {
    ...actual,
    createSphere: () => ({
      ok: true,
      program: {},
      draw(state: SphereState) {
        fake.states.push({ ...state });
      },
      setColors() {},
      dispose() {},
    }),
  };
});

const DEG = Math.PI / 180;
const STOPS = buildStops();
const motion = { reduce: false };

/** Pending animation callbacks, run one reference frame apart by `frames()`. */
let queue: FrameRequestCallback[] = [];
let clock = 0;
function frames(count: number) {
  for (let i = 0; i < count && queue.length > 0; i += 1) {
    const due = queue;
    queue = [];
    clock += 1000 / 60;
    for (const callback of due) callback(clock);
  }
}
/** Run frames until the loop stops asking for one. */
function untilRest(limit = 5000) {
  let n = 0;
  while (queue.length > 0 && n < limit) {
    frames(1);
    n += 1;
  }
  return n;
}

const last = () => fake.states.at(-1)!;

beforeEach(() => {
  fake.states = [];
  queue = [];
  clock = 0;
  motion.reduce = false;
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: motion.reduce && query.includes("prefers-reduced-motion: reduce"),
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    disconnect() {}
  });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    queue.push(callback);
    return queue.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    queue = [];
  });
  vi.stubGlobal("Path2D", class {});
  // A 2D context that accepts every call, so `draw()` runs through to the
  // GL surface it hands each frame to.
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (target, key: string) => (key in target ? target[key] : () => {}),
    set: (target, key: string, value) => {
      target[key] = value;
      return true;
    },
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D,
  );
  const real = window.getComputedStyle;
  vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
    const style = real(element);
    return {
      ...style,
      getPropertyValue: (name: string) =>
        name === "--fg" ? "#111111" : name === "--ground" ? "#eeeeee" : style.getPropertyValue(name),
    } as CSSStyleDeclaration;
  });
  vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["png"]))));
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ close() {} })));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function mount() {
  let controls: GlobeControls | null = null;
  const onLanded = vi.fn();
  const onSurfaceChange = vi.fn();
  render(
    <GlobeCanvas
      stops={STOPS}
      activeStopId={null}
      onLanded={onLanded}
      onReady={(c) => {
        controls = c;
      }}
      onSurfaceChange={onSurfaceChange}
    />,
  );
  await waitFor(() => expect(onSurfaceChange).toHaveBeenCalledWith(true));
  if (!controls) throw new Error("no controls");
  return { controls: controls as GlobeControls, onLanded };
}

describe("GlobeCanvas's controls", () => {
  it("focusStop lands an in-air flight then turns", async () => {
    const { controls, onLanded } = await mount();
    act(() => controls.fly());
    frames(30);
    expect(onLanded).not.toHaveBeenCalled();

    act(() => controls.focusStop("usc"));
    expect(onLanded).toHaveBeenCalledTimes(1);
    untilRest();

    // The landing did not overwrite the turn: the camera rests on the stop.
    const usc = STOPS.find((stop) => stop.id === "usc")!.coordinates;
    const spin = Math.atan2(Math.sin(last().spin + usc.lon * DEG), Math.cos(last().spin + usc.lon * DEG));
    expect(Math.abs(spin)).toBeLessThan(0.003);
    expect(last().tilt).toBeCloseTo(clampTilt(-usc.lat * DEG * 0.55), 2);
    expect(onLanded).toHaveBeenCalledTimes(1);
  });

  it("focusStop on a still globe only turns, and lands nothing", async () => {
    const { controls, onLanded } = await mount();
    act(() => controls.focusStop("kien-giang"));
    untilRest();
    const from = STOPS[0].coordinates;
    expect(last().spin).toBeCloseTo(-from.lon * DEG, 2);
    expect(onLanded).not.toHaveBeenCalled();
    expect(last().robot).toBe(-1);
  });
});

describe("GlobeCanvas's robot", () => {
  it("robot walks one lap after landing", async () => {
    const { controls, onLanded } = await mount();
    act(() => controls.fly());
    // No robot while he is in the air.
    while (onLanded.mock.calls.length === 0 && queue.length > 0) frames(1);
    expect(onLanded).toHaveBeenCalledTimes(1);
    expect(fake.states.slice(0, -1).every((state) => state.robot === -1)).toBe(true);

    const landedAt = fake.states.length;
    frames(ROBOT_WALK_FRAMES / 2);
    const mid = last().robot;
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThan(0.7);

    untilRest();
    const walk = fake.states.slice(landedAt).map((state) => state.robot);
    // Rising, never backwards, and it ends lit and still.
    expect(walk.every((value, i) => i === 0 || value >= walk[i - 1])).toBe(true);
    expect(last().robot).toBe(1);
    expect(queue).toHaveLength(0);
  });

  it("walks again after the next landing, and reset takes it off", async () => {
    const { controls, onLanded } = await mount();
    act(() => controls.fly());
    untilRest();
    expect(last().robot).toBe(1);

    act(() => controls.fly());
    frames(1);
    expect(last().robot).toBe(-1);
    untilRest();
    expect(onLanded).toHaveBeenCalledTimes(2);
    expect(last().robot).toBe(1);

    act(() => controls.reset());
    untilRest();
    expect(last().robot).toBe(-1);
  });

  it("under reduced motion there is no walk: the landing draws the still, with no frame", async () => {
    const { controls, onLanded } = await mount();
    motion.reduce = true;
    act(() => controls.fly());
    expect(onLanded).toHaveBeenCalledTimes(1);
    expect(queue).toHaveLength(0);
    expect(last().robot).toBe(1);
  });

  it("settle ends a walk in progress at its lit end", async () => {
    const { controls } = await mount();
    act(() => controls.fly());
    while (last().robot <= 0 && queue.length > 0) frames(1);
    frames(20);
    expect(last().robot).toBeGreaterThan(0);
    expect(last().robot).toBeLessThan(1);
    act(() => controls.settle());
    expect(last().robot).toBe(1);
    expect(queue).toHaveLength(0);
  });

  it("settle mid-flight lands it with the robot already still", async () => {
    const { controls, onLanded } = await mount();
    act(() => controls.fly());
    frames(10);
    act(() => controls.settle());
    expect(onLanded).toHaveBeenCalledTimes(1);
    expect(last().robot).toBe(1);
    expect(queue).toHaveLength(0);
  });
});
