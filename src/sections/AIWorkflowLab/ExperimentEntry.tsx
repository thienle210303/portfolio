import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatIsoDate, isEntirelyNeedsInput, stripNeedsInput } from "@/lib/content";
import { Disclosure } from "@/components/ui/Disclosure";
import { Tag } from "@/components/ui/Tag";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import type { AiExperiment, AiTool, ExperimentStatus, WorkflowStage } from "@/types/portfolio";

interface ExperimentEntryProps {
  readonly experiment: AiExperiment;
  readonly tools: readonly AiTool[];
  readonly stages: readonly WorkflowStage[];
}

/**
 * Strips an embedded `[NEEDS INPUT: ...]` marker from an optional field,
 * and treats a field that is *entirely* a marker as absent -- render
 * nothing rather than an empty heading or a stray dash.
 */
function cleanOptional(text: string | undefined): string | undefined {
  if (text === undefined || isEntirelyNeedsInput(text)) return undefined;
  const stripped = stripNeedsInput(text);
  return stripped.length > 0 ? stripped : undefined;
}

function cleanList(items: readonly string[]): readonly string[] {
  return items.map(stripNeedsInput).filter((item) => item.length > 0);
}

const STATUS_LABEL: Record<ExperimentStatus, string> = {
  Exploring: "Exploring",
  Tested: "Tested",
  Adopted: "Adopted",
  Retired: "Retired",
};

/**
 * Status is never colour-coded alone: the word is always shown, and each
 * status additionally gets its own non-colour treatment -- dashed border
 * (Exploring), solid outline (Tested), filled (Adopted), solid + strike-
 * through (Retired) -- so the distinction survives colour removal.
 */
