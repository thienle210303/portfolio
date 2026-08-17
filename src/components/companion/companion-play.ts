"use client";

import type { CatPose } from "./CompanionCat";
import { CAT_H, CAT_W } from "./CompanionCat";
import { TOY_H, TOY_W, type ToyKind } from "./CompanionToy";
import { clamp, clampToViewport, isClearSpot, type Point } from "./companion-space";

/**
 * Play: the short scenes the cats occasionally act out.
 *
 * Kept out of `Companion` because these are *scripts*, not simulation. The cats'
 * movement is a loop of forces and targets that has to be readable frame by
 * frame; a play is a fixed sequence of beats with fixed durations, and mixing
 * the two would bury both. The companion's loop asks for a beat each frame and
 * does what it says.
 *
 * Three rules the whole module exists to keep:
 *
 *  1. **Rare.** The gap below is minutes. A companion that produces a scene
 *     every thirty seconds is a companion you watch instead of reading the page,
 *     which is the line the whole feature lives on. Round 5 asked for more of
 *     them and the gap came down by a third — from two-and-a-half-to-six minutes
 *     to one-and-a-half-to-four-and-a-half — which is as far as it goes while
 *     "rare" still means anything. There is still no way to ask for one, and
 *     that is deliberate.
 *  2. **Never in the way.** Every position a cat or a prop can *stop* at is
 *     probed against the page with the same content test the resting spots use,
 *     before the scene starts. A play that has nowhere safe to happen does not
 *     happen — `openPlay` returns null and the schedule backs off. Positions
 *     that are only ever passed through are not probed, because crossing
 *     something is allowed and parking on it is not.
 *  3. **Interruptible at any frame.** A scene has no state anywhere but the one
 *     object the caller holds. Dropping it — because the pointer moved, because
 *     a nap spot called, because the toolkit opened — is the whole of the
 *     cleanup.
 *
 * There is no reduced-motion or touch branch here on purpose: play only ever
 * runs inside the roaming loop, and that loop does not exist for either.
 */

/** How rare "rare" is: the earliest a scene may follow the last one, plus a
 *  spread on top. And only if the visitor happens to be idle when the timer
 *  comes up, which in practice makes the observed gap longer than either
 *  number. */
const PLAY_GAP = 90_000;
const PLAY_SPREAD = 180_000;
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

/** How far a sprinting cat covers, and how far off the straight line the arc
 *  bows. A dash drawn as a straight line is a cat being dragged sideways. */
const DASH = 168;
const DASH_BOW = 30;

/**
 * The five scenes.
 *
 *  - **yarn** is a four-beat gag: it turns up, the grey one bats it, it rolls,
 *    she catches it.
 *  - **moth** has no swat — it is out of reach the whole time, which is the
 *    point of a moth — so the cats track it and the pounce is the beat where it
 *    escapes upwards.
 *  - **bowl** is the one with two animals in it rather than one animal and a
 *    prop: they both trot over, they both eat, and then he shoulders her off it
 *    for a moment because that is what actually happens.
 *  - **chase** has no prop at all. One of them bolts for no reason, the other
 *    goes after her, they stop dead and sit down facing the same way as though
 *    neither had moved.
 *  - **gift** is the yarn again, carried: he brings it to her and drops it.
 *
 * A scene is a list of beats and the ms each one lasts. A beat given zero ms is
 * skipped outright, which is how the bowl drops its nudge when there is nowhere
 * clear for the nudged cat to retreat to.
 */
export type SceneKind = "yarn" | "moth" | "bowl" | "chase" | "gift";

type PlayPhase =
  | "enter"
  | "swat"
  | "travel"
  | "pounce"
  | "trot"
  | "eat"
  | "nudge"
  | "share"
  | "dash"
  | "skid"
  | "carry"
  | "offer"
  | "leave";

interface Beat {
  readonly phase: PlayPhase;
  readonly ms: number;
}

