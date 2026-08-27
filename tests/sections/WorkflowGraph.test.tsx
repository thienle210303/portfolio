import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import WorkflowGraph from "@/sections/Philosophy/WorkflowGraph";
import { workflowStages } from "@/content/ai-experiments";
import type { WorkflowStage } from "@/types/portfolio";

/**
 * `WorkflowGraph` is the round-15 graph layer hung off the Philosophy
 * ring — verification gates and human-owned checkpoints, drawn verbatim from
 * `workflowStages` (see the component's own doc comment for the full
 * rationale). What this file pins:
 *
 *   - the real page content actually renders, verbatim, for both the gate
 *     (`watchFor`) and the checkpoint (`humanOwns[0]`) of each drawn stage;
 *   - nothing renders for a stage this layer does not draw;
 *   - a stage id that disappears from the content layer degrades to
 *     "that node is simply absent", never to stale or fabricated text —
 *     the same resilience contract `ProblemSolvingLoop.tsx`'s `FORKS`
 *     lookup gives itself, pinned here for this component's own lookup.
 */

const DRAWN_STAGE_IDS = ["explore-codebase", "implement", "tests", "review-diff"] as const;
const UNDRAWN_STAGE_ID = "diagnose";

function stageById(id: string): WorkflowStage {
  const stage = workflowStages.find((candidate) => candidate.id === id);
  if (!stage) throw new Error(`content fixture assumption failed: no workflow stage "${id}" found`);
  return stage;
}

describe("WorkflowGraph", () => {
  it("renders each drawn stage's authored gate and checkpoint verbatim, under its own stage label", () => {
    render(<WorkflowGraph stages={workflowStages} />);

    for (const id of DRAWN_STAGE_IDS) {
      const stage = stageById(id);
      expect(screen.getByText(stage.watchFor)).toBeInTheDocument();
      const checkpoint = stage.humanOwns[0];
      expect(checkpoint).toBeTruthy();
      if (checkpoint) expect(screen.getByText(checkpoint)).toBeInTheDocument();
      // The stage's own label appears at least once (it is the node's only
      // heading, and a stage carrying both a gate and a checkpoint prints it
      // twice — once per node).
      expect(screen.getAllByText(stage.label).length).toBeGreaterThan(0);
    }
  });

  it("renders exactly the drawn stages' worth of nodes — one gate and one checkpoint per drawn stage", () => {
    render(<WorkflowGraph stages={workflowStages} />);

    const gateList = screen.getByRole("list", { name: "Verification gates" });
    const checkpointList = screen.getByRole("list", { name: "Human checkpoints" });

    expect(gateList.querySelectorAll("li")).toHaveLength(DRAWN_STAGE_IDS.length);
    expect(checkpointList.querySelectorAll("li")).toHaveLength(DRAWN_STAGE_IDS.length);
  });

  it("draws nothing for a stage outside its curated set, even though that stage carries an equally authored gate and checkpoint", () => {
    render(<WorkflowGraph stages={workflowStages} />);

    const undrawn = stageById(UNDRAWN_STAGE_ID);
    expect(screen.queryByText(undrawn.watchFor)).not.toBeInTheDocument();
    expect(screen.queryByText(undrawn.label)).not.toBeInTheDocument();
  });

  it("degrades a renamed or removed stage id to 'absent', never to stale or fabricated text", () => {
    const withoutTests = workflowStages.filter((stage) => stage.id !== "tests");
    render(<WorkflowGraph stages={withoutTests} />);

    const missing = stageById("tests");
    expect(screen.queryByText(missing.watchFor)).not.toBeInTheDocument();
    const checkpoint = missing.humanOwns[0];
    if (checkpoint) expect(screen.queryByText(checkpoint)).not.toBeInTheDocument();

    // The other three drawn stages are unaffected.
    for (const id of DRAWN_STAGE_IDS.filter((candidate) => candidate !== "tests")) {
      expect(screen.getByText(stageById(id).watchFor)).toBeInTheDocument();
    }
  });

  it("renders nothing at all when none of its curated stage ids exist in the content passed to it", () => {
    const { container } = render(<WorkflowGraph stages={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("links back to the AI Workflow Lab section, the source of every node here", () => {
    render(<WorkflowGraph stages={workflowStages} />);
    expect(screen.getByRole("link", { name: "AI Workflow Lab" })).toHaveAttribute("href", "#lab");
  });
});
