"use client";

import { origin } from "@/content/portfolio";
import type { CompanionFacts } from "@/lib/companion-facts";
import type { SeasonKind } from "@/lib/origin-story";
import type { CatPose } from "./CompanionCat";

/**
 * The duet: one pure scene bank behind both the ambient banter and the
 * guided tour. The cats "speak" in meows; the subtitle beneath is the
 * translation — authored playful copy whose every number is filled from
 * `CompanionFacts`, the same discipline companion-tour.ts holds and for the
 * same reason. Meows are authored per beat, never generated: the grey one is
 * terse, the tabby rambles, and that difference IS the characterisation, so
 * it belongs to an author, not a generator. Icons and acts are authored per
 * beat too, never chosen at random: the icon is the beat's one picture, the act
 * is what the cat does while it speaks, and a beat may carry neither.
 *
 * Pure on purpose (no DOM, no Math.random, no clocks): time comes in as
 * `now`, odds come in as `roll`, and everything here is testable in vitest
 * without a browser.
 */

export type Speaker = "grey" | "tabby";

/** The beat's one picture. A closed set, so the renderer can draw each one
 *  by hand and a typo in the bank is a type error rather than a blank. */
export type CatIcon =
  | "yarn"
  | "fish"
  | "moth"
  | "paw"
  | "zzz"
  | "heart"
  | "sparkle"
  | "leaf"
  | "globe"
  | "mail"
  | "question"
  | "branch";

export const CAT_ICONS: readonly CatIcon[] = [
  "yarn",
  "fish",
  "moth",
  "paw",
  "zzz",
  "heart",
  "sparkle",
  "leaf",
  "globe",
  "mail",
  "question",
  "branch",
];

/** What the speaking cat does while the beat plays. */
export type CatAct = "bat" | "groom" | "stretch" | "eat" | "sleep" | "hop";

export const CAT_ACTS: readonly CatAct[] = ["bat", "groom", "stretch", "eat", "sleep", "hop"];

export interface DialogueBeat {
  readonly speaker: Speaker;
  readonly meow: string;
  readonly sub: string;
  readonly icon?: CatIcon;
  readonly act?: CatAct;
}

export type SceneKind = "hello" | "ambient" | "encore" | "tour" | "story";

export interface DialogueScene {
  readonly id: string;
  readonly kind: SceneKind;
  readonly beats: readonly DialogueBeat[];
}

/** A subtitle longer than this cannot sit beside a cat without becoming a
 *  caption. A templated line that comes out longer is dropped, never
 *  truncated: `sceneFor` returns null for the whole scene. */
export const SUB_MAX_CHARS = 32;

/** Reading-time clock for auto-advance: max-anchored, not floor-anchored — a
 *  beat starts at `BEAT_MAX_MS` and loses `BEAT_MS_PER_CHAR` for every
 *  character short of `SUB_MAX_CHARS`, then clamps to [BEAT_MIN_MS,
 *  BEAT_MAX_MS]. See `beatDurationMs` below for the formula itself. */
export const BEAT_MIN_MS = 2400;
export const BEAT_MAX_MS = 5000;
/** Sized so the clamp window spans the whole 32-character budget: a
 *  three-character sub lands on `BEAT_MIN_MS`, a full one on `BEAT_MAX_MS`.
 *  At the old 55 the budget halved and `BEAT_MIN_MS` became unreachable. */
export const BEAT_MS_PER_CHAR = 90;

/** Cadence — the field notes' numbers, inherited: the duet replaces them and
 *  keeps their rhythm. The first scene of a visit is the hello. */
export const DUET_FIRST_DELAY_MS = 8000;
export const DUET_GAP_MS = 75_000;
export const DUET_GAP_SPREAD_MS = 60_000;
export const DUET_ODDS = 0.45;

const voice =
  (speaker: Speaker) =>
  (meow: string, sub: string, icon?: CatIcon, act?: CatAct): DialogueBeat => ({
    speaker,
    meow,
    sub,
    ...(icon ? { icon } : {}),
    ...(act ? { act } : {}),
  });
const grey = voice("grey");
const tabby = voice("tabby");

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
  tabby("Mrrrow!", "A visitor! Pet me? Pet me!", "heart", "hop"),
  grey("Mrp.", "I keep the facts tidy.", "paw"),
  tabby("Meow-mrrp!", "Click me. I translate meows.", "question"),
];

const AMBIENT: Record<string, SceneBuilder> = {
  about: (f) =>
    f.about.role && f.about.organization
      ? [
          grey("Mrp. Meow.", `Now at ${f.about.organization}${endStop(f.about.organization)} Fancy!`, "sparkle"),
          tabby("Mrrrow?", "Scroll down. It gets furrier.", "paw", "hop"),
        ]
      : null,
  tree: (f) => [
    tabby("Mrrrow! Meow!", `${f.tree.branches} branches! Climbing all!`, "branch", "hop"),
    grey("Meow.", `${f.tree.leaves} leaves. Ooh, crunchy!`, "leaf"),
  ],
};

/**
 * Round 10: the tree absorbed Journey, and its encore is where that
 * section's own facts earned a place — the technology count, then the
 * work/milestone split of the career entries, which used to be `journey`'s
 * own scene.
 */
const ENCORE: Record<string, SceneBuilder> = {
  tree: (f) => [
    grey("Meow. Mrp.", `${f.tree.technologies} techs. I sniffed each.`, "sparkle"),
    tabby("Mrrrow?", "Pick a branch. Peek inside!", "question", "bat"),
    grey("Mrp. Mrp.", `${f.tree.entries} entries. ${f.tree.work} were work.`, "paw"),
    tabby("Meow!", `${f.tree.milestones} milestones. Zoomies!`, "sparkle", "hop"),
  ],
};

