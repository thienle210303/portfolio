"use client";

import type { CatPose } from "./CompanionCat";
import { CAT_H, CAT_W } from "./CompanionCat";
import { TOY_H, TOY_W, type ToyKind } from "./CompanionToy";
import {
  clamp,
  clampToViewport,
  elementBehind,
  isClearSpot,
  safeTop,
  viewport,
  type Point,
} from "./companion-space";
import { type SceneName } from "./scene-names";

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
 *     "rare" still means anything for somebody who is reading. See
 *     `scheduleNextPlay`.
 *  2. **Never in the way.** Every position a cat or a prop can *stop* at is
 *     probed against the page with the same content test the resting spots use,
 *     before the scene starts. A play that has nowhere safe to happen does not
 *     happen — `openPlay` returns null and the schedule backs off. Positions
 *     that are only ever passed through are not probed, because crossing
 *     something is allowed and parking on it is not.
 *  3. **Interruptible at any frame.** A scene has no state anywhere but the one
 *     object the caller holds. Dropping it — because a moving pointer came
 *     within reach of the lead (`CHASE_RADIUS`), because a nap spot called,
 *     because the toolkit opened — is the whole of the cleanup.
 *
 * There is no reduced-motion or touch branch here on purpose: play only ever
 * runs inside the roaming loop, and that loop does not exist for either.
 */

/** How rare "rare" is: the earliest a scene may follow the last one, plus a
 *  spread on top. And only if, when the timer comes up, nobody is steering the
 *  cats and both are standing — the reader may be active or idle — which in
 *  practice makes the observed gap longer than either number. */
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
 * The eight scenes, in two families.
 *
 * The first five are about the cats and whatever the companion brought with it,
 * and they can happen on any clear patch of page:
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
 * The last three are round 9, and they are about the *page*. The owner's note
 * asks for cats that play with what is on the screen — hiding behind a box,
 * scratching at the text, hunting it — so these three take their geometry from
 * something the page actually has rather than from a clear rectangle anywhere:
 *
 *  - **peek** tucks the pair behind an opaque panel that has declared itself
 *    with `data-cat-hide`, so only heads and forepaws clear its top edge. The
 *    panel does not paint over the companion layer — nothing on the page does —
 *    so the hiding is drawn rather than composited: each animal is clipped to
 *    the band above the edge. See `hideCut`, which is the whole trick.
 *  - **scratch** stands a cat on a section's own top hairline and rakes at it
 *    twice. It needs no new markup at all: every `<section>` carries
 *    `hairline-t`, so the rule under the visitor is a fact about the layout.
 *  - **stalk** crouches a short way off the section's `<h2>`, tail going, then
 *    pounces past the end of it and sits looking pleased with itself.
 *
 * All three end where every other scene ends: on ground the same probe
 * approved, never on the words. A scene with nowhere to happen declines, and
 * the three above decline far more often than the first five — an anchor that
 * has scrolled away is not an anchor, and saying nothing is the right answer.
 *
 * A scene is a list of beats and the ms each one lasts. A beat given zero ms is
 * skipped outright, which is how the bowl drops its nudge when there is nowhere
 * clear for the nudged cat to retreat to.
 */
// Derived, not duplicated: the names live in `scene-names.ts`, which carries
// no "use client" so the globe's Animals world can cite the same list from a
// server component. See that file's own note.
export type SceneKind = SceneName;

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
  | "leave"
  /** The walk in. Shared by the three anchored scenes, and the only beat in the
   *  module whose length is a cap rather than a duration: the anchor can be most
   *  of a viewport away, and the beat is over when the lead arrives. */
  | "approach"
  | "tuck"
  | "paw"
  | "rise"
  | "rake"
  | "ease"
  | "crouch"
  | "pleased";

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
  /** The y a hidden animal is cut off at — the top edge of whatever it is
   *  hiding behind. Zero for every scene that hides behind nothing. */
  readonly edge: number;
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
  /** Both animals are behind something: the caller clips each of them to the
   *  band above `play.edge`, from its own live position. Kept as a flag rather
   *  than as two numbers because the cut is a function of where a cat actually
   *  is — a cat still walking in is cut correctly on the way, and one climbing
   *  back out stops being cut as it rises. */
  readonly hide: boolean;
  /** The lead is wound up: its tail runs at walking speed while the rest of it
   *  holds still. The one thing a crouching cat does. */
  readonly stir: boolean;
}

