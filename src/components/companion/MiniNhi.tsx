import type { ReactNode } from "react";
import type { NhiMood } from "@/types/portfolio";

/**
 * Mini Bé Nhi: Thien's girlfriend, drawn the way mini-Thien is (round 22).
 *
 * Her own brief, verbatim: "dumb dumb cute cute easy mood changing". So the
 * figure is fixed and the face is not: five moods, each from a photo of her
 * (the mirror pout, the FaceTime grin, the blank "huh?", the sleepy one and
 * the blissful hug), and whoever shows her swaps them freely. Drawn from the
 * photos' traits, never from the photos: long black hair parted in the middle
 * and falling past her shoulders, thin oval glasses, round cheeks, a buttoned
 * cardigan, and the little bunny she carries.
 *
 * Two passes, like `MiniThien`: a knockout in `var(--ground)` under every
 * part, then the ink in `currentColor`. Beside the cats that is their cut-out;
 * on the oak's swing she is wrapped in `[data-paper]`, so she is ink on paper
 * in both themes, like the tags. The hair is the one washed part, at mini-
 * Thien's density: ink standing in for "black hair" in a palette with no hue
 * to spend on it.
 *
 * Purely presentational and `aria-hidden`: whoever shows her names her.
 */

/** Her drawing box: shorter than mini-Thien's 30×54, standing. Sitting, the
 *  legs fold over the seat, so the box is shorter again. */
export const NHI_W = 28;
export const NHI_H = 46;
export const NHI_SIT_H = 42;

/** Where her cardigan's hem is in the sitting box: the seat goes here. */
export const NHI_SEAT_Y = 33;

export const NHI_MOODS: readonly NhiMood[] = ["pout", "grin", "huh", "sleepy", "hug"];

/** Her mood for one of the cats' beats beside mini-Thien: picked by the
 *  beat's own words, so it changes with every beat and holds still for one. */
export function nhiMood(words: string): NhiMood {
  let h = 0;
  for (const ch of words) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return NHI_MOODS[h % NHI_MOODS.length];
}

type Pose = "stand" | "sit";

/** A closed part (knocked out, then outlined; `wash` gets the hair's fill) or
 *  an open stroke (backed by a wider knockout stroke, never filled). */
type Part =
  | { readonly kind: "area"; readonly d: string; readonly wash?: boolean; readonly outline?: string }
  | { readonly kind: "line"; readonly d: string };

const HAIR_WASH = 0.68;

/** Cheeks to chin, rounder than a circle. The knockout is closed across the
 *  forehead so it fills the face; only the cheeks and chin are inked, because
 *  the hair covers the rest. */
const FACE_LINE = "M 8.4 9 C 7.9 14.2, 10.4 16.4, 14 16.4 C 17.6 16.4, 20.1 14.2, 19.6 9";
const FACE = `${FACE_LINE} C 19 4.6, 9 4.6, 8.4 9 Z`;

/**
 * The hair: one closed shape around the face, from the left tip past her
 * shoulder, up over the crown, down to the right tip, then back up the inside
 * of the right curtain, across the forehead to the parting and down the left
 * curtain. The face sits in the notch this leaves.
 */
const HAIR =
  "M 6 26 C 5.6 20, 6 12, 7.4 6 C 8.6 2.4, 11.4 1.4, 14 1.4 C 16.6 1.4, 19.4 2.4, 20.6 6" +
  " C 22 12, 22.4 20, 22 26 C 21 25, 20.2 24, 19.8 22 C 19.6 18, 19.9 13, 19.6 9.6" +
  " C 18.6 6.8, 16.4 5.2, 14.4 4.4 L 14 5.4 L 13.6 4.4 C 11.6 5.2, 9.4 6.8, 8.4 9.6" +
  " C 8.1 13, 8.4 18, 8.2 22 C 7.8 24, 7 25, 6 26 Z";

/** The cardigan, shoulders to hem, a touch A-line. */
const CARDIGAN = "M 10.4 17 C 8.4 17.6, 7.8 21, 8 26 L 7.6 33 L 20.4 33 L 20 26 C 20.2 21, 19.6 17.6, 17.6 17 Z";

