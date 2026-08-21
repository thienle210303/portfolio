import { careerEntries, principles, profile, projects, skillCategories } from "@/content/portfolio";
import { experiments } from "@/content/ai-experiments";
import { buildKnowledgeTree, totalTechnologies } from "@/lib/knowledge-tree";

/**
 * D1 — facts as a server prop.
 *
 * The companion talks about the page in two places now — the field notes and
 * the guided tour — and both are only allowed to say things that are already
 * true on the page. This is the one function that computes those things, so
 * every spoken number is the *same* number a margin rail already prints
 * rather than a second, independently-typed guess at it.
 *
 * Every derivation here is copied from the rail that already renders the same
 * count, on purpose: SelectedWork.tsx (case studies, sourced figures),
 * CareerJourney.tsx (entries, the work/learning/milestone split),
 * Skills.tsx (categories, distinct skills), CareerTree.tsx (branches,
 * leaves, technologies), AIWorkflowLab.tsx (experiments, verified) and
 * Hero.tsx (the current role). Changing what a rail says and forgetting this
 * file is exactly the drift the plan rules out — so if a rail's expression
 * ever changes, this one has to change with it.
 *
 * Pure and server-safe: no DOM, no `Math.random`, nothing but arithmetic over
 * `src/content/*`. `layout.tsx` calls this once, on the server, and hands the
 * small object down — the content arrays themselves never reach the client
 * chunk that the cats ship in.
 */
export interface CompanionFacts {
  readonly about: {
    readonly role: string;
    readonly organization: string;
  };
  readonly philosophy: {
    readonly principles: number;
  };
  readonly work: {
    readonly caseStudies: number;
    readonly sourcedMetrics: number;
  };
  readonly journey: {
    readonly entries: number;
    readonly work: number;
    readonly learning: number;
    readonly milestones: number;
  };
  readonly skills: {
    readonly categories: number;
    readonly distinctSkills: number;
  };
  readonly tree: {
    readonly branches: number;
    readonly leaves: number;
    readonly technologies: number;
  };
  readonly lab: {
    readonly experiments: number;
    readonly verified: number;
  };
  readonly contact: {
    readonly email: string;
  };
}

function countOf(type: (typeof careerEntries)[number]["type"]): number {
  return careerEntries.filter((entry) => entry.type === type).length;
}

export function buildCompanionFacts(): CompanionFacts {
  // Same lookup Hero.tsx uses for the "Now" rail note: the most recent `work`
  // entry by sortKey.
  const currentRole = [...careerEntries]
    .filter((entry) => entry.type === "work")
    .sort((a, b) => (a.sortKey > b.sortKey ? -1 : 1))[0];

  const sourcedMetrics = projects.reduce(
    (total, project) => total + (project.metrics?.length ?? 0),
    0,
  );

  const totalSkills = new Set(skillCategories.flatMap((category) => category.skills)).size;

  const tree = buildKnowledgeTree();
  const leafTotal = tree.reduce((total, lens) => total + lens.branches.length, 0);

  const verified = experiments.filter((experiment) => experiment.verification.length > 0).length;

  return {
    about: {
      role: currentRole?.role ?? "",
      organization: currentRole?.organization ?? "",
    },
    philosophy: {
      principles: principles.length,
    },
    work: {
      caseStudies: projects.length,
      sourcedMetrics,
    },
    journey: {
      entries: careerEntries.length,
      work: countOf("work"),
      learning: countOf("learning"),
      milestones: countOf("milestone"),
    },
    skills: {
      categories: skillCategories.length,
      distinctSkills: totalSkills,
    },
    tree: {
      branches: tree.length,
      leaves: leafTotal,
      technologies: totalTechnologies(),
    },
    lab: {
      experiments: experiments.length,
      verified,
    },
    contact: {
      email: profile.email,
    },
  };
}
