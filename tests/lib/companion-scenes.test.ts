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
  exploreClear,
  heldExploreClear,
  holdExplore,
  planExplore,
  planMood,
  repickExploreSpot,
  RUSH_HOLD_MS,
  RUSH_VELOCITY,
} from "@/components/companion/companion-moods";
import * as companionSpace from "@/components/companion/companion-space";
import { SCENE_NAMES } from "@/components/companion/scene-names";
import { companions } from "@/content/portfolio";

/**
 * The geometry behind the three scenes that are about the page, and behind
 * exploring.
 *
 * Everything here is arithmetic on a rectangle, which is exactly why it is
 * worth testing without a browser: the parts that need one — is this panel
 * painted, is that hairline on screen, is the ground under this spot clear —
 * are hit tests the e2e suite already covers, and they are cheap to get right.
 * The arithmetic is not. Each rule below is one a visitor would notice being
 * broken: a cat drawn whole in front of a panel it is supposed to be behind, a
 * pounce that lands on the words, an explorer that shuffles on the spot.
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

/**
 * Companion explorers (task 3): `planExplore` replaces the old wander planner. The pair no
 * longer pick from `standingSpots`'s edge-biased grid or one shared uniform
 * draw; the lead explores the left half of the page and the follower the right
 * (`pickExploreSpot`, which has its own unit tests in `companion-space.test.ts`).
 * What is pinned here is the wiring: the real probe, the perch on the first stop
 * in a section, and the two fallbacks.
 */
