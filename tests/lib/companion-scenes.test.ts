import { afterEach, describe, expect, it, vi } from "vitest";
import { CAT_H, CAT_W } from "@/components/companion/CompanionCat";
import {
  advancePlay,
  hideCut,
  sceneOrder,
  peekStands,
  ROAM_WEIGHTS,
  ruleSpot,
  shownSpot,
  stalkSpots,
  type Box,
  type Play,
} from "@/components/companion/companion-play";
import {
  detectRush,
  planWander,
  RUSH_HOLD_MS,
  RUSH_VELOCITY,
  WANDER_MIN,
  wanderCandidates,
} from "@/components/companion/companion-moods";
import * as companionSpace from "@/components/companion/companion-space";
import { SCENE_NAMES } from "@/components/companion/scene-names";
import { companions } from "@/content/portfolio";

/**
 * The geometry behind the three scenes that are about the page, and behind
 * wandering.
 *
 * Everything here is arithmetic on a rectangle, which is exactly why it is
 * worth testing without a browser: the parts that need one — is this panel
 * painted, is that hairline on screen, is the ground under this spot clear —
 * are hit tests the e2e suite already covers, and they are cheap to get right.
 * The arithmetic is not. Each rule below is one a visitor would notice being
 * broken: a cat drawn whole in front of a panel it is supposed to be behind, a
 * pounce that lands on the words, a wanderer that shuffles on the spot.
 */

/** A panel the width of the business card at desktop, a third of the way down
 *  the window. */
const PANEL: Box = { left: 984, top: 300, right: 1368, bottom: 640 };

describe("hideCut", () => {
  it("does not cut an animal that is clear of the edge", () => {
    expect(hideCut(PANEL.top - CAT_H, PANEL.top)).toBe(0);
    expect(hideCut(PANEL.top - CAT_H * 3, PANEL.top)).toBe(0);
  });

  it("cuts away an animal that is entirely behind the panel", () => {
    expect(hideCut(PANEL.top + 1, PANEL.top)).toBe(CAT_H);
    expect(hideCut(PANEL.top + 400, PANEL.top)).toBe(CAT_H);
  });

  it("puts the cut exactly where the edge is", () => {
    // The whole point: what is left showing is the distance from the animal's
    // head to the panel's top edge, whatever the animal is doing at the time.
    for (const y of [PANEL.top - 30, PANEL.top - 12, PANEL.top - 1]) {
      expect(CAT_H - hideCut(y, PANEL.top)).toBeCloseTo(PANEL.top - y, 5);
    }
  });
});

describe("peekStands", () => {
  const [first] = peekStands(PANEL, { x: 1100, y: 400 });

  it("puts both animals over the panel rather than beside it", () => {
    for (const stand of peekStands(PANEL, { x: 1100, y: 400 })) {
      for (const spot of [stand.lead, stand.follow]) {
        expect(spot.x).toBeGreaterThanOrEqual(PANEL.left);
        expect(spot.x + CAT_W).toBeLessThanOrEqual(PANEL.right);
      }
      // And not in the same box, which would be one badly drawn cat.
      expect(Math.abs(stand.lead.x - stand.follow.x)).toBeGreaterThanOrEqual(CAT_W);
    }
  });

  it("shows the heads and hides the backs", () => {
    const cut = hideCut(first.lead.y, PANEL.top);
    expect(cut).toBeGreaterThan(CAT_H * 0.2);
    expect(cut).toBeLessThan(CAT_H * 0.6);
    expect(hideCut(first.follow.y, PANEL.top)).toBe(cut);
  });

  it("offers the arrangement nearest the cats first", () => {
    const near = peekStands(PANEL, { x: PANEL.left, y: 400 });
    const far = peekStands(PANEL, { x: PANEL.right, y: 400 });
    expect(near[0].follow.x).toBeLessThan(far[0].follow.x);
  });

  it("declines a panel too narrow to hide a pair behind", () => {
    expect(peekStands({ ...PANEL, right: PANEL.left + CAT_W * 2 }, { x: 0, y: 0 })).toEqual([]);
  });
});

