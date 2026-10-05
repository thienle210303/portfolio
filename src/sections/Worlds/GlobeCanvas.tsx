"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { companions, origin } from "@/content/portfolio";
import type { GeoPoint } from "@/types/portfolio";
import { coLocatedWorldIds, type ResolvedChapter } from "@/lib/worlds";
import type { GlobeControls } from "./WorldsStage";
import { GLYPHS } from "./glyphs";
import { COASTLINES } from "./coastline-data";
import { acquireRenderer, pickSurface } from "./gl/context";
import { bakeCoastlineTexture, type CoastlineTexture } from "./gl/coastline-texture";
import {
  createSphere,
  globeStroke,
  parseCssColor,
  REST_STATE,
  sphereView,
  type Sphere,
  type SphereColors,
  type SphereView,
} from "./gl/sphere";
import { CHAPTER_INDEX, SKIN_INDEX } from "./gl/shaders";
import {
  lightLevel,
  ROBOT_HOLDS,
  ROBOT_WALK_FRAMES,
  robotLights,
  type RobotHold,
} from "./gl/robot";
import { settleMotion } from "./settle";

/**
 * The planet. No dependency, and zero animation frames once it stops moving.
 *
 * ## Two canvases
 *
 * The 2D canvas (`data-chunk="globe-canvas"`) carries every handler and every
 * stroke with a position: limb, graticule, crossing, bird, markers, satellite,
 * plinth, cats. Under it, when WebGL2 works, a GL surface
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
 * visitor can *ask for* — which world is open — and this file owns what the
 * pixels are doing. The only line between them is `onSelect`, and it fires on
 * a tap, not on a frame.
 *
 * ## The rule about rest
 *
 * `loop()` requests the next frame **only if something is still moving**. When
 * the inertia decays below its threshold and no flight is in progress, the
 * loop returns without scheduling, `view.running` goes false, and the page
 * costs nothing until something wakes it again: the visitor, or once per page
 * load the stage's autoplay of the crossing. `e2e/worlds.spec.ts`
 * measures exactly that — but *not* by counting `requestAnimationFrame`
 * page-wide, which cannot express the claim here: the companion cats hold a
 * 60 Hz loop of their own open on this page, so a page-wide count would fail
 * against a perfect globe. Its `measureGlobeFrames` attributes frames to this
 * canvas instead (`clearRect` calls on it, which nothing else draws to), and
 * `expectAtRest` asserts both halves: the globe drew nothing, and the page's
 * frame rate stayed inside a single loop. The satellite's orbit is
 * deliberately excluded from "something is moving" for exactly this reason: a
 * decoration that never stops is a decoration that never lets the CPU sleep.
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
 * stage leaves the viewport or a chapter is chosen while it is out of view,
 * puts what is still moving at its end (a played flight lands, a robot
 * mid-walk ends lit, an easing camera arrives) in one draw and cancels the
 * pending frame, so nothing animates for a visitor who has scrolled away. Two
 * things it leaves to the visitor: a drag still held (the release wakes the
 * loop), and a crossing dragged part-way.
 *
 * One press is exempt from the loop entirely, and only under
 * `prefers-reduced-motion: reduce`: "Take the flight" then produces the
 * finished frame — crossing drawn, sapling grown, view on the arrival pin —
 * from a single synchronous `draw()`, with no frame requested at all. That is
 * not a cheaper animation; it is the outcome, which is what was asked for.
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
 * the cats and every marker — and would freeze the canvas into one tone, which
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
 * The canvas is `aria-hidden`. Every marker it draws is also a button in the
 * list beside it, which is the real feature — so there is deliberately no DOM
 * control on the canvas at all, and no tab stop that can point at a marker
 * currently on the far side of the planet. The stage's focus, its
 * `role="group"` and its keyboard handler live in `WorldsStage.tsx`, which
 * drives this file through the `GlobeControls` object handed back by
 * `onReady`.
 */

