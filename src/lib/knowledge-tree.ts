import { careerEntries, projects, resumeLenses } from "@/content/portfolio";
import type { CareerEntry, ResumeLensId } from "@/types/portfolio";

/**
 * The career tree: branches are the career, in order; leaves are what
 * happened there.
 *
 * trunk         Thien himself
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
 * Round 12 retired that line along with the lens branches it named, and round
 * 18 retired the root labels themselves (`RootLabels.tsx`, never mounted by
 * the pinned stage), so nothing draws a skill category on the tree at all.
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
  /** The ids of every other branch that was running at the same time. The
   *  stage draws these side by side rather than stacked. */
  readonly concurrentWith: readonly string[];
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
        concurrentWith: concurrentWith(entry.id),
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
      // Newest first — the order the deleted timeline used. Nothing reads the
      // order now: `HeroAbout.tsx` counts each lens's branches, it does not
      // list them.
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
        concurrentWith: concurrentWith(entry.id),
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
 * The entries that stop being branches in round 18 and become one credentials
 * line on the Journey's stage.
 *
 * ## Why: eleven limbs fit one screen and twenty do not
 *
 * That is the whole reason, and it is a reason about space rather than about
 * worth. The stage pins one viewport and grows a tree inside it; twenty limbs
 * at that height are a thicket in which no single branch can be read, and the
 * drawing stops being an argument and becomes texture. Eleven fit. So nine
 * entries render as `CredentialsStrip`'s one line each — `role · organization ·
 * dateRange`, plus a repository link where the entry authored one — instead of
 * as branches.
 *
 * An earlier version of this comment said the nine carry nothing. That was
 * false, and the correction is the reason the real reason is written down here.
 *
 * ## What the demotion costs
 *
 * Checked against `src/content/portfolio.ts` entry by entry on 2026-10-01.
 * **Five of the nine carry authored content** beyond a title, an organisation
 * and a date:
 *
 *   - `usc-degree` — two `impact` lines and a `learned`
 *   - `cockyhacks` — a `built` line, an `impact` line, three technologies
 *   - `code-to-give` — a `built` line, an `impact` line, four technologies
 *   - `capstone` — a `built` line, four technologies
 *   - `llm-classifier` — a `built` line, an `impact` line, five technologies
 *
 * A sixth, `acm-webmaster`, carries one `responsibilities` line. Only
 * `graduation`, `magellan` and `deans-list` are bare in the way the old comment
 * claimed of all nine — and even they carry a `context` sentence.
 *
 * So real text leaves the drawing: those `impact` lines and technologies were
 * leaves, and they are not drawn any more. **`llm-classifier` is the one entry
 * whose authored `built` and `impact` text is now rendered nowhere on the
 * site** — it has no project record, so no case study carries it; no globe
 * plaque quotes it; and `/resume` never showed it (see below). Thien was shown
 * this and accepted it explicitly: it is a deliberate cost of fitting the
 * drawing on one screen, not an oversight. `capstone`, `cockyhacks` and
 * `code-to-give` lose their `built` lines the same way. `capstone` at least
 * keeps its project (`automotive-genai`) as a case study under the stage, and
 * the two hackathons keep their repository links on the strip — but links
 * rendered is not the same claim as content rendered, and this comment is not
 * using the one to excuse the other.
 *
 * `impact`, `learned` and `context` are still indexed for the site's own chat
 * (`careerIndexable` in `src/lib/answer-sources.ts`), so that text stays
 * answerable where it is no longer drawn. `built` and `responsibilities` are
 * indexed nowhere.
 *
 * ## What `/resume` does and does not do
 *
 * It does **not** render these nine. Its Experience list is
 * `careerEntries.filter(type === "work")`, and all nine are `milestone` or
 * `learning`. The degree, the awards and the webmaster year reach that page
 * through the separately authored `education[0].details` and `achievements`
 * records, which state the same facts in their own words — not through these
 * entries. An earlier version of this comment said `/resume` "still shows them
 * in full"; it never did.
 *
 * Nothing is deleted from the content layer: `careerEntries` is unchanged, the
 * globe still quotes four of these entries' `role` fields on its plaques, and
 * the chat still indexes all nine. Only the drawing stops giving each a limb.
 *
 * ## Why it lives here
 *
 * In `lib/` rather than beside the strip that renders them, because the globe's
 * "tree-shape" plaque has to count the same branches the Journey draws, and
 * nothing under `lib/` may import from `sections/`. It is a set, not a
 * sequence: the strip sorts by `sortKey`, the same way the tree does.
 */
export const DEMOTED_ENTRY_IDS = [
  "usc-degree",
  "graduation",
  "cockyhacks",
  "code-to-give",
  "capstone",
  "llm-classifier",
  "magellan",
  "acm-webmaster",
  "deans-list",
] as const;

const DEMOTED: ReadonlySet<string> = new Set(DEMOTED_ENTRY_IDS);

/** Whether an entry is a credential rather than a branch. Takes a plain
 *  `string` so a caller never needs a cast to ask the question. */
export function isDemotedEntry(entryId: string): boolean {
  return DEMOTED.has(entryId);
}

/**
 * The tree the Journey actually draws: `buildCareerTree()` without the nine
 * demoted entries. Everything that says how many branches, leaves or
 * technologies there are on the drawing — the section's rail, the globe's
 * "tree-shape" plaque — counts this, so the numbers a visitor reads on one page
 * cannot disagree.
 */
export function buildDrawnTree(): readonly TreeBranch[] {
  return buildCareerTree().filter((branch) => !isDemotedEntry(branch.id));
}

/** Distinct technology leaves across a set of branches — the drawn tree's own
 *  count, where `totalTechnologies()` counts every entry. */
export function treeTechnologies(branches: readonly TreeBranch[]): number {
  return new Set(
    branches.flatMap((branch) =>
      branch.leaves.filter((leaf) => leaf.kind === "technology").map((leaf) => leaf.text),
    ),
  ).size;
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


/* -------------------------------------------------------------------------- */
/* Overlap — which roles ran at the same time                                  */
/* -------------------------------------------------------------------------- */

/** An entry's span as two comparable `YYYY-MM` keys. A milestone is a point,
 *  so its end is its start. An open-ended role runs to a sentinel that sorts
 *  after every real key. */
function span(entry: CareerEntry): { start: string; end: string } {
  const start = entry.sortKey.slice(0, 7);
  return { start, end: entry.endSortKey ?? (entry.type === "milestone" ? start : "9999-12") };
}

/**
 * Which entries were running at the same time as which. Two entries overlap
 * when neither one's span finishes before the other's begins — the standard
 * interval test, and deliberately inclusive: a role that ended the same month
 * another started overlapped by a month. That holds for months the owner
 * authored; where an entry's `dateRange` gives only a year, its `endSortKey`
 * month is a best reading, and a boundary touch on it is only as good as that
 * reading.
 *
 * Overlap is not containment. `usc-degree` runs 2021 to 2025 and holds every
 * role in that window inside it, so it reports all of them. It is a spine the
 * others happen within rather than a sibling running alongside them, and a
 * consumer drawing concurrency should treat it differently from, say,
 * Schaeffler and Wordification, which genuinely ran side by side.
 *
 * Milestones are excluded: a point in time technically overlaps whatever it
 * lands inside, and reporting that "Dean's List overlapped DoorDash" is noise
 * rather than information.
 */
export function concurrentWith(entryId: string): readonly string[] {
  const subject = ENTRIES.find((entry) => entry.id === entryId);
  if (!subject || subject.type === "milestone") return [];
  const own = span(subject);
  return ENTRIES
    .filter((other) => other.id !== entryId && other.type !== "milestone")
    .filter((other) => {
      const theirs = span(other);
      return own.start <= theirs.end && theirs.start <= own.end;
    })
    .map((other) => other.id);
}
