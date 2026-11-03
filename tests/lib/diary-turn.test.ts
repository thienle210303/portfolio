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
  camera,
  cornerPath,
  curl,
  curlAnchor,
  curlProgress,
  curlZ,
  CURL_PAST,
  DEPTH,
  LIP,
  type Pt,
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
    // On one page, the curl's corner pulled past the page's middle.
    expect(completes(curlProgress(W * 0.45, W), 0, true)).toBe(false);
    expect(completes(curlProgress(W * 0.55, W), 0, true)).toBe(true);
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

describe("the eye a turn is seen from", () => {
  /** How far an edge at `edge` grows past itself, the leaf upright (its free
   *  edge a page width nearer the eye). */
  const growth = (edge: number, eye: { y: number; depth: number }, width: number) =>
    Math.abs(edge - eye.y) * (width / (eye.depth - width));

  it("stands on the book's foot when only the foot is on screen, and its top when only the top is", () => {
    // A tall page on a phone, the reader at its foot (by the corner).
    const foot = camera(-900, 500, 844, 350);
    expect(foot.y).toBe(500);
    expect(foot.depth).toBe(DEPTH * 350);
    const top = camera(300, 1700, 844, 350);
    expect(top.y).toBe(300);
    expect(top.depth).toBe(DEPTH * 350);
  });

  it("stands in the window's middle when neither edge is on screen", () => {
    const eye = camera(-400, 1400, 844, 350);
    expect(eye.y).toBe(422);
    expect(eye.depth).toBe(DEPTH * 350);
    // Clamped to the page.
    expect(camera(-2000, -10, 844, 350).y).toBe(-10);
  });

  it("keeps every edge on screen within the boards' lip, whatever the window shows", () => {
    for (const width of [350, 636, 960]) {
      for (const [top, foot, view] of [
        [80, 1004, 1000], // a spread, all of it on screen
        [40, 980, 1000],
        [-300, 624, 900], // its foot on screen
        [120, 1525, 844], // a phone page, its top on screen
        [-600, 805, 844], // its foot on screen
        [-200, 2000, 844], // neither
      ] as const) {
        const eye = camera(top, foot, view, width);
        for (const edge of [top, foot]) {
          if (edge < 0 || edge > view) continue;
          expect(growth(edge, eye, width), `${width}: ${top}–${foot} in ${view}`).toBeLessThanOrEqual(LIP + 1e-6);
        }
        expect(eye.depth).toBeGreaterThanOrEqual(DEPTH * width);
      }
    }
  });

  it("with the whole book on screen, stands back far enough for both edges", () => {
    const eye = camera(80, 1004, 1010, 636);
    expect(eye.y).toBe(542);
    expect(growth(80, eye, 636)).toBeCloseTo(LIP, 6);
    expect(growth(1004, eye, 636)).toBeCloseTo(LIP, 6);
  });
});

