"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { profile } from "@/content/portfolio";
import { cn } from "@/lib/cn";
import CompanionCat, { CAT_H, CAT_W, type CatPose } from "./CompanionCat";
import CompanionToy, { TOY_H, TOY_W, type ToyKind } from "./CompanionToy";
import RestingBox, { BED_H, BED_INSET, BED_W, IdleBed } from "./RestingBox";
import ToolkitPanel, { PANEL_ID } from "./ToolkitPanel";
import {
  advancePlay,
  openPlay,
  pickToy,
  scheduleNextPlay,
  PLAY_RETRY,
  type Play,
  type PlayBeat,
} from "./companion-play";
import { setCompanionMode, useCompanionMode } from "./companion-state";
import {
  clamp,
  clampToViewport,
  findClearSpot,
  keepInView,
  refreshSafeArea,
  safeTop,
  syncTone,
  viewport,
  type Point,
} from "./companion-space";

/**
 * Two line-drawn cats that live on the page, keep loose company with the
 * pointer, and double as the site's quick-actions toolkit.
 *
 * Four rules shaped every decision below, because a companion is exactly the
 * kind of feature that turns a calm site into a noisy one:
 *
 *  1. It never covers what you are reading. The lead cat keeps a personal-space
 *     radius from the cursor and approaches from behind it, and neither cat is
 *     allowed to *settle* on prose, a control or a form — see companion-space.
 *     Crossing something while it moves is fine; parking on it is not.
 *  2. It is never the only way to do anything. Every action in its toolkit also
 *     exists in the header, the hero or the contact section, and the cats
 *     themselves can be sent to bed or removed outright.
 *  3. It costs nothing to people who do not want it. No model, no network, no
 *     images — the whole thing is inline SVG and *one* rAF loop that drives both
 *     cats and stops when the tab is hidden, when motion is reduced, and when
 *     both animals are asleep.
 *  4. Neither cat is the other one shifted sideways. They were literally one
 *     SVG on one button before this — same pose, same phase, one position — and
 *     no amount of drawing makes that read as two animals. The grey one leads
 *     and tracks the pointer; the tabby follows *him*, on her own clock, and
 *     stops to watch the cursor or wander off when it suits her.
 *  5. Anything it does of its own accord is *rare*. The idle flourishes are
 *     tens of seconds apart and the toys — see companion-play — are minutes
 *     apart, can only start while the cats are already settled and the visitor
 *     is not doing anything, and end on the frame the pointer moves. A
 *     companion that performs on a schedule you can feel is a companion you
 *     watch instead of reading the page.
 *  6. It is always somewhere you can find it. Two ways a cat used to become
 *     invisible — off the viewport edge, and behind the opaque sticky header
 *     the companion layer sits under — are answered in companion-space, which
 *     every target and every position now goes through. The third was social
 *     rather than geometric: after a while they simply stopped following and
 *     went quiet wherever they were standing, which reads as a bug even when
 *     the cat is right there. Now they go to bed, in the corner, visibly.
 *
 * On touch devices there is no cursor to follow, so the roaming behaviour is
 * skipped entirely and both cats simply rest in the corner as a toolkit button.
 * The same is true for anyone who has asked for reduced motion — and because
 * that path has no roaming layer at all, the police-cat escort, the nap
 * contract, the idle bed and every idle flourish are skipped with it, landing
 * straight in their end state.
 */

/** How close the lead cat is willing to get to the pointer, in px. */
const LEAD_SPACE = 96;
/** The gap the tabby keeps behind the grey one, and how far she lets that gap
 *  stretch before she can be bothered to close it. The slack is what makes her
 *  move in bursts instead of gliding along on a fixed leash. */
const FOLLOW_GAP = 26;
const FOLLOW_SLACK = 58;

/**
 * How long before the cats settle, then before they go to bed, in ms.
 *
 * Two thresholds measuring two different things, which is the whole reason they
 * read off two different clocks below. Settling is about the *pointer* holding
 * still: there is nothing to trail, so stop trailing it. Going to bed is about
 * the *visitor* being gone — and a visitor reading a long page holds the mouse
 * perfectly still for minutes while scrolling through it.
 */
const SETTLE_AFTER = 2400;
const SLEEP_AFTER = 14000;

/** px per frame at 60fps, scaled by distance so they lope rather than snap. */
const LEAD_SPEED = 4.4;
/** Being shooed is faster than strolling — and it has to be, because the whole
 *  escort has a ~2.5s budget and the walk can start anywhere on screen. */
const ESCORT_SPEED = 7.5;
const POLICE_SPEED = 8;

/**
 * The follower's speed curve. See `followTarget` and `ramp` below — between
 * them these four numbers replace what used to be three discrete speeds.
 *
 * `FOLLOW_RANGE` is how far past her comfortable distance she has to be before
 * she is running flat out; `FOLLOW_ACCEL` and `FOLLOW_BRAKE` are how fast she
 * is allowed to change her mind, in px per frame per frame. Braking is quicker
 * than accelerating, which is true of cats and also keeps her from sailing past
 * whatever she was heading for.
 */
const FOLLOW_MAX = 6.4;
const FOLLOW_RANGE = 200;
const FOLLOW_ACCEL = 0.34;
const FOLLOW_BRAKE = 0.5;

/* ---------------------------------------------------------------- the bed --
 *
 * Two sleeps, and the difference between them is the whole point:
 *
 *  - `CompanionMode === "resting"` is a **preference**. The visitor asked for
 *    the cats to be put away, it is written to localStorage under "companion",
 *    it survives a reload, and only the box's own "Wake the cats" button undoes
 *    it. That flow owns `RestingBox`, and it is the only one that touches
 *    storage.
 *  - Idle sleep — everything below — is a **moment**. Nobody has done anything
 *    for `SLEEP_AFTER`, so instead of dozing off in whatever margin they
 *    happened to be standing in, they walk to the corner bed and curl up in it.
 *    Nothing is written anywhere: reload and they roam, exactly as before.
 *
 * "Nobody has done anything" is deliberately wider than "the pointer has not
 * moved", and the difference is the whole of `lastSignRef`. Reading a long page
 * is scrolling it with the mouse held still, so on the pointer clock a visitor
 * halfway down the page reads as absent — the cats would leave for the corner
 * while somebody was plainly still there, and nothing they could do short of
 * moving the mouse would bring them back.
 *
 * It exists because the old behaviour looked like a bug. The cats simply left,
 * quietly, to wherever the placement probe had put them — which was correct and
 * completely unreadable. Now they go somewhere on purpose, and the bed is there
 * to say so.
 */
type Bed = "walking" | "asleep" | null;

/** How near the pointer must come before a cat asleep in the bed will get up,
 *  and how far it must travel anywhere else to have the same effect. A twitch
 *  should not drag two sleeping animals across the page; using the page should. */
const BED_WAKE_NEAR = 190;
const BED_WAKE_TRAVEL = 150;

/** Pointer dwell before a `data-cat-nap` element calls the cats over, in ms. */
const NAP_DWELL = 600;
const NAP_ATTR = "[data-cat-nap]";

/** Escort budget: cats in the box by 2.2s, police gone by 3.4s, whatever
 *  happens. A flourish that can hang is not a flourish. */
const HERD_MAX = 2200;
const ESCORT_MAX = 3400;

/** The drawing is committed to React at ~30fps while the positions move every
 *  frame. A gait at 30fps is indistinguishable from one at 60; a re-render at
 *  60 is not free. */
const RENDER_INTERVAL = 32;
/** How often a cat re-checks which section it is flying over. */
const TONE_INTERVAL = 320;

type Mood = "trail" | "watch" | "drift";
type EscortPhase = "herding" | "leaving";
/** The poses a cat can drop into of its own accord while it is sitting. */
type Flourish = Extract<CatPose, "sit" | "stretch" | "groom" | "bat">;

