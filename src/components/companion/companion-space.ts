"use client";

import { CAT_H, CAT_W } from "./CompanionCat";

/**
 * Where a cat is allowed to be, and what colour it has to be to be seen there.
 *
 * The tone is answered by hit-testing the page (`elementBehind`). Placement
 * used to be too, one `elementsFromPoint` per probe point, and that cost up to
 * two thousand calls in one frame. It now reads the boxes of the elements the
 * cats must dodge, gathered once per layout epoch (`groundRects`). A scroll
 * shifts the cached boxes by its delta (`shiftGround`); they are rebuilt by the
 * recheck timer that follows a scroll, and dropped on every resize, body resize
 * and animation end, and before each placement decision. A transition moves
 * ground without dropping it, so the cache can lag one until the next decision.
 *
 * Placement is decided when a cat chooses where to settle; the frames between
 * re-probe from the cache. The tone sample is throttled by its caller to a few
 * times a second. While a cat is actively trailing the pointer it is allowed
 * to cross anything — brief overlap is what makes it a companion rather than
 * a cursor. It is *resting* on top of a paragraph that reads as broken.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Whatever `setReservedRects`/`setControlRects` need out of a rectangle —
 * the four edges, nothing else. A real `DOMRect` satisfies this
 * structurally, so a caller with one on hand (the bubbles, measured because
 * their size is content-dependent) can still just pass it straight through.
 * The point of naming a narrower shape is the *other* kind of caller: the
 * lead's own control rect is computed directly from state — its position
 * and a compile-time-constant box — and never needs to touch the DOM at
 * all, so it should not have to fake a whole `DOMRect` (`x`, `y`, `width`,
 * `height`, `toJSON`) just to satisfy a type it only ever reads four fields
 * of.
 */
