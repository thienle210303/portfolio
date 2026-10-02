import { Disclosure } from "@/components/ui/Disclosure";
import { projects } from "@/content/portfolio";
import { ACT_IDS, actForEntry } from "@/lib/anchors";
import { cn } from "@/lib/cn";
import {
  careerYearSpan,
  stillGrowingCaption,
  type TreeBranch,
  type TreeLeaf,
} from "@/lib/knowledge-tree";
import { firstCanopyYear } from "@/lib/origin-story";
import CaseStudy from "./CaseStudy";
import { drawnSiblings, KIND_LABEL, siblingsLabel } from "./tree-labels";

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
 *            — the drawing's own bottom edge
 *   bough    one limb per career entry — again two strokes converging, again
 *            a taper — leaving the trunk tangentially (vertical at the
 *            junction, the way a real limb leaves a trunk) and sweeping out
 *            to that entry's own panel, with a shoot of its own. Round 12
 *            inverted what a bough *is*: through round 11 it was one of five
 *            resume lenses, with every entry tagged under it hanging off as
 *            its own leaf — DoorDash, tagged with five lenses, hung off the
 *            drawing five times. Now a bough is one career entry, drawn once,
 *            in chronological order up the trunk (oldest lowest); nothing is
 *            grouped by lens any more, so nothing can duplicate
 *   foliage  leaflets along each bough, and there are as many of them as that
 *            entry has leaves to show (`foliageCount`) — the crown's density
 *            is data, not decoration
 *   twig     the run of leaves under one entry, drawn per leaf so it meanders
 *   leaf     one fact that entry authored about itself — a technology it
 *            lists, or an impact line it claims (`TreeLeaf` in
 *            `src/lib/knowledge-tree.ts`) — a bend, a stem, a line-drawn
 *            blade, and the fact set beside it
 *
 * Nothing is drawn below the ground line. Through round 17 a hatched horizon,
 * a root system and a row of skill-category labels sat under it, mounted by a
 * figure the pinned stage replaced; round 18 retired all three rather than
 * re-home them (git history has `GroundHatch`, `RootSystem` and
 * `RootLabels.tsx`).
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
 * finished bending 8px down, above anything that can reflow, so the straight
 * run below it starts from a known point however the label wraps.
 *
 * ## Where the asymmetry comes from
 *
 * A tree drawn to a grid is a flowchart. Every length, angle, exit height and
 * leaf tilt here varies — but from `hash01()` over the entry and leaf keys,
 * never from `Math.random()`. Same id, same number, on the server and in the
 * browser, so the drawing is complete in the server-rendered HTML and
 * hydrates without a mismatch. Edit an entry's technologies or impact lines
 * and its own leaves move; it is the content that makes this tree's shape,
 * not a seed anyone chose.
 *
 * The lopsidedness is the content's too: a role with nine technologies and
 * three impact lines carries three times the foliage of a milestone with one
 * line to its name, and the drawing is heaviest wherever the career itself
 * was busiest. That is what the career looks like, and a tree is the one
 * diagram that can say so without apologising for it.
 *
 * The foliage says the same thing a second way. A branch's own leaf *rows*
 * are exactly what that entry authored; the leaflets riding the limb itself
 * are a count of the same thing — `foliageCount()` below, off
 * `branch.leaves.length`. So the crown is thick where the entry had a lot to
 * show and sparse where it did not, and both readings come out of the
 * content rather than out of a designer's hand.
 *
 * ## Why the branch panel alone is interactive
 *
 * Round 12 moved the `Disclosure` from the leaf to the branch: through round
 * 11 a leaf *was* a career entry, so it needed the collapse — an entry's
 * dates, technologies and case studies are a lot to show at every one of the
 * (up to five) places it hung off the drawing. Now a leaf is a single
 * authored fact — one technology, one impact line — with nothing further
 * underneath it to disclose, so it is drawn plainly: no button, no panel, no
 * tab stop, just a line-drawn blade and the fact beside it. What still needs
 * disclosing — the kind and dates, the drawn branches that ran alongside it,
 * and (since round 18) its case studies in full — lives on the one thing per
 * branch that still has it: the branch panel itself, at the bough's own end,
 * using the same `Disclosure` component the case studies use. That buys correct
 * `aria-expanded`/`aria-controls` wiring, the collapsed subtree genuinely
 * leaving the tab order, print expansion and the reduced-motion path, without
 * a second implementation of any of it — and, with fourteen branches instead
 * of up to twenty-five leaf-entries, it keeps exactly the discipline the
 * round-6 drawing already held: a page a visitor has not touched yet does not
 * hand them a tab stop for every fact on it.
 *
 * Branch panels open independently rather than as an accordion. One-at-a-time
 * would mean opening any panel silently collapsed another somewhere else on
 * the drawing — a layout shift under the pointer, and a tree that can never
 * be read as a whole.
 *
 * Every stroke on this page is `aria-hidden`: to assistive technology this is
 * a list of career entries in order, each holding a list of what it
 * authored about itself, which is exactly what it is.
 */

