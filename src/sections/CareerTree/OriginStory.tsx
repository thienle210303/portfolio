"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { origin } from "@/content/portfolio";
import { cn } from "@/lib/cn";
import {
  growthStage,
  planRelease,
  seasonsFor,
  STAGGER_CLEANUP_MARGIN_MS,
  TIER_BRANCH,
  TIER_LEAF,
  TIER_TRUNK,
  type Season,
  type SeasonKind,
  type StaggerCandidate,
} from "@/lib/origin-story";

/**
 * "How it grew" — the player. Lazy-loaded by `WatchOrigin.tsx`; never
 * rendered on the server, never part of the initial page. That last fact is
 * what lets this file import `origin-story.ts` (and, through it, the career
 * content) without touching the site's initial-load budget: nothing here
 * exists until a visitor presses the button, and everything it needs to
 * draw the story travels down in this one chunk.
 *
 * v2 rewrite: there is no stand-in silhouette any more. The story grows the
 * **real** knowledge tree — the same `<DrawnTree>` the visitor was just
 * looking at — by conducting the `data-origin-year`/`data-origin-pending`
 * contract `DrawnTree.tsx` and `globals.css` already carry (see the "Origin
 * story v2" CSS block). This file's only jobs now are: play a transparent
 * sky layer over the canopy (a bird, a seed, the weather), and release the
 * real tree's own growable groups in chronological order as the beats pass.
 *
 * A beat is `{ id, kind, caption, durationMs, season? }` — one authored or
 * derived moment, played in order: the flight (3s), the seed (2.5s), one per
 * `Season` from `seasonsFor()` (2s each, `kind` is the season's own weather),
 * and "still growing" (2.5s), which releases the one group nothing else
 * ever does — the unfinished shoot. A single `requestAnimationFrame` master
 * clock auto-advances (see "The master clock" below); a click anywhere on
 * the stage advances immediately, the same "click moves things along" idiom
 * the companion's duet already uses. Escape or the Skip button end the show
 * early; the last beat's own timeout ends it naturally.
 *
 * ## Everything lives in the frame (round 12)
 *
 * Every visual this file draws — the sky layer, the weather, the sr-only
 * caption's visible stand-in, the year numeral — is `position: absolute`
 * inside the stage `<div>` below, which is itself `position: absolute`
 * inside the tree figure's own relative box (`KnowledgeTree.tsx`'s wrapper
 * around `<DrawnTree>`). Nothing in this file is ever `position: fixed` to
 * the viewport. That used to be untrue: an earlier pass pinned the weather
 * to the viewport and, for root-year beats, panned the whole page with
 * `scrollIntoView` so a `RootSystem` lateral growing far below the canopy
 * would still be on screen — machinery that, together with the
 * scroll-away-ends-the-show `IntersectionObserver` it had to keep
 * coordinating with, was the actual cause of the instability reported
 * ("watch how it grew is very unstable... when I scroll up and down"):
 * a fixed weather layer and a programmatic scroll fighting a visitor's own
 * scroll is exactly what "shearing" looks like. Both are gone. There is no
 * camera to pan and nothing pinned to the viewport for a visitor's scroll
 * to shear against — scrolling now simply moves the whole picture, sky and
 * tree together, as one object, the same as scrolling past any other
 * illustration on the page would.
 *
 * The corollary: there is no more "the visitor scrolled away" event either.
 * A root-year beat's own `RootSystem` lateral grows wherever it already
 * sits on the page — no pan walks the viewport down to meet it — and a
 * visitor who scrolls off mid-story simply finds the story still playing,
 * in the drawing, exactly where they left it, when they scroll back. Only
 * Escape, Skip, click-to-advance, and the final beat's own timeout end the
 * show now.
 *
 * ## The conductor, and the one rule it can never break
 *
 * On start, the stage walks up to the real `[data-tree-figure]` (via
 * `closest` — the same idiom `TreeFigure.tsx`'s own cross-highlight island
 * uses to reach the same wrapper), stamps `data-origin-running` on it, finds
 * every `[data-origin-year]` group inside it exactly once, and stamps every
 * one `data-origin-pending`. From there each beat only ever *releases*
 * (`removeAttribute("data-origin-pending")`) — nothing is ever re-pended.
 * Season beats release every group whose own year is at or before that
 * season's year (a group can be a leaf, a lens branch, a root main, or the
 * trunk/ground break — see `DrawnTree.tsx`); the shoot is deliberately
 * excluded from that generic sweep and released only by the closing "still
 * growing" beat, so the newest, unfinished growth is always the last thing
 * to appear, never merely tied for last with whatever year it happens to
 * share.
 *
 * The one thing every exit path — Skip, Escape, the last beat's own
 * timeout, an unmount nothing here chose, even a thrown error — must do is
 * release every remaining pending group and drop `data-origin-running`,
 * synchronously, before this component is gone. A real tree left
 * half-drawn is a worse failure than a story that never played at all.
 * `releaseEverything` below is the one function that does that; `end()`
 * calls it before anything else, and the mount effect's own cleanup calls
 * it again on unmount regardless of how the exit happened — both calls are
 * safe because releasing an already-released tree is a no-op.
 *
 * ## The sky, not a cover — and, since round 15, the ground too
 *
 * `SkyLayer` is `pointer-events-none` and only ever draws over the drawing
 * — never a `bg-ground` backdrop, because there is no longer anything
 * underneath it that needs covering. The stage `<div>` itself is what
 * catches clicks-to-advance, and it is sized to the *whole* drawing wrapper
 * (`inset-0`, matching `KnowledgeTree.tsx`'s relative box around
 * `<DrawnTree>`), not just either sky/ground slice — a click anywhere the
 * real, growing tree is still visible still advances the story. That
 * wrapper exists only while this component is mounted, so the instant the
 * story ends and `WatchOrigin.tsx` swaps this player back out for its
 * button, the tree underneath is exactly as interactive as it always was.
 *
 * Two small boxes share that wrapper, not one. Through round 14 every beat
 * — flight, seed, every season, still — drew inside one top-pinned
 * `skySlice`, sized off the canopy the way the old covering silhouette was.
 * That was honest for a season's weather (rain and sun belong over the
 * crown) but not for flight and seed, which are *not yet* anything about
 * the canopy — a bird carrying a seed, before it has been planted. On a
 * career with enough years to draw a tall trunk, that top-pinned box put the
 * seed's own landing a full trunk-length above the ground it was meant to
 * drop into (the owner's report: "the ground and the root is a huge space
 * because the tree body right now really big and long"). `groundSlice`,
 * below, is the fix: `absolute inset-x-0 bottom-0`, pinned to the drawing's
 * own bottom edge — the same edge `TrunkFoot`'s `bottom-0` and the root
 * plinth's own top border already share in `DrawnTree.tsx`/
 * `KnowledgeTree.tsx`, i.e. the real ground line, not a sky-box stand-in for
 * it. `skySlice` keeps its top-pinned canopy position and everything that
 * honestly belongs there; `groundSlice` takes over flight and seed.
 *
 * `WeatherLayer` (a season's rain/sun/wind/storm) lives inside `skySlice`,
 * unchanged. `SkyLayer` itself now mounts in exactly one of the two boxes
 * per beat, never both: `groundSlice` for flight and seed (with
 * `GROUND_VIEW_BOX`, cropped tight to the ground line rather than leaving
 * the sky box's own headroom above it), nothing in `skySlice` for those two
 * beats at all. `FloatingAnnotation` follows whichever box its own beat
 * drew in, so the caption never stands apart from the picture it is
 * captioning. Still, the closing beat, draws nothing in either box — its
 * subject is the shoot at the very top of the real tree, so it keeps
 * `skySlice`'s canopy position, which is now the *more* correct one for it,
 * not merely the leftover one.
 *
 * ## Narration, in two forms
 *
 * The accessible narration is the `role="status"` region — `sr-only` now,
 * since the *visible* narration is a job the cats do (Task 3) or, when they
 * are not roaming, `FloatingAnnotation` does instead. `catsNarrating` tracks
 * which: it flips true whenever `origin-story-ack` answers with
 * `detail: "start"` (`Companion.tsx` dispatches it from the same `"start"`
 * handler that arms its watch) and false again if the companion later
 * answers `detail: "stop"` — the watch dropping mid-show without the run
 * itself ending — so the annotation resumes instead of leaving the story
 * fully dark for whatever remains of it. The annotation renders only while
 * `catsNarrating` is false, inside whichever of the two boxes (see above)
 * the current beat itself draws in — near that box's own ground line for
 * flight and seed (`groundSlice`, now close to the real one), near the
 * canopy for everything else (`skySlice`).
 */

