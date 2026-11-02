import { describe, expect, it } from "vitest";
import {
  completes,
  dragProgress,
  easeInOut,
  faceAngles,
  faceLight,
  leafProgress,
  leafZ,
  openingOf,
  RIFFLE_GAP_MS,
  RIFFLE_LEAF_MS,
  RIFFLE_MAX,
  riffleLeaves,
  shadeOn,
  stackLeaves,
  TURN_MS,
  turnMs,
  turnRoom,
  DEPTH,
} from "@/lib/diary-turn";

describe("a turning leaf's faces", () => {
  it("lie flat at the ends and stand upright over the spine half way", () => {
    expect(faceAngles(0, 1)).toEqual({ start: 0, arrive: 180 });
    expect(faceAngles(1, 1)).toEqual({ start: -180, arrive: 0 });
    expect(faceAngles(0.5, 1)).toEqual({ start: -90, arrive: 90 });
    // Back turns the other way about the spine.
    expect(faceAngles(0, -1)).toEqual({ start: 0, arrive: -180 });
    expect(faceAngles(1, -1)).toEqual({ start: 180, arrive: 0 });
  });

  it("stay back to back: one plane, half a turn apart", () => {
    for (const dir of [1, -1] as const) {
      for (let p = 0; p <= 1; p += 0.125) {
        const a = faceAngles(p, dir);
        expect(Math.abs(a.arrive - a.start)).toBeCloseTo(180, 6);
      }
    }
  });
});

describe("the shadow a leaf throws", () => {
  it("is nothing while the leaf lies flat", () => {
    for (const side of ["start", "arrive"] as const) {
      expect(shadeOn(side, 0).alpha).toBeCloseTo(0, 6);
      expect(shadeOn(side, 1).alpha).toBeCloseTo(0, 6);
    }
  });

  it("sweeps the page under the start side from the fore-edge to the spine as the leaf lifts", () => {
    const edges = [0.05, 0.15, 0.3, 0.45].map((p) => shadeOn("start", p).edge);
    expect(edges).toEqual([...edges].toSorted((a, b) => b - a));
    expect(edges[0]).toBeGreaterThan(0.9);
    // Over the other side, only a soft fall by the spine.
    expect(shadeOn("start", 0.7).edge).toBe(0);
    expect(shadeOn("start", 0.7).alpha).toBeLessThan(shadeOn("start", 0.3).alpha);
  });

  it("covers the page under the arrive side from the spine out as the leaf comes down", () => {
    const edges = [0.55, 0.7, 0.85, 0.95].map((p) => shadeOn("arrive", p).edge);
    expect(edges).toEqual([...edges].toSorted((a, b) => a - b));
    expect(shadeOn("arrive", 0.3).edge).toBe(0);
  });
});

describe("the light on a face", () => {
  it("dims as the face turns from the light and glints most half way up", () => {
    expect(faceLight(0)).toEqual({ dim: 0, glint: 0, at: 1 });
    expect(faceLight(0.5).dim).toBeCloseTo(0.5, 6);
    expect(faceLight(0.25).glint).toBeGreaterThan(faceLight(0.1).glint);
    expect(faceLight(0.25).glint).toBeGreaterThan(faceLight(0.45).glint);
    // The band runs in from the free edge toward the spine.
    expect(faceLight(0.4).at).toBeLessThan(faceLight(0.1).at);
  });
});

describe("a drag", () => {
  const W = 600;
  it("turns the leaf so its free edge follows the hand", () => {
    expect(dragProgress(0, W)).toBe(0);
    expect(dragProgress(W, W)).toBeCloseTo(0.5, 6);
    expect(dragProgress(2 * W, W)).toBeCloseTo(1, 6);
    expect(dragProgress(4 * W, W)).toBeCloseTo(1, 6);
    expect(dragProgress(-50, W)).toBe(0);
    expect(dragProgress(100, 0)).toBe(0);
  });

  it("completes past halfway, or on a flick, and falls back short of it", () => {
    expect(completes(0.49, 0, false)).toBe(false);
    expect(completes(0.51, 0, false)).toBe(true);
    // On one page, past the page's middle.
    expect(completes(dragProgress(W * 0.45, W), 0, true)).toBe(false);
    expect(completes(dragProgress(W * 0.55, W), 0, true)).toBe(true);
    expect(completes(0.1, 0.8, false)).toBe(true);
    expect(completes(0.9, -0.8, false)).toBe(false);
  });
});

