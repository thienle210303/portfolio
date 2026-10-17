"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/cn";
import { origin } from "@/content/portfolio";
// Type only: the stops arrive as a prop from the server component, so
// `buildStops()` and the globe maths it imports stay out of the client bundle.
import type { OriginStop } from "@/lib/origin-stops";
import { TAP_SLOP_PX } from "./gestures";

/**
 * The three stops as a list of buttons, the flight's one control, and a stage
 * the canvas will later mount into.
 *
 * Read the split before changing anything: **the list is the feature and the
 * canvas is decoration.** This component works with no canvas at all, which is
 * not a fallback but the design — `e2e/worlds.spec.ts` blocks the canvas chunk
 * and asserts every stop is still listed with its caption. That is why
 * `activeStopId` lives here rather than inside the canvas: the canvas is
 * handed the stops and the active one, and owns no selection itself.
 *
 * The canvas arrives by `import()` on first scroll into view, not by
 * `next/dynamic`: it is ~53 KB of coastline plus an engine, and nothing about
 * it should be in the initial bundle. `GlobeCanvas` hands back a `GlobeControls`
 * object on mount, which is how this component's keyboard handler, its stop
 * buttons and its flight control drive a globe they do not own. Before that object exists the flight
 * control is `aria-disabled` rather than absent — the same pattern
 * `WatchOrigin.tsx` uses for the origin-story player, and for the same reason:
 * a control that vanishes and reappears is worse than one that says "not yet".
 * `aria-disabled` announces; it does not enforce — so, as there, its handler
 * opens by refusing the press itself. The stop buttons need no such state:
 * they work with or without a globe to turn.
 */

export interface GlobeControls {
  /** Rotate by a delta, in radians. */
  readonly nudge: (deltaSpin: number, deltaTilt: number) => void;
  /** Play the crossing — or, under `prefers-reduced-motion: reduce`, land it
   *  in one frame. Either way `onLanded` fires exactly once. */
  readonly fly: () => void;
  /** Back to the Việt Nam pin, the flight cleared. */
  readonly reset: () => void;
  /** Turn a stop to face the viewer. A flight in the air lands first
   *  (and `onLanded` fires), so the choice is not lost under its landing. */
  readonly focusStop: (id: OriginStop["id"]) => void;
  /** Bring whatever is moving to where it was going, in one draw, and ask
   *  for no further frame: a flight in the air lands (and `onLanded` fires),
   *  a robot mid-walk finishes and leaves. At rest it does nothing at all. */
  readonly settle: () => void;
}

type CanvasComponent = ComponentType<{
  readonly stops: readonly OriginStop[];
  readonly activeStopId: OriginStop["id"] | null;
  readonly onLanded: () => void;
  readonly onReady: (controls: GlobeControls | null) => void;
  readonly onSurfaceChange: (live: boolean) => void;
}>;

interface WorldsStageProps {
  /** The globe's pins, and the list beside it. */
  readonly stops: readonly OriginStop[];
  readonly crossingKm: number;
  /** The section's heading, which sits at the top of the stop column at
   *  1024px and up, and above the globe below that. */
  readonly children?: ReactNode;
}

/** One keyboard step, in radians — 12°, the same step the mockup settled on:
 *  large enough that a held arrow key visibly turns the planet, small enough
 *  that a single press does not lose the marker you were looking at. */
const KEY_STEP = (12 * Math.PI) / 180;