export interface RectLike {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/**
 * Whether the follower's button must stop taking pointer events: only on a
 * true overlap with the lead's (gap < 0). Both targets are at least 24x24, so
 * WCAG 2.5.8 and axe fail on overlap alone; touching or separated boxes, the
 * ordinary ~22px chase gap included, stay pressable.
 */
export function followerMuted(lead: RectLike, follow: RectLike): boolean {
  return (
    Math.max(
      lead.left - follow.right,
      follow.left - lead.right,
      lead.top - follow.bottom,
      follow.top - lead.bottom,
    ) < 0
  );
}

/** The companion's own root, marked so the probes can look straight through
 *  it. Without this a cat reads its own button as content and flees itself. */
const SELF = "[data-companion]";

/**
 * What a cat must not park on.
 *
 * Deliberately a tag list rather than "any element with text": a layout
 * container really is whitespace even though its subtree is full of prose,
 * while a `<p>` is content anywhere inside its box — including the ragged end
 * of its last line, which is close enough to the text to be worth avoiding
 * anyway.
 *
 * `[tabindex]` is narrowed to exclude `-1`: `<main>` carries `tabindex="-1"` as
 * a focus landing point for the skip link, and an unnarrowed selector would
 * match every point on the page and send both cats permanently into the corner.
 */
const OCCUPIED = [
  // Chrome as well as content: the site header is sticky, so a cat that parked
  // on it would ride down the page glued to a bar it does not belong to.
  "header",
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "label",
  "summary",
  "details",
  "form",
  "img",
  "svg",
  "canvas",
  "video",
  "iframe",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "dt",
  "dd",
  "blockquote",
  "figure",
  "figcaption",
  "pre",
  "code",
  "table",
  "[role='button']",
  "[role='link']",
  "[tabindex]:not([tabindex='-1'])",
  // Marks interactive surfaces the cats must not rest on, whether or not they
  // have loaded yet: a surface that is an empty, tabindex -1 box until a lazy
  // chunk mounts into it matches nothing above, so a cat could settle there and
  // then sit on whatever mounts under it. Cats may still walk across one; this
  // only decides where they stop.
  "[data-cat-avoid]",
].join(",");

/** Everything on the page a visitor can press or focus. */
const CONTROLS =
  "a[href],button,input,select,textarea,summary,[role='button'],[role='link'],[tabindex]:not([tabindex='-1'])";

/**
 * What a cat passes under and never rests on (`passUnder`, `offControls` in
 * Companion.tsx), and what a speech bubble keeps off: every control, and the
 * Record's cards, rows and stamps (round 21 review: cats rested on them at 414
 * and 1280), which are list items.
 */
const PASS_UNDER = `${CONTROLS},#record li`;

/** Blocks of words: a walk goes round them (`routeAround`). */
const PROSE = "p,h1,h2,h3,h4,h5,h6,dt,dd,blockquote,figcaption,label";

/** How close to the viewport edge a cat may sit. Enough that it is never
 *  clipped, small enough that the page gutter still counts as whitespace. */
const EDGE = 8;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/* -------------------------------------------------------------------------- */
/* Where a cat can actually be seen                                            */
/*                                                                             */
/* "Inside the viewport" is not the same question as "visible", and conflating  */
/* the two is what made the cats vanish. Two distinct ways to lose an animal:   */
/*                                                                             */
/*  1. Off the viewport. `html` and `body` carry `overflow-x: clip`, so a fixed */
/*     element parked past an edge produces no scrollbar and no other tell —    */
/*     the cat is simply not there, and nothing about the page hints at it.     */
/*  2. Behind the chrome. The site header is `sticky top-0 z-50` and opaque     */
/*     (`bg-ground`); the entire companion layer is `fixed inset-0 z-40`. Any   */
/*     cat in the top band is painted *under* a solid bar. The old probe could  */
/*     not see this at all: it samples the cat's belly and feet — the bottom    */
/*     60% of the box — so a spot whose feet clear the header by a pixel reads  */
/*     as "clear" while the animal's head and shoulders are behind it.          */
/*                                                                             */
/* Both are answered here, once, by a single pair of bounds that every target   */
/* and every settle position is run through.                                    */
/* -------------------------------------------------------------------------- */

/** The height of the page chrome that paints above the companion layer. */
let overlayTop = 0;

/**
 * Re-measure the band at the top of the viewport the cats cannot be seen in.
 *
 * Measured rather than hardcoded, so it cannot drift from the header's actual
 * height, and only called when the page can have moved (loop start, scroll,
 * resize) rather than per frame.
 */
export function refreshSafeArea(): void {
  // Re-measured with the chrome: this is where the cached viewport and bounds
  // are dropped (a body resize drops them too, for a scrollbar appearing).
  invalidateViewport();
  let top = 0;
  const header = document.querySelector("header");
  if (header) {
    const rect = header.getBoundingClientRect();
    // Only counts while it is actually pinned across the top of the viewport;
    // a header that has scrolled away covers nothing.
    if (rect.top <= EDGE && rect.bottom > 0) top = rect.bottom;
  }
  // Whatever the chrome is doing, the cats still need somewhere to be.
  overlayTop = clamp(top, 0, (document.documentElement.clientHeight || window.innerHeight) / 3);
}

/** The top of the band a cat may occupy, in viewport coordinates. */
export function safeTop(): number {
  return overlayTop;
}

/**
 * The box the cats are actually positioned inside.
 *
 * `documentElement.clientWidth`, not `window.innerWidth`: the companion's root
 * is `position: fixed; inset: 0`, so its coordinate space is the initial
 * containing block — the viewport *minus* any classic scrollbar. Measuring with
 * `innerWidth` lets the right-hand clamp put a cat's last few pixels underneath
 * the scrollbar, and puts every corner-anchored target the same few pixels out
 * of step with the furniture it is supposed to line up with.
 */
export function viewport(): { width: number; height: number } {
  if (!viewportCache) {
    const root = document.documentElement;
    viewportCache = {
      width: root.clientWidth || window.innerWidth,
      height: root.clientHeight || window.innerHeight,
    };
  }
  return viewportCache;
}

/**
 * Reading `clientWidth`/`clientHeight` forces layout, and `viewport()` is asked
 * for several times a step, so it is read once and kept until something that
 * can change it says so: `refreshSafeArea` (resize, the recheck timer's page
 * move, loop start, first placement) and a body resize. Callers get the same object, so none may mutate it.
 */
let viewportCache: { width: number; height: number } | null = null;
let boundsCache: ReturnType<typeof boundsFor> | null = null;

export function invalidateViewport(): void {
  viewportCache = null;
  boundsCache = null;
}

/**
 * Every position a cat may hold in a viewport this size, below chrome this
 * tall, as the bounds of its top-left corner. Pure, so the explorer picker
 * below can sample exactly the box the clamps clamp into without a DOM.
 */
export function boundsFor(view: { width: number; height: number }, top: number) {
  const minY = top + EDGE;
  return {
    minX: EDGE,
    maxX: Math.max(EDGE, view.width - CAT_W - EDGE),
    minY,
    maxY: Math.max(minY, view.height - CAT_H - EDGE),
  };
}

/** Every position a cat may hold right now. */
function bounds() {
  return (boundsCache ??= boundsFor(viewport(), overlayTop));
}

export function clampToViewport(point: Point): Point {
  const box = bounds();
  return {
    x: clamp(point.x, box.minX, box.maxX),
    y: clamp(point.y, box.minY, box.maxY),
  };
}

/**
 * Drag a cat that the viewport has moved out from under back into view, and
 * report whether it had to.
 *
 * Invalidating the *targets* on resize was never enough on its own: a cat holds
 * its own position, and there is at least one branch of the loop that tells it
 * to stay exactly where it is (trailing a pointer already inside its personal
 * space). Shrink the window under that cat — a rotation, a devtools split, a
 * window drag between displays — and it stays off-screen indefinitely. Called
 * once per animal per frame, and does nothing in the overwhelming case where
 * the cat is already somewhere it can be seen.
 */
export function keepInView(pos: { x: number; y: number }): boolean {
  const safe = clampToViewport(pos);
  if (safe.x === pos.x && safe.y === pos.y) return false;
  pos.x = safe.x;
  pos.y = safe.y;
  return true;
}

/** The topmost element at this point that is not part of the companion. */
export function elementBehind(x: number, y: number): Element | null {
  const stack = document.elementsFromPoint(x, y);
  for (let i = 0; i < stack.length; i += 1) {
    if (!stack[i].closest(SELF)) return stack[i];
  }
  return null;
}

/** Pure; edges are inclusive. */
export function pointInRects(x: number, y: number, rects: readonly RectLike[]): boolean {
  for (const rect of rects) {
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return true;
  }
  return false;
}

/**
 * The boxes of every `OCCUPIED` element on screen, gathered once per layout
 * epoch rather than hit-tested per point: one explore pick could cost two
 * thousand `elementsFromPoint` calls in a frame. `invalidateGround` starts a
 * new epoch; `Companion.tsx` calls it on every resize, body resize and
 * animation end, and before every placement decision it holds for seconds — an
 * explore plan or re-pick, a scene's stage, the re-probe on arrival,
 * mini-Thien's spot — since content can appear without any of those events.
 * A scroll does not start one: it moves every box by the same delta, so
 * `syncGround` moves the cache with it, and `scheduleRecheck`'s timer
 * rebuilds it (`refreshGround`) at most every 250ms while a scroll lasts and
 * once after it stops. That rebuild is what corrects sticky and fixed content,
 * which a shift moves although the page did not. The per-frame probes in
 * between, and the settle spots a moving pointer clears every event, read the
 * cache; otherwise the rebuild is lazy, on the first probe after a drop.
 *
 * Deliberately conservative where a box is not what a hit test sees: an
 * occupied element that is covered by something else, or clipped by an
 * ancestor, still counts. A false "occupied" only sends a cat to another spot.
 * One case goes the other way: a non-`OCCUPIED` child overflowing its
 * `OCCUPIED` ancestor's box reads clear here, where a hit test said occupied.
 * What a hit test looks straight through is still skipped — the companion's
 * own subtree (`SELF`), and anything `pointer-events: none` or hidden, such as
 * the Journey's ink overlays and a running origin story's pending branches — or
 * a cat could never rest anywhere on the drawing. Boxes beside the window, or more than one
 * window height above or below it, are dropped too: no probe point is ever off
 * screen, and the band above and below is what a shifted cache scrolls into
 * view before the next rebuild.
 */
let ground: readonly RectLike[] | null = null;
/** The subset of `ground` cats pass under and never rest on (`PASS_UNDER`),
 *  cached with it; the speech bubbles keep off it too (`groundControls`). */
let controls: readonly RectLike[] = [];
/** The elements behind `controls`, in the same order. */
let controlEls: readonly Element[] = [];
/** And the subset that is prose (`PROSE`): what a walk goes round. */
let prose: readonly RectLike[] = [];
/** The scroll offset `ground` was measured at, or last synced to. */
let groundAt = { x: 0, y: 0 };

export function invalidateGround(): void {
  ground = null;
}

/** Whether a probe would read the cache rather than rebuild it. */
export function groundCached(): boolean {
  return ground !== null;
}

/** A new epoch, built now rather than on the next probe. */
export function refreshGround(): void {
  ground = null;
  groundRects();
}

/** The page scrolled by (`dx`, `dy`): every cached box moves the other way. */
export function shiftGround(dx: number, dy: number): void {
  // `step` syncs every frame; a zero shift must not re-map the whole cache.
  if (!ground || (dx === 0 && dy === 0)) return;
  groundAt = { x: groundAt.x + dx, y: groundAt.y + dy };
  const shift = (box: RectLike) => ({
    left: box.left - dx,
    top: box.top - dy,
    right: box.right - dx,
    bottom: box.bottom - dy,
  });
  ground = ground.map(shift);
  controls = controls.map(shift);
  prose = prose.map(shift);
}

/**
 * Move the cache to the page's live offset. Absolute rather than a delta the
 * caller tracks, so a rebuild between a scroll and this call (it is measured
 * at the live offset) cannot be shifted a second time, nor a move be dropped.
 */
export function syncGround(scrollX: number, scrollY: number): void {
  if (!ground) return;
  shiftGround(scrollX - groundAt.x, scrollY - groundAt.y);
}

function groundRects(): readonly RectLike[] {
  if (ground) return ground;
  groundAt = { x: window.scrollX, y: window.scrollY };
  const view = viewport();
  const rects: RectLike[] = [];
  const pressable: RectLike[] = [];
  const pressableEls: Element[] = [];
  const text: RectLike[] = [];
  for (const element of document.querySelectorAll(OCCUPIED)) {
    if (element.closest(SELF)) continue;
    const box = element.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) continue;
    if (box.right < 0 || box.left > view.width) continue;
    if (box.bottom < -view.height || box.top > view.height * 2) continue;
    const style = getComputedStyle(element);
    if (style.pointerEvents === "none" || style.visibility === "hidden" || style.visibility === "collapse") continue;
    rects.push(box);
    if (element.matches(PASS_UNDER)) {
      pressable.push(box);
      pressableEls.push(element);
    }
    if (element.matches(PROSE)) text.push(box);
  }
  ground = rects;
  controls = pressable;
  controlEls = pressableEls;
  prose = text;
  return rects;
}

/** The prose in the current ground epoch, in viewport coordinates. */
export function groundProse(): readonly RectLike[] {
  groundRects();
  return prose;
}

/**
 * Whether a cat can walk straight from `from` to `to` without its box crossing
 * a block of text (round 21: the explorers prefer such stops, so their walks
 * stay off a lede or a caption). Text the cat is on at either end does not
 * count: it is leaving it, or the stop was probed clear without it.
 */
