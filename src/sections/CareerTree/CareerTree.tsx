/**
 * The career tree — its own chapter, after Work → Journey → Skills.
 *
 * It used to render inside Career Journey, below the timeline. It is the
 * synthesis of the three sections before it and it is the largest single
 * figure on the page, so it now gets the frame the others get: a `Section`
 * with its own id, eyebrow, `<h2>` and margin rail. Journey keeps the
 * timeline and answers "when"; this answers "what does it add up to".
 *
 * This file is the Server Component boundary and the only thing in the
 * directory that knows it is a section. It reads the tree once, computes the
 * rail from it, and hands the drawing to `KnowledgeTree`.
 *
 * Every rail note is counted off `buildKnowledgeTree()` — the same call the
 * figure itself renders from, so a number here cannot drift from the drawing
 * beside it. "Heaviest" is deliberate rather than tactful: twelve of the
 * twenty-five leaves hang off one branch, the drawing is visibly lopsided
 * because of it, and a rail that quietly omitted that would be hiding the one
 * thing the shape is saying.
 */
import { Section, type RailNote } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { skillCategories } from "@/content/portfolio";
import { buildKnowledgeTree, totalTechnologies } from "@/lib/knowledge-tree";
import KnowledgeTree from "./KnowledgeTree";
import { CROSS_LINK_CLASS } from "./cross-link";

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

const RAIL: readonly RailNote[] = [
  { term: "Branches", detail: `${TREE.length} kinds of work` },
  { term: "Leaves", detail: `${LEAF_TOTAL} places` },
  { term: "Technologies", detail: `${totalTechnologies()} distinct` },
  { term: "Roots", detail: `${skillCategories.length} skill groups` },
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
      <SectionHeading
        id={HEADING_ID}
        lead="One root, one branch per kind of work, and every place the work actually happened hanging off the branch it was tagged with — by hand, never guessed. Open any of them to read what it involved."
      >
        What it adds up to
      </SectionHeading>

      {/* The one link back to the section these entries come from. The tree
          restates none of the timeline: it regroups it. */}
      <p className="mt-4">
        <a href="#journey" className={CROSS_LINK_CLASS}>
          The timeline this is built from — Journey
        </a>
      </p>

      <KnowledgeTree tree={TREE} className="mt-10 md:mt-12" />
    </Section>
  );
}
