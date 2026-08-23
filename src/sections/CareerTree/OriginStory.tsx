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
 * A beat is `{ id, kind, caption, durationMs, season? }` — one authored or
 * derived moment, played in order: the flight (3s), the seed (2.5s), one per
 * `Season` from `seasonsFor()` (2s each), the reveal (2s) and "still
 * growing" (2.5s). `setTimeout` auto-advances; a click anywhere on the stage
 * advances immediately, the same "click moves things along" idiom the
 * companion's duet already uses. Escape, the Skip button, or the figure
 * scrolling out of view all end the show the same way.
 *
 * The overlay is deliberately not the *whole* `[data-tree-figure]` box —
 * only the wrapper `KnowledgeTree.tsx` puts around the drawing itself
 * (canopy, trunk, ground hatch). The root panel, the root system and the
 * list presentation sit below it, visible the entire time: the story plays
 * over the sky and the canopy, which is where a bird, a seed and a growing
 * silhouette actually belong, and the ground the tree already stands in
 * never has to disappear to make room for it. The reveal step still walks up
 * to the real `[data-tree-figure]` (via `closest`) to retrigger the whole
 * figure's ink draw-in — that part *is* figure-wide, on purpose: the payoff
 * is the entire tree redrawing itself, not just the slice the overlay sat on.
 *
 * Two independent things fade during the reveal, not one. The backdrop (a
 * `bg-ground` rect plus the SVG) carries `.origin-fade`, which is what
 * dissolves to let the real, re-inking tree show through underneath. The
 * caption and the Skip control each sit in their own opaque `bg-surface`
 * strip and never fade — a "…and still growing." announcement that faded
 * into illegibility right when it mattered most would be a worse ending
 * than the one this feature is trying to give the tree.
 */

type BeatKind = "flight" | "seed" | "season" | "reveal" | "stillGrowing";

interface Beat {
  readonly id: string;
  readonly kind: BeatKind;
  readonly caption: string;
  readonly durationMs: number;
  readonly season?: Season;
}

const FLIGHT_MS = 3000;
const SEED_MS = 2500;
const SEASON_MS = 2000;
const REVEAL_MS = 2000;
const STILL_GROWING_MS = 2500;

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
    kind: "season",
    caption: season.caption,
    durationMs: SEASON_MS,
    season,
  }));

  return [
    { id: "flight", kind: "flight", caption: flightCaption(), durationMs: FLIGHT_MS },
    { id: "seed", kind: "seed", caption: "A seed, carried the whole way.", durationMs: SEED_MS },
    ...seasonBeats,
    {
      id: "reveal",
      kind: "reveal",
      caption: "The tree, as it stands today.",
      durationMs: REVEAL_MS,
    },
    {
      id: "stillGrowing",
      kind: "stillGrowing",
      caption: "…and still growing.",
      durationMs: STILL_GROWING_MS,
    },
  ];
}

/** 0 before the seed lands, `growthStage(year)` through the seasons, 1 once
 *  the reveal begins — the silhouette never has to un-grow. */
function growthFor(beat: Beat): number {
  if (beat.kind === "season" && beat.season) return growthStage(beat.season.year);
  if (beat.kind === "reveal" || beat.kind === "stillGrowing") return 1;
  return 0;
}

function originDur(ms: number): CSSProperties {
  return { "--origin-dur": `${ms}ms` } as CSSProperties;
}

/* -------------------------------------------------------------------------- */
/* The drawing                                                                */
/* -------------------------------------------------------------------------- */

/** Shared viewBox for every frame the player draws, animated or static: sky
 *  above y=80 (the upper 40% of 200), ground at y=150. */
const VIEW_BOX = "0 0 300 200";
const GROUND_Y = 150;

/** A bird as four strokes — a shallow double chevron, the plainest shape
 *  that still reads as wings mid-flap. */
const BIRD_D = "M-8 3L-2 0M-2 0L0 2M0 2L2 0M2 0L8 3";
/** The arc the bird follows, drawn dashed behind it — same curve the
 *  `origin-flight` keyframes below approximate with translate steps. */
const FLIGHT_PATH_D = "M20 112C80 20 220 20 280 100";

const SEED_TRAIL_D = "M150 32C149 56 150 82 150 108";
const MOUND_D = "M136 150C142 144 158 144 164 150";

