import type { CSSProperties } from "react";
import Section from "@/components/ui/Section";
import { Drawing } from "@/components/scenery/Drawing";
import { contactCopy } from "@/content/portfolio";
import { SUGGESTED_QUESTIONS } from "@/lib/answers";
import AskLoader from "./AskLoader";
import AskPlaceholder from "./AskPlaceholder";
import BusinessCard from "./BusinessCard";
import Postcard from "./Postcard";

/**
 * Contact — round 21's postcard board. Server Component; layout only. The
 * client islands are the lead form inside `Postcard`, the copy button on the
 * card, and `AskLoader`, the chat's lazy boundary.
 *
 * "Xin chào," over "say hi.", a bowl of phở beside it by day and two beers
 * at night, a string of Hội An lanterns with hoa mai at its ends; then the
 * postcard, my card, the bánh tét (Tết lives here all year), and the chat. The
 * lanterns hang across the top.
 *
 * Three arrangements (round 25), and each object also decides its own shape
 * from its own width:
 *  - below 1024, one column in reading order: postcard, card, Tết, strip.
 *    From 640 the card has the width to lie landscape under the postcard.
 *  - 1024 to 1279: the postcard beside a 21rem portrait card, the Tết under
 *    the card. The postcard's column is under 40rem for most of that range,
 *    so it stands picture over address with a full-width form.
 *  - from 1280 (round 28): one desk. The postcard left; my card clipped to
 *    its top right corner, 40px over it; under both, the chat as a notepad
 *    sheet lying across the desk from the right, the Tết beside it. Below
 *    1280 the chat is a strip under everything.
 *
 * The postcard comes first in the DOM and on the page, at every width, so the
 * one thing this section asks for is the first thing you reach (round 22, by
 * my choice), and reading, tab and visual order agree. `#ask` is a plain
 * wrapper, never an `<aside>`: the card must stay the section's only
 * `<aside>`, because the companion perches on it.
 *
 * Three server-side values arrive from `page.tsx`; nothing here reads
 * `process.env`. Only booleans and the validated booking URL cross to the
 * client, never a key.
 *
 * Tone is `base`: the section is transparent on the page's sky, like the
 * board. Scenery is CSS backgrounds from `public/scenery/` (see `Drawing`),
 * `aria-hidden` and `pointer-events: none`; the theme picks the day or night
 * piece with `.day-only` / `.night-only`, so no JavaScript is involved.
 */

interface ContactProps {
  emailDeliveryConfigured: boolean;
  /** Computed in `page.tsx` by `askLiveModeConfigured()`; handed to the chat. */
  askLiveModeConfigured: boolean;
  /** Validated in `page.tsx`; `null` means no booking link renders. */
  bookingUrl: string | null;
}

/** "Ask me" and its note, server-rendered and handed through the loader. */
function AskHeading() {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
      <h3 className="text-[18px] font-semibold text-fg">{contactCopy.ask.heading}</h3>
      <p className="font-serif text-[15px] text-fg-muted italic">{contactCopy.ask.note}</p>
    </div>
  );
}

