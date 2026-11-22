/**
 * The Journey — one live oak.
 *
 * Round 21 (phase 4) opens it with the board (NatJourney): "The work, as it
 * grew." over a live oak whose long limb carries the highlight tags
 * (`HangingTags`), a Hội An lantern lit at night, rice at the trunk, the
 * stool's still life, and "Watch it grow", which grows the oak itself
 * (`GrowOak`). Round 22 retired the drawn tree that used to grow in a box
 * below: a second tree in a scroll box of its own, repeating the Record's
 * rows. The timeline rows, the credentials line and the unbranched case
 * studies moved to the Record in round 21 phase 5 (spec §4): the tags still
 * link to `#journey-entry-<id>`, which is a Record row now.
 *
 * Round 25 lays it out in three compositions, one DOM, CSS only (globals.css,
 * "Journey"):
 *  - from 1280 the stage is the board: its pieces stand in a 1440×900 frame
 *    measured in board units (`--u`, 1/1440 of the board's own width; the
 *    section is the size container), so the board is as wide as the window
 *    from 1280 and stops growing at 1680px. `--fx` is the frame's left edge
 *    and `--by` its top;
 *  - from 640 the title stands top-left beside the crown, the trunk runs down
 *    the middle and the boughs leave it in pairs, a tag each side;
 *  - below 640 the crown runs across the top and the tags hang in one column
 *    from a trunk near the right edge.
 * "Watch it grow" is under my line at every width.
 *
 * This file is the Server Component boundary and the only thing in the
 * directory that knows it is a section. It carries the compatibility anchors
 * for the retired section ids it answers (`LEGACY_SECTION_IDS` in
 * `./anchors.ts`; `#work` went to the Record with the case studies). The board
 * has no margin rail, and neither has the Journey since round 21.
 */
import type { CSSProperties } from "react";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { journey } from "@/content/portfolio";
import { growBeats } from "@/lib/origin-story";
import { LEGACY_SECTION_IDS } from "./anchors";
import GrowOak from "./GrowOak";
import HangingTags from "./HangingTags";
import OakScenery, { OakCrown } from "./OakScenery";
import Weather from "./Weather";

const HEADING_ID = "tree-heading";

/** The show "Watch it grow" plays: the flight, the seasons, the shoot. */
const BEATS = growBeats();

export default function CareerTree() {
  return (
    <Section
      id="tree"
      labelledBy={HEADING_ID}
      tone="base"
      className="relative isolate overflow-x-clip"
    >
      {/* Retired section ids, kept resolvable. The nav used to point at
          `#journey`, `#work`, `#skills` and `#workshop`; all four are in
          bookmarks, possibly in a shared résumé PDF, and possibly indexed, and
          nothing forces an external link to have noticed its target moved.
          `#journey` lands on the section of that name; `#skills`/`#workshop`
          have no successor of their own, and the Journey is the nearest honest
          answer for a visitor arriving on a dead id, which beats a silent
          no-op. `#work` lands on the Record, where the case studies are.

          Real, zero-size elements rather than a client-side hash rewrite: this
          way the landing works with no JavaScript at all, which
          `e2e/legacy-anchors.spec.ts` proves against the server-rendered HTML.
          `scroll-mt-20` matches the section's own offset (see `Section`'s
          `scroll-mt-20`), so arriving via any of these ids clears the sticky
          header by the same margin. `aria-hidden` because they carry no
          content: they are a destination, not a thing to read.

          Nothing the site itself renders links to any of them — these exist
          for inbound links only. The per-entry `journey-entry-<id>` fragments
          are the same promise one level down, carried by the Record's rows. */}
      {LEGACY_SECTION_IDS.map((id) => (
        <span key={id} id={id} aria-hidden="true" className="sr-only scroll-mt-20" />
      ))}

      <OakScenery />
      {/* "Watch it grow"'s weather, shown only while it plays. */}
      <Weather />

      {/* Static from 1280: there the tags and the vignette are placed against
          the section, in the board's frame (globals.css, "Journey"). */}
      <div data-journey-stage="">
        {/* The words: over the board from 1280, beside the crown from 640,
            above it on a phone. */}
        <div data-journey-head="">
          <SectionHeading
            id={HEADING_ID}
            size="chapter"
            lead={<span className="font-serif italic">{journey.lead}</span>}
          >
            {journey.heading}
          </SectionHeading>
          {/* Under my line at every width (round 25): on the trunk's foot it
              read as part of the drawing. */}
          <GrowOak label={journey.watch} skipLabel={journey.skip} beats={BEATS} className="mt-6" />
        </div>
        <OakCrown />
        <HangingTags />
        {/* The board's still life (1196, 780) and its caption (1186, 870);
            below 1280 it stands at the foot of the tree, on the left. */}
        <div aria-hidden="true" data-journey-vignette="" className="no-print w-fit">
          <span className="scene-art block" style={{ "--art": "var(--art-journey-vignette)" } as CSSProperties} />
          <div className="font-serif text-[length:var(--step--1)] leading-none italic text-fg-muted">
            <p className="day-only">{journey.vignette.morning}</p>
            <p className="night-only">{journey.vignette.evening}</p>
          </div>
        </div>
      </div>
    </Section>
  );
}
