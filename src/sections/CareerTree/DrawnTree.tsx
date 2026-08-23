import type { CSSProperties } from "react";
import { Disclosure } from "@/components/ui/Disclosure";
import { Tag } from "@/components/ui/Tag";
import { skillCategories } from "@/content/portfolio";
import { cn } from "@/lib/cn";
import { careerYearSpan, techSlug, type TreeBranch, type TreeRoot } from "@/lib/knowledge-tree";
import { caseStudyAnchorId } from "@/sections/SelectedWork/anchors";
import { JourneyEntryCrossLink } from "./cross-link";
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
 *   foliage  leaflets along each bough, and there are as many of them as that
 *            branch has technologies to show (`foliageCount`) — the crown's
 *            density is data, not decoration
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
 * The foliage says the second half of that. A branch's leaf *rows* count the
 * places it was used; the leaflets on the limb itself count what was used
 * there — `foliageCount()` below, off `technologyCount`. So the crown is thick
 * where the work was broad and sparse where it was narrow, and both readings
 * come out of the content rather than out of a designer's hand.
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

/**
 * A `--ink-delay` style object for one growth-drawn element — the same
 * `vary()` hash the rest of this file uses for geometry, applied to a
 * millisecond stagger instead. SSR'd as an inline custom property (never a
 * `useEffect`, never measured) so the server-rendered HTML already carries
 * the value the shared `InkReveal` primitive's CSS reads once it stamps
 * `data-inked` — see the "Career tree figure" block in globals.css and the
 * reconciliation note atop TreeFigure.tsx for why this file owns the
 * stagger's *value* while InkReveal owns *when* it fires.
 */
