"use client";

import { useEffect, useSyncExternalStore, type RefObject } from "react";

/**
 * The creature's three reactive behaviours, as three hooks:
 *
 *  - `usePrefersReducedMotion` — the motion gate.
 *  - `useLaneTone` — keeps the creature legible against whatever is behind
 *    it. Runs **always**, including under reduced motion, because it is a
 *    contrast concern rather than an animation one.
 *  - `useCreatureMotion` — position and gaze. Runs only when motion is
 *    allowed.
 *
 * ## Why the motion hook bypasses React state
 *
 * Both of its inputs fire at input frequency. Routing them through `useState`
 * would re-render on every pointer move and scroll tick, which on a page with
 * this many server-rendered nodes is exactly the sort of thing that shows up
 * as a Lighthouse TBT regression. So it writes two CSS custom properties
 * straight to the DOM node inside one `requestAnimationFrame` loop, and React
 * never re-renders for motion at all.
 *
 * ## The invariant this file exists to protect
 *
 * **Every movement is a response to something the visitor just did.** Scroll
 * moves it; the pointer turns its head. There is no idle animation, no attract
 * loop, no timer that makes it do something while the visitor is reading. That
 * is the whole difference between a guide and a distraction, and it is
 * enforced here by simply never installing a timer that animates.
 *
 * ## A note on the arrow functions
 *
 * The handlers below are `const` arrows rather than the `function` decls used
 * elsewhere in this project, and that is load-bearing: TypeScript does not
 * carry a `const`'s null-narrowing into a hoisted function declaration, so
 * `function measure() { node.foo }` fails under `strict` even after an early
 * `if (!node) return`. Converting them back to `function` reintroduces a wall
 * of type errors.
 */

/** Fraction of the viewport height the lane spans, top and bottom. */
const LANE_TOP = 0.16;
const LANE_BOTTOM = 0.78;

/** Where the creature sits when motion is suppressed. */
const LANE_STATIC = 0.3;

/** Exponential smoothing factor per frame. Higher follows more tightly. */
const POSITION_EASING = 0.14;
const GAZE_EASING = 0.2;

/** Sub-pixel differences are invisible; stop the loop instead of spinning. */
const POSITION_EPSILON = 0.35;
const GAZE_EPSILON = 0.15;

/** Head rotation limit, degrees. Past ~15° a stylised head reads as broken. */
const GAZE_LIMIT_DEG = 14;

/** How long after the last scroll tick the walk cycle keeps running. */
const WALK_LINGER_MS = 200;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * True when the visitor has asked for reduced motion, tracked reactively so
 * toggling the OS setting takes effect without a reload.
 *
 * A media query is an external system, so `useSyncExternalStore` is the right
 * primitive — reading it into state inside an effect would mean a render, an
 * effect, and a second render on every mount.
 *
 * The server snapshot is `true`, i.e. "assume reduced". React uses it for the
 * hydration render and only then reconciles against the real value, so the
 * very first paint is never the animated variant. Guessing the other way would
 * show a reduced-motion visitor one frame of movement.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    () => true,
  );
}

/**
 * Keeps the creature readable against the section behind it.
 *
 * It is `position: fixed`, so it floats over sections of different tones —
 * dark for most of the page, light across the AI Workflow Lab and the closing
 * panel — and a single fixed colour would vanish against one of them.
 *
 * Rather than duplicate the tone table that already lives in the section
 * components, this reads it back off the DOM: a light section is exactly one
 * carrying `.on-light` (applied by `<Section tone="paper">`). It then toggles
 * that same class on the creature, which repoints `--fg`, `--fg-subtle` and
 * `--ring-color` for everything inside it — focus ring included. There is no
 * creature-specific palette, by design. Change a section's tone and this
 * follows with no edit here.
 */
export function useLaneTone(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let bands: Array<{ top: number; bottom: number; light: boolean }> = [];

    const measure = (): void => {
      const scrollTop = window.scrollY;
      bands = [...document.querySelectorAll("main > section, body > section")].map((section) => {
        const rect = section.getBoundingClientRect();
        return {
          top: rect.top + scrollTop,
          bottom: rect.bottom + scrollTop,
          light: section.classList.contains("on-light"),
        };
      });
    };

    const sync = (): void => {
      // Read the creature's own painted position rather than recomputing it,
      // so this stays correct whether the motion hook is driving `--guide-y`
      // or CSS has parked it at the static offset.
      const rect = node.getBoundingClientRect();
      const centre = window.scrollY + rect.top + rect.height / 2;
      const band = bands.find((entry) => centre >= entry.top && centre < entry.bottom);
      node.classList.toggle("on-light", band?.light === true);
    };

    const onResize = (): void => {
      measure();
      sync();
    };

    measure();
    sync();

    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", onResize);

    // Section heights are not static: this page is full of disclosures and
    // filterable lists, and expanding one moves every band below it. Without
    // re-measuring, the tone flip drifts out of alignment with the actual
    // background over the course of a session.
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(onResize);
    observer?.observe(document.body);

    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", onResize);
      observer?.disconnect();
      node.classList.remove("on-light");
    };
  }, [ref]);
}

