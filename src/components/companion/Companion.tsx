"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { navItems } from "@/content/portfolio";
import { useActiveSection } from "@/hooks/useActiveSection";
import { cn } from "@/lib/cn";
import type { CompanionFacts } from "@/lib/companion-facts";
import CompanionCat, { CAT_H, CAT_W, type CatPose } from "./CompanionCat";
import CompanionToy, { TOY_H, TOY_W, type ToyKind } from "./CompanionToy";
import RestingBox, {
  BOX_SLOT,
  CLUSTER_H,
  CLUSTER_INSET,
  CLUSTER_W,
  IdleFurniture,
  KICK_SLOT,
  PAPER_SLOT,
} from "./RestingBox";
import ToolkitPanel, { PANEL_ID, type PlayRequest, type TourRequest } from "./ToolkitPanel";
import TourHud from "./TourHud";
import {
  advancePlay,
  hideCut,
  openPlay,
  sceneOrder,
  scheduleNextPlay,
  PLAY_RETRY,
  type Play,
  type PlayBeat,
  type SceneKind,
} from "./companion-play";
import {
  advanceBeat,
  currentBeat,
  beatDurationMs,
  DUET_ODDS,
  hasEncore,
  nextDuetAt,
  sceneFor,
  startScene,
  storyBeatScene,
  type DialogueBeat,
  type DialogueRun,
  type DialogueScene,
  type Speaker,
  type StoryBeatKind,
} from "./companion-dialogue";
import { detectRush, planMood, planWander, RUSH_HOLD_MS, type MoodKind } from "./companion-moods";
import {
  advance,
  followTarget,
  frameStep,
  initRide,
  ramp,
  rideStep,
  trailBehind,
  type RideTracker,
} from "./companion-motion";
import {
  TOUR_STOPS,
  isLastStop,
  startTour,
  stopsFor,
  type TourRoute,
  type TourRun,
} from "./companion-tour";
import {
  migrateCompanionMode,
  roamingChoice,
  setCompanionMode,
  useCompanionMode,
} from "./companion-state";
import {
  clamp,
  clampToViewport,
  findClearSpot,
  isClearSpot,
  keepClearOfControl,
  keepInView,
  randomFacing,
  refreshSafeArea,
  safeTop,
  searchClearOfToggle,
  setControlRects,
  setReservedRects,
  standingSpots,
  syncTone,
  viewport,
  type Point,
  type RectLike,
} from "./companion-space";
import MiniThien, { THIEN_H, THIEN_W } from "./MiniThien";

/**
 * Two line-drawn cats that live on the page, keep loose company with the
 * pointer, and carry the panel you play with them from.
 *
 * Four rules shaped every decision below, because a companion is exactly the
 * kind of feature that turns a calm site into a noisy one:
 *
 *  1. It never covers what you are reading. The lead cat keeps a personal-space
 *     radius from the cursor and approaches from behind it, and neither cat is
 *     allowed to *settle* on prose, a control or a form — see companion-space.
 *     Crossing something while it moves is fine; parking on it is not. The
 *     section moods added in round 7 are held to the same probe: see
 *     companion-moods, which declines rather than compromising.
 *  2. It is never the only way to do anything. Its panel used to prove that by
 *     duplicating the nav and the contact links, which only proved the panel
 *     was redundant; it now holds nothing but play and one exit, and the exit
 *     leads somewhere visible with a control on it. Nothing on this layer is
 *     load-bearing for the site.
 *  3. It costs nothing to people who do not want it. No model, no network, no
 *     images — the whole thing is inline SVG and *one* rAF loop that drives both
 *     cats and stops when the tab is hidden, when motion is reduced, and when
 *     both animals are asleep. `wander` is the one mode where the last of those
 *     never comes up, because the cats never doze there — which is the cost of
 *     a mode whose whole content is the pair doing something, and is why it is
 *     a thing the visitor asks for rather than a default.
 *  4. Neither cat is the other one shifted sideways. They were literally one
 *     SVG on one button before this — same pose, same phase, one position — and
 *     no amount of drawing makes that read as two animals. The grey one leads
 *     and tracks the pointer; the tabby follows *him*, on her own clock, and
 *     stops to watch the cursor or wander off when it suits her.
 *  5. Anything it does of its own accord is *rare*. The idle flourishes are
 *     tens of seconds apart and the scenes — see companion-play — are minutes
 *     apart, can only start while the cats are already settled and the visitor
 *     is not doing anything, and end on the frame the pointer moves. A
 *     companion that performs on a schedule you can feel is a companion you
 *     watch instead of reading the page. Asking for a scene from the panel
 *     skips the timer and *only* the timer — see `requestPlay`, which is the
 *     same code path with the wait taken out.
 *  6. It is always somewhere you can find it. Two ways a cat used to become
 *     invisible — off the viewport edge, and behind the opaque sticky header
 *     the companion layer sits under — are answered in companion-space, which
 *     every target and every position now goes through. The third was social
 *     rather than geometric: after a while they simply stopped following and
 *     went quiet wherever they were standing, which reads as a bug even when
 *     the cat is right there. Now they go to the corner, visibly. The fourth
 *     was optical and lasted four rounds: they were *transparent*, so two cats
 *     crossing the hero headline had the words running straight through their
 *     bodies. Every drawing on this layer now knocks the page out underneath
 *     itself in `var(--ground)` — see the note in `CompanionCat`.
 *
 * ## The two roaming modes
 *
 * `roam` is the original: the lead trails the cursor and everything above is
 * about staying out of its way. `wander` is round 9, and it is the same layer
 * with the pointer removed from it — the owner's note asks for "a mode that cat
 * go around instead of follow the mouse", and that is exactly what it is. The
 * pair choose their own places to be (see `planWander`), the personal-space
 * radius has nothing to keep its distance from, and the scenes come three times
 * as often because a visitor who has turned the cursor off has said what they
 * are here for.
 *
 * One rule is deliberately dropped there, and only one: the idle bed. Fourteen
 * seconds of nobody doing anything means "the visitor has gone" while they are
 * driving, and means "the visitor is watching" while they are not — so a
 * companion that went to bed on that clock in `wander` would be a mode fourteen
 * seconds long. The bed is still one item away in the menu.
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
 * How far behind the lead the follower trails on a *long* walk — round 15's
 * own follow-up, and deliberately wider than the ordinary `FOLLOW_GAP` the
 * pointer-chase and the philosophy lap still use unchanged.
 *
 * The two questions read the same ("how far behind him is she") but are not
 * the same question. Ordinary trailing is *motion the visitor is watching* —
 * he is visibly walking somewhere, she is visibly keeping pace, and the
 * ~22px real clearance `FOLLOW_GAP` produces from his own button is the file
 * banner's own "crossing something while it moves is fine" licence, exactly
 * as it always has been. A long walk home is different only in how it ends:
 * `trailLead` below is what she is on for the *entire* walk, settling as
 * well as moving, which means every frame of it — including the very last
 * one — is a frame a visitor who has stopped touching the page, or an audit
 * sampled at any point along it, could be looking at. `FOLLOW_LONG_WALK_GAP`
 * is sized so that even that frame clears the WCAG 2.5.8 minimum on its own,
 * not merely once she arrives: `gap - LEAD_PAD_X` is the real clearance
 * `trailBehind` produces (see `tests/lib/companion-motion.test.ts`'s own
 * geometry), and 34 - 4 = 30 clears both the 24px floor and this layer's own
 * tighter `TOGGLE_CLEARANCE` (28px) with a couple of pixels to spare.
 */
const FOLLOW_LONG_WALK_GAP = 34;

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
/** At night the corner is a shorter walk in visitors' heads too — the bed
 *  comes three seconds sooner. A small nudge, on purpose: this is flavour, not
 *  a second sleep threshold to keep in step with the real one. */
const NIGHT_SLEEP_TRIM = 3000;

/** How long a cheer lasts — a brief lead-`stretch` and tabby-`bat`, drawn from
 *  the poses both animals already have rather than a new one. See D3: a copy
 *  confirmation, a sent message and a theme toggle all ask for the same
 *  flourish, none of them know a cat is listening, and none of them get a
 *  say in how long it lasts. */
const CHEER_MS = 1100;

/** How long the rain beat's huddle holds before the ordinary tour-stop
 *  spacing takes back over — roughly one season beat's own display time, so
 *  the pair have drawn back apart before the next beat's narration starts. */
const HUDDLE_MS = 1800;

/** How long the Contact stop's fake-nap holds before the startle-awake cheer
 *  fires — see `tourNapUntil` and the choreography armed on tour arrival. */
const CONTACT_NAP_MS = 2000;

/** Dwell before a nav link's hover or focus counts as intent, matching the
 *  nap contract's own dwell (`NAP_DWELL`) — brushing past a link on the way
 *  to another one should not read as "heading there". */
const INTENT_DWELL = 300;

/** How long the page must have gone without a scroll event before a tour stop
 *  counts as "arrived". The tour's own `scrollIntoView` fires scroll events
 *  the whole way there, so arrival cannot be "the pair are close enough" on
 *  its own — that is true for a moment mid-scroll on every stop — it has to be
 *  "close enough, and the scroll that got them there has stopped". */
const TOUR_SCROLL_SILENCE = 350;

/** Max px per frame — a hard cap `advance` (companion-motion.ts) never lets a
 *  single call exceed, whatever `want` is: they ease into the last few pixels
 *  of arrival, but a target that has jumped — a fast scroll, most of all —
 *  asks for no more speed than a target four pixels away does. */
const LEAD_SPEED = 4.4;
/** Being shooed is faster than strolling — and it has to be, because the whole
 *  escort has a ~2.5s budget and the walk can start anywhere on screen. */
const ESCORT_SPEED = 7.5;
const POLICE_SPEED = 8;
/** A cat that has decided to bolt. Only the chase scene asks for this, and only
 *  for the two beats it lasts. */
const DASH_SPEED = 8.6;
/** Mini-Thien's own walking pace — a touch slower than the lead cat's, which
 *  is what makes him read as arriving *beside* whichever cat is speaking
 *  rather than racing it there. */
const THIEN_SPEED = 3.6;

/* ------------------------------------------------------------ the corner --
 *
 * Two sleeps, and the difference between them is the whole point:
 *
 *  - `CompanionMode === "resting"` is a **preference**. The visitor asked for
 *    the cats to be put away, it is written to localStorage under "companion",
 *    it survives a reload, and only the corner's own "Wake the cats" button
 *    undoes it. That flow owns `RestingBox`, and it is the only one that touches
 *    storage.
 *  - Idle sleep — everything below — is a **moment**. Nobody has done anything
 *    for `SLEEP_AFTER`, so instead of dozing off in whatever margin they
 *    happened to be standing in, they walk to the corner and settle into the
 *    furniture. Nothing is written anywhere: reload and they roam, exactly as
 *    before.
 *
 * Both sleeps end up in the same three pieces of furniture and the same two
 * slots — see `RestingBox`, which owns the geometry both of them read.
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

/**
 * How the pair go to bed, decided once when they set off for the corner.
 *
 * They always end up in the wrong furniture — the carton and the sheet of paper,
 * with the bed left empty — because that is the joke and a joke that only lands
 * a third of the time is a bug the rest of the time. The rare part is the
 * detour: now and again the tabby stops at the bed on her way past, shoves it,
 * and *then* goes to lie on the paper.
 *
 * `at` is when she arrived at the bed, and it is what turns a position into a
 * sequence: nothing about the shove can start until she is standing next to the
 * thing she is shoving.
 */
interface SleepPlan {
  readonly kick: boolean;
  phase: "kick" | "settle";
  at: number;
}

/** How long she spends booting the bed, and how far into that the bed actually
 *  moves — the shove has to land after the paw is already out, or the furniture
 *  jumps before anything touches it. */
const KICK_MS = 760;
const KICK_HIT = 260;
/** How often the detour happens at all. Rare enough that a visitor who sees it
 *  twice has been here a while. */
const KICK_ODDS = 0.22;

/** How near the pointer must come before a cat asleep in the bed will get up,
 *  and how far it must travel anywhere else to have the same effect. A twitch
 *  should not drag two sleeping animals across the page; using the page should. */
const BED_WAKE_NEAR = 190;
const BED_WAKE_TRAVEL = 150;

/** Pointer dwell before a `data-cat-nap` element calls the cats over, in ms. */
const NAP_DWELL = 600;
const NAP_ATTR = "[data-cat-nap]";

/**
 * WP-E's own declarative contract, the same shape as `data-cat-nap`: while
 * the Contact form carries `data-cat-secret` (the "secret" intent selected),
 * the cats creep toward it and sit up alert rather than settling in as they
 * would beneath an ordinary nap spot — see `secretRef` and the `"secret"`
 * branch of `forced` in the loop below. Watched with a `MutationObserver`
 * rather than the nap contract's pointer/focus delegation, because this
 * attribute's own lifetime is driven by form state a visitor may change
 * anywhere on the page, not by hovering or focusing the element itself.
 */
const SECRET_ATTR = "[data-cat-secret]";

/**
 * Escort budget: cats in the box by 2.2s, police off the page by 6s, whatever
 * happens. A flourish that can hang is not a flourish.
 *
 * The outer number was 3.4s for four rounds and it was too short by about half
 * a walk. The cop leaves at 8px a frame from the bottom-*right* corner, so on a
 * 1440px window the exit alone is nearly three seconds — the timeout kept
 * firing mid-stride and simply deleting him, which reads as the drawing giving
 * up rather than as a cat leaving. `WATCH_MS` is the new beat between the two:
 * he stops, sits, and watches them stay put before he goes, which is what turns
 * a cat walking the same way as two other cats into a cat herding them.
 */
const HERD_MAX = 2200;
const WATCH_MS = 620;
const ESCORT_MAX = 6000;

/** The drawing is committed to React at ~30fps while the positions move every
 *  frame. A gait at 30fps is indistinguishable from one at 60; a re-render at
 *  60 is not free. */
const RENDER_INTERVAL = 32;
/** How often a cat re-checks which section it is flying over. */
const TONE_INTERVAL = 320;

type Mood = "trail" | "watch" | "drift";
/** The escort, in three beats: he pushes them into the corner, he stands over
 *  them for a moment, he leaves. */
type EscortPhase = "herding" | "watching" | "leaving";
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
  /** When the standing-over-them beat ends. Zero until it starts. */
  watchUntil: number;
  readonly slots: Spots;
  readonly police: Mover;
}

/**
 * A section mood in flight — see companion-moods for what one is.
 *
 * `walked` is what makes the Philosophy lap happen *once* rather than every
 * time the pair re-settle: the plan is recomputed constantly (a scroll moves
 * every rectangle it is built from), so the memory of having already walked it
 * has to live outside the plan. Reset when the visitor moves to another
 * section, which is the only thing that makes a mood new again.
 */
interface MoodRun {
  readonly kind: MoodKind;
  /** The spots the mood chose, held until something moves underneath them. */
  readonly spots: Spots;
  walked: boolean;
}

/** The lap itself, mid-walk. `points` is replaced wholesale whenever the plan
 *  is re-probed — the diagram it traces moves with the page — while `index`
 *  survives, so a scroll adjusts the route rather than restarting it. */
