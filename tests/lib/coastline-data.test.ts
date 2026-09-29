import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COASTLINES } from "@/sections/Worlds/coastline-data";

describe("COASTLINES", () => {
  it("has enough rings to look like a planet", () => {
    expect(COASTLINES.length).toBeGreaterThan(50);
  });

  it("stores each ring as flat lon/lat pairs", () => {
    for (const ring of COASTLINES) {
      expect(ring.length % 2).toBe(0);
      expect(ring.length).toBeGreaterThanOrEqual(6); // at least a triangle
    }
  });

  it("keeps every coordinate inside the real world", () => {
    for (const ring of COASTLINES) {
      for (let i = 0; i < ring.length; i += 2) {
        expect(Math.abs(ring[i])).toBeLessThanOrEqual(180);
        expect(Math.abs(ring[i + 1])).toBeLessThanOrEqual(90);
      }
    }
  });

  it("stays small enough to be worth shipping", () => {
    const points = COASTLINES.reduce((total, ring) => total + ring.length / 2, 0);
    // The whole argument for a hand-simplified 110m set rather than a
    // dependency. If a regeneration blows past this, the globe stops being
    // cheap and the budget conversation has to happen again.
    expect(points).toBeLessThan(12_000);
  });
});

describe("the import fence", () => {
  // Unskipped in Task 8, which filled in the one file allowed to import this.
  it("is imported by GlobeCanvas and nothing else", () => {
    // 53 KB of raw data is affordable in one lazily imported chunk and
    // nowhere else. A server component that imports this — even for a type —
    // puts all of it in the initial bundle, and nothing in the test suite
    // would otherwise notice until `pnpm perf` was run by hand.
    //
    // node:fs globSync is Node 22+; @types/node is pinned to ^20 here (see
    // package.json), so this walks the tree with readdirSync({ recursive })
    // instead, per the task brief’s documented fallback.
    const root = join(process.cwd(), "src");
    const entries = readdirSync(root, { recursive: true, encoding: "utf8" });
    const sources = entries.filter((entry) => /\.(ts|tsx)$/.test(entry));
    const importers = sources.filter((entry) => {
      if (entry.endsWith("coastline-data.ts")) return false;
      const contents = readFileSync(join(root, entry), "utf8");
      return /from\s+["'][^"']*coastline-data["']/.test(contents);
    });
    expect(importers.map((entry) => "src/" + entry.replace(/\\/g, "/"))).toEqual([
      "src/sections/Worlds/GlobeCanvas.tsx",
    ]);
  });
});
