import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { careerEntries } from "@/content/portfolio";
import { buildHighlights } from "@/lib/highlights";
import JourneyHighlights from "@/sections/CareerTree/JourneyHighlights";
import type { CareerEntry } from "@/types/portfolio";
import { figureTokens, hasToken } from "./figures";

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

  it("every figure in a value or label appears, in the same suffix form, in its entry's headline or impact", () => {
    // 17h / 3m are spelled out as "17 hours" / "3 minutes" before matching.
    for (const h of buildHighlights()) {
      const e = byId(h.entryId);
      const source = `${e.headline ?? ""} ${e.impact.join(" ")}`;
      const mine = figureTokens(`${h.value} ${h.label}`);
      expect(mine.length, h.entryId).toBeGreaterThan(0);
      for (const t of mine) expect(hasToken(source, t), `${h.entryId}: ${t}`).toBe(true);
    }
  });

  it("the focus outline is not drawn from inside .tone-contrast", () => {
    const html = renderToStaticMarkup(createElement(JourneyHighlights));
    const links = html.match(/<a [^>]*>/g) ?? [];
    expect(links).toHaveLength(5);
    for (const a of links) expect(a).not.toContain("tone-contrast");
    expect(html).not.toMatch(/<li[^>]*tone-contrast/);
    // The loud card exists, and only inside the link.
    expect(html.match(/tone-contrast/g)).toHaveLength(1);
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
