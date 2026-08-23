import { describe, expect, it } from "vitest";
import { careerEntries, origin } from "@/content/portfolio";
import { careerYearSpan } from "@/lib/knowledge-tree";
import {
  CAPTION_MAX_CHARS,
  growthStage,
  kindFor,
  seasonsFor,
  type SeasonForces,
} from "@/lib/origin-story";
import type { CareerEntry } from "@/types/portfolio";

// Widened for the same reason knowledge-tree.ts widens it — see the note there.
const ENTRIES: readonly CareerEntry[] = careerEntries;

/**
 * `seasonsFor` is only trustworthy if every count it produces matches an
 * independent recomputation from `src/content/portfolio.ts` — otherwise it is
 * just a second, differently-typed guess at a number the content already
 * states. Each assertion below recomputes its figure straight from
 * `careerEntries` rather than trusting the module under test to have done it
 * correctly, on purpose.
 */
describe("seasonsFor", () => {
  const seasons = seasonsFor();
  const { lastYear } = careerYearSpan();

  it("starts the year the flight landed and ends at the career's last year", () => {
    expect(seasons[0]?.year).toBe(origin.arrivedYear);
    expect(seasons[seasons.length - 1]?.year).toBe(lastYear);
  });

  it("is one season per year, consecutive, with no gaps", () => {
    for (let i = 1; i < seasons.length; i++) {
      expect(seasons[i].year).toBe(seasons[i - 1].year + 1);
    }
    expect(seasons.length).toBe(lastYear - origin.arrivedYear + 1);
  });

  it("counts each year's forces from the real career entries, not a guess", () => {
    for (const season of seasons) {
      const inYear = ENTRIES.filter(
        (entry) => Number(entry.sortKey.slice(0, 4)) === season.year,
      );
      expect(season.forces.learning, `${season.year} learning`).toBe(
        inYear.filter((entry) => entry.type === "learning").length,
      );
      expect(season.forces.work, `${season.year} work`).toBe(
        inYear.filter((entry) => entry.type === "work").length,
      );
      expect(season.forces.milestones, `${season.year} milestones`).toBe(
        inYear.filter((entry) => entry.type === "milestone").length,
      );
    }
  });

  it("finds a real storm year: 2024 has milestones on record", () => {
    const year2024 = seasons.find((season) => season.year === 2024);
    expect(year2024?.forces.milestones).toBeGreaterThan(0);
    expect(year2024?.kind).toBe("storm");
  });

  it("keeps every caption inside budget, year-led, and free of place names", () => {
    for (const season of seasons) {
      expect(season.caption.length, `${season.year}: "${season.caption}"`).toBeLessThanOrEqual(
        CAPTION_MAX_CHARS,
      );
      expect(season.caption.startsWith(String(season.year)), season.caption).toBe(true);
      expect(season.caption).not.toMatch(/Rạch|Việt|Taylors|Columbia|Cheraw/);
    }
  });
});

/**
 * `kindFor` carries the precedence rule in isolation, so it can be proven
 * against crafted forces without needing real content to happen to produce
 * every combination.
 */
describe("kindFor", () => {
  const zero: SeasonForces = { learning: 0, work: 0, milestones: 0 };

  it("puts milestones ahead of everything else", () => {
    expect(kindFor({ ...zero, milestones: 1, learning: 5, work: 5 })).toBe("storm");
  });

  it("puts learning ahead of work when there is no milestone", () => {
    expect(kindFor({ ...zero, learning: 1, work: 5 })).toBe("rain");
  });

  it("falls back to work when there is neither a milestone nor learning", () => {
    expect(kindFor({ ...zero, work: 1 })).toBe("sun");
  });

  it("is quiet when nothing happened that year", () => {
    expect(kindFor(zero)).toBe("quiet");
  });
});

describe("growthStage", () => {
  const { lastYear } = careerYearSpan();

  it("is 0 at arrival and 1 at the career's last year", () => {
    expect(growthStage(origin.arrivedYear)).toBe(0);
    expect(growthStage(lastYear)).toBe(1);
  });

  it("is monotonically non-decreasing across the span", () => {
    let previous = growthStage(origin.arrivedYear);
    for (let year = origin.arrivedYear + 1; year <= lastYear; year++) {
      const stage = growthStage(year);
      expect(stage).toBeGreaterThanOrEqual(previous);
      previous = stage;
    }
  });

  it("clamps outside the span instead of going negative or past 1", () => {
    expect(growthStage(origin.arrivedYear - 5)).toBe(0);
    expect(growthStage(lastYear + 5)).toBe(1);
  });
});
