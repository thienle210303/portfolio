import { Section, type RailNote } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { problemSolvingLoop } from "@/content/portfolio";
import { workflowStages } from "@/content/ai-experiments";
import { defaultRunProjectId, workshopIntro } from "@/content/workshop";
import { resolveRun, runnableProjects } from "@/lib/workshop";
import AgentLane from "./AgentLane";
import WorkshopRun from "./WorkshopRun";

/**
 * Turn an idea into an i_did.
 *
 * This is where the nine loop steps ended up. They used to be a 1,045-line
 * client island inside Philosophy, animating a diagram of the method in the
 * abstract; plan 2 deleted the island and kept the nine steps. Here they are
 * run against a real project, with every piece of evidence quoted from that
 * project's own write-up, and the steps a project cannot fill left visibly
 * empty. The method is the same. The difference is that this version can be
 * checked.
 *
 * The agent lane underneath is the surviving half of the AI Workflow Lab — the
 * ten stages, and specifically each one's failure mode. The five experiment
 * articles and the learning-log essays did not survive, on the owner's
 * instruction ("nobody is gonna read them"); they remain in
 * `src/content/ai-experiments.ts`, unrendered, which is what makes that
 * decision reversible.
 */

const HEADING_ID = "workshop-heading";

const RUNS = runnableProjects()
  .map((project) => resolveRun(project.id))
  .filter((run): run is NonNullable<typeof run> => run !== null);

/**
 * The rail counts what a reader cannot count by looking.
 *
 * "Filled" is the one figure the section is an argument about, and it is the
 * *spread* rather than the default run's own number — that number is already
 * printed above the stations, and repeating it would make the rail a second
 * rendering of the prose beside it. The spread is only visible to someone who
 * clicks every chip, which is exactly the kind of fact this rail is for. Both
 * ends are computed from the resolved runs, so a content edit that gave a
 * project its missing `whatFailed` moves this line without anyone retyping it.
 *
 * The guard is on `RUNS.length`, not on a resolved default: spreading an empty
 * array into `Math.min` yields `Infinity`, which would print as a rail note
 * rather than as a build failure.
 */
const FILLED = RUNS.map((run) => run.authoredStations);
const SPREAD =
  FILLED.length > 0
    ? `${Math.min(...FILLED)}–${Math.max(...FILLED)} of ${problemSolvingLoop.length}, depending on the project`
    : "—";

const RAIL: readonly RailNote[] = [
  { term: "Steps", detail: `${problemSolvingLoop.length} — authored, not generated` },
  { term: "Runs", detail: `${RUNS.length} projects` },
  { term: "Filled", detail: SPREAD },
  { term: "Agent stages", detail: `${workflowStages.length}, each with its failure mode` },
];

export default function Workshop() {
  return (
    <Section id="workshop" labelledBy={HEADING_ID} eyebrow="Workshop" tone="deep" rail={RAIL}>
      <SectionHeading id={HEADING_ID} lead={workshopIntro}>
        Turn an idea into an i_did.
      </SectionHeading>
      <WorkshopRun runs={RUNS} defaultProjectId={defaultRunProjectId} />
      <AgentLane />
    </Section>
  );
}