/**
 * Idle flourishes: how long a cat sits before it does something with itself,
 * and how long the something lasts.
 *
 * Deliberately in the seconds-between-tens-of-seconds range. A companion that
 * fidgets is a companion you end up watching instead of reading the page, and
 * the whole feature is only defensible while it stays below that line — so the
 * gap is long, the flourishes are short, and each cat rolls its own.
 */
const IDLE_GAP = 7000;
const IDLE_SPREAD = 13000;
/** The twitch, which needs no pose of its own — just an ear and a tail. */
const FLICK_GAP = 6500;
const FLICK_SPREAD = 11000;
const FLICK_MS = 340;

interface Spot {
  x: number;
  y: number;
}

interface Spots {
  readonly lead: Point;
  readonly follow: Point;
}

/** Everything about one animal that changes per frame. Positions live here
 *  rather than in React state: they change every frame, and putting them
 *  through React would re-render the subtree sixty times a second. */
interface Mover {
  readonly pos: Spot;
  facing: 1 | -1;
  phase: number;
  pose: CatPose;
  /** Blink schedule, per animal, so they never blink in unison. */
  blinkUntil: number;
  blinkAt: number;
  /** Idle flourishes: the pose currently being held, when it ends, and the
   *  earliest the next one may start. Rolled per animal for the same reason
   *  the blink is — two cats stretching in unison is one cat drawn twice. */
  idle: Flourish;
  idleUntil: number;
  idleAt: number;
  flickUntil: number;
  flickAt: number;
  /** Follower only. `speed` is state rather than a per-frame result: it is what
   *  the acceleration limiter carries between frames. */
  mood: Mood;
  moodUntil: number;
  drift: Spot;
  engaged: boolean;
  speed: number;
}

/** The part of a cat React actually draws. */
interface Visual {
  readonly pose: CatPose;
  readonly phase: number;
  readonly facing: 1 | -1;
  readonly blinking: boolean;
  readonly flick: number;
}

interface Frame {
  readonly lead: Visual;
  readonly follow: Visual;
  readonly police: Visual | null;
}

interface EscortRun {
  phase: EscortPhase;
  readonly startedAt: number;
  readonly slots: Spots;
  readonly police: Mover;
}

interface Nap {
  readonly el: Element;
  rect: DOMRect;
  readAt: number;
}

const RESTING_VISUAL: Visual = { pose: "sit", phase: 0, facing: 1, blinking: false, flick: 0 };
const INITIAL_FRAME: Frame = {
  lead: RESTING_VISUAL,
  // Half a cycle out of step with his, which is what keeps the parked pair from
  // reading as one sprite stamped twice before the loop ever runs.
  follow: { ...RESTING_VISUAL, phase: 0.5 },
  police: null,
};

function mover(phase: number): Mover {
  return {
    pos: { x: 0, y: 0 },
    facing: 1,
    phase,
    pose: "sit",
    blinkUntil: 0,
    blinkAt: 0,
    idle: "sit",
    idleUntil: 0,
    idleAt: 0,
    flickUntil: 0,
    flickAt: 0,
    mood: "trail",
    moodUntil: 0,
    drift: { x: 0, y: 0 },
    engaged: false,
    speed: 0,
  };
}

/* -------------------------------------------------------------------------- */
/* Geometry                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Where the cats go when they have nothing to follow. Bottom-right, not
 * bottom-left: the hero's calls to action, the "Scroll" marker and the
 * back-to-top control all live on the left, and both the toolkit panel and the
 * resting box open from this corner too, so cats and furniture stay together.
 */
function homeSpot(): Point {
  // Through the shared clamp, not a bare Math.max: that is the one function
  // that knows about both viewport edges *and* the chrome painting over the
  // companion layer, and a corner computed any other way is a corner that can
  // land somewhere invisible.
  return clampToViewport({
    x: viewport().width - CAT_W - 26,
    y: viewport().height - CAT_H - 30,
  });
}

function followHome(home: Point): Point {
  return clampToViewport({ x: home.x - CAT_W - FOLLOW_GAP, y: home.y });
}

/** Their two places in the resting box, spread across it rather than stacked. */
function slotsForBox(rect: DOMRect): Spots {
  const y = rect.top + rect.height / 2 - CAT_H / 2;
  return {
    lead: clampToViewport({ x: rect.right - CAT_W - 4, y }),
    follow: clampToViewport({ x: rect.left + 4, y }),
  };
}

/** The idle bed, in viewport coordinates. Computed from the same three numbers
 *  the element is positioned with, so the cats cannot miss their own bed. */
function bedBox(): { left: number; top: number } {
  return {
    left: Math.max(0, viewport().width - BED_INSET - BED_W),
    top: Math.max(0, viewport().height - BED_INSET - BED_H),
  };
}

/**
 * Their two places on the mat: the tabby on the left, the grey one on the
 * right, which is the order the resting box prints them in.
 *
 * The lead's slot is pulled back by the hit-target margin its button carries
 * around the drawing, because that transform positions the *button* and not the
 * animal inside it. Everywhere else on the page four pixels of drift between
 * two roaming cats is invisible; sharing a 112px bed, it is not.
 */
const LEAD_PAD_X = 4;
const LEAD_PAD_Y = 3;

function bedSlots(): Spots {
  const box = bedBox();
  const y = box.top + (BED_H - CAT_H) / 2;
  return {
    lead: clampToViewport({ x: box.left + BED_W / 2 - LEAD_PAD_X, y: y - LEAD_PAD_Y }),
    follow: clampToViewport({ x: box.left + BED_W / 2 - CAT_W, y }),
  };
}

/** Distance from a point to the bed's edge, zero inside it. */
function nearBed(point: Point): boolean {
  const box = bedBox();
  const dx = Math.max(box.left - point.x, 0, point.x - (box.left + BED_W));
  const dy = Math.max(box.top - point.y, 0, point.y - (box.top + BED_H));
  return Math.hypot(dx, dy) < BED_WAKE_NEAR;
}

/** Beneath the element that called them, centred on it. */
function napSlots(rect: DOMRect): Spots {
  const y = rect.bottom + 2;
  const centre = rect.left + rect.width / 2;
  return {
    lead: clampToViewport({ x: centre + 4, y }),
    follow: clampToViewport({ x: centre - CAT_W - 4, y }),
  };
}

function distance(a: Spot, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Moves `pos` towards `want` and returns how far it actually travelled, which
 *  is what the gait speed is scaled by — a cat creeping the last few pixels
 *  should not be sprinting on the spot. */
function advance(pos: Spot, want: Point, maxSpeed: number): number {
  if (maxSpeed <= 0) return 0;
  const dx = want.x - pos.x;
  const dy = want.y - pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.6) return 0;
  const step = Math.min(maxSpeed, dist * 0.14, dist);
  pos.x += (dx / dist) * step;
  pos.y += (dy / dist) * step;
  return step;
}

function centreOf(pos: Spot): Point {
  return { x: pos.x + CAT_W / 2, y: pos.y + CAT_H / 2 };
}

/* -------------------------------------------------------------------------- */
/* The follower's speed                                                        */
/*                                                                             */
/* She used to have three: nothing while she was disengaged or watching, 3.4    */
/* while she trailed, and a 6.2 "sprint" that cut in on the frame the gap       */
/* passed 220px. Thien's note — "too slow and suddenly walking too fast" — is   */
/* both edges of that. They are step changes in *velocity*, and no amount of    */
/* easing inside `advance` hides one: the drawing is still moving at 3.4px a    */
/* frame and then, one frame later, at 6.2.                                     */
/*                                                                             */
/* So there are no speeds any more, only a curve and a limiter.                 */
/* -------------------------------------------------------------------------- */

/**
 * How fast she *wants* to be going, given how far she has to go.
 *
 * `gap` is the distance she is entitled to keep — the follow gap when she is
 * trailing him, zero when she is walking to a fixed place like the bed — so the
 * curve is always "speed proportional to distance beyond where I should be".
 * Eased out rather than smoothstepped: a curve that is flat at *both* ends
 * looks right leaving the gap but leaves her creeping the last few pixels onto
 * a target forever, which matters now that some of those targets are places she
 * has to actually arrive at.
 */
