/**
 * Round 15's graph layer: verification gates and human-owned checkpoints,
 * hung off the problem-solving ring (`ProblemSolvingLoop.tsx`, built round 7,
 * hardened round 8 — untouched by this file) per the owner's brief:
 * "combine loop engineering and graph engineering into a workflow system."
 * The ring stays the engine at the centre; this is the system attached
 * around it.
 *
 * THE CONTENT LAW
 *
 * Every node here is a verbatim field of a `WorkflowStage` from
 * `workflowStages` (`src/content/ai-experiments.ts`, AI Workflow Lab
 * content — read-only from this file, passed in as a prop): a stage's
 * `watchFor` is its authored verification gate, the failure mode that stage
 * tends to produce; the first entry of its `humanOwns` is its authored human
 * checkpoint, a decision that stays a human's every time. Nothing here is
 * written for the occasion, and nothing paraphrases — see `buildNodes`
 * below, which only ever reads `stage.watchFor` and `stage.humanOwns[0]`
 * onto a node, never composes new text from them.
 *
 * Four of the ten authored stages are drawn — `explore-codebase`,
 * `implement`, `tests`, `review-diff` — spanning the arc from understanding
 * a system to shipping a change. The brief asks for "a small set", not the
 * whole catalogue: the other six stages (`idea-to-spec`, `plan-feature`,
 * `diagnose`, `refactor`, `parallel-research`, `document`) carry equally
 * authored gates and checkpoints, simply not drawn here — a curation for
 * legibility, not a gap in the content.
 *
 * `principles`' three summaries (`src/content/portfolio.ts`) were the
 * brief's other sanctioned source, and were considered and declined:
 * Philosophy already renders all three in full, one screen up, in
 * `PrincipleList`. Reusing them again here as graph nodes would be the
 * margin-rail mistake CLAUDE.md warns against ("never restates the prose
 * beside it"), just moved into the middle of the page instead of the side of
 * it.
 *
 * `GRAPH_STAGE_IDS` is matched against the passed-in `stages` by id, not by
 * array position, and a stage that has been renamed or removed upstream is
 * simply skipped — degrading to absent rather than drawing stale text. That
 * mirrors the resilience `ProblemSolvingLoop.tsx`'s own `FORKS` lookup gives
 * itself for exactly the same reason.
 *
 * NO PER-STATION EDGES
 *
 * The nine loop stations (`problemSolvingLoop`) and the ten workflow stages
 * (`workflowStages`) are two different loops, authored at different times
 * for two different sections of the page. Nothing in the content layer maps
 * one onto the other — drawing "Test" wired specifically to the `tests`
 * stage would be the same loose-matching mistake
 * `tests/lib/knowledge-tree.test.ts` exists to catch on the career tree,
 * just moved here. So this layer attaches to the ring as a whole: one
 * hairline drops from the ring's own box into this block's label, and
 * nothing connects a node to a particular station.
 *
 * DESKTOP VS. MOBILE
 *
 * At `lg:` and up: the hairline bracket, then two labelled columns of
 * bordered cards — a hollow square marks a gate, a hollow circle marks a
 * checkpoint, both drawn at the ring's own hairline weight
 * (`border-fg-subtle`), the same technique `ProblemSolvingLoop.tsx` already
 * uses for its decision-fork marker on the station button. Below `lg:`: no
 * bracket, one column, the same bordered cards stacked plainly — the
 * "compact labeled list" the brief asks mobile to keep instead of a
 * miniature, illegible graph. The card border stays at every width so
 * nothing about a node's own shape has to change at the breakpoint; only the
 * bracket, the column count and the surface fill do.
 *
 * ACCESSIBILITY
 *
 * Two more `role="list"` groups, each with its own `.eyebrow` label wired by
 * `aria-labelledby` — the same idiom `ProblemSolvingLoop`'s "The loop" and
 * `PrincipleList`'s "Principles" already use. The marker glyphs and the
 * connecting bracket are `aria-hidden` presentation; the stage label and the
 * gate/checkpoint sentence are plain text, always in the accessibility
 * tree — there is no hover or disclosure state to keep in sync, because none
 * of this is ever hidden in the first place.
 */
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import type { WorkflowStage } from "@/types/portfolio";

