import type { CareerEntry, Project, ResumeDepth } from "@/types/portfolio";
import { resolved } from "@/types/portfolio";
import { careerEntryById } from "@/content/portfolio";
import { Disclosure } from "@/components/ui/Disclosure";
import { Tag } from "@/components/ui/Tag";
import { ExternalLink } from "@/components/ui/ExternalLink";

interface ResumeEntriesProps {
  readonly depth: ResumeDepth;
  readonly workEntries: readonly CareerEntry[];
  readonly milestoneEntries: readonly CareerEntry[];
  readonly projects: readonly Project[];
}

const TYPE_LABEL: Record<CareerEntry["type"], string> = {
  work: "Work",
  learning: "Learning",
  milestone: "Milestone",
};

function EmptyNote({ text }: { readonly text: string }) {
  return <p className="text-[length:var(--step-0)] text-[color:var(--fg-muted)]">{text}</p>;
}

function TagList({ items }: { readonly items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <ul role="list" className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item}>
          <Tag className="wrap-anywhere">{item}</Tag>
        </li>
      ))}
    </ul>
  );
}

function EntryList({ title, items }: { readonly title: string; readonly items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="font-mono text-[length:var(--step--2)] uppercase tracking-[0.08em] text-[color:var(--fg-subtle)]">
        {title}
      </p>
      <ul role="list" className="mt-1 list-disc space-y-1 pl-5 text-[length:var(--step-0)] leading-relaxed text-[color:var(--fg-muted)]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/** Shared by Experience and Learning & Milestones — same `CareerEntry` shape,
 * filtered differently upstream by the client island. */
function CareerCard({ entry, depth }: { readonly entry: CareerEntry; readonly depth: ResumeDepth }) {
  const location = resolved(entry.locationOrMode);
  const learned = resolved(entry.learned);
  const topImpact = entry.impact[0];
  return (
    <div className="print-avoid-break border-t border-[color:var(--rule-color)] py-6 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="font-display text-[length:var(--step-1)] text-[color:var(--fg)]">{entry.role}</h4>
        <p className="font-mono text-[length:var(--step--1)] uppercase tracking-[0.05em] text-[color:var(--fg-subtle)]">
          {entry.dateRange} · {TYPE_LABEL[entry.type]}
        </p>
      </div>
      <p className="mt-1 text-[length:var(--step-0)] text-[color:var(--fg-muted)]">
        {entry.organization}
        {location ? ` · ${location}` : ""}
      </p>
      {depth === "quick-scan" ? (
        topImpact ? <p className="mt-3 text-[length:var(--step-0)] leading-relaxed text-[color:var(--fg)]">{topImpact}</p> : null
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-[length:var(--step-0)] leading-relaxed text-[color:var(--fg-muted)]">{entry.context}</p>
          <EntryList title="Responsibilities" items={entry.responsibilities} />
          <EntryList title="Built" items={entry.built} />
          <EntryList title="Impact" items={entry.impact} />
          {learned ? <p className="text-[length:var(--step--1)] italic leading-relaxed text-[color:var(--fg-muted)]">{learned}</p> : null}
          <TagList items={entry.technologies} />
          {entry.link ? (
            <ExternalLink href={entry.link.href} className="wrap-anywhere underline underline-offset-4">
              {entry.link.label}
            </ExternalLink>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, depth }: { readonly project: Project; readonly depth: ResumeDepth }) {
  const linkedEntry = careerEntryById(project.careerEntryId);
  return (
    <div className="print-avoid-break border-t border-[color:var(--rule-color)] py-6 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="font-display text-[length:var(--step-1)] text-[color:var(--fg)]">{project.title}</h4>
        {linkedEntry ? (
          <p className="font-mono text-[length:var(--step--1)] uppercase tracking-[0.05em] text-[color:var(--fg-subtle)]">{linkedEntry.dateRange}</p>
        ) : null}
      </div>
      {linkedEntry ? <p className="mt-1 text-[length:var(--step-0)] text-[color:var(--fg-muted)]">{linkedEntry.organization}</p> : null}
      <p className="mt-3 text-[length:var(--step-0)] leading-relaxed text-[color:var(--fg)]">{project.tagline}</p>
      {depth === "deep-dive" ? (
        <div className="mt-3 space-y-3">
          <EntryList title="Proof" items={project.proof} />
          <TagList items={project.technologies} />
          {project.demo ? (
            <ExternalLink href={project.demo.href} className="wrap-anywhere underline underline-offset-4">
              {project.demo.label}
            </ExternalLink>
          ) : null}
          {project.source ? (
            <ExternalLink href={project.source.href} className="wrap-anywhere underline underline-offset-4">
              {project.source.label}
            </ExternalLink>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Experience, Projects and Learning & Milestones — the résumé groups driven
 * by `CareerEntry`/`Project` content. Education/Certifications/Achievements
 * render in the sibling `ResumeCredentials` (split to stay under the file
 * line budget; see the build report). */
export default function ResumeEntries({ depth, workEntries, milestoneEntries, projects }: ResumeEntriesProps) {
  return (
    <div className="space-y-10">
      <Disclosure id="resume-group-experience" summary={`Experience (${workEntries.length})`} defaultOpen>
        {workEntries.length === 0 ? (
          <EmptyNote text="No experience entries match this lens. Choose a different lens above." />
        ) : (
          <ol role="list">
            {workEntries.map((entry) => (
              <li key={entry.id}>
                <CareerCard entry={entry} depth={depth} />
              </li>
            ))}
          </ol>
        )}
      </Disclosure>
      <Disclosure id="resume-group-projects" summary={`Projects (${projects.length})`} defaultOpen>
        <ol role="list">
          {projects.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} depth={depth} />
            </li>
          ))}
        </ol>
      </Disclosure>
      <Disclosure id="resume-group-milestones" summary={`Learning & Milestones (${milestoneEntries.length})`} defaultOpen>
        {milestoneEntries.length === 0 ? (
          <EmptyNote text="No learning or milestone entries match this lens. Choose a different lens above." />
        ) : (
          <ol role="list">
            {milestoneEntries.map((entry) => (
              <li key={entry.id}>
                <CareerCard entry={entry} depth={depth} />
              </li>
            ))}
          </ol>
        )}
      </Disclosure>
    </div>
  );
}