describe("planExplore", () => {
  const HOME = { x: 900, y: 700 };
  const OPEN = () => [] as Element[];
  /** The pair rule, restated here rather than imported, so a planner that
   *  breaks it cannot also break the yardstick: 160px centre to centre, and
   *  never one 60px column (by left edge) for both. */
  const apart = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y) >= companionSpace.EXPLORE_MIN_GAP &&
    Math.floor(a.x / companionSpace.EXPLORE_COLUMN) !== Math.floor(b.x / companionSpace.EXPLORE_COLUMN);

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    document.elementsFromPoint = undefined as unknown as typeof document.elementsFromPoint;
  });

  it("sends the lead to the left half and the follower to the right, 160px apart", () => {
    document.elementsFromPoint = vi.fn(OPEN);
    const view = companionSpace.viewport();
    let planned = 0;
    for (let i = 0; i < 100; i += 1) {
      const spots = planExplore(null, { x: 500, y: 400 }, { x: 300, y: 400 }, HOME, false);
      // A page this clear should never decline outright.
      expect(spots).not.toBeNull();
      planned += 1;
      expect(spots!.lead.x + CAT_W / 2).toBeLessThan(view.width / 2);
      expect(spots!.follow.x + CAT_W / 2).toBeGreaterThanOrEqual(view.width / 2);
      expect(
        Math.hypot(spots!.lead.x - spots!.follow.x, spots!.lead.y - spots!.follow.y),
      ).toBeGreaterThanOrEqual(companionSpace.EXPLORE_MIN_GAP);
    }
    expect(planned).toBe(100);
  });

  it("is deterministic for a given rng", () => {
    document.elementsFromPoint = vi.fn(OPEN);
    const draw = () => {
      let n = 0;
      return () => ((n += 0.137) % 1);
    };
    const args = [null, { x: 500, y: 400 }, { x: 300, y: 400 }, HOME, false] as const;
    expect(planExplore(...args, draw())).toEqual(planExplore(...args, draw()));
  });

  it("takes the section's perch on the first stop, and explores on the ones after it", () => {
    document.elementsFromPoint = vi.fn(OPEN);
    // The hero mood hangs off `[data-cat-perch]`; give it a box with room on the
    // right and nothing in it. jsdom has no layout, so the rect is stubbed.
    const perch = document.createElement("div");
    perch.setAttribute("data-cat-perch", "");
    perch.getBoundingClientRect = () =>
      ({ left: 100, top: 300, right: 400, bottom: 340, width: 300, height: 40 }) as DOMRect;
    document.body.append(perch);
    const here = { x: 500, y: 400 };
    const mate = { x: 300, y: 400 };

    const perched = planExplore("about", here, mate, HOME, true);
    expect(perched).not.toBeNull();
    // Right of the anchor's edge, a margin off it — not a half-page pick —
    // and marked as the perch, which is what has her trail him there.
    expect(perched!.lead.x).toBe(400 + 14);
    expect(perched!.lead.y).toBe(300 + 16);
    expect(perched!.perch).toBe(true);

    // The same section, but not the first stop: explored like anywhere else.
    const next = planExplore("about", here, mate, HOME, false);
    expect(next).not.toBeNull();
    expect(next!.lead).not.toEqual(perched!.lead);
    expect(next!.perch).toBe(false);
  });

  it("explores when the first stop's section has no mood", () => {
    document.elementsFromPoint = vi.fn(OPEN);
    expect(planExplore("nowhere", { x: 500, y: 400 }, { x: 300, y: 400 }, HOME, true)).not.toBeNull();
  });

  it("places the follower with findClearSpot when neither half has a clear spot for her", () => {
    document.elementsFromPoint = vi.fn(OPEN);
    // The lead's first draw clears; every draw after it is occupied, so the
    // follower's two halves both come up empty and `findClearSpot` (which has its
    // own, untouched probe) answers for her: the nearest clear ground to where
    // she already is.
    const probe = vi.spyOn(companionSpace, "isClearSpot");
    // One accepted draw is probed five times: at the spot and at each corner of
    // the rest margin (`exploreClear`).
    for (let i = 0; i < 5; i += 1) probe.mockReturnValueOnce(true);
    probe.mockReturnValue(false);
    const spots = planExplore(null, { x: 500, y: 400 }, { x: 300, y: 400 }, HOME, false, () => 0.1);
    expect(spots).not.toBeNull();
    expect(spots!.lead.x + CAT_W / 2).toBeLessThan(companionSpace.viewport().width / 2);
    expect(spots!.follow).toEqual({ x: 300, y: 400 });
    expect(apart(spots!.lead, spots!.follow)).toBe(true);
  });

  it("re-picks the lead against the follower's fallback when the two would share a column", () => {
    // Her own spot is prose, so `findClearSpot` (real probe) moves her to the
    // nearer gutter, x = 8 — the same 60px column as the lead's first pick
    // (x ≈ 56, with a constant 0.1 draw). The pair have to be re-checked
    // against where she actually ends up, not where she was standing.
    const prose = document.createElement("p");
    document.elementsFromPoint = vi.fn((x: number) => (x >= 290 && x <= 360 ? [prose] : []));
    const probe = vi.spyOn(companionSpace, "isClearSpot");
    // One accepted draw is probed five times: at the spot and at each corner of
    // the rest margin (`exploreClear`).
    for (let i = 0; i < 5; i += 1) probe.mockReturnValueOnce(true);
    probe.mockReturnValue(false);
    const spots = planExplore(null, { x: 500, y: 400 }, { x: 300, y: 400 }, HOME, false, () => 0.1);
    expect(spots).not.toBeNull();
    expect(spots!.follow).toEqual({ x: 8, y: 400 });
    // Nothing else in either half clears the mocked probe, so the lead falls
    // back to where he stands — which *is* apart from her.
    expect(spots!.lead).toEqual({ x: 500, y: 400 });
    expect(apart(spots!.lead, spots!.follow)).toBe(true);
  });

  it("places the lead with findClearSpot when neither half has a clear spot for him", () => {
    document.elementsFromPoint = vi.fn(OPEN);
    // Twice EXPLORE_TRIES draws fail (both halves, for the lead), then every
    // draw after that clears.
    const probe = vi.spyOn(companionSpace, "isClearSpot");
    for (let i = 0; i < companionSpace.EXPLORE_TRIES * 2; i += 1) probe.mockReturnValueOnce(false);
    probe.mockReturnValue(true);
    // A constant 0.1 for the lead's failed draws and the follower's first
    // right-half draws — x ≈ 535, the same 60px column as the lead's fallback
    // at x = 500 — then 0.9 for the x of the re-pick's second try, which lands
    // well clear of him. (48 failed lead draws, 2 for her first pick against
    // nobody, 2 for the re-pick's first try.)
    let calls = 0;
    const rng = () => (calls++ === companionSpace.EXPLORE_TRIES * 4 + 4 ? 0.9 : 0.1);
    const spots = planExplore(null, { x: 500, y: 400 }, { x: 300, y: 400 }, HOME, false, rng);
    expect(spots).not.toBeNull();
    expect(spots!.lead).toEqual({ x: 500, y: 400 });
    expect(spots!.follow.x + CAT_W / 2).toBeGreaterThanOrEqual(companionSpace.viewport().width / 2);
    // Picked against his fallback, not against nobody: 160px and a column apart.
    expect(apart(spots!.lead, spots!.follow)).toBe(true);
  });

  it("asks a new half-page stop for feet, belly and head band (exploreClear)", () => {
    const at = { x: 100, y: 100 };
    const prose = document.createElement("p");
    // Nothing anywhere: clear.
    document.elementsFromPoint = vi.fn(OPEN);
    expect(exploreClear(at)).toBe(true);
    // A line across the face row only — what the sticky margin rail does when
    // a scroll slides it over a cat riding the page: the feet stay clear.
    document.elementsFromPoint = vi.fn((_x: number, y: number) =>
      y >= at.y + 12 && y <= at.y + 20 ? [prose] : [],
    );
    expect(companionSpace.isClearSpot(at)).toBe(true);
    expect(exploreClear(at)).toBe(false);
    // Content under the feet only: the three-point half refuses it.
    document.elementsFromPoint = vi.fn((_x: number, y: number) => (y >= at.y + 30 ? [prose] : []));
    expect(companionSpace.headClear(at)).toBe(true);
    expect(exploreClear(at)).toBe(false);
  });

  it("refuses a stop whose head or feet clear content by less than the arrival tolerance", () => {
    // A button ending at y = 100.4 (a fractional edge, as laid-out boxes have).
    // A cat's head row is `y + 6`, so a spot at y = 94.5 has its row at 100.5:
    // clear by 0.1px. `advance` lets a cat rest up to 0.6px off its spot, so
    // such a stop can end with the ears across the edge — exploreClear must
    // refuse it while the exact-point head probe alone accepts it.
    const button = document.createElement("button");
    document.elementsFromPoint = vi.fn((_x: number, y: number) => (y < 100.4 ? [button] : []));
    const hair = { x: 100, y: 94.5 };
    expect(companionSpace.headClear(hair)).toBe(true);
    expect(exploreClear(hair)).toBe(false);
    // A spot a pixel and a half lower clears it however the cat comes to rest.
    expect(exploreClear({ x: 100, y: 96.5 })).toBe(true);
    // The same for the feet: content starting at y = 200 under a cat whose feet
    // row (`y + 36`) is 0.1px short of it.
    document.elementsFromPoint = vi.fn((_x: number, y: number) => (y >= 200 ? [button] : []));
    const feet = { x: 100, y: 200 - 36 - 0.1 };
    expect(companionSpace.isClearSpot(feet)).toBe(true);
    expect(exploreClear(feet)).toBe(false);
    expect(exploreClear({ x: 100, y: 200 - 36 - 2 })).toBe(true);
  });

  it("never stops an explorer with its head on content, which the three-point probe alone allows", () => {
    // Lines of prose 14px tall every 60px down the page, across its whole
    // width: plenty of ground clears the feet and belly with the ears or face
    // on a line above them.
    const prose = document.createElement("p");
    document.elementsFromPoint = vi.fn((_x: number, y: number) => (y % 60 < 14 ? [prose] : []));
    // mulberry32, not a bare LCG: consecutive draws of a power-of-two LCG fall
    // on a lattice. About a quarter of this page clears the lines, so a cat
    // that draws 2 x EXPLORE_TRIES times and finds none (about one plan in a
    // thousand) is placed by `findClearSpot`, feet and belly only, *by design*;
    // the seed is pinned to one where that does not happen in these 100 plans.
    const seeded = () => {
      let state = 1;
      return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
      };
    };
    const view = companionSpace.viewport();
    const top = companionSpace.safeTop();

    // The yardstick is not vacuous: the three-point probe alone does pick
    // spots in this page whose head is on a line.
    const bare = seeded();
    let headOnProse = 0;
    for (let i = 0; i < 100; i += 1) {
      const spot = companionSpace.pickExploreSpot("left", null, view, top, companionSpace.isClearSpot, bare);
      if (spot && !companionSpace.headClear(spot)) headOnProse += 1;
    }
    expect(headOnProse).toBeGreaterThan(10);

    const rng = seeded();
    for (let i = 0; i < 100; i += 1) {
      const spots = planExplore(null, { x: 500, y: 400 }, { x: 300, y: 400 }, HOME, false, rng);
      expect(spots).not.toBeNull();
      for (const spot of [spots!.lead, spots!.follow]) {
        expect(companionSpace.isClearSpot(spot), `feet at ${spot.x},${spot.y}`).toBe(true);
        expect(companionSpace.headClear(spot), `head at ${spot.x},${spot.y}`).toBe(true);
      }
    }
  });

  it("declines outright when no ground anywhere is clear", () => {
    // Every probe reads as occupied content.
    document.elementsFromPoint = vi.fn(() => [document.createElement("p")]);
    expect(planExplore(null, { x: 500, y: 400 }, { x: 300, y: 400 }, HOME, false)).toBeNull();
  });
});

