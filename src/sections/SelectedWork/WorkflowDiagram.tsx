/**
 * Before/after workflow diagram for a case study.
 *
 * Pure HTML + CSS: two labelled `<ol>` step lists divided by a hairline. No
 * SVG, canvas or images — the "diagram" is typographic, exactly like the
 * rest of the section. Every visual connector is a CSS border, so nothing
 * decorative ever enters the accessibility tree and the content degrades to
 * a perfectly plain, legible list with all styling removed, at any zoom.
 *
 * Styled entirely against the semantic aliases (--fg / --fg-subtle /
 * --rule-color) defined in globals.css, matching every shared primitive —
 * never the raw --color-* tokens.
 */
import { cn } from "@/lib/cn";
import type {
  WorkflowDiagram as WorkflowDiagramData,
  WorkflowDiagramStep,
} from "@/types/portfolio";

interface StepListProps {
  readonly steps: readonly WorkflowDiagramStep[];
}

function StepList({ steps }: StepListProps) {
  return (
    <ol className="mt-3 divide-y divide-[color:var(--rule-color)] border-t border-[color:var(--rule-color)]">
      {steps.map((step, index) => (
        <li key={index} className="py-3 text-[length:var(--step-0)] text-[color:var(--fg)]">
          <span className="wrap-anywhere">{step.label}</span>
          {step.note !== undefined ? (
            <p className="wrap-anywhere mt-1 font-mono text-[length:var(--step--1)] text-[color:var(--fg-subtle)]">
              {step.note}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

interface WorkflowDiagramProps {
  readonly diagram: WorkflowDiagramData;
}

export default function WorkflowDiagram({ diagram }: WorkflowDiagramProps) {
  return (
    <div
      className={cn(
        "mt-4 grid grid-cols-1 divide-y divide-[color:var(--rule-color)] border border-[color:var(--rule-color)]",
        "md:grid-cols-2 md:divide-x md:divide-y-0",
      )}
    >
      <div className="p-5 md:pr-6">
        <h5 className="font-mono text-[length:var(--step-0)] uppercase tracking-[0.08em] text-[color:var(--fg)]">
          {diagram.beforeLabel}
        </h5>
        <StepList steps={diagram.before} />
      </div>
      <div className="p-5 md:pl-6">
        <h5 className="font-mono text-[length:var(--step-0)] uppercase tracking-[0.08em] text-[color:var(--fg)]">
          {diagram.afterLabel}
        </h5>
        <StepList steps={diagram.after} />
      </div>
    </div>
  );
}