export function walkClear(from: Point, to: Point): boolean {
  const d = { x: to.x - from.x, y: to.y - from.y };
  for (const r of groundProse()) {
    const g = { left: r.left - CAT_W, right: r.right, top: r.top - CAT_H, bottom: r.bottom };
    const on = (p: Point) => p.x > g.left && p.x < g.right && p.y > g.top && p.y < g.bottom;
    if (on(from) || on(to)) continue;
    let t0 = 0;
    let t1 = 1;
    let hit = true;
    for (const [p, dp, lo, hi] of [
      [from.x, d.x, g.left, g.right],
      [from.y, d.y, g.top, g.bottom],
    ] as const) {
      if (Math.abs(dp) < 1e-9) {
        if (p <= lo || p >= hi) hit = false;
      } else {
        const ta = Math.min((lo - p) / dp, (hi - p) / dp);
        const tb = Math.max((lo - p) / dp, (hi - p) / dp);
        t0 = Math.max(t0, ta);
        t1 = Math.min(t1, tb);
        if (t0 >= t1) hit = false;
      }
    }
    if (hit) return false;
  }
  return true;
}

/**
 * The backstop under `routeAround`: a step from `prev` to `next` that would
 * put the cat's drawing onto a block of words it was not already on slides
 * along it instead, at the step's full length: towards `want` (never past
 * it) when `want` lies beyond the block's end, else towards the block's end
 * on `want`'s side, so a cat behind a wide block follows its edge round it.
 * The side is the destination's, not the cat's: chosen by where the cat
 * stands, it flipped as she crossed the block's middle and she paced there
 * for good. `rects` is the words. Inset by 3px, the empty margin of a sprite cell, so
 * grazing a line is not touching it.
 */
export function slideOffText(
  prev: Point,
  next: Point,
  want: Point,
  rects: readonly RectLike[] = groundProse(),
  band: { readonly minX: number; readonly maxX: number; readonly minY: number; readonly maxY: number } | null = null,
  /** The way this cat last went round a block on its way to this `want`: kept,
   *  so two stacked blocks with ends on opposite sides cannot bounce her
   *  between them. The caller resets it when the destination changes. */
  memo: { x?: 1 | -1; y?: 1 | -1 } = {},
): Point {
  const hits = (p: Point, inset = 3) =>
    rects.find(
      (r) =>
        p.x + inset < r.right && p.x + CAT_W - inset > r.left && p.y + inset < r.bottom && p.y + CAT_H - inset > r.top,
    );
  const block = hits(next);
  // Already on it means well on it: a stop's probes leave a cat's feet a few
  // pixels into a line's box, and a cat leaving such a stop must still go
  // round the line, not straight across it.
  // And a destination that itself touches the block is arrived at straight:
  // sliding off a block the stop touches only paces beside it, never there.
  if (!block || hits(prev, 9) || hits(want)) return next;
  const step = Math.hypot(next.x - prev.x, next.y - prev.y);
  const reach = (from: number, to: number) => from + clamp(to - from, -step, step);
  const vertical = Math.abs(want.y - prev.y) >= Math.abs(want.x - prev.x);
  // Is the destination clear of this block on the other axis? Then slide
  // along the block towards it; if not, sliding towards it only walks back to
  // the block's middle, so follow the block's edge to its nearer end instead.
  const pastX = want.x + CAT_W - 3 <= block.left || want.x + 3 >= block.right;
  const pastY = want.y + CAT_H - 3 <= block.top || want.y + 3 >= block.bottom;
  let slide: Point;
  if (vertical) {
    // The end on want's side, unless the cats' band cannot reach round it.
    let leftEnd = want.x + CAT_W / 2 <= (block.left + block.right) / 2;
    if (band && leftEnd && block.left - CAT_W < band.minX) leftEnd = false;
    else if (band && !leftEnd && block.right > band.maxX) leftEnd = true;
    memo.x ??= leftEnd ? -1 : 1;
    slide = pastX ? { x: reach(prev.x, want.x), y: prev.y } : { x: prev.x + memo.x * step, y: prev.y };
  } else {
    let topEnd = want.y + CAT_H / 2 <= (block.top + block.bottom) / 2;
    if (band && topEnd && block.top - CAT_H < band.minY) topEnd = false;
    else if (band && !topEnd && block.bottom > band.maxY) topEnd = true;
    memo.y ??= topEnd ? -1 : 1;
    slide = pastY ? { x: prev.x, y: reach(prev.y, want.y) } : { x: prev.x, y: prev.y + memo.y * step };
  }
  // A slide that does not move, or moves onto something else, is no slide:
  // it goes on (a cat held against a line until her walk times out reads as
  // stuck, which is worse than a crossing).
  const inBand = (p: Point) =>
    !band || (p.x >= band.minX - 0.5 && p.x <= band.maxX + 0.5 && p.y >= band.minY - 0.5 && p.y <= band.maxY + 0.5);
  if ((slide.x !== prev.x || slide.y !== prev.y) && !hits(slide) && inBand(slide)) return slide;
  return next;
}

/** The controls in the current ground epoch, in viewport coordinates. */
export function groundControls(): readonly RectLike[] {
  groundRects();
  return controls;
}

function occupied(x: number, y: number): boolean {
  return pointInRects(x, y, groundRects());
}

/**
 * Rects the placement probe must also treat as occupied — the duet's own
 * speech bubbles and mini-Thien's caption.
 *
 * They cannot be found the way ordinary content is: the ground probe walks
 * straight through anything inside `[data-companion]` (see `SELF` above), on
 * purpose — without that, the two cats would each read the other as
 * "occupied" and never be able to stand near one another. That same rule
 * makes the companion's own bubbles invisible to `occupied()`, which is
 * exactly the reported bug: a cat could rest on top of, or under, the very
 * bubble a scene had just opened.
 *
 * So this is a second, narrower list, kept out of band from the DOM scan and
 * populated only by `Companion.tsx`, once a frame, from the bounding boxes of
 * whichever bubbles or captions are actually mounted — empty the rest of the
 * time, which is the common case and costs this module nothing then.
 */
const EMPTY_RECTS: readonly RectLike[] = [];
let reserved: readonly RectLike[] = EMPTY_RECTS;

export function setReservedRects(rects: readonly RectLike[]): void {
  reserved = rects.length > 0 ? rects : EMPTY_RECTS;
}

function reservedAt(x: number, y: number): boolean {
  for (const rect of reserved) {
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return true;
  }
  return false;
}

/**
 * The companion's own fixed controls a *different* cat must never be placed
 * on top of — currently just the toolkit toggle, which is the lead cat's own
 * button. Axe caught this one live: `target-size` flagged the toggle with
 * only a sliver of its target left clickable, because the follower had been
 * placed squarely over it.
 *
 * Deliberately **not** folded into `reserved`/`isClearSpot` above, and that
 * is not an oversight — a bubble is always offset a few pixels clear of the
 * cat it belongs to, so nothing that reads a bubble as occupied ever asks
 * about a point a cat is actually standing on. The toolkit toggle *is* the
 * lead cat's own current position. Wiring it into `isClearSpot` would make
 * the lead read its own settled spot as occupied by itself every time
 * `onPageMoved` in `Companion.tsx` re-probes the explorers' held stop
 * (`isClearSpot`, through `heldExploreClear` in companion-moods.ts, on
 * `heading.spots.lead`), which would drop every stop the
 * instant he stood on it. So this is its own registry, consulted only by the two functions that
 * ever compute one cat's position *relative to the other's* — `mateSpot`
 * (companion-moods.ts) and `findClearSpot` below — never by a cat validating
 * its own spot.
 *
 * This one is never measured off the DOM. It was, for one round, on a
 * 320ms-then-120ms throttle — and it went stale under load exactly when it
 * mattered most: axe caught the follower placed against a coordinate the
 * lead had already walked away from, because a `getBoundingClientRect()`
 * on a timer is a photograph, and a photograph taken too rarely under
 * contention is a photograph of the past. `Companion.tsx`'s own rAF loop
 * already knows the lead's position every frame — it is what writes the
 * `transform` — so the caller derives this rect straight from that state
 * (`grey.pos` plus the fixed, compile-time padded box a roaming lead is
 * drawn in) instead of asking the browser to re-measure a box whose shape
 * never changes. Zero reflow, zero staleness window: there is no frame this
 * rect can be older than the position that produced it.
 */
