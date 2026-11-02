import type { ReactNode } from "react";
import type { NhiMood } from "@/types/portfolio";

/**
 * Mini Bé Nhi: Thien's girlfriend, drawn the way mini-Thien is (round 22).
 *
 * Her own brief, verbatim: "dumb dumb cute cute easy mood changing", and then
 * Thien's: "more cute, more beautiful". So she is drawn chibi: a head nearly
 * as big as the rest of her, big eyes behind big round glasses, long black
 * hair with curtain bangs, a shine and a bow, blush drawn as manga strokes,
 * a collared cardigan, little round shoes and mitten hands, and her bunny
 * plush in its little dress (she loves Miffy; this is a bunny of her own, not
 * Miffy, whose design is someone else's and is never drawn here). Five faces, each from a photo of her (the mirror pout, the
 * FaceTime grin, the blank "huh?", the sleepy one and the blissful hug), and
 * whoever shows her swaps them freely. Drawn from the photos' traits, never
 * from the photos.
 *
 * Two passes per layer, like `MiniThien`: a knockout in `var(--ground)` under
 * every part, then the ink in `currentColor`. There are two layers, behind
 * (legs, cardigan, face, hair) and in front (arms, hands, bunny, bow), so what
 * is in front of her hair is not washed by it. Beside the cats the knockout
 * is their cut-out; on the oak's swing she is wrapped in `[data-paper]`, so
 * she is ink on paper in both themes, like the tags. The hair is washed at
 * mini-Thien's density and the blush is strokes, not a tint: ink standing in
 * for colours a palette with no hue to spend on decoration cannot reach for.
 *
 * Round 24, her act (Thien: "Be Nhi character must have an act, Hả? and
 * surprise like what you say? the head is slightly turn!"). `huh` is no longer
 * a blank face: it is the double take. Her head (the hair, the face, the bow
 * and everything on it) is a group that tilts about 13 degrees about her neck,
 * so her near ear (on our right) comes up; the features inside slide a little
 * to the left, which turns her three-quarters, the far eye and lens narrower;
 * her brows go up, her eyes go wide with two shines, her mouth is a small
 * open "o"; one mitten is cupped at her ear ("what did you say?") and two
 * short strokes by her crown say she is startled. The tilt is the pose itself
 * (an inline `transform`, so reduced motion shows it); `globals.css` ("Bé
 * Nhi's Hả?") only animates the head getting there, with a small overshoot.
 * `beat` re-keys the head so the same snap plays again when she startles
 * while already surprised. The other four moods are untouched.
 *
 * Purely presentational and `aria-hidden`: whoever shows her names her.
 */

/** Her drawing box: shorter than mini-Thien's 30×54, standing. Sitting, the
 *  legs fold over the seat, so the box is shorter again. */
export const NHI_W = 28;
export const NHI_H = 43;
export const NHI_SIT_H = 43;

/** Where her cardigan's hem is in the sitting box: the seat goes here. */
export const NHI_SEAT_Y = 33;

export const NHI_MOODS: readonly NhiMood[] = ["pout", "grin", "huh", "sleepy", "hug"];

/** Her mood for one of the cats' beats beside mini-Thien: picked by the
 *  beat's own words, so it changes with every beat and holds still for one.
 *  Except that when the cats ask a question (the beat's `icon` is the
 *  question mark: "Click me. I translate meows.") she does her act: "Hả?". */
export function nhiMood(words: string, icon?: string | null): NhiMood {
  if (icon === "question") return "huh";
  let h = 0;
  for (const ch of words) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return NHI_MOODS[h % NHI_MOODS.length];
}

type Pose = "stand" | "sit";

/** A closed part (knocked out, then outlined; `wash` gets the hair's fill,
 *  `solid` is filled with ink) or an open stroke (backed by a wider knockout
 *  stroke, never filled). `head` parts ride in the head's group, so they tilt
 *  with it (round 24); a layer keeps its parts' order, heads last. */
type Part =
  | {
      readonly kind: "area";
      readonly d: string;
      readonly wash?: boolean;
      readonly solid?: boolean;
      readonly outline?: string;
      readonly head?: boolean;
    }
  | { readonly kind: "line"; readonly d: string };

