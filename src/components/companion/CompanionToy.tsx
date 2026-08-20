/**
 * The things the cats occasionally play with: a ball of yarn, a moth, and a
 * food bowl.
 *
 * ## Why none of them is a laser dot
 *
 * The obvious toy is a laser pointer, and a laser pointer is a red dot. This
 * site has exactly one hue — the annotation blue — and `CLAUDE.md` reserves it
 * for links, measured values and the single primary control per screen: "it is
 * never decoration". A red dot would be a second hue introduced for pure
 * decoration, which breaks that rule twice over, and a *blue* dot would spend
 * the site's one meaningful colour on a cat toy — so a visitor scanning for the
 * next link would find a bouncing spot instead.
 *
 * So the props are drawn the way the cats are: `currentColor`, one stroke
 * weight, and the same ground knockout underneath. They inherit theme and tone
 * from whatever they are lying over exactly as the animals do, they cost no
 * token, and at 24px they read as line drawings rather than as UI.
 *
 * ## Why they are opaque
 *
 * Same reason the cats are, and the same technique — see the long note in
 * `CompanionCat`. A yarn ball you can read the hero headline through is a hole
 * in the page, not a ball. Each prop declares its closed regions, which the mask
 * fills with `var(--ground)`, and its open strokes, which it backs with a wider
 * ground stroke. The windings on the ball and the antennae on the moth are drawn
 * *on* regions the mask has already covered, so they are ink only.
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

/** One prop's local drawing box. Wide enough that the yarn's tail fits on
 *  *either* side of the ball, because flipping it is how the tail trails the
 *  roll — and an SVG root clips its own overflow, so a tail that only fits
 *  facing right would simply vanish rolling left. */
export const TOY_W = 24;
export const TOY_H = 20;

export type ToyKind = "yarn" | "moth" | "bowl" | "claw";

/** The cats' stroke, to the tenth. A prop drawn at a different weight reads as
 *  a different illustration lying next to the animals rather than as part of
 *  the same drawing. */