const EMPTY_CONTROL_RECTS: readonly RectLike[] = [];
let controlRects: readonly RectLike[] = EMPTY_CONTROL_RECTS;

export function setControlRects(rects: readonly RectLike[]): void {
  controlRects = rects.length > 0 ? rects : EMPTY_CONTROL_RECTS;
}

/** Same three-point probe `isClearSpot` uses, for the same reason: a single
 *  centre sample would let a cat straddle the edge of a control with half of
 *  it clear. */
export function clearsControls(point: Point): boolean {
  const { x, y } = point;
  const probes: Point[] = [
    { x: x + CAT_W / 2, y: y + CAT_H * 0.6 },
    { x: x + 6, y: y + CAT_H - 6 },
    { x: x + CAT_W - 6, y: y + CAT_H - 6 },
  ];
  for (const rect of controlRects) {
    for (const probe of probes) {
      if (probe.x >= rect.left && probe.x <= rect.right && probe.y >= rect.top && probe.y <= rect.bottom) {
        return false;
      }
    }
  }
  return true;
}

/**
 * WCAG 2.5.8's target-size minimum (24px) plus a small safety margin — the
 * least gap `keepClearOfControl` below will ever leave between a cat's box
 * and a registered control rect.
 *
 * `clearsControls` above only ever rejects or approves a *candidate* a
 * placement function is choosing between — `mateSpot`, `sideStep`. That
 * guarantees the follower is never *placed* onto the toggle, but it cannot
 * guarantee the pair never end up too close, because nothing stops the
 * *lead* from independently walking towards wherever the follower already
 * stands: the ground probe deliberately looks straight through the
 * companion's own subtree, so the two cats have always looked through each
 * other by design, and a mood or tour stop choosing the lead's next spot
 * has no idea the follower is there. Axe caught exactly this: a huddle
 * scene pulling the pair together, from the lead's side rather than the
 * follower's.
 *
 * So the real invariant cannot live at *placement* time at all — it has to
 * be re-asserted after both cats' positions are final for the frame,
 * regardless of which of the many paths chose them. `keepClearOfControl` is
 * that correction: called once a frame, it only ever moves the follower —
 * the lead is the interactive element, and a control that visibly recoiled
 * from its own decoration would be a stranger bug than the one this fixes.
 */
export const TOGGLE_CLEARANCE = 24 + 4;

/** The follower's own drawn box, and its true axis-aligned gap to `rect` —
 *  negative when they already overlap on that axis, which `Math.max` here
 *  turns into "how deep", so a genuinely separated pair reports its real
 *  clearance and an overlapping pair reports a negative one, never a false
 *  positive from comparing the wrong pair of edges. */
function gapToRect(box: RectLike, rect: RectLike): number {
  const dxOut = Math.max(box.left - rect.right, rect.left - box.right);
  const dyOut = Math.max(box.top - rect.bottom, rect.top - box.bottom);
  return Math.max(dxOut, dyOut);
}

function catBox(pos: Point): RectLike {
  return { left: pos.x, top: pos.y, right: pos.x + CAT_W, bottom: pos.y + CAT_H };
}

/** A drawn box of `width` × `height` at `pos` — a cat's (`CAT_W` × `CAT_H`),
 *  mini-Thien's, or a bubble's own measured size. */
export function boxAt(pos: Point, width: number, height: number): RectLike {
  return { left: pos.x, top: pos.y, right: pos.x + width, bottom: pos.y + height };
}

function intersects(a: RectLike, b: RectLike): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/** Whether `box` covers none of the page's controls (the cached ground epoch). */
export function clearOfControls(box: RectLike): boolean {
  for (const rect of groundControls()) if (intersects(box, rect)) return false;
  return true;
}

/**
 * Round 21 phase 8: mini-Thien never stands on a control (he stood on the
 * hero's Taylors tag at 390, and on the postcard's fields at 1440). The
 * nearest top-left to `want` where a `w`×`h` box covers no control and none
 * of `keepOut`, preferring one that covers no block of words either; inside
 * the viewport, under the chrome. Null when nothing clears the controls: he
 * stays away rather than stand on one.
 * ponytail: a 16px grid within 320px of `want`; widen it if he stays away
 * on screens that do have room.
 */
export function clearBoxNear(
  want: Point,
  w: number,
  h: number,
  keepOut: readonly RectLike[] = [],
): Point | null {
  const view = viewport();
  const minX = EDGE;
  const maxX = view.width - w - EDGE;
  const minY = overlayTop + EDGE;
  const maxY = view.height - h - EDGE;
  if (maxX < minX || maxY < minY) return null;
  const pressable = groundControls();
  const words = groundProse();
  let best: Point | null = null;
  let bestD = Infinity;
  let fallback: Point | null = null;
  let fallbackD = Infinity;
  for (let dy = -320; dy <= 320; dy += 16) {
    for (let dx = -320; dx <= 320; dx += 16) {
      const p = { x: clamp(want.x + dx, minX, maxX), y: clamp(want.y + dy, minY, maxY) };
      const d = (p.x - want.x) ** 2 + (p.y - want.y) ** 2;
      if (d >= bestD) continue;
      const box = boxAt(p, w, h);
      if (pressable.some((r) => intersects(box, r)) || keepOut.some((r) => intersects(box, r))) continue;
      if (d < fallbackD) {
        fallback = p;
        fallbackD = d;
      }
      if (!words.some((r) => intersects(box, r))) {
        best = p;
        bestD = d;
      }
    }
  }
  return best ?? fallback;
}

/** What `placeBeside` needs to know about the screen, passed in rather than
 *  read so the choice can be tested without a window. */
export interface BesideFrame {
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  /** The first y below the sticky header — `safeTop()`. */
  readonly safeTop: number;
}

const BESIDE_MARGIN = 8;
const BESIDE_GAP = 6;

/**
 * Where a speech bubble or mini-Thien's caption goes, beside the thing it
 * belongs to (`anchor`, drawn `anchorW` × `anchorH`): above it, or below it
 * when above would sit under the sticky header — and, new in the round-18
 * final fix wave, never on top of anything in `keepOut`.
 *
 * Why `keepOut` exists. The overlays are reserved ground for the cats' *settle*
 * probe (`setReservedRects` above), which stops a cat choosing to sit under
 * one — but nothing stopped an overlay being painted on top of a cat. While
 * the pair stood side by side on a floor that never came up. When the only
 * whitespace beside the hero's content is the right-hand gutter, though, the
 * follower settles one stride *below* the lead in that same 50px column, and
 * "above the follower" is then exactly the gap the lead stands over: the lead
 * walked through its partner's bubble on the way in, and mini-Thien's caption,
 * clamped back from the window edge, landed across the column on top of both
 * the lead and the bubble. `e2e/companion.spec.ts`'s "register as occupied
 * ground" test went red on that geometry, five runs in five.
 *
 * So the default (above, else below — unchanged) is tried first, then the
 * other vertical side, then level with the anchor to its left and to its
 * right; the first that is on screen and clear of every `keepOut` rect wins.
 * If none is, the default is returned as before, so a viewport too cramped
 * for any clear answer still gets the old one rather than none. Pure: the
 * caller measures the node and paints the result.
 */
