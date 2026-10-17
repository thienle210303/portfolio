"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampTilt,
  easeFraction,
  FRAME_MS,
  frameStep,
  graticule,
  greatCircle,
  project,
  toGeo,
  toVector,
  unproject,
  type GreatCircle,
  type Viewport,
} from "@/lib/globe";
import { origin } from "@/content/portfolio";
import type { GeoPoint } from "@/types/portfolio";
import type { OriginStop } from "@/lib/origin-stops";
import type { GlobeControls } from "./WorldsStage";
import { GLYPHS } from "./glyphs";
import { COASTLINES } from "./coastline-data";
import { acquireRenderer, pickSurface } from "./gl/context";
import {
  createSphere,
  globeStroke,
  sphereView,
  type Sphere,
  type SphereView,
} from "./gl/sphere";
import {
  lightLevel,
  ROBOT_WALK_FRAMES,
  robotLights,
  ROBOT_STILL,
  robotSky,
} from "./gl/robot";
import { TAP_SLOP_PX } from "./gestures";
import { settleMotion } from "./settle";
import { palette, sphereColors } from "./palette";

/**
 * The planet. No dependency, and zero animation frames once it stops moving.
 *
 * ## Two canvases
 *
 * The 2D canvas (`data-chunk="globe-canvas"`) carries every handler and every
 * stroke with a position: limb, graticule, crossing, bird, the three stop
 * pins, robot, sun and moon. Under it, when WebGL2 works, a GL surface
 * (`data-globe-surface`) shades the planet itself: its fill and its
 * coastlines. The surface draws only from inside `draw()`, so it has no loop
 * of its own and rests exactly when the overlay rests. Without a surface the
 * overlay strokes the coastlines itself, which is the globe as it shipped.
 *
 * ## Why this file is imperative
 *
 * Everything below lives in one mutable `view` object and a `requestAnimation-
 * Frame` loop that switches itself off, rather than in React state. A globe
 * that re-renders React on every frame of an inertial spin is a globe that
 * drops frames on the phone this site is measured on. React owns what a
 * visitor can *ask for* — which stop is active — and this file owns what the
 * pixels are doing. The lines between them are props and `GlobeControls`, and
 * nothing crosses them on a frame.
 *
 * ## The rule about rest
 *
 * `loop()` requests the next frame **only if something is still moving**. When
 * the inertia decays below its threshold and no flight is in progress, the
 * loop returns without scheduling, `view.running` goes false, and the page
 * costs nothing until something wakes it again: the visitor, or the stage's
 * autoplay of the crossing (`WorldsStage.tsx`). The autoplay flies once, the
 * first time at least half the stage is in view, and ends at its landing; it
 * stops at once on any tap, drag of the globe, key, click or focus in the
 * section (a press the page scroll takes over does not count), and never runs
 * under reduced motion. After it the globe holds no timers and asks for no
 * frames until the visitor wakes it, with the flight button's replay among
 * the ways. So the autoplay asks for zero frames after any interaction, for
 * good; and the globe asks for none at rest once the robot's walk after the
 * landing is over, whenever the stage is off screen, and under reduced
 * motion. The autoplay asks for frames only while a flight, its landing tail
 * or that walk is on screen.
 * `e2e/worlds.spec.ts` measures exactly that — but *not* by counting `requestAnimationFrame`
 * page-wide, which cannot express the claim here: the companion cats hold a
 * 60 Hz loop of their own open on this page, so a page-wide count would fail
 * against a perfect globe. Its `measureGlobeFrames` attributes frames to this
 * canvas instead (`clearRect` calls on it, which nothing else draws to), and
 * `expectAtRest` asserts both halves: the globe drew nothing, and the page's
 * frame rate stayed inside a single loop. Nothing here moves forever, for the
 * same reason: a decoration that never stops is a decoration that never lets
 * the CPU sleep.
 *
 * ## The rule about time
 *
 * Every rate in this file is per **reference frame** — one 60 Hz frame — and
 * `step()` scales all of them by how long the last callback actually covered.
 * A rate added here without that scaling is a beat whose length is a property
 * of the visitor's display: the landing was exactly that until this commit,
 * two thirds of a second at 60 Hz and twice that at 33. The constants block
 * below states the two rules for adding one.
 *
 * The stage can also ask the loop to stop early: `settle()`, called when the
 * stage leaves the viewport or when the stage stops the replay, puts what is
 * still moving at its end (a played flight lands, a robot mid-walk finishes
 * and leaves, an easing camera arrives) in one draw
 * and cancels the pending frame, so nothing animates for a visitor who has
 * scrolled away. Two
 * things it leaves to the visitor: a drag still held (the release wakes the
 * loop), and a crossing dragged part-way.
 *
 * The crossing is exempt from the loop entirely, and only under
 * `prefers-reduced-motion: reduce`: "Replay the flight", or the stage's single
 * landing on first sight (it never replays there), then produces the
 * finished frame — crossing drawn, the robot standing still and lit, view on
 * the arrival pin — from a single synchronous `draw()`, with no frame
 * requested at all. The robot never walks under reduced motion: every landing
 * puts it straight at the end of its walk, and it stays there as the still.
 * With motion, the robot, its Sun or Moon and the lit cities are on the globe
 * only while it walks. That is
 * not a cheaper animation; it is the outcome.
 *
 * ## Colour
 *
 * A canvas cannot carry a class, so the semantic aliases are read at draw time
 * off **the canvas element itself** — not off `document.documentElement`. That
 * distinction is load-bearing here rather than pedantic: `globals.css` puts
 * the quiet set on `:root` *and* on `.tone-base`/`.tone-deep`, but `.tone-deep`
 * then repoints `--ground` a half-step darker, and this section is
 * `tone="deep"`. A palette read off the root would draw every knockout in
 * `--color-paper` on a `--color-paper-deep` ground — visible pale patches under
 * every pin and the robot — and would freeze the canvas into one tone, which
 * is the exact bug the alias layer exists to prevent. `getComputedStyle` on the
 * canvas resolves the inherited aliases for whichever tone actually encloses
 * it. Never a raw `--color-*` token, never a hex.
 *
 * A theme switch at rest produces no frame, so a MutationObserver on
 * `data-theme` and a `prefers-color-scheme` listener each trigger exactly one
 * redraw.
 *
 * ## Accessibility
 *
 * The canvas is `aria-hidden`. Every stop it pins is also a button in the
 * stage beside it, which is the real feature — so there is deliberately no DOM
 * control on the canvas at all, and no tab stop that can point at a pin
 * currently on the far side of the planet. The stage's focus, its
 * `role="group"` and its keyboard handler live in `WorldsStage.tsx`, which
 * drives this file through the `GlobeControls` object handed back by
 * `onReady`.
 */

