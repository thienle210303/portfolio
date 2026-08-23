"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { origin } from "@/content/portfolio";
import { cn } from "@/lib/cn";
import { growthStage, seasonsFor, type Season, type SeasonKind } from "@/lib/origin-story";

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
 * ## Narration, in two forms
 *
 * The accessible narration is the `role="status"` region — `sr-only` now,
 * since the *visible* narration is a job the cats do (Task 3) or, when they
 * are not roaming, a bare floating annotation does instead. This file always
 * renders that fallback annotation for now: the ack it would hide behind
 * (`origin-story-ack`, dispatched by the companion once it accepts the
 * watch) has no dispatcher yet. The listener is wired up regardless, so
 * Task 3 turning it on requires no change here.
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

interface OriginGroup {
  readonly el: HTMLElement;
  readonly year: number;
  /** The one group the generic "release through year Y" sweep must never
   *  touch — see the file banner on why the shoot waits for its own beat. */
  readonly isShoot: boolean;
}

function queryGroups(figure: HTMLElement): readonly OriginGroup[] {
  return Array.from(figure.querySelectorAll<HTMLElement>("[data-origin-year]")).map((el) => ({
    el,
    year: Number(el.getAttribute("data-origin-year")),
    isShoot: el.hasAttribute("data-tree-shoot"),
  }));
}

function releaseThroughYear(groups: readonly OriginGroup[], year: number): void {
  for (const group of groups) {
    if (!group.isShoot && group.year <= year) group.el.removeAttribute("data-origin-pending");
  }
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

function WeatherGlyph({ season }: { readonly season: Season }) {
  const d = weatherGlyph(season.kind);
  return (
    // Two `<g>`s, not one: a CSS `transform` (the `.origin-glyph` fade-in
    // animation applies one) replaces an SVG `transform` *attribute*
    // outright rather than composing with it — set both on the same element
    // and the attribute's `translate(240 48)` is simply discarded the moment
    // the animation's own `transform: translateY(...)` takes over. The
    // position lives on the outer, unanimated `<g>`; the animation lives on
    // the inner one, which has no attribute-transform of its own to lose.
    <g key={season.year} transform="translate(240 48)">
      <g className="origin-glyph">
        {d ? <path d={d} /> : null}
        <text x={-8} y={44} fontSize={10} fill="currentColor" stroke="none">
          {season.year}
        </text>
      </g>
    </g>
  );
}

/** The transparent sky: a bird tracing its flight (flight beat), a seed
 *  landing (seed beat), or a season's weather and year — nothing at all
 *  during "still", where the real tree's own shoot is the entire story.
 *  `pointer-events-none` throughout: this layer is decoration drawn *over*
 *  the canopy, never a click target and never a cover. */
function SkyLayer({ beat }: { readonly beat: Beat }) {
  return (
    <svg
      {...strokeProps}
      viewBox={VIEW_BOX}
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-x-0 top-0 aspect-[3/2] text-fg-subtle"
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
      {beat.season ? <WeatherGlyph season={beat.season} /> : null}
    </svg>
  );
}

/** The bare-mono fallback narration: shown whenever the cats are not
 *  narrating (always, until Task 3 wires the ack that hides it). No border,
 *  no background — an annotation, not a caption box, sitting near the
 *  ground line the way the figure's own margin notes do. `aria-hidden`
 *  because it duplicates the accessible `role="status"` region below it;
 *  a screen reader should hear the story once, not twice. */
function FloatingAnnotation({ text }: { readonly text: string }) {
  return (
    <p
      aria-hidden="true"
      data-origin-annotation
      className="pointer-events-none absolute inset-x-3 bottom-2 font-mono text-[length:var(--step--1)] leading-snug text-fg-subtle"
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
  // Flips true the moment the companion answers `origin-story-ack` (Task 3).
  // Never flips back — a watch that was accepted stays accepted for the rest
  // of this run, so the fallback annotation cannot flicker on if the
  // companion's own state changes mid-story for an unrelated reason.
  const [catsNarrating, setCatsNarrating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const ended = useRef(false);
  // Captured once, at the setup effect below — read at unmount time via this
  // plain ref rather than `containerRef.current`, which React may already
  // have detached by the time an unrelated cleanup runs.
  const figureRef = useRef<HTMLElement | null>(null);
  const groupsRef = useRef<readonly OriginGroup[]>([]);

  // The one cleanup every exit path funnels through — see the file banner's
  // note on why this must never leave the tree half-drawn. Idempotent: once
  // a group has lost `data-origin-pending`, removing it again is a no-op,
  // and removing an attribute that is already gone is too.
  const releaseEverything = useCallback(() => {
    const figure = figureRef.current;
    if (!figure) return;
    figure
      .querySelectorAll("[data-origin-pending]")
      .forEach((el) => el.removeAttribute("data-origin-pending"));
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
    // attached first to hear it.
    const onAck = () => setCatsNarrating(true);
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
    releaseThroughYear(groups, origin.arrivedYear);
  }, [reduced]);

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
  // caption still narrating a section they scrolled away from. Observes the
  // *stage itself* (`containerRef`), not `closest("[data-tree-figure]")`: the
  // figure runs 2000px+ tall once every branch panel is stacked under it, so
  // watching the figure meant the show — and its live status region — kept
  // running for thousands of scrolled pixels after the stage (a box exactly
  // as tall as the figure's own drawing wrapper, pinned to its top) had long
  // since left the viewport. Self-observing a box this component also
  // unmounts from is safe: `end()` is latch-guarded against firing twice, and
  // the observer disconnects in this same effect's cleanup on unmount
  // regardless of which exit fired.
  useEffect(() => {
    const stage = containerRef.current;
    if (!stage || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && !entry.isIntersecting) end();
      },
      { threshold: 0 },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, [end]);

  const beat = beats[index];
  const isLast = index >= beats.length - 1;

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
    // that early for them to honestly reveal.
    const groups = groupsRef.current;
    if (beat.kind === "still") releaseShoot(groups);
    else if (beat.season) releaseThroughYear(groups, beat.season.year);

    document.dispatchEvent(
      new CustomEvent("origin-story-beat", {
        detail: { kind: beat.kind, year: beat.season?.year, sub: beat.caption },
      }),
    );

    const id = window.setTimeout(() => {
      if (isLast) end();
      else setIndex((current) => current + 1);
    }, beat.durationMs);
    return () => window.clearTimeout(id);
  }, [beat, isLast, end, reduced]);

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
      className={cn("absolute z-20", reduced ? "inset-x-0 top-0" : "inset-0 cursor-pointer")}
    >
      {reduced ? (
        <Storyboard seasons={seasons} />
      ) : (
        <>
          <SkyLayer beat={beat} />
          {!catsNarrating ? <FloatingAnnotation text={announced} /> : null}
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
