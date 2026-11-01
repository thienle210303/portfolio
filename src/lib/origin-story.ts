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
 *
 * Round 23 makes the weather visible. `Weather` (below) is what "Watch it grow"
 * draws over the oak for each beat; `weatherFor` computes it from the season
 * and, again, nothing is typed per year. What the real content produces today
 * (the test recomputes it; this list can go stale, the function cannot):
 *
 *   - the flight is a `plane` crossing the sky, the last beat a `ufo` cameo;
 *   - a year of schooling is `rain`, a plain working year is `sun`, and a year
 *     with nothing on record is `snow` (a quiet, white, underground winter);
 *   - rain with a milestone riding in is a `flood`;
 *   - the one year with the most milestones is the `hurricane` (ties go to the
 *     earlier year, so there is exactly one); it beats the rules below;
 *   - any other storm year is a `thunderstorm`. Every working year in the real
 *     content also carries a milestone, so plain `sun` never occurs on its own
 *     there; the thunderstorm therefore opens in sun (the caption says so) and
 *     the clouds roll in, which keeps the sun the owner asked for on screen.
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

/** What "Watch it grow" draws over the oak for one beat (globals.css, "Watch it
 *  grow", `data-weather`). */
export type Weather =
  | "plane"
  | "sun"
  | "rain"
  | "snow"
  | "flood"
  | "thunderstorm"
  | "hurricane"
  | "ufo";

/**
 * A season's weather, from its base kind, its storm overlay and whether it is
 * the year with the most milestones. Pure: the show's only per-year rule.
 * Hurricane first (the one peak year), then a storm over rain is a flood, any
 * other storm a thunderstorm, otherwise the base kind itself (quiet is snow).
 */
export function weatherFor(kind: SeasonKind, storm: boolean, peak: boolean): Weather {
  if (storm && peak) return "hurricane";
  if (storm) return kind === "rain" ? "flood" : "thunderstorm";
  if (kind === "rain") return "rain";
  if (kind === "sun") return "sun";
  return "snow";
}

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
  /** What is drawn over the oak this year. See `weatherFor`. */
  readonly weather: Weather;
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
 * One line per weather, in first person, led by the year, naming the weather
 * the oak is standing in. Counts are read from `forces`, never typed. Every
 * branch stays under `CAPTION_MAX_CHARS` and names no city — see
 * `tests/lib/origin-story.test.ts`.
 */
function captionFor(year: number, weather: Weather, forces: SeasonForces): string {
  switch (weather) {
    case "hurricane":
      return `${year} — a hurricane of ${forces.milestones} milestones; I held on`;
    case "flood":
      return `${year} — rain, then a flood; my roots held`;
    case "thunderstorm":
      return forces.work > 0
        ? `${year} — sun on my work, then thunder rolled in and passed`
        : `${year} — a quiet sky, then thunder rolled through`;
    case "rain":
      return `${year} — rain fell on my roots while I studied`;
    case "sun":
      return `${year} — sun on my work, steady and warm`;
    case "snow":
      return `${year} — snow; I grew quiet underground`;
    case "plane":
    case "ufo":
      return `${year}`;
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
  const drafts: { year: number; forces: SeasonForces; kind: SeasonKind; storm: boolean }[] = [];

  for (let year = origin.arrivedYear; year <= lastYear; year++) {
    const inYear = ENTRIES.filter((entry) => Number(entry.sortKey.slice(0, 4)) === year);
    const forces: SeasonForces = {
      learning: countOf(inYear, "learning"),
      work: countOf(inYear, "work"),
      milestones: countOf(inYear, "milestone"),
    };
    drafts.push({ year, forces, kind: kindFor(forces), storm: forces.milestones > 0 });
  }

  // The hurricane is the year with the most milestones; the earlier year wins a tie.
  const most = Math.max(0, ...drafts.map((d) => d.forces.milestones));
  const peakYear = most > 0 ? drafts.find((d) => d.forces.milestones === most)?.year : undefined;

  return drafts.map((d) => {
    const weather = weatherFor(d.kind, d.storm, d.year === peakYear);
    return { ...d, weather, caption: captionFor(d.year, weather, d.forces) };
  });
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
  /** What is drawn over the oak for this beat: a plane for the flight, a UFO
   *  for the shoot, the season's own weather between. */
  readonly weather: Weather;
  readonly caption: string;
}

/** The crossing as one line: where from, where to, and when. */
export function flightCaption(): string {
  return `${origin.from} → ${origin.to} · ${origin.arrived}`;
}

/** The show, in order: the flight, one beat per season, then the shoot. */
export function growBeats(): readonly GrowBeat[] {
  return [
    { kind: "flight", year: null, storm: false, weather: "plane", caption: flightCaption() },
    ...seasonsFor().map(({ year, kind, storm, weather, caption }) => ({ year, kind, storm, weather, caption })),
    { kind: "still", year: null, storm: false, weather: "ufo", caption: `${stillGrowingCaption()} — and a UFO stopped to look` },
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
