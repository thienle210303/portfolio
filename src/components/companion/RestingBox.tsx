"use client";

import type { Ref } from "react";
import { cn } from "@/lib/cn";
import CompanionCat from "./CompanionCat";
import styles from "./companion.module.css";

/**
 * The cats' corner: a bed, a cardboard box and a sheet of paper, and two cats
 * asleep in the wrong two of the three.
 *
 * This started as one line-drawn bed, because the old dismissal was a trapdoor.
 * "Send the cat away" wrote a flag, the cat vanished, and nothing on the page
 * ever hinted that it could come back — the only route was clearing site data. A
 * visitor who wanted quiet for five minutes got permanent quiet, and one who
 * wanted permanent quiet got no way to change their mind either. So the friendly
 * action got a friendly meaning and a visible result: the cats walk to this
 * corner and curl up, and the corner is a button that wakes them.
 *
 * Round 5 added the joke that every cat owner has paid for. Cats never sleep in
 * their bed. So there are three pieces of furniture now and the bed is the one
 * that stays empty: the grey one wedges himself into a box he is visibly too fat
 * for, the tabby flops on a single sheet of paper, and the bed — bought, placed,
 * perfectly good — is left alone. Rarely, she shoves it out of her way first.
 *
 * ## What is shared, and why it has to be
 *
 * Two different states put cats in this corner and they must look identical:
 *
 *  - `CompanionMode === "resting"` is a **preference**. The visitor asked for
 *    the cats to be put away, it is written to localStorage under "companion",
 *    it survives a reload, and only the "Wake the cats" button undoes it. That
 *    flow owns `RestingBox`, which draws the sleeping animals itself.
 *  - Idle sleep is a **moment**. Nobody has done anything for a while, so the
 *    cats walk over and settle in, and the first sign of life gets them up.
 *    Nothing is stored. That flow owns `IdleFurniture`, which draws the same
 *    furniture *empty* — the animals asleep on it are the two real cats, walked
 *    here by the loop and positioned against the very same slot constants.
 *
 * Which is why the geometry below is exported. The furniture and the walk
 * targets are computed from one set of numbers, or the cats miss their own
 * box.
 *
 * ## Why the cluster is a drawing rather than a panel
 *
 * It used to be a `bg-surface` tray with a border and a shadow — furniture drawn
 * as UI. It cannot be that any more: the cats are opaque now, and they knock
 * themselves out of the page in `var(--ground)`. A ground-coloured cat asleep on
 * a surface-coloured tray is a cat-shaped hole in the tray. So the whole cluster
 * is line work on the page's own ground, exactly like the animals, and the one
 * piece that says "this is a control" is the label under it — plus the standard
 * focus ring, which needs no background to be seen.
 *
 * ## Why there is no "Off" here, and no longer anywhere else either
 *
 * There was one, deliberately, in round 1: two targets side by side, "Wake" and
 * "Off". Thien's round-3 note reversed half of that — he wanted the bed to be
 * *just the bed* — and his round-7 note finishes the job for the other half:
 * "turn the cats off is equivalent to send the cats to bed". It was. Both stop
 * the loop, both end the roaming, and the only thing the permanent one added
 * was a state with no surface left to undo it. So the mode is gone (see
 * companion-state, which still maps the value old browsers stored), and this
 * corner is the single quiet state — which puts a lot of weight on the one
 * control below being visible, reachable and obvious.
 */

/* -------------------------------------------------------------------------- */
/* The geometry, in cluster-local px                                           */
/* -------------------------------------------------------------------------- */

/** How far the cluster sits off the bottom-right corner. */
export const CLUSTER_INSET = 24;
export const CLUSTER_W = 186;
export const CLUSTER_H = 60;

/**
 * Where each animal sleeps, as the top-left of its 50×42 drawing box in
 * cluster-local coordinates.
 *
 * The box slot is deliberately a poor fit. A curled cat's ink runs from y≈17.6
 * to y≈39 inside its own drawing box, so putting the slot at y≈1 lifts the back
 * and the head a clear 7px above the carton's rim while the front panel — drawn
 * *over* the animal — cuts the belly off. That overhang is the entire joke, and
 * it only survives because these two numbers and the carton's are edited
 * together.
 */
export const BOX_SLOT = { x: 70, y: 1 } as const;
export const PAPER_SLOT = { x: 128, y: 12 } as const;

/**
 * Where a cat stands to shove the bed: off the cluster's left edge, facing in.
 *
 * Left of it rather than right, so the shove runs *away* from the cat and into
 * the corner. A kick that pushed the bed towards the animal doing the kicking
 * would read as the bed attacking her.
 */
