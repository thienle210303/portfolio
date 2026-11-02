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
 * its free edge past the page's middle.
 */
export function completes(p: number, velocity: number, single: boolean): boolean {
  if (velocity > 0.45) return true;
  if (velocity < -0.45) return false;
  return p >= (single ? 1 / 3 : 0.5);
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

/** The viewer stands this many page widths from the book, at any size, so a
 *  turn keeps its shape on a phone and on a spread. */
export const DEPTH = 4;

/**
 * The perspective for pages `width` × `height` px, and the room a turning
 * leaf needs round the opening so nothing of it is clipped: upright over the
 * spine, its near edge stands `depth − width` from the viewer and looks
 * taller by `width / (depth − width)`; on a spread its free edge reaches a
 * little past the fore-edge just after it lifts. On one page a leaf turned
 * past upright swings out over the margin, where the window's edge clips it
 * anyway, so sideways it needs only the `gutter` to that edge. Equal on every
 * side (one outline offset fits it), with a few px for the rounding.
 */
export function turnRoom(width: number, height: number, spread: boolean, gutter: number): { readonly depth: number; readonly room: number } {
  const depth = DEPTH * Math.max(width, 1);
  const up = (height / 2) * (width / (depth - width));
  const k = 1 / DEPTH;
  const side = spread ? width * (1 / Math.sqrt(1 - k * k) - 1) : Math.min(width * 1.1, Math.max(gutter, 0));
  return { depth: Math.round(depth), room: Math.ceil(Math.max(up, side, 0)) + 12 };
}

/** The leaves stacked either side of the opening: read on the left, still to
 *  come on the right (a leaf is two pages). */
export function stackLeaves(at: number, per: 1 | 2, pages: number): { readonly read: number; readonly left: number } {
  return { read: Math.ceil(Math.max(at, 0) / 2), left: Math.ceil(Math.max(pages - at - per, 0) / 2) };
}