interface GlobeCanvasProps {
  readonly worlds: readonly ResolvedChapter[];
  readonly currentId: string;
  readonly onSelect: (id: string) => void;
  readonly onLanded: () => void;
  readonly onReady: (controls: GlobeControls | null) => void;
  /** The worn skin's id, or null. Only a live GL surface can draw one. */
  readonly skinId: string | null;
  /** True while a GL surface is drawing the planet; false once it has gone
   *  for good (no WebGL2, a failed program, a lost context, forced colours). */
  readonly onSurfaceChange: (live: boolean) => void;
  /** Which still lap Technology shows under reduced motion. */
  readonly robotHold: RobotHold;
}

const DEG = Math.PI / 180;

/** Radians of eastward roll that completes the crossing. Tuned in the mockup:
 *  a comfortable phone-width swipe gets you most of the way, so the moment is
 *  discoverable by accident, which is the point of coupling it to the drag at
 *  all. */
const EAST_FOR_FLIGHT = 2.6;

/** A press that moves less than this is a tap on a marker, not a roll. */
const TAP_SLOP_PX = 6;

/** Below this, inertia is over. Chosen so a flick settles inside the 1.5s the
 *  spec asks for at the decay rate below. */
const REST_EPSILON = 4e-4;
const DECAY = 0.93;

/**
 * Every rate in this file is written **per reference frame**, not per
 * callback.
 *
 * `step()` measures how long the last callback actually covered, divides by
 * `FRAME_MS`, and scales all of them — so `1 / 130`, `1 / 40`, `0.13`, `0.1`,
 * `0.004` and `DECAY` still mean exactly what they meant when they were tuned
 * on a 60 Hz display, and mean the same thing on every other one. This is not
 * a refinement: before it, the whole landing was two thirds of a second only
 * at 60 Hz — twice that at 33, half at 120 — because the seed's growth and the
 * camera's settle were both counted in callbacks. A moment whose length is a
 * property of the visitor's hardware is a moment nobody tuned.
 *
 * Two rules for adding a rate here. Write it per reference frame and multiply
 * it by `frames`; and if it eases toward something rather than advancing
 * along a timeline, compound it with `easeFraction` rather than multiplying
 * the coefficient, which overshoots when a frame runs long.
 */
const FLIGHT_FRAMES = 130;
const SEED_FRAMES = 40;

/** How much of the seed's growth is the seed *falling* rather than the sapling
 *  rising. Two beats out of one number, because that is what the moment is:
 *  something drops, and then something grows from where it dropped.
 *
 *  0.3 of `SEED_FRAMES` is twelve reference frames — 200 ms of falling, then
 *  about 470 ms of rising — and since the seed's clock is wall-clock now, that
 *  split is a real pair of durations rather than a ratio that stretched to
 *  whatever the display felt like. */
const SEED_DROP = 0.3;

/**
 * The world whose marker **is** the sapling the flight plants, rather than a
 * marker standing next to one.
 *
 * This is not a rendering preference, it is what the content layer already
 * says: `plants.where` reads "A sapling on the arrival pin — the seed the bird
 * dropped, one beat later", and `plants.anchor` is `origin-to`, the arrival
 * pin itself. So the landing has to *grow this glyph*. Drawing a second sprout
 * beside it would put two objects on the map both claiming to be the one
 * sapling, which is the kind of thing this section exists not to do.
 */
const SAPLING_WORLD_ID = "plants";

/** The chapter the robot walks. The satellite's hit below uses the same id. */
const TECH_WORLD_ID = "tech";

/** Without a GL surface the overlay draws the robot's lights itself, at every
 *  Nth coastline vertex: a few hundred points, and only while Technology is
 *  open, so the two panel lines stay true on the fallback globe too. */
const FALLBACK_LIGHT_STRIDE = 24;

/** A canvas label's halo, in CSS pixels: wide enough to clear the glyphs of a
 *  9.5px mono label from whatever is under it, narrow enough not to blot out
 *  the marker beside it. */
