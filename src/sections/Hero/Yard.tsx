/**
 * The yard below 1024 (round 25): what the clothesline is strung between, and
 * the line itself. Decoration only, out of the accessibility tree; the things
 * that hang on it are Hero.tsx's and ChapterTags.tsx's.
 *
 * The rule: a line is strung between two things that stand in the ground.
 * Nothing floats and nothing is cut off in mid-page. So both supports run
 * from above the first pass down into the paddy at the section's foot,
 * however tall the section is (`[data-yard-pole]` in globals.css reaches down
 * into the section's bottom padding, `--ground`, where the ground is drawn):
 * a bamboo pole at each edge on a phone, bamboo at the left and the pine at
 * the right on a tablet. A pole is a crown, a stem that tiles and a tuft at
 * its foot (scripts/draw-scenery.mjs, POLE), drawn with its leaves to the
 * left, so the left-hand pole is its mirror.
 *
 * Every piece is an absolutely placed child of the hero's grid, set in the
 * grid row it belongs to (`.hero-yard` in globals.css), so a pass is drawn
 * from the top of the row whose tags it carries and nobody measures anything.
 * `--k` is the bamboo's scale: 1 on a phone, 1.25 on a tablet.
 */
import type { CSSProperties } from "react";
import { Drawing } from "@/components/scenery/Drawing";
import { cn } from "@/lib/cn";
import { PHONE, TABLET, lineFloor, passPath, type Pass } from "./line";

/** The pole's pieces, in the script's units (POLE in draw-scenery.mjs). */
const CROWN = { w: 98, h: 209, cx: 84 };
const STEM = { w: 24, step: 54 };
const SPRIG = { w: 42, h: 40, x: 40, y: 12 };
const TUFT = { w: 72, h: 34, cx: 36 };
/** How far below the crown's top the line ties on: lower on the right-hand pole. */
const TIE = { left: 34, right: 62 };
/** The pine at 0.7 of its drawing: 180 wide, the trunk 96 in, the line tied on 49 down. */
const PINE = { w: 126, trunk: 67, tie: 34 };

const k = (n: number) => `calc(${n}px * var(--k))`;

/**
 * One bamboo pole and the tuft at its foot. `nodes` are the nodes a sprig
 * comes off, counted down from the crown; they differ pole to pole so the two
 * are not twins. `tie` is the CSS length from the first pass's top to where
 * the line meets this pole.
 */
function Bamboo({
  side,
  crown,
  nodes,
  tie,
  className,
}: {
  readonly side: "left" | "right";
  readonly crown: "bamboo-top" | "bamboo-top-b";
  readonly nodes: readonly number[];
  readonly tie: string;
  readonly className?: string;
}) {
  const at = side === "left" ? "0px" : "100%";
  return (
    <>
      <span
        data-yard-pole={side}
        className={cn("overflow-hidden supports-[overflow:clip]:overflow-clip", side === "left" && "-scale-x-100", className)}
        style={
          {
            top: `calc(${tie} - ${k(TIE[side])})`,
            left: `calc(${at} - ${k(CROWN.cx)})`,
            width: k(CROWN.w),
            transformOrigin: `${k(CROWN.cx)} 0`,
          } as CSSProperties
        }
      >
        <span className="absolute top-0 left-0 block w-full" style={{ height: k(CROWN.h) }}>
          <Drawing name={crown} className="size-full text-accent" />
        </span>
        {/* The stem starts 2px up under the crown and its tile 2px down, so
            the join is never a hairline at a fractional scale. */}
        <span
          className="absolute bottom-0 block"
          style={{ top: `calc(${k(CROWN.h)} - 2px)`, left: k(CROWN.cx - STEM.w / 2), width: k(STEM.w) }}
        >
          <Drawing
            name="bamboo-stem"
            className="size-full text-accent [mask-position:0_2px] [mask-repeat:repeat-y]"
          />
        </span>
        {nodes.map((node, i) => (
          <span
            key={node}
            className="absolute block"
            style={{
              top: k(CROWN.h + (node + 0.5) * STEM.step - SPRIG.y),
              left: k(CROWN.cx - 6 - SPRIG.x),
              width: k(SPRIG.w),
              height: k(SPRIG.h),
            }}
          >
            <Drawing name={i % 2 ? "bamboo-sprig-b" : "bamboo-sprig"} className="size-full text-accent" />
          </span>
        ))}
      </span>
      <Tuft at={at} className={className} />
    </>
  );
}