interface GlobeCanvasProps {
  /** The three stops, each drawn as a pin. */
  readonly stops: readonly OriginStop[];
  /** The stop whose pin is accent and labelled, or null for none. */
  readonly activeStopId: OriginStop["id"] | null;
  readonly onLanded: () => void;
  readonly onReady: (controls: GlobeControls | null) => void;
  /** True while a GL surface is drawing the planet; false once it has gone
   *  for good (no WebGL2, a failed program, a lost context, forced colours). */
  readonly onSurfaceChange: (live: boolean) => void;
}

const DEG = Math.PI / 180;

/** The GL surface's coverage texture, baked by `pnpm bake:coastline`, so first
 *  entry costs an off-thread decode and an upload rather than rasterising 8 MB
 *  here. */
export const COASTLINE_PNG = "/globe/coastline.png";

/** Radians of eastward roll that completes the crossing. Tuned in the mockup:
 *  a comfortable phone-width swipe gets you most of the way, so the moment is
 *  discoverable by accident, which is the point of coupling it to the drag at
 *  all. */
const EAST_FOR_FLIGHT = 2.6;


/** Below this, inertia is over. Chosen so a flick settles inside the 1.5s the
 *  spec asks for at the decay rate below. */
const REST_EPSILON = 4e-4;
const DECAY = 0.93;

/**
 * Every rate in this file is written **per reference frame**, not per
 * callback.
 *
 * `step()` measures how long the last callback actually covered, divides by
 * `FRAME_MS`, and scales all of them — so `1 / 130`, `0.13`, `0.1` and
 * `DECAY` still mean exactly what they meant when they were tuned on a 60 Hz
 * display, and mean the same thing on every other one. This is not a
 * refinement: before it, the whole landing was two thirds of a second only at
 * 60 Hz — twice that at 33, half at 120 — because its beats were counted in
 * callbacks. A moment whose length is a property of the visitor's hardware is
 * a moment nobody tuned.
 *
 * Two rules for adding a rate here. Write it per reference frame and multiply
 * it by `frames`; and if it eases toward something rather than advancing
 * along a timeline, compound it with `easeFraction` rather than multiplying
 * the coefficient, which overshoots when a frame runs long.
 */
const FLIGHT_FRAMES = 130;

/** Without a GL surface the overlay draws the robot's lights itself, at every
 *  Nth coastline vertex: a few hundred points, and only while the robot is
 *  out, so the fallback globe shows the same walk the GL one does. */
const FALLBACK_LIGHT_STRIDE = 24;

/** Where the Moon or Sun hangs, in sphere radii from the globe's centre:
 *  upper left, outside the limb. */
const SKY_BODY = { x: -0.97, y: -1.02 } as const;

/** A canvas label's halo, in CSS pixels. Measured, not judged by eye, back
 *  when the globe wore skins: at 3.5 a label fell to 1.7:1 against the pixels
 *  touching its letters (Desert, night), and 4.5 still left 3.9:1 on a pale
 *  planet; 5 held 4.5:1 under every skin in both themes. The one look the
 *  surface draws now is gentler than any of those. Wider would start to blot
 *  out the pin beside a label. */
const HALO_PX = 5;

const GRATICULE = graticule(30);
// 72 segments, as `crossingKm()` in `src/lib/origin-stops.ts` uses (its
// length does not depend on them), so the arc drawn here and the distance
// printed beside it describe one curve. The figure is not recomputed here.
const CROSSING: GreatCircle = greatCircle(origin.coordinates.from, origin.coordinates.to, 72);

/** Not a working CSS fallback list (see the note on `--font-mono` in
 *  `globals.css`) but a real one here: this string is handed to `ctx.font`
 *  directly, where comma-separated families do fall through. */
const MONO_FALLBACK = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';

/**
 * The mono family, as a literal font shorthand can use it.
 *
 * `--font-mono` is the real token name — `layout.tsx` hands it to next/font's
 * `variable` option and `globals.css` registers the same name as a Tailwind
 * theme key (verified, not assumed). What that resolves to is one or two
 * generated family names with no generic at the end, so the fallback stack is
 * appended rather than used only when the lookup comes back empty: a canvas
 * asked for a font that has not finished loading silently draws in its default
 * sans, and 9px sans where 9px mono was designed is the kind of wrong that
 * nobody files a bug about.
 */
function monoFamily(element: Element): string {
  const value = getComputedStyle(element).getPropertyValue("--font-mono").trim();
  return value ? `${value}, ${MONO_FALLBACK}` : MONO_FALLBACK;
}

/**
 * Read at press time rather than cached in a listener, because the answer only
 * matters at the one moment it is asked: a visitor who changes the setting
 * mid-visit gets the new answer on their next press without this file holding
 * a subscription it would otherwise have to tear down.
 */
function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Start the robot's walk, the moment a landing happens: one walk per landing,
 * whichever way the crossing completed (played, dragged, keyed, or landed
 * early by `focusStop`). Under reduced motion it does not walk — it is put at
 * the walk's end, still and lit, in the frame the landing draws.
 */
