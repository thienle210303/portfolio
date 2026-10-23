import { ExternalLink } from "@/components/ui/ExternalLink";
import { projects, record } from "@/content/portfolio";
import { cn } from "@/lib/cn";
import { entryTitle, KIND_WORD, recordYearId, recordYears } from "@/lib/record";
import type { CareerEntry } from "@/types/portfolio";
import { journeyEntryAnchorId } from "@/sections/CareerTree/anchors";
import CaseStudy from "@/sections/CareerTree/CaseStudy";
import ProjectRecording from "@/sections/CareerTree/ProjectRecording";
import { TimelineAccordion, TimelineRow } from "@/sections/CareerTree/TimelineAccordion";
import { ImageDialog } from "./ImageDialog";
import { KindDot } from "./KindDot";

/**
 * The right page: every career entry, grouped by the year it started, newest
 * first, one notebook line each. The featured five are bold.
 *
 * These are the one-open rows that closed the Journey until round 21 phase 5
 * (spec §4): each `<li>` carries the entry's `journey-entry-<id>` fragment, its
 * case studies carry `work-<projectId>`, and `TimelineAccordion` opens the
 * row a fragment names (`:target` does it with JavaScript off, see
 * `globals.css`). Every entry is a row now, the nine the Journey's drawing
 * leaves out included, so their case studies and recordings open here too.
 *
 * A row opens to the entry's headline, its impact lines (or, with none, its
 * context), its technologies, kind and dates, its link, recording and award,
 * and every case study built in it, in full.
 *
 * `data-kind` on each row and `data-record-year` on each year are what the
 * filters hide by (`RecordFilters.tsx`, CSS in `globals.css`). Each year is a
 * ring's target (`#record-<year>`).
 */
export default function RecordYears() {
  return (
    <TimelineAccordion className="mt-3 border-t-[1.5px] border-fg">
      {recordYears().map(({ year, entries }) => (
        <div
          key={year}
          id={recordYearId(year)}
          data-record-year={year}
          className="record-year grid scroll-mt-20 grid-cols-1 gap-x-2 border-b border-rule py-1.5 sm:grid-cols-[4rem_minmax(0,1fr)]"
        >
          <h4 className="pt-1.5 font-mono text-[length:var(--step--1)] font-bold text-fg sm:pt-2.5 lg:pt-1.5">{year}</h4>
          {entries.length === 0 ? (
            <p className="py-2 text-[length:var(--step--1)] italic text-fg-muted lg:py-1">{record.byYear.empty}</p>
          ) : (
            <ul role="list" className="min-w-0">
              {entries.map((entry) => (
                <Row key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </div>
      ))}
    </TimelineAccordion>
  );
}

function Row({ entry }: { readonly entry: CareerEntry }) {
  const title = entryTitle(entry);
  const caseStudies = projects.filter((p) => p.careerEntryId === entry.id);
  const lines = entry.impact.length > 0 ? entry.impact : [entry.context];
  return (
    <li
      id={journeyEntryAnchorId(entry.id)}
      data-tree-branch={entry.id}
      data-kind={entry.type}
      className="scroll-mt-20"
    >
      <TimelineRow
        rowId={entry.id}
        id={`record-row-${entry.id}`}
        dense
        expandLabel={`Show what ${title}, ${entry.organization} involved`}
        collapseLabel={`Hide what ${title}, ${entry.organization} involved`}
        summary={
          <span className="flex items-baseline gap-2.5 text-[length:var(--step--1)] leading-snug">
            <KindDot kind={entry.type} className="relative -top-px shrink-0" />
            <span className="min-w-0">
              <span className="sr-only">{KIND_WORD[entry.type]}: </span>
              <span className={cn(entry.featured && "font-semibold")}>{title}</span>
              <span className="text-fg-muted">, {entry.organization}</span>
            </span>
          </span>
        }
      >
        <div className="mb-4 space-y-3 border-l border-rule pb-1 pl-4 ml-1">
          {entry.headline ? (
            <p data-tree-headline="" className="font-serif text-[length:var(--step-0)] italic text-fg">{entry.headline}</p>
          ) : null}
          <ul role="list" className="space-y-1">
            {lines.map((line) => (
              <li key={line} className="text-[length:var(--step--1)] leading-relaxed text-fg-muted">
                {line}
              </li>
            ))}
          </ul>
          {entry.technologies.length > 0 ? (
            <ul role="list" aria-label={`Technologies, ${title}`} className="token-run">
              {entry.technologies.map((t) => (
                <li key={t}>
                  <span className="wrap-anywhere">{t}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="eyebrow">
            {KIND_WORD[entry.type]} · {entry.dateRange}
          </p>
          {entry.link ? (
            <ExternalLink
              href={entry.link.href}
              className="inline-flex min-h-11 items-center font-mono text-[length:var(--step--1)] text-accent underline underline-offset-4 hover:no-underline wrap-anywhere"
            >
              {entry.link.label}
            </ExternalLink>
          ) : null}
          {entry.award ? (
            <ImageDialog
              id={`award-${entry.id}`}
              title={title}
              meta={`${entry.organization} · ${entry.dateRange}`}
              image={entry.award}
              className="inline-flex min-h-11 items-center gap-2 border border-rule px-4 text-[length:var(--step--1)] text-fg hover:border-[color:var(--accent)] hover:text-accent"
            >
              See the award
            </ImageDialog>
          ) : null}
          {entry.recording && entry.recordingDescription ? (
            <div className="no-print">
              <ProjectRecording
                title={entry.role}
                recording={entry.recording}
                description={entry.recordingDescription}
                descriptionId={`${entry.id}-recording`}
              />
            </div>
          ) : null}
          {caseStudies.map((project) => (
            <CaseStudy key={project.id} project={project} index={projects.indexOf(project)} />
          ))}
        </div>
      </TimelineRow>
    </li>
  );
}
