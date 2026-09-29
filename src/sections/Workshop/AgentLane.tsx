import { Disclosure } from "@/components/ui/Disclosure";
import { workflowStages } from "@/content/ai-experiments";
import { agentLaneIntro } from "@/content/workshop";

/**
 * The agent lane: ten stages, each collapsed to its label and its question
 * until someone opens it.
 *
 * Collapsed by default for a measured reason rather than a stylistic one. Plan
 * 2 removed 1,045 lines of client island from this page and took the DOM from
 * 4,369 nodes to 3,325; rendering ten stages' `agentDoes`, `humanOwns` and
 * `watchFor` open would put a few hundred of them straight back. A collapsed
 * `Disclosure` keeps the content in the document — findable by in-page search,
 * present with no JavaScript — while paying for the layout of only what is
 * open. (Its inner wrapper flips `visibility` while closed, so the collapsed
 * subtree is out of the tab order and out of the accessibility tree rather
 * than clipped-but-reachable; see that component's own doc comment.)
 *
 * Each stage's question is part of its trigger rather than hidden inside its
 * panel. Ten identical closed rows carrying nothing but a title is the wall
 * this lane would otherwise be; a question under each title makes the closed
 * state worth reading on its own, turns the list into ten questions a reader
 * can skim and choose between, and puts the same words into the trigger's
 * accessible name, so a screen-reader user picking between the ten hears what
 * a sighted one sees.
 *
 * `watchFor` is rendered last and is not optional. Every stage's failure mode
 * is the half of that stage a reader cannot get from a vendor's marketing, and
 * it is why this lane exists under the loop rather than as its own chapter.
 */
export function AgentLane() {
  return (
    <div className="mt-12">
      <p className="eyebrow">Where the agent helps</p>
      <p className="prose-measure mt-2 text-[length:var(--step--1)] text-fg-muted">
        {agentLaneIntro}
      </p>
      <div className="mt-4 grid gap-px border border-rule bg-rule">
        {workflowStages.map((stage) => (
          <Disclosure
            key={stage.id}
            id={`workshop-stage-${stage.id}`}
            summary={
              <span className="block">
                <span className="block text-[length:var(--step-0)]">{stage.label}</span>
                <span className="mt-1 block text-[length:var(--step--1)] italic text-fg-subtle">
                  {stage.question}
                </span>
              </span>
            }
            expandLabel="Open this stage"
            collapseLabel="Close this stage"
            className="bg-surface px-4 py-1 sm:px-5"
          >
            <p className="eyebrow">The agent does</p>
            <ul className="prose-measure mt-1 grid gap-1 text-[length:var(--step--1)] text-fg-muted">
              {stage.agentDoes.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="eyebrow mt-3">A human owns</p>
            <ul className="prose-measure mt-1 grid gap-1 text-[length:var(--step--1)] text-fg-muted">
              {stage.humanOwns.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {/* The one blue rule in this lane, for the one line a reader
                cannot get anywhere else — annotation, which is what blue is
                for here, the same job it does on an evidence line above. */}
            <p className="prose-measure mt-3 border-l-2 border-accent pl-3 text-[length:var(--step--1)] text-fg-muted">
              Watch for: {stage.watchFor}
            </p>
          </Disclosure>
        ))}
      </div>
    </div>
  );
}

export default AgentLane;