export function placeBeside(
  anchor: Point,
  anchorW: number,
  anchorH: number,
  size: { readonly width: number; readonly height: number },
  frame: BesideFrame,
  keepOut: readonly RectLike[] = [],
): Point {
  const { width, height } = size;
  const maxX = Math.max(BESIDE_MARGIN, frame.viewportWidth - width - BESIDE_MARGIN);
  const x = clamp(anchor.x, BESIDE_MARGIN, maxX);
  const above: Point = { x, y: anchor.y - height - BESIDE_GAP };
  const below: Point = { x, y: anchor.y + anchorH + BESIDE_GAP };
  const aboveFits = above.y >= frame.safeTop + BESIDE_MARGIN;
  const preferred = aboveFits ? above : below;
  const candidates: Point[] = [
    preferred,
    aboveFits ? below : above,
    { x: clamp(anchor.x - width - BESIDE_GAP, BESIDE_MARGIN, maxX), y: anchor.y },
    { x: clamp(anchor.x + anchorW + BESIDE_GAP, BESIDE_MARGIN, maxX), y: anchor.y },
  ];
  const onScreen = (point: Point) =>
    point.y >= frame.safeTop + BESIDE_MARGIN &&
    point.y + height <= frame.viewportHeight - BESIDE_MARGIN;
  const clear = (point: Point) => {
    const box = boxAt(point, width, height);
    return keepOut.every((rect) => !intersects(box, rect));
  };
  return candidates.find((point) => onScreen(point) && clear(point)) ?? preferred;
}

/**
 * Push a candidate position for the follower away from `rect` — a
 * registered control, such as the lead's own live button — until its drawn
 * box clears it by at least `TOGGLE_CLEARANCE`. Returns `pos` unchanged
 * when it already does.
 *
 * Four candidates — right, left, below, above — ordered by how little each
 * would actually move her: whichever side of `rect` she is already biased
 * towards on each axis is tried before the far side of either. A follower
 * a couple of pixels short of clearance on her own side is nudged those few
 * pixels, not relocated across the lead entirely because "right" happened
 * to be checked first; the very first version of this function did exactly
 * that, tried in a fixed order regardless of where `pos` already was, and
 * would have visibly teleported her for a near-miss this small ever to
 * come up in a snapshot test.
 *
 * Every candidate is clamped into the viewport *and re-measured after the
 * clamp*, which is where round 10's own bug lived: a clamp that pulls a
 * candidate back towards an edge can silently collapse a gap that was only
 * ever checked before the clamp ran. The first candidate that clears after
 * clamping wins; if a viewport is narrow enough that none of the four do
 * (two cats and 2×28px of margin is over 200px — implausible, not
 * impossible), this returns whichever candidate cleared the most rather
 * than the one it started with, so a cramped viewport still gets the best
 * available answer instead of a known conflict handed back unchanged.
 */
export function keepClearOfControl(pos: Point, rect: RectLike): Point {
  if (gapToRect(catBox(pos), rect) >= TOGGLE_CLEARANCE) return pos;

  const right: Point = { x: rect.right + TOGGLE_CLEARANCE, y: pos.y };
  const left: Point = { x: rect.left - CAT_W - TOGGLE_CLEARANCE, y: pos.y };
  const below: Point = { x: pos.x, y: rect.bottom + TOGGLE_CLEARANCE };
  const above: Point = { x: pos.x, y: rect.top - CAT_H - TOGGLE_CLEARANCE };

  const posOnRight = pos.x + CAT_W / 2 >= (rect.left + rect.right) / 2;
  const posBelow = pos.y + CAT_H / 2 >= (rect.top + rect.bottom) / 2;
  const nearHorizontal = posOnRight ? right : left;
  const farHorizontal = posOnRight ? left : right;
  const nearVertical = posBelow ? below : above;
  const farVertical = posBelow ? above : below;
  const candidates = [nearHorizontal, nearVertical, farHorizontal, farVertical];

  let best = clampToViewport(candidates[0]);
  let bestGap = gapToRect(catBox(best), rect);
  for (const candidate of candidates) {
    const safe = clampToViewport(candidate);
    const gap = gapToRect(catBox(safe), rect);
    if (gap > bestGap) {
      bestGap = gap;
      best = safe;
    }
    if (gap >= TOGGLE_CLEARANCE) return safe;
  }
  return best;
}

/**
 * The widened search `keepClearOfControl` hands off to when its own cheap
 * push lands somewhere it should not — WP-R round 15's own follow-up.
 *
 * The four-candidate push above answers one question — "is there room
 * *immediately* beside this position" — and knows nothing about content, on
 * the assumption (true for the tour and watch spots it was built for) that
 * the caller already probed the *starting* position for content and the
 * ground right around an already-clear spot is itself clear. Extending the
 * correction to spots that were never probed that carefully broke that
 * assumption outright: the push can legitimately land on a paragraph, and
 * accepting it there trades one violation (the toggle) for a worse one
 * (content). Reverting to the original position does not fix anything
 * either — it is exactly the too-close spot the push was trying to escape.
 *
 * The honest answer, per round 9's own lesson about weights and the page —
 * "the weights say what the companion would rather do, the page decides
 * what it can do" — is to keep looking rather than accept either compromise.
 * `candidates` is expected ordered nearest-preferred-first (`standingSpots`'
 * own shape: a coarse sweep of the whole page band, not just the four points
 * immediately around `rect`), and this returns the first one that clears
 * *both* `rect` (by the ordinary `TOGGLE_CLEARANCE` margin) and content (via
 * `isClear`, injected rather than imported so this stays a pure function a
 * test can drive without a browser in the room — the DOM-dependent half of
 * the question is the caller's business, same as every other probe on this
 * layer).
 *
 * A candidate that fails `isClear` is discarded outright, never merely
 * scored — overlapping content is not a "worse but usable" outcome the way
 * a narrow toggle gap is, so it never becomes the running best. If nothing
 * in the whole pool clears the control by the full margin, the content-clear
 * candidate that came *closest* is returned instead of `null` — "distance is
 * always available; overlap never is", so a real resting position, merely
 * short of the preferred gap, beats no answer at all. Only when the pool has
 * no content-clear candidate whatsoever — the whole page band conflicted,
 * which should not happen on a real page — does this return `null`, leaving
 * the caller to fall back to whatever it already had.
 */
export function searchClearOfToggle(
  candidates: readonly Point[],
  rect: RectLike,
  isClear: (point: Point) => boolean,
): Point | null {
  let best: Point | null = null;
  let bestGap = -Infinity;
  for (const candidate of candidates) {
    if (!isClear(candidate)) continue;
    const gap = gapToRect(catBox(candidate), rect);
    if (gap >= TOGGLE_CLEARANCE) return candidate;
    if (gap > bestGap) {
      bestGap = gap;
      best = candidate;
    }
  }
  return best;
}

/**
 * Three probes, not one: the cat's middle and both of the points its feet
 * actually rest on. A single centre sample lets a cat straddle the edge of a
 * paragraph with half of it on the text, which is the case this exists to stop.
 */
export function isClearSpot(point: Point): boolean {
  const { x, y } = point;
  // Somewhere it cannot be seen is not a spot, whatever is drawn there. The
  // half-pixel slack is for values that have already been through
  // `clampToViewport` and came back at the bound itself.
  const box = bounds();
  if (x < box.minX - 0.5 || x > box.maxX + 0.5) return false;
  if (y < box.minY - 0.5 || y > box.maxY + 0.5) return false;
  const belly = { x: x + CAT_W / 2, y: y + CAT_H * 0.6 };
  const leftFoot = { x: x + 6, y: y + CAT_H - 6 };
  const rightFoot = { x: x + CAT_W - 6, y: y + CAT_H - 6 };
  return (
    !occupied(belly.x, belly.y) &&
    !occupied(leftFoot.x, leftFoot.y) &&
    !occupied(rightFoot.x, rightFoot.y) &&
    !reservedAt(belly.x, belly.y) &&
    !reservedAt(leftFoot.x, leftFoot.y) &&
    !reservedAt(rightFoot.x, rightFoot.y)
  );
}

