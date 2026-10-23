import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SURPRISE_MS,
  advanceSurprise,
  markSurpriseSpent,
  resetSurpriseForTests,
  nearDrawing,
  seatBeside,
  startSurprise,
  surpriseFacing,
  surprisePose,
  surpriseSpent,
} from "@/components/companion/companion-surprise";

const drawing = { left: 300, top: 600, right: 420, bottom: 666 };
const view = { minX: 8, maxX: 1440 - 58, minY: 80, maxY: 900 - 50 };

describe("the Moon surprise", () => {
  afterEach(() => {
    sessionStorage.clear();
    resetSurpriseForTests();
    vi.restoreAllMocks();
  });

  it("runs stop, startle, creep, sniff, sit, then lets go", () => {
    let s = startSurprise("follow", 1000);
    expect(s.step).toBe("stop");
    expect(advanceSurprise(s, 1000 + SURPRISE_MS.stop - 1, false)).toBe(s);
    s = advanceSurprise(s, 1000 + SURPRISE_MS.stop, false)!;
    expect(s.step).toBe("startle");
    s = advanceSurprise(s, s.until, false)!;
    expect(s.step).toBe("creep");
    // A creep lasts until she gets there, however long that is.
    expect(advanceSurprise(s, s.until + 60_000, false)!.step).toBe("creep");
    s = advanceSurprise(s, 5000, true)!;
    expect(s.step).toBe("sniff");
    s = advanceSurprise(s, s.until, true)!;
    expect(s.step).toBe("sit");
    expect(advanceSurprise(s, s.until, true)).toBeNull();
  });

  it("draws each step with a pose she already has, and hops on the startle", () => {
    expect(surprisePose("stop")).toEqual({ pose: "sit", hopping: false });
    expect(surprisePose("startle")).toEqual({ pose: "startle", hopping: true });
    expect(surprisePose("creep")).toEqual({ pose: "walk", hopping: false });
    expect(surprisePose("sniff")).toEqual({ pose: "sniff", hopping: false });
    expect(surprisePose("sit")).toEqual({ pose: "sit", hopping: false });
  });

  it("is noticed only from close by", () => {
    expect(nearDrawing({ x: 440, y: 620 }, drawing)).toBe(true);
    expect(nearDrawing({ x: 900, y: 300 }, drawing)).toBe(false);
  });

  it("sits beside the drawing, left of it where there is room, never on it", () => {
    const left = seatBeside(drawing, view, () => true)!;
    expect(left.x + 50).toBeLessThanOrEqual(drawing.left);
    expect(left.y + 42).toBeCloseTo(drawing.bottom, 0);
    // The left refused: the right.
    const right = seatBeside(drawing, view, (p) => p.x > drawing.left)!;
    expect(right.x).toBeGreaterThanOrEqual(drawing.right);
    expect(seatBeside(drawing, view, () => false)).toBeNull();
  });

  it("does not seat her off the edge of the page", () => {
    const atEdge = { left: 16, top: 600, right: 112, bottom: 652 };
    const seat = seatBeside(atEdge, view, () => true)!;
    expect(seat.x).toBeGreaterThanOrEqual(atEdge.right);
  });

  it("faces the drawing while it matters to her", () => {
    expect(surpriseFacing({ x: 500, y: 0 }, drawing)).toBe(-1);
    expect(surpriseFacing({ x: 100, y: 0 }, drawing)).toBe(1);
  });

  it("happens once a visit, and a storage that throws only costs the memory", () => {
    expect(surpriseSpent()).toBe(false);
    markSurpriseSpent();
    expect(surpriseSpent()).toBe(true);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => markSurpriseSpent()).not.toThrow();
    expect(surpriseSpent()).toBe(true);
  });
});