function inkDelay(seed: string, min: number, max: number): CSSProperties {
  return { "--ink-delay": `${vary(seed, min, max)}ms` } as CSSProperties;
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

/**
 * Extra headroom above the leader, reserved for the unfinished shoot — the
 * tree's last, deliberately-incomplete stroke (see the design spec's "the
 * tree is never finished"). Added only to `GrowingTip`'s own box: its `<svg>`
 * grows taller and is nudged up by this same amount (`top: -SHOOT_H`), so its
 * *bottom* edge — where the trunk begins — never moves, and `Trunk`'s
 * `top-16` and the container's `pt-16` (both tied to the original `TIP_H`)
 * stay exactly where they always were. The existing leader artwork is
 * translated down by `SHOOT_H` inside its own `<g>` for the same reason: its
 * numbers were written for a box that started at y=0, and this keeps them
 * unchanged rather than re-deriving every coordinate.
 */
const SHOOT_H = 36;

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

/**
 * The steep tilts the foliage uses, written as literal pairs for the same
 * reason `TILTS` is. A leaflet leaves the limb at roughly a right angle to it
 * — that is what a leaf does — so these are the -66°/-60°/-54° family and its
 * mirror below the limb. `blade()` and the petiole share the pair, so a
 * leaflet's stalk and its blade always point the same way.
 */
const UP_TILTS: readonly Tilt[] = [
  [0.407, -0.914], // -66°
  [0.5, -0.866], // -60°
  [0.588, -0.809], // -54°
];
const DOWN_TILTS: readonly Tilt[] = [
  [0.407, 0.914], //  66°
  [0.5, 0.866], //  60°
  [0.588, 0.809], //  54°
];

function pick<T>(options: readonly T[], seed: string): T {
  return options[Math.min(options.length - 1, Math.floor(hash01(seed) * options.length))];
}

/** One decimal place — short path strings, and byte-identical output wherever
 *  the same arithmetic runs. */
const r1 = (n: number): number => Math.round(n * 10) / 10;

/** A blade's path data, anchored at its stalk and tilted in place. `dir` of -1
 *  points it back along -x, for the one shoot that leaves the leader leftward;
 *  `scale` shrinks it, for the foliage leaflets that ride the boughs. */
function blade(x: number, y: number, tilt: Tilt, dir: 1 | -1 = 1, scale = 1): string {
  const [c, s] = tilt;
  const at = (i: number) => {
    const px = BLADE_PTS[i][0] * dir * scale;
    const py = BLADE_PTS[i][1] * scale;
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

/**
 * The leader: the trunk narrowing to a point, with two shoots — and, above
 * all of it, the one shoot that never resolves into a leaf.
 *
 * The box is taller than the trunk it caps by `SHOOT_H`, and nudged up by the
 * same amount, purely so the *existing* leader keeps the exact coordinates it
 * always had (see the note on `SHOOT_H`). The unfinished shoot lives in that
 * new headroom: thinner than every other stroke on the drawing (0.75 against
 * the usual 1), open-ended — no node, no blade closes it — and given the
 * *last* `--ink-delay` of anything in the figure, so it is the final line
 * this drawing ever settles into. Two short ticks along it are the first hint
 * of a bud, not a finished leaf: the tree has not decided what this growth
 * becomes yet, which is the whole point of drawing it at all.
 *
 * Beside it, an aria-hidden annotation names the same fact in words —
 * `still growing · {lastYear}` — in the drawing's existing convention for a
 * computed, decorative label (the `eyebrow` year marker beside a `Leaf`
 * below). It restates nothing new: the rail's own "Rings" note already gives
 * this year, and a screen reader gets that fact once, from real text, not
 * twice from a picture repeating itself.
 */
function GrowingTip() {
  const { lastYear } = careerYearSpan();

  return (
    <>
      <svg
        {...strokeProps}
        width={TIP_W}
        height={TIP_H + SHOOT_H}
        viewBox={`0 0 ${TIP_W} ${TIP_H + SHOOT_H}`}
        className={cn("pointer-events-none absolute left-1/2 -translate-x-1/2", INK)}
        style={{ top: -SHOOT_H }}
      >
        {/* The leader, unchanged — every coordinate below is the same as it
            has always been, just carried down by the new headroom. */}
        <g transform={`translate(0, ${SHOOT_H})`}>
          <path
            pathLength={1}
            className="tree-draw"
            style={inkDelay("tip", 380, 460)}
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
        </g>

        {/* The unfinished shoot. Continues from the same point the leader's
            two strokes converge on (36, 8 in the leader's own frame, so
            36, 8 + SHOOT_H once translated) and curves up into the headroom
            above, tapering toward nothing rather than a leaf. */}
        <g data-tree-shoot>
          <path
            pathLength={1}
            className="tree-draw"
            strokeWidth={0.75}
            style={inkDelay("shoot", 980, 1060)}
            d={
              `M36 ${SHOOT_H + 8}C36.9 ${SHOOT_H - 3} 34.3 ${SHOOT_H - 15} 38.2 ${SHOOT_H - 22}` +
              `C39.6 ${SHOOT_H - 24.5} 40.4 ${SHOOT_H - 28} 41.1 ${SHOOT_H - 32}` +
              // two tiny bud ticks — barely there, the first hint of a leaf
              // rather than one
              `M37.2 ${SHOOT_H - 9}l3 -1.3M39 ${SHOOT_H - 18}l2.7 -0.6`
            }
          />
        </g>
      </svg>

      {/* The words beside it. Positioned off the shoot's own tip rather than
          measured, like everything else on this drawing. */}
      <span
        aria-hidden="true"
        className="eyebrow pointer-events-none absolute left-1/2 whitespace-nowrap"
        style={{ top: -SHOOT_H + 2, transform: "translateX(18px)" }}
      >
        still growing · {lastYear}
      </span>
    </>
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
      {/* Stretched and `preserveAspectRatio="none"`, so a dash-draw is out
          (the note on `.tree-draw` in globals.css explains why) — the whole
          `<svg>` grows instead, scaled up from the ground, which is the one
          distortion a trunk reaching for the canopy is welcome to have. The
          class sits on the `<svg>` rather than the `<path>` here: it is a
          replaced element with its own border-box, so `transform-origin:
          bottom` means exactly what it says, where a nested `<path>`'s
          transform box is the viewBox and would need more care. */}
      <svg
        {...strokeProps}
        viewBox="0 0 40 100"
        preserveAspectRatio="none"
        className="tree-grow block h-full w-full"
        style={inkDelay("trunk", 20, 60)}
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
        pathLength={1}
        className="tree-draw"
        style={inkDelay("foot", 140, 200)}
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
        {/* Stretched horizontally, only 10px tall: a dash-draw or a scaleY
            grow both read as noise at this aspect ratio, so the hatching
            fades in instead — the third of the three treatments the
            stretched SVGs need (see the note on Trunk above). */}
        <path
          className="tree-fade"
          style={inkDelay("ground", 0, 20)}
          d={GROUND_HATCH}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  );
}

/**
 * The root system, under the plinth. Same drawing language, mirrored: a
 * taproot with one *major* lateral per authored skill category and their own
 * forks, spreading as wide below the ground as the canopy does above it.
 * Stretched horizontally with the container, which only makes the spread
 * wider on a wider screen — the one distortion a root system is welcome to
 * have.
 *
 * The taproot itself, its three crown-forks and the two shallow surface roots
 * are fixed decoration: texture that reads as "root system" but names
 * nothing, so it owes no count to anything in the content layer. The major
 * laterals are the opposite — there is exactly one per `skillCategories`
 * entry (see `RootSystem` below), because those are the roots `RootLabels`
 * names, and a label with no root under it, or a root with no label under
 * it, would both be lies this drawing doesn't tell anywhere else.
 */

/**
 * The root system's own viewBox height. Taller than the canopy above it
 * needs to be honest, because it now has to hold a third fork of the
 * taproot and laterals reaching deeper into the panel — see `ROOT_H`.
 *
 * Kept in sync by hand with the literal `h-[220px]` Tailwind class on
 * `RootSystem`'s `<svg>` below: Tailwind's arbitrary-value classes are
 * matched as literal text at build time, so a template literal there would
 * not generate a utility at all. Change one, change the other.
 */
const ROOT_H = 220;

/**
 * The underground's fixed decoration: a taproot with its own crown-forks and
 * a shallow surface pair, each now forking a second time — the same density
 * the canopy's boughs get from their own foliage, mirrored below ground
 * rather than only above it. Still fully literal, still owing no count to
 * the content layer: nothing here is a major root `RootLabels` names, so
 * nothing here needs to agree with `skillCategories`.
 */
const TAPROOT_AND_TEXTURE =
  // taproot, forking three times as it runs deeper — the surface pair the
  // drawing always had, plus a third below them, so the taproot itself
  // reads as reaching further down than the laterals branching off it do
  "M500 0C497 34 503 70 497 112C494 132 505 148 499 168C497 182 495 196 493 210" +
  "M497 112C484 118 472 123 458 125C452 129 447 133 443 138" +
  "M497 112C510 119 522 124 536 128C542 132 547 137 551 143" +
  "M499 168C489 174 480 179 470 184C465 188 461 192 458 197" +
  "M499 168C509 175 519 180 530 185C536 189 541 193 545 198" +
  // shallow surface roots — unlabelled texture, not a major root — each now
  // forking a second time so the crown of the taproot reads as dense as the
  // major laterals fanning out below it
  "M500 0C468 15 425 24 375 28" +
  "M500 0C533 14 577 22 628 25" +
  "M375 28C368 33 362 38 357 44" +
  "M375 28C381 35 386 43 388 52" +
  "M628 25C635 30 641 35 646 41" +
  "M628 25C622 33 619 42 619 51";

/**
 * Fine hair texture at the taproot's own crown, between the surface roots and
 * the taproot itself — rendered as its own thin path (see `RootSystem`)
 * rather than folded into `TAPROOT_AND_TEXTURE`, because a single `<path>`
 * cannot mix stroke widths and these are meant to read as finer than
 * everything else down here, the same way `feederHairs` reads finer than a
 * category's own lateral.
 */
const TAPROOT_HAIRS = "M455 8L446 19M470 4L466 16M530 8L539 19M515 4L519 16";

/**
 * One growth ring per year the career has been running
 * (`careerYearSpan().years`) — concentric semi-ellipse arcs centred on the
 * taproot's own origin, widest first so each tighter ring paints over the
 * last and stays legible against it.
 *
 * Drawn with the SVG arc command rather than points sampled from a
 * trigonometric curve: an ellipse is exactly what `A rx ry 0 0 0 …`
 * describes, so this stays plain IEEE-754 arithmetic like every other number
 * on the drawing (see the file header) — the browser's own renderer walks
 * the ellipse, this file never calls `Math.cos`/`Math.sin` to approximate
 * one. One `aria-hidden` path; `RootSystem` gives it `data-tree-part="rings"`
 * so it takes the same brighten-only emphasis as everything else.
 */
function growthRings(years: number): string {
  let d = "";
  for (let i = 0; i < years; i += 1) {
    const rx = 42 + i * 24;
    const ry = 9 + i * 5;
    d += `M${r1(500 - rx)} 0A${rx} ${ry} 0 0 0 ${r1(500 + rx)} 0`;
  }
  return d;
}

/**
 * The x a major root's tip lands on, 0..1000 — the root system's own
 * coordinate space, and (because the SVG is stretched to the section's full
 * width with no left/right padding of its own) the same fraction the section
 * itself maps a percentage onto. Root `index` of `count` is centred on
 * `((index + 0.5) / count) * 1000` — the centre of an evenly divided column,
 * not a value nudged by `vary()`.
 *
 * That determinism is what lets `RootLabels` line a name up under its root
 * without importing this number: laying the same count of *equal-width* grid
 * columns out under the root system puts column `i`'s centre at exactly this
 * same fraction by construction. One formula, expressed twice as two
 * different kinds of arithmetic — SVG coordinates here, CSS grid columns
 * there — is what a fixed layout is allowed to do; a number computed once
 * and threaded through props is what a *measured* one would need, and this
 * whole drawing goes out of its way not to measure anything (see the file
 * header). The tip itself is still real geometry, not a label's shadow: it
 * is where `lateralRoot` actually draws the root to.
 */
export function rootTipX(index: number, count: number): number {
  if (count <= 0) return 500;
  return r1(((index + 0.5) / count) * 1000);
}

/**
 * How many forks a major root shows: one for roughly every three skills in
 * that category, floored at one so even the smallest category's root still
 * branches once. The same honesty rule `foliageCount` applies to the canopy
 * — a category with nine skills (`frameworks`) should look like it forks more
 * than one with five (`data`), and the count that decides that is the
 * authored skill list itself, not a designer's eyeball.
 */
function rootForkCount(skillCount: number): number {
  return Math.max(1, Math.round(skillCount / 3));
}

/**
 * One short sub-fork off a point already on the drawing — a fork's fork, the
 * second (or third) level of branching a major root gets, mirroring how a
 * bough's own foliage rides its curve rather than the trunk directly. Returns
 * the tip along with the path text so a caller can chain a further level off
 * of it, the way `lateralRoot` chains a third level off some second-level
 * tips below.
 */
function subFork(seed: string, x: number, y: number, dir: 1 | -1): { d: string; tip: Point } {
  const dx = dir * vary(`${seed}|x`, 5, 11);
  const dy = vary(`${seed}|y`, 6, 14);
  const tip: Point = [r1(x + dx), r1(y + dy)];
  const d =
    `M${r1(x)} ${r1(y)}C${r1(x + dx * 0.5)} ${r1(y + dy * 0.4)}` +
    ` ${r1(x + dx * 0.8)} ${r1(y + dy * 0.75)} ${tip[0]} ${tip[1]}`;
  return { d, tip };
}

/**
 * Fine root hairs riding a lateral's own curve — the underground equivalent
 * of `foliage()`: short, thin (`RootSystem` renders them at their own
 * sub-0.5 stroke width, never the lateral's), and spread over the same back
 * half of the root the forks occupy, so the whole root reads as one dense
 * fibrous mass rather than a bare line with a few forks hanging off it.
 * `dir` alternates per hair rather than following the fork's own bias — real
 * fine roots go every which way, where the *forks* are what carries the
 * lateral's overall sweep.
 */
function feederHairs(seed: string, curve: Curve, count: number): string {
  let d = "";
  for (let i = 0; i < count; i += 1) {
    const span = count === 1 ? 0.5 : i / (count - 1);
    const t = 0.3 + span * 0.55 + vary(`${seed}|ht${i}`, -0.03, 0.03);
    const [x, y] = cubicAt(curve, t);
    const dir = i % 2 === 0 ? 1 : -1;
    const dx = dir * vary(`${seed}|hx${i}`, 3, 7);
    const dy = vary(`${seed}|hy${i}`, 3, 8);
    d += `M${r1(x)} ${r1(y)}L${r1(x + dx)} ${r1(y + dy)}`;
  }
  return d;
}

/**
 * One major root: a tapering lateral from the taproot's own origin out to
 * `tipX`, forking two or three levels deep — the same botanical weight the
 * canopy's boughs get from their own foliage, mirrored below ground. Depth,
 * sweep and every fork vary per category id via `vary()` — the same
 * deterministic hash every other organic line on this drawing uses — but
 * `tipX` itself never does, because it is the one number `RootLabels` has to
 * still agree with once the root is below a border and the label is a
 * separate DOM block reading its name.
 *
 * The curve's first control point is biased toward x=500 (`dx * 0.22`, not
 * the canopy boughs' `dx * 0.5`-ish sweep) so the bundle of six roots
 * visibly gathers into the trunk base before it fans out toward its own
 * tip — a taproot's laterals leave close together and spread, where a
 * bough's shoot leaves the trunk already at its own angle.
 *
 * Built as a `Curve` and read back with `cubicAt` for each fork's origin
 * rather than eyeballing a waypoint the way the trunk's boughs originally
 * did — both helpers already exist below for the canopy, and a root forking
 * off its own curve is the same shape as a bough's shoot forking off the
 * limb.
 *
 * Returns the main lateral (curve + every fork, one stroke weight — what
 * `data-tree-lateral` highlights) separately from its feeder hairs (a
 * second, thinner path `RootSystem` renders on its own): a single `<path>`
 * cannot mix stroke widths, and the hairs are meant to read as finer than the
 * root that grew them.
 */
function lateralRoot(
  id: string,
  tipX: number,
  forkCount: number,
): { readonly main: string; readonly feeders: string } {
  const dx = tipX - 500;
  const tipY = vary(`root|${id}|y`, 78, 132);
  const curve: Curve = [
    [500, 0],
    [r1(500 + dx * 0.22 + vary(`root|${id}|mx`, -10, 10)), vary(`root|${id}|my`, 18, 34)],
    [
      r1(500 + dx * 0.78 + vary(`root|${id}|nx`, -10, 10)),
      r1(tipY * vary(`root|${id}|ny`, 0.55, 0.8)),
    ],
    [tipX, tipY],
  ];

  const forkDir: 1 | -1 = dx < 0 ? -1 : 1;
  let forks = "";
  for (let i = 0; i < forkCount; i += 1) {
    // Spread along the back half of the root, in order, so forks read as a
    // sequence rather than clustering — the same span `foliage()` uses.
    const span = forkCount === 1 ? 0.5 : i / (forkCount - 1);
    const t = 0.34 + span * 0.4 + vary(`root|${id}|ft${i}`, -0.03, 0.03);
    const [fx, fy] = cubicAt(curve, t);
    const forkDx = forkDir * vary(`root|${id}|fx${i}`, 8, 17);
    const forkDy = vary(`root|${id}|fy${i}`, 8, 19);
    const tipX2 = r1(fx + forkDx);
    const tipY2 = r1(fy + forkDy);
    forks +=
      `M${r1(fx)} ${r1(fy)}C${r1(fx + forkDx * 0.5)} ${r1(fy + forkDy * 0.4)}` +
      ` ${r1(fx + forkDx * 0.8)} ${r1(fy + forkDy * 0.75)} ${tipX2} ${tipY2}`;

    // Second level: the fork itself forks, once on each side — the same
    // idiom `subFork` shares with the taproot's own crown above.
    const oppositeDir: 1 | -1 = forkDir === 1 ? -1 : 1;
    const second1 = subFork(`root|${id}|sf${i}a`, tipX2, tipY2, forkDir);
    const second2 = subFork(`root|${id}|sf${i}b`, tipX2, tipY2, oppositeDir);
    forks += second1.d + second2.d;

    // Third level, on roughly half the forks (hashed, not alternated, so it
    // is not a visible every-other pattern): one further fork off the first
    // second-level tip, so a root with several forks reads as reaching two
    // or three levels deep rather than a uniform two everywhere.
    if (hash01(`root|${id}|sf${i}c`) > 0.5) {
      forks += subFork(`root|${id}|sf${i}c`, second1.tip[0], second1.tip[1], forkDir).d;
    }
  }

  return {
    main: curvePath(curve) + forks,
    feeders: feederHairs(`root|${id}`, curve, Math.max(3, forkCount + 2)),
  };
}

export function RootSystem({ className }: { readonly className?: string }) {
  const count = skillCategories.length;
  const { years } = careerYearSpan();

  return (
    <div aria-hidden="true" className={cn("pointer-events-none", className)}>
      {/* Stretched and `preserveAspectRatio="none"`, like the trunk above —
          the whole `<svg>` grows down from the ground rather than any one
          path dash-drawing, for the same reason. */}
      <svg
        {...strokeProps}
        viewBox={`0 0 1000 ${ROOT_H}`}
        preserveAspectRatio="none"
        className={cn("tree-grow-down block h-[220px] w-full", INK)}
        style={inkDelay("roots", 20, 60)}
      >
        <path d={TAPROOT_AND_TEXTURE} vectorEffect="non-scaling-stroke" />
        {/* The taproot's own fine hairs: thinner than every path above, the
            same way each lateral's `feeders` below reads finer than its own
            main root. */}
        <path d={TAPROOT_HAIRS} strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
        <path
          d={growthRings(years)}
          data-tree-part="rings"
          vectorEffect="non-scaling-stroke"
        />
        {/* One pair of paths per authored skill category, not one shared
            path — so the cross-highlight island (TreeFigure.tsx) can
            brighten exactly the lateral a hovered or focused root label
            names, without touching the other five. The feeder hairs are
            unlabelled texture, like the taproot's own — fine roots are not
            a claim `RootLabels` makes, only the lateral itself is. */}
        {skillCategories.map((category, index) => {
          const { main, feeders } = lateralRoot(
            category.id,
            rootTipX(index, count),
            rootForkCount(category.skills.length),
          );
          return (
            <g key={category.id}>
              <path data-tree-lateral={category.id} d={main} vectorEffect="non-scaling-stroke" />
              <path d={feeders} strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Boughs and their foliage                                                   */
/* -------------------------------------------------------------------------- */

type Point = readonly [number, number];
/** A cubic's four control points, in the bough's own (unmirrored) frame. */
type Curve = readonly [Point, Point, Point, Point];

/** The `d` for one cubic — so a curve is written once and both the stroke that
 *  is drawn and the leaflets that ride it come from the same four points.
 *  Nothing here can drift apart, because there is only one of it. */
function curvePath(c: Curve): string {
  return (
    `M${r1(c[0][0])} ${r1(c[0][1])}` +
    `C${r1(c[1][0])} ${r1(c[1][1])} ${r1(c[2][0])} ${r1(c[2][1])} ${r1(c[3][0])} ${r1(c[3][1])}`
  );
}

/** The point at parameter `t` along a cubic — de Casteljau written out. Plain
 *  IEEE-754 arithmetic, so it gives the same answer on the server as in the
 *  browser, which is what the whole drawing depends on. */
function cubicAt(c: Curve, t: number): Point {
  const u = 1 - t;
  const [a, b, d, e] = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [
    a * c[0][0] + b * c[1][0] + d * c[2][0] + e * c[3][0],
    a * c[0][1] + b * c[1][1] + d * c[2][1] + e * c[3][1],
  ];
}

/**
 * How many leaflets a bough carries: one per four distinct technologies under
 * that branch, floored at two so even the narrowest branch is in leaf.
 *
 * This is the whole point of the foliage, so it is worth being exact about
 * what it does and does not claim. The count is `TreeRoot.technologyCount` —
 * the distinct technologies across every entry tagged with that lens, which is
 * the same number the branch panel prints in words directly below. Nothing is
 * invented and nothing is inferred: it is one authored list, counted.
 *
 * A quarter-scale is a *scale*, not a cap. Capping would have been the easy
 * way to keep the biggest branch tidy, and it would have made the drawing lie
 * at exactly the point it has the most to say — the branch with 33
 * technologies must look denser than the ones with 13, or the shape is
 * decoration again. The leaflets share a fixed run of the limb, so more of
 * them pack tighter rather than growing past the end of the bough.
 */
function foliageCount(technologyCount: number): number {
  return Math.max(2, Math.round(technologyCount / 4));
}

/** Foliage leaflets are drawn at a fraction of a leaf-marker blade: the
 *  markers name a career entry and these are the mass around them, so reading
 *  order stays "entry first, texture second". */
const LEAFLET_SCALE = 0.62;

/**
 * The leaflets along one limb, as one run of subpaths.
 *
 * Each is a short stalk leaving the limb at roughly a right angle to it, with
 * a small blade on the end pointing the same way. They alternate above and
 * below the limb — a run all on one side reads as a comb — and they are spread
 * over the middle half of it, never at the trunk junction (where the two
 * strokes are still 11px apart and a leaflet would sprout out of solid wood)
 * and never at the panel end (where a blade would cross the edge of the box
 * and be clipped by the SVG's own bounds).
 *
 * The one asymmetry: an upward leaflet reaches about 18px above its anchor, so
 * it is only drawn where the limb still has that much room above it inside the
 * box. Where it does not — the last stretch before a bough arrives at its
 * panel — the leaflet hangs below the limb instead, where there is always
 * room. Nothing is measured to decide that; both curves are known here.
 */
function foliage(seed: string, count: number, under: Curve, over: Curve): string {
  let d = "";

  for (let i = 0; i < count; i += 1) {
    const span = count === 1 ? 0.5 : i / (count - 1);
    const t = 0.2 + span * 0.5 + vary(`${seed}|ft${i}`, -0.02, 0.02);

    const aloft = cubicAt(over, t);
    const up = i % 2 === 0 && aloft[1] >= 40;
    const [ax, ay] = up ? aloft : cubicAt(under, t);

    const tilt = pick(up ? UP_TILTS : DOWN_TILTS, `${seed}|fa${i}`);
    const stalk = vary(`${seed}|fs${i}`, 5, 9);
    const dx = stalk * tilt[0];
    const dy = stalk * tilt[1];
    const tipX = ax + dx;
    const tipY = ay + dy;

    d +=
      `M${r1(ax)} ${r1(ay)}` +
      `C${r1(ax + dx * 0.5)} ${r1(ay + dy * 0.2)} ${r1(ax + dx * 0.75)} ${r1(ay + dy * 0.7)}` +
      ` ${r1(tipX)} ${r1(tipY)}` +
      blade(tipX, tipY, tilt, 1, LEAFLET_SCALE);
  }

  return d;
}

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
 * two boughs on the drawing are the same length or angle. `leaflets` does not:
 * it is a count off the content (`foliageCount`), which is what makes the
 * crown's density readable rather than merely varied.
 */
function Bough({
  side,
  seed,
  leaflets,
}: {
  readonly side: "left" | "right";
  readonly seed: string;
  readonly leaflets: number;
}) {
  const h = vary(`${seed}|h`, 176, 268);
  const sway = vary(`${seed}|s`, 10, 26);
  const entry = vary(`${seed}|e`, 14, 34);
  const shoot = vary(`${seed}|k`, 34, 62);
  const waist = Math.round(h * 0.5);

  // Underside and topside of the same limb, converging on the panel. Declared
  // as points rather than as path text because the foliage rides them.
  const under: Curve = [
    [0, h],
    [0, waist],
    [sway, entry + 8],
    [BOUGH_W, entry],
  ];
  const over: Curve = [
    [0, h - 11],
    [0, waist - 8],
    [sway + 5, entry + 3],
    [BOUGH_W, entry],
  ];

  return (
    <svg
      {...strokeProps}
      width={BOUGH_W}
      height={h}
      viewBox={`0 0 ${BOUGH_W} ${h}`}
      data-tree-part="bough"
      className={cn(
        "pointer-events-none absolute top-0 w-12",
        INK,
        side === "right" ? "-left-12" : "-right-12",
      )}
      style={side === "left" ? { transform: "scaleX(-1)" } : undefined}
    >
      <path
        pathLength={1}
        className="tree-draw"
        style={inkDelay(`${seed}|ink`, 460, 640)}
        d={
          curvePath(under) +
          curvePath(over) +
          // a shoot off the same junction, ending in a leaf — the detail that
          // separates a branching tree from a connector line
          `M0.5 ${h - 4}C8 ${h - 14} 14 ${h - shoot + 7} 21 ${h - shoot}` +
          blade(21, h - shoot, tiltFor(`${seed}|b`)) +
          foliage(seed, leaflets, under, over)
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
  /** True only where `branch.startYear` differs from the leaf above it (or
   *  this is the first leaf on the bough) — see the year-marker note on
   *  `Leaf` below. */
  readonly showYear: boolean;
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
 *
 * ## The year marker
 *
 * `showYear` is true only where `branch.startYear` differs from the leaf
 * above it on the same bough, or this is the bough's first leaf — thirteen of
 * the drawing's twenty-five leaves, since a bough often runs several entries
 * from the same year in a row. Where it is true, an `aria-hidden` eyebrow
 * span sits right of the role/org text, marking the point down the bough
 * where the chronology moves. It is chronology-as-texture, not the fact
 * itself: `dateRange` inside the opened panel stays the one figure a screen
 * reader or a reader in either presentation actually reads, so the marker can
 * be hidden from assistive tech without hiding anything the drawing claims.
 * The disclosure summary becomes a flex row to hold it without disturbing the
 * accessible name, which is computed from the same text nodes it always was.
 */
function Leaf({ branch, lens, side, xPrev, x, hasNext, showYear }: LeafProps) {
  const seed = `${lens.id}|${branch.id}`;
  const inset = leafInset(seed);
  const bladeAt = 13 + inset;
  // Leaves are not evenly pitched: the gap below each one varies, so a run of
  // twelve has a rhythm rather than a row spacing. Only the gap *below*
  // moves — the twig meets its label at a fixed height, whatever else changes.
  const pad = { paddingTop: 4, paddingBottom: 4 + vary(`${seed}|g`, 0, 11) };
  const techSlugs = branch.leaves.map((leaf) => techSlug(leaf.name)).join(" ");

  return (
    <li
      className="relative"
      data-tree-entry={branch.id}
      data-tree-techs={techSlugs}
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
        data-tree-part="run"
        className={cn("tree-fade pointer-events-none absolute w-px bg-current", INK)}
        style={{
          top: TWIG_BEND,
          bottom: hasNext ? 0 : 10,
          [side === "right" ? "left" : "right"]: x,
          ...inkDelay(`${seed}|ink-run`, 640, 900),
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
        data-tree-part="mark"
        className={cn(
          "pointer-events-none absolute top-0",
          INK,
          side === "right" ? "left-0" : "right-0",
        )}
        style={side === "left" ? { transform: "scaleX(-1)" } : undefined}
      >
        <path
          pathLength={1}
          className="tree-draw"
          style={inkDelay(`${seed}|ink-mark`, 600, 860)}
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
        // height for information the panel is about to give anyway. The
        // year marker rides the same line, right-aligned, rather than
        // costing a second one of its own.
        summary={
          <span className="flex items-baseline justify-between gap-2 text-left">
            <span className="wrap-anywhere text-[length:var(--step-0)] leading-snug text-fg">
              {branch.label}
              {branch.organization ? (
                <span className="text-fg-muted"> · {branch.organization}</span>
              ) : null}
            </span>
            {showYear ? (
              <span aria-hidden="true" className="eyebrow shrink-0">
                {branch.startYear}
              </span>
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
              {branch.caseStudies.map((caseStudy, index) => (
                <span key={caseStudy.id}>
                  {index > 0 ? ", " : ""}
                  <a
                    href={`#${caseStudyAnchorId(caseStudy.id)}`}
                    className="text-accent underline-offset-4 hover:underline"
                  >
                    {caseStudy.title}
                  </a>
                </span>
              ))}
            </p>
          ) : null}

          {branch.leaves.length > 0 ? (
            <ul
              role="list"
              aria-label={`Technologies used — ${branch.label}`}
              className="flex flex-wrap gap-2"
            >
              {branch.leaves.map((leaf) => (
                <li key={leaf.name} data-tree-tech={techSlug(leaf.name)}>
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

          {/* The way back to this entry on the timeline. Inside the panel and
              nowhere else: twenty-five collapsed leaves must not become
              twenty-five tab stops — see ./cross-link.tsx. */}
          <JourneyEntryCrossLink
            entryId={branch.id}
            label={branch.label}
            organization={branch.organization}
          />
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
              data-tree-lens={lens.id}
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
              <Bough side={side} seed={lens.id} leaflets={foliageCount(lens.technologyCount)} />

              {/* The panel is capped and pinned to its trunk-facing edge, so
                  its inner edge — the one the bough lands on — never moves,
                  while its outer edge steps in by a different amount per
                  branch. Five panels all reaching the same margin was most of
                  what made the old drawing read as two columns. */}
              <div
                data-tree-panel
                className={cn(
                  "border border-rule bg-surface px-4 py-3",
                  side === "left" && "ml-auto",
                )}
                style={{ maxWidth: 340 + vary(`${lens.id}|p`, 0, 72) }}
              >
                <p className="eyebrow">Branch</p>
                {/* <h3>, not <h4>: the tree is its own section now, so the
                    nearest heading above this is the section's own <h2> and
                    a fourth level would skip one (e2e/accessibility.spec.ts
                    sweeps the whole document for that). */}
                <h3 className="mt-1 font-display text-[length:var(--step-1)] font-normal leading-tight tracking-[-0.01em] text-fg">
                  {lens.label}
                </h3>
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
                    showYear={
                      leafIndex === 0 ||
                      branch.startYear !== lens.branches[leafIndex - 1].startYear
                    }
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
