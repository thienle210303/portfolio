import type { CSSProperties } from "react";
import { Drawing } from "@/components/scenery/Drawing";
import { record } from "@/content/portfolio";
import RecordPressed from "./RecordPressed";

export const HEADING_ID = "record-heading";

/**
 * Page 1, the left page: "Pressed, waiting to dry." The lead, the tree slice
 * whose rings go to their chapter, and the five featured entries taped around
 * it, each going to its page (`RecordPressed`), and the desk's cà phê sữa đá
 * by day, chè at night. The section's `<h2>` is here, with its visible name,
 * the Diary, above the title.
 *
 * Ruled paper, 32px a line (the board's). A server component.
 */
export default function SummaryPage() {
  return (
    <article
      id="diary-summary"
      aria-labelledby={HEADING_ID}
      className="diary-page diary-ruled @container relative flex min-h-full flex-col bg-surface px-5 pt-8 pb-16 sm:px-10 sm:pt-10"
    >
      <div aria-hidden="true" className="no-print pointer-events-none absolute top-1 right-2 w-[5.5rem] sm:right-6 sm:w-[8.5rem]">
        <Drawing name="pressed-lotus" className="aspect-[136/170] w-full" />
        <span className="record-tape absolute top-[16%] left-[48%] w-[44%] rotate-[-14deg]" />
      </div>
      <h2
        id={HEADING_ID}
        className="pr-20 font-display text-[length:var(--step-4)] font-semibold leading-[1.05] tracking-(--tracking-display-lg) text-fg sm:pr-32"
      >
        <span className="eyebrow mb-2 block">{record.name}</span>
        {record.pressed.heading}
      </h2>
      <p className="mt-2 pr-16 font-serif text-[length:var(--step-1)] italic leading-snug text-fg-muted sm:pr-32">
        {record.pressed.lead}
      </p>
      <div className="flex-1">
        <RecordPressed />
      </div>
      <div aria-hidden="true" className="no-print mt-auto flex items-end gap-2 pt-8">
        <span
          className="scene-art block h-[3.4rem] w-[1.9rem]"
          style={{ "--art": "var(--art-record-vignette)" } as CSSProperties}
        />
        <span className="pb-1 font-serif text-[length:var(--step--1)] italic text-fg-muted">
          <span className="day-only">{record.vignette.morning}</span>
          <span className="night-only">{record.vignette.evening}</span>
        </span>
      </div>
    </article>
  );
}
