import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { REACTIONS as DRAWN } from "../../scripts/draw-cats.mjs";
import { REACTIONS, frameFor, lookCell } from "@/components/companion/CompanionCat";

const DIR = "public/cats";

describe("the cats' sprite sheets", () => {
  it("the committed sheets are exactly today's draw", async () => {
    const { drawCats } = await import("../../scripts/draw-cats.mjs");
    const files = drawCats();
    for (const [stem, svg] of Object.entries(files)) {
      expect(readFileSync(`${DIR}/${stem}.svg`, "utf8"), `${stem}.svg is stale: run pnpm draw:cats`).toBe(svg);
    }
    expect(readdirSync(DIR).sort()).toEqual(Object.keys(files).map((s) => `${s}.svg`).sort());
  });

  it("each live cat carries every frame the renderer can ask for", () => {
    for (const stem of ["moon", "mi"]) {
      const svg = readFileSync(`${DIR}/${stem}.svg`, "utf8");
      const ids = [
        "tail",
        "tail-puff",
        ...Array.from({ length: 9 }, (_, i) => `look-${i}`),
        ...Array.from({ length: 9 }, (_, i) => `react-${i}`),
        ...Array.from({ length: 8 }, (_, i) => `walk-${i}`),
      ];
      for (const id of ids) expect(svg, `${stem}#${id}`).toContain(`<symbol id="${id}"`);
    }
  });

  it("the police sheet holds what an escort draws", () => {
    const svg = readFileSync(`${DIR}/police.svg`, "utf8");
    for (const id of ["tail", "look-4", ...Array.from({ length: 8 }, (_, i) => `walk-${i}`)]) {
      expect(svg).toContain(`<symbol id="${id}"`);
    }
  });

  it("names the reactions in the order they are drawn", () => {
    expect([...REACTIONS]).toEqual(DRAWN);
  });

  it("paints only through the page's colours", () => {
    for (const stem of ["moon", "mi", "police"]) {
      const svg = readFileSync(`${DIR}/${stem}.svg`, "utf8");
      // Every literal colour is a var() fallback for the file opened on its own.
      const literals = svg.match(/#[0-9a-f]{3,6}\b/gi) ?? [];
      const fallbacks = svg.match(/var\(--cat-(coat|sock),#[0-9a-f]{3,6}\)/gi) ?? [];
      expect(literals.length).toBe(fallbacks.length);
    }
  });
});

describe("frameFor", () => {
  it("walks through eight frames on the gait's phase", () => {
    expect(frameFor({ pose: "walk", phase: 0 }).id).toBe("walk-0");
    expect(frameFor({ pose: "walk", phase: 0.5 }).id).toBe("walk-4");
    expect(frameFor({ pose: "walk", phase: 0.99 }).id).toBe("walk-7");
  });

  it("draws a sitting cat with its head where it looks, and a tail to sway", () => {
    expect(frameFor({ pose: "sit", phase: 0 })).toEqual({ id: "look-4", tail: "tail" });
    expect(frameFor({ pose: "sit", phase: 0, look: 2 })).toEqual({ id: "look-2", tail: "tail" });
  });

  it("a blink, a flick and the scene poses are reaction cells", () => {
    expect(frameFor({ pose: "sit", phase: 0, blinking: true }).id).toBe("react-0");
    expect(frameFor({ pose: "sit", phase: 0, flick: 0.5 }).id).toBe("look-3");
    expect(frameFor({ pose: "stretch", phase: 0 })).toEqual({ id: "react-4", tail: null });
    expect(frameFor({ pose: "groom", phase: 0 }).id).toBe("react-5");
    expect(frameFor({ pose: "bat", phase: 0 }).id).toBe("react-6");
    expect(frameFor({ pose: "eat", phase: 0 }).id).toBe("react-7");
    expect(frameFor({ pose: "sleep", phase: 0 })).toEqual({ id: "react-8", tail: null });
  });

  it("a held reaction outranks the pose, and a startle puffs the tail", () => {
    expect(frameFor({ pose: "sit", phase: 0, react: "startle" })).toEqual({ id: "react-3", tail: "tail-puff" });
    expect(frameFor({ pose: "walk", phase: 0.2, react: "purr" }).id).toBe("react-2");
  });
});

describe("lookCell", () => {
  const cat = { left: 100, top: 100, width: 50, height: 42 };
  const centre = { x: 125, y: 121 };
  it("looks at you inside the dead zone", () => {
    expect(lookCell(cat, centre, 1)).toBe(4);
    expect(lookCell(cat, { x: centre.x + 20, y: centre.y + 10 }, 1)).toBe(4);
  });

  it("turns to the pointer's side, mirrored for a cat facing left", () => {
    expect(lookCell(cat, { x: centre.x + 300, y: centre.y }, 1)).toBe(5);
    expect(lookCell(cat, { x: centre.x + 300, y: centre.y }, -1)).toBe(3);
    expect(lookCell(cat, { x: centre.x, y: centre.y - 300 }, 1)).toBe(1);
    expect(lookCell(cat, { x: centre.x - 200, y: centre.y + 200 }, 1)).toBe(6);
  });
});
