/**
 * The whole record (round 21 phase 5, board NatRecordFinal): a notebook
 * spread between the Journey and Contact.
 *
 * - The left page, "Pressed, waiting to dry.": a pressed lotus taped beside
 *   the title, the tree slice whose rings link to their years, the five
 *   featured entries taped around it (`RecordPressed`), and the desk's cà phê
 *   sữa đá by day, chè at night.
 * - The right page, "Everything I've done, by year.": every entry by start
 *   year with filters (`RecordFilters` around `RecordYears`, which owns the
 *   `journey-entry-<id>` and `work-<projectId>` fragments), then the
 *   certificates as stamps (`Stamps`).
 *
 * From 1280 the two pages lie side by side and the notebook is wider than the
 * content column (up to 1300px, the board's); below, they stack. Both pages
 * are paper (`bg-surface`), so the night paper scope gives them dark ink.
 * A server component; the filters are the only client island it adds.
 */
import type { CSSProperties } from "react";
import { Drawing } from "@/components/scenery/Drawing";
import { Section } from "@/components/ui/Section";
import { record } from "@/content/portfolio";
import { kindCounts } from "@/lib/record";
import { RECORD_LEGACY_SECTION_IDS } from "@/sections/CareerTree/anchors";
import RecordPressed from "./RecordPressed";
import { RecordFilters, type FilterOption } from "./RecordFilters";
import RecordYears from "./RecordYears";
import Stamps from "./Stamps";

const HEADING_ID = "record-heading";
const COUNTS = kindCounts();
const FILTERS: readonly FilterOption[] = [
  { id: "all", label: "All", count: COUNTS.all },
  { id: "work", label: "Work", count: COUNTS.work },
  { id: "learning", label: "Study", count: COUNTS.learning },
  { id: "milestone", label: "Milestones", count: COUNTS.milestone },
];

export default function Record() {
  return (
    <Section id="record" labelledBy={HEADING_ID} tone="base" className="relative overflow-x-clip">
      {/* Retired ids that land here (see `RECORD_LEGACY_SECTION_IDS`): real,
          zero-size elements, so the landing works with JavaScript off. */}
      {RECORD_LEGACY_SECTION_IDS.map((id) => (
        <span key={id} id={id} aria-hidden="true" className="sr-only scroll-mt-20" />
      ))}

      <div data-notebook="" className="record-notebook grid paper-lift xl:grid-cols-2">
        <div className="record-page record-page-left relative flex flex-col bg-surface px-5 pt-8 pb-6 sm:px-10 sm:pt-10">
          <div aria-hidden="true" className="no-print pointer-events-none absolute top-1 right-2 w-[5.5rem] sm:right-6 sm:w-[8.5rem]">
            <Drawing name="pressed-lotus" className="aspect-[136/170] w-full" />
            <span className="record-tape absolute top-[16%] left-[48%] w-[44%] rotate-[-14deg]" />
          </div>
          <h2
            id={HEADING_ID}
            className="pr-20 font-display text-[length:var(--step-4)] font-semibold leading-[1.05] tracking-(--tracking-display-lg) text-fg sm:pr-32"
          >
            {record.pressed.heading}
          </h2>
          <p className="mt-2 pr-16 font-serif text-[length:var(--step-1)] italic leading-snug text-fg-muted sm:pr-32">
            {record.pressed.lead}
          </p>
          <RecordPressed />
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
        </div>

        <div className="record-page record-page-right relative bg-surface px-5 pt-8 pb-8 sm:px-10 sm:pt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <h3 className="font-display text-[length:var(--step-2)] font-semibold leading-tight text-fg">
              {record.byYear.heading}
            </h3>
            <span className="font-mono text-[length:var(--step--1)] text-fg-muted">{COUNTS.all} entries</span>
          </div>
          <RecordFilters options={FILTERS} label="Show entries of one kind">
            <RecordYears />
          </RecordFilters>
          <Stamps className="mt-10" />
        </div>
      </div>
    </Section>
  );
}
