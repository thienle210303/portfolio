import { Disclosure } from "@/components/ui/Disclosure";
import { Tag } from "@/components/ui/Tag";
import { cn } from "@/lib/cn";
import type { TreeBranch, TreeRoot } from "@/lib/knowledge-tree";
import { KIND_LABEL } from "./tree-labels";

/**
 * The career tree, actually drawn — the presentation used at >=1024px, where
 * there is finally enough width to draw in. Same data, same authored edges,
 * same component boundary as the list in KnowledgeTreeList.tsx.
 *
 * ## What is drawn, and what draws it
 *
 *   tip      the leader: the trunk's two strokes converging to a point, with
 *            two shoots and their leaves — the crown's taper, drawn rather
 *            than implied by an empty margin
 *   trunk    two hairlines set 26px apart at the base and 3.4px apart at the
 *            tip. Two converging strokes read as taper without a variable
 *            stroke width, which no single SVG path can give at hairline
 *            weight
 *   foot     the base flare and its buttress roots, meeting the ground line
 *   bough    one limb per lens — again two strokes converging, again a taper —
 *            leaving the trunk tangentially (vertical at the junction, the way
 *            a real limb leaves a trunk) and sweeping out to its lens panel,
 *            with a shoot of its own
 *   twig     the run of leaves under a lens, drawn per leaf so it meanders
 *   leaf     one career entry: a bend, a stem, a line-drawn blade, and the
 *            role set beside it
 *   ground   the root panel's own top border, hatched underneath (`GroundHatch`)
 *   roots    the mirror of the canopy, below the plinth (`RootSystem`)
 *
 * ## Nothing measures, nothing animates
 *
 * Anything with real shape lives in a box of fixed size — the tip, the foot,
 * every bough, every leaf's bend and blade. A fixed box cannot be squashed, so
 * its geometry is exactly what was drawn.
 *
 * The two figures whose length is whatever the text beside them needs are
 * handled separately, and differently:
 *
 *   trunk    an SVG stretched vertically, every path `vector-effect=
 *            "non-scaling-stroke"` so the hairline stays a hairline. Its
 *            width and its viewBox width are the same number, so x is exact
 *            pixels and only y scales — and a near-vertical line is the one
 *            shape y-scaling does not visibly distort
 *   twig     not SVG at all: a 1px span between two fixed offsets. A straight
 *            vertical line of unknown height is what CSS draws exactly, and
 *            it saves fifty elements over twenty-five leaves
 *
 * That is what lets a bough end on the trunk and a stem end on its twig with
 * no script and no layout measurement, through any amount of text reflow, at
 * any zoom, in either theme. Two junctions get extra help: a bough runs all
 * the way to the trunk's *centre line* rather than to its edge, so the
 * tapering edge can move without ever leaving a gap; and a leaf's twig has
 * finished bending 11px down, above anything that can reflow, so the straight
 * run below it starts from a known point however the label wraps.
 *
 * ## Where the asymmetry comes from
 *
 * A tree drawn to a grid is a flowchart. Every length, angle, exit height and
 * leaf tilt here varies — but from `hash01()` over the lens and entry ids,
 * never from `Math.random()`. Same id, same number, on the server and in the
 * browser, so the drawing is complete in the server-rendered HTML and
 * hydrates without a mismatch. Retag an entry and its leaf moves; it is the
 * content that makes this tree's shape, not a seed anyone chose.
 *
 * The lopsidedness is the content's too: twelve entries are tagged
 * "Software engineering" and three or four carry each of the others, so one
 * bough is four times the others and the drawing is heaviest at the top left.
 * That is what the career looks like, and a tree is the one diagram that can
 * say so without apologising for it.
 *
 * ## Why the leaves alone are interactive
 *
 * A leaf is a `Disclosure` — the same component the case studies and the
 * timeline use, which is what buys correct `aria-expanded`/`aria-controls`
 * wiring, the collapsed subtree genuinely leaving the tab order, print
 * expansion and the reduced-motion path, without a second implementation of
 * any of it. The panel is an inline expansion directly after its trigger
 * rather than a floating popover: the detail is then reachable by pressing
 * Tab once, needs no focus trap and no Escape handler, and cannot be
 * positioned off the edge of a narrow column. The tree simply grows.
 *
 * Leaves open independently rather than as an accordion. One-at-a-time would
 * mean opening any leaf silently collapsed another somewhere else on the
 * drawing — a layout shift under the pointer, and a tree that can never be
 * read as a whole.
 *
 * Every stroke on this page is `aria-hidden`: to assistive technology this is
 * a list of five branches, each holding a list of the places tagged with it,
 * which is exactly what it is.
 */

