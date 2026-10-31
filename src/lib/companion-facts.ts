import { careerEntries, profile } from "@/content/portfolio";
import { buildTickets } from "@/lib/highlights";
import { totalTechnologies } from "@/lib/knowledge-tree";

/**
 * D1 — facts as a server prop.
 *
 * The companion talks about the page in two places now — the field notes and
 * the guided tour — and both are only allowed to say things that are already
 * true on the page. This is the one function that computes those things, so
 * every spoken number is counted off the same tags the Journey hangs
 * (`buildTickets()`, which HangingTags.tsx renders) and the same records,
 * rather than a second, independently-typed guess at it. Through round 20 the
 * Journey's margin rail printed these counts too; round 21 dropped the rail
 * with the board, so the oak and the records are what they must agree with
 * now (`tests/lib/companion-facts.test.ts` recomputes each by hand).
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
   * The Journey's own counts: the tags on its oak (`tags`, one per ticket, as
   * `HangingTags.tsx` hangs them), the technologies the Record's rows list
   * across every entry, and the entries themselves with their
   * `work`/`learning`/`milestone` split. Round 22 retired the drawn tree, and
   * its branch and leaf counts with it: a cat that counted branches would be
   * counting a tree nobody can see, the same contradiction Ruling 51 fixed on
   * the globe's plaque.
   */
  readonly tree: {
    readonly tags: number;
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

  return {
    about: {
      role: currentRole?.role ?? "",
      organization: currentRole?.organization ?? "",
    },
    tree: {
      tags: buildTickets().length,
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