describe("the room a turning leaf needs", () => {
  it("is the lip top and foot, at the eye's nearest", () => {
    expect(turnRoom(600, true).depth).toBe(DEPTH * 600);
    expect(turnRoom(350, false).depth).toBe(DEPTH * 350);
    expect(turnRoom(350, false).room).toBe(LIP + 4);
  });

  it("covers a spread's free edge reaching past the fore-edge", () => {
    const width = 636;
    const { depth, room } = turnRoom(width, true);
    let far = 0;
    for (let a = 0; a <= 180; a += 1) {
      const t = (a * Math.PI) / 180;
      far = Math.max(far, Math.abs(width * Math.cos(t)) * (depth / (depth - width * Math.sin(t))) - width);
    }
    expect(room).toBeGreaterThan(far);
  });

  it("on one page is only the lip: the curl stays inside its own box", () => {
    expect(turnRoom(350, false).room).toBe(LIP + 4);
    expect(turnRoom(700, false).room).toBe(LIP + 4);
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

describe("one page curls from its corner", () => {
  /** Pages as tall as the Diary's: a phone's, a small phone's, a tablet's. */
  const PAGES = [
    [350, 1400],
    [280, 1600],
    [700, 1100],
  ] as const;
  const area = (pts: readonly Pt[]) =>
    Math.abs(
      pts.reduce((sum, [x, y], i) => {
        const [u, v] = pts[(i + 1) % pts.length];
        return sum + x * v - u * y;
      }, 0),
    ) / 2;
  const reflect = (m: readonly number[], [x, y]: Pt): Pt => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  /** The fold's x at height `y` (page px), and its lean (px across per px up). */
  const foldX = (g: ReturnType<typeof curl>, y: number) => (g.at - y * g.normal[1]) / g.normal[0];
  const lean = (g: ReturnType<typeof curl>) => g.normal[1] / g.normal[0];

  it("lies flat at 0: the whole page, nothing lifted, no flap", () => {
    for (const [w, h] of PAGES) {
      const g = curl(0, w, h, h);
      expect(area(g.flat)).toBeCloseTo(w * h, 6);
      expect(g.peeled).toEqual([]);
      expect(g.flap).toEqual([]);
      expect(g.lift).toBe(0);
    }
  });

  it("clears the whole page at 1, the part off screen too, wherever the corner was pulled", () => {
    for (const [w, h] of PAGES) {
      for (const anchor of [0, 300, h / 2, h - 200, h]) {
        const g = curl(1, w, h, anchor);
        expect(area(g.flat), `${w}×${h} from ${anchor}`).toBeLessThan(1e-6);
        expect(area(g.peeled)).toBeCloseTo(w * h, 4);
        // Its back lies past the spine, off the page.
        expect(area(g.flap)).toBeLessThan(1e-6);
        expect(g.corner[0]).toBeCloseTo(-w - 2 * CURL_PAST, 6);
      }
    }
  });

  it("splits the page in two along the fold: what lies flat and what has lifted", () => {
    for (const [w, h] of PAGES) {
      for (let c = 0.05; c < 1; c += 0.05) {
        const g = curl(c, w, h, h);
        expect(area(g.flat) + area(g.peeled)).toBeCloseTo(w * h, 3);
        for (const [x, y] of g.flat) expect(x * g.normal[0] + y * g.normal[1]).toBeLessThanOrEqual(g.at + 1e-6);
        for (const [x, y] of g.peeled) expect(x * g.normal[0] + y * g.normal[1]).toBeGreaterThanOrEqual(g.at - 1e-6);
      }
    }
  });

  it("folds diagonally across what is on screen mid-turn, and straightens only as it leaves through the spine", () => {
    // A phone's window over the foot of a tall page: the corner pulled at
    // the foot, the window's top 800px above it.
    for (const [w, h] of PAGES) {
      const top = Math.max(h - 800, 0);
      for (let c = 0.15; c <= 0.85 + 1e-9; c += 0.05) {
        const g = curl(c, w, h, h);
        expect(lean(g), `${w}: ${c.toFixed(2)}`).toBeGreaterThanOrEqual(0.25);
        // Where it crosses the window's top and foot differs by a clear margin…
        expect(foldX(g, top) - foldX(g, h)).toBeGreaterThan(0.25 * (h - top));
        // …and some of it is on the page, in the window.
        expect(Math.max(foldX(g, h), 0)).toBeLessThan(Math.min(foldX(g, top), w));
      }
      for (let c = 0.05; c < 1; c += 0.01) {
        const g = curl(c, w, h, h);
        if (lean(g) < 0.25) expect(foldX(g, h), `${w}: ${c.toFixed(2)}`).toBeLessThan(0.05 * w);
      }
    }
  });

  it("keeps the flap's reflection inside the page box, and the flap on the side that lifted", () => {
    for (const [w, h] of PAGES) {
      for (const anchor of [0, 420, h / 2, h]) {
        for (const hand of [0, 260]) {
          for (let c = 0.02; c < 1; c += 0.04) {
            const g = curl(c, w, h, anchor, hand);
            for (const pt of g.flap) {
              const [x, y] = reflect(g.matrix, pt);
              expect(x).toBeGreaterThanOrEqual(-1e-6);
              expect(x).toBeLessThanOrEqual(w + 1e-6);
              expect(y).toBeGreaterThanOrEqual(-1e-6);
              expect(y).toBeLessThanOrEqual(h + 1e-6);
              expect(pt[0] * g.normal[0] + pt[1] * g.normal[1]).toBeGreaterThanOrEqual(g.at - 1e-6);
            }
          }
        }
      }
    }
  });

  it("reflects across the fold: the corner lands where it was pulled, the fold stays put", () => {
    const g = curl(0.4, 350, 1400, 1400);
    const [x, y] = reflect(g.matrix, [350, 1400]);
    expect(x).toBeCloseTo(g.corner[0], 6);
    expect(y).toBeCloseTo(g.corner[1], 6);
    const on: Pt = [foldX(g, 900), 900];
    const back = reflect(g.matrix, on);
    expect(back[0]).toBeCloseTo(on[0], 6);
    expect(back[1]).toBeCloseTo(on[1], 6);
  });

  it("shades across the fold: the gradient runs toward the corner, the flap as deep as half its pull", () => {
    const [w, h] = [350, 1400];
    const g = curl(0.5, w, h, h);
    const rad = (g.angle * Math.PI) / 180;
    expect(Math.sin(rad)).toBeCloseTo(g.normal[0], 6);
    expect(-Math.cos(rad)).toBeCloseTo(g.normal[1], 6);
    // On a w × h box the gradient runs through the middle: the corner falls
    // a flap's depth past the fold.
    const run = Math.abs(w * g.normal[0]) + Math.abs(h * g.normal[1]);
    const along = (x: number, y: number) => (x - w / 2) * g.normal[0] + (y - h / 2) * g.normal[1] + run / 2;
    expect(along(w, h)).toBeCloseTo(g.fold + g.depth, 6);
    expect(g.lift).toBeCloseTo(1, 6);
  });

  it("pulls the corner across twice the page, rising as it goes, and lying down past the spine", () => {
    expect(cornerPath(0, 350)).toEqual({ across: 0, rise: 0 });
    expect(cornerPath(1, 350).across).toBeCloseTo(2 * (350 + CURL_PAST), 6);
    expect(cornerPath(1, 350).rise).toBe(0);
    expect(cornerPath(0.5, 350).rise).toBeGreaterThan(0);
  });

  it("follows a hand: the corner moves with it, and a hand may lift it, never past 45°", () => {
    const W = 350;
    expect(curlProgress(0, W)).toBe(0);
    expect(curlProgress(-40, W)).toBe(0);
    expect(curlProgress(W / 2, W)).toBeCloseTo(0.25, 1);
    expect(curlProgress(2 * (W + CURL_PAST), W)).toBe(1);
    const p = curlProgress(200, W);
    expect(curl(p, W, 1400, 1300).corner[0]).toBeCloseTo(W - 200, 6);
    const own = 1300 - curl(p, W, 1400, 1300).corner[1];
    const lifted = curl(p, W, 1400, 1300, own + 30);
    expect(lifted.corner[1]).toBeCloseTo(1300 - own - 30, 6);
    expect(curl(p, W, 1400, 1300, 5000).corner[1]).toBeCloseTo(1300 - 200, 6);
    // A hand lower than the curl's own rise changes nothing.
    expect(curl(p, W, 1400, 1300, 1).corner).toEqual(curl(p, W, 1400, 1300).corner);
  });

  it("pulls the corner at the foot of what is on screen", () => {
    // The foot on screen: the page's own corner.
    expect(curlAnchor(-600, 1400, 844)).toBe(1400);
    // The top on screen and the foot below the window: the window's foot.
    expect(curlAnchor(200, 1400, 844)).toBe(644);
    // The window inside the page.
    expect(curlAnchor(-300, 1400, 844)).toBe(1144);
    // Off screen either way: the page's own corner.
    expect(curlAnchor(900, 1400, 844)).toBe(1400);
    expect(curlAnchor(-2000, 1400, 844)).toBe(1400);
  });

  it("stacks a riffle's leaves: going forward the first to go on top, coming back the last to land", () => {
    expect(curlZ(0, 4, 1)).toBeGreaterThan(curlZ(1, 4, 1));
    expect(curlZ(3, 4, -1)).toBeGreaterThan(curlZ(2, 4, -1));
    // Each leaf's flap (one above it) stays under the leaf above.
    expect(curlZ(0, 4, 1)).toBeGreaterThan(curlZ(1, 4, 1) + 1);
  });
});
