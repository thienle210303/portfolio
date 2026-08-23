# Companion Duet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The two companion cats become subtitled storytellers — meow first, italic "translation" beneath — with one pure dialogue engine powering ambient per-section banter and the guided tour.

**Architecture:** A new pure module `companion-dialogue.ts` (scene bank + run state, mirroring `companion-tour.ts`'s shape) is consumed by `Companion.tsx`, which replaces the field-note machinery with a duet run: two viewport-clamped bubble nodes painted per frame at each cat, advanced by a reading-time clock or by clicking the tabby. The tour reuses the same scenes; `TourHud`'s `role="status"` region carries the speaker-labelled transcript as the accessible half.

**Tech Stack:** Next.js 16 / React, TypeScript strict, Tailwind v4 semantic aliases only, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-22-companion-duet-design.md`. One amendment, decided during planning: the spec said "click either cat to advance" — but the grey cat's click is already the quick-actions button (and "stop tour" mid-tour), so **only the tabby drives dialogue** (advance / start / encore). The grey cat's behavior is untouched everywhere. Rationale: never break an existing affordance for a new one.

## Global Constraints

- Node >= 22.12 (`package.json` engines); run everything with `pnpm`, never npm/yarn.
- Semantic color aliases only (`text-fg`, `text-fg-subtle`, `border-rule`, `bg-surface`) — never a raw `--color-*` token or hex.
- No `Math.random()`/`Date.now()` inside the pure module — randomness is passed in as `roll`, time as `now` (the exact pattern `companion-notes.ts`/`companion-tour.ts` use).
- Every number in a subtitle comes from `CompanionFacts` — never typed into the scene bank.
- Subtitle budget: `SUB_MAX_CHARS = 64`; a resolved scene with an over-budget or fact-missing line returns `null` and never plays.
- Ambient dialogue is `aria-hidden` decoration; the tour HUD is the accessible narrator.
- After every task: `pnpm typecheck && pnpm lint` must pass. Final task runs `pnpm verify` and the Playwright suites.

---

### Task 1: The dialogue engine — `companion-dialogue.ts`

**Files:**
- Create: `src/components/companion/companion-dialogue.ts`
- Test: `tests/lib/companion-dialogue.test.ts`

**Interfaces:**
- Consumes: `CompanionFacts` from `@/lib/companion-facts`.
- Produces (used by Tasks 2–4):
  - `type Speaker = "grey" | "tabby"`
  - `interface DialogueBeat { speaker: Speaker; meow: string; sub: string }`
  - `interface DialogueScene { id: string; kind: SceneKind; beats: readonly DialogueBeat[] }`
  - `type SceneKind = "hello" | "ambient" | "encore" | "tour"`
  - `sceneFor(kind: SceneKind, section: string | null, facts: CompanionFacts): DialogueScene | null` (for `"hello"`, section is ignored — pass `null`)
  - `hasEncore(section: string | null, facts: CompanionFacts): boolean`
  - `interface DialogueRun { scene: DialogueScene; beatIndex: number; beatStartedAt: number }`
  - `startScene(scene: DialogueScene, now: number): DialogueRun`
  - `currentBeat(run: DialogueRun): DialogueBeat`
  - `advanceBeat(run: DialogueRun, now: number): DialogueRun | null` (null = scene complete)
  - `beatDurationMs(beat: DialogueBeat): number`
  - Constants: `SUB_MAX_CHARS = 64`, `BEAT_MIN_MS = 2400`, `BEAT_MAX_MS = 5000`, `BEAT_MS_PER_CHAR = 55`, `DUET_FIRST_DELAY_MS = 8000`, `DUET_GAP_MS = 75_000`, `DUET_GAP_SPREAD_MS = 60_000`, `DUET_ODDS = 0.45`, `nextDuetAt(now: number, first: boolean, spread: number): number`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/companion-dialogue.test.ts
import { describe, expect, it } from "vitest";
import {
  SUB_MAX_CHARS,
  BEAT_MIN_MS,
  BEAT_MAX_MS,
  advanceBeat,
  beatDurationMs,
  currentBeat,
  hasEncore,
  nextDuetAt,
  sceneFor,
  startScene,
} from "@/components/companion/companion-dialogue";
import type { CompanionFacts } from "@/lib/companion-facts";

const FACTS: CompanionFacts = {
  about: { role: "Software Engineer", organization: "DoorDash, Inc." },
  philosophy: { principles: 5 },
  work: { caseStudies: 3, sourcedMetrics: 14 },
  journey: { entries: 12, work: 5, learning: 4, milestones: 3 },
  skills: { categories: 6, distinctSkills: 38 },
  tree: { branches: 5, leaves: 25, technologies: 33 },
  lab: { experiments: 6, verified: 4 },
  contact: { email: "x@y.z" },
};

const AMBIENT_SECTIONS = ["about", "philosophy", "work", "journey", "skills", "tree", "lab"];

describe("scene bank", () => {
  it("has a hello scene with both speakers and alternation", () => {
    const scene = sceneFor("hello", null, FACTS);
    expect(scene).not.toBeNull();
    const speakers = new Set(scene!.beats.map((b) => b.speaker));
    expect(speakers).toEqual(new Set(["grey", "tabby"]));
    for (let i = 1; i < scene!.beats.length; i++) {
      expect(scene!.beats[i].speaker).not.toBe(scene!.beats[i - 1].speaker);
    }
  });

  it("has an ambient scene for every section with facts, none for contact/unknown", () => {
    for (const section of AMBIENT_SECTIONS) {
      expect(sceneFor("ambient", section, FACTS), section).not.toBeNull();
    }
    expect(sceneFor("ambient", "contact", FACTS)).toBeNull();
    expect(sceneFor("ambient", "nope", FACTS)).toBeNull();
    expect(sceneFor("ambient", null, FACTS)).toBeNull();
  });

  it("has a tour scene for all eight nav sections", () => {
    for (const section of [...AMBIENT_SECTIONS, "contact"]) {
      const scene = sceneFor("tour", section, FACTS);
      expect(scene, section).not.toBeNull();
      expect(scene!.beats.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("offers encores exactly where a second fact exists", () => {
    expect(hasEncore("journey", FACTS)).toBe(true);
    expect(hasEncore("tree", FACTS)).toBe(true);
    expect(hasEncore("lab", FACTS)).toBe(true);
    expect(hasEncore("about", FACTS)).toBe(false);
    expect(hasEncore("skills", FACTS)).toBe(false);
    expect(hasEncore(null, FACTS)).toBe(false);
  });

  it("keeps every subtitle inside the budget and every meow non-empty", () => {
    const kinds = ["hello", "ambient", "encore", "tour"] as const;
    for (const kind of kinds) {
      for (const section of [null, ...AMBIENT_SECTIONS, "contact"]) {
        const scene = sceneFor(kind, section, FACTS);
        if (!scene) continue;
        for (const beat of scene.beats) {
          expect(beat.sub.length, `${scene.id}: "${beat.sub}"`).toBeLessThanOrEqual(SUB_MAX_CHARS);
          expect(beat.meow.length).toBeGreaterThan(0);
          expect(beat.meow).toMatch(/^[Mm][a-z!?.\- ]*$/i);
        }
      }
    }
  });

  it("never types a number into the bank: subs only carry digits present in facts", () => {
    const factNumbers = new Set<string>(
      JSON.stringify(FACTS).match(/\d+/g) ?? [],
    );
    for (const section of AMBIENT_SECTIONS) {
      for (const kind of ["ambient", "encore", "tour"] as const) {
        const scene = sceneFor(kind, section, FACTS);
        if (!scene) continue;
        for (const beat of scene.beats) {
          for (const digits of beat.sub.match(/\d+/g) ?? []) {
            expect(factNumbers.has(digits), `${scene.id}: literal ${digits}`).toBe(true);
          }
        }
      }
    }
  });

  it("returns null when a fact the scene needs is missing", () => {
    const noRole = { ...FACTS, about: { role: "", organization: "" } };
    expect(sceneFor("ambient", "about", noRole)).toBeNull();
  });
});

describe("run state", () => {
  it("starts at beat 0, advances in order, completes to null", () => {
    const scene = sceneFor("hello", null, FACTS)!;
    let run = startScene(scene, 1000);
    expect(run.beatIndex).toBe(0);
    expect(currentBeat(run)).toBe(scene.beats[0]);
    for (let i = 1; i < scene.beats.length; i++) {
      const next = advanceBeat(run, 2000 + i);
      expect(next).not.toBeNull();
      run = next!;
      expect(run.beatIndex).toBe(i);
      expect(run.beatStartedAt).toBe(2000 + i);
    }
    expect(advanceBeat(run, 9999)).toBeNull();
  });

  it("clamps beat duration to the reading-time window", () => {
    const short = { speaker: "grey" as const, meow: "Mrp.", sub: "Hi." };
    const long = { speaker: "grey" as const, meow: "Mrp.", sub: "x".repeat(SUB_MAX_CHARS) };
    expect(beatDurationMs(short)).toBe(BEAT_MIN_MS);
    expect(beatDurationMs(long)).toBe(BEAT_MAX_MS);
  });
});

describe("cadence", () => {
  it("first slot is the fixed hello delay; later slots use gap plus spread", () => {
    expect(nextDuetAt(1000, true, 0.5)).toBe(1000 + 8000);
    expect(nextDuetAt(1000, false, 0)).toBe(1000 + 75_000);
    expect(nextDuetAt(1000, false, 1)).toBe(1000 + 75_000 + 60_000);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pnpm vitest run tests/lib/companion-dialogue.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the module**

```ts
// src/components/companion/companion-dialogue.ts
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

/** Reading-time clock for auto-advance: floor + per-character, clamped. */
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
          grey("Mrp. Meow.", `Now: ${f.about.role}, ${f.about.organization}.`),
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
  lab: (f) => [
    tabby("Meow-meow?", "What about the unverified ones?"),
    grey("Mrp.", "Open questions, and labelled as such."),
  ],
};

