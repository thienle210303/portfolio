"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import type { ResolvedWorld } from "@/lib/worlds";
import WorldPanel from "./WorldPanel";

/**
 * The seven worlds as a list of buttons, a panel, and a stage the canvas will
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
 */

export interface GlobeControls {
  /** Rotate by a delta, in radians. */
  readonly nudge: (deltaSpin: number, deltaTilt: number) => void;
  /** Play the crossing. */
  readonly fly: () => void;
  /** Back to the Việt Nam pin, flight and seed cleared. */
  readonly reset: () => void;
  /** Turn a world to face the viewer. */
  readonly focusWorld: (id: string) => void;
}

type CanvasComponent = ComponentType<{
  readonly worlds: readonly ResolvedWorld[];
  readonly currentId: string;
  readonly onSelect: (id: string) => void;
  readonly onLanded: () => void;
  readonly onReady: (controls: GlobeControls | null) => void;
}>;

interface WorldsStageProps {
  readonly worlds: readonly ResolvedWorld[];
  readonly crossingKm: number;
}

/** One keyboard step, in radians — 12°, the same step the mockup settled on:
 *  large enough that a held arrow key visibly turns the planet, small enough
 *  that a single press does not lose the marker you were looking at. */
const KEY_STEP = (12 * Math.PI) / 180;

export function WorldsStage({ worlds, crossingKm }: WorldsStageProps) {
  const [currentId, setCurrentId] = useState(worlds[0]?.id ?? "");
  const [announcement, setAnnouncement] = useState("");
  const [Canvas, setCanvas] = useState<CanvasComponent | null>(null);
  // Set only on the `.catch()` path below, and never cleared: once the chunk
  // has failed there is no retry, so the resting label it drives ("Globe not
  // available") is permanent rather than reverting to "Loading" on a re-render.
  const [canvasFailed, setCanvasFailed] = useState(false);
  const controlsRef = useRef<GlobeControls | null>(null);
  const [controlsReady, setControlsReady] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const current = worlds.find((world) => world.id === currentId) ?? worlds[0];

  const select = useCallback(
    (id: string) => {
      const world = worlds.find((candidate) => candidate.id === id);
      if (!world) return;
      setCurrentId(id);
      setAnnouncement(
        `${world.name}. ${world.plaques.length} ${world.plaques.length === 1 ? "plaque" : "plaques"}, ` +
          `${world.decorations.length} ${world.decorations.length === 1 ? "decoration" : "decorations"}.`,
      );
      controlsRef.current?.focusWorld(id);
    },
    [worlds],
  );

  const handleReady = useCallback((controls: GlobeControls | null) => {
    controlsRef.current = controls;
    setControlsReady(controls !== null);
  }, []);

  const handleLanded = useCallback(() => {
    // Only the sentence that is true right now. The seed, the sapling and the
    // handoff to the career tree arrive with the task that actually draws
    // them, and this line grows back then.
    //
    // This is not a style note. Until the canvas existed this string was
    // unreachable — the stub never called `onReady`, so `controlsReady` stayed
    // false, the flight control was `pointer-events-none` and said "Loading
    // the globe…", and nothing could fire `onLanded`. The moment a real globe
    // hands its controls back, one button press reaches it. And because the
    // region is `sr-only`, the only people who would ever have received the
    // seed sentence are the ones who cannot see that nothing was dropped —
    // which is the one audience a section built on "it never says anything
    // untrue" must not say an untrue thing to.
    setAnnouncement("The flight landed in the United States.");
  }, []);

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
        controls.nudge(KEY_STEP, 0);
        break;
      case "ArrowUp":
        controls.nudge(0, KEY_STEP);
        break;
      case "ArrowDown":
        controls.nudge(0, -KEY_STEP);
        break;
      case "Home":
        controls.reset();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
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
          role="group"
          aria-roledescription="globe"
          aria-label={
            controlsReady
              ? "Playground Earth. Drag to roll it, or use the arrow keys. Every world is also a button in the list beside it."
              : "Playground Earth. Every world is also a button in the list beside it."
          }
          onKeyDown={handleKeyDown}
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
            />
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            aria-disabled={!controlsReady}
            onClick={() => controlsRef.current?.fly()}
            className={cn(
              "min-h-11 px-5",
              // The accent fill is reserved for a control that is actually
              // the primary action right now (SPEC: blue is never
              // decoration). Disabled, this matches the reset button's own
              // resting style exactly rather than fading the accent fill —
              // faded accent-on-fg-inverse measured under AA (3.69:1 day,
              // 4.22:1 night at 70% opacity); this combination measures the
              // same as the already-AA reset button beside it.
              controlsReady
                ? "border border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--fg-inverse)]"
                : "pointer-events-none border border-rule text-[color:var(--fg)] opacity-70",
            )}
          >
            {controlsReady ? "Take the flight" : canvasFailed ? "Globe not available" : "Loading the globe…"}
          </button>
          <button
            type="button"
            aria-disabled={!controlsReady}
            onClick={() => controlsRef.current?.reset()}
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
      </div>

      <div>
        <p className="eyebrow" id="worlds-list-label">
          The seven
        </p>
        <ul aria-labelledby="worlds-list-label" className="mt-2 grid gap-px">
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
                <span className="font-display text-[length:var(--step-0)] italic text-[color:var(--fg)]">
                  {world.name}
                </span>
                <span className="eyebrow tabular-nums">
                  {world.plaques.length} {world.plaques.length === 1 ? "plaque" : "plaques"}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {current ? <WorldPanel world={current} /> : null}
        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>
    </div>
  );
}

export default WorldsStage;