export interface Play {
  readonly kind: SceneKind;
  /** What is drawn on the page for this scene, if anything. The chase has no
   *  prop, which is exactly why it is cheap and why it can happen anywhere. */
  readonly prop: ToyKind | null;
  readonly script: readonly Beat[];
  step: number;
  /** When the current beat ends. */
  until: number;
  /** The prop's two ends, or the lead's two ends when there is no prop. */
  readonly from: Point;
  readonly to: Point;
  /** Where each cat is meant to end up, resolved up front with the same probe
   *  the resting spots get, because these are places they *stop*. */
  readonly leadSpot: Point;
  readonly followSpot: Point;
  /** Where the nudged cat retreats to. Only the bowl uses it. */
  readonly aside: Point;
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
  /** What a watching cat turns towards. */
  readonly focus: Point;
  /** A pose to hold, or null to leave the cat to its own devices. */
  readonly leadPose: CatPose | null;
  readonly followPose: CatPose | null;
  /** Somewhere each cat should walk to, or null to leave the loop's own
   *  settled position alone. */
  readonly leadTo: Point | null;
  readonly followTo: Point | null;
  /** A sprint. The loop lifts both speed caps for the beat — nothing else in
   *  the companion moves this fast except the police escort. */
  readonly dash: boolean;
}

const OVER: PlayBeat = {
  done: true,
  focus: { x: 0, y: 0 },
  leadPose: null,
  followPose: null,
  leadTo: null,
  followTo: null,
  dash: false,
};

export function scheduleNextPlay(now: number): number {
  return now + PLAY_GAP + Math.random() * PLAY_SPREAD;
}

/**
 * Which scene comes up.
 *
 * The chase leads because it is the only one that needs no clear rectangle for a
 * prop and no pair of facing spots — on a narrow viewport full of prose it is
 * usually the only one that can open at all, and a companion whose repertoire
 * silently empties on a phone-width window is a companion with one trick.
 */
export function pickScene(): SceneKind {
  const roll = Math.random();
  if (roll < 0.3) return "chase";
  if (roll < 0.54) return "bowl";
  if (roll < 0.72) return "yarn";
  if (roll < 0.87) return "moth";
  return "gift";
}

const PROP: Record<SceneKind, ToyKind | null> = {
  yarn: "yarn",
  moth: "moth",
  bowl: "bowl",
  chase: null,
  gift: "yarn",
};

/* -------------------------------------------------------------------------- */
/* Where a prop is allowed to be                                               */
/*                                                                             */
/* Answered with `isClearSpot`, which asks the question in *cat* units — it is  */
/* the probe the resting spots already use, and reusing it is what keeps props  */
/* and cats from disagreeing about what counts as whitespace. So a prop's       */
/* footprint is expressed as the cat-sized box centred on it. That is far more  */
/* room than a 24px prop needs, and deliberately: a prop drifts and rolls        */
/* inside the space it was granted, and the slack is the margin that keeps the  */
/* whole scene off the prose rather than just its first frame.                  */
/* -------------------------------------------------------------------------- */

function probeBox(toy: Point): Point {
  return { x: toy.x + TOY_W / 2 - CAT_W / 2, y: toy.y + TOY_H / 2 - CAT_H / 2 };
}

function fromProbe(box: Point): Point {
  return { x: box.x + CAT_W / 2 - TOY_W / 2, y: box.y + CAT_H / 2 - TOY_H / 2 };
}

/** Pull a prop position inside the band the cats themselves are clamped to. */
function settle(toy: Point): Point {
  return fromProbe(clampToViewport(probeBox(toy)));
}

function clearFor(toy: Point): boolean {
  return isClearSpot(probeBox(toy));
}

function centre(pos: { x: number; y: number }): Point {
  return { x: pos.x + TOY_W / 2, y: pos.y + TOY_H / 2 };
}

/** Where a cat has to stand to get a paw on something: beside it, on the side
 *  it is coming from, so it does not walk through the thing to reach it. */
function beside(toy: Point, side: 1 | -1): Point {
  return clampToViewport({
    x: toy.x + TOY_W / 2 - CAT_W / 2 - side * CAT_W * 0.62,
    y: toy.y + TOY_H - CAT_H,
  });
}

function open(kind: SceneKind, spec: Omit<Play, "kind" | "prop" | "script" | "step" | "until" | "pos" | "spin" | "flap" | "opacity">, script: readonly Beat[], now: number): Play {
  return {
    kind,
    prop: PROP[kind],
    script,
    step: 0,
    until: now + script[0].ms,
    ...spec,
    pos: { x: spec.from.x, y: spec.from.y },
    spin: 0,
    flap: 1,
    opacity: 0,
  };
}

