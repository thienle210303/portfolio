"use client";

import type { CatPose } from "./CompanionCat";
import { CAT_H, CAT_W } from "./CompanionCat";
import { TOY_H, TOY_W, type ToyKind } from "./CompanionToy";
import { clamp, clampToViewport, isClearSpot, type Point } from "./companion-space";

/**
 * Play: the short scene the cats occasionally act out with a toy.
 *
 * Kept out of `Companion` because it is a *script*, not a simulation. The cats'
 * movement is a loop of forces and targets that has to be readable frame by
 * frame; a play is a fixed sequence of beats with fixed durations, and mixing
 * the two would bury both. The companion's loop asks for a beat each frame and
 * does what it says.
 *
 * Three rules the whole module exists to keep:
 *
 *  1. **Rare.** The gap below is minutes. A companion that produces a toy every
 *     thirty seconds is a companion you watch instead of reading the page,
 *     which is the line the whole feature lives on. There is no way to ask for
 *     one, and that is deliberate.
 *  2. **Never in the way.** Every position a toy can occupy is probed against
 *     the page with the same content test the cats' resting spots use, before
 *     the scene starts. A play that has nowhere safe to happen does not happen
 *     — `openPlay` returns null and the schedule backs off.
 *  3. **Interruptible at any frame.** The scene has no state anywhere but the
 *     one object the caller holds. Dropping it — because the pointer moved,
 *     because a nap spot called, because the toolkit opened — is the whole of
 *     the cleanup.
 *
 * There is no reduced-motion or touch branch here on purpose: play only ever
 * runs inside the roaming loop, and that loop does not exist for either.
 */

/** How rare "rare" is: the earliest a toy may follow the last one, plus a
 *  spread on top. Two and a half to six minutes, and only if the visitor
 *  happens to be idle when the timer comes up. */
const PLAY_GAP = 150_000;
const PLAY_SPREAD = 210_000;
/** Nowhere safe to play right now. Backing off matters: probing costs three
 *  hit tests per candidate, and re-running that every frame over a page with no
 *  whitespace would be a per-frame reflow to decide not to do anything. */
export const PLAY_RETRY = 25_000;

/** How far the yarn ball rolls, and how far past the roll the follower is
 *  willing to be dragged. */
const ROLL = 148;
/** Degrees per px for a ball this size: a full turn every 2πr. Rolling at any
 *  other rate reads as a ball skidding, which is oddly noticeable. */
const ROLL_DEG = 360 / (2 * Math.PI * 6.4);

export type PlayPhase = "enter" | "swat" | "travel" | "pounce" | "leave";

/**
 * The two scenes.
 *
 * The yarn is a four-beat gag: it turns up, the grey one bats it, it rolls, she
 * catches it. The moth has no swat — it is out of reach the whole time, which
 * is the point of a moth — so the cats track it and the pounce is the beat
 * where it escapes upwards.
 */
const STEPS: Record<ToyKind, readonly PlayPhase[]> = {
  yarn: ["enter", "swat", "travel", "pounce", "leave"],
  moth: ["enter", "travel", "pounce", "leave"],
};

/** ms per beat. The totals — about 4.5s and 5.4s — are the other half of
 *  "rare": a scene long enough to be seen and short enough that a visitor
 *  glancing back finds two cats sitting quietly again. */
const SPAN: Record<ToyKind, Record<PlayPhase, number>> = {
  yarn: { enter: 700, swat: 640, travel: 1500, pounce: 900, leave: 760 },
  moth: { enter: 780, swat: 0, travel: 2800, pounce: 840, leave: 950 },
};

export interface Play {
  readonly kind: ToyKind;
  readonly steps: readonly PlayPhase[];
  step: number;
  /** When the current beat ends. */
  until: number;
  readonly from: Point;
  readonly to: Point;
  /** Where the follower stands to reach the toy. Resolved up front, with the
   *  same probe the toy's own positions get. */
  readonly chase: Point;
  /** Which way the scene runs, in the lead cat's facing units. */
  readonly facing: 1 | -1;
  /** Live, and written straight to the DOM by the caller: none of this belongs
   *  in React state at 60fps. */
  readonly pos: { x: number; y: number };
  spin: number;
  flap: number;
  opacity: number;
}

export interface PlayBeat {
  /** The scene is over. Nothing else on the beat is meaningful. */
  readonly done: boolean;
  /** The toy's centre — what a watching cat turns towards. */
  readonly focus: Point;
  /** A pose to hold, or null to leave the cat to its own devices. */
  readonly leadPose: CatPose | null;
  readonly followPose: CatPose | null;
  /** Somewhere the follower should walk to, or null to stay put. */
  readonly chase: Point | null;
}

