import { describe, expect, it } from "vitest";
import { careerEntries, origin } from "@/content/portfolio";
import { careerYearSpan } from "@/lib/knowledge-tree";
import {
  arrivedAge,
  arrivedOnAgreesWithArrived,
  CAPTION_MAX_CHARS,
  dueByElapsed,
  firstCanopyYear,
  growthStage,
  kindFor,
  LEAF_POP_MS,
  ORDINARY_DUR_MS,
  planRelease,
  seasonsFor,
  STAGGER_STEP_MS,
  TIER_BRANCH,
  TIER_LEAF,
  TIER_TRUNK,
  TRUNK_RISE_MS,
  type SeasonForces,
  type StaggerCandidate,
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

/**
 * `firstCanopyYear` is DrawnTree's name for the same fact `careerYearSpan`
 * already computes — the earliest year any lens-tagged entry appears. It is
 * not a second computation to keep in sync by hand; it has to equal
 * `careerYearSpan().firstYear` outright.
 */
describe("firstCanopyYear", () => {
  it("equals careerYearSpan().firstYear", () => {
    expect(firstCanopyYear()).toBe(careerYearSpan().firstYear);
  });
});

/**
 * `planRelease` and `dueByElapsed` are the pure clock math behind
 * `OriginStory.tsx`'s single rAF master clock (round 10): given the same
 * inputs they always answer the same way, with no DOM, no timer, and no
 * side effect — which is exactly what makes "does the growth choreography
 * stay correct under this rule" finally provable without driving a real
 * browser. `key` is a plain string in every test here (never an
 * `HTMLElement`) precisely because these functions do not care what the key
 * *is*, only that it is stable identity — `OriginStory.tsx` supplies a real
 * `HTMLElement` at runtime.
 */
describe("planRelease", () => {
  const zero = new Set<string>();

  function candidate(
    key: string,
    year: number,
    tier: number,
    extra: Partial<Pick<StaggerCandidate<string>, "isTrunk" | "isShoot">> = {},
  ): StaggerCandidate<string> {
    return { key, year, tier, isTrunk: false, isShoot: false, ...extra };
  }

  it("orders trunk before branch before leaf, regardless of input order", () => {
    const candidates = [
      candidate("leaf", 2020, TIER_LEAF),
      candidate("trunk", 2020, TIER_TRUNK, { isTrunk: true }),
      candidate("branch", 2020, TIER_BRANCH),
    ];
    const plan = planRelease(candidates, 2020, zero);
    expect(plan.map((entry) => entry.key)).toEqual(["trunk", "branch", "leaf"]);
  });

  it("stable-sorts within a tier: same-tier candidates keep their input order", () => {
    const candidates = [
      candidate("branch-b", 2020, TIER_BRANCH),
      candidate("branch-a", 2020, TIER_BRANCH),
      candidate("branch-c", 2020, TIER_BRANCH),
    ];
    const plan = planRelease(candidates, 2020, zero);
    expect(plan.map((entry) => entry.key)).toEqual(["branch-b", "branch-a", "branch-c"]);
  });

  it("staggers each entry STAGGER_STEP_MS past the one before it, by plan order", () => {
    const candidates = [
      candidate("trunk", 2020, TIER_TRUNK, { isTrunk: true }),
      candidate("branch", 2020, TIER_BRANCH),
      candidate("leaf", 2020, TIER_LEAF),
    ];
    const plan = planRelease(candidates, 2020, zero);
    expect(plan.map((entry) => entry.delayMs)).toEqual([0, STAGGER_STEP_MS, STAGGER_STEP_MS * 2]);
  });

  it("gives the trunk its hero rise, a leaf its quick pop, and everything else the ordinary duration", () => {
    const candidates = [
      candidate("trunk", 2020, TIER_TRUNK, { isTrunk: true }),
      candidate("branch", 2020, TIER_BRANCH),
      candidate("leaf", 2020, TIER_LEAF),
    ];
    const plan = planRelease(candidates, 2020, zero);
    const byKey = new Map(plan.map((entry) => [entry.key, entry.durationMs]));
    expect(byKey.get("trunk")).toBe(TRUNK_RISE_MS);
    expect(byKey.get("branch")).toBe(ORDINARY_DUR_MS);
    expect(byKey.get("leaf")).toBe(LEAF_POP_MS);
  });

  it("never plans the shoot — that always waits for its own beat", () => {
    const candidates = [candidate("shoot", 2020, TIER_LEAF, { isShoot: true })];
    expect(planRelease(candidates, 2025, zero)).toEqual([]);
  });

  it("excludes a key already claimed, even if it would otherwise be due", () => {
    const candidates = [candidate("a", 2020, TIER_BRANCH)];
    expect(planRelease(candidates, 2020, new Set(["a"]))).toEqual([]);
  });

  it("excludes anything dated after the cutoff year", () => {
    const candidates = [candidate("early", 2019, TIER_BRANCH), candidate("late", 2021, TIER_BRANCH)];
    const plan = planRelease(candidates, 2020, zero);
    expect(plan.map((entry) => entry.key)).toEqual(["early"]);
  });

  it("treats a non-finite year as always due, rather than never due", () => {
    const candidates = [candidate("nan", Number.NaN, TIER_BRANCH)];
    const plan = planRelease(candidates, 1900, zero);
    expect(plan.map((entry) => entry.key)).toEqual(["nan"]);
  });

  it("is pure: the same inputs always produce the same plan", () => {
    const candidates = [
      candidate("trunk", 2020, TIER_TRUNK, { isTrunk: true }),
      candidate("leaf", 2020, TIER_LEAF),
    ];
    expect(planRelease(candidates, 2020, zero)).toEqual(planRelease(candidates, 2020, zero));
  });
});

describe("origin, as the globe's two pins", () => {
  it("names the place at province level, with no city", () => {
    expect(origin.from).toBe("Kiên Giang, Việt Nam");
    expect(origin.from).not.toContain("Rạch Giá");
  });

  it("carries coordinates for both ends of the crossing", () => {
    expect(origin.coordinates.from.lat).toBeCloseTo(10.0, 1);
    expect(origin.coordinates.from.lon).toBeCloseTo(105.1, 1);
    // Taylors, South Carolina (34°54′48″N 82°18′39″W, sourced in the content
    // layer). This was the country centroid (39.83, -98.58) until round 18
    // authored a city.
    expect(origin.coordinates.to.lat).toBeCloseTo(34.9133, 3);
    expect(origin.coordinates.to.lon).toBeCloseTo(-82.3108, 3);
  });

  it("keeps latitudes and longitudes inside the real world", () => {
    for (const point of [origin.coordinates.from, origin.coordinates.to]) {
      expect(Math.abs(point.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(point.lon)).toBeLessThanOrEqual(180);
    }
  });
});

describe("dueByElapsed", () => {
  const plan = [
    { key: "a", delayMs: 0, durationMs: ORDINARY_DUR_MS },
    { key: "b", delayMs: STAGGER_STEP_MS, durationMs: ORDINARY_DUR_MS },
    { key: "c", delayMs: STAGGER_STEP_MS * 2, durationMs: ORDINARY_DUR_MS },
  ];

  it("returns nothing before the first entry's own delay has elapsed", () => {
    expect(dueByElapsed(plan, -1)).toEqual([]);
  });

  it("returns exactly the entries whose delay has elapsed, in plan order", () => {
    expect(dueByElapsed(plan, 0).map((entry) => entry.key)).toEqual(["a"]);
    expect(dueByElapsed(plan, STAGGER_STEP_MS).map((entry) => entry.key)).toEqual(["a", "b"]);
    expect(dueByElapsed(plan, STAGGER_STEP_MS * 2).map((entry) => entry.key)).toEqual(["a", "b", "c"]);
  });

  it("returns the whole plan once elapsed time is well past the last delay", () => {
    expect(dueByElapsed(plan, STAGGER_STEP_MS * 100)).toHaveLength(plan.length);
  });

  it("is a pure, repeatable read: the same plan and elapsed time always answer the same way", () => {
    expect(dueByElapsed(plan, STAGGER_STEP_MS)).toEqual(dueByElapsed(plan, STAGGER_STEP_MS));
  });

  it("never mutates the plan it was given", () => {
    const before = JSON.stringify(plan);
    dueByElapsed(plan, STAGGER_STEP_MS * 2);
    expect(JSON.stringify(plan)).toBe(before);
  });
});

describe("the crossing's own arithmetic", () => {
  it("computes his age on arrival rather than carrying a number", () => {
    // Born 2003-03-03, arrived 2018-12. Fifteen, and nothing in the content
    // layer says "15" — if it did, a birthday would silently make it wrong.
    expect(arrivedAge()).toBe(15);
    expect(JSON.stringify(origin)).not.toContain('"arrivedAge"');
  });

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