/** Her act's pose, in one place. The head tilts counter-clockwise about her
 *  neck (so the ear on our right rises to the cupped hand), the features slide
 *  left to turn her three-quarters, and the far eye is the one on our left. */
export const HUH_TILT = -13;
const NECK = { x: 14, y: 20.4 } as const;
const HUH_TURN = -1.3;
/** The head group's style while she is surprised. */
const HUH_STYLE = {
  transform: `rotate(${HUH_TILT}deg)`,
  transformOrigin: `${NECK.x}px ${NECK.y}px`,
} as const;

const HAIR_WASH = 0.72;

const circle = (cx: number, cy: number, r: number) =>
  `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
const oval = (cx: number, cy: number, rx: number, ry: number, turn = 0) => {
  // `turn` leans the oval (degrees, clockwise): its two ends are the ends of
  // its x axis, which the arcs' own rotation then leans with it.
  const t = (turn * Math.PI) / 180;
  const [dx, dy] = [rx * Math.cos(t), rx * Math.sin(t)].map((n) => +n.toFixed(3));
  return `M ${cx - dx} ${cy - dy} A ${rx} ${ry} ${turn} 1 0 ${cx + dx} ${cy + dy} A ${rx} ${ry} ${turn} 1 0 ${cx - dx} ${cy - dy} Z`;
};

/** Round cheeks to a soft chin. The knockout is closed across the forehead so
 *  it fills the face; only the cheeks and chin are inked, the hair covers the
 *  rest. */
const FACE_LINE = "M 6.4 11.2 C 6 16.8, 9.6 20, 14 20 C 18.4 20, 22 16.8, 21.6 11.2";
const FACE = `${FACE_LINE} C 21 4.6, 7 4.6, 6.4 11.2 Z`;

/**
 * The hair: one closed shape around the face. From the left tip, curled in
 * past her shoulder, up the outside and over the crown, down to the right
 * tip; then back up inside the right curtain, along the bangs to the parting
 * and down inside the left curtain. The face sits in the notch this leaves.
 */
const HAIR =
  "M 3.6 31 C 2.4 25, 2.2 17, 3.2 11 C 4 5.4, 8.4 1.2, 14 1.2 C 19.6 1.2, 24 5.4, 24.8 11" +
  " C 25.8 17, 25.6 25, 24.4 31 C 23.4 30.2, 22.6 29.4, 22.2 28 C 20.6 25, 20.2 21, 20 18" +
  " C 20.2 15, 21.4 13, 21.6 11.2 C 21 8, 17.6 6.4, 14.6 6 L 14 7.4 L 13.4 6" +
  " C 10.4 6.4, 7 8, 6.4 11.2 C 6.6 13, 7.8 15, 8 18 C 7.8 21, 7.4 25, 5.8 28" +
  " C 5.4 29.4, 4.6 30.2, 3.6 31 Z";

/** The cardigan, collar to a rounded hem, a touch A-line. */
const CARDIGAN =
  "M 11 20.4 C 9 21, 8.4 23.6, 8.2 27 L 7.2 32.6 C 10 33.6, 18 33.6, 20.8 32.6 L 19.8 27 C 19.6 23.6, 19 21, 17 20.4 Z";
const COLLAR = "M 11.2 20.6 Q 11.8 22.8 14 21.6 Q 16.2 22.8 16.8 20.6";

/** A bow on the right of her head: two loops and a knot. */
const BOW: readonly Part[] = [
  { kind: "area", head: true, d: "M 21 4.6 C 19.6 3, 18.4 3.4, 18.6 4.8 C 18.8 6.2, 20 6.4, 21 4.6 Z" },
  { kind: "area", head: true, d: "M 21 4.6 C 22 2.6, 23.6 2.6, 23.6 4 C 23.6 5.4, 22.2 6, 21 4.6 Z" },
  { kind: "area", head: true, d: circle(21, 4.6, 0.75) },
];

/**
 * Her bunny plush, its head centred at (x, y): long ears, a round head, a
 * little dress. Dot eyes are drawn by `PlushEyes`. No mouth: a plain plush
 * bunny of her own.
 */
function plush(x: number, y: number): readonly Part[] {
  return [
    { kind: "area", d: oval(x - 1.2, y - 3.8, 0.85, 2.2) },
    { kind: "area", d: oval(x + 1.2, y - 3.8, 0.85, 2.2) },
    { kind: "area", d: `M ${x - 1.8} ${y + 1.8} L ${x - 2.8} ${y + 5.8} Q ${x} ${y + 6.6} ${x + 2.8} ${y + 5.8} L ${x + 1.8} ${y + 1.8} Z` },
    { kind: "area", d: oval(x, y, 2.8, 2.4) },
  ];
}

function PlushEyes({ x, y }: { readonly x: number; readonly y: number }) {
  return (
    <>
      <circle fill="currentColor" cx={x - 0.95} cy={y - 0.1} r={0.38} />
      <circle fill="currentColor" cx={x + 0.95} cy={y - 0.1} r={0.38} />
    </>
  );
}

const STAND_BACK: readonly Part[] = [
  { kind: "line", d: "M 11.4 33.2 L 11.2 39.8" },
  { kind: "line", d: "M 16.6 33.2 L 16.8 39.8" },
  { kind: "area", d: oval(10.6, 40.8, 1.8, 1), solid: true },
  { kind: "area", d: oval(17.4, 40.8, 1.8, 1), solid: true },
  { kind: "area", d: CARDIGAN },
];

/**
 * Her right arm (on our right) in the act: up from the shoulder to a mitten
 * cupped at her ear, a fine line across it for the curled fingers. Whichever
 * pose she is in, this replaces the arm that waved or held the rope.
 */
const EAR_HAND: readonly Part[] = [
  { kind: "line", d: "M 19.2 22 C 21.8 22.2, 23.8 20.2, 24 16.2" },
  { kind: "area", d: oval(24.2, 14.4, 1.15, 1.6, -18) },
  { kind: "line", d: "M 23.6 13.5 Q 24.9 14.4 23.9 15.5" },
];

/** Standing, one arm carries the plush; the other waves, or cups her ear. */
function standFront(huh: boolean): readonly Part[] {
  return [
    ...(huh
      ? EAR_HAND
      : ([
          { kind: "line", d: "M 19.4 22 C 21.4 21.2, 22.8 19.6, 23.4 17.8" },
          { kind: "area", d: circle(23.6, 17, 1) },
        ] as const)),
    ...plush(5.2, 29.4),
    { kind: "line", d: "M 8.6 22 C 7.6 23.8, 7.2 25.8, 7.2 27.6" },
    { kind: "area", d: circle(7.2, 28.4, 1) },
    ...BOW,
  ];
}

const SIT_BACK: readonly Part[] = [
  // Shins dangling over the seat's edge.
  { kind: "line", d: "M 11.4 33.4 L 11 40.4" },
  { kind: "line", d: "M 16.6 33.4 L 17.2 40" },
  { kind: "area", d: oval(10.4, 41.4, 1.8, 1), solid: true },
  { kind: "area", d: oval(17.8, 41, 1.8, 1), solid: true },
  { kind: "area", d: CARDIGAN },
];

/** Sitting, both hands on the ropes (on the swing they hang at x 1 and 27);
 *  in the act the right one lets go and cups her ear. */
function sitFront(huh: boolean): readonly Part[] {
  return [
    { kind: "line", d: "M 9 22 C 6.4 21.6, 3.6 20.8, 1.8 19.4" },
    ...(huh
      ? EAR_HAND
      : ([
          { kind: "line", d: "M 19 22 C 21.6 21.6, 24.4 20.8, 26.2 19.4" },
          { kind: "area", d: circle(26.6, 19, 1) },
        ] as const)),
    { kind: "area", d: circle(1.4, 19, 1) },
    // The plush rides on her lap.
    ...plush(14, 28.4),
    ...BOW,
  ];
}

const HEAD: readonly Part[] = [
  { kind: "area", head: true, d: FACE, outline: FACE_LINE },
  { kind: "area", head: true, d: HAIR, wash: true },
];

const EYE_Y = 13.2;
const EYES = [10.2, 17.8] as const;

interface Inks {
  readonly ink: Record<string, unknown>;
  readonly knock: Record<string, unknown>;
  readonly fine: Record<string, unknown>;
}

/** The head's group: the same tilt on every piece of her head, whichever layer
 *  it is drawn in, and a key that replays the snap (`MiniNhi`'s `beat`). */
type HeadGroup = (children: ReactNode, slot: string) => ReactNode;

/** One layer: every part's knockout, then every part's ink. The parts of the
 *  head are gathered in a group of their own in each of the two passes, after
 *  the body's, so the drawing order is exactly what it was before the head
 *  could tilt. */
function Layer({ parts, inks, head }: { readonly parts: readonly Part[]; readonly inks: Inks; readonly head: HeadGroup }) {
  const body = parts.filter((part) => !(part.kind === "area" && part.head));
  const top = parts.filter((part) => part.kind === "area" && part.head);
  const knock = (part: Part, i: number) => (
    <path key={`k${i}`} {...inks.knock} fill={part.kind === "area" ? "var(--ground)" : "none"} d={part.d} />
  );
  const ink = (part: Part, i: number) => {
    const fill =
      part.kind === "area" && part.wash
        ? { fill: "currentColor", fillOpacity: HAIR_WASH }
        : part.kind === "area" && part.solid
          ? { fill: "currentColor" }
          : {};
    return <path key={`i${i}`} {...inks.ink} {...fill} d={part.kind === "area" ? (part.outline ?? part.d) : part.d} />;
  };
  return (
    <>
      {body.map(knock)}
      {top.length > 0 && head(top.map(knock), "knock")}
      {body.map(ink)}
      {top.length > 0 && head(top.map(ink), "ink")}
    </>
  );
}

/** What floats over her head, outside the knocked-out figure: drawn on a
 *  ground outline first, so it reads over the sky in both themes. */
function Float({ inks, children }: { readonly inks: Inks; readonly children: (p: object) => ReactNode }) {
  return (
    <>
      {children(inks.knock)}
      {children(inks.ink)}
    </>
  );
}

/**
 * The act's eyes and lenses, turned three-quarters: the far one (on our left)
 * is narrower and nearer the nose, the near one a touch wider. Both are wide
 * open: a dark oval taller than the other moods', a big catch-light and a
 * small one.
 */
const HUH_EYES = [
  { x: 11, rx: 1.0, lens: 2.4 },
  { x: 18.1, rx: 1.35, lens: 3.1 },
] as const;
const HUH_EYE_RY = 1.85;

/** The brows, up: two small arcs over the lenses, the near one higher. */
function Brows({ inks }: { readonly inks: Inks }) {
  return (
    <>
      <path {...inks.ink} d={`M ${HUH_EYES[0].x - 1.5} ${EYE_Y - 3.9} Q ${HUH_EYES[0].x} ${EYE_Y - 5.2} ${HUH_EYES[0].x + 1.4} ${EYE_Y - 4}`} />
      <path {...inks.ink} d={`M ${HUH_EYES[1].x - 1.5} ${EYE_Y - 4.1} Q ${HUH_EYES[1].x} ${EYE_Y - 5.5} ${HUH_EYES[1].x + 1.7} ${EYE_Y - 3.9}`} />
    </>
  );
}

/** Wide eyes with a shine (no lashes: they are open too wide for them). */
function SurprisedEyes({ inks }: { readonly inks: Inks }) {
  return (
    <>
      {HUH_EYES.map(({ x, rx }) => (
        <g key={x}>
          <ellipse {...inks.ink} fill="currentColor" cx={x} cy={EYE_Y} rx={rx} ry={HUH_EYE_RY} />
          <circle fill="var(--ground)" cx={x - 0.35} cy={EYE_Y - 0.75} r={0.52} />
          <circle fill="var(--ground)" cx={x + 0.4} cy={EYE_Y + 0.75} r={0.25} />
        </g>
      ))}
    </>
  );
}

/**
 * What the act throws off her head, in the body's frame (it does not tilt):
 * the question mark she has always had, and two short manga strokes by her
 * crown that say she is startled. The strokes pop in a beat after the snap.
 */
function Startle({ inks }: { readonly inks: Inks }) {
  return (
    <>
      <Float inks={inks}>
        {(p) => (
          <>
            <path {...p} d="M 24.4 -1.4 Q 24.4 -3.6 26.2 -3.4 Q 27.9 -3 27 -1.2 Q 26.2 -0.3 26 1" />
            <circle {...p} cx={26} cy={2.8} r={0.4} />
          </>
        )}
      </Float>
      <g data-nhi-burst="">
        <Float inks={inks}>
          {(p) => (
            <>
              <path {...p} d="M 4.3 1.9 L 2.5 -0.3" />
              <path {...p} d="M 7.2 -0.4 L 6.4 -2.8" />
            </>
          )}
        </Float>
      </g>
    </>
  );
}

/** Each mood's eyes, mouth and what floats over her head. */
function Mood({ mood, inks }: { readonly mood: NhiMood; readonly inks: Inks }) {
  const { ink } = inks;
  const each = (d: (x: number) => string) => EYES.map((x) => <path key={x} {...ink} d={d(x)} />);
  switch (mood) {
    case "pout":
      // Heavy lids over half-moon eyes, a little frown: the mirror selfie.
      return (
        <>
          {each((x) => `M ${x - 1.5} ${EYE_Y - 0.5} L ${x + 1.5} ${EYE_Y - 0.5}`)}
          {EYES.map((x) => (
            <path
              key={`p${x}`}
              {...ink}
              fill="currentColor"
              d={`M ${x - 1.05} ${EYE_Y - 0.5} A 1.05 1.05 0 0 0 ${x + 1.05} ${EYE_Y - 0.5} Z`}
            />
          ))}
          <path {...ink} d="M 13.1 17.9 Q 14 17 14.9 17.9" />
        </>
      );
    case "grin":
      // The FaceTime grin: eyes squeezed to arcs, the mouth wide open.
      return (
        <>
          {each((x) => `M ${x - 1.4} ${EYE_Y + 0.6} Q ${x} ${EYE_Y - 1.4} ${x + 1.4} ${EYE_Y + 0.6}`)}
          <path
            {...ink}
            fill="currentColor"
            fillOpacity={HAIR_WASH}
            d="M 12.2 16.6 L 15.8 16.6 Q 15.7 19.2 14 19.2 Q 12.3 19.2 12.2 16.6 Z"
          />
        </>
      );
    case "huh":
      // "Hả?": brows up, wide eyes, a small open "o". What floats over her
      // head (the "?", the strokes) is `Startle`, outside the tilting head.
      return (
        <>
          <Brows inks={inks} />
          <SurprisedEyes inks={inks} />
          <ellipse {...ink} fill="currentColor" fillOpacity={HAIR_WASH} cx={13.9} cy={17.7} rx={0.62} ry={0.85} />
        </>
      );
    case "sleepy":
      // Eyes shut, a little open mouth, a bubble at her nose, and a "z".
      return (
        <>
          {each((x) => `M ${x - 1.4} ${EYE_Y} Q ${x} ${EYE_Y + 0.8} ${x + 1.4} ${EYE_Y}`)}
          <circle {...ink} cx={14} cy={17.8} r={0.5} />
          <Float inks={inks}>
            {(p) => (
              <>
                <circle {...p} cx={16.6} cy={16.2} r={1.1} />
                <path {...p} d="M 24.4 -2.6 L 27.4 -2.6 L 24.4 0.4 L 27.4 0.4" />
              </>
            )}
          </Float>
        </>
      );
    case "hug":
      // Eyes closed in bliss, a cat's "ω" smile, and a heart.
      return (
        <>
          {each((x) => `M ${x - 1.4} ${EYE_Y - 0.4} Q ${x} ${EYE_Y + 1.2} ${x + 1.4} ${EYE_Y - 0.4}`)}
          <path {...ink} d="M 12.6 17.2 Q 13.3 18.2 14 17.2 Q 14.7 18.2 15.4 17.2" />
          <Float inks={{ ...inks, ink: { ...ink, fill: "currentColor", fillOpacity: HAIR_WASH }, knock: { ...inks.knock, fill: "var(--ground)" } }}>
            {(p) => (
              <path
                {...p}
                d="M 25.8 1 C 23.8 -0.6, 23.6 -2.6, 24.9 -2.7 C 25.4 -2.7, 25.8 -2.3, 25.8 -1.9 C 25.8 -2.3, 26.2 -2.7, 26.7 -2.7 C 28 -2.6, 27.8 -0.6, 25.8 1 Z"
              />
            )}
          </Float>
        </>
      );
  }
}

/** The glasses: big round ovals, as hers are, over her eyes. Turned, the far
 *  lens is narrower than the near one. */
function Glasses({ inks, turned }: { readonly inks: Inks; readonly turned: boolean }) {
  const [l, r] = turned ? [HUH_EYES[0], HUH_EYES[1]] : [{ x: EYES[0], lens: 3 }, { x: EYES[1], lens: 3 }];
  return (
    <>
      <ellipse {...inks.ink} cx={l.x} cy={EYE_Y} rx={l.lens} ry={2.5} />
      <ellipse {...inks.ink} cx={r.x} cy={EYE_Y} rx={r.lens} ry={2.5} />
      <path {...inks.ink} d={`M ${l.x + l.lens} ${EYE_Y - 0.3} Q 14 ${EYE_Y - 1.1} ${r.x - r.lens} ${EYE_Y - 0.3}`} />
    </>
  );
}

export function MiniNhi({
  mood,
  pose = "stand",
  scale = 1,
  beat = 0,
}: {
  readonly mood: NhiMood;
  readonly pose?: Pose;
  /** Drawn larger on the swing; the line stays the same weight on screen. */
  readonly scale?: number;
  /** Replays her act's snap: whoever shows her bumps it each time she
   *  startles, so a second "Hả?" while she is already surprised still plays. */
  readonly beat?: number;
}) {
  const h = pose === "sit" ? NHI_SIT_H : NHI_H;
  const weight = scale > 1 ? 2 : 1.4;
  const ink = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: weight,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    vectorEffect: "non-scaling-stroke",
  } as const;
  const inks: Inks = {
    ink,
    knock: { ...ink, stroke: "var(--ground)", strokeWidth: weight + 1.6 },
    fine: { ...ink, strokeWidth: weight * 0.55 },
  };
  const sit = pose === "sit";
  const huh = mood === "huh";
  // Every piece of her head goes through here, so they tilt together.
  const head: HeadGroup = (children, slot) => (
    <g key={`${slot}${beat}`} data-nhi-head="" style={huh ? HUH_STYLE : undefined}>
      {children}
    </g>
  );
  return (
    <svg
      data-nhi={mood}
      viewBox={`0 0 ${NHI_W} ${h}`}
      width={NHI_W * scale}
      height={h * scale}
      aria-hidden="true"
      focusable="false"
      style={{ overflow: "visible" }}
    >
      <Layer parts={[...(sit ? SIT_BACK : STAND_BACK), ...HEAD]} inks={inks} head={head} />
      <path {...ink} d={COLLAR} />
      {[24.2, 27.2, 30.2].map((y) => (
        <circle key={y} fill="currentColor" cx={14} cy={y} r={0.5} />
      ))}
      {head(
        <>
          {/* The hair's shine, in the ground's colour over the wash. */}
          <path {...inks.fine} stroke="var(--ground)" d="M 7.4 7 Q 9.6 3.8 12.8 3.2" />
          <path {...inks.fine} stroke="var(--ground)" d="M 15.6 3.2 Q 17 3.4 18 4" />
          {/* The face's features: turned three-quarters in the act. */}
          <g data-nhi-face="" transform={huh ? `translate(${HUH_TURN} 0.2)` : undefined}>
            {/* Blush, as manga draws it: three short strokes on each cheek. */}
            {[8.8, 19.2].map((x) => (
              <path
                key={x}
                {...inks.fine}
                d={[-1, 0, 1].map((k) => `M ${x + k - 0.3} 17.3 L ${x + k + 0.3} 16.3`).join(" ")}
              />
            ))}
            <Glasses inks={inks} turned={huh} />
            <Mood mood={mood} inks={inks} />
          </g>
        </>,
        "face",
      )}
      {huh ? <Startle inks={inks} /> : null}
      <Layer parts={sit ? sitFront(huh) : standFront(huh)} inks={inks} head={head} />
      {sit ? <PlushEyes x={14} y={28.4} /> : <PlushEyes x={5.2} y={29.4} />}
    </svg>
  );
}

export default MiniNhi;
