import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { gzipSync } from "node:zlib";
import { SKY_CLEAR, drawScenery, journeySpots } from "../../scripts/draw-scenery.mjs";

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
  // Journey
  oak: "0 120 1440 780",
  "oak-leaves": "0 120 1440 780",
  "oak-moss": "0 120 1440 780",
  "oak-trunk": "0 0 240 2400",
  "oak-trunk-leaves": "0 0 240 2400",
  "oak-trunk-moss": "0 0 240 2400",
  "oak-roots": "0 0 240 156",
  "oak-bough": "0 -30 200 70",
  "oak-bough-leaves": "0 -30 200 70",
  "journey-rice": "236 776 320 124",
  "lantern-day": "104 510 96 122",
  "lantern-night": "104 510 96 122",
  "journey-morning": "1196 780 92 90",
  "journey-evening": "1196 780 92 90",
  // Record
  "pressed-lotus": "40 10 136 170",
  "record-morning": "134 760 36 66",
  "record-evening": "134 760 36 66",
  "stamp-rice": "0 0 92 40",
  "stamp-pine": "0 0 92 40",
  "stamp-fern": "0 0 92 40",
  "stamp-palmetto": "0 0 92 40",
  // Weather (round 23)
  plane: "0 0 180 64",
  ufo: "0 0 130 70",
  leaf: "0 0 44 64",
  cloud: "0 0 220 100",
  "cloud-line": "0 0 220 100",
  bolt: "0 0 44 120",
  rain: "0 0 200 200",
  snow: "0 0 240 240",
};
const INK = ["bamboo", "bamboo-phone", "pine", "rice-field", "ripples", "buffalo", "tag-rice", "tag-pine", "tag-palmetto", "tag-laptop", "oak", "oak-leaves", "oak-moss", "oak-trunk", "oak-trunk-leaves", "oak-trunk-moss", "oak-roots", "oak-bough", "oak-bough-leaves", "journey-rice", /* Contact */ "postmark", /* Record */ "stamp-rice", "stamp-pine", "stamp-fern", "stamp-palmetto", /* Weather */ "plane", "ufo", "leaf", "cloud", "cloud-line", "bolt", "rain", "snow"];

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

  it("no file is over 40 KB, except the oak's leaves", () => {
    // The oak's 2,093 leaves are ~181 KB raw and ~29 KB gzipped; they are
    // served compressed, so that file is capped by its gzip size instead.
    for (const stem of Object.keys(files)) {
      if (stem === "oak-leaves") continue;
      expect(statSync(`${DIR}/${stem}.svg`).size, stem).toBeLessThanOrEqual(40 * 1024);
    }
    expect(gzipSync(readFileSync(`${DIR}/oak-leaves.svg`)).length).toBeLessThanOrEqual(32 * 1024);
  });
});

describe("the Journey's scenery", () => {
  it("the tags hang where the board hangs them", () => {
    const spots = journeySpots();
    expect(spots.map((s) => s.x)).toEqual([520, 720, 920, 1120, 1320]);
    for (const s of spots) {
      expect(s.top).toBeGreaterThan(s.ly);
      expect(s.ly).toBeGreaterThan(290);
      expect(s.ly).toBeLessThan(520);
    }
  });

  it("the lantern is lit only at night", () => {
    expect(files["lantern-night"]).toContain("url(#hoiLit)");
    expect(files["lantern-night"]).toContain("url(#hoiGlow)");
    expect(files["lantern-day"]).not.toContain("url(#hoiLit)");
    expect(files["lantern-day"]).not.toContain("url(#hoiGlow)");
  });

  it("no day-sky bird flies where a phone shows it, behind the headline", () => {
    // Below 1024 the sky is pinned right and only x < 920 shows.
    const starts = [...files["sky-day"].matchAll(/<path d="M([\d.]+) [\d.]+q[^"]*" fill="none" stroke="#56605A"/g)].map((m) => Number(m[1]));
    expect(starts).toHaveLength(5);
    for (const x of starts) expect(x).toBeGreaterThanOrEqual(920);
  });
});
