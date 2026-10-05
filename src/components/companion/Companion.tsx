"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { navItems } from "@/content/portfolio";
import { useActiveSection } from "@/hooks/useActiveSection";
import { cn } from "@/lib/cn";
import type { CompanionFacts } from "@/lib/companion-facts";
import CompanionCat, { CAT_H, CAT_HOP_RISE, CAT_W, type CatPose } from "./CompanionCat";
import { CatGlyph } from "./CatIcon";
import CompanionToy, { TOY_H, TOY_W, type ToyKind } from "./CompanionToy";
import RestingBox, { BOX_SLOT, PAPER_SLOT } from "./RestingBox";
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
  actPose,
  advanceBeat,
  currentBeat,
  beatDurationMs,
  DUET_ODDS,
  hasEncore,
  liveAct,
  nextDuetAt,
  sceneFor,
  startScene,
  storyBeatScene,
  type CatIcon,
  type DialogueBeat,
  type DialogueRun,
  type DialogueScene,
  type Speaker,
  type StoryBeatKind,
} from "./companion-dialogue";
import {
  detectRush,
  heldExploreClear,
  holdExplore,
  planExplore,
  planMood,
  repickExploreSpot,
  RUSH_HOLD_MS,
} from "./companion-moods";
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
  setCompanionMode,
  useCompanionMode,
} from "./companion-state";
import {
  boxAt,
  clamp,
  clampToViewport,
  findClearSpot,
  headClear,
  isClearSpot,
  keepClearOfControl,
  keepInView,
  placeBeside,
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
 *     both animals are asleep — which is where they end up once the reader
 *     has done nothing at all for `EXPLORE_IDLE_MS`. The pair exploring the
 *     page is paid for by somebody being there to see it.
 *  4. Neither cat is the other one shifted sideways. They were literally one
 *     SVG on one button before this — same pose, same phase, one position — and
 *     no amount of drawing makes that read as two animals. The grey one leads
 *     and tracks the pointer; the tabby follows *him*, on her own clock, and
 *     stops to watch the cursor or wander off when it suits her.
 *  5. Anything it does of its own accord is *rare*. The idle flourishes are
 *     tens of seconds apart and the scenes — see companion-play — are minutes
 *     apart, can only start while nobody is steering the cats (no moving
 *     pointer within `CHASE_RADIUS` of the lead) and both are standing still
 *     between walks, and end on the frame a moving pointer comes within that
 *     reach. A pointer moving elsewhere on the page is a reader using it, and
 *     neither starts nor stops anything. A companion that performs on a
 *     schedule you can feel is a companion you watch instead of reading the
 *     page. Asking for a scene from the panel
 *     skips the timer and *only* the timer — see `requestPlay`, which is the
 *     same code path with the wait taken out.
 *  6. It is always somewhere you can find it. Two ways a cat used to become
 *     invisible — off the viewport edge, and behind the opaque sticky header
 *     the companion layer sits under — are answered in companion-space, which
 *     every target and every position now goes through. The third was social
 *     rather than geometric: after a while they simply stopped following and
 *     went quiet wherever they were standing, which reads as a bug even when
 *     the cat is right there. For a while the answer was a walk to a corner
 *     bed; now they lie down where they stopped in the `sleep` pose, which
 *     says "asleep" on the spot rather than "stuck". The fourth
 *     was optical and lasted four rounds: they were *transparent*, so two cats
 *     crossing the hero headline had the words running straight through their
 *     bodies. Every drawing on this layer now knocks the page out underneath
 *     itself in `var(--ground)` — see the note in `CompanionCat`.
 *
 * ## Exploring
 *
 * There is one way of being out on the page. While the pointer is moving
 * within `CHASE_RADIUS` of the lead he trails it, and everything above is
 * about staying out of its way. The rest of the time the reader is about —
 * scrolling, typing, clicking, or moving a pointer somewhere else on the page
 * — the pair explore: each picks a clear spot in its own half of the page (see
 * `planExplore`), walks there, stays a few seconds, and picks another. When
 * the reader has done nothing at all for `EXPLORE_IDLE_MS` each finishes its
 * walk and naps where it stops, and once both are asleep the page goes
 * still.
 *
 * Round 9 had this as a mode of its own, `wander` — the owner's note asked for
 * "a mode that cat go around instead of follow the mouse" — with the idle bed
 * switched off, because a bed on a fourteen-second clock would have made a
 * watching visitor's mode fourteen seconds long. The explorers made going
 * around the default instead, napping only once nobody has scrolled, typed,
 * clicked or moved the pointer for twenty seconds, so the mode and its menu
 * item had nothing left to switch.
 *
 * On touch devices there is no cursor to follow, so the roaming behaviour is
 * skipped entirely and both cats simply rest in the corner as a toolkit button.
 * The same is true for anyone who has asked for reduced motion — and because
 * that path has no roaming layer at all, the police-cat escort, the nap
 * contract, the idle nap and every idle flourish are skipped with it, landing
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
 * pointer-chase still uses unchanged.
 *
 * The two questions read the same ("how far behind him is she") but are not
 * the same question. Ordinary trailing is *motion the visitor is watching* —
 * he is visibly walking somewhere, she is visibly keeping pace, and the
 * ~22px real clearance `FOLLOW_GAP` produces from his own button is the file
 * banner's own "crossing something while it moves is fine" licence, exactly
 * as it always has been. A long walk that ends beside him — to a section's
 * perch, since the explorers; to the corner, when this was written — is
 * different only in how it ends:
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
 * How long before the cats stop trailing the pointer, then before they stop
 * exploring and nap, in ms.
 *
 * Two thresholds measuring two different things, which is the whole reason they
 * read off two different clocks below. Settling is about the *pointer* holding
 * still: there is nothing to trail, so stop trailing it and go exploring.
 * Napping is about the *visitor* being gone — no scroll, no pointer, no
 * key, no click — and a visitor reading a long page holds the mouse perfectly
 * still for minutes while scrolling through it.
 */
const SETTLE_AFTER = 2400;
export const EXPLORE_IDLE_MS = 20_000;
/**
 * How near the pointer has to come to the lead cat's centre, in px, before he
 * chases it.
 *
 * Without it, any pointer move anywhere — a 1px nudge of a mouse a reader's
 * hand happens to rest on — had the pair trail the cursor for `SETTLE_AFTER`,
 * so somebody reading with a hand on the mouse never saw the explorers at all.
 * A pointer this close is somebody playing with the cat; one further away is
 * somebody using the page, and only stamps the activity clock.
 */
export const CHASE_RADIUS = 200;
/** At night the nap comes three seconds sooner. A small nudge, on purpose: this
 *  is flavour, not a second sleep threshold to keep in step with the real
 *  one. */
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

/* ------------------------------------------------------------- two sleeps --
 *
 * Two sleeps, and the difference between them is the whole point:
 *
 *  - `CompanionMode === "resting"` is a **preference**. The visitor asked for
 *    the cats to be put away, it is written to localStorage under "companion",
 *    it survives a reload, and only the corner's own "Wake the cats" button
 *    undoes it. That flow owns `RestingBox` and the corner furniture, and it is
 *    the only one that touches storage.
 *  - The nap is a **moment**. Nobody has done anything for `EXPLORE_IDLE_MS`,
 *    so each explorer finishes the walk it is on, lies down on the clear spot
 *    it was walking to, and sleeps there in the `sleep` pose; once both are
 *    down the loop stops. Any input at all wakes them. Nothing is written
 *    anywhere: reload and they roam, exactly as before.
 *
 * Until the explorers the nap walked them to the corner and into the
 * furniture, because cats that went quiet wherever the placement probe had put
 * them read as a bug. The sleep pose answers that on the spot; a corner bed on
 * a twenty-second clock spent half of every quiet moment walking to it, so the
 * furniture is for the visitor who sends them there.
 *
 * "Nobody has done anything" is deliberately wider than "the pointer has not
 * moved", and the difference is the whole of `lastSignRef`. Reading a long page
 * is scrolling it with the mouse held still, so on the pointer clock a visitor
 * halfway down the page reads as absent — the cats would doze off while
 * somebody was plainly still there, and nothing they could do short of moving
 * the mouse would wake them.
 */

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
  /** The `hop` act, live this frame — see `actPose`. */
  readonly hopping: boolean;
}

