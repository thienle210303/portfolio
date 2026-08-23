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

  it("never double-stops a subtitle, even when a fact already ends in a period", () => {
    // FACTS.about.organization is "DoorDash, Inc." — already period-terminated,
    // so any template that blindly appends its own "." would show "Inc..".
    const kinds = ["hello", "ambient", "encore", "tour"] as const;
    for (const kind of kinds) {
      for (const section of [null, ...AMBIENT_SECTIONS, "contact"]) {
        const scene = sceneFor(kind, section, FACTS);
        if (!scene) continue;
        for (const beat of scene.beats) {
          expect(beat.sub, `${scene.id}: "${beat.sub}"`).not.toMatch(/\.\./);
        }
      }
    }
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