export const KICK_SLOT = { x: -46, y: 12 } as const;

/** How far a kicked bed scoots, in cluster px. About an inch on a laptop. */
const SHOVE = 10;

/* -------------------------------------------------------------------------- */
/* The furniture itself                                                        */
/* -------------------------------------------------------------------------- */

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** The same knockout the cats and the toys carry: this is line work on a fixed
 *  layer over somebody's paragraph, and a see-through cardboard box is the
 *  same bug as a see-through cat. */
const MASK_LINE = {
  fill: "none",
  stroke: "var(--ground)",
  strokeWidth: 3,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;
const MASK_AREA = { ...MASK_LINE, fill: "var(--ground)" } as const;

/** The bed: a tapered tub with the inner rim drawn, which is what makes an
 *  empty one read as empty rather than as a block. */
const BED_TUB = `M 14 41 C 14 37.6, 18 36.4, 38 36.4 C 58 36.4, 62 37.6, 62 41
   L 60.2 55.4 C 60 57.2, 55 58, 38 58 C 21 58, 16 57.2, 15.8 55.4 Z`;
const BED_MAT = "M 17.8 42.6 C 24 44.6, 52 44.6, 58.2 42.6";

/** The carton, split across the two layers. The rim and the flaps go behind the
 *  cat; the front panel goes in front of it, which is the only reason a cat can
 *  be *in* a box in a drawing with no depth. */
const CARTON_RIM = "M 72.8 31 L 115.2 31";
const CARTON_WALL_L = "M 72.6 34 L 72.6 30.2";
const CARTON_WALL_R = "M 115.4 34 L 115.4 30.2";
/**
 * Two flaps, and they are deliberately not a matched pair.
 *
 * The left one is folded flat and out, clear of the animal; the right one stands
 * up past the top of the drawing so that it still reads *behind* a head lolling
 * over that rim. A first pass had both of them folded out at the same angle and
 * the right one disappeared completely — the cat is drawn after the carton's
 * back, and the whole point of this cat is that he is too big for it.
 */
const CARTON_FLAP_L = "M 73.4 30.6 L 59 23.4 L 63.6 18.6 L 77.6 26.6 Z";
const CARTON_FLAP_R = "M 114 30.6 L 121.2 15.8 L 126.6 18.4 L 118.8 30.8 Z";
const CARTON_FRONT = "M 72.6 34 L 115.4 34 L 114.2 57.4 L 73.8 57.4 Z";
/** A strip of tape down the front. One line is all it takes to say cardboard
 *  rather than crate — a second, creasing the panel across its middle, turned
 *  the carton into two boxes stacked. */
const CARTON_TAPE = "M 94 34 L 94 45.4";

/** A single sheet, dropped flat with one corner lifted. Nothing else in the
 *  cluster is this thin, which is what makes it read as paper. */
const PAPER_SHEET = `M 124.6 51.6 L 174.6 47.4 C 178.4 47.1, 180.8 48.6, 180.4 51
   L 179.6 55.6 L 127.6 57.8 C 124.8 57.9, 123.6 53.8, 124.6 51.6 Z`;
const PAPER_CURL = "M 174.6 47.4 C 175.8 49.4, 177.9 50.7, 180.4 51";

/**
 * Three drifting "z"s over a sleeping cat.
 *
 * The only piece of the companion that is decoration with no job at all, which
 * is why it is held to the strictest version of every rule the rest of it
 * follows: `aria-hidden`, unselectable, no pointer events, no colour of its
 * own — `text-fg-subtle` is the quietest thing the palette has, and it follows
 * theme and tone through whichever piece of furniture it is sitting on. The
 * motion itself is three keyframes in `companion.module.css`, on a long enough
 * cycle to read as breathing, and it is removed outright under reduced motion.
 *
 * Each "z" grows as it drifts, because that is the direction a snore has been
 * drawn in since the first newspaper strip and reversing it reads as a thing
 * receding rather than a thing sleeping. The three starting sizes below are
 * separate from that: they stop the stream reading as one glyph stamped three
 * times.
 */
function Snore({ className }: { readonly className?: string }) {
  return (
    <span
      data-cat-snore=""
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute select-none font-mono leading-none text-fg-subtle",
        styles.snore,
        className,
      )}
    >
      <span className="absolute left-0 top-0 text-[0.5rem]">z</span>
      <span className="absolute left-[3px] top-0 text-[0.58rem]">z</span>
      <span className="absolute left-[7px] top-0 text-[0.66rem]">z</span>
    </span>
  );
}