export function useCreatureMotion(
  ref: RefObject<HTMLElement | null>,
  { enabled }: { readonly enabled: boolean },
): void {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Motion suppressed: park the creature at a fixed offset and install no
    // listeners at all. `useLaneTone` still runs, so it stays legible.
    if (!enabled) {
      node.style.setProperty("--guide-y", `${LANE_STATIC * window.innerHeight}px`);
      node.style.setProperty("--guide-gaze", "0deg");
      return;
    }

    let currentY = 0;
    let targetY = 0;
    let currentGaze = 0;
    let targetGaze = 0;
    /** Lane centre in viewport coordinates; only changes on resize. */
    let laneCentreX = 0;
    let pointerX: number | null = null;
    let pointerY: number | null = null;
    let frame: number | null = null;
    let walkTimer: ReturnType<typeof setTimeout> | null = null;

    const measureLane = (): void => {
      const rect = node.getBoundingClientRect();
      laneCentreX = rect.left + rect.width / 2;
    };

    const readScroll = (): void => {
      const viewportHeight = window.innerHeight;
      const scrollable = document.documentElement.scrollHeight - viewportHeight;
      // A page shorter than the viewport has no reading position to report,
      // so the creature simply sits at the top of its lane.
      const progress = scrollable > 0 ? clamp(window.scrollY / scrollable, 0, 1) : 0;
      const laneHeight = (LANE_BOTTOM - LANE_TOP) * viewportHeight;
      targetY = LANE_TOP * viewportHeight + laneHeight * progress - node.offsetHeight / 2;
    };

    const recomputeGaze = (): void => {
      if (pointerX === null || pointerY === null) {
        targetGaze = 0;
        return;
      }
      const dx = pointerX - laneCentreX;
      const dy = pointerY - (currentY + node.offsetHeight / 2);
      // The creature lives in the left gutter and always faces right, into the
      // text, so dx is effectively always positive and `atan2` needs no
      // quadrant handling. Clamping dx to >= 1 anyway: a pointer to its left
      // would otherwise swing the head through 180°.
      targetGaze = clamp(
        (Math.atan2(dy, Math.max(dx, 1)) * 180) / Math.PI,
        -GAZE_LIMIT_DEG,
        GAZE_LIMIT_DEG,
      );
    };

    const paint = (): void => {
      node.style.setProperty("--guide-y", `${currentY.toFixed(2)}px`);
      node.style.setProperty("--guide-gaze", `${currentGaze.toFixed(2)}deg`);
    };

    const tick = (): void => {
      frame = null;

      currentY += (targetY - currentY) * POSITION_EASING;
      currentGaze += (targetGaze - currentGaze) * GAZE_EASING;

      const atRest =
        Math.abs(targetY - currentY) < POSITION_EPSILON &&
        Math.abs(targetGaze - currentGaze) < GAZE_EPSILON;

      if (atRest) {
        // Snap to the exact target so repeated near-misses cannot leave a
        // permanent sub-pixel offset, then stop scheduling frames. An idle
        // creature costs nothing.
        currentY = targetY;
        currentGaze = targetGaze;
        paint();
        return;
      }

      paint();
      frame = requestAnimationFrame(tick);
    };

    const schedule = (): void => {
      if (frame === null) frame = requestAnimationFrame(tick);
    };

    const onScroll = (): void => {
      readScroll();
      recomputeGaze();
      schedule();

      // The walk cycle runs only while the position is actually changing.
      node.dataset.walking = "true";
      if (walkTimer) clearTimeout(walkTimer);
      walkTimer = setTimeout(() => {
        delete node.dataset.walking;
        walkTimer = null;
      }, WALK_LINGER_MS);
    };

    const onPointerMove = (event: PointerEvent): void => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      recomputeGaze();
      schedule();
    };

    const onPointerLeave = (): void => {
      pointerX = null;
      pointerY = null;
      recomputeGaze();
      schedule();
    };

    const onResize = (): void => {
      measureLane();
      readScroll();
      recomputeGaze();
      schedule();
    };

    // Start where the reader already is, without animating in from zero — a
    // creature that slides down the page on load is an entrance, which is
    // precisely the attention-grabbing this design refuses.
    measureLane();
    readScroll();
    currentY = targetY;
    paint();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      if (frame !== null) cancelAnimationFrame(frame);
      if (walkTimer) clearTimeout(walkTimer);
      delete node.dataset.walking;
    };
  }, [ref, enabled]);
}
