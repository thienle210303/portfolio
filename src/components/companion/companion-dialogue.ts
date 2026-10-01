"use client";

import { origin } from "@/content/portfolio";
import type { CompanionFacts } from "@/lib/companion-facts";
import type { SeasonKind } from "@/lib/origin-story";

/**
 * The duet: one pure scene bank behind both the ambient banter and the
 * guided tour. The cats "speak" in meows; the subtitle beneath is the
 * translation — authored playful copy whose every number is filled from
 * `CompanionFacts`, the same discipline companion-tour.ts holds and for the
 * same reason. Meows are authored per beat, never generated: the grey one is
 * terse, the tabby rambles, and that difference IS the characterisation, so
 * it belongs to an author, not a generator.
 *
 * Pure on purpose (no DOM, no Math.random, no clocks): time comes in as
 * `now`, odds come in as `roll`, and everything here is testable in vitest
 * without a browser.
 */

export type Speaker = "grey" | "tabby";

export interface DialogueBeat {
  readonly speaker: Speaker;
  readonly meow: string;
  readonly sub: string;
}

export type SceneKind = "hello" | "ambient" | "encore" | "tour" | "story";

export interface DialogueScene {
  readonly id: string;
  readonly kind: SceneKind;
  readonly beats: readonly DialogueBeat[];
}

/** A subtitle longer than this cannot sit beside a cat without becoming a
 *  caption — same budget philosophy NOTE_MAX_CHARS had, a hair wider because
 *  two voices earn a little more room. */
export const SUB_MAX_CHARS = 64;

/** Reading-time clock for auto-advance: max-anchored, not floor-anchored — a
 *  beat starts at `BEAT_MAX_MS` and loses `BEAT_MS_PER_CHAR` for every
 *  character short of `SUB_MAX_CHARS`, then clamps to [BEAT_MIN_MS,
 *  BEAT_MAX_MS]. See `beatDurationMs` below for the formula itself. */
export const BEAT_MIN_MS = 2400;
export const BEAT_MAX_MS = 5000;
export const BEAT_MS_PER_CHAR = 55;

/** Cadence — the field notes' numbers, inherited: the duet replaces them and
 *  keeps their rhythm. The first scene of a visit is the hello. */
export const DUET_FIRST_DELAY_MS = 8000;
export const DUET_GAP_MS = 75_000;
export const DUET_GAP_SPREAD_MS = 60_000;
export const DUET_ODDS = 0.45;

const grey = (meow: string, sub: string): DialogueBeat => ({ speaker: "grey", meow, sub });
const tabby = (meow: string, sub: string): DialogueBeat => ({ speaker: "tabby", meow, sub });

/** A full stop for a sentence that doesn't already end in one — "DoorDash,
 *  Inc." brings its own, "Schaeffler Group" doesn't, and a template can't
 *  tell which fact it got handed. */
const endStop = (s: string): string => (s.endsWith(".") ? "" : ".");

/**
 * The bank. Builders rather than data so facts resolve at ask-time; a builder
 * whose facts are missing returns null and the scene simply never plays.
 */
type SceneBuilder = (facts: CompanionFacts) => readonly DialogueBeat[] | null;

const HELLO: SceneBuilder = () => [
  tabby("Mrrrow! Meow meow!", "Oh! A visitor! We've been waiting all day!"),
  grey("Mrp.", "We live here. I keep the facts straight."),
  tabby("Meow-meow-mrrp!", "Click me whenever — I'll translate the page!"),
];

const AMBIENT: Record<string, SceneBuilder> = {
  about: (f) =>
    f.about.role && f.about.organization
      ? [
          grey("Mrp. Meow.", `Now: ${f.about.role}, ${f.about.organization}${endStop(f.about.organization)}`),
          tabby("Mrrrow?", "That's the headline. The page is the proof."),
        ]
      : null,
  tree: (f) => [
    tabby("Mrrrow! Meow!", `A tree! ${f.tree.branches} branches, ${f.tree.leaves} leaves!`),
    grey("Meow.", "We planted nothing. It grew from the timeline."),
  ],
};

/**
 * Round 10: the tree absorbed Journey, and its encore is where that
 * section's own facts earned a place — the branch/leaf/technology count
 * followed by the timeline split that used to be `journey`'s own scene.
 */
const ENCORE: Record<string, SceneBuilder> = {
  tree: (f) => [
    grey("Meow. Mrp.", `${f.tree.technologies} technologies hang on those branches.`),
    tabby("Mrrrow?", "Hover one! The tree lights up where it lives."),
    grey("Mrp. Mrp.", `${f.tree.entries} entries fed it. ${f.tree.work} were work.`),
    tabby("Meow!", `${f.tree.milestones} milestones. Confetti days, every one.`),
  ],
};

