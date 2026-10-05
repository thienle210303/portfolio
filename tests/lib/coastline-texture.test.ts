import { describe, expect, it } from "vitest";
import { COASTLINES } from "@/sections/Worlds/coastline-data";
import { bakeCoastlineTexture } from "@/sections/Worlds/gl/coastline-texture";

const alphaAt = (
  image: { width: number; data: Uint8ClampedArray },
  row: number,
  col: number,
) => image.data[(row * image.width + col) * 4 + 3];

describe("bakeCoastlineTexture", () => {
  it("maps longitude -180..180 to x and latitude 90..-90 to y", () => {
    // 10x10 degrees centred on (5E, 5N): pixel (row 85, col 185) at 1px/degree.
    const image = bakeCoastlineTexture([[0, 0, 10, 0, 10, 10, 0, 10]], 360, 180);
    expect(alphaAt(image, 85, 185)).toBe(255);
    expect(alphaAt(image, 5, 5)).toBe(0);
  });

  it("produces a buffer of exactly the requested size", () => {
    const image = bakeCoastlineTexture([], 64, 32);
    expect(image.width).toBe(64);
    expect(image.height).toBe(32);
    expect(image.data.length).toBe(64 * 32 * 4);
  });

  it("wraps a ring crossing the antimeridian instead of smearing it", () => {
    // 2 degrees wide, not 358. A naive fill covers row 89, col 180.
    const ring = [179, 0, -179, 0, -179, 1, 179, 1];
    const image = bakeCoastlineTexture([ring], 360, 180);
    expect(alphaAt(image, 89, 180)).toBe(0);
    expect(alphaAt(image, 89, 0)).toBe(255);
    expect(alphaAt(image, 89, 359)).toBe(255);
  });

  it("closes Antarctica along the pole", () => {
    const antarctica = COASTLINES.find((ring) => {
      let min = 90;
      for (let i = 1; i < ring.length; i += 2) min = Math.min(min, ring[i]);
      return min < -85;
    });
    expect(antarctica).toBeDefined();
    const image = bakeCoastlineTexture([antarctica!], 360, 180);
    const covered = (row: number) => {
      let n = 0;
      for (let c = 0; c < 360; c++) if (alphaAt(image, row, c) > 0) n++;
      return n;
    };
    expect(covered(90)).toBe(0);
    expect(covered(179)).toBe(360);
  });
});
