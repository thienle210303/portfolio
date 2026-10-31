import { describe, expect, it } from "vitest";
import { careerEntries, origin } from "@/content/portfolio";
import { careerYearSpan, stillGrowingCaption } from "@/lib/knowledge-tree";
import {
  arrivedOnAgreesWithArrived,
  CAPTION_MAX_CHARS,
  flightCaption,
  growBeats,
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

  it("carries the storm overlay independently of the base kind", () => {
    // Recomputed straight from real content (src/content/portfolio.ts),
    // the same discipline every other assertion in this describe block
    // follows. Round 18 filled the years the record used to leave empty:
    // 2018 has only high school (learning), so rain with no storm; 2019 has
    // the restaurant (work) and the self-taught stretch (learning) in a tie,
    // which reads as rain, and no milestone; 2020 is the one year with
    // nothing on record, so quiet with no storm; 2021 has the degree and the
    // first major (learning) and a milestone, so rain with a storm riding in;
    // 2022 has the research job (work) and the switch to CS (a milestone), so
    // sun with a storm; 2023/2024/2025 each have work entries and at least
    // one milestone, so sun, also with a storm.
    const expected: Record<number, { kind: string; storm: boolean }> = {
      2018: { kind: "rain", storm: false },
      2019: { kind: "rain", storm: false },
      2020: { kind: "quiet", storm: false },
      2021: { kind: "rain", storm: true },
      2022: { kind: "sun", storm: true },
      2023: { kind: "sun", storm: true },
      2024: { kind: "sun", storm: true },
      2025: { kind: "sun", storm: true },
    };
    for (const [year, want] of Object.entries(expected)) {
      const season = seasons.find((s) => s.year === Number(year));
      expect(season?.kind, `${year} kind`).toBe(want.kind);
      expect(season?.storm, `${year} storm`).toBe(want.storm);
    }
  });

  it("storm is exactly forces.milestones > 0, for every season", () => {
    for (const season of seasons) {
      expect(season.storm, `${season.year}`).toBe(season.forces.milestones > 0);
    }
  });

  it("kind is never \"storm\" — that value is reserved for the beat contract, not produced here", () => {
    for (const season of seasons) {
      expect(season.kind).not.toBe("storm");
    }
  });

  it("keeps every caption inside budget, year-led, and free of place names", () => {
    for (const season of seasons) {
      expect(season.caption.length, `${season.year}: "${season.caption}"`).toBeLessThanOrEqual(
        CAPTION_MAX_CHARS,
      );
      expect(season.caption.startsWith(String(season.year)), season.caption).toBe(true);
      expect(season.caption).not.toMatch(/Kiên|Việt|Taylors|Columbia|Cheraw/);
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

  it("is base weather only — milestones never affect it", () => {
    expect(kindFor({ ...zero, milestones: 1, learning: 5, work: 5 })).toBe("rain");
    expect(kindFor({ ...zero, milestones: 1, work: 5 })).toBe("sun");
    expect(kindFor({ ...zero, milestones: 1 })).toBe("quiet");
  });

  it("puts learning ahead of work only when learning is at least as much", () => {
    expect(kindFor({ ...zero, learning: 5, work: 1 })).toBe("rain");
    expect(kindFor({ ...zero, learning: 2, work: 2 })).toBe("rain");
  });

  it("falls back to work when work outweighs learning, or there is no learning at all", () => {
    expect(kindFor({ ...zero, learning: 1, work: 5 })).toBe("sun");
    expect(kindFor({ ...zero, work: 1 })).toBe("sun");
  });

  it("is quiet when nothing happened that year", () => {
    expect(kindFor(zero)).toBe("quiet");
  });

  it("never returns \"storm\" — that is Season.storm's job, not kindFor's", () => {
    expect(kindFor({ learning: 3, work: 3, milestones: 3 })).not.toBe("storm");
  });
});

/**
 * "Watch it grow" plays exactly these beats (`GrowOak.tsx`), so the show is
 * as true as this list: the crossing, then every season in order, then the
 * shoot that is still growing.
 */
describe("growBeats", () => {
  const beats = growBeats();
  const seasons = seasonsFor();

  it("opens on the flight, ends on the shoot, and plays every season between, in order", () => {
    expect(beats[0]).toEqual({ kind: "flight", year: null, storm: false, caption: flightCaption() });
    expect(beats.at(-1)).toEqual({ kind: "still", year: null, storm: false, caption: stillGrowingCaption() });
    expect(beats.slice(1, -1)).toEqual(
      seasons.map(({ year, kind, storm, caption }) => ({ year, kind, storm, caption })),
    );
  });

  it("composes the flight from the origin block, never a second spelling", () => {
    expect(flightCaption()).toBe(`${origin.from} → ${origin.to} · ${origin.arrived}`);
  });

  it("keeps every caption inside budget", () => {
    for (const beat of beats) expect(beat.caption.length, beat.caption).toBeLessThanOrEqual(CAPTION_MAX_CHARS);
  });
});

describe("origin", () => {
  it("names the place at province level, with no city", () => {
    expect(origin.from).toBe("Kiên Giang, Việt Nam");
    expect(origin.from).not.toContain("Rạch Giá");
  });
});

describe("the crossing's own arithmetic", () => {
  it("keeps the prose date and the machine date agreeing", () => {
    // `arrived` is what a reader sees; `arrivedOn` is what the arithmetic
    // uses. Two spellings of one fact is exactly the drift this site exists
    // to prevent, so it is asserted rather than trusted.
    expect(arrivedOnAgreesWithArrived()).toBe(true);
  });

  it("derives arrivedYear from arrivedOn rather than carrying it separately", () => {
    expect(origin.arrivedYear).toBe(Number(origin.arrivedOn.slice(0, 4)));
  });
});
