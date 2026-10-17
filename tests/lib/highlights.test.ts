import { describe, expect, it } from "vitest";
import { careerEntries } from "@/content/portfolio";
import { buildHighlights } from "@/lib/highlights";
import type { CareerEntry } from "@/types/portfolio";
import { figures } from "./figures";

const ENTRIES: readonly CareerEntry[] = careerEntries;
const byId = (id: string) => ENTRIES.find((e) => e.id === id)!;

describe("buildHighlights", () => {
  it("five highlights in order", () => {
    expect(buildHighlights().map((h) => h.entryId)).toEqual([
      "doordash",
      "wordification",
      "schaeffler",
      "usc-scraping",
      "usc-ta",
    ]);
  });

  it("every number in a value or label appears in its entry's headline or impact", () => {
    for (const h of buildHighlights()) {
      const e = byId(h.entryId);
      const own = figures(`${e.headline ?? ""} ${e.impact.join(" ")}`);
      const mine = figures(`${h.value} ${h.label}`);
      expect(mine.length, h.entryId).toBeGreaterThan(0);
      for (const n of mine) expect(own, `${h.entryId}: ${n}`).toContain(n);
    }
  });

  it("labels are at most 8 words", () => {
    for (const h of buildHighlights())
      expect(h.label.split(/\s+/).length, h.entryId).toBeLessThanOrEqual(8);
  });

  it("href points at the entry row", () => {
    for (const h of buildHighlights()) expect(h.href).toBe(`#journey-entry-${h.entryId}`);
  });

  it("year and organisation come from the entry", () => {
    const d = buildHighlights()[0];
    expect(d.year).toBe("2025");
    expect(d.organization).toBe(byId("doordash").organization);
  });

  it("throws on an unknown entryId", () => {
    expect(() => buildHighlights([])).toThrow(/doordash/);
  });
});