const OVER: PlayBeat = {
  done: true,
  focus: { x: 0, y: 0 },
  leadPose: null,
  followPose: null,
  leadTo: null,
  followTo: null,
  dash: false,
  hide: false,
  stir: false,
};

/**
 * When the next scene may open: the gap plus a random share of the spread, so
 * consecutive gaps never come out the same length.
 *
 * There used to be a second, faster clock — a third of this — for the `wander`
 * mode, whose visitor had asked to watch rather than read. The explorers made
 * wandering the default for everybody, and everybody includes the reader this
 * gap was tuned for, so there is one clock again.
 */
export function scheduleNextPlay(now: number): number {
  return now + PLAY_GAP + Math.random() * PLAY_SPREAD;
}

/**
 * What to try, in the order to try it.
 *
 * An order rather than a single choice, because a scene can have nowhere to
 * happen: `openPlay` probes the page and declines, and until this returned a
 * list a refusal cost the visitor the whole interval. That was survivable while
 * every scene needed only a clear rectangle. It stopped being survivable when
 * three of them started needing a *particular* thing on screen — a panel to
 * duck behind, a heading to stalk, a section rule to rake at — because away
 * from the one part of this page that has a panel, four rolls in five named a
 * scene that could not open, and the old `wander` mode, which promised the pair
 * working the page, delivered two cats sitting down. The caller now walks this
 * list and takes the first that opens, so the weights below say what the
 * companion would *rather* do and the page decides what it can actually do.
 *
 * The chase leads the weights because it is the only one that
 * needs no clear rectangle for a prop and no pair of facing spots — on a narrow
 * viewport full of prose it is usually the only one that can open at all.
 *
 * The cats are company for somebody reading, and a scene is an interruption
 * they happen to enjoy — so the three anchored scenes take their turn alongside
 * the yarn and the bowl and no more. (The old `wander` mode had a second table
 * that led with the anchored scenes; it went with the mode.) All eight stay
 * reachable, because a pool that could only ever produce three things would
 * run out in a minute.
 */
export const ROAM_WEIGHTS: Record<SceneKind, number> = {
  chase: 24,
  bowl: 18,
  yarn: 14,
  moth: 11,
  peek: 9,
  gift: 8,
  stalk: 8,
  scratch: 8,
};

/**
 * What the moment is. Round 11 made one weight situational: the moth led more
 * often in the AI Workflow Lab, the one section that answered back. Round 16
 * removed that section along with the boost, so there is currently no rule
 * left to apply — but `SceneFlavor` stays, because `Companion.tsx` still
 * hands in `{ night, section }` on every call, and the next situational rule
 * (if one is ever authored) has somewhere to land without every caller
 * needing to change.
 *
 * Both fields are optional, and omitting the object entirely is the same as
 * passing `{}` — the ordinary weights, unmodified — which is what keeps every
 * existing caller of `sceneOrder` correct without having to be rewritten.
 */
export interface SceneFlavor {
  readonly night?: boolean;
  readonly section?: string | null;
}

export function sceneOrder(flavor?: SceneFlavor): SceneKind[] {
  // No situational rule reads `flavor` today (see the doc comment above) —
  // it is accepted, not yet consulted, so the ordinary weights always apply.
  void flavor;
  const weights = ROAM_WEIGHTS;
  // A weighted shuffle rather than a weighted pick: every scene keeps its
  // chance of being *first*, which is what the weights are about, and the rest
  // of the list is only consulted when the page has refused the ones above it.
  let left = (Object.keys(weights) as SceneKind[]).slice();
  const order: SceneKind[] = [];
  while (left.length > 0) {
    let roll = Math.random() * left.reduce((sum, kind) => sum + weights[kind], 0);
    let taken = left[left.length - 1];
    for (const kind of left) {
      roll -= weights[kind];
      if (roll <= 0) {
        taken = kind;
        break;
      }
    }
    order.push(taken);
    left = left.filter((kind) => kind !== taken);
  }
  return order;
}