type BeatKind = "flight" | "seed" | SeasonKind | "still";

interface Beat {
  readonly id: string;
  readonly kind: BeatKind;
  readonly caption: string;
  readonly durationMs: number;
  /** Present only for a season beat — both the year a `data-origin-year`
   *  group is compared against and the weather glyph to draw. */
  readonly season?: Season;
}

const FLIGHT_MS = 3000;
const SEED_MS = 2500;
const SEASON_MS = 2000;
const STILL_MS = 2500;

/**
 * The flight is the one beat allowed to name both places, and it names them
 * exactly as authored — `origin.from` and `origin.to` whole, composed rather
 * than typed a second time. This is the same string `computedFact("crossing")`
 * produces for the globe, so the two captions cannot diverge. The ban on place
 * names in `tests/lib/origin-story.test.ts` applies to every `Season.caption`,
 * not to this beat.
 */
function flightCaption(): string {
  return `${origin.from} → ${origin.to} · ${origin.arrived}`;
}

function buildBeats(seasons: readonly Season[]): readonly Beat[] {
  const seasonBeats: Beat[] = seasons.map((season) => ({
    id: `season-${season.year}`,
    kind: season.kind,
    caption: season.caption,
    durationMs: SEASON_MS,
    season,
  }));

  return [
    { id: "flight", kind: "flight", caption: flightCaption(), durationMs: FLIGHT_MS },
    { id: "seed", kind: "seed", caption: "A seed, carried the whole way.", durationMs: SEED_MS },
    ...seasonBeats,
    { id: "still", kind: "still", caption: "…and still growing.", durationMs: STILL_MS },
  ];
}

function originDur(ms: number): CSSProperties {
  return { "--origin-dur": `${ms}ms` } as CSSProperties;
}

/* -------------------------------------------------------------------------- */
/* The conductor                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Growth choreography (design-polish pass, after v2's chronological release
 * already existed): "start from the ground, grow slowly" meant a whole
 * year's worth of groups could no longer flip from pending to grown in the
 * same frame — a trunk, five boughs and a dozen leaves all bumping into view
 * at once reads as a cut, not a growth. `tier` is what `planRelease`
 * (`origin-story.ts`) sorts a year's newly-releasing groups by before
 * staggering them: trunk/ground-break first (`TIER_TRUNK`), then
 * branch/lens and the underground's own major roots (`TIER_BRANCH`, the
 * canopy's and the root system's structural peers), then leaves
 * (`TIER_LEAF`) — big, slow things settle before the small, quick things
 * hung off them do. Read straight off each element's own `data-origin-tier`
 * in `DrawnTree.tsx` rather than inferred here, the same "author the fact
 * where the element already lives" discipline the rest of this file's DOM
 * contract follows; a group with no tier at all (there should never be one)
 * defaults to the branch tier rather than either extreme. The three
 * constants themselves live in `origin-story.ts`, alongside `planRelease`,
 * so the ordering and the function that reads it can never drift apart.
 */
function tierOf(el: HTMLElement): number {
  switch (el.getAttribute("data-origin-tier")) {
    case "trunk":
      return TIER_TRUNK;
    case "leaf":
      return TIER_LEAF;
    default:
      return TIER_BRANCH;
  }
}

interface OriginGroup {
  readonly el: HTMLElement;
  readonly year: number;
  /** The one group the generic "release through year Y" sweep must never
   *  touch — see the file banner on why the shoot waits for its own beat.
   *  True for both the shoot's own `<g data-tree-shoot>` and its floating
   *  `<span data-tree-shoot-label>` annotation — two groups, one moment,
   *  see that span's own doc comment in `DrawnTree.tsx` for why the words
   *  beside the shoot needed the same pending gate the ink already had. */
  readonly isShoot: boolean;
  /** True only for the trunk's own group — the one growth-drawn element this
   *  file gives a slower, hero-length rise. See `tierOf`'s doc comment. */
  readonly isTrunk: boolean;
  readonly tier: number;
}

function queryGroups(figure: HTMLElement): readonly OriginGroup[] {
  return Array.from(figure.querySelectorAll<HTMLElement>("[data-origin-year]")).map((el) => ({
    el,
    year: Number(el.getAttribute("data-origin-year")),
    isShoot: el.hasAttribute("data-tree-shoot") || el.hasAttribute("data-tree-shoot-label"),
    isTrunk: el.hasAttribute("data-tree-trunk"),
    tier: tierOf(el),
  }));
}

/**
 * The single rAF master clock (round 10, "Origin story on one clock"): every
 * group's release used to be scheduled by giving it its own CSS
 * `transitionDelay` (an inherited custom property) plus its own
 * `window.setTimeout` to later wipe that property back off — dozens of
 * independent clocks per beat, each free to fire late or out of order
 * relative to the others under load, exactly the "small clocks that miss
 * each other" the round's design brief names as the root cause of the
 * reported glitches. There is now exactly one clock: a single
 * `requestAnimationFrame` loop (the effect below this comment), reading one
 * `performance.now()` per frame, that both *decides* which pending group is
 * due (`dueByElapsed`, `origin-story.ts` — a pure function of elapsed time
 * against a plan `planRelease` already computed) and *cleans up* every
 * group's inline `--origin-rise`/`--origin-pop` once its own transition has
 * safely finished. A `QueuedRelease`/`QueuedCleanup` array standing in for
 * what used to be a `window.setTimeout` per entry: read every frame instead
 * of scheduled ahead of time, so nothing here can fire late relative to
 * anything else this clock also owns — they are all read from the same
 * `now`.
 *
 * The one thing this rewrite deliberately stops doing is writing
 * `--origin-stagger` at all. `[data-origin-running] .tree-draw` and its
 * siblings in globals.css still read `var(--origin-stagger, 0ms)` as their
 * own `transition-delay` — that CSS is untouched, and does not need to be:
 * with the clock itself now deciding *when* a group's `data-origin-pending`
 * is removed (waiting out each group's own stagger step in JS before ever
 * touching the DOM), the CSS transition can simply start the instant it is
 * triggered, at its own `var(--origin-stagger, 0ms)` default of zero. One
 * clock deciding "when", rather than a JS timer and a CSS delay each
 * independently approximating the same wait, is the whole fix.
 *
 * Compositor-friendly properties only, per the round's own constraint: every
 * transition this clock's DOM writes ultimately drive is `transform`
 * (`.tree-grow`/`.tree-grow-down`) or `opacity` (`.tree-fade`,
 * `[data-tree-panel]`, `[data-tree-entry] > div`) — the one exception,
 * `.tree-draw`'s `stroke-dashoffset`, is an SVG stroke-drawing effect this
 * package does not own (`DrawnTree.tsx`'s own ink contract, shared with the
 * page-load reveal); it predates this round and moving it to a
 * transform-based draw-on effect is out of this package's file ownership.
 */
