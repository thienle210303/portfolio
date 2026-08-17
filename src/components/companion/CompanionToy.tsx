/**
 * The things the cats occasionally play with: a ball of yarn and a moth.
 *
 * ## Why neither of them is a laser dot
 *
 * The obvious toy is a laser pointer, and a laser pointer is a red dot. This
 * site has exactly one hue — the annotation blue — and `CLAUDE.md` reserves it
 * for links, measured values and the single primary control per screen: "it is
 * never decoration". A red dot would be a second hue introduced for pure
 * decoration, which breaks that rule twice over, and a *blue* dot would spend
 * the site's one meaningful colour on a cat toy — so a visitor scanning for the
 * next link would find a bouncing spot instead.
 *
 * So the toys are drawn the way the cats are: `currentColor`, one stroke
 * weight, no fill. They inherit theme and tone from whatever they are lying
 * over exactly as the animals do, they cost no token, and at 24px they read as
 * line drawings rather than as UI.
 *
 * ## Why the moving parts are groups rather than props
 *
 * A rolling ball and a fluttering wing change every frame, and the companion's
 * whole performance argument is that per-frame values never go through React.
 * The two things that move are their own `<g>`s with a ref each, and the loop
 * writes one `transform` to each — the same trick the cats' positions use.
 *
 *  - `artRef` is the *direction* group: the yarn's unravelling tail flips to
 *    trail behind the roll, and the moth's wings beat by being squashed on the
 *    same axis. One write serves both because the moth is bilaterally
 *    symmetric, so a negative scale on it is indistinguishable from a positive
 *    one.
 *  - `spinRef` is the yarn's roll, and only the yarn has one.
 *
 * Both groups declare `transform-box: view-box` and an explicit origin in user
 * units. The default box would centre each rotation on the group's *own*
 * bounding box, which puts the tail's flip axis in the middle of the tail
 * instead of in the middle of the ball.
 *
 * Purely presentational and `aria-hidden`, like `CompanionCat`: `Companion`
 * owns every behaviour, and a toy is never a control.
 */

import type { Ref } from "react";

/** One toy's local drawing box. Wide enough that the yarn's tail fits on
 *  *either* side of the ball, because flipping it is how the tail trails the
 *  roll — and an SVG root clips its own overflow, so a tail that only fits
 *  facing right would simply vanish rolling left. */
export const TOY_W = 24;
export const TOY_H = 20;

export type ToyKind = "yarn" | "moth";

/** The cats' stroke, to the tenth. A toy drawn at a different weight reads as
 *  a different illustration lying next to the animals rather than as part of
 *  the same drawing. */
const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** The ball's centre, and the point both of the yarn's groups turn about. */
const BALL = { x: 12, y: 10, r: 6.4 } as const;

const SPIN_ORIGIN = {
  transformBox: "view-box",
  transformOrigin: `${BALL.x}px ${BALL.y}px`,
} as const;

/** Two windings across the ball, chorded so both ends and both control points
 *  stay inside the circle — a strand that escapes the silhouette stops reading
 *  as wound yarn and starts reading as a scribble over a circle. */
const WIND_A = "M 6.2 11.8 C 9 15, 13.5 14.6, 17.6 11.4";
const WIND_B = "M 7.6 6.6 C 10.5 9.5, 12.5 12, 15.2 15.4";

/** The unravelled end: one loose strand off the ball, kinked twice so it reads
 *  as slack line rather than as a whisker. */
const YARN_TAIL = "M 18.2 7.6 c 3.6 -0.4, 4.6 2.6, 2.4 4 c -1.8 1.1, -0.8 3.2, 1.2 3.6";

/** The moth. Body and antennae are static; only the wings are in the group the
 *  loop squashes, so a flap moves wings rather than shrinking the whole animal. */
const MOTH_BODY = "M 12 6.6 C 13.2 9.2, 13.2 12.2, 12 14.6 C 10.8 12.2, 10.8 9.2, 12 6.6 Z";
const MOTH_ANTENNA_L = "M 12 6.8 C 10.8 5, 10 4.2, 9 3.6";
const MOTH_ANTENNA_R = "M 12 6.8 C 13.2 5, 14 4.2, 15 3.6";
const MOTH_WING_L = "M 11.6 8.6 C 7.4 4.6, 3 5.6, 3.4 9.2 C 3.8 12.4, 8 12.8, 11.6 11.4";
const MOTH_WING_R = "M 12.4 8.6 C 16.6 4.6, 21 5.6, 20.6 9.2 C 20.2 12.4, 16 12.8, 12.4 11.4";

const WING_ORIGIN = {
  transformBox: "view-box",
  transformOrigin: `${BALL.x}px 10px`,
} as const;

interface CompanionToyProps {
  readonly kind: ToyKind;
  /** The direction/flutter group. Written once a frame by the companion loop. */
  readonly artRef?: Ref<SVGGElement>;
  /** The yarn's roll. Never rendered for the moth, which does not roll. */
  readonly spinRef?: Ref<SVGGElement>;
}

export function CompanionToy({ kind, artRef, spinRef }: CompanionToyProps) {
  return (
    <svg
      viewBox={`0 0 ${TOY_W} ${TOY_H}`}
      width={TOY_W}
      height={TOY_H}
      aria-hidden="true"
      focusable="false"
    >
      {kind === "yarn" ? (
        <>
          <g ref={artRef} style={SPIN_ORIGIN}>
            <path {...STROKE} d={YARN_TAIL} />
          </g>
          <g ref={spinRef} style={SPIN_ORIGIN}>
            <circle {...STROKE} cx={BALL.x} cy={BALL.y} r={BALL.r} />
            <path {...STROKE} d={WIND_A} />
            <path {...STROKE} d={WIND_B} />
          </g>
        </>
      ) : (
        <>
          <g ref={artRef} style={WING_ORIGIN}>
            <path {...STROKE} d={MOTH_WING_L} />
            <path {...STROKE} d={MOTH_WING_R} />
          </g>
          <path {...STROKE} d={MOTH_BODY} />
          <path {...STROKE} d={MOTH_ANTENNA_L} />
          <path {...STROKE} d={MOTH_ANTENNA_R} />
        </>
      )}
    </svg>
  );
}

export default CompanionToy;
