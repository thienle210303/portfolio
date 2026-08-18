"use client";

/**
 * The problem-solving loop, drawn as an actual ring at >=1024px: the nine
 * authored steps standing as stations around one ellipse, flowing clockwise
 * from 01 at twelve o'clock, with the last arc — 09 back to 01 — dashed, so
 * the figure closes. The philosophy line sits in the middle of it, because
 * that sentence is what the loop is for.
 *
 * WHY A RING AND NOT A COLUMN
 *
 * The previous drawing was honest but tall: nine full-width cards on a
 * vertical trunk, ending in a dashed rail that ran back up the left margin to
 * say "and then it starts again". A reader had to hold the top of the page in
 * their head to believe the arrow. On a ring the claim is not asserted by an
 * arrow at the end, it is the shape of the whole figure.
 *
 * Measured, this block against the column it replaces:
 *
 *   1440px   727px  was 1751   -58%
 *   1024px   637px  was 1742   -63%
 *    768px   933px  was 1729   -46%
 *    390px   918px  was 1886   -51%
 *
 * Below 1024px the saving is the disclosure rather than the ring; see below.
 *
 * WHAT IS AUTHORED AND WHAT IS DRAWN
 *
 * Every station label and every station detail comes from `problemSolvingLoop`
 * in the content layer, verbatim, and the centre line is `profile.philosophy`
 * passed in from Philosophy.tsx — the same value the section heading's
 * accessible name already uses. Nothing here writes a new claim.
 *
 * The two decision points are NOT extra content: the content layer has no
 * "branch" concept, so the branches are drawn as *connector labels*, and each
 * label is a fragment of wording that already exists in the step it belongs to
 * or in the step immediately after it:
 *
 *   Test ("Try to break it on purpose") forks into "ruled out" / "confirmed" —
 *     both words are lifted from the next step, Learn: "Write down what the
 *     result ruled out, not just what it confirmed." Both outcomes rejoin,
 *     because the content says Learn happens either way; the fork marks Test
 *     as the check, not as a router.
 *   Iterate ("Feed it back in. Stop when it's useful, not when it's clever.")
 *     forks into "feed it back in" / "stop when it's useful" — its own two
 *     sentences. This one is a real router: the first branch is the ring's
 *     dashed closing arc, the second terminates.
 *
 * The dashed arc returns to `steps[0]`, not to some chosen mid-point. "Feed it
 * back in" does not say where, and the content calls this a loop of nine
 * steps, so closing 09 -> 01 is the reading that adds nothing.
 *
 * `FORKS` is keyed by content id. If an id disappears or the order changes,
 * the affected fork simply stops rendering and the figure degrades to a plain
 * ring — it never draws a branch off a step that isn't there, and the closing
 * arc is only dashed when the *last* step is the one that carries the loop
 * branch.
 *
 * GEOMETRY
 *
 * One fixed drawing box — 880x552 from 1024px, the same box at 1024x642 from
 * 1280px — and every position inside it is a fraction of that box. No
 * measurement, no ResizeObserver, nothing that can be a different number on
 * the server than it is in the browser.
 *
 *   stations   placed at equal ARC LENGTH around the ellipse, not at equal
 *              parametric angle. On a 230x178 ellipse equal angles bunch the
 *              stations toward the two ends, which reads as an accident;
 *              equal arc length spaces them the way a dial's graduations are
 *              spaced. `angleAtFraction` does the integration once at module
 *              scope, off a fixed 2048-sample table, and rounds — so the same
 *              numbers come out of Node and out of V8 in the browser.
 *   panels     every station panel is the same 11.5rem x 4.5rem box, centred
 *              on the station's own leader line. Uniform boxes are what stop
 *              nine cards on a curve from reading as scatter; the labels are
 *              one or two lines inside a box sized for two.
 *   sector     which side a panel hangs on comes from the station's angle
 *              (right / bottom / left / top), so the labels radiate outward
 *              and the middle of the ring stays empty for the philosophy line.
 *   forks      a decision's branches hang off its panel on the side away from
 *              the ring's centre — below the panel in the lower half, above it
 *              in the upper half. That keeps the two decisions annotating the
 *              ring from outside instead of crowding the centre.
 *
 * The nine collapsed panels clear each other by at least 11px on one axis and
 * 36px on the other; expanded ones deliberately overlay their neighbours (see
 * below) rather than pushing them, since nothing on an absolutely positioned
 * ring can push anything.
 *
 * PROGRESSIVE DISCLOSURE, AND WHY `aria-expanded` DESCRIBES ONLY THE PANEL
 *
 * A station on a ring cannot hold its detail sentence — the box would be
 * three times the size and the ring would not fit. So each station shows its
 * numeral and label always, and reveals its detail on hover, on focus, and on
 * click. The trigger is a `<button aria-expanded aria-controls>` over a
 * region, which is the shared Disclosure primitive's contract, and the region
 * animates open with the same `grid-template-rows: 0fr -> 1fr` technique.
 *
 * One thing is deliberately NOT copied from that primitive: its `visibility`
 * flip, which takes collapsed content out of the accessibility tree. Here that
 * would mean eight of the nine details are unreadable at any given moment,
 * which is a straight regression against the plain list this replaces — where
 * a screen reader simply read all nine steps and all nine details in order.
 * The region therefore stays in the accessibility tree at all times, and
 * `aria-expanded` describes exactly one thing: whether the panel is showing.
 * The consequence is that a collapsed station still reads its detail, i.e. the
 * inaccuracy is only ever in the direction of more information, never less.
 * It is safe to do here and not in Disclosure because this region holds one
 * paragraph and nothing focusable, so no keyboard user can land inside a
 * clipped panel.
 *
 * BELOW 1024px
 *
 * The same nine list items, in the same DOM order, laid out as a compact
 * vertical flow: the ring layer is `hidden lg:block`, the stations stop being
 * absolutely positioned, and the forks fall back under their panels. Detail
 * stays behind the same disclosure, which is most of why the small-screen
 * flow is also far shorter than what it replaces.
 *
 * No serpentine at middle widths, though the shape was on the table. Three
 * reasons: its reading direction reverses on alternate rows, which is the one
 * thing a single column never gets wrong; two of the nine stations carry a
 * decision fork, so its rows would be raggedly unequal; and it would be a
 * third absolutely positioned geometry to keep collision-free at every width
 * in both themes, in exchange for roughly 300px that the disclosure already
 * gives back.
 *
 * ACCESSIBILITY
 *
 * Assistive technology gets an ordered list of nine items in document order,
 * each with its label and its detail, and each decision step carries a
 * labelled nested list naming its branches — the decision expressed in text,
 * with the loop branch also naming the step it returns to (read from the data,
 * so it cannot drift). Every stroke of the drawing — the ellipse, the leaders,
 * the station marks, the diamonds, the arrowheads, the fork arms — is
 * `aria-hidden` presentation. The numerals are `aria-hidden` too: the `<ol>`
 * already conveys order, matching the index treatment in PrincipleList and
 * CaseStudy.
 *
 * No ambient animation. A flow animation along the ring would have to be
 * switched off under `prefers-reduced-motion` anyway, and it would be movement
 * beside body text that says nothing the arrowheads don't already say. The one
 * transition here is the disclosure's own height, which globals.css already
 * neutralises under reduced motion.
 */