interface QueuedRelease {
  readonly group: OriginGroup;
  readonly delayMs: number;
  readonly durationMs: number;
}

/** One group already released, whose inline `--origin-rise`/`--origin-pop`
 *  override is still waiting for its own transition to actually finish
 *  before the master clock wipes it back off. */
interface QueuedCleanup {
  readonly el: HTMLElement;
  readonly dueAt: number;
}

/**
 * Turns a beat's own cutoff year into an ordered release queue by calling
 * `planRelease` (the DOM-free, unit-tested half of this clock) with the real
 * groups' own facts, then joins each plan entry's opaque `key` back up with
 * the `OriginGroup` it actually came from. `planRelease` only ever returns
 * keys it was handed, so `byEl` always has a match; `flatMap` (rather than a
 * cast or a non-null assertion) is what lets the type checker see that
 * without this file asserting an invariant it cannot itself prove.
 */
function buildQueue(
  groups: readonly OriginGroup[],
  year: number,
  claimed: ReadonlySet<HTMLElement>,
): readonly QueuedRelease[] {
  const candidates: readonly StaggerCandidate<HTMLElement>[] = groups.map((group) => ({
    key: group.el,
    year: group.year,
    tier: group.tier,
    isTrunk: group.isTrunk,
    isShoot: group.isShoot,
  }));
  const plan = planRelease(candidates, year, claimed);
  const byEl = new Map(groups.map((group) => [group.el, group] as const));
  return plan.flatMap((entry) => {
    const group = byEl.get(entry.key);
    return group ? [{ group, delayMs: entry.delayMs, durationMs: entry.durationMs }] : [];
  });
}

function releaseShoot(groups: readonly OriginGroup[]): void {
  for (const group of groups) {
    if (group.isShoot) group.el.removeAttribute("data-origin-pending");
  }
}

/* -------------------------------------------------------------------------- */
/* The sky layer                                                              */
/* -------------------------------------------------------------------------- */

/** Shared viewBox for the sky layer's own drawing: a thin slice pinned over
 *  the canopy, the same 300:200 box the old silhouette stage used. */
const VIEW_BOX = "0 0 300 200";

/**
 * The flight and seed beats' own viewBox — a tight 300:160 crop of the same
 * coordinate space `VIEW_BOX` uses, rather than a second drawing. Nothing
 * either beat ever draws sits below the ground line at y=150 (`GroundLine`,
 * `MOUND_D`'s deepest point) — the 50 units of blank canvas from y=150 to
 * y=200 in `VIEW_BOX` exist only because the *sky* box also has to leave
 * headroom above the canopy for `WeatherLayer`'s sun/rain/wind. `groundSlice`
 * (the box below) has no such headroom to leave: it is pinned to the
 * drawing's own bottom edge, so the closer its own ground line sits to its
 * *own* bottom edge, the closer it reads to the real ground the trunk stands
 * on. 160 leaves ten units of margin below y=150 rather than shaving it
 * flush, so a hairline stroke at the ground line is never clipped.
 */
const GROUND_VIEW_BOX = "0 0 300 160";

/** A bird as four strokes — a shallow double chevron, the plainest shape
 *  that still reads as wings mid-flap. */
const BIRD_D = "M-8 3L-2 0M-2 0L0 2M0 2L2 0M2 0L8 3";
/** The arc the bird follows, drawn dashed behind it — same curve the
 *  `origin-flight` keyframes in globals.css approximate with translate
 *  steps. */
const FLIGHT_PATH_D = "M20 112C80 20 220 20 280 100";

const SEED_TRAIL_D = "M150 32C149 56 150 82 150 108";
const MOUND_D = "M136 150C142 144 158 144 164 150";

/** sun: six rays and a small disc. rain: five falling hatch strokes. storm:
 *  seven denser strokes plus one bent stroke — used only by the reduced-
 *  motion `Storyboard`'s small per-group glyph below, since a running show
 *  draws the storm as its own `StormOverlay`, layered atop whichever of
 *  these the year's base weather already is, not a fourth glyph of its own.
 *  quiet has no glyph at all — a bare sky is the honest picture of a year
 *  with nothing on record. */
const SUN_D =
  "M0 -11L0 -6M9.5 -5.5L6 -3M9.5 5.5L6 3M0 11L0 6M-9.5 5.5L-6 3M-9.5 -5.5L-6 -3" +
  "M-5 0A5 5 0 1 0 5 0A5 5 0 1 0 -5 0";
const RAIN_D = "M-10 -8L-13 2M-4 -10L-7 0M2 -9L-1 1M8 -10L5 0M14 -8L11 2";
const STORM_D =
  "M-14 -9L-17 1M-9 -11L-12 -1M-4 -10L-7 0M1 -11L-2 -1M6 -10L3 0M11 -11L8 -1M16 -9L13 1" +
  "M2 -14L-3 -2L4 -2L-2 12";

function weatherGlyph(kind: SeasonKind): string | undefined {
  switch (kind) {
    case "sun":
      return SUN_D;
    case "rain":
      return RAIN_D;
    case "storm":
      return STORM_D;
    case "quiet":
      return undefined;
  }
}

const strokeProps = {
  "aria-hidden": true,
  focusable: "false",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function GroundLine() {
  return <line x1={0} y1={150} x2={300} y2={150} stroke="currentColor" strokeWidth={1} />;
}

function SeedGlyph() {
  return (
    <g className="origin-glyph">
      <path d={SEED_TRAIL_D} />
      <circle cx={150} cy={112} r={2.4} fill="currentColor" stroke="none" />
      <path d={MOUND_D} />
    </g>
  );
}

/** The transparent sky: a bird tracing its flight (flight beat), a seed
 *  landing (seed beat) — nothing at all during a season beat (the weather
 *  itself is `WeatherLayer`, below, not this box) or "still", where the real
 *  tree's own shoot is the entire story. `pointer-events-none` throughout:
 *  this layer is decoration drawn *over* the canopy, never a click target and
 *  never a cover.
 *
 *  Round 15 ("the seed drops into empty air"): flight and seed are the two
 *  kinds this ever actually draws anything for, and both are the two beats
 *  before the tree has any canopy to speak of — a bird carrying a seed, not
 *  yet planted. The owner's report was that both played in the same
 *  top-pinned box the *canopy's own weather* uses, so on a tall tree the seed
 *  visibly landed a full trunk-length above the ground it was supposed to
 *  drop into. This component no longer decides where it renders — that is
 *  now the caller's job (see the render below, which mounts it inside
 *  `groundSlice`, pinned to the drawing's bottom edge, for exactly these two
 *  beats, and never mounts it inside `skySlice` at all). `viewBox` is the one
 *  thing that *does* still vary by caller: `groundSlice` passes
 *  `GROUND_VIEW_BOX`, the same coordinate space cropped to the ten units of
 *  margin below the ground line rather than the sky box's own fifty. Sized to
 *  fill whatever box its caller already gives it — that box is what carries
 *  the actual position/aspect-ratio duties, so this stays a plain, fully-
 *  filling `<svg>`. */
function SkyLayer({ beat, viewBox = VIEW_BOX }: { readonly beat: Beat; readonly viewBox?: string }) {
  return (
    <svg
      {...strokeProps}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full text-fg-subtle"
    >
      {beat.kind === "flight" ? (
        <>
          <GroundLine />
          <path d={FLIGHT_PATH_D} pathLength={1} className="origin-flight-path" style={originDur(FLIGHT_MS)} />
          <g className="origin-bird" style={originDur(FLIGHT_MS)}>
            <path d={BIRD_D} />
          </g>
        </>
      ) : null}
      {beat.kind === "seed" ? (
        <>
          <GroundLine />
          <SeedGlyph />
        </>
      ) : null}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* The weather layer — lives inside the sky slice, `absolute`, never fixed    */
/* to the viewport (round 12, "Everything lives in the frame" — see the file  */
/* banner).                                                                    */
/*                                                                            */
/* A season's weather used to be `WeatherGlyph` above: a small icon sharing   */
/* the same 300×200 sky slice the bird and the seed draw in. A later design-  */
/* polish pass promoted it to `position: fixed` against the viewport so it    */
/* would still read once a root beat's own camera pan scrolled that box off   */
/* screen — the owner's brief for that pass was blunt: "make raining, sunny,  */
/* windy more showing". Round 12 deletes the camera pan entirely (it was the  */
/* actual source of the reported scroll instability), so `WeatherLayer` moves */
/* back into the sky slice's own coordinate space rather than the viewport's. */
/* -------------------------------------------------------------------------- */

/** How many rain strokes an ordinary rain year draws — the storm overlay     */
const RAIN_STROKE_COUNT = 12;
/** draws more than this, for "denser" without a second, separate layout. */
const STORM_EXTRA_STROKES = 6;
const WIND_STROKE_COUNT = 2;

/** Evenly across the viewport's own width, one stroke per `1 / count` of it —
 *  centred in its own share rather than starting flush at the edge, so the
 *  outermost strokes still read as part of the same rain rather than a frame. */
function rainLeftPercent(index: number, count: number): number {
  return ((index + 0.5) / count) * 100;
}

/** ~12 (a storm's own count higher) slanted strokes, evenly spread and each
 *  falling on a loop — `animationDelay` staggers them so the whole width
 *  doesn't fall in lockstep. `dense` both draws more of them and switches
 *  their own colour to the stronger `--fg` alias (never blue — see the
 *  design system rules) rather than the ordinary `--fg-subtle` a plain rain
 *  year inherits from its container. */
function RainStrokes({ dense }: { readonly dense: boolean }) {
  const count = dense ? RAIN_STROKE_COUNT + STORM_EXTRA_STROKES : RAIN_STROKE_COUNT;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={cn("origin-weather-drop", dense && "origin-weather-drop--dense")}
          style={{
            left: `${rainLeftPercent(i, count)}%`,
            animationDelay: `${(i % 6) * 150}ms`,
          }}
        />
      ))}
    </>
  );
}