interface DrawnTreeProps {
  readonly tree: readonly TreeBranch[];
  readonly className?: string;
}

/** Which act a branch is drawn in, as an index into `ACT_IDS`, stamped on the
 *  branch as `data-branch-act`. The map from entry to act lives in
 *  `src/lib/anchors.ts` and nowhere else; this only asks it.
 *
 *  The drawing never learns which act the stage is at. The stage puts that on
 *  its own root as `data-through`, and `globals.css` compares the two — so this
 *  stays a Server Component, rendered once, and every branch is always in the
 *  DOM: the finished tree is what a reader gets with JavaScript off, under
 *  reduced motion and in print. -1 for an entry the map does not place, which
 *  is left unmarked and so is never faded. */
function actIndexOf(branch: TreeBranch): number {
  const act = actForEntry(branch.id);
  return act === undefined ? -1 : ACT_IDS.indexOf(act);
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
 * Half the column gap (`gap-x-16` = 4rem = 64px — round 14 narrowed this
 * from `gap-x-24`/96px to give each column back 16px it was losing to the
 * trunk on a 1024px screen, where two ~300px columns were already tight for
 * a role name and a technology list) — the distance from the trunk, the
 * centre line of that gap, to the near edge of either column. The bough box
 * is exactly that wide, so its two ends land on the two things it joins
 * without either being measured. Change the gap and change this.
 */
const BOUGH_W = 32;

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
 *  twig's bend, a stem and a blade across it into the label's inner margin.
 *  Round 14 shrank `MARK_H` from 40 to 26 and tightened the row pitch below
 *  (`LeafMark`'s `pad`) to match it: at the old sizing a leaf as short as one
 *  line of text packed at less than its own mark's height, so consecutive
 *  bend-stem-blade marks visually overlapped one another — dozens of them
 *  down a busy bough read as a knot of scribbles rather than a legible list
 *  of separate facts. The mark box is now sized to what the shortest leaf row
 *  actually has room for. */
const TWIG_W = 32;
const MARK_W = 44;
const MARK_H = 26;
/** How far down a leaf the twig has finished bending to that leaf's own x —
 *  shared by the mark's path and by the straight run's `top`, which is what
 *  makes the two meet exactly. Shortened alongside `MARK_H`. */
const TWIG_BEND = 8;

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
 * leaf, each leaf's bend and stem and blade. Drawn the obvious way this
 * section added two hundred elements to a page that has four thousand; drawn
 * this way it adds a third of that, for the same picture.
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
 * the usual 1), open-ended — no node, no blade closes it — and released only
 * by the origin story's closing beat, so it is the final line that story ever
 * draws (see `queryGroups` in `OriginStory.tsx`). Two short ticks along it
 * are the first hint of a bud, not a finished leaf: the tree has not decided
 * what this growth becomes yet, which is the whole point of drawing it at all.
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
        {/* The leader — every coordinate below is the same as it has always
            been, just carried down by the new headroom.

            `data-origin-year={firstCanopyYear()}`/`data-origin-tier="trunk"`
            (a design-polish pass): the leader is the very top of the trunk,
            with two leaves already on it, so a visitor watching the origin
            story used to see this whole tip — including its own foliage —
            fully drawn from the very first beat, years before the trunk it
            caps had grown at all. Same year and tier as `Trunk` below, so the
            tip finishes rising in the same stagger step as the trunk's own
            hero moment, not a beat early. (`TrunkFoot` carries no origin
            attributes at all, so the player never holds it back: the flare
            and its roots stand on the ground line for the whole story.) */}
        <g
          data-origin-year={firstCanopyYear()}
          data-origin-tier="trunk"
          transform={`translate(0, ${SHOOT_H})`}
        >
          <path
            pathLength={1}
            className="tree-draw"
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
        <g data-tree-shoot data-origin-year={lastYear} data-origin-tier="leaf">
          <path
            pathLength={1}
            className="tree-draw"
            strokeWidth={0.75}
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
          measured, like everything else on this drawing.

          `data-tree-shoot-label`/`data-origin-year` (not `data-tree-shoot`
          itself — `e2e/sections.spec.ts` holds that selector to a count of
          exactly one, the `<g>` above) make this its own second origin-story
          group, released in lockstep with the shoot: `OriginStory.tsx`'s
          `queryGroups` treats either attribute as "this is the shoot", so the
          words never announce a growth the drawing hasn't shown yet — a bug a
          design-polish pass caught by scrolling mid-story and finding this
          text fully legible over a still-pending tree. `globals.css`'s
          "Origin story v2" block hides it the same non-ink-chrome way it
          already hides a pending leaf's own label. */}
      <span
        aria-hidden="true"
        data-tree-shoot-label
        data-origin-year={lastYear}
        className="eyebrow pointer-events-none absolute left-1/2 whitespace-nowrap"
        style={{ top: -SHOOT_H + 2, transform: "translateX(18px)" }}
      >
        {stillGrowingCaption()}
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
 *
 * `data-tree-trunk`/`data-origin-tier="trunk"` are this file's own hooks for
 * `OriginStory.tsx`'s growth choreography (a design-polish pass, after v2's
 * chronological release already existed): a year's newly-releasing groups
 * are sorted trunk first, then branch, then leaf, so a whole year no
 * longer bumps into view all at once — and `data-tree-trunk` singles this one
 * group out for a slower, hero-length rise, since a trunk is the one thing on
 * this drawing large enough that "everything moves at the same speed" reads
 * as wrong. Neither attribute changes how this element looks outside a
 * running story; see the "Origin story v2" and "Origin story — growth
 * choreography" blocks in globals.css for the CSS side, and the conductor's
 * own `releaseThroughYear` for the JS side.
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
      data-tree-trunk
      data-origin-year={firstCanopyYear()}
      data-origin-tier="trunk"
      className={cn(
        "pointer-events-none absolute bottom-11 left-1/2 top-16 block w-10 -translate-x-1/2",
        INK,
      )}
    >
      {/* Stretched and `preserveAspectRatio="none"`, so a dash-draw is out
          — the whole `<svg>` grows instead, scaled up from the ground, which is the one
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
 *  edge is the drawing's own bottom edge, which is the ground line. */
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
 * How many leaflets a bough carries: one per four leaves that career entry
 * lists (technologies and impact lines together), floored at two so even the
 * quietest entry is in leaf.
 *
 * This is the whole point of the foliage, so it is worth being exact about
 * what it does and does not claim. The count is `branch.leaves.length` —
 * exactly what that one entry authored about itself, the same number of rows
 * drawn down its own twig. Nothing is invented and nothing is inferred: it is
 * one authored list, counted.
 *
 * A quarter-scale is a *scale*, not a cap. Capping would have been the easy
 * way to keep the busiest entry tidy, and it would have made the drawing lie
 * at exactly the point it has the most to say — the role with nine
 * technologies and three impact lines must look denser than the milestone
 * with one line to its name, or the shape is decoration again. The leaflets
 * share a fixed run of the limb, so more of them pack tighter rather than
 * growing past the end of the bough.
 */
function foliageCount(leafCount: number): number {
  return Math.max(2, Math.round(leafCount / 4));
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
 * One bough — one career entry. Its box hangs from the top of that entry's
 * own panel and reaches back to the trunk's centre line — not to the trunk's
 * edge — so however the trunk tapers, the junction is buried inside the bole
 * and can never show a gap.
 *
 * The limb is two strokes, like the trunk: they leave the trunk about 11px
 * apart and converge on one point at the panel, which is a taper. Both leave
 * vertically (first control point directly above the start, so the tangent at
 * the junction runs along the trunk) and arrive nearly level. That is the
 * shape a real limb makes, and it is what the old symmetric quarter-circle
 * could not do — that one left the trunk at 45° like a flowchart elbow.
 *
 * Height, sweep, arrival height and the shoot all come from the entry's own
 * id, so no two boughs on the drawing are the same length or angle.
 * `leaflets` does not: it is a count off the content (`foliageCount`), which
 * is what makes the crown's density readable rather than merely varied.
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
  // Capped lower than before (was 10..26): `BOUGH_W` narrowed to 32 in round
  // 14, and a foliage leaflet riding near this control point can reach a few
  // px past its own anchor — keeping `sway` well inside the new box's width
  // is what stops that reach from clipping against the SVG's own edge.
  const sway = vary(`${seed}|s`, 8, 18);
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
        "pointer-events-none absolute top-0 w-8",
        INK,
        side === "right" ? "-left-8" : "-right-8",
      )}
      style={side === "left" ? { transform: "scaleX(-1)" } : undefined}
    >
      <path
        pathLength={1}
        className="tree-draw"
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
/* The branch panel                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The card at a bough's own end: one career entry, named. Collapsed it
 * carries the role, the organisation and the year; opened it adds the kind
 * and date range, which drawn branches ran at the same time, and every case
 * study built in that role, in full (round 18 — they were a section of their
 * own). What it deliberately does *not* repeat is the entry's
 * technologies or impact lines — those are drawn as this bough's own leaves,
 * always visible on the twig below, so the panel never restates a fact
 * already on the page beside it.
 *
 * `data-tree-panel` is the origin story's hook, and a live contract. The
 * player lives on the stage's own drawing (`CareerTree.tsx` renders
 * `WatchOrigin` inside `[data-origin-host]`), so while the show runs the
 * conductor stamps `data-origin-running` on that host and the "Origin story
 * v2" block in `globals.css` hides a still-pending branch's panel through this
 * attribute — which is what keeps a card from standing fully readable beside a
 * branch that has not grown yet. `e2e/axe.spec.ts` reads it too: its settle
 * poll waits for `#tree [data-tree-panel]` to finish fading before auditing,
 * and fails rather than passing if the selector matches nothing. **Renaming or
 * dropping the attribute breaks the fade and the audit together.**
 *
 * It had a second reader until round 18: the hover/focus cross-highlight
 * island, `TreeFigure.tsx`. The pinned stage never mounted it, and round 18
 * retired it along with its stylesheet rules (git history has both).
 */