export function WorldsStage({ stops, crossingKm, children }: WorldsStageProps) {
  // None until the visitor picks one: the flight is the story's first beat,
  // and no pin is labelled until someone asks for it.
  const [activeStopId, setActiveStopId] = useState<OriginStop["id"] | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // Whether a GL surface is drawing the planet, as the lazy `GlobeCanvas`
  // reports it. Nothing on the page depends on it: it is exposed as
  // `data-surface` so a test can tell the two globes apart, and it must never
  // change the layout (`e2e/worlds.spec.ts` measures the section's height
  // across it).
  const [surfaceLive, setSurfaceLive] = useState(false);
  const [Canvas, setCanvas] = useState<CanvasComponent | null>(null);
  // Set only on the `.catch()` path below, and never cleared: once the chunk
  // has failed there is no retry, so the resting label it drives ("Globe not
  // available") is permanent rather than reverting to "Loading" on a re-render.
  const [canvasFailed, setCanvasFailed] = useState(false);
  // Whether the crossing is drawn on the globe *right now*. Cleared by the
  // reset and by a replay, which both take it off again.
  const [landed, setLanded] = useState(false);
  const controlsRef = useRef<GlobeControls | null>(null);
  const [controlsReady, setControlsReady] = useState(false);
  // The crossing plays once, the first time half the stage is in view: fly,
  // land, rest. `loopRef` is where that stands: "idle" until the stage first
  // comes into view, "playing" while that one flight is in the air, and
  // "stopped" from its landing on (or at once after any tap, drag, key, click
  // or focus in the section — see `takeOver` — and under reduced motion, where
  // the one landing is all there is). Nothing restarts it; the flight button
  // does, on request. `playing` mirrors "playing" for the button's label.
  // `quietRef` is true only while a flight nobody asked for is in the air:
  // its landing marks the stage but writes nothing to the live region.
  const loopRef = useRef<"idle" | "playing" | "stopped">("idle");
  const [playing, setPlaying] = useState(false);
  const quietRef = useRef(false);
  // Whether any of the stage is in the viewport, as the autoplay observer last
  // saw it. False until it reports, which is also before there is a globe.
  const inViewRef = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // The pointer press in progress inside the section, if any, and whether a
  // autoplayed flight was quiet when it began (see `pressCancel`).
  const pressRef = useRef<{ x: number; y: number; quiet: boolean } | null>(
    null,
  );
  // Removes the window listeners that are waiting for that press to end.
  const endPressRef = useRef<(() => void) | null>(null);

  // For good: nothing restarts the autoplay. Called from "idle" too, so a
  // visitor who gets to the globe first is never flown over by it.
  const stopReplay = useCallback(() => {
    loopRef.current = "stopped";
    setPlaying(false);
  }, []);

  const handleSurfaceChange = useCallback((live: boolean) => setSurfaceLive(live), []);

  const handleReady = useCallback((controls: GlobeControls | null) => {
    controlsRef.current = controls;
    setControlsReady(controls !== null);
  }, []);

  const handleLanded = useCallback(() => {
    setLanded(true);
    // A press still undecided (scroll or touch?) has cleared `quietRef` for
    // a drag that may never happen; what was quiet when it began decides.
    const press = pressRef.current;
    if (quietRef.current || press?.quiet) {
      quietRef.current = false;
      if (press) press.quiet = false;
      // The one autoplay has landed; the flight button replays it from here.
      if (loopRef.current === "playing") stopReplay();
      return;
    }
    // Only what the canvas has drawn: the crossing, ending at the arrival.
    // The place name is read from `origin.to`, never typed: `portfolio.ts`
    // carries one name for that place under a doc comment forbidding a second.
    // It gets a sentence of its own rather than following a preposition, the
    // same shape every other reader of `origin.to` uses (`answer-corpus.ts`,
    // `OriginStory.tsx`), so no article is ever typed in front of it.
    setAnnouncement(`The flight landed. ${origin.to}.`);
  }, [stopReplay]);

  const handleFly = useCallback(() => {
    // Nothing behind the button yet — or nothing ever, if the chunk failed —
    // and the press has to die here rather than in CSS. `pointer-events:
    // none` suppresses *pointer* hit-testing only: this control carries
    // `aria-disabled` and never the native `disabled` (deliberately — it has
    // to stay in the tab order to say "not yet" to the person who reached it
    // by keyboard, which `tests/sections/WorldsStage.test.tsx` pins), so
    // Enter or Space on it still fires `click` in a real
    // browser. Without this guard a keyboard visitor could write a sentence
    // about a flight into the live region before any globe existed. The same
    // opening line `WatchOrigin.tsx` uses, for the same reason.
    if (!controlsReady) return;
    // The capture handlers on the root exempt this button (see there), so it
    // stops the replay itself: the flight is the visitor's from here.
    stopReplay();
    quietRef.current = false;
    // A replay starts the crossing again from Việt Nam, which clears it from
    // the globe for the two seconds it takes; the stop the visitor had picked
    // is let go too, because the camera is about to follow the bird instead.
    //
    // `flushSync` is load-bearing and not a performance hedge. Under reduced
    // motion `fly()` reaches `handleLanded` *synchronously*, so without this
    // the clear and the re-landing batch into one render — and because the
    // landed sentence is byte-identical to the one already in the live region,
    // React commits no DOM change at all and a screen reader has nothing new
    // to read. A second press would be silent. Flushing the empty region first
    // gives the region two distinct states, which is what makes it speak
    // again. No frame is requested to do it: this is synchronous DOM work, so
    // the zero-frame contract is untouched.
    flushSync(() => {
      setLanded(false);
      setActiveStopId(null);
      setAnnouncement("");
    });
    // Below 1024px this button sits under the stop list, and the stage can be
    // wholly off screen when it is pressed — where the flight would play for
    // nobody, and the first exit report would settle it. So the stage comes
    // into view first ("nearest": no scroll at all when it already is).
    // Instant, never smooth: a smooth scroll leaves the stage out of view for
    // the frame the autoplay observer next reports in, and that report would
    // settle the flight this press just started.
    stageRef.current?.scrollIntoView?.({ block: "nearest" });
    controlsRef.current?.fly();
  }, [controlsReady, stopReplay]);

  // "Stop the replay": WCAG 2.2.2's visible way to stop motion that started
  // by itself. Whatever is moving ends where it was going, in one draw.
  const handleStopReplay = useCallback(() => {
    stopReplay();
    controlsRef.current?.settle();
  }, [stopReplay]);

  const handleReset = useCallback(() => {
    // Reached by the Home key on the stage, which is focusable only once the
    // controls exist; the guard keeps the announcement below from ever
    // claiming a flight was cleared before one could have existed.
    if (!controlsReady) return;
    stopReplay();
    quietRef.current = false;
    controlsRef.current?.reset();
    setLanded(false);
    setActiveStopId(null);
    setAnnouncement(`Back at ${origin.from}, with the flight cleared.`);
  }, [controlsReady, stopReplay]);

  // The canvas chunk, fetched once the stage is within a viewport of the screen
  // (`rootMargin: 100%` vertically, so the chunk and the coastline PNG are in
  // flight before the visitor arrives) and never before the window's `load`
  // event: the stage sits about a screen below the top, so observing from
  // mount would fetch 53 KB of coastline during the load of a page whose LCP
  // is already 3.9s. An IntersectionObserver rather than a mount-time import:
  // the section is below the fold by design (the spec's central engineering
  // decision).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || Canvas) return;
    if (typeof IntersectionObserver === "undefined") return;

    let cancelled = false;
    let observer: IntersectionObserver | undefined;
    const watch = () => {
      if (cancelled) return;
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer?.disconnect();
          import("./GlobeCanvas")
            .then((module) => {
              if (!cancelled) setCanvas(() => module.default);
            })
            .catch(() => {
              // The chunk failed (offline, a flaky deploy). Silent — no
              // console, no alert, the stop list is already the whole
              // feature — but not a lie: without this, "Loading the
              // globe…" is the permanent label for exactly the one visitor who
              // hit a real failure, promising progress that has already
              // stopped. `canvasFailed` retires that label for good.
              if (!cancelled) setCanvasFailed(true);
            });
        },
        { rootMargin: "100% 0px" },
      );
      observer.observe(stage);
    };
    if (document.readyState === "complete") watch();
    else window.addEventListener("load", watch, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", watch);
      observer?.disconnect();
    };
  }, [Canvas]);

  // The autoplay: a second observer, kept apart from the import's (which
  // disconnects on its first hit) because the settle below has to keep
  // watching. Half the stage in view for the first time flies the crossing
  // once; its landing ends the autoplay (`handleLanded`). A stage that leaves
  // view settles whatever is moving, so nothing animates for nobody (the
  // observer reports not intersecting for a full exit by the spec, and
  // already below half in Chromium with this threshold). Under reduced motion
  // the first entry lands the crossing in one draw and nothing plays.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !controlsReady) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        const controls = controlsRef.current;
        if (!controls) return;
        inViewRef.current = entry.isIntersecting;
        if (!entry.isIntersecting) {
          controls.settle();
          return;
        }
        if (entry.intersectionRatio >= 0.5 && loopRef.current === "idle") {
          if (
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ===
            true
          ) {
            loopRef.current = "stopped";
          } else {
            loopRef.current = "playing";
            setPlaying(true);
          }
          quietRef.current = true;
          controls.fly();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, [controlsReady]);

  // Nor window listeners waiting for a press to end.
  useEffect(() => () => endPressRef.current?.(), []);

  // Any deliberate touch in the section — a tap, a drag of the globe, a key,
  // a click (assistive tech activates by click), focus arriving — is a
  // visitor taking over, and the replay stops for good — at once, so no
  // control changes under someone who has just reached it. A press alone is
  // not: on a phone most presses become a page scroll, and a visitor
  // scrolling past should still see the flight (see `pressEnd`). Capture
  // phase, so a handler that stops propagation cannot hide it. The flight
  // button is exempt: as "Stop the replay" it would otherwise re-render as
  // "Replay the flight" on `pointerup` or focus, before its own `click`, and
  // that click would fly him. It stops the autoplay itself.

  // The press's end is heard on `window`, not on the section: a mouse press
  // that wanders out (a text selection that overshoots) is released outside
  // it, and a press that never ended would hold the press set forever.
  //
  // Only a primary press counts. A right-click (and a control-click, which is
  // one on macOS) opens a context menu that can swallow its `pointerup`, which
  // would leave the press set and leave "Stop the replay" showing.
  function pressStart(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.ctrlKey && /Mac/.test(navigator.platform)))
      return;
    endPressRef.current?.();
    pressRef.current = {
      x: event.clientX,
      y: event.clientY,
      quiet: quietRef.current,
    };
    const up = (end: globalThis.PointerEvent) => {
      stopListening();
      pressEnd(end);
    };
    const cancel = () => {
      stopListening();
      pressCancel();
    };
    const stopListening = () => {
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", cancel, true);
      endPressRef.current = null;
    };
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", cancel, true);
    endPressRef.current = stopListening;
  }

  // A completed press is deliberate when it barely moved (a tap) or when it
  // was on the globe (a drag rolls it, and may fly him). A press that moved
  // elsewhere — a mouse sweep across the text — is neither.
  function pressEnd(event: globalThis.PointerEvent) {
    const press = pressRef.current;
    pressRef.current = null;
    if (!press) return;
    const moved =
      Math.abs(event.clientX - press.x) + Math.abs(event.clientY - press.y);
    const onGlobe =
      event.target instanceof Node && stageRef.current?.contains(event.target);
    if (event.target && (moved < TAP_SLOP_PX || onGlobe))
      takeOver({ target: event.target });
  }

  // The browser sends `pointercancel`, never `pointerup`, when it takes a
  // gesture over for the page scroll. Not a touch on the globe, then: the
  // stage's own `pointerdown` cleared `quietRef` for a drag that never
  // happened, so an autoplayed flight still in the air gets its silence back.
  // (One that landed during the press already took it: `handleLanded`.)
  function pressCancel() {
    const press = pressRef.current;
    pressRef.current = null;
    if (press && loopRef.current === "playing") quietRef.current = press.quiet;
  }

  function takeOver(event: { target: EventTarget }) {
    if (
      event.target instanceof Element &&
      event.target.closest("[data-replay]")
    )
      return;
    if (loopRef.current !== "stopped") stopReplay();
  }

  const select = useCallback(
    (id: OriginStop["id"]) => {
      const stop = stops.find((candidate) => candidate.id === id);
      if (!stop) return;
      const controls = controlsRef.current;
      // First, so a flight in the air lands (`focusStop` fires `onLanded`)
      // before the place is announced: the landing must not get the last word
      // over the stop just chosen.
      controls?.focusStop(id);
      // Chosen with the stage out of view (a phone, where the list sits below
      // it): the turn, and any walk the landing started, end in one draw
      // instead of running for nobody.
      if (!inViewRef.current) controls?.settle();
      setActiveStopId(id);
      setAnnouncement(`${stop.place}, ${stop.when}.`);
    },
    [stops],
  );

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const controls = controlsRef.current;
    if (!controls) return;
    switch (event.key) {
      case "ArrowLeft":
        controls.nudge(-KEY_STEP, 0);
        break;
      case "ArrowRight":
        // Rolling east is what flies him — the same coupling a drag has, so
        // the keyboard reaches the signature moment rather than watching it.
        // A landing it reaches is the visitor's own, so it speaks. The key
        // has already stopped the replay (`takeOver`), so no autoplayed flight
        // wipes one he is part-way through.
        quietRef.current = false;
        controls.nudge(KEY_STEP, 0);
        break;
      case "ArrowUp":
        controls.nudge(0, KEY_STEP);
        break;
      case "ArrowDown":
        controls.nudge(0, -KEY_STEP);
        break;
      case "Home":
        // `handleReset`, not `controls.reset()`: the crossing and the stage's
        // record of it come off together.
        handleReset();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  return (
    <div
      ref={rootRef}
      onPointerDownCapture={pressStart}
      onKeyDownCapture={takeOver}
      onClickCapture={takeOver}
      onFocusCapture={takeOver}
      data-surface={surfaceLive ? "gl" : undefined}
      // Below 1024px: heading, globe, stops. At 1024px and up the globe takes
      // the left ~55% across both rows, and the heading and the stops share
      // the right column.
      className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-12"
    >
      {children ? <div className="lg:col-start-2 lg:row-start-1">{children}</div> : null}

      <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
        <div
          ref={stageRef}
          // -1 until a real canvas exists: there is nothing to drag and the
          // arrow keys are inert, so a keyboard user should never tab into a
          // ~560px empty box a screen reader announces as a globe. The
          // IntersectionObserver watches `stageRef` regardless of tabIndex,
          // so this does not affect when the canvas chunk is fetched.
          tabIndex={controlsReady ? 0 : -1}
          // The companion cats must never rest here. Until the canvas chunk
          // lands this is an empty tabindex -1 box, which the cats would read
          // as free ground; the canvas then mounts under a cat that settled on
          // it, and the cat sits on the globe taking visitors' drags.
          data-cat-avoid
          role="group"
          aria-roledescription="globe"
          aria-label={
            controlsReady
              ? "Playground Earth. Drag to roll it, or use the arrow keys. Every stop is also a button beside it."
              : "Playground Earth. Every stop is also a button beside it."
          }
          onKeyDown={handleKeyDown}
          // A drag east flies him too: that landing is the visitor's, so it
          // speaks. The release stops the replay (`pressEnd`); a press the
          // page scroll takes over gives the silence back (`pressCancel`).
          onPointerDown={() => {
            quietRef.current = false;
          }}
          data-crossing={landed ? "landed" : undefined}
          // pan-y, never none: `none` would swallow the page scroll on a phone.
          className="relative mx-auto aspect-[1/1.12] w-full max-w-[560px] touch-pan-y"
        >
          {Canvas ? (
            <Canvas
              stops={stops}
              activeStopId={activeStopId}
              onLanded={handleLanded}
              onReady={handleReady}
              onSurfaceChange={handleSurfaceChange}
            />
          ) : null}
        </div>
        <p className="eyebrow mt-2 text-center">
          {crossingKm.toLocaleString("en-US")} km · drag east to fly him
          yourself
        </p>
      </div>

      <div className="lg:col-start-2 lg:row-start-2">
        <ol className="grid gap-px">
          {stops.map((stop) => {
            const active = stop.id === activeStopId;
            return (
              <li key={stop.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => select(stop.id)}
                  className={cn(
                    "grid w-full gap-1 border px-3 py-3 text-left",
                    active
                      ? "border-[color:var(--fg-subtle)] bg-surface"
                      : "border-transparent hover:border-rule",
                  )}
                >
                  <span className="eyebrow tabular-nums">{stop.when}</span>
                  <span className="font-display text-[length:var(--step-0)] text-[color:var(--fg)]">
                    {stop.place}
                  </span>
                  <span className="text-[length:var(--step--1)] text-[color:var(--fg-muted)]">
                    {stop.caption}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <button
          type="button"
          data-replay=""
          aria-disabled={!controlsReady}
          onClick={playing ? handleStopReplay : handleFly}
          className={cn(
            // Wide enough for "Replay the flight", the longest of its labels,
            // so swapping to "Stop the replay" moves nothing.
            "mt-4 min-h-11 min-w-44 border border-rule px-5 text-[color:var(--fg)]",
            // No accent fill here: the page's one blue control is Contact's
            // send (SPEC §4). Disabled, the same box is dimmed.
            !controlsReady && "pointer-events-none opacity-70",
          )}
        >
          {controlsReady
            ? playing
              ? "Stop the replay"
              : "Replay the flight"
            : canvasFailed
              ? "Globe not available"
              : "Loading the globe…"}
        </button>
        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>
    </div>
  );
}

export default WorldsStage;