function StatusChip({ status }: { status: ExperimentStatus }) {
  const styles: Record<ExperimentStatus, string> = {
    Exploring: "border-dashed border-[color:var(--rule-color)] text-[color:var(--fg)]",
    Tested: "border-solid border-[color:var(--rule-color)] text-[color:var(--fg)]",
    Adopted:
      "border-solid border-[color:var(--fg)] bg-[color:var(--fg)] text-[color:var(--fg-inverse)]",
    Retired: "border-solid border-[color:var(--rule-color)] text-[color:var(--fg-muted)] line-through decoration-2",
  };

  return (
    <span
      className={cn(
        "inline-flex min-h-11 items-center border px-3 py-1 font-mono text-[length:var(--step--1)] uppercase tracking-[0.08em]",
        styles[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function Field({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div>
      <dt className="eyebrow">
        {term}
      </dt>
      <dd className="prose-measure mt-2 text-[length:var(--step-0)] leading-relaxed text-[color:var(--fg)]">
        {children}
      </dd>
    </div>
  );
}

function FieldList({ term, items }: { term: string; items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <dt className="eyebrow">
        {term}
      </dt>
      <dd className="mt-2">
        <ul className="prose-measure space-y-2">
          {items.map((item, index) => (
            <li key={index} className="text-[length:var(--step-0)] leading-relaxed text-[color:var(--fg)]">
              {item}
            </li>
          ))}
        </ul>
      </dd>
    </div>
  );
}

/**
 * One experiment: title, coarse start period and a status chip stay
 * visible on the card; everything else lives behind the shared
 * `Disclosure`. `verification` and `outcome` render nothing at all when
 * absent -- never an empty heading, never a dash -- and `Exploring`
 * entries additionally get an explicit "no results yet" line so an absence
 * of evidence is never mistaken for evidence withheld.
 */
export function ExperimentEntry({ experiment, tools, stages }: ExperimentEntryProps) {
  const usedTools = experiment.toolIds
    .map((id) => tools.find((tool) => tool.id === id))
    .filter((tool): tool is AiTool => tool !== undefined);

  const usedStages = experiment.stageIds
    .map((id) => stages.find((stage) => stage.id === id))
    .filter((stage): stage is WorkflowStage => stage !== undefined);

  const title = stripNeedsInput(experiment.title);
  const question = stripNeedsInput(experiment.question);
  const hypothesis = stripNeedsInput(experiment.hypothesis);
  const whyThisTool = cleanOptional(experiment.whyThisTool);
  const contextSupplied = cleanList(experiment.contextSupplied);
  const humanDecisionPoints = cleanList(experiment.humanDecisionPoints);
  const safetyBoundaries = cleanList(experiment.safetyBoundaries);
  const verification = cleanList(experiment.verification);
  const outcome = cleanOptional(experiment.outcome);
  const effortComparison = cleanOptional(experiment.effortComparison);
  const limitation = cleanOptional(experiment.limitation);
  const humanCorrections = cleanList(experiment.humanCorrections ?? []);
  const lesson = cleanOptional(experiment.lesson);
  const nextExperiment = cleanOptional(experiment.nextExperiment);
  const sources = experiment.sources ?? [];

  return (
    <article className="border-b border-[color:var(--rule-color)] py-10 first:border-t sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h4 className="font-display text-[length:var(--step-2)] leading-snug tracking-[-0.01em] text-[color:var(--fg)]">
          {title}
        </h4>
        <StatusChip status={experiment.status} />
      </div>

      <p className="mt-2 font-mono text-[length:var(--step--1)] text-[color:var(--fg-subtle)]">
        Started {stripNeedsInput(experiment.started)}
      </p>

      <p className="prose-measure mt-6 text-[length:var(--step-1)] leading-relaxed text-[color:var(--fg)]">
        {question}
      </p>
      <p className="prose-measure mt-4 text-[length:var(--step-0)] leading-relaxed text-[color:var(--fg-muted)]">
        {hypothesis}
      </p>

      {usedTools.length > 0 ? (
        <ul className="mt-6 flex flex-wrap gap-2">
          {usedTools.map((tool) => (
            <li key={tool.id}>
              <ExternalLink
                href={tool.href}
                className="wrap-anywhere inline-flex min-h-11 items-center border border-[color:var(--rule-color)] px-3 text-[length:var(--step--1)] text-[color:var(--fg)] transition-colors duration-200 hover:border-[color:var(--fg)]"
              >
                {stripNeedsInput(tool.name)}
              </ExternalLink>
            </li>
          ))}
        </ul>
      ) : null}

      <Disclosure
        id={`lab-experiment-${experiment.id}`}
        className="mt-8"
        summary={
          <>
            Read the full experiment
            <VisuallyHidden> — {title}</VisuallyHidden>
          </>
        }
      >
        <dl className="space-y-6">
          {whyThisTool ? <Field term="Why this tool">{whyThisTool}</Field> : null}

          <FieldList term="Context I gave it" items={contextSupplied} />

          {usedStages.length > 0 ? (
            <div>
              <dt className="eyebrow">
                Workflow stages
              </dt>
              <dd className="mt-2">
                <ul className="flex flex-wrap gap-2">
                  {usedStages.map((stage) => (
                    <li key={stage.id}>
                      <Tag>{stripNeedsInput(stage.label)}</Tag>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}

          <FieldList term="Decisions that stayed mine" items={humanDecisionPoints} />
          <FieldList term="Safety boundaries" items={safetyBoundaries} />
          <FieldList term="Verification" items={verification} />

          {outcome ? <Field term="Outcome">{outcome}</Field> : null}

          {experiment.status === "Exploring" ? (
            <Field term="Results">No results yet — this is an open question.</Field>
          ) : null}

          {effortComparison ? <Field term="Effort comparison">{effortComparison}</Field> : null}
          {limitation ? <Field term="Limitation">{limitation}</Field> : null}

          <FieldList term="What I corrected" items={humanCorrections} />

          {lesson ? <Field term="Lesson">{lesson}</Field> : null}
          {nextExperiment ? <Field term="Next experiment">{nextExperiment}</Field> : null}

          {sources.length > 0 ? (
            <div>
              <dt className="eyebrow">
                Sources
              </dt>
              <dd className="mt-2">
                <ul className="space-y-2">
                  {sources.map((source) => (
                    <li key={source.href}>
                      <ExternalLink
                        href={source.href}
                        className="ink-link-quiet wrap-anywhere inline-flex min-h-11 items-center text-[length:var(--step-0)] text-[color:var(--fg)]"
                      >
                        {stripNeedsInput(source.label)}
                      </ExternalLink>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}

          <Field term="Last updated">
            <time dateTime={experiment.lastUpdated}>{formatIsoDate(experiment.lastUpdated)}</time>
          </Field>
        </dl>
      </Disclosure>
    </article>
  );
}

export default ExperimentEntry;