const TOUR: Record<string, SceneBuilder> = {
  // Asymmetric on purpose: AMBIENT.about nulls out when a fact is missing and
  // simply never plays, but the tour must visit every stop, so this one falls
  // back to generic prose instead of skipping the beat.
  about: (f) => [
    tabby("Mrrrow!", "This is him! Right here, top of the page!"),
    grey(
      "Mrp. Meow.",
      f.about.role && f.about.organization
        ? `${f.about.role}. ${f.about.organization}${endStop(f.about.organization)} The facts hold.`
        : "The start of the page. The facts hold.",
    ),
  ],
  // Round 16: Playground Earth. Every number here is quoted from `f.worlds`,
  // never typed — the same discipline every other scene in this file keeps.
  // Plaques and decorations are disjoint sets (`DECORATION_LABEL` is
  // literally "no plaque · decoration"), so the second line says "more",
  // not "of these" — nineteen plaques plus three decorations is twenty-two
  // objects, not three of nineteen.
  worlds: (f) => [
    tabby("Mrrrow!", `${f.worlds.count} worlds! ${f.worlds.plaques} plaques and we guard all of them!`),
    grey("Mrp. Meow.", `${f.worlds.decorations} more are just drawings. They say so themselves.`),
  ],
  // Round 10: the tree absorbed Journey, and this one stop now narrates both
  // faces — the branch/leaf/technology count first, then the timeline split
  // that used to be `journey`'s own tour stop, tabby's line preserved rather
  // than dropped.
  tree: (f) => [
    tabby("Meow meow meow!", `Look up! ${f.tree.branches} branches, ${f.tree.leaves} leaves!`),
    grey("Mrp.", `${f.tree.technologies} technologies hang there. We planted nothing.`),
    grey("Mrp. Mrp.", `${f.tree.entries} entries. ${f.tree.work} of them are work.`),
    tabby("Mrrrow!", "I napped through the rest — they still count!"),
  ],
  contact: () => [
    tabby("Mrrrow-meow-meow!", "Say hi! He answers — usually before I wake up."),
    grey("Mrp.", "The form works. So does plain email. Either lands."),
  ],
};

/**
 * The origin story's own bank: one beat per season/flight/seed/still stamp,
 * narrated by whichever cat `Companion.tsx`'s watch listener hands in as
 * `speaker` — it alternates that itself, beat to beat, so this stays as
 * clockless as every other builder here. Unlike `AMBIENT`/`ENCORE`/`TOUR`,
 * the template is keyed by *kind* rather than by speaker: this is one voice
 * narrating an event as it happens, not two characters trading lines about a
 * fact, so there is nothing for a second, per-speaker builder to add.
 *
 * Every season sub leads with its own year — the fact actually being
 * narrated — composed from the beat's real year, never a season counted or
 * typed twice. `flight`, `seed` and `still` name no year at all: none of
 * them dates a single beat, so nothing here pretends to lead with one. The
 * flight's own date is `origin.arrived` (`src/content/portfolio.ts`), not a
 * literal — the same fact `flightCaption()` in `OriginStory.tsx` composes
 * from, so a change to the arrival date never has to be typed twice.
 *
 * The four weather members are `SeasonKind` itself (`@/lib/origin-story`),
 * type-only imported rather than retyped: `OriginStory.tsx`'s own
 * `BeatKind` is `"flight" | "seed" | SeasonKind | "still"`, the exact shape
 * below, and a season kind added there without a matching update here would
 * otherwise only ever surface as a silent "nothing to say" (the guarded
 * lookup a few lines down) rather than a type error at the call site.
 *
 * `"storm"` is one of `SeasonKind`'s members but is never a beat's own
 * *base* `kind` any more — `Season.kind` (origin-story.ts) never produces
 * it, only `Season.storm`, a fact that rides alongside whichever base
 * weather the year actually had. `STORY_BEAT.storm` below is repurposed as
 * that overlay's own line rather than a fifth, orphaned entry: `storm`, the
 * caller's boolean, picks it over the beat's own base-kind entry, so a
 * storm year is narrated with the dramatic line every base kind used to
 * lose to, and a storm-free year is narrated with its own honest weather.
 */
export type StoryBeatKind = "flight" | "seed" | SeasonKind | "still";

const STORY_BEAT: Record<
  StoryBeatKind,
  { readonly meow: string; readonly sub: (year: number | null) => string | null }
> = {
  flight: {
    meow: "Mrrrow...",
    sub: () => `A long flight, a small seed. ${origin.arrived}${endStop(origin.arrived)}`,
  },
  seed: { meow: "Mrp!", sub: () => "Right here. This exact spot." },
  rain: {
    meow: "Mrrp-meow.",
    sub: (year) => (year === null ? null : `${year} — rain for the roots. Drink up.`),
  },
  // The storm overlay's own line — played instead of the base-kind entry
  // below whenever `storyBeatScene` is asked with `storm: true`, regardless
  // of which base weather the year actually had. See the file banner just
  // above.
  storm: {
    meow: "Mrrrow!!",
    sub: (year) => (year === null ? null : `${year} — a storm! Hold the trunk!`),
  },
  sun: {
    meow: "Mrrp.",
    sub: (year) => (year === null ? null : `${year} — steady sun, steady work.`),
  },
  quiet: {
    meow: "Mrp...",
    sub: (year) => (year === null ? null : `${year} — quiet. Roots don't hurry.`),
  },
  still: { meow: "Meow!", sub: () => "…and still growing." },
};

