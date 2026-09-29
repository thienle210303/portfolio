import type { WorkshopStation } from "@/types/portfolio";

/**
 * Which authored field is the evidence for which step of the loop.
 *
 * The nine steps in `problemSolvingLoop` are the method, stated in the
 * abstract. A case study's fields are one run of that method, stated
 * concretely. This file is the only place the two are joined, and the join is
 * authored rather than inferred — exactly like the career tree's refusal to
 * match skill names against technology strings. A loop step and a project
 * field are two different vocabularies, and the only honest way to relate them
 * is for a person to say which goes with which.
 *
 * Each field appears once. That is a real constraint, not tidiness: a line
 * used as evidence for two different steps is a line doing a job it was not
 * written for, and it makes the run look like it had more material than it did.
 *
 * Five fields are deliberately *not* mapped — `whyItMattered`,
 * `responsibility`, `proof`, `metrics` and `workflow`. They belong to the case
 * study's own telling in `#work`, and the Workshop links there rather than
 * repeating it. `learned` is not a station either, but it is not left out: the
 * run carries it on its own, next to the stations rather than inside one.
 */
export const workshopStations = [
  { step: "observe", field: "problem" },
  { step: "question", field: "assumption" },
  { step: "constraints", field: "constraints" },
  { step: "reframe", field: "decisions" },
  { step: "explore", field: "pathsExplored" },
  { step: "experiment", field: "built" },
  { step: "test", field: "whatFailed" },
  { step: "learn", field: "failureLesson" },
  { step: "iterate", field: "nextQuestion" },
] satisfies readonly WorkshopStation[];

/**
 * What a station says when the project being run authors nothing for it.
 *
 * It names the field, on purpose. A visitor reading "nothing authored here"
 * learns only that something is missing; naming the field says *what* is
 * missing and makes the gap checkable against the case study. Four of the five
 * projects have no `whatFailed`, so this string is not an edge case — four of
 * the five runs show it — and it should read as a deliberate statement rather
 * than an apology.
 */
export const stationGap = (field: string): string =>
  `Nothing is authored in this project's ${field}, so this station is empty on this run.`;

export const workshopIntro =
  "Nine steps, one real project, and every line below quoted from that project's own write-up. Switch the project to see which steps it can fill — and which it cannot.";

/** The run a visitor sees first. `dd-feasibility-agent` is the only project
 *  that authors `whatFailed`, so it is the one run where all nine stations
 *  have something behind them — and `tests/lib/workshop.test.ts` holds the
 *  default to that, so a content edit that broke it would say so. */
export const defaultRunProjectId = "dd-feasibility-agent";

export const agentLaneIntro =
  "Underneath, the ten stages where an agent actually helps — what it does, what stays a human decision, and what to watch for at each one.";
