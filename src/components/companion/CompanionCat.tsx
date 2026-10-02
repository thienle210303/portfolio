import type { ReactNode } from "react";

/**
 * The companions' bodies: one cat per instance, drawn as a single-weight line
 * drawing.
 *
 * Drawn from photographs of Thien's actual animals, which is why the pair are
 * not mirror images of each other:
 *
 *  - **The grey one** (cat-fancy "blue") is solid grey with amber eyes and
 *    *grey* paws. He leads.
 *  - **The tabby** is a mackerel with dark striping, a heavily ringed tail and
 *    white socks. She follows.
 *
 * Both are deliberately wide and low. They are a little fat.
 *
 * This file used to draw both of them inside one 92-wide viewBox, which meant
 * they shared a pose, a phase and a position by construction — two animals that
 * could only ever be one sprite stamped twice. Each cat is its own element now
 * and `Companion` positions them independently; the only thing they still share
 * is this drawing and the rAF loop that drives it.
 *
 * ## How the coats are told apart without adding a single colour
 *
 * The obvious way to draw a grey cat next to a brown tabby is two coat colours,
 * and that would mean amending the ten-token palette rule in `globals.css` for
 * the sake of an illustration. It is not necessary. The grey one carries a
 * `currentColor` wash at `COAT_WASH` opacity and the tabby carries none, so one
 * reads as a solid-coated animal and the other as an outline with markings.
 * Because the wash *is* the text colour, both cats follow theme and tone like
 * every other component, and neither needs a palette of its own.
 *
 * That trick also gets the paws right for free, which is the detail the
 * photographs are most unambiguous about: the grey one's feet are the same grey
 * as the rest of him, so his filled body simply extends into them, while the
 * tabby's unfilled feet sit behind a cuff line and read as white socks. The
 * single exception, inherited from the original drawing, is the eye — it uses
 * `--accent`, the one detail worth spending the site's colour licence on.
 *
 * The police cat is the same drawing again — the grey one's wash, none of the
 * tabby's markings — plus a cap. A third coat would have needed a third way of
 * filling a silhouette, and there isn't one that stays inside the palette.
 *
 * Each pose is one continuous contour wherever it can be. A silhouette drawn as
 * one line survives being scaled down far better than the same shape assembled
 * from a dozen separate strokes, which is the size this is actually seen at.
 *
 * ## Why every pose is described as data rather than drawn straight to JSX
 *
 * Because each pose has to be drawn *twice*. Round 5's first note is that the
 * cats were transparent: two animals walking over the hero headline with the
 * words legible straight through their bodies, which reads as a rendering fault
 * rather than as a drawing. The fix is the oldest one in illustration — knock
 * the shape out of what is behind it — and it needs a copy of the whole animal
 * in the page's own ground colour, laid down before the line work.
 *
 * That copy cannot be made by re-filling the drawing wholesale: half of a cat is
 * *open* strokes. A tail is a hooked curve, and filling it auto-closes the hook
 * across its own opening, so a naive fill paints a crescent of ground where
 * nothing is drawn — invisible over empty ground, and a bite taken out of the
 * text everywhere else. So each pose declares which of its parts are closed
 * silhouettes (filled), which are open strokes (backed by a wider ground stroke,
 * never filled), and which are markings that lie *on* a body the mask has
 * already covered and must not be masked at all. `Silhouette` and `LineWork`
 * then render the same list twice.
 *
 * The mask's stroke is wider than the ink's, which leaves a hairline of ground
 * around the whole animal. That is deliberate: it is the margin that keeps a
 * descender from touching the outline, and it is exactly what a cel-drawn
 * character has always had.
 *
 * Purely presentational and `aria-hidden`: `Companion` owns the buttons, the
 * accessible names and every behaviour.
 */

/** One cat's local drawing box. Everything the contours reach stays inside it,
 *  including the tail at full sway. */
export const CAT_W = 50;
export const CAT_H = 42;

