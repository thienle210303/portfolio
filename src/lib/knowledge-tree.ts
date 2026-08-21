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
 *
 * `skillCategories[].lenses` is a *second*, independent authored edge set —
 * category → lens, sitting beside the entry → lens edges above. It exists so
 * the root system can honestly say what each skill category feeds ("Languages
 * · feeds Engineering") without joining skill names against technology
 * strings, which is the exact fuzzy match the rest of this file refuses to
 * do. The two edge sets are never merged: an entry's lenses say what kind of
 * work it was; a category's lenses say what kind of work that skill group
 * shows up in. Nothing here infers one from the other, and a category with no
 * lens (there is one — see `RootLabels.tsx`) is left with an honestly empty
 * "feeds" line rather than a guessed one.
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

/** A case study attached to a branch, carrying enough to link straight at its
 *  own article rather than at the section that holds all of them. */
export interface TreeCaseStudy {
  readonly id: string;
  readonly title: string;
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
  /** The year `dateRange` starts in, read off the entry's own `sortKey`
   *  rather than parsed from `dateRange` prose — `sortKey` is `YYYY-MM[-x]`
   *  by construction, so this is exact where scraping "October 2025 —
   *  Present" would not be. Used only to decide where a year marker goes
   *  down a bough; `dateRange` stays the fact a reader actually sees. */
  readonly startYear: number;
  readonly leaves: readonly TreeLeaf[];
  /** Case studies attached to this role. */
  readonly caseStudies: readonly TreeCaseStudy[];
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
        startYear: Number(entry.sortKey.slice(0, 4)),
        leaves: [...new Set(entry.technologies)].map((name) => ({
          name,
          alsoUsedIn: Math.max(0, (frequency.get(name) ?? 1) - 1),
        })),
        caseStudies: projects
          .filter((project) => project.careerEntryId === entry.id)
          .map((project) => ({ id: project.id, title: project.title })),
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

/**
 * The career's span, in whole years — first and last `startYear` across every
 * entry that appears on the tree (i.e. is tagged with at least one lens), and
 * the count of years that spans inclusively. `2021` through `2025` is five
 * years, not four: a growth ring is drawn for each year the career has been
 * running, including the one it started in.
 *
 * Read off `sortKey`, never `Date` — the whole drawing is server-rendered
 * once at build time, and `Date` would make "years since" quietly drift stale
 * between builds without a single line of content changing.
 */
export function careerYearSpan(): { firstYear: number; lastYear: number; years: number } {
  const years = ENTRIES.filter((entry) => entry.lenses.length > 0).map((entry) =>
    Number(entry.sortKey.slice(0, 4)),
  );
  const firstYear = Math.min(...years);
  const lastYear = Math.max(...years);
  return { firstYear, lastYear, years: lastYear - firstYear + 1 };
}

/**
 * A CSS-token-safe slug for a free-text technology name: lower-cased,
 * anything that is not `a-z0-9` collapsed to a single `-`, and no leading or
 * trailing `-`. Used only as a DOM attribute value (`data-tree-tech`,
 * `data-tree-techs`) for the cross-highlight island to match against — never
 * shown to a reader, so it does not need to be pretty, only stable and
 * collision-free across the real technology list.
 *
 * Uniqueness is a property of the actual content, not of this function in
 * isolation — "C#" and "C/C++" both slug to something starting "c" but land
 * on different strings ("c" and "c-c") because the punctuation each collapses
 * differently. `tests/lib/knowledge-tree.test.ts` proves there is no
 * collision across the real list rather than asserting it in the abstract.
 */
export function techSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
