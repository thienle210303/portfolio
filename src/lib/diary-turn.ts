/**
 * The Diary's page turn (round 24), as numbers. `DiaryBook.tsx` paints them.
 *
 * A turning leaf has two faces, each a real page (or a blank sheet, in a
 * riffle and on one page) hinged on the spine: the face on the side the leaf
 * starts from, and the face it shows once it lies on the other side. Progress
 * `p` runs from 0 (lying where it started) to 1 (lying on the other side); at
 * 0.5 the leaf stands upright over the spine. `dir` 1 turns forward (the right
 * page over to the left), -1 back.
 */

/** One leaf, pressed or keyed: lifts, crosses, settles. */
export const TURN_MS = 760;
/** One leaf of a riffle, and the gap before the next one goes. */
export const RIFFLE_LEAF_MS = 440;
export const RIFFLE_GAP_MS = 75;
/** A riffle flicks at most this many leaves, however far it goes. */
export const RIFFLE_MAX = 6;

export type TurnDir = 1 | -1;

const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);

/** Slow off the page, quick over the spine, slow onto the other side. */
export function easeInOut(x: number): number {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** A released leaf, already moving, slowing into place. */
export function easeOut(x: number): number {
  return 1 - (1 - clamp01(x)) ** 3;
}

/**
 * Each face's `rotateY`, in degrees, about the spine. The start face lies flat
 * at 0 and the arrive face at 180 the other way, so the two stay back to back:
 * one plane, one leaf.
 */
export function faceAngles(p: number, dir: TurnDir): { readonly start: number; readonly arrive: number } {
  return { start: -dir * 180 * p || 0, arrive: dir * 180 * (1 - p) || 0 };
}

/**
 * The shadow a leaf at `p` throws on the page lying under it on one side:
 * `edge`, where the leaf's free edge stands over that page (0 at the spine, 1
 * at the fore-edge); `width`, how far past it the shadow reaches (as a share of
 * the page); `alpha`, how dark. Darkest beside the edge while the leaf stands
 * over that page, and only a soft fall near the spine while it is over the
 * other one.
 */
export function shadeOn(side: "start" | "arrive", p: number): { readonly edge: number; readonly width: number; readonly alpha: number } {
  const lift = Math.sin(Math.PI * clamp01(p));
  const reach = Math.cos(Math.PI * clamp01(p));
  const over = side === "start" ? reach : -reach;
  return { edge: Math.max(over, 0), width: 0.06 + 0.34 * lift, alpha: (over > 0 ? 0.42 : 0.18) * lift };
}

/**
 * The light on a face, by how far it has lifted off its side (0 flat, 0.5
 * upright): it dims as it turns away from the light, toward the spine, and a
 * band of light runs across the curl, from the free edge in, brightest half
 * way up.
 */
export function faceLight(lift: number): { readonly dim: number; readonly glint: number; readonly at: number } {
  const q = Math.min(clamp01(lift), 0.5);
  return { dim: 0.5 * Math.sin(Math.PI * q), glint: 0.5 * Math.sin(2 * Math.PI * q), at: 1 - 1.3 * q };
}

/**
 * How far a drag has turned the leaf: `travel` px in the turn's direction, on
 * pages `width` px wide. The leaf's free edge follows the pointer, so the
 * angle is the one whose shadow on the page is that far from the spine.
 */
export function dragProgress(travel: number, width: number): number {
  if (width <= 0) return 0;
  const x = 1 - Math.max(travel, 0) / width;
  return Math.acos(Math.min(Math.max(x, -1), 1)) / Math.PI;
}

/**
 * Does a released drag complete the turn? A flick does, whatever its length
 * (`velocity` in px/ms, positive in the turn's direction); a slow drag does
 * past halfway: the leaf upright over the spine of a spread, or on one page
 * the curl's corner pulled past the page's middle (`curlProgress` of half a
 * page width, a quarter of the corner's way).
 */
export function completes(p: number, velocity: number, single: boolean): boolean {
  if (velocity > 0.45) return true;
  if (velocity < -0.45) return false;
  return p >= (single ? 0.25 : 0.5);
}

/* ------------------------------------------------------------------ */
/* One page: the corner curl (2026-11-02)                              */
/*                                                                     */
/* Where the book shows one page, a turn would squash it into the      */
/* left half beside the next one, a spread for a moment. So one page   */
/* curls instead, flat, in 2D: its corner `C` on the fore-edge is      */
/* pulled to `P`, and the fold is the perpendicular bisector of C–P.   */
/* The spine side of the fold lies flat; the corner's side folds back  */
/* over it, the page's blank back reflected across the fold; and the   */
/* next page shows in the wedge the page has left. Page px, the origin */
/* at the page's top left, the spine on the left. Curl progress `c`    */
/* runs from 0 (flat) to 1 (turned away past the spine); a back turn   */
/* runs it from 1 to 0.                                                */
/* ------------------------------------------------------------------ */

export type Pt = readonly [number, number];

/** At the end of a curl the fold stands this far past the spine, so the
 *  whole page, the part off screen too, has cleared it. */
export const CURL_PAST = 4;
/** The fold's lean as a curl starts, in px across per px up: a dog-ear's,
 *  just under 45°. It eases off as the fold nears the spine. */
export const CURL_LEAN = 0.9;
/** How far the flap's clip reaches past its free edges, for the faint
 *  shadow it casts on the page there. */
export const CURL_HALO = 24;

/**
 * Where the pulled corner is at curl progress `c`: how far it has come in
 * from the fore-edge, and how far it has risen. It crosses twice the page's
 * width (as far past the spine as it started from it), and rises as it goes,
 * so the fold leans across the page; the rise falls off near the end, and the
 * fold straightens only as it leaves through the spine.
 */
export function cornerPath(c: number, width: number): { readonly across: number; readonly rise: number } {
  const t = clamp01(c);
  const across = 2 * (Math.max(width, 0) + CURL_PAST) * t;
  return { across, rise: CURL_LEAN * Math.sqrt(1 - t) * across };
}

/** How far a hand has curled one page: `travel` px in the turn's direction,
 *  the corner following it. */
export function curlProgress(travel: number, width: number): number {
  return clamp01(Math.max(travel, 0) / (2 * (Math.max(width, 0) + CURL_PAST)));
}

/** The corner to pull: the foot of the part of a page `height` px tall that
 *  is on screen (`top`, the page's top in window px; `view`, the window's
 *  height). The page's own corner when its foot is on screen; its foot when
 *  none of it is. */
export function curlAnchor(top: number, height: number, view: number): number {
  const foot = Math.min(Math.max(view - top, 0), height);
  return foot > Math.max(-top, 0) ? foot : height;
}

/** Keep the part of a convex polygon where `x·nx + y·ny ≤ k`. */
function keep(poly: readonly Pt[], nx: number, ny: number, k: number): Pt[] {
  const out: Pt[] = [];
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length];
    const da = a[0] * nx + a[1] * ny - k;
    const db = b[0] * nx + b[1] * ny - k;
    if (da <= 0) out.push(a);
    if (da * db < 0) {
      const t = da / (da - db);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  });
  return out;
}

