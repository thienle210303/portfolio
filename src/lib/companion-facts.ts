import {
  careerEntries,
  profile,
  projects,
  skillCategories,
} from "@/content/portfolio";
import { buildCareerTree, totalTechnologies } from "@/lib/knowledge-tree";
import { crossingKm, resolveWorlds } from "@/lib/worlds";

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
 * Skills.tsx (categories, distinct skills), CareerTree.tsx (branches,
 * leaves, technologies, and — since the tree absorbed Journey — the entries
 * and the work/learning/milestone split too), Hero.tsx (the current role)
 * and — since round 16 — Worlds.tsx (plaques, decorations and the crossing's
 * length, via `resolveWorlds()`/`crossingKm()` in `src/lib/worlds.ts`).
 * Changing what a rail says and
 * forgetting this file is exactly the drift the plan rules out — so if a
 * rail's expression ever changes, this one has to change with it.
 *
 * Pure and server-safe: no DOM, no `Math.random`, nothing but arithmetic over
 * `src/content/*` (and, for `worlds`, the same arithmetic `src/lib/worlds.ts`
 * already does over it). `layout.tsx` calls this once, on the server, and
 * hands the small object down — the content arrays themselves never reach
 * the client chunk that the cats ship in.
 */
export interface CompanionFacts {
  readonly about: {
    readonly role: string;
    readonly organization: string;
  };
  /**
   * Round 16. The globe's own counts — computed by `resolveWorlds()` and
   * `crossingKm()` rather than typed here, the same discipline every other
   * fact in this file follows: a dialogue line that quotes a number quotes
   * the one already computed for the section's own margin rail
   * (`src/sections/Worlds/Worlds.tsx`), never a second, independently-typed
   * guess at it.
   */
  readonly worlds: {
    readonly count: number;
    readonly plaques: number;
    readonly decorations: number;
    readonly crossingKm: number;
  };
  readonly work: {
    readonly caseStudies: number;
    readonly sourcedMetrics: number;
  };
  readonly skills: {
    readonly categories: number;
    readonly distinctSkills: number;
  };
  /**
   * Round 10: the tree absorbs Journey (one section, two faces), and the
   * companion follows — `journey` retired as a key here rather than staying a
   * fact nothing quotes any more. The timeline's own split (entries, and the
   * work/learning/milestone counts that sum to it) is folded in beside the
   * tree's own branch/leaf/technology counts, so both faces of the merged
   * section speak from the same object.
   *
   * Round 12: the tree itself inverted (`buildCareerTree` in
   * `src/lib/knowledge-tree.ts`) — a branch is now one career entry, so
   * `branches` and `entries` are now the same number by construction, and
   * `leaves` counts authored technologies and impact lines rather than
   * (lens, entry) pairs. Both keys stay: `branches`/`leaves` are what the
   * drawing itself renders, `entries`/`work`/`learning`/`milestones` are the
   * timeline's own split, and a dialogue line is free to quote either.
   */
  readonly tree: {
    readonly branches: number;
    readonly leaves: number;
    readonly technologies: number;
    readonly entries: number;
    readonly work: number;
    readonly learning: number;
    readonly milestones: number;
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

  // Round 12: the tree inverted (see src/lib/knowledge-tree.ts) — a branch is
  // now one career entry and a leaf is one authored technology or impact
  // line, so `tree.length` is the branch count directly and `leafTotal` sums
  // each branch's own leaves rather than counting (lens, entry) pairs.
  const tree = buildCareerTree();
  const leafTotal = tree.reduce((total, branch) => total + branch.leaves.length, 0);

  const resolvedWorlds = resolveWorlds();
  const plaqueTotal = resolvedWorlds.reduce((total, world) => total + world.plaques.length, 0);
  const decorationTotal = resolvedWorlds.reduce((total, world) => total + world.decorations.length, 0);

  return {
    about: {
      role: currentRole?.role ?? "",
      organization: currentRole?.organization ?? "",
    },
    worlds: {
      count: resolvedWorlds.length,
      plaques: plaqueTotal,
      decorations: decorationTotal,
      crossingKm: crossingKm(),
    },
    work: {
      caseStudies: projects.length,
      sourcedMetrics,
    },
    skills: {
      categories: skillCategories.length,
      distinctSkills: totalSkills,
    },
    tree: {
      branches: tree.length,
      leaves: leafTotal,
      technologies: totalTechnologies(),
      entries: careerEntries.length,
      work: countOf("work"),
      learning: countOf("learning"),
      milestones: countOf("milestone"),
    },
    contact: {
      email: profile.email,
    },
  };
}
