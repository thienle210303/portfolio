"use client";

import type { CompanionFacts } from "@/lib/companion-facts";

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

export type SceneKind = "hello" | "ambient" | "encore" | "tour";

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
  philosophy: (f) => [
    tabby("Meow meow meow!", `${f.philosophy.principles} principles! I counted them myself!`),
    grey("Mrp.", "One loop. He runs it on everything."),
  ],
  work: (f) => [
    tabby("Mrrrow-meow!", `Ooh — ${f.work.caseStudies} case studies live here!`),
    grey("Meow. Mrp.", `${f.work.sourcedMetrics} sourced figures between them.`),
  ],
  journey: (f) => [
    grey("Mrp. Mrp.", `${f.journey.entries} entries here. ${f.journey.work} are work.`),
    tabby("Mrrrow!", "I watched every one. From the windowsill."),
  ],
  skills: (f) => [
    tabby("Meow-meow-meow!", `${f.skills.distinctSkills} skills in ${f.skills.categories} groups!`),
    grey("Mrp.", "No star ratings. Evidence only. House rule."),
  ],
  tree: (f) => [
    tabby("Mrrrow! Meow!", `A tree! ${f.tree.branches} branches, ${f.tree.leaves} leaves!`),
    grey("Meow.", "We planted nothing. It grew from the timeline."),
  ],
  lab: (f) => [
    grey("Mrp. Meow.", `${f.lab.experiments} experiments. ${f.lab.verified} verified.`),
    tabby("Mrrrow-mrrp!", "The rest say 'no results yet' — honestly!"),
  ],
};

const ENCORE: Record<string, SceneBuilder> = {
  journey: (f) => [
    grey("Mrp.", `Also: ${f.journey.learning} learning, ${f.journey.milestones} milestones.`),
    tabby("Meow!", "The milestones are my favourite. Confetti days."),
  ],
  tree: (f) => [
    grey("Meow. Mrp.", `${f.tree.technologies} technologies hang on those branches.`),
    tabby("Mrrrow?", "Hover one! The tree lights up where it lives."),
  ],
  lab: () => [
    tabby("Meow-meow?", "What about the unverified ones?"),
    grey("Mrp.", "Open questions, and labelled as such."),
  ],
};

const TOUR: Record<string, SceneBuilder> = {
  // Asymmetric on purpose: AMBIENT.about nulls out when a fact is missing and
  // simply never plays, but the tour must visit every stop, so this one falls
  // back to generic prose instead of skipping the beat.
  about: (f) => [
    grey(
      "Mrp. Meow.",
      f.about.role && f.about.organization
        ? `The start. Now: ${f.about.role}, ${f.about.organization}${endStop(f.about.organization)}`
        : "The start of the page.",
    ),
    tabby("Mrrrow!", "Scroll with us — we know all the good spots!"),
  ],
  philosophy: (f) => [
    tabby("Meow meow!", `${f.philosophy.principles} principles run this loop.`),
    grey("Mrp.", "It's short. Read it twice anyway."),
  ],
  work: (f) => [
    grey("Meow. Mrp.", `${f.work.caseStudies} case studies, ${f.work.sourcedMetrics} sourced figures.`),
    tabby("Mrrrow-meow!", "Problem, solution, receipts. My kind of story."),
  ],
  journey: (f) => [
    grey("Mrp.", `${f.journey.entries} entries — ${f.journey.work} of them work.`),
    tabby("Meow-mrrp!", "Filter it! The connectors mind the gaps."),
  ],
  skills: (f) => [
    tabby("Mrrrow!", `${f.skills.categories} categories, ${f.skills.distinctSkills} skills!`),
    grey("Mrp. Meow.", "Each one points at where it was used."),
  ],
  tree: (f) => [
    tabby("Meow meow meow!", `${f.tree.branches} branches, ${f.tree.leaves} leaves!`),
    grey("Mrp.", `${f.tree.technologies} technologies. All from the timeline.`),
  ],
  lab: (f) => [
    grey("Meow. Mrp.", `${f.lab.experiments} experiments here, ${f.lab.verified} verified.`),
    tabby("Mrrrow?", "The open ones say so. Refreshing, honestly."),
  ],
  contact: () => [
    tabby("Mrrrow-meow-meow!", "That's everywhere! This is where you write."),
    grey("Mrp.", "The form works. So does plain email."),
  ],
};

/** A resolved scene, or null for "nothing to play" — over-budget subs and
 *  missing facts both land there, and the caller cannot tell the difference,
 *  which is deliberate. */
export function sceneFor(
  kind: SceneKind,
  section: string | null,
  facts: CompanionFacts,
): DialogueScene | null {
  const builder =
    kind === "hello" ? HELLO : section ? { ambient: AMBIENT, encore: ENCORE, tour: TOUR }[kind]?.[section] : undefined;
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
