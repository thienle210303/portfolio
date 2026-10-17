import { careerEntries, profile } from "@/content/portfolio";
import { buildDrawnTree, totalLeaves, treeTechnologies } from "@/lib/knowledge-tree";
import { buildStops, crossingKm, crossingLabel } from "@/lib/origin-stops";

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
 * and Worlds (the stops and the crossing's length, via `buildStops()` /
 * `crossingKm()` in `src/lib/origin-stops.ts`).
 * Changing what a rail says and
 * forgetting this file is exactly the drift the plan rules out — so if a
 * rail's expression ever changes, this one has to change with it.
 *
 * Pure and server-safe: no DOM, no `Math.random`, nothing but arithmetic over
 * `src/content/*` (and, for `worlds`, the same arithmetic
 * `src/lib/origin-stops.ts` already does over it). `layout.tsx` calls this once, on the server, and
 * hands the small object down — the content arrays themselves never reach
 * the client chunk that the cats ship in.
 */
export interface CompanionFacts {
  readonly about: {
    readonly role: string;
    readonly organization: string;
  };
  /**
   * The globe's own numbers — computed by `buildStops()` and `crossingKm()`
   * rather than typed here, the same discipline every other fact in this file
   * follows. `crossing` is the string the section's rail prints; `stops` is
   * `buildStops().length`, the list the section renders (its heading says
   * "three" in words), never a second, independently-typed guess at it.
   */
  readonly worlds: {
    readonly stops: number;
    readonly crossingKm: number;
    /** `crossingKm` as the globe prints it: "14,960 km". */
    readonly crossing: string;
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
  // `LEAF_TOTAL` and `TECHNOLOGY_TOTAL` there. Not `buildCareerTree()` /
  // `totalTechnologies()`: those count all twenty entries, including the nine
  // the Journey no longer draws as branches.
  const drawn = buildDrawnTree();
  const km = crossingKm();

  return {
    about: {
      role: currentRole?.role ?? "",
      organization: currentRole?.organization ?? "",
    },
    worlds: {
      stops: buildStops().length,
      crossingKm: km,
      crossing: crossingLabel(),
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