const TOUR: Record<string, SceneBuilder> = {
  about: (f) => [
    grey(
      "Mrp. Meow.",
      f.about.role && f.about.organization
        ? `The start. Now: ${f.about.role}, ${f.about.organization}.`
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
  return Math.min(BEAT_MAX_MS, BEAT_MIN_MS + beat.sub.length * BEAT_MS_PER_CHAR);
}

/** When the next spontaneous scene may play. `spread` is the caller's roll
 *  (0..1), passed in so this stays clockless and testable. */
export function nextDuetAt(now: number, first: boolean, spread: number): number {
  if (first) return now + DUET_FIRST_DELAY_MS;
  return now + DUET_GAP_MS + spread * DUET_GAP_SPREAD_MS;
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `pnpm vitest run tests/lib/companion-dialogue.test.ts`
Expected: PASS. If a subtitle overruns the budget with the fixture's numbers, shorten the copy — never raise the budget.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
pnpm typecheck && pnpm lint
git add src/components/companion/companion-dialogue.ts tests/lib/companion-dialogue.test.ts
git commit -m "Teach the cats a duet: one pure scene bank, meows authored, facts borrowed"
```

---

### Task 2: The tour speaks in two voices — `TourHud` transcript

**Files:**
- Modify: `src/components/companion/TourHud.tsx`
- Modify: `src/components/companion/companion-tour.ts` (delete `tourLine`)
- Modify: `src/components/companion/Companion.tsx` (tourView shape, arrival site ~line 1835, HUD render site ~line 3299)
- Test: `tests/lib/companion-tour.test.ts` (drop `tourLine` cases), e2e updated in Task 6

**Interfaces:**
- Consumes: `sceneFor("tour", sectionId, facts)`, `DialogueBeat`, `Speaker` from Task 1.
- Produces: `TourHudProps.lines: readonly DialogueBeat[]` (replaces `line: string`); `tourView` state becomes `{ index: number; lines: readonly DialogueBeat[] }`.

- [ ] **Step 1: Update `tests/lib/companion-tour.test.ts`** — delete every test that imports or exercises `tourLine` (its factual coverage moved to Task 1's tour-scene tests). Keep `TOUR_STOPS`/`startTour`/`isLastStop` tests untouched.

- [ ] **Step 2: Run the tour tests, verify they still pass**

Run: `pnpm vitest run tests/lib/companion-tour.test.ts`

- [ ] **Step 3: Delete `tourLine` from `companion-tour.ts`** (the function and its doc comment; keep everything else). Update that file's header comment: the tour's lines now come from `companion-dialogue.ts`'s `tour-*` scenes.

- [ ] **Step 4: Rework `TourHud`** — replace the `line` prop with `lines`:

```tsx
// TourHud.tsx — props
export interface TourHudProps {
  readonly stopIndex: number;
  readonly totalStops: number;
  readonly label: string;
  /** Empty until the pair have arrived — the status region must exist from
   *  first render (see below), so it mounts with no lines and fills. */
  readonly lines: readonly DialogueBeat[];
  readonly isLast: boolean;
  readonly onNext: () => void;
  readonly onEnd: () => void;
  readonly hudRef?: Ref<HTMLDivElement>;
}
```

and the status region (keeping the mount-empty-then-fill discipline and its comment):

```tsx
<p role="status" className="min-h-[2.5em] text-[length:var(--step--1)] leading-snug text-fg-muted">
  {lines
    .map((beat) => `${beat.speaker === "grey" ? "Grey" : "Tabby"}: ${beat.sub}`)
    .join(" · ")}
</p>
```

Import `type { DialogueBeat } from "./companion-dialogue"`.

- [ ] **Step 5: Update `Companion.tsx`'s two tour sites**
  - The `tourView` state and every `setTourView` call: `{ index, line: "" }` → `{ index, lines: [] }`, and the arrival site (~line 1835):

```ts
setTourView({
  index: tour.index,
  lines: sceneFor("tour", stop.sectionId, facts)?.beats ?? [],
});
```

  - The `<TourHud>` render site: `line={tourView.line}` → `lines={tourView.lines}`.
  - Imports: drop `tourLine` from the `companion-tour` import; add `sceneFor` from `./companion-dialogue`.

- [ ] **Step 6: Typecheck, lint, run unit suite, commit**

```bash
pnpm typecheck && pnpm lint && pnpm vitest run
git add -A src/components/companion tests/lib/companion-tour.test.ts
git commit -m "Hand the tour's script to the duet, and let the HUD name who is talking"
```

---

### Task 3: The bubbles — duet state machine and rendering in `Companion.tsx`

**Files:**
- Modify: `src/components/companion/Companion.tsx` only.

**Interfaces:**
- Consumes everything Task 1 produces.
- Produces (relied on by Tasks 4–6): a `duetRef: RefObject<DialogueRun | null>`; a `duetBeat` state of shape `{ speaker: Speaker; meow: string; sub: string; hintMore: boolean } | null`; two bubble elements carrying `data-cat-bubble="grey"` / `data-cat-bubble="tabby"`; a `playDuetScene(scene: DialogueScene, now: number): void` helper; a `tapTabby()` click handler.

This task replaces the field-note *runtime* (refs, loop block, render) but leaves `companion-notes.ts` on disk — deleting the module and its e2e echoes is Task 5, so every intermediate commit still typechecks.

- [ ] **Step 1: Swap the note refs for duet refs** (around lines 1049–1055):

```ts
/* ------------------------------------------------------------- duet -- */
/** The running scene, if any — advanced by the loop's reading-time clock
 *  or by a tap on the tabby, and cleared by the same things that cleared a
 *  field note, plus scene completion. The state mirror below is for JSX
 *  only, exactly the way `note` was. */
const duetRef = useRef<DialogueRun | null>(null);
const duetAt = useRef(0);
const duetShown = useRef<Set<string>>(new Set());
const duetFirstShown = useRef(false);
const [duetBeat, setDuetBeat] = useState<{
  speaker: Speaker;
  meow: string;
  sub: string;
  hintMore: boolean;
} | null>(null);
```

Remove `noteAt`, `noteShown`, `noteHideAt`, `noteFirstShown`, `note`/`setNote`, `noteNode`, `attachNote`, and `paintNote`'s note-specific caller. Add two bubble refs + attachers (same first-frame-placement shape `attachNote` had):

```ts
const greyBubble = useRef<HTMLDivElement | null>(null);
const tabbyBubble = useRef<HTMLDivElement | null>(null);
const attachGreyBubble = useCallback((node: HTMLDivElement | null) => {
  greyBubble.current = node;
  if (node) paintBubble(node, lead.current.pos);
}, []);
const attachTabbyBubble = useCallback((node: HTMLDivElement | null) => {
  tabbyBubble.current = node;
  if (node) paintBubble(node, follow.current.pos);
}, []);
```

Rename the existing module-level `paintNote` to `paintBubble` (same body — the viewport clamp stays).

- [ ] **Step 2: Add the beat-view helper and scene starter** (component scope, near the attachers):

```ts
/** What the JSX needs to draw one beat; `hintMore` marks the last beat of an
 *  ambient scene that has an encore waiting behind it. */
const beatView = useCallback(
  (run: DialogueRun): { speaker: Speaker; meow: string; sub: string; hintMore: boolean } => {
    const beat = currentBeat(run);
    const last = run.beatIndex === run.scene.beats.length - 1;
    const section = run.scene.kind === "ambient" ? run.scene.id.replace(/^ambient-/, "") : null;
    return {
      speaker: beat.speaker,
      meow: beat.meow,
      sub: beat.sub,
      hintMore: last && section !== null && hasEncore(section, facts),
    };
  },
  [facts],
);

const playDuetScene = useCallback(
  (scene: DialogueScene, now: number) => {
    const run = startScene(scene, now);
    duetRef.current = run;
    setDuetBeat(beatView(run));
  },
  [beatView],
);
```

- [ ] **Step 3: Replace the field-note loop block** (the block at ~lines 2046–2090, under the `/* field note */` banner) with the duet block. The `quiet` gate line stays identical; everything inside changes:

```ts
/* -------------------------------------------------------------- duet -- */

// Advance or finish a running scene on its reading-time clock. Tour scenes
// are exempt from the section-change cancellation (the tour scrolls the
// page itself); everything else was already dropped by the effect that
// watches `sectionRef` (see Step 5).
if (duetRef.current) {
  const beat = currentBeat(duetRef.current);
  if (now - duetRef.current.beatStartedAt > beatDurationMs(beat)) {
    const next = advanceBeat(duetRef.current, now);
    duetRef.current = next;
    setDuetBeat(next ? beatView(next) : null);
  }
}

const quiet = parked && !forced && !beat && !walking && !rushing && sectionRef.current;
if (quiet && roamingRef.current && duetRef.current === null) {
  if (duetAt.current === 0) {
    duetAt.current = nextDuetAt(now, true, 0);
  } else if (now > duetAt.current) {
    // The first scene of the visit is the hello, deterministically — it is
    // the introduction and the discoverability fix in one. Every scene
    // after it rolls the same odds the notes rolled.
    const first = !duetFirstShown.current;
    duetFirstShown.current = true;
    duetAt.current = nextDuetAt(now, false, Math.random());
    const scene = first
      ? sceneFor("hello", null, facts)
      : !duetShown.current.has(sectionRef.current!) && Math.random() < DUET_ODDS
        ? sceneFor("ambient", sectionRef.current, facts)
        : null;
    if (scene) {
      if (scene.kind === "ambient") duetShown.current.add(sectionRef.current!);
      playDuetScene(scene, now);
    }
  }
}
```

- [ ] **Step 4: Paint the bubbles per frame** — replace the old `if (noteHideAt.current !== 0) paintNote(...)` site (~line 2465) with:

```ts
if (duetRef.current) {
  paintBubble(greyBubble.current, grey.pos);
  paintBubble(tabbyBubble.current, tabby.pos);
}
```

Also add both bubble nodes to the `syncTone` batch alongside the toy/furniture so they survive `contrast` sections:

```ts
if (duetBeatRef.current) {
  syncTone(greyBubble.current, centreOf(grey.pos));
  syncTone(tabbyBubble.current, centreOf(tabby.pos));
}
```

(Mirror `duetBeat` into a `duetBeatRef` the same way `open`/`night` are mirrored, or simply gate on `duetRef.current` — either is fine; use `duetRef`.)

- [ ] **Step 5: Cancellation.** In the section-change path that cleared notes (~lines 1173–1178, inside the effect that sets `sectionRef.current`), replace the note-clearing with:

```ts
// A scene is *about* the section it started in. The tour is exempt — it
// is the thing doing the scrolling.
if (duetRef.current && duetRef.current.scene.kind !== "tour") {
  duetRef.current = null;
  setDuetBeat(null);
}
```

Also clear the duet wherever a forced state begins (the escort start and nap start already clear scenes/notes — search for where `setNote(null)` was called and mirror each site with `duetRef.current = null; setDuetBeat(null);`).

- [ ] **Step 6: The tabby becomes the storyteller control.** Replace the follow cat's render (the `aria-hidden` div at ~line 3239) with the lead cat's two-mode pattern: a `<button>` while roaming and free, the plain decorative div mid-escort/tour/nap:

```tsx
{roams && showRoamers ? (
  forced === null ? (
    <button
      ref={attachFollow}
      type="button"
      onClick={tapTabby}
      className="absolute left-0 top-0 text-fg-muted"
      style={{ width: CAT_W, height: CAT_H }}
    >
      <span ref={followArt} className="block" style={{ transform: `scaleX(${frame.follow.facing})` }}>
        <CompanionCat variant="tabby" {...frame.follow} />
      </span>
      <span className="sr-only">
        {duetBeat ? "Next line" : "Ask the cats about this section"}
      </span>
    </button>
  ) : (
    /* existing decorative div, unchanged */
  )
) : null}
```

`forced` is loop state, not render state — mirror it the way `bed`/`scene` are mirrored (add it to the committed visual frame), or gate on the already-rendered equivalents (`escort !== null || tourView !== null || mode === "resting"`). Use the latter — it is render state that already exists.

`tapTabby`, next to the other handlers:

```ts
const tapTabby = useCallback(() => {
  const now = performance.now();
  const run = duetRef.current;
  if (run) {
    const last = run.beatIndex === run.scene.beats.length - 1;
    const section = sectionRef.current;
    if (last && run.scene.kind === "ambient" && section && hasEncore(section, facts)) {
      const encore = sceneFor("encore", section, facts);
      if (encore) {
        playDuetScene(encore, now);
        return;
      }
    }
    const next = advanceBeat(run, now);
    duetRef.current = next;
    setDuetBeat(next ? beatView(next) : null);
    return;
  }
  const section = sectionRef.current;
  if (!section) return;
  const scene = duetShown.current.has(section)
    ? sceneFor("encore", section, facts)
    : sceneFor("ambient", section, facts);
  if (scene) {
    if (scene.kind === "ambient") duetShown.current.add(section);
    playDuetScene(scene, performance.now());
  }
}, [beatView, facts, playDuetScene]);
```

- [ ] **Step 7: Render the bubbles** — replace the single note div (~line 3149) with two, one per cat; only the active speaker's is mounted:

```tsx
{roams && roaming && duetBeat ? (
  <div
    ref={duetBeat.speaker === "grey" ? attachGreyBubble : attachTabbyBubble}
    data-cat-bubble={duetBeat.speaker}
    aria-hidden="true"
    className="pointer-events-none absolute left-0 top-0 w-max max-w-[16rem] border border-rule bg-surface px-2 py-1"
  >
    <p className="whitespace-nowrap font-mono text-[0.62rem] uppercase tracking-[0.1em] text-fg-subtle">
      {duetBeat.meow}
    </p>
    <p className="text-[0.68rem] italic leading-snug text-fg-muted">
      {duetBeat.sub}
      {duetBeat.hintMore ? <span className="text-fg-subtle"> …more?</span> : null}
    </p>
  </div>
) : null}
```

Note the subtitle wraps (`max-w-[16rem]`, no nowrap) — 64 chars at 0.68rem is two short lines at most; the meow stays nowrap. The bubble is `aria-hidden` + `pointer-events-none`: the *tabby button* is the interactive surface, so the decoration never becomes an unreachable control.

- [ ] **Step 8: Typecheck, lint, manual check**

```bash
pnpm typecheck && pnpm lint
```

Run `pnpm dev`, open http://localhost:3000, wait ~8s without touching anything after the cats settle: the hello plays, alternating bubbles with meow + italic sub. Click the tabby: beat advances. Scroll to Journey, click the tabby: ambient scene; at its last beat "…more?" shows; click tabby again: encore. Check both themes and a `contrast` section (Closing).

- [ ] **Step 9: Commit**

```bash
git add src/components/companion/Companion.tsx
git commit -m "Let the pair perform: bubbles that meow, subtitles that translate, a tabby that answers"
```

---

### Task 4: The tour performs its beats through the bubbles

**Files:**
- Modify: `src/components/companion/Companion.tsx` (arrival site from Task 2's Step 5).

**Interfaces:** consumes `playDuetScene` (Task 3) and the tour arrival site (Task 2).

- [ ] **Step 1: Start the scene at arrival.** Where Task 2 set `tourView` lines (~line 1835), also perform them:

```ts
tour.phase = "arrived";
tour.arrivedAt = now;
const stopScene = sceneFor("tour", stop.sectionId, facts);
setTourView({ index: tour.index, lines: stopScene?.beats ?? [] });
if (stopScene) playDuetScene(stopScene, now);
```

- [ ] **Step 2: Clear the performance when the tour moves on or ends.** In `advanceTour` and `endTour` (and the tour-teardown branch inside the loop), add `duetRef.current = null; setDuetBeat(null);` beside the existing `setTourView` updates.

- [ ] **Step 3: Verify the ambient gate cannot double-book.** Confirm the Task 3 scheduling block is gated on `quiet` (which requires `!forced`) — a running tour is `forced === "tour"`, so no ambient scene can start mid-tour. No code change expected; this is a read-and-confirm step.

- [ ] **Step 4: Manual check** — start "Show me around" from the toolkit panel: at each stop the bubbles trade the two beats while the HUD shows "Grey: … · Tabby: …"; "Next stop" moves on and the old bubbles clear; "End tour" clears everything.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
pnpm typecheck && pnpm lint
git add src/components/companion/Companion.tsx
git commit -m "Give the tour its stage voice: each stop performed, the HUD keeping the transcript"
```

---

### Task 5: Retire the field notes

**Files:**
- Delete: `src/components/companion/companion-notes.ts`, `tests/lib/companion-notes.test.ts`
- Modify: `src/components/companion/Companion.tsx` (remove the now-unused import), `e2e/companion.spec.ts` (the field-note test)

- [ ] **Step 1: Remove the `companion-notes` import** from `Companion.tsx` (`fieldNote`, `nextNoteAt`, `NOTE_SHOW_MS`) — Task 3 removed every use; the import is dead.

- [ ] **Step 2: Delete the module and its unit tests**

```bash
git rm src/components/companion/companion-notes.ts tests/lib/companion-notes.test.ts
```

- [ ] **Step 3: Rewrite the field-note e2e test** in `e2e/companion.spec.ts` ("shows a field note that is decorative, in view, and eventually clears") as the duet hello test — same clock-stubbing approach that test already uses, new selectors:

```ts
test("the hello duet plays: decorative bubbles, meow above, subtitle beneath", async ({ page }) => {
  // (reuse the existing test's setup/fast-forward mechanism verbatim)
  const bubble = page.locator("[data-cat-bubble]");
  await expect(bubble).toBeVisible({ timeout: 15_000 });
  await expect(bubble).toHaveAttribute("aria-hidden", "true");
  const meow = await bubble.locator("p").first().textContent();
  expect(meow).toMatch(/^m[a-z!?.\- ]*$/i);
  const sub = await bubble.locator("p").nth(1).textContent();
  expect(sub?.length ?? 0).toBeGreaterThan(0);
  // The bubble stays inside the viewport whatever edge the cats chose.
  const box = await bubble.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
});
```

Adapt the existing test's wait/fast-forward mechanics — do not invent a new timing scheme; the old field-note test shows the working pattern for getting the pair settled and the first-delay elapsed.

- [ ] **Step 4: Full unit suite + grep for stragglers**

```bash
pnpm vitest run
grep -rn "companion-notes\|fieldNote\|NOTE_SHOW_MS\|data-cat-note-bubble" src e2e tests
```

Expected: tests pass; grep finds nothing (fix anything it finds — `data-cat-note-bubble` may appear in e2e helpers).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Retire the field notes: the duet is the ambient voice now"
```

---

### Task 6: e2e coverage and the full gate

**Files:**
- Modify: `e2e/companion.spec.ts` (new duet tests; update any tour test asserting the old single-line HUD text)

- [ ] **Step 1: Add duet e2e tests** to `e2e/companion.spec.ts`, following that file's existing conventions (its clock stubs, its 1440/375 project split):

```ts
test("clicking the tabby advances the duet a beat", async ({ page }) => {
  // settle + trigger hello via the file's established fast-forward pattern
  const bubble = page.locator("[data-cat-bubble]");
  await expect(bubble).toBeVisible({ timeout: 15_000 });
  const before = await bubble.locator("p").nth(1).textContent();
  await page.getByRole("button", { name: "Next line" }).click();
  await expect(bubble.locator("p").nth(1)).not.toHaveText(before ?? "");
});

test("scrolling to another section ends an ambient scene mid-beat", async ({ page }) => {
  // start an ambient scene by clicking the tabby inside #journey (scroll there first),
  const tabby = page.getByRole("button", { name: /Ask the cats|Next line/ });
  await page.locator("#journey").scrollIntoViewIfNeeded();
  await tabby.click();
  await expect(page.locator("[data-cat-bubble]")).toBeVisible();
  await page.locator("#skills").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-cat-bubble]")).toBeHidden();
});

test("the tour HUD carries both speakers' subtitles", async ({ page }) => {
  // start the tour via the toolkit panel (existing helper in this file)
  const status = page.getByRole("status").filter({ hasText: "Grey:" });
  await expect(status).toContainText("Tabby:");
});
```

These are shapes — wire each into the file's real helpers (settling, clock stubs, panel opening) rather than duplicating mechanics. Update any existing tour e2e assertion that expects the old one-line HUD text.

- [ ] **Step 2: Run the companion suite at both widths**

Run: `pnpm exec playwright test e2e/companion.spec.ts --project=chromium-1440 --project=chromium-375`
Expected: all green.

- [ ] **Step 3: Axe with a scene up** — extend `e2e/axe.spec.ts` only if its full-page audit doesn't already run with the companion mounted (it does; confirm no new violations appear in its run).

- [ ] **Step 4: The full gate**

```bash
pnpm verify
pnpm exec playwright test
```

Expected: verify green; full matrix green (the 321 skips are viewport guards, normal).

- [ ] **Step 5: Manual pass, both themes** — dev server, day + night: hello, ambient, encore, tour, contrast-section tone sampling, 375px bubble clamping. Screenshot anything that looks off before fixing it.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Prove the duet: hello, advance, cancel and transcript, at both widths"
```

---

## Self-review notes

- Spec coverage: content model (T1), presentation (T3.7), interaction advance/encore/nudge (T3.6), cancellation (T3.5), tour (T2+T4), cadence (T3.3), a11y (bubbles aria-hidden + tabby button sr-only, HUD status; T3/T2), reduced-motion (no roaming → `roams && roaming` gate already excludes bubbles; no new work), retirement of notes (T5), testing (T1, T5, T6). "…more?" is a hint inside the decoration; the control is the tabby — deviation from spec's bubble-click, recorded in the header with the grey-cat amendment.
- Type consistency: `DialogueBeat`/`Speaker` flow T1 → T2 (TourHud) → T3 (beatView) unchanged; `playDuetScene(scene, now)` signature identical in T3/T4.
- No placeholders; every code block is concrete. Line numbers are anchors, not gospel — each step names the searchable banner or symbol it edits.
