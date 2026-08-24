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
 * Round 14: he is meant to actually look like Thien, verbatim — "silly but
 * dry/friendly · glasses · tall · short dark hair, ivy-league cut (the short
 * one)". Every closed part below except one is still `bare` — outline only,
 * the same plain line figure round 10 shipped — but the hair mass is not:
 * it carries a *denser* `currentColor` wash than the cats' own coat (see
 * `HAIR_WASH`), which is what "dark hair" has to mean in a system with one
 * hue reserved for annotation and nothing else spent on decoration — ink
 * density standing in for a colour this drawing is not allowed to reach for.
 * Colour otherwise comes from `currentColor` the same way the tabby's does,
 * which is what makes `Companion.tsx`'s `syncTone` contract hold here too:
 * the wrapper `syncTone` repoints is the element this drawing's
 * `currentColor` actually resolves against.
 *
 * The glasses and the one raised eyebrow are drawn outside the masked part
 * list, on the same footing as a cat's eye in `CompanionCat.tsx`: they sit
 * on a skull the mask has already knocked the page out from behind, so
 * masking them too would knock a second, redundant hole in the same ground.
 *
 * Purely presentational and `aria-hidden`, the same as `CompanionCat`:
 * `Companion` owns his position, his mount/unmount and the caption beside
 * him. He carries no pose of his own — position is transform-only, exactly
 * like the toy and the duet's own bubbles, so "walking in" is nothing more
 * than the loop moving the wrapper he sits inside towards the speaking cat.
 */

/** His own local drawing box — narrower and taller than a cat's, because he
 *  stands rather than crouches on all fours, and taller again than round
 *  10's own figure: "tall" is the first word of the owner's brief, and nine
 *  fewer units of width against the same height is what a lanky frame reads
 *  as at this scale. */
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

/**
 * The hair mass: an ivy-league cut — short back and sides, tight to the
 * skull from the temple down to the ear, with enough left on top to comb
 * across, and a break in the hairline just left of centre for the part.
 * Closed rather than open, because the whole point of it is a *filled*
 * area — see `HAIR_WASH` below — and an open stroke cannot carry a fill
 * without auto-closing across its own gap the way a cat's tail cannot.
 *
 * Drawn a little proud of the head circle's own top edge (the circle's top
 * sits at `cy - r`, this crowns above it) for the "slightly longer on top"
 * half of the brief; drawn hugging the circle everywhere else for the
 * "short back and sides" half.
 */
const HAIR =
  "M 9.8 7.3 C 9.1 5, 9.3 2.6, 11 1.6 C 11.6 2.4, 11.5 3.2, 10.9 3.7" +
  " C 12.4 1.5, 15.2 0.5, 17.6 1.4 C 19.7 2.2, 20.7 4.6, 20.3 6.9" +
  " C 17.2 5.2, 12.6 5.2, 9.8 7.3 Z";

/**
 * How much denser than the cats' own coat wash the hair reads. Round 13's
 * "dark hair" has to be spent as ink, not as a second colour — the palette
 * has exactly one hue and it is reserved for annotation — so this is the
 * one number in the file that carries that instruction. Higher than
 * `CompanionCat.tsx`'s own `COAT_WASH` (0.42) on purpose: the grey cat's
 * wash reads as a solid *coat* beside the tabby's bare outline, but hair is
 * a smaller, denser mass sitting on top of an otherwise entirely open
 * figure, and it has to hold its own next to that much more line work.
 */
const HAIR_WASH = 0.68;
const HAIR_COAT = { ...STROKE, fill: "currentColor", fillOpacity: HAIR_WASH } as const;

/** Shoulders to hips, one closed contour — the mask fills it and knocks the
 *  page out from behind the torso the same way a cat's body does. Narrower
 *  through the chest and waist than round 10's own figure (was 6–23.6, is
 *  now 7.7–22.3): the same "tall" instruction read the other way, since a
 *  frame this height stops reading as lanky if it is also this broad. */
const TORSO =
  "M 10 15 C 8 15.6, 7.4 19, 7.7 24 L 8.2 34.5 C 8.4 37.3, 10.2 39, 15 39" +
  " C 19.8 39, 21.6 37.3, 21.8 34.5 L 22.3 24 C 22.6 19, 22 15.6, 20 15 Z";