/**
 * `repickExploreSpot`: when one explorer's stay is up, only that cat is sent
 * somewhere new, against wherever its partner is going. The partner's spot is
 * an argument and is never returned or moved; what is pinned here is that the
 * same rules `planExplore` applies to a pair hold against that fixed spot, and
 * that the single-null fallback is `planExplore`'s.
 */
describe("planMood — a per-frame caller of findClearSpot", () => {
  const HOME = { x: 900, y: 700 };

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    document.elementsFromPoint = undefined as unknown as typeof document.elementsFromPoint;
  });

  it("does not get findClearSpot's head preference: a follower standing feet-clear keeps her spot", () => {
    // The tour asks `planMood` every frame with the follower's live position;
    // rejecting that position for her head would give her a target that moves
    // with her. So the hero perch's fallback for her must be her own spot when
    // her feet are clear, whatever is across her face.
    const perch = document.createElement("div");
    perch.setAttribute("data-cat-perch", "");
    perch.getBoundingClientRect = () =>
      ({ left: 100, top: 300, right: 400, bottom: 340, width: 300, height: 40 }) as DOMRect;
    document.body.append(perch);
    const lead = { x: 500, y: 400 };
    const follow = { x: 700, y: 500 };
    const prose = document.createElement("p");
    const inside = (x: number, y: number, l: number, t: number, r: number, b: number) =>
      x >= l && x < r && y >= t && y < b;
    document.elementsFromPoint = vi.fn((x: number, y: number) =>
      // The three places `mateSpot` tries beside the perch spot (414, 316) —
      // below, above and behind — are content, so the fallback is reached …
      inside(x, y, 415, 385, 466, 405) ||
      inside(x, y, 415, 290, 466, 306) ||
      inside(x, y, 355, 340, 400, 354) ||
      // … and a line of prose runs across the follower's face, nowhere else.
      inside(x, y, 700, 504, 760, 518)
        ? [prose]
        : [],
    );
    expect(companionSpace.isClearSpot(follow)).toBe(true);
    expect(companionSpace.headClear(follow)).toBe(false);

    const plan = planMood("about", lead, follow, HOME);
    expect(plan).not.toBeNull();
    expect(plan!.spots.lead).toEqual({ x: 414, y: 316 });
    expect(plan!.spots.follow).toEqual(follow);
    // The same call with the preference would have moved her.
    expect(companionSpace.findClearSpot(follow, HOME, plan!.spots.lead, { preferHead: true })).not.toEqual(follow);
  });
});

