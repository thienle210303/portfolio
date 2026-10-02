import { describe, expect, it } from "vitest";
import { origin } from "@/content/portfolio";
import {
  CAT_ACTS,
  CAT_ICONS,
  SUB_MAX_CHARS,
  BEAT_MIN_MS,
  BEAT_MAX_MS,
  actPose,
  advanceBeat,
  beatDurationMs,
  liveAct,
  currentBeat,
  hasEncore,
  nextDuetAt,
  sceneFor,
  startScene,
  storyBeatScene,
  type DialogueBeat,
  type DialogueScene,
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

/** Every scene that must exist for FACTS: a null here means a line was
 *  dropped (over budget, or a fact went missing), which `sceneFor` and
 *  `storyBeatScene` do silently — so the tests below assert presence before
 *  they look at lengths. The null-year weather kinds legitimately return
 *  null and are deliberately not in this set. */
const MUST_EXIST: { label: string; build: () => DialogueScene | null }[] = [
  { label: "hello", build: () => sceneFor("hello", null, FACTS) },
  { label: "ambient about", build: () => sceneFor("ambient", "about", FACTS) },
  { label: "ambient tree", build: () => sceneFor("ambient", "tree", FACTS) },
  { label: "encore tree", build: () => sceneFor("encore", "tree", FACTS) },
  { label: "tour about", build: () => sceneFor("tour", "about", FACTS) },
  { label: "tour worlds", build: () => sceneFor("tour", "worlds", FACTS) },
  { label: "tour tree", build: () => sceneFor("tour", "tree", FACTS) },
  { label: "tour contact", build: () => sceneFor("tour", "contact", FACTS) },
  ...(["flight", "seed", "still", "rain", "sun", "storm", "quiet"] as StoryBeatKind[]).flatMap((kind) =>
    [false, true].map((storm) => ({
      label: `story ${kind} storm=${storm}`,
      build: () => storyBeatScene(kind, 2019, FACTS, "grey", storm),
    })),
  ),
];

/** Every distinct beat of every must-exist scene, failing loudly if a scene
 *  is missing. Deduped by scene id + beat index + subtitle, so a scene reached
 *  twice (the storm overlay replays the storm line under three kinds) is not
 *  counted twice, while a genuinely different line under the same id is. */
function allBeats(): { id: string; beat: DialogueBeat }[] {
  const seen = new Set<string>();
  const out: { id: string; beat: DialogueBeat }[] = [];
  for (const { label, build } of MUST_EXIST) {
    const scene = build();
    expect(scene, `${label}: scene is missing (dropped over budget or a missing fact?)`).not.toBeNull();
    scene!.beats.forEach((beat, index) => {
      const key = `${scene!.id}#${index}#${beat.sub}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ id: scene!.id, beat });
    });
  }
  return out;
}

describe("short, playful lines", () => {
  it("keeps every subtitle to 32 characters", () => {
    expect(SUB_MAX_CHARS).toBe(32);
    const beats = allBeats();
    expect(beats.length).toBeGreaterThan(20);
    for (const { id, beat } of beats) {
      expect(beat.sub.length, `${id}: "${beat.sub}"`).toBeLessThanOrEqual(32);
    }
  });

  it("uses only known icons and actions", () => {
    const beats = allBeats();
    expect(beats.length).toBeGreaterThan(0);
    for (const { id, beat } of beats) {
      expect(beat.icon === undefined || CAT_ICONS.includes(beat.icon), `${id}: icon ${beat.icon}`).toBe(true);
      expect(beat.act === undefined || CAT_ACTS.includes(beat.act), `${id}: act ${beat.act}`).toBe(true);
    }
    const withIcon = beats.filter(({ beat }) => beat.icon !== undefined).length / beats.length;
    const withAct = beats.filter(({ beat }) => beat.act !== undefined).length / beats.length;
    expect(withIcon).toBeGreaterThanOrEqual(0.6);
    expect(withAct).toBeGreaterThanOrEqual(0.3);
    expect(withAct).toBeLessThanOrEqual(0.7);
  });

  it("lists all twelve icons and six acts", () => {
    expect(CAT_ICONS).toEqual([
      "yarn", "fish", "moth", "paw", "zzz", "heart", "sparkle", "leaf", "globe", "mail", "question", "branch",
    ]);
    expect(CAT_ACTS).toEqual(["bat", "groom", "stretch", "eat", "sleep", "hop"]);
  });

  it("falls back to the generic tour line, with its icon, when the about facts are missing", () => {
    const scene = sceneFor("tour", "about", { ...FACTS, about: { role: "", organization: "" } });
    expect(scene).not.toBeNull();
    const fallback = scene!.beats.find((beat) => beat.sub === "The human. Facts check out.");
    expect(fallback).toBeDefined();
    expect(fallback!.icon).toBe("paw");
  });

  it("drops a templated line rather than truncating it, exactly at the 32 boundary", () => {
    // "Now at <organization>. Fancy!" is the organization plus 15 characters
    // (the full stop is added because the organization does not end in one).
    const withOrg = (organization: string) => ({ ...FACTS, about: { role: "Software Engineer", organization } });
    const fits = "A".repeat(32 - 15);
    const tooLong = "A".repeat(33 - 15);

    const ok = sceneFor("ambient", "about", withOrg(fits));
    expect(ok).not.toBeNull();
    expect(ok!.beats[0].sub).toHaveLength(32);

    expect(`Now at ${tooLong}. Fancy!`).toHaveLength(33);
    expect(sceneFor("ambient", "about", withOrg(tooLong))).toBeNull();

    expect(
      sceneFor("ambient", "about", withOrg("A Very Long Organisation Name Incorporated")),
    ).toBeNull();
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

describe("acting the line out", () => {
  const SCENE: DialogueScene = {
    id: "test",
    kind: "ambient",
    beats: [
      { speaker: "tabby", meow: "Mrrrow!", sub: "Twenty-six characters, ok.", act: "hop" },
      { speaker: "grey", meow: "Mrp.", sub: "No act here." },
      { speaker: "grey", meow: "Mrp...", sub: "Zzz.", act: "sleep" },
    ],
  };

  it("is nothing when no scene is running", () => {
    expect(liveAct(null, 1000)).toBeNull();
  });

  it("plays the beat's act on the beat's speaker, for exactly the beat's reading time", () => {
    const run = startScene(SCENE, 1000);
    const until = 1000 + beatDurationMs(SCENE.beats[0]);
    expect(liveAct(run, 1000)).toEqual({ speaker: "tabby", act: "hop" });
    // The same boundary the loop advances on (`now - beatStartedAt >
    // beatDurationMs`), so the act and the bubble end on the same frame.
    expect(liveAct(run, until)).toEqual({ speaker: "tabby", act: "hop" });
    // Past it, the act is over even on a run nobody has advanced yet: an act
    // can never outlive its beat by waiting on whoever advances the scene.
    expect(liveAct(run, until + 1)).toBeNull();
  });

  it("is nothing on a beat that carries no act, and follows the speaker beat to beat", () => {
    const second = advanceBeat(startScene(SCENE, 1000), 5000)!;
    expect(liveAct(second, 5000)).toBeNull();
    const third = advanceBeat(second, 8000)!;
    expect(liveAct(third, 8000)).toEqual({ speaker: "grey", act: "sleep" });
  });

  it("draws hop as a sitting cat that hops, and every other act as its own pose", () => {
    expect(actPose("hop")).toEqual({ pose: "sit", hopping: true });
    for (const act of CAT_ACTS.filter((a) => a !== "hop")) {
      expect(actPose(act), act).toEqual({ pose: act, hopping: false });
    }
  });

  // The e2e icon and hop tests tap the tabby at #tree, and can land on the
  // hello (if its fixed clock fires first), the tree's ambient scene or its
  // encore. What they assert is only true while these hold.
  it("opens the tree's ambient scene on the tabby hopping (the scene the e2e hop test asks for)", () => {
    const scene = sceneFor("ambient", "tree", FACTS)!;
    expect(liveAct(startScene(scene, 0), 0)).toEqual({ speaker: "tabby", act: "hop" });
  });

  it("gives every beat the e2e tests can land on an icon, and no act to a beat right after a hop", () => {
    const scenes = [
      sceneFor("hello", null, FACTS)!,
      sceneFor("ambient", "tree", FACTS)!,
      sceneFor("encore", "tree", FACTS)!,
    ];
    for (const scene of scenes) {
      scene.beats.forEach((beat, index) => {
        expect(beat.icon, `${scene.id}[${index}]`).toBeDefined();
        if (index > 0 && scene.beats[index - 1].act === "hop") {
          expect(beat.act, `${scene.id}[${index}] follows a hop`).toBeUndefined();
        }
      });
    }
    expect(scenes.some((scene) => scene.beats.some((beat) => beat.act === "hop"))).toBe(true);
  });
});

describe("cadence", () => {
  it("first slot is the fixed hello delay; later slots use gap plus spread", () => {
    expect(nextDuetAt(1000, true, 0.5)).toBe(1000 + 8000);
    expect(nextDuetAt(1000, false, 0)).toBe(1000 + 75_000);
    expect(nextDuetAt(1000, false, 1)).toBe(1000 + 75_000 + 60_000);
  });
});