function followTarget(away: number, gap: number): number {
  const t = clamp((away - gap) / FOLLOW_RANGE, 0, 1);
  return FOLLOW_MAX * (1 - (1 - t) * (1 - t));
}

/** And how fast she is allowed to change her mind. This is the half that makes
 *  her *personality* smooth as well as her pursuit: stopping to watch the
 *  cursor drops the target to zero, and she coasts down over ~13 frames instead
 *  of freezing mid-stride. */
function ramp(from: number, to: number): number {
  return from + clamp(to - from, -FOLLOW_BRAKE, FOLLOW_ACCEL);
}

/* -------------------------------------------------------------------------- */
/* Idle flourishes                                                             */
/* -------------------------------------------------------------------------- */

/**
 * What a cat does with itself while it is sitting and nothing needs doing.
 *
 * Only ever reached from a *settled* cat, so none of this competes with the
 * pointer: a cat that is walking, sleeping, being escorted or being called to a
 * nap spot is busy, and busy cats do not groom. `canBat` is the follower's
 * privilege and hers alone — she is the one who ends up parked behind him with
 * his tail in reach, and giving them both the same repertoire would undo the
 * whole reason there are two of them.
 */
function tickIdle(cat: Mover, now: number, canBat: boolean): Flourish {
  if (cat.idleAt === 0) {
    cat.idleAt = now + IDLE_GAP + Math.random() * IDLE_SPREAD;
    return "sit";
  }
  if (now < cat.idleUntil) return cat.idle;
  if (cat.idle !== "sit") {
    cat.idle = "sit";
    cat.idleAt = now + IDLE_GAP + Math.random() * IDLE_SPREAD;
    return "sit";
  }
  if (now < cat.idleAt) return "sit";

  const roll = Math.random();
  if (canBat && roll < 0.3) {
    cat.idle = "bat";
    cat.idleUntil = now + 900 + Math.random() * 500;
  } else if (roll < 0.65) {
    cat.idle = "groom";
    cat.idleUntil = now + 2200 + Math.random() * 1200;
  } else {
    cat.idle = "stretch";
    cat.idleUntil = now + 1000 + Math.random() * 500;
  }
  return cat.idle;
}

/** Drop whatever flourish was running and push the next one out. Called on
 *  every frame a cat is doing something real, so a cat interrupted mid-groom
 *  does not resume it three walks later. */
function calmIdle(cat: Mover, now: number): void {
  cat.idle = "sit";
  cat.idleUntil = 0;
  if (cat.idleAt < now) cat.idleAt = now + IDLE_GAP + Math.random() * IDLE_SPREAD;
}

/** The ear-and-tail twitch. Returns 0..1..0 across the flick so the ear that
 *  moves also settles, rather than snapping back flat. */
function tickFlick(cat: Mover, now: number, allowed: boolean): number {
  if (cat.flickAt === 0 || !allowed) {
    if (cat.flickAt < now) cat.flickAt = now + FLICK_GAP + Math.random() * FLICK_SPREAD;
    return 0;
  }
  if (now < cat.flickUntil) return Math.sin(((cat.flickUntil - now) / FLICK_MS) * Math.PI);
  if (now > cat.flickAt) {
    cat.flickUntil = now + FLICK_MS;
    cat.flickAt = now + FLICK_GAP + Math.random() * FLICK_SPREAD;
  }
  return 0;
}

function paint(node: HTMLElement | null, pos: Spot): void {
  if (node) node.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
}

function sameVisual(a: Visual, b: Visual): boolean {
  return (
    a.pose === b.pose &&
    a.facing === b.facing &&
    a.blinking === b.blinking &&
    // Quantised: the drawing cannot show more than this, so committing more
    // than this is pure re-render cost.
    Math.round(a.phase * 24) === Math.round(b.phase * 24) &&
    Math.round(a.flick * 5) === Math.round(b.flick * 5)
  );
}

/* -------------------------------------------------------------------------- */
/* Media queries                                                               */
/*                                                                             */
/* State that lives outside React, is unavailable while rendering on the        */
/* server, and can change without React knowing — which is what                 */
/* useSyncExternalStore is for, and why it is not a useEffect + setState that   */
/* React 19 flags and that renders one frame of the wrong thing.                */
/* -------------------------------------------------------------------------- */

/** Server snapshot is `false` for every query here, which is the conservative
 *  answer in both cases: no roaming until the client says otherwise. */
function useMedia(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  const snapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, snapshot, () => false);
}