describe("repickExploreSpot", () => {
  const HOME = { x: 900, y: 700 };
  const OPEN = () => [] as Element[];
  const seeded = () => {
    let state = 4242;
    return () => {
      state = (Math.imul(state, 1103515245) + 12345) >>> 0;
      return state / 2 ** 32;
    };
  };
  /** The pair rule restated, as in `planExplore`'s tests. */
  const apart = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y) >= companionSpace.EXPLORE_MIN_GAP &&
    Math.floor(a.x / companionSpace.EXPLORE_COLUMN) !== Math.floor(b.x / companionSpace.EXPLORE_COLUMN);

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    document.elementsFromPoint = undefined as unknown as typeof document.elementsFromPoint;
  });

  it("sends a lead to the left half and a follower to the right, clear to the head band", () => {
    document.elementsFromPoint = vi.fn(OPEN);
    const half = companionSpace.viewport().width / 2;
    const rng = seeded();
    // Partners that are *not* in the cat's own half-opposite place, so a picker
    // that ignored `cat` and always went one way would be caught by one of the
    // two loops.
    for (let i = 0; i < 100; i += 1) {
      const lead = repickExploreSpot("lead", { x: 500, y: 400 }, { x: 1100, y: 300 }, HOME, rng);
      expect(lead.x + CAT_W / 2).toBeLessThan(half);
      expect(exploreClear(lead)).toBe(true);
      const follow = repickExploreSpot("follow", { x: 900, y: 400 }, { x: 300, y: 300 }, HOME, rng);
      expect(follow.x + CAT_W / 2).toBeGreaterThanOrEqual(half);
      expect(exploreClear(follow)).toBe(true);
    }
  });

  it("keeps 160px and a column from the partner's spot, even a partner on its cat's own side", () => {
    document.elementsFromPoint = vi.fn(OPEN);
    const rng = seeded();
    // The lead's partner stands in the *left* half, in the middle of where the
    // lead would otherwise pick: the rule against it is what rules spots out.
    const partner = { x: 400, y: 400 };
    let near = 0;
    for (let i = 0; i < 300; i += 1) {
      const spot = repickExploreSpot("lead", { x: 500, y: 400 }, partner, HOME, rng);
      expect(apart(spot, partner), `${spot.x},${spot.y} against ${partner.x},${partner.y}`).toBe(true);
      // Not vacuous: unconstrained, the left half does offer spots inside the gap.
      if (Math.hypot(spot.x - partner.x, spot.y - partner.y) < 400) near += 1;
    }
    expect(near, "the draws never came near the partner, so the rule was never tested").toBeGreaterThan(5);
  });

  it("is deterministic for a given rng", () => {
    document.elementsFromPoint = vi.fn(OPEN);
    const args = ["lead", { x: 500, y: 400 }, { x: 1100, y: 300 }, HOME] as const;
    expect(repickExploreSpot(...args, seeded())).toEqual(repickExploreSpot(...args, seeded()));
  });

  it("falls back to the nearest clear ground to where the cat stands when neither half has a spot", () => {
    document.elementsFromPoint = vi.fn(OPEN);
    // Both halves (2 x EXPLORE_TRIES draws) fail the probe; `findClearSpot` then
    // sees clear ground.
    const probe = vi.spyOn(companionSpace, "isClearSpot");
    for (let i = 0; i < companionSpace.EXPLORE_TRIES * 2; i += 1) probe.mockReturnValueOnce(false);
    probe.mockReturnValue(true);
    expect(repickExploreSpot("follow", { x: 900, y: 400 }, { x: 300, y: 400 }, HOME, () => 0.5)).toEqual({
      x: 900,
      y: 400,
    });
  });

  it("keeps its fallback off the partner it must not stand on", () => {
    document.elementsFromPoint = vi.fn(OPEN);
    const probe = vi.spyOn(companionSpace, "isClearSpot");
    for (let i = 0; i < companionSpace.EXPLORE_TRIES * 2; i += 1) probe.mockReturnValueOnce(false);
    probe.mockReturnValue(true);
    // The cat is standing exactly where its partner is going: the fallback
    // has to be somewhere else.
    const partner = { x: 900, y: 400 };
    const spot = repickExploreSpot("follow", partner, partner, HOME, () => 0.5);
    expect(Math.abs(spot.x - partner.x) >= CAT_W * 0.7 || Math.abs(spot.y - partner.y) >= CAT_H * 0.7).toBe(true);
  });
});