describe("shownSpot", () => {
  it("stands the animal on the edge, with all of it in the band above", () => {
    const spot = shownSpot({ x: 1000, y: PANEL.top - 10 }, PANEL.top);
    expect(spot.x).toBe(1000);
    // A few pixels of foot past the rule and nothing else: this is the box the
    // clear-spot probe is asked about, so all of it has to be off the panel.
    expect(spot.y + CAT_H).toBeGreaterThan(PANEL.top);
    expect(spot.y + CAT_H).toBeLessThan(PANEL.top + 8);
  });
});

describe("ruleSpot", () => {
  it("stands a cat on a section's hairline rather than under it", () => {
    const spot = ruleSpot(400, 260);
    expect(spot.x).toBe(400);
    expect(spot.y).toBeLessThan(260 - CAT_H / 2);
    expect(spot.y + CAT_H).toBeGreaterThan(260);
    expect(spot.y + CAT_H).toBeLessThan(268);
  });
});

describe("stalkSpots", () => {
  /** A section heading: a block box running to the end of the column, with the
   *  sentence stopping a long way short of it — which is every heading on this
   *  page and the reason the words are measured separately. */
  const HEADING: Box = { left: 280, top: 255, right: 1368, bottom: 326 };
  const WORDS = 960;
  const pairs = stalkSpots(HEADING, WORDS);

  it("lands beside the end of the sentence, never on it", () => {
    const [best] = pairs;
    expect(best.land.x).toBeGreaterThan(WORDS);
    // Clear of the words by a margin rather than touching them.
    expect(best.land.x).toBeLessThan(WORDS + CAT_W);
    // And above the heading's box, which is the only ground beside the end of a
    // line that a hit test will ever call clear: the box owns every point in
    // itself, glyphs or not.
    expect(best.land.y + CAT_H).toBeGreaterThan(HEADING.top);
    expect(best.land.y + CAT_H).toBeLessThan(HEADING.top + 8);
  });

  it("keeps a landing past the whole heading as the fallback", () => {
    const past = pairs.find((pair) => pair.land.x > HEADING.right);
    expect(past, "nothing lands past the heading's own right edge").toBeDefined();
    expect(past!.land.y).toBeLessThan(HEADING.bottom);
    expect(past!.land.y + CAT_H).toBeGreaterThanOrEqual(HEADING.bottom - 1);
  });

  it("crouches a run-up away from wherever it means to land", () => {
    for (const { crouch, land } of pairs) {
      const run = Math.hypot(crouch.x - land.x, crouch.y - land.y);
      expect(run).toBeGreaterThan(CAT_H * 2);
      expect(run).toBeLessThan(400);
    }
    // Both ways round, so a heading with no room above it can still be hunted
    // from below.
    expect(pairs.some((pair) => pair.crouch.y < pair.land.y)).toBe(true);
    expect(pairs.some((pair) => pair.crouch.y > pair.land.y)).toBe(true);
  });

  it("falls back to the heading's own edge when the words cannot be measured", () => {
    const [best] = stalkSpots(HEADING, HEADING.right);
    expect(best.land.x).toBeGreaterThan(HEADING.right);
  });
});