const OVER: PlayBeat = {
  done: true,
  focus: { x: 0, y: 0 },
  leadPose: null,
  followPose: null,
  chase: null,
};

export function scheduleNextPlay(now: number): number {
  return now + PLAY_GAP + Math.random() * PLAY_SPREAD;
}

/** Yarn slightly more often than moths: it is the one with a punchline. */
export function pickToy(): ToyKind {
  return Math.random() < 0.58 ? "yarn" : "moth";
}

/* -------------------------------------------------------------------------- */
/* Where a toy is allowed to be                                                */
/*                                                                             */
/* Answered with `isClearSpot`, which asks the question in *cat* units — it is  */
/* the probe the resting spots already use, and reusing it is what keeps toys   */
/* and cats from disagreeing about what counts as whitespace. So a toy's        */
/* footprint is expressed as the cat-sized box centred on it. That is far more  */
/* room than a 24px toy needs, and deliberately: a toy drifts and rolls inside  */
/* the space it was granted, and the slack is the margin that keeps the whole   */
/* scene off the prose rather than just its first frame.                        */
/* -------------------------------------------------------------------------- */

function probeBox(toy: Point): Point {
  return { x: toy.x + TOY_W / 2 - CAT_W / 2, y: toy.y + TOY_H / 2 - CAT_H / 2 };
}

function fromProbe(box: Point): Point {
  return { x: box.x + CAT_W / 2 - TOY_W / 2, y: box.y + CAT_H / 2 - TOY_H / 2 };
}

/** Pull a toy position inside the band the cats themselves are clamped to. */
function settle(toy: Point): Point {
  return fromProbe(clampToViewport(probeBox(toy)));
}

function clearFor(toy: Point): boolean {
  return isClearSpot(probeBox(toy));
}

function centre(pos: { x: number; y: number }): Point {
  return { x: pos.x + TOY_W / 2, y: pos.y + TOY_H / 2 };
}

/** Where the follower has to stand to get a paw on the ball: beside it, on the
 *  side she is coming from, so she does not walk through it to reach it. */
function chaseSpot(toy: Point, facing: 1 | -1): Point {
  return clampToViewport({
    x: toy.x + TOY_W / 2 - CAT_W / 2 - facing * CAT_W * 0.62,
    y: toy.y + TOY_H - CAT_H,
  });
}

function open(
  kind: ToyKind,
  from: Point,
  to: Point,
  chase: Point,
  facing: 1 | -1,
  now: number,
): Play {
  const steps = STEPS[kind];
  return {
    kind,
    steps,
    step: 0,
    until: now + SPAN[kind][steps[0]],
    from,
    to,
    chase,
    facing,
    pos: { x: from.x, y: from.y },
    spin: 0,
    flap: 1,
    opacity: 0,
  };
}

/**
 * Set a scene up, or decline to.
 *
 * Both ends of the toy's travel are probed before anything is committed, and
 * both directions are tried, so a lead cat sitting with his nose to a paragraph
 * plays *away* from it rather than not at all. Returning null is a normal
 * outcome — a narrow viewport full of text has nowhere for this — and the
 * caller answers it by backing the schedule off rather than by trying harder.
 */
