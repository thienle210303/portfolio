import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const SELF = resolve(__filename);
const EXT = /\.(ts|tsx|mjs|css)$/;
const GONE =
  /@\/lib\/globe|origin-stops|sections\/Worlds|coastline|crossingKm|buildStops|originStops|GeoPoint|bake:coastline/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : EXT.test(name) ? [p] : [];
  });
}

describe("the globe is gone", () => {
  it("nothing under src, scripts, e2e or tests names the globe engine", () => {
    const hits = ["src", "scripts", "e2e", "tests"]
      .flatMap((d) => walk(join(ROOT, d)))
      .filter((f) => resolve(f) !== SELF && GONE.test(readFileSync(f, "utf8")));
    expect(hits.map((f) => f.slice(ROOT.length + 1))).toEqual([]);
    expect(existsSync(join(ROOT, "public/globe"))).toBe(false);
  });
});
