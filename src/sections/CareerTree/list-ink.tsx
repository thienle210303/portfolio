import { cn } from "@/lib/cn";
import { stillGrowingCaption } from "@/lib/knowledge-tree";

/**
 * Decorative ink for the mobile/AT career list — the drawing DrawnTree.tsx
 * renders at >=1024px (a trunk, boughs, year rings, an unfinished tip),
 * redrawn for a single vertical list rather than a two-column canopy.
 *
 * Round 13 ("on a small screen, it is no longer a tree"): through round 12
 * the list's only nod to a trunk was a plain `border-l` and a straight 1px
 * tick per row — real list semantics, no tree-ness. This file supplies the
 * tree-ness back, as pure decoration layered onto that same list: every
 * export here is `aria-hidden`, carries no interactive content, and states
 * no fact the list's own text does not already carry (a branch's year is
 * already in its own summary row; a leaf's row order already reads
 * chronologically). Deleting this whole file would change nothing a screen
 * reader or a keyboard user could notice — see the note atop
 * KnowledgeTreeList.tsx for how the two are kept apart.
 *
 * Same conventions as DrawnTree.tsx, deliberately: `text-fg-subtle` ink
 * (never `border-rule` — that alias is for panel edges, not for a drawing),
 * plain unfilled strokes, and small per-branch variation from a
 * `hash01()`/`vary()` pair over each branch's own id rather than
 * `Math.random()` — same id, same number, on the server and in the browser,
 * so nothing here can mismatch at hydration. The two functions are a small
 * copy of DrawnTree.tsx's own rather than an import from it: they are
 * module-private there, and this round's ownership split keeps DrawnTree.tsx
 * untouched (see the round-13 spec).
 *
 * Unlike DrawnTree.tsx, nothing here is dash-drawn or origin-story-gated:
 * the ink is static from first paint. That is by design, not an omission —
 * the round-13 brief asked for the mobile list's ink back, not a second
 * animation system to keep in sync with the first.
 *
 * ## How the trunk survives a disclosure opening or closing
 *
 * `ListTrunk` is one `<svg>` stretched to the full height of the `<ul>` it
 * sits beside — `position: absolute; inset-block: 0` inside a `position:
 * relative` wrapper, the same "let CSS own the height" trick `DrawnTree.tsx`
 * uses for its own trunk (see the note on `Trunk` there). An absolutely
 * positioned box with both `top` and `bottom` set takes its height from its
 * *containing block*, which is the wrapper's own content box — and that box
 * changes size by itself whenever a `Disclosure` panel opens or closes,
 * because the panel is normal in-flow content pushing the wrapper taller or
 * shorter. Nothing here measures that change or reacts to it; the trunk's
 * `<svg>` is simply told to fill whatever height its container currently
 * has (`preserveAspectRatio="none"`, only the y axis stretches), the same
 * way it was told to fill 400px or 4000px. One continuous line, no seams,
 * no `ResizeObserver`.
 *
 * Each row's own bough (`EntryInk`) does not need any of that: it is a
 * small fixed-size box anchored to its own `<li>`'s top edge, which is
 * exactly a point already on the endless trunk line behind it — so a bough
 * never has to know the trunk's total height, only where it itself begins.
 */

function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 4096) / 4096;
}

function vary(seed: string, min: number, max: number): number {
  return Math.round((min + hash01(seed) * (max - min)) * 10) / 10;
}

/**
 * The gutter both the trunk and every bough share, in pixels — matches the
 * list's own `pl-5` (the row indentation) and the `-left-5`/`w-5` values
 * below. One number, so the drawing and the layout it sits inside cannot
 * drift apart; change one, change this.
 */
const GUTTER = 20;

/** Every stroke on this drawing carries this alias — see the file banner for
 *  why `text-fg-subtle` and not `border-rule`. */
const INK = "text-fg-subtle";