function BranchPanel({
  branch,
  side,
  siblings,
}: {
  readonly branch: TreeBranch;
  readonly side: "left" | "right";
  /** Drawn branches that ran at the same time as this one. */
  readonly siblings: readonly TreeBranch[];
}) {
  const accessibleSuffix = `${branch.label}${branch.organization ? `, ${branch.organization}` : ""}`;

  return (
    <div
      data-tree-panel
      className={cn("border border-rule bg-surface px-4 py-1", side === "left" && "ml-auto")}
      style={{ maxWidth: 340 + vary(`${branch.id}|p`, 0, 72) }}
    >
      <Disclosure
        id={`tree-branch-${branch.id}`}
        className="[&>button:hover]:bg-surface"
        expandLabel={`Show detail — ${accessibleSuffix}`}
        collapseLabel={`Hide detail — ${accessibleSuffix}`}
        summary={
          <span className="flex items-baseline justify-between gap-2 text-left">
            <span className="wrap-anywhere text-[length:var(--step-0)] leading-snug text-fg">
              {branch.label}
              {branch.organization ? (
                <span className="text-fg-muted"> · {branch.organization}</span>
              ) : null}
            </span>
            <span aria-hidden="true" className="eyebrow shrink-0">
              {branch.startYear}
            </span>
          </span>
        }
      >
        <div className="space-y-3 border-t border-rule pb-4 pt-3">
          <p className="eyebrow">
            {KIND_LABEL[branch.kind] ?? branch.kind} · {branch.dateRange}
          </p>

          {/* What ran at the same time, computed from the entries' own dates
              (`concurrentWith`) and limited to branches that are drawn — see
              `drawnSiblings`. A fact the content layer already holds, said
              where a reader is looking at the branch it belongs to. */}
          {siblings.length > 0 ? (
            <p className="text-[length:var(--step--1)] leading-relaxed text-fg-muted">
              Ran alongside {siblingsLabel(siblings)}
            </p>
          ) : null}

          {/* The case studies built in this role, in full. They used to be a
              section of their own; the prose is the site's best writing and
              is not trimmed to fit a branch. Inside the disclosure, so a
              collapsed branch costs nothing in the tab order. */}
          {branch.caseStudies.map((caseStudy) => {
            const project = projects.find((candidate) => candidate.id === caseStudy.id);
            if (!project) return null;
            return <CaseStudy key={project.id} project={project} index={projects.indexOf(project)} />;
          })}
        </div>
      </Disclosure>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Leaves                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Where a bough's twig sits inside the gutter. Round 14 made this one value
 * per *branch* rather than per leaf: through round 13 every leaf picked its
 * own x, so the "straight run" between consecutive leaves was actually a
 * dozen short diagonal jogs, one per leaf, and a bough with nine leaves drew
 * nine small kinks nobody was meant to individually notice — it read as a
 * meandering scribble rather than a run of separate facts. One x per bough
 * keeps the spine a single straight line — the calm, legible part of the
 * drawing — while `leafInset` below still varies per leaf, so the *blades*
 * hanging off that spine keep their own ragged, hand-drawn silhouette.
 */
function twigX(seed: string): number {
  return vary(`${seed}|t`, 4, 8);
}
/** How far a leaf's label stands off its twig — varies per leaf, which is
 *  what keeps a straight spine (see `twigX`) from reading as a ruler. */
function leafInset(seed: string): number {
  return vary(`${seed}|i`, 3, 12);
}

interface LeafMarkProps {
  readonly leaf: TreeLeaf;
  /** Unique per leaf (`${branch.id}|${index in branch.leaves}`) — the seed
   *  every hashed variation below reads from, and the value stamped on
   *  `data-tree-entry` for the origin story's per-leaf fade (see the note on
   *  `LeafMark` below). */
  readonly seed: string;
  /** Inherited from the branch this leaf hangs off — every leaf on one bough
   *  shares its entry's own year, so there is nothing to compare against a
   *  neighbour the way the old per-entry leaves once did. */
  readonly startYear: number;
  readonly side: "left" | "right";
  /** The twig's x under the leaf above this one, and this leaf's own. The mark
   *  bends from the first to the second in its top 11px, which is what makes a
   *  run of leaves read as one meandering twig rather than a comb. */
  readonly xPrev: number;
  readonly x: number;
  /** False on the last leaf: its run of twig stops short, as a tip. */
  readonly hasNext: boolean;
}

/**
 * One fact a career entry authored about itself — a technology, or an impact
 * line — hanging off its bough's own twig. Un-boxed and non-interactive: a
 * leaf here has nothing further underneath it to disclose (round 11's leaf
 * *was* a whole career entry and needed the `Disclosure`; round 12's does
 * not — see the file banner's "Why the branch panel alone is interactive").
 *
 * Three elements draw its share of the tree: a hairline span for the twig's
 * straight run, one `<svg>` holding one `<path>` for the bend, the stem and
 * the blade, and a plain text label. The straight run is a span rather than
 * a stretched `<svg>` because it is a vertical line of unknown height, which
 * is the one shape CSS draws exactly and SVG has to be talked into.
 *
 * `data-tree-entry` on the `<li>`, with the label sitting in a direct child
 * `<div>`, is not this file's own invention — it is `globals.css`'s origin-
 * story hook (`[data-tree-entry][data-origin-pending] > div`), unchanged from
 * round 11, just moved down one tier: a *leaf* is now the smallest thing the
 * growth story releases one at a time, where an entry-as-leaf used to be.
 */
function LeafMark({ leaf, seed, startYear, side, xPrev, x, hasNext }: LeafMarkProps) {
  const inset = leafInset(seed);
  const bladeAt = 13 + inset;
  // Leaves are not evenly pitched: the gap below each one varies, so a run of
  // them has a rhythm rather than a row spacing. Only the gap *below*
  // moves — the twig meets its label at a fixed height, whatever else changes.
  // Round 14 tightened both numbers (was 4 / 4+vary(0,11)): a busy bough's
  // run of leaves is what made the drawing's tallest boughs run three and
  // four times longer than a quiet neighbour's, which is most of what threw
  // the two-column layout's reading line off — see the note on `placements`.
  const pad = { paddingTop: 3, paddingBottom: 3 + vary(`${seed}|g`, 0, 5) };

  return (
    <li
      className="relative"
      data-tree-entry={seed}
      data-origin-year={startYear}
      data-origin-tier="leaf"
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
          d={
            `M${xPrev} 0C${xPrev} 3 ${x} 5 ${x} ${TWIG_BEND}` +
            `M${x} 12C${x + 1.2} 14.5 ${bladeAt - 4} 15.5 ${bladeAt} 18` +
            blade(bladeAt, 18, tiltFor(`${seed}|a`))
          }
        />
      </svg>

      {/* A leaf's label is capped well short of its column and pinned to the
          twig side — the same "ragged silhouette, not a table row" rule the
          old per-entry leaf held to, un-boxed per the round-6 ink discipline
          rather than set as a `Tag`: this is the drawing's own ink, not a
          UI chrome token. */}
      <div
        className={cn(side === "left" ? "ml-auto text-right" : undefined, "wrap-anywhere")}
        style={{ maxWidth: 240 + vary(`${seed}|w`, 0, 80) }}
      >
        <p className="text-[length:var(--step--1)] leading-snug text-fg-muted">
          {leaf.text}
          {leaf.kind === "technology" && leaf.alsoUsedIn ? (
            <span className="text-accent">
              {" "}
              +{leaf.alsoUsedIn}
              <span className="sr-only">
                {" "}
                other {leaf.alsoUsedIn === 1 ? "place" : "places"} on this page
              </span>
            </span>
          ) : null}
        </p>
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
 * Boughs are packed in pairs — pair n takes row floor(n/2)+1 — because
 * alternating down a single stack leaves the opposite half of every row empty,
 * which cost this drawing an entire screen of blank paper per branch. Laid out
 * this way, reading left to right and then down lands on the branches in
 * exactly the order the pairing visits them.
 *
 * `tree` itself is oldest-first (`buildCareerTree()`'s own order — "up the
 * trunk, oldest lowest"), but row 1 sits nearest the canopy and the last row
 * nearest the ground, so the row a pair lands in is the *reverse* of its
 * position in the array: the oldest pair gets the last row, the newest gets
 * row 1. `totalPairs - Math.floor(index / 2)` is that reversal — everything
 * else below (column, drop, the orphan rule) reads `tree` in its own forward
 * order exactly as round 11's lens-keyed version did.
 *
 * Two things then keep it from reading as a grid:
 *
 *   drop     the right-hand bough of a pair always leaves the trunk lower
 *            than its partner. Real limbs alternate up a trunk; two leaving
 *            at the same height is the single thing that makes a tree look
 *            like an org chart. How much lower is read off the partner: an
 *            entry with nine leaves is a tall row, and a bough that left at
 *            its top would be followed by a lot of nothing. So the drop
 *            scales with the partner's size — the busier the entry opposite,
 *            the further down its own trunk the next one starts — plus a
 *            per-entry jitter so no two are equal
 *   orphan   an odd final branch goes to whichever column is carrying fewer
 *            leaves so far, rather than always to the left, so the drawing
 *            ends with a limb rather than a stump
 */
function placements(tree: readonly TreeBranch[]): readonly Placement[] {
  const totalPairs = Math.max(1, Math.ceil(tree.length / 2));
  const load: [number, number] = [0, 0];

  return tree.map((branch, index) => {
    const isOrphan = index === tree.length - 1 && index % 2 === 0;
    const column: 1 | 2 = isOrphan
      ? load[0] <= load[1]
        ? 1
        : 2
      : index % 2 === 0
        ? 1
        : 2;

    load[column - 1] += branch.leaves.length;

    // The branch sharing this row, if any — only ever the one written just
    // before a right-hand branch. An orphan has no partner and no row to
    // balance against. Roughly half the height difference between the two, at
    // ~16px per leaf (round 14: was 24px, tuned down to match the tighter
    // leaf pitch `LeafMark` now uses) and capped at 160 (was 264) so a
    // nine-leaf entry paired with an empty one leans, but does not throw its
    // partner most of a screen's height down the trunk: enough to sit the
    // shorter cluster in the middle of the taller one's run rather than at
    // the top of it.
    const partner = column === 2 && !isOrphan ? tree[index - 1] : undefined;
    const lean = partner
      ? Math.min(Math.max(partner.leaves.length - branch.leaves.length, 0) * 16, 160)
      : 0;

    // A partner that genuinely ran at the same time is drawn level with this
    // one, side by side, instead of staggered down the trunk. The stagger
    // exists so two limbs do not look like an org chart; it also says "this
    // one came after that one", which for two jobs held at once is the wrong
    // thing to say. `concurrentWith` is read off the entries' own dates, and
    // `partner` is always a drawn branch, so the degree — which contains every
    // role inside it rather than running beside them, and is demoted — can
    // never be the thing a branch is level with.
    const isConcurrent = partner !== undefined && branch.concurrentWith.includes(partner.id);

    return {
      column,
      row: totalPairs - Math.floor(index / 2),
      // Base offset and jitter both tuned down alongside `lean` above — a
      // calmer stagger to match the tighter leaf pitch.
      // Level means the same drop as the partner's own jitter, not merely no
      // stagger on top of a different one.
      drop:
        partner && isConcurrent
          ? vary(`${partner.id}|d`, 0, 14)
          : (column === 2 ? 28 + lean : 0) + vary(`${branch.id}|d`, 0, 14),
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

      <ul role="list" className="relative grid grid-cols-2 items-start gap-x-16 gap-y-10">
        {tree.map((branch, index) => {
          // One placement per branch, in the same order.
          const place = placed[index];
          const side = place.column === 1 ? "left" : "right";
          const actIndex = actIndexOf(branch);
          // Concurrency, limited to what is on the drawing — see
          // `drawnSiblings` for why that limit is where the degree is dealt
          // with.
          const siblings = drawnSiblings(branch, tree);
          // One twig x for the whole bough (round 14 — see the note on
          // `twigX`), not one per leaf: every leaf shares it, so the run
          // reads as a single straight spine.
          const twigXValue = twigX(branch.id);
          const xs = branch.leaves.map(() => twigXValue);

          return (
            <li
              key={branch.id}
              data-tree-branch={branch.id}
              data-origin-year={branch.startYear}
              data-origin-tier="branch"
              data-branch-act={actIndex >= 0 ? actIndex : undefined}
              data-concurrent-with={
                siblings.length > 0 ? siblings.map((sibling) => sibling.id).join(" ") : undefined
              }
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
              <Bough side={side} seed={branch.id} leaflets={foliageCount(branch.leaves.length)} />

              {/* The panel is capped and pinned to its trunk-facing edge, so
                  its inner edge — the one the bough lands on — never moves,
                  while its outer edge steps in by a different amount per
                  branch. Fourteen panels all reaching the same margin was
                  most of what made the old drawing read as two columns. */}
              <BranchPanel branch={branch} side={side} siblings={siblings} />

              {branch.leaves.length > 0 ? (
                <ul
                  role="list"
                  aria-label={`What ${branch.label} involved`}
                  className="relative flex flex-col pt-5"
                >
                  {/* The twig leaving the panel: from just inside its lower
                      trunk-facing corner, down to where the first leaf's mark
                      picks it up.

                      `tree-fade`: this stroke carries no ink class of its
                      own, so the origin story's pending gate would not
                      touch it without one — a
                      visitor scrolling mid-story past a still-pending branch
                      would find this one short connector fully drawn
                      regardless, the same "chrome outran the ink" bug the
                      panel and the shoot's own label needed fixing for. It
                      rides its branch's own `data-origin-year` (the ancestor
                      `<li>`) once tagged with an ink class at all —
                      `tree-fade` rather than `tree-draw`'s dash-offset, the
                      same choice a leaf's own straight "run" span makes for
                      the same reason: an 8px joint between two points is not
                      a stroke worth watching draw itself, only one worth not
                      seeing too soon. */}
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
                    <path
                      className="tree-fade"
                      d={`M2 0C2 6 ${xs[0] ?? 6} 8 ${xs[0] ?? 6} 20`}
                    />
                  </svg>

                  {branch.leaves.map((leaf, leafIndex) => (
                    <LeafMark
                      key={`${leaf.kind}|${leaf.text}`}
                      leaf={leaf}
                      seed={`${branch.id}|${leafIndex}`}
                      startYear={branch.startYear}
                      side={side}
                      // The first leaf continues the connector above rather
                      // than bending: it is already at its own x when it
                      // arrives.
                      xPrev={leafIndex === 0 ? (xs[0] ?? 7) : (xs[leafIndex - 1] ?? 7)}
                      x={xs[leafIndex] ?? 7}
                      hasNext={leafIndex + 1 < xs.length}
                    />
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default DrawnTree;