/** How far down the drawing the head band's two rows are: the ears, then the
 *  face. The head is on whichever side the cat faces, so each row is read at
 *  12px in from both sides and at the centre. */
const HEAD_ROWS = [6, 16] as const;
const HEAD_INSET = 12;

/**
 * The top of the drawing, which `isClearSpot` never looks at. Its three
 * points (belly at 60% height, both feet) all sit in the bottom half of a
 * 42px cat, so a spot can pass with the ears and face across a line of prose
 * or a link — and the cats are buttons, so a head there hides the words and
 * takes their clicks. Six more rect checks, same rule as the other three
 * (occupied content, or a bubble's reserved rect).
 *
 * The explorers ask it as a requirement, in companion-moods.ts: `exploreClear`,
 * when `planExplore` picks a half-page stop; `holdExplore`, which records at
 * plan time whether each held stop's head was clear; and `heldExploreClear`,
 * the re-check after the page moves, which reads the head band again for a
 * head that was clear when planned — and for every head when `groundSettled`
 * is set (an animation ended or the body resized, with no scroll). Their
 * half-page stops are drawn uniformly from anywhere on the page, where a spot
 * that clears the feet but not the head is common. `findClearSpot` asks it as
 * a preference, only for callers that pass `preferHead` (see there). Perches,
 * every scene's stages and the per-frame placements are picked by the
 * three-point `isClearSpot` alone.
 */
export function headClear(point: Point): boolean {
  for (const dy of HEAD_ROWS) {
    const y = point.y + dy;
    for (const x of [point.x + HEAD_INSET, point.x + CAT_W / 2, point.x + CAT_W - HEAD_INSET]) {
      if (occupied(x, y) || reservedAt(x, y)) return false;
    }
  }
  return true;
}

/**
 * Candidate whitespace near a spot the cat cannot have, nearest first.
 *
 * The page gutters lead because they are the one region this layout guarantees
 * is empty at every width: `.shell` caps the content column and pads it with
 * `--gutter`, so the margins outside it hold nothing but ground. The vertical
 * offsets are the fallback for narrow viewports, where the gutter is thinner
 * than a cat and the only whitespace left is the space between blocks.
 */
function nearbyWhitespace(want: Point): Point[] {
  const leftGutter = EDGE;
  const rightGutter = Math.max(EDGE, viewport().width - CAT_W - EDGE);
  const gutters =
    Math.abs(want.x - leftGutter) <= Math.abs(want.x - rightGutter)
      ? [leftGutter, rightGutter]
      : [rightGutter, leftGutter];

  // Every offset on the near side before any on the far side, so a pair that
  // both get bumped out of the text end up in the same margin rather than one
  // on each side of the page.
  const stride = CAT_H + 26;
  const candidates: Point[] = [];
  for (const x of gutters) {
    for (const dy of [0, -stride, stride, -stride * 2, stride * 2]) {
      candidates.push(clampToViewport({ x, y: want.y + dy }));
    }
  }
  // Straight up and down from where it wanted to be, for the case where both
  // gutters are content (a full-bleed section) but the gap above it is not.
  for (const dy of [-stride, stride, -stride * 2, stride * 2]) {
    candidates.push(clampToViewport({ x: want.x, y: want.y + dy }));
  }
  return candidates;
}

/** Two cats asleep in the same 50px box read as one badly drawn cat, and the
 *  probe has no way to see that coming: the first one is invisible to a hit
 *  test that already looks through the companion's own subtree. */
function overlaps(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < CAT_W * 0.7 && Math.abs(a.y - b.y) < CAT_H * 0.7;
}

/**
 * The nearest place to `want` a cat may actually sleep, falling back to `home`
 * — the bottom corner, which is furniture rather than content and is where the
 * toolkit panel is anchored anyway. `avoid` is the spot the other cat has
 * already claimed.
 *
 * `clearsControls` is deliberately **not** part of `free()`, the check run
 * against `want` and every `nearbyWhitespace` candidate — it was, briefly,
 * and it broke the guided tour. `want` here is very often the *other* cat's
 * own current position (`mateSpot`'s fallback passes the follower's live
 * spot; `restSpots` passes it too), which trails the lead within a few tens
 * of pixels by construction — normal, harmless proximity that is not the
 * same claim as "standing on the toggle". Rejecting it on every frame a
 * tour stop is recomputed (every frame, walking or arrived — see
 * `Companion.tsx`) fed the follower's own moving position back into its own
 * target, and the two never converged. The controls check is applied only
 * to the corner fallback below, where `home` is a fixed point rather than a
 * moving one and cannot create that feedback.
 *
 * `preferHead` adds a first pass over the same candidates that also asks
 * `headClear`, so a cat is not parked with its ears and face across a line of
 * prose when ground clear for the whole drawing is nearby; the ordinary
 * three-point pass follows, so a crowded viewport still gets the nearest spot
 * its feet can have rather than the corner. It was written for the phone-width
 * hero: once round 18 put the About paragraphs in the fold, a 390px first
 * screen was prose to its bottom edge, its gutter narrower than a cat, and a
 * declined explorer plan parked both cats with their heads on the last
 * paragraph (e2e/companion.spec.ts, "on load, in About"). Round 20 Phase 3
 * took the paragraphs out; the pass stays for any crowded first screen.
 *
 * Opt-in, and only where a spot is chosen once and then held: the explorers'
 * fallbacks (`planExplore`, `repickExploreSpot`) and `Companion`'s settle
 * paths (a declined explorer plan, the cached `settled()` spots). "Held"
 * means until an event on `Companion`'s `settleSpots` ref clears the cache —
 * a scroll, a resize, a section or mode change, a scene asked for or ending.
 * A pointer move clears it only while no scene is playing or walking to its
 * stage, and the branches that read it then (a nap, the brief idle fallback)
 * end with that move anyway, so a hand on the mouse never re-runs this pass
 * frame after frame. Every other
 * caller leaves it off:
 *
 *  - The two that pass a live cat position as `want` every frame — the
 *    follower's fallback in the moods `planMood` builds (`mateSpot(...) ??
 *    findClearSpot(follow, …)`), which the tour asks for each frame, and the
 *    tour's and the watch's defensive `nearbySpots()` fallbacks. A `want`
 *    rejected for its head would hand the cat a target that moves with her,
 *    the feedback loop the controls note above describes, and the extra pass
 *    would add up to fifteen × nine rect checks to every frame.
 *  - `tourStopSpots`'s `restSpots` fallback, which is recomputed every frame
 *    too, but from a fixed anchor by the section's top edge rather than a cat's
 *    position: off for the per-frame cost, not for feedback.
 *  (Mini-Thien's spot, probed once per change of speaker, passes it too since
 *  round 21: the band is the cat drawing's geometry, but its rows sit at his
 *  face's height, and without it he stood on "Taylors, SC".)
 *
 * Bounded work: fifteen candidates × three rect checks, plus fifteen × nine
 * with `preferHead`.
 */