export default function Contact({ emailDeliveryConfigured, askLiveModeConfigured, bookingUrl }: ContactProps) {
  return (
    <Section id="contact" labelledBy="contact-heading" tone="base" className="relative isolate overflow-hidden supports-[overflow:clip]:overflow-clip">
      {/* The lanterns hang from the section's top edge, across the right of
          the heading from 1024 and across the whole width below it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[150px] lg:left-[max(42%,calc(50%-120px))] lg:h-[190px]"
      >
        {/* `.day-only` / `.night-only` on wrappers: `Drawing`'s own `block`
            is a utility and would outrank them. */}
        <div className="day-only h-full">
          <Drawing name="lanterns-day" className="contact-lanterns h-full w-full" />
        </div>
        <div className="night-only h-full">
          <Drawing name="lanterns-night" className="contact-lanterns h-full w-full" />
        </div>
      </div>

      <div className="relative">
        <header className="relative max-w-[34rem] pt-[110px] lg:pt-0">
          {/* The sun by day, the moon by night: the hero's own sky file,
              shifted so the disc rises just past the lede's end, between
              the glasses' caption and the first lantern. From 1280 only:
              narrower, the lanterns start where it would sit. The file
              starts 60px into the box so the halo is never cut flat; the
              box ends above the sky's seeds and fireflies. */}
          <span
            aria-hidden="true"
            data-scenery="contact-sky"
            className="scene-art pointer-events-none absolute -z-20 h-[360px] w-[1440px] bg-[size:1440px_auto] bg-[position:0_60px] hidden xl:block xl:top-[-87px] xl:left-[-435px]"
            style={{ "--art": "var(--art-sky)" } as CSSProperties}
          />
          <p lang="vi" className="font-serif text-[24px] leading-none text-[color:var(--greet)] italic">
            {contactCopy.greeting}
          </p>
          {/* A size container: the evening's caption asks how much room this
              row has, not how wide the window is. */}
          <div className="@container mt-2 flex items-end gap-x-5">
            <h2
              id="contact-heading"
              className="font-display text-[length:var(--step-5)] leading-[1] font-semibold tracking-[-0.02em] text-fg"
            >
              {contactCopy.heading}
            </h2>
            {/* Morning: a bowl of phở. Evening: two beers, and the toast. */}
            <div className="day-only mb-1.5 shrink-0">
              <Drawing name="pho" className="h-[48px] w-[63px]" />
            </div>
            <div className="night-only relative mb-1 shrink-0">
              {/* The glasses' own caption, beside them, so it never reads as
                  part of "Xin chào," above. Where the row is under 20rem
                  there is no room beside them, so it sits just over their
                  rims. */}
              <p lang="vi" className="absolute bottom-full left-1/2 -translate-x-1/2 font-serif text-[15px] leading-tight whitespace-nowrap text-[color:var(--greet)] italic @min-[20rem]:top-1 @min-[20rem]:bottom-auto @min-[20rem]:left-full @min-[20rem]:ml-1.5 @min-[20rem]:w-[5.5rem] @min-[20rem]:translate-x-0 @min-[20rem]:whitespace-normal sm:w-auto sm:whitespace-nowrap lg:text-[17px]">
                {contactCopy.cheer}
              </p>
              <Drawing name="bia" className="h-[64px] w-[66px]" />
            </div>
          </div>
          <p className="mt-3 font-serif text-[length:var(--step-1)] leading-snug text-fg-muted italic">
            {contactCopy.lead}
          </p>
        </header>

        {/* Three named places, so the Tết can sit under the card on a laptop
            and under the postcard on the board without being written twice. */}
        <div className="mt-10 grid grid-cols-[minmax(0,1fr)] items-start gap-y-8 [grid-template-areas:'postcard'_'card'_'tet'_'ask'] lg:grid-cols-[minmax(0,1fr)_21rem] lg:grid-rows-[auto_1fr_auto] lg:gap-x-[clamp(2.5rem,4.8vw,4.375rem)] lg:gap-y-5 lg:[grid-template-areas:'postcard_card'_'postcard_tet'_'ask_ask'] xl:grid-cols-[minmax(0,740fr)_minmax(20.5rem,430fr)] xl:grid-rows-[auto_auto] xl:gap-x-0 xl:gap-y-7 xl:[grid-template-areas:'postcard_card'_'tet_tet']">
          <div className="min-w-0 [grid-area:postcard]">
            <Postcard emailDeliveryConfigured={emailDeliveryConfigured} />
          </div>
          {/* Not `.no-print`: the card is worth printing. A size container:
              the card lies landscape where this column gives it the room.
              The top padding is the paper clip's, which stands above it.
              From 1280 (round 28) it is clipped to the postcard's corner,
              40px over it and on top of it. */}
          <div className="@container/card relative z-10 min-w-0 pt-6 [grid-area:card] lg:pt-5 xl:-ml-10">
            <BusinessCard bookingUrl={bookingUrl} />
          </div>
          <div className="flex items-center justify-end gap-3 pr-1 [grid-area:tet] xl:self-start xl:justify-self-start xl:pt-10 xl:pl-6">
            <p className="font-serif text-[14px] text-fg-muted italic">{contactCopy.tet}</p>
            <Drawing name="banh-tet" className="h-[34px] w-[115px] shrink-0" />
          </div>

          {/* Screen-only: a printed page cannot ask anything. `scroll-mt-20`
              clears the sticky header, the offset `Section` uses. Round 28:
              from 1280 a sheet off my notepad lying across the desk under the
              postcard and the card, the bánh tét beside it; below, the strip under everything. Its own width
              lays it out (`@container/ask`, ask-sheet.tsx). */}
          <div
            id="ask"
            className="ask-pad @container/ask paper-lift no-print min-w-0 scroll-mt-20 overflow-hidden rounded-[4px] bg-surface [grid-area:ask] max-lg:-mt-2 lg:mt-1 xl:w-[min(100%,50rem)] xl:justify-self-end xl:[grid-area:tet]"
          >
            {/* The idle notepad is drawn here, on the server, and holds the
                chat's place until its chunk lands (see `AskPlaceholder`). */}
            <AskLoader
              liveModeConfigured={askLiveModeConfigured}
              heading={<AskHeading />}
              placeholder={
                <AskPlaceholder
                  liveModeConfigured={askLiveModeConfigured}
                  heading={<AskHeading />}
                  suggestions={SUGGESTED_QUESTIONS}
                />
              }
            />
          </div>
        </div>
      </div>
    </Section>
  );
}
