"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { profile } from "@/content/portfolio";
import { cn } from "@/lib/cn";
import CompanionCat, { CAT_H, CAT_W, type CatPose } from "./CompanionCat";
import RestingBox from "./RestingBox";
import ToolkitPanel, { PANEL_ID } from "./ToolkitPanel";
import { setCompanionMode, useCompanionMode } from "./companion-state";
import {
  clamp,
  clampToViewport,
  findClearSpot,
  syncTone,
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
 *
 * On touch devices there is no cursor to follow, so the roaming behaviour is
 * skipped entirely and both cats simply rest in the corner as a toolkit button.
 * The same is true for anyone who has asked for reduced motion — and because
 * that path has no roaming layer at all, the police-cat escort and the nap
 * contract below are skipped with it, landing straight in their end state.
 */

/** How close the lead cat is willing to get to the pointer, in px. */
const LEAD_SPACE = 96;
/** The gap the tabby keeps behind the grey one, and how far she lets that gap
 *  stretch before she can be bothered to close it. The slack is what makes her
 *  move in bursts instead of gliding along on a fixed leash. */
const FOLLOW_GAP = 26;
const FOLLOW_SLACK = 58;

/** Pointer-idle time before the cats settle, then before they curl up, in ms. */
const SETTLE_AFTER = 2400;
const SLEEP_AFTER = 14000;

/** px per frame at 60fps, scaled by distance so they lope rather than snap. */
const LEAD_SPEED = 4.4;
const FOLLOW_SPEED = 3.4;
const FOLLOW_SPRINT = 6.2;
/** Being shooed is faster than strolling — and it has to be, because the whole
 *  escort has a ~2.5s budget and the walk can start anywhere on screen. */
const ESCORT_SPEED = 7.5;
const POLICE_SPEED = 8;

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
  /** Follower only. */
  mood: Mood;
  moodUntil: number;
  drift: Spot;
  engaged: boolean;
}

/** The part of a cat React actually draws. */
interface Visual {
  readonly pose: CatPose;
  readonly phase: number;
  readonly facing: 1 | -1;
  readonly blinking: boolean;
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

const RESTING_VISUAL: Visual = { pose: "sit", phase: 0, facing: 1, blinking: false };
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
    mood: "trail",
    moodUntil: 0,
    drift: { x: 0, y: 0 },
    engaged: false,
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
  return {
    x: Math.max(12, window.innerWidth - CAT_W - 26),
    y: Math.max(12, window.innerHeight - CAT_H - 30),
  };
}

function followHome(home: Point): Point {
  return clampToViewport({ x: home.x - CAT_W - FOLLOW_GAP, y: home.y });
}