describe("the stalk, beat by beat", () => {
  /**
   * A staged stalk, pointed at whichever beat is under test.
   *
   * Built by hand rather than through `openPlay`, which needs a page to measure
   * — the thing being asserted here is not where the scene decides to happen
   * but what it asks of each animal once it has decided, and that is arithmetic
   * on the object.
   */
  function staged(phase: string, ms: number): Play {
    const crouch = { x: 355, y: 124 };
    const land = { x: 329, y: 256 };
    const watch = { x: 293, y: 124 };
    return {
      kind: "stalk",
      prop: null,
      script: [{ phase, ms }] as Play["script"],
      step: 0,
      until: 1000 + ms,
      from: crouch,
      to: land,
      leadSpot: land,
      followSpot: watch,
      aside: crouch,
      edge: 0,
      facing: -1,
      pos: { x: crouch.x, y: crouch.y },
      spin: 0,
      flap: 1,
      opacity: 0,
    };
  }

  /**
   * The scene walks the pair to a heading, so by the time he jumps neither of
   * them is anywhere near where they were standing when it opened. A beat that
   * names no place for the follower hands her back to the loop's settled
   * position, which is that old spot — so she turned round and left across the
   * page on the frame he pounced, and the punchline played to one cat.
   */
  it("keeps the watching cat on her mark through the pounce and the landing", () => {
    for (const phase of ["crouch", "pounce", "pleased"]) {
      const play = staged(phase, 600);
      const beat = advancePlay(play, 1300, play.from);
      expect(beat.followTo, `the ${phase} beat leaves the follower unplaced`).not.toBeNull();
      expect(beat.followTo).toEqual(play.followSpot);
    }
  });

  it("still throws the lead across the gap rather than placing him on it", () => {
    const play = staged("pounce", 600);
    const half = advancePlay(play, 1300, play.from).leadTo!;
    expect(half.x).not.toBe(play.from.x);
    expect(half.y).toBeGreaterThan(play.from.y);
    expect(half.y).toBeLessThan(play.to.y);
    expect(advancePlay(staged("pleased", 600), 1300, play.from).leadTo).toEqual(play.to);
  });
});

describe("wanderCandidates", () => {
  const here = { x: 400, y: 400 };
  const spots = [
    { x: 410, y: 405 },
    { x: 400, y: 400 + WANDER_MIN - 1 },
    { x: 400, y: 400 + WANDER_MIN },
    { x: 900, y: 700 },
  ];

  it("keeps only the places far enough away to read as a decision", () => {
    expect(wanderCandidates(spots, here)).toEqual([
      { x: 400, y: 400 + WANDER_MIN },
      { x: 900, y: 700 },
    ]);
  });

  it("offers nothing at all when everywhere is underfoot", () => {
    // Which is a real answer on a window with no whitespace in it, and the
    // caller's cue to leave them standing rather than shuffle them sideways.
    expect(wanderCandidates(spots.slice(0, 2), here)).toEqual([]);
  });
});

/**
 * WP-P round 14 ("make them go randomly on the page instead"): `planWander`
 * used to draw only from `standingSpots`'s own five-column grid, which is
 * built to find whitespace *between* blocks of prose — the margins, on an
 * ordinary page — and that is exactly the "always corners or edges" the
 * owner reported. It now tries a uniform draw across the whole viewport
 * first (`randomViewportPoint`), and only falls back to the old, edge-biased
 * pool when the page genuinely has nothing free outside its own margins.
 */
describe("planWander", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.elementsFromPoint = undefined as unknown as typeof document.elementsFromPoint;
  });

  it("reaches into the middle of a clear page, not just the standingSpots gutters", () => {
    // Nothing on the page is occupied — every probe reads clear.
    document.elementsFromPoint = vi.fn(() => []);
    const here = { x: 500, y: 400 };
    let sawMiddle = false;
    for (let i = 0; i < 150 && !sawMiddle; i += 1) {
      const spots = planWander(null, here, { x: 300, y: 400 }, { x: 900, y: 700 });
      // A page this clear should never decline outright.
      expect(spots).not.toBeNull();
      if (spots && Math.abs(spots.lead.x - 512) < 120) sawMiddle = true;
    }
    expect(sawMiddle).toBe(true);
  });

  it("falls back to the standingSpots pool when the uniform draw keeps landing somewhere it cannot stand", () => {
    document.elementsFromPoint = vi.fn(() => []);
    // Force every uniform draw outside the viewport, which `isClearSpot`
    // rejects outright regardless of what is or is not occupied — so the
    // first ten tries are guaranteed to fail and the old pool has to answer
    // instead.
    vi.spyOn(companionSpace, "randomViewportPoint").mockReturnValue({ x: -9999, y: -9999 });
    const here = { x: 500, y: 400 };
    const home = { x: 900, y: 700 };
    const spots = planWander(null, here, { x: 300, y: 400 }, home);
    expect(spots).not.toBeNull();
    expect(companionSpace.randomViewportPoint).toHaveBeenCalled();
    // The answer came from the standingSpots pool, not the (mocked, always
    // out-of-bounds) uniform draw.
    expect(spots!.lead).not.toEqual({ x: -9999, y: -9999 });
  });

  it("declines outright when neither the uniform draw nor the old pool can find any ground", () => {
    // Every probe reads as occupied content.
    document.elementsFromPoint = vi.fn(() => [document.createElement("p")]);
    const here = { x: 500, y: 400 };
    expect(planWander(null, here, { x: 300, y: 400 }, { x: 900, y: 700 })).toBeNull();
  });
});