/**
 * How high a hopping cat rises, in px: the peak of `@keyframes cat-hop` in
 * globals.css. Not read by the stylesheet — CSS cannot import it — but by the
 * loop, which lifts the speaking cat's bubble, and keeps every caption off
 * her, by this much while she hops (`catBoxes` in Companion.tsx).
 * `tests/ui/CatIcon.test.tsx` reads the keyframes and fails if the two part.
 */
export const CAT_HOP_RISE = 6;

/**
 * The grey coat. High enough to read as a solid-coated animal beside the
 * tabby's bare outline, low enough that the contour and the markings still
 * carry the drawing rather than being swallowed by it.
 *
 * It is a translucent wash over an *opaque* ground fill, which is why it can
 * stay translucent: the mask below it has already taken the page out.
 */
const COAT_WASH = 0.42;

/**
 * Seven poses out of five contours.
 *
 * `sit`, `walk` and `sleep` are the three shapes an animal this size can hold
 * and still be read; `stretch` is the fourth, and it earns its own contour
 * because a stretch is a change of *silhouette* — the whole point of it is the
 * hollowed back and the raised rump, and nothing short of a new outline says
 * that. `eat` is the fifth, on the same argument: a cat with its nose in a bowl
 * is a cat whose head has left the top of the drawing, and no rearrangement of
 * the sitting contour says that.
 *
 * `groom` and `bat` deliberately do not get one: both are a sitting cat doing
 * something with one front paw, and re-drawing the body for them would only
 * invite the two sitting shapes to drift apart. They are the sit contour with a
 * different foreleg, which is also exactly what they are in life.
 */
export type CatPose = "sit" | "walk" | "sleep" | "stretch" | "groom" | "bat" | "eat";
export type CatVariant = "grey" | "tabby" | "police";

interface CompanionCatProps {
  readonly variant: CatVariant;
  readonly pose: CatPose;
  /** 0..1 through the current cycle. Drives tail sway and the walk gait. */
  readonly phase: number;
  readonly blinking: boolean;
  /**
   * 0..1, and 0 almost always: a quick twitch that needs no pose of its own.
   * The near ear tips out and the tail lashes wider for a few hundred ms. The
   * ear is worth animating precisely because it is the smallest thing on a cat
   * that moves by itself — at 50px a twitching ear is legible where a shifting
   * shoulder is not.
   */
  readonly flick?: number;
  /** Drawn smaller inside the resting box. 1 everywhere else. */
  readonly scale?: number;
  /**
   * The `hop` act: marks the drawing `data-cat-hop`, which the stylesheet
   * bounces — twice, once, on the frame the attribute appears — and only
   * under `prefers-reduced-motion: no-preference`. On the `<svg>` itself
   * rather than on anything `Companion` positions, so the bounce's
   * `transform` composes with the wrapper's `translate3d` and the facing
   * span's `scaleX` instead of replacing either.
   */
  readonly hopping?: boolean;
}

/** Exported for `MiniThien`, the one other drawing on this layer that follows
 *  the same ink discipline — a bare line weight for a figure that carries no
 *  coat wash of its own. */
export const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/**
 * The knockout, in the page's own ground.
 *
 * `--ground` and not a token, a hex or `bg-ground`: it is the semantic alias, so
 * it follows the theme *and* whichever tone class the companion's wrapper is
 * currently carrying — which `syncTone` sets from the section the animal happens
 * to be flying over. Over empty ground that makes the mask invisible by
 * construction; over a headline it takes the headline out.
 *
 * The stroke is nearly twice the ink's so the mask reaches a hairline past every
 * contour it is laid under. Anything narrower and the anti-aliased edge of the
 * text creeps out from behind the outline.
 */