/**
 * The re-check `Companion` runs on a held explorer stop once a scroll settles
 * (`onPageMoved`). The stop rides with the page, so in the ordinary case the
 * ground under it after a scroll is the ground it was planned on — and a
 * re-check that refuses that same ground drops the stop on every scroll, so a
 * reader who scrolls as they read keeps the pair re-planning and never
 * arriving.
 */
describe("heldExploreClear", () => {
  const prose = document.createElement("p");

  afterEach(() => {
    vi.restoreAllMocks();
    document.elementsFromPoint = undefined as unknown as typeof document.elementsFromPoint;
  });

  /** Content across the face row (y+12..y+20) of a cat standing at `at`,
   *  within `width` px of its left edge — and nothing anywhere else. */
  const faceRowOf =
    (at: { x: number; y: number }, width = CAT_W) =>
    (x: number, y: number) =>
      x >= at.x && x <= at.x + width && y >= at.y + 12 && y <= at.y + 20 ? [prose] : [];

  it("keeps a stop on the unchanged ground it was planned on, head band or not", () => {
    // Prose lines 14px tall every 60px, the page the head-band planner test
    // uses. Stops picked by the three-point probe alone — what the
    // `findClearSpot` fallbacks and `nearbySpots()` hand the explorers — often
    // stand here with the head on a line.
    document.elementsFromPoint = vi.fn((_x: number, y: number) => (y % 60 < 14 ? [prose] : []));
    let state = 777;
    const rng = () => {
      state = (Math.imul(state, 1103515245) + 12345) >>> 0;
      return state / 2 ** 32;
    };
    const view = companionSpace.viewport();
    const top = companionSpace.safeTop();
    let headOnProse = 0;
    let held = 0;
    for (let i = 0; i < 100; i += 1) {
      const lead = companionSpace.pickExploreSpot("left", null, view, top, companionSpace.isClearSpot, rng);
      const follow = companionSpace.pickExploreSpot("right", lead, view, top, companionSpace.isClearSpot, rng);
      if (!lead || !follow) continue;
      held += 1;
      if (!companionSpace.headClear(lead) || !companionSpace.headClear(follow)) headOnProse += 1;
      const stop = holdExplore({ lead, follow }, false);
      expect(heldExploreClear(stop), `dropped ${lead.x},${lead.y} / ${follow.x},${follow.y}`).toBe(true);
    }
    // Not vacuous: most draws produced a stop, and many of those had a head
    // on a line — exactly the stops the re-check must not churn.
    expect(held).toBeGreaterThan(80);
    expect(headOnProse).toBeGreaterThan(10);
  });

  it("still drops a head-clear stop when the sticky rail slides over its head", () => {
    const lead = { x: 100, y: 100 };
    const follow = { x: 700, y: 100 };
    document.elementsFromPoint = vi.fn(() => [] as Element[]);
    const stop = holdExplore({ lead, follow }, false);
    expect(stop.headLead).toBe(true);
    expect(stop.headFollow).toBe(true);
    expect(heldExploreClear(stop)).toBe(true);
    // The rail arrives over his face; his feet stay clear.
    document.elementsFromPoint = vi.fn(faceRowOf(lead));
    expect(companionSpace.isClearSpot(lead)).toBe(true);
    expect(heldExploreClear(stop)).toBe(false);
  });

  it("judges each cat's head by its own record", () => {
    const lead = { x: 100, y: 100 };
    const follow = { x: 700, y: 100 };
    // Planned with her head already on a line and his clear.
    document.elementsFromPoint = vi.fn(faceRowOf(follow));
    const stop = holdExplore({ lead, follow }, false);
    expect(stop.headLead).toBe(true);
    expect(stop.headFollow).toBe(false);
    // Her head on the line is how she was planned: kept.
    expect(heldExploreClear(stop)).toBe(true);
    // Something arriving over his head, which was clear: dropped.
    document.elementsFromPoint = vi.fn((x: number, y: number) => [
      ...faceRowOf(follow)(x, y),
      ...faceRowOf(lead)(x, y),
    ]);
    expect(heldExploreClear(stop)).toBe(false);
  });

  it("drops a stop whose feet lose their ground, whatever its head was planned on", () => {
    const lead = { x: 100, y: 100 };
    const follow = { x: 700, y: 100 };
    document.elementsFromPoint = vi.fn(faceRowOf(lead));
    const stop = holdExplore({ lead, follow }, false);
    expect(stop.headLead).toBe(false);
    expect(heldExploreClear(stop)).toBe(true);
    // By the re-check, content is under his feet too — his alone: her spot
    // stays clear head to foot, and his head is still on the line it was
    // planned on, so only his feet can be what drops the stop.
    document.elementsFromPoint = vi.fn((x: number, y: number) =>
      x >= lead.x && x <= lead.x + CAT_W && y >= lead.y + 12 ? [prose] : [],
    );
    expect(companionSpace.isClearSpot(follow)).toBe(true);
    expect(companionSpace.headClear(follow)).toBe(true);
    expect(heldExploreClear(stop)).toBe(false);
  });

  it("after the ground itself has settled, drops a stop whose head is on content, however it was planned", () => {
    // A stop planned mid-way through the hero's load choreography (transforms
    // still offsetting the prose) with no head-clear ground anywhere, so its
    // head was on a line from the start. Once an animation ends or the body
    // resizes, the ground it was put on is gone; it is re-planned rather than
    // kept. A scroll does not count — see `heldExploreClear`.
    const lead = { x: 100, y: 100 };
    const follow = { x: 700, y: 100 };
    document.elementsFromPoint = vi.fn(faceRowOf(lead));
    const stop = holdExplore({ lead, follow }, false);
    expect(stop.headLead).toBe(false);
    expect(heldExploreClear(stop)).toBe(true);
    expect(heldExploreClear(stop, true)).toBe(false);
    // Clear head to foot once the content has moved off: kept either way.
    document.elementsFromPoint = vi.fn(() => [] as Element[]);
    expect(heldExploreClear(stop, true)).toBe(true);
  });

  it("re-checks a perch by its lead's three-point probe alone, as it was picked", () => {
    const lead = { x: 100, y: 100 };
    const follow = { x: 700, y: 100 };
    document.elementsFromPoint = vi.fn(() => [] as Element[]);
    const stop = holdExplore({ lead, follow }, true);
    // Her spot is never walked to on a perch, and his head band was never read.
    document.elementsFromPoint = vi.fn((x: number, y: number) =>
      x >= follow.x - 10 || (y >= lead.y + 12 && y <= lead.y + 20) ? [prose] : [],
    );
    expect(heldExploreClear(stop)).toBe(true);
    document.elementsFromPoint = vi.fn((_x: number, y: number) => (y >= lead.y + 30 ? [prose] : []));
    expect(heldExploreClear(stop)).toBe(false);
  });
});

