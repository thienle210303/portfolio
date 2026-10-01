import { describe, expect, it } from "vitest";
import { origin } from "@/content/portfolio";
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
  storyBeatScene,
  type StoryBeatKind,
} from "@/components/companion/companion-dialogue";
import { TOUR_STOPS } from "@/components/companion/companion-tour";
import type { CompanionFacts } from "@/lib/companion-facts";

const FACTS: CompanionFacts = {
  about: { role: "Software Engineer", organization: "DoorDash, Inc." },
  worlds: { count: 7, plaques: 19, decorations: 3, crossingKm: 13000 },
  tree: { branches: 5, leaves: 25, technologies: 33, entries: 12, work: 5, learning: 4, milestones: 3 },
  contact: { email: "x@y.z" },
};

const AMBIENT_SECTIONS = ["about", "tree"];
// Tour-only stops: sections the guided tour visits but the ambient banter
// never does, because neither has an AMBIENT builder of its own.
const TOUR_ONLY_SECTIONS = ["contact", "worlds"];

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

  it("has a tour scene for every nav section", () => {
    for (const section of [...AMBIENT_SECTIONS, ...TOUR_ONLY_SECTIONS]) {
      const scene = sceneFor("tour", section, FACTS);
      expect(scene, section).not.toBeNull();
      expect(scene!.beats.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("has a tour scene for every stop the tour actually visits", () => {
    for (const stop of TOUR_STOPS) {
      expect(
        sceneFor("tour", stop.sectionId, FACTS),
        `the pair walk to #${stop.sectionId} and have nothing to say`,
      ).not.toBeNull();
    }
  });

  it("offers encores exactly where a second fact exists", () => {
    expect(hasEncore("tree", FACTS)).toBe(true);
    expect(hasEncore("about", FACTS)).toBe(false);
    expect(hasEncore("worlds", FACTS)).toBe(false);
    expect(hasEncore(null, FACTS)).toBe(false);
  });

  it("keeps every subtitle inside the budget and every meow non-empty", () => {
    const kinds = ["hello", "ambient", "encore", "tour"] as const;
    for (const kind of kinds) {
      for (const section of [null, ...AMBIENT_SECTIONS, ...TOUR_ONLY_SECTIONS]) {
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
    for (const section of [...AMBIENT_SECTIONS, ...TOUR_ONLY_SECTIONS]) {
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
      for (const section of [null, ...AMBIENT_SECTIONS, ...TOUR_ONLY_SECTIONS]) {
        const scene = sceneFor(kind, section, FACTS);
        if (!scene) continue;
        for (const beat of scene.beats) {
          expect(beat.sub, `${scene.id}: "${beat.sub}"`).not.toMatch(/\.\./);
        }
      }
    }
  });
});

describe("story scenes", () => {
  const SEASON_KINDS: StoryBeatKind[] = ["rain", "sun", "storm", "quiet"];
  const FIXED_KINDS: StoryBeatKind[] = ["flight", "seed", "still"];
  const ALL_KINDS: StoryBeatKind[] = [...FIXED_KINDS, ...SEASON_KINDS];

  it("plays one beat, on the given speaker, kind 'story'", () => {
    for (const speaker of ["grey", "tabby"] as const) {
      const scene = storyBeatScene("storm", 2022, FACTS, speaker);
      expect(scene).not.toBeNull();
      expect(scene!.kind).toBe("story");
      expect(scene!.beats).toHaveLength(1);
      expect(scene!.beats[0].speaker).toBe(speaker);
    }
  });

  it("keeps every subtitle inside the budget and every meow non-empty and cat-shaped", () => {
    for (const kind of ALL_KINDS) {
      const year = SEASON_KINDS.includes(kind) ? 2022 : null;
      const scene = storyBeatScene(kind, year, FACTS, "grey");
      expect(scene, kind).not.toBeNull();
      const beat = scene!.beats[0];
      expect(beat.sub.length, `${kind}: "${beat.sub}"`).toBeLessThanOrEqual(SUB_MAX_CHARS);
      expect(beat.meow.length).toBeGreaterThan(0);
      expect(beat.meow).toMatch(/^[Mm][a-z!?.\- ]*$/i);
    }
  });

  it("leads every season subtitle with its own year", () => {
    for (const kind of SEASON_KINDS) {
      const scene = storyBeatScene(kind, 2019, FACTS, "tabby");
      expect(scene!.beats[0].sub.startsWith("2019")).toBe(true);
    }
  });

  it("names no year at all for seed or still", () => {
    for (const kind of ["seed", "still"] as const) {
      const scene = storyBeatScene(kind, null, FACTS, "grey");
      expect(scene!.beats[0].sub).not.toMatch(/\d/);
    }
  });

  it("the flight names origin.arrived verbatim, not a computed beat year or a re-typed date", () => {
    const scene = storyBeatScene("flight", null, FACTS, "grey");
    expect(scene!.beats[0].sub).toContain(origin.arrived);
  });

  it("returns null for a beat kind the bank does not recognise", () => {
    expect(storyBeatScene("nonsense" as StoryBeatKind, 2019, FACTS, "grey")).toBeNull();
  });

  it("returns null for a season kind with no year to narrate", () => {
    for (const kind of SEASON_KINDS) {
      expect(storyBeatScene(kind, null, FACTS, "grey")).toBeNull();
    }
  });

  it("never names a city, only the flight's authored arrival", () => {
    for (const kind of ALL_KINDS) {
      const year = SEASON_KINDS.includes(kind) ? 2021 : null;
      const scene = storyBeatScene(kind, year, FACTS, "grey");
      expect(scene!.beats[0].sub).not.toMatch(/Kiên|Giang|Việt Nam/);
    }
  });

  /**
   * `storm` is a fact independent of `kind`: real content puts a milestone
   * in every active year, so the storm overlay has to layer on top of
   * whichever base weather (rain/sun/quiet) the year actually had, not
   * replace it as its own fourth kind — see `Season.storm` in
   * `origin-story.ts` and `WeatherLayer`/`StormOverlay` in
   * `OriginStory.tsx`.
   */
  describe("the storm overlay", () => {
    const BASE_KINDS: StoryBeatKind[] = ["rain", "sun", "quiet"];

    it("narrates the storm line instead of the base kind's own when storm is true", () => {
      for (const kind of BASE_KINDS) {
        const scene = storyBeatScene(kind, 2021, FACTS, "grey", true);
        const storm = storyBeatScene("storm", 2021, FACTS, "grey");
        expect(scene, kind).not.toBeNull();
        expect(scene!.beats[0].sub, kind).toBe(storm!.beats[0].sub);
        expect(scene!.beats[0].meow, kind).toBe(storm!.beats[0].meow);
      }
    });

    it("narrates the base kind's own line when storm is false or omitted", () => {
      for (const kind of BASE_KINDS) {
        const withFalse = storyBeatScene(kind, 2021, FACTS, "grey", false);
        const omitted = storyBeatScene(kind, 2021, FACTS, "grey");
        const plain = storyBeatScene(kind, 2021, FACTS, "grey");
        expect(withFalse!.beats[0].sub).toBe(plain!.beats[0].sub);
        expect(omitted!.beats[0].sub).toBe(plain!.beats[0].sub);
      }
    });

    it("still leads with the year and stays in budget when storm overrides the base kind", () => {
      for (const kind of BASE_KINDS) {
        const scene = storyBeatScene(kind, 2024, FACTS, "tabby", true);
        expect(scene!.beats[0].sub.startsWith("2024")).toBe(true);
        expect(scene!.beats[0].sub.length).toBeLessThanOrEqual(SUB_MAX_CHARS);
      }
    });

    it("ignores storm=true for flight, seed and still — none of them narrate a year", () => {
      for (const kind of ["flight", "seed", "still"] as const) {
        const plain = storyBeatScene(kind, null, FACTS, "grey", false);
        const forced = storyBeatScene(kind, null, FACTS, "grey", true);
        expect(forced!.beats[0].sub).toBe(plain!.beats[0].sub);
        expect(forced!.beats[0].meow).toBe(plain!.beats[0].meow);
      }
    });
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
