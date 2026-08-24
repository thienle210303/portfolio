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
 * Every rail note is counted off `buildKnowledgeTree()` and `careerEntries`
 * directly — the same values each face renders from, so a number here cannot
 * drift from the drawing or the list beside it. "Heaviest" is deliberate
 * rather than tactful: twelve of the twenty-five leaves hang off one branch,
 * the drawing is visibly lopsided because of it, and a rail that quietly
 * omitted that would be hiding the one thing the shape is saying.
 */
import { Section, type RailNote } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { careerEntries, skillCategories } from "@/content/portfolio";
import { buildKnowledgeTree, careerYearSpan, totalTechnologies } from "@/lib/knowledge-tree";
import KnowledgeTree from "./KnowledgeTree";
import Timeline from "./Timeline";
import { ViewToggle } from "./ViewToggle";

const HEADING_ID = "tree-heading";

const TREE = buildKnowledgeTree();

/** Every leaf on the drawing: one per (lens, career entry) pair. Larger than
 *  the number of career entries, because an entry tagged with three lenses
 *  legitimately hangs off three branches. */
const LEAF_TOTAL = TREE.reduce((total, lens) => total + lens.branches.length, 0);

/** The branch carrying the most places. Ties go to the first one written,
 *  which is the order `resumeLenses` already puts them in. */
const HEAVIEST = TREE.reduce<(typeof TREE)[number] | undefined>(
  (largest, lens) => (largest && largest.branches.length >= lens.branches.length ? largest : lens),
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
  { term: "Branches", detail: `${TREE.length} kinds of work` },
  { term: "Leaves", detail: `${LEAF_TOTAL} places` },
  { term: "Technologies", detail: `${totalTechnologies()} distinct` },
  { term: "Roots", detail: `${skillCategories.length} skill groups` },
  { term: "Rings", detail: `${YEAR_SPAN.years} — one per year since ${YEAR_SPAN.firstYear}` },
  ...(HEAVIEST
    ? [
        {
          term: "Heaviest",
          detail: `${HEAVIEST.label} · ${HEAVIEST.branches.length} of ${LEAF_TOTAL}`,
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
        lead="One root, one branch per kind of work, and every place the work actually happened hanging off the branch it was tagged with — by hand, never guessed. Open any of them to read what it involved, or switch to the list below for the same record in order."
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