interface DrawnTreeProps {
  readonly tree: readonly TreeRoot[];
  readonly className?: string;
}

/* -------------------------------------------------------------------------- */
/* Deterministic variation                                                    */
/* -------------------------------------------------------------------------- */

/**
 * FNV-1a over a stable string → a number in [0, 1). The only source of
 * variation on the drawing. `Math.random()` would give a different tree on
 * the server than in the browser and fail hydration; this gives the same one
 * every time, from ids the content layer already owns.
 */
function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 4096) / 4096;
}

/** `hash01` mapped into a range, to one decimal — short path strings, and
 *  byte-identical output wherever the same code runs. */
function vary(seed: string, min: number, max: number): number {
  return Math.round((min + hash01(seed) * (max - min)) * 10) / 10;
}

/* -------------------------------------------------------------------------- */
/* Geometry                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Half the column gap (`gap-x-24` = 6rem = 96px) — the distance from the
 * trunk, the centre line of that gap, to the near edge of either column. The
 * bough box is exactly that wide, so its two ends land on the two things it
 * joins without either being measured. Change the gap and change this.
 */
const BOUGH_W = 48;

/** The leader above the canopy; matches the container's `pt-16`. */
const TIP_W = 72;
const TIP_H = 64;

/** The base flare; matches the trunk's `bottom-11`. */
const FOOT_W = 76;
const FOOT_H = 44;

/** The twig gutter inside a leaf column, and the mark box that draws the
 *  twig's bend, a stem and a blade across it into the label's inner margin. */
const TWIG_W = 32;
const MARK_W = 44;
const MARK_H = 40;
/** How far down a leaf the twig has finished bending to that leaf's own x —
 *  shared by the mark's path and by the straight run's `top`, which is what
 *  makes the two meet exactly. */
const TWIG_BEND = 11;

/**
 * A leaf blade, drawn from its stalk at the origin and pointing along +x:
 * lanceolate — two arcs meeting at both ends — so it reads as a leaf at 15px
 * and not as a bubble, with a midrib as a second subpath.
 *
 * Returned as path *data* rather than as an element, and tilted by
 * transforming its points rather than by wrapping it in `<g rotate>`. Both
 * choices are about element count. Subpaths cost nothing — a `d` with six `M`
 * commands in it strokes exactly like six paths — so every figure on this
 * drawing is one `<path>`: the trunk, the foot, each bough with its shoot and
 * leaf, each leaf's bend and stem and blade, the ground hatching, the whole
 * root system. Drawn the obvious way this section added two hundred elements
 * to a page that has four thousand; drawn this way it adds a third of that,
 * for the same picture.
 */
const BLADE_PTS = [
  [0, 0],
  [4.4, -5.6],
  [10.6, -6.6],
  [15, -3.6],
  [11.2, 1.8],
  [4.4, 2.8],
  [0.9, -0.3],
  [4.6, -2],
  [9.6, -3.2],
  [14.1, -3.5],
] as const;

type Tilt = readonly [number, number];

/**
 * Eight leaf tilts, written as literal cosine/sine pairs.
 *
 * Literal, and not `Math.cos(angle)`, because `Math.cos` and `Math.sin` are the
 * two functions ECMAScript leaves "implementation-approximated" — every other
 * number on this drawing comes out of IEEE-754 arithmetic that is identical
 * everywhere. Server and browser happen to agree today because both are V8;
 * a hydration mismatch that only shows up in one browser engine is not a thing
 * to leave lying around for the sake of two trig calls.
 */