/** What the JSX draws for one beat of the duet — see `beatView`. */
interface BeatView {
  readonly speaker: Speaker;
  readonly meow: string;
  readonly sub: string;
  /** The beat's picture, drawn beside the meow; null on a beat with none. */
  readonly icon: CatIcon | null;
  readonly hintMore: boolean;
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

interface Nap {
  readonly el: Element;
  rect: DOMRect;
  readAt: number;
}

const RESTING_VISUAL: Visual = {
  pose: "sit",
  phase: 0,
  facing: 1,
  blinking: false,
  flick: 0,
  hopping: false,
};
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
 * The corner: where the cats come when the toolkit is open (the panel is
 * anchored here), where they first appear, and the last resort every
 * clear-ground search falls back to. They no longer walk here for want of
 * anything to follow — with no pointer to trail they explore. (On touch and
 * under reduced motion the parked pair sit in the same corner, pinned there by
 * CSS rather than placed from this.)
 *
 * Bottom-right, not bottom-left: the hero's calls to action, the "Scroll"
 * marker and the back-to-top control all live on the left, and both the
 * toolkit panel and the resting box open from this corner too, so cats and
 * furniture stay together.
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
 * clamps, the moods and the resting box's slots all mean the drawing, and none of them
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
 * Hold a cat out of the open toolkit — the second target-size invariant on
 * this layer, and the one the first could not reach.
 *
 * `clearsControls`/`keepClearOfControl` (companion-space.ts) keep the
 * *follower* off the *lead's* button. This is the other pairing, and it went
 * unguarded: both cats are controls — the lead carries the toggle, the tabby
 * carries the storyteller tap — and the panel is a column of controls
 * anchored to the very corner they are both called home to. `homeSpot` clears
 * the panel's bottom edge by a pixel, which is what the panel's own class
 * list was designed for, so the pair are safe once they *arrive*. Getting
 * there was the hole: at `LEAD_SPEED` a walk in from the middle of the page is
 * a full second spent under the menu, with the cat's own target and the menu
 * item's both cut well below the 24px WCAG 2.5.8 asks for. Axe caught it about
 * one run in six, which is all a scan of a single instant can do against a
 * moving cat; `e2e/companion.spec.ts` watches every frame of the walk instead.
 *
 * There is no route to fix. On a 375px window the panel spans x 47–351 of it,
 * so every approach from above crosses the column and no path around it
 * exists — a cat that is over the panel when the menu opens has to leave by
 * the bottom or not at all. So it leaves by the bottom, onto the corner's own
 * line (`homeSpot().y`), keeping whatever x it had. That happens on the frame
 * the panel itself appears, and what is left of the walk is the trot along the
 * corridor to the corner: the pair drop out of the way of their own menu and
 * then go and sit under it. A cat already in the corridor, or clear of the
 * column to either side, is not touched.
 *
 * `panel` is the measured box, and measured rather than derived on purpose —
 * the opposite call from the one `setControlRects` makes about the lead's own
 * rect, for the opposite reasons. That rect moves every frame and is pure
 * arithmetic on state this loop already owns, so a photograph of it goes
 * stale; this one cannot be computed at all (`19rem` is not 304px for every
 * visitor, and the height grows by a line when a scene is refused) and does
 * not move while it is up, so the only way to be right about it is to look.
 *
 * Only three of its four edges are used. The top is deliberately ignored — a
 * cat above the panel is a cat that still has to come down through it to reach
 * the corner, so treating the column as running to the top of the window is
 * what keeps the one relocation at the moment the menu opens, rather than
 * springing it on the visitor mid-walk when the cat would otherwise saunter
 * down to the panel's top edge and drop through it.
 *
 * `padX`/`padY` are the margin the caller's button carries around its drawing
 * — `LEAD_PAD_*` for the lead, nothing for the tabby, whose button is her
 * drawing — because it is the *target* that has to clear the menu, not the
 * animal inside it.
 *
 * The corner's line is the whole of the promise: on a window too short for
 * `clampToViewport` to leave `homeSpot` beneath the panel at all, this hands
 * back the same spot the pair already rest on, which is not a new violation —
 * it is the resting contract's own limit, unchanged.
 */
function keepOutOfPanel(pos: Point, padX: number, padY: number, panel: RectLike): Point {
  if (
    pos.x + CAT_W + padX <= panel.left ||
    pos.x - padX >= panel.right ||
    pos.y - padY >= panel.bottom
  ) {
    return pos;
  }
  return clampToViewport({ x: pos.x, y: homeSpot().y });
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
 * corner fallback, a wander stay (an explorer's stop now), all round 15
 * additions — broke exactly that assumption: axe stayed quiet, but the cheap
 * push itself landed the follower on a paragraph she would otherwise have been
 * sitting clear of.
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

/** Their two places in the resting box, which draws the same cluster at the
 *  same offsets — so the escort walks them exactly where the drawing that
 *  replaces them will be. */
function slotsForBox(rect: DOMRect): Spots {
  return {
    lead: clampToViewport({ x: rect.left + BOX_SLOT.x, y: rect.top + BOX_SLOT.y }),
    follow: clampToViewport({ x: rect.left + PAPER_SLOT.x, y: rect.top + PAPER_SLOT.y }),
  };
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
 * rendered height rather than a fixed figure. The bubble itself is one line —
 * the meow, with the beat's icon beside it; the translation left it for
 * mini-Thien's caption in round 10 — and the caption, placed by the same code,
 * is one line for every subtitle the bank produces today (measured at 1440px:
 * the widest, the tree's last ambient line with its "…more?", is ~205px of
 * its 16rem). Nothing guarantees that, though: `SUB_MAX_CHARS` caps
 * characters, not pixels, so a caption can still wrap to a second line, and
 * a hardcoded offset would put the cat drawing over it the moment one did.
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
 * clamped to the viewport on both axes, and never painted over anything in
 * `keepOut` (the two cats, and for the caption the bubble too) when there is
 * any clear side to put it on. The choice itself is `placeBeside` in
 * companion-space.ts; this measures the node, paints the answer, and returns
 * the box it painted so the caption can keep off the bubble painted before it.
 * `anchorW`/`anchorH` are the anchor's own drawn size (`CAT_W`×`CAT_H` for a
 * bubble beside a sitting cat — raised by `CAT_HOP_RISE` and that much taller
 * while it hops, see `paintBubble` — and `THIEN_W`×`THIEN_H` for a caption
 * beside the narrator).
 */
function paintBeside(
  node: HTMLElement | null,
  anchor: Spot,
  anchorW: number,
  anchorH: number,
  keepOut: readonly RectLike[],
): RectLike | null {
  if (!node) return null;
  const size = { width: node.offsetWidth, height: node.offsetHeight };
  const at = placeBeside(
    anchor,
    anchorW,
    anchorH,
    size,
    { viewportWidth: window.innerWidth, viewportHeight: window.innerHeight, safeTop: safeTop() },
    keepOut,
  );
  paint(node, at);
  return boxAt(at, size.width, size.height);
}

/** Which of the two cats are mid-`hop` act this frame. */
interface Hops {
  readonly lead: boolean;
  readonly follow: boolean;
}

const NO_HOPS: Hops = { lead: false, follow: false };

/** The hops a committed frame is drawing. */
function hopsOf(frame: Frame): Hops {
  return { lead: frame.lead.hopping, follow: frame.follow.hopping };
}

/** One cat's drawn box, reaching `CAT_HOP_RISE` higher while it hops: the
 *  whole height its drawing sweeps through, not just where it sits, so
 *  nothing placed flush against the box gets bounced into. */
function drawnBox(pos: Spot, hopping: boolean): RectLike {
  return hopping
    ? boxAt({ x: pos.x, y: pos.y - CAT_HOP_RISE }, CAT_W, CAT_H + CAT_HOP_RISE)
    : boxAt(pos, CAT_W, CAT_H);
}

/** Both cats' drawn boxes — what no bubble or caption may be painted over. */
function catBoxes(lead: Spot, follow: Spot, hops: Hops = NO_HOPS): RectLike[] {
  return [drawnBox(lead, hops.lead), drawnBox(follow, hops.follow)];
}

/** The duet's speech bubble, clamped to the speaking cat — see `paintBeside`.
 *  Anchored to the cat's whole drawn box, hop included: `placeBeside` leaves
 *  only `BESIDE_GAP` between a bubble and its anchor, and a hopping cat under
 *  a bubble anchored to where it sits would spend that gap — all of it, at
 *  today's numbers — at the top of every bounce. */
function paintBubble(
  node: HTMLElement | null,
  cat: Spot,
  keepOut: readonly RectLike[],
  hopping = false,
): RectLike | null {
  const box = drawnBox(cat, hopping);
  return paintBeside(node, { x: box.left, y: box.top }, CAT_W, box.bottom - box.top, keepOut);
}

/** Mini-Thien's caption, clamped to him rather than to the cat he is
 *  standing beside — the two are never the same point once he has arrived,
 *  so this cannot simply reuse `paintBubble`'s own anchor. Kept off his own
 *  drawing as well as off `keepOut`. */
function paintCaption(node: HTMLElement | null, thien: Spot, keepOut: readonly RectLike[]): RectLike | null {
  return paintBeside(node, thien, THIEN_W, THIEN_H, [...keepOut, boxAt(thien, THIEN_W, THIEN_H)]);
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
    a.hopping === b.hopping &&
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
 * Where the explorers are heading, and when each may think of somewhere else.
 *
 * Held rather than recomputed: a destination chosen again every frame is not a
 * destination, it is a jitter. Each cat has its own stay clock, because a pair
 * that always set off at one instant read as one animal drawn twice (the
 * spec's "each cat independently holds a target and, on arrival, dwells").
 * `arrivedLead`/`arrivedFollow` are stamped when *that* cat is standing on its
 * own spot — the clock on how long it stays does not start until then — and
 * `untilLead`/`untilFollow` are that cat's cap before it, so a walk that cannot
 * finish is abandoned rather than walked at forever, and its stay after. When
 * one cat's clock runs out `exploreTo` re-picks only that cat's spot, against
 * its partner's current one (`repickExploreSpot`), and the partner carries on.
 *
 * Two kinds of run are *not* independent. A perch (`perch`) seats the pair
 * together on purpose — she trails him — so its stay is one stay, on the lead's
 * clock (the follower's mirrors it), and when it is up the pair are re-planned
 * together by `planExplore`; the stops after that are independent. A declined
 * plan (`declined`: `planExplore` found nothing clear and the pair are held
 * where they stand) is also one stay, and asks again for both when it ends.
 *
 * `spots` are viewport coordinates that ride with the page: every frame the
 * page scrolls, the loop moves them by the same distance it moves the cats (see
 * the ride in `step`), so a pair standing beside a paragraph stay beside it, and
 * a destination carried out of view is dropped and re-picked — the whole run,
 * not one cat's spot. Once a scroll or a change in the body's size settles,
 * `reprobeHeld` (run from the throttled `scheduleRecheck`) re-probes them and
 * drops the run only if the ground has stopped being clear; a window resize
 * drops it outright, in `onPageMoved`, before any re-probe.
 * `headLead`/`headFollow` are what "clear" meant for each head when *its*
 * stop was planned (re-recorded when that cat alone is re-picked) — see
 * `HeldExplore` and `heldExploreClear` in companion-moods.ts.
 *
 * `faceLead`/`faceFollow` are rolled once per cat, at the same moment its
 * `arrived*` is stamped — see round 14, "randomly facing left or right". Held
 * here rather than recomputed for the same reason `spots` is: a facing
 * re-rolled every frame is not a choice, it is a flicker. They mean nothing
 * until that cat has arrived, and nothing consults them while its `arrived*`
 * is still 0.
 */
interface ExploreRun {
  spots: Spots;
  /** The section's perch rather than an ordinary stop: the follower trails the
   *  lead there instead of walking to `spots.follow` — see `exploreTo`. */
  readonly perch: boolean;
  /** `planExplore` had nothing: the pair are held where they stand, as one
   *  stay, and ask again for both when it is up. */
  readonly declined: boolean;
  headLead: boolean;
  headFollow: boolean;
  arrivedLead: number;
  arrivedFollow: number;
  untilLead: number;
  untilFollow: number;
  faceLead: 1 | -1;
  faceFollow: 1 | -1;
}

/** How long an explorer stays somewhere once it gets there — 4 to 9 seconds,
 *  uniform, rolled for each cat on its own arrival — and the cap on its walk
 *  before that. Long enough that it reads as having settled in, short enough
 *  that a reader sees it think of something else. */
const EXPLORE_DWELL = 4000;
const EXPLORE_DWELL_SPREAD = 5000;
const EXPLORE_WALK_MAX = 8000;

/** How long each cat stretches on waking from a nap before it goes back to
 *  exploring. */
const WAKE_STRETCH_MS = 600;

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
  /** The mode that puts cats on the page rather than in the corner. Almost
   *  everything below cares about the mode only this far: is there a roaming
   *  layer at all. */
  const roaming = mode === "roam";
  /** Which section the visitor is reading, from the page's own scrollspy. Used
   *  for nothing but where the cats choose to sit — see companion-moods. */
  const section = useActiveSection(SECTION_IDS);
  // Roaming needs a real pointer and a visitor who has not asked for calm.
  const finePointer = useMedia("(pointer: fine)");
  const stillness = useMedia("(prefers-reduced-motion: reduce)");
  const roams = finePointer && !stillness;

  const [open, setOpen] = useState(false);
  const [escort, setEscort] = useState<EscortPhase | null>(null);
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
   * So exploring, and the nap that ends it, read this clock instead: a scroll,
   * a resize, a key or a click all stamp it, and only the *settle* threshold —
   * which really is about the pointer holding still — stays on `lastMoveRef`.
   * Never read directly: the later of the two is what "alone" means, so the
   * existing resets that write `lastMoveRef` keep working untouched.
   */
  const lastSignRef = useRef(0);
  const escortRef = useRef<EscortRun | null>(null);
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
   *  companion offered and a scene the visitor chose. Cleared by `endPlay`, and
   *  by the two ways a walking request is dropped without one (its walk
   *  expiring, its stage refusing it on arrival): a mark left standing with no
   *  scene under it would be inherited by the idle timer's next scene. */
  const askedRef = useRef(false);
  /** A scene the visitor has asked for that has somewhere to happen but not
   *  where they are standing. See `stageFor`: the pair walk to it, and it opens
   *  when they arrive. */
  const queued = useRef<QueuedPlay | null>(null);
  /** Content-avoiding rest spots near where the pair stand, resolved once per
   *  hold rather than per frame. Cleared by a pointer move while no scene is
   *  playing (a scene holds them until `endPlay`), a scroll or resize
   *  (at once for a resize, and when the throttled recheck in the loop effect
   *  fires for either), a scene ending (`endPlay`) or being asked for, a mode
   *  change and a section change — and by a change in the body's size only
   *  when its recheck drops the explorers' held stop (`scheduleRecheck`). A
   *  body resize that drops nothing leaves them alone, so spots resolved
   *  before a layout shift with no scroll and no drop stand until one of the
   *  above. */
  const settleSpots = useRef<Spots | null>(null);
  /** Where the explorers are heading. Null means "decide on the next frame". */
  const exploreRun = useRef<ExploreRun | null>(null);
  /** True until the explorers have arrived at their first stop in the current
   *  section — set by the section-change effect, consumed on arrival — which
   *  is what makes that first stop the section's perch (see `planExplore`).
   *  Consumed on *arrival* rather than on planning, because a plan can be
   *  dropped before they get there (a chase, a resize, ground that stopped
   *  being clear) and the re-plan should still be the perch. */
  const exploreFresh = useRef(true);
  /** The active section, mirrored for the loop. */
  const sectionRef = useRef<string | null>(null);
  /** Mirrors `roaming` for the loop: the loop effect's dependency array is
   *  `loopActive`, which can stay true across a mode change that flips
   *  `roaming` (an escort keeps the loop alive after "resting" is chosen), so
   *  anything the loop reads that cares about *real* roaming — as opposed to
   *  "there happens to be a frame running" — has to read a ref rather than the
   *  render-scope value. */
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
   * The play's own choreography window — the one stop that needs more than
   * the pair's ordinary sit (Contact's fake-nap), armed at arrival and read
   * only from inside the tour's own code paths, exactly the way
   * `rainHuddleUntil` is read only from inside the watch's. It is a plain
   * timestamp rather than a richer shape because it is read the same way
   * `rainHuddleUntil` already is: "is now before this".
   */
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
  const [duetBeat, setDuetBeat] = useState<BeatView | null>(null);

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
    // claim on the cats than a play — a moving pointer coming within
    // `CHASE_RADIUS` of the lead, the toolkit opening, the page scrolling, the
    // loop being torn down — and a scene that has not
    // opened yet is no more entitled to survive one than a scene that has.
    // Without this a visitor who clicks Toss the yarn and then scrolls away
    // gets a ball of wool seconds later, from nowhere.
    queued.current = null;
    // Whatever ends a scene ends its provenance with it: the next one to start
    // is the idle timer's until somebody asks for it again. (The two drops of
    // a walking request that never reach this function — the walk expiring,
    // the stage refusing on arrival — clear it by hand, in the loop.)
    askedRef.current = false;
    if (!playRef.current) return;
    playAt.current = scheduleNextPlay(now);
    playRef.current = null;
    // The spots they settled on before the scene are stale the moment a scene
    // moves them, and most of them do: a chase can finish a viewport away from
    // where it started, and an anchored scene ends wherever the thing it was
    // about happened to be. Cats that then walked all the way back to their old
    // spot would be undoing the scene in front of the visitor, so both the
    // settle spots and whatever they were exploring towards are cleared here
    // and the next frame re-decides from wherever they actually are.
    settleSpots.current = null;
    exploreRun.current = null;
    setScene(null);
  }, []);

  useEffect(() => {
    openRef.current = open;
    wake();
  }, [open, wake]);

  /**
   * The mode, into the loop.
   *
   * A ref rather than a dependency of the loop effect, because the loop can
   * outlive the mode it started in — the escort keeps it running after
   * "resting" is chosen, to walk the pair into the box. Whatever they were
   * heading for goes with the change, and the loop is woken to notice it.
   */
  useEffect(() => {
    roamingRef.current = roaming;
    exploreRun.current = null;
    settleSpots.current = null;
    wake();
  }, [mode, roaming, wake]);

  // Retire the stored values this code no longer writes (`off`, `wander`). It
  // has to happen out here rather than inside the store's snapshot, which runs
  // during render — see companion-state. Once per mount, and a no-op for
  // everybody who never saw the old switches.
  useEffect(migrateCompanionMode, []);

  /**
   * The visitor has moved to another section, so wherever the explorers were
   * heading belonged to the last one. The plan is dropped and the next one is
   * marked fresh, which makes it this section's perch where it has one (see
   * `planExplore`) — so arriving somewhere still earns a remark before the pair
   * go back to exploring.
   */
  useEffect(() => {
    if (sectionRef.current === section) return;
    sectionRef.current = section;
    settleSpots.current = null;
    exploreRun.current = null;
    exploreFresh.current = true;
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
    if (node) {
      const hops = hopsOf(committed.current);
      paintBubble(node, lead.current.pos, catBoxes(lead.current.pos, follow.current.pos, hops), hops.lead);
    }
  }, []);
  const attachTabbyBubble = useCallback((node: HTMLDivElement | null) => {
    tabbyBubble.current = node;
    if (node) {
      const hops = hopsOf(committed.current);
      paintBubble(node, follow.current.pos, catBoxes(lead.current.pos, follow.current.pos, hops), hops.follow);
    }
  }, []);

  /** Mini-Thien and his caption get the same first-frame treatment as the
   *  bubbles above, for the same reason. */
  const attachThien = useCallback((node: HTMLDivElement | null) => {
    thienNode.current = node;
    if (node) paint(node, thien.current.pos);
  }, []);
  const attachThienCaption = useCallback((node: HTMLDivElement | null) => {
    thienCaption.current = node;
    if (node) {
      paintCaption(node, thien.current.pos, catBoxes(lead.current.pos, follow.current.pos, hopsOf(committed.current)));
    }
  }, []);

  /** What the JSX needs to draw one beat; `hintMore` marks the last beat of
   *  an ambient scene that has an encore waiting behind it. */
  const beatView = useCallback(
    (run: DialogueRun): BeatView => {
      const beat = currentBeat(run);
      const last = run.beatIndex === run.scene.beats.length - 1;
      const section = run.scene.kind === "ambient" ? run.scene.id.replace(/^ambient-/, "") : null;
      return {
        speaker: beat.speaker,
        meow: beat.meow,
        sub: beat.sub,
        icon: beat.icon ?? null,
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
    // showing, an encore is the next thing to offer — but only tree has
    // one. Everywhere else, replay the ambient scene rather than going
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

    /**
     * Somebody is here. Every pointer move stamps the pointer clock — which is
     * what the chase reads, and one of the two clocks a nap waits out — and
     * gets a frame running. Whether the move is a chase is the loop's call, not
     * this one's: only a pointer within `CHASE_RADIUS` of the lead is.
     *
     * Any move wakes a sleeping pair, however small. Nothing is held back for
     * a pointer that has not travelled far enough: the cats nap where they
     * stopped, on the page, not tucked away in a corner, and a reader whose
     * hand moves is a reader who is back.
     */
    const onMove = (event: PointerEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
      lastMoveRef.current = performance.now();
      // A scene that survives the pointer (one the visitor asked for) holds
      // the spots it opened on until it ends — `endPlay` clears them then.
      // Clearing them here re-probed the page every frame the hand moved.
      if (!playRef.current) settleSpots.current = null;
      wake();
    };

    // A click anywhere, and any keystroke — the keyboard equivalent for a
    // visitor who never moves a pointer at all. Both stamp the presence clock:
    // somebody typing is somebody here, and the cats should not doze off
    // mid-sentence, and both wake a sleeping pair.
    const onPoke = () => {
      lastSignRef.current = performance.now();
      wake();
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
   *
   * Nothing declares it today. Its only carrier was the career tree's plinth,
   * which round 18 retired, so this listener is idle until a section adds a
   * nap spot again.
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
    /** Whether both cats were asleep on the previous frame — which, the loop
     *  having stopped there, is the last frame before whatever woke them — and
     *  the end of the stretch that waking arms. See `stretching` in `step`. */
    let sleptLastFrame = false;
    let stretchUntil = 0;

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

    /** `preferHead` only where the answer is chosen once and held — see
     *  `findClearSpot`. The tour's and the watch's per-frame fallbacks leave
     *  it off. */
    function restSpots(leadAnchor: Point, followAnchor: Point, preferHead = false): Spots {
      const home = homeSpot();
      const spot = findClearSpot(leadAnchor, home, undefined, { preferHead });
      return {
        lead: spot,
        follow: findClearSpot(followAnchor, followHome(home), spot, { preferHead }),
      };
    }

    /**
     * WP-R round 15's second follow-up: the follower's own target for the
     * whole of a long walk that ends beside him — today an explorer's perch,
     * and the cascade's last-resort hold — full stop: no separately-computed
     * endpoint of her own to switch to, ever. She trails the lead's live
     * position (`trailBehind`, companion-motion.ts) for as long as he is
     * walking, and once he settles she simply keeps trailing *his
     * now-stationary* spot — which is exactly where she ends up standing.
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
     * Clear ground near where the pair are standing, resolved once per hold
     * rather than per frame — probing the page costs hit tests. Two branches
     * want it: holding station while a scene is out (a scene owns their
     * positions: it probed its own geometry against wherever they stood when it
     * opened, and a spot halfway across the page would walk the lead away from
     * the ball he is supposed to be batting), and the cascade's last fallback.
     * Cleared on the events listed on the `settleSpots` ref — which are not
     * every way the page underneath them can move: a body resize that drops
     * no held stop leaves them standing.
     */
    function settled(): Spots {
      settleSpots.current ??= clearFollowOfToggle(nearbySpots(true));
      return settleSpots.current;
    }

    /** The nearest pair of places to where they are standing — what a held
     *  scene stands on, and what a declined explorer plan falls back to. Both
     *  of those hold the answer, so they pass `preferHead`; the tour's and the
     *  watch's defensive per-frame fallbacks do not. */
    function nearbySpots(preferHead = false): Spots {
      return restSpots(grey.pos, { x: grey.pos.x - CAT_W - FOLLOW_GAP, y: grey.pos.y }, preferHead);
    }

    /**
     * Where a tour stop wants the pair standing.
     *
     * The stop's section id is deliberately the same string `planMood`
     * dispatches on, so wherever a mood exists the tour's placement is that
     * mood, asked for on demand instead of waiting for a settle. Not every
     * stop has one: `planMood` (companion-moods.ts) only knows
     * about/work/skills/tree/contact, so `worlds` (round 16) falls straight
     * through to the cruder top-edge fallback below, same as any section
     * whose own mood declines. Recomputed
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
     * Where the explorers are going, and how long they stay when they get there.
     *
     * The plan is *held* — see `ExploreRun` — and each cat's part of it is
     * replaced, alone, when its own stay is up or it cannot get there in a
     * reasonable time (a perch or a declined plan is one stay, and is replaced
     * for both). The whole plan is dropped, from outside this
     * function, whenever something has a better claim on where they should be:
     * a chase actually starting (a moving pointer within `CHASE_RADIUS` of the
     * lead — one further away leaves the plan alone), a section change, a
     * scene ending, a resize, a scroll that leaves a held spot out of view, or
     * the re-probe (`reprobeHeld`) finding a held spot's ground no longer
     * clear once a scroll, a resize or a change in the body's size settles.
     *
     * The first plan in a section is that section's perch where it has one
     * (`exploreFresh`, consumed when they arrive); after that, `planExplore`
     * sends the lead to a clear spot in the left half of the page and the
     * follower to one in the right, and from then on each is re-sent on its own
     * clock by `repickExploreSpot`, against wherever the other is. A declined plan is a real outcome on a
     * window with no whitespace in it, and the answer is the nearest pair of
     * clear spots: standing still somewhere legal, and asking again shortly.
     */
    function exploreTo(now: number): Spots {
      const run = exploreRun.current;
      if (run && (run.perch || run.declined)) {
        // One stay for the pair. On a perch she trails him rather than walking
        // to a spot of her own — see the explore branch of the cascade for why
        // — so the trail spot is where she is going, and where she has arrived.
        if (now < run.untilLead) {
          const follow = run.perch ? trailLead() : run.spots.follow;
          // The stay does not start until they are both standing there. Four
          // pixels is the same "close enough" the queued scenes and the escort
          // use.
          if (
            run.arrivedLead === 0 &&
            distance(grey.pos, run.spots.lead) < 4 &&
            distance(tabby.pos, follow) < 4
          ) {
            run.arrivedLead = now;
            run.arrivedFollow = now;
            run.untilLead = now + exploreDwell();
            run.untilFollow = run.untilLead;
            // Arrived somewhere in this section, so the perch has had its turn.
            exploreFresh.current = false;
            // Not on a perch: she is sitting on his trail, which is behind him
            // by *his* facing, so turning him round would walk her past his
            // button to his other side. There they keep the facings they came
            // in with.
            run.faceLead = run.perch ? grey.facing : arrivalFacing("lead", now, run.spots.lead);
            run.faceFollow = run.perch ? tabby.facing : arrivalFacing("follow", now, follow);
          }
          return { lead: run.spots.lead, follow };
        }
      } else if (run) {
        // Each cat on its own clock. A cat whose stay (or walk) is up is
        // re-picked against where its partner is going; the partner's clock,
        // spot and facing are not touched.
        if (now >= run.untilLead) repickExplorer(run, "lead", now);
        if (now >= run.untilFollow) repickExplorer(run, "follow", now);
        if (run.arrivedLead === 0 && distance(grey.pos, run.spots.lead) < 4) {
          run.arrivedLead = now;
          run.untilLead = now + exploreDwell();
          exploreFresh.current = false;
          run.faceLead = arrivalFacing("lead", now, run.spots.lead);
        }
        if (run.arrivedFollow === 0 && distance(tabby.pos, run.spots.follow) < 4) {
          run.arrivedFollow = now;
          run.untilFollow = now + exploreDwell();
          exploreFresh.current = false;
          run.faceFollow = arrivalFacing("follow", now, run.spots.follow);
        }
        return run.spots;
      }

      const chosen = planExplore(sectionRef.current, grey.pos, tabby.pos, homeSpot(), exploreFresh.current);
      const spots = clearFollowOfToggle(chosen ?? nearbySpots(true));
      const perch = chosen?.perch ?? false;
      const until = now + (chosen ? EXPLORE_WALK_MAX : EXPLORE_DWELL);
      exploreRun.current = {
        ...holdExplore(spots, perch),
        declined: !chosen,
        arrivedLead: 0,
        arrivedFollow: 0,
        untilLead: until,
        untilFollow: until,
        faceLead: 1,
        faceFollow: 1,
      };
      return { lead: spots.lead, follow: perch ? trailLead() : spots.follow };
    }

    /** A stay's length: 4 to 9 seconds, rolled once per cat per arrival. */
    function exploreDwell(): number {
      return EXPLORE_DWELL + Math.random() * EXPLORE_DWELL_SPREAD;
    }

    /**
     * Round 14: facing left or right at random on arrival, decoupled from
     * whichever way the cat was travelling to get here — see `randomFacing`.
     * Seeded from this arrival's own moment, cat and spot rather than a live
     * `Math.random()` call, which is what makes the choice a pure, testable
     * function of "this one arrival" instead of an untestable side effect of
     * when the frame happened to land.
     */
    function arrivalFacing(cat: "lead" | "follow", now: number, spot: Point): 1 | -1 {
      return randomFacing(`${cat}:${now}:${spot.x}:${spot.y}`);
    }

    /**
     * One explorer's stay (or walk) is up: give *it* somewhere new, leave its
     * partner's spot, clock and facing alone. The new spot is picked against
     * the partner's current target (`repickExploreSpot`), the walk cap starts
     * over, and the cat's head-band record is renewed for `heldExploreClear` —
     * the partner's stays as it was planned. The follower's new spot gets
     * `clearFollowOfToggle`, as every spot handed to her does.
     */
    function repickExplorer(run: ExploreRun, cat: "lead" | "follow", now: number) {
      if (cat === "lead") {
        const lead = repickExploreSpot("lead", grey.pos, run.spots.follow, homeSpot());
        run.spots = { lead, follow: run.spots.follow };
        run.headLead = headClear(lead);
        run.arrivedLead = 0;
        run.untilLead = now + EXPLORE_WALK_MAX;
      } else {
        const picked = repickExploreSpot("follow", tabby.pos, run.spots.lead, homeSpot());
        const spots = clearFollowOfToggle({ lead: run.spots.lead, follow: picked });
        run.spots = spots;
        run.headFollow = headClear(spots.follow);
        run.arrivedFollow = 0;
        run.untilFollow = now + EXPLORE_WALK_MAX;
      }
    }

    /** Whether a spot is somewhere a cat can be seen — the ride's test for a
     *  held destination that the page has carried off. Half a pixel of slack,
     *  as `isClearSpot` allows, for a spot that was clamped to the bound itself. */
    function inView(spot: Point): boolean {
      const kept = clampToViewport(spot);
      return Math.abs(kept.x - spot.x) <= 0.5 && Math.abs(kept.y - spot.y) <= 0.5;
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
       *  no click, no resize. What exploring and napping are measured on.
       *  Never longer than `idleFor`, so every existing reset of the pointer
       *  clock still counts as a sign of life without having to say so twice. */
      const aloneFor = now - Math.max(lastMoveRef.current, lastSignRef.current);
      const pointer = pointerRef.current;
      /** The reader is about, so the pair are out exploring whenever nothing
       *  in the cascade below has a better claim on them. Off once nobody has
       *  done anything for `EXPLORE_IDLE_MS`, and off with no roaming layer to
       *  explore in at all. The nap (`napping`, below) outranks it from
       *  `sleepAfter` — which is `EXPLORE_IDLE_MS` by day and
       *  `NIGHT_SLEEP_TRIM` sooner at night — and they nap where they are
       *  heading, not in a bed. */
      const exploring = roamingRef.current && aloneFor < EXPLORE_IDLE_MS;
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
        // The explorers' destination rides too, so a stop beside a paragraph
        // stays beside it rather than staying put on the glass while the
        // paragraph scrolls away. Carried out of view, it is no longer a
        // destination at all, and is dropped for the next frame to re-pick. A
        // perch's follow spot is never walked to — she trails him there — so
        // only his spot decides whether a perch is still on screen.
        const heading = exploreRun.current;
        if (heading) {
          const lead = { x: heading.spots.lead.x + ride.dx, y: heading.spots.lead.y + ride.dy };
          const follow = { x: heading.spots.follow.x + ride.dx, y: heading.spots.follow.y + ride.dy };
          if (inView(lead) && (heading.perch || inView(follow))) heading.spots = { lead, follow };
          else exploreRun.current = null;
        }
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

      // The open panel, on the same "reads first" pass as the two rects above
      // and for the same reason. Its box does not move for as long as it is
      // up, so this is one measurement off one element on the frames a visitor
      // has the menu open, and nothing at all the rest of the time — see
      // `keepOutOfPanel`, the only thing that wants it.
      //
      // Off the panel's own ref rather than off `openRef`, which is the same
      // fact one frame late: it is written from a `useEffect`, so on the first
      // frame the panel is mounted — and painted, and already covering
      // whatever the cats were standing on — it still reads false. A ref is
      // populated during the commit that mounts the element, which makes
      // "there is a panel on screen" and "there is a box here to stay out of"
      // the same question, asked once.
      const panelBox = roamingRef.current
        ? (panelRef.current?.getBoundingClientRect() ?? null)
        : null;

      /**
       * D4: the guided tour, advanced before `forced` reads it.
       *
       * Outranks the nap contract on purpose — through round 17 the career
       * tree's plinth carried `data-cat-nap`, so without this the plinth's
       * dwell would have hijacked the tour the moment the pair arrived at the
       * tree. Round 18 retired the plinth and nothing on the page declares a
       * nap spot today, so the precedence currently guards nothing; it stays
       * so the next element that declares one cannot hijack the tour either.
       * It does not outrank the escort: a visitor who sends the cats to bed mid-tour
       * has `sendToBed` end the tour first (see below), so `run` is never
       * actually true at the same time as `tourRef.current` in practice — the
       * `!run` guard here is the same defensive shape `nap` is read with, for
       * the one caller that is not this component.
       */
      let tour = tourRef.current;
      if (tour && !run) {
        const tourStopList = stopsFor(tour.route);
        const stop = tourStopList[tour.index];
        if (!stop) {
          // Defensive only — see `stopsFor`'s own comment. A well-formed
          // `GREY_MIDDLE` never produces a gap, and the increment below is
          // gated on this same array's length via `isLastStop`, so
          // `tour.index` should never outrun it. If it ever does, ending the
          // tour beats reading a field off `undefined` one line below.
          tourRef.current = null;
          tour = null;
          setTourView(null);
          duetRef.current = null;
          setDuetBeat(null);
        } else {
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
            if (isLastStop(tour.index, tourStopList.length)) {
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
             * The play's choreography: Contact is the only stop that gets any,
             * and it reuses existing mechanics only. About, Worlds and Journey
             * get nothing here on purpose — the pair's own default sit, and
             * the facing they already carry in from the walk, already read as
             * "peering up" and "looking up at the figure"; adding a forced
             * pose to a cat already sitting still would be drawing the same
             * thing twice. Contact arms a plain-until window, read directly
             * from the tour's own code paths rather than through the generic
             * `rushing`/huddle checks, which never get a turn while `forced`
             * is already `"tour"`; when it lapses, the pair's `cheerRef`
             * flourish fires (see the startle-awake note further down). The
             * window self-expires on its own clock, so ending the tour drops
             * it along with everything else.
             */
            if (stop.sectionId === "contact") {
              tourNapUntil.current = now + CONTACT_NAP_MS;
            }
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

      // "Parked" means the pointer is not driving them: there is none, it has
      // held still past `SETTLE_AFTER`, or it is further than `CHASE_RADIUS`
      // from the lead — a reader using the page with a hand on the mouse, not
      // somebody playing with the cat. It is not "standing still" — a parked
      // pair are usually exploring — and everything gated on it downstream (a
      // scene may open, a scene is not dropped, the duet may speak) is gated on
      // exactly the right thing: nobody is steering. So a far-off mouse move
      // neither starts a chase nor ends a scene.
      const pointerNear =
        pointer !== null && distance(pointer, centreOf(grey.pos)) <= CHASE_RADIUS;
      const parked = !forced && (!pointerNear || idleFor > SETTLE_AFTER);
      /** Night flavour: the nap comes `NIGHT_SLEEP_TRIM` sooner. Read from a
       *  ref rather than the two thresholds themselves, so the one number that
       *  changes with the theme is computed once a frame rather than smeared
       *  across every place the threshold is read. */
      const sleepAfter = nightRef.current ? EXPLORE_IDLE_MS - NIGHT_SLEEP_TRIM : EXPLORE_IDLE_MS;

      /* -------------------------------------------------------------- play -- */

      /**
       * A scene, on the rare frame every condition lines up.
       *
       * The list of things that end one is longer than the list that starts one,
       * and that asymmetry is the design: the cats' first duty is to the
       * visitor, so anything with a claim on them — the escort, a nap spot, the
       * toolkit, or a moving pointer coming within `CHASE_RADIUS` of the lead —
       * drops the scene on the frame it appears rather than finishing the beat.
       * A pointer moving further off is a reader using the page, not a claim
       * on the cats, and leaves the scene alone (see `parked`). That holds for the
       * scenes with no prop as much as for the ones with: a chase abandoned
       * mid-sprint just leaves two cats going back to trailing the cursor.
       *
       * One exception, and it is the whole of FB-9.1: a scene the visitor
       * *asked for* is not an interruption of what they are doing, it is what
       * they are doing. Until now the panel handed one back and the very next
       * pointer move took it away — click "Toss the yarn", lift your hand off
       * the menu you just used, and the yarn was gone before it landed. So a
       * requested scene is held through the pointer, and through it alone.
       * Everything else still ends it on the frame it appears: any forced
       * state (the escort, the guided tour, a nap spot, the contact form's
       * secret, the origin-story watch, the panel being reopened), the page
       * scrolling or resizing out from under the probe, a focus ring arriving
       * on the lead mid-peek, a new request, the mode changing, the scene
       * finishing. A request still walking to its stage can also die two ways
       * a running scene cannot, neither of them through `endPlay`: its walk
       * outlasting `STAGE_WALK_MAX`, or the stage refusing it on arrival (see
       * "A requested scene, arriving", below).
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
      // The first wait of the visit.
      if (playAt.current === 0) playAt.current = scheduleNextPlay(now);

      /**
       * Waking up. The frame after both cats were asleep, if nothing forced is
       * holding them and the reader is back, each stretches where it lies for
       * `WAKE_STRETCH_MS` before going anywhere — a cat that springs straight
       * from asleep into a walk reads as a drawing being moved, not an animal
       * getting up. Armed on that one frame (`sleptLastFrame` is the previous
       * frame's `asleep`, below) and read as a window, so it ends on its own.
       * A forced state (the escort, a nap spot, the tour, the panel …) has a
       * better claim and skips it.
       */
      if (sleptLastFrame && !forced && aloneFor <= sleepAfter) stretchUntil = now + WAKE_STRETCH_MS;
      const stretching = !forced && now < stretchUntil;

      /** Non-null only while the lead is actually chasing something — which a
       *  held scene outranks, because a cat cannot both act out the scene it was
       *  asked for and walk after the cursor, and which waits out the stretch.
       *  Computed after the cancellation above so it reads the outcome rather
       *  than racing it. */
      const chase = !forced && !parked && !asked && !stretching ? pointer : null;

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
        // Both ways out of here that open nothing — the walk expiring, the
        // re-probe declining — drop the request without passing through
        // `endPlay`, so each clears the "asked" mark itself. Left set, the next
        // scene the idle timer opened would inherit it and be held through the
        // pointer as if the visitor had chosen it.
        if (now > arriving.expires) {
          queued.current = null;
          askedRef.current = false;
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
            askedRef.current = false;
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
        // Excludes "watch": the origin-story show runs ~26s, past
        // `sleepAfter` (20s, 17s at night), and the watcher is deliberately
        // motionless the entire time — nothing else refreshes `lastSignRef`
        // while it stands. Without this clause both cats would pose asleep
        // for the back half of every show, same as the tour and the escort
        // never let idle sleep claim them mid-scene. Excludes "secret" for a
        // simpler reason: WP-E's own contract is "perk up (alert pose)", so
        // idle sleep must never override it for as long as the attribute
        // stands — sitting up, not settling in, is the whole point of the
        // reaction.
        (forced !== "watch" && forced !== "secret" && aloneFor > sleepAfter && !beat);
      /**
       * The nap — the ephemeral sleep, as opposed to the resting box.
       *
       * This used to carry a `pointer !== null` clause, guarding against the
       * idle clocks starting at zero: without it a fresh load was already
       * "idle" and the first thing a visitor saw was two cats asleep they had
       * never left alone. The clocks are stamped when the loop starts now
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
       * A running scene holds the nap off. Play can only *start* while the
       * reader is about, but the last beat of a yarn ball — or of a bowl the
       * pair are still eating out of — can outlive the threshold, and two cats
       * dropping off mid-scene is the one way this could read as broken.
       */
      const napping = !forced && aloneFor > sleepAfter && !beat;

      // Starting one is the last thing considered, and the narrowest: nobody
      // steering, both standing still (an explorer between walks), not
      // napping, and the clock is up. `openPlay` may still decline — a page
      // with no whitespace near the cats has nowhere safe for this, and an
      // anchored scene has no anchor on most of the page — in which case it
      // backs off rather than re-probing the layout on the next frame.
      //
      // The pointer clause is what stops a page nobody has touched producing a
      // scene at somebody who has not arrived yet.
      if (
        !beat &&
        !forced &&
        parked &&
        !napping &&
        pointer !== null &&
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
         * part, and this is at most eight probes on one frame, and when none
         * of them fits, not again for `PLAY_RETRY`.
         */
        let opened: Play | null = null;
        for (const kind of sceneOrder({ night: nightRef.current, section: sectionRef.current })) {
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

      /* ------------------------------------------------------------- act -- */

      /**
       * The running beat's act, if it has one and its reading time is not up.
       * Derived from `duetRef` every frame (see `liveAct`) rather than stored,
       * so it ends on the frame its beat does, by whichever path the beat
       * ends — the clock above, a tap on the tabby, or any of the clears.
       *
       * Only the speaker acts, and only once everything that outranks an act
       * has passed on the cat: each one's pose chain below reaches its act branch
       * after walking, a play scene, dozing (the Contact stop's fake-nap is
       * dozing) and a cheer (the storm/sun/rain flourish is a cheer). What is
       * left is the scripted motion that is not a pose — the origin-story's
       * storm dash and rain huddle, and the fast-scroll dash the storm
       * borrows — and `choreographed` is that: a cat being placed by one of
       * them does not stop to act. A cat mid-walk shows its walk; the act
       * starts when it next stands, if the beat is still live by then.
       *
       * Acts never touch `keepGoing`: an act is read off its beat each frame
       * and asks nothing of the loop, so the loop never runs a frame longer
       * for an act than it would for the beat alone.
       */
      const act = liveAct(duetRef.current, now);
      const choreographed =
        rushing ||
        (watch !== null &&
          (now < rainHuddleUntil.current || (rushRef.current !== null && now < rushRef.current.until)));
      let leadHopping = false;
      let followHopping = false;

      /* ------------------------------------------------------------ lead -- */

      let leadWant: Point;
      let followWant: Point;
      /** True on the frames the cascade sent them exploring — which is what
       *  lets an explorer's arrival facing hold (see below). */
      let explored = false;

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
        leadWant = spots.lead;
        followWant = spots.follow;
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
        // like the corner, this is a reaction to the *page*
        // moving, not a place chosen against whatever happens to be printed
        // there this frame.
        const dir = rushRef.current!.dir;
        const view = viewport();
        const edgeY = dir === 1 ? safeTop() + 4 : Math.max(safeTop(), view.height - CAT_H - 4);
        leadWant = clampToViewport({ x: view.width - CAT_W - 26, y: edgeY });
        followWant = followHome(leadWant);
      } else if (stretching) {
        // Just woken: stretch where they lie first — see `stretching` above.
        leadWant = grey.pos;
        followWant = tabby.pos;
      } else if (chase) {
        // A chase is the one thing that throws the explorers' plan away: when
        // it ends they explore on from wherever it left them, rather than walk
        // back to a spot picked before it.
        exploreRun.current = null;
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
      } else if (napping) {
        // Nobody about for `EXPLORE_IDLE_MS`: nap where they are going. Each
        // finishes the walk it is on — the explorer's stop it was heading for,
        // which was probed clear when it was chosen and has ridden the page
        // since — and the dozing pose below lays it down on arrival; one
        // already standing there lies down where it stands. No plan at all (a
        // chase dropped it, a resize, a scene ending) means the nearest clear
        // ground. Not the corner: the furniture is for the resting box.
        const heading = exploreRun.current;
        if (heading) {
          leadWant = heading.spots.lead;
          followWant = heading.perch ? trailLead() : heading.spots.follow;
        } else {
          const rest = settled();
          leadWant = rest.lead;
          followWant = rest.follow;
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
        // enough for the whole scene. It cannot outlast the nap either: the
        // request stamped the presence clock, and the walk gives up long before
        // `EXPLORE_IDLE_MS`.
        leadWant = walking.spots.lead;
        followWant = walking.spots.follow;
      } else if (exploring) {
        // Off about their own business. `exploreTo` owns both halves of that —
        // where, and for how long — and every place it can name went through the
        // same probe a settle position does, because it *is* one: they are going
        // there to stand there.
        //
        // On an ordinary stop the two walk independently, each to a spot in its
        // own half of the page, 160px and a column apart (`exploreApart`), so
        // their walks only cross when they set out from the wrong sides — after
        // a chase or a perch, say. A perch is the exception: it seats the pair
        // side by side, so their walks converge, and converging walks are what
        // round 15 caught crossing the lead's toggle. So on a perch stop she
        // trails him (`trailLead`) the whole way, as every long walk that ends
        // beside him does, and `exploreTo` counts her as arrived at the trail
        // spot — which is what broke when round 15 tried trailing her to every
        // wander stop: the arrival check still wanted her at a spot she was no
        // longer walking to.
        const going = exploreTo(now);
        leadWant = going.lead;
        followWant = going.follow;
        explored = true;
      } else {
        // Nothing to do and nowhere to go: not exploring, and not napping.
        // Reached only on the frames between the end of an escort and the loop
        // being put away (no roaming layer left to explore), or on the single
        // frame the idle clock sits exactly on the threshold. Hold on clear
        // ground near where they stand.
        leadWant = settled().lead;
        followWant = trailLead();
      }

      /**
       * WP-R round 15: while the page is riding, `leadWant`/`followWant`
       * above are not wrong exactly — they are answering a question that
       * does not matter yet. Every one of those branches was computed
       * against `pos` values already carrying this frame's ride, so a target
       * that tracks content live (a nap spot, a tour stop, the watch, an
       * explorer's stop, which rides with the page) has already moved by the
       * same amount the ride just did and asking `advance` to close that gap
       * would spend a frame of real walking speed correcting an error the
       * ride already corrected — the fight the file banner on `rideStep`
       * describes. A target that does *not* track content live — the
       * `settleSpots` a held scene stands on — is worse than merely
       * redundant: it is still sitting in the pre-scroll viewport
       * coordinates, and closing the gap to it would walk the pair
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
         * reading" never made it to bed, the since-retired wander scene
         * test) — ordinary trailing (`FOLLOW_GAP`, 26px) and the resting-box
         * slots both sit
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
      // Round 14: once he has actually stopped at an explorer's stop, his
      // facing holds the roll `exploreTo` made on arrival rather than
      // whatever the travel-direction check just above last left it as —
      // see the note on `ExploreRun`. Gated on `leadRate <= 0.3`, the same
      // "not really walking any more" threshold the pose branches below
      // read, so this never fights the travel-direction facing while he is
      // still closing the last few pixels of the walk.
      if (explored && exploreRun.current?.arrivedLead && leadRate <= 0.3) {
        grey.facing = exploreRun.current.faceLead;
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
      } else if (stretching) {
        // Getting up from a nap — see `stretching` above.
        calmIdle(grey, now);
        grey.pose = "stretch";
      } else if (cheering) {
        // D3: a copy confirmation, a sent message or a theme toggle, none of
        // which know a cat is listening — see the `cheerRef` effects above.
        // Both halves of the pair get a pose they already have; nothing new
        // is drawn for this.
        calmIdle(grey, now);
        grey.pose = "stretch";
      } else if (act?.speaker === "grey" && !choreographed) {
        // His line, acted out — see `act` above.
        calmIdle(grey, now);
        const drawn = actPose(act.act);
        grey.pose = drawn.pose;
        leadHopping = drawn.hopping;
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
      // actually stopped at an explorer's stop, her facing holds `exploreTo`'s
      // own roll rather than the travel-direction check just above.
      if (explored && exploreRun.current?.arrivedFollow && followRate <= 0.3) {
        tabby.facing = exploreRun.current.faceFollow;
      }
      if (followRate > 0.3) {
        calmIdle(tabby, now);
        tabby.pose = "walk";
      } else if (beat) {
        calmIdle(tabby, now);
        tabby.pose = beat.followPose ?? "sit";
        tabby.facing = beat.focus.x > tabby.pos.x + CAT_W / 2 ? 1 : -1;
      } else if (dozing) {
        calmIdle(tabby, now);
        tabby.pose = "sleep";
      } else if (stretching) {
        calmIdle(tabby, now);
        tabby.pose = "stretch";
      } else if (cheering) {
        calmIdle(tabby, now);
        tabby.pose = "bat";
      } else if (act?.speaker === "tabby" && !choreographed) {
        // Her line, acted out — see `act` above.
        calmIdle(tabby, now);
        const drawn = actPose(act.act);
        tabby.pose = drawn.pose;
        followHopping = drawn.hopping;
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
          hopping: false,
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

      /* ------------------------------------------------ room for the menu -- */

      /**
       * Both cats' positions are final for the frame here, whichever of the
       * dozen branches above chose them — which is the only place an
       * invariant about where a cat may *be* can live, for exactly the reason
       * the note on `keepClearOfControl` gives about the other one.
       * `panelBox` is non-null only while the menu is on screen *and* the
       * pair are roaming: pinned to the corner by CSS there is no transform
       * to correct and no walk to catch.
       */
      if (panelBox) {
        const leadRoom = keepOutOfPanel(grey.pos, LEAD_PAD_X, LEAD_PAD_Y, panelBox);
        grey.pos.x = leadRoom.x;
        grey.pos.y = leadRoom.y;
        let followRoom = keepOutOfPanel(tabby.pos, 0, 0, panelBox);
        /*
         * And on his row, she is never on or to the right of him. Her seat in
         * the corner is on his left (`followHome`), and `keepOutOfPanel`
         * drops each cat onto the corner's row keeping its own x — so a tabby
         * that was trailing on his right lands on or past him, and her walk
         * home then crosses straight through him: for about a third of a second
         * she covers the toggle, the control a visitor presses to close the
         * panel, and a click meant for it lands on her (axe: `target-size`).
         * So while the panel is up, a tabby on his row (vertically within a
         * cat's height of him) is held at least a seat to his left. At home
         * `leftOfHim` is exactly `followHome().x`, so the seats they end on
         * do not change. Known limit: with him within ~76px (`CAT_W +
         * FOLLOW_GAP`) of the window's left edge there is no seat on his
         * left, `clampToViewport` brings her back to the edge, and she can
         * still overlap him there.
         */
        if (Math.abs(followRoom.y - grey.pos.y) < CAT_H + LEAD_PAD_Y) {
          const leftOfHim = grey.pos.x - CAT_W - FOLLOW_GAP;
          if (followRoom.x > leftOfHim) followRoom = clampToViewport({ x: leftOfHim, y: followRoom.y });
        }
        tabby.pos.x = followRoom.x;
        tabby.pos.y = followRoom.y;
      }

      /* ----------------------------------------------------------- paint -- */

      paint(leadNode.current, grey.pos);
      paint(followNode.current, tabby.pos);
      if (run) paint(policeNode.current, run.police.pos);
      if (duetRef.current) {
        paint(thienNode.current, thien.current.pos);
        if (thienArt.current) thienArt.current.style.transform = `scaleX(${thien.current.facing})`;
        // The bubble first, then the caption kept off it as well as off both
        // cats: both are painted against the positions just written above, in
        // the same frame, so neither can be drawn over a cat that has since
        // moved — see `placeBeside`.
        //
        // A hopping cat's box reaches the top of the hop (`drawnBox`). The
        // committed frame is read beside this one because the drawing hops on
        // React's clock, a commit behind the loop: a cat whose act just ended
        // is still drawn hopping until that commit lands.
        const shown = hopsOf(committed.current);
        const hops: Hops = { lead: leadHopping || shown.lead, follow: followHopping || shown.follow };
        const cats = catBoxes(grey.pos, tabby.pos, hops);
        const bubble =
          paintBubble(greyBubble.current, grey.pos, cats, hops.lead) ??
          paintBubble(tabbyBubble.current, tabby.pos, cats, hops.follow);
        paintCaption(thienCaption.current, thien.current.pos, bubble ? [...cats, bubble] : cats);
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

      // The bubbles are painted every frame either exists, rather than left
      // static, because the settled spot they appeared beside can still be
      // nudged by `keepInView` on a resize — and, since the final fix wave,
      // because the other cat can walk into the side they were on. That paint
      // now happens with mini-Thien's caption above, before the toy, so the
      // caption can be kept off the bubble's own box.

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
      }

      const asleep = grey.pose === "sleep" && tabby.pose === "sleep";
      sleptLastFrame = asleep;
      const busy = leadRate > 0.05 || followRate > 0.05 || run !== null;
      // Both asleep and neither moving: the loop stops, and the page with it.
      // Any input restarts it — see `wake`, which every listener calls.
      const keepGoing = busy || !asleep;

      const next: Frame = {
        lead: {
          pose: grey.pose,
          phase: grey.phase,
          facing: grey.facing,
          blinking: tickBlink(grey, now),
          flick: tickFlick(grey, now, grey.pose !== "sleep"),
          hopping: leadHopping,
        },
        follow: {
          pose: tabby.pose,
          phase: tabby.phase,
          facing: tabby.facing,
          blinking: tickBlink(tabby, now),
          flick: tickFlick(tabby, now, tabby.pose !== "sleep"),
          hopping: followHopping,
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
     *     is what wakes them from a nap.
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
    /** Whether a scroll or resize is waiting on `recheck`, as opposed to only
     *  a body resize — see `scheduleRecheck`. */
    let recheckPageMoved = false;

    /**
     * Re-probe the explorers' held stop, and drop it if its ground has stopped
     * being clear. Returns whether it dropped one.
     *
     * The destination has been riding with the page (see the ride in `step`),
     * so after a scroll it is still beside whatever it was beside — but not
     * everything moves with the document during a scroll (a sticky rail, a
     * pinned stage), and not every change to the ground is a scroll at all: a
     * placeholder swapped for the thing it held a place for, a panel opening, a
     * list re-laying out all move content under a resting cat while the page
     * stands still. So once a scroll, a resize or a change in the body's size
     * settles, the stop is re-probed here and dropped only if its ground is no
     * longer clear. Dropping it on every scroll instead would have a reader who
     * scrolls as they read keep the pair forever setting off and never
     * arriving.
     *
     * A CSS animation that finishes is seen too (`animationEnded` below): the
     * page's own entrance animations are transform-only, so the hero's content
     * is up to ten pixels lower than where it settles while the pair wake and
     * plan their first stop, and moves up under it without a scroll, a resize or
     * a change to `body`'s size. The re-probe runs when each one ends, not
     * while it plays, because the ground it reads is where the content ends up.
     *
     * What still goes unseen: a shift that changes no size on `body` and ends
     * no animation — content swapped for content of the same height, a
     * transform from a script or a transition, something absolutely positioned
     * moving over the stop. That stop stands until its stay or walk runs out or
     * something else drops it.
     *
     * `heldExploreClear` (companion-moods.ts) is the probe. A perch: his spot
     * alone, three points (she trails him rather than walking to hers).
     * Otherwise each cat's three points, plus the head band only where that
     * head was clear when the stop was planned (`holdExplore` in `exploreTo`
     * records it): the page's margin rail is `position: sticky`, so a scroll
     * slides it over a cat riding the page and can bring it over a head that
     * was clear, feet still clear — and a `findClearSpot` or `nearbySpots()`
     * fallback planned with its head already on content is not dropped for the
     * ground it was put on — after a scroll. After an animation end or a body
     * resize with no scroll in the window, `groundSettled` drops it too: the
     * ground it was put on has gone (see `heldExploreClear`).
     */
    const reprobeHeld = (groundSettled: boolean): boolean => {
      const heading = exploreRun.current;
      if (heading && !heldExploreClear(heading, groundSettled)) {
        exploreRun.current = null;
        return true;
      }
      return false;
    };

    /**
     * The throttled half of `onPageMoved`, and the whole of what a body resize
     * gets. One timer for both, so a body resize and a scroll landing inside
     * the same 250ms cost one round of hit tests, not two: whichever arrives
     * first starts it, and anything inside the window rides along — exactly
     * as a second scroll always has. If any of those was a scroll or resize,
     * the timer does everything it always did for one; if all of them were
     * body resizes, it does only the re-probe, plus clearing the settle spots
     * when that drops the stop.
     *
     * A body resize on its own is not a sign that anybody is here — a page can
     * re-lay itself out with nobody watching (a lazy chunk landing, a feed
     * filling in) — so it stamps no presence clock, ends no scene, and wakes
     * the loop only when the re-probe dropped the stop and the pair have
     * somewhere new to choose. A layout that keeps changing must not keep two
     * napping cats up, or keep a page at rest asking for frames.
     */
    const scheduleRecheck = (pageMoved: boolean) => {
      if (pageMoved) recheckPageMoved = true;
      if (recheck) return;
      recheck = window.setTimeout(() => {
        recheck = 0;
        const full = recheckPageMoved;
        recheckPageMoved = false;
        if (!full) {
          // On a drop, the settle spots go too: they were resolved under the
          // old layout, and a pair napping with no plan falls back to them.
          // A cache drop and nothing more — no hit tests, and only on a drop.
          // Only an animation ending or the body resizing reached here — no
          // scroll — so the ground has settled (`heldExploreClear`).
          if (reprobeHeld(true)) {
            settleSpots.current = null;
            wake();
          }
          return;
        }
        // The chrome may have grown, shrunk or unpinned, so the band the cats
        // cannot be seen in is re-measured here rather than per frame.
        refreshSafeArea();
        settleSpots.current = null;
        reprobeHeld(false);
        lastTone.current = 0;
        // A scene's clearance was probed against the layout as it stood when it
        // opened, and this is the event that says that layout has moved. The
        // cats re-probe and shuffle; a toy cannot, so it goes.
        endPlay();
        wake();
      }, 250);
    };

    const onPageMoved = (resized: boolean) => {
      lastSignRef.current = performance.now();
      if (resized) {
        refreshSafeArea();
        settleSpots.current = null;
        exploreRun.current = null;
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
      scheduleRecheck(true);
    };

    /**
     * Ground that moves under a resting cat with no scroll and no resize. The
     * companion layer is `position: fixed`, so nothing the cats do changes the
     * body's size, and this can never be answering the cats themselves. A
     * `ResizeObserver` reports once as soon as it starts observing, to give the
     * size the body already has, so that first report is skipped. Skipped
     * whole, though: a real change to the body that lands before it is
     * delivered (the first frame after the loop starts) is folded into it and
     * goes unseen too — a one-frame window at loop start.
     */
    let bodySeen = false;
    const bodyResized = new ResizeObserver(() => {
      if (!bodySeen) {
        bodySeen = true;
        return;
      }
      scheduleRecheck(false);
    });

    /**
     * A CSS animation on the page has finished: content it was offsetting is
     * now where it stays, so a held stop is re-probed against that (see
     * `reprobeHeld`). `animationend` bubbles, so one listener on the document
     * hears every animation on the page. The companion's own are skipped — a
     * cat's animation ending moves no ground, and its drawing is not content.
     * An animation that never ends (an infinite one) never asks, and a burst
     * of them ending together costs one round of hit tests: `scheduleRecheck`
     * coalesces what lands inside its window.
     */
    const animationEnded = (event: AnimationEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-companion]")) return;
      scheduleRecheck(false);
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
    // counted as `EXPLORE_IDLE_MS` of it.
    lastSignRef.current = performance.now();
    lastMoveRef.current = lastSignRef.current;
    start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    bodyResized.observe(document.body);
    document.addEventListener("animationend", animationEnded);
    return () => {
      stop();
      // A nap does not outlive the loop that owns it. Whatever put the loop
      // away — a mode change here, or the same change arriving from another
      // tab — is a fresh start, and cats returning to a roaming page should
      // not arrive already `EXPLORE_IDLE_MS` bored. (The setup stamps both
      // clocks again when the loop next starts; this covers the gap.)
      lastMoveRef.current = performance.now();
      // Nor does a toy. It is only ever advanced from inside this loop, so one
      // left behind would be a drawing stopped mid-roll on the page.
      endPlay();
      // Nor a tour or a duet scene — both are only ever advanced from inside
      // this loop too, and a mode change mid-tour (touch/reduced-motion never
      // reach here, but the visitor sending the cats to bed does) must not
      // leave the HUD or a bubble on the page with nothing left driving it.
      tourRef.current = null;
      tourSpots.current = null;
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
      bodyResized.disconnect();
      document.removeEventListener("animationend", animationEnded);
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
      // nothing at all to cheer about. The cheer is still the existing pair
      // flourish (grey stretches, tabby bats) D3 already gives a copy
      // confirmation or a theme toggle — see `cheerNow` a few effects up,
      // mirrored here rather than called directly since that closure belongs
      // to a different effect — not a tabby-only hop. A hop does exist now,
      // but it is a different thing: the beat's own `hop` act (`actPose`),
      // played by whichever cat narrates the beat, never tied to the tabby,
      // and yielding to `cheering` in the pose chain — so on a beat that
      // arms both, the cheer plays first and the hop only once it — and, on a
      // storm beat, the startle dash (`choreographed`) — has lapsed, if the
      // beat is still live by then.
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
   * scene may only open while the pair are parked — nobody steering them with
   * the pointer — and that is true the instant somebody clicks a button in a
   * panel the cats are already sitting under, so rather than adding a second
   * way in past the gate, this backdates the clock the gate reads. Everything
   * downstream is then the ordinary path: the same `openPlay` probe against the
   * same page and the same beat machinery. The cancellation is the ordinary one
   * too, with one exception: `askedRef` holds a requested scene through the
   * pointer (FB-9.1 — the hand that clicked the menu is still on the mouse).
   * Everything else that ends a scene still ends it: any forced state (the
   * escort, the guided tour, a nap spot, the contact form's secret, the
   * origin-story watch, the panel reopening), a scroll or a resize, a focus
   * ring arriving on the lead mid-peek, a new request for a scene or the tour,
   * the loop being put away (a mode change, the bed), or the scene finishing.
   * A request that has to walk to its stage can also be dropped before it
   * opens, in two ways that bypass `endPlay`: the walk outlasting
   * `STAGE_WALK_MAX`, or the re-probe on arrival declining. Both clear
   * `askedRef` themselves, so the mark never outlives the request it was for.
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
      playAt.current = scheduleNextPlay(now);
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
    // Measured against *this* route's own stop list, not `TOUR_STOPS.length`
    // — see `isLastStop`'s and `stopsFor`'s comments for why the two can
    // disagree.
    const stops = stopsFor(run.route);
    if (isLastStop(run.index, stops.length)) {
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
    // `isLastStop` just proved `run.index` is in range for `stops`; the
    // guard is defensive only, same reasoning as the movement effect above.
    const nextStop = stops[run.index];
    if (nextStop) scrollToStop(nextStop.sectionId);
    lastSignRef.current = performance.now();
    wake();
  }

  /**
   * The HUD's fork in the walk, offered once — see `TourHud`'s
   * `showRouteChoice` — after About's scene, the only stop every route still
   * shares now that Worlds and Journey are the derived middle (see
   * `companion-tour.ts`'s `GREY_MIDDLE` and `stopsFor`). Picking either cat settles
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

  function sendToBed() {
    setOpen(false);
    endTour();
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
    focusWish.current = "cat";
    // Back out onto the page, exploring.
    setCompanionMode("roam");
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

  // The tour's own current stop list — computed once here rather than three
  // times inside the JSX below (`totalStops`, `label` and `isLast` all need
  // it). `stopsFor(route).length` is the count that matters, never the
  // fixed `TOUR_STOPS.length`: see `stopsFor`'s and `isLastStop`'s own
  // comments for why a stale id in `GREY_MIDDLE` can make the two disagree.
  // `currentTourStop` guards the render itself against that same case —
  // `stopsFor` never produces a gap, so this should always be defined, but
  // an `undefined` label beats a render-time crash if it somehow is not.
  const tourStops = tourView ? stopsFor(tourView.route) : null;
  const currentTourStop = tourStops && tourView ? tourStops[tourView.index] : undefined;

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
            className="pointer-events-none absolute left-0 top-0 inline-flex w-max max-w-[12rem] items-center gap-1 border border-rule bg-surface px-2 py-1 text-fg"
          >
            {/* The beat's picture, before the meow and outside its `<p>`: the
                paragraph still holds the meow and nothing else. Ink is
                `currentColor`, so `text-fg` above is the whole of its colour. */}
            {duetBeat.icon ? <CatGlyph name={duetBeat.icon} /> : null}
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
          onPlay={requestPlay}
          onTour={requestTour}
          onSendToBed={sendToBed}
          panelRef={panelRef}
        />
      ) : null}

      {/* D4/D5: the tour's accessible surface, up whenever a tour is running —
          the toolkit panel above and this are mutually exclusive by
          construction, since starting a tour closes the panel and the panel
          offers no route back into itself until the tour ends. */}
      {tourView && tourStops ? (
        <TourHud
          stopIndex={tourView.index}
          totalStops={tourStops.length}
          label={currentTourStop?.label ?? ""}
          lines={tourView.lines}
          isLast={isLastStop(tourView.index, tourStops.length)}
          // The one fork in the walk: offered exactly at About (index 0, the
          // only stop every route still shares — see `stopsFor`) once its
          // scene has actually arrived — not while the pair are still
          // walking there — replacing "Next stop" rather than sitting
          // beside it. See `chooseRoute`.
          showRouteChoice={tourView.index === 0 && tourView.lines.length > 0 && !tourView.routeChosen}
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