describe("a riffle", () => {
  it("flicks a leaf a turn, up to six", () => {
    expect(riffleLeaves(1)).toBe(1);
    expect(riffleLeaves(4)).toBe(4);
    expect(riffleLeaves(30)).toBe(RIFFLE_MAX);
    expect(riffleLeaves(0)).toBe(1);
  });

  it("goes leaf after leaf, close together, and every leaf lands", () => {
    const n = 5;
    const end = turnMs(n);
    expect(end).toBe(RIFFLE_LEAF_MS + (n - 1) * RIFFLE_GAP_MS);
    expect(turnMs(1)).toBe(TURN_MS);
    expect(turnMs(1, true)).toBeLessThan(TURN_MS);
    for (let k = 0; k < n; k += 1) {
      expect(leafProgress(0, k, n)).toBe(0);
      expect(leafProgress(end, k, n)).toBe(1);
    }
    const mid = end / 2;
    const ps = Array.from({ length: n }, (_, k) => leafProgress(mid, k, n));
    expect(ps).toEqual([...ps].toSorted((a, b) => b - a));
    expect(leafProgress(TURN_MS / 2, 0, 1)).toBeCloseTo(easeInOut(0.5), 6);
  });

  it("keeps the leaves in order: the first lifted on top, the last landed on top", () => {
    expect(leafZ(0.2, 0, 4)).toBeGreaterThan(leafZ(0.2, 1, 4));
    expect(leafZ(0.8, 3, 4)).toBeGreaterThan(leafZ(0.8, 2, 4));
    expect(leafZ(0.8, 0, 4)).toBeGreaterThan(leafZ(0.2, 0, 4));
  });
});

describe("the room a turning leaf needs", () => {
  it("stands the viewer four page widths away, at any size", () => {
    expect(turnRoom(600, 900, true, 60).depth).toBe(DEPTH * 600);
    expect(turnRoom(350, 1400, false, 20).depth).toBe(DEPTH * 350);
  });

  it("covers the leaf standing upright over the spine, taller in perspective", () => {
    for (const [width, height, spread] of [[636, 924, true], [350, 1405, false], [960, 1050, false]] as const) {
      const { depth, room } = turnRoom(width, height, spread, 16);
      // Upright, its near edge is `depth − width` from the viewer.
      const reach = (height / 2) * (depth / (depth - width)) - height / 2;
      expect(room, `${width}×${height}`).toBeGreaterThanOrEqual(reach);
      expect(room, `${width}×${height}`).toBeLessThan(reach + 20);
    }
  });

  it("covers a spread's free edge reaching past the fore-edge, and on one page the margin to the window's edge", () => {
    // Sample a spread's leaf: no point projects further out than the room.
    const width = 636;
    const { depth, room } = turnRoom(width, 924, true, 60);
    let far = 0;
    for (let a = 0; a <= 180; a += 1) {
      const t = (a * Math.PI) / 180;
      far = Math.max(far, Math.abs(width * Math.cos(t)) * (depth / (depth - width * Math.sin(t))) - width);
    }
    expect(room).toBeGreaterThan(far);
    // One page, a short page and a wide margin: the margin decides.
    expect(turnRoom(600, 120, false, 300).room).toBe(312);
    // A margin wider than the leaf's own swing is never asked for.
    expect(turnRoom(300, 120, false, 2000).room).toBe(Math.ceil(300 * 1.1) + 12);
  });
});

describe("the book", () => {
  it("opens a page on its own, or on a spread at the left page of its pair", () => {
    expect(openingOf(5, 1, 18)).toBe(5);
    expect(openingOf(5, 2, 18)).toBe(4);
    expect(openingOf(4, 2, 18)).toBe(4);
    expect(openingOf(-3, 2, 18)).toBe(0);
    expect(openingOf(40, 2, 18)).toBe(16);
    expect(openingOf(40, 1, 18)).toBe(17);
    expect(openingOf(0, 2, 0)).toBe(0);
  });

  it("stacks the leaves read on the left and the leaves to come on the right", () => {
    expect(stackLeaves(0, 2, 18)).toEqual({ read: 0, left: 8 });
    expect(stackLeaves(8, 2, 18)).toEqual({ read: 4, left: 4 });
    expect(stackLeaves(16, 2, 18)).toEqual({ read: 8, left: 0 });
    expect(stackLeaves(3, 1, 18)).toEqual({ read: 2, left: 7 });
  });
});