interface ArtProps {
  /** The bed has been shoved out of the way. Only ever true on the idle path,
   *  and never under reduced motion — see `Companion`. */
  readonly shoved: boolean;
}

/**
 * Everything that sits *behind* the animals: the bed, the paper, and the back
 * half of the carton.
 *
 * The bed carries the shove on its own group rather than on the element, so the
 * carton and the paper stay exactly where they were — a cluster that slid as one
 * would read as the whole corner twitching rather than as one piece of furniture
 * being booted.
 */
function FurnitureBack({ shoved }: ArtProps) {
  return (
    <svg
      viewBox={`0 0 ${CLUSTER_W} ${CLUSTER_H}`}
      width={CLUSTER_W}
      height={CLUSTER_H}
      aria-hidden="true"
      focusable="false"
      className="block"
    >
      <g
        className="transition-transform duration-300 ease-out"
        style={{
          transformBox: "view-box",
          transformOrigin: "38px 47px",
          transform: shoved ? `translateX(${SHOVE}px) rotate(-3deg)` : undefined,
        }}
      >
        <path {...MASK_AREA} d={BED_TUB} />
        <path {...MASK_LINE} d={BED_MAT} />
        <path {...STROKE} d={BED_TUB} />
        <path {...STROKE} d={BED_MAT} />
      </g>

      <path {...MASK_AREA} d={CARTON_FLAP_L} />
      <path {...MASK_AREA} d={CARTON_FLAP_R} />
      <path {...MASK_LINE} d={CARTON_RIM} />
      <path {...MASK_LINE} d={CARTON_WALL_L} />
      <path {...MASK_LINE} d={CARTON_WALL_R} />
      <path {...STROKE} d={CARTON_FLAP_L} />
      <path {...STROKE} d={CARTON_FLAP_R} />
      <path {...STROKE} d={CARTON_RIM} />
      <path {...STROKE} d={CARTON_WALL_L} />
      <path {...STROKE} d={CARTON_WALL_R} />

      <path {...MASK_AREA} d={PAPER_SHEET} />
      <path {...STROKE} d={PAPER_SHEET} />
      <path {...STROKE} d={PAPER_CURL} />
    </svg>
  );
}

/** The front panel of the carton, and nothing else — the one piece of the
 *  cluster that has to be painted after the animals. */
function FurnitureFront() {
  return (
    <svg
      viewBox={`0 0 ${CLUSTER_W} ${CLUSTER_H}`}
      width={CLUSTER_W}
      height={CLUSTER_H}
      aria-hidden="true"
      focusable="false"
      className="block"
    >
      <path {...MASK_AREA} d={CARTON_FRONT} />
      <path {...STROKE} d={CARTON_FRONT} />
      <path {...STROKE} d={CARTON_TAPE} />
    </svg>
  );
}

/** The two sleepers, drawn into the cluster at the same slots the roaming cats
 *  are walked to. Only the resting box uses these; on the idle path the real
 *  animals are the ones lying here. */
function Sleepers() {
  return (
    <>
      <span className="absolute" style={{ left: BOX_SLOT.x, top: BOX_SLOT.y }}>
        <CompanionCat variant="grey" pose="sleep" phase={0} blinking />
      </span>
      <span className="absolute" style={{ left: PAPER_SLOT.x, top: PAPER_SLOT.y }}>
        <CompanionCat variant="tabby" pose="sleep" phase={0} blinking />
      </span>
    </>
  );
}

interface FurnitureProps extends ArtProps {
  /** Draw the sleeping animals into the cluster. False on the idle path, where
   *  the real cats do that themselves. */
  readonly cats: boolean;
  /** Snores only once somebody has actually arrived. */
  readonly asleep: boolean;
}

/**
 * The whole cluster in one element: back, sleepers, front, snores.
 *
 * Only the resting box can use this, and that is the point of the split. On the
 * idle path the animals asleep here are the two *real* cats, positioned by the
 * loop as siblings of the furniture — so that path needs the back and the front
 * as separate elements with the cats in between, which is what `IdleFurniture`
 * hands it.
 */
function Furniture({ cats, asleep, shoved }: FurnitureProps) {
  return (
    <span
      className="relative block"
      style={{ width: CLUSTER_W, height: CLUSTER_H }}
      aria-hidden="true"
    >
      <FurnitureBack shoved={shoved} />
      {cats ? <Sleepers /> : null}
      <span className="absolute left-0 top-0">
        <FurnitureFront />
      </span>
      {asleep ? <Snores /> : null}
    </span>
  );
}