/** Legs, open strokes — a small stride offset between them so a standing
 *  figure still reads as a person rather than a post, and weight eased onto
 *  the left one (the slightly longer, straighter line) for the "relaxed
 *  slouch" half of his posture — small, on the legs alone, rather than a
 *  whole costumed stance. */
const LEG_LEFT = "M 11.5 38.5 L 9.6 53";
const LEG_RIGHT = "M 18.5 38.5 L 19.8 51.5";

/** One arm crooked to hold the notebook against the chest; the other at ease
 *  by his side — the same asymmetry that tells the cats' own batting paw
 *  from their idle one apart, and here it is doing double duty as the rest
 *  of "relaxed": a figure holding one thing and letting the other arm just
 *  hang is a figure at ease, without needing a pose system of his own to
 *  say so. */
const ARM_BOOK = "M 8 19 C 5 21, 4 24.5, 5 27.5";
const ARM_SIDE = "M 22 19.4 C 23.4 22, 23.8 25, 23.2 27.8";

/** The notebook itself: a small closed rectangle held where the crooked arm
 *  ends. `bare`, like the rest of him — never filled solid, which would spend
 *  the one colour this drawing is allowed on decoration rather than on the
 *  caption beside it. */
const NOTEBOOK = "M 1.6 24.5 L 8.4 24.5 L 8.4 31.2 L 1.6 31.2 Z";

const PARTS: readonly Part[] = [
  { kind: "area", d: circlePath(HEAD.cx, HEAD.cy, HEAD.r), bare: true },
  // Not `bare`: this is the one part of him the coat wash reaches, and it is
  // handed `HAIR_COAT` rather than the drawing's ordinary `STROKE` — see
  // `MiniThien` below.
  { kind: "area", d: HAIR },
  { kind: "area", d: TORSO, bare: true },
  { kind: "line", d: LEG_LEFT },
  { kind: "line", d: LEG_RIGHT },
  { kind: "line", d: ARM_BOOK },
  { kind: "line", d: ARM_SIDE },
  { kind: "area", d: NOTEBOOK, bare: true },
];

/**
 * Glasses and the one raised eyebrow — drawn straight to the page rather
 * than through the masked part list, exactly the way `CompanionCat.tsx`
 * draws a cat's eye: both sit on a skull the mask has already covered, and
 * masking a stroke that lies entirely inside an already-knocked-out area
 * would only cut a second, pointless hole in the same ground.
 *
 * Two small rings and a bridge is what "glasses" has to reduce to at this
 * scale and still read in both themes — full `STROKE` weight throughout
 * rather than a thinner line of their own, because a hairline stroke this
 * small is the first thing to disappear under anti-aliasing, and legibility
 * at the drawn scale is the one hard requirement the brief names for them.
 *
 * The eyebrow is the whole of "silly but dry/friendly" this drawing spends:
 * one short raised stroke over the right lens, nothing else — a hint, not a
 * costume.
 */
function Face() {
  const eyeY = HEAD.cy + 0.3;
  const lensR = 1.7;
  const leftCx = HEAD.cx - 2.5;
  const rightCx = HEAD.cx + 2.5;
  return (
    <>
      <circle {...STROKE} cx={leftCx} cy={eyeY} r={lensR} />
      <circle {...STROKE} cx={rightCx} cy={eyeY} r={lensR} />
      <path {...STROKE} d={`M ${leftCx + lensR} ${eyeY} L ${rightCx - lensR} ${eyeY}`} />
      <path {...STROKE} d={`M ${leftCx - lensR} ${eyeY} L ${leftCx - lensR - 1.3} ${eyeY - 0.4}`} />
      <path {...STROKE} d={`M ${rightCx + lensR} ${eyeY} L ${rightCx + lensR + 1.3} ${eyeY - 0.4}`} />
      <path
        {...STROKE}
        d={`M ${rightCx - 1.3} ${eyeY - lensR - 1.5} Q ${rightCx + 0.3} ${eyeY - lensR - 2.5} ${
          rightCx + 1.6
        } ${eyeY - lensR - 1.7}`}
      />
    </>
  );
}

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
      <LineWork parts={PARTS} coat={HAIR_COAT} />
      <Face />
    </svg>
  );
}

export default MiniThien;
