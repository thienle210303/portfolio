import { careerEntries, projects, resumeLenses } from "@/content/portfolio";
import type { CareerEntry, ResumeLensId } from "@/types/portfolio";

/**
 * The knowledge tree: how the skills connect to the places they were used.
 *
 * root → lens → where he did it → what he used there
 *
 * Every edge in this tree is *authored*, not inferred. `lenses` is a field a
 * human sets on each career entry, and `technologies` is a list a human wrote
 * on that same entry, so a branch appearing here means someone deliberately
 * said so.
 *
 * That constraint is the reason the tree is built this way rather than the
 * more obvious way — joining `skillCategories.skills` against
 * `technologies`. That join was measured before this was written: of 38
 * skills, only 17 match a technology string exactly. The rest are near-misses
 * across two vocabularies — "React" against "JavaScript/React", "Flask"
 * against "Python/Flask", "API analysis" against "HTTP / API analysis". A
 * fuzzy join would invent edges that nobody authored; an exact one would
 * render "React — used nowhere", which is false. Both are worse than not
 * drawing the edge, on a site whose entire claim is that it does not make
 * things up.
 *
 * Adding a role, retagging a lens or listing a new technology in
 * `src/content/portfolio.ts` changes this tree with no code change here.
 */

/*
 * `careerEntries` is declared with `satisfies`, which keeps each entry's
 * `lenses` and `technologies` as literal tuples. That is exactly what makes
 * the content layer self-checking, but it also means `.includes()` on the
 * union of those tuples narrows its parameter to `never`. Widening once here,
 * at the boundary, keeps the precise types at the content layer where they do
 * their job and gives this module the ordinary arrays it needs to query.
 */
const ENTRIES: readonly CareerEntry[] = careerEntries;

export interface TreeLeaf {
  /** A technology, verbatim from the entry that lists it. */
  readonly name: string;
  /** How many other places in the tree also list it. 0 means "only here". */
  readonly alsoUsedIn: number;
}

export interface TreeBranch {
  readonly id: string;
  /** "Software Engineer" / the project title. */
  readonly label: string;
  /** "DoorDash, Inc." — undefined for entries that have no organisation. */
  readonly organization: string | undefined;
  readonly dateRange: string;
  /** `work` | `learning` | `milestone`, so the UI can distinguish them. */
  readonly kind: string;
  readonly leaves: readonly TreeLeaf[];
  /** Case studies attached to this role, by title. */
  readonly caseStudies: readonly string[];
}

export interface TreeRoot {
  readonly id: ResumeLensId;
  readonly label: string;
  readonly description: string;
  readonly branches: readonly TreeBranch[];
  /** Distinct technologies across every branch — the headline count. */
  readonly technologyCount: number;
}

/** How many branches across the whole tree list a given technology. Computed
 *  once, so a leaf can say "also used in 3 other places" without re-scanning. */
function technologyFrequency(): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const entry of ENTRIES) {
    for (const technology of new Set(entry.technologies)) {
      counts.set(technology, (counts.get(technology) ?? 0) + 1);
    }
  }
  return counts;
}

export function buildKnowledgeTree(): readonly TreeRoot[] {
  const frequency = technologyFrequency();

  const roots = resumeLenses.map((lens): TreeRoot => {
    const tagged = ENTRIES.filter((entry) => entry.lenses.includes(lens.id));

    const branches = tagged
      // Newest first, matching how the timeline itself is ordered.
      .toSorted((a, b) => (a.sortKey > b.sortKey ? -1 : 1))
      .map((entry): TreeBranch => ({
        id: entry.id,
        label: entry.role,
        organization: entry.organization || undefined,
        dateRange: entry.dateRange,
        kind: entry.type,
        leaves: [...new Set(entry.technologies)].map((name) => ({
          name,
          alsoUsedIn: Math.max(0, (frequency.get(name) ?? 1) - 1),
        })),
        caseStudies: projects
          .filter((project) => project.careerEntryId === entry.id)
          .map((project) => project.title),
      }));

    const technologies = new Set(branches.flatMap((branch) => branch.leaves.map((l) => l.name)));

    return {
      id: lens.id,
      label: lens.label,
      description: lens.description,
      branches,
      technologyCount: technologies.size,
    };
  });

  // A lens nobody has tagged anything with is an empty branch on the diagram
  // and tells a reader nothing. Drop it rather than draw it.
  return roots.filter((root) => root.branches.length > 0);
}

/** Distinct technologies across the whole tree, for the summary line. */
export function totalTechnologies(): number {
  return new Set(ENTRIES.flatMap((entry) => entry.technologies)).size;
}