/** One stream over the carton and one over the paper, offset from each other so
 *  two sleeping animals do not breathe in unison. */
function Snores() {
  return (
    <>
      <Snore className="left-[104px] top-0" />
      <Snore className="left-[164px] top-[14px]" />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* The two ways cats end up here                                               */
/* -------------------------------------------------------------------------- */

interface IdleFurnitureProps extends ArtProps {
  /** True once both cats have actually settled. Before that they are still
   *  walking over, and the furniture is drawn a shade back so it reads as
   *  where-they-are-going rather than as a new panel. */
  readonly asleep: boolean;
  /** Handed to the companion so its loop can sample the tone underneath — this
   *  is opaque line work on a fixed layer, so it has the same problem the cats
   *  do over a `contrast` section. */
  readonly containerRef?: Ref<HTMLDivElement>;
  /** "back" is drawn before the cats, "front" after them. */
  readonly layer: "back" | "front";
}

/**
 * The furniture the cats put *themselves* in front of.
 *
 * Empty by design: the sleeping animals on it are the two real cats, which is
 * the whole point. They walk here, they settle here, and the grey one is still
 * the quick-actions button the entire time. Nothing about this is a mode,
 * nothing about it is stored, and there is deliberately no control on it: every
 * way out of the roaming state still lives in the toolkit the lead cat carries.
 *
 * `pointer-events-none` for the same reason it has no control — it is scenery
 * lying over the bottom-right corner of somebody's page, and scenery that eats
 * clicks is worse than no scenery. Waking them is owned by the companion, which
 * listens for a pointer coming near, a click, or a key.
 */
export function IdleFurniture({ asleep, shoved, containerRef, layer }: IdleFurnitureProps) {
  return (
    <div
      ref={containerRef}
      // Only the back layer answers to `[data-cat-bed]`: it is the one the specs
      // measure the cluster by, and two elements carrying the same hook would
      // make every `toBeVisible` in the suite ambiguous.
      {...(layer === "back" ? { "data-cat-bed": "" } : { "data-cat-bed-front": "" })}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute transition-opacity duration-500",
        asleep ? "opacity-100" : "opacity-60",
      )}
      style={{
        right: CLUSTER_INSET,
        bottom: CLUSTER_INSET,
        width: CLUSTER_W,
        height: CLUSTER_H,
      }}
    >
      {layer === "back" ? <FurnitureBack shoved={shoved} /> : <FurnitureFront />}
      {/* Only once they have arrived: furniture snoring while the cats are still
          walking towards it is furniture with somebody else in it. */}
      {layer === "front" && asleep ? <Snores /> : null}
    </div>
  );
}

interface RestingBoxProps {
  /** False only while the escort is still walking them home: the cluster is
   *  drawn at its final size from the first frame so nothing shifts when they
   *  land. */
  readonly occupied: boolean;
  readonly onWake: () => void;
  readonly containerRef?: Ref<HTMLDivElement>;
  readonly wakeRef?: Ref<HTMLButtonElement>;
}

export function RestingBox({ occupied, onWake, containerRef, wakeRef }: RestingBoxProps) {
  return (
    <div
      ref={containerRef}
      className="pointer-events-auto absolute"
      style={{ right: CLUSTER_INSET, bottom: CLUSTER_INSET, width: CLUSTER_W }}
    >
      <button
        ref={wakeRef}
        type="button"
        onClick={onWake}
        // One control on the furniture, and one name for it. Specs and screen
        // readers both depend on this string; the cluster grew a carton and a
        // sheet of paper around it, and none of that changes what clicking does.
        aria-label="Wake the cats"
        className="flex w-full flex-col items-end text-fg-muted transition-colors duration-200 hover:text-fg"
      >
        {/* Faded until they arrive, so the escort has somewhere to walk to
            rather than something appearing under them. */}
        <span
          className={cn("block transition-opacity duration-300", occupied ? "" : "opacity-40")}
        >
          <Furniture cats={occupied} asleep={occupied} shoved={false} />
        </span>
        {/* Inherits the button's colour rather than setting its own, so the
            label and the drawing brighten together on hover. This is the only
            thing on the cluster that says it is a control — the tray that used
            to say it had to go, because an opaque cat asleep on an opaque tray
            is a cat-shaped hole in the tray. */}
        <span className="px-1 pt-1 font-mono text-[0.62rem] uppercase tracking-[0.14em]">Wake</span>
      </button>
    </div>
  );
}

export default RestingBox;