describe("sceneOrder", () => {
  const KINDS = ["yarn", "moth", "bowl", "chase", "gift", "peek", "scratch", "stalk"];

  /**
   * The list is a fallback chain, not a shortlist. A scene missing from it is a
   * scene the page can never produce once the ones above it decline, which is
   * the failure the chain exists to prevent — so "all eight, once each" is the
   * property that matters, in both moods.
   */
  it.each([false, true])("offers every scene exactly once (wandering: %s)", (wandering) => {
    for (let run = 0; run < 50; run += 1) {
      const order = sceneOrder(wandering);
      expect(order).toHaveLength(KINDS.length);
      expect([...order].sort()).toEqual([...KINDS].sort());
    }
  });

  /**
   * And the weights still mean something: a visitor who asked to watch the cats
   * work the page should get the scenes that touch the page first, and a
   * visitor who is reading should mostly not. Asserted as a wide band rather
   * than a figure — the point is that the two moods are different, and a
   * threshold that only a broken build could cross does not flake.
   */
  it("leads with the anchored scenes when wandering, and rarely when not", () => {
    const anchored = new Set(["peek", "scratch", "stalk"]);
    const leads = (wandering: boolean) => {
      let count = 0;
      for (let run = 0; run < 2000; run += 1) {
        if (anchored.has(sceneOrder(wandering)[0])) count += 1;
      }
      return count / 2000;
    };
    expect(leads(true)).toBeGreaterThan(0.6);
    expect(leads(false)).toBeLessThan(0.45);
  });

  /**
   * Round 11's one situational weight was the moth's boost in `#lab`'s own
   * lit tablist — see `LAB_MOTH_BOOST` in companion-play.ts's history. Round
   * 16 removed the section and the boost with it, and `flavoredWeights` has
   * had no rule to apply since: every flavour shape, section or no section,
   * night or day, produces the same unweighted list.
   */
  it("is unaffected by any flavour — no situational weight exists any more", () => {
    const mothLeads = (flavor?: { section?: string | null; night?: boolean }) => {
      let count = 0;
      for (let run = 0; run < 2000; run += 1) {
        if (sceneOrder(false, flavor)[0] === "moth") count += 1;
      }
      return count / 2000;
    };
    const baseline = mothLeads(undefined);
    const withSection = mothLeads({ section: "tree" });
    const atNight = mothLeads({ section: "tree", night: true });
    // Loose bound, not an exact match — this is comparing independent random
    // samples of the same distribution, not the same draw.
    expect(Math.abs(withSection - baseline)).toBeLessThan(0.05);
    expect(Math.abs(atNight - baseline)).toBeLessThan(0.05);
  });

  it("carries the same eight scenes regardless of flavour", () => {
    // Same eight scenes, same shape — flavour no longer touches any weight,
    // and never removes or adds a scene from the pool.
    for (const flavor of [undefined, { section: "tree" }, { section: null }]) {
      const order = sceneOrder(false, flavor);
      expect([...order].sort()).toEqual([...KINDS].sort());
    }
  });
});