const HALO_PX = 3.5;

const GRATICULE = graticule(30);
// The same 72 segments the resolver uses, so the arc drawn here and the
// distance printed in the rail describe one curve. The kilometre figure itself
// belongs to `src/lib/worlds.ts` and is not recomputed here.
const CROSSING: GreatCircle = greatCircle(origin.coordinates.from, origin.coordinates.to, 72);

interface Hit {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

interface Palette {
  readonly fg: string;
  readonly muted: string;
  readonly subtle: string;
  readonly accent: string;
  readonly rule: string;
  readonly ground: string;
  /** The ink a label's halo is stroked in, or null for no halo. */
  readonly halo: string | null;
}

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
 * What `seed` becomes at the instant the crossing completes: a hair above zero
 * so the fall-and-grow beat plays, or already **1** — the finished sapling, in
 * the frame it was planted — for someone who asked their operating system not
 * to animate things.
 *
 * All three ways a crossing completes have to agree on this. `fly()` reads
 * the setting itself and never reaches the played path under reduced motion,
 * so `step()`'s landing does not need the branch; a drag east (`move`) and an
 * arrow key (`nudge`) do, and used to set 0.001 unconditionally. The keyboard
 * one is the sharper omission: an arrow key is the non-pointer route through
 * the signature moment, so the visitor most likely to be using it is the one
 * least likely to want 667 ms of growth played at them.
 */
function seedOnLanding(): number {
  return reducedMotion() ? 1 : 0.001;
}

/**
 * The section's own ink, read off the canvas at draw time.
 *
 * The forced-colors branch is not a nicety. In Windows High Contrast the
 * browser overrides CSS colours, but **a canvas bitmap is not touched** — the
 * custom properties still hold their authored values (measured under
 * `forced-colors: active`: `--accent` is still `#1e4e8c`), so a globe that
 * trusted them would draw a mid-blue graticule on a forced black page and the
 * one hue carrying meaning would stop being distinguishable. System colour
 * keywords are the only values the forced palette actually maps, so in that
 * mode the globe is drawn in `CanvasText` on `Canvas`, with `LinkText` for
 * everything blue was doing — that is the slot the forced palette reserves for
 * annotation, which is the whole of what blue means here.
 *
 * Do not assume those keywords resolve to greys. Measured in this Chromium's
 * emulated palette: `Canvas` #ffffff, `CanvasText` #000000, `GrayText`
 * #600000 — a dark red — and `LinkText` #00009f. A real user's theme can map
 * them to anything at all, and that is the point: the theme guarantees they
 * are distinguishable from each other, and nothing else does.
 */
function palette(element: Element): Palette {
  if (window.matchMedia("(forced-colors: active)").matches) {
    return {
      fg: "CanvasText",
      muted: "CanvasText",
      subtle: "GrayText",
      accent: "LinkText",
      rule: "GrayText",
      ground: "Canvas",
      // No halo: the forced-colours globe stays exactly as it was drawn
      // before there were halos.
      halo: null,
    };
  }
  const style = getComputedStyle(element);
  const read = (name: string) => style.getPropertyValue(name).trim();
  return {
    fg: read("--fg"),
    muted: read("--fg-muted"),
    subtle: read("--fg-subtle"),
    accent: read("--accent"),
    rule: read("--rule-color"),
    ground: read("--ground"),
    halo: read("--ground"),
  };
}

/**
 * The GL surface's three inputs, read off the element the same way `palette()`
 * reads the overlay's, so the planet follows the tone it sits in as well as
 * the theme. `key` is the raw strings, for "did anything change since the
 * last upload". `colors` is null when any of them does not parse.
 */
function sphereColors(element: Element): { key: string; colors: SphereColors | null } {
  const style = getComputedStyle(element);
  const ink = style.getPropertyValue("--fg").trim();
  const paper = style.getPropertyValue("--ground").trim();
  const accent = style.getPropertyValue("--accent").trim();
  const parsed = [ink, paper, accent].map(parseCssColor);
  const [i, p, a] = parsed;
  return {
    key: `${ink}|${paper}|${accent}`,
    colors: i && p && a ? { ink: i, paper: p, accent: a } : null,
  };
}

/** Baked once per page: ~40 ms, and the rings never change. */
let coverage: CoastlineTexture | null = null;
function coastlineCoverage(): CoastlineTexture {
  coverage ??= bakeCoastlineTexture(COASTLINES, 2048, 1024);
  return coverage;
}

export default function GlobeCanvas({
  worlds,
  currentId,
  onSelect,
  onLanded,
  onReady,
  skinId,
  onSurfaceChange,
  robotHold,
}: GlobeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentIdRef = useRef(currentId);
  const onSelectRef = useRef(onSelect);
  const onLandedRef = useRef(onLanded);
  const skinIdRef = useRef(skinId);
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
    /** 0 before the landing, then 0→1 across the drop and the sapling's rise.
     *  One number for two beats — see `SEED_DROP`. */
    seed: 0,
    /** True only while `fly()` is playing the crossing itself. It suppresses
     *  the target/drag/inertia branch outright rather than competing with it:
     *  two things steering the same two angles is a flight that fights the
     *  hand that started it. */
    playing: false,
    orbit: 0,
    /** The robot's walk across both laps, 0→1, or -1 while Technology is
     *  closed. `walking` is true only while `step()` is advancing it. */
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
    hits: [] as Hit[],
    size: { width: 0, height: 0 },
    stroke: { cx: 0, cy: 0, radius: 0, plinth: 0 } as Viewport & { plinth: number },
    /** The same disc in device pixels, for the GL surface. */
    device: { width: 0, height: 0, cx: 0, cy: 0, radius: 0 } as SphereView,
  });

  /**
   * World ids whose map point an earlier world already claimed, so the draw
   * loop can step those markers aside instead of overprinting them.
   *
   * The rule itself is `coLocatedWorldIds` in `src/lib/worlds.ts` — kept there
   * because a rule about the content layer's geometry should be testable
   * without a canvas, and this file has none to give it.
   */
  const sharesAPin = useMemo(() => coLocatedWorldIds(worlds), [worlds]);

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
       the planet is under it, and a skin can put that at ~1:1 against the
       ink, so each one is first stroked in the section's own ground: the
       standard map-label halo. The text then reads against the halo, not the
       planet, and the skins keep their look. One path for GL and fallback. */
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

    /* The plinth, hatched below, with the two cats asleep on it. */
    ctx.strokeStyle = c.rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(geo.cx, geo.plinth, geo.radius * 1.05, geo.radius * 0.14, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    for (let i = -6; i <= 6; i += 1) {
      const x = geo.cx + i * (geo.radius / 6.5);
      ctx.moveTo(x, geo.plinth + 13 + Math.abs(i));
      ctx.lineTo(x - 5, geo.plinth + 22 + Math.abs(i));
    }
    ctx.stroke();

    const animalsOpen = currentIdRef.current === "animals";
    const catX = geo.cx - geo.radius * 0.58;
    const catY = geo.plinth - 11;
    // A knockout in the section's own ground, so the cats read as sitting on
    // the plinth rather than being drawn through it.
    ctx.fillStyle = c.ground;
    ctx.beginPath();
    ctx.ellipse(catX + 16, catY + 2, 44, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    glyph(GLYPHS.cat, catX, catY, 1.05, animalsOpen ? c.accent : c.muted, 1.2);
    glyph(GLYPHS.cat, catX + 34, catY + 2, 0.88, animalsOpen ? c.accent : c.subtle, 1.2);
    ctx.font = `600 8.5px ${mono}`;
    ctx.textAlign = "center";
    // Read from the content layer, not typed here: these are the same two names
    // the Animals world's plaques quote, and `companions` order is load-bearing
    // — the lead cat is first, and the lead cat is the larger drawing.
    label((companions[0]?.name ?? "").toUpperCase(), catX, catY + 20, c.subtle);
    label((companions[1]?.name ?? "").toUpperCase(), catX + 34, catY + 20, c.subtle);

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
      const skin = skinIdRef.current;
      held.sphere.draw(
        {
          spin: v.spin,
          tilt: v.tilt,
          chapter: CHAPTER_INDEX[currentIdRef.current] ?? REST_STATE.chapter,
          skin: skin !== null && skin in SKIN_INDEX ? SKIN_INDEX[skin as keyof typeof SKIN_INDEX] : -1,
          crossing: v.flight,
          robot: currentIdRef.current === TECH_WORLD_ID ? v.robot : REST_STATE.robot,
        },
        v.device,
      );
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

    /* The worlds that live on the ball. */
    v.hits = [];
    /** Where this frame drew the sapling's foot, for the falling seed to aim
     *  at. Null while that marker is on the far side. */
    let saplingFoot: { x: number; y: number } | null = null;
    for (const world of worlds) {
      for (const point of world.points) {
        const p = at(point);
        // Far-side markers are not drawn at all rather than faded: a marker you
        // can half-see is a marker you try to press.
        if (!p.front) continue;
        const open = world.id === currentIdRef.current;
        const scale = 0.62 + 0.32 * p.depth;
        // A marker whose point an earlier world already claimed steps a
        // marker-width to the left and takes its name to that side — see
        // `sharesAPin`. Everything right of a ring is where names go, so left of
        // it is the one side nothing else is using.
        const shares = sharesAPin.has(world.id);
        const x = shares ? p.x - 36 * scale : p.x;
        const radius = 15 * scale;
        // How far the sapling has risen, or null for every other marker and for
        // this one before the seed has touched down. `GLYPHS.sprout`'s stem foot
        // is at +9 in its own 24-unit box; the glyph's origin is lifted by
        // `9 * size` so the foot stays planted and the plant gets taller, which
        // is what makes it *rise* rather than inflate.
        const risen =
          world.id === SAPLING_WORLD_ID && v.seed >= SEED_DROP
            ? (v.seed - SEED_DROP) / (1 - SEED_DROP)
            : null;
        const foot = p.y + 9 * scale * 0.82;
        ctx.fillStyle = c.ground;
        ctx.beginPath();
        ctx.arc(x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
        if (risen === null) {
          glyph(GLYPHS[world.glyph], x, p.y, scale * 0.82, open ? c.accent : c.fg, open ? 1.4 : 1.1);
          ctx.beginPath();
          ctx.arc(x, p.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = open ? c.accent : c.rule;
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          /* The page's one hand-off, and the drawing says it before the prose
             does: the career tree grows from this spot. Accent, because it is a
             relationship between two sections rather than decoration — the same
             reason the crossing is accent.

             No ring once it has grown. A ring says "this is a pin, press it";
             a sapling that has actually come up is the thing the pin stood for,
             and it keeps its name and its hit either way, so nothing about
             reaching the world changes.

             But it still has to *say* when it is the open world, and say it with
             something other than colour. Accent is already this glyph's resting
             ink — it is the hand-off, open or not — so unlike every ringed marker
             it cannot use ink to mark selection, and the label alone would leave
             the state signalled by hue only. A ringed marker carries a
             stroke-weight change beside its accent for exactly that reason; this
             one carries the weight change alone. */
          const size = scale * 0.82 * (1 + 0.5 * risen);
          glyph(GLYPHS.sprout, x, foot - 9 * size, size, c.accent, open ? 1.9 : 1.3);
        }
        if (open || p.depth > 0.62) {
          ctx.font = `600 9.5px ${mono}`;
          ctx.textAlign = shares ? "right" : "left";
          label(
            world.name.toUpperCase(),
            shares ? x - radius - 5 : x + radius + 5,
            p.y + 3.4,
            open ? c.accent : c.muted,
          );
        }
        if (world.id === SAPLING_WORLD_ID) saplingFoot = { x, y: foot };
        v.hits.push({ id: world.id, x, y: p.y, r: 18 * scale });
      }
    }

    /* The robot, walking the equator, and — only when no GL surface is there
       to shade them — the lights it puts out and brings back. Ink, not
       accent: both are drawings that carry no fact. */
    const lights = currentIdRef.current === TECH_WORLD_ID ? robotLights(v.robot) : null;
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
    }

    /* The seed, in the one beat between the bird landing and the sapling
       taking: it falls onto the Plants marker, which then grows out of where
       it came to rest. Drawn after the markers so it is never underneath one,
       and aimed at the foot that marker actually got drawn at rather than at a
       position computed twice. */
    if (v.seed > 0 && v.seed < SEED_DROP && saplingFoot) {
      ctx.fillStyle = c.accent;
      ctx.beginPath();
      ctx.arc(saplingFoot.x, saplingFoot.y - 16 * (1 - v.seed / SEED_DROP), 2, 0, Math.PI * 2);
      ctx.fill();
    }

    /* Technology, in orbit, counter-rotating so it always faces you. */
    const orbitCx = geo.cx;
    const orbitCy = geo.cy - geo.radius * 0.55;
    const ox = orbitCx + Math.cos(v.orbit) * geo.radius * 1.16;
    const oy = orbitCy - Math.sin(v.orbit) * geo.radius * 0.34;
    ctx.strokeStyle = c.rule;
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    ctx.ellipse(orbitCx, orbitCy, geo.radius * 1.16, geo.radius * 0.34, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = c.ground;
    ctx.beginPath();
    ctx.arc(ox, oy, 13, 0, Math.PI * 2);
    ctx.fill();
    const techOpen = currentIdRef.current === "tech";
    glyph(GLYPHS.sat, ox, oy, 0.62, techOpen ? c.accent : c.fg, techOpen ? 1.4 : 1.1);
    v.hits.push({ id: "tech", x: ox, y: oy, r: 16 });

    /* Animals: the plinth is its marker. */
    v.hits.push({ id: "animals", x: catX + 16, y: geo.plinth - 9, r: 34 });
  }, [sharesAPin, worlds]);

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

      v.orbit = (v.orbit + 0.004 * frames) % (Math.PI * 2);

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
          v.seed = 0.001;
          // Chasing at 0.1 a reference frame against a bird covering ~1.2° of
          // one leaves the camera short of him, and this is the frame the
          // chase stops — so without this the planet would rest a few degrees
          // off the pin it just drew a line to, and the played landing would
          // not be the same frame the reduced-motion one produces. Simulated
          // against the real crossing, the residual is 7.64° of spin (0.133
          // rad) at 60 Hz, and 5.9–8.6° across 20–120 Hz.
          //
          // Handed to `target` rather than snapped: the seed keeps the loop
          // alive for another 667 ms, and easing 0.133 rad down to 0.002 at
          // 0.13 a reference frame takes ~502 ms (517 ms measured, tilt
          // included), so the last few degrees arrive smoothly and still land
          // exactly on the pin. Both of those are wall-clock now, so the
          // margin between them is the same on every display rather than a
          // coincidence of 60 Hz — at the worst frame rate simulated the
          // settle is 538 ms, still inside the budget. One landing, one
          // resting position, whichever way you got there.
          v.target = {
            spin: -origin.coordinates.to.lon * DEG,
            tilt: clampTilt(-origin.coordinates.to.lat * DEG * 0.55),
          };
          onLandedRef.current();
        }
      }

      if (v.walking) {
        // Both laps in `ROBOT_WALK_FRAMES` reference frames, then it stops at
        // 1, lit, and so does the loop.
        v.robot = Math.min(1, v.robot + frames / ROBOT_WALK_FRAMES);
        if (v.robot >= 1) v.walking = false;
        busy = true;
      }

      if (v.seed > 0 && v.seed < 1) {
        // Forty reference frames: two thirds of a second — long enough to read
        // as growth, short enough that nobody waits for it — on every display
        // rather than on the one this was tuned on.
        //
        // All three ways a seed starts land here, which is why this is the
        // only place the growth needed normalising: `fly()` reaches it through
        // the played crossing above, `nudge()` lights it for the keyboard, and
        // `move()` for a drag east. None of them advances the seed itself;
        // they only light the fuse this branch burns — and under reduced
        // motion all three hand it straight to 1 instead (`seedOnLanding`,
        // and `fly()`'s own branch), so this condition is false and nothing
        // animates at all.
        v.seed = Math.min(1, v.seed + frames / SEED_FRAMES);
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

      // The orbit is *not* a reason to keep the loop alive. See the file note.
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
   * Every camera move that is not the flight itself goes through this — the
   * six list buttons via `focusWorld`, "Face Việt Nam" and `Home` via
   * `reset`, and a single click on bare planet. That last one is the reason
   * this is one helper rather than a branch inside `fly()`: click-to-orient is
   * the section's declared WCAG 2.5.7 substitute for dragging, the path a
   * visitor on a head pointer or eye-gaze actually uses, and leaving it easing
   * while the two buttons snapped would have meant that visitor had no
   * non-animating way to move the globe at all. The swing between Living Earth's
   * two pins is also the ~156° "Take the flight" refuses to animate, so
   * refusing it there and performing it here was never coherent.
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
      // And a walk torn down mid-lap is put back to "not started", not left
      // frozen part-way: the robot effect only starts a walk from -1, so a
      // remount with Technology still open walks it again from the start.
      v.walking = false;
      v.robot = -1;
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
      const stroke = globeStroke(rect.width, rect.height);
      v.stroke = { ...stroke, plinth: stroke.cy + stroke.radius + 26 };
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
    const sphere =
      gl && read.colors ? createSphere(gl, { coverage: coastlineCoverage(), colors: read.colors }) : null;
    const choice = pickSurface({ gl, program: sphere?.program ?? null, forcedColors: forced.matches });

    if (!choice.useGl || !sphere) {
      sphere?.dispose();
      // The overlay has drawn its coastlines from the start, because
      // `sphereRef` was never set; all that is left is to take the empty
      // surface away and tell the stage the skins cannot be worn.
      setSurface(false);
      onSurfaceChangeRef.current(false);
      return;
    }

    let live = true;
    const stop = () => {
      live = false;
      sphereRef.current = null;
      sphere.dispose();
      onSurfaceChangeRef.current(false);
    };
    const fallBack = () => {
      if (!live) return;
      stop();
      setSurface(false);
      // At rest nothing else would redraw, and the coastlines have to come
      // back onto the overlay in the same moment the surface leaves.
      drawRef.current();
    };
    sphereRef.current = { sphere, key: read.key };
    onSurfaceChangeRef.current(true);
    drawRef.current();

    const forcedChange = () => {
      if (forced.matches) fallBack();
    };
    element.addEventListener("webglcontextlost", fallBack);
    forced.addEventListener("change", forcedChange);
    return () => {
      element.removeEventListener("webglcontextlost", fallBack);
      forced.removeEventListener("change", forcedChange);
      if (live) stop();
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

  /* The robot. Opening Technology starts its walk once — both laps, about
     six seconds, ending lit — and leaving stops it, so coming back walks it
     again. Under reduced motion there is no walk: the globe holds whichever
     still lap the stage's toggle has pressed, and the effect below draws it
     once. Declared before that effect so the state is set when it draws. */
  useEffect(() => {
    const v = view.current;
    if (currentId !== TECH_WORLD_ID) {
      v.walking = false;
      v.robot = -1;
      return;
    }
    if (reducedMotion()) {
      v.walking = false;
      v.robot = ROBOT_HOLDS[robotHold];
      return;
    }
    if (v.robot < 0) {
      v.robot = 0;
      v.walking = true;
      start();
    }
  }, [currentId, robotHold, start]);

  /* Keep the callback mirrors current, and redraw when the open world changes
     — the marker and the cats change ink, and at rest nothing else would ask.
     The refs are written here rather than during render: a render-phase ref
     write is a side effect in a function React is allowed to call twice, and
     nothing between render and this effect reads them (every draw happens in
     an effect or an event handler, both of which run after it). */
  useEffect(() => {
    currentIdRef.current = currentId;
    onSelectRef.current = onSelect;
    onLandedRef.current = onLanded;
    skinIdRef.current = skinId;
    onSurfaceChangeRef.current = onSurfaceChange;
    draw();
    // `robotHold` is here only so a press of the stage's toggle redraws: the
    // robot effect above has already put the new still lap in the bag.
  }, [currentId, draw, onLanded, onSelect, onSurfaceChange, robotHold, skinId]);

  /* Pointer: drag to roll, tap to open, and rolling east flies him. */
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
          v.seed = seedOnLanding();
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
     * `moved < TAP_SLOP_PX` and open a world, or swing the planet round, out
     * of a gesture the person abandoned. A cancelled gesture is by definition
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
        let hitSomething = false;
        for (let i = v.hits.length - 1; i >= 0; i -= 1) {
          const hit = v.hits[i];
          if ((px - hit.x) ** 2 + (py - hit.y) ** 2 <= hit.r ** 2) {
            onSelectRef.current(hit.id);
            hitSomething = true;
            break;
          }
        }
        // Click-to-orient: a single click on bare planet brings that place
        // round to face you. This is not a convenience — WCAG 2.5.7 (Dragging
        // Movements, AA) requires that everything a drag does be achievable
        // with a single pointer and no drag, for people using a head pointer,
        // eye-gaze or a mouth stick. Keyboard support does not satisfy it;
        // that is 2.1.1, a different criterion. This plus the six list
        // buttons and "Take the flight" is the non-dragging path through the
        // whole section.
        if (!hitSomething) {
          const place = unproject(px, py, v.spin, v.tilt, v.stroke);
          // Through `lookAt`, so this path honours reduced motion too — it is
          // the one a pointer that cannot hold a drag depends on.
          if (place) lookAt(-place.lon * DEG, -place.lat * DEG * 0.55);
        }
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
            v.seed = seedOnLanding();
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
        v.seed = 0;
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
          v.seed = 1;
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
        v.seed = 0;
        // Swinging back across the planet from the arrival pin is the same
        // size of motion as flying there, so `lookAt` gives it the same answer
        // under reduced motion that `fly()` gives above.
        lookAt(-origin.coordinates.from.lon * DEG, -12 * DEG);
      },
      focusWorld: (id) => {
        const world = worlds.find((candidate) => candidate.id === id);
        const point = world?.points[0];
        if (!point) return;
        // A chapter chosen mid-flight would otherwise be dropped: `step()`
        // ignores `target` while the flight plays, then its landing overwrites
        // `target` with the arrival pin. So land the flight here, where it is,
        // and let the camera ease from there to the chapter.
        const v = view.current;
        if (v.playing) {
          v.playing = false;
          v.flight = 1;
          v.landed = true;
          v.seed = seedOnLanding();
          onLandedRef.current();
        }
        lookAt(-point.lon * DEG, -point.lat * DEG * 0.55);
      },
    };
    onReady(controls);
    return () => onReady(null);
  }, [draw, lookAt, onReady, start, worlds]);

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
        // pan-y, never none. See WorldsStage.
        className="absolute inset-0 block h-full w-full touch-pan-y"
      />
    </>
  );
}