const PROP: Record<SceneKind, ToyKind | null> = {
  yarn: "yarn",
  moth: "moth",
  bowl: "bowl",
  chase: null,
  gift: "yarn",
  peek: null,
  // The one prop that is not a toy: the marks the scratch leaves behind. See
  // CompanionToy — without them the scene is a cat standing at a line.
  scratch: "claw",
  stalk: null,
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

/** Everything a scene settles before it starts. `edge` is optional because
 *  seven of the eight scenes hide behind nothing. */
type Staging = Omit<
  Play,
  "kind" | "prop" | "script" | "step" | "until" | "pos" | "spin" | "flap" | "opacity" | "edge"
> & { readonly edge?: number };

function open(kind: SceneKind, spec: Staging, script: readonly Beat[], now: number): Play {
  return {
    kind,
    prop: PROP[kind],
    script,
    step: 0,
    until: now + script[0].ms,
    ...spec,
    edge: spec.edge ?? 0,
    pos: { x: spec.from.x, y: spec.from.y },
    spin: 0,
    flap: 1,
    opacity: 0,
  };
}

/* -------------------------------------------------------------------------- */
/* Scenes that are about the page                                              */
/*                                                                             */
/* The first five scenes need a clear rectangle and nothing else, so their      */
/* geometry is arithmetic on the cats' own positions. The three round-9 ones    */
/* take their geometry off something the visitor can see, which means reading   */
/* the page — and the rules for doing that are the ones companion-moods already */
/* lives by, restated here because they are easy to get wrong twice:            */
/*                                                                             */
/*  - **Every lookup fails soft.** An anchor is markup another component owns;  */
/*    a selector that stops matching costs the scene, not the companion.        */
/*  - **An anchor off the screen is not an anchor.** A rectangle above the      */
/*    header or below the fold is a scene nobody would see happen.              */
/*  - **The geometry is separated from the page.** Everything below that can be */
/*    stated as arithmetic on a rectangle is, and is exported, so the rules a   */
/*    scene actually promises — the cut lands on the edge, the pounce ends past */
/*    the words — can be tested without a browser underneath them.              */
/* -------------------------------------------------------------------------- */

/** The four numbers an anchored scene needs off an element. Deliberately not a
 *  `DOMRect`: nothing here wants the other six, and a plain shape is one a test
 *  can write down. */
export interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Two places, one per animal. */
export interface Pair {
  readonly lead: Point;
  readonly follow: Point;
}

/**
 * The page-wide hiding contract: any element carrying `data-cat-hide` is an
 * opaque panel the pair may tuck behind, exactly as `data-cat-nap` marks a
 * place they may sleep under. The attribute's value is ignored — an element
 * either offers itself or it does not — and it is static markup in the page's
 * own source, never something the companion writes.
 */
const HIDE_ATTR = "[data-cat-hide]";

/** How far off an anchor's edge a cat comes to rest, matching the moods. */
const ANCHOR_MARGIN = 14;

/**
 * How much of a hiding cat clears the panel's top edge, and how far in from the
 * panel's ends the pair stand.
 *
 * Twenty-seven of the drawing's forty-two units is the number that shows the
 * head, both ears and the reach of a batting foreleg — the paw comes over at
 * y≈26.8 — while the haunches, the feet and the root of the tail stay behind
 * the panel. Less than that and the paw beat has nothing to show; much more and
 * the animal is standing in front of the thing rather than behind it.
 */
const PEEK_SHOW = 27;
const PEEK_GAP = 16;
const PEEK_INSET = 10;
/** How far a cat's feet sit past a rule it is standing on. The same three
 *  pixels the contact mood perches with, and for the same reason: it is what
 *  "on the edge" has to mean for a drawing with no depth, and it leaves the
 *  probe reading the clear band above rather than the thing itself. */
const PERCH_FOOT = 3;
/** The stalk's run-up, and how much further into the margin the crouch sits so
 *  the pounce is a diagonal rather than a lift. */
const STALK_RUN = 132;
const STALK_DRIFT = 26;
/**
 * One stroke of a rake, and how far the animal travels doing it.
 *
 * The first version of this scene held a paw out and ran the tail faster, and
 * it read as two cats standing near a line. What was missing is that a cat
 * scratching moves its whole body: the reach is in the shoulders, not the wrist.
 * So the stroke is a lean of the entire animal along the rule and back, once
 * per beat, at an amplitude that is a sixth of a cat — small enough not to read
 * as walking, large enough to be the difference between a pose and an action.
 */
const RAKE_MS = 380;
const RAKE_REACH = 7;

/** How many places along a rule the scratch tries before it gives up. */
const RULE_COLUMNS = 7;
/** Close enough to have arrived, in px. */
const ARRIVED = 4;
/**
 * The longest an anchored scene may spend walking to its anchor.
 *
 * A cap rather than a duration: the walk ends when the lead gets there, which
 * on the near side of a paragraph is half a second and from the far corner of a
 * 1440px window is nearer four. Sized so the second case still arrives, because
 * a scene whose first beat expires mid-stride plays its second one to an empty
 * mark.
 */
const APPROACH_MAX = 4200;

/**
 * How much of a drawing standing at `y` falls below `edge`.
 *
 * This is the whole of the hiding trick. Nothing on the page paints over the
 * companion layer — it is `fixed` at `z-40` above every section — so a cat
 * cannot get behind a panel by being underneath it in paint order. It gets
 * behind it by not being drawn there: the caller clips each animal to the band
 * above the edge, and this is the height of the cut.
 *
 * Expressed against the animal's live position rather than against the spot it
 * was sent to, which is what makes the beat honest at both ends: a cat still
 * walking in is cut exactly where it crosses the edge, and one climbing back
 * out stops being cut as it rises.
 */
export function hideCut(y: number, edge: number): number {
  return clamp(y + CAT_H - edge, 0, CAT_H);
}

/**
 * Where a cat that has finished hiding stands: on the edge itself, with all of
 * it above the panel.
 *
 * It is also the position the *probe* asks about before the scene opens, which
 * is the honest way to ask. A tucked cat's box overlaps a panel full of text,
 * and no amount of clipping makes that box clear — but the only part of the
 * animal anybody ever sees is the part above the edge, and this is the box that
 * part lives in. A peek that cannot come out into clear air does not happen.
 */
export function shownSpot(spot: Point, edge: number): Point {
  return { x: spot.x, y: edge - CAT_H + PERCH_FOOT };
}

/**
 * Where the pair stand to look over a panel's top edge, best first.
 *
 * Centred on the panel, then flush to each end, so a panel with something
 * covering half of it still has somewhere to work. Both animals have to be over
 * the panel — a cat hiding behind the *end* of a box is a cat standing beside
 * it — which is why a panel narrower than the pair returns nothing at all.
 */
export function peekStands(panel: Box, near: Point): Pair[] {
  const span = CAT_W * 2 + PEEK_GAP;
  if (panel.right - panel.left - PEEK_INSET * 2 < span) return [];
  const y = panel.top - PEEK_SHOW;
  const starts = [
    (panel.left + panel.right) / 2 - span / 2,
    panel.left + PEEK_INSET,
    panel.right - PEEK_INSET - span,
  ].sort((a, b) => Math.abs(a - near.x) - Math.abs(b - near.x));
  return starts.map((start) => ({
    follow: { x: start, y },
    lead: { x: start + CAT_W + PEEK_GAP, y },
  }));
}

/** Standing on a rule: feet a few pixels past it, everything else above. */
export function ruleSpot(x: number, rule: number): Point {
  return { x, y: rule - CAT_H + PERCH_FOOT };
}

/**
 * The stalk, as pairs of points to try, best first.
 *
 * Two landings, and the difference between them is the difference between
 * hunting a heading and sitting in the margin near one. A `<h2>` is a block, so
 * its box runs to the end of the column whatever the words do — on this page
 * that is four hundred pixels of nothing after the last glyph — and a hit test
 * answers "heading" for every one of them. So the first landing is the perch on
 * the heading's own top edge at the point the words stop, which is beside the
 * end of the line and, being a cat's height *above* the box, is ground the
 * probe can actually approve. The second is past the box entirely, level with
 * its last line: further from the words, and the answer when there is no band
 * above the heading to stand in.
 *
 * The crouch is a run-up away on either side of the landing, and the caller
 * tries both — a heading near the top of the window has no room above it and
 * one near the bottom has none below. It sits a little further out than the
 * landing so the pounce arrives diagonally; where the margin is too narrow for
 * that the clamp flattens it into a spring, which is still a cat leaving the
 * ground.
 */
export function stalkSpots(heading: Box, words: number): Array<{ crouch: Point; land: Point }> {
  const landings = [
    { x: words + ANCHOR_MARGIN, y: heading.top - CAT_H + PERCH_FOOT },
    { x: heading.right + ANCHOR_MARGIN, y: heading.bottom - CAT_H },
  ];
  const pairs: Array<{ crouch: Point; land: Point }> = [];
  for (const land of landings) {
    for (const up of [1, -1] as const) {
      pairs.push({ land, crouch: { x: land.x + STALK_DRIFT, y: land.y - up * STALK_RUN } });
    }
  }
  return pairs;
}

/**
 * Where the words in a heading stop.
 *
 * Measured off the last line box rather than the element, because the element
 * is a block and its right edge belongs to the column rather than to the
 * sentence. A heading that wraps has more than one line rect; the last one is
 * the one with the end of the sentence in it. Falls back to the box, which is
 * the honest answer whenever the range cannot be measured.
 */
function wordsEnd(heading: Element, box: Box): number {
  const range = document.createRange();
  range.selectNodeContents(heading);
  const lines = range.getClientRects();
  const last = lines[lines.length - 1];
  return last && last.width > 0 ? Math.min(last.right, box.right) : box.right;
}

/** An element's box, or null if it is not somewhere a scene could be seen. */
function boxOf(element: Element | null | undefined): Box | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return null;
  if (rect.bottom < safeTop() || rect.top > viewport().height) return null;
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
}

