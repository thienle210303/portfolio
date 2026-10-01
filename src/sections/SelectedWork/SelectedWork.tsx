/**
 * Selected Work — six (well, currently five; see note below) case studies,
 * each a full-width editorial row. No cards, no screenshots: the evidence is
 * typography, and everything that proves impact is visible without a click.
 *
 * All content — including organisation and dates — comes from
 * `@/content/portfolio`. `CaseStudy` resolves `careerEntryId` against
 * `careerEntryById` itself so this file never restates a fact.
 *
 * NOTE for the content owner: SPEC.md and SECTIONS.md both describe this
 * section as holding six projects; `projects` in src/content/portfolio.ts
 * currently has five entries. This renders `projects` as-is (whatever its
 * length) rather than padding it — inventing a sixth project would violate
 * the "never invent a fact" rule. Flagging the discrepancy for whoever owns
 * the content file.
 */
import { Section, type RailNote } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { projects } from "@/content/portfolio";
import { TreeCrossLink } from "@/sections/CareerTree/cross-link";
import { resolved } from "@/types/portfolio";
import { caseStudyAnchorId, caseStudyNumeral } from "./anchors";
import CaseStudy from "@/sections/CareerTree/CaseStudy";
import ProjectIndex, { type ProjectIndexItem } from "./ProjectIndex";

const HEADING_ID = "work-heading";

// Counted from the content, never typed. A project that loses its metrics, or
// a sixth that arrives, moves these numbers without anyone remembering to.
// `MetricComparison.source` is a required field, so every metric present is by
// definition a sourced one — the count is of metrics, and that is the point.
const sourcedMetrics = projects.reduce(
  (total, project) => total + (project.metrics?.length ?? 0),
  0,
);
const withFailures = projects.filter((project) => resolved(project.whatFailed) !== undefined).length;

const RAIL: readonly RailNote[] = [
  { term: "Case studies", detail: `${projects.length}` },
  { term: "Sourced figures", detail: `${sourcedMetrics}, each naming its origin` },
  { term: "Recorded failures", detail: `${withFailures} of ${projects.length} say what didn't work` },
];

// Module scope, so the array identity is stable for the lifetime of the page:
// `ProjectIndex`'s scroll-spy observer re-subscribes whenever it changes.
const INDEX_ITEMS: readonly ProjectIndexItem[] = projects.map((project, index) => ({
  id: caseStudyAnchorId(project.id),
  numeral: caseStudyNumeral(index),
  title: project.title,
}));

export default function SelectedWork() {
  return (
    <Section id="work" labelledBy={HEADING_ID} eyebrow="Selected work" tone="base" rail={RAIL}>
      <SectionHeading id={HEADING_ID}>Problems I chose to solve</SectionHeading>
      {/*
        Two columns inside the section's own content column, not three columns
        across the page: `Section` already spends 10rem on the margin rail at
        >=1024px, and the index column is paid for out of what the case-study
        rows used to spend on a numeral gutter (see CaseStudy's masthead) —
        so the studies keep roughly the measure they had.
        The index comes first in the DOM at every width. It reads and tabs as
        what it is, a table of contents, ahead of the thing it indexes; grid
        placement is what moves it to the right at >=1024px.
      */}
      <div className="mt-12 md:mt-16 lg:grid lg:grid-cols-[minmax(0,1fr)_10rem] lg:gap-x-8">
        <ProjectIndex
          items={INDEX_ITEMS}
          className="mb-8 lg:col-start-2 lg:row-start-1 lg:mb-0"
        />
        <div className="lg:col-start-1 lg:row-start-1">
          {projects.map((project, index) => (
            <CaseStudy key={project.id} project={project} index={index} />
          ))}

          {/* One pointer at the career tree, where these same case studies
              hang off the roles they were built in. The tree links back to
              this section by title from every leaf that has one. */}
          <TreeCrossLink />
        </div>
      </div>
    </Section>
  );
}