const STAND: readonly Part[] = [
  { kind: "line", d: "M 10.8 33 L 10.2 45" },
  { kind: "line", d: "M 17.2 33 L 17.8 45" },
  { kind: "area", d: CARDIGAN },
  // The arm that carries the bunny, and the one that doesn't.
  { kind: "line", d: "M 8.4 19 C 6.2 22, 5.6 25, 6.2 28" },
  { kind: "line", d: "M 19.6 19 C 21.8 22, 22.4 25.4, 21.8 28.6" },
  // The bunny: a round head under two ears.
  { kind: "line", d: "M 3.6 27 L 3 23.4" },
  { kind: "line", d: "M 6 27 L 6.6 23.4" },
  { kind: "area", d: "M 2.2 29.4 A 2.6 2.6 0 1 0 7.4 29.4 A 2.6 2.6 0 1 0 2.2 29.4 Z" },
];

const SIT: readonly Part[] = [
  // Knees over the seat's edge, shins dangling.
  { kind: "line", d: "M 10.8 33 L 10.4 41" },
  { kind: "line", d: "M 17.2 33 L 18 40.4" },
  { kind: "area", d: CARDIGAN },
  // Both hands up on the ropes (on the swing they hang at x 1.3 and 26.7).
  { kind: "line", d: "M 8.4 19 C 6 18.6, 2.8 17.6, 1.4 15.6" },
  { kind: "line", d: "M 19.6 19 C 22 18.6, 25.2 17.6, 26.6 15.6" },
];

const HEAD: readonly Part[] = [
  { kind: "area", d: FACE, outline: FACE_LINE },
  { kind: "area", d: HAIR, wash: true },
];

const EYE_Y = 10.4;
const EYES = [11.4, 16.6] as const;

/** What floats over her head, outside the knocked-out figure: drawn on a
 *  ground outline first, so it reads over the sky in both themes. */
function Float({ ink, knock, children }: { readonly ink: object; readonly knock: object; readonly children: (p: object) => ReactNode }) {
  return (
    <>
      {children(knock)}
      {children(ink)}
    </>
  );
}

/** Each mood's eyes, mouth and what floats over her head. */
function Mood({ mood, ink, knock }: { readonly mood: NhiMood; readonly ink: object; readonly knock: object }) {
  const dot = { ...ink, fill: "currentColor" };
  const each = (d: (x: number) => string) => EYES.map((x) => <path key={x} {...ink} d={d(x)} />);
  switch (mood) {
    case "pout":
      // Flat, unimpressed eyes; the pushed-out mouth of the mirror selfie.
      return (
        <>
          {each((x) => `M ${x - 0.9} ${EYE_Y} L ${x + 0.9} ${EYE_Y}`)}
          <path {...ink} d="M 13 14 Q 14 13.1 15 14" />
        </>
      );
    case "grin":
      // The FaceTime grin: eyes squeezed to arcs, the mouth wide open.
      return (
        <>
          {each((x) => `M ${x - 1} ${EYE_Y + 0.5} Q ${x} ${EYE_Y - 0.8} ${x + 1} ${EYE_Y + 0.5}`)}
          <path {...ink} fill="currentColor" fillOpacity={HAIR_WASH} d="M 12 12.8 L 16 12.8 Q 15.8 15.2 14 15.2 Q 12.2 15.2 12 12.8 Z" />
        </>
      );
    case "huh":
      // Dot eyes, a small "o", and the question mark.
      return (
        <>
          {EYES.map((x) => <circle key={x} {...dot} cx={x} cy={EYE_Y} r={0.55} />)}
          <circle {...ink} cx={14} cy={13.8} r={0.6} />
          <Float ink={ink} knock={knock}>
            {(p) => (
              <>
                <path {...p} d="M 22.2 2.6 Q 22.2 0.6 23.8 0.8 Q 25.4 1.2 24.6 2.8 Q 23.8 3.6 23.6 4.8" />
                <circle {...p} cx={23.6} cy={6.6} r={0.4} />
              </>
            )}
          </Float>
        </>
      );
    case "sleepy":
      // Eyes shut flat, mouth a little open, and a "z".
      return (
        <>
          {each((x) => `M ${x - 1} ${EYE_Y + 0.4} L ${x + 1} ${EYE_Y + 0.4}`)}
          <circle {...ink} cx={14} cy={14} r={0.5} />
          <Float ink={ink} knock={knock}>
            {(p) => <path {...p} d="M 22 1 L 25 1 L 22 4 L 25 4" />}
          </Float>
        </>
      );
    case "hug":
      // Eyes closed in bliss, a soft smile, and a heart.
      return (
        <>
          {each((x) => `M ${x - 1} ${EYE_Y - 0.3} Q ${x} ${EYE_Y + 0.9} ${x + 1} ${EYE_Y - 0.3}`)}
          <path {...ink} d="M 12.8 13.3 Q 14 14.5 15.2 13.3" />
          <Float ink={{ ...ink, fill: "currentColor", fillOpacity: HAIR_WASH }} knock={{ ...knock, fill: "var(--ground)" }}>
            {(p) => (
              <path
                {...p}
                d="M 23.4 4.2 C 21.6 2.8, 21.4 1, 22.6 0.9 C 23.1 0.9, 23.4 1.3, 23.4 1.6 C 23.4 1.3, 23.7 0.9, 24.2 0.9 C 25.4 1, 25.2 2.8, 23.4 4.2 Z"
              />
            )}
          </Float>
        </>
      );
  }
}

