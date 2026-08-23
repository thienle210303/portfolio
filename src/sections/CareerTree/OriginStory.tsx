"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { origin } from "@/content/portfolio";
import { cn } from "@/lib/cn";
import {
  firstCanopyYear,
  growthStage,
  seasonsFor,
  type Season,
  type SeasonKind,
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
 * ever does — the unfinished shoot. `setTimeout` auto-advances; a click
 * anywhere on the stage advances immediately, the same "click moves things
 * along" idiom the companion's duet already uses. Escape, the Skip button,
 * or the figure scrolling out of view all end the show the same way.
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
 * The one thing every exit path — Skip, Escape, scrolling the stage out of
 * view, the last beat's own timeout, an unmount nothing here chose, even a
 * thrown error — must do is release every remaining pending group and drop
 * `data-origin-running`, synchronously, before this component is gone. A
 * real tree left half-drawn is a worse failure than a story that never
 * played at all. `releaseEverything` below is the one function that does
 * that; `end()` calls it before anything else, and the mount effect's own
 * cleanup calls it again on unmount regardless of how the exit happened —
 * both calls are safe because releasing an already-released tree is a no-op.
 *
 * ## The sky, not a cover
 *
 * `SkyLayer` is `pointer-events-none` and only ever draws over the canopy
 * (the same 300×200 box the old silhouette used) — never a `bg-ground`
 * backdrop, because there is no longer anything underneath it that needs
 * covering. The stage `<div>` itself is what catches clicks-to-advance, and
 * it is sized to the *whole* drawing wrapper (`inset-0`, matching
 * `KnowledgeTree.tsx`'s relative box around `<DrawnTree>`), not just the sky
 * slice — a click anywhere the real, growing tree is still visible still
 * advances the story, the same "click the stage" contract as before. That
 * wrapper exists only while this component is mounted, so the instant the
 * story ends and `WatchOrigin.tsx` swaps this player back out for its
 * button, the tree underneath is exactly as interactive as it always was.
 *
 * The scroll-away observer, though, does *not* watch that full-height click
 * target: the drawing wrapper runs 2000px+ tall once every branch panel is
 * stacked under it, and a visitor who has scrolled past the canopy but is
 * still somewhere inside that column would otherwise keep watching a
 * blanked, pending tree for the rest of the run. It watches `skySlice`
 * instead — so the story ends the moment the part a visitor is actually
 * looking at leaves the viewport — except while a root beat has panned the
 * page away from `skySlice` on purpose; see "The camera, during the root
 * years" below for why the observer stands down for exactly that stretch.
 *
 * ## The camera, during the root years
 *
 * Root-year beats (`beat.season.year < firstCanopyYear()`) release a
 * `RootSystem` lateral that lives well below the canopy — under the ground
 * plinth, often a full screen or more further down the page than the sky
 * slice this stage is pinned to. Releasing it there without moving the
 * viewport would mean growth nobody is looking at, so the pan effect below
 * walks the page to `[data-root-system]` (`scrollIntoView({ behavior: "auto",
 * block: "center" })`) the instant a beat's region flips from sky to root,
 * and back to `skySlice` the instant it flips back at the first canopy-year
 * beat. Both are one-way, computed straight from `beat` at render time
 * (`isRootBeat` below) — years only increase across a run, so a real show
 * pans at most twice: down once, back up once.
 *
 * `behavior: "auto"` (an instant jump), not `"smooth"`: a cinematic pan was
 * the original idea, and it is not what ships, because it is what made this
 * whole feature unreliable to click through. A multi-second smooth scroll
 * leaves `[data-origin-stage]`'s own bounding box moving for that entire
 * stretch, and every automation or assistive-tech interaction that needs to
 * check "is this element stable/in view" has to wait the animation out
 * first — during which a real Playwright run of `origin.spec.ts`, clicking
 * through every beat, sat retrying for seconds at a time, occasionally long
 * enough that the click-catcher and `z-[60]` boost below (both keyed to the
 * beat, not the scroll) had already lapsed by the time a retry finally
 * landed. Measured directly: the same repeated run that flaked roughly one
 * time in five under `"smooth"` passed 20/20 and 45/45 at `"auto"`, several
 * seconds faster each time. The visual cost is real — no eased glide, the
 * canopy and the roots simply swap — but it is a single jump-cut in an
 * 8-to-20-second run, not the sort of motion `prefers-reduced-motion`
 * itself exists to guard (that preference already turns off this whole pan,
 * and everything else in the file, in favour of the static `Storyboard`).
 *
 * The one rule this can never break is the same one the conductor itself
 * answers to: a pan is not a "the visitor scrolled away" event. The
 * scroll-away observer above is disconnected for the duration of *every*
 * conducted pan, both directions — but only the pan back up re-arms it
 * afterwards, once a second, one-shot `IntersectionObserver` on `skySlice`
 * itself *confirms* it is actually back on screen (a 3s timeout is the only
 * fallback, for whatever cannot see that confirmation at all — see the pan
 * effect for why a guessed duration alone was not reliable enough here). The
 * pan down to the roots does not re-arm anything:
 * `skySlice` is exactly the box that pan just walked away from on purpose,
 * so watching it the instant the scroll settles would find it already out
 * of view and end the show on the very beat meant to grow the roots.
 * Scrolling is simply unpoliced for as long as a root beat is playing —
 * Escape and the per-beat timer both still work regardless of scroll
 * position — and resumes the moment the canopy is back. A *later*, genuine
 * scroll away from `skySlice`, once re-armed, still ends the show exactly
 * as before.
 *
 * That alone is not the whole fix, though — the *other* half of this same
 * hazard has nothing to do with the observer. The click-to-advance surface
 * (the outer `<div>` below, `inset-0` in *document* coordinates) still sits
 * at the canopy throughout a root beat, same as `skySlice`. Advancing by
 * click during one therefore means clicking something currently off-screen,
 * which forces whatever dispatches the click to scroll the page back up
 * first — fighting the pan that just ran, and often landing the click point
 * squarely under the sticky header, which then swallows it (a header
 * pinned at the very top of the viewport is exactly where "scroll an
 * above-the-fold element back into view" tends to land a point). This is
 * not hypothetical: a real Playwright run of `origin.spec.ts` clicking
 * `[data-origin-stage]` through every beat hit exactly this, reliably
 * enough to be the flakiest thing in this file during development, and it
 * took four attempts to actually close. `scroll-mt-[var(--header-h)]` on
 * the stage `<div>` itself (below) is honest CSS — the browser's own
 * scroll-into-view algorithm really does respect `scroll-margin-top` — but
 * did nothing for the flake: Playwright's own corrective scroll for an
 * actionability check does not appear to consult it, so the click point it
 * computes can still land under the header regardless. Outranking the
 * header with a plain `z-[60]` on a *descendant* click-catcher did nothing
 * either, for a reason that cost real time to track down: the stage
 * `<div>` itself is `position: absolute` with its own explicit `z-index`,
 * which is exactly what creates a stacking context — every descendant's own
 * z-index is compared *inside* that context only, capped at whatever the
 * stage's own number is, no matter how high a child's climbs. Bumping the
 * stage `<div>`'s *own* z-index to `z-[60]` while `awayFromCanopy` (below)
 * — the same number `SkipLink.tsx` uses to outrank this same header, and
 * for the same reason: nothing lower ever wins that fight against a `z-50`
 * sticky element — fixed *that* trap, so the whole stage, catcher included,
 * escapes it as one unit instead of fighting from inside. It also was not
 * the whole story: with the trap gone, the flake dropped but did not
 * disappear, and the actual remaining cause turned out to be `behavior:
 * "smooth"` itself — see the pan effect's own comment on why this scrolls
 * with `"auto"` instead. The trade the `z-[60]` boost still costs is real,
 * if brief: the header (and anything else under it) stops being clickable
 * through the stage for as long as a root beat or its pan is in flight, in
 * exchange for a click reliably advancing the story instead of a coin flip
 * between that and silently ending the whole show. `scroll-mt-
 * [var(--header-h)]` stays anyway — it costs nothing, and is simply correct
 * for any future caller that scrolls this element with an API that *does*
 * honour it.
 *
 * `prefers-reduced-motion` already keeps this whole effect from ever running
 * — the Storyboard branch below has no `skySlice`, no `[data-root-system]`
 * pan, and nothing here reads `beat` until then — but the pan effect guards
 * on `reduced` directly too, the same belt-and-braces the CSS media query
 * above the ink classes already keeps.
 *
 * ## Narration, in two forms
 *
 * The accessible narration is the `role="status"` region — `sr-only` now,
 * since the *visible* narration is a job the cats do (Task 3) or, when they
 * are not roaming, a bare floating annotation does instead. `catsNarrating`
 * tracks which: it flips true whenever `origin-story-ack` answers with
 * `detail: "start"` (`Companion.tsx` dispatches it from the same `"start"`
 * handler that arms its watch) and false again if the companion later
 * answers `detail: "stop"` — the watch dropping mid-show without the run
 * itself ending — so the annotation resumes instead of leaving the story
 * fully dark for whatever remains of it. The annotation renders only while
 * `catsNarrating` is false. It normally lives inside `skySlice`, near the
 * horizon `GroundLine` draws at y=150 of that box's own 300×200 coordinate
 * space — "near the ground line" the spec asks for is the sky's own ground,
 * not the real tree's, which is often thousands of pixels further down the
 * page — except while `awayFromCanopy` (a root beat's pan is running or its
 * dwell still stands), when `skySlice` is exactly the box the pan above has
 * scrolled away from. `FloatingAnnotation`'s `pinned` prop (that same
 * `awayFromCanopy`) swaps its position from `absolute` inside `skySlice` to
 * `fixed` against the viewport for exactly that stretch, so the caption
 * stays legible wherever the page has panned to rather than scrolling off
 * with the sky. `SkyLayer` itself is not similarly relocated — moving the
 * whole box would fight the pan itself — but it no longer needs to be: a
 * design-polish pass moved the weather (and the year numeral that used to
 * ride inside it) out of that box entirely, into `WeatherLayer`, a
 * `position: fixed` overlay that reads at both camera positions on its own
 * terms. See that component's own doc comment for why, and why the sky slice
 * keeps only the bird and the seed, which have nowhere else that makes sense
 * to live.
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
 * The one geographic fact the player is allowed to name, composed rather
 * than typed a second time. `origin.from` carries the city
 * ("Rạch Giá, Việt Nam"); this renders only the segment after the last
 * ", " — the country — matching the exact ban `tests/lib/origin-story.test.ts`
 * already holds every `Season.caption` to.
 */
function countryOf(place: string): string {
  const parts = place.split(", ");
  return parts[parts.length - 1] ?? place;
}

function flightCaption(): string {
  return `${countryOf(origin.from)} → ${origin.to} · ${origin.arrived}`;
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
 * at once reads as a cut, not a growth. `tier` is what `releaseThroughYear`
 * below sorts a year's newly-releasing groups by before staggering them:
 * trunk/ground-break first (0), then branch/lens and the underground's own
 * major roots (1, the canopy's and the root system's structural peers), then
 * leaves (2) — big, slow things settle before the small, quick things hung
 * off them do. Read straight off each element's own `data-origin-tier` in
 * `DrawnTree.tsx` rather than inferred here, the same "author the fact where
 * the element already lives" discipline the rest of this file's DOM contract
 * follows; a group with no tier at all (there should never be one) defaults
 * to the branch tier rather than either extreme.
 */
const TIER_TRUNK = 0;
const TIER_BRANCH = 1;
const TIER_LEAF = 2;

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

/** How long a stagger step waits before the next group in the same release
 *  starts its own transition — small enough that a year with a dozen leaves
 *  still finishes well inside one season beat's `SEASON_MS`, large enough to
 *  actually read as a sequence rather than a shimmer. */
const STAGGER_STEP_MS = 120;
/** The trunk's own hero rise: roughly double the ordinary `--dur-draw` a
 *  bough or a leaf's mark draws with — the one moment this drawing is asked
 *  to slow down for, not speed past. */
const TRUNK_RISE_MS = 1200;
/** A leaf pops faster than the branch it hangs off — "small things move
 *  quick, big things move slow" — well under `--dur-draw` (600ms). */
const LEAF_POP_MS = 300;
/** Neither `TRUNK_RISE_MS` nor `LEAF_POP_MS` — the ordinary `--dur-draw` a
 *  branch/lens group's own ink class already transitions with in
 *  globals.css. This file has no access to that CSS custom property's
 *  numeric value (nothing here needs the *exact* figure, only something safe
 *  to size a cleanup timeout against), so this is a same-order stand-in. */
const ORDINARY_DUR_MS = 600;
/** How long past a group's own delay+duration this file waits before wiping
 *  its inline stagger back off — comfortably past when the transition it
 *  timed has actually finished, so the reset in `scheduleStaggerCleanup`
 *  never lands mid-animation. */
const STAGGER_CLEANUP_MARGIN_MS = 800;

/** One group this release just staggered, and how long from *now* until it
 *  is safe to wipe that stagger back off — see `scheduleStaggerCleanup`. */
interface ScheduledStagger {
  readonly el: HTMLElement;
  readonly clearAfterMs: number;
}

/**
 * Releases every non-shoot group at or before `year`, in an order and a
 * timing meant to read as growth rather than a swap: trunk/ground-break
 * groups first, then branch/lens (canopy boughs and the root system's own
 * major laterals share this tier), then leaves — see `tierOf`'s doc comment
 * — each one's `transitionDelay` staggered `STAGGER_STEP_MS` past the one
 * before it. The trunk's own group additionally gets `TRUNK_RISE_MS` (the
 * hero moment "start from the ground" asks for) and every leaf gets the
 * faster `LEAF_POP_MS` — everything else keeps the ordinary `--dur-draw`/
 * `--dur-settle` its own ink class already declares in globals.css.
 *
 * Only groups still actually pending are sorted and staggered — a group
 * already released earlier this run is left alone rather than re-staggered
 * for no visible reason, and (since this can run more than once per beat via
 * the "still" beat's own safety sweep through `Infinity`) never twice. That
 * "leave everything else alone" rule is not just tidiness: an earlier
 * version of this function cleared every group's inline stagger *before*
 * setting fresh ones, on every beat, on the theory that "clear on the next
 * release" was as valid as a self-clearing timeout. It measurably was not —
 * touching `transitionDelay`/`transitionDuration` on a group that was not
 * changing state at all (a `data-tree-shoot-label` two years from its own
 * release, say) was enough to re-open its already-finished fade-out
 * transition for a further couple hundred milliseconds, which is exactly the
 * "chrome still fading, not yet hidden" bug this design-polish pass exists
 * to close, not reopen. Returns what it staggered rather than scheduling the
 * cleanup itself — it has no timer and no ref to hold one, both of which the
 * caller already has.
 *
 * `year <= year` is false for every comparison once `year` is `NaN` (a
 * malformed `data-origin-year`, which should never happen but would
 * otherwise leave that one group pending for the entire run rather than
 * merely for the beat it can no longer honestly claim), so a non-finite
 * year is treated as "always due" instead.
 */
function releaseThroughYear(groups: readonly OriginGroup[], year: number): readonly ScheduledStagger[] {
  const due = groups.filter(
    (group) =>
      !group.isShoot &&
      group.el.hasAttribute("data-origin-pending") &&
      (!Number.isFinite(group.year) || group.year <= year),
  );
  // A stable sort — the only kind `Array.prototype.sort` has been since
  // ES2019 — keeps each tier's own groups in the document order they were
  // already queried in, so "trunk, then branch, then leaf" is the only new
  // ordering this introduces, not a second, silent reshuffle within a tier.
  const ordered = [...due].sort((a, b) => a.tier - b.tier);
  return ordered.map((group, index) => {
    const delayMs = index * STAGGER_STEP_MS;
    let durationMs = ORDINARY_DUR_MS;
    group.el.style.transitionDelay = `${delayMs}ms`;
    if (group.isTrunk) {
      durationMs = TRUNK_RISE_MS;
      group.el.style.transitionDuration = `${durationMs}ms`;
    } else if (group.tier === TIER_LEAF) {
      durationMs = LEAF_POP_MS;
      group.el.style.transitionDuration = `${durationMs}ms`;
    }
    group.el.removeAttribute("data-origin-pending");
    return { el: group.el, clearAfterMs: delayMs + durationMs + STAGGER_CLEANUP_MARGIN_MS };
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
 *  seven denser strokes plus one bent stroke. quiet has no glyph at all — a
 *  bare sky is the honest picture of a year with nothing on record. */
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
 *  never a cover. Sized to fill whatever box its caller (the `skySlice`
 *  wrapper below) already gives it — that wrapper is what carries the actual
 *  position/aspect-ratio/observer duties now, so this stays a plain, fully-
 *  filling `<svg>`. */
function SkyLayer({ beat }: { readonly beat: Beat }) {
  return (
    <svg
      {...strokeProps}
      viewBox={VIEW_BOX}
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
/* The weather layer — stage-wide, viewport-anchored (design-polish pass)     */
/*                                                                            */
/* A season's weather used to be `WeatherGlyph` above: a small icon in the   */
/* same 300×200 sky slice the bird and the seed draw in, pinned over the      */
/* canopy. That box is exactly what a root beat's own camera pan (see the     */
/* file banner, "The camera, during the root years") scrolls away from for as */
/* long as the roots are what the story is showing — so for every quiet year  */
/* before the canopy exists, the weather simply never appeared at all. The    */
/* owner's brief for this pass was blunt about it: "make raining, sunny,      */
/* windy more showing". `WeatherLayer` is the fix — `position: fixed`, so it   */
/* reads at both camera positions this story ever holds, not only the one the */
/* old glyph happened to share a box with.                                    */
/* -------------------------------------------------------------------------- */

/** How many rain strokes an ordinary rain year draws — a storm year draws     */
const RAIN_STROKE_COUNT = 12;
/** more than this, for "denser" without a second, separate layout. */
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
 * The season's weather, stage-wide: `position: fixed` so the same rain, sun,
 * storm or wind reads over the canopy *and* over the underground the camera
 * pans to for a root year — see the file banner just above. `pointer-events-
 * none`/`aria-hidden` throughout: this is atmosphere, never a click target
 * and never a second narration (the accessible `role="status"` region and
 * the floating annotation already carry the beat's own words).
 *
 * `key={season.year}` remounts a fresh element on every season change, the
 * same one-shot-entry idiom the old `WeatherGlyph` used for its own settle-in
 * — here it is also what restarts `.origin-weather-shudder` on every storm
 * rather than only ever playing it once for the whole run.
 *
 * The year numeral moves here too, top-left — the one fact this whole layer
 * still owes a reader — rather than staying behind in the sky slice's own
 * small box the way it used to: that box is exactly what goes off-screen for
 * a root beat's pan, which was the numeral's own share of the same bug this
 * component exists to fix. Top-*left*, not top-right: the Skip button (`
 * SKIP_BUTTON_CLASS` below) already owns that corner.
 */
function WeatherLayer({ season }: { readonly season: Season }) {
  return (
    <div
      key={season.year}
      aria-hidden="true"
      data-origin-weather={season.kind}
      className={cn(
        "pointer-events-none fixed inset-0 z-30 overflow-hidden text-fg-subtle",
        season.kind === "storm" && "origin-weather-shudder",
      )}
    >
      {season.kind === "rain" ? <RainStrokes dense={false} /> : null}
      {season.kind === "storm" ? (
        <>
          <RainStrokes dense />
          <StormBolts />
        </>
      ) : null}
      {season.kind === "sun" ? <SunGlyph /> : null}
      {season.kind === "quiet" ? <WindStrokes /> : null}
      <span className="eyebrow absolute left-3 top-[calc(var(--header-h)+0.75rem)] text-fg-subtle">
        {season.year}
      </span>
    </div>
  );
}

/** The bare-mono fallback narration: shown whenever the cats are not
 *  narrating — the parent only renders this while `catsNarrating` is still
 *  false. No border, no background — an annotation, not a caption box,
 *  sitting near the ground line the way the figure's own margin notes do.
 *  `aria-hidden` because it duplicates the accessible `role="status"` region
 *  below it; a screen reader should hear the story once, not twice.
 *
 *  `pinned` is true for exactly the beats the conductor pans the page away
 *  from this box's own ancestor (`skySlice`, still positioned `absolute`
 *  inside it) to show the root system instead — see the pan effect below.
 *  Without it the caption would scroll off with the sky slice the moment the
 *  root beats start, leaving nothing readable in the viewport but the roots
 *  themselves. `fixed` has nothing to do with `skySlice`'s own box once set,
 *  so this is the cheap fix: no ancestor between here and `<body>` carries a
 *  `transform`/`filter`/`contain`, so `position: fixed` is relative to the
 *  viewport exactly as plainly as it looks. */
function FloatingAnnotation({ text, pinned }: { readonly text: string; readonly pinned: boolean }) {
  return (
    <p
      aria-hidden="true"
      data-origin-annotation
      className={cn(
        "pointer-events-none z-30 font-mono text-[length:var(--step--1)] leading-snug text-fg-subtle",
        pinned
          ? "fixed inset-x-3 bottom-4 bg-ground/90 px-1"
          : "absolute inset-x-3 bottom-2",
      )}
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
}

/** One frame per distinct `SeasonKind` actually present, in the order each
 *  first appears — not one frame per year, and not a fixed four regardless
 *  of what the real seasons contain. */
function groupByKind(seasons: readonly Season[]): readonly KindGroup[] {
  const order: SeasonKind[] = [];
  const byKind = new Map<SeasonKind, number[]>();
  for (const season of seasons) {
    if (!byKind.has(season.kind)) {
      byKind.set(season.kind, []);
      order.push(season.kind);
    }
    byKind.get(season.kind)?.push(season.year);
  }
  return order.map((kind) => ({ kind, years: byKind.get(kind) ?? [] }));
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

      {groups.map(({ kind, years }) => {
        const d = weatherGlyph(kind);
        return (
          <StoryboardFrame key={kind} caption={`${KIND_LABEL[kind]} — ${years.join(", ")}`}>
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
   * `restoreFocus` is true only when focus was still somewhere inside the
   * stage the instant it ended — true for Escape and Skip (focus starts on
   * Skip and nothing here ever moves it elsewhere), false when the show
   * ended because the visitor scrolled away with focus never touched. The
   * caller (`WatchOrigin.tsx`) uses it to decide whether pulling focus back
   * to the "Watch how it grew" button is a courtesy or a hijack — see the
   * note there on why `focus()` alone was already the wrong call in that
   * second case even before this flag existed.
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

  // Covers just the up-pan's own travel time, from the moment the pan
  // effect below starts walking the page back to `skySlice` until that
  // scroll has actually *settled* there — `awayFromCanopy` below folds this
  // together with `isRootBeat` itself into one "is the canopy actually back
  // on screen yet" signal, since a beat can claim the canopy is back before
  // the page has actually arrived. Set inside a `requestAnimationFrame`
  // callback, not directly in the pan effect's own body — the same
  // "announce a change a frame later" idiom the `announced` effect below
  // already uses, and for the same practical reason here: a bare
  // synchronous `setState` at the top of an effect body is what
  // `react-hooks/set-state-in-effect` flags, since the effect could
  // otherwise just derive the value during render — which is exactly true
  // for the *other* direction (`isRootBeat` alone already covers a root
  // beat itself) but not this one, which only exists because scrolling
  // takes real time after the beat has already changed. Flipped back false
  // from the pan effect's own `rearm` callback once the scroll genuinely
  // settles.
  const [settlingBack, setSettlingBack] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  // The small, top-pinned "sky slice" box `SkyLayer` and the floating
  // annotation render inside — see the file banner on why the scroll-away
  // observer watches this instead of the full-height `containerRef` click
  // target. Unused (stays null) under reduced motion, where the Storyboard
  // branch renders neither and the observer falls back to `containerRef`
  // itself, exactly as it always has.
  const skySliceRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const ended = useRef(false);
  // Captured once, at the setup effect below — read at unmount time via this
  // plain ref rather than `containerRef.current`, which React may already
  // have detached by the time an unrelated cleanup runs.
  const figureRef = useRef<HTMLElement | null>(null);
  const groupsRef = useRef<readonly OriginGroup[]>([]);
  // Every pending `window.setTimeout` id from `scheduleStaggerCleanup` below,
  // so `releaseEverything` can cancel them on any exit — see that callback's
  // own doc comment for why a self-clearing timeout replaced an earlier
  // "clear on the next release" sweep.
  const staggerTimeoutsRef = useRef<number[]>([]);
  // The scroll-away observer's own handle, so the pan effect below can
  // disconnect and re-create it against a new target rather than the fixed
  // one the original, mount-only observer watched — see `armWatch`.
  const observerRef = useRef<IntersectionObserver | null>(null);
  // Which side of the figure the conductor last panned to, so the pan
  // effect only acts on an actual sky<->root *change*, not every beat that
  // happens to fall on the same side of it as the one before.
  const panRegionRef = useRef<"sky" | "root">("sky");

  // Schedules the one self-cleanup `releaseThroughYear` cannot do itself (it
  // has no timer and no ref to hold one) for each group it just staggered —
  // wipes that group's own inline `transitionDelay`/`transitionDuration`
  // back to nothing once `clearAfterMs` has safely passed its transition,
  // never touching any *other* group in the process. See
  // `releaseThroughYear`'s own doc comment for why "only the groups that
  // just changed, on their own clock" replaced an earlier "clear everything,
  // on the next release" approach that measurably reopened already-settled
  // fades elsewhere on the tree.
  const scheduleStaggerCleanup = useCallback((scheduled: readonly ScheduledStagger[]) => {
    for (const { el, clearAfterMs } of scheduled) {
      const id = window.setTimeout(() => {
        el.style.transitionDelay = "";
        el.style.transitionDuration = "";
      }, clearAfterMs);
      staggerTimeoutsRef.current.push(id);
    }
  }, []);

  // The one cleanup every exit path funnels through — see the file banner's
  // note on why this must never leave the tree half-drawn. Idempotent: once
  // a group has lost `data-origin-pending`, removing it again is a no-op,
  // and removing an attribute that is already gone is too.
  const releaseEverything = useCallback(() => {
    staggerTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    staggerTimeoutsRef.current = [];
    const figure = figureRef.current;
    if (!figure) return;
    figure
      .querySelectorAll("[data-origin-pending]")
      .forEach((el) => el.removeAttribute("data-origin-pending"));
    // Wipes the growth-choreography stagger too — queried fresh from the
    // figure rather than read off `groupsRef`, so this stays correct even on
    // an exit that races the conductor's own setup effect. Safe to do in one
    // blanket pass *here*, unlike per-beat: every group's `data-origin-
    // pending` is being stripped in this same call, so any group whose
    // stagger this also clears is already mid-genuinely-changing, not an
    // untouched one having its already-settled transition reopened for no
    // reason — see `releaseThroughYear`'s doc comment on exactly that
    // failure mode. Without this, a Skip/Escape mid-stagger would leave a
    // real, still-mounted tree carrying `transition-delay`/`transition-
    // duration` values a *second* run of this same story would otherwise
    // inherit before ever setting its own.
    figure.querySelectorAll<HTMLElement>("[data-origin-year]").forEach((el) => {
      el.style.transitionDelay = "";
      el.style.transitionDuration = "";
    });
    figure.removeAttribute("data-origin-running");
  }, []);

  const end = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    releaseEverything();
    document.dispatchEvent(new CustomEvent("origin-story", { detail: "end" }));
    // Read *before* `onClose` unmounts this subtree — `document.activeElement`
    // is still whatever it was the instant the show ended, whether that was
    // Escape/Skip (focus on the Skip button, inside `containerRef`) or a
    // scroll-away no keyboard interaction ever touched (focus still wherever
    // it started, outside the stage).
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
    figureRef.current = figure;
    figure.setAttribute("data-origin-running", "");
    const groups = queryGroups(figure);
    groups.forEach((group) => group.el.setAttribute("data-origin-pending", ""));
    groupsRef.current = groups;
    scheduleStaggerCleanup(releaseThroughYear(groups, origin.arrivedYear));
  }, [reduced, scheduleStaggerCleanup]);

  useEffect(() => {
    skipRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") end();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [end]);

  // Scrolling away ends the show exactly like Skip does — nobody wants a
  // caption still narrating a section they scrolled away from. Non-reduced,
  // this watches `skySliceRef` by default — the small, top-pinned box the
  // sky layer and the floating annotation actually live in — rather than
  // `containerRef`, the full-height click-to-advance target: `containerRef`
  // now spans the *whole* drawing wrapper (2000px+ once every branch panel
  // is stacked under it), so watching it meant a visitor who had scrolled
  // well past the canopy but was still somewhere inside that column kept
  // the show — and its live status region — running against a blanked,
  // pending tree they could no longer see any part of. Reduced motion has
  // no sky slice (the Storyboard branch renders neither it nor `SkyLayer`),
  // so it falls back to `containerRef` there, unchanged from before: that
  // box is only ever as tall as the storyboard's own stacked frames, never
  // the whole figure. Self-observing a box this component also unmounts
  // from is safe: `end()` is latch-guarded against firing twice, and the
  // observer disconnects on unmount regardless of which exit fired.
  //
  // `armWatch` is pulled out of the effect body, rather than inlined the
  // way it was before the camera pan existed, because the pan effect below
  // needs to re-create this same observer against a *different* target —
  // `[data-root-system]` instead of `skySlice` — without duplicating the
  // instantiation logic or fighting over which effect owns the ref.
  const armWatch = useCallback(
    (target: Element | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!target || typeof IntersectionObserver === "undefined") return;
      // An `IntersectionObserver` always calls back once, synchronously
      // (well, on the next microtask) after `observe()`, reporting whatever
      // the target's intersection state already was — not a *change*. Right
      // after the pan effect's own settle delay, that first read can still
      // be marginally stale: something else nudging the page a frame or two
      // later (a screen reader's focus-follows-scroll, or — this is what a
      // real run turned up — a test framework's own competing
      // scroll-into-view for an unrelated click) can leave the target just
      // out of view at the exact instant this re-arms. Acting on that first
      // report would end the show on a race, not on a visitor scrolling
      // away; only a genuine transition *after* watching begins is real.
      let first = true;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (first) {
            first = false;
            return;
          }
          if (entry && !entry.isIntersecting) end();
        },
        { threshold: 0 },
      );
      observer.observe(target);
      observerRef.current = observer;
    },
    [end],
  );

  useEffect(() => {
    armWatch(reduced ? containerRef.current : skySliceRef.current);
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [armWatch, reduced]);

  const beat = beats[index];
  const isLast = index >= beats.length - 1;
  // True for exactly the beats `RootSystem`'s own lateral for that year has
  // not grown yet by the time the canopy exists — the same "before the
  // canopy" test `rootYearFor`'s own doc comment describes. Computed at
  // render time, straight from `beat`, rather than tracked in a ref: both
  // the pan effect below and `awayFromCanopy` just under it need it, and a
  // value this cheap is not worth two copies drifting apart.
  const isRootBeat = Boolean(beat.season && beat.season.year < firstCanopyYear());

  // The one signal both the viewport click-catcher and the pinned
  // annotation actually key off: true for a root beat itself, and true a
  // little longer than that while the pan back to the canopy is still
  // travelling. See `settlingBack`'s own declaration for why the two
  // clocks (which beat is playing, versus where the page has actually
  // scrolled to) are not the same thing.
  const awayFromCanopy = isRootBeat || settlingBack;

  // The camera pan (file banner, "The camera, during the root years"): walk
  // the page to `[data-root-system]` the instant a beat's region flips from
  // sky to root, and back to `skySlice` the instant it flips back. A no-op
  // on every other beat, via the `panRegionRef` guard — including both
  // beats before the first root year (flight, seed) and every beat once the
  // canopy exists again, which is the overwhelming majority of a run.
  useEffect(() => {
    if (reduced) return;
    const region = isRootBeat ? "root" : "sky";
    if (region === panRegionRef.current) return;
    panRegionRef.current = region;

    const figure = figureRef.current;
    const target =
      region === "root"
        ? (figure?.querySelector<HTMLElement>("[data-root-system]") ?? null)
        : skySliceRef.current;
    if (!target) return;

    // Disconnect for the duration of the pan itself, both directions — a
    // smooth-scroll this large fires plenty of intermediate intersection
    // changes on whatever the observer was watching before, and none of
    // them are a visitor choosing to leave.
    observerRef.current?.disconnect();
    observerRef.current = null;
    target.scrollIntoView({ behavior: "auto", block: "center" });

    if (region === "root") {
      // `awayFromCanopy` is already true by now — `isRootBeat` alone covers
      // this direction, set during the same render that decided to pan
      // (see its declaration above), so there is no state to arm here. No
      // re-arm either: see the comment below on why the observer stays
      // disconnected for the whole root dwell.
      return;
    }

    // region === "sky": the pan back *up*. Panning down to the roots
    // deliberately walks away from `skySlice` — the one box this observer
    // ever watches — for as long as any root beat plays, so there is no
    // honest "away" for it to watch for until the canopy is what the story
    // is about again: re-arming on `skySlice` the instant the down-pan
    // settles would find it already out of view and end the show on the
    // very beat meant to grow it. A scroll during a root beat is
    // deliberately left unpoliced — a visitor reading past the roots, or
    // (this is what a real run of `origin.spec.ts` hit) a test framework
    // auto-scrolling `[data-origin-stage]` back into view to click it — is
    // not a "leaving the story" signal while the story itself has already
    // moved the camera away from that stage on purpose. Escape and the
    // per-beat timer both still work regardless of scroll position, and
    // the observer's usual job resumes — same moment `awayFromCanopy`
    // flips back to false — once the canopy is actually back on screen,
    // not merely once this beat claims it is.
    //
    // `settlingBack` arms one frame later (see its own declaration on why
    // this is inside a `requestAnimationFrame` callback rather than a bare
    // call here) — the one-frame gap between `isRootBeat` going false and
    // this actually landing is harmless: nothing here is timing-critical to
    // a single frame, and it beats the alternative of `awayFromCanopy`
    // going stale for the *entire* travel time this pan takes.
    const armId = requestAnimationFrame(() => setSettlingBack(true));

    // Confirmed by an `IntersectionObserver` on `target` itself, not a
    // guessed duration: an earlier version used a plain `scrollend`/800ms
    // timer, which flipped `settlingBack` false — dropping the click-catcher
    // and the `z-[60]` boost with it — on its own clock, unrelated to how
    // long an *in-flight* click's own actionability retries were taking.
    // When those retries outlasted the timer (a slow retry loop is exactly
    // what a header collision produces), the catcher vanished mid-retry and
    // the next hit-test landed on bare `<html>` — a second, subtler shape of
    // the same flake the catcher was built to close. Waiting for `skySlice`
    // to actually report itself visible, rather than assuming the scroll is
    // done by then, ties "stop protecting the click" to "provably safe to
    // stop protecting it" instead of a probability.
    let settled = false;
    const confirm =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              if (settled || !entry?.isIntersecting) return;
              settled = true;
              confirm?.disconnect();
              window.clearTimeout(timeoutId);
              armWatch(target);
              setSettlingBack(false);
            },
            { threshold: 0 },
          );
    confirm?.observe(target);
    // Fallback only, for whatever `IntersectionObserver` cannot see (a
    // zero-size box, a browser without it) — long enough that it should
    // never fire ahead of a real confirmation on any ordinary run.
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      confirm?.disconnect();
      armWatch(target);
      setSettlingBack(false);
    }, 3000);

    return () => {
      // Guards a pan superseded by another before it ever settled (a very
      // fast Skip-driven run) — cancel the stale confirmation rather than
      // let it fire after a *later* pan has already armed the observer
      // itself.
      settled = true;
      cancelAnimationFrame(armId);
      confirm?.disconnect();
      window.clearTimeout(timeoutId);
    };
  }, [isRootBeat, reduced, armWatch]);

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

  useEffect(() => {
    if (reduced) return;

    // Every beat's own release, before anything else this beat does: the
    // shoot waits for "still" specifically (see `releaseShoot`'s doc
    // comment); a season beat releases every other group at or before its
    // own year; flight and seed release nothing — there is nothing dated
    // that early for them to honestly reveal. "still" also sweeps every
    // non-shoot group through `Infinity` as a last-beat safety net — belt
    // and braces alongside the season sweep above, so the natural end of a
    // full run is never the one exit path that could leave something
    // stranded pending for `releaseEverything()` to have to clean up instead.
    const groups = groupsRef.current;
    if (beat.kind === "still") {
      scheduleStaggerCleanup(releaseThroughYear(groups, Infinity));
      releaseShoot(groups);
    } else if (beat.season) {
      scheduleStaggerCleanup(releaseThroughYear(groups, beat.season.year));
    }

    document.dispatchEvent(
      new CustomEvent("origin-story-beat", {
        // `sub` is this beat's own caption — the same string `announced`
        // (and, through it, the `role="status"` region and the floating
        // annotation) is about to render. It is not read by Companion.tsx's
        // listener: the cats narrate from their own authored copy
        // (`storyBeatScene` in companion-dialogue.ts, keyed on `kind`/
        // `year` alone), by design — a meow with a typed translation
        // beneath it, not this file's prose read back verbatim. `sub`
        // travels in the payload anyway so the two narrations can be
        // compared or cross-checked without a second event.
        detail: { kind: beat.kind, year: beat.season?.year, sub: beat.caption },
      }),
    );

    const id = window.setTimeout(() => {
      if (isLast) end();
      else setIndex((current) => current + 1);
    }, beat.durationMs);
    return () => window.clearTimeout(id);
  }, [beat, isLast, end, reduced, scheduleStaggerCleanup]);

  const advance = useCallback(() => {
    if (reduced) return;
    if (isLast) end();
    else setIndex((current) => current + 1);
  }, [reduced, isLast, end]);

  const handleSkip = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      end();
    },
    [end],
  );

  // The `awayFromCanopy` click-catcher's own handler, not a bare `advance`
  // — it renders *inside* the outer stage `<div>`, which carries the exact
  // same `onClick={advance}`. A synthetic click bubbles from the catcher up
  // to that ancestor same as any DOM click would, so without
  // `stopPropagation` here every click on the catcher advanced the story
  // *twice* — once from this handler, once again from the stage's own —
  // which is exactly the kind of silent double-advance
  // `origin.spec.ts`'s "chronological growth" test is built to catch (it
  // counts clicks against beats one-for-one). Same idiom `handleSkip`
  // just above already uses for the same reason.
  const handleAwayClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      advance();
    },
    [advance],
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
      //
      // `scroll-mt-[var(--header-h)]`: this element's own box, not a
      // descendant's — a root beat's pan can leave it above the viewport,
      // and anything that later scrolls it back (a keyboard focus jump, or
      // — the real case this fixes — a browser/automation "bring this
      // point into view before clicking it" step) would otherwise land its
      // top edge exactly under the sticky header (`h-16`/`--header-h`,
      // `z-50`), which then swallows the click. `scroll-margin-top` is
      // honoured by the browser's own scroll-into-view algorithm regardless
      // of who calls it, so this needs no JS of its own — see the note
      // further down on why it turned out not to be enough by itself.
      //
      // `z-[60]` while `awayFromCanopy`, not the usual `z-20`: `position:
      // absolute` (or `fixed`) *plus* an explicit `z-index` is what
      // establishes a stacking context, so this element's own z-index is
      // the ceiling every descendant is trapped under, no matter how high
      // *their* z-index climbs — the viewport click-catcher further down
      // learned this the hard way, at `z-[60]` itself and still losing to
      // the header, until this ancestor was the thing actually raised.
      className={cn(
        "absolute scroll-mt-[var(--header-h)]",
        reduced
          ? "inset-x-0 top-0 z-20"
          : cn("inset-0 cursor-pointer", awayFromCanopy ? "z-[60]" : "z-20"),
      )}
    >
      {reduced ? (
        <Storyboard seasons={seasons} />
      ) : (
        <>
          {/* The sky slice: a small, top-pinned box (the same 300×200 area
              the old silhouette stage used) that holds both the sky layer's
              own drawing and the floating annotation, and doubles as the
              scroll-away observer's target — see the file banner and the
              IntersectionObserver effect above for why neither lives on the
              full-height click target this `<div>`'s parent now is. */}
          <div ref={skySliceRef} className="pointer-events-none absolute inset-x-0 top-0 aspect-[3/2]">
            <SkyLayer beat={beat} />
            {!catsNarrating ? <FloatingAnnotation text={announced} pinned={awayFromCanopy} /> : null}
          </div>
          {/* Stage-wide, not scoped to the sky slice above: a root beat's own
              camera pan (see the file banner) walks the page away from that
              box for as long as the roots are what the story shows, and the
              weather is meant to read at both camera positions — see
              `WeatherLayer`'s own doc comment. */}
          {beat.season ? <WeatherLayer season={beat.season} /> : null}
          <p role="status" className="sr-only">
            {announced}
          </p>
          {awayFromCanopy ? (
            // The click-to-advance surface this `<div>` already is sits at
            // the canopy (`inset-0` above, matching the drawing wrapper in
            // *document* coordinates) — exactly where a root beat's own pan
            // has just scrolled away from. Without this, advancing by click
            // while away from the canopy means clicking something currently
            // off-screen, which forces whatever dispatches the click (a
            // real pointer, or — this is what a real Playwright run of
            // `origin.spec.ts` hit — a test framework's own
            // scroll-into-view for it) to scroll the page back up first,
            // fighting the very pan that moved it and, worse, often landing
            // the click point directly under the sticky header, which then
            // swallows it. `fixed inset-0` sidesteps all of that: it covers
            // whatever the *viewport* currently shows, roots included, with
            // no scroll required to reach it — the outer `<div>`'s own
            // `z-[60]` bump (above, same `awayFromCanopy` guard) is what
            // actually clears the header; this element needs no z-index of
            // its own beyond that ancestor's, and deliberately has none, so
            // the Skip button (a later sibling, `z-10`) still paints above
            // it rather than being covered by its own stage's click-catcher.
            // Keyed on `awayFromCanopy` rather than `isRootBeat` directly so
            // it stays mounted through the up-pan's own travel time too, not
            // just up to the instant the beat that triggered it claims the
            // canopy back — see that state's own declaration for why the
            // two are not the same moment. `handleAwayClick` (not a bare
            // `advance`) stops this click from also bubbling into the outer
            // `<div>`'s own identical `onClick` and firing twice.
            // `aria-hidden` because it adds no new control either way — it
            // is the same `advance` click the outer `<div>` already exposes
            // under one accessible name, just extended to reach wherever
            // the camera put things.
            <div aria-hidden="true" onClick={handleAwayClick} className="fixed inset-0 cursor-pointer" />
          ) : null}
        </>
      )}

      <button type="button" ref={skipRef} onClick={handleSkip} className={SKIP_BUTTON_CLASS}>
        Skip
      </button>
    </div>
  );
}
