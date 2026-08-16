import { Info } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatIsoDate, stripNeedsInput } from "@/lib/content";
import { aiTools } from "@/content/portfolio";
import {
  LAB_LAST_UPDATED,
  experiments,
  labIntro,
  labPositioning,
  learningLog,
  workflowStages,
} from "@/content/ai-experiments";
import { WorkflowExplorer } from "./WorkflowExplorer";
import { ExperimentEntry } from "./ExperimentEntry";
import { LearningLog } from "./LearningLog";

const HEADING_ID = "lab-heading";

// Sorted once at module scope, descending by `sortKey` -- never by
// `started`, which is deliberately coarse prose, not a sort key (see the
// AiExperiment doc comment in src/types/portfolio.ts).
const sortedExperiments = [...experiments].sort((a, b) =>
  a.sortKey > b.sortKey ? -1 : a.sortKey < b.sortKey ? 1 : 0,
);

/**
 * AI Workflow Lab (SECTIONS.md §4). A Server Component -- the only client
 * island anywhere in this section is `WorkflowExplorer`. Every fact here
 * comes from `@/content/ai-experiments` or `@/content/portfolio`; nothing
 * is hardcoded, and `stripNeedsInput` runs over every long-form string this
 * section touches (see ExperimentEntry.tsx for the one field that actually
 * carries an embedded `[NEEDS INPUT: ...]` marker today).
 */
export default function AIWorkflowLab() {
  const [staticNotice, ...restIntro] = labIntro;

  return (
    <Section id="lab" labelledBy={HEADING_ID} eyebrow="04 / AI WORKFLOW LAB" tone="paper">
      <SectionHeading id={HEADING_ID} lead={stripNeedsInput(labPositioning)}>
        AI Workflow Lab
      </SectionHeading>

      {/*
        The unmissable "nothing here runs live" notice. Required to appear
        plainly, once, not as a tooltip or hidden in a disclosure -- so it
        sits in a bordered callout directly under the lead, before anything
        else. The sentence itself is `labIntro[0]` verbatim (run through
        stripNeedsInput defensively like every other string in this
        section); only the bold label above it is UI chrome, exactly like
        "What I watch for" or "No results yet" elsewhere in this section --
        never a fact invented outside the content layer.
      */}
      {staticNotice ? (
        <div className="prose-measure mt-8 flex items-start gap-4 border border-[color:var(--rule-color)] px-5 py-4 sm:px-6 sm:py-5">
          <Info
            aria-hidden="true"
            focusable="false"
            size={20}
            className="mt-1 flex-none text-[color:var(--fg)]"
          />
          <div className="space-y-2">
            <p className="font-mono text-[length:var(--step--1)] font-bold uppercase tracking-[0.08em] text-[color:var(--fg)]">
              Nothing here runs live
            </p>
            <p className="text-[length:var(--step-0)] leading-relaxed text-[color:var(--fg)]">
              {stripNeedsInput(staticNotice)}
            </p>
          </div>
        </div>
      ) : null}

      {restIntro.map((paragraph, index) => (
        <p
          key={index}
          className="prose-measure mt-4 text-[length:var(--step-0)] leading-relaxed text-[color:var(--fg-muted)]"
        >
          {stripNeedsInput(paragraph)}
        </p>
      ))}

      <p className="mt-6 font-mono text-[length:var(--step--1)] text-[color:var(--fg-subtle)]">
        Last updated <time dateTime={LAB_LAST_UPDATED}>{formatIsoDate(LAB_LAST_UPDATED)}</time>
      </p>

      <div className="mt-16 sm:mt-20">
        <h3
          id="lab-explorer-heading"
          className="font-display text-[length:var(--step-3)] leading-tight tracking-[-0.01em] text-[color:var(--fg)]"
        >
          The workflow explorer
        </h3>
        <div className="mt-8">
          <WorkflowExplorer stages={workflowStages} />
        </div>
      </div>

      <div className="mt-20 sm:mt-24">
        <h3
          id="lab-experiments-heading"
          className="font-display text-[length:var(--step-3)] leading-tight tracking-[-0.01em] text-[color:var(--fg)]"
        >
          Experiments
        </h3>
        <div className="mt-8">
          {sortedExperiments.map((experiment) => (
            <ExperimentEntry
              key={experiment.id}
              experiment={experiment}
              tools={aiTools}
              stages={workflowStages}
            />
          ))}
        </div>
      </div>

      <div className="mt-20 sm:mt-24">
        <LearningLog learningLog={learningLog} />
      </div>
    </Section>
  );
}