export interface Curl {
  /** The fold, as `x·normal = at`; the normal points to the corner's side. */
  readonly normal: Pt;
  readonly at: number;
  /** Where the corner has got to. */
  readonly corner: Pt;
  /** The page still lying flat, on the spine side: its clip. */
  readonly flat: readonly Pt[];
  /** Where the page has lifted off: the next page shows here. */
  readonly peeled: readonly Pt[];
  /** The flap's clip, in its own px (the page's, before the reflection): the
   *  lifted part, and a halo's margin past its free edges, as far as its
   *  reflection lies inside the page. */
  readonly flap: readonly Pt[];
  /** The reflection across the fold, for CSS `matrix(a, b, c, d, e, f)`. */
  readonly matrix: readonly [number, number, number, number, number, number];
  /** A gradient across the fold, toward the corner's side, on a page-sized
   *  box: its CSS angle, where the fold falls on it, and the flap's depth
   *  (the fold to its free corner), all in px. */
  readonly angle: number;
  readonly fold: number;
  readonly depth: number;
  /** 0 lying flat, 1 half way: how strong the shadows are. */
  readonly lift: number;
}

/**
 * One page curled to `c`, its corner pulled from the fore-edge at height
 * `anchor`. `hand` is how far a hand has lifted the corner above where the
 * curl would have it on its own (px up; never lower, never steeper than 45°).
 */