const TILTS: readonly Tilt[] = [
  [0.866, -0.5], // -30°
  [0.914, -0.407], // -24°
  [0.951, -0.309], // -18°
  [0.978, -0.208], // -12°
  [0.995, -0.105], //  -6°
  [1, 0], //   0°
  [0.995, 0.105], //   6°
  [0.978, 0.208], //  12°
];

function tiltFor(seed: string): Tilt {
  return TILTS[Math.min(TILTS.length - 1, Math.floor(hash01(seed) * TILTS.length))];
}

/** One decimal place — short path strings, and byte-identical output wherever
 *  the same arithmetic runs. */
const r1 = (n: number): number => Math.round(n * 10) / 10;

/** A blade's path data, anchored at its stalk and tilted in place. `dir` of -1
 *  points it back along -x, for the one shoot that leaves the leader leftward. */
function blade(x: number, y: number, tilt: Tilt, dir: 1 | -1 = 1): string {
  const [c, s] = tilt;
  const at = (i: number) => {
    const px = BLADE_PTS[i][0] * dir;
    const py = BLADE_PTS[i][1];
    return `${r1(x + px * c - py * s)} ${r1(y + px * s + py * c)}`;
  };
  return (
    `M${at(0)}C${at(1)} ${at(2)} ${at(3)}C${at(4)} ${at(5)} ${at(0)}Z` +
    `M${at(6)}C${at(7)} ${at(8)} ${at(9)}`
  );
}

/**
 * Shared stroke setup. Round caps because this is meant to read as drawn, not
 * as a border, and `currentColor` so one class sets every line on the tree.
 *
 * That class is `text-fg-subtle`, not `text-rule`. `--rule-color` is the
 * border ink — it exists to separate a panel from the paper without being
 * looked at, and at 1.2:1 on the day ground it does that job perfectly. The
 * tree is not a border. It is the drawing this section is about, and drawn in
 * border ink it disappeared: the first pass of this was legible only at 200%
 * zoom. `--fg-subtle` is the alias for content that is quiet but meant to be
 * read — counts, dates, eyebrows — which is exactly what these strokes are.
 * The panels keep `border-rule`, so the two weights now say which is the
 * drawing and which is the frame.
 */
const strokeProps = {
  "aria-hidden": true,
  focusable: "false",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Every drawn element carries this, so the whole tree is one ink. */
const INK = "text-fg-subtle";

/* -------------------------------------------------------------------------- */
/* The trunk, its tip and its foot                                            */
/* -------------------------------------------------------------------------- */

/** The leader: the trunk narrowing to a point, with two shoots. Fixed size,
 *  so its shape is exact; its bottom edge is the trunk's top edge, where the
 *  two strokes are 3.4px apart. */
function GrowingTip() {
  return (
    <svg
      {...strokeProps}
      width={TIP_W}
      height={TIP_H}
      viewBox={`0 0 ${TIP_W} ${TIP_H}`}
      className={cn("pointer-events-none absolute left-1/2 top-0 -translate-x-1/2", INK)}
    >
      <path
        d={
          // the two trunk strokes, converging to a tip
          "M34.3 64C34.8 46 35.2 26 36 8M37.7 64C37.2 46 36.8 26 36 8" +
          // two shoots off the leader, each ending in a leaf
          "M35.6 42C31 38.4 25.8 36 20.4 35" +
          blade(20.4, 35, TILTS[6], -1) +
          "M36.4 26C40.6 22.2 45.4 19.4 50.6 18" +
          blade(50.6, 18, TILTS[0])
        }
      />
    </svg>
  );
}

/**
 * The trunk. Two near-vertical strokes, 22px apart at the base and 3.4px
 * apart at the tip — which is how you draw taper with a pen that only has one
 * nib, and the reason the trunk is a pair of paths rather than one.
 *
 * The box stretches to whatever the canopy needs. Its *width* never changes
 * and its viewBox is that same width, so every x below is exact pixels; only
 * y scales, and a near-vertical line is the one thing y-scaling does not
 * visibly distort. The widening is deliberately front-loaded — most of it
 * happens in the bottom quarter, the way a real bole flares — which also
 * means the exact height of the drawing barely changes how the taper reads.
 */
function Trunk() {
  return (
    // The span, not the <svg>, carries the `top`/`bottom` pair. An <svg> is a
    // replaced element: given `top`, `bottom` and `height: auto` it ignores
    // the pair and takes its *intrinsic* height from the viewBox — which
    // silently rendered this trunk 100px tall and left the drawing with no
    // spine at all. A stretched box plus `h-full` inside it is the fix, and
    // the same pattern is why every twig segment is wrapped too.
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute bottom-11 left-1/2 top-16 block w-10 -translate-x-1/2",
        INK,
      )}
    >
      <svg
        {...strokeProps}
        viewBox="0 0 40 100"
        preserveAspectRatio="none"
        className="block h-full w-full"
      >
        <path
          d="M7 100C9.4 80 15.2 44 18.3 0M33 100C30.6 80 24.8 44 21.7 0"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  );
}