/** The existing ray-and-disc glyph, drawn larger and given a slow breathe
 *  (`.origin-weather-sun`, `globals.css`) — the one season whose whole point
 *  is a steady, untroubled year, so the only motion it gets is the gentlest
 *  one this file has. */
function SunGlyph() {
  return (
    <svg
      {...strokeProps}
      viewBox="0 0 40 40"
      className="origin-weather-sun absolute left-1/2 top-[20%] h-24 w-24 text-fg-subtle"
    >
      <path d={SUN_D} transform="translate(20 20) scale(1.8)" />
    </svg>
  );
}

/** Two bent strokes — the same "hard corner, not a curve" shape `STORM_D`'s
 *  own closing segment already draws (`M2 -14L-3 -2L4 -2L-2 12`) — at two
 *  sizes and positions, rather than one bolt centred alone. */
const BOLT_D = "M2 -14L-3 -2L4 -2L-2 12";

function StormBolts() {
  return (
    <svg
      {...strokeProps}
      viewBox="0 0 40 40"
      className="absolute left-1/2 top-[12%] h-20 w-20 text-fg"
    >
      <g transform="translate(13 18) scale(1.4)">
        <path d={BOLT_D} />
      </g>
      <g transform="translate(27 23) scale(1.05)">
        <path d={BOLT_D} />
      </g>
    </svg>
  );
}

/**
 * The storm event: a passage *through* a beat's weather, not a fourth kind
 * replacing it — see `Season.storm`'s own doc comment in `origin-story.ts`
 * for why a milestone year no longer overrides its base rain/sun/quiet at
 * all. `.origin-weather-storm-overlay` (globals.css) is what actually times
 * this: the overlay renders for the entire beat but sits at `opacity: 0`
 * until its animation's own delay elapses, so it visually appears roughly
 * 600ms into the beat, holds briefly, then fades back to nothing well before
 * `SEASON_MS` (2000ms) runs out — a storm passing through mid-beat, not a
 * sky the whole beat wears. The one-time shudder rides the same delay, so
 * the shake and the storm's own ink appear together. Composed from the same
 * dense rain and bent-bolt strokes the old, storm-as-a-kind branch drew —
 * nothing new to look at, only a new place in time for it to happen. */
function StormOverlay() {
  return (
    <div aria-hidden="true" className="origin-weather-storm-overlay pointer-events-none absolute inset-0 text-fg">
      <RainStrokes dense />
      <StormBolts />
    </div>
  );
}

/** A quiet year is weather too — wind, not an empty sky: two long, gently
 *  curved strokes drifting the full width of the viewport on their own loop,
 *  the second offset so they never travel in lockstep. Calm and sparse, the
 *  way "roots don't hurry" reads as motion rather than as nothing happening.
 *  Stretched horizontally with `preserveAspectRatio="none"` and drawn with
 *  `vectorEffect="non-scaling-stroke"` — the same pairing `Trunk` and
 *  `RootSystem` in `DrawnTree.tsx` already use to stretch a path without
 *  thickening its line. */
function WindStrokes() {
  return (
    <>
      {Array.from({ length: WIND_STROKE_COUNT }, (_, i) => (
        <svg
          key={i}
          {...strokeProps}
          viewBox="0 0 300 40"
          preserveAspectRatio="none"
          className="origin-weather-wind absolute h-6 w-2/3 text-fg-subtle"
          style={{ top: `${30 + i * 22}%`, animationDelay: `${i * 2200}ms` }}
        >
          <path d="M0 20C60 4 120 36 180 20C220 8 260 24 300 14" vectorEffect="non-scaling-stroke" />
        </svg>
      ))}
    </>
  );
}

/**
 * The season's weather: `position: absolute`, filling `skySlice` — the same
 * small box `SkyLayer` draws in — so the rain, sun or wind scrolls with the
 * drawing exactly as the rest of it does. An earlier pass made this
 * `position: fixed` against the viewport so it would still read once a root
 * beat's own camera pan scrolled `skySlice` off screen; round 12 deletes
 * that pan entirely (see the file banner's "Everything lives in the frame"),
 * so there is no second camera position for this layer to survive any more
 * — it simply lives where `SkyLayer` already does. `pointer-events-none`/
 * `aria-hidden` throughout: this is atmosphere, never a click target and
 * never a second narration (the accessible `role="status"` region and
 * `FloatingAnnotation` already carry the beat's own words).
 *
 * Base weather, for the *whole* beat, is drawn straight off `season.kind` —
 * which is never `"storm"` any more, see `origin-story.ts`. A storm is
 * `season.storm`, layered on top via `StormOverlay` rather than swapped in
 * for the base atmosphere: real content puts a milestone in every active
 * year, so a year is honestly both its own weather *and* a storm passing
 * through it, never one or the other.
 *
 * `key={season.year}` remounts a fresh element on every season change, the
 * same one-shot-entry idiom the old `WeatherGlyph` used for its own settle-in
 * — here it is also what restarts `StormOverlay`'s own delayed fade-in/shudder
 * on every storm year rather than only ever playing it once for the whole
 * run.
 *
 * The year numeral sits top-left of this same box — the one fact this whole
 * layer still owes a reader. Top-*left*, not top-right: the Skip button
 * (`SKIP_BUTTON_CLASS` below) already owns that corner.
 */