export function findClearSpot(
  want: Point,
  home: Point,
  avoid?: Point,
  { preferHead = false }: { preferHead?: boolean } = {},
): Point {
  const free = (point: Point) => (!avoid || !overlaps(point, avoid)) && isClearSpot(point);
  const wanted = clampToViewport(want);
  const candidates = nearbyWhitespace(wanted);
  if (preferHead) {
    for (const candidate of [wanted, ...candidates]) {
      if (free(candidate) && headClear(candidate)) return candidate;
    }
  }
  if (free(wanted)) return wanted;
  for (const candidate of candidates) {
    if (free(candidate)) return candidate;
  }
  const fallback = clampToViewport(home);
  if (free(fallback) && clearsControls(fallback)) return fallback;
  // The corner itself is never occupied by page content, so failing here
  // means `avoid` — another cat, or a fixed control such as the toolkit
  // toggle — is standing on it. One nudge a full cat-width away, on
  // whichever side `avoid` is not, before genuinely giving up: this
  // function never returns null, so the alternative to a nudge that also
  // fails is handing back a point already known to conflict.
  if (avoid) {
    const nudged = clampToViewport({
      x: fallback.x + (fallback.x >= avoid.x ? CAT_W : -CAT_W),
      y: fallback.y,
    });
    if (!overlaps(nudged, avoid) && clearsControls(nudged)) return nudged;
  }
  return fallback;
}

/* -------------------------------------------------------------------------- */
/* Somewhere else entirely                                                     */
/*                                                                             */
/* `findClearSpot` answers "where near here", which is the right question for   */
/* a cat that is settling down and the wrong one for a scene the visitor has    */
/* just asked for. A play needs a *stage* — a couple of hundred clear pixels    */
/* for a ball to roll across or a cat to run down — and whether one exists is   */
/* a question about the page, not about where the pair happen to be standing    */
/* when the button is pressed. Answering it from their current position is how  */
/* the same button came to give different answers depending on how long the     */
/* toolkit had been open, and how three whole sections came to answer "no room" */
/* to everything: the corner the panel calls them to is one arbitrary spot, and */
/* under Philosophy, Journey and Skills it happens to be full.                  */
/* -------------------------------------------------------------------------- */

/** How many columns the sweep below tries. Five is the two gutters, the middle
 *  of the content column, and the two quarter points — enough to find the
 *  vertical whitespace between blocks, which is where the wide scenes fit. */
const SWEEP_COLUMNS = 5;

/**
 * A coarse sweep of every place on this page a cat could stand, nearest to
 * `near` first.
 *
 * Deliberately does no clear-spot probing of its own: the caller has a more expensive
 * question to ask at each candidate than "is it clear" — whether a whole scene
 * fits there — and wants to stop at the first that answers yes rather than pay
 * for the whole grid every time.
 *
 * The grid itself is a function of the viewport alone, so the *set* of places
 * considered is the same whoever asks and whenever they ask; `near` only
 * decides the order, which is what keeps the pair from crossing the page when
 * there is somewhere to play beside them.
 */
export function standingSpots(near: Point): Point[] {
  const box = bounds();
  const stride = CAT_H + 26;
  const spots: Point[] = [];
  for (let column = 0; column < SWEEP_COLUMNS; column += 1) {
    const x = box.minX + ((box.maxX - box.minX) * column) / (SWEEP_COLUMNS - 1);
    for (let y = box.minY; y < box.maxY + stride; y += stride) {
      spots.push({ x, y: Math.min(y, box.maxY) });
    }
  }
  return spots.sort(
    (a, b) => (a.x - near.x) ** 2 + (a.y - near.y) ** 2 - ((b.x - near.x) ** 2 + (b.y - near.y) ** 2),
  );
}

/* -------------------------------------------------------------------------- */
/* Exploring: one cat per half of the page                                      */
/*                                                                             */
/* `standingSpots` above answers "every place a cat could stand", but its own   */
/* five columns are the two gutters, the content column's middle and the two    */
/* quarter points — a grid built to find whitespace *between* blocks of prose,  */
/* which on an ordinary page is the margins. Used as a destination pool that    */
/* reads, from the visitor's side, as "they always try to come to corners or    */
/* edges". The explorers draw from the whole margin-inset box instead: every    */
/* point equally likely, one cat per half of the viewport so the pair cover the */
/* page between them rather than crowding one patch of it.                      */
/* -------------------------------------------------------------------------- */

/** How many uniformly random points one half is sampled for before the picker
 *  tries the other half. Each probe is up to nine rect checks (`isClearSpot`'s
 *  three, then `headClear`'s six), and a page that is
 *  mostly prose fails most draws, which is why this is a handful and the
 *  other half is the fallback rather than a bigger number. */
export const EXPLORE_TRIES = 12;
/** The closest, centre to centre, the two explorers may be. */
export const EXPLORE_MIN_GAP = 160;
/** Two explorers whose left edges fall in the same column of this width read as
 *  one cat above the other, whatever the gap between them. */
export const EXPLORE_COLUMN = 60;

export type Half = "left" | "right";

/**
 * Whether two explorers' spots keep the pair rule: at least `EXPLORE_MIN_GAP`
 * apart centre to centre (both cats are the same size, so top-left to top-left
 * is the same distance), and never in one `EXPLORE_COLUMN` by left edge.
 */
export function exploreApart(a: Point, b: Point): boolean {
  return (
    Math.hypot(a.x - b.x, a.y - b.y) >= EXPLORE_MIN_GAP &&
    Math.floor(a.x / EXPLORE_COLUMN) !== Math.floor(b.x / EXPLORE_COLUMN)
  );
}

/**
 * A place for one explorer to be, or null when neither half of the page has one.
 *
 * Pure: the viewport, the header's height, the clear-ground probe and the random
 * source are all arguments, so every rule is testable without a DOM. Samples
 * `half` of `boundsFor(view, top)` — with `top` at `safeTop()`, the very box
 * `clampToViewport` clamps into — where a cat is "in" the half its *centre* is
 * in, and takes the first point that clears `probe` and keeps `exploreApart`
 * from `other`. When `half` yields nothing the other half is tried, so a page
 * whose left side is all prose still sends the cat somewhere rather than
 * nowhere.
 */
export function pickExploreSpot(
  half: Half,
  other: Point | null,
  view: { width: number; height: number },
  top: number,
  probe: (point: Point) => boolean,
  rng: () => number,
  // Round 21: a spot that also passes this is taken at once; otherwise the
  // first that passes `probe` once the tries run out (`walkClear`).
  prefer: (point: Point) => boolean = () => true,
): Point | null {
  const { minX, maxX, minY, maxY } = boundsFor(view, top);
  // Left of this a cat's centre is in the left half.
  const split = clamp(view.width / 2 - CAT_W / 2, minX, maxX);

  const sample = (side: Half): Point | null => {
    const lo = side === "left" ? minX : split;
    const hi = side === "left" ? split : maxX;
    let fallback: Point | null = null;
    for (let tries = 0; tries < EXPLORE_TRIES; tries += 1) {
      const point = { x: lo + rng() * (hi - lo), y: minY + rng() * (maxY - minY) };
      if (!probe(point)) continue;
      if (other && !exploreApart(point, other)) continue;
      if (prefer(point)) return point;
      fallback ??= point;
    }
    return fallback;
  };

  return sample(half) ?? sample(half === "left" ? "right" : "left");
}

/**
 * A small FNV-1a hash into `0..1` — the same shape `DrawnTree.tsx` uses for
 * its own per-branch variation, kept as a private copy here: a handful of
 * lines, not a shared dependency worth a module.
 */
function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 4096) / 4096;
}

/**
 * Left or right, deterministically, from a seed unique to one arrival.
 *
 * An exploring cat used to keep whatever facing its last step of travel left
 * it with — correct for a cat still walking, and the reason it is never
 * touched here, but a settled cat facing forever "the direction I most
 * recently arrived from" reads as an accident of pathfinding, not a choice.
 * The owner's ask is for it to actually be one: "randomly facing left or
 * right". Hashed rather than `Math.random()` so the choice for one arrival
 * is a pure function of that arrival (call it twice with the same seed, get
 * the same face) — a property a unit test can pin down, which a live
 * `Math.random()` call at the moment of arrival cannot be. The caller (see
 * `exploreTo` in `Companion.tsx`) builds the seed from the arrival time and
 * the spot chosen, which is unique enough per arrival without this module
 * ever having to hold state of its own.
 */
