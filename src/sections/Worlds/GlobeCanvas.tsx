"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  clampTilt,
  graticule,
  greatCircle,
  project,
  toVector,
  unproject,
  type GreatCircle,
  type Viewport,
} from "@/lib/globe";
import { companions, origin } from "@/content/portfolio";
import type { GeoPoint } from "@/types/portfolio";
import type { ResolvedWorld } from "@/lib/worlds";
import type { GlobeControls } from "./WorldsStage";
import { GLYPHS } from "./glyphs";
import { COASTLINES } from "./coastline-data";

/**
 * The planet. No dependency, one canvas, and zero animation frames once it
 * stops moving.
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
 * costs nothing until the visitor touches it again. `e2e/worlds.spec.ts`
 * counts `requestAnimationFrame` callbacks over two seconds at rest and
 * asserts zero. The satellite's orbit is deliberately excluded from
 * "something is moving" for exactly this reason: a decoration that never stops
 * is a decoration that never lets the CPU sleep.
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
  readonly worlds: readonly ResolvedWorld[];
  readonly currentId: string;
  readonly onSelect: (id: string) => void;
  readonly onLanded: () => void;
  readonly onReady: (controls: GlobeControls | null) => void;
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
  };
}

export default function GlobeCanvas({
  worlds,
  currentId,
  onSelect,
  onLanded,
  onReady,
}: GlobeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentIdRef = useRef(currentId);
  const onSelectRef = useRef(onSelect);
  const onLandedRef = useRef(onLanded);

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
    orbit: 0,
    running: false,
    hits: [] as Hit[],
    size: { width: 0, height: 0 },
    stroke: { cx: 0, cy: 0, radius: 0, plinth: 0 } as Viewport & { plinth: number },
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
    ctx.fillStyle = c.subtle;
    ctx.font = `600 8.5px ${mono}`;
    ctx.textAlign = "center";
    // Read from the content layer, not typed here: these are the same two names
    // the Animals world's plaques quote, and `companions` order is load-bearing
    // — the lead cat is first, and the lead cat is the larger drawing.
    ctx.fillText((companions[0]?.name ?? "").toUpperCase(), catX, catY + 20);
    ctx.fillText((companions[1]?.name ?? "").toUpperCase(), catX + 34, catY + 20);

    /* The ball: limb, graticule, coastlines. */
    ctx.strokeStyle = c.subtle;
    ctx.beginPath();
    ctx.arc(geo.cx, geo.cy, geo.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = c.rule;
    ctx.beginPath();
    for (const line of GRATICULE) polyline(line);
    ctx.stroke();

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
    for (const world of worlds) {
      if (!world.point) continue;
      const p = at(world.point);
      // Far-side markers are not drawn at all rather than faded: a marker you
      // can half-see is a marker you try to press.
      if (!p.front) continue;
      const open = world.id === currentIdRef.current;
      const scale = 0.62 + 0.32 * p.depth;
      ctx.fillStyle = c.ground;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 15 * scale, 0, Math.PI * 2);
      ctx.fill();
      glyph(GLYPHS[world.glyph], p.x, p.y, scale * 0.82, open ? c.accent : c.fg, open ? 1.4 : 1.1);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 15 * scale, 0, Math.PI * 2);
      ctx.strokeStyle = open ? c.accent : c.rule;
      ctx.lineWidth = 1;
      ctx.stroke();
      if (open || p.depth > 0.62) {
        ctx.fillStyle = open ? c.accent : c.muted;
        ctx.font = `600 9.5px ${mono}`;
        ctx.textAlign = "left";
        ctx.fillText(world.name.toUpperCase(), p.x + 15 * scale + 5, p.y + 3.4);
      }
      v.hits.push({ id: world.id, x: p.x, y: p.y, r: 18 * scale });
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
  }, [worlds]);

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

    function step() {
      let busy = false;

      v.orbit = (v.orbit + 0.004) % (Math.PI * 2);

      if (v.target) {
        const dSpin = Math.atan2(
          Math.sin(v.target.spin - v.spin),
          Math.cos(v.target.spin - v.spin),
        );
        const dTilt = v.target.tilt - v.tilt;
        v.spin += dSpin * 0.13;
        v.tilt += dTilt * 0.13;
        if (Math.abs(dSpin) > 0.002 || Math.abs(dTilt) > 0.002) busy = true;
        else v.target = null;
      } else if (v.drag) {
        busy = true;
      } else {
        v.spin += v.vSpin;
        v.tilt += v.vTilt;
        v.vSpin *= DECAY;
        v.vTilt *= DECAY;
        if (Math.abs(v.vSpin) > REST_EPSILON || Math.abs(v.vTilt) > REST_EPSILON) busy = true;
        else {
          v.vSpin = 0;
          v.vTilt = 0;
        }
      }

      v.tilt = clampTilt(v.tilt);
      draw();

      // The orbit is *not* a reason to keep the loop alive. See the file note.
      if (busy) requestAnimationFrame(step);
      else v.running = false;
    }

    requestAnimationFrame(step);
  }, [draw]);

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
      v.stroke = {
        cx: rect.width / 2,
        cy: rect.height * 0.44,
        radius: Math.min(rect.width, rect.height * 0.82) * 0.42,
        plinth: rect.height * 0.44 + Math.min(rect.width, rect.height * 0.82) * 0.42 + 26,
      };
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      const ctx = canvas.getContext("2d");
      ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw();
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, [draw]);

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
    draw();
  }, [currentId, draw, onLanded, onSelect]);

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
          onLandedRef.current();
        }
      }
      const dt = Math.max(1, performance.now() - v.drag.at);
      v.vSpin = dx * k * (16 / dt);
      v.vTilt = -dy * k * (16 / dt);
      v.drag.x = event.clientX;
      v.drag.y = event.clientY;
      v.drag.at = performance.now();
    };

    /**
     * `pointerup` and `pointercancel` are the same event to this file, and
     * that is not a shortcut — the browser sends `pointercancel`, never
     * `pointerup`, the instant it decides the gesture belongs to the page
     * scroll. Handle only `pointerup` and a finger that scrolls away leaves
     * `drag` set forever: the loop stays busy, the planet keeps turning under
     * nobody, and the next tap is interpreted as the continuation of a drag
     * that ended a minute ago.
     */
    const release = (event: PointerEvent) => {
      if (!v.drag) return;
      const moved = v.drag.moved;
      v.drag = null;
      if (moved < TAP_SLOP_PX) {
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
        // that is 2.1.1, a different criterion. This plus the seven list
        // buttons and "Take the flight" is the non-dragging path through the
        // whole section.
        if (!hitSomething) {
          const place = unproject(px, py, v.spin, v.tilt, v.stroke);
          if (place) {
            v.vSpin = 0;
            v.vTilt = 0;
            v.target = {
              spin: -place.lon * DEG,
              tilt: clampTilt(-place.lat * DEG * 0.55),
            };
          }
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
  }, [start]);

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
            onLandedRef.current();
          }
        }
        start();
      },
      fly: () => {
        // Task 9 replaces this with the played crossing. Until then, pressing
        // it does what a full eastward roll does.
        controls.nudge(EAST_FOR_FLIGHT, 0);
      },
      reset: () => {
        const v = view.current;
        v.flight = 0;
        v.landed = false;
        v.vSpin = 0;
        v.vTilt = 0;
        v.target = { spin: -origin.coordinates.from.lon * DEG, tilt: -12 * DEG };
        start();
      },
      focusWorld: (id) => {
        const world = worlds.find((candidate) => candidate.id === id);
        const v = view.current;
        if (!world?.point) return;
        v.vSpin = 0;
        v.vTilt = 0;
        v.target = {
          spin: -world.point.lon * DEG,
          tilt: clampTilt(-world.point.lat * DEG * 0.55),
        };
        start();
      },
    };
    onReady(controls);
    return () => onReady(null);
  }, [onReady, start, worlds]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      // pan-y, never none. See WorldsStage.
      className="absolute inset-0 block h-full w-full touch-pan-y"
    />
  );
}
