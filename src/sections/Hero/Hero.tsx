/**
 * Hero — id="about", the page's single <h1>. Server Component; ChapterTags
 * carries its own "use client".
 *
 * A clothesline with four chapter tags and my field tag on it, my words, the
 * scenery behind. One grid (`.hero-yard`, laid out in globals.css) holds them
 * in one DOM order at every width: my words, the hint, the tags (2003, 2018,
 * 2021, 2025), my field tag. So a phone, a screen reader and the tab order
 * all read the headline first.
 *
 * Round 25: a line is strung between two things that stand in the ground.
 *
 * - Phone (under 640): words, the hint, then the yard: two bamboo poles at
 *   the page's edges, the line crossing three times between them, two tags
 *   on each of the first two passes and my field tag on the third.
 * - Tablet (640 to 1023): bamboo at the left, the pine at the right. Pass 1
 *   carries the four tags; pass 2 comes back lower with my field tag on the
 *   right and my words under it on the left.
 * - From 1024 the board's composition: the grid lifts the tags above the
 *   words, on the scenery's own line (Scenery.tsx), my field tag at its
 *   right end with its right edge on the shell's.
 *
 * Below 1024 the line, its poles and where every string meets it come from
 * one description (line.ts); Yard.tsx draws them. From 1024 globals.css works
 * each string out from the scenery's curve. Nothing is fitted per width.
 *
 * `--ground` is the section's bottom padding, where the ground stands
 * (Scenery.tsx); the yard's poles reach down into it. On a short laptop
 * screen (<=800px tall) the line moves up 24px so the primary action still
 * makes the first screen at 1024×768.
 */
import type { CSSProperties } from "react";
import { Section } from "@/components/ui/Section";
import { hero } from "@/content/portfolio";
import { buildChapters } from "@/lib/hero";
import { journeyEntryAnchorId } from "@/sections/CareerTree/anchors";
import { ABOUT_LEGACY_SECTION_IDS } from "./anchors";
import ChapterTags from "./ChapterTags";
import FieldTag from "./FieldTag";
import HeroIdentity from "./HeroIdentity";
import { HUNG, PHONE, TABLET, hangVars, lineFloor } from "./line";
import Scenery from "./Scenery";
import Yard from "./Yard";

const HEADING_ID = "hero-heading";

const FIELD_HANG = hangVars(PHONE.field, TABLET.field) as CSSProperties;

/** On a tablet my words start under pass 2: its lowest point over their columns, and a line's breathing room. */
const WORDS_TOP = { "--hint-y": `${Math.ceil(lineFloor(TABLET.passes[1], 0, 0.55)) + 14}px` } as CSSProperties;

export default function Hero({ bookingUrl }: { readonly bookingUrl: string | null }) {
  const chapters = buildChapters().map((chapter, i) => ({
    ...chapter,
    href: chapter.entryId ? `#${journeyEntryAnchorId(chapter.entryId)}` : "#tree",
    // Its place on the line below 1024, worked out here on the server.
    hang: hangVars(PHONE.tags[i], TABLET.tags[i]),
  }));

  return (
    <Section
      id="about"
      labelledBy={HEADING_ID}
      tone="base"
      // The hero runs its own `data-motion` load choreography instead of the
      // generic scroll-triggered ink settle — see Section.tsx's own comment.
      reveal={false}
      className="@container relative isolate overflow-hidden supports-[overflow:clip]:overflow-clip pb-(--ground) [--ground:204px] [--line-top:38px] lg:[--ground:132px] [@media(min-width:64rem)_and_(max-height:800px)]:[--line-top:14px]"
    >
      {/* Retired ids that land here; same pattern as CareerTree's. */}
      {ABOUT_LEGACY_SECTION_IDS.map((id) => (
        <span key={id} id={id} aria-hidden="true" className="sr-only scroll-mt-20" />
      ))}

      <Scenery />

      <div className="hero-yard" style={WORDS_TOP}>
        <Yard />

        <div data-yard="words" className="min-w-0">
          <HeroIdentity headingId={HEADING_ID} bookingUrl={bookingUrl} />
        </div>

        <p data-yard="hint" className="font-serif text-[length:var(--step-1)] italic text-fg-muted">
          <span className="max-lg:hidden">{hero.hintLine} </span>
          {hero.hint}
        </p>

        <ChapterTags chapters={chapters} hung={HUNG} />

        <div data-yard="field" style={FIELD_HANG} className={`@container min-w-0 ${HUNG}`}>
          <FieldTag />
        </div>
      </div>
    </Section>
  );
}
