"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/cn";
import { origin } from "@/content/portfolio";
// Types only: the skins arrive as a prop from the server component, so the
// content layer stays out of the initial client bundle.
import type { ResolvedChapter } from "@/lib/worlds";
import type { ResolvedSkin } from "@/lib/skins";
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
  /** Turn a world to face the viewer. */
  readonly focusWorld: (id: string) => void;
}

type CanvasComponent = ComponentType<{
  readonly worlds: readonly ResolvedChapter[];
  readonly currentId: string;
  readonly onSelect: (id: string) => void;
  readonly onLanded: () => void;
  readonly onReady: (controls: GlobeControls | null) => void;
  readonly skinId: string | null;
  readonly onSurfaceChange: (live: boolean) => void;
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
  const [Canvas, setCanvas] = useState<CanvasComponent | null>(null);
  // Set only on the `.catch()` path below, and never cleared: once the chunk
  // has failed there is no retry, so the resting label it drives ("Globe not
  // available") is permanent rather than reverting to "Loading" on a re-render.
  const [canvasFailed, setCanvasFailed] = useState(false);
  // Whether a seed is on the globe *right now*, which is the only thing that
  // entitles this component to render the handoff link. Cleared by the reset
  // and by a re-press of the flight, because both of them take the seed away
  // again — see `handleReset` and `handleFly`.
  const [landed, setLanded] = useState(false);
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
  }, []);

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
  }, [controlsReady]);

  const handleReset = useCallback(() => {
    // Same guard, and this one is the sharper of the two: with no globe, the
    // announcement below would tell a screen-reader user that a flight and a
    // seed had been cleared when neither had ever existed. See `handleFly`
    // above for why `pointer-events-none` does not cover a keyboard press.
    if (!controlsReady) return;
    // The canvas half and the DOM half of one fact: `reset()` takes the seed
    // off the globe, and `setLanded(false)` takes the sentence that describes
    // it off the page. Doing only the first would leave a link claiming a seed
    // that a visitor can see is not there.
    controlsRef.current?.reset();
    setLanded(false);
    setAnnouncement(`Back at ${origin.from}, with the flight and the seed cleared.`);
  }, [controlsReady]);

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
          // The companion cats must never rest here. Until the canvas chunk
          // lands this is an empty tabindex -1 box, which the cats would read
          // as free ground; the canvas then mounts under a cat that settled on
          // it, and the cat sits on the globe taking visitors' drags.
          data-cat-avoid
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
              skinId={skinsAvailable ? skinId : null}
              onSurfaceChange={handleSurfaceChange}
            />
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            aria-disabled={!controlsReady}
            onClick={handleFly}
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
        {/* Rendered only once a seed is actually on the globe. Before the
            flight this sentence would be a claim about something that has not
            happened, and the whole argument of this section is that it says
            only things that are currently true — so it appears with the
            landing and leaves again with the reset, rather than sitting here
            greyed out. The one link out of this section, and it is the link
            the drawing has just made: the career tree grows from that spot. */}
        {landed ? (
          <p className="mt-3 text-center text-[length:var(--step--1)] text-[color:var(--fg-muted)]">
            A seed dropped where he came down.{" "}
            <a href="#tree" className="ink-link">
              The career tree grows from that spot →
            </a>
          </p>
        ) : null}
      </div>

      <div>
        <p className="eyebrow" id="worlds-list-label">
          Chapters
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
          <div role="group" aria-labelledby="worlds-skins-label" className="mt-6">
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

        {current ? <WorldPanel world={current} /> : null}
        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>
    </div>
  );
}

export default WorldsStage;