export function Companion() {
  const mode = useCompanionMode();
  // Roaming needs a real pointer and a visitor who has not asked for calm.
  const finePointer = useMedia("(pointer: fine)");
  const stillness = useMedia("(prefers-reduced-motion: reduce)");
  const roams = finePointer && !stillness;

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [escort, setEscort] = useState<EscortPhase | null>(null);
  const [bed, setBed] = useState<Bed>(null);
  /** Which toy is on the page, if any. The only part of a play React knows
   *  about: everything else it does is a transform written per frame. */
  const [toy, setToy] = useState<ToyKind | null>(null);
  const [frame, setFrame] = useState<Frame>(INITIAL_FRAME);

  const leadNode = useRef<HTMLElement | null>(null);
  const followNode = useRef<HTMLElement | null>(null);
  const policeNode = useRef<HTMLElement | null>(null);
  const toyNode = useRef<HTMLDivElement | null>(null);
  const toyArt = useRef<SVGGElement | null>(null);
  const toySpin = useRef<SVGGElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const matRef = useRef<HTMLDivElement>(null);
  const wakeButtonRef = useRef<HTMLButtonElement>(null);

  const lead = useRef<Mover>(mover(0));
  const follow = useRef<Mover>(mover(0.5));

  // The rAF loop closes over its initial props, so anything it has to react to
  // is mirrored into a ref rather than read from state.
  const openRef = useRef(false);
  const placed = useRef(false);
  const pointerRef = useRef<Point | null>(null);
  const lastMoveRef = useRef(0);
  /**
   * The last moment anybody was demonstrably *here*, which is not the same
   * question as when the pointer last moved and must not be answered by the
   * same clock.
   *
   * Reading a page is scrolling it, and a wheel turned under a stationary mouse
   * fires no pointer event at all — so on the pointer clock alone, a visitor
   * three paragraphs into the page has been "idle" the whole time. They watched
   * the cats walk off to the corner and go to sleep while they were reading,
   * and no amount of further scrolling brought them back, because the only
   * thing that ends the idle sleep is the pointer handler and the pointer never
   * moved. That is how two cats leave the screen for the rest of a visit.
   *
   * So the bed reads this clock instead: a scroll, a resize, a key or a click
   * all stamp it, and only the *settle* threshold — which really is about the
   * pointer holding still — stays on `lastMoveRef`. Never read directly: the
   * later of the two is what "alone" means, so the existing resets that write
   * `lastMoveRef` keep working untouched.
   */
  const lastSignRef = useRef(0);
  const escortRef = useRef<EscortRun | null>(null);
  /** The idle bed, mirrored out of React so the loop and the pointer handler
   *  can both read it. The *loop* owns the value; everything else asks it to
   *  reconsider by resetting the idle clock. */
  const bedRef = useRef<Bed>(null);
  /** Pointer distance accumulated since they curled up. */
  const travelRef = useRef(0);
  const napRef = useRef<Nap | null>(null);
  const napPointer = useRef<Element | null>(null);
  const napFocus = useRef<Element | null>(null);
  /** The running scene, and the earliest the next one may start. Both live
   *  above the loop effect so a mode change does not hand a returning visitor
   *  a toy immediately, or reset a timer they have already half waited out. */
  const playRef = useRef<Play | null>(null);
  const playAt = useRef(0);
  /** Content-avoiding rest spots, resolved once per settle rather than per
   *  frame. Cleared whenever the page underneath them can have moved. */
  const settleSpots = useRef<Spots | null>(null);
  const homeSpots = useRef<Spots | null>(null);
  const committed = useRef<Frame>(INITIAL_FRAME);
  const lastCommit = useRef(0);
  const lastTone = useRef(0);
  /** Where the cats should re-enter from, captured before the box unmounts. */
  const spawn = useRef<Spots | null>(null);
  const pendingEscort = useRef(false);
  const focusWish = useRef<"cat" | "box" | null>(null);
  const restart = useRef<(() => void) | null>(null);

  const wake = useCallback(() => restart.current?.(), []);

  /** Put the toy away, whatever it was doing. Every exit from a play goes
   *  through here, including the ones that are not about the toy at all — the
   *  toolkit opening, the mode changing, the loop being torn down — because a
   *  toy left mounted with nothing advancing it is a drawing frozen on the
   *  page. `playAt` is re-rolled here rather than at the start of a scene, so
   *  an interrupted play does not immediately try again. */
  const endPlay = useCallback((now = performance.now()) => {
    if (!playRef.current) return;
    playAt.current = scheduleNextPlay(now);
    playRef.current = null;
    setToy(null);
  }, []);

  useEffect(() => {
    openRef.current = open;
    wake();
  }, [open, wake]);

  /* ------------------------------------------------------------- placing -- */

  // Idempotent on purpose: the lead's ref callback and the follower's both call
  // it, and whichever runs first is the one that gets to consume `spawn`. A
  // second run would find it empty and teleport the cats back to the corner
  // they had just walked out of.
  const place = useCallback(() => {
    if (placed.current) return;
    // Before the first `homeSpot()`: that call is already clamped, and the
    // clamp is only correct once the chrome has been measured.
    refreshSafeArea();
    const home = homeSpot();
    const from = spawn.current;
    spawn.current = null;
    const start = from ?? { lead: home, follow: followHome(home) };
    lead.current.pos.x = start.lead.x;
    lead.current.pos.y = start.lead.y;
    follow.current.pos.x = start.follow.x;
    follow.current.pos.y = start.follow.y;
    placed.current = true;
    paint(leadNode.current, lead.current.pos);
    paint(followNode.current, follow.current.pos);
  }, []);

  /*
   * Placement rides on the ref callbacks rather than on an effect, because a
   * ref callback runs inside the commit that mounts the element and an effect
   * runs after the browser may already have painted it. With an effect, every
   * cat gets one frame at the top-left origin before its first transform lands
   * — and the media queries resolve *after* hydration, so that frame happens on
   * every desktop load, not just in theory.
   *
   * The two lead variants below are separate callbacks on purpose: swapping the
   * ref's identity is what makes React detach and re-attach when a visitor goes
   * from pinned to roaming, which is the moment the transform has to appear.
   */
  const attachLead = useCallback(
    (node: HTMLElement | null) => {
      leadNode.current = node;
      if (!node) return;
      place();
      paint(node, lead.current.pos);
    },
    [place],
  );

  const attachPinnedLead = useCallback((node: HTMLElement | null) => {
    leadNode.current = node;
    // Pinned by CSS to the corner in this mode. Writing a transform here as
    // well would offset the pair *from* that corner by a whole viewport and
    // push them off-screen — which is exactly what it did on every touch device
    // and for every visitor who asked for reduced motion.
    if (node) node.style.transform = "";
    placed.current = false;
  }, []);

  const attachFollow = useCallback(
    (node: HTMLElement | null) => {
      followNode.current = node;
      if (!node) return;
      place();
      paint(node, follow.current.pos);
    },
    [place],
  );

  const attachPolice = useCallback((node: HTMLElement | null) => {
    policeNode.current = node;
    if (node && escortRef.current) paint(node, escortRef.current.police.pos);
  }, []);

  /** Same reasoning as the cats' own ref callbacks: a toy positioned in an
   *  effect gets one frame at the top-left origin first, and a yarn ball
   *  appearing in the corner of the page before it jumps to the cat is worse
   *  than no yarn ball. It also enters at zero opacity, so the fade the scene
   *  scripts starts from the right place. */
  const attachToy = useCallback((node: HTMLDivElement | null) => {
    toyNode.current = node;
    const play = playRef.current;
    if (!node || !play) return;
    paint(node, play.pos);
    node.style.opacity = play.opacity.toFixed(3);
  }, []);

  /* ------------------------------------------------------------- pointer -- */

  useEffect(() => {
    if (!roams || mode === "off") return;

    /** Somebody is here. Resetting the idle clock is all this has to do: the
     *  loop reads it, finds the cats are no longer idle, and walks them out of
     *  the bed on its own. */
    const rouse = () => {
      travelRef.current = 0;
      lastMoveRef.current = performance.now();
      settleSpots.current = null;
      wake();
    };

    const onMove = (event: PointerEvent) => {
      const at = { x: event.clientX, y: event.clientY };
      const from = pointerRef.current;
      pointerRef.current = at;
      // Asleep in the bed, they are committed. A mouse nudged by a passing
      // elbow should not drag two sleeping animals back across the page, so a
      // single event is not enough: either the pointer comes over to where they
      // are, or it travels far enough that somebody is plainly back at the
      // page. Everything else leaves them where they are — and leaves the loop
      // stopped, which is the point of them being asleep at all.
      if (bedRef.current === "asleep") {
        travelRef.current += from ? Math.hypot(at.x - from.x, at.y - from.y) : BED_WAKE_TRAVEL;
        if (travelRef.current < BED_WAKE_TRAVEL && !nearBed(at)) return;
      }
      rouse();
    };

    // A click anywhere — including on the bed itself, which is the one the
    // visitor is most likely to try — and any keystroke, which is the keyboard
    // equivalent for a visitor who never moves a pointer at all. Both stamp the
    // presence clock whether or not the cats are in the bed: somebody typing is
    // somebody here, and the cats should not walk off mid-sentence. Only the
    // pair already asleep get the full `rouse`, which is the one that also puts
    // the pointer clock back and sends them chasing again.
    const onPoke = () => {
      lastSignRef.current = performance.now();
      if (bedRef.current) rouse();
      else wake();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onPoke, { passive: true });
    window.addEventListener("keydown", onPoke, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onPoke);
      window.removeEventListener("keydown", onPoke);
    };
  }, [roams, mode, wake]);

  /* ----------------------------------------------------------- nap spots -- */

  /**
   * The page-wide nap contract: any element carrying `data-cat-nap` calls the
   * cats over when the pointer rests on it or it takes keyboard focus, and they
   * sleep beneath it until it is left. The attribute's *value* is ignored — an
   * element either declares itself a nap spot or it does not.
   *
   * Bound by delegation on the document rather than by querying for the
   * elements, so it costs nothing when nothing declares the attribute (the
   * common case) and needs no coordination with whichever section adds one.
   */
  useEffect(() => {
    if (!roams || mode !== "roam") return;

    let dwell = 0;
    let pending: Element | null = null;

    /** Focus outranks the pointer: a keyboard visitor's position on the page is
     *  deliberate, a pointer resting somewhere may just be where it was left. */
    const settle = () => {
      const el = napFocus.current ?? napPointer.current;
      const current = napRef.current;
      if (el === (current?.el ?? null)) return;
      napRef.current = el
        ? { el, rect: el.getBoundingClientRect(), readAt: performance.now() }
        : null;
      wake();
    };

    const onOver = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target.closest(NAP_ATTR) : null;
      if (target && (target === pending || target === napPointer.current)) return;
      window.clearTimeout(dwell);
      pending = target;
      if (!target) {
        napPointer.current = null;
        settle();
        return;
      }
      // Dwell, not entry: brushing past a nap spot on the way somewhere else
      // should not drag two cats across the page.
      dwell = window.setTimeout(() => {
        napPointer.current = target;
        settle();
      }, NAP_DWELL);
    };

    const onLeave = () => {
      window.clearTimeout(dwell);
      pending = null;
      napPointer.current = null;
      settle();
    };

    const onFocusIn = (event: FocusEvent) => {
      const el = event.target instanceof Element ? event.target : null;
      const target = el?.closest(NAP_ATTR) ?? null;
      // Keyboard focus only: a click already focuses whatever it hit, and the
      // pointer path above owns that case with its own dwell.
      napFocus.current = target && el?.matches(":focus-visible") ? target : null;
      settle();
    };

    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget instanceof Element ? event.relatedTarget : null;
      napFocus.current = next?.closest(NAP_ATTR) ?? null;
      settle();
    };

    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      window.clearTimeout(dwell);
      pending = null;
      napPointer.current = null;
      napFocus.current = null;
      napRef.current = null;
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [roams, mode, wake]);

  /* ------------------------------------------------------------ the loop -- */

  const loopActive = roams && (mode === "roam" || escort !== null);

  useEffect(() => {
    if (!loopActive) return;

    const grey = lead.current;
    const tabby = follow.current;
    let running = false;
    let frameId = 0;

    const stop = () => {
      running = false;
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
    };

    const start = () => {
      if (running || document.hidden) return;
      running = true;
      frameId = requestAnimationFrame(step);
    };

    function restSpots(leadAnchor: Point, followAnchor: Point): Spots {
      const home = homeSpot();
      const spot = findClearSpot(leadAnchor, home);
      return { lead: spot, follow: findClearSpot(followAnchor, followHome(home), spot) };
    }

    /** Where the pair are currently parked, resolved once per settle rather
     *  than per frame — probing the page costs hit tests. Two branches want
     *  the same answer now: holding station with the pointer stopped, and
     *  holding it while a toy is out. */
    function settled(): Spots {
      settleSpots.current ??= restSpots(grey.pos, {
        x: grey.pos.x - CAT_W - FOLLOW_GAP,
        y: grey.pos.y,
      });
      return settleSpots.current;
    }

    function tickBlink(cat: Mover, now: number): boolean {
      if (cat.blinkAt === 0) cat.blinkAt = now + 1800 + Math.random() * 4200;
      else if (now > cat.blinkAt) {
        cat.blinkUntil = now + 130;
        cat.blinkAt = now + 2800 + Math.random() * 4200;
      }
      return now < cat.blinkUntil || cat.pose === "sleep";
    }

    function step() {
      frameId = 0;
      if (!running) return;

      const now = performance.now();
      /** How long the pointer has held still — what "settle" is measured on. */
      const idleFor = now - lastMoveRef.current;
      /** How long *nobody* has done anything: no pointer, no scroll, no key,
       *  no resize. What "go to bed" is measured on. Never shorter than
       *  `idleFor`, so every existing reset of the pointer clock still counts
       *  as a sign of life without having to say so twice. */
      const aloneFor = now - Math.max(lastMoveRef.current, lastSignRef.current);
      const pointer = pointerRef.current;
      const run = escortRef.current;
      const home = homeSpot();

      // Before anything else decides where they are going: make sure they are
      // still somewhere they can be seen. Every *target* below is clamped, but
      // a target is only consulted when a cat is going somewhere, and a cat
      // trailing a pointer already inside its personal space is told to stay
      // exactly where it is — so a viewport that shrinks out from under it (a
      // rotation, a window drag, devtools opening) strands it off-screen with
      // nothing to bring it back. `overflow-x: clip` on the document means
      // there is not even a scrollbar to hint at where it went.
      keepInView(grey.pos);
      keepInView(tabby.pos);

      /* -- reads first, writes afterwards: at most one forced reflow a frame. */
      let nap = napRef.current;
      if (nap) {
        if (now - nap.readAt > 120) {
          nap.rect = nap.el.getBoundingClientRect();
          nap.readAt = now;
        }
        // Nothing left to sleep under: either scrolled off the bottom, or
        // scrolled up behind the chrome, which for a cat is the same thing —
        // the underside of that element is somewhere it cannot be seen.
        if (nap.rect.bottom < safeTop() || nap.rect.top > viewport().height) nap = null;
      }

      const forced = run ? "escort" : nap ? "nap" : openRef.current ? "corner" : null;
      const parked = !forced && (!pointer || idleFor > SETTLE_AFTER);
      /** Non-null only while the lead is actually chasing something. */
      const chase = !forced && !parked ? pointer : null;

      /* -------------------------------------------------------------- play -- */

      /**
       * A toy, on the rare frame every condition lines up.
       *
       * The list of things that end a scene is longer than the list that starts
       * one, and that asymmetry is the design: the cats' first duty is to the
       * visitor, so anything with a claim on them — the escort, a nap spot, the
       * toolkit, or simply the pointer moving again — drops the toy on the frame
       * it appears rather than finishing the beat.
       */
      if (playRef.current && (forced !== null || !parked)) endPlay(now);
      if (playAt.current === 0) playAt.current = scheduleNextPlay(now);

      const scene = playRef.current ? advancePlay(playRef.current, now) : null;
      if (scene?.done) endPlay(now);
      /** Non-null only while a scene is actually mid-flight. */
      const beat: PlayBeat | null = scene && !scene.done ? scene : null;

      const dozing = forced === "escort" || forced === "nap" || (aloneFor > SLEEP_AFTER && !beat);
      /**
       * Idle sleep — the ephemeral one. Gated on a pointer having existed at
       * some point, because `lastMoveRef` starts at zero: without that check a
       * fresh page load is already "idle" and the first thing a visitor would
       * see is two cats in a bed they never sent them to.
       *
       * A running scene holds the bed off. Play can only *start* inside the
       * window between settling and dozing, but the last beat of a yarn ball
       * can outlive it, and two cats walking away from a toy mid-roll to go to
       * bed is the one way this could read as broken.
       */
      const wantsBed = !forced && pointer !== null && aloneFor > SLEEP_AFTER && !beat;

      // Starting one is the last thing considered, and the narrowest: settled,
      // standing still, nobody around, not on the way to bed, and the clock is
      // up. `openPlay` may still decline — a page with no whitespace near the
      // cats has nowhere safe for this — in which case it backs off rather than
      // re-probing the layout on the next frame.
      if (
        !beat &&
        !forced &&
        parked &&
        !wantsBed &&
        pointer !== null &&
        grey.pose !== "walk" &&
        tabby.pose !== "walk" &&
        now > playAt.current
      ) {
        const opened = openPlay(pickToy(), grey.pos, grey.facing, now);
        if (opened) {
          playRef.current = opened;
          setToy(opened.kind);
        } else {
          playAt.current = now + PLAY_RETRY;
        }
      }

      /* ------------------------------------------------------------ lead -- */

      let leadWant: Point;
      let followWant: Point;

      if (run) {
        leadWant = run.slots.lead;
        followWant = run.slots.follow;
      } else if (nap) {
        const slots = napSlots(nap.rect);
        leadWant = slots.lead;
        followWant = slots.follow;
      } else if (forced === "corner") {
        // Come home while the toolkit is open. The panel is anchored to this
        // corner, so a cat still chasing the cursor would end up sitting on top
        // of its own menu — which axe correctly flags as a touch target
        // obscuring another one. No content probe here on purpose: this spot is
        // the one the panel is designed around.
        leadWant = home;
        followWant = followHome(home);
      } else if (chase) {
        // Approach to the edge of the personal-space radius, on the side the cat
        // is already on, so it trails the cursor instead of crossing it.
        const from = centreOf(grey.pos);
        const dx = chase.x - from.x;
        const dy = chase.y - from.y;
        const dist = Math.hypot(dx, dy) || 1;
        leadWant =
          dist <= LEAD_SPACE
            ? grey.pos
            : clampToViewport({
                x: grey.pos.x + (dx / dist) * (dist - LEAD_SPACE),
                y: grey.pos.y + (dy / dist) * (dist - LEAD_SPACE),
              });
        followWant = grey.pos;
      } else if (wantsBed) {
        // Bored, and going somewhere about it. No content probe: the bed *is*
        // the destination, it is the companion's own furniture, and it is drawn
        // in the corner the toolkit and the resting box already own.
        const slots = bedSlots();
        leadWant = slots.lead;
        followWant = slots.follow;
      } else if (beat) {
        // Playing. The grey one holds the spot he settled on — he bats the
        // thing and then watches it go, which is what a cat that has already
        // decided where it is sitting does. Only the tabby travels, and only
        // as far as the toy, which was probed before the scene opened.
        const rest = settled();
        leadWant = rest.lead;
        followWant = beat.chase ?? rest.follow;
      } else if (!pointer || aloneFor > SLEEP_AFTER) {
        if (!homeSpots.current) homeSpots.current = restSpots(home, followHome(home));
        leadWant = homeSpots.current.lead;
        followWant = homeSpots.current.follow;
      } else {
        // Pointer has stopped: hold station rather than creeping closer — but
        // hold it somewhere they are allowed to sleep.
        const rest = settled();
        leadWant = rest.lead;
        followWant = rest.follow;
      }

      const leadDx = leadWant.x - grey.pos.x;
      if (Math.abs(leadDx) > 2) grey.facing = leadDx > 0 ? 1 : -1;
      const leadStep = advance(grey.pos, leadWant, run ? ESCORT_SPEED : LEAD_SPEED);
      if (leadStep > 0.3) {
        calmIdle(grey, now);
        grey.pose = "walk";
      } else if (beat) {
        // The scene outranks whatever he was doing with himself: a cat that
        // starts washing halfway through swatting a ball of yarn is two cats.
        calmIdle(grey, now);
        grey.pose = beat.leadPose ?? "sit";
        grey.facing = beat.focus.x > grey.pos.x + CAT_W / 2 ? 1 : -1;
      } else if (dozing) {
        calmIdle(grey, now);
        grey.pose = "sleep";
      } else {
        // He never bats: the tail he would be batting at is his own.
        grey.pose = tickIdle(grey, now, false);
      }
      if (leadStep > 0.3) grey.phase = (grey.phase + leadStep * 0.013) % 1;
      else if (grey.pose !== "sleep") grey.phase = (grey.phase + 0.006) % 1;

      /* -------------------------------------------------------- follower -- */

      /** How fast she wants to be going this frame, before the limiter. */
      let followWish: number;

      if (run) {
        followWish = ESCORT_SPEED;
      } else if (chase) {
        // Her own clock. She trails him, watches the cursor, or wanders off —
        // and only while the pair are actually on the move, because a settled
        // cat that keeps re-parking is a cat that never stops moving.
        if (now > tabby.moodUntil) {
          const roll = Math.random();
          if (roll < 0.58) {
            tabby.mood = "trail";
            tabby.moodUntil = now + 3200 + Math.random() * 3600;
          } else if (roll < 0.84) {
            tabby.mood = "watch";
            tabby.moodUntil = now + 1300 + Math.random() * 1900;
          } else {
            tabby.mood = "drift";
            tabby.moodUntil = now + 1700 + Math.random() * 2200;
            tabby.drift = { x: (Math.random() - 0.5) * 150, y: (Math.random() - 0.5) * 110 };
          }
        }

        const behind = clampToViewport({
          x: grey.pos.x - grey.facing * (CAT_W + FOLLOW_GAP),
          y: grey.pos.y + 3,
        });
        followWant =
          tabby.mood === "drift"
            ? clampToViewport({ x: behind.x + tabby.drift.x, y: behind.y + tabby.drift.y })
            : behind;

        // The slack is what makes her move in bursts instead of gliding along on
        // a fixed leash, and it survives the rewrite: what changed is that
        // engaging no longer *starts* her at 3.4px a frame. She engages, the
        // curve gives her a target proportional to the slack she has let build
        // up, and the limiter walks her up to it.
        const gap = distance(tabby.pos, followWant);
        if (!tabby.engaged && gap > FOLLOW_SLACK) tabby.engaged = true;
        else if (tabby.engaged && gap < 5) tabby.engaged = false;
        followWish =
          tabby.mood === "watch" || !tabby.engaged ? 0 : followTarget(gap, FOLLOW_GAP);
        if (tabby.mood === "watch") followWant = tabby.pos;
      } else {
        tabby.engaged = true;
        tabby.moodUntil = 0;
        // Walking to a place rather than after an animal, so there is no gap to
        // subtract: she is allowed to arrive.
        followWish = followTarget(distance(tabby.pos, followWant), 0);
      }

      tabby.speed = ramp(tabby.speed, followWish);
      const followDx = followWant.x - tabby.pos.x;
      if (tabby.speed > 0.25 && Math.abs(followDx) > 2) tabby.facing = followDx > 0 ? 1 : -1;
      const followStep = advance(tabby.pos, followWant, tabby.speed);
      if (followStep > 0.3) {
        calmIdle(tabby, now);
        tabby.pose = "walk";
      } else if (beat) {
        calmIdle(tabby, now);
        tabby.pose = beat.followPose ?? "sit";
        tabby.facing = beat.focus.x > tabby.pos.x + CAT_W / 2 ? 1 : -1;
      } else if (dozing) {
        calmIdle(tabby, now);
        tabby.pose = "sleep";
      } else {
        // She bats at his tail when she has ended up parked on the side he
        // keeps it — behind him, which is exactly where following him leaves
        // her. Close, settled, and both of them sitting: any other combination
        // and there is nothing there to swipe at.
        const behindHim =
          grey.pose !== "walk" &&
          grey.pose !== "sleep" &&
          Math.hypot(tabby.pos.x - grey.pos.x, tabby.pos.y - grey.pos.y) < 72 &&
          (tabby.pos.x - grey.pos.x) * grey.facing < 0;
        tabby.pose = tickIdle(tabby, now, behindHim);
      }
      // A distracted cat looks at what distracted her.
      if (chase && tabby.mood === "watch" && followStep === 0) {
        tabby.facing = chase.x > tabby.pos.x + CAT_W / 2 ? 1 : -1;
      }
      if (followStep > 0.3) tabby.phase = (tabby.phase + followStep * 0.0115) % 1;
      else if (tabby.pose !== "sleep") tabby.phase = (tabby.phase + 0.0045) % 1;

      /* ---------------------------------------------------------- police -- */

      let policeVisual: Visual | null = null;
      if (run) {
        const cop = run.police;
        const want =
          run.phase === "herding"
            ? {
                x: Math.min(grey.pos.x, tabby.pos.x) - CAT_W - 14,
                y: (grey.pos.y + tabby.pos.y) / 2,
              }
            : { x: -CAT_W - 60, y: cop.pos.y };
        const copDx = want.x - cop.pos.x;
        if (Math.abs(copDx) > 2) cop.facing = copDx > 0 ? 1 : -1;
        const copStep = advance(cop.pos, want, POLICE_SPEED);
        cop.pose = copStep > 0.3 ? "walk" : "sit";
        if (copStep > 0.3) cop.phase = (cop.phase + copStep * 0.014) % 1;
        policeVisual = {
          pose: cop.pose,
          phase: cop.phase,
          facing: cop.facing,
          blinking: tickBlink(cop, now),
          flick: 0,
        };

        const inBed =
          distance(grey.pos, run.slots.lead) < 3 && distance(tabby.pos, run.slots.follow) < 3;
        if (run.phase === "herding" && (inBed || now - run.startedAt > HERD_MAX)) {
          run.phase = "leaving";
          setEscort("leaving");
        } else if (
          run.phase === "leaving" &&
          (cop.pos.x < -CAT_W - 8 || now - run.startedAt > ESCORT_MAX)
        ) {
          escortRef.current = null;
          setEscort(null);
        }
      }

      /* ----------------------------------------------------------- paint -- */

      paint(leadNode.current, grey.pos);
      paint(followNode.current, tabby.pos);
      if (run) paint(policeNode.current, run.police.pos);

      // The toy, on the same terms as the cats: position, fade and the one
      // moving part all go straight to the node. Nothing about a scene is worth
      // a re-render except the fact that it exists.
      const live = beat ? playRef.current : null;
      if (live) {
        paint(toyNode.current, live.pos);
        if (toyNode.current) toyNode.current.style.opacity = live.opacity.toFixed(3);
        if (toyArt.current) {
          toyArt.current.style.transform =
            live.kind === "moth" ? `scaleX(${live.flap.toFixed(3)})` : `scaleX(${live.facing})`;
        }
        if (toySpin.current) toySpin.current.style.transform = `rotate(${live.spin.toFixed(1)}deg)`;
      }

      if (now - lastTone.current > TONE_INTERVAL) {
        lastTone.current = now;
        syncTone(leadNode.current, centreOf(grey.pos));
        syncTone(followNode.current, centreOf(tabby.pos));
        if (run) syncTone(policeNode.current, centreOf(run.police.pos));
        // Line work on the same fixed layer as the cats, so it needs the same
        // repointing: a toy that stayed root-coloured would vanish over a
        // contrast section exactly as the cats used to.
        if (beat) syncTone(toyNode.current, beat.focus);
        // The mat is opaque furniture on the same fixed layer, so it has the
        // cats' problem: a `bg-surface` box coloured from the root scope sitting
        // over a `contrast` section. A scroll resets `lastTone` and wakes the
        // loop for one frame, which is all this needs even once they are asleep.
        if (matRef.current) {
          const box = bedBox();
          syncTone(matRef.current, { x: box.left + BED_W / 2, y: box.top + BED_H / 2 });
        }
      }

      const asleep = grey.pose === "sleep" && tabby.pose === "sleep";
      const busy = leadStep > 0.05 || followStep > 0.05 || run !== null;
      // Idle sleep in the bed *is* asleep: once they are curled up in it the
      // loop stops exactly as it always did when they fell asleep on the spot.
      // The pointer handler restarts it.
      const keepGoing = busy || !asleep;

      // The bed shows the moment they set off for it, so a visitor watching
      // sees where they are going rather than two cats wandering away.
      const nextBed: Bed = wantsBed ? (asleep && !busy ? "asleep" : "walking") : null;
      if (nextBed !== bedRef.current) {
        bedRef.current = nextBed;
        if (!nextBed) travelRef.current = 0;
        setBed(nextBed);
      }

      const next: Frame = {
        lead: {
          pose: grey.pose,
          phase: grey.phase,
          facing: grey.facing,
          blinking: tickBlink(grey, now),
          flick: tickFlick(grey, now, grey.pose !== "sleep"),
        },
        follow: {
          pose: tabby.pose,
          phase: tabby.phase,
          facing: tabby.facing,
          blinking: tickBlink(tabby, now),
          flick: tickFlick(tabby, now, tabby.pose !== "sleep"),
        },
        police: policeVisual,
      };
      const changed =
        !sameVisual(next.lead, committed.current.lead) ||
        !sameVisual(next.follow, committed.current.follow) ||
        (next.police === null) !== (committed.current.police === null) ||
        (next.police !== null &&
          committed.current.police !== null &&
          !sameVisual(next.police, committed.current.police));
      if (changed && (!keepGoing || now - lastCommit.current >= RENDER_INTERVAL)) {
        committed.current = next;
        lastCommit.current = now;
        setFrame(next);
      }

      if (keepGoing) frameId = requestAnimationFrame(step);
      else running = false;
    }

    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        lastMoveRef.current = performance.now();
        start();
      }
    };

    /**
     * The page moved under them: scrolled, or resized.
     *
     * Three separate jobs, and they do *not* share an urgency, which is why the
     * throttle no longer wraps the whole handler:
     *
     *  1. Somebody is here. Scrolling and resizing are the two things a visitor
     *     does that never reach the pointer handler — a wheel turned under a
     *     stationary mouse fires no pointer event at all — so this is the only
     *     place the presence clock can be stamped for a reader. Unthrottled,
     *     because it is one assignment, and because a stamp that arrives 250ms
     *     late is a stamp that can miss.
     *  2. Get a frame running. Two sleeping cats have no frames, and every
     *     clamp, every target and every decision below lives inside one. This
     *     is what walks them back out of the bed.
     *  3. Re-probe. The hit tests behind the resting spots and the tone sample
     *     cost real work, and a scroll fires far more often than a cat needs to
     *     reconsider where it is sitting — so that half stays throttled hard.
     *
     * A resize is the exception that has to jump the throttle: it changes the
     * box `keepInView` clamps against, and until the new box is measured a
     * frame will happily re-clamp a cat to the *old* viewport. Waiting 250ms
     * for that is a quarter-second of two cats outside the window — which, with
     * `overflow-x: clip` on the document, is a quarter-second of nothing there
     * at all.
     */
    let recheck = 0;
    const onPageMoved = (resized: boolean) => {
      lastSignRef.current = performance.now();
      if (resized) {
        refreshSafeArea();
        settleSpots.current = null;
        homeSpots.current = null;
        // Clamped and painted here rather than left to `wake()`: a resize event
        // lands after layout and before the next paint, so correcting the
        // transforms inside the handler means the first frame the visitor sees
        // at the new size already has both cats inside it. Handing it to the
        // loop instead costs one painted frame of two cats outside the window
        // — and if they were asleep, the loop was not running at all, so it
        // cost a quarter of a second of them.
        keepInView(grey.pos);
        keepInView(tabby.pos);
        paint(leadNode.current, grey.pos);
        paint(followNode.current, tabby.pos);
      }
      wake();
      if (recheck) return;
      recheck = window.setTimeout(() => {
        recheck = 0;
        // The chrome may have grown, shrunk or unpinned, so the band the cats
        // cannot be seen in is re-measured here rather than per frame.
        refreshSafeArea();
        settleSpots.current = null;
        homeSpots.current = null;
        lastTone.current = 0;
        // A scene's clearance was probed against the layout as it stood when it
        // opened, and this is the event that says that layout has moved. The
        // cats re-probe and shuffle; a toy cannot, so it goes.
        endPlay();
        wake();
      }, 250);
    };

    const onScroll = () => onPageMoved(false);
    const onResize = () => onPageMoved(true);

    restart.current = start;
    refreshSafeArea();
    start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      stop();
      // Idle sleep does not outlive the loop that owns it. Whatever put the
      // loop away — a mode change here, or the same change arriving from
      // another tab — is a fresh start, and cats returning to a roaming page
      // should not arrive already fourteen seconds bored.
      bedRef.current = null;
      travelRef.current = 0;
      lastMoveRef.current = performance.now();
      setBed(null);
      // Nor does a toy. It is only ever advanced from inside this loop, so one
      // left behind would be a drawing stopped mid-roll on the page.
      endPlay();
      window.clearTimeout(recheck);
      restart.current = null;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [loopActive, wake, endPlay]);

  /* -------------------------------------------------------------- escort -- */

  useEffect(() => {
    if (mode !== "resting" || !pendingEscort.current) {
      pendingEscort.current = false;
      return;
    }
    pendingEscort.current = false;
    const box = boxRef.current;
    if (!box) return;
    const slots = slotsForBox(box.getBoundingClientRect());
    const cop = mover(0);
    // Enters from behind them — the cats are heading for the bottom-right
    // corner, so "behind" is off the left edge, which is also where it leaves.
    // Nothing ever exits to the right: a fixed element past the right edge is
    // the one direction that can add horizontal overflow to the document.
    cop.pos.x = -CAT_W - 20;
    cop.pos.y = clamp(
      lead.current.pos.y,
      8,
      Math.max(8, viewport().height - CAT_H - 8),
    );
    escortRef.current = { phase: "herding", startedAt: performance.now(), slots, police: cop };
    setEscort("herding");
    wake();
  }, [mode, wake]);

  /* --------------------------------------------------------- tone: parked */

  /**
   * The roaming loop repoints its own cats as they fly over sections. Anything
   * parked in the corner — the resting box, and the pinned toolkit button on
   * touch or reduced motion — has no loop, so it samples on scroll instead.
   */
  useEffect(() => {
    const nodes: HTMLElement[] = [];
    if (mode === "resting" && boxRef.current) nodes.push(boxRef.current);
    if (mode === "roam" && !roams && leadNode.current) nodes.push(leadNode.current);
    if (nodes.length === 0) return;

    const sync = () => {
      for (const node of nodes) {
        const rect = node.getBoundingClientRect();
        syncTone(node, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }
    };

    let pending = 0;
    const onPageMoved = () => {
      if (pending) return;
      pending = window.setTimeout(() => {
        pending = 0;
        sync();
      }, 200);
    };

    sync();
    window.addEventListener("scroll", onPageMoved, { passive: true });
    window.addEventListener("resize", onPageMoved);
    return () => {
      window.clearTimeout(pending);
      window.removeEventListener("scroll", onPageMoved);
      window.removeEventListener("resize", onPageMoved);
    };
  }, [mode, roams]);

  /* --------------------------------------------------------------- panel -- */

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        leadNode.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !leadNode.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  /* ---------------------------------------------------- focus follow-through */

  // Each of the three state changes below removes the control that triggered
  // it, so each one has to hand focus to whatever replaced it rather than
  // dropping a keyboard visitor back at the top of the document.
  useEffect(() => {
    const wish = focusWish.current;
    if (!wish) return;
    focusWish.current = null;
    if (wish === "cat") leadNode.current?.focus();
    else wakeButtonRef.current?.focus();
  }, [mode]);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard can be blocked outright; the address is visible in the panel
      // and mailto still works, so there is nothing to recover from here.
    }
  }

  /** Every deliberate change of mode ends the idle sleep with it: it is a state
   *  about being left alone, and none of these are being left alone. Leaving it
   *  set would also gate the pointer handler, so the cats would come back from
   *  the resting box and walk straight into the bed again. */
  function clearBed() {
    bedRef.current = null;
    travelRef.current = 0;
    lastMoveRef.current = performance.now();
    setBed(null);
  }

  function sendToBed() {
    setOpen(false);
    clearBed();
    endPlay();
    focusWish.current = "box";
    // The escort is theatre. Without a roaming layer there is nothing to
    // escort, so touch and reduced-motion visitors land straight in the box.
    pendingEscort.current = roams;
    setCompanionMode("resting");
  }

  function wakeCats() {
    // Captured before the box unmounts, so they walk out of it rather than
    // materialising in the corner.
    const rect = boxRef.current?.getBoundingClientRect();
    spawn.current = rect ? slotsForBox(rect) : null;
    placed.current = false;
    escortRef.current = null;
    setEscort(null);
    clearBed();
    focusWish.current = "cat";
    setCompanionMode("roam");
  }

  function turnOff() {
    setOpen(false);
    escortRef.current = null;
    setEscort(null);
    clearBed();
    endPlay();
    // Nothing companion-related is left to hold focus, so hand it to the
    // document's own landing point rather than dropping it on <body>.
    document.getElementById("main")?.focus();
    setCompanionMode("off");
  }

  if (mode === "off") return null;

  const showRoamers = mode === "roam" || escort === "herding";
  const police = frame.police ?? RESTING_VISUAL;

  const leadDrawing = roams ? (
    <span
      className="block"
      style={{ transform: `scaleX(${frame.lead.facing})`, width: CAT_W, height: CAT_H }}
    >
      <CompanionCat variant="grey" {...frame.lead} />
    </span>
  ) : (
    // Parked in the corner with nothing to chase, both cats sit in the button
    // itself — there is no second element to position when nothing moves.
    <span className="flex items-end">
      <CompanionCat variant="tabby" {...frame.follow} />
      <CompanionCat variant="grey" {...frame.lead} />
    </span>
  );

  return (
    // `data-companion` is how the placement probes recognise the cats' own
    // furniture and look straight through it — see companion-space.
    <div data-companion="" className="no-print pointer-events-none fixed inset-0 z-40">
      {/* Drawn before the cats on purpose: they sleep *on* the mat, so it has
          to be underneath them in paint order. Roaming only — the resting box
          below occupies the same corner and the two never coexist. */}
      {roams && mode === "roam" && bed ? (
        <IdleBed asleep={bed === "asleep"} containerRef={matRef} />
      ) : null}

      {/* The toy, under the cats in paint order so a paw lands on top of it.
          Decoration in the strictest sense: no accessible name, no pointer
          events (it inherits `none` from the root and says so anyway), and no
          state that outlives the scene — the whole element is gone the moment
          the play ends. Roaming only; there is no scene to play without a
          loop to run it. */}
      {roams && mode === "roam" && toy ? (
        <div
          ref={attachToy}
          data-cat-toy=""
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0"
          style={{ width: TOY_W, height: TOY_H }}
        >
          <CompanionToy kind={toy} artRef={toyArt} spinRef={toySpin} />
        </div>
      ) : null}

      {mode === "roam" ? (
        <button
          ref={roams ? attachLead : attachPinnedLead}
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={PANEL_ID}
          className={cn(
            "pointer-events-auto absolute grid place-items-center",
            "text-fg-muted transition-colors duration-200 hover:text-fg",
            // Two placement modes, never both. When roaming, the rAF loop owns
            // `transform` from the top-left origin — and there is deliberately
            // no CSS transition on it, because a transition layered over a
            // per-frame write fights the loop and smears the motion. When not
            // roaming, the pair is simply pinned to the corner.
            roams ? "left-0 top-0" : "bottom-6 right-6",
          )}
          // The margin around the drawing is the hit target; `LEAD_PAD_*` is the
          // same margin, and the bed's slots subtract it so the animal lands
          // where the button's transform says the button does.
          style={{
            width: (roams ? CAT_W : CAT_W * 2) + LEAD_PAD_X * 2,
            height: CAT_H + LEAD_PAD_Y * 2,
          }}
        >
          {leadDrawing}
          <span className="sr-only">{open ? "Close quick actions" : "Open quick actions"}</span>
        </button>
      ) : showRoamers && roams ? (
        // Mid-escort the grey one is no longer a control: the toolkit has been
        // put away, and a button walking itself into a box is a button nobody
        // can hit.
        <div
          ref={attachLead}
          aria-hidden="true"
          className="absolute left-0 top-0"
          style={{ width: CAT_W, height: CAT_H }}
        >
          <span className="block" style={{ transform: `scaleX(${frame.lead.facing})` }}>
            <CompanionCat variant="grey" {...frame.lead} />
          </span>
        </div>
      ) : null}

      {roams && showRoamers ? (
        <div
          ref={attachFollow}
          aria-hidden="true"
          className="absolute left-0 top-0"
          style={{ width: CAT_W, height: CAT_H }}
        >
          <span className="block" style={{ transform: `scaleX(${frame.follow.facing})` }}>
            <CompanionCat variant="tabby" {...frame.follow} />
          </span>
        </div>
      ) : null}

      {roams && escort ? (
        // Pure flourish, and drawn like one: no pointer events (it inherits
        // `none` from the root), no accessible name, no state of its own that
        // outlives the walk.
        <div
          ref={attachPolice}
          aria-hidden="true"
          className="absolute left-0 top-0"
          style={{ width: CAT_W, height: CAT_H }}
        >
          <span className="block" style={{ transform: `scaleX(${police.facing})` }}>
            <CompanionCat variant="police" {...police} />
          </span>
        </div>
      ) : null}

      {open ? (
        <ToolkitPanel
          copied={copied}
          onCopyEmail={copyEmail}
          onNavigate={() => setOpen(false)}
          onSendToBed={sendToBed}
          onTurnOff={turnOff}
          panelRef={panelRef}
        />
      ) : null}

      {/* The bed carries one control — waking them. Turning the cats off used
          to be a second button here; it is now the toolkit's alone, so the bed
          is only ever a bed. */}
      {mode === "resting" ? (
        <RestingBox
          occupied={escort !== "herding"}
          onWake={wakeCats}
          containerRef={boxRef}
          wakeRef={wakeButtonRef}
        />
      ) : null}
    </div>
  );
}

export default Companion;
