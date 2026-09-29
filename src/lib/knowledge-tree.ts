import { careerEntries, projects, resumeLenses } from "@/content/portfolio";
import type { CareerEntry, ResumeLensId } from "@/types/portfolio";

/**
 * The career tree: branches are the timeline, leaves are what happened there.
 *
 * root (trunk)  Thien himself
 * branch        one career entry — a role, a degree, a milestone — placed up
 *               the trunk in chronological order, oldest lowest, each entry
 *               exactly once
 * leaf          what that entry authored about itself: a technology it lists,
 *               or an impact line it claims
 *
 * Every edge is authored, never inferred. `technologies` and `impact` are
 * fields a human wrote on that entry in `src/content/portfolio.ts`; a leaf
 * appearing here means someone deliberately said so. That constraint is why
 * this file does not join `skillCategories.skills` against `technologies` —
 * that join was measured before this was written: of 38 skills, only 17
 * match a technology string exactly. The rest are near-misses across two
 * vocabularies — "React" against "JavaScript/React", "Flask" against
 * "Python/Flask", "API analysis" against "HTTP / API analysis". A fuzzy join
 * would invent edges nobody authored; an exact one would render "React —
 * used nowhere", which is false. Both are worse than not drawing the edge,
 * on a site whose entire claim is that it does not make things up.
 *
 * ## Round 12 — the tree inverts
 *
 * Through round 11 a branch was a resume lens (five of them: "Software
 * engineering", "Automation", …) and a leaf was the career entry tagged with
 * it — which meant one entry with several lenses hung off several branches
 * at once, duplicated whole. DoorDash alone hung off all five. `buildCareerTree`
 * below is the inversion the owner asked for: branches are the entries
 * themselves, each drawn once, and leaves are the authored facts about that
 * one entry. The duplication is structurally gone because nothing is grouped
 * by lens any more.
 *
 * `buildKnowledgeTree` — the *old* shape — stays in this file, unchanged in
 * behaviour, purely because `src/sections/Hero/HeroAbout.tsx` (owned by a
 * different work package this round) still calls it for its "Where it shows
 * up" list, which legitimately wants a *different* fact: how many entries
 * carry each lens, as proof the work spans more than one kind of problem.
 * That is still an authored edge (`entry.lenses`) and still true regardless
 * of how the tree itself is drawn, so it survives untouched. Do not remove
 * it or change its return shape without updating that file too.
 *
 * `skillCategories[].lenses` is a *third*, independent authored edge set —
 * category → lens — that fed the roots' "Feeds …" line through round 11.
 * Round 12 retires that line along with the lens branches it named: see
 * `RootLabels.tsx` for why the roots are label-only now, with no line drawn
 * from one of them to anything above ground.
 *
 * Adding a role, or listing a new technology or impact line in
 * `src/content/portfolio.ts`, changes this tree with no code change here.
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

/** A technology leaf carries how many *other* branches also list it, so a
 *  reader can see a skill running through more than one place. An impact
 *  leaf carries `undefined` there — it is that entry's own prose, not a
 *  fact to count matches of against every other entry. */
export type TreeLeafKind = "technology" | "impact";