/**
 * Set a scene up, or decline to.
 *
 * Both directions are tried, so a lead cat sitting with his nose to a paragraph
 * plays *away* from it rather than not at all. Returning null is a normal
 * outcome — a narrow viewport full of text has nowhere for this — and the
 * caller answers it by backing the schedule off rather than by trying harder.
 */
export function openPlay(
  kind: SceneKind,
  lead: Point,
  follow: Point,
  facing: 1 | -1,
  now: number,
): Play | null {
  const sides: Array<1 | -1> = facing === 1 ? [1, -1] : [-1, 1];
  /** Ground level at the cats' feet: a prop that appears at head height is a
   *  prop floating in the air. */
  const foot = lead.y + CAT_H - TOY_H - 1;

  if (kind === "yarn") {
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
      // the prop's own clearance covers — and she is the one who *stops* there,
      // which is the thing the content rule is actually about.
      const chase = beside(to, side);
      if (clearFor(from) && clearFor(to) && isClearSpot(chase)) {
        return open(
          kind,
          { from, to, leadSpot: lead, followSpot: chase, aside: chase, facing: side },
          [
            { phase: "enter", ms: 700 },
            { phase: "swat", ms: 640 },
            { phase: "travel", ms: 1500 },
            { phase: "pounce", ms: 900 },
            { phase: "leave", ms: 760 },
          ],
          now,
        );
      }
    }
    return null;
  }

  if (kind === "moth") {
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
        // Nobody chases a moth — they watch it and it leaves — so the spots are
        // carried only to keep the shape of a scene uniform.
        if (clearFor(from) && clearFor(to)) {
          return open(
            kind,
            { from, to, leadSpot: lead, followSpot: follow, aside: follow, facing: side },
            [
              { phase: "enter", ms: 780 },
              { phase: "travel", ms: 2800 },
              { phase: "pounce", ms: 840 },
              { phase: "leave", ms: 950 },
            ],
            now,
          );
        }
      }
    }
    return null;
  }

  if (kind === "bowl") {
    /*
     * A bowl and two cats facing each other over it is the widest thing the
     * companion ever draws — a good 124px of clear page — which is why this is
     * the scene most likely to decline. It is also why the bowl is placed close
     * to the lead rather than out in front of him: the cats bring their own
     * clearance with them, and the pair are already standing somewhere the
     * settle probe called empty.
     */
    for (const side of sides) {
      const bowl = settle({
        x: side > 0 ? lead.x + CAT_W * 0.95 : lead.x + CAT_W * 0.05 - TOY_W,
        y: foot,
      });
      const near = beside(bowl, side);
      const far = beside(bowl, -side as 1 | -1);
      // Where the shouldered-off cat retreats to, one cat-width further out.
      const aside = clampToViewport({ x: far.x + side * CAT_W * 0.8, y: far.y });
      if (!clearFor(bowl) || !isClearSpot(near) || !isClearSpot(far)) continue;
      return open(
        kind,
        { from: bowl, to: bowl, leadSpot: near, followSpot: far, aside, facing: side },
        [
          { phase: "enter", ms: 500 },
          { phase: "trot", ms: 1300 },
          { phase: "eat", ms: 2200 },
          // Skipped outright when she has nowhere clear to be shoved to — a
          // nudge that ends with a cat parked on a paragraph is not playful.
          { phase: "nudge", ms: isClearSpot(aside) ? 850 : 0 },
          { phase: "share", ms: 1500 },
          { phase: "leave", ms: 650 },
        ],
        now,
      );
    }
    return null;
  }

  if (kind === "chase") {
    /*
     * The cheap one, and the only one with nothing to draw. Two probes: where
     * the bolting cat pulls up, and where the one chasing her stops behind. The
     * arc between them is never probed, because it is crossed rather than
     * stopped on — the same licence a cat trailing the pointer already has.
     */
    for (const side of sides) {
      const to = clampToViewport({ x: lead.x + side * DASH, y: lead.y });
      if (Math.abs(to.x - lead.x) < DASH * 0.55) continue;
      const behind = clampToViewport({ x: to.x - side * (CAT_W + 22), y: to.y + 3 });
      if (!isClearSpot(to) || !isClearSpot(behind)) continue;
      return open(
        kind,
        { from: lead, to, leadSpot: to, followSpot: behind, aside: behind, facing: side },
        [
          { phase: "dash", ms: 820 },
          { phase: "skid", ms: 560 },
          { phase: "leave", ms: 900 },
        ],
        now,
      );
    }
    return null;
  }

  /*
   * The gift. He picks the ball up where he is standing and carries it to her,
   * which means the only spot that has to be clear is the one *he* stops at —
   * she is already parked somewhere the settle probe approved.
   */
  const side: 1 | -1 = follow.x >= lead.x ? 1 : -1;
  const drop = clampToViewport({ x: follow.x - side * (CAT_W * 0.86), y: follow.y });
  const start = settle({
    x: side > 0 ? lead.x + CAT_W * 0.62 : lead.x + CAT_W * 0.38 - TOY_W,
    y: foot,
  });
  const end = settle({ x: follow.x + CAT_W / 2 - TOY_W / 2 - side * CAT_W * 0.34, y: follow.y + CAT_H - TOY_H - 1 });
  if (!isClearSpot(drop) || !clearFor(end)) return null;
  return open(
    "gift",
    { from: start, to: end, leadSpot: drop, followSpot: follow, aside: follow, facing: side },
    [
      { phase: "enter", ms: 620 },
      { phase: "carry", ms: 1500 },
      { phase: "offer", ms: 900 },
      { phase: "leave", ms: 700 },
    ],
    now,
  );
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** A shallow arc between two points, bowed perpendicular to the run. A sprint
 *  drawn as a straight line reads as a cat being dragged sideways. */