function startWalk(v: { robot: number; walking: boolean }) {
  if (reducedMotion()) {
    v.robot = ROBOT_STILL;
    v.walking = false;
  } else {
    v.robot = 0;
    v.walking = true;
  }
}

export default function GlobeCanvas({
  stops,
  activeStopId,
  onLanded,
  onReady,
  onSurfaceChange,
}: GlobeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeStopIdRef = useRef(activeStopId);
  const onLandedRef = useRef(onLanded);
  const onSurfaceChangeRef = useRef(onSurfaceChange);

  /* The GL surface under the overlay. `surface` says whether its element is
     rendered at all; it starts true and only ever goes false, because every
     reason to drop it (no WebGL2, a failed program, a lost context, forced
     colours) is a reason not to try again on this visit. `sphereRef` holds the
     live renderer and the colour strings it was last given. */
  const surfaceRef = useRef<HTMLCanvasElement>(null);
  const [surface, setSurface] = useState(true);
  const sphereRef = useRef<{ sphere: Sphere; key: string } | null>(null);

  // One mutable bag, deliberately. See the file's own note on why none of this
  // is React state.
  const view = useRef({
    spin: -origin.coordinates.from.lon * DEG,
    tilt: -12 * DEG,
    vSpin: 0,
    vTilt: 0,
    drag: null as { x: number; y: number; at: number; moved: number } | null,
    target: null as { spin: number; tilt: number } | null,
    flight: 0,
    landed: false,
    /** True only while `fly()` is playing the crossing itself. It suppresses
     *  the target/drag/inertia branch outright rather than competing with it:
     *  two things steering the same two angles is a flight that fights the
     *  hand that started it. */
    playing: false,
    /** The robot's walk across both laps, 0→1, or -1 when no robot is out:
     *  before a landing and again once its walk is over. Under reduced motion
     *  it holds `ROBOT_STILL` from the landing on instead. `walking` is true
     *  only while `step()` is advancing it. */
    robot: -1,
    walking: false,
    running: false,
    /** The pending `requestAnimationFrame` id, or 0. Kept in the bag rather
     *  than closed over by `start` so the unmount effect can reach it however
     *  many spin-downs ago it was scheduled. */
    frame: 0,
    /** The timestamp of the previous animation callback, or 0 for "the loop
     *  just woke". Cleared every time the loop stops, because the gap across
     *  a rest — seconds, or an afternoon — is not elapsed animation time and
     *  must not be handed to `frameStep` as if it were. */
    last: 0,
    size: { width: 0, height: 0 },
    stroke: { cx: 0, cy: 0, radius: 0 } as Viewport,
    /** The same disc in device pixels, for the GL surface. */
    device: { width: 0, height: 0, cx: 0, cy: 0, radius: 0 } as SphereView,
  });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const v = view.current;
    const c = palette(canvas);
    const { width, height } = v.size;
    const geo = v.stroke;
    // `ctx.font` cannot resolve a CSS variable — a canvas given
    // `600 9px var(--font-mono)` silently falls back to its default sans. So
    // the family is read off the element once per draw and interpolated in.
    const mono = monoFamily(canvas);

    ctx.clearRect(0, 0, width, height);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const at = (point: GeoPoint) => project(toVector(point), v.spin, v.tilt, geo);
    const polyline = (points: readonly GeoPoint[]) => {
      let previous: { x: number; y: number; front: boolean } | null = null;
      for (const point of points) {
        const p = at(point);
        // The pen lifts at the limb rather than drawing a chord across the
        // planet — the one thing that separates a wireframe globe from a
        // scribble.
        if (previous && previous.front && p.front) {
          ctx.moveTo(previous.x, previous.y);
          ctx.lineTo(p.x, p.y);
        }
        previous = p;
      }
    };
    const glyph = (d: string, x: number, y: number, scale: number, colour: string, weight: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.strokeStyle = colour;
      ctx.lineWidth = weight / scale;
      ctx.stroke(new Path2D(d));
      ctx.restore();
    };
    /* Every word on the canvas goes through here. A label lands on whatever
       the planet is under it, so each one is first stroked in the section's
       own ground: the standard map-label halo. The text then reads against
       the halo, not the planet. One path for GL and fallback. */
    const label = (text: string, x: number, y: number, ink: string) => {
      if (c.halo) {
        ctx.save();
        ctx.strokeStyle = c.halo;
        // CSS pixels: the context is already scaled by the device ratio.
        ctx.lineWidth = HALO_PX;
        ctx.lineJoin = "round";
        ctx.strokeText(text, x, y);
        ctx.restore();
      }
      ctx.fillStyle = ink;
      ctx.fillText(text, x, y);
    };

    /* The planet's surface, when a GL surface is live: the fill and the
       coastlines, from the same spin and tilt as every stroke below, in the
       same call as the overlay's own draw. That is the whole of its render
       loop — it never asks for a frame of its own, so it rests when this does. */
    const held = sphereRef.current;
    if (held) {
      const read = sphereColors(canvas);
      if (read.key !== held.key && read.colors) {
        held.sphere.setColors(read.colors);
        held.key = read.key;
      }
      held.sphere.draw({ spin: v.spin, tilt: v.tilt, robot: v.robot }, v.device);
    }

    /* The ball: limb, graticule, and — only when there is no GL surface to
       draw them — the coastlines. */
    ctx.strokeStyle = c.subtle;
    ctx.beginPath();
    ctx.arc(geo.cx, geo.cy, geo.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = c.rule;
    ctx.beginPath();
    for (const line of GRATICULE) polyline(line);
    ctx.stroke();

    if (!held) {
      ctx.strokeStyle = c.subtle;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      for (const ring of COASTLINES) {
        let previous: { x: number; y: number; front: boolean } | null = null;
        for (let i = 0; i < ring.length; i += 2) {
          const p = at({ lon: ring[i], lat: ring[i + 1] });
          if (previous && previous.front && p.front) {
            ctx.moveTo(previous.x, previous.y);
            ctx.lineTo(p.x, p.y);
          }
          previous = p;
        }
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    /* The crossing, drawn only as far as he has flown. */
    if (v.flight > 0) {
      const upTo = Math.max(1, Math.floor(v.flight * (CROSSING.points.length - 1)));
      ctx.strokeStyle = c.accent;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      let previous: { x: number; y: number; front: boolean } | null = null;
      for (let i = 0; i <= upTo; i += 1) {
        const p = project(CROSSING.points[i], v.spin, v.tilt, geo);
        if (previous && previous.front && p.front) {
          ctx.moveTo(previous.x, previous.y);
          ctx.lineTo(p.x, p.y);
        }
        previous = p;
      }
      ctx.stroke();
      ctx.setLineDash([]);

      /* The bird, at the head of the line he has drawn. */
      if (v.flight < 1) {
        const index = Math.min(CROSSING.points.length - 2, upTo);
        const a = project(CROSSING.points[index], v.spin, v.tilt, geo);
        const b = project(CROSSING.points[index + 1], v.spin, v.tilt, geo);
        if (a.front) {
          ctx.save();
          ctx.translate(a.x, a.y);
          ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));
          // Four strokes and a wingbeat: the vertical squash is the flap, and
          // it is driven by how far along he is rather than by a clock, so a
          // slow drag gives slow wingbeats.
          const flap = 0.5 + 0.5 * Math.abs(Math.sin(v.flight * 34));
          ctx.scale(1.5, 1.5 * flap);
          ctx.strokeStyle = c.fg;
          ctx.lineWidth = 1.3 / 1.5;
          ctx.stroke(new Path2D(GLYPHS.bird));
          ctx.restore();
        }
      }
    }

    /* The three stops. An inactive stop is a small ink dot; the active one is
       an accent ring, larger, and the only one labelled, so it is never told
       apart by hue alone. The active pin is drawn last, over a ground
       knockout: Taylors and the University of South Carolina are ~140 km
       apart, which is 4–6 px at these sizes, so the two Carolina pins are one
       mark at a time rather than two that collide — the knockout covers the
       other, and the list beside the globe says which stop it is. Far-side
       pins are not drawn at all rather than faded: a pin you can half-see is
       a pin you try to press. */
    const pin = (stop: OriginStop, active: boolean) => {
      const p = at(stop.coordinates);
      if (!p.front) return;
      const scale = 0.62 + 0.32 * p.depth;
      ctx.fillStyle = c.ground;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (active ? 7 : 3.2) * scale, 0, Math.PI * 2);
      ctx.fill();
      if (active) {
        ctx.strokeStyle = c.accent;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      ctx.fillStyle = active ? c.accent : c.fg;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (active ? 1.6 : 1.8) * scale, 0, Math.PI * 2);
      ctx.fill();
      if (active) {
        // Toward the middle of the disc, so a long place name near the limb
        // stays on the canvas.
        const left = p.x > geo.cx;
        const radius = 7 * scale;
        ctx.font = `600 9.5px ${mono}`;
        ctx.textAlign = left ? "right" : "left";
        label(stop.place.toUpperCase(), left ? p.x - radius - 5 : p.x + radius + 5, p.y + 3.4, c.accent);
      }
    };
    const activeStop = stops.find((stop) => stop.id === activeStopIdRef.current);
    for (const stop of stops) if (stop !== activeStop) pin(stop, false);
    if (activeStop) pin(activeStop, true);

    /* The robot, walking the equator, and — only when no GL surface is there
       to shade them — the lights it puts out and brings back. Ink, not
       accent: both are drawings that carry no fact. */
    const lights = robotLights(v.robot);
    if (lights) {
      if (!held) {
        ctx.fillStyle = c.fg;
        for (const ring of COASTLINES) {
          for (let i = 0; i < ring.length; i += 2 * FALLBACK_LIGHT_STRIDE) {
            const level = lightLevel(lights, ring[i]);
            if (level <= 0) continue;
            const p = at({ lon: ring[i], lat: ring[i + 1] });
            if (!p.front) continue;
            ctx.globalAlpha = Math.min(1, level * 0.6);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1 + 0.6 * level, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      }
      const p = at({ lon: lights.lonDegrees, lat: 0 });
      if (p.front) {
        const scale = 0.62 + 0.32 * p.depth;
        ctx.fillStyle = c.ground;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 13 * scale, 0, Math.PI * 2);
        ctx.fill();
        glyph(GLYPHS.robot, p.x, p.y, scale * 0.8, c.fg, 1.2);
      }
      const body = robotSky(v.robot);
      if (body) {
        const bx = geo.cx + SKY_BODY.x * geo.radius;
        const by = geo.cy + SKY_BODY.y * geo.radius;
        ctx.fillStyle = c.ground;
        ctx.beginPath();
        ctx.arc(bx, by, 19, 0, Math.PI * 2);
        ctx.fill();
        glyph(GLYPHS[body], bx, by, 1.3, c.fg, 1.4);
      }
    }

  }, [stops]);

  /**
   * Wake the loop, if it is not already awake. `view.running` is the whole
   * mutual exclusion: every entry point (a press, a release, a key, a control)
   * calls this, and only the first one of them starts a frame.
   *
   * The step is a plain function declaration nested inside, rather than its
   * own `useCallback` beside this one. A loop has to name itself to schedule
   * its next frame, and a hook-declared value referenced inside its own
   * initialiser is a temporal-dead-zone hazard that `react-hooks/immutability`
   * rejects outright. A hoisted declaration has no such zone, and nesting it
   * here says the true thing about its lifetime: it exists for the duration of
   * one spin-down, not for the lifetime of the component.
   */
  const start = useCallback(() => {
    const v = view.current;
    if (v.running) return;
    v.running = true;

    function step(time: number) {
      // This callback has fired, so there is nothing pending to cancel until
      // the tail of this function schedules the next one.
      v.frame = 0;
      let busy = false;

      /* How much of one 60 Hz frame this callback covers, which is what every
         rate below is multiplied by. `frames` is 1 on the display these
         numbers were tuned on, ~2 on a 30 Hz phone, ~0.5 on a 120 Hz laptop,
         and `frameStep` caps it at three so a tab returning from the
         background resumes the animation rather than teleporting it. The
         first callback after a wake has no previous timestamp to subtract, and
         takes 1: guessing a full frame for the one frame nobody can measure is
         the same guess the whole loop used to make for all of them. */
      const frames = v.last === 0 ? 1 : frameStep(time - v.last);
      v.last = time;

      if (v.playing) {
        // 130 reference frames — about 2.2 seconds, and now the same 2.2
        // seconds on any display. The camera follows the bird rather than the
        // bird following a camera: spin and tilt chase the point he is
        // currently over, which is what makes the played version look like the
        // dragged one.
        v.flight = Math.min(1, v.flight + frames / FLIGHT_FRAMES);
        const point = toGeo(CROSSING.points[Math.floor(v.flight * (CROSSING.points.length - 1))]);
        const delta = Math.atan2(
          Math.sin(-point.lon * DEG - v.spin),
          Math.cos(-point.lon * DEG - v.spin),
        );
        // Compounded, not multiplied. The bird advances `frames` times as far
        // per callback and `easeFraction` closes correspondingly more of the
        // gap, so the camera trails him by roughly the same amount whatever
        // the display is doing — simulated against the real crossing, the
        // residual at the last frame is 7.64° of spin at 60 Hz and stays in
        // 5.9–8.6° across 20–120 Hz.
        //
        // The benefit is the *tail's duration*, not a smaller lag: a naive
        // `0.1 * frames` closes more of the gap per callback at low frame
        // rates, so it actually ends a little closer (7.27° at 33 Hz against
        // 7.79° here) and a little further away at high ones, and the settle
        // that follows runs 409–546 ms instead of the 476–538 ms compounding
        // holds it to. One rule for every rate in this file rather than an
        // exception here — see `easeFraction`'s own comment in
        // `src/lib/globe.ts` for the form that does overshoot.
        const chase = easeFraction(0.1, frames);
        v.spin += delta * chase;
        v.tilt += (clampTilt(-point.lat * DEG * 0.55) - v.tilt) * chase;
        busy = true;
        if (v.flight >= 1) {
          v.playing = false;
          v.landed = true;
          startWalk(v);
          // Chasing at 0.1 a reference frame against a bird covering ~1.2° of
          // one leaves the camera short of him, and this is the frame the
          // chase stops — so without this the planet would rest a few degrees
          // off the pin it just drew a line to, and the played landing would
          // not be the same frame the reduced-motion one produces. Simulated
          // against the real crossing, the residual is 7.64° of spin (0.133
          // rad) at 60 Hz, and 5.9–8.6° across 20–120 Hz.
          //
          // Handed to `target` rather than snapped: easing 0.133 rad down to
          // 0.002 at 0.13 a reference frame takes ~502 ms (517 ms measured,
          // tilt included), so the last few degrees arrive smoothly and still
          // land exactly on the pin — 476–538 ms across 20–120 Hz, since the
          // easing is wall-clock. One landing, one resting position, whichever
          // way you got there.
          v.target = {
            spin: -origin.coordinates.to.lon * DEG,
            tilt: clampTilt(-origin.coordinates.to.lat * DEG * 0.55),
          };
          onLandedRef.current();
        }
      }

      if (v.walking) {
        // The whole walk in `ROBOT_WALK_FRAMES` reference frames. Its last
        // frame is drawn lit; then the robot, its Sun and its lights leave,
        // the planet is plain again, and the loop stops.
        if (v.robot >= 1) {
          v.robot = -1;
          v.walking = false;
        } else {
          v.robot = Math.min(1, v.robot + frames / ROBOT_WALK_FRAMES);
        }
        busy = true;
      }

      // Suppressed while a flight is playing: the played crossing owns both
      // angles for its two seconds, and letting inertia or a queued `target`
      // pull at them at the same time is how a flight ends up landing
      // somewhere other than the pin it drew a line to.
      if (!v.playing) {
        if (v.target) {
          const dSpin = Math.atan2(
            Math.sin(v.target.spin - v.spin),
            Math.cos(v.target.spin - v.spin),
          );
          const dTilt = v.target.tilt - v.tilt;
          // The camera's one easing, and every other camera move in the file
          // goes through it. Compounded for the same reason the chase above
          // is: a long frame must close *more* of the gap, but an easing that
          // multiplied its coefficient by three would close 0.39 of it in one
          // step and read as a lurch, and a slower easing scaled the same way
          // would eventually close more than all of it and overshoot the pin.
          const settle = easeFraction(0.13, frames);
          v.spin += dSpin * settle;
          v.tilt += dTilt * settle;
          if (Math.abs(dSpin) > 0.002 || Math.abs(dTilt) > 0.002) busy = true;
          else v.target = null;
        } else if (v.drag) {
          busy = true;
        } else {
          // `vSpin` is radians per reference frame — `move()` divides by the
          // real time the pointer took, so the flick's speed is already a
          // wall-clock measurement and only its playback was not.
          v.spin += v.vSpin * frames;
          v.tilt += v.vTilt * frames;
          const decay = Math.pow(DECAY, frames);
          v.vSpin *= decay;
          v.vTilt *= decay;
          if (Math.abs(v.vSpin) > REST_EPSILON || Math.abs(v.vTilt) > REST_EPSILON) busy = true;
          else {
            v.vSpin = 0;
            v.vTilt = 0;
          }
        }
      }

      v.tilt = clampTilt(v.tilt);
      // Unconditional, and `e2e/worlds.spec.ts` depends on it being so: its
      // `measureGlobeFrames()` counts this canvas's `clearRect` calls as the number
      // of frames this loop ran, because it cannot see them any other way (the
      // page's own rAF count is dominated by another component's loop). Put an
      // early return above this line, or draw on only every Nth frame, and
      // that assertion quietly stops measuring anything — so if this ever
      // needs to change, change the measurement in that spec with it. It
      // asserts the one-draw-per-frame identity directly while the globe is
      // moving, which is the tripwire for exactly that edit.
      draw();

      if (busy) {
        v.frame = requestAnimationFrame(step);
      } else {
        v.running = false;
        // A fresh clock for the next wake. The gap across a rest is however
        // long the visitor looked away for, and handing that to `frameStep` as
        // elapsed animation time would spend the clamp on the first frame of
        // every gesture instead of on the one case it is for.
        v.last = 0;
      }
    }

    v.frame = requestAnimationFrame(step);
  }, [draw]);

  /**
   * Point the camera at a place: eased over about a second, or *there already*
   * when the visitor has asked for reduced motion.
   *
   * Every camera move that is not the flight itself goes through this — a
   * stop via `focusStop`, `reset`, and a single click on bare planet. That
   * last one is the reason this is one helper rather than a branch inside
   * `fly()`: click-to-orient is the section's declared WCAG 2.5.7 substitute
   * for dragging, the path a visitor on a head pointer or eye-gaze actually
   * uses, and leaving it easing while the buttons snapped would have meant
   * that visitor had no non-animating way to move the globe at all. The swing
   * between the first two stops is also the ~156° "Replay the flight" refuses
   * to animate, so refusing it there and performing it here was never
   * coherent.
   *
   * Reduced motion draws once, synchronously, and never calls `start()`: no
   * frame is requested to produce the result.
   */
  const lookAt = useCallback(
    (spin: number, tilt: number) => {
      const v = view.current;
      v.vSpin = 0;
      v.vTilt = 0;
      if (reducedMotion()) {
        v.target = null;
        v.spin = spin;
        v.tilt = clampTilt(tilt);
        draw();
        return;
      }
      v.target = { spin, tilt: clampTilt(tilt) };
      start();
    },
    [draw, start],
  );

  /* Unmount. A spin-down in flight is a ~2s tail that would draw into a canvas
     that has gone, which `draw()`'s own null guard makes harmless — but an
     unmount *mid-drag* is not harmless, and it is reachable by a client-side
     navigation or a hot reload while a finger is down. The pointer listeners
     tear down with the effect below, so `release` never runs, `v.drag` stays
     set, `busy` stays true, and the loop reschedules itself forever against a
     dead canvas: invisible, because every pass early-returns before drawing.
     That is precisely the failure this file's header promises cannot happen,
     so it is cancelled rather than argued about. */
  useEffect(() => {
    // Captured here rather than read in the cleanup, which is what
    // `react-hooks/exhaustive-deps` asks for — and it is sound rather than
    // merely quiet: this ref holds one mutable bag created at mount and never
    // reassigned, so `v` in the cleanup is the same object the loop is
    // mutating. (The rule's real target is a ref pointing at a React-rendered
    // node, which can legitimately have changed by teardown.)
    const v = view.current;
    return () => {
      if (v.frame) cancelAnimationFrame(v.frame);
      v.frame = 0;
      v.drag = null;
      // Same hazard as the stranded drag, one flight along: a played crossing
      // torn down mid-air leaves `playing` true in a bag that survives the
      // teardown (StrictMode's remount reuses this very object), and the next
      // `start()` would resume a flight nobody asked for — with the
      // drag/inertia branch suppressed under it, so the planet would also
      // ignore the hand that woke it.
      v.playing = false;
      // And a walk torn down mid-lap ends where `settle()` would end it —
      // over, robot gone — rather than frozen part-way with nothing left to
      // advance it.
      if (v.walking) {
        v.walking = false;
        v.robot = -1;
      }
      v.running = false;
      // Same bag, same reason: a timestamp from before the teardown is not
      // elapsed animation time for whatever the remount does next.
      v.last = 0;
    };
  }, []);

  /* Sizing. Measured from the element, drawn at the device ratio, capped at 2
     — past that a hairline stops being a hairline and the fill rate is spent
     on nothing a reader can see. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const v = view.current;
      v.size = { width: rect.width, height: rect.height };
      v.stroke = globeStroke(rect.width, rect.height);
      // One helper sizes both buffers, so the shaded disc and the strokes on
      // top of it are the same disc at every size and ratio.
      v.device = sphereView(rect.width, rect.height, ratio);
      canvas.width = v.device.width;
      canvas.height = v.device.height;
      const surfaceCanvas = surfaceRef.current;
      if (surfaceCanvas) {
        surfaceCanvas.width = v.device.width;
        surfaceCanvas.height = v.device.height;
      }
      const ctx = canvas.getContext("2d");
      ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw();
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, [draw]);

  /* The latest `draw`, for the surface effect below. That effect must run once
     per mount, not once per `draw` identity: re-running it re-compiles the
     program and re-uploads the texture. */
  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  /* The GL surface: acquire, build, decide — and keep deciding. `pickSurface`
     makes the call at mount; a lost context or forced colours switching on
     later make the same call again, the same way. Falling back removes the
     element and redraws the overlay with its coastlines, which is the globe
     that shipped before there was a surface at all. Declared after the sizing
     effect so the surface already has its size when the first draw lands. */
  useEffect(() => {
    const element = surfaceRef.current;
    const overlay = canvasRef.current;
    if (!element || !overlay) return;
    const forced = window.matchMedia("(forced-colors: active)");
    const renderer = acquireRenderer(element);
    const gl = renderer.kind === "webgl" ? renderer.gl : null;
    const read = sphereColors(overlay);
    const colors = read.colors;

    let live = true;
    let sphere: Sphere | null = null;
    // The overlay draws its coastlines for as long as `sphereRef` is unset —
    // from the start, and while the PNG loads — so falling back is only
    // ever taking the empty surface away and telling the stage. `live` makes
    // it once per visit: nothing re-acquires.
    const fallBack = () => {
      if (!live) return;
      live = false;
      sphereRef.current = null;
      sphere?.dispose();
      setSurface(false);
      onSurfaceChangeRef.current(false);
      // At rest nothing else would redraw, and the coastlines have to come
      // back onto the overlay in the same moment the surface leaves.
      drawRef.current();
    };

    if (!gl || !colors || forced.matches) {
      fallBack();
      return;
    }

    const forcedChange = () => {
      if (forced.matches) fallBack();
    };
    // Listening from mount, not from the decode, so a context lost or forced
    // colours switched on while the PNG loads still end the surface.
    element.addEventListener("webglcontextlost", fallBack);
    forced.addEventListener("change", forcedChange);

    // `createImageBitmap` decodes off the main thread, and with these options
    // the bytes arrive as baked, so the upload has nothing left to re-decode.
    // `texImage2D` copies the bitmap to the GPU, so it is closed straight after.
    fetch(COASTLINE_PNG)
      .then((response) => {
        if (!response.ok) throw new Error(`${COASTLINE_PNG}: ${response.status}`);
        return response.blob();
      })
      .then((blob) => createImageBitmap(blob, { premultiplyAlpha: "none", colorSpaceConversion: "none" }))
      .then(
        (bitmap) => {
          if (live) {
            sphere = createSphere(gl, { coverage: bitmap, colors });
            const choice = pickSurface({ gl, program: sphere.program, forcedColors: forced.matches });
            if (choice.useGl) {
              sphereRef.current = { sphere, key: read.key };
              onSurfaceChangeRef.current(true);
              drawRef.current();
            } else {
              fallBack();
            }
          }
          bitmap.close();
        },
        // A PNG that will not load or decode is a fallback like any other.
        fallBack,
      );

    return () => {
      element.removeEventListener("webglcontextlost", fallBack);
      forced.removeEventListener("change", forcedChange);
      // Unmounting is not a fallback: no state to set, nothing to redraw, but
      // the stage still hears that the surface is gone if it was ever live.
      if (!live) return;
      live = false;
      if (sphereRef.current) onSurfaceChangeRef.current(false);
      sphereRef.current = null;
      sphere?.dispose();
    };
  }, []);

  /* A theme switch at rest produces no frame, so ask for exactly one — and the
     same is true of turning High Contrast on, which changes nothing about this
     canvas until it is told to redraw. */
  useEffect(() => {
    const observer = new MutationObserver(() => draw());
    observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
    const queries = [
      window.matchMedia("(prefers-color-scheme: dark)"),
      window.matchMedia("(forced-colors: active)"),
    ];
    const redraw = () => draw();
    for (const query of queries) query.addEventListener("change", redraw);
    return () => {
      observer.disconnect();
      for (const query of queries) query.removeEventListener("change", redraw);
    };
  }, [draw]);

  /* Keep the callback mirrors current, and redraw when the active stop
     changes — its pin changes ink and gains its label, and at rest nothing
     else would ask. The refs are written here rather than during render: a
     render-phase ref write is a side effect in a function React is allowed to
     call twice, and nothing between render and this effect reads them (every
     draw happens in an effect or an event handler, both of which run after
     it). */
  useEffect(() => {
    activeStopIdRef.current = activeStopId;
    onLandedRef.current = onLanded;
    onSurfaceChangeRef.current = onSurfaceChange;
    draw();
  }, [activeStopId, draw, onLanded, onSurfaceChange]);

  /* Pointer: drag to roll, tap to orient, and rolling east flies him. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const v = view.current;

    const down = (event: PointerEvent) => {
      v.drag = { x: event.clientX, y: event.clientY, at: performance.now(), moved: 0 };
      v.target = null;
      v.vSpin = 0;
      v.vTilt = 0;
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // `setPointerCapture` throws NotFoundError — it does not return false
        // — when there is no active pointer with that id: a synthetic
        // PointerEvent, or a pointer the browser released between the event
        // being queued and this handler running. Capture only improves a drag
        // that wanders off the element; it is not a precondition for one, and
        // letting it throw here would skip `start()` and leave the planet
        // frozen under a finger that is already moving.
      }
      start();
    };

    const move = (event: PointerEvent) => {
      if (!v.drag) return;
      const dx = event.clientX - v.drag.x;
      const dy = event.clientY - v.drag.y;
      const k = 1 / Math.max(1, v.stroke.radius);
      v.drag.moved += Math.abs(dx) + Math.abs(dy);
      v.spin += dx * k;
      v.tilt -= dy * k;
      // The signature moment: rolling east advances the crossing by exactly as
      // much as you rolled. You are not watching an animation, you are flying
      // him.
      if (dx > 0 && !v.landed) {
        v.flight = Math.min(1, v.flight + (dx * k) / EAST_FOR_FLIGHT);
        if (v.flight >= 1) {
          v.landed = true;
          startWalk(v);
          onLandedRef.current();
        }
      }
      // Radians per *reference* frame, not per 16 ms: `step()` plays this back
      // as `vSpin * frames`, where `frames` is the callback gap over
      // `FRAME_MS`, so measuring the flick against anything else would make a
      // released drag 4% faster than the hand that threw it. Same number to
      // three significant figures, but one unit rather than two.
      const dt = Math.max(1, performance.now() - v.drag.at);
      v.vSpin = dx * k * (FRAME_MS / dt);
      v.vTilt = -dy * k * (FRAME_MS / dt);
      v.drag.x = event.clientX;
      v.drag.y = event.clientY;
      v.drag.at = performance.now();
    };

    /**
     * `pointerup` and `pointercancel` **tear the gesture down identically**,
     * and that is not a shortcut — the browser sends `pointercancel`, never
     * `pointerup`, the instant it decides the gesture belongs to the page
     * scroll. Handle only `pointerup` and a finger that scrolls away leaves
     * `drag` set forever: the loop stays busy, the planet keeps turning under
     * nobody, and the next tap is interpreted as the continuation of a drag
     * that ended a minute ago.
     *
     * What the two do *not* share is the tap. A cancel with almost no movement
     * is a real and ordinary event — a long-press opening the context menu,
     * palm rejection, a system edge gesture — and it would otherwise satisfy
     * `moved < TAP_SLOP_PX` and swing the planet round, out of a gesture the
     * person abandoned. A cancelled gesture is by definition
     * not a completed one, so only `pointerup` may commit one.
     */
    const release = (event: PointerEvent) => {
      if (!v.drag) return;
      const moved = v.drag.moved;
      v.drag = null;
      if (event.type === "pointerup" && moved < TAP_SLOP_PX) {
        const rect = canvas.getBoundingClientRect();
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;
        // Click-to-orient: a single click on bare planet brings that place
        // round to face you. This is not a convenience — WCAG 2.5.7 (Dragging
        // Movements, AA) requires that everything a drag does be achievable
        // with a single pointer and no drag, for people using a head pointer,
        // eye-gaze or a mouth stick. Keyboard support does not satisfy it;
        // that is 2.1.1, a different criterion. This plus the stop buttons
        // and "Replay the flight" is the non-dragging path through the whole
        // section.
        const place = unproject(px, py, v.spin, v.tilt, v.stroke);
        // Through `lookAt`, so this path honours reduced motion too — it is
        // the one a pointer that cannot hold a drag depends on.
        if (place) lookAt(-place.lon * DEG, -place.lat * DEG * 0.55);
      }
      start();
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", release);
      canvas.removeEventListener("pointercancel", release);
    };
  }, [lookAt, start]);

  /* Hand the controls up, so the stage's focus and buttons can drive a globe
     they do not own. */
  useEffect(() => {
    const controls: GlobeControls = {
      nudge: (deltaSpin, deltaTilt) => {
        const v = view.current;
        v.target = null;
        v.spin += deltaSpin;
        v.tilt = clampTilt(v.tilt + deltaTilt);
        if (deltaSpin > 0 && !v.landed) {
          v.flight = Math.min(1, v.flight + deltaSpin / EAST_FOR_FLIGHT);
          if (v.flight >= 1) {
            v.landed = true;
            startWalk(v);
            onLandedRef.current();
          }
        }
        start();
      },
      fly: () => {
        const v = view.current;
        v.playing = false;
        v.flight = 0;
        v.landed = false;
        v.robot = -1;
        v.walking = false;
        v.target = null;
        v.vSpin = 0;
        v.vTilt = 0;
        if (reducedMotion()) {
          // Not a lesser version: the finished frame, immediately. Someone who
          // has asked their operating system not to animate things has asked
          // for the outcome, not for a slower animation — so the whole of it
          // arrives in one synchronous draw, and `start()` is never called.
          // `e2e/worlds.spec.ts` installs a `requestAnimationFrame` counter
          // before the press and asserts zero, which is the only way to state
          // "no frames" as something other than a promise in a comment.
          v.flight = 1;
          v.landed = true;
          startWalk(v);
          v.spin = -origin.coordinates.to.lon * DEG;
          v.tilt = clampTilt(-origin.coordinates.to.lat * DEG * 0.55);
          onLandedRef.current();
          draw();
          return;
        }
        v.playing = true;
        start();
      },
      settle: () => {
        const v = view.current;
        // At rest there is nothing to settle and nothing to draw. Mid-drag the
        // loop belongs to the hand holding the planet, and its release wakes
        // the loop again anyway.
        if (!v.running || v.drag) return;
        if (v.frame) cancelAnimationFrame(v.frame);
        v.frame = 0;
        v.running = false;
        v.last = 0;
        const landed = settleMotion(v, {
          spin: -origin.coordinates.to.lon * DEG,
          tilt: clampTilt(-origin.coordinates.to.lat * DEG * 0.55),
        });
        if (landed) onLandedRef.current();
        draw();
      },
      reset: () => {
        const v = view.current;
        v.playing = false;
        v.flight = 0;
        v.landed = false;
        v.robot = -1;
        v.walking = false;
        // Swinging back across the planet from the arrival pin is the same
        // size of motion as flying there, so `lookAt` gives it the same answer
        // under reduced motion that `fly()` gives above.
        lookAt(-origin.coordinates.from.lon * DEG, -12 * DEG);
      },
      focusStop: (id) => {
        const point = stops.find((stop) => stop.id === id)?.coordinates;
        if (!point) return;
        // A stop chosen mid-flight would otherwise be dropped: `step()`
        // ignores `target` while the flight plays, then its landing overwrites
        // `target` with the arrival pin. So land the flight here, where it is,
        // and let the camera ease from there to the stop.
        const v = view.current;
        if (v.playing) {
          v.playing = false;
          v.flight = 1;
          v.landed = true;
          startWalk(v);
          onLandedRef.current();
        }
        lookAt(-point.lon * DEG, -point.lat * DEG * 0.55);
      },
    };
    onReady(controls);
    return () => onReady(null);
  }, [draw, lookAt, onReady, start, stops]);

  return (
    <>
      {surface ? (
        // Under the overlay by document order, and never a pointer target:
        // every press belongs to the canvas above it.
        <canvas
          ref={surfaceRef}
          aria-hidden="true"
          data-globe-surface=""
          className="pointer-events-none absolute inset-0 block h-full w-full"
        />
      ) : null}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        // The one string `e2e/worlds.spec.ts` recognises this chunk by. Bundlers
        // name chunks however they like, so the test reads content, not URLs.
        // Keep it here and nowhere else.
        data-chunk="globe-canvas"
        // Which stop the globe is turned to and labelling, for tests and
        // nothing else: the list's `aria-pressed` is what a visitor hears.
        data-active-stop={activeStopId ?? undefined}
        // pan-y, never none. See WorldsStage.
        className="absolute inset-0 block h-full w-full touch-pan-y"
      />
    </>
  );
}
