import { describe, expect, it } from "vitest";
import { CAT_H, CAT_W } from "@/components/companion/CompanionCat";
import {
  hideCut,
  peekStands,
  ruleSpot,
  shownSpot,
  stalkSpots,
  type Box,
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
