/**
 * Hero — id="about", the page's single <h1>. Server Component; ChapterTags
 * carries its own "use client".
 *
 * Round 21 (phase 3): a clothesline strung from a bamboo pole to a pine, four
 * chapter tags on it, my field tag at its right end, the scenery behind. DOM
 * order is text → line → field tag at every width, so a phone reads the
 * headline first; at >=1024 the grid lifts the line above the text.
 *
 * The tags' row starts `--line-top` below the section's padding, the
 * clothesline's top in Scenery. Each string meets the curve because its drop
 * is fitted to it (ChapterTags' DROPS; FIELD_DROP below). At >=1024 the grid
 * runs `--gutter - 16px` into the right gutter, which is what puts the field
 * tag where the board hangs it and leaves the four tags their 152px at >=1280.
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
import Scenery from "./Scenery";

const HEADING_ID = "hero-heading";

/** The field tag's string length, fitted like ChapterTags' DROPS (within 2px). */
const FIELD_DROP = {
  "--drop": "calc(31.2px - (100cqw - 1024px) * 0.0239)",
  "--drop-xl": "calc(26.1px + (100cqw - 1280px) * 0.031)",
} as CSSProperties;

export default function Hero({ bookingUrl }: { readonly bookingUrl: string | null }) {
  const chapters = buildChapters().map((chapter) => ({
    ...chapter,
    href: chapter.entryId ? `#${journeyEntryAnchorId(chapter.entryId)}` : "#tree",
  }));

  return (
    <Section
      id="about"
      labelledBy={HEADING_ID}
      tone="base"
      // The hero runs its own `data-motion` load choreography instead of the
      // generic scroll-triggered ink settle — see Section.tsx's own comment.
      reveal={false}
      className="@container relative isolate overflow-hidden pb-[130px] [--line-top:50px] lg:pb-[120px]"
    >
      {/* Retired ids that land here; same pattern as CareerTree's. */}
      {ABOUT_LEGACY_SECTION_IDS.map((id) => (
        <span key={id} id={id} aria-hidden="true" className="sr-only scroll-mt-20" />
      ))}

      <Scenery />

      <div className="grid gap-y-10 lg:-mr-[calc(var(--gutter)-16px)] lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-x-(--gutter) lg:gap-y-4 lg:[grid-template-areas:'line_tag'_'text_tag']">
        <div className="min-w-0 lg:[grid-area:text]">
          <HeroIdentity headingId={HEADING_ID} bookingUrl={bookingUrl} />
        </div>

        <div className="min-w-0 lg:mt-(--line-top) lg:[grid-area:line]">
          <ChapterTags chapters={chapters} />
          <p className="mt-6 font-serif text-[length:var(--step-1)] italic text-fg-muted lg:mt-[76px]">{hero.hint}</p>
        </div>

        <div
          style={FIELD_DROP}
          className={
            "relative min-w-0 lg:mt-(--line-top) lg:pt-3.5 lg:[grid-area:tag] lg:translate-y-(--drop) xl:translate-y-(--drop-xl) " +
            // The field tag's string, from the line down to its hole.
            "lg:after:absolute lg:after:top-0 lg:after:left-1/2 lg:after:z-10 lg:after:h-6.5 lg:after:w-[1.3px] lg:after:-translate-x-1/2 lg:after:bg-(--twine)"
          }
        >
          <FieldTag />
        </div>
      </div>
    </Section>
  );
}