/**
 * Is this element the thing actually drawn just inside its own top edge?
 *
 * A box is not a panel. A collapsed disclosure keeps its rectangle while
 * painting nothing, and anything scrolled under the sticky header keeps its
 * rectangle too — in both cases a cat clipped against that edge is not a cat
 * hiding, it is a cat cut in half over open page. One hit test answers it.
 */
function paints(element: Element, panel: Box): boolean {
  const at = elementBehind((panel.left + panel.right) / 2, panel.top + 6);
  return at !== null && (at === element || element.contains(at));
}

/** Every panel offering itself as somewhere to hide, nearest first. */
function hidePanels(near: Point): Box[] {
  const panels: Box[] = [];
  for (const element of document.querySelectorAll(HIDE_ATTR)) {
    const panel = boxOf(element);
    // Room for a whole cat above the edge, and the edge itself somewhere short
    // of the bottom of the window: both are what "you can watch this happen"
    // comes down to.
    if (!panel || panel.top < safeTop() + CAT_H || panel.top > viewport().height - CAT_H) {
      continue;
    }
    if (!paints(element, panel)) continue;
    panels.push(panel);
  }
  return panels.sort(
    (a, b) => Math.abs((a.left + a.right) / 2 - near.x) - Math.abs((b.left + b.right) / 2 - near.x),
  );
}