/** The base flare and its buttress roots, standing on the ground line. Fixed
 *  size, bottom-aligned: its top edge is the trunk's 22px base, its bottom
 *  edge is the root panel's top border. */
function TrunkFoot() {
  return (
    <svg
      {...strokeProps}
      width={FOOT_W}
      height={FOOT_H}
      viewBox={`0 0 ${FOOT_W} ${FOOT_H}`}
      className={cn("pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2", INK)}
    >
      <path
        d={
          // the flare
          "M25 0C23.4 14 20 28 11 44M51 0C52.8 14 56.2 28 65.5 44" +
          // buttress roots
          "M23.4 19C18 26 10.6 32 2 37M53.2 22C58.4 28 66 33.6 74 37.6" +
          // bark grain: two short seams, so the base reads as timber
          "M32.6 2C31.4 12 31 22 29 34M43.6 6C44.8 15 45 24 46.6 35"
        }
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* The ground, and what is under it                                           */
/* -------------------------------------------------------------------------- */

/**
 * The horizon is the root panel's own top border — it already runs the full
 * width of the drawing, so drawing a second line over it would only thicken
 * it. What is missing is which side of that line is earth, and this supplies
 * it: short ticks hanging off the underside, longest under the trunk and
 * shortening outward, the way a section drawing hatches ground.
 *
 * Rendered inside the top of the root panel, above its first line of type.
 */
const GROUND_HATCH = Array.from({ length: 38 }, (_, i) => {
  // Jittered spacing, not a fixed pitch: evenly spaced ticks of a graded
  // length read as a ruler, which is the one thing this must not say.
  const x = r1(14 + i * 26 + vary(`ground-x|${i}`, -8, 8));
  const falloff = Math.abs(x - 500) / 500;
  const length = r1((9 - falloff * 6.4) * vary(`ground-l|${i}`, 0.4, 1));
  return length > 1.4 ? `M${x} 0L${r1(x + vary(`ground-k|${i}`, -2.2, 2.2))} ${length}` : "";
}).join("");

export function GroundHatch({ className }: { readonly className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-x-0 top-0", className)}
    >
      <svg
        {...strokeProps}
        viewBox="0 0 1000 10"
        preserveAspectRatio="none"
        className={cn("block h-2.5 w-full", INK)}
      >
        <path d={GROUND_HATCH} vectorEffect="non-scaling-stroke" />
      </svg>
    </span>
  );
}

/**
 * The root system, under the plinth. Same drawing language, mirrored: a
 * taproot with laterals and their own forks, spreading as wide below the
 * ground as the canopy does above it. Stretched horizontally with the
 * container, which only makes the spread wider on a wider screen — the one
 * distortion a root system is welcome to have.
 */
const ROOTS =
  // taproot
  "M500 0C497 26 503 54 496 88C494 98 492 105 489 113" +
  // primary laterals
  "M500 0C461 20 402 34 341 47C297 56 259 64 223 76" +
  "M500 0C540 19 599 32 661 44C706 53 745 61 782 72" +
  "M500 0C475 25 438 47 397 68C371 81 349 91 327 103" +
  "M500 0C526 23 563 44 604 63C631 76 654 86 677 97" +
  // shallow surface roots
  "M500 0C468 13 425 21 375 25" +
  "M500 0C533 12 577 19 628 22" +
  // forks off the laterals
  "M341 47C327 60 319 73 314 88" +
  "M661 44C676 56 685 68 691 82" +
  "M397 68C376 72 357 73 338 71" +
  "M604 63C625 68 644 70 664 69" +
  "M496 88C484 92 473 95 460 96" +
  "M496 88C508 93 519 96 532 98" +
  // root hairs
  "M223 76C216 82 211 88 207 95" +
  "M782 72C789 78 795 84 800 91" +
  "M375 25C368 30 362 35 357 41" +
  "M628 22C635 27 641 32 646 38";

export function RootSystem({ className }: { readonly className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none", className)}>
      <svg
        {...strokeProps}
        viewBox="0 0 1000 116"
        preserveAspectRatio="none"
        className={cn("block h-[116px] w-full", INK)}
      >
        <path d={ROOTS} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Boughs                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * One bough. Its box hangs from the top of the lens panel and reaches back to
 * the trunk's centre line — not to the trunk's edge — so however the trunk
 * tapers, the junction is buried inside the bole and can never show a gap.
 *
 * The limb is two strokes, like the trunk: they leave the trunk about 11px
 * apart and converge on one point at the panel, which is a taper. Both leave
 * vertically (first control point directly above the start, so the tangent at
 * the junction runs along the trunk) and arrive nearly level. That is the
 * shape a real limb makes, and it is what the old symmetric quarter-circle
 * could not do — that one left the trunk at 45° like a flowchart elbow.
 *
 * Height, sweep, arrival height and the shoot all come from the lens id, so no
 * two boughs on the drawing are the same length or angle.
 */
function Bough({ side, seed }: { readonly side: "left" | "right"; readonly seed: string }) {
  const h = vary(`${seed}|h`, 176, 268);
  const sway = vary(`${seed}|s`, 10, 26);
  const entry = vary(`${seed}|e`, 14, 34);
  const shoot = vary(`${seed}|k`, 34, 62);
  const waist = Math.round(h * 0.5);

  return (
    <svg
      {...strokeProps}
      width={BOUGH_W}
      height={h}
      viewBox={`0 0 ${BOUGH_W} ${h}`}
      className={cn(
        "pointer-events-none absolute top-0 w-12",
        INK,
        side === "right" ? "-left-12" : "-right-12",
      )}
      style={side === "left" ? { transform: "scaleX(-1)" } : undefined}
    >
      <path
        d={
          // underside and topside of the same limb, converging on the panel
          `M0 ${h}C0 ${waist} ${sway} ${entry + 8} ${BOUGH_W} ${entry}` +
          `M0 ${h - 11}C0 ${waist - 8} ${sway + 5} ${entry + 3} ${BOUGH_W} ${entry}` +
          // a shoot off the same junction, ending in a leaf — the detail that
          // separates a branching tree from a connector line
          `M0.5 ${h - 4}C8 ${h - 14} 14 ${h - shoot + 7} 21 ${h - shoot}` +
          blade(21, h - shoot, tiltFor(`${seed}|b`))
        }
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Leaves                                                                     */
/* -------------------------------------------------------------------------- */

/** Where a leaf's twig sits inside the gutter, and how far its label stands
 *  off it. Both vary per entry, which is what gives a run of twelve leaves a
 *  ragged inner edge instead of a comb. */
function twigX(seed: string): number {
  return vary(`${seed}|t`, 3, 11);
}
function leafInset(seed: string): number {
  return vary(`${seed}|i`, 3, 12);
}

interface LeafProps {
  readonly branch: TreeBranch;
  readonly lens: TreeRoot;
  readonly side: "left" | "right";
  /** The twig's x under the leaf above this one, and this leaf's own. The mark
   *  bends from the first to the second in its top 11px, which is what makes a
   *  run of twelve read as one meandering twig rather than a comb. */
  readonly xPrev: number;
  readonly x: number;
  /** False on the last leaf: its run of twig stops short, as a tip. */
  readonly hasNext: boolean;
}

/**
 * One career entry hanging off its branch. Collapsed it carries the role and
 * the organisation; opened it adds the dates, the technologies that entry
 * actually listed and any case study built in it.
 *
 * Three elements draw its share of the tree: a hairline span for the twig's
 * straight run, and one `<svg>` holding one `<path>` for the bend, the stem
 * and the blade. The straight run is a span rather than a stretched `<svg>`
 * because it is a vertical line of unknown height, which is the one shape CSS
 * draws exactly and SVG has to be talked into — and because at twenty-five
 * leaves, two elements each stops being free.
 */
function Leaf({ branch, lens, side, xPrev, x, hasNext }: LeafProps) {
  const seed = `${lens.id}|${branch.id}`;
  const inset = leafInset(seed);
  const bladeAt = 13 + inset;
  // Leaves are not evenly pitched: the gap below each one varies, so a run of
  // twelve has a rhythm rather than a row spacing. Only the gap *below*
  // moves — the twig meets its label at a fixed height, whatever else changes.
  const pad = { paddingTop: 4, paddingBottom: 4 + vary(`${seed}|g`, 0, 11) };

  return (
    <li
      className="relative"
      style={
        side === "right"
          ? { ...pad, paddingLeft: TWIG_W + inset }
          : { ...pad, paddingRight: TWIG_W + inset }
      }
    >
      {/* The straight run: from where the bend lands to the bottom of this
          leaf, which is the top of the next one — so consecutive leaves join
          without either measuring the other. */}
      <span
        aria-hidden="true"
        className={cn("pointer-events-none absolute w-px bg-current", INK)}
        style={{
          top: TWIG_BEND,
          bottom: hasNext ? 0 : 10,
          [side === "right" ? "left" : "right"]: x,
        }}
      />

      {/* The bend, the stem and the blade — a fixed box, so none of them is
          ever squashed by however tall the leaf beside it grows. Mirrored on
          the element itself: x=0 of the viewBox is always the column's
          trunk-facing edge, whichever edge that is. */}
      <svg
        {...strokeProps}
        width={MARK_W}
        height={MARK_H}
        viewBox={`0 0 ${MARK_W} ${MARK_H}`}
        className={cn(
          "pointer-events-none absolute top-0",
          INK,
          side === "right" ? "left-0" : "right-0",
        )}
        style={side === "left" ? { transform: "scaleX(-1)" } : undefined}
      >
        <path
          d={
            `M${xPrev} 0C${xPrev} 4 ${x} 7 ${x} ${TWIG_BEND}` +
            `M${x} 15C${x + 1.5} 19 ${bladeAt - 5} 20.5 ${bladeAt} 24` +
            blade(bladeAt, 24, tiltFor(`${seed}|a`))
          }
        />
      </svg>

      {/* A leaf is capped well short of its column and pinned to the twig
          side. Left to fill the column, the label sat at one end of a 460px
          row and its chevron at the other, which reads as a table row; and
          the outer edge of every leaf lined up into a straight canopy edge.
          Capped and varied, the type keeps its own ragged silhouette — which
          is the outline the crown is actually made of. */}
      <div
        className={side === "left" ? "ml-auto" : undefined}
        style={{ maxWidth: 300 + vary(`${seed}|w`, 0, 56) }}
      >
      <Disclosure
        id={`tree-leaf-${lens.id}-${branch.id}`}
        className="[&>button:hover]:bg-surface"
        // The lens is part of the hidden label, not decoration: the same entry
        // legitimately hangs off several branches, and without it five leaves
        // would announce under one identical name and open five regions that
        // are also identically named.
        expandLabel={`Show detail — ${lens.label}`}
        collapseLabel={`Hide detail — ${lens.label}`}
        // One line, not two: a leaf is the smallest node on the drawing, and
        // at twenty-five of them a second line costs the tree a screen of
        // height for information the panel is about to give anyway.
        summary={
          <span className="wrap-anywhere block text-left text-[length:var(--step-0)] leading-snug text-fg">
            {branch.label}
            {branch.organization ? (
              <span className="text-fg-muted"> · {branch.organization}</span>
            ) : null}
          </span>
        }
      >
        <div className="space-y-3 border-t border-rule pb-4 pt-3">
          <p className="eyebrow">
            {KIND_LABEL[branch.kind] ?? branch.kind} · {branch.dateRange}
          </p>

          {branch.caseStudies.length > 0 ? (
            <p className="text-[length:var(--step--1)] leading-relaxed text-fg-muted">
              Case {branch.caseStudies.length === 1 ? "study" : "studies"}:{" "}
              <a href="#work" className="text-accent underline-offset-4 hover:underline">
                {branch.caseStudies.join(", ")}
              </a>
            </p>
          ) : null}

          {branch.leaves.length > 0 ? (
            <ul
              role="list"
              aria-label={`Technologies used — ${branch.label}`}
              className="flex flex-wrap gap-2"
            >
              {branch.leaves.map((leaf) => (
                <li key={leaf.name}>
                  <Tag>
                    <span className="wrap-anywhere">{leaf.name}</span>
                    {leaf.alsoUsedIn > 0 ? (
                      <span className="text-accent">
                        +{leaf.alsoUsedIn}
                        <span className="sr-only">
                          {" "}
                          other {leaf.alsoUsedIn === 1 ? "place" : "places"} on this page
                        </span>
                      </span>
                    ) : null}
                  </Tag>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Disclosure>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Placement                                                                  */
/* -------------------------------------------------------------------------- */

interface Placement {
  readonly column: 1 | 2;
  readonly row: number;
  /** How far this cluster hangs below the top of its row. */
  readonly drop: number;
}

/**
 * Where each bough leaves the trunk.
 *
 * Boughs are packed in pairs — branch n takes row floor(n/2)+1 — because
 * alternating down a single stack leaves the opposite half of every row empty,
 * which cost this drawing an entire screen of blank paper per branch. Laid out
 * this way, reading left to right and then down lands on the branches in
 * exactly the order they are written, so a keyboard visitor's focus never
 * jumps somewhere the eye has already been.
 *
 * Two things then keep it from reading as a grid:
 *
 *   drop     the right-hand bough of a pair always leaves the trunk lower
 *            than its partner. Real limbs alternate up a trunk; two leaving
 *            at the same height is the single thing that makes a tree look
 *            like an org chart. How much lower is read off the partner: a
 *            row whose left branch carries twelve entries is a tall row, and
 *            a bough that left at its top would be followed by four hundred
 *            pixels of nothing. So the drop scales with the partner's size —
 *            the bigger the branch opposite, the further down its own trunk
 *            the next one starts — plus a per-lens jitter so no two are equal
 *   orphan   an odd final branch goes to whichever column is carrying fewer
 *            entries so far, rather than always to the left. With twelve
 *            entries under the first lens that is never the left, and the
 *            drawing ends with a limb rather than a stump
 */
function placements(tree: readonly TreeRoot[]): readonly Placement[] {
  const load: [number, number] = [0, 0];

  return tree.map((lens, index) => {
    const isOrphan = index === tree.length - 1 && index % 2 === 0;
    const column: 1 | 2 = isOrphan
      ? load[0] <= load[1]
        ? 1
        : 2
      : index % 2 === 0
        ? 1
        : 2;

    load[column - 1] += lens.branches.length;

    // The branch sharing this row, if any — only ever the one written just
    // before a right-hand branch. An orphan has no partner and no row to
    // balance against. Roughly half the height difference between the two, at
    // ~52px per leaf: enough to sit the shorter cluster in the middle of the
    // taller one's run rather than at the top of it.
    const partner = column === 2 && !isOrphan ? tree[index - 1] : undefined;
    const lean = partner
      ? Math.min(Math.max(partner.branches.length - lens.branches.length, 0) * 24, 264)
      : 0;

    return {
      column,
      row: Math.floor(index / 2) + 1,
      drop: (column === 2 ? 44 + lean : 0) + vary(`${lens.id}|d`, 0, 26),
    };
  });
}

/* -------------------------------------------------------------------------- */

export function DrawnTree({ tree, className }: DrawnTreeProps) {
  const placed = placements(tree);

  return (
    <div className={cn("relative min-w-0 pb-28 pt-16", className)}>
      <GrowingTip />
      <Trunk />
      <TrunkFoot />

      <ul role="list" className="relative grid grid-cols-2 items-start gap-x-24 gap-y-10">
        {tree.map((lens, index) => {
          // One placement per lens, in the same order.
          const place = placed[index];
          const side = place.column === 1 ? "left" : "right";
          const xs = lens.branches.map((branch) => twigX(`${lens.id}|${branch.id}`));

          return (
            <li
              key={lens.id}
              className="relative"
              // Placed with `style` rather than utilities on purpose: the row
              // index and the drop are computed, and Tailwind can only
              // generate classes it can see written out in the source.
              style={{
                gridColumn: place.column,
                gridRow: place.row,
                marginTop: place.drop,
              }}
            >
              <Bough side={side} seed={lens.id} />

              {/* The panel is capped and pinned to its trunk-facing edge, so
                  its inner edge — the one the bough lands on — never moves,
                  while its outer edge steps in by a different amount per
                  branch. Five panels all reaching the same margin was most of
                  what made the old drawing read as two columns. */}
              <div
                className={cn(
                  "border border-rule bg-surface px-4 py-3",
                  side === "left" && "ml-auto",
                )}
                style={{ maxWidth: 340 + vary(`${lens.id}|p`, 0, 72) }}
              >
                <p className="eyebrow">Branch</p>
                <h4 className="mt-1 font-display text-[length:var(--step-1)] font-normal leading-tight tracking-[-0.01em] text-fg">
                  {lens.label}
                </h4>
                <p className="mt-1.5 text-[length:var(--step--1)] leading-relaxed text-fg-muted">
                  {lens.description}
                </p>
                <p className="eyebrow mt-2">
                  {lens.branches.length} {lens.branches.length === 1 ? "place" : "places"} ·{" "}
                  {lens.technologyCount} technologies
                </p>
              </div>

              <ul
                role="list"
                aria-label={`Where ${lens.label} was used`}
                className="relative flex flex-col pt-5"
              >
                {/* The twig leaving the panel: from just inside its lower
                    trunk-facing corner, down to where the first leaf's mark
                    picks it up. */}
                <svg
                  {...strokeProps}
                  width={TWIG_W}
                  height={20}
                  viewBox={`0 0 ${TWIG_W} 20`}
                  className={cn(
                    "pointer-events-none absolute top-0",
                    INK,
                    side === "right" ? "left-0" : "right-0",
                  )}
                  style={side === "left" ? { transform: "scaleX(-1)" } : undefined}
                >
                  <path d={`M2 0C2 8 ${xs[0] ?? 7} 11 ${xs[0] ?? 7} 20`} />
                </svg>

                {lens.branches.map((branch, leafIndex) => (
                  <Leaf
                    key={branch.id}
                    branch={branch}
                    lens={lens}
                    side={side}
                    // The first leaf continues the connector above rather than
                    // bending: it is already at its own x when it arrives.
                    xPrev={leafIndex === 0 ? (xs[0] ?? 7) : (xs[leafIndex - 1] ?? 7)}
                    x={xs[leafIndex] ?? 7}
                    hasNext={leafIndex + 1 < xs.length}
                  />
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default DrawnTree;