export function openPlay(kind: ToyKind, lead: Point, facing: 1 | -1, now: number): Play | null {
  const sides: Array<1 | -1> = facing === 1 ? [1, -1] : [-1, 1];

  if (kind === "yarn") {
    // Ground level, at the front paw: a ball of yarn that appears at head
    // height is a ball of yarn floating in the air.
    const foot = lead.y + CAT_H - TOY_H - 1;
    for (const side of sides) {
      const from = settle({
        x: side > 0 ? lead.x + CAT_W * 0.72 : lead.x + CAT_W * 0.28 - TOY_W,
        y: foot,
      });
      const to = settle({ x: from.x + side * ROLL, y: from.y });
      // A roll the clamp has flattened to nothing is not a roll; better no
      // scene than a ball that twitches in place and stops.
      if (Math.abs(to.x - from.x) < ROLL * 0.5) continue;
      // Three probes, not two. The follower ends the scene standing beside the
      // ball rather than on it, which puts her a good half-cat outside the box
      // the toy's own clearance covers — and she is the one who *stops* there,
      // which is the thing the content rule is actually about.
      const chase = chaseSpot(to, side);
      if (clearFor(from) && clearFor(to) && isClearSpot(chase)) {
        return open(kind, from, to, chase, side, now);
      }
    }
    return null;
  }

  // The moth flies, so it gets tried at three heights before it gives up: the
  // one that reads best is above the cats' heads, but that band is exactly
  // where a heading tends to be.
  //
  // It also crosses them rather than drifting off to one side, and that is the
  // whole scene. Tracking is drawn by *turning*, because the drawing has no
  // head that moves independently of the body — so a moth that stays on the
  // side the cats already face is a moth nobody watches.
  const nose = lead.x + CAT_W / 2 - TOY_W / 2;
  for (const side of sides) {
    for (const dy of [-32, -8, -56]) {
      const from = settle({ x: nose - side * 38, y: lead.y + dy });
      const to = settle({ x: from.x + side * 96, y: from.y - 14 });
      // Nobody chases a moth — they watch it and it leaves — so the spot is
      // carried only to keep the shape of a scene uniform.
      if (clearFor(from) && clearFor(to)) return open(kind, from, to, chaseSpot(to, side), side, now);
    }
  }
  return null;
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Advance the scene by one frame and say what the cats should be doing.
 *
 * The toy's position is written into `play.pos` rather than returned, because
 * the caller paints it the same way it paints a cat: straight to the node's
 * transform, outside React.
 */
export function advancePlay(play: Play, now: number): PlayBeat {
  while (play.step < play.steps.length && now >= play.until) {
    play.step += 1;
    if (play.step < play.steps.length) play.until = now + SPAN[play.kind][play.steps[play.step]];
  }
  if (play.step >= play.steps.length) return OVER;

  const phase = play.steps[play.step];
  const span = SPAN[play.kind][phase];
  /** 0..1 through the current beat. */
  const t = span > 0 ? clamp(1 - (play.until - now) / span, 0, 1) : 1;
  /** Where the toy was last frame — the ball's roll is a *delta*, and reading
   *  it after the new position has been written turns the spin into the total
   *  distance from the start, once per frame. */
  const was = play.pos.x;

  let leadPose: CatPose | null = "sit";
  let followPose: CatPose | null = "sit";
  let chase: Point | null = null;

  if (play.kind === "yarn") {
    play.pos.x = play.from.x;
    play.pos.y = play.from.y;
    play.opacity = 1;

    if (phase === "enter") {
      play.opacity = t;
    } else if (phase === "swat") {
      leadPose = "bat";
    } else if (phase === "travel") {
      // Eased out, not linear: a ball that leaves the paw at the same speed it
      // arrives has not been hit, it has been placed.
      const eased = 1 - (1 - t) ** 3;
      play.pos.x = mix(play.from.x, play.to.x, eased);
      play.pos.y = mix(play.from.y, play.to.y, eased);
      play.spin += (play.pos.x - was) * ROLL_DEG;
      chase = play.chase;
    } else if (phase === "pounce") {
      // Under her paw and not liking it.
      const jog = Math.sin(t * Math.PI * 6);
      play.pos.x = play.to.x + jog * 2.2;
      play.pos.y = play.to.y;
      play.spin += jog * 2.4;
      followPose = "bat";
      chase = play.chase;
    } else {
      play.pos.x = play.to.x;
      play.pos.y = play.to.y;
      play.opacity = 1 - t;
      chase = play.chase;
    }

    return { done: false, focus: centre(play.pos), leadPose, followPose, chase };
  }

  // The moth. Never still, because a moth that holds position is a leaf: the
  // wobble runs off wall-clock time rather than off the beat, so it carries
  // across phase boundaries instead of resetting at each one.
  const drift = { x: Math.sin(now / 260) * 5, y: Math.cos(now / 190) * 4 };
  play.flap = 0.34 + 0.66 * Math.abs(Math.sin(now / 68));

  if (phase === "enter") {
    play.pos.x = play.from.x + drift.x;
    play.pos.y = play.from.y + drift.y;
    play.opacity = t;
  } else if (phase === "travel") {
    // Smoothstepped: flat at both ends, so it arrives and hangs there rather
    // than sailing through the spot the cats are watching.
    const eased = t * t * (3 - 2 * t);
    play.pos.x = mix(play.from.x, play.to.x, eased) + drift.x;
    play.pos.y = mix(play.from.y, play.to.y, eased) + drift.y;
    play.opacity = 1;
  } else if (phase === "pounce") {
    // Straight up, out of reach, which is the whole joke.
    play.pos.x = play.to.x + drift.x + play.facing * 10 * t;
    play.pos.y = play.to.y + drift.y - 22 * t;
    leadPose = "bat";
  } else {
    play.pos.x = play.to.x + drift.x + play.facing * 10;
    play.pos.y = play.to.y + drift.y - 22 - 30 * t;
    play.opacity = 1 - t;
  }

  // The only positions in this module not resolved up front, so the only ones
  // that can wander: a moth climbing out of the pounce would otherwise finish
  // its fade behind the sticky header, which is the one place on this page
  // nothing is allowed to end up.
  const held = settle(play.pos);
  play.pos.x = held.x;
  play.pos.y = held.y;

  return { done: false, focus: centre(play.pos), leadPose, followPose, chase: null };
}