/** The glasses: thin ovals, wider than mini-Thien's round ones, as hers are. */
function Glasses({ ink }: { readonly ink: object }) {
  const [l, r] = EYES;
  return (
    <>
      <ellipse {...ink} cx={l} cy={EYE_Y} rx={2.3} ry={1.7} />
      <ellipse {...ink} cx={r} cy={EYE_Y} rx={2.3} ry={1.7} />
      <path {...ink} d={`M ${l + 2.3} ${EYE_Y - 0.2} Q 14 ${EYE_Y - 0.9} ${r - 2.3} ${EYE_Y - 0.2}`} />
    </>
  );
}

export function MiniNhi({
  mood,
  pose = "stand",
  scale = 1,
}: {
  readonly mood: NhiMood;
  readonly pose?: Pose;
  /** Drawn larger on the swing; the line stays the same weight on screen. */
  readonly scale?: number;
}) {
  const h = pose === "sit" ? NHI_SIT_H : NHI_H;
  const weight = scale > 1 ? 2 : 1.6;
  const ink = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: weight,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    vectorEffect: "non-scaling-stroke",
  } as const;
  const knock = { ...ink, stroke: "var(--ground)", strokeWidth: weight + 1.6 } as const;
  const parts = [...(pose === "sit" ? SIT : STAND), ...HEAD];
  return (
    <svg
      data-nhi={mood}
      viewBox={`0 0 ${NHI_W} ${h}`}
      width={NHI_W * scale}
      height={h * scale}
      aria-hidden="true"
      focusable="false"
      className="overflow-visible"
    >
      {parts.map((part, i) => (
        <path
          key={`k${i}`}
          {...knock}
          fill={part.kind === "area" ? "var(--ground)" : "none"}
          d={part.d}
        />
      ))}
      {parts.map((part, i) => (
        <path
          key={`i${i}`}
          {...ink}
          {...(part.kind === "area" && part.wash ? { fill: "currentColor", fillOpacity: HAIR_WASH } : {})}
          d={part.kind === "area" ? (part.outline ?? part.d) : part.d}
        />
      ))}
      {/* Cardigan buttons, then the face over the knocked-out head. */}
      {[21, 25, 29].map((y) => (
        <circle key={y} {...ink} fill="currentColor" cx={14} cy={y} r={0.45} />
      ))}
      <Glasses ink={ink} />
      <Mood mood={mood} ink={ink} knock={knock} />
    </svg>
  );
}

export default MiniNhi;