export interface TreeLeaf {
  readonly kind: TreeLeafKind;
  /** A technology name, or one impact sentence — verbatim from the entry
   *  that authored it. */
  readonly text: string;
  /** Technology leaves only: how many other branches also list this same
   *  technology. `undefined` for impact leaves. */
  readonly alsoUsedIn: number | undefined;
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
   *  Present" would not be. */
  readonly startYear: number;
  /** This entry's own `technologies` and `impact`, both authored, in that
   *  order — never merged with or inferred from anything else. */
  readonly leaves: readonly TreeLeaf[];
  /** Case studies built in this role. */
  readonly caseStudies: readonly TreeCaseStudy[];
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

function caseStudiesFor(entryId: string): readonly TreeCaseStudy[] {
  return projects
    .filter((project) => project.careerEntryId === entryId)
    .map((project) => ({ id: project.id, title: project.title }));
}

/**
 * The tree the drawing itself renders from: one branch per career entry, up
 * the trunk in chronological order — oldest first in this array, which is
 * what "oldest lowest" means once `DrawnTree.tsx` lays branches out from the
 * ground up. Every entry appears exactly once, whether or not it carries a
 * lens — there is no lens filter left to drop one.
 */
export function buildCareerTree(): readonly TreeBranch[] {
  const frequency = technologyFrequency();

  return ENTRIES
    // Oldest first — "up the trunk, oldest lowest".
    .toSorted((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0))
    .map((entry): TreeBranch => {
      const technologyLeaves: TreeLeaf[] = [...new Set(entry.technologies)].map((name) => ({
        kind: "technology",
        text: name,
        alsoUsedIn: Math.max(0, (frequency.get(name) ?? 1) - 1),
      }));
      const impactLeaves: TreeLeaf[] = [...new Set(entry.impact)].map((text) => ({
        kind: "impact",
        text,
        alsoUsedIn: undefined,
      }));

      return {
        id: entry.id,
        label: entry.role,
        organization: entry.organization || undefined,
        dateRange: entry.dateRange,
        kind: entry.type,
        startYear: Number(entry.sortKey.slice(0, 4)),
        leaves: [...technologyLeaves, ...impactLeaves],
        caseStudies: caseStudiesFor(entry.id),
      };
    });
}

/* -------------------------------------------------------------------------- */
/* Legacy shape — HeroAbout.tsx only. See the file banner.                    */
/* -------------------------------------------------------------------------- */

export interface TreeRoot {
  readonly id: ResumeLensId;
  readonly label: string;
  readonly description: string;
  readonly branches: readonly TreeBranch[];
  /** Distinct technologies across every branch — the headline count. */
  readonly technologyCount: number;
}

/**
 * The tree's pre-round-12 shape: one root per resume lens, its branches the
 * career entries tagged with it. Kept only for `HeroAbout.tsx` — see the file
 * banner. Nothing in `src/sections/CareerTree` reads this any more; the
 * drawing itself calls `buildCareerTree` above.
 */
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
          kind: "technology",
          text: name,
          alsoUsedIn: Math.max(0, (frequency.get(name) ?? 1) - 1),
        })),
        caseStudies: caseStudiesFor(entry.id),
      }));

    const technologies = new Set(branches.flatMap((branch) => branch.leaves.map((l) => l.text)));

    return {
      id: lens.id,
      label: lens.label,
      description: lens.description,
      branches,
      technologyCount: technologies.size,
    };
  });

  // A lens nobody has tagged anything with is empty and tells HeroAbout
  // nothing. Drop it rather than list it.
  return roots.filter((root) => root.branches.length > 0);
}

/** Distinct technologies across the whole tree, for the summary line. */
export function totalTechnologies(): number {
  return new Set(ENTRIES.flatMap((entry) => entry.technologies)).size;
}

/**
 * Every leaf across a set of branches: every technology and every impact
 * line any of them lists, summed. Takes the built tree rather than building
 * its own — `CareerTree.tsx`'s rail and `src/lib/worlds.ts`'s Plants-world
 * plaque each already have one in hand, and this was previously written out
 * as the same `reduce` in both places.
 */
export function totalLeaves(branches: readonly TreeBranch[]): number {
  return branches.reduce((total, branch) => total + branch.leaves.length, 0);
}

/**
 * The career's span, in whole years — first and last `startYear` across
 * every career entry, and the count of years that spans inclusively. `2021`
 * through `2025` is five years, not four: a growth ring is drawn for each
 * year the career has been running, including the one it started in.
 *
 * Round 12: every entry is now a branch (there is no lens filter left to
 * apply), so this spans all of `careerEntries` rather than only the
 * lens-tagged subset it used to.
 *
 * Read off `sortKey`, never `Date` — the whole drawing is server-rendered
 * once at build time, and `Date` would make "years since" quietly drift stale
 * between builds without a single line of content changing.
 */
export function careerYearSpan(): { firstYear: number; lastYear: number; years: number } {
  const years = ENTRIES.map((entry) => Number(entry.sortKey.slice(0, 4)));
  const firstYear = Math.min(...years);
  const lastYear = Math.max(...years);
  return { firstYear, lastYear, years: lastYear - firstYear + 1 };
}

/**
 * The caption the drawing puts under the one shoot that never resolves into a
 * leaf. It lived as a JSX literal in two components (`DrawnTree.tsx` and
 * `list-ink.tsx`) and is now also quoted by the globe's Plants world, which
 * makes three — one too many for a string to be written down three times.
 */
export function stillGrowingCaption(): string {
  return `still growing · ${careerYearSpan().lastYear}`;
}

/**
 * A CSS-token-safe slug for a free-text technology name: lower-cased,
 * anything that is not `a-z0-9` collapsed to a single `-`, and no leading or
 * trailing `-`. Used only as a DOM attribute value (`data-tree-tech`) for the
 * cross-highlight island to match against — never shown to a reader, so it
 * does not need to be pretty, only stable and collision-free across the real
 * technology list.
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
