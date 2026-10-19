import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { drawScenery } from "../../scripts/draw-scenery.mjs";

const DIR = "public/scenery";

const VIEWBOXES: Record<string, string> = {
  bamboo: "0 110 170 790",
  pine: "1260 80 180 820",
  "rice-field": "550 740 670 160",
  ripples: "560 860 660 30",
  buffalo: "905 790 150 80",
  "tag-rice": "0 0 150 88",
  "tag-pine": "0 0 150 88",
  "tag-palmetto": "0 0 150 88",
  "tag-laptop": "0 0 150 88",
  "non-la": "44 370 120 130",
  "sky-day": "0 0 1440 900",
  "sky-night": "0 0 1440 900",
  morning: "420 750 100 134",
  evening: "420 750 100 134",
};
const INK = ["bamboo", "pine", "rice-field", "ripples", "buffalo", "tag-rice", "tag-pine", "tag-palmetto", "tag-laptop"];

const files = drawScenery();

describe("the hero's scenery", () => {
  it("the committed scenery is exactly today's draw", () => {
    for (const [stem, svg] of Object.entries(files)) {
      expect(readFileSync(`${DIR}/${stem}.svg`, "utf8"), `${stem}.svg is stale: run pnpm draw:scenery`).toBe(svg);
    }
    expect(readdirSync(DIR).sort()).toEqual(Object.keys(files).map((s) => `${s}.svg`).sort());
  });

  it("each file has its pinned viewBox", () => {
    expect(Object.keys(files).sort()).toEqual(Object.keys(VIEWBOXES).sort());
    for (const [stem, svg] of Object.entries(files)) {
      expect(svg.match(/^<svg [^>]*viewBox="([^"]+)"/)?.[1], stem).toBe(VIEWBOXES[stem]);
    }
  });

  it("ink files paint in one colour", () => {
    for (const stem of INK) {
      const paints = [...files[stem].matchAll(/\b(?:stroke|fill)="([^"]*)"/g)].map((m) => m[1]);
      expect(paints.length, stem).toBeGreaterThan(0);
      for (const paint of paints) expect(["#000", "none"], `${stem}: ${paint}`).toContain(paint);
    }
  });

  it("the draw is deterministic", () => {
    expect(drawScenery()).toEqual(files);
  });

  it("no file can run or fetch anything", () => {
    for (const [stem, svg] of Object.entries(files)) {
      expect(svg, stem).not.toMatch(/<script|href=|xlink:|@import|url\(http/i);
    }
  });

  it("no file is over 40 KB", () => {
    for (const stem of Object.keys(files)) {
      expect(statSync(`${DIR}/${stem}.svg`).size, stem).toBeLessThanOrEqual(40 * 1024);
    }
  });
});