import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { LoopStep } from "@/types/portfolio";

interface ProblemSolvingLoopProps {
  readonly steps: readonly LoopStep[];
  /** `profile.philosophy`, set in the middle of the ring. Passed in rather
   *  than imported so the sentence is read from the content layer once, in
   *  Philosophy.tsx, and this file cannot restate it. */
  readonly philosophy: string;
}

/**
 * One labelled edge leaving a decision node.
 *
 * `rejoin` returns to the flow (drawn as a plain tap off the spine); `loop`
 * is the ring's dashed closing arc; `stop` ends at a terminus cap.
 */
interface LoopBranch {
  readonly id: string;
  readonly label: string;
  readonly kind: "rejoin" | "loop" | "stop";
}

interface LoopFork {
  /** Mono eyebrow introducing the branch list — a UI label, like "The loop". */
  readonly label: string;
  /** Exactly two: the trunk branch, then the one drawn leaving the trunk. */
  readonly branches: readonly [LoopBranch, LoopBranch];
}

/* Keyed by content id — see the note on connector labels above. Typed with an
   explicit `| undefined` so an id that no longer exists reads as absent rather
   than as a fork this component would then try to draw. */
const FORKS: Readonly<Record<string, LoopFork | undefined>> = {
  test: {
    label: "Outcomes",
    branches: [
      { id: "ruled-out", label: "ruled out", kind: "rejoin" },
      { id: "confirmed", label: "confirmed", kind: "rejoin" },
    ],
  },
  iterate: {
    label: "Then",
    branches: [
      { id: "feed-back", label: "feed it back in", kind: "loop" },
      { id: "stop", label: "stop when it's useful", kind: "stop" },
    ],
  },
};