export function curl(c: number, width: number, height: number, anchor: number, hand = 0): Curl {
  const W = Math.max(width, 1);
  const H = Math.max(height, 1);
  const { across, rise: own } = cornerPath(c, W);
  const rise = Math.max(own, Math.min(hand, across));
  const cx = W;
  const cy = Math.min(Math.max(anchor, 0), H);
  const px = W - across;
  const py = cy - rise;
  const box: Pt[] = [[0, 0], [W, 0], [W, H], [0, H]];
  const len = Math.hypot(across, rise);
  if (len < 1e-6) {
    return { normal: [1, 0], at: W, corner: [cx, cy], flat: box, peeled: [], flap: [], matrix: [1, 0, 0, 1, 0, 0], angle: 90, fold: W, depth: 0, lift: 0 };
  }
  const nx = across / len;
  const ny = rise / len;
  const k = ((cx + px) / 2) * nx + ((cy + py) / 2) * ny;
  // The reflection: x' = x − 2(x·n − k)n.
  const a = 1 - 2 * nx * nx;
  const b = -2 * nx * ny;
  const d = 1 - 2 * ny * ny;
  const e = 2 * k * nx;
  const f = 2 * k * ny;
  // The flap: the lifted side, grown past the free edges (never the bound
  // one), and only where its reflection lands on the page.
  let flap = keep([[0, -CURL_HALO], [W + CURL_HALO, -CURL_HALO], [W + CURL_HALO, H + CURL_HALO], [0, H + CURL_HALO]], -nx, -ny, -k);
  flap = keep(flap, -a, -b, e);
  flap = keep(flap, a, b, W - e);
  flap = keep(flap, -b, -d, f);
  flap = keep(flap, b, d, H - f);
  // The gradient line of a W × H box at this angle runs through its middle.
  const run = Math.abs(W * nx) + Math.abs(H * ny);
  return {
    normal: [nx, ny],
    at: k,
    corner: [px, py],
    flat: keep(box, nx, ny, k),
    peeled: keep(box, -nx, -ny, -k),
    flap,
    matrix: [a, b, b, d, e, f],
    angle: (Math.atan2(nx, -ny) * 180) / Math.PI,
    fold: k - (W / 2) * nx - (H / 2) * ny + run / 2,
    depth: len / 2,
    lift: Math.sin(Math.PI * clamp01(c)),
  };
}

/** A curl's leaves in a stack: the first to go on top going forward, the
 *  last to land on top coming back; each flap just over its own page. */
export function curlZ(k: number, n: number, dir: TurnDir): number {
  return 20 + 2 * (dir === 1 ? n - 1 - k : k);
}

/** How many leaves flick over to go `turns` turns: all of them, up to six. */
export function riffleLeaves(turns: number): number {
  return Math.min(Math.max(Math.round(turns), 1), RIFFLE_MAX);
}

/** How long `n` leaves take, from the first lifting to the last landing. */
export function turnMs(n: number, quick = false): number {
  if (n <= 1) return quick ? TURN_MS * 0.6 : TURN_MS;
  return RIFFLE_LEAF_MS + (n - 1) * RIFFLE_GAP_MS;
}

/** Leaf `k` of `n`, `elapsed` ms in. One leaf turns at its own pace; a
 *  riffle's leaves go one after another, close together. */
export function leafProgress(elapsed: number, k: number, n: number, quick = false): number {
  if (n <= 1) return easeInOut(elapsed / turnMs(1, quick));
  return easeInOut((elapsed - k * RIFFLE_GAP_MS) / RIFFLE_LEAF_MS);
}

/** A leaf over its start side sits on top of the ones still under it (the
 *  first lifted is the top one); over the other side, the last to land is. */
export function leafZ(p: number, k: number, n: number): number {
  return p < 0.5 ? 20 + n - k : 40 + k;
}

/** The opening a page is shown in: the page itself, or on a spread the left
 *  page of its pair. */
export function openingOf(index: number, per: 1 | 2, pages: number): number {
  const i = Math.min(Math.max(Math.trunc(index), 0), Math.max(pages - 1, 0));
  return per === 2 ? i - (i % 2) : i;
}

/** The viewer stands at least this many page widths from the book, at any
 *  size, so a turn keeps its shape on a phone and on a spread. */
export const DEPTH = 4;

/** How far a turning leaf may show past the book's top or foot: the boards'
 *  lip, no more. */
export const LIP = 12;

