"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { stripNeedsInput } from "@/lib/content";
import { Disclosure } from "@/components/ui/Disclosure";
import type { WorkflowStage } from "@/types/portfolio";

interface WorkflowExplorerProps {
  readonly stages: readonly WorkflowStage[];
}

const ID_PREFIX = "lab-stage";

function tabId(stageId: string): string {
  return `${ID_PREFIX}-tab-${stageId}`;
}

function panelId(stageId: string): string {
  return `${ID_PREFIX}-panel-${stageId}`;
}

function StageIndex({ index }: { index: number }) {
  return (
    <span
      aria-hidden="true"
      className="font-mono text-[length:var(--step--1)] text-[color:var(--fg-subtle)]"
    >
      {String(index + 1).padStart(2, "0")}
    </span>
  );
}

function FieldGroup({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div>
      <p className="eyebrow">
        {term}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/**
 * The content shared by a stage's desktop tabpanel and its mobile accordion
 * body, so the two responsive presentations can never drift out of sync
 * with one another. `stripNeedsInput` is applied defensively to every
 * string here even though no `workflowStages` entry currently carries a
 * marker -- the section's rule is that it covers all long-form prose here,
 * not just the one field known to need it today.
 */
function StageDetails({ stage }: { stage: WorkflowStage }) {
  return (
    <div className="space-y-6">
      <h4 className="font-display text-[length:var(--step-2)] leading-snug tracking-[-0.01em] text-[color:var(--fg)]">
        {stripNeedsInput(stage.question)}
      </h4>

      <FieldGroup term="What the agent does">
        <ul className="space-y-2">
          {stage.agentDoes.map((item, index) => (
            <li key={index} className="text-[length:var(--step-0)] leading-relaxed text-[color:var(--fg)]">
              {stripNeedsInput(item)}
            </li>
          ))}
        </ul>
      </FieldGroup>

      <FieldGroup term="What stays mine">
        <ul className="space-y-2">
          {stage.humanOwns.map((item, index) => (
            <li key={index} className="text-[length:var(--step-0)] leading-relaxed text-[color:var(--fg)]">
              {stripNeedsInput(item)}
            </li>
          ))}
        </ul>
      </FieldGroup>

      <div className="flex gap-3 border-l-2 border-[color:var(--rule-color)] py-1 pl-4">
        <TriangleAlert
          aria-hidden="true"
          focusable="false"
          className="mt-0.5 h-4 w-4 flex-none text-[color:var(--fg-muted)]"
        />
        <div>
          <p className="eyebrow">
            What I watch for
          </p>
          <p className="mt-2 text-[length:var(--step-0)] italic leading-relaxed text-[color:var(--fg)]">
            {stripNeedsInput(stage.watchFor)}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * The workflow explorer, the centrepiece of this section.
 *
 * The shared `Tabs` primitive (`src/components/ui/Tabs.tsx`) only supports
 * a horizontal `role="tablist"` -- it binds ArrowLeft/ArrowRight and has no
 * `orientation` prop at all. SECTIONS.md explicitly allows building a
 * vertical variant inside this folder rather than editing that file, so
 * this component hand-rolls one, deliberately mirroring the shared
 * primitive's proven mechanics (roving tabindex via a ref array, only the
 * active panel mounted, a persistent border whose *colour* (not width)
 * carries the selected state so switching stages never shifts layout)
 * adapted to ArrowUp/ArrowDown for vertical orientation. See the build
 * report for the full explanation.
 *
 * Two structurally different DOM trees are rendered -- a two-pane vertical
 * tablist for desktop, stacked `Disclosure` accordions for everything
 * smaller -- rather than one tree reflowed by CSS, because the two
 * interaction models genuinely differ (single-panel tab selection vs.
 * independently collapsible sections) and forcing one ARIA pattern to also
 * describe the other would misrepresent one of them. Exactly one of the
 * two is ever visible at a given viewport width; `hidden` (display:none)
 * fully removes the other from the accessibility tree and tab order, the
 * same technique already used for the header's desktop/mobile nav
 * (`SiteNav.tsx`), so nothing is ever duplicated for keyboard or
 * screen-reader users.
 */
export function WorkflowExplorer({ stages }: WorkflowExplorerProps) {
  const [activeId, setActiveId] = useState<string>(() => stages[0]?.id ?? "");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeIndex = stages.findIndex((stage) => stage.id === activeId);
  const activeStage = stages[activeIndex] ?? stages[0];

  function selectByIndex(index: number, focus: boolean) {
    const target = stages[index];
    if (!target) return;
    setActiveId(target.id);
    if (focus) tabRefs.current[index]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        selectByIndex((index + 1) % stages.length, true);
        break;
      case "ArrowUp":
        event.preventDefault();
        selectByIndex((index - 1 + stages.length) % stages.length, true);
        break;
      case "Home":
        event.preventDefault();
        selectByIndex(0, true);
        break;
      case "End":
        event.preventDefault();
        selectByIndex(stages.length - 1, true);
        break;
      default:
        break;
    }
  }

  if (!activeStage) return null;

  return (
    <div>
      {/* Desktop (>=1024px): two-pane vertical explorer. */}
      <div className="hidden lg:grid lg:grid-cols-[minmax(220px,300px)_minmax(0,1fr)] lg:items-start lg:gap-x-16">
        <div
          role="tablist"
          aria-label="Workflow stages"
          aria-orientation="vertical"
          className="flex flex-col"
        >
          {stages.map((stage, index) => {
            const selected = stage.id === activeStage.id;
            return (
              <button
                key={stage.id}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={tabId(stage.id)}
                aria-selected={selected}
                aria-controls={panelId(stage.id)}
                tabIndex={selected ? 0 : -1}
                onClick={() => selectByIndex(index, false)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className={cn(
                  "flex min-h-11 items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors duration-200",
                  selected
                    ? "border-[color:var(--fg)] text-[color:var(--fg)]"
                    : "border-[color:var(--rule-color)] text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]",
                )}
              >
                <StageIndex index={index} />
                <span className="text-[length:var(--step-0)]">{stripNeedsInput(stage.label)}</span>
              </button>
            );
          })}
        </div>

        <div role="tabpanel" id={panelId(activeStage.id)} aria-labelledby={tabId(activeStage.id)} tabIndex={0}>
          <StageDetails stage={activeStage} />
        </div>
      </div>

      {/* Mobile / tablet (<1024px): stacked accessible accordions, not a
          squeezed two-pane layout. */}
      <div className="lg:hidden">
        {stages.map((stage, index) => (
          <div key={stage.id} className="border-b border-[color:var(--rule-color)] first:border-t">
            <Disclosure
              id={`${ID_PREFIX}-accordion-${stage.id}`}
              summary={
                <span className="flex items-baseline gap-3">
                  <StageIndex index={index} />
                  <span className="text-[length:var(--step-0)] text-[color:var(--fg)]">
                    {stripNeedsInput(stage.label)}
                  </span>
                </span>
              }
            >
              <StageDetails stage={stage} />
            </Disclosure>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WorkflowExplorer;
