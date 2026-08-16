/**
 * One project row: the always-visible "recruiter view" card, plus the full
 * Problem -> Constraint -> Decision -> Build -> Proof -> Lesson deep dive
 * inside a shared Disclosure.
 *
 * Every fact is read from the `Project` object or, for organisation and
 * dates, looked up once via `careerEntryById` — never restated as a literal
 * so the résumé, timeline and this case study cannot drift apart. Optional
 * fields that are genuinely absent on a given project render nothing: no
 * empty heading, no placeholder.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { careerEntryById } from "@/content/portfolio";
import { resolved, type Project } from "@/types/portfolio";
import Disclosure from "@/components/ui/Disclosure";
import Tag from "@/components/ui/Tag";
import ExternalLink from "@/components/ui/ExternalLink";
import WorkflowDiagram from "./WorkflowDiagram";
import MetricTable from "./MetricTable";

const PROSE_CLASS = "text-[length:var(--step-0)] leading-[1.6] text-muted";

const H4_CLASS =
  "font-mono text-[length:var(--step-1)] font-bold uppercase tracking-[0.1em] text-paper";

const MICRO_LABEL_CLASS =
  "font-mono text-[length:var(--step--1)] font-bold uppercase tracking-[0.08em] text-silver";

/* -------------------------------------------------------------------------- */
/* Small local helpers — deep-dive presentation only, not shared elsewhere    */
/* -------------------------------------------------------------------------- */

interface ProseListProps {
  readonly items: readonly string[];
  readonly ariaLabel: string;
}

/** A bullet list with a hand-drawn CSS marker (Tailwind's preflight strips
 * native list markers), with `role="list"` restoring list semantics for the
 * browser/AT combinations that drop the implicit role once markers are gone. */