/**
 * The hairlines of the section the visitor is on, whichever of them is on
 * screen.
 *
 * Both edges count, and neither is a special case: every `<section>` carries
 * `hairline-t`, so a section's bottom edge is the next one's rule drawn in the
 * same place. Which of the two the visitor can see depends only on where they
 * have scrolled to.
 */
function sectionRules(section: string | null): number[] {
  const element = section ? document.getElementById(section) : null;
  const box = boxOf(element);
  if (!box) return [];
  const view = viewport();
  return [box.top, box.bottom].filter(
    (rule) => rule > safeTop() + CAT_H && rule < view.height - PERCH_FOOT,
  );
}

/** Places along a rule to try standing, nearest to the cats first. */
function alongRule(rule: number, near: Point): Point[] {
  const width = viewport().width;
  const spots: Point[] = [];
  for (let column = 0; column < RULE_COLUMNS; column += 1) {
    const x = ((width - CAT_W) * column) / (RULE_COLUMNS - 1);
    spots.push(clampToViewport(ruleSpot(x, rule)));
  }
  return spots.sort((a, b) => Math.abs(a.x - near.x) - Math.abs(b.x - near.x));
}

/**
 * Set a scene up, or decline to.
 *
 * Both directions are tried, so a lead cat sitting with his nose to a paragraph
 * plays *away* from it rather than not at all. Returning null is a normal
 * outcome — a narrow viewport full of text has nowhere for this, and an
 * anchored scene has no anchor on most of the page — and the caller answers it
 * by backing the schedule off rather than by trying harder.
 *
 * `section` is the one the visitor is reading, from the page's own scrollspy.
 * Only the anchored scenes read it, and they are the reason it is threaded
 * through at all: "the section you are on" is not something this module can
 * work out from two positions.
 */