const strokeProps = {
  "aria-hidden": true,
  focusable: "false",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/**
 * The trunk: two hairlines, 8px apart at the top (the list's oldest end —
 * see the note on `EntryInk` for why the oldest end reads as "the ground"
 * here) narrowing to 3px by the bottom, where the newest entry sits and
 * `ListGrowingTip` continues the line past it. `viewBox`'s width and the
 * rendered width are the same number (`GUTTER`), so x is exact pixels and
 * only y stretches — the one axis a near-vertical line does not visibly
 * distort by stretching.
 */
export function ListTrunk() {
  return (
    <span
      aria-hidden="true"
      data-tree-list-trunk
      className={cn("pointer-events-none absolute inset-y-0 left-0 block w-5", INK)}
    >
      <svg
        {...strokeProps}
        viewBox={`0 0 ${GUTTER} 100`}
        preserveAspectRatio="none"
        className="block h-full w-full"
      >
        <path
          d="M6 0C6.6 34 7.4 70 8.4 100M14 0C13.4 34 12.6 70 11.6 100"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  );
}

/** How tall one row's bough box is — enough to leave the trunk near its own
 *  row's top edge and arrive level with the row's first line of text. */
const CONNECTOR_H = 32;

interface EntryInkProps {
  /** Unique per branch (`branch.id`) — the seed every hashed variation below
   *  reads from, so no two rows curve the same way. */
  readonly seed: string;
  /** True when this row's year differs from the row above it (or it is the
   *  very first row) — the trunk gets a small ring at exactly that point,
   *  the same "one ring per year" idea the drawn tree's root system drew
   *  underground until round 18 retired it, here ticking down the trunk
   *  instead of circling a root. */
  readonly showRing: boolean;
}

/**
 * One row's own connector: a curved, tapering bough from the trunk to that
 * row's left edge, with an optional year ring where the trunk crosses into
 * a new year. Two strokes converging on the row (the same taper idiom the
 * trunk and every bough in `DrawnTree.tsx` use) rather than one, so a bough
 * reads as a real limb narrowing to meet the row, not a connector line.
 *
 * Positioned exactly where the round-12 list's own plain tick used to be
 * (`-left-5 top-0`, one 20×32 box) — same coordinate space as `ListTrunk`
 * (`GUTTER`-wide viewBox at 1:1 pixels), so a bough's own trunk-facing end
 * always lands on the trunk line actually drawn beside it, with nothing
 * measured to make that true.
 */
export function EntryInk({ seed, showRing }: EntryInkProps) {
  const trunkX = vary(`${seed}|tx`, 7, 11);
  // Round 14: raised from vary(1, 6). At the old range a bough could leave
  // the trunk at nearly the same point the ring crossed it — both marks
  // occupying the same few square pixels read as a single tangled knot
  // rather than two separate facts (the owner's own first-row nit from
  // round 13). Giving the bough a few more px of clearance below the ring
  // (fixed at the trunk's own y=0 below) is what separates them.
  const leaveY = vary(`${seed}|ly`, 6, 11);
  const arriveY = vary(`${seed}|ay`, 21, 27);
  const sway = vary(`${seed}|sw`, 5, 10);

  const bough =
    `M${trunkX} ${leaveY}C${trunkX} ${leaveY + 9} ${trunkX + sway} ${arriveY - 3} ${GUTTER} ${arriveY}` +
    `M${trunkX + 3} ${leaveY}C${trunkX + 3} ${leaveY + 9} ${trunkX + sway + 2} ${arriveY - 2} ${GUTTER} ${arriveY}`;

  // A short arc crossing the trunk where a year begins — fixed at y=0 and
  // centred on the trunk's own two hairlines (`ListTrunk`'s `d` starts both
  // strokes at x=6 and x=14) rather than following this row's own jittered
  // `trunkX`/`leaveY`. Through round 13 the ring tracked the bough's own
  // wandering departure point, so on a seed where both landed close together
  // — the very first row, in the owner's report — the ring and the bough's
  // two converging strokes drew on top of one another. Pinning the ring to
  // the trunk itself, a few px above wherever this row's bough happens to
  // leave, keeps the two marks legible as separate strokes on every seed
  // rather than on most of them.
  const ring = showRing ? "M5 0A5 1.8 0 0 0 15 0" : "";

  return (
    <svg
      {...strokeProps}
      width={GUTTER}
      height={CONNECTOR_H}
      viewBox={`0 0 ${GUTTER} ${CONNECTOR_H}`}
      data-tree-list-part="bough"
      className={cn("pointer-events-none absolute -left-5 top-0", INK)}
    >
      <path d={bough + ring} />
    </svg>
  );
}

/**
 * The unfinished shoot at the newest end of the list, mirroring
 * `DrawnTree.tsx`'s own `GrowingTip` in miniature: a thinner, open-ended
 * line continuing past the last row with two small bud ticks rather than a
 * resolved leaf, plus the same `stillGrowingCaption()` text in the drawing's
 * own eyebrow convention. The year in that caption is not a new fact — it is
 * the last row's own year, already visible one line above — the same
 * restraint `DrawnTree.tsx`'s tip observes toward its rail's "Rings" note.
 *
 * A plain flow element after the list, not absolutely positioned against
 * it: the trunk above already ends exactly at the `<ul>`'s own bottom edge
 * (its containing block), so this only has to sit immediately below that in
 * normal document flow to read as a continuation, with nothing to keep in
 * sync by hand.
 */
export function ListGrowingTip() {
  const trunkX = vary("list-tip|tx", 8, 12);

  return (
    <div aria-hidden="true" data-tree-list-tip className="relative h-9 pl-5">
      <svg
        {...strokeProps}
        width={GUTTER}
        height={32}
        viewBox={`0 0 ${GUTTER} 32`}
        data-tree-list-shoot
        className={cn("pointer-events-none absolute left-0 top-0", INK)}
      >
        <path
          strokeWidth={0.75}
          d={
            `M${trunkX - 1} 0C${trunkX - 2} 6 ${trunkX + 3} 10 ${trunkX + 1} 18` +
            `C${trunkX} 21 ${trunkX + 2.4} 24 ${trunkX + 1.4} 28` +
            // two tiny bud ticks — the first hint of a leaf, not a finished one
            `M${trunkX - 0.6} 8l2.4 -1.2M${trunkX + 0.6} 17l2.2 -1`
          }
        />
      </svg>
      <span
        data-tree-list-shoot-label
        className="eyebrow relative ml-1 inline-block pt-1 text-fg-subtle"
      >
        {stillGrowingCaption()}
      </span>
    </div>
  );
}
