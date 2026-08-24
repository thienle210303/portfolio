import { careerEntries, origin } from "@/content/portfolio";
import { careerYearSpan } from "@/lib/knowledge-tree";
import type { CareerEntry, CareerEntryType } from "@/types/portfolio";

/**
 * The origin story: one flight authored (`origin`, above), every season
 * computed from the same career entries the timeline already renders.
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
 * all-or-nothing precedence): every active year in the real content also
 * carries a milestone (2021, 2023, 2024, 2025), so a precedence rule that
 * gave `storm` first claim whenever `milestones > 0` meant the show only
 * ever rendered storms, quiet and wind — sun and rain, the two the owner
 * explicitly asked to see, never appeared at all. `kindFor` below now
 * answers a different question — "what was this year's *base* weather,
 * milestone or not" — and `Season.storm` carries the milestone fact
 * separately, so a year can honestly be both (rain, with a storm that rode
 * in) rather than forced to pick one. See `OriginStory.tsx`'s `WeatherLayer`
 * for how the two compose on screen: the base kind's atmosphere for the
 * whole beat, the storm layered on top for a passage in the middle of it.
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
 * `OriginStory.tsx`'s `BeatKind` and `companion-dialogue.ts`'s
 * `StoryBeatKind` both build on (`"flight" | "seed" | SeasonKind | "still"`)
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

/** Every caption's hard ceiling — the player's status region reads these
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
 * separately in `seasonsFor` below. See the file banner for why: real
 * content puts a milestone in every active year, so the old
 * milestones-first rule left sun and rain never appearing.
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
    const storm = forces.milestones > 0;
    seasons.push({ year, forces, kind, storm, caption: captionFor(year, kind, storm) });
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

/**
 * The first year the canopy exists: the earliest year any lens-tagged entry
 * lands in, which is the same fact `careerYearSpan().firstYear` already is —
 * this is only a second name for it, so `DrawnTree.tsx` can ask the origin
 * story's own vocabulary ("when does the canopy start") without importing
 * `knowledge-tree.ts` twice under two different words.
 */
export function firstCanopyYear(): number {
  return careerYearSpan().firstYear;
}

/**
 * The year a major root (`RootSystem`'s `data-tree-lateral` groups in
 * `DrawnTree.tsx`) is stamped with, for the origin story's chronological
 * growth.
 *
 * The underground has no authored year of its own — nothing in
 * `src/content/portfolio.ts` says "this skill category existed in 2019" —
 * so a single root cannot honestly claim a year the way a leaf can from its
 * `sortKey`. What the drawing *can* say honestly is that the roots grew
 * before the canopy did: every root lands somewhere in the quiet years
 * between the flight's landing (`origin.arrivedYear`) and the year before
 * the first canopy year, spread evenly by index rather than bunched on one
 * year or left to the same year as every other root.
 *
 * `total` roots are divided into `yearsCount` equal-ish buckets by integer
 * division, the same idiom `rootTipX` in `DrawnTree.tsx` uses to place root
 * tips evenly across the drawing's width — deterministic, and (when
 * `total >= yearsCount`) guaranteed to touch every pre-canopy year at least
 * once, so the story never skips a quiet year it promised to show growing.
 */
export function rootYearFor(index: number, total: number): number {
  const first = origin.arrivedYear;
  const yearsCount = Math.max(1, firstCanopyYear() - first);
  if (total <= 0) return first;
  const bucket = Math.floor((Math.max(0, index) * yearsCount) / total);
  return first + Math.min(yearsCount - 1, bucket);
}

/* -------------------------------------------------------------------------- */
/* The growth clock — pure timing math for OriginStory.tsx's single rAF      */
/* master clock (round 10, "Origin story on one clock").                     */
/*                                                                            */
/* The player used to stagger a beat's newly-due groups by giving each one   */
/* its own `transitionDelay` (an inherited CSS custom property) and its own  */
/* `window.setTimeout` to later wipe that property back off — dozens of      */
/* independent clocks (one per group, per beat) all approximating the same   */
/* handful of numbers, free to drift apart under load exactly the way        */
/* independent `setTimeout`s do (the browser is free to coalesce or delay    */
/* any one of them without the others knowing). `planRelease`/`dueByElapsed` */
/* below are what a *single* clock reduces that whole class of independent   */
/* timer to: given "what's still waiting" and "how much time has passed",    */
/* both answer the exact same question a `window.setTimeout` callback used   */
/* to answer for itself, but as a pure function of one shared `elapsedMs`    */
/* the caller reads from one shared `requestAnimationFrame` loop — nothing   */
/* here schedules anything of its own. Deliberately DOM-free (a plain `K`    */
/* identity, not an `HTMLElement`) so this is provable with plain objects in */
/* a unit test, the same "prove the rule in isolation" discipline `kindFor`  */
/* above already follows; `OriginStory.tsx` supplies its own `HTMLElement`   */
/* as `K` when it actually calls this against the real tree.                */
/* -------------------------------------------------------------------------- */

