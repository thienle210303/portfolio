import { careerEntries, profile } from "@/content/portfolio";
import { buildDrawnTree, totalLeaves, treeTechnologies } from "@/lib/knowledge-tree";
import { crossingKm, resolveChapters } from "@/lib/worlds";

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
 * count, on purpose: CareerTree.tsx (branches, leaves, technologies, and —
 * since the tree absorbed Journey — the entries and the
 * work/learning/milestone split too), Hero.tsx (the current role)
 * and — since round 16 — Worlds.tsx (plaques, decorations and the crossing's
 * length, via `resolveChapters()`/`crossingKm()` in `src/lib/worlds.ts`).
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
   * Round 16. The globe's own counts — computed by `resolveChapters()` and
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
  /**
   * The Journey's own counts, both halves of its rail: what the drawing draws
   * (`branches`, `leaves`, `technologies`) and the whole record it was drawn
   * from (`entries` and its `work`/`learning`/`milestone` split).
   *
   * Those are two different populations and the numbers say so. The drawing
   * is `buildDrawnTree()` — every career entry except the nine demoted to the
   * stage's one credentials line — so `branches` is smaller than `entries`,
   * exactly as the rail prints "11 drawn · 9 as credentials" beside "Entries
   * 20". A cat that said "20 branches" would be counting a tree nobody can
   * see; Ruling 51 fixed the same contradiction on the globe's plaque.
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
  // The most recent `work` entry by sortKey.
  const currentRole = [...careerEntries]
    .filter((entry) => entry.type === "work")
    .sort((a, b) => (a.sortKey > b.sortKey ? -1 : 1))[0];

  // The same three calls CareerTree.tsx makes for its rail — `DRAWN`,
  // `LEAF_TOTAL` and `TECHNOLOGY_TOTAL` there — and the globe's "tree-shape"
  // plaque makes in `src/lib/worlds.ts`. Not `buildCareerTree()` /
  // `totalTechnologies()`: those count all twenty entries, including the nine
  // the stage no longer draws as branches.
  const drawn = buildDrawnTree();

  const resolvedWorlds = resolveChapters();
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
    tree: {
      branches: drawn.length,
      leaves: totalLeaves(drawn),
      technologies: treeTechnologies(drawn),
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
