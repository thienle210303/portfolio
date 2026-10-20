import { careerEntries, profile } from "@/content/portfolio";
import { buildDrawnTree, totalLeaves, treeTechnologies } from "@/lib/knowledge-tree";

/**
 * D1 — facts as a server prop.
 *
 * The companion talks about the page in two places now — the field notes and
 * the guided tour — and both are only allowed to say things that are already
 * true on the page. This is the one function that computes those things, so
 * every spoken number is counted off the same tree the Journey draws
 * (`buildDrawnTree()`, which CareerTree.tsx renders) and the same records,
 * rather than a second, independently-typed guess at it. Through round 20 the
 * Journey's margin rail printed these counts too; round 21 dropped the rail
 * with the board, so the drawing and the records are what they must agree
 * with now (`tests/lib/companion-facts.test.ts` recomputes each by hand).
 *
 * Pure and server-safe: no DOM, no `Math.random`, nothing but arithmetic over
 * `src/content/*`. `layout.tsx` calls this once, on the server, and
 * hands the small object down — the content arrays themselves never reach
 * the client chunk that the cats ship in.
 */
export interface CompanionFacts {
  readonly about: {
    readonly role: string;
    readonly organization: string;
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

  return {
    about: {
      role: currentRole?.role ?? "",
      organization: currentRole?.organization ?? "",
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
