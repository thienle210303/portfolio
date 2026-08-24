import { Info } from "lucide-react";
import { Section, type RailNote } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatIsoDate, stripNeedsInput } from "@/lib/content";
import { aiTools } from "@/content/portfolio";
import {
  LAB_LAST_UPDATED,
  experiments,
  labIntro,
  labLiveNotice,
  labPositioning,
  learningLog,
  workflowStages,
} from "@/content/ai-experiments";
import { askLiveModeConfigured } from "@/lib/ask-live-config";
import AskThisSite from "./AskThisSite";
import { ExperimentEntry } from "./ExperimentEntry";
import { LearningLog } from "./LearningLog";

const HEADING_ID = "lab-heading";

// Sorted once at module scope, descending by `sortKey` -- never by
// `started`, which is deliberately coarse prose, not a sort key (see the
// AiExperiment doc comment in src/types/portfolio.ts).
const sortedExperiments = [...experiments].sort((a, b) =>
  a.sortKey > b.sortKey ? -1 : a.sortKey < b.sortKey ? 1 : 0,
);

// The rail states how many experiments have produced a verified result and how
// many have not, computed from `verification` itself rather than from `status`.
// That ordering is deliberate: `status` is a label someone types, `verification`
// is the evidence, and the honest number is the one the evidence supports.
const verified = experiments.filter((experiment) => experiment.verification.length > 0).length;

// Computed once, server-side, from the same three env vars
// `src/app/api/ask/route.ts` re-checks independently — see
// `src/lib/ask-live-config.ts`. Only this boolean ever crosses to the
// client island below; the key, model and URL never do.
const liveModeConfigured = askLiveModeConfigured();

const RAIL: readonly RailNote[] = [
  { term: "Experiments", detail: `${experiments.length}` },
  { term: "With results", detail: `${verified} verified · ${experiments.length - verified} still open` },
  { term: "Runs live", detail: liveModeConfigured ? "The chat box, when it has a grounded answer" : "Nothing on this page" },
  { term: "Last updated", detail: formatIsoDate(LAB_LAST_UPDATED) },
];

/**
 * AI Workflow Lab (SECTIONS.md §4). A Server Component -- the only client
 * island anywhere in this section is `AskThisSite`. Every fact here comes
 * from `@/content/ai-experiments` or `@/content/portfolio`; nothing is
 * hardcoded, and `stripNeedsInput` runs over every long-form string this
 * section touches (see ExperimentEntry.tsx for the one field that actually
 * carries an embedded `[NEEDS INPUT: ...]` marker today).
 *
 * `liveModeConfigured` follows the same shape as `page.tsx`'s
 * `emailDeliveryConfigured` for Contact -- a boolean computed once on the
 * server and handed down as a prop, with the three env vars that produce it
 * never leaving this module. It decides two things: which of `labIntro[0]`
 * / `labLiveNotice` renders in the callout below, and whether `AskThisSite`
 * calls `/api/ask` at all.
 */
export default function AIWorkflowLab() {
  const [staticNotice, ...restIntro] = labIntro;
  const notice = liveModeConfigured ? labLiveNotice : staticNotice;

  return (
    <Section
      id="lab"
      labelledBy={HEADING_ID}
      eyebrow="AI Workflow Lab"
      tone="deep"
      rail={RAIL}
    >
      <SectionHeading id={HEADING_ID} lead={stripNeedsInput(labPositioning)}>
        AI Workflow Lab
      </SectionHeading>

      {/*
        The unmissable "runs live" notice. Required to appear plainly, once,
        not as a tooltip or hidden in a disclosure -- so it sits in a
        bordered callout directly under the lead, before anything else. The
        sentence itself is either `labIntro[0]` or `labLiveNotice` verbatim
        (run through stripNeedsInput defensively like every other string in
        this section) depending on `liveModeConfigured`; only the bold label
        above it is UI chrome, exactly like "What I watch for" or "No
        results yet" elsewhere in this section -- never a fact invented
        outside the content layer, just a heading picked from a boolean the
        content layer can't hold.
      */}
      {notice ? (
        <div className="prose-measure mt-8 flex items-start gap-4 border border-[color:var(--rule-color)] px-5 py-4 sm:px-6 sm:py-5">
          <Info
            aria-hidden="true"
            focusable="false"
            size={20}
            className="mt-1 flex-none text-[color:var(--fg)]"
          />
          <div className="space-y-2">
            <p className="font-mono text-[length:var(--step--1)] font-bold uppercase tracking-[0.08em] text-[color:var(--fg)]">
              {liveModeConfigured ? "One thing here runs live" : "Nothing here runs live"}
            </p>
            <p className="text-[length:var(--step-0)] leading-relaxed text-[color:var(--fg)]">
              {stripNeedsInput(notice)}
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

      {/* Directly under the "runs live" notice on purpose: this is the one
          thing on the page that answers back, and a reader should meet it
          while that claim is still on screen -- whichever of the two claims
          it currently is. AskThisSite is the section's lead feature now that
          the workflow explorer has retired; everything below it is
          supporting material for a visitor who wants to go deeper. */}
      <div className="mt-16 sm:mt-20">
        <h3
          id="lab-ask-heading"
          className="font-display text-[length:var(--step-3)] leading-tight tracking-[-0.01em] text-[color:var(--fg)]"
        >
          Ask about it
        </h3>
        <div className="mt-8">
          <AskThisSite liveModeConfigured={liveModeConfigured} />
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