const LABEL_ID = "philosophy-loop-label";
const forkLabelId = (stepId: string) => `philosophy-loop-${stepId}-branches`;
const stationIds = (stepId: string) => ({
  trigger: `philosophy-loop-${stepId}-trigger`,
  panel: `philosophy-loop-${stepId}-detail`,
});

/* -------------------------------------------------------------------------- */
/* Geometry                                                                   */
/*                                                                            */
/* The drawing box, in px, and the ellipse inside it. The constants here are   */
/* what the SVG and the station percentages are computed from; the rem values  */
/* written on the elements below are the same lengths, and the two have to be  */
/* kept in step by hand — Tailwind arbitrary values cannot read a TS const:    */
/*                                                                            */
/*   BOX_W   880  ->  lg:w-[55rem]      (xl:w-[64rem], the same box at 1.164x) */
/*   BOX_H   552  ->  lg:h-[34.5rem]    (xl:h-[40.125rem])                     */
/*   PANEL_W 184  ->  lg:w-[11.5rem]    on the station <li>                    */
/*   PANEL_H  72  ->  lg:h-[4.375rem]   on its button, plus 1px of border each */
/*                                      side, which is where the 72 comes from */
/*   fork    208  ->  lg:w-[13rem]      on the two decision forks              */
/* -------------------------------------------------------------------------- */
const BOX_W = 880;
const BOX_H = 552;
const CX = BOX_W / 2;
const CY = 281;
const RX = 230;
const RY = 178;

/** Gap between a station mark and its panel — the leader line's length. */
const LEADER = 16;
const PANEL_W = 184;
const PANEL_H = 72;
/** Panels at the top and bottom of the ring sit close together on x; this
 *  pushes each of a straddling pair away from the vertical axis. */
const NUDGE = 34;

/* ---- equal-arc-length station placement ---------------------------------- */

const SAMPLES = 2048;

/** Cumulative arc length around the ellipse, sampled from twelve o'clock. */
const ARC: readonly { readonly t: number; readonly s: number }[] = (() => {
  const start = -Math.PI / 2;
  const table = [{ t: start, s: 0 }];
  let previousX = RX * Math.cos(start);
  let previousY = RY * Math.sin(start);
  let travelled = 0;
  for (let i = 1; i <= SAMPLES; i += 1) {
    const t = start + (i / SAMPLES) * Math.PI * 2;
    const x = RX * Math.cos(t);
    const y = RY * Math.sin(t);
    travelled += Math.hypot(x - previousX, y - previousY);
    table.push({ t, s: travelled });
    previousX = x;
    previousY = y;
  }
  return table;
})();

const PERIMETER = ARC[ARC.length - 1].s;

