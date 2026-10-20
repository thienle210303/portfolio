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
 * clothesline's top in Scenery. On a short laptop screen (<=800px tall) the
 * line moves up 24px so the primary action still makes the first screen at
 * 1024×768. Each string meets the curve because its drop
 * is fitted to it (ChapterTags' DROPS; FIELD_DROP below). At >=1024 the grid
 * runs `--gutter - 16px` into the right gutter, which is what puts the field
 * tag where the board hangs it and leaves the four tags their 152px at >=1280.
 */
import type { CSSProperties } from "react";
import { Drawing } from "@/components/scenery/Drawing";
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
  "--drop-xl": "calc(26.1px + (min(100cqw, 1920px) - 1280px) * 0.031)",
} as CSSProperties;

/**
 * Below 1024 the clothesline hangs down the page: from a bamboo pole at the
 * right edge (the nón lá on it) the twine sags left to the middle, 40px down,
 * then drops straight to my field tag (the grid's 40px gap below). The tags
 * hang off it either side (ChapterTags; globals.css draws their strings).
 * `--pole` is the stem's distance from the middle: 12px in from the hero's
 * edge, or just past the right-hand tags (18px + 160px + 8px) once there is
 * room, so the line keeps the board's shape at any width.
 */
function PhoneLine() {
  return (
    <div
      aria-hidden="true"
      data-scenery="phone-line"
      className="pointer-events-none absolute inset-0 [--pole:min(50cqw-12px,186px)] lg:hidden"
    >
      {/* The bamboo's stem is x 366–378 of its 316–386 viewBox; the line ties
          on at its top. Two boxes, each the size of its ink: the leaves, then
          the bare stem. One 70px box would put solid accent, as axe reads a
          mask, under whatever the cats' box (fixed, bottom right) floats over. */}
      <Drawing
        name="bamboo-phone"
        className="absolute -top-16 left-[calc(50%+var(--pole)-56px)] h-[190px] w-[70px] text-accent [mask-position:top] [mask-size:100%_auto]"
      />
      <Drawing
        name="bamboo-phone"
        className="absolute top-[126px] bottom-25 left-[calc(50%+var(--pole)-11px)] w-[22px] text-accent [mask-position:-45px_-190px] [mask-size:70px_auto]"
      />
      {/* The hero's nón lá at 0.56×: its crown sits on the line's knot. */}
      <Drawing name="non-la" className="absolute -top-[13px] left-[calc(50%+var(--pole)-33px)] h-[72px] w-[67px]" />
      <svg
        viewBox="0 0 177 40"
        preserveAspectRatio="none"
        className="absolute top-0 left-1/2 h-10 w-(--pole) overflow-visible"
      >
        <path d="M0 40Q95 36 177 0" fill="none" stroke="var(--twine)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <span data-line="" className="absolute top-10 -bottom-10 left-1/2 w-0.5 -translate-x-1/2 bg-(--twine)" />
    </div>
  );
}

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
      className="@container relative isolate overflow-hidden pb-[210px] [--line-top:38px] lg:pb-[132px] [@media(min-width:1024px)_and_(max-height:800px)]:[--line-top:14px]"
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

        <div className="relative w-full min-w-0 max-lg:mx-auto max-lg:max-w-[560px] max-lg:pt-[86px] lg:mt-(--line-top) lg:[grid-area:line]">
          <PhoneLine />
          <ChapterTags chapters={chapters} />
          <p className="mt-6 font-serif text-[length:var(--step-1)] italic text-fg-muted max-lg:absolute max-lg:right-[calc(50%+34px)] max-lg:bottom-1 max-lg:w-[min(160px,calc(50%-34px))] max-lg:text-[length:var(--step-0)] lg:mt-[76px]">
            <span className="max-lg:hidden">{hero.hintLine} </span>
            {hero.hint}
          </p>
        </div>

        <div
          style={FIELD_DROP}
          className={
            "relative w-full min-w-0 pt-3.5 max-lg:mx-auto max-lg:max-w-[380px] lg:mt-(--line-top) lg:[grid-area:tag] lg:translate-y-(--drop) xl:translate-y-(--drop-xl) " +
            // The field tag's string, from the line down to its hole.
            "after:absolute after:top-0 after:left-1/2 after:z-10 after:h-6.5 after:w-[1.3px] after:-translate-x-1/2 after:bg-(--twine)"
          }
        >
          <FieldTag />
        </div>
      </div>
    </Section>
  );
}