describe("detectRush", () => {
  it("is false before the hold time has elapsed, no matter the speed", () => {
    expect(detectRush(1000, RUSH_HOLD_MS - 1)).toBe(false);
  });

  it("is false for an ordinary scroll — plenty of time, not much distance", () => {
    expect(detectRush(40, 600)).toBe(false);
  });

  it("is true once both the hold time and the velocity threshold are met", () => {
    const distance = RUSH_VELOCITY * RUSH_HOLD_MS + 1;
    expect(detectRush(distance, RUSH_HOLD_MS)).toBe(true);
  });

  it("is false one px short of the velocity threshold at exactly the hold time", () => {
    const distance = RUSH_VELOCITY * RUSH_HOLD_MS - 1;
    expect(detectRush(distance, RUSH_HOLD_MS)).toBe(false);
  });

  it("treats zero elapsed time as no rush rather than dividing by zero", () => {
    expect(detectRush(500, 0)).toBe(false);
  });
});

describe("the scratch, beat by beat", () => {
  function raking(left: number, facing: 1 | -1 = 1, phase = "rake"): Play {
    const spot = { x: 300, y: 200 };
    return {
      kind: "scratch",
      prop: "claw",
      script: [{ phase, ms: 380 }] as Play["script"],
      step: 0,
      until: 1000 + left,
      from: spot,
      to: spot,
      leadSpot: spot,
      followSpot: { x: 240, y: 200 },
      aside: { x: 240, y: 200 },
      edge: 200,
      facing,
      pos: { x: spot.x, y: spot.y },
      spin: 0,
      flap: 1,
      opacity: 0,
    };
  }

  /**
   * The stroke is the whole animal leaning along the rule and back, because a
   * held-out paw and a faster tail read as a cat standing near a line rather
   * than a cat scratching one.
   */
  it("leans the animal along the rule and brings it back", () => {
    const play = raking(380);
    const start = advancePlay(play, 1000, play.pos).leadTo;
    expect(start?.x).toBeCloseTo(play.leadSpot.x, 5);

    const reach = advancePlay(raking(285), 1000, play.pos).leadTo;
    expect(reach?.x).toBeGreaterThan(play.leadSpot.x + 5);

    const back = advancePlay(raking(95), 1000, play.pos).leadTo;
    expect(back?.x).toBeLessThan(play.leadSpot.x - 5);

    // Home before the next stroke starts, so three of them never walk him
    // along the rule and off the spot the probe approved. Read a few
    // milliseconds short of the end, because at the end the beat is over and
    // this returns the next one.
    const end = advancePlay(raking(4), 1000, play.pos).leadTo;
    expect(Math.abs((end?.x ?? 0) - play.leadSpot.x)).toBeLessThan(1);
  });

  it("leans the way the cat is facing", () => {
    const right = advancePlay(raking(285, 1), 1000, { x: 300, y: 200 }).leadTo;
    const left = advancePlay(raking(285, -1), 1000, { x: 300, y: 200 }).leadTo;
    expect(right?.x).toBeGreaterThan(300);
    expect(left?.x).toBeLessThan(300);
  });

  it("stands still between strokes, and leaves no marks there", () => {
    const easing = raking(200, 1, "ease");
    expect(advancePlay(easing, 1000, easing.pos).leadTo).toEqual(easing.leadSpot);
    // The marks are the evidence of a stroke, so they belong to the stroke.
    expect(easing.opacity).toBe(0);
  });

  it("shows the claw marks through the stroke and clears them by the end", () => {
    // Fullest halfway through, which is the paw pulling back rather than the
    // paw reaching — the mark is made on the drag.
    const mid = raking(190);
    advancePlay(mid, 1000, mid.pos);
    expect(mid.opacity).toBeGreaterThan(0.9);

    const done = raking(4);
    advancePlay(done, 1000, done.pos);
    expect(done.opacity).toBeLessThan(0.1);
  });
});