describe("sceneOrder", () => {
  const KINDS = ["yarn", "moth", "bowl", "chase", "gift", "peek", "scratch", "stalk"];

  /**
   * The list is a fallback chain, not a shortlist. A scene missing from it is a
   * scene the page can never produce once the ones above it decline, which is
   * the failure the chain exists to prevent — so "all eight, once each" is the
   * property that matters.
   */
  it("offers every scene exactly once", () => {
    for (let run = 0; run < 50; run += 1) {
      const order = sceneOrder();
      expect(order).toHaveLength(KINDS.length);
      expect([...order].sort()).toEqual([...KINDS].sort());
    }
  });

  /**
   * And the weights still mean something: a reader should mostly not be shown
   * the scenes that touch the page first — they take their turn alongside the
   * props. Asserted as a wide band rather than a figure, so it does not flake.
   */
  it("leads with an anchored scene only now and then", () => {
    const anchored = new Set(["peek", "scratch", "stalk"]);
    let count = 0;
    for (let run = 0; run < 2000; run += 1) {
      if (anchored.has(sceneOrder()[0])) count += 1;
    }
    expect(count / 2000).toBeLessThan(0.45);
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
        if (sceneOrder(flavor)[0] === "moth") count += 1;
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
      const order = sceneOrder(flavor);
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
    // SCENE_NAMES, and ROAM_WEIGHTS and PROP are both typed
    // `Record<SceneKind, …>`, so TypeScript's exact-literal checking already
    // forces each of them to carry exactly these eight keys — a real
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