interface MoodWalk {
  points: readonly Point[];
  index: number;
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

/* ------------------------------------------------------------------ staging --
 *
 * Where a *requested* scene is allowed to happen, which is not the same
 * question as where an unprompted one is.
 *
 * An unprompted scene starts from wherever the cats already settled, and the
 * settle probe has already called that spot clear — so `openPlay` asking "does
 * a scene fit around here" is asking about somewhere plausible, and a null is
 * genuinely "not here, not now", answered by waiting for the next slot minutes
 * later.
 *
 * A request has neither of those. Opening the toolkit calls the pair to the
 * bottom-right corner — deliberately unprobed, because it is the corner the
 * panel is drawn around — so the position `openPlay` would be handed is either
 * that one arbitrary spot or, if the panel has only just opened, wherever they
 * happen to be halfway through the walk. Round 7 shipped exactly that, and the
 * measurements say what it costs: the same button answered differently
 * depending on how long the panel had been open, and under Philosophy, Journey
 * and Skills — where the corner sits on content — all four scenes refused
 * every time. A refusal has to mean "there is nowhere on this page for this",
 * not "the one spot I measured is busy".
 *
 * So the question is asked of the page instead: sweep the standing spots, and
 * take the first one where the whole scene fits. The pair walk there and the
 * scene opens when they arrive — see `queued` in the loop, which owns the walk
 * and drops it on anything that would have dropped a running scene.
 */
interface Stage {
  /** Where the pair have to be standing for this scene to open. */
  readonly spots: Spots;
  /** Non-null only when that is where they already are: the probe that proved
   *  the scene fits *is* the scene, so it is handed back rather than thrown
   *  away and run again a line later. */
  readonly play: Play | null;
}

/**
 * Somewhere on the page this scene can actually happen, or null if there is
 * genuinely nowhere.
 *
 * Bounded, and paid once per click rather than per frame: the sweep is a few
 * dozen spots, each one three hit tests, and only the ones that come back clear
 * cost a scene probe on top. Measured on a 1440×900 production build, that is
 * 5–20ms when it finds a stage and 26ms in the worst case there is not one
 * anywhere — a frame or two, once, on a deliberate action, which is the right
 * place to spend it and the only place this is ever called from.
 */
function stageFor(kind: SceneKind, here: Spots, facing: 1 | -1, now: number): Stage | null {
  // No section goes in, and none is wanted: the only scenes that reach here are
  // the four on the menu, and an anchored scene is not one of them — see
  // `MenuScene` in ToolkitPanel for why asking for one by name is a promise the
  // page cannot keep.
  const fits = (spots: Spots) => openPlay(kind, spots.lead, spots.follow, facing, now, null);

  // Where they are standing gets first refusal, so a scene that can happen
  // under the visitor's nose never walks the cats across the page to happen
  // somewhere else.
  const asIs = fits(here);
  if (asIs) return { spots: here, play: asIs };

  for (const lead of standingSpots(here.lead)) {
    if (!isClearSpot(lead)) continue;
    for (const side of [-1, 1] as const) {
      const follow = clampToViewport({ x: lead.x + side * (CAT_W + FOLLOW_GAP), y: lead.y });
      // At the edges of the page the clamp folds her back on top of him, and
      // two cats in one box is not a pair, it is a smudge.
      if (Math.abs(follow.x - lead.x) < CAT_W) continue;
      if (!isClearSpot(follow)) continue;
      // The scene this probe opens is thrown away: its clock started now and
      // the pair have a walk ahead of them. It is re-opened from these same two
      // points once they arrive, which is the same question against the same
      // page — and the walk is abandoned the moment anything moves the page.
      if (fits({ lead, follow })) return { spots: { lead, follow }, play: null };
    }
  }
  return null;
}

/**
 * A scene that has been asked for and has somewhere to happen, waiting for the
 * two animals to get there.
 */
interface QueuedPlay {
  readonly kind: SceneKind;
  readonly spots: Spots;
  /** When to give up on the walk. Nothing should reach it — the far corner of a
   *  1440px window is under two seconds away — but a cat that cannot arrive for
   *  any reason must not leave a scene armed behind it. */
  readonly expires: number;
}

/** How long a requested scene may spend walking to its stage. */
const STAGE_WALK_MAX = 6000;

/**
 * The furniture cluster, in viewport coordinates. Computed from the same four
 * numbers the element is positioned with, so the cats cannot miss their own
 * box.
 */
function clusterBox(): { left: number; top: number } {
  return {
    left: Math.max(0, viewport().width - CLUSTER_INSET - CLUSTER_W),
    top: Math.max(0, viewport().height - CLUSTER_INSET - CLUSTER_H),
  };
}

/**
 * The hit-target margin the lead's button carries around its drawing.
 *
 * The button has to be bigger than the animal — 50×42 of line work is under
 * the 44px a finger needs — so the drawing sits centred inside a box padded by
 * these two numbers. That margin used to be a silent offset between the cat the
 * loop *positions* and the cat the visitor *sees*: `paint` writes a transform
 * to the button, so the drawing landed `LEAD_PAD_X` right and `LEAD_PAD_Y` down
 * of the coordinate everything else in the companion reasons about — including
 * `isClearSpot`, which probes a bare `CAT_W × CAT_H` box at that coordinate.
 * The probe was therefore testing a rectangle four pixels left of and three
 * pixels above the animal, and would approve a resting spot with the drawn cat
 * up to that far onto somebody's paragraph.
 *
 * So the button is pulled back by its own padding instead (see the render
 * below), which makes one statement true for every cat, padded or not: **a
 * cat's position is the top-left of the animal you can see**. The probe, the
 * clamps, the moods and the bed's slots all mean the drawing, and none of them
 * has to know which cat is wearing a button.
 */
const LEAD_PAD_X = 4;
const LEAD_PAD_Y = 3;

/** The lead's own live control rect — the toolkit toggle's actual drawn
 *  box — computed from its position and the fixed padded box above, never
 *  read off the DOM. Shared by the two things that need it every frame:
 *  registering it (`setControlRects`, for `clearsControls`) and enforcing
 *  the clearance invariant around it (`keepClearOfControl`). */
function leadControlRect(pos: Point): RectLike {
  return {
    left: pos.x - LEAD_PAD_X,
    top: pos.y - LEAD_PAD_Y,
    right: pos.x - LEAD_PAD_X + CAT_W + LEAD_PAD_X * 2,
    bottom: pos.y - LEAD_PAD_Y + CAT_H + LEAD_PAD_Y * 2,
  };
}

/**
 * The target-size invariant, applied once at the source rather than at
 * movement time.
 *
 * The first attempt at this correction ran right before the follower's own
 * `advance()` call, nudging her `followWant` for that one frame. It broke
 * the guided tour: the tour's own "have we arrived" check compares
 * `tabby.pos` against `tourSpots.current.follow` — a *different* copy of
 * the same spot, read straight from `tourStopSpots()` and never touched by
 * the correction — so her corrected target and the arrival check's own
 * reference disagreed by the exact width of the correction, and she could
 * never get within 4px of a point nothing was actually walking her toward.
 *
 * Correcting `Spots` here, at the one place a mood or a tour stop hands a
 * finished `{ lead, follow }` back to its caller, means every reader after
 * that — the movement code and any arrival check alike — sees the same,
 * already-clear pair of points. Nothing downstream has to know this ran.
 *
 * WP-R round 15 follow-up (two passes): `keepClearOfControl`'s own
 * candidates know nothing about content — they are chosen purely to widen
 * the gap from the lead's control rect, on the assumption (true for the
 * tour and watch spots this was built for, both already probed with
 * `isClearSpot` before this ever runs) that the ground immediately around
 * an already-clear spot is itself ground. Extending this to spots that were
 * never probed that carefully — a section mood's own resting spot, the
 * corner fallback, a wander stay, all round 15 additions — broke exactly
 * that assumption: axe stayed quiet, but the cheap push itself landed the
 * follower on a paragraph she would otherwise have been sitting clear of.
 *
 * The first fix simply refused a push that failed `isClearSpot` and kept
 * the original spot — safe, but only half the promise: the follower could
 * then *settle*, not just cross, inside the toggle's clearance zone, which
 * axe caught as a resting violation rather than a transit one. Refusing is
 * not the same as solving it. `resolveFollowClear` is the actual fix: when
 * the cheap push conflicts with content, the answer is to keep searching —
 * see its own note — never to accept either compromise.
 */
function clearFollowOfToggle(spots: Spots): Spots {
  const follow = resolveFollowClear(spots.follow, spots.lead);
  return follow === spots.follow ? spots : { lead: spots.lead, follow };
}

/**
 * The follower's own clearance resolution, shared by every settle chokepoint
 * that hands her a finished spot (`clearFollowOfToggle`, above), by the
 * ride-freeze correction (see `step()`, where `tabby.pos` itself — not a
 * spot being chosen — is the thing being resolved), and by `trailLead`
 * (round 15's second follow-up), where `want` is a *live* trail spot nothing
 * upstream has ever probed for content at all.
 *
 * That last caller is why this checks content *before* it ever asks about
 * the toggle, not after. The first version of this function assumed every
 * caller's `want` already came through `findClearSpot`/`mateSpot` — true for
 * a settle spot, never true for `trailBehind`'s raw output, which is pure
 * geometry relative to the lead and can land squarely on a paragraph with
 * nothing here noticing, because `keepClearOfControl`'s own fast path
 * returns `want` unchanged the moment it merely clears the *toggle* — it has
 * no idea content exists. A live probe of this exact fix caught it: the
 * follower resting on a case study's own prose, because the point she was
 * trailing toward happened to already be far enough from the lead's button
 * that the toggle-only path never looked any further.
 *
 * So: `want` that fails `isClearSpot` outright skips straight to the widened
 * search — there is no "push a few pixels" fix for standing on a paragraph,
 * only "stand somewhere else". `want` that is already content-clear gets the
 * cheap tiers as before: it may already clear the toggle (no work to do);
 * `keepClearOfControl`'s own four-point push may find a spot that clears it
 * *and* is still content-clear (the common case, one function call); only
 * when that push itself lands on content does this widen to
 * `searchClearOfToggle` over `standingSpots(want)` — the same page-spanning
 * sweep a settling cat's own placement already draws from, seeded nearest
 * `want` so a widened search still lands as close to the original intent as
 * the two constraints allow.
 *
 * The contract this keeps for every caller: **a value that differs from
 * `want` is always `isClearSpot`.** `searchClearOfToggle` only ever returns
 * a content-clear candidate or `null`; the `?? want` fallback only fires when
 * the whole page band conflicted, in which case handing back `want`
 * unchanged is not a new violation — it is simply not fixing an old one
 * nothing here found room to fix.
 */
function resolveFollowClear(want: Point, leadPos: Point): Point {
  const rect = leadControlRect(leadPos);
  if (!isClearSpot(want)) return searchClearOfToggle(standingSpots(want), rect, isClearSpot) ?? want;
  const pushed = keepClearOfControl(want, rect);
  if (pushed === want) return want;
  if (isClearSpot(pushed)) return pushed;
  return searchClearOfToggle(standingSpots(want), rect, isClearSpot) ?? want;
}

/**
 * Where the two of them actually sleep — and it is not the bed.
 *
 * The grey one takes the carton and the tabby takes the sheet of paper, always,
 * because the joke is about the furniture rather than about which animal gets
 * which piece: randomising it would only make the corner look unstable between
 * naps. What *is* occasionally different is how she gets there — see the kick
 * spot below.
 */
function sleepSlots(): Spots {
  const box = clusterBox();
  return {
    // `BOX_SLOT` is where `RestingBox` draws the sleeping cat inside the
    // cluster, and a cat's position is now the drawing's own top-left, so the
    // two are the same number with nothing subtracted from either.
    lead: clampToViewport({ x: box.left + BOX_SLOT.x, y: box.top + BOX_SLOT.y }),
    follow: clampToViewport({ x: box.left + PAPER_SLOT.x, y: box.top + PAPER_SLOT.y }),
  };
}

/** Their two places in the resting box, which draws the same cluster at the
 *  same offsets — so the escort walks them exactly where the drawing that
 *  replaces them will be. */
function slotsForBox(rect: DOMRect): Spots {
  return {
    lead: clampToViewport({ x: rect.left + BOX_SLOT.x, y: rect.top + BOX_SLOT.y }),
    follow: clampToViewport({ x: rect.left + PAPER_SLOT.x, y: rect.top + PAPER_SLOT.y }),
  };
}

/** Where the tabby stands to shove the bed out of her way. */
function kickSpot(): Point {
  const box = clusterBox();
  return clampToViewport({ x: box.left + KICK_SLOT.x, y: box.top + KICK_SLOT.y });
}

/** Distance from a point to the cluster's edge, zero inside it. */
function nearBed(point: Point): boolean {
  const box = clusterBox();
  const dx = Math.max(box.left - point.x, 0, point.x - (box.left + CLUSTER_W));
  const dy = Math.max(box.top - point.y, 0, point.y - (box.top + CLUSTER_H));
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

/**
 * Where the pair creep to for `data-cat-secret` — hugging the visible top
 * corner of the form rather than napping beneath it the way `napSlots` does.
 *
 * The Contact form is tall, and the nap contract's own "beneath the
 * element's bottom edge" answer is built for compact anchors — a plinth, a
 * business card — not for something that can run well past the fold. Anchored
 * to the top edge instead: whatever is actually on screen once
 * `clampToViewport` has pulled it back into the window, which for a form the
 * visitor is presently filling in is the form itself.
 */
function secretSlots(rect: DOMRect): Spots {
  const x = rect.left + 10;
  const y = rect.top + 6;
  const lead = clampToViewport({ x, y });
  return { lead, follow: clampToViewport({ x: x - CAT_W - FOLLOW_GAP, y }) };
}

/**
 * Where the police cat stands while it is herding: behind the rearmost of the
 * pair, on the line they are being pushed along.
 *
 * It used to hold station off their left at their average height, which is *a*
 * spot behind two cats walking right — but only accidentally, and it read as a
 * third cat strolling alongside rather than as one pushing. Projecting back
 * along the vector to the corner puts him up and to the left of them while they
 * cross the page and squarely above them as they drop into the furniture, which
 * is the shape of herding. The vertical offset is the shorter of the two on
 * purpose: a cop a full cat-height above the pair reads as a cat on a shelf.
 */
function herdSpot(goal: Point, lead: Spot, follow: Spot): Point {
  const rear = { x: Math.min(lead.x, follow.x), y: Math.min(lead.y, follow.y) };
  const dx = goal.x - rear.x;
  const dy = goal.y - rear.y;
  const len = Math.hypot(dx, dy);
  // Already there: there is no line left to stand on, so fall back to "just
  // behind", which for a corner in the bottom right is up and to the left.
  if (len < 4) return clampToViewport({ x: rear.x - CAT_W - 16, y: rear.y - 12 });
  return clampToViewport({
    x: rear.x - (dx / len) * (CAT_W + 16),
    y: rear.y - (dy / len) * (CAT_H * 0.6 + 12),
  });
}

function distance(a: Spot, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function centreOf(pos: Spot): Point {
  return { x: pos.x + CAT_W / 2, y: pos.y + CAT_H / 2 };
}

/**
 * `advance` (the hard per-frame speed cap every mover on this layer is walked
 * by) and the follower's own curve (`followTarget` + `ramp`) both live in
 * `companion-motion.ts` now, not here — see that file's banner for why a
 * target that is content-anchored while the cats are viewport-fixed makes the
 * cap's independence from distance the whole point, not an implementation
 * detail, and why that is worth a module a test can import on its own
 * (WP-P round 14, "scroll must not speed them up").
 */

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

/**
 * The duet's speech bubble, clamped to the viewport: it sits at the speaking
 * cat's x, but the cat is allowed right up against the window edge and the
 * bubble is `whitespace-nowrap` on its meow line — unclamped, a bubble that
 * fires there gets cut off mid-line, which is worse than no bubble at all.
 * Measured off the node's own rendered width so the clamp holds for whichever
 * beat it is showing. The vertical offset is measured too, off the node's own
 * rendered height — a one-line note had a fixed height, but the subtitle here
 * can wrap to two lines, and a hardcoded offset put the cat drawing right over
 * the second line the moment a beat's subtitle actually wrapped.
 *
 * The *y* is clamped the same way: a cat close enough to the top of the
 * viewport used to put the bubble's top edge under the sticky header — the
 * header is opaque and the bubble is `fixed`, painted above it in source
 * order but not in the header's own stacking context, so the bubble's first
 * line landed half-hidden behind the site chrome. `safeTop()` is the same
 * measured header-bottom the roaming bounds already probe against (see
 * `companion-space.ts`), so this never drifts from the header's actual
 * height the way a hardcoded pixel figure would. When the bubble would sit
 * above that line, it flips below the cat instead of merely being pushed
 * down onto it — a bubble still reading "above" while jammed flush under the
 * header would point at nothing.
 */
/**
 * Shared by the duet's speech bubbles and mini-Thien's caption: sit above
 * whatever it is anchored to, or below it — never under the sticky header —
 * clamped to the viewport on both axes. `anchorH` is the anchor's own drawn
 * height (`CAT_H` for a bubble beside a cat, `THIEN_H` for a caption beside
 * the narrator), which is what the "flip below" fallback offsets by.
 */
function paintBeside(node: HTMLElement | null, anchor: Spot, anchorH: number): void {
  if (!node) return;
  const margin = 8;
  const width = node.offsetWidth;
  const x = clamp(anchor.x, margin, Math.max(margin, window.innerWidth - width - margin));
  const above = anchor.y - node.offsetHeight - 6;
  const y = above < safeTop() + margin ? anchor.y + anchorH + 6 : above;
  paint(node, { x, y });
}

/** The duet's speech bubble, clamped to the speaking cat — see `paintBeside`. */
function paintBubble(node: HTMLElement | null, cat: Spot): void {
  paintBeside(node, cat, CAT_H);
}

/** Mini-Thien's caption, clamped to him rather than to the cat he is
 *  standing beside — the two are never the same point once he has arrived,
 *  so this cannot simply reuse `paintBubble`'s own anchor. */
function paintCaption(node: HTMLElement | null, thien: Spot): void {
  paintBeside(node, thien, THIEN_H);
}

/**
 * Where mini-Thien wants to stand for the beat currently playing: beside the
 * speaking cat, on the side away from the other one, so the three of them
 * never end up stacked in a line. Handed to `findClearSpot` exactly the way
 * every other settle target here is — see its own comment for why that means
 * probing him with the cats' clear-spot geometry rather than his own: an
 * approximation, and close enough for a decoration whose only job is to stay
 * off a paragraph, not to model its own exact footprint.
 */
function thienWant(speaker: Spot, other: Spot): Point {
  const side: 1 | -1 = speaker.x <= other.x ? -1 : 1;
  return { x: speaker.x + side * (CAT_W + 18), y: speaker.y - 4 };
}

/**
 * Cut a drawing off at the edge of whatever it is hiding behind; zero puts it
 * back.
 *
 * The inset is only ever on the bottom, which is what lets this sit on the same
 * element as the drawing's own `scaleX` — mirroring a cut that is symmetrical
 * left to right changes nothing about where it lands.
 */
function tuck(node: HTMLElement | null, cut: number): void {
  if (!node) return;
  const want = cut > 0 ? `inset(0px 0px ${cut.toFixed(1)}px 0px)` : "";
  if (node.style.clipPath !== want) node.style.clipPath = want;
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

/**
 * Built once at module scope, because `useActiveSection` rebuilds its observer
 * whenever the array it is handed changes identity — the same contract SiteNav
 * documents, and the reason the cats *subscribe* to that hook rather than
 * growing a second scrollspy of their own.
 */
const SECTION_IDS = navItems.map((item) => item.sectionId);

/**
 * Where the pair are wandering to, and when they may think of somewhere else.
 *
 * Held rather than recomputed, for the same reason a mood is: a destination
 * chosen again every frame is not a destination, it is a jitter. `arrivedAt` is
 * what turns the plan into a stay — the clock on how long they stand there does
 * not start until they are standing there — and `until` is a cap before then,
 * so a walk that cannot finish (a spot that has scrolled under something) is
 * abandoned rather than walked at forever.
 *
 * `faceLead`/`faceFollow` are rolled once, at the same moment `arrivedAt` is
 * stamped — see round 14, "randomly facing left or right". Held here rather
 * than recomputed for the same reason `spots` is: a facing re-rolled every
 * frame is not a choice, it is a flicker. Zero until an arrival has actually
 * happened, which is never read as a real facing — nothing consults these
 * two fields while `arrivedAt` is still 0.
 */
interface WanderRun {
  readonly spots: Spots;
  arrivedAt: number;
  until: number;
  faceLead: 1 | -1;
  faceFollow: 1 | -1;
}

/** How long a wandering pair stay somewhere once they get there, and the cap on
 *  the walk before that. Long enough that they read as having settled in, short
 *  enough that a visitor watching sees them think of something else. */
const WANDER_STAY = 4500;
const WANDER_STAY_SPREAD = 8000;
const WANDER_WALK_MAX = 8000;

export interface CompanionProps {
  /** D1: computed once, on the server, from `src/content/*` — see
   *  src/lib/companion-facts.ts. The only route any content number reaches
   *  this client chunk by; the duet and the tour quote it and nothing
   *  else. */
  readonly facts: CompanionFacts;
}

export function Companion({ facts }: CompanionProps) {
  const mode = useCompanionMode();
  const pathname = usePathname();
  /** Both modes that put cats on the page rather than in the corner. Almost
   *  everything below cares which of the three the visitor chose only this far:
   *  is there a roaming layer at all. */
  const roaming = mode === "roam" || mode === "wander";
  /** Which section the visitor is reading, from the page's own scrollspy. Used
   *  for nothing but where the cats choose to sit — see companion-moods. */
  const section = useActiveSection(SECTION_IDS);
  // Roaming needs a real pointer and a visitor who has not asked for calm.
  const finePointer = useMedia("(pointer: fine)");
  const stillness = useMedia("(prefers-reduced-motion: reduce)");
  const roams = finePointer && !stillness;

  const [open, setOpen] = useState(false);
  const [escort, setEscort] = useState<EscortPhase | null>(null);
  const [bed, setBed] = useState<Bed>(null);
  /** The bed has been booted out of the way. React owns this one because it is
   *  a CSS transition on a piece of furniture, not a per-frame position. */
  const [shoved, setShoved] = useState(false);
  /** The running scene, as much of it as React needs to know: which one, and
   *  which prop it puts on the page. Everything else a scene does is a
   *  transform written per frame. The chase has no prop at all — `prop` stays
   *  null throughout — which is exactly why the *kind* is here too: it is the
   *  only handle the page (and the spec) has on a scene that draws nothing. */
  const [scene, setScene] = useState<{ kind: SceneKind; prop: ToyKind | null } | null>(null);
  const [frame, setFrame] = useState<Frame>(INITIAL_FRAME);

  const leadNode = useRef<HTMLElement | null>(null);
  const followNode = useRef<HTMLElement | null>(null);
  /** The drawing inside each of the two roaming cats. Only one thing writes to
   *  these — the clip that puts an animal behind a panel — and it deliberately
   *  does not write to the elements above: the lead's is the quick-actions
   *  button, and clipping a control is clipping its target and its focus ring. */
  const leadArt = useRef<HTMLSpanElement | null>(null);
  const followArt = useRef<HTMLSpanElement | null>(null);
  const policeNode = useRef<HTMLElement | null>(null);
  const toyNode = useRef<HTMLDivElement | null>(null);
  const toyArt = useRef<SVGGElement | null>(null);
  const toySpin = useRef<SVGGElement | null>(null);
  /** The duet's two speech-bubble elements — positioned per frame exactly like
   *  the toy, and for the same reason: an effect would place it one frame
   *  late. Only one is ever mounted at a time (see the render), but both need
   *  a stable ref for the frame their speaker isn't holding to attach to when
   *  it next takes the floor. */
  const greyBubble = useRef<HTMLDivElement | null>(null);
  const tabbyBubble = useRef<HTMLDivElement | null>(null);
  /** Mini-Thien: the wrapper the loop paints his position onto, the inner
   *  span it writes his facing to (the same split the toy uses — `thienNode`
   *  is the transform, `thienArt` is the flip), and his own caption, painted
   *  beside him exactly as a bubble is painted beside a cat. */
  const thienNode = useRef<HTMLDivElement | null>(null);
  const thienArt = useRef<HTMLSpanElement | null>(null);
  const thienCaption = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  /** The two halves of the idle furniture — everything behind the animals, and
   *  the carton's front panel in front of them. Both are opaque line work on the
   *  fixed layer, so both need the tone sample. */
  const matRef = useRef<HTMLDivElement>(null);
  const matFrontRef = useRef<HTMLDivElement>(null);
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
  /** How this particular bedtime goes. Rolled once, when they set off. */
  const sleepPlan = useRef<SleepPlan | null>(null);
  const shovedRef = useRef(false);
  /** Pointer distance accumulated since they curled up. */
  const travelRef = useRef(0);
  const napRef = useRef<Nap | null>(null);
  const napPointer = useRef<Element | null>(null);
  const napFocus = useRef<Element | null>(null);
  /** The `data-cat-secret` element, mirrored the same way `napRef` is — see
   *  the `MutationObserver` effect below, which is the only thing that
   *  writes it. */
  const secretRef = useRef<Nap | null>(null);
  /** The running scene, and the earliest the next one may start. Both live
   *  above the loop effect so a mode change does not hand a returning visitor
   *  a toy immediately, or reset a timer they have already half waited out. */
  const playRef = useRef<Play | null>(null);
  const playAt = useRef(0);
  /** True while the running — or still-walking — scene is one the visitor asked
   *  for from the panel rather than one the idle timer started. Exactly one rule
   *  reads it, in the loop below, and it is the difference between a scene the
   *  companion offered and a scene the visitor chose. */
  const askedRef = useRef(false);
  /** A scene the visitor has asked for that has somewhere to happen but not
   *  where they are standing. See `stageFor`: the pair walk to it, and it opens
   *  when they arrive. */
  const queued = useRef<QueuedPlay | null>(null);
  /** Content-avoiding rest spots, resolved once per settle rather than per
   *  frame. Cleared whenever the page underneath them can have moved. */
  const settleSpots = useRef<Spots | null>(null);
  /** The mode, mirrored for the loop, which closes over its initial props and
   *  is deliberately not torn down when the visitor switches between the two
   *  roaming modes — a rebuild would hand them a fresh scene timer and forget
   *  where the pair were going. */
  const wanderRef = useRef(false);
  /** Where they are wandering to. Null means "decide on the next frame". */
  const wanderRun = useRef<WanderRun | null>(null);
  /** The active section, mirrored for the loop, plus the mood it is currently
   *  running. Both are cleared together when the visitor moves on. */
  const sectionRef = useRef<string | null>(null);
  const moodRun = useRef<MoodRun | null>(null);
  const moodWalk = useRef<MoodWalk | null>(null);
  const homeSpots = useRef<Spots | null>(null);
  /** Mirrors `roaming` for the loop, the same way `wanderRef` mirrors the
   *  mode: the loop effect's dependency array is `loopActive`, which can stay
   *  true across a mode change that flips `roaming` (an escort keeps the loop
   *  alive after "resting" is chosen), so anything the loop reads that cares
   *  about *real* roaming — as opposed to "there happens to be a frame
   *  running" — has to read a ref rather than the render-scope value. */
  const roamingRef = useRef(roaming);

  /* ------------------------------------------------------------- the tour -- */
  /** The tour in progress, mutated per frame exactly like `escortRef` — see
   *  companion-tour.ts. `tourSpots` is where the current stop's mood or
   *  fallback anchor resolved to, held rather than probed every frame except
   *  while a stop is still being walked to (the section it belongs to is
   *  mid-scroll, so its anchor keeps moving until the scroll settles). */
  const tourRef = useRef<TourRun | null>(null);
  const tourSpots = useRef<Spots | null>(null);
  const tourHudRef = useRef<HTMLDivElement>(null);
  /** The last moment any scroll event fired, regardless of cause — the tour's
   *  own `scrollIntoView` included. Arrival at a stop is gated on this being
   *  quiet for a beat, which is what stops "close enough" being read as
   *  arrived while the programmatic scroll that is *carrying* the pair there
   *  is still under way. */
  const lastScrollAt = useRef(0);
  /**
   * The play's own choreography windows — one per stop that needs more than
   * the pair's ordinary sit, armed at arrival (see `armTourChoreo` in the
   * loop) and read only from inside the tour's own code paths, exactly the
   * way `rainHuddleUntil` is read only from inside the watch's. Both are
   * plain timestamps rather than a richer shape because both are read the
   * same way `rainHuddleUntil` already is: "is now before this".
   */
  const tourHuddleUntil = useRef(0);
  const tourNapUntil = useRef(0);
  /** What React needs to draw the HUD: which stop, the route it is currently
   *  walking (see companion-tour's `TourRoute`), whether that route has been
   *  chosen yet, and the beats once the pair have actually arrived (empty
   *  while still walking to it). Everything else about a tour — the walk, the
   *  arrival check — is `tourRef`'s business, exactly as a scene's
   *  beat-by-beat progress is `playRef`'s. */
  const [tourView, setTourView] = useState<{
    index: number;
    lines: readonly DialogueBeat[];
    route: TourRoute;
    routeChosen: boolean;
  } | null>(null);

  /* ------------------------------------------------------------- watch -- */
  /** Non-null while the pair have been invited to sit and watch the
   *  origin-story overlay — see the effect near the tour's own listeners.
   *  `spots` starts null and is filled in by the loop exactly the way
   *  `tourSpots` is: recomputed every frame they are still walking over
   *  (`tourStopSpots("tree")`, the tour's own placement for that section),
   *  then left alone once they arrive. Dropped — not merely outranked — the
   *  moment anything with a stronger claim shows up, so it is never resumed
   *  once the visitor has been handed to the escort, the tour, a nap or the
   *  panel; see where `forced` is read in the loop. */
  const watchRef = useRef<{ spots: Spots | null } | null>(null);
  /** Who narrates the next `origin-story-beat` — flipped after every beat so
   *  the show reads as a duet rather than one cat narrating the whole thing,
   *  and reset to "grey" at the top of every run (the "start" branch below)
   *  so a show always opens on the same voice regardless of who spoke last
   *  in whatever ambient scene came before it. */
  const storySpeakerRef = useRef<Speaker>("grey");
  /** How long the rain beat's huddle — the follow spot pulled in beside the
   *  lead instead of behind him — holds before the ordinary tour-stop
   *  spacing (`tourStopSpots`) takes back over. Set from the
   *  `origin-story-beat` listener; read where `watch.spots` is refreshed
   *  every frame below. Zero (the initial value) never satisfies `now <
   *  rainHuddleUntil.current`, so this is inert until the first rain beat. */
  const rainHuddleUntil = useRef(0);

  /* ------------------------------------------------------------- duet -- */
  /** The next moment a scene may start on its own, and the sections that have
   *  already shown an ambient one this visit — see companion-dialogue.ts.
   *  Neither is cleared when the visitor moves on: "once per section per
   *  visit" means once, not once per return trip, and the cadence is a
   *  property of the *visit*, not of whichever section happens to be current
   *  when the clock comes up. */
  const duetAt = useRef(0);
  const duetShown = useRef<Set<string>>(new Set());
  /** Whether the visit's one deterministic scene — the hello — has already
   *  had its turn — see the comment where it is read, in the loop. */
  const duetFirstShown = useRef(false);
  /** The running scene, if any — advanced by the loop's reading-time clock
   *  or by a tap on the tabby, and cleared by the same things that cleared a
   *  field note, plus scene completion. The state mirror below is for JSX
   *  only, exactly the way `note` used to be. */
  const duetRef = useRef<DialogueRun | null>(null);
  const [duetBeat, setDuetBeat] = useState<{
    speaker: Speaker;
    meow: string;
    sub: string;
    hintMore: boolean;
  } | null>(null);

  /* ---------------------------------------------------------- mini-Thien -- */
  /** His position and facing, mirrored out of React exactly the way the
   *  cats' own `Mover` is — written every frame, painted straight to the
   *  DOM, never round-tripped through `setState`. */
  const thien = useRef<{ pos: Spot; facing: 1 | -1 }>({ pos: { x: 0, y: 0 }, facing: 1 });
  /** Where he is currently walking to, and which speaker that target was
   *  chosen for — recomputed only when the speaker changes (or a new scene
   *  starts), not every frame: it is a `findClearSpot` probe, and probing
   *  the page sixty times a second for a target that only ever changes a
   *  couple of times a scene is the cost this avoids. Both null together,
   *  always, and both reset to null the instant `duetRef.current` clears —
   *  see `endPlay`-adjacent cleanup below — so the next scene starts fresh
   *  rather than walking him back to a stale mark from a beat that finished
   *  first. */
  const thienTarget = useRef<Point | null>(null);
  const thienSpeaker = useRef<Speaker | null>(null);

  /* --------------------------------------------------------- nav intent -- */
  /** D2: the nav link the pointer or keyboard focus is dwelling on, by
   *  section id — `null` off the nav entirely. Detected by delegation on
   *  `header nav a[href]`, the same shape the `data-cat-nap` contract already
   *  uses, so no change reaches SiteNav to make this work. */
  const intentRef = useRef<string | null>(null);
  const [intent, setIntent] = useState<string | null>(null);

  /* ------------------------------------------------------------- night -- */
  /** Whether `<html data-theme>` currently reads "night", read once at mount
   *  and kept current by the `MutationObserver` below (D3) — the loop cannot
   *  itself watch a DOM attribute a visitor may change at any moment. */
  const nightRef = useRef(false);

  /* -------------------------------------------------------------- cheer -- */
  /** A brief flourish on a copy confirmation, a sent message, or a theme
   *  toggle (D3) — none of which know a cat is listening. `cheerRef` is the
   *  window the loop honours; `cheer` is only for `data-cat-cheer`. */
  const cheerRef = useRef<{ until: number } | null>(null);
  const [cheer, setCheer] = useState(false);

  /* --------------------------------------------------------------- rush -- */
  /** A sustained fast scroll, detected from the loop's own scroll handler —
   *  see `detectRush` in companion-moods.ts for the arithmetic and the
   *  handler below for the accumulation. `dir` is which way the page is
   *  moving, `until` is when the reaction ends if nothing else claims the
   *  pair first. */
  const rushRef = useRef<{ dir: 1 | -1; until: number } | null>(null);
  const rushWindow = useRef<{ y: number; at: number } | null>(null);

  /** WP-R round 15: the scroll tracker `rideStep` needs between frames — see
   *  its own file banner in companion-motion.ts. Lazily primed on the loop's
   *  first frame (`??=` below) rather than at mount, so a visitor who scrolls
   *  before the roaming loop ever starts (reduced motion, a touch device,
   *  "resting") never has a stale scroll position to report a phantom ride
   *  against once it does. */
  const rideRef = useRef<RideTracker | null>(null);

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
    // A requested scene still walking to its stage dies here too, and it has to
    // die *first*: every caller of this function is something with a better
    // claim on the cats than a play — the pointer moving, the toolkit opening,
    // the page scrolling, the loop being torn down — and a scene that has not
    // opened yet is no more entitled to survive one than a scene that has.
    // Without this a visitor who clicks Toss the yarn and then scrolls away
    // gets a ball of wool seconds later, from nowhere.
    queued.current = null;
    // Whatever ends a scene ends its provenance with it: the next one to start
    // is the idle timer's until somebody asks for it again.
    askedRef.current = false;
    if (!playRef.current) return;
    playAt.current = scheduleNextPlay(now, wanderRef.current);
    playRef.current = null;
    // The spots they settled on before the scene are stale the moment a scene
    // moves them, and most of them do: a chase can finish a viewport away from
    // where it started, and an anchored scene ends wherever the thing it was
    // about happened to be. Cats that then walked all the way back to their old
    // spot would be undoing the scene in front of the visitor, so both the
    // settle spots and whatever they were wandering towards are cleared here and
    // the next frame re-decides from wherever they actually are.
    settleSpots.current = null;
    wanderRun.current = null;
    setScene(null);
  }, []);

  useEffect(() => {
    openRef.current = open;
    wake();
  }, [open, wake]);

  /**
   * The mode, into the loop.
   *
   * A ref rather than a dependency of the loop effect, because switching
   * between the two roaming modes must not rebuild the loop: that would re-roll
   * the scene timer and drop the plan the pair are halfway through walking. The
   * plan itself does go, because it was chosen under the other set of rules —
   * and the cats are woken, because in `wander` there may be nothing else left
   * to wake them.
   */
  useEffect(() => {
    wanderRef.current = mode === "wander";
    roamingRef.current = roaming;
    wanderRun.current = null;
    settleSpots.current = null;
    wake();
  }, [mode, roaming, wake]);

  // Retire the one stored value this code no longer writes. It has to happen
  // out here rather than inside the store's snapshot, which runs during render
  // — see companion-state. Once per mount, and a no-op for everybody who never
  // saw the old switch.
  useEffect(migrateCompanionMode, []);

  /**
   * The visitor has moved to another section, so whatever mood the last one put
   * the cats in is over. Only the *memory* is dropped here — the plan itself is
   * rebuilt from scratch on the next settle, and dropping the settle spots is
   * what asks for that.
   */
  useEffect(() => {
    if (sectionRef.current === section) return;
    sectionRef.current = section;
    moodRun.current = null;
    moodWalk.current = null;
    settleSpots.current = null;
    wanderRun.current = null;
    // A scene is *about* the section it started in. The tour is exempt — it
    // is the thing doing the scrolling — and the story is exempt for the same
    // reason: the visitor does not scroll during the show (the player itself
    // ends the show on scroll-away, well before this effect would ever see a
    // change), so in practice this never fires mid-story, but a real forced
    // state still drops a story scene the moment it claims the pair — see the
    // origin-story invitation's own drop, just below `tourStopSpots`, which
    // clears it explicitly rather than relying on this effect. The cadence
    // clock (`duetAt`) is untouched: the visit-wide gap keeps running, this
    // only clears what is currently showing.
    if (duetRef.current && duetRef.current.scene.kind !== "tour" && duetRef.current.scene.kind !== "story") {
      duetRef.current = null;
      setDuetBeat(null);
    }
    wake();
  }, [section, wake]);

  /**
   * D3, the theme half: `ThemeToggle` writes `data-theme` straight to
   * `<html>` rather than through any state this component could subscribe to
   * (see its own doc comment), so the only way to notice a toggle is to
   * watch the attribute. `attributeFilter` means this fires only on an
   * actual change, never on unrelated DOM churn elsewhere on the page.
   *
   * Both the read and the cheer only matter once there is a loop to feel
   * them, so this — like the nap contract — does nothing at all off `roams`.
   */
  useEffect(() => {
    if (!roams) return;
    const root = document.documentElement;
    nightRef.current = root.dataset.theme === "night";

    const cheerNow = () => {
      cheerRef.current = { until: performance.now() + CHEER_MS };
      setCheer(true);
      window.setTimeout(() => setCheer(false), CHEER_MS);
      lastSignRef.current = performance.now();
      wake();
    };

    const observer = new MutationObserver(() => {
      nightRef.current = root.dataset.theme === "night";
      cheerNow();
    });
    observer.observe(root, { attributeFilter: ["data-theme"] });

    // D3, the neutral-event half: CopyButton and ContactForm dispatch these
    // on success with no idea a cat is listening — see the one-line edits in
    // each file. The companion is simply one more thing on the page that
    // happens to care.
    window.addEventListener("portfolio:copied", cheerNow);
    window.addEventListener("portfolio:contact-sent", cheerNow);
    return () => {
      observer.disconnect();
      window.removeEventListener("portfolio:copied", cheerNow);
      window.removeEventListener("portfolio:contact-sent", cheerNow);
    };
  }, [roams, wake]);

  /**
   * D2: nav intent by DOM delegation rather than a `CustomEvent` from
   * `SiteNav` — the same shape the `data-cat-nap` contract already uses one
   * effect up, and it costs SiteNav nothing to make this work. A dwell, not
   * entry, for the same reason the nap contract has one: passing over a link
   * on the way to another should not read as having decided to go there.
   */
  useEffect(() => {
    if (!roams || !roaming) return;

    let dwell = 0;

    const clear = () => {
      window.clearTimeout(dwell);
      if (intentRef.current !== null) {
        intentRef.current = null;
        setIntent(null);
      }
    };

    const consider = (target: Element | null) => {
      const link = target?.closest<HTMLAnchorElement>("header nav a[href]") ?? null;
      const href = link?.getAttribute("href") ?? "";
      // `SiteNav` links read `/#section-id` — a same-page fragment written as
      // an absolute path, which still resolves to an in-page jump but is not
      // a bare `#section-id`. The section id is whatever follows the `#`
      // wherever it falls, not only at index 0.
      const hash = href.indexOf("#");
      const wants = hash >= 0 ? href.slice(hash + 1) : null;
      if (!wants) {
        clear();
        return;
      }
      if (wants === intentRef.current) return;
      window.clearTimeout(dwell);
      dwell = window.setTimeout(() => {
        intentRef.current = wants;
        setIntent(wants);
      }, INTENT_DWELL);
    };

    const onOver = (event: PointerEvent) => {
      consider(event.target instanceof Element ? event.target : null);
    };
    const onOut = (event: PointerEvent) => {
      const next = event.relatedTarget instanceof Element ? event.relatedTarget : null;
      if (!next?.closest("header nav a[href]")) clear();
    };
    const onFocusIn = (event: FocusEvent) => {
      consider(event.target instanceof Element ? event.target : null);
    };
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget instanceof Element ? event.relatedTarget : null;
      if (!next?.closest("header nav a[href]")) clear();
    };

    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      window.clearTimeout(dwell);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [roams, roaming]);

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

  /** D5: the bubble is decoration exactly the way the toy is, and gets the
   *  same first-frame treatment — placed here rather than left for an effect
   *  to catch up to, so it never flashes in at the origin before jumping to
   *  the cat it belongs beside. One attacher per speaker, because only one
   *  bubble is ever mounted, and each has to find its own cat's position
   *  regardless of which cat is currently speaking. */
  const attachGreyBubble = useCallback((node: HTMLDivElement | null) => {
    greyBubble.current = node;
    if (node) paintBubble(node, lead.current.pos);
  }, []);
  const attachTabbyBubble = useCallback((node: HTMLDivElement | null) => {
    tabbyBubble.current = node;
    if (node) paintBubble(node, follow.current.pos);
  }, []);

  /** Mini-Thien and his caption get the same first-frame treatment as the
   *  bubbles above, for the same reason. */
  const attachThien = useCallback((node: HTMLDivElement | null) => {
    thienNode.current = node;
    if (node) paint(node, thien.current.pos);
  }, []);
  const attachThienCaption = useCallback((node: HTMLDivElement | null) => {
    thienCaption.current = node;
    if (node) paintCaption(node, thien.current.pos);
  }, []);

  /** What the JSX needs to draw one beat; `hintMore` marks the last beat of
   *  an ambient scene that has an encore waiting behind it. */
  const beatView = useCallback(
    (run: DialogueRun): { speaker: Speaker; meow: string; sub: string; hintMore: boolean } => {
      const beat = currentBeat(run);
      const last = run.beatIndex === run.scene.beats.length - 1;
      const section = run.scene.kind === "ambient" ? run.scene.id.replace(/^ambient-/, "") : null;
      return {
        speaker: beat.speaker,
        meow: beat.meow,
        sub: beat.sub,
        hintMore: last && section !== null && hasEncore(section, facts),
      };
    },
    [facts],
  );

  const playDuetScene = useCallback(
    (scene: DialogueScene, now: number) => {
      const run = startScene(scene, now);
      duetRef.current = run;
      setDuetBeat(beatView(run));
    },
    [beatView],
  );

  /** The tabby's own control: advance the running scene a beat, open the
   *  encore waiting behind an ambient scene's last line, or — if nothing is
   *  running — start whichever scene this section has not shown yet. The
   *  same three moves the loop makes on its own clock, just on the visitor's
   *  tap instead. */
  const tapTabby = useCallback(() => {
    const now = performance.now();
    // A visitor-initiated scene still owes the scheduler a re-arm: it only
    // guards on `duetRef.current === null`, so without this a tapped scene
    // that just finished would leave the spontaneous hello free to fire the
    // instant it ends. Skip the re-arm while the hello itself hasn't played
    // yet — that one is on its own fixed clock and must not be pushed out.
    const rearm = () => {
      if (duetFirstShown.current) duetAt.current = nextDuetAt(now, false, Math.random());
    };
    const run = duetRef.current;
    if (run) {
      const last = run.beatIndex === run.scene.beats.length - 1;
      const section = sectionRef.current;
      if (last && run.scene.kind === "ambient" && section && hasEncore(section, facts)) {
        const encore = sceneFor("encore", section, facts);
        if (encore) {
          playDuetScene(encore, now);
          rearm();
          return;
        }
      }
      const next = advanceBeat(run, now);
      duetRef.current = next;
      setDuetBeat(next ? beatView(next) : null);
      rearm();
      return;
    }
    const section = sectionRef.current;
    if (!section) return;
    // Once a section's ambient scene has already had its once-per-visit
    // showing, an encore is the next thing to offer — but only tree and lab
    // have one. Everywhere else, replay the ambient scene rather than going
    // silent for the rest of the visit; `duetShown` already has the section,
    // so this replay does not touch it again.
    const scene = duetShown.current.has(section)
      ? (sceneFor("encore", section, facts) ?? sceneFor("ambient", section, facts))
      : sceneFor("ambient", section, facts);
    if (scene) {
      // A fallback replay is already in `duetShown`; only a first-ever
      // ambient scene needs to be added.
      if (scene.kind === "ambient") duetShown.current.add(section);
      playDuetScene(scene, now);
      rearm();
    }
  }, [beatView, facts, playDuetScene]);

  /* ------------------------------------------------------------- pointer -- */

  useEffect(() => {
    if (!roams) return;

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
    if (!roams || !roaming) return;

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
  }, [roams, roaming, wake]);

  /**
   * WP-E's own contract: `data-cat-secret` on the Contact form while the
   * "secret" intent is selected. Unlike `data-cat-nap`, this is not a
   * pointer/focus dwell — the attribute's lifetime is driven by form state a
   * visitor may change from anywhere the form's own controls reach, not by
   * hovering or focusing the form region itself — so it is watched with a
   * `MutationObserver` on the attribute directly, the same tool D3 already
   * uses for `data-theme`, just scoped to `document.body` with `subtree`
   * rather than to a single known node.
   *
   * Reduced motion and touch never reach this at all: gated on `roams &&
   * roaming` exactly like the nap contract, which is what keeps the
   * theatrics off — there is no roaming loop to creep the pair anywhere in
   * either case.
   */
  useEffect(() => {
    if (!roams || !roaming) return;

    const sync = () => {
      const el = document.querySelector(SECRET_ATTR);
      const current = secretRef.current;
      if (el === (current?.el ?? null)) return;
      secretRef.current = el
        ? { el, rect: el.getBoundingClientRect(), readAt: performance.now() }
        : null;
      wake();
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributeFilter: ["data-cat-secret"], subtree: true });
    return () => {
      observer.disconnect();
      secretRef.current = null;
    };
  }, [roams, roaming, wake]);

  /* ------------------------------------------------------------ the loop -- */

  const loopActive = roams && (roaming || escort !== null);

  useEffect(() => {
    if (!loopActive) return;

    const grey = lead.current;
    const tabby = follow.current;
    let running = false;
    let frameId = 0;
    /**
     * When the previous frame ran, or 0 for "there was no previous frame".
     *
     * Cleared by `stop` rather than merely left behind, which matters more
     * here than in a loop that never rests: this one is *designed* to stop for
     * minutes at a time, and the gap either side of a nap is not time the pair
     * spent walking. A stale sentinel would hand the first frame after every
     * wake the whole clamp (see `MAX_FRAME_STEP`) and start them with a jump.
     */
    let lastFrameAt = 0;

    const stop = () => {
      running = false;
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
      lastFrameAt = 0;
    };

    const start = () => {
      if (running || document.hidden) return;
      running = true;
      lastFrameAt = 0;
      frameId = requestAnimationFrame(step);
    };

    function restSpots(leadAnchor: Point, followAnchor: Point): Spots {
      const home = homeSpot();
      const spot = findClearSpot(leadAnchor, home);
      return { lead: spot, follow: findClearSpot(followAnchor, followHome(home), spot) };
    }

    /**
     * WP-R round 15's second follow-up: the follower's own target for the
     * whole of a long walk, full stop — no separately-computed endpoint of
     * her own to switch to, ever. She trails the lead's live position
     * (`trailBehind`, companion-motion.ts) for as long as he is walking, and
     * once he settles she simply keeps trailing *his now-stationary* spot —
     * which is exactly where she ends up standing.
     *
     * This looks like it throws away the mood/home fallback's own carefully
     * probed `finalFollow` point, and a first version of this fix did keep
     * it, switching to it once both animals had closed the distance. Caught
     * live, by this file's own e2e coverage: `finalFollow` and the live
     * trail are not necessarily on the same side of him — `finalFollow` came
     * from `keepClearOfControl`'s own four-way push (right, left, below or
     * above, whichever cleared), while the trail sits on whichever side his
     * `facing` currently puts her — so the single hop from "caught up on the
     * trail" to "the separately-computed final spot" was itself a short
     * independent walk that could still clip past his button, exactly the
     * crossing-path shape this whole fix exists to remove, merely shrunk
     * from the length of the walk down to one hop. Never making that hop is
     * simpler than timing it correctly: a spot that is always live-derived
     * from wherever he currently stands never needs a second, different spot
     * to reconcile with.
     *
     * `resolveFollowClear` — the same widened search every settle chokepoint
     * uses — is what makes stopping here safe rather than merely simple: it
     * re-validates the live trail spot against content and the toggle every
     * frame, so whatever she is currently walking toward is always the
     * already-vetted answer, not merely close to it. A no-op the overwhelming
     * majority of frames (`keepClearOfControl`'s own first check, one
     * comparison) — the widened search only ever pays for itself on the rare
     * frame the trail spot genuinely lands close to the toggle.
     */
    function trailLead(): Point {
      const trailing = clampToViewport(trailBehind(grey.pos, grey.facing, CAT_W, FOLLOW_LONG_WALK_GAP));
      return resolveFollowClear(trailing, grey.pos);
    }

    /**
     * Where the pair are currently parked, resolved once per settle rather than
     * per frame — probing the page costs hit tests. Two branches want the same
     * answer: holding station with the pointer stopped, and holding it while a
     * toy is out. Cleared whenever the page underneath them can have moved.
     */
    function settled(): Spots {
      settleSpots.current ??= restingPlaces();
      return settleSpots.current;
    }

    /** The nearest pair of places to where they are standing. The answer
     *  whenever there is no mood, and the answer a mood falls back to. */
    function nearbySpots(): Spots {
      return restSpots(grey.pos, { x: grey.pos.x - CAT_W - FOLLOW_GAP, y: grey.pos.y });
    }

    /**
     * Where a tour stop wants the pair standing.
     *
     * The stop's section id is deliberately the same string `planMood`
     * dispatches on — `TOUR_STOPS` is built from `navItems`, and every section
     * id there already has a mood — so the tour's placement is the section
     * mood, asked for on demand instead of waiting for a settle. Recomputed
     * every frame the tour is walking to a stop rather than held like an
     * ordinary mood: the section is still scrolling into view, so its anchor
     * is moving, and a spot probed once at the start of that scroll would be
     * measuring ground that has since moved out from under it.
     *
     * A section whose mood declines (there is genuinely nowhere clear beside
     * whatever the mood hangs off) falls back to a spot beside the section's
     * own top edge — cruder, but still a real, content-avoiding answer rather
     * than nowhere at all.
     */
    function tourStopSpots(sectionId: string): Spots | null {
      const plan = planMood(sectionId, grey.pos, tabby.pos, homeSpot());
      if (plan) return plan.spots;
      const el = document.getElementById(sectionId);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return null;
      const anchor = { x: rect.left + 24, y: rect.top + 72 };
      return restSpots(anchor, { x: anchor.x - CAT_W - FOLLOW_GAP, y: anchor.y });
    }

    /**
     * Where the pair should be sitting, mood included.
     *
     * The section mood gets first refusal, and only ever here — which is what
     * keeps it from being a fifth kind of movement. It is a *settle position*,
     * chosen exactly where every other settle position is chosen, so every rule
     * already guarding this branch guards it for free: it cannot run while the
     * pair are being escorted, called to a nap spot, walking to bed or following
     * the pointer, because none of those branches ask this question.
     *
     * A mood once taken up is *held* rather than recomputed, and that is the
     * whole difference between a companion and a distraction. Rebuilding the
     * plan every time the spots are invalidated would mean re-measuring the
     * anchor — a rectangle travelling up the screen while the visitor scrolls —
     * and two cats lolloping after it for as long as the wheel turns. Held, they
     * sit down once when the visitor arrives and stay put; the mood is only
     * reconsidered when something has come underneath them, which is the rule
     * the ordinary resting spots have always followed and reads, correctly, as a
     * cat getting out of the way rather than a cat pacing.
     */
    function restingPlaces(): Spots {
      // A scene owns their positions while it runs: it probed its own geometry
      // against wherever they were standing when it opened, and answering
      // "where do you rest" with a spot halfway across the page mid-scene walks
      // the lead away from the ball he is supposed to be batting.
      if (playRef.current) {
        moodWalk.current = null;
        return clearFollowOfToggle(nearbySpots());
      }

      const held = moodRun.current;
      if (held?.walked && isClearSpot(held.spots.lead) && isClearSpot(held.spots.follow)) {
        return clearFollowOfToggle(held.spots);
      }

      const plan = planMood(sectionRef.current, grey.pos, tabby.pos, homeSpot());
      if (!plan) {
        moodRun.current = null;
        moodWalk.current = null;
        return clearFollowOfToggle(nearbySpots());
      }

      // A lap already walked stays walked — the memory is what makes "once"
      // mean once — but only for as long as the mood is the same one.
      const walked = held?.kind === plan.kind ? held.walked : plan.path.length === 0;
      const run: MoodRun = { kind: plan.kind, spots: plan.spots, walked };
      moodRun.current = run;

      if (walked || plan.path.length === 0) {
        run.walked = true;
        moodWalk.current = null;
      } else {
        // Same lap, re-measured: the index survives so a scroll adjusts the
        // route instead of sending them round it again.
        const index = Math.min(moodWalk.current?.index ?? 0, plan.path.length);
        if (index >= plan.path.length) {
          run.walked = true;
          moodWalk.current = null;
        } else {
          moodWalk.current = { points: plan.path, index };
        }
      }

      return clearFollowOfToggle(plan.spots);
    }

    /**
     * Where the pair are going while they are wandering, and how long they stay
     * when they get there.
     *
     * The plan is *held*, which is the same rule the moods follow and for the
     * same reason: re-asking every frame is not wandering, it is twitching. It
     * is replaced when the stay is up, when they cannot get there in a
     * reasonable time, and — from outside this function — whenever the page has
     * moved underneath them, which is what clears `wanderRun`.
     *
     * A declined plan is a real outcome on a window with no whitespace in it.
     * The answer is the nearest pair of clear spots, exactly as it is for a
     * settling cat: standing still somewhere legal, and asking again shortly.
     */
    function wanderTo(now: number): Spots {
      const run = wanderRun.current;
      if (run && now < run.until) {
        // The stay does not start until they are standing there. Four pixels is
        // the same "close enough" the queued scenes and the escort use.
        if (
          run.arrivedAt === 0 &&
          distance(grey.pos, run.spots.lead) < 4 &&
          distance(tabby.pos, run.spots.follow) < 4
        ) {
          run.arrivedAt = now;
          run.until = now + WANDER_STAY + Math.random() * WANDER_STAY_SPREAD;
          // Round 14: facing left or right at random on arrival, decoupled
          // from whichever way they were travelling to get here — see
          // `randomFacing`. Seeded from this arrival's own moment and spot
          // rather than a live `Math.random()` call, which is what makes the
          // choice a pure, testable function of "this one arrival" instead
          // of an untestable side effect of when the frame happened to land.
          run.faceLead = randomFacing(`lead:${now}:${run.spots.lead.x}:${run.spots.lead.y}`);
          run.faceFollow = randomFacing(`follow:${now}:${run.spots.follow.x}:${run.spots.follow.y}`);
        }
        return run.spots;
      }

      const chosen = planWander(sectionRef.current, grey.pos, tabby.pos, homeSpot());
      const spots = clearFollowOfToggle(chosen ?? nearbySpots());
      wanderRun.current = {
        spots,
        arrivedAt: 0,
        until: now + (chosen ? WANDER_WALK_MAX : WANDER_STAY),
        faceLead: 1,
        faceFollow: 1,
      };
      return spots;
    }

    /**
     * Is the lead cat currently wearing a focus ring?
     *
     * `:focus-visible` rather than `document.activeElement`, because the ring
     * is the thing being worked around: clicking the cat focuses him without
     * drawing one, and a scene declined for a ring nobody can see would be the
     * companion getting quieter for no reason. Guarded, because the whole
     * question is cosmetic and a browser that cannot answer it should get the
     * cats rather than an exception.
     */
    function catRinged(): boolean {
      try {
        return leadNode.current?.matches(":focus-visible") === true;
      } catch {
        return false;
      }
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
      /**
       * How many 60Hz frames' worth of time this callback is actually worth —
       * the multiplier every speed below is spent through. Exactly 1 on the
       * 60Hz display these constants were tuned against; a half on a 120Hz
       * one, where the pair used to cross the page in half the time.
       *
       * The first frame after a start is worth one reference frame by
       * definition rather than by measurement: there is no previous timestamp
       * to subtract, and guessing one is how a loop starts with a lurch.
       */
      // The floor is for a degenerate case only: a frame with no measurable
      // time in it cannot occur between two rAF callbacks, but if one ever did,
      // zero would divide into the rates below and collapse `busy` — the flag
      // that keeps a *walking* pair awake — which would stop the loop
      // mid-stride. A twentieth of a reference frame is below any display that
      // exists; it would take 1200Hz to reach it.
      const frames = lastFrameAt === 0 ? 1 : Math.max(frameStep(now - lastFrameAt), 0.05);
      lastFrameAt = now;
      /** How long the pointer has held still — what "settle" is measured on. */
      const idleFor = now - lastMoveRef.current;
      /** How long *nobody* has done anything: no pointer, no scroll, no key,
       *  no resize. What "go to bed" is measured on. Never shorter than
       *  `idleFor`, so every existing reset of the pointer clock still counts
       *  as a sign of life without having to say so twice. */
      const aloneFor = now - Math.max(lastMoveRef.current, lastSignRef.current);
      const pointer = pointerRef.current;
      /** The pointer is not one of the forces acting on them this frame. Read
       *  once, here, because half the decisions below are the same decision:
       *  there is nobody driving. */
      const wandering = wanderRef.current;
      const run = escortRef.current;
      const home = homeSpot();

      /**
       * WP-R round 15: ride the page before anything else this frame decides
       * where the pair are going — see the file banner on `rideStep` in
       * companion-motion.ts for why this has to run first. Both cats are
       * nudged by the same `dx`/`dy`, which is what keeps their own mutual
       * geometry (the follow gap, the toolkit-clearance invariant) exactly
       * as it was the instant before this translation: a uniform shift moves
       * two points the same distance in the same direction, so the vector
       * between them is untouched *by the ride itself*. It is the clamp
       * right below — applied to each cat independently — that can still
       * undo that; see the note there.
       */
      rideRef.current ??= initRide(window.scrollX, window.scrollY);
      const ride = rideStep(rideRef.current, window.scrollX, window.scrollY, now);
      if (ride.dx !== 0 || ride.dy !== 0) {
        grey.pos.x += ride.dx;
        grey.pos.y += ride.dy;
        tabby.pos.x += ride.dx;
        tabby.pos.y += ride.dy;
      }

      // Before anything else decides where they are going: make sure they are
      // still somewhere they can be seen. Every *target* below is clamped, but
      // a target is only consulted when a cat is going somewhere, and a cat
      // trailing a pointer already inside its personal space is told to stay
      // exactly where it is — so a viewport that shrinks out from under it (a
      // rotation, a window drag, devtools opening) strands it off-screen with
      // nothing to bring it back. `overflow-x: clip` on the document means
      // there is not even a scrollbar to hint at where it went. It is also
      // what keeps a rider from being carried off-screen: round 15's "does
      // not vanish" is this same clamp, run every frame regardless of why
      // `pos` moved.
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

      // `data-cat-secret`, refreshed on the same throttle as the nap rect
      // above and for the same reason: WP-E's form can be scrolled while the
      // attribute stands.
      let secret = secretRef.current;
      if (secret) {
        if (now - secret.readAt > 120) {
          secret.rect = secret.el.getBoundingClientRect();
          secret.readAt = now;
        }
        if (secret.rect.bottom < safeTop() || secret.rect.top > viewport().height) secret = null;
      }

      /**
       * D4: the guided tour, advanced before `forced` reads it.
       *
       * Outranks the nap contract on purpose — stop 6 is the career tree, and
       * its own plinth carries `data-cat-nap`, so without this the plinth's
       * dwell would hijack the tour the moment the pair arrived there. It does
       * not outrank the escort: a visitor who sends the cats to bed mid-tour
       * has `sendToBed` end the tour first (see below), so `run` is never
       * actually true at the same time as `tourRef.current` in practice — the
       * `!run` guard here is the same defensive shape `nap` is read with, for
       * the one caller that is not this component.
       */
      let tour = tourRef.current;
      if (tour && !run) {
        const stop = stopsFor(tour.route)[tour.index];
        const spots = tourStopSpots(stop.sectionId);
        // `clearFollowOfToggle` here, not at movement time: the "have we
        // arrived" check just below reads `tourSpots.current.follow`
        // directly, so the corrected value has to be what gets stored, or
        // the movement code and the arrival check end up chasing two
        // different points — see that function's own note.
        if (spots) tourSpots.current = clearFollowOfToggle(spots);
        if (!tourSpots.current) {
          // Nowhere at all for this stop. Skip it rather than strand the tour
          // on a section that has, for whatever reason, nothing clear near it;
          // give up only if it was the last one.
          if (isLastStop(tour.index)) {
            tourRef.current = null;
            tour = null;
            setTourView(null);
            duetRef.current = null;
            setDuetBeat(null);
          } else {
            tour.index += 1;
            tour.phase = "walking";
            tour.arrivedAt = 0;
            tourSpots.current = null;
            setTourView({ index: tour.index, lines: [], route: tour.route, routeChosen: tour.routeChosen });
          }
        } else if (
          tour.phase === "walking" &&
          now - lastScrollAt.current > TOUR_SCROLL_SILENCE &&
          distance(grey.pos, tourSpots.current.lead) < 4 &&
          distance(tabby.pos, tourSpots.current.follow) < 4
        ) {
          tour.phase = "arrived";
          tour.arrivedAt = now;
          const stopScene = sceneFor("tour", stop.sectionId, facts);
          setTourView({
            index: tour.index,
            lines: stopScene?.beats ?? [],
            route: tour.route,
            routeChosen: tour.routeChosen,
          });
          if (stopScene) playDuetScene(stopScene, now);

          /**
           * The play's choreography: one beat per stop, existing mechanics
           * only. About, Philosophy and Tree get nothing here on purpose —
           * the pair's own default sit, and the facing they already carry in
           * from the walk, already read as "peering up" and "looking up at
           * the figure"; adding a forced pose to a cat already sitting still
           * would be drawing the same thing twice. The rest reuse exactly
           * the windows `origin-story-beat` arms elsewhere in this file:
           * `cheerRef` for the pair flourish (grey stretches, tabby bats —
           * see the "Honestly" note on that handler for why a *pair* cheer
           * stands in for "tabby cheer" / "tabby startle-hop" alike), and a
           * `{ dir, until }` / plain-until window read directly from the
           * tour's own branches below rather than through the generic
           * `rushing`/huddle checks, which never get a turn while `forced`
           * is already `"tour"`. Every window self-expires on its own clock
           * and is read only from inside the tour's own code paths, so
           * ending the tour drops whichever of these happens to be open
           * along with everything else.
           */
          if (stop.sectionId === "work" || stop.sectionId === "lab") {
            cheerRef.current = { until: now + CHEER_MS };
            setCheer(true);
            window.setTimeout(() => setCheer(false), CHEER_MS);
          } else if (stop.sectionId === "skills") {
            tourHuddleUntil.current = now + HUDDLE_MS;
          } else if (stop.sectionId === "contact") {
            tourNapUntil.current = now + CONTACT_NAP_MS;
          }
        }
      }

      /**
       * The origin-story invitation — see `watchRef`'s declaration. Dropped
       * for good the first frame any of the four states above claims the
       * pair, exactly the asymmetric drop a running duet gets from `forced`
       * further down: none of those hand it back when they end. A running
       * story scene is dropped in the same breath — the section-change and
       * forced/dozing clears below are told to leave a `"story"` scene alone
       * (the same exemption `"tour"` already has), which is correct only
       * while the watch itself stands; the moment a real forced state (the
       * escort, the tour, a nap or the panel) takes the watch away, nothing
       * else would ever clear the orphaned bubble, so this does it directly
       * rather than leaning on a rule written for a different scene kind.
       * Otherwise refreshed like a tour stop while it stands, since
       * `tourStopSpots` this cheap is worth calling every frame rather than
       * trying to know ahead of time when the section's anchor has finished
       * settling.
       *
       * The player still has a show running when this fires — only the
       * watch is dropped, not the story — so it is told with its own
       * `"stop"` detail rather than the plain, detail-less dispatch `"end"`
       * gets elsewhere in this file: `OriginStory.tsx`'s ack listener reads
       * that detail to bring its bare-annotation fallback back rather than
       * leaving the story fully dark for whatever beats remain.
       */
      if (watchRef.current && (run || tour || nap || secret || openRef.current)) {
        watchRef.current = null;
        document.dispatchEvent(new CustomEvent("origin-story-ack", { detail: "stop" }));
        if (duetRef.current?.scene.kind === "story") {
          duetRef.current = null;
          setDuetBeat(null);
        }
      }
      const watch = watchRef.current;
      if (watch) {
        const spots = tourStopSpots("tree");
        if (spots) {
          if (rushRef.current && now < rushRef.current.until) {
            // The storm beat's startle: a short dash off the sit spot and
            // back, using the same `{ dir, until }` shape (and duration) a
            // sustained fast scroll already gives `rushRef` elsewhere in this
            // loop — no new reaction, just that jolt borrowed for one beat
            // instead of a page-length dash. `rushing` itself never reads
            // true here (it requires `!forced`, and `forced` is `"watch"`
            // for as long as this branch runs), so this is the one place the
            // ref's *shape* is reused without its usual branch.
            const startled = clampToViewport({ x: spots.lead.x + rushRef.current.dir * 20, y: spots.lead.y });
            // The naive offset behind him, same as the huddle below — see
            // `clearFollowOfToggle`, which is what actually keeps her off
            // the toolkit toggle if this lands too close.
            const naive = clampToViewport({ x: startled.x - (CAT_W + FOLLOW_GAP), y: startled.y });
            watch.spots = clearFollowOfToggle({ lead: startled, follow: naive });
          } else if (now < rainHuddleUntil.current) {
            // The rain beat's huddle: she comes in beside him instead of
            // behind, on a shorter gap than the ordinary `FOLLOW_GAP` — the
            // whole point of a huddle is that it reads tighter than usual.
            // `clearFollowOfToggle` still has the final word: if this gap
            // would leave the toolkit toggle without its required clear
            // space, it widens just enough to fix that and no more — the
            // coordinator's own call is that a huddle still reads as one at
            // the WCAG minimum.
            const naive = clampToViewport({ x: spots.lead.x - (CAT_W + 6), y: spots.lead.y });
            watch.spots = clearFollowOfToggle({ lead: spots.lead, follow: naive });
          } else {
            watch.spots = clearFollowOfToggle(spots);
          }
        }
      }

      const forced = run
        ? "escort"
        : tour
          ? "tour"
          : nap
            ? "nap"
            : secret
              ? "secret"
              : openRef.current
                ? "corner"
                : watch
                  ? "watch"
                  : null;

      // The Contact stop's startle-awake: the moment the fake-nap window
      // lapses, the pair cheer instead of just quietly opening their eyes.
      // Consumed the frame it fires (`tourNapUntil` reset to zero) so this
      // never re-fires, and gated on `forced === "tour"` so a tour that ends
      // mid-nap does not cheer on its way out.
      if (forced === "tour" && tourNapUntil.current > 0 && now >= tourNapUntil.current) {
        tourNapUntil.current = 0;
        cheerRef.current = { until: now + CHEER_MS };
        setCheer(true);
        window.setTimeout(() => setCheer(false), CHEER_MS);
      }

      // Wandering is parked by construction: "settled" means there is nothing to
      // trail, and there never is. Everything gated on it downstream — a scene
      // may open, a scene is not dropped, a mood may be taken up — is gated on
      // exactly the right thing for a visitor who is only watching.
      const parked = !forced && (wandering || !pointer || idleFor > SETTLE_AFTER);
      /** Night flavour: the bed comes `NIGHT_SLEEP_TRIM` sooner. Read from a
       *  ref rather than the two thresholds themselves, so the one number that
       *  changes with the theme is computed once a frame rather than smeared
       *  across every place `SLEEP_AFTER` used to appear. */
      const sleepAfter = nightRef.current ? SLEEP_AFTER - NIGHT_SLEEP_TRIM : SLEEP_AFTER;

      /* -------------------------------------------------------------- play -- */

      /**
       * A scene, on the rare frame every condition lines up.
       *
       * The list of things that end one is longer than the list that starts one,
       * and that asymmetry is the design: the cats' first duty is to the
       * visitor, so anything with a claim on them — the escort, a nap spot, the
       * toolkit, or simply the pointer moving again — drops the scene on the
       * frame it appears rather than finishing the beat. That holds for the
       * scenes with no prop as much as for the ones with: a chase abandoned
       * mid-sprint just leaves two cats going back to trailing the cursor.
       *
       * One exception, and it is the whole of FB-9.1: a scene the visitor
       * *asked for* is not an interruption of what they are doing, it is what
       * they are doing. Until now the panel handed one back and the very next
       * pointer move took it away — click "Toss the yarn", lift your hand off
       * the menu you just used, and the yarn was gone before it landed. So a
       * requested scene is held through the pointer, and through it alone.
       * Everything else still ends it on the frame it appears: the escort, a
       * nap spot, the panel being reopened, the page scrolling out from under
       * the probe, the mode changing, the scene finishing.
       */
      const asked =
        askedRef.current && (playRef.current !== null || queued.current !== null);
      if ((playRef.current || queued.current) && (forced !== null || (!parked && !asked))) {
        endPlay(now);
      }
      // Same rule as the one that keeps a peek from starting under a focus
      // ring, for the case where the ring arrives afterwards: a visitor who
      // tabs to the cat mid-hide gets two cats coming out from behind the
      // panel, which is at least a thing a cat does.
      if (playRef.current?.kind === "peek" && catRinged()) endPlay(now);
      // The first wait of the visit, on the clock of whichever mode the visitor
      // arrived in: somebody who reloads the page already wandering asked for
      // the shorter gap on the last visit and has not changed their mind.
      if (playAt.current === 0) playAt.current = scheduleNextPlay(now, wandering);

      /** Non-null only while the lead is actually chasing something — which a
       *  held scene outranks, because a cat cannot both act out the scene it was
       *  asked for and walk after the cursor. Computed after the cancellation
       *  above so it reads the outcome rather than racing it. */
      const chase = !forced && !parked && !asked ? pointer : null;

      /**
       * A requested scene, arriving.
       *
       * The pair are walking to ground the scene was already probed against —
       * see `stageFor` — so this is the last two pixels of that walk and the
       * moment it becomes a play. They are snapped onto the exact points that
       * were measured before it opens: at three pixels the move is invisible,
       * and it is what makes the answer the panel gave the visitor true, rather
       * than approximately true against a probe taken half a cat away.
       *
       * The re-probe can still decline, if the page moved underneath them in a
       * way no scroll or resize reported. That is rare enough to answer the way
       * an unprompted refusal is answered — back off and say nothing — because
       * the panel that would have said it is closed, and reopening it to speak
       * would be the companion interrupting the visitor.
       */
      const arriving = queued.current;
      if (arriving) {
        if (now > arriving.expires) {
          queued.current = null;
        } else if (
          distance(grey.pos, arriving.spots.lead) < 3 &&
          distance(tabby.pos, arriving.spots.follow) < 3
        ) {
          grey.pos.x = arriving.spots.lead.x;
          grey.pos.y = arriving.spots.lead.y;
          tabby.pos.x = arriving.spots.follow.x;
          tabby.pos.y = arriving.spots.follow.y;
          queued.current = null;
          const opened = openPlay(
            arriving.kind,
            arriving.spots.lead,
            arriving.spots.follow,
            grey.facing,
            now,
            sectionRef.current,
          );
          if (opened) {
            playRef.current = opened;
            setScene({ kind: opened.kind, prop: opened.prop });
          } else {
            playAt.current = now + PLAY_RETRY;
          }
        }
      }
      /** Non-null only while a requested scene is still walking to its stage. */
      const walking = queued.current;

      // The grey one's live position goes in because one scene — the gift —
      // hangs its prop off his mouth while the loop is the thing moving him.
      const scene = playRef.current ? advancePlay(playRef.current, now, grey.pos) : null;
      if (scene?.done) endPlay(now);
      /** Non-null only while a scene is actually mid-flight. */
      const beat: PlayBeat | null = scene && !scene.done ? scene : null;

      const dozing =
        forced === "escort" ||
        forced === "nap" ||
        // The Contact stop's fake-nap: a deliberate, self-expiring window
        // rather than the idle clock, so it holds regardless of how recently
        // the visitor moved anything.
        (forced === "tour" && now < tourNapUntil.current) ||
        // Excludes "watch": the origin-story show runs ~26s, well past
        // `sleepAfter` (14s, 11s at night), and the watcher is deliberately
        // motionless the entire time — nothing else refreshes `lastSignRef`
        // while it stands. Without this clause both cats would pose asleep
        // for the back half of every show, same as the tour and the escort
        // never let idle sleep claim them mid-scene. Excludes "secret" for a
        // simpler reason: WP-E's own contract is "perk up (alert pose)", so
        // idle sleep must never override it for as long as the attribute
        // stands — sitting up, not settling in, is the whole point of the
        // reaction.
        (forced !== "watch" && forced !== "secret" && !wandering && aloneFor > sleepAfter && !beat);
      /**
       * Idle sleep — the ephemeral one.
       *
       * This used to carry a `pointer !== null` clause, guarding against the
       * idle clocks starting at zero: without it a fresh load was already
       * "idle" and the first thing a visitor saw was two cats in a bed they
       * never sent them to. The clocks are stamped when the loop starts now
       * (see the effect's setup), which answers that directly, and the proxy
       * has gone with it — because it answered a different question than the
       * one it was asked. "Has a pointer ever moved" is not "is anybody here":
       * a visitor who reads by scrolling, one who tabs through from the
       * keyboard, and a laptop left open on the page all answer no forever, and
       * for all three the pair never dozed, never reached `pose === "sleep"`,
       * and so `keepGoing` below never went false. Measured: 60 frames a second
       * for as long as the tab was open, on a page nobody was touching. Never a
       * phone — `roams` needs `(pointer: fine)` — which means it was always a
       * laptop, on battery, being asked for a frame every 16ms to redraw two
       * cats who were not moving.
       *
       * The arrival the old clause was reaching for is still honoured, by the
       * clock rather than by a proxy for it: `aloneFor` cannot exceed the
       * threshold until the pair have been on screen that long.
       *
       * A running scene holds the bed off. Play can only *start* inside the
       * window between settling and dozing, but the last beat of a yarn ball —
       * or of a bowl the pair are still eating out of — can outlive it, and two
       * cats walking away mid-scene to go to bed is the one way this could read
       * as broken.
       */
      const wantsBed = !forced && !wandering && aloneFor > sleepAfter && !beat;

      // Starting one is the last thing considered, and the narrowest: settled,
      // standing still, nobody around, not on the way to bed, and the clock is
      // up. `openPlay` may still decline — a page with no whitespace near the
      // cats has nowhere safe for this, and an anchored scene has no anchor on
      // most of the page — in which case it backs off rather than re-probing the
      // layout on the next frame.
      //
      // The pointer clause is what stops a page nobody has touched producing a
      // scene at somebody who has not arrived yet. A wandering visitor has
      // arrived by definition: they pressed the control that put the cats in
      // this mode, and there is nothing further to wait for.
      if (
        !beat &&
        !forced &&
        parked &&
        !wantsBed &&
        (pointer !== null || wandering) &&
        grey.pose !== "walk" &&
        tabby.pose !== "walk" &&
        now > playAt.current
      ) {
        /*
         * The pool in order, first one that fits. A single roll followed by a
         * 25-second sulk was fine while every scene wanted nothing more than a
         * clear rectangle; three of them now want a particular thing on screen,
         * and away from the section with a panel to hide behind most rolls
         * named one that had nowhere to happen. The probing is the expensive
         * part, and this is at most eight probes on one frame, at most once
         * every thirty seconds — against a mode whose entire content is the
         * pair finding something to do.
         */
        let opened: Play | null = null;
        for (const kind of sceneOrder(wandering, { night: nightRef.current, section: sectionRef.current })) {
          // Not while the visitor is holding the lead cat on the keyboard: he
          // is a 44px control with a focus ring, and a ring is drawn around the
          // whole button whether or not the drawing inside it is clipped away.
          // A hiding cat with a blue rectangle sitting on the panel in front of
          // it reads as a rendering fault, not as a cat.
          if (kind === "peek" && catRinged()) continue;
          opened = openPlay(kind, grey.pos, tabby.pos, grey.facing, now, sectionRef.current);
          if (opened) break;
        }
        if (opened) {
          playRef.current = opened;
          // Null for the chase, which is two cats and no props — the one scene
          // that mounts nothing at all.
          setScene({ kind: opened.kind, prop: opened.prop });
        } else {
          playAt.current = now + PLAY_RETRY;
        }
      }

      /* -------------------------------------------------------------- rush -- */

      /**
       * A sustained fast scroll, still within its window. Narrower than
       * `chase`'s own gate — `!walking` and `!playRef.current` on top of
       * `!forced` and `!beat` — because a rush is a *reaction*, and every one
       * of those four is something with a stronger claim on the pair already.
       * Expired the moment `until` passes, whether or not anything else ever
       * claims it, so a dash that nobody interrupts still ends on its own.
       */
      const rushing =
        !forced &&
        !beat &&
        !walking &&
        !playRef.current &&
        rushRef.current !== null &&
        now < rushRef.current.until;
      if (rushRef.current && now >= rushRef.current.until) rushRef.current = null;
      if (cheerRef.current && now >= cheerRef.current.until) cheerRef.current = null;
      /** Only while there is genuinely nothing else going on — a cheer is a
       *  flourish, and every flourish here yields to a scene, dozing off or
       *  actually moving. Read once, close to where it is used, the same shape
       *  `rushing` is computed in. */
      const cheering = cheerRef.current !== null && !beat && !dozing;

      /* -------------------------------------------------------------- duet -- */

      // Anything with a stronger claim on the pair — the escort, a nap spot,
      // the tour, the toolkit, or idle sleep claiming them — ends a running
      // scene on the frame it appears, the same rule `endPlay` follows for a
      // scene with a prop. Tour scenes are one exception, exactly as at the
      // section-change effect: the tour is the thing doing the walking, so
      // `forced === "tour"` is not a reason to drop its own narration. Story
      // scenes are the other, and only because `forced` is expected to *be*
      // `"watch"` for as long as one is running — the watch's own drop, just
      // above, already clears a story scene the instant a real forced state
      // (escort/tour/nap/corner) takes `watchRef` away, so by the time
      // `forced` could read anything but `"watch"` or `null` here,
      // `duetRef.current` is already null and this check never has to tell
      // the difference itself. Checked before the advance below so a scene
      // cleared this frame can't also advance on it.
      if (
        duetRef.current &&
        duetRef.current.scene.kind !== "tour" &&
        duetRef.current.scene.kind !== "story" &&
        (forced || dozing)
      ) {
        duetRef.current = null;
        setDuetBeat(null);
      }

      // Advance or finish a running scene on its reading-time clock. Tour
      // scenes are exempt from the section-change cancellation (the tour
      // scrolls the page itself); everything else was already dropped by the
      // effect that watches `sectionRef`, or by the cancellation just above.
      if (duetRef.current) {
        const beat = currentBeat(duetRef.current);
        if (now - duetRef.current.beatStartedAt > beatDurationMs(beat)) {
          const next = advanceBeat(duetRef.current, now);
          duetRef.current = next;
          setDuetBeat(next ? beatView(next) : null);
        }
      }

      /**
       * D5's ambient half. Only while genuinely settled — parked, nothing
       * forced, no scene running or walking to one, not mid-rush — which is
       * exactly "the pair have nothing else to be doing", the same gate a
       * flourish gets. The clock is seeded once, on the first settled frame of
       * the visit, and re-armed by `nextDuetAt` every time it fires, whether
       * or not that firing actually started a scene — a section with nothing
       * to say (or one already shown once this visit) still spends the roll,
       * so the cadence stays the visitor's clock rather than a queue that
       * empties out on the first section with something to report.
       */
      const quiet = parked && !forced && !beat && !walking && !rushing && sectionRef.current;
      if (quiet && roamingRef.current && duetRef.current === null) {
        if (duetAt.current === 0) {
          duetAt.current = nextDuetAt(now, true, 0);
        } else if (now > duetAt.current) {
          // The first scene of the visit is the hello, deterministically — it
          // is the introduction and the discoverability fix in one. Every
          // scene after it rolls the same odds the notes used to roll.
          const first = !duetFirstShown.current;
          duetFirstShown.current = true;
          duetAt.current = nextDuetAt(now, false, Math.random());
          const scene = first
            ? sceneFor("hello", null, facts)
            : !duetShown.current.has(sectionRef.current!) && Math.random() < DUET_ODDS
              ? sceneFor("ambient", sectionRef.current, facts)
              : null;
          if (scene) {
            if (scene.kind === "ambient") duetShown.current.add(sectionRef.current!);
            playDuetScene(scene, now);
          }
        }
      }

      /* ------------------------------------------------------------ lead -- */

      let leadWant: Point;
      let followWant: Point;
      /** True only on the frames the tabby is actually booting the bed, which
       *  is the one thing that outranks "everybody is asleep" below. */
      let kicking = false;

      if (run) {
        leadWant = run.slots.lead;
        followWant = run.slots.follow;
      } else if (forced === "tour") {
        // The stop being walked to or stood at — `tourSpots` was just refreshed
        // above, before `forced` was even read, so it is never stale here.
        // Falling back to wherever they already are is defensive only: the
        // cascade above already dropped the tour the one frame it could have
        // nothing to offer.
        const spots = tourSpots.current ?? nearbySpots();
        const stopId = stopsFor(tour!.route)[tour!.index].sectionId;
        if (stopId === "skills" && now < tourHuddleUntil.current) {
          // The huddle: she comes in beside him instead of behind, the same
          // nudge the rain beat gives the watch above.
          leadWant = spots.lead;
          followWant = clampToViewport({ x: spots.lead.x - CAT_W - 6, y: spots.lead.y });
        } else {
          leadWant = spots.lead;
          followWant = spots.follow;
        }
      } else if (nap) {
        const slots = napSlots(nap.rect);
        leadWant = slots.lead;
        followWant = slots.follow;
      } else if (secret) {
        // WP-E's own contract: creep toward the form while it carries
        // `data-cat-secret` — see `secretSlots`, hugging its visible top edge
        // rather than napping beneath it the way an ordinary `data-cat-nap`
        // spot would.
        const slots = secretSlots(secret.rect);
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
      } else if (forced === "watch") {
        // Sit and watch the tree relight itself — `watch.spots` was just
        // refreshed above, before `forced` was even read, the same way
        // `tourSpots` is for a tour stop. Falling back to wherever they
        // already are is defensive only, for the one frame the section has
        // nothing clear near it at all.
        const spots = watch!.spots ?? nearbySpots();
        leadWant = spots.lead;
        followWant = spots.follow;
      } else if (rushing) {
        // A visitor travelling, not reading — see `rushing` above. The pair
        // duck to the leading edge of the page in whichever direction it is
        // moving, which is the same "get out from underfoot" instinct the
        // corner spot already gives them for the toolkit, aimed at the top or
        // bottom of the viewport instead of a fixed corner. No content probe:
        // like the corner and the bed, this is a reaction to the *page*
        // moving, not a place chosen against whatever happens to be printed
        // there this frame.
        const dir = rushRef.current!.dir;
        const view = viewport();
        const edgeY = dir === 1 ? safeTop() + 4 : Math.max(safeTop(), view.height - CAT_H - 4);
        leadWant = clampToViewport({ x: view.width - CAT_W - 26, y: edgeY });
        followWant = followHome(leadWant);
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
        // Bored, and going somewhere about it. No content probe: the corner *is*
        // the destination, it is the companion's own furniture, and it is drawn
        // where the toolkit and the resting box already are.
        const plan = (sleepPlan.current ??= {
          kick: Math.random() < KICK_ODDS,
          phase: "kick",
          at: 0,
        });
        const slots = sleepSlots();
        leadWant = slots.lead;
        if (plan.kick && plan.phase === "kick") {
          // The detour. She walks to the bed first, and only once she is
          // standing next to it does anything happen to it.
          const spot = kickSpot();
          followWant = spot;
          if (distance(tabby.pos, spot) < 4) {
            if (plan.at === 0) plan.at = now;
            kicking = true;
            if (!shovedRef.current && now - plan.at > KICK_HIT) {
              shovedRef.current = true;
              setShoved(true);
            }
            if (now - plan.at > KICK_MS) plan.phase = "settle";
          }
        } else {
          followWant = slots.follow;
        }
      } else if (beat) {
        // Playing. Where the cats go is the scene's business now: the toy scenes
        // leave the lead on the spot he settled on and only move the tabby,
        // while the bowl walks both of them over and the chase runs them halfway
        // across the page. Every position a scene can name was probed against
        // the page before it opened.
        const rest = settled();
        leadWant = beat.leadTo ?? rest.lead;
        followWant = beat.followTo ?? rest.follow;
      } else if (walking) {
        // On the way to a scene somebody asked for. Two cats crossing the page
        // are allowed to cross anything — it is stopping on a paragraph that
        // reads as broken — and both ends of this walk were probed: they are
        // standing somewhere clear, and the place they are going is clear
        // enough for the whole scene. It cannot outlast the bed either: the
        // request stamped the presence clock, and the walk gives up long before
        // `SLEEP_AFTER`.
        leadWant = walking.spots.lead;
        followWant = walking.spots.follow;
      } else if (wandering) {
        // Off about their own business. `wanderTo` owns both halves of that —
        // where, and for how long — and every place it can name went through the
        // same probe a settle position does, because it *is* one: they are going
        // there to stand there.
        //
        // Round 15's own follow-up tried putting her on `followTrailOr` here
        // too, the same as the home and mood-settle walks below — a wander
        // stay can be a long walk, and the two are otherwise on independent
        // paths that can cross wherever they happen to. It broke wander's own
        // arrival contract instead: `wanderTo`'s "have they arrived" check
        // needs `tabby.pos` within 4px of `run.spots.follow` specifically to
        // roll the stay duration and the facing, and gating her switch onto
        // that spot behind "has she caught up to the live trail first" added
        // just enough extra distance-to-close that the two of them stopped
        // reliably converging inside the timeouts this file's own coverage
        // holds them to — the "never stops moving" failure, live. Wander's
        // own walks are shorter and more local than the page-length walk the
        // home branch actually gets caught by axe on, so the exposure this
        // was meant to close is smaller here to begin with; reverted to
        // racing `going.follow` directly, exactly as before this round,
        // rather than risk a mechanism that does not reliably settle.
        const going = wanderTo(now);
        leadWant = going.lead;
        followWant = going.follow;
      } else if (!pointer || aloneFor > sleepAfter) {
        // WP-R round 15 follow-up: `restSpots` alone does not check toggle
        // clearance (see the note on `restingPlaces`'s own fix, above) — and
        // this is the branch a visitor who never moves the mouse at all (the
        // e2e case that first caught it) or who has gone idle sits in for as
        // long as that holds, so an unvetted gap here is not a one-frame
        // accident, it is the resting state itself. The walk *there* is the
        // second half of the same fix, below — this is the longest, most
        // exposed walk on the whole layer (page load to the far corner, a
        // scroll away from a fresh idle timeout), and the one that actually
        // caught axe mid-transit.
        if (!homeSpots.current) homeSpots.current = clearFollowOfToggle(restSpots(home, followHome(home)));
        leadWant = homeSpots.current.lead;
        followWant = trailLead();
      } else {
        // Pointer has stopped: hold station rather than creeping closer — but
        // hold it somewhere they are allowed to sleep, and, where the page says
        // something about where the visitor is, somewhere that answers it.
        const rest = settled();
        const lap = moodWalk.current;
        if (lap) {
          // One lap of whatever the mood is tracing, then the settle spot. Only
          // the destination was probed; the waypoints are crossed rather than
          // stopped on, which is the licence a cat trailing the pointer has had
          // all along.
          if (distance(grey.pos, lap.points[lap.index]) < 6) lap.index += 1;
          if (lap.index >= lap.points.length) {
            moodWalk.current = null;
            if (moodRun.current) moodRun.current.walked = true;
            leadWant = rest.lead;
            followWant = trailLead();
          } else {
            leadWant = lap.points[lap.index];
            // She comes along rather than waiting at the settle spot — a lap
            // walked by one cat while the other sits is not a lap, it is an
            // errand. The formula is `trailBehind` (companion-motion.ts),
            // the one round 15's own follow-up lifted out of this exact spot
            // to share with every other long walk on this layer.
            followWant = clampToViewport(trailBehind(grey.pos, grey.facing, CAT_W, FOLLOW_GAP));
          }
        } else {
          // No lap to walk — the mood is simply "sit here" (or there is no
          // mood at all). Still a walk from wherever they are now, and
          // `trailLead` covers the same as every other long walk here: he
          // can be settling into a mood far from where they currently
          // stand, most often right after a section change.
          leadWant = rest.lead;
          followWant = trailLead();
        }
      }

      /**
       * WP-R round 15: while the page is riding, `leadWant`/`followWant`
       * above are not wrong exactly — they are answering a question that
       * does not matter yet. Every one of those branches was computed
       * against `pos` values already carrying this frame's ride, so a target
       * that tracks content live (a nap spot, a tour stop, the watch) has
       * already moved by the same amount the ride just did and asking
       * `advance` to close that gap would spend a frame of real walking
       * speed correcting an error the ride already corrected — the fight the
       * file banner on `rideStep` describes. A target that does *not* track
       * content live — a held mood spot, `settleSpots`, a wander stay — is
       * worse than merely redundant: it is still sitting in the pre-scroll
       * viewport coordinates, and closing the gap to it would walk the pair
       * *against* the very ride that is holding them still over the content.
       * Either way the answer this frame is "exactly where the ride already
       * put them" — so `want` collapses onto the post-ride `pos`, `advance`
       * below correctly measures a zero-length gap and does nothing, and the
       * pose logic reads "not walking", same as any other cat truly holding
       * station.
       *
       * Two exceptions, both because they are the page already reacting to
       * this same scroll in their own, established way: `run` (the escort)
       * is walking the pair to the corner on a hard, second-counted budget,
       * and freezing it mid-scroll risks blowing `HERD_MAX`/`ESCORT_MAX` for
       * no benefit — nothing about being escorted is "reading", so there is
       * no content relationship here worth preserving. `rushing` is the
       * *other* answer this codebase already has for a fast, sustained
       * scroll — duck to the leading edge, out of the way — and letting the
       * ride override it here would silently replace one deliberate,
       * already-tested reaction with another mid-flight.
       *
       * This is the lead's own final word on it; the follower gets a second
       * one, below, after her own trailing logic has had its say — see the
       * note there for why one freeze here is not enough for both of them.
       *
       * The same `if` also corrects `tabby.pos` itself, not just her `want` —
       * see the note just inside it for why that is a second, genuinely new
       * bug rather than part of the freeze above.
       */
      if (ride.riding && !run && !rushing) {
        leadWant = grey.pos;

        /**
         * WP-R round 15 follow-up: the ride's own translation is uniform —
         * both cats move by the same `dx`/`dy`, so it cannot by itself change
         * the vector between them — but `keepInView` two lines above clamps
         * each of them independently, against bounds that know nothing about
         * the *other* animal. Ride the pair far enough toward a corner — a
         * hard vertical scroll near the top of the page is the case that
         * actually reached this — and both cats can clamp to nearly the same
         * box, collapsing whatever gap the ride itself preserved. Axe caught
         * exactly that: the follower parked inside `TOGGLE_CLEARANCE` of the
         * lead's own live button, top-right, just under the sticky header.
         *
         * `keepClearOfControl` is round 12's answer to this exact shape of
         * problem, but until now it only ever ran at the moment a *target*
         * was chosen (`clearFollowOfToggle`, for a tour or watch spot) —
         * riding never asks for a new target at all, so that chokepoint
         * never saw it. It is deliberately scoped to this same `riding &&
         * !run && !rushing` branch rather than asserted every frame: an
         * unconditional version was tried first and broke five unrelated
         * tests (the guided tour never arrived, "stays with a visitor who is
         * reading" never made it to bed, the wander scene test) — ordinary
         * trailing (`FOLLOW_GAP`, 26px) and the resting-box slots both sit
         * closer to the lead's control rect than `TOGGLE_CLEARANCE` (28px)
         * by design, and those are *motion* or momentary states this feature
         * has always allowed ("crossing something while it moves is fine;
         * parking on it is not" — the file banner's own rule). Riding is the
         * one state where that distinction collapses: `advance` is not
         * running at all while frozen, so whatever position the clamp leaves
         * the pair in this frame is not fleeting — it is what a visitor, or
         * axe, sees for as long as the ride continues. That is the one new
         * circumstance this correction exists for, so it is the only one it
         * is asked to cover.
         *
         * Routed through `resolveFollowClear` — the same widened-search
         * resolution every settle chokepoint now uses — rather than a bare
         * `keepClearOfControl` call, for the same reason (see that
         * function's own note): the cheap push can land on content while
         * frozen mid-ride exactly as it can at settle time, and refusing the
         * push outright used to leave the frame at whatever gap the ride
         * happened to collapse it to — a real, if rarer, resting violation.
         * `resolveFollowClear`'s contract (a changed value is always
         * content-clear) means this can assign unconditionally.
         */
        const followClear = resolveFollowClear(tabby.pos, grey.pos);
        tabby.pos.x = followClear.x;
        tabby.pos.y = followClear.y;
      }

      const leadDx = leadWant.x - grey.pos.x;
      if (Math.abs(leadDx) > 2) grey.facing = leadDx > 0 ? 1 : -1;
      const leadStep = advance(
        grey.pos,
        leadWant,
        run ? ESCORT_SPEED : beat?.dash ? DASH_SPEED : LEAD_SPEED,
        frames,
      );
      /**
       * The same movement as a *speed* rather than a distance, because every
       * threshold below asks a question about speed — "is he really walking",
       * "is anybody still busy" — and a distance answers it differently on
       * every display. Quoted per reference frame, so each number these are
       * compared against still means exactly what it meant at 60Hz.
       */
      const leadRate = frames > 0 ? leadStep / frames : 0;
      // Round 14: once he has actually stopped at a wandered-to spot, his
      // facing holds the roll `wanderTo` made on arrival rather than
      // whatever the travel-direction check just above last left it as —
      // see the note on `WanderRun`. Gated on `leadRate <= 0.3`, the same
      // "not really walking any more" threshold the pose branches below
      // read, so this never fights the travel-direction facing while he is
      // still closing the last few pixels of the walk.
      if (wandering && wanderRun.current?.arrivedAt && leadRate <= 0.3) {
        grey.facing = wanderRun.current.faceLead;
      }
      if (leadRate > 0.3) {
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
      } else if (cheering) {
        // D3: a copy confirmation, a sent message or a theme toggle, none of
        // which know a cat is listening — see the `cheerRef` effects above.
        // Both halves of the pair get a pose they already have; nothing new
        // is drawn for this.
        calmIdle(grey, now);
        grey.pose = "stretch";
      } else {
        // He never bats: the tail he would be batting at is his own.
        grey.pose = tickIdle(grey, now, false);
      }
      if (leadRate > 0.3) grey.phase = (grey.phase + leadStep * 0.013) % 1;
      // The idle rate is what a still cat's tail does. A beat may ask for the
      // wound-up one instead — the crouch before a pounce, the rake along a
      // rule — which is the same phase run at about the speed walking gives it,
      // so one number still drives the tail, the ear and the batting paw.
      else if (grey.pose !== "sleep")
        grey.phase = (grey.phase + (beat?.stir ? 0.02 : 0.006) * frames) % 1;

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
        // subtract: she is allowed to arrive. A dash skips the curve outright —
        // the whole read of a bolting cat is that she is already flat out — and
        // only the acceleration limiter still applies.
        followWish = beat?.dash
          ? DASH_SPEED
          : followTarget(distance(tabby.pos, followWant), 0);
      }

      // The follower's own target gets a second, final freeze here rather
      // than trusting the one set alongside the lead's above: the `chase`
      // branch just above recomputes `followWant` unconditionally (the
      // "behind him" trailing spot), which would otherwise undo it. This is
      // the value `advance` actually sees below, so it is the one that has
      // to be frozen last.
      if (ride.riding && !run && !rushing) followWant = tabby.pos;

      tabby.speed = ramp(tabby.speed, followWish, frames);
      const followDx = followWant.x - tabby.pos.x;
      if (tabby.speed > 0.25 && Math.abs(followDx) > 2) tabby.facing = followDx > 0 ? 1 : -1;
      const followStep = advance(tabby.pos, followWant, tabby.speed, frames);
      /** Her half of `leadRate` above, and for the same reason. */
      const followRate = frames > 0 ? followStep / frames : 0;
      // Round 14, her half of the same rule the lead gets above: once she has
      // actually stopped at a wandered-to spot, her facing holds `wanderTo`'s
      // own roll rather than the travel-direction check just above.
      if (wandering && wanderRun.current?.arrivedAt && followRate <= 0.3) {
        tabby.facing = wanderRun.current.faceFollow;
      }
      if (kicking && followRate <= 0.3) {
        // Outranks the sleep branch below, which would otherwise have her curled
        // up before the paw ever landed: by the time she reaches the bed the
        // idle clock is well past the threshold that says "asleep".
        calmIdle(tabby, now);
        tabby.pose = "bat";
        // The cluster is always to her right — the kick spot is off its left
        // edge — so the shove runs away from her and into the corner.
        tabby.facing = 1;
      } else if (followRate > 0.3) {
        calmIdle(tabby, now);
        tabby.pose = "walk";
      } else if (beat) {
        calmIdle(tabby, now);
        tabby.pose = beat.followPose ?? "sit";
        tabby.facing = beat.focus.x > tabby.pos.x + CAT_W / 2 ? 1 : -1;
      } else if (dozing) {
        calmIdle(tabby, now);
        tabby.pose = "sleep";
      } else if (cheering) {
        calmIdle(tabby, now);
        tabby.pose = "bat";
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
      if (followRate > 0.3) tabby.phase = (tabby.phase + followStep * 0.0115) % 1;
      else if (tabby.pose !== "sleep") tabby.phase = (tabby.phase + 0.0045 * frames) % 1;

      /* ---------------------------------------------------------- police -- */

      let policeVisual: Visual | null = null;
      if (run) {
        const cop = run.police;
        const want =
          run.phase === "herding"
            ? herdSpot(run.slots.lead, grey.pos, tabby.pos)
            : run.phase === "watching"
              ? cop.pos
              : { x: -CAT_W - 60, y: cop.pos.y };
        const copDx = want.x - cop.pos.x;
        if (Math.abs(copDx) > 2) cop.facing = copDx > 0 ? 1 : -1;
        const copStep = advance(cop.pos, want, POLICE_SPEED, frames);
        const copRate = frames > 0 ? copStep / frames : 0;
        cop.pose = copRate > 0.3 ? "walk" : "sit";
        if (copRate > 0.3) cop.phase = (cop.phase + copStep * 0.014) % 1;
        // Standing over them: face the corner he has just put them in, not the
        // door he came through.
        if (run.phase === "watching") cop.facing = 1;
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
          // In the corner. He does not turn on his heel the instant they land —
          // he sits down and watches them not get up again, which is the beat
          // that makes the whole walk read as having been his idea.
          run.phase = "watching";
          run.watchUntil = now + WATCH_MS;
          setEscort("watching");
        } else if (run.phase === "watching" && now > run.watchUntil) {
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

      /* ------------------------------------------------------- mini-Thien -- */

      /**
       * He exists only while a scene has something to translate — mounted
       * and unmounted exactly on `duetBeat` (see the render below), same as
       * the bubbles. "Walks in" is the whole of what this does: a target
       * beside whichever cat is speaking, probed once per speaker change
       * rather than every frame (`findClearSpot` is a handful of hit tests,
       * not something to spend sixty times a second on a decoration), and
       * `advance` closes the gap on the same per-frame clock as everything
       * else here. "Leaves" needs no code of its own — the wrapper simply
       * stops being rendered the instant `duetRef.current` clears, the same
       * way the toy already does.
       */
      if (duetRef.current) {
        const speaking = currentBeat(duetRef.current);
        if (thienSpeaker.current !== speaking.speaker || thienTarget.current === null) {
          if (thienSpeaker.current === null) {
            // A fresh appearance this scene: start the walk from the corner
            // rather than wherever `thien.pos` last held — page load's
            // default origin, or an earlier scene's finishing spot on the
            // far side of the page — so the very first frame he is painted
            // on is never a flash at a stale or literal (0, 0) position.
            thien.current.pos.x = home.x;
            thien.current.pos.y = home.y;
          }
          const speakerPos = speaking.speaker === "grey" ? grey.pos : tabby.pos;
          const otherPos = speaking.speaker === "grey" ? tabby.pos : grey.pos;
          thienTarget.current = findClearSpot(thienWant(speakerPos, otherPos), home, speakerPos);
          thienSpeaker.current = speaking.speaker;
        }
        const target = thienTarget.current;
        const thienDx = target.x - thien.current.pos.x;
        if (Math.abs(thienDx) > 2) thien.current.facing = thienDx > 0 ? 1 : -1;
        advance(thien.current.pos, target, THIEN_SPEED, frames);
      } else if (thienTarget.current !== null || thienSpeaker.current !== null) {
        // The scene ended by some other path than the ones that already know
        // to clear these — there are several (see every `duetRef.current =
        // null` in this file) — so this is the one place that has to be
        // right regardless of which of them fired: the next scene, on
        // whichever cat, starts its own fresh walk rather than resuming a
        // stale mark.
        thienTarget.current = null;
        thienSpeaker.current = null;
      }

      /* ----------------------------------------------------------- paint -- */

      paint(leadNode.current, grey.pos);
      paint(followNode.current, tabby.pos);
      if (run) paint(policeNode.current, run.police.pos);
      if (duetRef.current) {
        paint(thienNode.current, thien.current.pos);
        if (thienArt.current) thienArt.current.style.transform = `scaleX(${thien.current.facing})`;
        paintCaption(thienCaption.current, thien.current.pos);
      }

      // Behind something. The cut is taken from each animal's own position
      // against the edge it is hiding behind, so it is right while they are
      // still walking in and right again as they climb back out — see
      // `hideCut`. It lands on the drawing rather than on the lead's button:
      // the button is the quick-actions control, and a control clipped to two
      // thirds of itself is a control that stops taking clicks where it looks
      // like it should.
      const edge = beat?.hide ? (playRef.current?.edge ?? 0) : 0;
      tuck(leadArt.current, edge === 0 ? 0 : hideCut(grey.pos.y, edge));
      tuck(followArt.current, edge === 0 ? 0 : hideCut(tabby.pos.y, edge));

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

      // The bubbles, on the same terms: painted every frame either exists
      // rather than left static, because the settled spot they appeared
      // beside can still be nudged by `keepInView` on a resize.
      if (duetRef.current) {
        paintBubble(greyBubble.current, grey.pos);
        paintBubble(tabbyBubble.current, tabby.pos);
      }

      // The collision fix: bubble and caption rects register as occupied
      // space so the placement probe (`isClearSpot`, `findClearSpot`,
      // `standingSpots`) never approves a spot underneath one — see
      // `setReservedRects` in companion-space.ts for why this cannot simply
      // be "another thing `elementBehind` sees". Read every frame a scene is
      // actually showing, the same cadence `paintBubble` already reads
      // `offsetWidth`/`offsetHeight` at; cleared the one frame nothing is.
      if (duetRef.current) {
        const rects: DOMRect[] = [];
        const greyRect = greyBubble.current?.getBoundingClientRect();
        const tabbyRect = tabbyBubble.current?.getBoundingClientRect();
        const captionRect = thienCaption.current?.getBoundingClientRect();
        if (greyRect) rects.push(greyRect);
        if (tabbyRect) rects.push(tabbyRect);
        if (captionRect) rects.push(captionRect);
        setReservedRects(rects);
      } else {
        setReservedRects([]);
      }

      // The lead's own live rect, registered as a control the *follower*
      // must never be placed on top of — see `clearsControls` and its own
      // note on why this cannot simply join `setReservedRects` above.
      //
      // Computed from `grey.pos` and the fixed padded box a roaming lead is
      // drawn in (see `LEAD_PAD_X`/`LEAD_PAD_Y` and the button's own inline
      // style in the render below), never read off the DOM. A throttled
      // `getBoundingClientRect()` used to sit here, and it went stale under
      // load exactly when it mattered: the origin-story watch moves the
      // pair every frame, and a photograph of "where the toggle was" a
      // throttle-interval ago is a photograph of the wrong place while
      // they're mid-stride into a huddle. This has no interval to fall
      // behind — it is arithmetic on the same state the paint call two
      // lines below writes to the DOM, so it is current on every frame the
      // loop runs, roaming or not.
      setControlRects(roamingRef.current ? [leadControlRect(grey.pos)] : []);

      if (now - lastTone.current > TONE_INTERVAL) {
        lastTone.current = now;
        syncTone(leadNode.current, centreOf(grey.pos));
        syncTone(followNode.current, centreOf(tabby.pos));
        if (run) syncTone(policeNode.current, centreOf(run.police.pos));
        // The bubbles are opaque line work on the same fixed layer as the
        // cats and the toy, so they need the same repointing over a
        // `contrast` section — see FB-9.2, in the render below.
        if (duetRef.current) {
          syncTone(greyBubble.current, centreOf(grey.pos));
          syncTone(tabbyBubble.current, centreOf(tabby.pos));
          // Mini-Thien and his caption are on the same fixed layer, opaque
          // line work exactly like the bubbles beside them, and need the
          // same repointing for the same reason.
          const thienCentre = {
            x: thien.current.pos.x + THIEN_W / 2,
            y: thien.current.pos.y + THIEN_H / 2,
          };
          syncTone(thienNode.current, thienCentre);
          syncTone(thienCaption.current, thienCentre);
        }
        // Line work on the same fixed layer as the cats, so it needs the same
        // repointing: a toy that stayed root-coloured would vanish over a
        // contrast section exactly as the cats used to.
        if (beat) syncTone(toyNode.current, beat.focus);
        // The furniture is opaque line work on the same fixed layer, so it has
        // the cats' problem twice over: the strokes have to be visible over a
        // `contrast` section, and the knockout under them has to be that
        // section's own ground. Both layers, because the carton's front panel is
        // a separate element sitting in front of the animals. A scroll resets
        // `lastTone` and wakes the loop for one frame, which is all this needs
        // even once they are asleep.
        if (matRef.current || matFrontRef.current) {
          const box = clusterBox();
          const at = { x: box.left + CLUSTER_W / 2, y: box.top + CLUSTER_H / 2 };
          syncTone(matRef.current, at);
          syncTone(matFrontRef.current, at);
        }
      }

      const asleep = grey.pose === "sleep" && tabby.pose === "sleep";
      const busy = leadRate > 0.05 || followRate > 0.05 || run !== null;
      // Idle sleep in the bed *is* asleep: once they are curled up in it the
      // loop stops exactly as it always did when they fell asleep on the spot.
      // The pointer handler restarts it.
      const keepGoing = busy || !asleep;

      // The bed shows the moment they set off for it, so a visitor watching
      // sees where they are going rather than two cats wandering away.
      const nextBed: Bed = wantsBed ? (asleep && !busy ? "asleep" : "walking") : null;
      if (nextBed !== bedRef.current) {
        bedRef.current = nextBed;
        if (!nextBed) {
          travelRef.current = 0;
          // A new bedtime rolls its own detour, and the bed goes back where it
          // belongs: the shove is part of a nap, not a fact about the corner.
          sleepPlan.current = null;
          if (shovedRef.current) {
            shovedRef.current = false;
            setShoved(false);
          }
        }
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
        wanderRun.current = null;
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
        // A destination chosen against the old layout is a destination that may
        // now be under a paragraph, so it is dropped with the settle spots.
        wanderRun.current = null;
        lastTone.current = 0;
        // A scene's clearance was probed against the layout as it stood when it
        // opened, and this is the event that says that layout has moved. The
        // cats re-probe and shuffle; a toy cannot, so it goes.
        endPlay();
        wake();
      }, 250);
    };

    /**
     * Scroll anticipation's own half of the work — see `detectRush` in
     * companion-moods.ts for the arithmetic this feeds. A window rather than a
     * single delta: one big wheel tick and a sustained flick both move the
     * page fast, and only the second one is a rush. The window resets on any
     * pause longer than the hold time asks for, so a scroll that stops and
     * restarts has to earn the reaction again rather than carrying a stale
     * head start.
     */
    const onScrollEvent = () => {
      lastScrollAt.current = performance.now();
      const now = lastScrollAt.current;
      const y = window.scrollY;
      const win = rushWindow.current;
      if (!win || now - win.at > RUSH_HOLD_MS + 120) {
        rushWindow.current = { y, at: now };
      } else if (detectRush(Math.abs(y - win.y), now - win.at)) {
        rushRef.current = { dir: y > win.y ? 1 : -1, until: now + RUSH_HOLD_MS + 500 };
      }
      onPageMoved(false);
    };
    const onScroll = onScrollEvent;
    const onResize = () => onPageMoved(true);

    restart.current = start;
    refreshSafeArea();
    // The presence clock starts when the pair do. Both refs begin at zero, so
    // without this `aloneFor` is really "how long since navigation started" —
    // and a page that took its time getting here, or one restored into a
    // foreground tab, would hand a visitor two cats already past the bedtime
    // threshold the first frame they are drawn. Stamped for exactly the reason
    // `onVisibility` above and the teardown below already stamp it: the pair
    // coming alive is not evidence that nobody is here, and it must not be
    // counted as fourteen seconds of it.
    lastSignRef.current = performance.now();
    lastMoveRef.current = lastSignRef.current;
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
      sleepPlan.current = null;
      shovedRef.current = false;
      travelRef.current = 0;
      lastMoveRef.current = performance.now();
      setBed(null);
      setShoved(false);
      // Nor does a toy. It is only ever advanced from inside this loop, so one
      // left behind would be a drawing stopped mid-roll on the page.
      endPlay();
      // Nor a tour or a duet scene — both are only ever advanced from inside
      // this loop too, and a mode change mid-tour (touch/reduced-motion never
      // reach here, but the visitor sending the cats to bed does) must not
      // leave the HUD or a bubble on the page with nothing left driving it.
      tourRef.current = null;
      tourSpots.current = null;
      tourHuddleUntil.current = 0;
      tourNapUntil.current = 0;
      setTourView(null);
      duetAt.current = 0;
      // duetFirstShown stays put: the hello is a once-per-visit scene (see
      // its declaration above), and a bed/wake cycle is not a new visit.
      duetRef.current = null;
      setDuetBeat(null);
      // Nor the origin-story watch. This loop is the only thing that ever
      // advances it (see the effect below), so `loopActive` going false —
      // the visitor turning roaming off mid-show, same as `roams` itself
      // dropping — is the one watch-drop site that reaching into `watchRef`
      // from inside the loop's own frames can never catch, because there is
      // no frame left to reach from. `"stop"`, not the plain `"end"` this
      // file also dispatches elsewhere: the story itself is still running,
      // only the cats' narration of it just went dark.
      if (watchRef.current) {
        watchRef.current = null;
        document.dispatchEvent(new CustomEvent("origin-story-ack", { detail: "stop" }));
      }
      window.clearTimeout(recheck);
      restart.current = null;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
    // `facts` is a dependency in name only: it is a small object computed once
    // on the server and handed down from `layout.tsx`, never reconstructed
    // for the lifetime of the page, so this never actually re-runs on its
    // account. Listed anyway because the tour and the duet both close over it
    // for their narration — `beatView` and `playDuetScene` are listed for the
    // same reason: both are stable across the page's lifetime, since both are
    // only ever rebuilt when `facts` is.
  }, [loopActive, wake, endPlay, facts, beatView, playDuetScene]);

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
    escortRef.current = {
      phase: "herding",
      startedAt: performance.now(),
      watchUntil: 0,
      slots,
      police: cop,
    };
    setEscort("herding");
    wake();
  }, [mode, wake]);

  /* ------------------------------------------------------------ origin story */

  /**
   * The origin-story overlay (`OriginStory.tsx`) dispatches `"origin-story"`
   * on `document` — `"start"` once on mount, `"end"` exactly once on every
   * exit. Neither carries a payload beyond that, so that much is the whole
   * contract.
   *
   * `"start"` only sets `watchRef` — see its declaration — when nothing
   * already has a stronger claim on the pair; a visitor mid-tour, mid-nap or
   * with the panel open keeps whatever they already have, the same refusal
   * every other invitation in this file gives a claimed pair. Accepting also
   * answers the player with `origin-story-ack`'s `detail: "start"`, which is
   * what tells it to hide its own bare-annotation fallback — the player is
   * listening for this before it ever dispatches `"start"` (see its own
   * mount effect's comment), so there is no race to lose here.
   *
   * The same `origin-story-ack` event carries a second detail, `"stop"`,
   * dispatched from every site in this file that drops `watchRef` *without*
   * the story itself ending — the per-frame drop a few dozen lines above
   * (toolkit open, escort, tour, nap) and the loop's own cleanup (roaming
   * turned off, or `roams` itself dropping). The player's own ack listener
   * treats that as "the cats stopped narrating, not the show" and brings
   * its fallback annotation back rather than sitting fully dark for
   * whatever beats remain — see its `catsNarrating` state.
   *
   * `"end"` clears `watchRef` unconditionally (it may already be null, if
   * the invitation was declined or a stronger claim dropped it while the
   * show played) and drops a running story bubble with it — a beat still
   * reading out a show that has already ended is exactly the "narrating
   * something that is no longer true" a scene's stronger claims elsewhere in
   * this file are written to avoid — then, the one further bit of narration
   * this gets, queues the tree's own encore if the pair are otherwise doing
   * nothing and the visitor is still looking at it. No new scene:
   * `sceneFor("encore", "tree", facts)` already exists and is exactly about
   * the tree lighting up.
   */
  useEffect(() => {
    if (!roams || !roaming) return;

    const onOriginStory = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail === "start") {
        if (escortRef.current || tourRef.current || napRef.current || openRef.current) return;
        watchRef.current = { spots: null };
        // Every run opens on the same voice, and with no choreography window
        // left armed from a previous run.
        storySpeakerRef.current = "grey";
        rushRef.current = null;
        rainHuddleUntil.current = 0;
        lastSignRef.current = performance.now();
        document.dispatchEvent(new CustomEvent("origin-story-ack", { detail: "start" }));
        wake();
      } else if (detail === "end") {
        watchRef.current = null;
        if (duetRef.current?.scene.kind === "story") {
          duetRef.current = null;
          setDuetBeat(null);
        }
        // A show that ends mid-storm (or just after one) can leave `rushRef`
        // armed for up to ~780ms past `"end"` — and unlike `rainHuddleUntil`,
        // which only ever matters inside the `if (watch)` block this show is
        // the only thing that runs, `rushRef` also feeds the ordinary
        // scroll-triggered `rushing` check a few lines into the loop, gated
        // on nothing but `!forced`. Left armed, that reads as a page-edge
        // dash nobody scrolled for — a phantom rush the instant the pair
        // stop being forced to watch. `cheerRef` is the same shape of leak:
        // it feeds `cheering`, which is gated on `!beat && !dozing` only, not
        // on the watch. Both are cleared here for the same reason `"start"`
        // clears them before arming anything new.
        rushRef.current = null;
        cheerRef.current = null;
        const quiet =
          !escortRef.current &&
          !tourRef.current &&
          !napRef.current &&
          !openRef.current &&
          !playRef.current &&
          !queued.current &&
          !duetRef.current;
        if (quiet && sectionRef.current === "tree") {
          const scene = sceneFor("encore", "tree", facts);
          if (scene) playDuetScene(scene, performance.now());
        }
        wake();
      }
    };

    /**
     * One beat of the show, narrated. Guarded on `watchRef.current` rather
     * than on `forced` (unavailable here — this fires from a DOM event, not
     * from inside the loop): the watch is the pair's only claim to be
     * standing there at all, so a beat that arrives after it has been
     * dropped — the visitor scrolled away, or a stronger claim took the pair
     * mid-show — narrates nothing rather than starting a scene nobody is
     * sitting still to deliver.
     *
     * The speaker alternates every beat, including a duplicate first beat —
     * React Strict Mode's dev-only double-invocation of `OriginStory`'s own
     * mount effect can dispatch the flight beat twice in immediate
     * succession. Flipping twice back-to-back is harmless (the second call's
     * `playDuetScene` simply supersedes the first's before either paints),
     * and every choreography window below is armed by writing a fresh
     * `{ until }`, not by toggling a flag — so replaying a beat re-arms the
     * same window rather than corrupting it.
     *
     * `detail?.kind` rather than a bare destructure: the payload comes in as
     * an untyped `CustomEvent`, not through anything TypeScript checks, so an
     * unrecognised or missing kind is read as "nothing to say" — the early
     * return below — rather than trusted all the way into `storyBeatScene`
     * and the `if`/`else if` chain past it.
     */
    const onOriginStoryBeat = (event: Event) => {
      if (!watchRef.current) return;
      const detail = (
        event as CustomEvent<{ kind?: StoryBeatKind; year?: number; storm?: boolean; sub?: string }>
      ).detail;
      const kind = detail?.kind ?? null;
      if (!kind) return;
      // `kind` is always the beat's *base* weather now (never `"storm"` —
      // `origin-story.ts`'s `Season.kind` stopped producing it); `storm` is
      // the separate, independent fact that a milestone rode in on top of
      // whichever base weather this year already had. See `storyBeatScene`'s
      // own doc comment (companion-dialogue.ts) for why both travel to it.
      const storm = detail?.storm === true;
      const speaker = storySpeakerRef.current;
      storySpeakerRef.current = speaker === "grey" ? "tabby" : "grey";
      const now = performance.now();
      const scene = storyBeatScene(kind, detail?.year ?? null, facts, speaker, storm);
      if (scene) playDuetScene(scene, now);

      // Choreography, existing mechanics only. This only arms a window (a
      // `{ dir?, until }`, the same shape `rushRef`/`cheerRef` already use
      // elsewhere in this file); the watch's own per-frame spot refresh,
      // above in the loop, is what actually moves anyone while the window is
      // open, and both windows self-expire the same way those refs already
      // do. The base kind drives the pair's ordinary reaction — rain gets
      // the huddle, sun gets the cheer — and `storm`, independently, ADDS
      // the startle dash on top of whichever of those just armed: a rain
      // year with a storm riding in still huddles, but also startles: the
      // dash's own window (`rushRef`) is checked ahead of the huddle's in
      // the per-frame read above, so the pair visibly startles first and
      // settles back into the huddle once that window lapses, rather than
      // the two fighting over the same beat.
      if (kind === "rain") {
        rainHuddleUntil.current = now + HUDDLE_MS;
      }
      if (storm) {
        rushRef.current = { dir: lead.current.facing === 1 ? -1 : 1, until: now + RUSH_HOLD_MS + 500 };
      }
      // Spec §2: "any growth year (forces > 0) → a small excited hop (cheer
      // on the tabby)". `forces > 0` is exactly "rain or sun as a base kind,
      // or a storm rode in" — "quiet" with no storm is the one year with
      // nothing at all to cheer about. Honestly: there is no tabby-only hop
      // anywhere in this file, only the existing pair flourish (grey
      // stretches, tabby bats) D3 already gives a copy confirmation or a
      // theme toggle — see `cheerNow` a few effects up, mirrored here rather
      // than called directly since that closure belongs to a different
      // effect. Reusing that pair reaction rather than inventing a one-cat
      // version is "existing mechanics only" winning over the spec's
      // literal "on the tabby".
      if (kind === "rain" || kind === "sun" || storm) {
        cheerRef.current = { until: now + CHEER_MS };
        setCheer(true);
        window.setTimeout(() => setCheer(false), CHEER_MS);
      }
      lastSignRef.current = now;
      wake();
    };

    document.addEventListener("origin-story", onOriginStory);
    document.addEventListener("origin-story-beat", onOriginStoryBeat);
    return () => {
      document.removeEventListener("origin-story", onOriginStory);
      document.removeEventListener("origin-story-beat", onOriginStoryBeat);
      watchRef.current = null;
    };
  }, [roams, roaming, facts, playDuetScene, wake]);

  /* --------------------------------------------------------- tone: parked */

  /**
   * The roaming loop repoints its own cats as they fly over sections. Anything
   * parked in the corner — the resting box, and the pinned toolkit button on
   * touch or reduced motion — has no loop, so it samples on scroll instead.
   */
  useEffect(() => {
    const nodes: HTMLElement[] = [];
    if (mode === "resting" && boxRef.current) nodes.push(boxRef.current);
    if (roaming && !roams && leadNode.current) nodes.push(leadNode.current);
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
  }, [mode, roaming, roams]);

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

  /**
   * A scene, because somebody asked for one.
   *
   * The whole of "on demand" is the two lines that move the settle clock. A
   * scene may only open while the pair are parked and the visitor is doing
   * nothing, and both of those are true the instant somebody clicks a button in
   * a panel the cats are already sitting under — so rather than adding a second
   * way in past the gate, this backdates the clock the gate reads. Everything
   * downstream is then the ordinary path: the same `openPlay` probe against the
   * same page, the same beat machinery, and the same cancellation, since the
   * very next pointer move stamps the clock forward again and the loop drops the
   * scene on that frame.
   *
   * What it does *not* do any more is ask that question of one arbitrary spot.
   * Round 7 probed from wherever the cats stood at the moment of the click,
   * which is the corner the open panel calls them to — or, if the panel had
   * only just opened, some point on the walk there. Neither is a place anybody
   * chose, the corner is never probed at all, and the result was a button whose
   * answer depended on how long the panel had been open and three sections that
   * refused everything. `stageFor` asks the page instead: if the scene fits
   * where they are, it opens there; if it fits anywhere else, they walk over
   * and it opens when they arrive; and only if it fits nowhere is the answer no.
   * See the loop, which owns the walk and abandons it on anything that would
   * have ended a running scene.
   *
   * Two things have to happen by hand, and both are about the panel. It has to
   * close, because an open toolkit calls the cats home and the loop would end
   * the scene as fast as this starts it — and `openRef` has to be written
   * synchronously, because the effect that mirrors it runs after the commit and
   * a frame can land in between. And focus has to go back to the cat, exactly as
   * Escape does, since the element the visitor pressed is about to unmount.
   */
  const requestPlay = useCallback(
    (kind: SceneKind): PlayRequest => {
      // Nothing to run a scene in: no roaming loop on touch or under reduced
      // motion. The panel does not offer play there, so this is a guard rather
      // than a path.
      if (!roams || !roaming) return "no-room";

      const now = performance.now();
      endPlay(now);
      const here: Spots = { lead: { ...lead.current.pos }, follow: { ...follow.current.pos } };
      const stage = stageFor(kind, here, lead.current.facing, now);
      if (!stage) {
        // Nowhere on the page for this one. Back the idle schedule off exactly
        // as an unprompted refusal does, and let the panel say so.
        playAt.current = now + PLAY_RETRY;
        return "no-room";
      }

      // Asked for, so the loop holds it against the pointer. Set after the
      // `stage` check: a request with nowhere to happen started nothing, and a
      // flag with no scene under it would outlive the refusal.
      askedRef.current = true;
      lastMoveRef.current = now - SETTLE_AFTER - 1;
      lastSignRef.current = now;
      settleSpots.current = null;
      moodWalk.current = null;
      playAt.current = scheduleNextPlay(now, wanderRef.current);
      if (stage.play) {
        playRef.current = stage.play;
        setScene({ kind: stage.play.kind, prop: stage.play.prop });
      } else {
        // It fits somewhere else. The panel still closes and still says yes:
        // the walk is a second or so, the visitor sees two cats set off, and
        // the scene opens under them when they get there.
        queued.current = { kind, spots: stage.spots, expires: now + STAGE_WALK_MAX };
      }
      openRef.current = false;
      setOpen(false);
      leadNode.current?.focus();
      wake();
      return "playing";
    },
    [endPlay, roaming, roams, wake],
  );

  /** Smooth-scrolls a stop's section into view. The tour's own scroll, not the
   *  visitor's — `lastScrollAt` picks it up through the ordinary `scroll`
   *  listener exactly as any other scroll would, which is what lets arrival
   *  wait for it to finish rather than needing to know it was this call. */
  function scrollToStop(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /**
   * D4/D5: the guided tour's one way in.
   *
   * Refuses on the same two grounds `ToolkitPanel` only ever shows one
   * message for: no roaming loop (touch, reduced motion), or this page does
   * not have the first stop on it at all — `/resume` reads the same content
   * through a different template with no `id="about"` section, so the tour
   * would have nowhere to start. Checking the element directly rather than
   * only the route is what keeps this correct if that template ever changes
   * without this file being told.
   */
  const requestTour = useCallback((): TourRequest => {
    if (!roams || !roaming) return "refused";
    if (pathname === "/resume") return "refused";
    const first = TOUR_STOPS[0];
    if (!document.getElementById(first.sectionId)) return "refused";

    const now = performance.now();
    endPlay(now);
    const started = startTour();
    tourRef.current = started;
    tourSpots.current = null;
    tourHuddleUntil.current = 0;
    tourNapUntil.current = 0;
    setTourView({ index: 0, lines: [], route: started.route, routeChosen: started.routeChosen });
    scrollToStop(first.sectionId);
    // Same two lines `requestPlay` uses to backdate the settle clock: the
    // pair are about to start walking, which the loop should treat exactly
    // like a pointer that just stopped moving rather than waiting out
    // `SETTLE_AFTER` first.
    lastMoveRef.current = now - SETTLE_AFTER - 1;
    lastSignRef.current = now;
    lastScrollAt.current = now;
    openRef.current = false;
    setOpen(false);
    wake();
    return "started";
  }, [endPlay, pathname, roaming, roams, wake]);

  /** The HUD's "Next stop" / "Finish tour". */
  function advanceTour() {
    const run = tourRef.current;
    if (!run) return;
    if (isLastStop(run.index)) {
      endTour();
      return;
    }
    run.index += 1;
    run.phase = "walking";
    run.arrivedAt = 0;
    tourSpots.current = null;
    setTourView({ index: run.index, lines: [], route: run.route, routeChosen: run.routeChosen });
    duetRef.current = null;
    setDuetBeat(null);
    scrollToStop(stopsFor(run.route)[run.index].sectionId);
    lastSignRef.current = performance.now();
    wake();
  }

  /**
   * The HUD's fork in the walk, offered once — see `TourHud`'s
   * `showRouteChoice` — after Philosophy's scene. Picking either cat settles
   * `route` for the rest of the walk and immediately does what "Next stop"
   * would have: the choice replaces that button at this one juncture, it
   * does not sit beside it.
   */
  function chooseRoute(route: TourRoute) {
    const run = tourRef.current;
    if (!run || run.routeChosen) return;
    run.route = route;
    run.routeChosen = true;
    advanceTour();
  }

  /** The HUD's "End tour", Escape, and every cancellation listener below.
   *  Idempotent — a visitor pressing Escape twice, or a cancellation firing
   *  after the tour has already finished on its own, does nothing the second
   *  time. Focus goes back to the cat, exactly as it does leaving the panel. */
  function endTour() {
    if (!tourRef.current) return;
    tourRef.current = null;
    tourSpots.current = null;
    tourHuddleUntil.current = 0;
    tourNapUntil.current = 0;
    // Left armed, either window reads as a phantom flourish the instant the
    // pair stop being forced — the same leak `origin-story`'s own "end"
    // handler guards against, for the same reason. See that handler's note.
    rushRef.current = null;
    cheerRef.current = null;
    setTourView(null);
    duetRef.current = null;
    setDuetBeat(null);
    lastSignRef.current = performance.now();
    wake();
    leadNode.current?.focus();
  }

  /**
   * Cancellation: any *input*, never scroll position.
   *
   * The tour drives its own `scrollIntoView` between every stop, so ending on
   * "the page scrolled" would have the tour cancel itself the instant it
   * moves the pair to the next stop. What actually says "the visitor wants
   * out" is a wheel, a touch drag, the keys a visitor uses to scroll by hand,
   * a click outside the HUD, or Escape — none of which the tour's own walk
   * ever produces.
   */
  useEffect(() => {
    if (!tourView) return;
    tourHudRef.current?.focus();

    const SCROLL_KEYS = new Set([
      "ArrowDown",
      "ArrowUp",
      "ArrowLeft",
      "ArrowRight",
      "PageDown",
      "PageUp",
      "Home",
      "End",
      " ",
    ]);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        endTour();
        return;
      }
      // Space both scrolls the page *and* activates whichever element has
      // focus — the two collide the moment that element is one of the HUD's
      // own buttons, where a visitor pressing Space to press "Next stop"
      // used to also end the tour out from under the very click it was
      // activating. Every other scroll key still cancels regardless of what
      // has focus: none of them double as a HUD control's own activation key.
      if (event.key === " " && tourHudRef.current?.contains(document.activeElement)) return;
      if (SCROLL_KEYS.has(event.key)) endTour();
    };
    const onWheel = () => endTour();
    const onTouchMove = () => endTour();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!tourHudRef.current?.contains(target)) endTour();
    };

    document.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("pointerdown", onPointerDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourView !== null]);

  /** Every deliberate change of mode ends the idle sleep with it: it is a state
   *  about being left alone, and none of these are being left alone. Leaving it
   *  set would also gate the pointer handler, so the cats would come back from
   *  the resting box and walk straight into the bed again. */
  function clearBed() {
    bedRef.current = null;
    sleepPlan.current = null;
    shovedRef.current = false;
    travelRef.current = 0;
    lastMoveRef.current = performance.now();
    setBed(null);
    setShoved(false);
  }

  function sendToBed() {
    setOpen(false);
    endTour();
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
    // Back into whichever way of being out they were in when they went to bed.
    // Waking is undoing the bed, and a visitor who had taken the cats off the
    // cursor did not ask for them back on it — see `roamingChoice`.
    setCompanionMode(roamingChoice());
  }

  /**
   * On or off the cursor.
   *
   * The panel stays open, deliberately: nothing it holds has unmounted, the
   * item the visitor just pressed is still under their finger with the opposite
   * sentence on it, and that flip is the whole confirmation. It is also why
   * there is no `focusWish` here — unlike the bed and the wake button, this
   * control survives what it does, so focus has nowhere to be handed to.
   *
   * The scene timer is re-rolled on the new mode's clock. The ref survives a
   * mode change on purpose — a visitor who has half waited one out should not be
   * sent back to the start of it by a tab switch — but this is not a tab switch:
   * it is somebody saying what they want the cats doing, and answering that with
   * a wait set under the other set of rules is answering the wrong question.
   */
  function wanderCats() {
    clearBed();
    endPlay();
    const next = mode === "wander" ? "roam" : "wander";
    playAt.current = scheduleNextPlay(performance.now(), next === "wander");
    setCompanionMode(next);
  }

  const showRoamers = roaming || escort === "herding";
  const police = frame.police ?? RESTING_VISUAL;

  const leadDrawing = roams ? (
    <span
      ref={leadArt}
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
    // `data-cat-play` names the scene currently running, and is the only handle
    // anything outside this component has on one — the chase draws no prop at
    // all, so without it "a scene is happening" is unobservable from the DOM.
    <div
      data-companion=""
      data-cat-play={scene?.kind}
      // Round 11's three, all rare-commit React state rather than anything
      // read every frame — see the refs each mirrors above. Present only when
      // true/non-null, so a page nobody has touched carries none of them.
      data-cat-tour={tourView ? "true" : undefined}
      data-cat-intent={intent ?? undefined}
      data-cat-cheer={cheer ? "true" : undefined}
      className="no-print pointer-events-none fixed inset-0 z-40"
    >
      {/* Drawn before the cats on purpose: they sleep *in* this furniture, so
          the bed, the paper and the back of the carton have to be underneath
          them in paint order. The carton's front panel is a second element
          further down, after the animals — which is the only way a cat can be
          inside a box in a drawing with no depth. Roaming only: the resting box
          below occupies the same corner and the two never coexist. */}
      {roams && roaming && bed ? (
        <IdleFurniture
          layer="back"
          asleep={bed === "asleep"}
          shoved={shoved}
          containerRef={matRef}
        />
      ) : null}

      {/* The toy, under the cats in paint order so a paw lands on top of it.
          Decoration in the strictest sense: no accessible name, no pointer
          events (it inherits `none` from the root and says so anyway), and no
          state that outlives the scene — the whole element is gone the moment
          the play ends. Roaming only; there is no scene to play without a
          loop to run it. */}
      {/*
        `text-fg-muted` here and on every drawing below is load-bearing, and it
        is the fix for FB-9.2. `syncTone` repoints this element's *aliases* to
        whatever section it is flying over, but `color` is inherited as a value
        that was already resolved on the layer root — outside every tone scope
        — so a drawing that never names a colour of its own keeps the root's
        ink no matter what class lands on it. Over the Closing section in day
        theme that ink is the section's own ground, and the follower, the toy
        and the bed were invisible. Naming the alias on the same element the
        tone class lands on is what makes the repointing reach `currentColor`.
      */}
      {roams && roaming && scene?.prop ? (
        <div
          ref={attachToy}
          data-cat-toy=""
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 text-fg-muted"
          style={{ width: TOY_W, height: TOY_H }}
        >
          <CompanionToy kind={scene.prop} artRef={toyArt} spinRef={toySpin} />
        </div>
      ) : null}

      {roaming ? (
        <button
          ref={roams ? attachLead : attachPinnedLead}
          type="button"
          onClick={() => {
            // Mid-tour the lead cat is still the same button, but pressing it
            // means "stop this" rather than "open the panel" — the panel has
            // nothing to say while the HUD is up, and a visitor who has found
            // the cat again has found the one thing on the page that ends a
            // tour without hunting for the HUD's own button.
            if (tourView) {
              endTour();
              return;
            }
            setOpen((value) => !value);
          }}
          aria-expanded={open}
          aria-controls={PANEL_ID}
          className={cn(
            "pointer-events-auto absolute grid place-items-center",
            "text-fg-muted transition-colors duration-200 hover:text-fg",
            // Two placement modes, never both. When roaming, the rAF loop owns
            // `transform` and the inline `left`/`top` below place the origin —
            // and there is deliberately no CSS transition on either, because a
            // transition layered over a per-frame write fights the loop and
            // smears the motion. When not roaming, the pair is simply pinned to
            // the corner.
            !roams && "bottom-6 right-6",
          )}
          // The margin around the drawing is the hit target, and while the loop
          // owns the transform the button is inset by exactly that margin: the
          // drawing is centred in the padding, so pulling the box back by
          // `LEAD_PAD_*` lands the *animal* on the transform origin. That is
          // what makes a roaming cat's position mean the same thing for the
          // padded lead as it does for the bare follower — and what the content
          // probe is measuring when it says a spot is clear. The box itself is
          // untouched: 58×48 of target either way.
          style={{
            width: (roams ? CAT_W : CAT_W * 2) + LEAD_PAD_X * 2,
            height: CAT_H + LEAD_PAD_Y * 2,
            ...(roams ? { left: -LEAD_PAD_X, top: -LEAD_PAD_Y } : null),
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
          className="absolute left-0 top-0 text-fg-muted"
          style={{ width: CAT_W, height: CAT_H }}
        >
          <span className="block" style={{ transform: `scaleX(${frame.lead.facing})` }}>
            <CompanionCat variant="grey" {...frame.lead} />
          </span>
        </div>
      ) : null}

      {roams && showRoamers ? (
        escort === null && tourView === null && mode !== "resting" ? (
          // The storyteller control: a tap advances the running scene a beat,
          // opens the encore behind an ambient scene's last line, or starts
          // one for whichever section this is, all through `tapTabby`. Not a
          // button mid-escort/tour/nap — `forced` is loop state rather than
          // anything rendered, so this gates on the render-state equivalents
          // that already exist instead of mirroring it into the frame.
          <button
            ref={attachFollow}
            type="button"
            onClick={tapTabby}
            className="pointer-events-auto absolute left-0 top-0 text-fg-muted"
            style={{ width: CAT_W, height: CAT_H }}
          >
            <span
              ref={followArt}
              className="block"
              style={{ transform: `scaleX(${frame.follow.facing})` }}
            >
              <CompanionCat variant="tabby" {...frame.follow} />
            </span>
            <span className="sr-only">
              {duetBeat ? "Next line" : "Ask the cats about this section"}
            </span>
          </button>
        ) : (
          // Mid-escort/tour/nap the tabby is no longer a control, for the same
          // reason the lead one gives up its button above.
          <div
            ref={attachFollow}
            aria-hidden="true"
            className="absolute left-0 top-0 text-fg-muted"
            style={{ width: CAT_W, height: CAT_H }}
          >
            <span
              ref={followArt}
              className="block"
              style={{ transform: `scaleX(${frame.follow.facing})` }}
            >
              <CompanionCat variant="tabby" {...frame.follow} />
            </span>
          </div>
        )
      ) : null}

      {/* Round 10: cats meow, Thien translates — see the file banner on
          `MiniThien.tsx`. The bubble now carries only `beat.meow`; the
          English translation moved to the caption beside him. All three —
          both bubbles and his caption — render after both cats in source
          order on purpose: the companion layer has no explicit `z-index`
          here, so later means on top, and that ordering *is* the collision
          fix's second half. Their rects are also registered as occupied
          space (see `setReservedRects` in the loop above), which is the
          first half — between the two, no cat can park on or cross to rest
          under a bubble or the caption, and if one is mid-stride across
          either while it moves, the bubble or caption is still legible on
          top of it rather than the drawing painting over the words. `aria-
          hidden` throughout: the tour HUD's `role="status"` is the
          accessible narration (see `TourHud.tsx`), this trio is decoration a
          screen reader has no reason to hear, and the tabby button above is
          still the interactive surface — none of the three becomes an
          unreachable control. Mounted only inside `roams && roaming`,
          exactly like the toy: there is no settled spot to appear beside
          without a loop placing one, and reduced motion / touch never reach
          here at all since `roams` is false in both. */}
      {roams && roaming && duetBeat ? (
        <>
          <div
            ref={duetBeat.speaker === "grey" ? attachGreyBubble : attachTabbyBubble}
            data-cat-bubble={duetBeat.speaker}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 w-max max-w-[12rem] border border-rule bg-surface px-2 py-1"
          >
            <p className="whitespace-nowrap font-mono text-[0.62rem] uppercase tracking-[0.1em] text-fg-subtle">
              {duetBeat.meow}
            </p>
          </div>
          <div
            ref={attachThien}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 text-fg-muted"
            style={{ width: THIEN_W, height: THIEN_H }}
          >
            <span ref={thienArt} className="block" style={{ transform: `scaleX(${thien.current.facing})` }}>
              <MiniThien />
            </span>
          </div>
          <div
            ref={attachThienCaption}
            data-cat-caption=""
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 w-max max-w-[16rem] border border-rule bg-surface px-2 py-1"
          >
            <p className="text-[0.68rem] italic leading-snug text-fg-muted">
              {duetBeat.sub}
              {duetBeat.hintMore ? <span className="text-fg-subtle"> …more?</span> : null}
            </p>
          </div>
        </>
      ) : null}

      {/* The front of the carton, over the animal wedged into it. Pure scenery
          and `pointer-events-none`, so the lead cat underneath is still the
          quick-actions button across every pixel of it. */}
      {roams && roaming && bed ? (
        <IdleFurniture
          layer="front"
          asleep={bed === "asleep"}
          shoved={shoved}
          containerRef={matFrontRef}
        />
      ) : null}

      {roams && escort ? (
        // Pure flourish, and drawn like one: no pointer events (it inherits
        // `none` from the root), no accessible name, no state of its own that
        // outlives the walk.
        <div
          ref={attachPolice}
          aria-hidden="true"
          className="absolute left-0 top-0 text-fg-muted"
          style={{ width: CAT_W, height: CAT_H }}
        >
          <span className="block" style={{ transform: `scaleX(${police.facing})` }}>
            <CompanionCat variant="police" {...police} />
          </span>
        </div>
      ) : null}

      {open ? (
        <ToolkitPanel
          canPlay={roams && roaming}
          wandering={mode === "wander"}
          onPlay={requestPlay}
          onTour={requestTour}
          onWander={wanderCats}
          onSendToBed={sendToBed}
          panelRef={panelRef}
        />
      ) : null}

      {/* D4/D5: the tour's accessible surface, up whenever a tour is running —
          the toolkit panel above and this are mutually exclusive by
          construction, since starting a tour closes the panel and the panel
          offers no route back into itself until the tour ends. */}
      {tourView ? (
        <TourHud
          stopIndex={tourView.index}
          totalStops={TOUR_STOPS.length}
          label={stopsFor(tourView.route)[tourView.index].label}
          lines={tourView.lines}
          isLast={isLastStop(tourView.index)}
          // The one fork in the walk: offered exactly at Philosophy (index 1,
          // the second stop) once its scene has actually arrived — not while
          // the pair are still walking there — replacing "Next stop" rather
          // than sitting beside it. See `chooseRoute`.
          showRouteChoice={tourView.index === 1 && tourView.lines.length > 0 && !tourView.routeChosen}
          onChooseRoute={chooseRoute}
          onNext={advanceTour}
          onEnd={endTour}
          hudRef={tourHudRef}
        />
      ) : null}

      {/* The bed carries one control — waking them — and it is now the only
          way back from the only exit, which is why it is a place you can see
          rather than a preference you cannot. */}
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
