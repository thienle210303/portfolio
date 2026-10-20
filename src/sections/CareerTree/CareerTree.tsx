/**
 * The Journey — the live oak, then the drawn tree, then the timeline.
 *
 * Round 21 (phase 4) opens it with the board (NatJourney): "The work, as it
 * grew." over a live oak whose long limb carries the highlight tags
 * (`HangingTags`), a Hội An lantern lit at night, rice at the trunk, the
 * stool's still life, and "Watch it grow", which plays the drawing growing in
 * its box (`TreeBox` around `DrawnTree`, >=1024px only). Below the stage come
 * the timeline (`KnowledgeTreeList`, every width, one row open at a time), the
 * credentials line and the case studies whose entry is not a branch.
 *
 * From 1280 the stage is the board: its pieces stand in a 1440×900 frame whose
 * left edge is `--fx`, centred, or pulled left so the last tag (board right
 * 1408) stays 16px inside the viewport. Below 1280 the crown runs across the
 * top and the tags hang in one column from a branch at the right edge. One
 * DOM for both; CSS only.
 *
 * This file is the Server Component boundary and the only thing in the
 * directory that knows it is a section. It carries the compatibility anchors
 * for every retired section id (`LEGACY_SECTION_IDS` in `./anchors.ts`). The
 * per-entry `journey-entry-<id>` fragments are the same promise one level
 * down: the timeline's rows carry them for drawn entries, and the credentials
 * line's items for the nine demoted ones. The board has no margin rail, and
 * neither has the Journey since round 21.
 */
import type { CSSProperties } from "react";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { journey } from "@/content/portfolio";
import { buildDrawnTree } from "@/lib/knowledge-tree";
import { LEGACY_SECTION_IDS } from "./anchors";
import CredentialsStrip from "./CredentialsStrip";
import DrawnTree from "./DrawnTree";
import HangingTags from "./HangingTags";
import KnowledgeTreeList from "./KnowledgeTreeList";
import OakScenery, { OakCrown } from "./OakScenery";
import UnbranchedCaseStudies from "./UnbranchedCaseStudies";
import TreeBox, { WatchItGrow } from "./TreeBox";

const HEADING_ID = "tree-heading";

/** What the Journey draws: the tree without the nine entries that became one
 *  credentials line. The companion's facts count the same call. */
const DRAWN = buildDrawnTree();

export default function CareerTree() {
  return (
    <Section
      id="tree"
      labelledBy={HEADING_ID}
      tone="base"
      className="relative isolate overflow-x-clip [--fx:min(50%-720px,100%-1424px)]"
    >
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

      <OakScenery />

      {/* Static at every width: from 1280 the tags, the button and the
          vignette are placed against the section, in the board's frame. */}
      <div data-journey-stage="" className="xl:min-h-[calc(900px-var(--section-y))] xl:pt-8">
        <SectionHeading
          id={HEADING_ID}
          size="chapter"
          lead={<span className="font-serif italic">{journey.lead}</span>}
        >
          {journey.heading}
        </SectionHeading>
        <OakCrown className="mt-6" />
        <HangingTags className="mt-6 xl:mt-0" />
        <WatchItGrow
          label={journey.watch}
          className="mt-8 xl:absolute xl:top-[790px] xl:left-[max(var(--fx)+40px,var(--gutter))] xl:mt-0"
        />
        {/* The board's still life (1196, 780) and its caption (1186, 870). */}
        <div
          aria-hidden="true"
          className="mt-8 w-fit xl:absolute xl:top-[780px] xl:left-[calc(var(--fx)+1186px)] xl:mt-0"
        >
          <span
            className="scene-art ml-2.5 block h-[90px] w-[92px]"
            style={{ "--art": "var(--art-journey-vignette)" } as CSSProperties}
          />
          <div className="font-serif text-[length:var(--step--1)] leading-none italic text-fg-muted">
            <p className="day-only">{journey.vignette.morning}</p>
            <p className="night-only">{journey.vignette.evening}</p>
          </div>
        </div>
      </div>

      {/* The drawing grows in its own box (`TreeBox.tsx`): once on sight, and
          again on "Watch it grow" above. `hidden lg:block` is on the box, so
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