function ProseList({ items, ariaLabel }: ProseListProps) {
  if (items.length === 0) return null;
  return (
    <ul role="list" aria-label={ariaLabel} className="space-y-2.5">
      {items.map((item) => (
        <li
          key={item}
          className={cn(
            "wrap-anywhere relative pl-5",
            PROSE_CLASS,
            "before:absolute before:left-0 before:top-[0.7em] before:h-[5px] before:w-[5px] before:rounded-full before:bg-silver before:content-['']"
          )}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

interface LeadInProps {
  readonly label: string;
  readonly children: ReactNode;
}

/** A single sentence introduced by a small mono label, e.g. "What people
 * assumed" or "The next question I'd explore" — prose, not a new heading. */
function LeadIn({ label, children }: LeadInProps) {
  return (
    <p className={PROSE_CLASS}>
      <span className={cn(MICRO_LABEL_CLASS, "mr-2")}>{label}</span>
      {children}
    </p>
  );
}

interface SectionBlockProps {
  readonly heading: string;
  readonly children: ReactNode;
}

/** One of the six Problem/Constraint/.../Lesson parts of the deep dive. */
function SectionBlock({ heading, children }: SectionBlockProps) {
  return (
    <div className="py-6 first:pt-0 last:pb-0">
      <h4 className={H4_CLASS}>{heading}</h4>
      <div className="mt-3 space-y-4">{children}</div>
    </div>
  );
}

interface FailureAsideProps {
  readonly whatFailed: string;
  readonly failureLesson: string;
}

/** Set-apart bordered aside — only rendered when a project actually has a
 * recorded failure. Most don't, and render nothing here. */
function FailureAside({ whatFailed, failureLesson }: FailureAsideProps) {
  return (
    <aside className="border border-hairline p-5">
      <h5 className={MICRO_LABEL_CLASS}>What failed, and what it taught me</h5>
      <p className={cn(PROSE_CLASS, "mt-3")}>{whatFailed}</p>
      <p className={cn(PROSE_CLASS, "mt-3")}>{failureLesson}</p>
    </aside>
  );
}

/** Quiet, professional stand-in for a deep dive that isn't fully written up
 * yet. Never a TODO — always the author's own words. */
function InProgressNote({ note }: { readonly note: string }) {
  return (
    <div className="mt-6 border border-hairline p-4">
      <p className={MICRO_LABEL_CLASS}>Case study in progress</p>
      <p className={cn(PROSE_CLASS, "mt-2")}>{note}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Case study                                                                  */
/* -------------------------------------------------------------------------- */

interface CaseStudyProps {
  readonly project: Project;
  readonly index: number;
}

export default function CaseStudy({ project, index }: CaseStudyProps) {
  const entry = careerEntryById(project.careerEntryId);
  const assumption = resolved(project.assumption);

  const titleId = `${project.id}-title`;
  const techLabelId = `${project.id}-tech-label`;
  const proofLabelId = `${project.id}-proof-label`;

  // Embedding the title in every variant of the trigger text guarantees the
  // Disclosure's accessible name distinguishes this project's trigger from
  // the other five, however the (not-yet-written) primitive ends up wiring
  // `summary` / `expandLabel` / `collapseLabel` together internally.
  const expandLabel = `Read the full case study — ${project.title}`;
  const collapseLabel = `Collapse case study — ${project.title}`;

  return (
    <article
      aria-labelledby={titleId}
      className="border-t border-hairline py-12 first:border-t-0 first:pt-0 md:grid md:grid-cols-12 md:gap-x-8 md:py-16"
    >
      <div className="md:col-span-2 md:col-start-1" aria-hidden="true">
        <p className="font-mono text-[length:var(--step-0)] text-silver">
          {String(index + 1).padStart(2, "0")}
        </p>
      </div>

      <div className="mt-5 md:col-span-10 md:col-start-3 md:mt-0">
        <h3
          id={titleId}
          className="text-[length:var(--step-3)] font-normal leading-[1.05] tracking-[-0.02em] text-paper"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {project.title}
        </h3>

        {entry ? (
          <p className="wrap-anywhere mt-3 font-mono text-[length:var(--step--1)] uppercase tracking-[0.08em] text-silver">
            {entry.organization} · {entry.dateRange}
          </p>
        ) : null}

        <p className="mt-4 max-w-[68ch] text-[length:var(--step-1)] leading-[1.6] text-paper">
          {project.tagline}
        </p>

        {project.technologies.length > 0 ? (
          <div className="mt-5">
            <p id={techLabelId} className={MICRO_LABEL_CLASS}>
              Technologies
            </p>
            <ul role="list" aria-labelledby={techLabelId} className="mt-2.5 flex flex-wrap gap-2">
              {project.technologies.map((tech) => (
                <li key={tech}>
                  <Tag>
                    <span className="wrap-anywhere">{tech}</span>
                  </Tag>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {project.proof.length > 0 ? (
          <div className="mt-5">
            <p id={proofLabelId} className={MICRO_LABEL_CLASS}>
              Proof
            </p>
            <ul role="list" aria-labelledby={proofLabelId} className="mt-2.5 space-y-2.5">
              {project.proof.slice(0, 3).map((item) => (
                <li
                  key={item}
                  className={cn(
                    "wrap-anywhere relative pl-5 text-[length:var(--step-0)] leading-[1.6] text-paper",
                    "before:absolute before:left-0 before:top-[0.7em] before:h-[5px] before:w-[5px] before:rounded-full before:bg-silver before:content-['']"
                  )}
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          {project.demo ? (
            <ExternalLink href={project.demo.href}>{project.demo.label}</ExternalLink>
          ) : null}
          {project.source ? (
            <ExternalLink href={project.source.href}>{project.source.label}</ExternalLink>
          ) : null}
          <a
            href="#contact"
            data-project-title={project.title}
            className="inline-flex min-h-[44px] items-center border border-hairline px-4 font-mono text-[length:var(--step--1)] uppercase tracking-[0.08em] text-paper transition-colors duration-150 hover:bg-surface"
          >
            Discuss this project
            <span className="sr-only"> — {project.title}</span>
          </a>
        </div>

        <div className="mt-6">
          <Disclosure
            id={`case-study-${project.id}`}
            summary={expandLabel}
            expandLabel={expandLabel}
            collapseLabel={collapseLabel}
            defaultOpen={false}
          >
            <div className="divide-y divide-hairline">
              <SectionBlock heading="Problem">
                <p className={PROSE_CLASS}>{project.problem}</p>
                <p className={PROSE_CLASS}>{project.whyItMattered}</p>
                {assumption ? <LeadIn label="What people assumed">{assumption}</LeadIn> : null}
              </SectionBlock>

              <SectionBlock heading="Constraint">
                <ProseList items={project.constraints} ariaLabel="Constraints" />
                <LeadIn label="My responsibility">{project.responsibility}</LeadIn>
              </SectionBlock>

              <SectionBlock heading="Decision">
                <ProseList items={project.decisions} ariaLabel="Decisions" />
                {project.pathsExplored.length > 0 ? (
                  <div>
                    <p className={MICRO_LABEL_CLASS}>Paths explored</p>
                    <div className="mt-2.5">
                      <ProseList items={project.pathsExplored} ariaLabel="Paths explored" />
                    </div>
                  </div>
                ) : null}
                {project.whatFailed && project.failureLesson ? (
                  <FailureAside whatFailed={project.whatFailed} failureLesson={project.failureLesson} />
                ) : null}
              </SectionBlock>

              <SectionBlock heading="Build">
                <ProseList items={project.built} ariaLabel="What I built" />
                {project.workflow ? <WorkflowDiagram diagram={project.workflow} /> : null}
              </SectionBlock>

              <SectionBlock heading="Proof">
                <ProseList items={project.proof} ariaLabel="Proof" />
                {project.metrics && project.metrics.length > 0 ? (
                  <MetricTable metrics={project.metrics} caption={`Metrics — ${project.title}`} />
                ) : null}
              </SectionBlock>

              <SectionBlock heading="Lesson">
                <p className={PROSE_CLASS}>{project.learned}</p>
                <LeadIn label="The next question I'd explore">{project.nextQuestion}</LeadIn>
              </SectionBlock>
            </div>

            {project.inProgressNote ? <InProgressNote note={project.inProgressNote} /> : null}
          </Disclosure>
        </div>
      </div>
    </article>
  );
}
