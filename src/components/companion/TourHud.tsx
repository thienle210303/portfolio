"use client";

import type { Ref } from "react";
import { cn } from "@/lib/cn";

/**
 * The tour's accessible surface.
 *
 * Field notes are `aria-hidden` decoration; the tour is not — it is the one
 * thing the companion narrates on request, so it needs a real landmark a
 * screen reader can find and a `role="status"` a screen reader will actually
 * announce. Anchored in the same corner the toolkit panel opens from, for the
 * same reason: it is furniture, not part of the cats, and the visitor already
 * knows to look there.
 *
 * Mounted only while a tour is running — see `Companion`'s `tour` state —
 * which is what keeps an idle visit from carrying a live region nobody asked
 * for.
 */

export interface TourHudProps {
  readonly stopIndex: number;
  readonly totalStops: number;
  readonly label: string;
  /** Empty until the pair have actually arrived — see the doc comment on
   *  `role="status"` below for why that matters. */
  readonly line: string;
  readonly isLast: boolean;
  readonly onNext: () => void;
  readonly onEnd: () => void;
  readonly hudRef?: Ref<HTMLDivElement>;
}

const BUTTON_CLASS =
  "min-h-11 border border-rule bg-surface px-3 text-[length:var(--step--1)] text-fg hover:text-accent";

export function TourHud({
  stopIndex,
  totalStops,
  label,
  line,
  isLast,
  onNext,
  onEnd,
  hudRef,
}: TourHudProps) {
  return (
    <div
      ref={hudRef}
      // Not `role="dialog"` — nothing here traps focus or blocks the rest of
      // the page, and a visitor is free to keep reading while it is open. It
      // is a small labelled panel, exactly like the toolkit panel it stands
      // in for while a tour is running.
      aria-label="Guided tour"
      tabIndex={-1}
      className={cn(
        "pointer-events-auto absolute bottom-[4.75rem] right-6 flex w-[min(19rem,calc(100vw-3rem))] flex-col gap-2",
        "border border-rule bg-surface p-3 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)]",
      )}
    >
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-fg-subtle">
        {`Stop ${stopIndex + 1} of ${totalStops} — ${label}`}
      </p>

      {/* Mounted empty and filled once the pair arrive — a `role="status"`
          region a screen reader has never seen before is one it may not
          announce, so it has to be present from the first render rather than
          mounted with the first line already in it. */}
      <p
        role="status"
        className="min-h-[2.5em] text-[length:var(--step--1)] leading-snug text-fg-muted"
      >
        {line}
      </p>

      <div className="mt-1 flex items-center justify-between gap-2">
        <button type="button" onClick={onEnd} className={BUTTON_CLASS}>
          End tour
        </button>
        <button type="button" onClick={onNext} className={BUTTON_CLASS}>
          {isLast ? "Finish tour" : "Next stop"}
        </button>
      </div>
    </div>
  );
}

export default TourHud;