/**
 * The parametric angle a given fraction of the way around the ellipse,
 * measured by arc length. Rounded to 4 decimal places so the value written
 * into an inline style is byte-identical wherever this runs.
 */
function angleAtFraction(fraction: number): number {
  const target = fraction * PERIMETER;
  let low = 0;
  let high = ARC.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (ARC[mid].s < target) low = mid + 1;
    else high = mid;
  }
  return Math.round(ARC[low].t * 1e4) / 1e4;
}

type Sector = "top" | "right" | "bottom" | "left";

function sectorOf(angle: number): Sector {
  const deg = ((((angle * 180) / Math.PI) % 360) + 360) % 360;
  if (deg >= 300 || deg < 60) return "right";
  if (deg < 120) return "bottom";
  if (deg < 240) return "left";
  return "top";
}

interface Station {
  readonly angle: number;
  /** Station mark, in drawing-box coordinates. */
  readonly x: number;
  readonly y: number;
  readonly sector: Sector;
  /** Panel box, in drawing-box coordinates. */
  readonly left: number;
  readonly top: number;
  /** Forks hang off the side of the panel away from the ring's centre. */
  readonly forkPlacement: "above" | "below";
}

function place(count: number): readonly Station[] {
  return Array.from({ length: count }, (_unused, index) => {
    const angle = angleAtFraction(index / count);
    const dx = RX * Math.cos(angle);
    const dy = RY * Math.sin(angle);
    const sector = sectorOf(angle);
    /* A station sitting exactly on the vertical axis gets no nudge — there is
       nothing beside it to be pushed away from. */
    const nudge = Math.abs(dx) < 8 ? 0 : Math.sign(dx) * NUDGE;

    let left: number;
    let top: number;
    if (sector === "right") {
      left = dx + LEADER;
      top = dy - PANEL_H / 2;
    } else if (sector === "left") {
      left = dx - LEADER - PANEL_W;
      top = dy - PANEL_H / 2;
    } else if (sector === "bottom") {
      left = dx - PANEL_W / 2 + nudge;
      top = dy + LEADER;
    } else {
      left = dx - PANEL_W / 2 + nudge;
      top = dy - LEADER - PANEL_H;
    }

    return {
      angle,
      x: CX + dx,
      y: CY + dy,
      sector,
      left: CX + left,
      top: CY + top,
      forkPlacement: dy < 0 ? "above" : "below",
    };
  });
}

const pct = (value: number, total: number) => `${((value / total) * 100).toFixed(3)}%`;

/* ---- the strokes --------------------------------------------------------- */

/**
 * `text-fg-subtle`, not `text-rule`, for the same reason DrawnTree gives:
 * `--rule-color` is border ink, meant to separate a panel from the paper
 * without being looked at. The ring is the drawing, not a border. The panels
 * keep `border-rule`, so the two weights say which is which.
 */
const INK = "text-fg-subtle";

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  /* The drawing box has two sizes (see the ring container), so the SVG is
     scaled at the larger one. Without this the "hairline" would come out at
     1.16px there and the ring would sit a weight above the panel borders it
     is supposed to be lighter than. */
  vectorEffect: "non-scaling-stroke",
} as const;

/** A chevron on the ellipse at `angle`, pointing the way the flow runs. */
function arrowhead(angle: number): string {
  const x = CX + RX * Math.cos(angle);
  const y = CY + RY * Math.sin(angle);
  // Tangent in the direction of increasing angle, i.e. clockwise on screen.
  const tx = -RX * Math.sin(angle);
  const ty = RY * Math.cos(angle);
  const length = Math.hypot(tx, ty);
  const ux = tx / length;
  const uy = ty / length;
  const tipX = x + ux * 3;
  const tipY = y + uy * 3;
  const backX = tipX - ux * 7;
  const backY = tipY - uy * 7;
  const r = (n: number) => n.toFixed(2);
  return (
    `M${r(backX - uy * 3.4)} ${r(backY + ux * 3.4)}` +
    `L${r(tipX)} ${r(tipY)}` +
    `L${r(backX + uy * 3.4)} ${r(backY - ux * 3.4)}`
  );
}

