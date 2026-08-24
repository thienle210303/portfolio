/**
 * The career tree — one section, two faces, after Work and Skills.
 *
 * Through round 9 this was two sections: Journey (a filterable chronological
 * timeline) and, after Skills, the career tree (the same career entries
 * regrouped by kind of work rather than by date). Both read the same
 * `careerEntries`; the only thing that differed was the axis. Round 10 merges
 * them: one `<section id="tree">` that still answers `#journey` and every
 * per-entry fragment the old Journey section rendered (`journey-entry-<id>`,
 * see `./anchors.ts`), with a "Tree / List" toggle (`./ViewToggle.tsx`)
 * choosing which axis is on screen. Desktop defaults to the drawn tree;
 * mobile — where the drawn presentation has no room to draw in and already
 * fell back to a list of its own (`KnowledgeTreeList`) — defaults instead to
 * the chronological list, because a familiar reading order beats a second,
 * unfamiliar one on a screen this narrow. See `./view-state.ts` for exactly
 * how that default, and a visitor's own override of it, are implemented.
 *
 * This file is the Server Component boundary and the only thing in the
 * directory that knows it is a section. It reads both the tree and the
 * career entries once, computes the rail from both, and hands each face to
 * its own component — `KnowledgeTree` for the drawing, `Timeline` (moved in
 * from the old Journey section, filters intact) for the chronology.
 *
 * Every rail note is counted off `buildCareerTree()` and `careerEntries`
 * directly — the same values each face renders from, so a number here cannot
 * drift from the drawing or the list beside it. "Heaviest" is deliberate
 * rather than tactful: one entry authored several times the technologies and
 * impact lines of the next-busiest, the drawing is visibly lopsided because
 * of it, and a rail that quietly omitted that would be hiding the one thing
 * the shape is saying.
 *
 * Round 12 inverted the tree itself — branches are career entries now, in
 * chronological order up the trunk, and leaves are what each one authored
 * about itself (see `src/lib/knowledge-tree.ts`) — but this file's own job
 * did not change: read the built tree once, compute the rail from it, hand
 * it to `KnowledgeTree`.
 */
import { Section, type RailNote } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { careerEntries, skillCategories } from "@/content/portfolio";
import { buildCareerTree, careerYearSpan, totalTechnologies } from "@/lib/knowledge-tree";
import KnowledgeTree from "./KnowledgeTree";
import Timeline from "./Timeline";
import { ViewToggle } from "./ViewToggle";

const HEADING_ID = "tree-heading";

const TREE = buildCareerTree();

/** Every leaf on the drawing: every technology and every impact line any
 *  branch lists, summed. Round 12 inverted what a branch and a leaf are —
 *  see `src/lib/knowledge-tree.ts` — so this is no longer "one row per
 *  (lens, career entry) pair"; it is "one row per authored fact". */
const LEAF_TOTAL = TREE.reduce((total, branch) => total + branch.leaves.length, 0);

/** The branch with the most to show — the entry whose own technologies and
 *  impact lines, combined, outnumber every other entry's. Ties go to the
 *  first one written, which since round 12 is the oldest (`TREE` is
 *  chronological, oldest first). */
const HEAVIEST = TREE.reduce<(typeof TREE)[number] | undefined>(
  (largest, branch) => (largest && largest.leaves.length >= branch.leaves.length ? largest : branch),
  undefined,
);

const YEAR_SPAN = careerYearSpan();

const countOf = (type: (typeof careerEntries)[number]["type"]) =>
  careerEntries.filter((entry) => entry.type === type).length;

const RAIL: readonly RailNote[] = [
  { term: "Entries", detail: `${careerEntries.length}` },
  {
    term: "Split",
    detail: `${countOf("work")} work · ${countOf("learning")} learning · ${countOf("milestone")} milestones`,
  },
  { term: "Branches", detail: `${TREE.length} career entries` },
  { term: "Leaves", detail: `${LEAF_TOTAL} authored facts` },
  { term: "Technologies", detail: `${totalTechnologies()} distinct` },
  { term: "Roots", detail: `${skillCategories.length} skill groups` },
  { term: "Rings", detail: `${YEAR_SPAN.years} — one per year since ${YEAR_SPAN.firstYear}` },
  ...(HEAVIEST
    ? [
        {
          term: "Heaviest",
          detail: `${HEAVIEST.label} · ${HEAVIEST.leaves.length} of ${LEAF_TOTAL}`,
        },
      ]
    : []),
];

export default function CareerTree() {
  return (
    <Section id="tree" labelledBy={HEADING_ID} eyebrow="Career tree" tone="base" rail={RAIL}>
      {/* Every old `#journey` link and bookmark — the nav used to point here,
          and nothing forces an external link to have noticed it moved. A
          real, zero-size element rather than a client-side hash rewrite: this
          way the landing works with no JavaScript at all, the same as the
          per-entry fragments below it. `scroll-mt-20` matches the section's
          own offset (see `Section`'s `scroll-mt-20`), so arriving via either
          id clears the sticky header by the same margin. */}
      <span id="journey" aria-hidden="true" className="sr-only scroll-mt-20" />

      <SectionHeading
        id={HEADING_ID}
        lead="One trunk, one branch per role, degree or milestone — in the order it happened — and every leaf hanging off it something authored on that entry: a technology used, or an impact made. Open any branch to read what it involved, or switch to the list below for the same record in order."
      >
        What it adds up to
      </SectionHeading>

      <ViewToggle className="mt-8" />

      {/* The drawn tree, shown by default at >=1024px. Below that its own
          internal switch (KnowledgeTree.tsx) already falls back to an
          indented list — see that file for why two presentations of the same
          data live inside this one face. */}
      <div data-tree-view-panel="tree" className="hidden lg:block">
        <KnowledgeTree tree={TREE} className="mt-10 md:mt-12" />
      </div>

      {/* The chronological timeline — the old Journey section's own content,
          moved in with its filters intact. Shown by default below 1024px. */}
      <div data-tree-view-panel="list" className="mt-10 block md:mt-12 lg:hidden">
        <Timeline entries={careerEntries} />
      </div>
    </Section>
  );
}
