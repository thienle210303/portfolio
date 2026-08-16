/**
 * Career Journey — a single editorial timeline covering work, learning and
 * milestone entries, filterable by type. All fourteen entries and every
 * fact about them (dates, roles, organisations, technologies, links) come
 * from `careerEntries` in `@/content/portfolio`; nothing here is hardcoded.
 *
 * This file is the Server Component boundary: it reads the content and
 * hands the data to `Timeline`, the small `"use client"` island that owns
 * filter state, sorting and the result-count live region.
 */
import { Section, type RailNote } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { careerEntries } from "@/content/portfolio";
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
    </Section>
  );
}