const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** The knockout, to the same numbers `CompanionCat` uses. */
const MASK_LINE = {
  fill: "none",
  stroke: "var(--ground)",
  strokeWidth: 3,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;
const MASK_AREA = { ...MASK_LINE, fill: "var(--ground)" } as const;

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

/**
 * The bowl.
 *
 * Drawn low and wide and sitting on the same floor line the cats' feet rest on,
 * because the whole read of the eating scene is two heads coming down to meet
 * it. A tall bowl would need the cats to stand, and a standing cat is a pose
 * this drawing does not have.
 *
 * The mound of food is what stops it reading as an empty dish — and it is a
 * single arc, because at 20px across, kibble drawn as kibble is noise.
 */
const BOWL_RIM = "M 2.6 11.4 C 2.6 8.8, 6.8 7.4, 12 7.4 C 17.2 7.4, 21.4 8.8, 21.4 11.4";
const BOWL_BODY =
  "M 2.6 11.4 C 3.2 15.8, 6.8 18.2, 12 18.2 C 17.2 18.2, 20.8 15.8, 21.4 11.4 C 21.4 13.6, 17.2 15, 12 15 C 6.8 15, 2.6 13.6, 2.6 11.4 Z";
const BOWL_FOOD = "M 6.4 9.6 C 8 6.2, 16 6.2, 17.6 9.6 C 15.4 11, 8.6 11, 6.4 9.6 Z";

/**
 * Three claw marks, for the scratch.
 *
 * The odd prop out, and deliberately so: the other three are objects a cat
 * plays with, and this is the *evidence* one has been working. Without it the
 * scene was a cat standing at a rule with a paw out, which reads as a cat
 * standing at a rule; the marks are what say the line has been scratched.
 *
 * They fan the way a paw does — tighter at the pad, splayed at the tips — and
 * they are drawn short. A long mark reads as a crack in the page rather than
 * something an animal did.
 */
const CLAW_A = "M 6.4 15.6 C 8.4 12.6, 9.8 9.4, 10.4 6.2";
const CLAW_B = "M 11.4 16.4 C 13.2 13.2, 14.4 9.8, 14.8 6.6";
const CLAW_C = "M 16.6 16.2 C 17.8 13.4, 18.8 10.4, 19.2 7.8";

const CLAW_ORIGIN = {
  transformBox: "view-box",
  transformOrigin: `${TOY_W / 2}px ${TOY_H / 2}px`,
} as const;

interface CompanionToyProps {
  readonly kind: ToyKind;
  /** The direction/flutter group. Written once a frame by the companion loop. */
  readonly artRef?: Ref<SVGGElement>;
  /** The yarn's roll. Never rendered for the moth or the bowl, neither of which
   *  rolls. */
  readonly spinRef?: Ref<SVGGElement>;
}

export function CompanionToy({ kind, artRef, spinRef }: CompanionToyProps) {
  if (kind === "claw") {
    return (
      <svg
        viewBox={`0 0 ${TOY_W} ${TOY_H}`}
        width={TOY_W}
        height={TOY_H}
        aria-hidden="true"
        focusable="false"
      >
        {/* Flipped with the animal, from the middle of the box rather than the
            SVG origin — a group scaled about x=0 would leave the viewBox. */}
        <g ref={artRef} style={CLAW_ORIGIN}>
          {/* Masked like everything else the companion draws: the marks land on
              a section's own hairline, and a stroke crossing a rule at the same
              weight as the rule reads as a join rather than as a mark. */}
          <path {...MASK_LINE} d={CLAW_A} />
          <path {...MASK_LINE} d={CLAW_B} />
          <path {...MASK_LINE} d={CLAW_C} />
          <path {...STROKE} d={CLAW_A} />
          <path {...STROKE} d={CLAW_B} />
          <path {...STROKE} d={CLAW_C} />
        </g>
      </svg>
    );
  }

  if (kind === "bowl") {
    return (
      <svg
        viewBox={`0 0 ${TOY_W} ${TOY_H}`}
        width={TOY_W}
        height={TOY_H}
        aria-hidden="true"
        focusable="false"
      >
        <path {...MASK_AREA} d={BOWL_BODY} />
        <path {...MASK_AREA} d={BOWL_FOOD} />
        <path {...MASK_LINE} d={BOWL_RIM} />
        <path {...STROKE} d={BOWL_FOOD} />
        <path {...STROKE} d={BOWL_BODY} />
        <path {...STROKE} d={BOWL_RIM} />
      </svg>
    );
  }

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
            <path {...MASK_LINE} d={YARN_TAIL} />
            <path {...STROKE} d={YARN_TAIL} />
          </g>
          <g ref={spinRef} style={SPIN_ORIGIN}>
            <circle {...MASK_AREA} cx={BALL.x} cy={BALL.y} r={BALL.r} />
            <circle {...STROKE} cx={BALL.x} cy={BALL.y} r={BALL.r} />
            <path {...STROKE} d={WIND_A} />
            <path {...STROKE} d={WIND_B} />
          </g>
        </>
      ) : (
        <>
          {/* The wings knock out and draw inside the one group the loop
              squashes, so the mask beats with the wing rather than staying
              spread behind a folded one. */}
          <g ref={artRef} style={WING_ORIGIN}>
            <path {...MASK_AREA} d={MOTH_WING_L} />
            <path {...MASK_AREA} d={MOTH_WING_R} />
            <path {...STROKE} d={MOTH_WING_L} />
            <path {...STROKE} d={MOTH_WING_R} />
          </g>
          <path {...MASK_AREA} d={MOTH_BODY} />
          <path {...MASK_LINE} d={MOTH_ANTENNA_L} />
          <path {...MASK_LINE} d={MOTH_ANTENNA_R} />
          <path {...STROKE} d={MOTH_BODY} />
          <path {...STROKE} d={MOTH_ANTENNA_L} />
          <path {...STROKE} d={MOTH_ANTENNA_R} />
        </>
      )}
    </svg>
  );
}

export default CompanionToy;
