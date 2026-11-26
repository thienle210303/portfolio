import type { CSSProperties, ReactNode } from "react";
import { careerEntryById, contactCopy, work } from "@/content/portfolio";
import { neighbours, shownPlace, SHOWN, workHref, type ShownProject } from "@/lib/showcase";
import { resolved, type WorkflowDiagram } from "@/types/portfolio";
import { ShowDrawing, ShowFigureView } from "./Exhibit";

/**
 * A case study's page, `/work/<id>` (round 32): the work shown as a story of
 * drawings, each one sheet with one line, every number the content file's.
 * The words are all still here, closed under "The long version": a visitor
 * opens them only by asking. No section ids live on this page (the nav's
 * click handler, its scrollspy and the cats' tour key off them), and every
 * link is a plain `<a>`.
 */
/** The home page, written as the header writes it: a plain link that loads
 *  the page and lands on the fragment, with no router state (SiteHeader.tsx). */
const HOME = "/";

export default function CaseStudy({ project }: { readonly project: ShownProject }) {
  const { showcase } = project;
  const n = SHOWN.findIndex((p) => p.id === project.id) + 1;
  const ring = neighbours(project.id);
  const entry = careerEntryById(project.careerEntryId);
  // The lead is the diagram, or with none, the first figure.
  const lead = showcase.drawing ? null : showcase.figures[0];
  const rest = showcase.drawing ? showcase.figures : showcase.figures.slice(1);
  const assumption = resolved(project.assumption);

  return (
    <div className="tone-base section-ground">
      <div className="shell work-story pt-6 pb-20">
        <a href={`${HOME}#work`} className="ink-link-quiet inline-flex min-h-11 items-center font-semibold text-fg">
          <span aria-hidden="true">←&nbsp;</span>
          {work.back}
        </a>

        <article data-ink-root="" className="work-sheet work-lead bg-surface">
          <p className="work-block">
            <span>{shownPlace(project)}</span>
            <span>{work.sheetOf.replace("{n}", String(n)).replace("{total}", String(SHOWN.length))}</span>
          </p>
          <div className="work-beat">
            <h1 className="font-display text-[length:var(--step-4)] leading-[1.05] font-bold tracking-(--tracking-display) text-fg">
              {project.title}
            </h1>
            <p className="work-big work-big-lg">
              {showcase.big}
              {showcase.small ? <small> {showcase.small}</small> : null}
            </p>
            <div className="work-draw">
              {showcase.drawing ? <ShowDrawing drawing={showcase.drawing} /> : null}
              {lead ? <ShowFigureView figure={lead} /> : null}
            </div>
            <p className="font-mono text-[length:var(--step-0)] leading-snug text-fg-muted">{showcase.caption}</p>
          </div>
        </article>

        {rest.length > 0 || showcase.numbers ? (
          <div className="work-beats">
            {rest.map((figure, i) => (
              <div key={figure.caption} data-ink-root="" className="work-sheet bg-surface" style={{ "--tilt": TILTS[i % TILTS.length] } as CSSProperties}>
                <div className="work-beat">
                  <ShowFigureView figure={figure} />
                </div>
              </div>
            ))}
            {showcase.numbers?.map((number, i) => (
              <div
                key={number.value}
                className="work-sheet bg-surface"
                style={{ "--tilt": TILTS[(rest.length + i) % TILTS.length] } as CSSProperties}
              >
                <div className="work-beat">
                  <p className="work-big">{number.value}</p>
                  <p className="font-mono text-[length:var(--step--1)] leading-snug text-fg-muted">{number.caption}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {project.workflow ? <How workflow={project.workflow} /> : null}

        <section aria-label={work.calls} className="work-calls">
          {showcase.calls.map((call, i) => (
            <p key={call} className="work-call bg-surface" style={{ "--r": CALL_TURNS[i] } as CSSProperties}>
              <span aria-hidden="true" className="record-tape top-[-0.55rem] left-1/2 w-14 -translate-x-1/2 rotate-[2deg]" />
              {call}
            </p>
          ))}
        </section>

        <details className="work-sheet work-long bg-surface">
          <summary>{work.long}</summary>
          <div className="work-long-body prose-measure">
            <Part label={work.parts.problem}>
              <p>{project.problem}</p>
              <p>{project.whyItMattered}</p>
            </Part>
            {assumption ? (
              <Part label={work.parts.assumption}>
                <p>{assumption}</p>
              </Part>
            ) : null}
            <Part label={work.parts.constraints}>
              <List items={project.constraints} />
            </Part>
            <Part label={work.parts.decisions}>
              <List items={project.decisions} />
            </Part>
            <Part label={work.parts.paths}>
              <List items={project.pathsExplored} />
            </Part>
            {project.whatFailed ? (
              <Part label={work.parts.failed}>
                <p>{project.whatFailed}</p>
              </Part>
            ) : null}
            {project.failureLesson ? (
              <Part label={work.parts.lesson}>
                <p>{project.failureLesson}</p>
              </Part>
            ) : null}
            <Part label={work.parts.built}>
              <List items={project.built} />
            </Part>
            <Part label={work.parts.proof}>
              <List items={project.proof} />
              {project.metrics ? (
                <dl className="work-ledger">
                  {project.metrics.map((m) => (
                    <div key={m.label}>
                      <dt>{m.label}</dt>
                      <dd>
                        {m.before} → <b>{m.after}</b>
                        <small>{m.source}</small>
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </Part>
            <Part label={work.parts.learned}>
              <p>{project.learned}</p>
            </Part>
            <Part label={work.parts.next}>
              <p>{project.nextQuestion}</p>
            </Part>
            <Part label={work.parts.tools}>
              <p>
                {project.technologies.join(" · ")}
                {entry ? ` — ${entry.role}, ${entry.organization}, ${entry.dateRange}.` : null}
              </p>
              {project.inProgressNote ? <p className="text-fg-muted">{project.inProgressNote}</p> : null}
            </Part>
          </div>
        </details>

        <nav aria-label="Case studies" className="work-ring">
          {ring ? (
            <a href={workHref(ring.previous.id)} className="work-ring-link">
              <span>{work.previous}</span>
              {ring.previous.title}
            </a>
          ) : null}
          <a href={`${HOME}#contact`} className="work-ring-link">
            <span>{contactCopy.heading}</span>
            {/* The hero's own words for the same link (HeroIdentity.tsx). */}
            Send me a postcard
          </a>
          {ring ? (
            <a href={workHref(ring.next.id)} className="work-ring-link">
              <span>{work.next}</span>
              {ring.next.title}
            </a>
          ) : null}
        </nav>
      </div>
    </div>
  );
}

const TILTS = ["0.3deg", "-0.4deg", "0.5deg", "-0.3deg"] as const;
const CALL_TURNS = ["-2deg", "1.5deg", "-1deg"] as const;

/** The workflow as two rows of steps, before and after (`WorkflowDiagram`). */
function How({ workflow }: { readonly workflow: WorkflowDiagram }) {
  const row = (label: string, steps: WorkflowDiagram["before"], side: "before" | "after") => (
    <div className={`work-chain work-chain-${side}`}>
      <p className="font-mono text-[length:var(--step--2)] tracking-(--tracking-caps) text-fg-muted uppercase">{label}</p>
      <ol>
        {steps.map((step) => (
          <li key={step.label}>
            <span>
              {step.label}
              {step.note ? <small>{step.note}</small> : null}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
  return (
    <section aria-label={work.how} data-ink-root="" className="work-sheet bg-surface">
      <div className="work-beat">
        <h2 className="font-mono text-[length:var(--step--2)] font-bold tracking-(--tracking-caps) text-fg-muted uppercase">{work.how}</h2>
        {row(workflow.beforeLabel, workflow.before, "before")}
        {row(workflow.afterLabel, workflow.after, "after")}
      </div>
    </section>
  );
}

function Part({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <section className="work-part">
      <h2>{label}</h2>
      {children}
    </section>
  );
}

function List({ items }: { readonly items: readonly string[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