/**
 * One beat of "How it grew" — a single-beat scene, always. `year` is the
 * season's own year for the four weather kinds and is ignored (and may
 * safely be `null`) for `flight`/`seed`/`still`; a weather kind asked for
 * with a `null` year returns null rather than narrating a year it does not
 * have, the same "nothing to say" contract every other builder in this file
 * follows. `facts` is unused by every template above — nothing here quotes a
 * portfolio number, since a season's year is already a real, computed fact
 * on its own — but stays in the signature for the same reason every other
 * builder here takes it: a future beat that does want one should not have to
 * change the call site. `kind` is typed to the seven known beats, but the
 * caller gets it from a `CustomEvent` detail rather than from TypeScript, so
 * the lookup is guarded rather than destructured straight off `STORY_BEAT` —
 * an unrecognised kind is "nothing to say", the same answer every other
 * failure in this function gives, not a thrown exception.
 *
 * `storm` (default `false`) is the beat's own storm overlay fact —
 * `OriginStory.tsx` passes `beat.season?.storm ?? false` — independent of
 * `kind`, which is always base weather now. When true, this narrates the
 * `STORY_BEAT.storm` line instead of `kind`'s own, for any of `rain`/`sun`/
 * `quiet`; `flight`/`seed`/`still` never carry a storm and ignore the flag,
 * the same way they already ignore `year`.
 */
export function storyBeatScene(
  kind: StoryBeatKind,
  year: number | null,
  facts: CompanionFacts,
  speaker: Speaker,
  storm = false,
): DialogueScene | null {
  const isWeatherKind = kind === "rain" || kind === "sun" || kind === "quiet";
  const entry = STORY_BEAT[storm && isWeatherKind ? "storm" : kind] ?? null;
  if (!entry) return null;
  const sub = entry.sub(year);
  if (sub === null || sub.length > SUB_MAX_CHARS || entry.meow.length === 0) return null;
  return { id: `story-${kind}`, kind: "story", beats: [{ speaker, meow: entry.meow, sub }] };
}

/** A resolved scene, or null for "nothing to play" — over-budget subs and
 *  missing facts both land there, and the caller cannot tell the difference,
 *  which is deliberate. */
export function sceneFor(
  kind: SceneKind,
  section: string | null,
  facts: CompanionFacts,
): DialogueScene | null {
  // "story" has no section-keyed builder of its own — it is built directly
  // by `storyBeatScene`, from a beat kind and a year rather than a nav
  // section, so there is nothing here for it to look up.
  const builder =
    kind === "hello"
      ? HELLO
      : kind === "story"
        ? undefined
        : section
          ? { ambient: AMBIENT, encore: ENCORE, tour: TOUR }[kind]?.[section]
          : undefined;
  if (!builder) return null;
  const beats = builder(facts);
  if (!beats || beats.length === 0) return null;
  if (beats.some((beat) => beat.sub.length > SUB_MAX_CHARS || beat.meow.length === 0)) return null;
  const id = kind === "hello" ? "hello" : `${kind}-${section}`;
  return { id, kind, beats };
}

export function hasEncore(section: string | null, facts: CompanionFacts): boolean {
  return sceneFor("encore", section, facts) !== null;
}

export interface DialogueRun {
  readonly scene: DialogueScene;
  readonly beatIndex: number;
  readonly beatStartedAt: number;
}

export function startScene(scene: DialogueScene, now: number): DialogueRun {
  return { scene, beatIndex: 0, beatStartedAt: now };
}

export function currentBeat(run: DialogueRun): DialogueBeat {
  return run.scene.beats[run.beatIndex];
}

export function advanceBeat(run: DialogueRun, now: number): DialogueRun | null {
  const next = run.beatIndex + 1;
  if (next >= run.scene.beats.length) return null;
  return { scene: run.scene, beatIndex: next, beatStartedAt: now };
}

export function beatDurationMs(beat: DialogueBeat): number {
  const maxForLength = BEAT_MAX_MS - (SUB_MAX_CHARS - beat.sub.length) * BEAT_MS_PER_CHAR;
  return Math.max(BEAT_MIN_MS, Math.min(BEAT_MAX_MS, maxForLength));
}

/** When the next spontaneous scene may play. `spread` is the caller's roll
 *  (0..1), passed in so this stays clockless and testable. */
export function nextDuetAt(now: number, first: boolean, spread: number): number {
  if (first) return now + DUET_FIRST_DELAY_MS;
  return now + DUET_GAP_MS + spread * DUET_GAP_SPREAD_MS;
}
