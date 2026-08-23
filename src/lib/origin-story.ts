import { careerEntries, origin } from "@/content/portfolio";
import { careerYearSpan } from "@/lib/knowledge-tree";
import type { CareerEntry, CareerEntryType } from "@/types/portfolio";

/**
 * The origin story: one flight authored (`origin`, above), every season
 * computed from the same career entries the timeline already renders.
 *
 * A "season" is a year of the career, told as weather: a year with a
 * milestone is a storm, a year with schooling is rain, a plain working year
 * is sun, and a year with nothing on record is quiet underground growth. The
 * mapping is a deliberate metaphor, not a measurement — but the *counts*
 * behind it are real, read straight off `careerEntries.sortKey`, never typed
 * in twice. Changing what a season says means changing the content layer,
 * the same discipline `companion-facts.ts` and `knowledge-tree.ts` already
 * hold to.
 *
 * Pure and server-safe: no `Date`, no `Math.random`, nothing but arithmetic
 * over `src/content/portfolio.ts`. Years come from `sortKey` so the story
 * never drifts from "today" between builds — see `careerYearSpan`'s note on
 * exactly this.
 */

/*
 * `careerEntries` is declared with `satisfies`, which keeps `type` narrowed
 * to the literal union at the content layer. Widening once here, at the
 * boundary — the same idiom `knowledge-tree.ts` uses — gives this module the
 * ordinary array it needs to filter by year and by type.
 */
const ENTRIES: readonly CareerEntry[] = careerEntries;

/** How many entries of each kind land in a given season's year. */
export interface SeasonForces {
  readonly learning: number;
  readonly work: number;
  readonly milestones: number;
}

export type SeasonKind = "rain" | "sun" | "storm" | "quiet";

export interface Season {
  readonly year: number;
  readonly forces: SeasonForces;
  readonly kind: SeasonKind;
  /** Authored copy around computed counts. Always starts with the year,
   *  never a place name — see `tests/lib/origin-story.test.ts`. */
  readonly caption: string;
}

/** Every caption's hard ceiling — the player's status region reads these
 *  aloud, so they stay a sentence, not a paragraph. */
export const CAPTION_MAX_CHARS = 72;

function countOf(entries: readonly CareerEntry[], type: CareerEntryType): number {
  return entries.filter((entry) => entry.type === type).length;
}

/**
 * The precedence a season's weather follows when more than one kind of thing
 * happened that year: a hard-won milestone reads as a storm even in a year
 * that was mostly quiet otherwise; failing that, schooling reads as rain;
 * failing that, plain work reads as sun; a year with nothing on record is
 * quiet growth underground.
 *
 * Exported on its own so the precedence rule can be proven against crafted
 * `SeasonForces` rather than needing real content to happen to produce every
 * combination — see `tests/lib/origin-story.test.ts`.
 */
export function kindFor(forces: SeasonForces): SeasonKind {
  if (forces.milestones > 0) return "storm";
  if (forces.learning > 0) return "rain";
  if (forces.work > 0) return "sun";
  return "quiet";
}

function captionFor(year: number, forces: SeasonForces, kind: SeasonKind): string {
  switch (kind) {
    case "storm":
      return `${year} — a storm year: ${forces.milestones} hard-won ${
        forces.milestones === 1 ? "milestone" : "milestones"
      }`;
    case "rain":
      return `${year} — rain for the roots: education underway`;
    case "sun":
      return `${year} — steady sun: ${forces.work} working ${
        forces.work === 1 ? "season" : "seasons"
      }`;
    case "quiet":
      return `${year} — quiet growth underground`;
  }
}

/**
 * One `Season` per year from the flight's landing (`origin.arrivedYear`)
 * through the last year the career timeline records (`careerYearSpan().
 * lastYear`), inclusive. A year with no career entry at all still gets a
 * season — it is the "quiet growth underground" a reader sees rather than a
 * gap in the tree.
 */
export function seasonsFor(): readonly Season[] {
  const { lastYear } = careerYearSpan();
  const seasons: Season[] = [];

  for (let year = origin.arrivedYear; year <= lastYear; year++) {
    const inYear = ENTRIES.filter((entry) => Number(entry.sortKey.slice(0, 4)) === year);
    const forces: SeasonForces = {
      learning: countOf(inYear, "learning"),
      work: countOf(inYear, "work"),
      milestones: countOf(inYear, "milestone"),
    };
    const kind = kindFor(forces);
    seasons.push({ year, forces, kind, caption: captionFor(year, forces, kind) });
  }

  return seasons;
}

/**
 * How far into the career's growth a given year is, as 0..1: 0 at the flight
 * landing, 1 at the last year the timeline records. Clamped outside that
 * span so a caller never has to guard against a stray negative or an
 * overshoot past a fully-grown tree.
 */
export function growthStage(year: number): number {
  const { lastYear } = careerYearSpan();
  const span = lastYear - origin.arrivedYear;
  if (span <= 0) return year <= origin.arrivedYear ? 0 : 1;
  const stage = (year - origin.arrivedYear) / span;
  return Math.min(1, Math.max(0, stage));
}