/**
 * Where the reader's eye is for a turn, and how far away. Upright over the
 * spine a leaf's free edge is a page width nearer the eye, so in perspective
 * it looks taller, by `width / (depth − width)` of its distance from the eye's
 * line (`y`). Put the eye where the reader is looking: on the book's top or
 * foot if only one of them is on screen (that edge then does not grow at
 * all, and the other grows off screen), half way between them if both are,
 * and the window's middle if neither is. Then stand back far enough that an
 * edge on screen grows by `lip` at most. `top`, `foot` and `y` are in window
 * px; `view` is the window's height.
 */
export function camera(top: number, foot: number, view: number, width: number, lip = LIP): { readonly y: number; readonly depth: number } {
  const sees = (edge: number) => edge >= 0 && edge <= view;
  const t = sees(top);
  const f = sees(foot);
  const y = t && f ? (top + foot) / 2 : t ? top : f ? foot : Math.min(Math.max(view / 2, top), foot);
  const reach = Math.max(t ? Math.abs(y - top) : 0, f ? Math.abs(foot - y) : 0);
  const w = Math.max(width, 1);
  return { y, depth: Math.max(DEPTH * w, w * (1 + reach / Math.max(lip, 1))) };
}

/**
 * The room a turning leaf needs round the opening so nothing of it on screen
 * is clipped. Top and foot: the lip (`camera` keeps an edge on screen inside
 * it; an edge off screen may grow past it, unseen). Sideways: on a spread the
 * free edge reaches a little past the fore-edge just after it lifts (at the
 * nearest the eye ever stands); one page curls inside its own box, so it
 * needs only the lip. Equal on every side (one outline offset fits it), with
 * a few px for the rounding.
 */
export function turnRoom(width: number, spread: boolean): { readonly depth: number; readonly room: number } {
  const depth = DEPTH * Math.max(width, 1);
  const k = 1 / DEPTH;
  const side = spread ? width * (1 / Math.sqrt(1 - k * k) - 1) : 0;
  return { depth: Math.round(depth), room: Math.ceil(Math.max(LIP, side)) + 4 };
}

/* ------------------------------------------------------------------ */
/* One page: as tall as what is on it (round 25)                       */
/*                                                                     */
/* Where the book shows one page, a page is its own height (never      */
/* under a floor of about a screen), so a turn can land on a page      */
/* taller or shorter than the one it left. While the leaf is in the    */
/* air the book keeps the height it had, both pages laid out under it  */
/* at the taller's; once it has landed the book eases to the new       */
/* page's height.                                                      */
/* ------------------------------------------------------------------ */

/** How long the book takes to ease to a landed page's height. */
export const SETTLE_MS = 280;

/** What stays under the fold when a just-bound book takes its first page's
 *  height: the dog-eared corners (44px) and a hair, so nothing on screen moves. */
export const HOLD_LIP = 48;

/**
 * The least a just-bound book of one page may stand, so that taking its first
 * page's own height moves nothing on screen (a layout shift on load): its foot
 * stays `lip` under the fold. `top` is the page's top in window px, `view` the
 * window's height. Nothing, when the book is far below the fold (the usual
 * load); the whole distance, when it is above the window, so it does not
 * shrink over the reader's head either. `DiaryBook` drops it at the first
 * turn.
 */
export function holdHeight(top: number, view: number, lip = HOLD_LIP): number {
  return Math.max(Math.ceil(view + lip - top), 0);
}

/**
 * How far the window goes with the book as it changes height by `grow` px
 * after a turn (px down the document; negative is up). The pages hang from
 * the book's top, so a book growing moves nothing the reader is looking at:
 * its foot goes on down. A book shrinking with its top on screen (at or under
 * the header's line, `header` px down the window) only brings its foot up.
 * But a reader further down a tall page would be left looking at whatever
 * follows the book, so the window follows the foot up, and stops when the
 * page's top reaches the header's line. `top` is the page's top in window px.
 */
export function settleScroll(top: number, grow: number, header: number): number {
  if (grow >= 0 || top >= header) return 0;
  return Math.max(grow, top - header);
}

/** The leaves stacked either side of the opening: read on the left, still to
 *  come on the right (a leaf is two pages). */
export function stackLeaves(at: number, per: 1 | 2, pages: number): { readonly read: number; readonly left: number } {
  return { read: Math.ceil(Math.max(at, 0) / 2), left: Math.ceil(Math.max(pages - at - per, 0) / 2) };
}