const TOUR: Record<string, SceneBuilder> = {
  // Asymmetric on purpose: AMBIENT.about nulls out when a fact is missing and
  // simply never plays, but the tour must visit every stop, so this one falls
  // back to generic prose instead of skipping the beat.
  about: (f) => [
    tabby("Mrrrow!", "Top of the page. That's him!", "heart", "hop"),
    grey(
      "Mrp. Meow.",
      f.about.role && f.about.organization
        ? `${f.about.organization}${endStop(f.about.organization)} Purr-fect.`
        : "The human. Facts check out.",
      "paw",
    ),
  ],
  // Round 16: Playground Earth. Every number here is quoted from `f.worlds`,
  // never typed — the same discipline every other scene in this file keeps.
  // Plaques and decorations are disjoint sets (`DECORATION_LABEL` is
  // literally "no plaque · decoration"), so the second line says "plus",
  // not "of these" — nineteen plaques plus nine decorations is twenty-eight
  // objects, not three of nineteen.
  worlds: (f) => [
    tabby("Mrrrow!", `${f.worlds.count} chapters! I'd nap on each.`, "globe", "stretch"),
    grey("Mrp. Meow.", `${f.worlds.plaques} plaques, plus ${f.worlds.decorations} doodles.`, "sparkle"),
  ],
  // Round 10: the tree absorbed Journey, and this one stop now narrates both
  // faces — the branch/leaf/technology counts first, then the entries' own
  // work count that used to be `journey`'s own tour stop, tabby's nap line
  // preserved rather than dropped.
  tree: (f) => [
    tabby("Meow meow meow!", `Look up! ${f.tree.branches} branches!`, "branch", "hop"),
    grey("Mrp.", `${f.tree.leaves} leaves, ${f.tree.technologies} techs!`, "leaf"),
    grey("Mrp. Mrp.", `${f.tree.entries} entries. ${f.tree.work} were work.`, "paw", "groom"),
    tabby("Mrrrow!", "Napped through it. Counts!", "zzz", "sleep"),
  ],
  contact: () => [
    tabby("Mrrrow-meow-meow!", "Say hi! Leave a note!", "mail", "hop"),
    grey("Mrp.", "Or just email. Fish welcome.", "fish", "eat"),
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
  {
    readonly meow: string;
    readonly sub: (year: number | null) => string | null;
    readonly icon?: CatIcon;
    readonly act?: CatAct;
  }
> = {
  flight: {
    meow: "Mrrrow...",
    sub: () => `Long flight. ${origin.arrived}${endStop(origin.arrived)}`,
    icon: "globe",
  },
  seed: { meow: "Mrp!", sub: () => "Right here. Plant it!", icon: "leaf", act: "hop" },
  rain: {
    meow: "Mrrp-meow.",
    sub: (year) => (year === null ? null : `${year} — rain. Slurp slurp.`),
    icon: "leaf",
  },
  // The storm overlay's own line — played instead of the base-kind entry
  // below whenever `storyBeatScene` is asked with `storm: true`, regardless
  // of which base weather the year actually had. See the file banner just
  // above.
  storm: {
    meow: "Mrrrow!!",
    sub: (year) => (year === null ? null : `${year} — storm! Hide the yarn!`),
    icon: "yarn",
    act: "hop",
  },
  sun: {
    meow: "Mrrp.",
    sub: (year) => (year === null ? null : `${year} — sunbeam. Purr-fect.`),
    icon: "sparkle",
    act: "stretch",
  },
  quiet: {
    meow: "Mrp...",
    sub: (year) => (year === null ? null : `${year} — quiet. Growing slowly.`),
    icon: "zzz",
    act: "sleep",
  },
  still: { meow: "Meow!", sub: () => "…and still growing!", icon: "branch", act: "hop" },
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
  const beat: DialogueBeat = {
    speaker,
    meow: entry.meow,
    sub,
    ...(entry.icon ? { icon: entry.icon } : {}),
    ...(entry.act ? { act: entry.act } : {}),
  };
  return { id: `story-${kind}`, kind: "story", beats: [beat] };
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

export interface LiveAct {
  readonly speaker: Speaker;
  readonly act: CatAct;
}

/**
 * The act the running beat is playing at `now`: its speaker and its act, from
 * the beat's start until `beatStartedAt + beatDurationMs(beat)` — the same
 * boundary the loop advances a beat on, so an act and its bubble end on the
 * same frame. Null with no scene running, on a beat that carries no act, and
 * past the beat's own reading time even on a run nobody has advanced yet: an
 * act is derived from the beat on every ask rather than stored beside it, so
 * there is no second clock that could outlive the first.
 */
export function liveAct(run: DialogueRun | null, now: number): LiveAct | null {
  if (!run) return null;
  const beat = currentBeat(run);
  if (!beat.act || now - run.beatStartedAt > beatDurationMs(beat)) return null;
  return { speaker: beat.speaker, act: beat.act };
}

/**
 * How an act is drawn. Five of the six are poses the cat already has; `hop`
 * is not a shape at all but a movement, so the cat sits and its drawing (the
 * `<svg>`, not the positioned wrapper) bounces (`[data-cat-hop]` in
 * globals.css).
 */
export function actPose(act: CatAct): { readonly pose: CatPose; readonly hopping: boolean } {
  return act === "hop" ? { pose: "sit", hopping: true } : { pose: act, hopping: false };
}

/** When the next spontaneous scene may play. `spread` is the caller's roll
 *  (0..1), passed in so this stays clockless and testable. */
export function nextDuetAt(now: number, first: boolean, spread: number): number {
  if (first) return now + DUET_FIRST_DELAY_MS;
  return now + DUET_GAP_MS + spread * DUET_GAP_SPREAD_MS;
}