interface WorkflowGraphProps {
  readonly stages: readonly WorkflowStage[];
}

/** Which four of the ten authored stages this graph draws — see THE CONTENT
 *  LAW above for why these four and not the other six. */
const GRAPH_STAGE_IDS = ["explore-codebase", "implement", "tests", "review-diff"] as const;

interface GraphNode {
  readonly id: string;
  /** `WorkflowStage.label`, verbatim — names which authored stage this node
   *  came from. */
  readonly stageLabel: string;
  /** `stage.watchFor` (a gate) or `stage.humanOwns[0]` (a checkpoint),
   *  verbatim. */
  readonly text: string;
}

function buildNodes(stages: readonly WorkflowStage[]): {
  readonly gates: readonly GraphNode[];
  readonly checkpoints: readonly GraphNode[];
} {
  const gates: GraphNode[] = [];
  const checkpoints: GraphNode[] = [];
  for (const id of GRAPH_STAGE_IDS) {
    const stage = stages.find((candidate) => candidate.id === id);
    if (!stage) continue; // renamed or removed upstream — absent, not stale
    gates.push({ id: `${stage.id}-gate`, stageLabel: stage.label, text: stage.watchFor });
    const checkpointText = stage.humanOwns[0];
    if (checkpointText) {
      checkpoints.push({ id: `${stage.id}-checkpoint`, stageLabel: stage.label, text: checkpointText });
    }
  }
  return { gates, checkpoints };
}

/** Same alias `ProblemSolvingLoop.tsx` draws its own hairline strokes and
 *  markers from — border ink, not the panel border weight. */
const HAIRLINE = "border-fg-subtle";

const LABEL_ID = "philosophy-graph-label";
const GATES_LABEL_ID = "philosophy-graph-gates-label";
const CHECKPOINTS_LABEL_ID = "philosophy-graph-checkpoints-label";

interface NodeListProps {
  readonly heading: string;
  readonly labelId: string;
  readonly nodes: readonly GraphNode[];
  readonly marker: "square" | "circle";
}

function NodeList({ heading, labelId, nodes, marker }: NodeListProps) {
  if (nodes.length === 0) return null;

  return (
    <div>
      <p id={labelId} className="eyebrow">
        {heading}
      </p>
      <ul role="list" aria-labelledby={labelId} className="mt-4 space-y-3">
        {nodes.map((node) => (
          <li key={node.id} className="border border-rule p-3 lg:bg-surface lg:p-4">
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  "inline-block h-2 w-2 shrink-0 border",
                  HAIRLINE,
                  marker === "circle" && "rounded-full",
                )}
              />
              <span className="eyebrow">{node.stageLabel}</span>
            </span>
            <p className="mt-1.5 text-[length:var(--step-0)] leading-[1.5] text-[color:var(--fg)]">
              {node.text}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function WorkflowGraph({ stages }: WorkflowGraphProps) {
  const { gates, checkpoints } = buildNodes(stages);
  if (gates.length === 0 && checkpoints.length === 0) return null;

  return (
    <div className="mt-8 lg:mt-0" data-philosophy-graph="">
      {/* Attaches to the ring as a whole, not to a station — see NO
          PER-STATION EDGES above. Decorative only: the eyebrow beneath it
          already says what this block is without the line's help. The
          `data-*` hook is for e2e assertions on the >=1024px/<1024px split
          only — nothing reads it at runtime. */}
      <span
        aria-hidden="true"
        data-philosophy-graph-bracket=""
        className={cn("mx-auto hidden h-8 w-px border-l lg:block", HAIRLINE)}
      />

      <div className="flex items-center justify-between gap-4">
        <p id={LABEL_ID} className="eyebrow">
          Around the loop
        </p>
        <Button href="#lab" variant="quiet" size="sm">
          AI Workflow Lab
        </Button>
      </div>

      <div className="mt-6 grid gap-x-8 gap-y-8 lg:grid-cols-2">
        <NodeList heading="Verification gates" labelId={GATES_LABEL_ID} nodes={gates} marker="square" />
        <NodeList
          heading="Human checkpoints"
          labelId={CHECKPOINTS_LABEL_ID}
          nodes={checkpoints}
          marker="circle"
        />
      </div>
    </div>
  );
}