function WeatherLayer({ season }: { readonly season: Season }) {
  return (
    <div
      key={season.year}
      aria-hidden="true"
      data-origin-weather={season.kind}
      data-origin-storm={season.storm ? "" : undefined}
      className="pointer-events-none absolute inset-0 overflow-hidden text-fg-subtle"
    >
      {season.kind === "rain" ? <RainStrokes dense={false} /> : null}
      {season.kind === "sun" ? <SunGlyph /> : null}
      {season.kind === "quiet" ? <WindStrokes /> : null}
      {season.storm ? <StormOverlay /> : null}
      <span className="eyebrow absolute left-3 top-2 text-fg-subtle">
        {season.year}
      </span>
    </div>
  );
}

/** The bare-mono fallback narration: shown whenever the cats are not
 *  narrating — the parent only renders this while `catsNarrating` is still
 *  false. `aria-hidden` because it duplicates the accessible `role="status"`
 *  region below it; a screen reader should hear the story once, not twice.
 *
 *  Always `absolute` inside whichever of `skySlice`/`groundSlice` the current
 *  beat itself drew in (round 15 split what was one box into two — see the
 *  file banner's "The sky, not a cover" — round 12 deleted the camera pan
 *  that used to walk the page away from that box for a root beat, so there
 *  is no second camera position left for this annotation to survive by
 *  switching to `position: fixed`, and it no longer does, in either box).
 *  `bottom-2` puts it at that box's own bottom edge — for `groundSlice`
 *  (flight, seed) that is now close to the real ground line, the same fix
 *  `SkyLayer`'s own doc comment describes; for `skySlice` (every other beat)
 *  it is the canopy's own bottom edge, as it always was. `bg-ground/90` keeps
 *  the text legible over whatever part of the drawing sits behind it —
 *  canopy or root, either theme, any tone (checked against the deep tone's
 *  own paper, the pairing that fails first — see CLAUDE.md's contrast
 *  note). */
function FloatingAnnotation({ text }: { readonly text: string }) {
  return (
    <p
      aria-hidden="true"
      data-origin-annotation
      className="pointer-events-none absolute inset-x-3 bottom-2 z-10 bg-ground/90 px-1 font-mono text-[length:var(--step--1)] leading-snug text-fg-subtle"
    >
      {text}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* Storyboard — the reduced-motion fallback (unchanged from v1)              */
/* -------------------------------------------------------------------------- */

/** A trunk and four limbs, one path — the storyboard's own small illustration,
 *  independent of the real tree it sits over: reduced motion never stamps
 *  `data-origin-running` (the beat effect below bails out first), so the
 *  real tree stays exactly as already-inked as it always is underneath this
 *  static overlay. `pathLength={1}` makes its `stroke-dashoffset` a plain
 *  0..1 fraction regardless of the real path length, the same trick every
 *  growth-drawn path in `DrawnTree.tsx` uses. */
const SILHOUETTE_D =
  "M150 150C150 130 148 110 150 92C151 78 149 64 150 50" +
  "M150 118C138 108 128 100 116 96" +
  "M150 96C162 88 172 82 182 78" +
  "M150 74C140 66 132 60 122 56" +
  "M150 60C158 54 166 50 174 46";

/** The unfinished shoot the storyboard's closing frame adds above the
 *  silhouette's own tip — thinner, open-ended, the same idea as
 *  `DrawnTree.tsx`'s `GrowingTip`, drawn small enough for this frame rather
 *  than shared code. */
const SHOOT_D = "M150 50C152 42 146 34 156 26";

const KIND_LABEL: Record<SeasonKind, string> = {
  sun: "Sun years",
  rain: "Rain years",
  storm: "Storm years",
  quiet: "Quiet years",
};

interface KindGroup {
  readonly kind: SeasonKind;
  readonly years: readonly number[];
  /** The subset of `years` that also carried a storm — surfaced in the
   *  frame's own caption text below, since the static storyboard draws only
   *  one small glyph per group and has no running overlay to show a storm
   *  passing through the way the animated show does. */
  readonly stormYears: readonly number[];
}

/** One frame per distinct base `SeasonKind` actually present, in the order
 *  each first appears — not one frame per year, and not a fixed three
 *  regardless of what the real seasons contain. `kind` is always base
 *  weather now (never `"storm"` — see `origin-story.ts`), so this groups
 *  exactly the way it always has; the storm years within a group are
 *  tracked separately rather than fracturing the grouping by a fourth kind. */
function groupByKind(seasons: readonly Season[]): readonly KindGroup[] {
  const order: SeasonKind[] = [];
  const byKind = new Map<SeasonKind, number[]>();
  const stormByKind = new Map<SeasonKind, number[]>();
  for (const season of seasons) {
    if (!byKind.has(season.kind)) {
      byKind.set(season.kind, []);
      stormByKind.set(season.kind, []);
      order.push(season.kind);
    }
    byKind.get(season.kind)?.push(season.year);
    if (season.storm) stormByKind.get(season.kind)?.push(season.year);
  }
  return order.map((kind) => ({
    kind,
    years: byKind.get(kind) ?? [],
    stormYears: stormByKind.get(kind) ?? [],
  }));
}

function StoryboardFrame({ caption, children }: { readonly caption: string; readonly children: ReactNode }) {
  return (
    <figure className="border border-rule bg-surface p-3">
      <svg
        {...strokeProps}
        viewBox={VIEW_BOX}
        preserveAspectRatio="xMidYMid meet"
        className="h-20 w-full text-fg-subtle"
      >
        <GroundLine />
        {children}
      </svg>
      <figcaption className="mt-2 text-[length:var(--step--1)] leading-snug text-fg">{caption}</figcaption>
    </figure>
  );
}

function Storyboard({ seasons }: { readonly seasons: readonly Season[] }) {
  const groups = useMemo(() => groupByKind(seasons), [seasons]);
  const lastYear = seasons[seasons.length - 1]?.year;

  return (
    // No `h-full`/`overflow-y-auto`: the stage that hosts this (see the
    // `reduced` branch of `data-origin-stage`'s className below) carries no
    // aspect-ratio clamp of its own in this mode, so this div sizes to its
    // real content — all frames, stacked, fully visible — the same way any
    // ordinary block of static content on the page does. A scroller with no
    // focusable element inside it is unreachable by keyboard (WCAG 2.1.1),
    // and "fully readable" storyboard is the one thing the spec asks for
    // under reduced motion; clipping it into a small box and hoping someone
    // finds the scrollbar satisfied neither.
    <div className="flex flex-col gap-4 bg-ground p-4">
      <StoryboardFrame caption={flightCaption()}>
        <path d={FLIGHT_PATH_D} />
        <g transform="translate(280 100)">
          <path d={BIRD_D} />
        </g>
      </StoryboardFrame>

      <StoryboardFrame caption="A seed, carried the whole way.">
        <path d={SEED_TRAIL_D} />
        <circle cx={150} cy={112} r={2.4} fill="currentColor" stroke="none" />
        <path d={MOUND_D} />
        <path d={SILHOUETTE_D} pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 1 }} />
      </StoryboardFrame>

      {groups.map(({ kind, years, stormYears }) => {
        const d = weatherGlyph(kind);
        const stormNote = stormYears.length > 0 ? ` (storm: ${stormYears.join(", ")})` : "";
        return (
          <StoryboardFrame key={kind} caption={`${KIND_LABEL[kind]} — ${years.join(", ")}${stormNote}`}>
            <path
              d={SILHOUETTE_D}
              pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: 1 - growthStage(Math.max(...years)) }}
            />
            {d ? (
              <g transform="translate(240 48)">
                <path d={d} />
              </g>
            ) : null}
          </StoryboardFrame>
        );
      })}

      <StoryboardFrame caption={`The tree as it stands today — and still growing, ${lastYear ?? ""}.`}>
        <path d={SILHOUETTE_D} pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 0 }} />
        <path d={SHOOT_D} strokeWidth={0.75} />
      </StoryboardFrame>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

