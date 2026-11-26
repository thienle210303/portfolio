import { describe, expect, it } from "vitest";
import { careerEntries, highlights, projects } from "@/content/portfolio";
import { buildHighlights, buildTickets } from "@/lib/highlights";
import type { CareerEntry } from "@/types/portfolio";
import { figureTokens, hasToken } from "./figures";

const ENTRIES: readonly CareerEntry[] = careerEntries;
const byId = (id: string) => ENTRIES.find((e) => e.id === id)!;

describe("buildHighlights", () => {
  it("six highlights in order", () => {
    expect(buildHighlights().map((h) => h.entryId)).toEqual([
      "doordash",
      "doordash",
      "wordification",
      "schaeffler",
      "usc-scraping",
      "usc-ta",
    ]);
    expect(buildHighlights().map((h) => h.year)).toEqual(["2025", "2026", "2024", "2024", "2022", "2023"]);
  });

  it("an authored year falls inside its entry", () => {
    for (const h of highlights) {
      if (!("year" in h)) continue;
      const e = byId(h.entryId);
      expect(h.year >= e.sortKey.slice(0, 4), h.entryId).toBe(true);
      expect(h.year <= (e.endSortKey?.slice(0, 4) ?? String(new Date().getFullYear())), h.entryId).toBe(true);
    }
  });

  it("the tag name is the entry's own", () => {
    for (const h of buildHighlights()) {
      const org = byId(h.entryId).organization;
      const first = h.name.split(" ")[0];
      const initials = org.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).join("");
      const words = org.split(/[\s,.]+/);
      expect(words.includes(first) || first === initials, `${h.name} / ${org}`).toBe(true);
    }
  });

  it("a tag with a case study opens its page; the rest their Diary page", () => {
    // Owner, 2026-10-20: the 2 → 25 workflow is "The one-hour feasibility
    // question". Round 32: every tag whose figure is a shown case study's opens
    // that case study's page, /work/<id>; the others open the entry's page.
    const all = buildHighlights();
    const byValue = Object.fromEntries(all.map((h) => [h.value, h.href]));
    expect(byValue).toEqual({
      "17h → 3m": "/work/dd-scraper-platform",
      "2 → 25": "/work/dd-feasibility-agent",
      "99.9%": "#journey-entry-wordification",
      "96%": "/work/schaeffler-setup-sheets",
      "3M+": "/work/usc-research-collection",
      "200+": "#journey-entry-usc-ta",
    });
    for (const h of all.filter((x) => x.projectId)) {
      const project = projects.find((p) => p.id === h.projectId);
      expect(project?.careerEntryId, h.value).toBe(h.entryId);
      expect(project?.featured, `${h.projectId} has no page`).toBe(true);
    }
  });

  it("tickets group one entry's halves", () => {
    const tickets = buildTickets();
    expect(tickets).toHaveLength(5);
    expect(tickets[0].name).toBe("DoorDash");
    expect(tickets[0].href).toBe("/work/dd-scraper-platform");
    expect(tickets[0].halves.map((h) => h.value)).toEqual(["17h → 3m", "2 → 25"]);
    for (const t of tickets.slice(1)) expect(t.halves).toHaveLength(1);
    for (const t of tickets) for (const h of t.halves) expect(h.name).toBe(t.name);
  });

  it("every figure in a value or label appears, in the same suffix form, in its entry's headline or impact", () => {
    // 17h / 3m are spelled out as "17 hours" / "3 minutes" before matching.
    for (const h of buildHighlights()) {
      const e = byId(h.entryId);
      const source = `${e.headline ?? ""} ${e.impact.join(" ")}`;
      // The prose says "failures 3.9% to zero"; the ticket says "0%".
      const source0 = source.replace(/\bzero\b/g, "0%");
      const mine = figureTokens(`${h.value} ${h.measure ?? ""} ${h.label}`);
      expect(mine.length, h.entryId).toBeGreaterThan(0);
      for (const t of mine) expect(hasToken(source0, t), `${h.entryId}: ${t}`).toBe(true);
    }
  });

  it("labels are at most 8 words", () => {
    for (const h of buildHighlights())
      expect(h.label.split(/\s+/).length, h.entryId).toBeLessThanOrEqual(8);
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

describe("hasToken", () => {
  it("rejects a token that is only part of a longer figure or a lookalike", () => {
    expect(hasToken("Supported 2000 students", "200+")).toBe(false);
    expect(hasToken("took 117 hours", "17 hours")).toBe(false);
    expect(hasToken("99x9% accurate", "99.9%")).toBe(false);
  });

  it("accepts the real forms", () => {
    expect(hasToken("Supported 200+ students", "200+")).toBe(true);
    expect(hasToken("runtime 17 hours to 3 minutes", "17 hours")).toBe(true);
    expect(hasToken("runtime 17 hours to 3 minutes", "3 minutes")).toBe(true);
    expect(hasToken("99.9% validated audio accuracy", "99.9%")).toBe(true);
    expect(hasToken("3M+ Amazon and Kroger", "3M+")).toBe(true);
    expect(hasToken("96% increase", "96%")).toBe(true);
  });
});