function arc(from: Point, to: Point, t: number): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const bow = Math.sin(clamp(t, 0, 1) * Math.PI) * DASH_BOW;
  return clampToViewport({
    x: mix(from.x, to.x, clamp(t, 0, 1)) + (dy / len) * bow,
    y: mix(from.y, to.y, clamp(t, 0, 1)) - (dx / len) * bow,
  });
}

/** Head down, head up, head down. Driven off wall-clock time rather than off
 *  the beat so it carries across the nudge instead of restarting after it, and
 *  given a different period per animal so the pair never chew in unison. */
function chewing(now: number, offset: number): CatPose {
  return Math.sin(now / (390 + offset)) > 0.62 ? "sit" : "eat";
}

/**
 * Advance the scene by one frame and say what the cats should be doing.
 *
 * The prop's position is written into `play.pos` rather than returned, because
 * the caller paints it the same way it paints a cat: straight to the node's
 * transform, outside React.
 *
 * `lead` is the grey one's live position, and only the gift reads it — a ball
 * being carried has to be at the mouth of the animal carrying it, and that
 * animal is being moved by the loop rather than by this script.
 */
export function advancePlay(play: Play, now: number, lead: Point): PlayBeat {
  while (play.step < play.script.length && now >= play.until) {
    play.step += 1;
    if (play.step < play.script.length) play.until = now + play.script[play.step].ms;
  }
  if (play.step >= play.script.length) return OVER;

  const { phase, ms } = play.script[play.step];
  /** 0..1 through the current beat. */
  const t = ms > 0 ? clamp(1 - (play.until - now) / ms, 0, 1) : 1;
  /** Where the prop was last frame — the ball's roll is a *delta*, and reading
   *  it after the new position has been written turns the spin into the total
   *  distance from the start, once per frame. */
  const was = play.pos.x;

  if (play.kind === "yarn") {
    let leadPose: CatPose | null = "sit";
    let followPose: CatPose | null = "sit";
    let followTo: Point | null = null;
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
      followTo = play.followSpot;
    } else if (phase === "pounce") {
      // Under her paw and not liking it.
      const jog = Math.sin(t * Math.PI * 6);
      play.pos.x = play.to.x + jog * 2.2;
      play.pos.y = play.to.y;
      play.spin += jog * 2.4;
      followPose = "bat";
      followTo = play.followSpot;
    } else {
      play.pos.x = play.to.x;
      play.pos.y = play.to.y;
      play.opacity = 1 - t;
      followTo = play.followSpot;
    }

    return { done: false, focus: centre(play.pos), leadPose, followPose, leadTo: null, followTo, dash: false };
  }

  if (play.kind === "moth") {
    // Never still, because a moth that holds position is a leaf: the wobble runs
    // off wall-clock time rather than off the beat, so it carries across phase
    // boundaries instead of resetting at each one.
    const drift = { x: Math.sin(now / 260) * 5, y: Math.cos(now / 190) * 4 };
    play.flap = 0.34 + 0.66 * Math.abs(Math.sin(now / 68));
    let leadPose: CatPose | null = "sit";

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

    return {
      done: false,
      focus: centre(play.pos),
      leadPose,
      followPose: "sit",
      leadTo: null,
      followTo: null,
      dash: false,
    };
  }

  if (play.kind === "bowl") {
    play.pos.x = play.from.x;
    play.pos.y = play.from.y;
    play.opacity = phase === "enter" ? t : phase === "leave" ? 1 - t : 1;

    if (phase === "enter") {
      return {
        done: false,
        focus: centre(play.pos),
        leadPose: "sit",
        followPose: "sit",
        leadTo: null,
        followTo: null,
        dash: false,
      };
    }

    // Nudging: he shoulders into her half of the bowl and she gives it up. Both
    // targets move at once, which is what makes it read as one animal displacing
    // another rather than as two unrelated walks.
    const shoving = phase === "nudge";
    return {
      done: false,
      focus: centre(play.pos),
      leadPose: shoving ? "bat" : phase === "leave" ? "sit" : chewing(now, 0),
      followPose: shoving ? "sit" : phase === "leave" ? "sit" : chewing(now, 60),
      leadTo: shoving
        ? clampToViewport({ x: mix(play.leadSpot.x, play.followSpot.x, 0.34), y: play.leadSpot.y })
        : play.leadSpot,
      followTo: shoving ? play.aside : play.followSpot,
      dash: false,
    };
  }

  if (play.kind === "chase") {
    play.opacity = 0;
    if (phase === "dash") {
      // She goes first and he follows a third of a beat behind, which is what
      // turns two cats running into one cat chasing another.
      return {
        done: false,
        focus: play.to,
        leadPose: null,
        followPose: null,
        leadTo: arc(play.from, play.to, t),
        followTo: arc(play.from, play.followSpot, t - 0.32),
        dash: true,
      };
    }
    if (phase === "skid") {
      return {
        done: false,
        focus: play.to,
        leadPose: null,
        followPose: null,
        leadTo: play.leadSpot,
        followTo: play.followSpot,
        dash: true,
      };
    }
    // And then they sit, facing the way they were going, as though neither of
    // them had moved at all.
    return {
      done: false,
      focus: { x: play.to.x + play.facing * 400, y: play.to.y },
      leadPose: "sit",
      followPose: "sit",
      leadTo: play.leadSpot,
      followTo: play.followSpot,
      dash: false,
    };
  }

  /*
   * The gift. The ball rides at the carrying cat's mouth, which is the one
   * position in this module that cannot be resolved up front: the loop is moving
   * him, so the prop is placed from his live position each frame — one frame
   * behind him, which at these speeds is under three pixels.
   */
  const mouth = {
    x: lead.x + (play.facing > 0 ? CAT_W - TOY_W * 0.9 : TOY_W * -0.1),
    y: lead.y + CAT_H - TOY_H - 1,
  };
  play.opacity = phase === "enter" ? t : phase === "leave" ? 1 - t : 1;

  if (phase === "enter") {
    play.pos.x = play.from.x;
    play.pos.y = play.from.y;
    return {
      done: false,
      focus: centre(play.pos),
      leadPose: "sit",
      followPose: "sit",
      leadTo: null,
      followTo: null,
      dash: false,
    };
  }
  if (phase === "carry") {
    play.pos.x = mouth.x;
    play.pos.y = mouth.y;
    play.spin += (play.pos.x - was) * ROLL_DEG * 0.4;
    return {
      done: false,
      focus: play.followSpot,
      leadPose: null,
      followPose: "sit",
      leadTo: play.leadSpot,
      followTo: null,
      dash: false,
    };
  }
  // Dropped at her feet, and inspected.
  const jog = Math.sin(t * Math.PI * 5) * (phase === "offer" ? 1.8 : 0);
  play.pos.x = play.to.x + jog;
  play.pos.y = play.to.y;
  play.spin += jog * 1.6;
  return {
    done: false,
    focus: centre(play.pos),
    leadPose: "sit",
    followPose: phase === "offer" ? "bat" : "sit",
    leadTo: play.leadSpot,
    followTo: null,
    dash: false,
  };
}
