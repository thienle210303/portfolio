"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/cn";
import { origin } from "@/content/portfolio";
// Types only: the skins arrive as a prop from the server component, so the
// content layer stays out of the initial client bundle.
import type { ResolvedChapter } from "@/lib/worlds";
import type { ResolvedSkin } from "@/lib/skins";
import type { RobotHold } from "./gl/robot";
import { TAP_SLOP_PX } from "./gestures";
import { REPLAY_HOLD_MS, REPLAY_RETURN_MS } from "./replay";
import WorldPanel from "./WorldPanel";

/**
 * The six chapters as a list of buttons, a panel, and a stage the canvas will
 * later mount into.
 *
 * Read the split before changing anything: **the list is the feature and the
 * canvas is decoration.** This component works with no canvas at all, which is
 * not a fallback but the design — `e2e/worlds.spec.ts` blocks the canvas chunk
 * and asserts every plaque is still reachable. That is why `currentId` lives
 * here rather than inside the canvas, and why the canvas is handed a
 * `currentId` and an `onSelect` rather than owning the selection itself.
 *
 * The canvas arrives by `import()` on first scroll into view, not by
 * `next/dynamic`: it is ~53 KB of coastline plus an engine, and nothing about
 * it should be in the initial bundle. `GlobeCanvas` hands back a `GlobeControls`
 * object on mount, which is how this component's keyboard handler and its two
 * buttons drive a globe they do not own. Before that object exists the two
 * globe controls are `aria-disabled` rather than absent — the same pattern
 * `WatchOrigin.tsx` uses for the origin-story player, and for the same reason:
 * a control that vanishes and reappears is worse than one that says "not yet".
 * `aria-disabled` announces; it does not enforce — so, as there, each handler
 * opens by refusing the press itself.
 */

export interface GlobeControls {
  /** Rotate by a delta, in radians. */
  readonly nudge: (deltaSpin: number, deltaTilt: number) => void;
  /** Play the crossing — or, under `prefers-reduced-motion: reduce`, land it
   *  in one frame. Either way `onLanded` fires exactly once. */
  readonly fly: () => void;
  /** Back to the Việt Nam pin, flight and seed cleared. The caller clears the
   *  handoff link with it: the seed being gone is what makes the link untrue
   *  again. */
  readonly reset: () => void;
  /** Turn a chapter to face the viewer. A flight in the air lands first
   *  (and `onLanded` fires), so the choice is not lost under its landing. */
  readonly focusWorld: (id: string) => void;
  /** Bring whatever is moving to where it was going, in one draw, and ask
   *  for no further frame: a flight in the air lands (and `onLanded` fires),
   *  a robot mid-walk ends lit. At rest it does nothing at all. */
  readonly settle: () => void;
}

type CanvasComponent = ComponentType<{
  readonly worlds: readonly ResolvedChapter[];
  readonly currentId: string;
  readonly onSelect: (id: string) => void;
  readonly onLanded: () => void;
  readonly onReady: (controls: GlobeControls | null) => void;
  readonly skinId: string | null;
  readonly onSurfaceChange: (live: boolean) => void;
  readonly robotHold: RobotHold;
}>;

interface WorldsStageProps {
  readonly worlds: readonly ResolvedChapter[];
  readonly skins: readonly ResolvedSkin[];
  /** Forces the skin dial on. The page never passes it: there the dial turns
   *  on only when `GlobeCanvas` reports a live GL surface. Tests use it,
   *  because jsdom has no WebGL to report one. */
  readonly skinsAvailable?: boolean;
  readonly crossingKm: number;
}

/** One keyboard step, in radians — 12°, the same step the mockup settled on:
 *  large enough that a held arrow key visibly turns the planet, small enough
 *  that a single press does not lose the marker you were looking at. */
const KEY_STEP = (12 * Math.PI) / 180;

/** The robot's two laps as still states, for a visitor who asked for no
 *  motion (spec §5.5). The globe draws whichever is pressed. */