interface RingProps {
  readonly stations: readonly Station[];
  readonly decisions: readonly boolean[];
  readonly closesTheLoop: boolean;
}

/**
 * The ring itself: the ellipse split into the run of solid arcs and the one
 * dashed arc that closes it, a mark per station, a leader per station, and a
 * chevron in the middle of every arc. Presentation only, top to bottom.
 */
function Ring({ stations, decisions, closesTheLoop }: RingProps) {
  if (stations.length < 3) return null;

  const first = stations[0];
  const last = stations[stations.length - 1];
  const r = (n: number) => n.toFixed(2);

  /* Swept clockwise from the last station back to the first — the closing arc.
     Everything else is the long way round, hence the mirrored large-arc flag. */
  const closingSweep =
    (((first.angle - last.angle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const closingLarge = closingSweep > Math.PI ? 1 : 0;
  const openLarge = closingLarge === 1 ? 0 : 1;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${BOX_W} ${BOX_H}`}
      className={cn("pointer-events-none absolute inset-0 hidden h-full w-full lg:block", INK)}
    >
      {/* The flow: every arc but the last. */}
      <path
        {...strokeProps}
        d={`M${r(first.x)} ${r(first.y)}A${RX} ${RY} 0 ${openLarge} 1 ${r(last.x)} ${r(last.y)}`}
      />
      {/* The closing arc. Dashed only when the last step is the one that
          carries the loop branch — otherwise the ring is drawn whole, because
          nothing in the content says this edge is the one that runs back. */}
      <path
        {...strokeProps}
        strokeDasharray={closesTheLoop ? "5 5" : undefined}
        d={`M${r(last.x)} ${r(last.y)}A${RX} ${RY} 0 ${closingLarge} 1 ${r(first.x)} ${r(first.y)}`}
      />

      {/* One chevron in the middle of every arc — the ring has to say which way
          round it runs, and a curve on its own cannot. */}
      {stations.map((_station, index) => (
        <path
          key={`flow-${index}`}
          {...strokeProps}
          d={arrowhead(angleAtFraction((index + 0.5) / stations.length))}
        />
      ))}

      {stations.map((station, index) => {
        // Leader: from the station mark out to the near edge of its panel.
        const [lx, ly] =
          station.sector === "right"
            ? [station.x + LEADER, station.y]
            : station.sector === "left"
              ? [station.x - LEADER, station.y]
              : station.sector === "bottom"
                ? [station.x, station.y + LEADER]
                : [station.x, station.y - LEADER];
        return (
          <path
            key={`leader-${index}`}
            {...strokeProps}
            d={`M${r(station.x)} ${r(station.y)}L${r(lx)} ${r(ly)}`}
          />
        );
      })}

      {stations.map((station, index) =>
        decisions[index] ? (
          /* Schematic shorthand for a decision: a hairline diamond, drawn
             rather than set, so it needs no glyph coverage in the mono face
             and reads identically in both themes. Filled with the section's
             own ground so the ellipse does not run through it. */
          <path
            key={`mark-${index}`}
            {...strokeProps}
            fill="var(--ground)"
            d={
              `M${r(station.x)} ${r(station.y - 5.5)}` +
              `L${r(station.x + 5.5)} ${r(station.y)}` +
              `L${r(station.x)} ${r(station.y + 5.5)}` +
              `L${r(station.x - 5.5)} ${r(station.y)}Z`
            }
          />
        ) : (
          <circle
            key={`mark-${index}`}
            {...strokeProps}
            fill="var(--ground)"
            cx={r(station.x)}
            cy={r(station.y)}
            r={3.2}
          />
        ),
      )}
    </svg>
  );
}

/* ---- the forks ----------------------------------------------------------- */

interface ForkProps {
  readonly fork: LoopFork;
  readonly stepId: string;
  /** Label of the step the loop edge returns to. Undefined = no loop branch. */
  readonly loopTarget?: string;
  readonly placement: "above" | "below";
  /** Which of the fork's own edges lines up with the panel's — the fork is
   *  wider than the station, and it grows away from the ring, never over it. */
  readonly align: "left" | "right";
}

const HAIRLINE = "border-fg-subtle";

function Fork({ fork, stepId, loopTarget, placement, align }: ForkProps) {
  const labelId = forkLabelId(stepId);

  return (
    <div
      className={cn(
        "flex flex-col",
        // Below 1024px a fork always hangs under its panel; on the ring it
        // hangs on whichever side points away from the centre. The order
        // inside it never flips, in either placement: the band's label reads
        // before the branches it names, and the branches stay the end of the
        // block nearest the station, so the spine runs label -> branches ->
        // panel when the fork is above and panel -> label -> branches when it
        // is below. (It was `lg:flex-col-reverse` when placed above, which put
        // "THEN" underneath the two branches it introduces.)
        //
        // 13rem against the station's 11.5rem, and two things fix that number:
        // the spine has to fall *inside* the panel it hangs from or it reads as
        // a stray rule, and the whole surplus has to go on the side facing away
        // from the ring — a fork that grew inward would end up over the next
        // station's panel and swallow its pointer events.
        "static lg:absolute lg:w-[13rem]",
        align === "right" ? "lg:right-0" : "lg:left-0",
        placement === "above" ? "lg:bottom-full" : "lg:top-full",
      )}
    >
      {/* Lead-in: the stub that ties the branch band back to the station, with
          the band's own label beside it. Symmetric padding, because which side
          of this block faces the station depends on where on the ring it is. */}
      <div className="relative py-2">
        <span aria-hidden="true" className={cn("absolute inset-y-0 left-8 border-l", HAIRLINE)} />
        <p id={labelId} className="eyebrow pl-12">
          {fork.label}
        </p>
      </div>

      {/* The branch band. `inset-y-0` on the spine means the band's own
          height — however tall the two labels wrap to — is what it measures
          against, at any width and any zoom. */}
      <div className="relative">
        <span aria-hidden="true" className={cn("absolute inset-y-0 left-8 border-l", HAIRLINE)} />
        <ul role="list" aria-labelledby={labelId} className="space-y-1 pl-12">
          {fork.branches.map((branch) => (
            <li key={branch.id} className="relative">
              {/* The arm off the spine, and — on the branch that terminates —
                  the cap it ends in, which is the whole difference between
                  "this one carries on" and "this one stops". */}
              <span
                aria-hidden="true"
                className={cn("absolute -left-4 top-[0.6em] w-4 border-t", HAIRLINE)}
              />
              {branch.kind === "stop" ? (
                <span
                  aria-hidden="true"
                  className={cn("absolute -left-px top-[0.25em] h-[0.7em] border-l", HAIRLINE)}
                />
              ) : null}
              <p className="font-mono text-[length:var(--step--1)] leading-[1.6] text-[color:var(--fg)]">
                {branch.label}
              </p>
              {branch.kind === "loop" && loopTarget !== undefined ? (
                // The dashed arc says this to sighted readers; this line says
                // it to everyone else. The target is read from the data, so it
                // cannot drift from where the arc actually lands.
                <p className="font-mono text-[length:var(--step--1)] leading-[1.6] text-[color:var(--fg-subtle)]">
                  Back to {loopTarget}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---- the stations -------------------------------------------------------- */

interface StationProps {
  readonly step: LoopStep;
  readonly index: number;
  readonly station: Station | undefined;
  readonly fork: LoopFork | undefined;
  readonly loopTarget: string | undefined;
  readonly isLast: boolean;
  /** The last station's exit is dashed — it is the one edge that runs back. */
  readonly exitsToLoop: boolean;
}

function StationItem({
  step,
  index,
  station,
  fork,
  loopTarget,
  isLast,
  exitsToLoop,
}: StationProps) {
  const [open, setOpen] = useState(false);
  const { trigger, panel } = stationIds(step.id);
  const placement = station?.forkPlacement ?? "below";

  return (
    <li
      className={cn(
        "group relative",
        // Below 1024px: a plain vertical flow with a short connector in the
        // gap. On the ring: absolutely placed from its own two custom
        // properties, raised above its neighbours while it is showing detail.
        isLast ? (exitsToLoop ? "pb-6" : "pb-0") : "pb-3",
        // Below 1024px a station is a row, not a card the width of the page:
        // capped, so a two-word label is not stranded in 650px of surface.
        "max-w-[30rem] lg:max-w-none",
        "lg:absolute lg:left-[var(--station-x)] lg:top-[var(--station-y)] lg:z-10 lg:w-[11.5rem] lg:pb-0",
        "lg:hover:z-30 lg:focus-within:z-30",
        open && "lg:z-30",
      )}
      style={
        station
          ? ({
              "--station-x": pct(station.left, BOX_W),
              "--station-y": pct(station.top, BOX_H),
            } as CSSProperties)
          : undefined
      }
    >
      <div className="relative border border-rule bg-surface">
        <button
          type="button"
          id={trigger}
          aria-expanded={open}
          aria-controls={panel}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center px-3.5 py-3 text-left lg:h-[4.375rem] lg:py-0"
        >
          <span className="flex items-baseline gap-2">
            <span aria-hidden="true" className="eyebrow shrink-0">
              {String(index + 1).padStart(2, "0")}
            </span>
            {fork ? (
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 shrink-0 self-center rotate-45 border border-fg-subtle"
              />
            ) : null}
            <span className="font-sans text-[length:var(--step-0)] font-medium leading-snug text-[color:var(--fg)]">
              {step.label}
            </span>
          </span>
        </button>

        {/* No `role="region"` on this, unlike the shared Disclosure: nine of
            them would put nine landmarks inside one section, and a landmark
            buys nothing here because the paragraph is already in the
            accessibility tree as part of its list item. `aria-controls` still
            points at it, which is what the pattern actually needs. */}
        <div
          id={panel}
          data-print-expand=""
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out",
            open
              ? "grid-rows-[1fr]"
              : "grid-rows-[0fr] group-focus-within:grid-rows-[1fr] group-hover:grid-rows-[1fr]",
          )}
        >
          <div className="overflow-hidden">
            <p className="px-3.5 pb-3 text-[length:var(--step--1)] leading-[1.5] text-[color:var(--fg-muted)]">
              {step.detail}
            </p>
          </div>
        </div>
      </div>

      {fork ? (
        <Fork
          fork={fork}
          stepId={step.id}
          loopTarget={loopTarget}
          placement={placement}
          align={station?.sector === "left" ? "right" : "left"}
        />
      ) : null}

      {/* The connector between two stations in the small-screen flow. On the
          ring the arcs do this job, so it is dropped there. The last station's
          run is dashed and reaches the bottom of the column, where the return
          rail's lower arm picks it up. */}
      {isLast && !exitsToLoop ? null : (
        <>
          <span
            aria-hidden="true"
            className={cn(
              "absolute bottom-0 -left-4 border-l lg:hidden",
              isLast ? "h-6 border-dashed" : "h-3",
              HAIRLINE,
            )}
          />
          {isLast ? null : (
            <span
              aria-hidden="true"
              className={cn(
                "absolute bottom-0 -left-4 h-1.5 w-1.5 -translate-x-1/2 rotate-45 border-b border-r lg:hidden",
                HAIRLINE,
              )}
            />
          )}
        </>
      )}
    </li>
  );
}

/* -------------------------------------------------------------------------- */

export default function ProblemSolvingLoop({ steps, philosophy }: ProblemSolvingLoopProps) {
  const stations = place(steps.length);
  const lastStep = steps.length > 0 ? steps[steps.length - 1] : undefined;
  const loopTarget = steps.length > 0 ? steps[0].label : undefined;
  /* The closing arc is only the return edge if the step it leaves from is the
     last one drawn — otherwise dashing it would claim a route the content
     never authored. */
  const closesTheLoop =
    lastStep !== undefined &&
    (FORKS[lastStep.id]?.branches.some((branch) => branch.kind === "loop") ?? false);
  const decisions = steps.map((step) => FORKS[step.id] !== undefined);

  return (
    /* `lg:pb-10` is clearance, not spacing. The drawing box has a fixed height,
       and a station opened at the bottom of the ring grows downward out of it —
       nothing on an absolutely positioned ring can push anything. Measured at
       1024px, the widest the box is relative to the section's own padding, the
       longest bottom station (05) ended 9px past the section's bottom edge and
       painted over the next section. This reserves the room it needs; every
       other station clears the box by 47px or more. */
    <div className="lg:pb-10">
      <p id={LABEL_ID} className="eyebrow">
        The loop
      </p>

      {/* The drawing box. One aspect ratio, two sizes: 880x552 from 1024px, and
          1024x642 from 1280px where there is room for the ring to be the size
          it wants to be. Both are the same 1.594 box, so the SVG scales into
          either without distortion and the percentages below hold in both. */}
      <div
        className={cn(
          "relative mt-8 lg:mx-auto lg:mt-6 lg:h-[34.5rem] lg:w-[55rem] lg:max-w-full",
          "xl:h-[40.125rem] xl:w-[64rem]",
        )}
      >
        <Ring stations={stations} decisions={decisions} closesTheLoop={closesTheLoop} />

        {/* The middle of the ring. Below 1024px there is no ring, so it leads
            the flow instead — either way it is the one sentence the nine
            steps are in service of. */}
        <p
          className={cn(
            "mx-auto max-w-[22rem] text-balance text-center font-display text-[length:var(--step-2)]",
            "italic leading-[1.25] tracking-[-0.01em] text-[color:var(--fg)]",
            "lg:absolute lg:left-1/2 lg:top-1/2 lg:w-[21.5rem] lg:max-w-none",
            "lg:-translate-x-1/2 lg:-translate-y-1/2",
          )}
        >
          {philosophy}
        </p>

        {/* The station column below 1024px, and the ring's own coordinate box
            at and above it. `lg:absolute lg:inset-0` makes this the containing
            block the stations are placed against, so the percentages on each
            station are fractions of the drawing box and nothing else. */}
        <div
          className={cn(
            "relative mt-8 pl-10 lg:absolute lg:inset-0 lg:mt-0 lg:pl-0",
            closesTheLoop && "pt-8 lg:pt-0",
          )}
        >
          {/* The return edge in the small-screen flow: one dashed bracket whose
              two arms both end on the station column, so it meets the last
              station's dashed run and re-enters the first with nothing
              measured anywhere. */}
          {closesTheLoop ? (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-y-0 left-1 w-5 border-y border-l border-dashed lg:hidden",
                  HAIRLINE,
                )}
              />
              <span
                aria-hidden="true"
                className={cn("absolute left-6 top-0 h-8 border-l border-dashed lg:hidden", HAIRLINE)}
              />
              {/* Hairline arrowhead — two borders on a rotated square, so it is
                  drawn from the same alias as every other edge. */}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-6 top-6 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r lg:hidden",
                  HAIRLINE,
                )}
              />
            </>
          ) : null}

          <ol role="list" aria-labelledby={LABEL_ID}>
            {steps.map((step, index) => (
              <StationItem
                key={step.id}
                step={step}
                index={index}
                station={stations[index]}
                fork={FORKS[step.id]}
                loopTarget={
                  FORKS[step.id]?.branches.some((branch) => branch.kind === "loop")
                    ? loopTarget
                    : undefined
                }
                isLast={index === steps.length - 1}
                exitsToLoop={closesTheLoop}
              />
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