const SKIP_BUTTON_CLASS =
  "absolute right-3 top-3 z-10 min-h-11 border border-rule bg-surface px-3 text-[length:var(--step--1)] text-fg hover:text-accent";

export interface OriginStoryProps {
  /**
   * `restoreFocus` is true when focus was still somewhere inside the stage
   * the instant it ended — the ordinary case for Escape and Skip, since the
   * layout effect below puts focus on the Skip button on mount and nothing
   * here ever moves it away on its own. It can still be false if something
   * outside this component moved focus elsewhere before the show ended (a
   * visitor tabbing away, or clicking something else on the page). The
   * caller (`WatchOrigin.tsx`) uses it to decide whether pulling focus back
   * to the "Watch how it grew" button is a courtesy or a hijack.
   */
  readonly onClose: (restoreFocus: boolean) => void;
}

export default function OriginStory({ onClose }: OriginStoryProps) {
  const seasons = useMemo(() => seasonsFor(), []);
  const beats = useMemo(() => buildBeats(seasons), [seasons]);
  // Read once, at open — never rendered on the server, so `window` is always
  // there. The animated beats never start ticking under `reduce`, so there
  // is nothing mid-show for a later preference change to interrupt.
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [index, setIndex] = useState(0);
  const [announced, setAnnounced] = useState("");
  // Flips true the moment the companion answers `origin-story-ack` with
  // `detail: "start"` (Task 3), and back to false if it later answers with
  // `detail: "stop"` — the watch dropping mid-show (the toolkit opening, an
  // escort, a nap, or the visitor turning roaming off) rather than the run
  // ending outright. Without the reverse flip, dropping the watch mid-show
  // left the fallback annotation permanently hidden for the rest of the run:
  // the cats had gone quiet, but nothing here would have known to speak up
  // in their place. See the ack listener effect below.
  const [catsNarrating, setCatsNarrating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  // The small, top-pinned "sky slice" box `WeatherLayer` renders inside, and
  // `FloatingAnnotation` too for every beat except flight/seed — see the file
  // banner. Unused (stays null) under reduced motion, where the Storyboard
  // branch renders none of them.
  const skySliceRef = useRef<HTMLDivElement>(null);
  // The bottom-pinned "ground slice" box — round 15's fix for the seed
  // dropping into empty air above a tall tree (see the file banner and
  // `SkyLayer`'s own doc comment). `SkyLayer` and `FloatingAnnotation` render
  // inside this one instead of `skySlice` for exactly the flight and seed
  // beats. Unused (stays null) under reduced motion, same as `skySliceRef`.
  const groundSliceRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const ended = useRef(false);
  // Captured once, at the setup effect below — read at unmount time via this
  // plain ref rather than `containerRef.current`, which React may already
  // have detached by the time an unrelated cleanup runs.
  const figureRef = useRef<HTMLElement | null>(null);
  const groupsRef = useRef<readonly OriginGroup[]>([]);
  // Every group this run has ever queued for release, whether or not the
  // clock has actually applied it yet — the single source of truth
  // `buildQueue` (via `planRelease`) checks so a group already claimed by an
  // earlier beat is never queued a second time by a later "still" beat's own
  // safety sweep through `Infinity`.
  const claimedRef = useRef<Set<HTMLElement>>(new Set());
  // The current beat's own release plan, waiting for the master clock below
  // to apply each entry once enough time has passed — see `dueByElapsed`
  // (`origin-story.ts`). Never a `window.setTimeout` queue: entries here are
  // only ever *read*, every animation frame, against one shared `now`.
  const releaseQueueRef = useRef<readonly QueuedRelease[]>([]);
  // Every already-released group still waiting for its own inline
  // `--origin-rise`/`--origin-pop` override to be safe to clear — same idea
  // as `releaseQueueRef`, read every frame instead of scheduled ahead with
  // `window.setTimeout`.
  const cleanupQueueRef = useRef<QueuedCleanup[]>([]);
  // `performance.now()` at the instant the current beat began — every
  // "how much time has passed" question the clock answers this beat is
  // `performance.now() - beatStartRef.current`, one shared value instead of
  // each beat/group re-deriving its own.
  const beatStartRef = useRef(0);
  // The current beat's own `durationMs`, mirrored here so the master clock
  // effect (mount-scoped, run once) can read the *latest* beat without
  // re-subscribing to it — see the beat effect below, which is what keeps
  // this in sync.
  const beatDurationRef = useRef(0);
  // Guards the clock's own auto-advance so a beat whose expiry is detected
  // on one frame cannot fire `advance()` again on the next, before React has
  // had a chance to commit the resulting state change and the beat effect
  // has reset `beatStartRef` for the new beat. Cleared by that same beat
  // effect, the same "the next real beat clears the guard" idiom `ended`
  // already uses for `end()`.
  const advancingRef = useRef(false);
  // The latest `advance` closure, read by the master clock instead of
  // captured at effect-setup time — `advance` itself is recreated most
  // renders (it closes over `isLast`/`index`), and the clock effect below is
  // mount-scoped, so it needs a way to always call the *current* one.
  const advanceRef = useRef<() => void>(() => {});
  const rafIdRef = useRef<number | null>(null);

  // Applies one plan entry for real: sets the duration override the trunk
  // or a leaf needs (everything else keeps the ordinary CSS duration, so
  // nothing is written for it), removes `data-origin-pending` — the one DOM
  // change that actually starts the group's own CSS transition, at whatever
  // moment this is called — and queues the matching cleanup. Called from
  // three places, always with the *same* meaning ("this group's moment has
  // arrived, right now"): the conductor's own initial arrival-year release,
  // a beat boundary flushing whatever the clock had not yet reached, and the
  // master clock itself as each entry's own `delayMs` elapses.
  const applyRelease = useCallback((group: OriginGroup, durationMs: number, now: number) => {
    if (group.isTrunk) {
      group.el.style.setProperty("--origin-rise", `${durationMs}ms`);
    } else if (group.tier === TIER_LEAF) {
      group.el.style.setProperty("--origin-pop", `${durationMs}ms`);
    }
    group.el.removeAttribute("data-origin-pending");
    cleanupQueueRef.current.push({ el: group.el, dueAt: now + durationMs + STAGGER_CLEANUP_MARGIN_MS });
  }, []);

  // The one cleanup every exit path funnels through — see the file banner's
  // note on why this must never leave the tree half-drawn. Idempotent: once
  // a group has lost `data-origin-pending`, removing it again is a no-op,
  // and removing an attribute that is already gone is too.
  const releaseEverything = useCallback(() => {
    releaseQueueRef.current = [];
    cleanupQueueRef.current = [];
    const figure = figureRef.current;
    if (!figure) return;
    figure
      .querySelectorAll("[data-origin-pending]")
      .forEach((el) => el.removeAttribute("data-origin-pending"));
    // Wipes the growth-choreography overrides too — queried fresh from the
    // figure rather than read off `groupsRef`, so this stays correct even on
    // an exit that races the conductor's own setup effect. Safe to do in one
    // blanket pass *here*, unlike per-frame: every group's `data-origin-
    // pending` is being stripped in this same call, so any group whose
    // override this also clears is already mid-genuinely-changing, not an
    // untouched one having its already-settled transition reopened for no
    // reason — see `applyRelease`'s own doc comment on exactly that failure
    // mode, which this project already hit once under the old per-group
    // `window.setTimeout` design. Without this, a Skip/Escape mid-release
    // would leave a real, still-mounted tree carrying `--origin-rise`/
    // `--origin-pop` custom properties a *second* run of this same story
    // would otherwise inherit before ever setting its own.
    figure.querySelectorAll<HTMLElement>("[data-origin-year]").forEach((el) => {
      el.style.removeProperty("--origin-rise");
      el.style.removeProperty("--origin-pop");
    });
    figure.removeAttribute("data-origin-running");
  }, []);

  const end = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    releaseEverything();
    document.dispatchEvent(new CustomEvent("origin-story", { detail: "end" }));
    // Read *before* `onClose` unmounts this subtree — `document.activeElement`
    // is still whatever it was the instant the show ended: Escape or Skip,
    // both of which leave focus on the Skip button inside `containerRef`
    // (the layout effect below puts it there on mount and nothing here ever
    // moves it away), or the last beat's own timeout, which leaves focus
    // wherever it already was.
    const restoreFocus = containerRef.current?.contains(document.activeElement) ?? false;
    onClose(restoreFocus);
  }, [onClose, releaseEverything]);

  useEffect(() => {
    // Reset on every real run of this effect, not just at the top of the
    // module — development's Strict Mode runs mount effects twice (mount,
    // clean up, mount again) to surface exactly this class of bug. Without
    // the reset, the synthetic first cleanup below would latch `ended.current`
    // to `true` for good, and every *real* `end()` afterwards — Escape, Skip,
    // the last beat's own timeout — would silently no-op against a guard that
    // had already fired for a mount nobody asked to close.
    ended.current = false;
    // Listening before dispatching: `dispatchEvent` is synchronous, so if the
    // companion is already mounted and answers `origin-story-ack`
    // synchronously from its own "start" listener (Task 3), this has to be
    // attached first to hear it. `detail: "stop"` is the companion dropping
    // the watch mid-show without the run itself ending (toolkit open,
    // escort, nap, roaming off — see Companion.tsx's own watch-drop sites);
    // anything else (including the original, detail-less dispatch this
    // listener has always answered) is treated as the accept/"start" case,
    // so a companion build that predates the "stop" detail still narrates
    // exactly as before.
    const onAck = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setCatsNarrating(detail !== "stop");
    };
    document.addEventListener("origin-story-ack", onAck);
    document.dispatchEvent(new CustomEvent("origin-story", { detail: "start" }));
    return () => {
      document.removeEventListener("origin-story-ack", onAck);
      // Covers the exits `end()` never sees directly — a parent unmounting
      // this component some other way, or an error before any exit handler
      // ran. `ended` guarantees the pair (and the tree release) fires
      // exactly once per *real* mount, Strict Mode's rehearsal included.
      if (!ended.current) {
        ended.current = true;
        releaseEverything();
        document.dispatchEvent(new CustomEvent("origin-story", { detail: "end" }));
      }
    };
  }, [releaseEverything]);

  // The conductor's setup, once per real mount: find the real figure, stamp
  // it running, cache every growable group exactly once (so later beats
  // never re-query the DOM), pend all of them, then immediately release
  // whatever is already true at the flight's own landing year — there is
  // nothing earlier than `origin.arrivedYear` for any group to honestly
  // claim, so nothing here waits on a beat that will never move it. Skipped
  // entirely under reduced motion, which never touches these attributes —
  // see the Storyboard doc comment above for why that overlay is safe
  // regardless.
  useEffect(() => {
    if (reduced) return;
    const figure = containerRef.current?.closest<HTMLElement>("[data-tree-figure]");
    if (!figure) return;
    // Reset every ref-based bookkeeping set this effect (and everything
    // downstream of it) builds on, rather than trusting it to already be
    // empty. `claimedRef` in particular is a plain ref, so it survives
    // React Strict Mode's dev-only mount → cleanup → mount rehearsal at
    // full value — this effect has no cleanup of its own to undo the
    // phantom first pass's claims, while the DOM reset two lines below
    // (`setAttribute("data-origin-pending", "")` on every group) *does*
    // start over fresh on the real mount. Without this reset, the phantom
    // pass's claim on `origin.arrivedYear`'s own groups outlives it, and
    // `buildQueue` below — seeing them already "claimed" — never queues
    // them again on the real mount, even though the DOM just re-pended
    // them: a permanently stranded group, not merely a late one. Safe to
    // do unconditionally here because this is the first effect in mount
    // order to ever touch any of this state (see the hook order above).
    claimedRef.current = new Set();
    releaseQueueRef.current = [];
    cleanupQueueRef.current = [];
    figureRef.current = figure;
    figure.setAttribute("data-origin-running", "");
    const groups = queryGroups(figure);
    groups.forEach((group) => group.el.setAttribute("data-origin-pending", ""));
    groupsRef.current = groups;
    const now = performance.now();
    const initial = buildQueue(groups, origin.arrivedYear, claimedRef.current);
    for (const item of initial) {
      claimedRef.current.add(item.group.el);
      applyRelease(item.group, item.durationMs, now);
    }
  }, [reduced, applyRelease]);

  // Layout effects, not passive ones, for the two things a *visible* player
  // must already have: focus on Skip, and a working Escape. A passive effect
  // runs after paint, which leaves a window — one frame wide normally, much
  // wider under load — where the stage is on screen but an Escape press is
  // dropped on a listener not yet attached, and `end()`'s focus-was-inside
  // check reads focus that never moved to Skip. A full-suite Playwright run
  // hit exactly that window once; a fast human on a slow machine could too.
  useLayoutEffect(() => {
    skipRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") end();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [end]);

  const beat = beats[index];
  const isLast = index >= beats.length - 1;
  // Flight and seed are the only two beats `SkyLayer` still draws anything
  // for, and — since round 15 — the only two that render inside
  // `groundSlice` rather than `skySlice`. See `SkyLayer`'s and the file
  // banner's own doc comments for why.
  const isGroundBeat = beat.kind === "flight" || beat.kind === "seed";

  // Mounted empty and filled a frame later — the same mount-empty-then-fill
  // discipline `TourHud.tsx`'s `role="status"` region uses, for the same
  // reason. Rendering beat 1's caption straight into the region on its first
  // paint would mean the region never actually *changes*: a `role="status"`
  // a screen reader has never seen before is one it may not announce with
  // content already inside it. A `requestAnimationFrame` after mount/update
  // guarantees at least one paint with the old (or, for beat 1, empty) text
  // still in place before the real caption lands, so every beat — the first
  // one included — is heard as a change.
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnnounced(beat.caption));
    return () => cancelAnimationFrame(id);
  }, [beat]);

  // Builds this beat's own release queue and starts its own share of the
  // master clock below — no `window.setTimeout` here any more (compare the
  // old per-beat auto-advance timer this replaced): `beatStartRef` and
  // `beatDurationRef` are the only state this beat contributes, and the one
  // continuously-running rAF loop reads both every frame from here on.
  useEffect(() => {
    if (reduced) return;

    const groups = groupsRef.current;
    const now = performance.now();

    // Flush anything the clock had not yet reached from the beat that just
    // ended — a release queue never bleeds across a beat boundary, it only
    // ever finishes early. In practice this is a no-op: `STAGGER_STEP_MS`
    // against a beat's own `durationMs` (`origin-story.ts`) is sized so a
    // whole year's groups clear well inside one season beat, but a queue
    // that somehow didn't finish is still better snapped into place here
    // than left to desync against a beat it no longer belongs to.
    for (const queued of releaseQueueRef.current) {
      applyRelease(queued.group, queued.durationMs, now);
    }
    releaseQueueRef.current = [];
    beatStartRef.current = now;
    beatDurationRef.current = beat.durationMs;
    advancingRef.current = false;

    // This beat's own release, before anything else it does: the shoot
    // waits for "still" specifically (see `releaseShoot`'s doc comment); a
    // season beat releases every other group at or before its own year;
    // flight and seed queue nothing — there is nothing dated that early for
    // them to honestly reveal. "still" also sweeps every non-shoot group
    // through `Infinity` as a last-beat safety net — belt and braces
    // alongside the season sweep, so the natural end of a full run is never
    // the one exit path that could leave something stranded pending for
    // `releaseEverything()` to have to clean up instead.
    if (beat.kind === "still") {
      const queue = buildQueue(groups, Infinity, claimedRef.current);
      for (const item of queue) claimedRef.current.add(item.group.el);
      releaseQueueRef.current = queue;
      releaseShoot(groups);
    } else if (beat.season) {
      const queue = buildQueue(groups, beat.season.year, claimedRef.current);
      for (const item of queue) claimedRef.current.add(item.group.el);
      releaseQueueRef.current = queue;
    }

    document.dispatchEvent(
      new CustomEvent("origin-story-beat", {
        // `sub` is this beat's own caption — the same string `announced`
        // (and, through it, the `role="status"` region and the floating
        // annotation) is about to render. It is not read by Companion.tsx's
        // listener: the cats narrate from their own authored copy
        // (`storyBeatScene` in companion-dialogue.ts, keyed on `kind`/
        // `year`/`storm`), by design — a meow with a typed translation
        // beneath it, not this file's prose read back verbatim. `sub`
        // travels in the payload anyway so the two narrations can be
        // compared or cross-checked without a second event. `kind` is
        // always the beat's *base* weather (never `"storm"` — see
        // `origin-story.ts`); `storm` rides alongside it separately, so the
        // companion's own choreography can react to a milestone year on top
        // of whichever base weather it already reacts to, not instead of it.
        detail: { kind: beat.kind, year: beat.season?.year, storm: beat.season?.storm ?? false, sub: beat.caption },
      }),
    );
  }, [beat, reduced, applyRelease]);

  const advance = useCallback(() => {
    if (reduced) return;
    if (isLast) end();
    else setIndex((current) => current + 1);
  }, [reduced, isLast, end]);

  // Keeps the master clock's own copy of `advance` current — the clock
  // effect just below is mount-scoped (it must never restart, or its own
  // `requestAnimationFrame` chain would restart with it), so it reads
  // `advanceRef.current()` rather than closing over `advance` directly.
  useEffect(() => {
    advanceRef.current = advance;
  }, [advance]);

  // The master clock itself: one `requestAnimationFrame` loop, started once
  // at mount and running for the lifetime of the show, replacing every
  // `window.setTimeout` this file used to schedule for beat pacing and
  // stagger cleanup — see the doc comment above `QueuedRelease` for why that
  // was the actual source of the reported glitches. Every frame reads one
  // shared `now` and answers three questions purely from it: which queued
  // groups are due (`dueByElapsed`), which already-released groups' inline
  // overrides are safe to clear, and whether this beat's own `durationMs`
  // has elapsed. Nothing here schedules a future callback of its own; the
  // next frame is simply the next `requestAnimationFrame`.
  useEffect(() => {
    if (reduced) return;
    let cancelled = false;

    function tick() {
      if (cancelled) return;
      const now = performance.now();
      const elapsed = now - beatStartRef.current;

      // `dueByElapsed` itself is generic over a plain `{ key, delayMs,
      // durationMs }` shape (`origin-story.ts`) so it can be unit-tested
      // without a DOM; `QueuedRelease` carries the real `OriginGroup`
      // instead of an opaque key, so the equivalent cut is repeated here
      // rather than reshaping this array through that generic just to
      // reshape it back.
      let dueCount = 0;
      const queue = releaseQueueRef.current;
      while (dueCount < queue.length && elapsed >= queue[dueCount].delayMs) dueCount++;
      if (dueCount > 0) {
        for (let i = 0; i < dueCount; i++) applyRelease(queue[i].group, queue[i].durationMs, now);
        releaseQueueRef.current = queue.slice(dueCount);
      }

      if (cleanupQueueRef.current.length > 0) {
        const stillWaiting: QueuedCleanup[] = [];
        for (const cleanup of cleanupQueueRef.current) {
          if (now >= cleanup.dueAt) {
            cleanup.el.style.removeProperty("--origin-rise");
            cleanup.el.style.removeProperty("--origin-pop");
          } else {
            stillWaiting.push(cleanup);
          }
        }
        cleanupQueueRef.current = stillWaiting;
      }

      // Guarded by `advancingRef` so a beat detected as expired on one frame
      // cannot fire `advance()` again on the next, before React has
      // committed the resulting state change and the beat effect above has
      // reset `beatStartRef` for the new beat — see that ref's own doc
      // comment.
      if (!advancingRef.current && elapsed >= beatDurationRef.current) {
        advancingRef.current = true;
        advanceRef.current();
      }

      rafIdRef.current = requestAnimationFrame(tick);
    }

    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    };
  }, [reduced, applyRelease]);

  const handleSkip = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      end();
    },
    [end],
  );

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label="How the tree grew"
      data-origin-stage
      onClick={reduced ? undefined : advance}
      // Non-reduced: `inset-0` matches the *whole* drawing wrapper
      // `KnowledgeTree.tsx` puts around `<DrawnTree>` — the click-to-advance
      // target the whole real tree draws inside, not just the sky slice — so
      // a click anywhere the growing tree is visible still advances the
      // story. Reduced motion keeps the old top-pinned, unclamped box: the
      // storyboard is meant to be read start to finish, not clicked through,
      // and has more than enough height below it to grow into.
      className={cn("absolute", reduced ? "inset-x-0 top-0 z-20" : "inset-0 z-20 cursor-pointer")}
    >
      {reduced ? (
        <Storyboard seasons={seasons} />
      ) : (
        <>
          {/* The sky slice: a small, top-pinned box (the same 300×200 area
              the old silhouette stage used), `absolute` inside the stage
              above — which is itself `absolute` inside the tree figure's own
              relative box, never `fixed` to the viewport, so it scrolls with
              the rest of the drawing as one object. Holds a season's weather,
              and — for every beat except flight/seed (round 15; see the file
              banner) — the floating annotation too. `data-origin-sky` is a
              query hook only, for `origin.spec.ts` to prove this box's own
              bounding box never strays outside the stage's — i.e. that
              scrolling moves the two together rather than shearing one away
              from the other. */}
          <div
            ref={skySliceRef}
            data-origin-sky
            className="pointer-events-none absolute inset-x-0 top-0 aspect-[3/2]"
          >
            {beat.season ? <WeatherLayer season={beat.season} /> : null}
            {!catsNarrating && !isGroundBeat ? <FloatingAnnotation text={announced} /> : null}
          </div>
          {/* The ground slice: round 15's fix for "the seed drops into empty
              air" — a small box mirroring `skySlice` but `bottom-0` instead
              of `top-0`, pinned to the drawing's own bottom edge (the same
              edge `TrunkFoot`'s `bottom-0` and the root plinth's top border
              already share — see `SkyLayer`'s and the file banner's own doc
              comments). Holds the sky layer's own drawing — the bird's
              flight, the seed's landing — and the floating annotation, for
              exactly those two beats; every other beat renders neither here,
              leaving this box empty. `data-origin-ground` is a query hook
              only, the same "stays inside the stage while scrolling" contract
              `data-origin-sky` already proves, in `origin.spec.ts`. */}
          <div
            ref={groundSliceRef}
            data-origin-ground
            className="pointer-events-none absolute inset-x-0 bottom-0 aspect-[15/8]"
          >
            {isGroundBeat ? <SkyLayer beat={beat} viewBox={GROUND_VIEW_BOX} /> : null}
            {!catsNarrating && isGroundBeat ? <FloatingAnnotation text={announced} /> : null}
          </div>
          <p role="status" className="sr-only">
            {announced}
          </p>
        </>
      )}

      <button type="button" ref={skipRef} onClick={handleSkip} className={SKIP_BUTTON_CLASS}>
        Skip
      </button>
    </div>
  );
}