/** Grass round a pole's foot, in front of it: what makes it stand in the ground. */
function Tuft({ at, className }: { readonly at: string; readonly className?: string }) {
  return (
    <span
      data-yard-tuft=""
      className={className}
      style={{ left: `calc(${at} - ${k(TUFT.cx)})`, width: k(TUFT.w), height: k(TUFT.h) }}
    >
      <Drawing name="bamboo-tuft" className="size-full text-accent" />
    </span>
  );
}

function PassLine({ pass, index, className }: { readonly pass: Pass; readonly index: number; readonly className: string }) {
  const height = Math.ceil(lineFloor(pass)) + 4;
  return (
    <svg
      aria-hidden="true"
      data-yard-pass={index + 1}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      style={{ height }}
      className={cn("overflow-visible", className)}
    >
      <path d={passPath(pass)} fill="none" stroke="var(--twine)" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
      {/* The knots: a dot at each end, where the line is tied round its pole. */}
      <path
        d={`M0 ${pass.left}h0M100 ${pass.right}h0`}
        fill="none"
        stroke="var(--twine)"
        strokeWidth="7"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

const ON_PHONE = "sm:hidden";
const ON_TABLET = "max-sm:hidden";

export default function Yard() {
  const phoneTop = PHONE.passes[0];
  const tabletTop = TABLET.passes[0];
  return (
    <div
      aria-hidden="true"
      data-scenery="yard"
      className="pointer-events-none contents [--k:1] [--tie-left:var(--tie-l)] sm:[--k:1.25] sm:[--tie-left:var(--tie-l-sm)] lg:hidden"
      style={
        {
          "--tie-l": `${phoneTop.left}px`,
          "--tie-r": `${phoneTop.right}px`,
          "--tie-l-sm": `${tabletTop.left}px`,
          "--tie-r-sm": `${tabletTop.right}px`,
        } as CSSProperties
      }
    >
      {/* The left-hand bamboo, at both sizes; its tie follows the band's first pass. */}
      <Bamboo side="left" crown="bamboo-top" nodes={[2, 7, 11, 16, 22]} tie="var(--tie-left)" />
      <Bamboo side="right" crown="bamboo-top-b" nodes={[4, 9, 14, 19]} tie="var(--tie-r)" className={ON_PHONE} />
      {/* The pine, where the tablet's line ends: its bare trunk runs down to the paddy. */}
      <span
        data-yard-pole="pine"
        className={ON_TABLET}
        style={{ top: `calc(var(--tie-r-sm) - ${PINE.tie}px)`, left: `calc(100% - ${PINE.trunk}px)`, width: PINE.w }}
      >
        <Drawing name="pine" className="size-full text-accent [mask-position:top] [mask-size:100%_auto]" />
      </span>
      <Tuft at="100%" className={ON_TABLET} />

      {PHONE.passes.map((pass, i) => (
        <PassLine key={i} pass={pass} index={i} className={ON_PHONE} />
      ))}
      {TABLET.passes.map((pass, i) => (
        <PassLine key={i} pass={pass} index={i} className={ON_TABLET} />
      ))}

      {/* The nón lá hangs by the first knot, clear of the window's edge
          (`.hero-yard` in globals.css places it per band). */}
      <Drawing name="non-la" />
    </div>
  );
}
