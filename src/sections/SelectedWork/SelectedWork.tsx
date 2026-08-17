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
import { resolved } from "@/types/portfolio";
import CaseStudy from "./CaseStudy";

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

export default function SelectedWork() {
  return (
    <Section id="work" labelledBy={HEADING_ID} eyebrow="Selected work" tone="base" rail={RAIL}>
      <SectionHeading id={HEADING_ID}>Problems I chose to solve</SectionHeading>
      <div className="mt-12 md:mt-16">
        {projects.map((project, index) => (
          <CaseStudy key={project.id} project={project} index={index} />
        ))}
      </div>
    </Section>
  );
}
