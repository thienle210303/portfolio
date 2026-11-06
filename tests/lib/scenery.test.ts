import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { gzipSync } from "node:zlib";
import { GRASS, PADDY, POLE, SKY_CLEAR, drawScenery, journeySpots } from "../../scripts/draw-scenery.mjs";

const DIR = "public/scenery";

const VIEWBOXES: Record<string, string> = {
  bamboo: "0 110 140 1234",
  // The yard's pole (round 25): a crown (two of them, so the phone's two
  // poles are not twins), a stem that tiles, sprigs for its nodes and a tuft
  // at its foot. The pole's centre is x 0 in every one.
  "bamboo-top": "-84 -236 98 209",
  "bamboo-top-b": "-84 -236 98 209",
  "bamboo-stem": "-12 -243 24 216",
  "bamboo-sprig": "-40 -12 42 40",
  "bamboo-sprig-b": "-40 -12 42 40",
  "bamboo-tuft": "-36 -30 72 34",
  // The ground past the paddy's ends, from 1024: a strip that tiles.
  "bank-grass": "0 0 420 30",
  // The pine's bare trunk runs on to y 2600, so it reaches the ground from
  // 640 to 1023 however tall the section is.
  pine: "1260 80 180 2520",
  // The paddy (round 24): one unit a pixel, the wide board from 1024, the
  // phone's below; the wake is in the buffalo's units, half a box on.
  paddy: "0 0 750 190",
  "paddy-water": "0 0 750 190",
  "paddy-phone": "0 0 840 150",
  "paddy-phone-water": "0 0 840 150",
  "paddy-wake": "125 0 250 104",
  "buffalo-plow": "0 0 250 104",
  "buffalo-sleep": "0 0 250 104",
  "offduty-day": "0 0 150 84",
  "offduty-night": "0 0 150 84",
  "tag-rice": "0 0 150 88",
  "tag-flytrap": "0 0 150 88",
  "tag-book": "0 0 150 88",
  "tag-laptop": "0 0 150 88",
  "non-la": "44 370 120 130",
  "sky-day": "0 0 1440 900",
  "sky-night": "0 0 1440 900",
  morning: "406 774 128 110",
  evening: "406 774 128 110",
  // Header
  "nav-torn": "0 0 240 10",
  "nav-swash": "0 0 120 12",
  "nav-sun": "0 0 40 40",
  "nav-moon": "0 0 40 40",
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
  "stamp-wear": "0 0 200 124",
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
  "stamp-bank": "0 0 92 40",
  "stamp-card": "0 0 92 40",
  "stamp-code": "0 0 92 40",
  "stamp-cart": "0 0 92 40",
  "diary-selftaught": "0 0 130 142",
  "diary-cap": "0 0 120 80",
  "diary-podium": "0 0 140 80",
  // The Diary as a book (round 24)
  "diary-grain": "0 0 180 180",
  "diary-cloth": "0 0 6 6",
  "diary-ribbon": "0 0 18 124",
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
const INK = ["bamboo", "bamboo-top", "bamboo-top-b", "bamboo-stem", "bamboo-sprig", "bamboo-sprig-b", "bamboo-tuft", "bank-grass", "pine", "paddy", "paddy-water", "paddy-phone", "paddy-phone-water", "paddy-wake", "buffalo-plow", "buffalo-sleep", "tag-rice", "tag-flytrap", "tag-book", "tag-laptop", "oak", "oak-leaves", "oak-moss", "oak-trunk", "oak-trunk-leaves", "oak-trunk-moss", "oak-roots", "oak-bough", "oak-bough-leaves", "journey-rice", /* Header */ "nav-torn", "nav-swash", "nav-sun", "nav-moon", /* Contact */ "postmark", "stamp-wear", /* Record */ "stamp-bank", "stamp-card", "stamp-code", "stamp-cart", "diary-selftaught", "diary-cap", "diary-podium", "diary-grain", "diary-cloth", "diary-ribbon", /* Weather */ "plane", "ufo", "leaf", "cloud", "cloud-line", "bolt", "rain", "snow"];

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

  it("nothing is planted where the buffalo stands, on either paddy", () => {
    // She is drawn over the field at less than full ink, so a clump behind
    // her would show through her. Each clump's path starts at its base.
    for (const [stem, board] of [["paddy", PADDY.wide], ["paddy-phone", PADDY.phone]] as const) {
      const plants = [...files[stem].matchAll(/<path d="([^"]*)" stroke-width="0?\.85"\/>|<path d="([^"]*)" stroke-width="1\.15"\/>/g)];
      const bases = plants.flatMap((m) => [...(m[1] ?? m[2]).matchAll(/M(-?\d*\.?\d+) ?(-?\d*\.?\d+)/g)].map((b) => [+b[1], +b[2]]));
      expect(bases.length, stem).toBeGreaterThan(100);
      for (const [x, y] of bases) {
        const inside = board.clear.some(([x0, y0, x1, y1]) => x > x0 && x < x1 && y > y0 && y < y1);
        expect(inside, `${stem}: a clump at ${x},${y}`).toBe(false);
      }
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

describe("the yard's bamboo (round 25)", () => {
  // A pole has to reach the ground at any section height, so its stem is a
  // tile. It only tiles if it is dead straight, one width, and cut where a
  // culm is nothing but its two edges: mid-internode.
  const box = (stem: string) => files[stem].match(/viewBox="([^"]+)"/)![1].split(" ").map(Number);
  const edges = (stem: string) => [...files[stem].matchAll(/<path d="M(-?[\d.]+) (-?[\d.]+)Q(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)M/g)].map((m) => m.slice(1).map(Number));

  it("the stem is a whole number of internodes, cut mid-internode", () => {
    const [x, y, w, h] = box("bamboo-stem");
    expect(h).toBe(POLE.tile * POLE.step);
    expect(y).toBe(-POLE.tile * POLE.step - POLE.step / 2);
    expect(x).toBe(-w / 2);
    // Every internode's left edge is the same curve, one step apart.
    const culm = edges("bamboo-stem");
    expect(culm).toHaveLength(POLE.tile + 1);
    culm.forEach(([x0, y0, cx, , x1], i) => {
      expect([x0, cx, x1]).toEqual([culm[0][0], culm[0][2], culm[0][4]]);
      expect(y0).toBeCloseTo(-i * POLE.step, 6);
    });
    // The tile's top and bottom edges fall mid-internode, not on a node.
    for (const cut of [y, y + h]) expect(Math.abs(cut % POLE.step)).toBe(POLE.step / 2);
  });

  it("the crowns end where the stem's tile begins, at the same width", () => {
    for (const crown of ["bamboo-top", "bamboo-top-b"]) {
      const [, y, , h] = box(crown);
      expect(y + h, crown).toBe(-POLE.step / 2);
      expect(edges(crown)[0].slice(0, 1), crown).toEqual(edges("bamboo-stem")[0].slice(0, 1));
    }
    expect(files["bamboo-top"]).not.toBe(files["bamboo-top-b"]);
  });

  it("the pine's trunk runs on far below its branches", () => {
    const [, y, , h] = box("pine");
    expect(y + h).toBeGreaterThanOrEqual(2400);
    expect(files.pine).toContain(`V${y + h}`);
  });

  it("the bank grass tiles: nothing is drawn across its ends", () => {
    const xs = [...files["bank-grass"].matchAll(/<path d="M(-?[\d.]+) [\d.]+(?:Q(-?[\d.]+) [\d.]+ (-?[\d.]+) [\d.]+|h([\d.]+))"/g)].flatMap((m) =>
      m[4] ? [+m[1], +m[1] + +m[4]] : [+m[1], +m[2], +m[3]],
    );
    expect(xs.length).toBeGreaterThan(40);
    expect(Math.min(...xs)).toBeGreaterThan(1);
    expect(Math.max(...xs)).toBeLessThan(GRASS.W - 1);
  });
});

describe("the postcard's stamp wear (round 24)", () => {
  // The holes of one even-odd path: each is a polygon written `M x y l ...Z`.
  const [, d] = files["stamp-wear"].match(/ d="([^"]+)"/)!;
  const holes = [...d.matchAll(/Z?M([\d.]+) ([\d.]+)/g)].slice(1).map((m) => ({ x: +m[1], y: +m[2] }));

  it("is one sheet that reaches every edge, stretched over the stamp's box", () => {
    expect(files["stamp-wear"]).toContain('preserveAspectRatio="none"');
    expect(files["stamp-wear"]).toContain('fill-rule="evenodd"');
    expect(d.startsWith("M0 0H200V124H0Z")).toBe(true);
  });

  it("wears at the rim and leaves the middle, where the words are, mostly whole", () => {
    const [W, H] = [200, 124];
    const inCore = (h: { x: number; y: number }) => h.x > 45 && h.x < 155 && h.y > 28 && h.y < 96;
    const inRim = (h: { x: number; y: number }) => Math.min(h.x, W - h.x, h.y, H - h.y) < 8;
    const coreDensity = holes.filter(inCore).length / (110 * 68);
    const rimDensity = holes.filter(inRim).length / (W * H - 184 * 108);
    expect(holes.length).toBeGreaterThan(150);
    expect(rimDensity).toBeGreaterThan(coreDensity * 3);
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
