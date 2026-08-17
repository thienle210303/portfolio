import { careerEntryById, careerEntries, education, projects, profile } from "@/content/portfolio";
import { experiments } from "@/content/ai-experiments";
import { resolved, type Project } from "@/types/portfolio";

/**
 * Normalises the content layer into the flat shapes `answers.ts` indexes.
 *
 * It exists so the index has one job — ranking — and never has to know that a
 * project resolves its employer through `careerEntryId`, that `metrics` is
 * optional, or that half a dozen fields are `Maybe<T>` and may be holding a
 * `[NEEDS INPUT: …]` marker. Every marker collapses to `undefined` here via
 * `resolved()`, so a marker can never reach the index and therefore can never
 * be returned as an answer — the same guarantee the rendered UI already has.
 */

export { careerEntries, education, profile };

export interface IndexableProject {
  readonly title: string;
  readonly organization: string | undefined;
  readonly problem: string;
  readonly learned: string;
  readonly proof: readonly string[];
  readonly technologies: readonly string[];
  readonly metrics: readonly { label: string; before: string; after: string; source: string }[];
}

function toIndexable(project: Project): IndexableProject {
  return {
    title: project.title,
    organization: careerEntryById(project.careerEntryId)?.organization,
    problem: project.problem,
    learned: project.learned,
    proof: project.proof,
    technologies: project.technologies,
    metrics: (project.metrics ?? []).map((metric) => ({
      label: metric.label,
      before: metric.before,
      after: metric.after,
      source: metric.source,
    })),
  };
}

export const projectsIndexable: readonly IndexableProject[] = projects.map(toIndexable);

export interface IndexableExperiment {
  readonly title: string;
  readonly status: string;
  readonly question: string;
  /** Empty for anything still `Exploring` — nothing has been verified yet, and
   *  that emptiness is the honest answer, not a gap to paper over. */
  readonly verification: readonly string[];
}

export const experimentsIndexable: readonly IndexableExperiment[] = experiments.map((experiment) => ({
  title: experiment.title,
  status: experiment.status,
  question: experiment.question,
  verification: experiment.verification,
}));

export interface IndexableCareerEntry {
  readonly role: string;
  readonly organization: string;
  readonly dateRange: string;
  readonly type: string;
  /** `context` is the one-line "what this was", which is the closest thing the
   *  entry has to a summary. `impact` lines are indexed separately. */
  readonly summary: string | undefined;
  readonly impact: readonly string[];
}

export const careerIndexable: readonly IndexableCareerEntry[] = careerEntries.map((entry) => ({
  role: entry.role,
  organization: entry.organization,
  dateRange: entry.dateRange,
  type: entry.type,
  summary: resolved(entry.context),
  impact: entry.impact,
}));
