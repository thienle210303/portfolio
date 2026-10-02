/**
 * The Journey — one section, seven acts, one pinned stage.
 *
 * Through round 17 this was a drawn tree taller than four viewports with a
 * Tree / List toggle over the same career entries, and a reader spent the
 * section stranded between a heading above and a payoff below with only a year
 * label changing. Round 18 restages it: one screen holds still (`./Stage.tsx`)
 * and time moves through it, scroll advancing the drawing rather than the
 * page. The chronological timeline and its toggle are gone; the stage's seven
 * acts (`./acts.ts`) are the chronology now, and the finished tree they build
 * is what a reader gets with JavaScript off, under reduced motion, or by
 * asking for it.
 *
 * This file is the Server Component boundary and the only thing in the
 * directory that knows it is a section. It reads the tree once, computes the
 * rail from it, carries the compatibility anchors for every retired section id
 * (`LEGACY_SECTION_IDS` in `./anchors.ts`), and hands the rest to `Stage`. The
 * per-entry `journey-entry-<id>` fragments are the same promise one level down
 * and are rendered by `Stage`, on the act that draws each entry.
 *
 * Every rail note is counted off the tree the stage draws and `careerEntries`
 * directly, so a number here cannot drift from the drawing beside it. The tree
 * excludes the nine credentials (`DEMOTED_ENTRY_IDS`) — they are one line on
 * the stage now — so everything about *the drawing* is counted from the drawn
 * branches, while the entry counts are of the whole record. (Not of what
 * `/resume` renders: that page's Experience list is `type === "work"` only, so
 * none of the thirteen non-work entries appears on it — see the note on
 * `DEMOTED_ENTRY_IDS` in `src/lib/knowledge-tree.ts`.) "Heaviest" is
 * deliberate rather than tactful: one
 * entry authored several times the technologies and impact lines of the
 * next-busiest, the drawing is visibly lopsided because of it, and a rail that
 * quietly omitted that would be hiding the one thing the shape is saying.
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
import { ACTS } from "./acts";
import { LEGACY_SECTION_IDS } from "./anchors";
import CredentialsStrip from "./CredentialsStrip";
import DrawnTree from "./DrawnTree";
import KnowledgeTreeList from "./KnowledgeTreeList";
import Stage from "./Stage";
import UnbranchedCaseStudies from "./UnbranchedCaseStudies";
import { WatchOrigin } from "./WatchOrigin";

const HEADING_ID = "tree-heading";

/** What the stage draws: the tree without the nine entries that became one
 *  credentials line. The globe's "tree-shape" plaque counts the same call. */
const DRAWN = buildDrawnTree();

/** Every leaf on the drawing: every technology and every impact line any drawn
 *  branch lists, summed — one row per authored fact. */
const LEAF_TOTAL = totalLeaves(DRAWN);

/** Distinct technologies among the drawn leaves. Not `totalTechnologies()`:
 *  that counts every entry, including the demoted ones whose technologies are
 *  no longer drawn anywhere on this stage. */
const TECHNOLOGY_TOTAL = treeTechnologies(DRAWN);

/** The drawn branch with the most to show — the entry whose own technologies
 *  and impact lines, combined, outnumber every other drawn entry's. Ties go to
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
          went: the case studies render inside the branches of the roles that
          produced them, and `#skills`/`#workshop` have no successor of their
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
          are the same promise one level down and are rendered by `Stage`, on
          the act that draws each entry. */}
      {LEGACY_SECTION_IDS.map((id) => (
        <span key={id} id={id} aria-hidden="true" className="sr-only scroll-mt-20" />
      ))}

      {/* Short on purpose — the owner wanted one line, not a manual. Both
          halves are on the record: the first job on the tree is the family
          restaurant's kitchen (`fu-of-kyoto`), and `doordash` and
          `self-taught-gap` have no end. It promises no interaction, so it holds with JS off,
          below the pin and under reduced motion alike. */}
      <SectionHeading id={HEADING_ID} lead="Started in a kitchen. Still growing.">
        What it adds up to
      </SectionHeading>

      {/* The drawing, the list and the credentials strip are built here, on
          the server, and handed to the stage as slots: none of them has a hook
          or a handler, and passing them keeps the drawing and the case-study
          prose inside its branches out of the client bundle. The stage only
          ever says which act is current.

          `[data-origin-host]` is the drawing's own relative box, and it is
          deliberately one element doing two jobs that must never come apart:
          it is what `OriginStory.tsx` overlays (`absolute inset-0`) and what
          that player walks up to with `closest()` to find the growable
          groups it conducts. `WatchOrigin` is its sibling inside it — the
          always-loaded half of the origin story, which `import()`s the
          ~1,400-line player only on press, so the show costs the initial
          page nothing until somebody asks for it. The stylesheet shows the
          button only on the finished tree; see `WatchOrigin.tsx`.

          `hidden lg:block` is on the wrapper rather than on the drawing, so
          below 1024px — where the list is the presentation and there is no
          drawing for a story to grow — the button is not in the document's
          layout either. Both halves of the figure appear together. */}
      <Stage
        acts={ACTS}
        drawing={
          <div data-origin-host="" className="relative hidden lg:block">
            <DrawnTree tree={DRAWN} />
            <WatchOrigin />
          </div>
        }
        list={<KnowledgeTreeList tree={DRAWN} className="mt-6 lg:hidden" />}
        credentials={<CredentialsStrip className="mt-8" />}
      >
        <UnbranchedCaseStudies />
      </Stage>
    </Section>
  );
}
