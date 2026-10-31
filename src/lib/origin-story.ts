import { careerEntries, origin } from "@/content/portfolio";
import { careerYearSpan, stillGrowingCaption } from "@/lib/knowledge-tree";
import type { CareerEntry, CareerEntryType } from "@/types/portfolio";

/**
 * The origin story: one flight authored (`origin`, above), every season
 * computed from the career entries in `src/content/portfolio.ts` — all of
 * them, the nine the Journey shows only as credentials included.
 *
 * A "season" is a year of the career, told as weather: a year with schooling
 * is rain, a plain working year is sun, and a year with nothing on record is
 * quiet underground growth — and, independently, a year with a hard-won
 * milestone also has a storm ride through it, on top of whichever of those
 * three it already was. The mapping is a deliberate metaphor, not a
 * measurement — but the *counts* behind it are real, read straight off
 * `careerEntries.sortKey`, never typed in twice. Changing what a season says
 * means changing the content layer, the same discipline `companion-facts.ts`
 * and `knowledge-tree.ts` already hold to.
 *
 * Pure and server-safe: no `Date`, no `Math.random`, nothing but arithmetic
 * over `src/content/portfolio.ts`. Years come from `sortKey` so the story
 * never drifts from "today" between builds — see `careerYearSpan`'s note on
 * exactly this.
 *
 * Base weather + storm overlay (design-content fix, after the original
 * all-or-nothing precedence): most active years in the real content also
 * carry a milestone (computed per year by `seasonsFor`, deliberately not
 * listed here, so this comment cannot go stale when an entry is added), so a
 * precedence rule that gave `storm` first claim whenever `milestones > 0` meant the show only
 * ever rendered storms, quiet and wind — sun and rain, the two the owner
 * explicitly asked to see, never appeared at all. `kindFor` below now
 * answers a different question — "what was this year's *base* weather,
 * milestone or not" — and `Season.storm` carries the milestone fact
 * separately, so a year can honestly be both (rain, with a storm that rode
 * in) rather than forced to pick one. The companion narrates the two
 * together: a storm year gets the storm's line over its base weather's.
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

/**
 * `"storm"` stays in this union for compatibility with the beat contract
 * `GrowBeat` (below) and `companion-dialogue.ts`'s `StoryBeatKind` both
 * build on (`"flight" | "seed" | SeasonKind | "still"`)
 * — but `kindFor` below never returns it any more. A storm is no longer a
 * weather *kind* a season has instead of rain or sun; it is `Season.storm`,
 * an overlay any base kind can carry. See the file banner.
 */
export type SeasonKind = "rain" | "sun" | "storm" | "quiet";

export interface Season {
  readonly year: number;
  readonly forces: SeasonForces;
  /** The year's base weather — rain, sun or quiet, never `"storm"`. See the
   *  file banner. */
  readonly kind: SeasonKind;
  /** Whether a hard-won milestone (`forces.milestones > 0`) rode in on top
   *  of the base weather this year. Independent of `kind` — a year can be
   *  rain-with-a-storm or sun-with-a-storm equally honestly. */
  readonly storm: boolean;
  /** Authored copy around computed counts. Always starts with the year,
   *  never a place name — see `tests/lib/origin-story.test.ts`. */
  readonly caption: string;
}

/** Every caption's hard ceiling — "Watch it grow"'s caption line reads these
 *  aloud, so they stay a sentence, not a paragraph. */
export const CAPTION_MAX_CHARS = 72;

function countOf(entries: readonly CareerEntry[], type: CareerEntryType): number {
  return entries.filter((entry) => entry.type === type).length;
}

/**
 * The precedence a season's *base* weather follows when more than one kind
 * of ordinary thing happened that year: schooling reads as rain over plain
 * work — including a tie, where a year with equal `learning` and `work`
 * still reads as rain rather than sun, since `learning >= work` rather than
 * `>` is the actual comparison below; failing that, plain work reads as
 * sun; a year with neither is quiet growth underground. A milestone no
 * longer takes precedence over any of this — it never reaches `kindFor` at
 * all, because it isn't base weather, it's `Season.storm`, computed
 * separately in `seasonsFor` below. See the file banner for why: in the
 * real content every year from 2021 on carries a milestone, so the old
 * milestones-first rule would show a storm for all of them and sun never
 * at all (and before round 18 added the 2018–2019 entries, no rain either).
 *
 * Exported on its own so the precedence rule can be proven against crafted
 * `SeasonForces` rather than needing real content to happen to produce every
 * combination — see `tests/lib/origin-story.test.ts`.
 */
export function kindFor(forces: SeasonForces): SeasonKind {
  if (forces.learning > 0 && forces.learning >= forces.work) return "rain";
  if (forces.work > 0) return "sun";
  return "quiet";
}

/**
 * Composes base weather and storm honestly rather than picking one: a
 * storm year still says what the base weather *was*, with the storm named
 * as something that rode in on top of it, not a replacement for it. Every
 * branch stays under `CAPTION_MAX_CHARS`, leads with the year, and names no
 * city — see `tests/lib/origin-story.test.ts`.
 */
function captionFor(year: number, kind: SeasonKind, storm: boolean): string {
  if (storm) {
    switch (kind) {
      case "rain":
        return `${year} — rain for the roots, and a storm rode in`;
      case "sun":
        return `${year} — steady sun, then a storm broke — and passed`;
      case "quiet":
        return `${year} — quiet growth, until a storm rode in`;
      case "storm":
        return `${year} — a storm rode in`;
    }
  }
  switch (kind) {
    case "rain":
      return `${year} — rain for the roots: education`;
    case "sun":
      return `${year} — steady sun: working growth`;
    case "quiet":
      return `${year} — quiet growth underground`;
    case "storm":
      return `${year} — a storm rode in`;
  }
}

/**
 * One `Season` per year from the flight's landing (`origin.arrivedYear`)
 * through the last year any career entry starts in (`careerYearSpan().
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
    const storm = forces.milestones > 0;
    seasons.push({ year, forces, kind, storm, caption: captionFor(year, kind, storm) });
  }

  return seasons;
}

/**
 * One beat of "Watch it grow" (`GrowOak.tsx`): the flight, each season, then
 * the shoot that is still growing. `kind` is the companion's beat vocabulary
 * (`StoryBeatKind`), `year` dates the beat (none for the flight or the
 * shoot), and `caption` is what the button's caption line reads out. Plain
 * data, so the server can hand the whole show to the client island.
 */
export interface GrowBeat {
  readonly kind: "flight" | SeasonKind | "still";
  readonly year: number | null;
  readonly storm: boolean;
  readonly caption: string;
}

/** The crossing as one line: where from, where to, and when. */
export function flightCaption(): string {
  return `${origin.from} → ${origin.to} · ${origin.arrived}`;
}

/** The show, in order: the flight, one beat per season, then the shoot. */
export function growBeats(): readonly GrowBeat[] {
  return [
    { kind: "flight", year: null, storm: false, caption: flightCaption() },
    ...seasonsFor().map(({ year, kind, storm, caption }) => ({ year, kind, storm, caption })),
    { kind: "still", year: null, storm: false, caption: stillGrowingCaption() },
  ];
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/**
 * Whether `origin.arrived` (prose) and `origin.arrivedOn` (machine) name the
 * same month. Two spellings of one fact is the drift this content layer exists
 * to prevent, so the test asserts it rather than a comment asking nicely.
 */
export function arrivedOnAgreesWithArrived(): boolean {
  const [year, month] = origin.arrivedOn.split("-").map(Number);
  const name = MONTHS[month - 1];
  return name !== undefined && origin.arrived === `${name} ${year}`;
}
