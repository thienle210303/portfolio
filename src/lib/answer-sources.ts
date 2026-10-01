import {
  careerEntryById,
  careerEntries,
  education,
  projects,
  profile,
  skillCategories,
} from "@/content/portfolio";
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
  /** Carried through so `answers.ts` can attach the search aliases in
   *  `src/content/answer-expansion.ts`, which are keyed by content id. */
  readonly id: string;
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
    id: project.id,
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

export interface IndexableCareerEntry {
  readonly id: string;
  readonly role: string;
  readonly organization: string;
  readonly dateRange: string;
  readonly type: string;
  /** `context` is the one-line "what this was", which is the closest thing the
   *  entry has to a summary. `impact` lines are indexed separately. */
  readonly summary: string | undefined;
  readonly impact: readonly string[];
  /** What the role taught him. Reads as the answer to "what did you learn",
   *  which is among the most likely questions a visitor types. */
  readonly learned: string | undefined;
}

export const careerIndexable: readonly IndexableCareerEntry[] = careerEntries.map((entry) => ({
  id: entry.id,
  role: entry.role,
  organization: entry.organization,
  dateRange: entry.dateRange,
  type: entry.type,
  summary: resolved(entry.context),
  impact: entry.impact,
  learned: resolved(entry.learned),
}));

export interface IndexableSkillCategory {
  readonly id: string;
  readonly label: string;
  readonly skills: readonly string[];
  /** Where each skill was actually used. This is the answerable half — a bare
   *  list of technology names is a fact about the page, not an answer. */
  readonly evidence: string;
}

export const skillsIndexable: readonly IndexableSkillCategory[] = skillCategories.map((category) => ({
  id: category.id,
  label: category.label,
  skills: category.skills,
  evidence: category.evidence,
}));
