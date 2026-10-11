import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COASTLINES } from "@/sections/Worlds/coastline-data";
import { bakeCoastlineTexture } from "@/sections/Worlds/gl/coastline-texture";
import { decodeRgba, encodeRgba } from "../../scripts/png";

describe("the baked coastline PNG", () => {
  it("the committed PNG is exactly today's bake", () => {
    // `pnpm bake:coastline` regenerates it. If the rasteriser or the data
    // changes, this fails until the PNG is re-baked and committed.
    const png = decodeRgba(readFileSync("public/globe/coastline.png"));
    const baked = bakeCoastlineTexture(COASTLINES, 2048, 1024);
    expect(png.width).toBe(baked.width);
    expect(png.height).toBe(baked.height);
    expect(png.data.length).toBe(baked.data.length);
    expect(Buffer.from(png.data).equals(Buffer.from(baked.data))).toBe(true);
  });

  it("encode/decode round-trips", () => {
    const data = new Uint8ClampedArray(3 * 2 * 4).map((_, i) => (i * 37) % 256);
    const out = decodeRgba(encodeRgba(3, 2, data));
    expect(out.width).toBe(3);
    expect(out.height).toBe(2);
    expect([...out.data]).toEqual([...data]);
  });
});