const MASK_STROKE = 3;
const MASK_LINE = {
  fill: "none",
  stroke: "var(--ground)",
  strokeWidth: MASK_STROKE,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;
const MASK_AREA = { ...MASK_LINE, fill: "var(--ground)" } as const;

/** Boots and paw pads, at the two sizes the drawing has always used them. */
const PAD_RX = 2.1;
const PAD_RY = 1.5;

/**
 * One drawn part, and what the ground mask underneath is allowed to do with it.
 *
 * The distinction between `area` and `line` is the whole reason this is data:
 * `fill` on an open path silently closes it, and half the parts of a cat are
 * open on purpose.
 */
export type Part =
  /** A closed silhouette. The mask fills it and traces its outline; the ink
   *  draws the contour, carrying the coat wash unless `bare` says otherwise.
   *  Contours that are left open below are ones whose implied closing chord was
   *  checked to run *inside* the filled region — a fill there adds no area the
   *  outline does not already enclose. */
  | { readonly kind: "area"; readonly d: string; readonly bare?: boolean }
  /** An open stroke: a tail, a leg, a foreleg reaching out. The mask lays a
   *  wider ground stroke under it and never fills it. */
  | { readonly kind: "line"; readonly d: string }
  /** A boot or a paw pad. Filled by the mask — the tabby's socks have to hide
   *  text like the rest of her — and stroked by the ink. */
  | { readonly kind: "pad"; readonly cx: number; readonly cy: number; readonly r?: number }
  /** A coat marking, or a line on the face. Ink only: it lies *on* a body the
   *  mask has already covered, and a ground stroke under a stripe would erase
   *  the coat the stripe is drawn on. */
  | { readonly kind: "mark"; readonly d: string };

/** Head, both ears and the brow, shared by the upright contours so the cats
 *  cannot drift into looking like different animals between poses. `flick` tips
 *  the near ear out and back; at 0, 0, 0 this is the original path, unchanged.
 *  `dx`/`dy` are what let a dropped head stay recognisably the same head. */
function head(flick: number, dx = 0, dy = 0): string {
  return `L ${29.5 + dx} ${5 + dy} L ${35 + dx} ${9 + dy} C ${37 + dx} ${8.2 + dy}, ${
    39.5 + dx
  } ${8.2 + dy}, ${41.5 + dx} ${9.2 + dy} L ${44 + dx + flick * 2.4} ${
    3 + dy + flick * 2.2
  } L ${45.5 + dx} ${10.5 + dy} C ${47 + dx} ${13 + dy}, ${46.5 + dx} ${17.5 + dy}, ${
    43.5 + dx
  } ${19.5 + dy}`;
}

/** The same head, dropped and pushed forward for the stretch, and dropped a
 *  shorter way for the bowl — the identical ears, brow and muzzle, so the animal
 *  mid-stretch is recognisably the animal that was sitting a second ago. */
const HEAD_DROP = { x: -3, y: 15 } as const;
const HEAD_EAT = { x: 0.5, y: 9 } as const;

/**
 * The five body contours.
 *
 * Each is the outline main's single cat used, with the belly dropped and the
 * chest pushed out — the brief is two fat cats, and the original was drawn
 * lean. The legs shortened to match: on a deeper body the same leg length
 * turns a cat into a table.
 */
function sitBody(flick: number): string {
  return `M 11 22 C 5.5 25, 5.5 32.5, 11.5 33.5 C 11.5 25, 15.5 19.5, 22 18.5
   C 27 17.8, 28.5 16, 29 12 ${head(flick)}
   C 42 21, 41.5 23.5, 41.5 26.5 L 41.5 36.5 L 19.5 36.5 C 11.5 36.5, 9.5 35, 11.5 33.5`;
}

function walkBody(flick: number): string {
  return `M 13.5 26 C 12.5 20.5, 15 18, 20.5 17.5 C 26 17, 28.5 16, 29 12 ${head(flick)}
   C 42 21, 41 23.5, 41 27.5
   C 40 30, 34 30.4, 22 30.4 C 16.5 30.4, 14 29, 13.5 26`;
}

/**
 * The stretch: rump up, back hollowed, chest and head low and forward. Closed,
 * because unlike the sit and the walk the belly line here is the long edge that
 * carries the pose, and leaving it open lets the coat wash bleed out of it.
 */
function stretchBody(flick: number): string {
  return `M 8.5 30.5 C 6 24.5, 8.5 18, 15 17.6
   C 20.5 17.2, 24.5 21.5, 26 27 ${head(flick, HEAD_DROP.x, HEAD_DROP.y)}
   C 38.5 36.4, 30 36.8, 20 36
   C 12.5 35.4, 9.5 32.8, 8.5 30.5 Z`;
}

/**
 * Eating: haunches down, shoulders forward, head lowered to about a third of
 * the way up the drawing — which is where a bowl standing on the same floor the
 * cat is sitting on puts its rim.
 *
 * The neck is the part that had to be drawn rather than borrowed. Dropping the
 * head alone leaves an animal whose skull has detached from its shoulders, so
 * the back runs further forward and further down before it turns up into the
 * near ear, and the ear keeps its full height off that lower base — a short ear
 * on a lowered head reads as a different, rounder animal.
 */
function eatBody(flick: number): string {
  return `M 11 23 C 5.2 26, 5.5 33.5, 11.5 34.5 C 11.5 27, 15 23, 21.5 22
   C 25.5 21.4, 28.5 21.8, 29.5 21 ${head(flick, HEAD_EAT.x, HEAD_EAT.y)}
   C 43 30.5, 42.6 33, 42.6 36.5 L 19.5 36.5 C 11.5 36.5, 9.5 36, 11.5 34.5`;
}

/**
 * Stretch legs: the forelegs reaching down and forward off a chest that is
 * already on the floor, and the hind pair braced straight under the raised
 * rump. Laid out by hand rather than swung off the walk cycle, because between
 * them and the hollowed back they are the whole read of the pose.
 *
 * The paws stay *behind* the muzzle, which is the one thing this drawing cannot
 * afford to get wrong: a first pass ran them out past the nose, anatomically
 * closer to a real stretch and, at 50px, indistinguishable from two sticks
 * coming out of the cat's face.
 */
const STRETCH_LEGS = [
  { x: 33.5, y: 35, fx: 38.5, fy: 38.4 },
  { x: 30, y: 35.6, fx: 34.8, fy: 39 },
  { x: 13.5, y: 32.8, fx: 12.6, fy: 37.4 },
  { x: 17.5, y: 34.4, fx: 17.4, fy: 38 },
] as const;

/**
 * Curled up. The two ear points are kept close to the same height on purpose:
 * an earlier draft raised the first one, and a tall spike followed by a short
 * bump stopped reading as two ears and started reading as a shark fin.
 */
const SLEEP_BODY = `M 12.5 34 C 6 31, 6 22.5, 13.5 20 C 21 17.5, 31.5 19, 35 24 L 35.8 18.4
   L 40 21.4 C 41.5 21.1, 43 21.3, 44 22 L 46.3 17.6 L 47 23.5
   C 48 25.5, 47.5 29.5, 44.5 31.2 C 40.5 33.4, 33 35 26 35.5
   C 20 35.9, 15.5 35.4, 12.5 34 Z`;

/** Tail wrapped around the front paws, the way a cat closes the circle. */
const SLEEP_TAIL = "M 12.5 34 C 7.5 36.5, 13.5 39, 21.5 38 C 27.5 37.3, 33 36.4, 36 35.4";

/**
 * The cap, drawn between the two ear tips and sitting on the skull line the
 * `head` contour already establishes (y ≈ 8.2–9.2 across x 35–41.5). It is the
 * police cat's only distinguishing mark, so it has to read at 50px wide: a
 * crown, the band under it and a peak thrown forward over the eye — three
 * strokes, no fill, same weight as the animal it sits on.
 *
 * The crown is the one part of the cap that leaves the head's own silhouette, so
 * it is the one part the mask has to treat as an area; the band and the peak lie
 * on ground the skull has already knocked out.
 *
 * Only drawn on the standing poses. The police cat escorts and leaves; it never
 * curls up, and a cap positioned for an upright head lands in mid-air once the
 * body lies down.
 */
const CAP_CROWN = "M 33.6 9.2 C 34.6 5.2, 41.4 5, 42.6 9.4";
const CAP_BAND = "M 33 9.5 L 43.2 9.7";
const CAP_PEAK = "M 42.4 9.6 L 46.8 10.9";

/**
 * Walk-cycle legs: the hip each one hangs from, and which way its foot swings.
 * Front and back pairs oppose each other, which is what makes four straight
 * lines read as a gait rather than as a table.
 */
const WALK_LEGS = [
  { x: 39, y: 29.8, dir: 1 },
  { x: 35.4, y: 30.2, dir: -1 },
  { x: 19, y: 30.4, dir: -1 },
  { x: 15.6, y: 29.4, dir: 1 },
] as const;

/** The seated tail, which carries all of a still cat's movement. `drop` shifts
 *  its root for the eating pose, whose haunch sits a unit lower. */
function sitTail(lash: number, drop = 0): string {
  return `M 11.5 ${33.5 + drop} C 3.5 ${34 + drop}, ${1 + lash * 0.9} ${25 - lash}, ${
    6.5 + lash * 1.6
  } ${20.5 - lash * 1.2}
    C ${8.5 + lash * 1.6} ${18.9 - lash}, ${10.5 + lash} ${19.6 - lash * 0.8},
    ${10.5 + lash * 0.6} ${21.6 - lash * 0.5}`;
}

/* -------------------------------------------------------------------------- */
/* The two passes                                                              */
/* -------------------------------------------------------------------------- */

/** The knockout: every part of the animal in the page's ground, laid down
 *  before a single line of it is drawn. Exported alongside `LineWork` so
 *  `MiniThien` — the one other drawing on this layer, and the one drawn in
 *  the same two-pass technique for the same reason — can render its own part
 *  list through the identical pair of passes rather than a second copy of
 *  this masking logic. */
export function Silhouette({ parts }: { readonly parts: readonly Part[] }) {
  return (
    <g>
      {parts.map((part, index) => {
        if (part.kind === "area") return <path key={index} {...MASK_AREA} d={part.d} />;
        if (part.kind === "line") return <path key={index} {...MASK_LINE} d={part.d} />;
        if (part.kind === "pad") {
          return (
            <ellipse
              key={index}
              {...MASK_AREA}
              cx={part.cx}
              cy={part.cy}
              rx={part.r ?? PAD_RX}
              ry={PAD_RY}
            />
          );
        }
        return null;
      })}
    </g>
  );
}

/** The drawing itself, on top of its own knockout. See the note on
 *  `Silhouette` above for why this is exported. */
export function LineWork({
  parts,
  coat,
}: {
  readonly parts: readonly Part[];
  readonly coat: Record<string, unknown>;
}) {
  return (
    <g>
      {parts.map((part, index) => {
        if (part.kind === "area") {
          return <path key={index} {...(part.bare ? STROKE : coat)} d={part.d} />;
        }
        if (part.kind === "pad") {
          return (
            <ellipse
              key={index}
              {...STROKE}
              cx={part.cx}
              cy={part.cy}
              rx={part.r ?? PAD_RX}
              ry={PAD_RY}
            />
          );
        }
        return <path key={index} {...STROKE} d={part.d} />;
      })}
    </g>
  );
}

/**
 * One cat, in its own local 50×42 box, facing right.
 *
 * The tabby's markings are plain short strokes rather than shapes fitted to the
 * contour. In a drawing whose only fill is the knockout there is nothing for a
 * marking to spill out of, so they only have to be placed inside the body —
 * which is why they can stay this simple. Each is positioned per pose, because a
 * stripe that follows the spine while the cat is sitting is in mid-air once it
 * lies down.
 */
function Cat({ pose, phase, blinking, variant, flick = 0 }: Omit<CompanionCatProps, "scale">) {
  const tabby = variant === "tabby";
  const sway = Math.sin(phase * Math.PI * 2);
  /** The tail carries the twitch as well as the ear: a flicking cat lashes
   *  wider, and the same number drives both so the two read as one impulse.
   *  The boost is modest because the tail's control points already sit close to
   *  the left edge of the drawing box — the ear is the loud half of a flick,
   *  and it has room to move. */
  const lash = sway * (1 + flick * 0.6);

  /** The solid coat. Applied to the closed contours only — never to the tail or
   *  the legs, which are open strokes that a fill would close into blobs. */
  const coat = tabby ? STROKE : { ...STROKE, fill: "currentColor", fillOpacity: COAT_WASH };

  /** One eye, one muzzle line, positioned relative to the upright head so the
   *  dropped-head poses can reuse them by passing the head's own offset. Drawn
   *  outside the part list because the eye is the drawing's one piece of colour,
   *  and it sits on a skull the mask has already knocked out. */
  const faceAt = (shut: boolean, dx = 0, dy = 0): ReactNode => (
    <>
      {shut ? (
        <path {...STROKE} d={`M ${39.6 + dx} ${14.2 + dy} q 1.4 1.2 2.8 0`} />
      ) : (
        <circle cx={41 + dx} cy={14.2 + dy} r="1.3" fill="var(--accent)" stroke="none" />
      )}
      <path {...STROKE} d={`M ${45.6 + dx} ${16.6 + dy} L ${44 + dx} ${17.8 + dy}`} />
    </>
  );

  const parts: Part[] = [];
  let face: ReactNode = null;

  const cap = (): void => {
    if (variant !== "police") return;
    parts.push({ kind: "area", d: CAP_CROWN, bare: true });
    parts.push({ kind: "line", d: CAP_BAND });
    parts.push({ kind: "line", d: CAP_PEAK });
  };

  if (pose === "sleep") {
    parts.push({ kind: "area", d: SLEEP_BODY });
    parts.push({ kind: "line", d: SLEEP_TAIL });
    if (tabby) {
      // Rings across the curled tail, and stripes over the shoulder — the only
      // part of a sleeping cat's back that still faces up.
      for (const d of [
        "M 16.5 37.6 L 17.2 35.4",
        "M 21.5 38 L 22 35.6",
        "M 26.5 37.4 L 27 35.2",
        "M 17 22.5 L 15.5 26",
        "M 22 21 L 20.5 24.5",
        "M 27 20.6 L 26 24",
      ]) {
        parts.push({ kind: "mark", d });
      }
    }
    parts.push({ kind: "mark", d: "M 43.4 26 q 1.8 1.3 3.4 0" });
  } else if (pose === "stretch") {
    parts.push({ kind: "area", d: stretchBody(flick) });
    // Tail up and back over the raised rump — the counterweight that stops a
    // hollowed back reading as a cat that has been stepped on.
    parts.push({
      kind: "line",
      d: `M 8.5 30.5 C 3.5 28, ${2.2 + lash} ${21 - lash}, ${5.5 + lash * 1.6} ${16.5 - lash}`,
    });
    // No cap: the police cat escorts and leaves, it never stretches, and a cap
    // placed for an upright head lands in mid-air on this one.
    for (const { x, y, fx, fy } of STRETCH_LEGS) {
      if (tabby) {
        const toeX = x + (fx - x) * 0.78;
        const toeY = y + (fy - y) * 0.78;
        parts.push({ kind: "line", d: `M ${x} ${y} L ${toeX.toFixed(2)} ${toeY.toFixed(2)}` });
        parts.push({ kind: "pad", cx: fx, cy: fy });
      } else {
        parts.push({ kind: "line", d: `M ${x} ${y} L ${fx} ${fy}` });
      }
    }
    if (tabby) {
      // Striping follows the new spine; the old sit/walk placements sit in
      // mid-air once the back changes shape.
      for (const d of [
        "M 15.5 19 L 15 23.4",
        "M 19.5 19.4 L 19 23.8",
        "M 23.5 22 L 23.2 26",
        `M ${4 + lash * 0.8} 24.5 l 2.4 0.8`,
        `M ${2.8 + lash * 1.2} 20 l 2.4 0.9`,
      ]) {
        parts.push({ kind: "mark", d });
      }
    }
    face = faceAt(blinking, HEAD_DROP.x, HEAD_DROP.y);
  } else if (pose === "walk") {
    // Front and back pairs swing in opposition, which is what makes four
    // straight lines read as a gait rather than as a table.
    const swing = sway * 2;
    parts.push({ kind: "area", d: walkBody(flick) });
    parts.push({
      kind: "line",
      d: `M 13.5 25.5 C ${6.5 + sway} ${23.5 - sway}, ${4 + sway * 1.5} ${16 - sway},
          ${8.5 + sway * 2} ${13 - sway}`,
    });
    /*
      Four legs, and — on the tabby — four white socks.

      The socks were first drawn as a cuff line across each ankle, on the theory
      that in an unfilled drawing a line is all it takes to mark a change of
      colour. At this size it isn't: a horizontal rule crossing a vertical leg
      reads as a tick mark, and four of them read as hash marks. A small closed
      boot at the foot is unambiguous instead, so the tabby's legs stop short of
      the ground and the boot carries the last two units. The grey one keeps
      full-length legs and no boot, because the photographs are clear that his
      feet are the same grey as the rest of him — the wash on his body simply
      runs all the way down.
    */
    for (const { x, y, dir } of WALK_LEGS) {
      const foot = x + dir * swing;
      if (tabby) {
        parts.push({ kind: "line", d: `M ${x} ${y} L ${foot} 33.2` });
        parts.push({ kind: "pad", cx: foot, cy: 34.7 });
      } else {
        parts.push({ kind: "line", d: `M ${x} ${y} L ${foot} 36` });
      }
    }
    if (tabby) {
      // Mackerel striping: short bars dropping from the spine down the flank,
      // thinning towards the hips the way the real coat does, then tail rings
      // that follow the sway so they stay on the tail.
      for (const d of [
        "M 18 19.4 L 17 24",
        "M 22 18.2 L 21 23.6",
        "M 26 17.8 L 25.2 23",
        "M 30.5 18.6 L 30 22.6",
        `M ${9.5 + sway * 0.6} ${23.4 - sway * 0.6} l 2.6 -1`,
        `M ${6 + sway * 1.2} ${19 - sway * 0.9} l 2.6 -1.1`,
      ]) {
        parts.push({ kind: "mark", d });
      }
    }
    cap();
    face = faceAt(blinking);
  } else if (pose === "eat") {
    parts.push({ kind: "area", d: eatBody(flick) });
    parts.push({ kind: "line", d: sitTail(lash, 1) });
    // Two forelegs braced under a chest that has come forward over the bowl.
    parts.push({ kind: "line", d: `M 35.5 ${tabby ? 33.4 : 36.5} L 36 30` });
    parts.push({ kind: "line", d: `M 40.5 ${tabby ? 33.4 : 36.5} L 40.5 31` });
    if (tabby) {
      parts.push({ kind: "pad", cx: 35.5, cy: 35, r: 2.2 });
      parts.push({ kind: "pad", cx: 40.5, cy: 35, r: 2.2 });
      for (const d of [
        "M 16 25 L 14.5 28.5",
        "M 20 22.6 L 18.5 26.2",
        "M 24.5 22 L 23.5 25.6",
        `M ${4.4 + lash * 0.5} 31.5 l 2.4 0.9`,
        `M ${2.2 + lash * 0.8} 27 l 2.5 0.6`,
      ]) {
        parts.push({ kind: "mark", d });
      }
    }
    // No cap, for the same reason the stretch has none: the police cat escorts
    // and leaves, it is never at the bowl, and a cap placed for an upright head
    // floats in mid-air over a lowered one.
    // Eyes half on the food: a cat at a bowl is not looking at you either.
    face = faceAt(blinking, HEAD_EAT.x, HEAD_EAT.y);
  } else {
    /*
     * Sitting, and the two things a sitting cat does with a front paw.
     *
     * `groom` washes: the near foreleg comes up to the muzzle and the eyes shut,
     * because a cat cleaning itself is never looking at you. `bat` reaches: the
     * same leg goes out low and forward, patting at whatever is in front of it —
     * which, for the tabby, is the grey one's tail.
     *
     * Both keep the far leg and boot exactly where the plain sit has them, so
     * the animal is visibly the same animal doing one thing differently.
     */
    const grooming = pose === "groom";
    const batting = pose === "bat";
    /** The batting paw pats back and forth off the same phase that sways the
     *  tail, so a batting cat has one rhythm rather than two. Carried high
     *  enough to clear the chest: a reach at belly height disappears inside the
     *  grey one's coat wash and reads as a stub. */
    const paw = 45.2 + sway * 1.5;

    parts.push({ kind: "area", d: sitBody(flick) });
    // The tail is the cat's whole emotional range while it is sitting still, so
    // it carries all of the idle movement and the body carries none.
    parts.push({ kind: "line", d: sitTail(lash) });

    // Seated, only the front legs show — so the tabby gets two boots, sat on the
    // body's own bottom edge rather than hanging below it.
    if (grooming) {
      // Bent at the elbow and carried out before it comes up, so it reads as a
      // leg rather than a rod, and it finishes at the *mouth* — a paw that stops
      // at the eye is a cat poking itself in the eye.
      parts.push({ kind: "line", d: `M 34.6 30.4 C 39 29, 43.5 25, ${tabby ? 43.1 : 43.4} 20` });
      if (tabby) parts.push({ kind: "pad", cx: 43, cy: 18.9, r: 1.9 });
    } else if (batting) {
      parts.push({
        kind: "line",
        d: `M 34.5 29.5 C 38.5 28.8, 42 27.6, ${(tabby ? paw - 1.6 : paw).toFixed(2)} 26.8`,
      });
      if (tabby) parts.push({ kind: "pad", cx: Number(paw.toFixed(2)), cy: 26.9, r: 1.9 });
    } else {
      parts.push({ kind: "line", d: `M 34.5 ${tabby ? 33.4 : 36.5} L 34.5 26.5` });
    }
    if (tabby) {
      if (!grooming && !batting) parts.push({ kind: "pad", cx: 34.5, cy: 35, r: 2.2 });
      parts.push({ kind: "pad", cx: 39.4, cy: 35, r: 2.2 });
    }
    // The grey one has no boots, so his far leg has to be drawn for the two busy
    // poses or he sits on one leg.
    if (!tabby && (grooming || batting)) {
      parts.push({ kind: "line", d: "M 39.4 36.5 L 39.4 27" });
    }
    if (tabby) {
      // Stripes down the back and haunch while seated, then two rings near the
      // tail's base, which is the part that stays put.
      for (const d of [
        "M 15.5 23.5 L 13.8 27",
        "M 19 20.6 L 17 24.4",
        "M 23.5 19 L 22 23",
        `M ${4.4 + lash * 0.5} ${30.5} l 2.4 0.9`,
        `M ${2.2 + lash * 0.8} ${26} l 2.5 0.6`,
      ]) {
        parts.push({ kind: "mark", d });
      }
    }
    cap();
    face = faceAt(grooming || blinking);
  }

  return (
    <g>
      <Silhouette parts={parts} />
      <LineWork parts={parts} coat={coat} />
      {face}
    </g>
  );
}

export function CompanionCat({
  variant,
  pose,
  phase,
  blinking,
  flick = 0,
  scale = 1,
  hopping = false,
}: CompanionCatProps) {
  return (
    <svg
      // Marks a cat as a cat. The companion layer now draws furniture and toys
      // in the same technique, so "every svg under [data-companion]" stopped
      // meaning "every cat" — and the specs that count animals need to keep
      // counting animals.
      data-cat=""
      // The pose, named, for the one claim the specs make about a pose rather
      // than a position: that both cats are asleep, so the page can be still.
      data-cat-pose={pose}
      data-cat-hop={hopping ? "" : undefined}
      viewBox={`0 0 ${CAT_W} ${CAT_H}`}
      width={CAT_W * scale}
      height={CAT_H * scale}
      aria-hidden="true"
      focusable="false"
    >
      <Cat variant={variant} pose={pose} phase={phase} blinking={blinking} flick={flick} />
    </svg>
  );
}

export default CompanionCat;