/** Their two places in the bed, spread across it rather than stacked. */
function slotsForBox(rect: DOMRect): Spots {
  const y = clamp(
    rect.top + rect.height / 2 - CAT_H / 2,
    8,
    Math.max(8, window.innerHeight - CAT_H - 8),
  );
  return {
    lead: clampToViewport({ x: rect.right - CAT_W - 4, y }),
    follow: clampToViewport({ x: rect.left + 4, y }),
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
    Math.round(a.phase * 24) === Math.round(b.phase * 24)
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
  const [frame, setFrame] = useState<Frame>(INITIAL_FRAME);

  const leadNode = useRef<HTMLElement | null>(null);
  const followNode = useRef<HTMLElement | null>(null);
  const policeNode = useRef<HTMLElement | null>(null);
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
  const escortRef = useRef<EscortRun | null>(null);
  const napRef = useRef<Nap | null>(null);
  const napPointer = useRef<Element | null>(null);
  const napFocus = useRef<Element | null>(null);
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

  /* ------------------------------------------------------------- pointer -- */

  useEffect(() => {
    if (!roams || mode === "off") return;
    const onMove = (event: PointerEvent) => {
      lastMoveRef.current = performance.now();
      pointerRef.current = { x: event.clientX, y: event.clientY };
      // A moved pointer invalidates wherever they had decided to settle.
      settleSpots.current = null;
      wake();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
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
      const idleFor = now - lastMoveRef.current;
      const pointer = pointerRef.current;
      const run = escortRef.current;
      const home = homeSpot();

      /* -- reads first, writes afterwards: at most one forced reflow a frame. */
      let nap = napRef.current;
      if (nap) {
        if (now - nap.readAt > 120) {
          nap.rect = nap.el.getBoundingClientRect();
          nap.readAt = now;
        }
        // Scrolled out of sight: nothing to sleep under any more.
        if (nap.rect.bottom < 0 || nap.rect.top > window.innerHeight) nap = null;
      }

      const forced = run ? "escort" : nap ? "nap" : openRef.current ? "corner" : null;
      const parked = !forced && (!pointer || idleFor > SETTLE_AFTER);
      /** Non-null only while the lead is actually chasing something. */
      const chase = !forced && !parked ? pointer : null;
      const dozing = forced === "escort" || forced === "nap" || idleFor > SLEEP_AFTER;

      /* ------------------------------------------------------------ lead -- */

      let leadWant: Point;
      let followWant: Point;
      let followCap = FOLLOW_SPEED;

      if (run) {
        leadWant = run.slots.lead;
        followWant = run.slots.follow;
        followCap = ESCORT_SPEED;
      } else if (nap) {
        const slots = napSlots(nap.rect);
        leadWant = slots.lead;
        followWant = slots.follow;
        followCap = FOLLOW_SPRINT;
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
      } else if (!pointer || idleFor > SLEEP_AFTER) {
        if (!homeSpots.current) homeSpots.current = restSpots(home, followHome(home));
        leadWant = homeSpots.current.lead;
        followWant = homeSpots.current.follow;
      } else {
        // Pointer has stopped: hold station rather than creeping closer — but
        // hold it somewhere they are allowed to sleep.
        if (!settleSpots.current) {
          settleSpots.current = restSpots(grey.pos, {
            x: grey.pos.x - CAT_W - FOLLOW_GAP,
            y: grey.pos.y,
          });
        }
        leadWant = settleSpots.current.lead;
        followWant = settleSpots.current.follow;
      }

      const leadDx = leadWant.x - grey.pos.x;
      if (Math.abs(leadDx) > 2) grey.facing = leadDx > 0 ? 1 : -1;
      const leadStep = advance(grey.pos, leadWant, run ? ESCORT_SPEED : LEAD_SPEED);
      grey.pose = leadStep > 0.3 ? "walk" : dozing ? "sleep" : "sit";
      if (leadStep > 0.3) grey.phase = (grey.phase + leadStep * 0.013) % 1;
      else if (grey.pose === "sit") grey.phase = (grey.phase + 0.006) % 1;

      /* -------------------------------------------------------- follower -- */

      if (chase) {
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

        const gap = distance(tabby.pos, followWant);
        if (!tabby.engaged && gap > FOLLOW_SLACK) tabby.engaged = true;
        else if (tabby.engaged && gap < 5) tabby.engaged = false;
        followCap =
          tabby.mood === "watch" || !tabby.engaged ? 0 : gap > 220 ? FOLLOW_SPRINT : FOLLOW_SPEED;
        if (tabby.mood === "watch") followWant = tabby.pos;
      } else {
        tabby.engaged = true;
        tabby.moodUntil = 0;
      }

      const followDx = followWant.x - tabby.pos.x;
      if (followCap > 0 && Math.abs(followDx) > 2) tabby.facing = followDx > 0 ? 1 : -1;
      const followStep = advance(tabby.pos, followWant, followCap);
      tabby.pose = followStep > 0.3 ? "walk" : dozing ? "sleep" : "sit";
      // A distracted cat looks at what distracted her.
      if (chase && tabby.mood === "watch" && followStep === 0) {
        tabby.facing = chase.x > tabby.pos.x + CAT_W / 2 ? 1 : -1;
      }
      if (followStep > 0.3) tabby.phase = (tabby.phase + followStep * 0.0115) % 1;
      else if (tabby.pose === "sit") tabby.phase = (tabby.phase + 0.0045) % 1;

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

      if (now - lastTone.current > TONE_INTERVAL) {
        lastTone.current = now;
        syncTone(leadNode.current, centreOf(grey.pos));
        syncTone(followNode.current, centreOf(tabby.pos));
        if (run) syncTone(policeNode.current, centreOf(run.police.pos));
      }

      const asleep = grey.pose === "sleep" && tabby.pose === "sleep";
      const busy = leadStep > 0.05 || followStep > 0.05 || run !== null;
      const keepGoing = busy || !asleep;

      const next: Frame = {
        lead: {
          pose: grey.pose,
          phase: grey.phase,
          facing: grey.facing,
          blinking: tickBlink(grey, now),
        },
        follow: {
          pose: tabby.pose,
          phase: tabby.phase,
          facing: tabby.facing,
          blinking: tickBlink(tabby, now),
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

    // Anything that moves the page under a sleeping cat invalidates the spot it
    // chose. Throttled hard: re-probing is cheap but not free, and a scroll
    // fires far more often than a cat needs to reconsider.
    let recheck = 0;
    const onPageMoved = () => {
      if (recheck) return;
      recheck = window.setTimeout(() => {
        recheck = 0;
        settleSpots.current = null;
        homeSpots.current = null;
        lastTone.current = 0;
        wake();
      }, 250);
    };

    restart.current = start;
    start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", onPageMoved, { passive: true });
    window.addEventListener("resize", onPageMoved);
    return () => {
      stop();
      window.clearTimeout(recheck);
      restart.current = null;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onPageMoved);
      window.removeEventListener("resize", onPageMoved);
    };
  }, [loopActive, wake]);

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
      Math.max(8, window.innerHeight - CAT_H - 8),
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

  function sendAway() {
    setOpen(false);
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
    setCompanionMode("roam");
  }

  function turnOff() {
    setOpen(false);
    escortRef.current = null;
    setEscort(null);
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
          style={{ width: (roams ? CAT_W : CAT_W * 2) + 8, height: CAT_H + 6 }}
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
          onSendAway={sendAway}
          onTurnOff={turnOff}
          panelRef={panelRef}
        />
      ) : null}

      {mode === "resting" ? (
        <RestingBox
          occupied={escort !== "herding"}
          onWake={wakeCats}
          onTurnOff={turnOff}
          containerRef={boxRef}
          wakeRef={wakeButtonRef}
        />
      ) : null}
    </div>
  );
}

export default Companion;