export function randomFacing(seed: string): 1 | -1 {
  return hash01(seed) < 0.5 ? -1 : 1;
}

/** The three scopes a section can be in. `tone-base` is the same alias set the
 *  root already carries, so it is only listed to stop `closest` walking past a
 *  base section into something outside it. */
const TONES = ".tone-contrast,.tone-deep,.tone-base";

/**
 * Repoint a cat's own semantic aliases at whatever section it is currently over.
 *
 * The cats are `position: fixed`, so they inherit their colour from the root
 * scope — the quiet one — no matter what they are flying across. Over a
 * `tone="contrast"` section in day theme that is ink line work on an ink
 * ground, which is the bug FB-4 reported. Toggling the tone class on the cat's
 * *own* wrapper repoints `--fg`, `--fg-muted`, `--accent` and `--rule-color`
 * for that one element, which is precisely what the tone layer is for: no new
 * token, no second palette, and it stays correct in both themes because the
 * theme decides what "loud" resolves to.
 *
 * `tone-deep` is sampled as well as `tone-contrast`, and it did not have to be
 * until round 5. The line work reads fine on either quiet ground, so for four
 * rounds only the loud one mattered. Then the cats became opaque: they knock
 * themselves out of the page in `var(--ground)`, and `--ground` on a `deep`
 * section is a visible half-step darker than the base one (`lichen-deep`
 * against `lichen`). A cat carrying the base ground across Contact (or, before
 * rounds 16 and 18 removed them, Philosophy and Skills) would be a paler cat-shaped patch
 * on a darker page — which is the same class of bug as the transparent cat,
 * arrived at from the other side.
 *
 * Night's light `bg-surface` paper repoints the aliases too, keyed on the
 * card rather than a tone, so `data-paper` is stamped while the cat is over
 * one (globals.css's paper scope); without it a cat on a lantern card keeps
 * the sky's pale ink.
 *
 * Written straight to the DOM rather than through React state: it changes with
 * position, and position is deliberately not in React.
 *
 * One contract on the caller, and FB-9.2 is what happens without it: whatever
 * element is handed here must name its own colour from the alias — `text-fg`,
 * `text-fg-muted` — on that element or on a descendant of it. Repointing sets
 * custom properties, and a drawing that says `currentColor` while no element
 * inside the tone scope has said `color: var(--fg-muted)` inherits a value
 * that was resolved further up, outside every tone scope. It then keeps the
 * root's ink over a `contrast` section, where the root's ink *is* that
 * section's ground: a cat drawn in the colour it is standing on.
 */
export function syncTone(node: HTMLElement | null, at: Point): void {
  if (!node) return;
  const behind = elementBehind(at.x, at.y);
  const zone = behind?.closest(TONES) ?? null;
  node.classList.toggle("tone-contrast", zone?.classList.contains("tone-contrast") === true);
  node.classList.toggle("tone-deep", zone?.classList.contains("tone-deep") === true);
  node.toggleAttribute("data-paper", behind?.closest(".bg-surface") != null);
}

/* ------------------------------------------------------- the parked pair -- */

/** Where the parked pair (touch, reduced motion) sits: a corner, and how far
 *  above the bottom inset. */
export interface Corner {
  readonly side: "right" | "left";
  readonly lift: number;
  /** Tucked off the right edge with only `PEEK` px showing. */
  readonly peek?: boolean;
}

/** How much of a peeking pair stays on screen: a WCAG 2.5.8 target and a face. */
export const PEEK = 30;

/** The inset of the parked pair from the viewport's corner (`bottom-6`). */
export const CORNER_INSET = 24;
const LIFT_STEP = 56;

/**
 * The parked pair is a fixed button, so it sits over whatever scrolls under
 * its corner — and it should never cover a control (WCAG 2.4.11, Focus Not
 * Obscured, and the owner's rule). Tries the bottom-right corner, then
 * bottom-left, then each side a step higher at a time, up to the header; the
 * first spot that touches no control wins. A spot that covers no `text`
 * either is taken first where there is one (round 21 phase 8: on phones the
 * pair sat on "Everything I've done, by year."); otherwise covering text is
 * allowed — a corner button often will. Where every spot covers something (a stack of
 * full-width rows on a phone), the pair tuck off the right edge and peek in,
 * `PEEK` px of them showing, at the first height that covers nothing; failing
 * even that, the spot that covers least. Never the `focused` control: the one
 * a keyboard visitor is on is always in view.
 */
export function pickCorner(
  view: { readonly width: number; readonly height: number },
  size: { readonly width: number; readonly height: number },
  controls: readonly RectLike[],
  focused: RectLike | null = null,
  text: readonly RectLike[] = [],
): Corner {
  let best: Corner = { side: "right", lift: 0 };
  let least = Infinity;
  const top = view.height - size.height - CORNER_INSET - 80; // under the sticky header
  const spots: Corner[] = [];
  for (let lift = 0; lift <= top; lift += LIFT_STEP) spots.push({ side: "right", lift }, { side: "left", lift });
  for (let lift = 0; lift <= top; lift += LIFT_STEP) spots.push({ side: "right", lift, peek: true });
  const boxOf = (spot: Corner): RectLike => {
    const left = spot.peek
      ? view.width - PEEK
      : spot.side === "right"
        ? view.width - CORNER_INSET - size.width
        : CORNER_INSET;
    const bottom = view.height - CORNER_INSET - spot.lift;
    return { left, right: left + size.width, top: bottom - size.height, bottom };
  };
  if (text.length > 0) {
    for (const spot of spots) {
      if (spot.peek) continue;
      const box = boxOf(spot);
      if (focused && intersects(box, focused)) continue;
      if (!controls.some((r) => intersects(box, r)) && !text.some((r) => intersects(box, r))) return spot;
    }
  }
  for (const spot of spots) {
    const box = boxOf(spot);
    if (focused && intersects(box, focused)) continue;
    let covered = 0;
    for (const rect of controls) {
      if (!intersects(box, rect)) continue;
      covered +=
        (Math.min(box.right, rect.right) - Math.max(box.left, rect.left)) *
        (Math.min(box.bottom, rect.bottom) - Math.max(box.top, rect.top));
    }
    if (covered === 0) return spot;
    if (covered < least) {
      least = covered;
      best = spot;
    }
  }
  return best;
}

/**
 * The controls under `box`, measured live: the cached boxes find the
 * candidates within 64px (cheap), and each candidate is measured now, so a
 * card that is still settling is right on the frame it is drawn (round 21
 * review). Hit-testing the box instead cost 40 `elementsFromPoint` a frame.
 */
export function controlRectsUnder(box: RectLike): RectLike[] {
  groundRects();
  const near = 64;
  const found: RectLike[] = [];
  controls.forEach((cached, i) => {
    if (
      cached.right < box.left - near ||
      cached.left > box.right + near ||
      cached.bottom < box.top - near ||
      cached.top > box.bottom + near
    ) {
      return;
    }
    const live = controlEls[i].getBoundingClientRect();
    if (live.right > box.left && live.left < box.right && live.bottom > box.top && live.top < box.bottom) {
      found.push(live);
    }
  });
  return found;
}

/** Every block of words on screen, outside the companion, measured now. */
export function textRectsInView(): RectLike[] {
  return rectsInView(PROSE);
}

/** Every control on screen, outside the companion, measured now. */
export function controlRectsInView(): RectLike[] {
  return rectsInView(CONTROLS);
}

function rectsInView(selector: string): RectLike[] {
  const view = viewport();
  const rects: RectLike[] = [];
  for (const element of document.querySelectorAll(selector)) {
    if (element.closest(SELF)) continue;
    const box = element.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) continue;
    if (box.bottom < 0 || box.top > view.height || box.right < 0 || box.left > view.width) continue;
    rects.push(box);
  }
  return rects;
}
