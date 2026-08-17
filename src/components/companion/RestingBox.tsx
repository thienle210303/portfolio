"use client";

import type { Ref } from "react";
import { cn } from "@/lib/cn";
import CompanionCat, { CAT_H, CAT_W } from "./CompanionCat";

/**
 * The cats' bed: a small line-drawn box in the bottom corner where they sleep
 * once they have been sent away.
 *
 * This exists because the old dismissal was a trapdoor. "Send the cat away"
 * wrote a flag, the cat vanished, and nothing on the page ever hinted that it
 * could come back — the only route was clearing site data. A visitor who wanted
 * quiet for five minutes got permanent quiet, and one who wanted permanent
 * quiet got no way to change their mind either.
 *
 * So the friendly action now has a friendly meaning and a visible result: the
 * cats walk to this box and curl up in it, and the box is a button that wakes
 * them. Removing them outright is still available — that is the second control
 * here, and the same action in the toolkit — but it is now the explicit choice
 * rather than the only one.
 *
 * Two separate targets rather than one cycling control, because "wake the cats"
 * and "delete the cats" are not two steps of the same thing, and both are well
 * over the 24px WCAG 2.2 floor with a hairline between them.
 *
 * Not to be confused with `IdleBed` below, which looks the same on purpose and
 * means something entirely different. This box is a *preference*: the visitor
 * asked for the cats to be put away, it is written to localStorage, it survives
 * a reload, and it takes a deliberate click to undo. `IdleBed` is a *moment*:
 * the cats got bored, walked over and curled up, and the first sign of life
 * gets them back. Nothing about that is stored.
 */

interface RestingBoxProps {
  /** False only while the escort is still walking them home: the box is drawn
   *  at its final size from the first frame so nothing shifts when they land. */
  readonly occupied: boolean;
  readonly onWake: () => void;
  readonly onTurnOff: () => void;
  readonly containerRef?: Ref<HTMLDivElement>;
  readonly wakeRef?: Ref<HTMLButtonElement>;
}

/** Small enough to be furniture. Two cats at this scale still read as two
 *  animals, which is the only thing the drawing has to survive down here. */
const BED_SCALE = 0.55;

/** One definition of what the cats' furniture looks like, shared by the bed
 *  they are *sent* to and the one they take themselves to. Two beds that could
 *  drift apart would read as two different pieces of furniture. */
const BED_FRAME = "border border-rule bg-surface shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)]";

/**
 * The idle bed's geometry, in px, exported because the companion's loop walks
 * the cats to coordinates *inside* it: the box and the walk targets have to be
 * computed from the same three numbers or the cats miss their own bed.
 *
 * Sized for two full-grown cats side by side rather than for the 0.55-scale
 * pair printed on the resting box — the animals that sleep here are the real
 * ones, at full size, drawn on top of it.
 */
export const BED_INSET = 24;
export const BED_W = CAT_W * 2 + 12;
export const BED_H = CAT_H + 12;

interface IdleBedProps {
  /** True once both cats have actually curled up in it. Before that they are
   *  still walking over, and the bed is drawn a shade back so it reads as
   *  where-they-are-going rather than as a new panel. */
  readonly asleep: boolean;
  /** Handed to the companion so its loop can sample the tone underneath — this
   *  is opaque furniture on a fixed layer, so it has the same problem the cats
   *  do over a `contrast` section. */
  readonly containerRef?: Ref<HTMLDivElement>;
}

/**
 * The bed the cats put *themselves* in.
 *
 * This is the empty frame only — the mat and its front edge. The sleeping
 * animals on it are the two real cats, which is the whole point: they walk
 * here, they curl up here, and the lead one is still the quick-actions button
 * the entire time. Nothing about this is a mode, nothing about it is stored,
 * and there is deliberately no control on it: every way out of the roaming
 * state still lives in the toolkit the lead cat carries.
 *
 * `pointer-events-none` for the same reason it has no control — it is scenery
 * lying over the bottom-right corner of somebody's page, and scenery that eats
 * clicks is worse than no scenery. Waking them is owned by the companion,
 * which listens for a pointer coming near, a click, or a key.
 */
export function IdleBed({ asleep, containerRef }: IdleBedProps) {
  return (
    <div
      ref={containerRef}
      data-cat-bed=""
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute flex items-end justify-center pb-1.5",
        BED_FRAME,
        "transition-opacity duration-500",
        asleep ? "opacity-100" : "opacity-60",
      )}
      style={{ right: BED_INSET, bottom: BED_INSET, width: BED_W, height: BED_H }}
    >
      {/* The front edge of the mat — the same hairline the resting box uses,
          and the one line that makes a rectangle read as a bed. */}
      <span className="block h-px w-10 bg-rule" />
    </div>
  );
}

export function RestingBox({
  occupied,
  onWake,
  onTurnOff,
  containerRef,
  wakeRef,
}: RestingBoxProps) {
  return (
    <div
      ref={containerRef}
      className={cn("pointer-events-auto absolute bottom-6 right-6 flex items-stretch", BED_FRAME)}
    >
      <button
        ref={wakeRef}
        type="button"
        onClick={onWake}
        aria-label="Wake the cats"
        className="flex min-h-11 flex-col items-center justify-center gap-1 px-3 py-1.5 text-fg-muted transition-colors duration-200 hover:text-fg"
      >
        <span
          className={cn("flex items-end transition-opacity duration-300", occupied ? "" : "opacity-0")}
        >
          <CompanionCat variant="tabby" pose="sleep" phase={0} blinking scale={BED_SCALE} />
          <CompanionCat variant="grey" pose="sleep" phase={0} blinking scale={BED_SCALE} />
        </span>
        {/* The front edge of the mat. One hairline is the whole difference
            between a bed and a panel with cats printed on it. */}
        <span aria-hidden="true" className="block h-px w-10 bg-rule" />
        {/* Inherits the button's colour rather than setting its own, so the
            label and the cats brighten together on hover. */}
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em]">Wake</span>
      </button>

      <button
        type="button"
        onClick={onTurnOff}
        aria-label="Turn the cats off"
        className="flex min-h-11 w-11 items-center justify-center border-l border-rule font-mono text-[0.62rem] uppercase tracking-[0.14em] text-fg-subtle transition-colors duration-200 hover:text-fg"
      >
        Off
      </button>
    </div>
  );
}

export default RestingBox;