const ROBOT_HOLD_NAMES: readonly (readonly [RobotHold, string])[] = [
  ["unsupervised", "Unsupervised"],
  ["human-in-the-loop", "Human in the loop"],
];

/**
 * Arrow keys, Home and End move focus between a toolbar's buttons. Tab still
 * visits every button (no roving tabindex): these are toggles, not a radio
 * group, and a skipped Tab stop would hide the pressed state from the order.
 */
function moveFocusAmongButtons(event: KeyboardEvent<HTMLElement>) {
  // Alt+Left/Right is Back/Forward, Ctrl/Cmd+Home/End scroll the page.
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const keys: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
  const step = keys[event.key];
  if (step === undefined && event.key !== "Home" && event.key !== "End") return;
  const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
  const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
  if (at < 0) return;
  event.preventDefault();
  const next =
    event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (at + step + buttons.length) % buttons.length;
  buttons[next]?.focus();
}

export function WorldsStage({ worlds, skins, skinsAvailable: forceSkins = false, crossingKm }: WorldsStageProps) {
  const [currentId, setCurrentId] = useState(worlds[0]?.id ?? "");
  const [announcement, setAnnouncement] = useState("");
  // At most one skin is worn; pressing the worn one again takes it off.
  const [skinId, setSkinId] = useState<string | null>(null);
  // Whether the globe has a GL surface to wear a skin on. Reported by the lazy
  // `GlobeCanvas` rather than probed here, so nothing WebGL reaches the
  // initial bundle. Once the canvas falls back it never reports true again,
  // so the dial stays disabled for the visit.
  const [surfaceLive, setSurfaceLive] = useState(false);
  const skinsAvailable = forceSkins || surfaceLive;
  // Which still lap the globe shows under reduced motion. It starts where the
  // walk ends, lit, for the same reason the walk ends there.
  const [robotHold, setRobotHold] = useState<RobotHold>("human-in-the-loop");
  const [Canvas, setCanvas] = useState<CanvasComponent | null>(null);
  // Set only on the `.catch()` path below, and never cleared: once the chunk
  // has failed there is no retry, so the resting label it drives ("Globe not
  // available") is permanent rather than reverting to "Loading" on a re-render.
  const [canvasFailed, setCanvasFailed] = useState(false);
  // Whether a seed is on the globe *right now*, which is the only thing that
  // entitles this component to show the handoff link. Cleared by the reset
  // and by a re-press of the flight, because both of them take the seed away
  // again — see `handleReset` and `handleFly`.
  const [landed, setLanded] = useState(false);
  const controlsRef = useRef<GlobeControls | null>(null);
  const [controlsReady, setControlsReady] = useState(false);
  // The crossing replays itself while the stage is watched: fly, land, hold
  // for `REPLAY_HOLD_MS`, ease back to Việt Nam, wait out `REPLAY_RETURN_MS`,
  // fly again. `loopRef` is where that stands: "idle" until the stage first
  // comes into view, "looping" from then, and "stopped" for good after any
  // tap, drag, key, click or focus in the section (see `takeOver`), and at
  // once under reduced motion, where the one landing is all there is.
  // Dropping below half in view pauses a loop rather than stopping it:
  // `pausedRef` says the next entry has a cycle to pick up. Between cycles
  // only `timerRef` is pending, never a frame. `looping` mirrors "looping" for the flight button's label.
  // `quietRef` is true only while a flight nobody asked for is in the air:
  // its landing shows the link but writes nothing to the live region.
  const loopRef = useRef<"idle" | "looping" | "stopped">("idle");
  const [looping, setLooping] = useState(false);
  const pausedRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);
  const quietRef = useRef(false);
  // `landed`, for the observer's closure, which outlives the render it saw.
  const landedRef = useRef(false);
  useEffect(() => {
    landedRef.current = landed;
  }, [landed]);
  // Whether any of the stage is in the viewport, as the autoplay observer last
  // saw it. False until it reports, which is also before there is a globe.
  const inViewRef = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // The pointer press in progress inside the section, if any, and whether a
  // replayed flight was quiet when it began (see `pressCancel`).
  const pressRef = useRef<{ x: number; y: number; quiet: boolean } | null>(null);

  const clearReplayTimer = useCallback(() => {
    window.clearTimeout(timerRef.current);
    timerRef.current = undefined;
  }, []);

  // For good: nothing restarts the loop. Called from "idle" too, so a
  // visitor who gets to the globe first is never flown over by the autoplay.
  const stopReplay = useCallback(() => {
    loopRef.current = "stopped";
    pausedRef.current = false;
    clearReplayTimer();
    setLooping(false);
  }, [clearReplayTimer]);

  // One pending step of the cycle. Each step re-asks, when it is due, what
  // could have changed while it waited: the motion preference (asked, not
  // subscribed to — no listener in the initial bundle), a hidden tab (wait
  // the same again rather than reset for nobody), and focus inside the
  // section (a visitor is there; do not move the globe under them). Focus
  // entering already stops the loop (`takeOver`); this catches focus that
  // was there before. "Stop the replay" itself is exempt, so a visitor
  // parked on it keeps a button that still says what it does.
  const arm = useCallback(
    (wait: number, advance: () => void) => {
      const tick = () => {
        timerRef.current = undefined;
        // Every stop clears this timer; this makes a missed clear harmless.
        if (loopRef.current !== "looping") return;
        const focused = document.activeElement;
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true) stopReplay();
        // A finger or button still down in the section: not yet a tap, a drag
        // or a scroll. Wait rather than reset the globe under it.
        else if (document.hidden || pressRef.current) timerRef.current = window.setTimeout(tick, wait);
        else if (focused && rootRef.current?.contains(focused) && !focused.closest("[data-replay]")) stopReplay();
        else advance();
      };
      clearReplayTimer();
      timerRef.current = window.setTimeout(tick, wait);
    },
    [clearReplayTimer, stopReplay],
  );

  // The hold, then the return. The reset is the camera's own and says
  // nothing: `handleReset` would announce it, and nobody asked.
  const scheduleHold = useCallback(() => {
    arm(REPLAY_HOLD_MS, () => {
      controlsRef.current?.reset();
      setLanded(false);
      arm(REPLAY_RETURN_MS, () => {
        quietRef.current = true;
        controlsRef.current?.fly();
      });
    });
  }, [arm]);

  const current = worlds.find((world) => world.id === currentId) ?? worlds[0];

  const select = useCallback(
    (id: string) => {
      const world = worlds.find((candidate) => candidate.id === id);
      if (!world) return;
      setCurrentId(id);
      // Before the announcement: this can land a flight, and the landing's
      // sentence must not get the last word over the chapter just chosen.
      controlsRef.current?.focusWorld(id);
      setAnnouncement(
        `${world.name}. ${world.plaques.length} ${world.plaques.length === 1 ? "plaque" : "plaques"}, ` +
          `${world.decorations.length} ${world.decorations.length === 1 ? "decoration" : "decorations"}.`,
      );
    },
    [worlds],
  );

  const toggleSkin = useCallback(
    (id: string) => {
      // `aria-disabled` announces but does not enforce; refuse the press here.
      if (!skinsAvailable) return;
      setSkinId((worn) => (worn === id ? null : id));
    },
    [skinsAvailable],
  );

  const handleSurfaceChange = useCallback((live: boolean) => {
    setSurfaceLive(live);
    // A skin nothing can draw is not worn.
    if (!live) setSkinId(null);
  }, []);

  const handleReady = useCallback((controls: GlobeControls | null) => {
    controlsRef.current = controls;
    setControlsReady(controls !== null);
  }, []);

  const handleLanded = useCallback(() => {
    setLanded(true);
    if (quietRef.current) {
      quietRef.current = false;
      // A landing the stage settled on its way out of view (or below half of
      // it) holds nothing: the next entry picks the cycle up from here.
      if (loopRef.current === "looping" && !pausedRef.current) scheduleHold();
      return;
    }
    // Every clause here is now something the canvas has actually drawn. Round
    // 16's previous pass deliberately cut this back to the first sentence,
    // because the seed it claimed did not exist yet and this region is
    // `sr-only` — the only people who would have heard the claim were the ones
    // who could not see it was false. `GlobeCanvas` draws the seed and the
    // sapling as of this commit, so the rest of the sentence is true again and
    // comes back with it.
    //
    // The place name is read from `origin.to`, never typed: `portfolio.ts`
    // carries one name for that place under a doc comment forbidding a second.
    // It gets a sentence of its own rather than following a preposition, which
    // is the same shape every other reader of `origin.to` uses (`answer-
    // corpus.ts`, `worlds.ts`, `OriginStory.tsx`) and for the same reason —
    // "landed in United States" wants an article that only this one value
    // happens to need, and typing "the" here would be typing half a place
    // name. The link is mentioned because a live region's job is to tell
    // someone who cannot see the page that something new appeared on it.
    setAnnouncement(
      `The flight landed. ${origin.to}. A seed dropped where he came down, ` +
        "and a link to the career tree it grows into is now below the globe.",
    );
  }, [scheduleHold]);

  const handleFly = useCallback(() => {
    // Nothing behind the button yet — or nothing ever, if the chunk failed —
    // and the press has to die here rather than in CSS. `pointer-events:
    // none` suppresses *pointer* hit-testing only: these two controls carry
    // `aria-disabled` and never the native `disabled` (deliberately — they
    // have to stay in the tab order to say "not yet" to the person who
    // reached them by keyboard, which `tests/sections/WorldsStage.test.tsx`
    // pins), so Enter or Space on a focused one still fires `click` in a real
    // browser. Without this guard a keyboard visitor could write a sentence
    // about a flight into the live region before any globe existed. The same
    // opening line `WatchOrigin.tsx` uses, for the same reason.
    if (!controlsReady) return;
    // The capture handlers on the root exempt this button (see there), so it
    // stops the replay itself: the flight is the visitor's from here.
    stopReplay();
    quietRef.current = false;
    // Pressing it a second time replays the crossing from Việt Nam, which
    // clears the seed for the two seconds it takes — so the claim goes with
    // it, rather than sitting under a globe that has nothing on it.
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
      setAnnouncement("");
    });
    controlsRef.current?.fly();
  }, [controlsReady, stopReplay]);

  // "Stop the replay": WCAG 2.2.2's visible way to stop motion that started
  // by itself. Whatever is moving ends where it was going, in one draw.
  const handleStopReplay = useCallback(() => {
    stopReplay();
    controlsRef.current?.settle();
  }, [stopReplay]);

  const handleReset = useCallback(() => {
    // Same guard, and this one is the sharper of the two: with no globe, the
    // announcement below would tell a screen-reader user that a flight and a
    // seed had been cleared when neither had ever existed. See `handleFly`
    // above for why `pointer-events-none` does not cover a keyboard press.
    if (!controlsReady) return;
    // Home reaches here too; the button and the key both end the replay.
    stopReplay();
    quietRef.current = false;
    // The canvas half and the DOM half of one fact: `reset()` takes the seed
    // off the globe, and `setLanded(false)` takes the sentence that describes
    // it off the page. Doing only the first would leave a link claiming a seed
    // that a visitor can see is not there.
    controlsRef.current?.reset();
    setLanded(false);
    setAnnouncement(`Back at ${origin.from}, with the flight and the seed cleared.`);
  }, [controlsReady, stopReplay]);

  // The canvas chunk, fetched once the stage is near the viewport. An
  // IntersectionObserver rather than a mount-time import: the section is below
  // the fold by design (the spec's central engineering decision), and fetching
  // 53 KB of coastline during the load of a page whose LCP is already 3.9s
  // would spend the whole budget this redesign was built to protect.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || Canvas) return;
    if (typeof IntersectionObserver === "undefined") return;

    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        import("./GlobeCanvas")
          .then((module) => {
            if (!cancelled) setCanvas(() => module.default);
          })
          .catch(() => {
            // The chunk failed (offline, a flaky deploy). Silent — no
            // console, no alert, the list and the panel are already the
            // whole feature — but not a lie: without this, "Loading the
            // globe…" is the permanent label for exactly the one visitor who
            // hit a real failure, promising progress that has already
            // stopped. `canvasFailed` retires that label for good.
            if (!cancelled) setCanvasFailed(true);
          });
      },
      { rootMargin: "200px" },
    );
    observer.observe(stage);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [Canvas]);

  // The replay: a second observer, kept apart from the import's (which
  // disconnects on its first hit) because this one has to keep watching. Half
  // the stage in view starts the loop, or picks a paused one up: a landed
  // globe holds first, one back at Việt Nam flies at once. Less than half in
  // view pauses the loop (pending step cleared, replay settled); a full exit
  // also settles the visitor's own motion, so nothing animates for nobody.
  // Under reduced motion the first entry lands the crossing in one draw and
  // the loop never starts.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !controlsReady) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        const controls = controlsRef.current;
        if (!controls) return;
        inViewRef.current = entry.isIntersecting;
        if (!entry.isIntersecting || entry.intersectionRatio < 0.5) {
          // Less than half in view is not watched, for the replay: a sliver
          // of globe at the edge of the screen must not cycle for nobody.
          // The visitor's own motion is settled only on a full exit.
          if (loopRef.current === "looping") {
            pausedRef.current = true;
            clearReplayTimer();
            controls.settle();
          } else if (!entry.isIntersecting) controls.settle();
          return;
        }
        if (loopRef.current === "idle") {
          if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true) {
            loopRef.current = "stopped";
          } else {
            loopRef.current = "looping";
            setLooping(true);
          }
          quietRef.current = true;
          controls.fly();
        } else if (loopRef.current === "looping" && pausedRef.current) {
          pausedRef.current = false;
          if (landedRef.current) scheduleHold();
          else {
            quietRef.current = true;
            controls.fly();
          }
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(stage);
    return () => {
      observer.disconnect();
      clearReplayTimer();
    };
  }, [controlsReady, clearReplayTimer, scheduleHold]);

  // Unmounting mid-hold leaves no timer behind to reset a globe that is gone.
  useEffect(() => clearReplayTimer, [clearReplayTimer]);

  // Any deliberate touch in the section — a tap, a drag of the globe, a key,
  // a click (assistive tech activates by click), focus arriving — is a
  // visitor taking over, and the replay stops for good — at once, so no
  // control changes under someone who has just reached it. A press alone is
  // not: on a phone most presses become a page scroll, and a visitor
  // scrolling past should still see the loop (see `pressEnd`). Capture
  // phase, so a handler that stops propagation cannot hide it. The flight
  // button is exempt: as "Stop the replay" it would otherwise re-render as
  // "Take the flight" on `pointerup` or focus, before its own `click`, and that click would fly
  // him. It stops the loop itself.
  function pressStart(event: PointerEvent<HTMLDivElement>) {
    pressRef.current = { x: event.clientX, y: event.clientY, quiet: quietRef.current };
  }

  // A completed press is deliberate when it barely moved (a tap) or when it
  // was on the globe (a drag rolls it, and may fly him). A press that moved
  // elsewhere — a mouse sweep across the text — is neither.
  function pressEnd(event: PointerEvent<HTMLDivElement>) {
    const press = pressRef.current;
    pressRef.current = null;
    if (!press) return;
    const moved = Math.abs(event.clientX - press.x) + Math.abs(event.clientY - press.y);
    const onGlobe = event.target instanceof Node && stageRef.current?.contains(event.target);
    if (moved < TAP_SLOP_PX || onGlobe) takeOver(event);
  }

  // The browser sends `pointercancel`, never `pointerup`, when it takes a
  // gesture over for the page scroll. Not a touch on the globe, then: the
  // stage's own `pointerdown` cleared `quietRef` for a drag that never
  // happened, so a replayed flight still in the air gets its silence back.
  function pressCancel() {
    const press = pressRef.current;
    pressRef.current = null;
    if (press && loopRef.current === "looping") quietRef.current = press.quiet;
  }

  function takeOver(event: { target: EventTarget }) {
    if (event.target instanceof Element && event.target.closest("[data-replay]")) return;
    if (loopRef.current !== "stopped") stopReplay();
  }

  // A chapter chosen with the stage out of view (a phone, where the list sits
  // below it) settles at once: the robot's walk or the camera's swing ends in
  // one draw instead of running for nobody. Runs after the canvas's own
  // effects for the same commit, so a walk this choice started is there to end.
  useEffect(() => {
    if (!inViewRef.current) controlsRef.current?.settle();
  }, [currentId]);

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
        // has already stopped the replay (`takeOver`), so no replayed flight
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
        // `handleReset`, not `controls.reset()`: the seed and the sentence
        // about it have to come off together, whichever control asked.
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
      onPointerUpCapture={pressEnd}
      onPointerCancelCapture={pressCancel}
      onKeyDownCapture={takeOver}
      onClickCapture={takeOver}
      onFocusCapture={takeOver}
      className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12"
    >
      <div>
        <div
          ref={stageRef}
          // -1 until a real canvas exists: there is nothing to drag and the
          // arrow keys are inert, so a keyboard user should never tab into a
          // ~560px empty box a screen reader announces as a globe. The
          // IntersectionObserver watches `stageRef` regardless of tabIndex,
          // so this does not affect when the canvas chunk is fetched. Task 8
          // flips this to 0 once `controlsReady` can become true.
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
              ? "Playground Earth. Drag to roll it, or use the arrow keys. Every chapter is also a button in the list."
              : "Playground Earth. Every chapter is also a button in the list."
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
              worlds={worlds}
              currentId={currentId}
              onSelect={select}
              onLanded={handleLanded}
              onReady={handleReady}
              skinId={skinsAvailable ? skinId : null}
              onSurfaceChange={handleSurfaceChange}
              robotHold={robotHold}
            />
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            data-replay=""
            aria-disabled={!controlsReady}
            onClick={looping ? handleStopReplay : handleFly}
            className={cn(
              // Measured, border box at 16px: "Stop the replay" 150.8px,
              // "Take the flight" 143.3px. 156px holds the longer one with a
              // few px for font fallback, so stopping moves nothing.
              "min-h-11 min-w-39 px-5",
              // No accent fill here: the page's one blue control is
              // Contact's send (SPEC §4). Ready, this is the reset button's
              // resting style; disabled, the same box is dimmed.
              controlsReady
                ? "border border-rule text-[color:var(--fg)]"
                : "pointer-events-none border border-rule text-[color:var(--fg)] opacity-70",
            )}
          >
            {controlsReady
              ? looping
                ? "Stop the replay"
                : "Take the flight"
              : canvasFailed
                ? "Globe not available"
                : "Loading the globe…"}
          </button>
          <button
            type="button"
            aria-disabled={!controlsReady}
            onClick={handleReset}
            className={cn(
              "min-h-11 border border-rule px-5 text-[color:var(--fg)]",
              !controlsReady && "pointer-events-none opacity-70",
            )}
          >
            Face Việt Nam
          </button>
        </div>
        <p className="eyebrow mt-2 text-center">
          {crossingKm.toLocaleString("en-US")} km · drag east to fly him yourself
        </p>
        {/* Shown only while a seed is actually on the globe. Before the
            flight this sentence would be a claim about something that has not
            happened, and the whole argument of this section is that it says
            only things that are currently true — so it appears with the
            landing and leaves again with the reset. Its line is always laid
            out, though: the crossing now lands by itself on every visit, and a
            line inserted then would shift everything below it (CLS). Hidden
            with `visibility`, which also takes it out of the accessibility
            tree and the tab order, so nothing reads or reaches it early.
            Only the contents are hidden, never the <p>: `elementsFromPoint`
            skips hidden boxes, so a hidden <p> reads to the companion cats as
            free ground, and the replay shows it again every cycle — under
            whichever cat stopped there. The one link out of this section, and
            it is the link the drawing has just made: the career tree grows
            from that spot. */}
        <p className="mt-3 text-center text-[length:var(--step--1)] text-[color:var(--fg-muted)]">
          <span style={landed ? undefined : { visibility: "hidden" }}>
            A seed dropped where he came down.{" "}
            <a href="#tree" className="ink-link">
              The career tree grows from that spot →
            </a>
          </span>
        </p>
      </div>

      <div>
        <p className="eyebrow" id="worlds-list-label">
          Chapters
        </p>
        <ul
          aria-labelledby="worlds-list-label"
          className="mt-2 grid gap-px"
          onKeyDown={moveFocusAmongButtons}
        >
          {worlds.map((world, index) => (
            <li key={world.id}>
              <button
                type="button"
                aria-current={world.id === currentId}
                onClick={() => select(world.id)}
                className={cn(
                  "grid w-full grid-cols-[1.6rem_1fr_auto] items-baseline gap-3 border border-transparent px-2 py-2 text-left",
                  world.id === currentId
                    ? "border-[color:var(--fg-subtle)] bg-surface"
                    : "hover:border-rule",
                )}
              >
                <span className="eyebrow">{String(index + 1).padStart(2, "0")}</span>
                <span className="font-display text-[length:var(--step-0)] text-[color:var(--fg)]">
                  {world.name}
                </span>
                <span className="eyebrow tabular-nums">
                  {world.plaques.length} {world.plaques.length === 1 ? "plaque" : "plaques"}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {skins.length > 0 ? (
          <div
            role="group"
            aria-labelledby="worlds-skins-label"
            className="mt-6"
            onKeyDown={moveFocusAmongButtons}
          >
            <p className="eyebrow" id="worlds-skins-label">
              Skins · these change only the look
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {skins.map((skin) => (
                <button
                  key={skin.id}
                  type="button"
                  aria-pressed={skinId === skin.id}
                  aria-disabled={!skinsAvailable}
                  aria-label={
                    skinsAvailable
                      ? `${skin.name}. ${skin.label}`
                      : `${skin.name} — needs WebGL. ${skin.label}`
                  }
                  onClick={() => toggleSkin(skin.id)}
                  className={cn(
                    "min-h-11 border px-4 text-left text-[length:var(--step--1)] text-[color:var(--fg)]",
                    skinId === skin.id ? "border-[color:var(--fg-subtle)] bg-surface" : "border-rule",
                    !skinsAvailable && "pointer-events-none opacity-70",
                  )}
                >
                  {skin.name}
                  {skinsAvailable ? null : <span className="eyebrow block">needs WebGL</span>}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {current?.id === "tech" ? (
          // Shown only under reduced motion, by CSS: otherwise opening
          // Technology plays the two laps, and a toggle beside an animation
          // would be a second control for the same thing. `display: none`
          // also takes it out of the accessibility tree and the tab order.
          <div
            role="group"
            aria-label="The robot's two laps"
            className="mt-6 hidden flex-wrap gap-2 motion-reduce:flex"
          >
            {ROBOT_HOLD_NAMES.map(([hold, name]) => (
              <button
                key={hold}
                type="button"
                aria-pressed={robotHold === hold}
                onClick={() => setRobotHold(hold)}
                className={cn(
                  "min-h-11 border px-4 text-[length:var(--step--1)] text-[color:var(--fg)]",
                  robotHold === hold ? "border-[color:var(--fg-subtle)] bg-surface" : "border-rule",
                )}
              >
                {name}
              </button>
            ))}
          </div>
        ) : null}

        {current ? <WorldPanel world={current} /> : null}
        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>
    </div>
  );
}

export default WorldsStage;
