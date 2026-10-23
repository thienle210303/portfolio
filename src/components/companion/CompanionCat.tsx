"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";

import styles from "./companion.module.css";

/**
 * The companions' bodies: one cat per instance, drawn from a sprite sheet.
 *
 * Round 21 replaced the per-frame contour builder (a pose described as data,
 * rendered twice over a `var(--ground)` knockout) with page-mascot's method:
 * each cat is a few small sheets drawn once by `scripts/draw-cats.mjs` into
 * `public/cats/` — 3×3 head directions, 3×3 reactions, an 8-frame walk — and a
 * frame is one `<use href="#cat-moon-walk-3">`. A `<use>` inherits
 * `currentColor` and custom properties, so the ink still follows theme, tone
 * and `data-paper` (`syncTone`) like every other drawing, and a pose change is
 * one attribute instead of a re-built tree of paths.
 *
 * Each sheet is fetched once (`useSheet`) and each frame's symbol put on the
 * page the first time it is drawn (`ensureSymbols`), renamed `cat-<sheet>-<id>`. Pointing `<use>` at the file itself
 * (`/cats/moon.svg#walk-3`) re-requested it on every frame change — 138
 * requests in eight seconds of walking, with the files served `max-age=0`.
 *
 *  - **Moon** (`grey`), the blue cat, leads: a solid blue-grey coat.
 *  - **Mi** (`tabby`), the grey tabby, follows: a light coat, mackerel stripes,
 *    white socks.
 *  - The police cat is Moon in a cap (`police.svg`: walk and stand only).
 *
 * The coats are meant to be seen (`--cat-coat`, companion.module.css): the old
 * knockout filled each cat with the flat page ground, which read as a patch on
 * the sky's gradient.
 *
 * Two things live here rather than in the loop, because they need nothing from
 * it: a sitting cat's head follows a fine pointer (one shared listener; reduced
 * motion and touch never attach it), and a press on the cat's button holds one
 * reaction cell. Purely presentational and `aria-hidden`: `Companion` owns the
 * buttons, the names and every behaviour.
 */

/** One cat's drawing box. The sheets are drawn in it. */
export const CAT_W = 50;
export const CAT_H = 42;

/**
 * How high a hopping cat rises, in px: the peak of `@keyframes cat-hop` in
 * globals.css. Not read by the stylesheet — CSS cannot import it — but by the
 * loop, which lifts the speaking cat's bubble by this much while she hops.
 * `tests/ui/CatIcon.test.tsx` fails if the two part.
 */
export const CAT_HOP_RISE = 6;

/**
 * How far a still cat's `phase` moves per 60Hz frame. The loop still advances
 * it; the sitting tail's CSS sway runs at the same period.
 */
export const SIT_SWAY_RATE = { grey: 0.006, tabby: 0.0045 } as const;

export type CatPose =
  | "sit"
  | "walk"
  | "sleep"
  | "stretch"
  | "groom"
  | "bat"
  | "eat"
  | "yawn"
  | "purr"
  | "startle"
  | "sniff";
export type CatVariant = "grey" | "tabby" | "police";

/** The reaction cells, in sheet order (`REACTIONS` in scripts/draw-cats.mjs). */
export const REACTIONS = [
  "blink",
  "yawn",
  "purr",
  "startle",
  "stretch",
  "groom",
  "bat",
  "sniff",
  "sleep",
] as const;
export type Reaction = (typeof REACTIONS)[number];

const SHEET: Record<CatVariant, "moon" | "mi" | "police"> = {
  grey: "moon",
  tabby: "mi",
  police: "police",
};

/* ------------------------------------------------------------ the sheets -- */

/** Each fetched sheet's symbols, by id, as markup not yet on the page. */
const sheets = new Map<string, Map<string, string>>();
const loading = new Map<string, Promise<void>>();
const sheetWatchers = new Set<() => void>();

/** Fetches `/cats/<name>.svg` once and keeps its symbols, renamed
 *  `cat-<name>-<id>`, ready to put on the page one at a time (`ensureSymbols`). */
