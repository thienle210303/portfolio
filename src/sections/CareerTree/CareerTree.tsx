/**
 * The Journey — highlights, the drawn tree, and the timeline, stacked.
 *
 * Round 18 made this a pinned stage that scrolled seven acts past a sticky
 * drawing; round 20 retired it. The section is now three blocks in reading
 * order: the highlight cards (`JourneyHighlights`), the drawing growing in its
 * box (`TreeBox` around `DrawnTree`, >=1024px only), and the timeline (`KnowledgeTreeList`, every width, one row
 * open at a time), then the credentials line and the case studies whose entry
 * is not a branch.
 *
 * This file is the Server Component boundary and the only thing in the
 * directory that knows it is a section. It reads the tree once, computes the
 * rail from it, and carries the compatibility anchors for every retired
 * section id (`LEGACY_SECTION_IDS` in `./anchors.ts`). The per-entry
 * `journey-entry-<id>` fragments are the same promise one level down: the
 * timeline's rows carry them for drawn entries, and the credentials line's
 * items for the nine demoted ones.
 *
 * Every rail note is counted off the drawn tree and `careerEntries` directly,
 * so a number here cannot drift from the drawing beside it. The tree excludes
 * the nine credentials (`DEMOTED_ENTRY_IDS`) — they are one line now — so
 * everything about *the drawing* is counted from the drawn branches, while the
 * entry counts are of the whole record. (Not of what `/resume` renders: that
 * page's Experience list is `type === "work"` only, so none of the thirteen
 * non-work entries appears on it — see the note on `DEMOTED_ENTRY_IDS` in
 * `src/lib/knowledge-tree.ts`.) "Heaviest" is deliberate rather than tactful:
 * one entry authored the most technologies, the drawing is visibly lopsided
 * because of it, and a rail that quietly omitted that would be hiding the one
 * thing the shape is saying.
 */
import { Section, type RailNote } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { careerEntries } from "@/content/portfolio";
import {
  buildDrawnTree,
  DEMOTED_ENTRY_IDS,
  totalLeaves,
  treeTechnologies,
} from "@/lib/knowledge-tree";
import { LEGACY_SECTION_IDS } from "./anchors";
import CredentialsStrip from "./CredentialsStrip";
import DrawnTree from "./DrawnTree";
import JourneyHighlights from "./JourneyHighlights";
import KnowledgeTreeList from "./KnowledgeTreeList";
import UnbranchedCaseStudies from "./UnbranchedCaseStudies";
import TreeBox, { SeeHowItGrows } from "./TreeBox";

const HEADING_ID = "tree-heading";

/** What the Journey draws: the tree without the nine entries that became one
 *  credentials line. The companion's facts count the same call. */
const DRAWN = buildDrawnTree();

/** Every leaf on the drawing: every technology any drawn branch lists, summed
 *  — one row per authored fact. Impact lines are not leaves. */
const LEAF_TOTAL = totalLeaves(DRAWN);

/** Distinct technologies among the drawn leaves. Not `totalTechnologies()`:
 *  that counts every entry, including the demoted ones whose technologies are
 *  no longer drawn anywhere. */
const TECHNOLOGY_TOTAL = treeTechnologies(DRAWN);

/** The drawn branch with the most leaves — the entry whose own technologies
 *  outnumber every other drawn entry's. Ties go to
 *  the first one written, which is the oldest (`DRAWN` is chronological,
 *  oldest first). */
const HEAVIEST = DRAWN.reduce<(typeof DRAWN)[number] | undefined>(
  (largest, branch) => (largest && largest.leaves.length >= branch.leaves.length ? largest : branch),
  undefined,
);

const countOf = (type: (typeof careerEntries)[number]["type"]) =>
  careerEntries.filter((entry) => entry.type === type).length;

const RAIL: readonly RailNote[] = [
  { term: "Entries", detail: `${careerEntries.length}` },
  {
    term: "Split",
    detail: `${countOf("work")} work · ${countOf("learning")} learning · ${countOf("milestone")} milestones`,
  },
  {
    term: "Branches",
    detail: `${DRAWN.length} drawn · ${DEMOTED_ENTRY_IDS.length} as credentials`,
  },
  { term: "Leaves", detail: `${LEAF_TOTAL} authored facts` },
  { term: "Technologies", detail: `${TECHNOLOGY_TOTAL} distinct` },
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
      {/* Every retired section id, kept resolvable. The nav used to point at
          `#journey`, `#work`, `#skills` and `#workshop`; all four are in
          bookmarks, possibly in a shared résumé PDF, and possibly indexed, and
          nothing forces an external link to have noticed its target moved.
          They land here because this section is where the content they named
          went: the case studies render inside the timeline rows of the roles
          that produced them, and `#skills`/`#workshop` have no successor of their
          own — the Journey is the nearest honest answer to "show me his work"
          for a visitor arriving on a dead id, which beats a silent no-op.

          Real, zero-size elements rather than a client-side hash rewrite: this
          way the landing works with no JavaScript at all, which
          `e2e/legacy-anchors.spec.ts` proves against the server-rendered HTML.
          `scroll-mt-20` matches the section's own offset (see `Section`'s
          `scroll-mt-20`), so arriving via any of these ids clears the sticky
          header by the same margin. `aria-hidden` because they carry no
          content: they are a destination, not a thing to read.

          Nothing the site itself renders links to any of them — these exist
          for inbound links only. The per-entry `journey-entry-<id>` fragments
          are the same promise one level down, carried by the timeline's rows
          and the credentials line. */}
      {LEGACY_SECTION_IDS.map((id) => (
        <span key={id} id={id} aria-hidden="true" className="sr-only scroll-mt-20" />
      ))}

      {/* Short on purpose — the owner wanted one line, not a manual. Both
          halves are on the record: the first job on the tree is the family
          restaurant's kitchen (`fu-of-kyoto`), and `doordash` and
          `self-taught-gap` have no end. It promises no interaction, so it holds with JS off
          and under reduced motion alike. */}
      <SectionHeading id={HEADING_ID} lead="Started in a kitchen. Still growing.">
        What it adds up to
      </SectionHeading>
      <SeeHowItGrows className="mt-4 -ml-2" />

      <JourneyHighlights className="mt-8" />

      {/* The drawing grows in its own box (`TreeBox.tsx`): once on sight, and
          again on "See how it grows" above. `hidden lg:block` is on the box, so
          below 1024px — where the timeline alone tells the story — neither it
          nor the button is in the layout. */}
      <TreeBox className="mt-12">
        <DrawnTree tree={DRAWN} />
      </TreeBox>

      <KnowledgeTreeList tree={DRAWN} className="mt-12" />

      <CredentialsStrip className="mt-12" />

      <UnbranchedCaseStudies />
    </Section>
  );
}
