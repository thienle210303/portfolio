"use client";

import type { Ref } from "react";
import { cn } from "@/lib/cn";
import CompanionCat from "./CompanionCat";

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
      className={cn(
        "pointer-events-auto absolute bottom-6 right-6 flex items-stretch",
        "border border-rule bg-surface shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)]",
      )}
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