/** How long a stagger step waits before the next group in the same release
 *  is due — small enough that a year with a dozen leaves still finishes well
 *  inside one season beat, large enough to read as a sequence rather than a
 *  shimmer. */
export const STAGGER_STEP_MS = 120;
/** The trunk's own hero rise: roughly double the ordinary draw duration — the
 *  one moment this drawing is asked to slow down for, not speed past. */
export const TRUNK_RISE_MS = 1200;
/** A leaf pops faster than the branch it hangs off — "small things move
 *  quick, big things move slow". */
export const LEAF_POP_MS = 300;
/** Every group that is neither the trunk nor a leaf keeps the ordinary
 *  `--dur-draw`/`--dur-settle` its own ink class already transitions with in
 *  globals.css. This module has no access to that CSS custom property's
 *  numeric value, so this is a same-order stand-in used only to size the
 *  cleanup margin below, never written to the DOM as a literal duration. */
export const ORDINARY_DUR_MS = 600;
/** How long past a group's own release this clock waits before it is safe to
 *  treat that group's inline `--origin-rise`/`--origin-pop` override as
 *  finished — comfortably past when the CSS transition it timed has actually
 *  completed. */
export const STAGGER_CLEANUP_MARGIN_MS = 800;

/** Tier order a release sorts by before staggering — trunk/ground-break
 *  first, then branch/lens, then leaf: big, slow things settle before the
 *  small, quick things hung off them do. */
export const TIER_TRUNK = 0;
export const TIER_BRANCH = 1;
export const TIER_LEAF = 2;

/** Everything `planRelease` needs to know about one candidate group, keyed
 *  by whatever opaque identity `K` the caller already has (an `HTMLElement`
 *  in production, a plain string or number in a test). */
export interface StaggerCandidate<K> {
  readonly key: K;
  readonly year: number;
  readonly tier: number;
  readonly isTrunk: boolean;
  /** The one group `planRelease` never plans for — see `origin-story.test.ts`
   *  and `OriginStory.tsx`'s own `releaseShoot` for why the shoot always
   *  waits for its own beat instead of this generic sweep. */
  readonly isShoot: boolean;
}

/** One candidate's place in a release: how long after the release began it
 *  is due, and how long its own transition should take once it is. */
export interface StaggerPlan<K> {
  readonly key: K;
  readonly delayMs: number;
  readonly durationMs: number;
}

/**
 * Every candidate due at or before `year` that has not already been
 * `claimed` in an earlier release this run, ordered trunk-then-branch-then-
 * leaf and staggered `STAGGER_STEP_MS` apart — the same precedence
 * `OriginStory.tsx`'s v1 `releaseThroughYear` used, extracted here as a pure
 * function of its inputs so it can be proven against crafted candidates
 * rather than only ever exercised through a real DOM. Returns a plan, not a
 * mutation: `OriginStory.tsx`'s single clock decides *when* each entry in it
 * actually fires (`dueByElapsed`), and is the only thing that ever touches
 * real elements.
 *
 * A stable sort (the only kind `Array.prototype.sort` has been since
 * ES2019) keeps each tier's own candidates in the order they were already
 * given, so "trunk, then branch, then leaf" is the only new ordering this
 * introduces. `!Number.isFinite(year)` (a malformed year) is treated as
 * "always due" rather than left claimed by nothing forever.
 */
export function planRelease<K>(
  candidates: readonly StaggerCandidate<K>[],
  year: number,
  claimed: ReadonlySet<K>,
): readonly StaggerPlan<K>[] {
  const due = candidates.filter(
    (candidate) =>
      !candidate.isShoot &&
      !claimed.has(candidate.key) &&
      (!Number.isFinite(candidate.year) || candidate.year <= year),
  );
  const ordered = [...due].sort((a, b) => a.tier - b.tier);
  return ordered.map((candidate, index) => ({
    key: candidate.key,
    delayMs: index * STAGGER_STEP_MS,
    durationMs: candidate.isTrunk
      ? TRUNK_RISE_MS
      : candidate.tier === TIER_LEAF
        ? LEAF_POP_MS
        : ORDINARY_DUR_MS,
  }));
}

/**
 * The other half of "one progress value per beat, state is a pure function
 * of it": which entries of a `planRelease` plan (assumed already sorted
 * ascending by `delayMs`, which `planRelease` always returns) are due now
 * that `elapsedMs` has passed since the release began. Given the same
 * `plan` and the same `elapsedMs`, this always answers the same way — no
 * clock of its own, no side effect, safe to call every animation frame.
 */
export function dueByElapsed<K>(
  plan: readonly StaggerPlan<K>[],
  elapsedMs: number,
): readonly StaggerPlan<K>[] {
  let cut = 0;
  while (cut < plan.length && elapsedMs >= plan[cut].delayMs) cut++;
  return plan.slice(0, cut);
}
