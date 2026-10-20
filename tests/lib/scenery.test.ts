import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SKY_CLEAR, drawScenery } from "../../scripts/draw-scenery.mjs";

const DIR = "public/scenery";

const VIEWBOXES: Record<string, string> = {
  bamboo: "0 110 140 1234",
  "bamboo-phone": "316 456 70 868",
  clothespin: "0 0 8.8 22.8",
  pine: "1260 80 180 1264",
  "rice-field": "565 740 655 160",
  ripples: "560 860 660 30",
  buffalo: "905 790 150 80",
  "tag-rice": "0 0 150 88",
  "tag-pine": "0 0 150 88",
  "tag-palmetto": "0 0 150 88",
  "tag-laptop": "0 0 150 88",
  "non-la": "44 370 120 130",
  "sky-day": "0 0 1440 900",
  "sky-night": "0 0 1440 900",
  morning: "420 770 100 114",
  evening: "420 770 100 114",
  // Contact
  "lanterns-day": "626 -12 812 192",
  "lanterns-night": "626 -12 812 192",
  "postcard-scene": "0 0 340 440",
  "flag-stamp": "0 0 77 92",
  postmark: "20 8 120 72",
  pho: "-27 -33 63 48",
  bia: "-42 -76 84 82",
  "banh-tet": "-72 -24 164 48",
  "paper-clip": "0 0 34 86",
};
const INK = ["bamboo", "bamboo-phone", "pine", "rice-field", "ripples", "buffalo", "tag-rice", "tag-pine", "tag-palmetto", "tag-laptop", /* Contact */ "postmark"];

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

  it("no seed or firefly lands on the hero's words", () => {
    const seeds = [...files["sky-day"].matchAll(/<g opacity="[^"]*"><path d="M([\d.]+) ([\d.]+)/g)];
    const flies = [...files["sky-night"].matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)"[^>]*fill="#FFE18A"/g)];
    expect(seeds.length).toBeGreaterThan(5);
    expect(flies.length).toBeGreaterThan(5);
    for (const [, x, y] of [...seeds, ...flies]) {
      const inside = +x >= SKY_CLEAR.x0 && +x <= SKY_CLEAR.x1 && +y >= SKY_CLEAR.y0 && +y <= SKY_CLEAR.y1;
      expect(inside, `${x},${y}`).toBe(false);
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
