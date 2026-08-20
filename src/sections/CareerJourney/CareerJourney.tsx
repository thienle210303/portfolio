/**
 * Career Journey — a single editorial timeline covering work, learning and
 * milestone entries, filterable by type. All fourteen entries and every
 * fact about them (dates, roles, organisations, technologies, links) come
 * from `careerEntries` in `@/content/portfolio`; nothing here is hardcoded.
 *
 * This file is the Server Component boundary: it reads the content and
 * hands the data to `Timeline`, the small `"use client"` island that owns
 * filter state, sorting and the result-count live region.
 *
 * The career tree is no longer part of this section — it is its own chapter
 * (src/sections/CareerTree) rendered after Skills, and this section ends with
 * one quiet pointer at it.
 */
import { Section, type RailNote } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { careerEntries } from "@/content/portfolio";
import { TreeCrossLink } from "@/sections/CareerTree/cross-link";
import Timeline from "./Timeline";

const HEADING_ID = "journey-heading";

const countOf = (type: (typeof careerEntries)[number]["type"]) =>
  careerEntries.filter((entry) => entry.type === type).length;

// `sortKey` is `YYYY-MM` and sorts reverse-lexicographically, so the earliest
// entry is the last one after a descending sort. Reading the year off it keeps
// the rail honest when an older entry is backfilled.
const earliestYear = [...careerEntries].sort((a, b) => (a.sortKey > b.sortKey ? 1 : -1))[0]?.sortKey.slice(0, 4);

const RAIL: readonly RailNote[] = [
  { term: "Entries", detail: `${careerEntries.length}` },
  {
    term: "Split",
    detail: `${countOf("work")} work · ${countOf("learning")} learning · ${countOf("milestone")} milestones`,
  },
  ...(earliestYear ? [{ term: "From", detail: earliestYear }] : []),
];

export default function CareerJourney() {
  return (
    <Section id="journey" labelledBy={HEADING_ID} eyebrow="Journey" tone="base" rail={RAIL}>
      <SectionHeading id={HEADING_ID}>The path so far</SectionHeading>
      <div className="mt-12 md:mt-16">
        <Timeline entries={careerEntries} />
      </div>

      {/* The career tree used to render here, below the timeline. It is the
          synthesis of Work, Journey and Skills rather than an appendix to any
          one of them, and it is the largest figure on the page, so it is now
          its own chapter after Skills — see src/sections/CareerTree. This
          section keeps the chronology and answers "when"; the link answers
          "and what does it add up to". */}
      <TreeCrossLink />
    </Section>
  );
}