export function openPlay(
  kind: SceneKind,
  lead: Point,
  follow: Point,
  facing: 1 | -1,
  now: number,
  section: string | null,
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

  if (kind === "peek") {
    /*
     * Behind the furniture. Nothing here probes where they *hide* — that box is
     * over a panel full of text by definition — only where they come out, which
     * is the band above the edge and the one part of either animal the visitor
     * ever sees. See `shownSpot`.
     */
    for (const panel of hidePanels(lead)) {
      for (const pair of peekStands(panel, lead)) {
        const out = {
          lead: shownSpot(pair.lead, panel.top),
          follow: shownSpot(pair.follow, panel.top),
        };
        if (!isClearSpot(out.lead) || !isClearSpot(out.follow)) continue;
        return open(
          kind,
          {
            from: pair.lead,
            to: out.lead,
            leadSpot: pair.lead,
            followSpot: pair.follow,
            aside: out.follow,
            edge: panel.top,
            // Facing the middle of the panel, which puts the two of them nose to
            // nose over it rather than both staring the same way.
            facing: pair.lead.x < (panel.left + panel.right) / 2 ? 1 : -1,
          },
          [
            { phase: "approach", ms: APPROACH_MAX },
            { phase: "tuck", ms: 1500 },
            { phase: "paw", ms: 1300 },
            { phase: "rise", ms: 900 },
          ],
          now,
        );
      }
    }
    return null;
  }

  if (kind === "scratch") {
    /*
     * At the rule. He stands on the section's own hairline with his feet a few
     * pixels past it and everything else in the clear band above — the perch the
     * contact mood already uses — and rakes along it. She sits and watches from
     * a cat's width off, or keeps her own spot if there is nothing clear there.
     */
    for (const rule of sectionRules(section)) {
      for (const spot of alongRule(rule, lead)) {
        if (!isClearSpot(spot)) continue;
        for (const side of (facing === 1 ? [1, -1] : [-1, 1]) as Array<1 | -1>) {
          const watch = clampToViewport({ x: spot.x - side * (CAT_W + 12), y: spot.y });
          if (Math.abs(watch.x - spot.x) < CAT_W || !isClearSpot(watch)) continue;
          return open(
            kind,
            {
              from: spot,
              to: spot,
              leadSpot: spot,
              followSpot: watch,
              aside: watch,
              edge: rule,
              facing: side,
            },
            [
              { phase: "approach", ms: APPROACH_MAX },
              { phase: "rake", ms: RAKE_MS },
              { phase: "ease", ms: 200 },
              { phase: "rake", ms: RAKE_MS },
              { phase: "ease", ms: 200 },
              { phase: "rake", ms: RAKE_MS },
              { phase: "leave", ms: 700 },
            ],
            now,
          );
        }
      }
    }
    return null;
  }

  if (kind === "stalk") {
    const element = section ? document.getElementById(section)?.querySelector("h2") : null;
    const heading = boxOf(element);
    if (!element || !heading) return null;
    for (const { crouch, land } of stalkSpots(heading, wordsEnd(element, heading))) {
      const from = clampToViewport(crouch);
      const to = clampToViewport(land);
      // A run-up the clamp has flattened is not a run-up, and a cat that lands
      // where it crouched has not pounced at anything.
      if (Math.hypot(to.x - from.x, to.y - from.y) < STALK_RUN * 0.6) continue;
      if (!isClearSpot(from) || !isClearSpot(to)) continue;
      const watch = clampToViewport({ x: from.x - CAT_W - 12, y: from.y });
      return open(
        kind,
        {
          from,
          to,
          leadSpot: to,
          followSpot: isClearSpot(watch) ? watch : follow,
          aside: from,
          facing: -1,
        },
        [
          { phase: "approach", ms: APPROACH_MAX },
          { phase: "crouch", ms: 1600 },
          { phase: "pounce", ms: 460 },
          { phase: "pleased", ms: 1100 },
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

/**
 * End the walk-in the moment the lead is standing on his mark.
 *
 * The only beat in the module that is not a length of time, and it has to be:
 * an anchored scene is staged wherever the page put the thing it is about, so
 * the walk is anything from nothing to most of a viewport. A fixed duration
 * would either sit the pair on their marks doing nothing for three seconds or
 * start the scene while they were still crossing the page. Writing `until` back
 * to `now` hands it to the same beat clock everything else uses rather than
 * inventing a second way for a scene to advance.
 */
function arrive(play: Play, now: number, lead: Point, mark: Point): void {
  if (Math.hypot(lead.x - mark.x, lead.y - mark.y) < ARRIVED) play.until = now;
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

    return {
      done: false,
      focus: centre(play.pos),
      leadPose,
      followPose,
      leadTo: null,
      followTo,
      dash: false,
      hide: false,
      stir: false,
    };
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
      hide: false,
      stir: false,
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
        hide: false,
        stir: false,
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
      hide: false,
      stir: false,
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
        hide: false,
        stir: false,
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
        hide: false,
        stir: false,
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
      hide: false,
      stir: false,
    };
  }

  if (play.kind === "peek") {
    // Nothing is drawn for this one: the scene is two cats and a panel the page
    // already had.
    play.opacity = 0;
    /** Over the middle of the panel, which is what the pair look at while they
     *  are behind it — so they end up nose to nose rather than side by side. */
    const over = { x: (play.leadSpot.x + play.followSpot.x + CAT_W) / 2, y: play.edge - CAT_H };

    if (phase === "approach") {
      arrive(play, now, lead, play.leadSpot);
      return {
        done: false,
        focus: over,
        leadPose: null,
        followPose: null,
        leadTo: play.leadSpot,
        followTo: play.followSpot,
        dash: false,
        hide: false,
        stir: false,
      };
    }
    // Up and out, and still clipped: the cut goes to nothing on its own as they
    // rise past the edge, so climbing out needs no beat that says so.
    const out = phase === "rise";
    return {
      done: false,
      focus: over,
      leadPose: "sit",
      // One paw over the top. She is the one who reaches — it is her pose in
      // every other scene too — and at this height it is the only part of
      // either of them below the ears that clears the edge.
      followPose: phase === "paw" ? "bat" : "sit",
      leadTo: out ? play.to : play.leadSpot,
      followTo: out ? play.aside : play.followSpot,
      dash: false,
      hide: true,
      stir: false,
    };
  }

  if (play.kind === "scratch") {
    /** Along the rule, in front of the paw. */
    const at = { x: play.leadSpot.x + play.facing * CAT_W, y: play.edge };
    // Where the marks are drawn: under the paw rather than out at the focus
    // point, and straddling the rule, because a claw mark that does not cross
    // the line it is a mark on is a scribble beside it. Measured from the
    // animal's centre rather than from `leadSpot`, which is its top-left — off
    // the corner the same offset lands under the chest facing one way and a
    // whole cat clear of it facing the other.
    // Clamped, because the clear ground along a rule is usually at the page's
    // margins and a cat scratching at the left edge would put its marks half
    // outside the window. Sixteen pixels of slide is invisible; half a mark is
    // not.
    play.pos.x = clamp(
      play.leadSpot.x + CAT_W / 2 + play.facing * (CAT_W * 0.5) - TOY_W / 2,
      4,
      Math.max(4, viewport().width - TOY_W - 4),
    );
    play.pos.y = play.edge - TOY_H / 2;

    if (phase === "approach") {
      arrive(play, now, lead, play.leadSpot);
      return {
        done: false,
        focus: at,
        leadPose: null,
        followPose: null,
        leadTo: play.leadSpot,
        followTo: play.followSpot,
        dash: false,
        hide: false,
        stir: false,
      };
    }

    const raking = phase === "rake";
    // The marks come up with the stroke and are gone by the end of it, so three
    // strokes read as three passes of a paw rather than as one drawing that
    // faded in. Nothing is left on the page afterwards: the companion draws on
    // its own layer, and a mark that outlived the scene would be the cats
    // vandalising somebody's rule.
    // The lean. Measured from the end of the beat rather than from a clock of
    // its own, because the beat's end is the only time this object stores — and
    // one full cycle per beat means the animal is back on its mark before the
    // next one starts, so three strokes never drift him along the rule.
    const left = play.until - now;
    const through = (RAKE_MS - left) / RAKE_MS;
    const swipe = raking ? Math.sin(through * Math.PI * 2) * RAKE_REACH * play.facing : 0;
    play.opacity = raking ? Math.max(0, Math.sin(through * Math.PI)) : 0;
    return {
      done: false,
      focus: at,
      leadPose: raking ? "bat" : "sit",
      followPose: "sit",
      leadTo: { x: play.leadSpot.x + swipe, y: play.leadSpot.y },
      followTo: play.followSpot,
      dash: false,
      hide: false,
      // The batting paw pats off the same phase the tail sways on, so running
      // that phase at walking speed is what turns one held paw into a rake.
      stir: raking,
    };
  }

  if (play.kind === "stalk") {
    play.opacity = 0;

    if (phase === "approach") {
      arrive(play, now, lead, play.from);
      return {
        done: false,
        focus: play.to,
        leadPose: null,
        followPose: null,
        leadTo: play.from,
        followTo: play.followSpot,
        dash: false,
        hide: false,
        stir: false,
      };
    }
    if (phase === "crouch") {
      // The stretch contour is a hollowed back over a raised rump with the chest
      // and head low and forward, which is a stretching cat and — held still,
      // with the tail going — a cat about to jump on something.
      return {
        done: false,
        focus: play.to,
        leadPose: "stretch",
        followPose: "sit",
        leadTo: play.from,
        followTo: play.followSpot,
        dash: false,
        hide: false,
        stir: true,
      };
    }
    if (phase === "pounce") {
      return {
        done: false,
        focus: play.to,
        leadPose: null,
        followPose: "sit",
        leadTo: arc(play.from, play.to, t),
        // Named rather than left null, and the difference is the whole end of
        // this scene. `null` hands the follower back to the loop's settled
        // position, which for a scene that walked the pair to an anchor is
        // wherever they were standing before it started — so she turned round
        // and left across the page on the frame he jumped, and the punchline
        // played to one cat. She stays where she watched him crouch from.
        followTo: play.followSpot,
        dash: true,
        hide: false,
        stir: false,
      };
    }
    // Landed, and looking back down the line at whatever it was he caught.
    return {
      done: false,
      focus: { x: play.to.x - CAT_W, y: play.to.y },
      leadPose: "sit",
      followPose: "sit",
      leadTo: play.to,
      followTo: play.followSpot,
      dash: false,
      hide: false,
      stir: false,
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
      hide: false,
      stir: false,
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
      hide: false,
      stir: false,
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
    hide: false,
    stir: false,
  };
}