function loadSheet(name: string): Promise<void> {
  const pending = loading.get(name);
  if (pending) return pending;
  const job = fetch(`/cats/${name}.svg`)
    .then((response) => (response.ok ? response.text() : Promise.reject(new Error(String(response.status)))))
    .then((text) => {
      const symbols = new Map<string, string>();
      for (const [markup, id] of text.matchAll(/<symbol id="([^"]+)"[\s\S]*?<\/symbol>/g)) {
        symbols.set(id, markup.replace(/ id="/, ` id="cat-${name}-`));
      }
      sheets.set(name, symbols);
      for (const watcher of sheetWatchers) watcher();
    })
    .catch(() => {
      // Decoration: without its sheet a cat is simply not drawn. Retried on
      // the next mount.
      loading.delete(name);
    });
  loading.set(name, job);
  return job;
}

/**
 * Puts the named symbols on the page, once each, in one hidden `<svg>`. Only
 * the frames a visit actually draws go into the DOM: the whole of Moon's and
 * Mi's sheets is about a thousand elements, most of them never drawn.
 */
function ensureSymbols(name: string, ids: readonly (string | null)[]): void {
  const symbols = sheets.get(name);
  if (!symbols) return;
  let host = document.getElementById("cat-sheets");
  for (const id of ids) {
    if (!id || document.getElementById(`cat-${name}-${id}`)) continue;
    const markup = symbols.get(id);
    if (!markup) continue;
    if (!host) {
      host = document.createElementNS("http://www.w3.org/2000/svg", "svg") as unknown as HTMLElement;
      host.id = "cat-sheets";
      host.setAttribute("aria-hidden", "true");
      host.setAttribute("width", "0");
      host.setAttribute("height", "0");
      host.setAttribute("style", "position:absolute;overflow:hidden");
      document.body.append(host);
    }
    host.insertAdjacentHTML("beforeend", markup);
  }
}

/** Whether `name`'s sheet has been fetched, fetching it if not. */
function useSheet(name: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      sheetWatchers.add(notify);
      if (!sheets.has(name)) void loadSheet(name);
      return () => sheetWatchers.delete(notify);
    },
    () => sheets.has(name),
    () => false,
  );
}

/** Which reaction cell a pose is drawn with, where it is not a sit or a walk. */
const POSE_CELL: Partial<Record<CatPose, Reaction>> = {
  sleep: "sleep",
  stretch: "stretch",
  groom: "groom",
  bat: "bat",
  eat: "sniff",
  sniff: "sniff",
  yawn: "yawn",
  purr: "purr",
  startle: "startle",
};

export interface Frame {
  readonly id: string;
  /** The sitting tail drawn under the body, or null where the cell has its own. */
  readonly tail: "tail" | "tail-puff" | null;
}

function reactionFrame(reaction: Reaction): Frame {
  const id = `react-${REACTIONS.indexOf(reaction)}`;
  if (reaction === "startle") return { id, tail: "tail-puff" };
  if (reaction === "stretch" || reaction === "sleep") return { id, tail: null };
  return { id, tail: "tail" };
}

/**
 * The cell for one moment of one cat. A held reaction (a press) outranks the
 * pose; a walk steps through its eight frames on `phase`; a blink closes the
 * eyes; a flick — the twitch the loop rolls now and then — is a glance back
 * over the shoulder; otherwise the head is where it looks (`look`, 0..8,
 * row-major, 4 = at you).
 */
export function frameFor(input: {
  readonly pose: CatPose;
  readonly phase: number;
  readonly blinking?: boolean;
  readonly flick?: number;
  readonly look?: number;
  readonly react?: Reaction | null;
}): Frame {
  if (input.react) return reactionFrame(input.react);
  if (input.pose === "walk") return { id: `walk-${Math.floor(input.phase * 8) % 8}`, tail: null };
  const cell = POSE_CELL[input.pose];
  if (cell) return reactionFrame(cell);
  if (input.blinking) return reactionFrame("blink");
  if ((input.flick ?? 0) > 0) return { id: "look-3", tail: "tail" };
  return { id: `look-${input.look ?? 4}`, tail: "tail" };
}

/** Inside this many px of the cat's middle the head settles on you. */
const DEAD_ZONE = 48;

/**
 * Which of the 3×3 head cells looks at `pointer` from a cat drawn in `box`.
 * The sheets face right, so a cat drawn mirrored (`facing` -1) turns the other
 * way to look at the same point.
 */
export function lookCell(
  box: { readonly left: number; readonly top: number; readonly width: number; readonly height: number },
  pointer: { readonly x: number; readonly y: number },
  facing: 1 | -1,
): number {
  const dx = pointer.x - (box.left + box.width / 2);
  const dy = pointer.y - (box.top + box.height / 2);
  const dist = Math.hypot(dx, dy);
  if (dist < DEAD_ZONE) return 4;
  const col = Math.abs(dx / dist) > 0.38 ? Math.sign(dx) * facing : 0;
  const row = Math.abs(dy / dist) > 0.38 ? Math.sign(dy) : 0;
  return (row + 1) * 3 + (col + 1);
}

/* ------------------------------------------------------- pointer store -- */

type Pointer = { x: number; y: number } | null;
const watchers = new Set<(pointer: Pointer) => void>();
let pointer: Pointer = null;
let pending = 0;
let detach: (() => void) | null = null;

function publish() {
  pending = 0;
  for (const watcher of watchers) watcher(pointer);
}

/** One `pointermove` listener for every sitting cat, attached only while one is
 *  watching and only for a fine pointer with motion allowed. */
function watchPointer(watcher: (pointer: Pointer) => void): () => void {
  watchers.add(watcher);
  if (!detach) {
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      pointer = { x: event.clientX, y: event.clientY };
      if (!pending) pending = requestAnimationFrame(publish);
    };
    const onLeave = () => {
      pointer = null;
      if (!pending) pending = requestAnimationFrame(publish);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    detach = () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      if (pending) cancelAnimationFrame(pending);
      pending = 0;
      detach = null;
    };
  }
  watcher(pointer);
  return () => {
    watchers.delete(watcher);
    if (watchers.size === 0) detach?.();
  };
}

const canTrack = () =>
  window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches;

/** What a press plays, in turn: Moon is easy to please, Mi less so. */
const PRESS_REACTIONS: Record<CatVariant, readonly Reaction[]> = {
  grey: ["purr", "yawn", "blink"],
  tabby: ["purr", "startle", "yawn"],
  police: ["blink"],
};
const PRESS_MS = 700;

interface CompanionCatProps {
  readonly variant: CatVariant;
  readonly pose: CatPose;
  /** 0..1 through the current cycle: the walk's frame. */
  readonly phase: number;
  readonly blinking: boolean;
  /** 0..1, and 0 almost always: the twitch, drawn as a glance back. */
  readonly flick?: number;
  /** Which way the drawing is mirrored by its wrapper; the head tracks with it. */
  readonly facing?: 1 | -1;
  /** Drawn smaller inside the resting box. 1 everywhere else. */
  readonly scale?: number;
  /**
   * The `hop` act: marks the drawing `data-cat-hop`, which the stylesheet
   * bounces once, under `prefers-reduced-motion: no-preference` only. On the
   * `<svg>` itself, so the bounce composes with the wrapper's transforms.
   */
  readonly hopping?: boolean;
}

export function CompanionCat({
  variant,
  pose,
  phase,
  blinking,
  flick = 0,
  facing = 1,
  scale = 1,
  hopping = false,
}: CompanionCatProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [look, setLook] = useState(4);
  const [react, setReact] = useState<Reaction | null>(null);
  const presses = useRef(0);

  const sitting = pose === "sit" && variant !== "police";

  useEffect(() => {
    if (!sitting || !canTrack()) return;
    const stop = watchPointer((at) => {
      const svg = svgRef.current;
      if (!svg) return;
      setLook(at ? lookCell(svg.getBoundingClientRect(), at, facing) : 4);
    });
    return () => {
      stop();
      setLook(4);
    };
  }, [sitting, facing]);

  useEffect(() => {
    const button = svgRef.current?.closest("button");
    if (!button || pose === "sleep" || pose === "walk") return;
    let timer = 0;
    const onPress = () => {
      const options = PRESS_REACTIONS[variant];
      setReact(options[presses.current++ % options.length]);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setReact(null), PRESS_MS);
    };
    button.addEventListener("click", onPress);
    return () => {
      button.removeEventListener("click", onPress);
      window.clearTimeout(timer);
    };
  }, [variant, pose]);

  const drawn = frameFor({ pose, phase, blinking, flick, look, react });
  // The police sheet only stands and walks.
  const frame = variant === "police" && !drawn.id.startsWith("walk") ? { id: "look-4", tail: "tail" as const } : drawn;
  const sheet = SHEET[variant];
  const ready = useSheet(sheet);
  // Before paint, so a frame's symbol is on the page when its <use> is drawn.
  useLayoutEffect(() => {
    if (ready) ensureSymbols(sheet, [frame.id, frame.tail]);
  }, [ready, sheet, frame.id, frame.tail]);

  return (
    <svg
      ref={svgRef}
      // Marks a cat as a cat, for the specs that count animals.
      data-cat=""
      // The pose, named, for the claims the specs make about a pose.
      data-cat-pose={pose}
      data-cat-hop={hopping ? "" : undefined}
      data-coat={variant}
      className={styles.cat}
      viewBox={`0 0 ${CAT_W} ${CAT_H}`}
      width={CAT_W * scale}
      height={CAT_H * scale}
      aria-hidden="true"
      focusable="false"
      style={
        variant === "police"
          ? undefined
          : ({ "--sway-period": `${Math.round(1000 / 60 / SIT_SWAY_RATE[variant])}ms` } as CSSProperties)
      }
    >
      {ready && frame.tail ? <use href={`#cat-${sheet}-${frame.tail}`} className={styles.tailSway} /> : null}
      {ready ? <use href={`#cat-${sheet}-${frame.id}`} /> : null}
    </svg>
  );
}

export default CompanionCat;