/** A trunk and four limbs, one path: `pathLength={1}` makes its
 *  `stroke-dashoffset` a plain 0..1 fraction regardless of the real path
 *  length, the same trick every growth-drawn path in `DrawnTree.tsx` uses. */
const SILHOUETTE_D =
  "M150 150C150 130 148 110 150 92C151 78 149 64 150 50" +
  "M150 118C138 108 128 100 116 96" +
  "M150 96C162 88 172 82 182 78" +
  "M150 74C140 66 132 60 122 56" +
  "M150 60C158 54 166 50 174 46";

/** The unfinished shoot the "still growing" beat adds above the silhouette's
 *  own tip — thinner, open-ended, the same idea as `DrawnTree.tsx`'s
 *  `GrowingTip`, drawn small enough for this stage rather than shared code. */
const SHOOT_D = "M150 50C152 42 146 34 156 26";

/** sun: six rays and a small disc. rain: five falling hatch strokes. storm:
 *  seven denser strokes plus one bent stroke. quiet has no glyph at all — a
 *  bare horizon is the honest picture of a year with nothing on record. */
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
  return <line x1={0} y1={GROUND_Y} x2={300} y2={GROUND_Y} stroke="currentColor" strokeWidth={1} />;
}

function Silhouette({ growth }: { readonly growth: number }) {
  return (
    <path
      d={SILHOUETTE_D}
      pathLength={1}
      className="origin-silhouette"
      style={{ strokeDasharray: 1, strokeDashoffset: 1 - growth }}
    />
  );
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
    // the animation's own `transform: translateY(...)` takes over, which is
    // exactly what happened here until this split. The position lives on
    // the outer, unanimated `<g>`; the animation lives on the inner one,
    // which has no attribute-transform of its own to lose.
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

function ShootGlyph() {
  return (
    <g className="origin-glyph">
      <path d={SHOOT_D} strokeWidth={0.75} />
    </g>
  );
}

/** The animated stage: the moving picture, plus its live caption. Everything
 *  inside `.origin-fade` is decoration (`aria-hidden`) — the caption below
 *  it is the one piece of real text a screen reader hears. */
function AnimatedStage({ beat }: { readonly beat: Beat }) {
  const growth = growthFor(beat);
  const isSettling = beat.kind === "reveal" || beat.kind === "stillGrowing";
  const showSeedOnward = beat.kind !== "flight";

  // Mounted empty and filled a frame later — the same mount-empty-then-fill
  // discipline `TourHud.tsx`'s `role="status"` region uses, for the same
  // reason. Rendering beat 1's caption straight into the region on its first
  // paint would mean the region never actually *changes*: a `role="status"`
  // a screen reader has never seen before is one it may not announce with
  // content already inside it. A `requestAnimationFrame` after mount/update
  // guarantees at least one paint with the old (or, for beat 1, empty) text
  // still in place before the real caption lands, so every beat — the first
  // one included — is heard as a change.
  const [announced, setAnnounced] = useState("");
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnnounced(beat.caption));
    return () => cancelAnimationFrame(id);
  }, [beat]);

  return (
    <>
      <div
        aria-hidden="true"
        className={cn("origin-fade absolute inset-0 bg-ground", isSettling && "is-settling")}
      >
        <svg
          {...strokeProps}
          viewBox={VIEW_BOX}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full text-fg-subtle"
        >
          <GroundLine />

          {beat.kind === "flight" ? (
            <g>
              <path d={FLIGHT_PATH_D} pathLength={1} className="origin-flight-path" style={originDur(FLIGHT_MS)} />
              <g className="origin-bird" style={originDur(FLIGHT_MS)}>
                <path d={BIRD_D} />
              </g>
            </g>
          ) : null}

          {showSeedOnward ? <SeedGlyph /> : null}
          {showSeedOnward ? <Silhouette growth={growth} /> : null}
          {beat.kind === "season" && beat.season ? <WeatherGlyph season={beat.season} /> : null}
          {beat.kind === "stillGrowing" ? <ShootGlyph /> : null}
        </svg>
      </div>

      <p
        role="status"
        className="absolute inset-x-3 bottom-3 border border-rule bg-surface px-3 py-2 text-[length:var(--step--1)] leading-snug text-fg"
      >
        {announced}
      </p>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Storyboard — the reduced-motion fallback                                  */
/* -------------------------------------------------------------------------- */

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

  const containerRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const ended = useRef(false);
  const revealed = useRef(false);

  const end = useCallback(() => {
    if (ended.current) return;
    ended.current = true;
    document.dispatchEvent(new CustomEvent("origin-story", { detail: "end" }));
    // Read *before* `onClose` unmounts this subtree — `document.activeElement`
    // is still whatever it was the instant the show ended, whether that was
    // Escape/Skip (focus on the Skip button, inside `containerRef`) or a
    // scroll-away no keyboard interaction ever touched (focus still wherever
    // it started, outside the stage).
    const restoreFocus = containerRef.current?.contains(document.activeElement) ?? false;
    onClose(restoreFocus);
  }, [onClose]);

  useEffect(() => {
    // Reset on every real run of this effect, not just at the top of the
    // module — development's Strict Mode runs mount effects twice (mount,
    // clean up, mount again) to surface exactly this class of bug. Without
    // the reset, the synthetic first cleanup below would latch `ended.current`
    // to `true` for good, and every *real* `end()` afterwards — Escape, Skip,
    // the last beat's own timeout — would silently no-op against a guard that
    // had already fired for a mount nobody asked to close.
    ended.current = false;
    document.dispatchEvent(new CustomEvent("origin-story", { detail: "start" }));
    return () => {
      // Covers the exits `end()` never sees directly — a parent unmounting
      // this component some other way. `ended` guarantees the pair fires
      // exactly once per *real* mount, Strict Mode's rehearsal included.
      if (!ended.current) {
        ended.current = true;
        document.dispatchEvent(new CustomEvent("origin-story", { detail: "end" }));
      }
    };
  }, []);

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
  // running for thousands of scrolled pixels after the stage (a much smaller
  // box pinned to the figure's own top) had long since left the viewport.
  // Self-observing a box this component also unmounts from is safe: `end()`
  // is latch-guarded against firing twice, and the observer disconnects in
  // this same effect's cleanup on unmount regardless of which exit fired.
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

  useEffect(() => {
    if (reduced) return;

    if (beat.kind === "reveal" && !revealed.current) {
      revealed.current = true;
      // The exact re-trigger the "Career tree figure" CSS block is built to
      // replay: drop `data-inked`, then restore it a frame later so the
      // browser sees a genuine change rather than a no-op. Guarded on
      // `data-ink-ready` per that block's own contract — without it (reduced
      // motion or no observer) the attribute dance does nothing, and this
      // beat never runs there anyway (see the storyboard branch below).
      const figure = containerRef.current?.closest<HTMLElement>("[data-tree-figure]");
      if (figure && document.documentElement.hasAttribute("data-ink-ready")) {
        figure.removeAttribute("data-inked");
        requestAnimationFrame(() => figure.setAttribute("data-inked", ""));
      }
    }

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
      // `aspect-[3/2]` (the same 300:200 ratio the SVG viewBoxes use), not
      // `inset-0`, for the *animated* stage only: the drawing wrapper this
      // mounts inside is the *whole* canopy-to-trunk-foot column, which runs
      // well past 2000px tall once every branch panel is stacked under it. A
      // story sized to that full height would centre a 3:2 picture inside a
      // mostly-empty column, invisible without scrolling. Pinned to the top
      // and sized off the wrapper's own width instead, the stage lands
      // exactly over the trunk and its tip — where a bird, a seed and a
      // growing silhouette actually belong — and everything below (the
      // branch panels, the root system) is simply never touched, reappearing
      // exactly as it was the moment the show ends.
      //
      // Reduced motion drops both the aspect clamp and `overflow-hidden`:
      // the storyboard is meant to be read start to finish, not scrolled
      // inside a letterbox, and the figure has more than enough height
      // below this pinned-to-the-top box for its natural, un-clamped size.
      className={cn(
        "absolute inset-x-0 top-0 z-20",
        !reduced && "aspect-[3/2] overflow-hidden cursor-pointer",
      )}
    >
      {reduced ? <Storyboard seasons={seasons} /> : <AnimatedStage beat={beat} />}

      <button type="button" ref={skipRef} onClick={handleSkip} className={SKIP_BUTTON_CLASS}>
        Skip
      </button>
    </div>
  );
}
