import { describe, expect, it } from "vitest";
import { CAT_H, CAT_W } from "@/components/companion/CompanionCat";
import {
  advancePlay,
  hideCut,
  sceneOrder,
  peekStands,
  ruleSpot,
  shownSpot,
  stalkSpots,
  type Box,
  type Play,
} from "@/components/companion/companion-play";
import { WANDER_MIN, wanderCandidates } from "@/components/companion/companion-moods";

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
