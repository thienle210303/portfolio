import { LineWork, Silhouette, STROKE, type Part } from "./CompanionCat";

/**
 * Mini-Thien: the narrator.
 *
 * Round 10's owner decision is "cats speak meow only; a mini line-drawn Thien
 * translates" — so the cats keep their meows and this is the figure who
 * carries the English. He is drawn in the same ink discipline as the cats
 * (see the file banner on `CompanionCat.tsx`): typed parts, a ground-filled
 * silhouette under open strokes, one continuous contour wherever the shape
 * allows it. He shares that module's two-pass renderer — `Silhouette` lays
 * the knockout down first, `LineWork` draws the ink over it — rather than a
 * second copy of the masking logic, so a page behind him is knocked out in
 * `var(--ground)` exactly the way a cat's body is.
 *
 * Unlike the cats he carries no coat wash: every closed part below is `bare`,
 * which is what `LineWork` reads as "ink only, no fill" — a plain line figure
 * with a notebook, not a solid-coloured one. Colour comes from `currentColor`
 * the same way the tabby's does, which is what makes `Companion.tsx`'s
 * `syncTone` contract hold here too: the wrapper `syncTone` repoints is the
 * element this drawing's `currentColor` actually resolves against.
 *
 * Purely presentational and `aria-hidden`, the same as `CompanionCat`:
 * `Companion` owns his position, his mount/unmount and the caption beside
 * him. He carries no pose of his own — position is transform-only, exactly
 * like the toy and the duet's own bubbles, so "walking in" is nothing more
 * than the loop moving the wrapper he sits inside towards the speaking cat.
 */

/** His own local drawing box — narrower and taller than a cat's, because he
 *  stands rather than crouches on all fours. */
export const THIEN_W = 30;
export const THIEN_H = 54;

/** A closed circle, described as two arcs so it can sit in the same `area`
 *  part list as every straight-edged contour below — the head is the one
 *  round shape this figure needs, and it does not need a part kind of its
 *  own for that. */
function circlePath(cx: number, cy: number, r: number): string {
  return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
}

const HEAD = { cx: 15, cy: 7.6, r: 5.2 } as const;

/** Shoulders to hips, one closed contour — the mask fills it and knocks the
 *  page out from behind the torso the same way a cat's body does. */
const TORSO =
  "M 9.5 15 C 7 15.6, 6 19, 6.4 24 L 7 34.5 C 7.2 37.5, 9.5 39, 15 39" +
  " C 20.5 39, 22.8 37.5, 23 34.5 L 23.6 24 C 24 19, 23 15.6, 20.5 15 Z";

/** Legs, open strokes — a small stride offset between them so a standing
 *  figure still reads as a person rather than a post. */
const LEG_LEFT = "M 11 38.5 L 9.4 53";
const LEG_RIGHT = "M 19 38.5 L 20.6 53";

/** One arm crooked to hold the notebook against the chest; the other at ease
 *  by his side — the same asymmetry that tells the cats' own batting paw
 *  from their idle one apart. */
const ARM_BOOK = "M 7.5 19 C 4.5 21, 3.5 24.5, 4.5 27.5";
const ARM_SIDE = "M 22.5 19 L 24.5 27";

/** The notebook itself: a small closed rectangle held where the crooked arm
 *  ends. `bare`, like the rest of him — never filled solid, which would spend
 *  the one colour this drawing is allowed on decoration rather than on the
 *  caption beside it. */
const NOTEBOOK = "M 1.2 24.5 L 8 24.5 L 8 31.2 L 1.2 31.2 Z";

const PARTS: readonly Part[] = [
  { kind: "area", d: circlePath(HEAD.cx, HEAD.cy, HEAD.r), bare: true },
  { kind: "area", d: TORSO, bare: true },
  { kind: "line", d: LEG_LEFT },
  { kind: "line", d: LEG_RIGHT },
  { kind: "line", d: ARM_BOOK },
  { kind: "line", d: ARM_SIDE },
  { kind: "area", d: NOTEBOOK, bare: true },
];

export function MiniThien() {
  return (
    <svg
      data-thien=""
      viewBox={`0 0 ${THIEN_W} ${THIEN_H}`}
      width={THIEN_W}
      height={THIEN_H}
      aria-hidden="true"
      focusable="false"
    >
      <Silhouette parts={PARTS} />
      <LineWork parts={PARTS} coat={STROKE} />
    </svg>
  );
}

export default MiniThien;