describe("the peek, beat by beat", () => {
  /**
   * The scene's whole joke is the cut, and the cut is a contract between two
   * halves that live in different files: this module decides *when* a beat is
   * hiding, `hideCut` decides how deep, and the companion loop is what actually
   * writes a `clip-path`. The end-to-end test cannot afford to wait for this
   * scene specifically — see the note in e2e/companion.spec.ts — so the half
   * that can be pinned deterministically is pinned here.
   */
  function peeking(phase: string, left: number): Play {
    const panelTop = 400;
    const stand = { x: 200, y: panelTop - CAT_H + 14 };
    return {
      kind: "peek",
      prop: null,
      script: [{ phase, ms: 1000 }] as Play["script"],
      step: 0,
      until: 1000 + left,
      from: stand,
      to: { x: 200, y: panelTop - CAT_H - 30 },
      leadSpot: stand,
      followSpot: { x: 260, y: stand.y },
      aside: { x: 260, y: panelTop - CAT_H - 30 },
      edge: panelTop,
      facing: 1,
      pos: { x: stand.x, y: stand.y },
      spin: 0,
      flap: 1,
      opacity: 0,
    };
  }

  it("walks in visible and only hides once it has arrived", () => {
    expect(advancePlay(peeking("approach", 800), 1000, { x: 0, y: 0 }).hide).toBe(false);
    for (const phase of ["tuck", "paw", "rise"]) {
      expect(advancePlay(peeking(phase, 800), 1000, { x: 200, y: 386 }).hide, phase).toBe(true);
    }
  });

  /**
   * And the depth the loop reads while it is hiding actually hides something:
   * a cut of zero is two cats standing in front of a panel with the whole joke
   * missing, which is the shape the end-to-end test caught once and could not
   * be made to catch reliably.
   */
  it("cuts away the part of the animal below the panel's edge", () => {
    const play = peeking("tuck", 800);
    const cut = hideCut(play.leadSpot.y, play.edge);
    expect(cut).toBeGreaterThan(0);
    expect(cut).toBeLessThan(CAT_H);
    // Heads still showing: the visible band is what the placement probed.
    expect(CAT_H - cut).toBeGreaterThan(10);
  });

  it("reaches for the panel's top with one paw, and only in the middle beat", () => {
    expect(advancePlay(peeking("paw", 800), 1000, { x: 200, y: 386 }).followPose).toBe("bat");
    expect(advancePlay(peeking("tuck", 800), 1000, { x: 200, y: 386 }).followPose).toBe("sit");
  });
});

describe("SCENE_NAMES, the one list of play scenes", () => {
  it("names all eight scenes the play engine actually weights", () => {
    // The real gate is `tsc`, not this assertion: `SceneKind` derives from
    // SCENE_NAMES, and ROAM_WEIGHTS, WANDER_WEIGHTS and PROP are all typed
    // `Record<SceneKind, …>`, so TypeScript's exact-literal checking already
    // forces every one of them to carry exactly these eight keys — a real
    // mismatch fails at typecheck, which runs before `test` in `pnpm verify`.
    // What this assertion catches is the one path typecheck doesn't cover: a
    // standalone `pnpm vitest run` with no preceding `tsc`. Redundant under
    // the gated pipeline, still worth keeping for that path.
    expect([...SCENE_NAMES].sort()).toEqual(Object.keys(ROAM_WEIGHTS).sort());
  });

  it("has no duplicates", () => {
    expect(new Set(SCENE_NAMES).size).toBe(SCENE_NAMES.length);
  });

  it("does not contain the mockup's invented scene", () => {
    expect(SCENE_NAMES).not.toContain("dinner");
  });
});

describe("companions", () => {
  it("names both cats, in the order they walk", () => {
    expect(companions.map((cat) => cat.name)).toEqual(["Moon", "Mi"]);
  });

  it("gives each one a coat and a habit, and says when it was authored", () => {
    for (const cat of companions) {
      expect(cat.coat.length).toBeGreaterThan(0);
      expect(cat.habit.length).toBeGreaterThan(0);
      expect(cat.authoredOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
