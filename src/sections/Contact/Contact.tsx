import type { CSSProperties } from "react";
import Section from "@/components/ui/Section";
import { Drawing } from "@/components/scenery/Drawing";
import { contactCopy } from "@/content/portfolio";
import AskLoader from "./AskLoader";
import BusinessCard from "./BusinessCard";
import Postcard from "./Postcard";

/**
 * Contact — round 21's postcard board. Server Component; layout only. The
 * client islands are the lead form inside `Postcard`, the copy button on the
 * card, and `AskLoader`, the chat's lazy boundary.
 *
 * "Xin chào," over "say hi.", a bowl of phở beside it by day and two beers
 * at night, a string of Hội An lanterns with hoa mai at its ends; then my
 * card clipped beside the postcard, the bánh tét under the postcard (Tết
 * lives here all year), and the chat as a strip across the bottom. Below
 * 1024px everything stacks in reading order: heading, card, postcard, Tết,
 * strip; the lanterns hang across the top.
 *
 * The card comes first in the DOM, so it reads and tabs as what it is, an
 * introduction. `#ask` is a plain wrapper, never an `<aside>`: the card must
 * stay the section's only `<aside>`, because the companion perches on it.
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
    <Section id="contact" labelledBy="contact-heading" tone="base" className="relative isolate overflow-hidden">
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
          <div className="mt-2 flex items-end gap-x-5">
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
                  part of "Xin chào," above. Under 360px there is no room
                  beside them, so it sits just over their rims. */}
              <p lang="vi" className="absolute bottom-full left-1/2 -translate-x-1/2 font-serif text-[15px] leading-tight whitespace-nowrap text-[color:var(--greet)] italic min-[22.5rem]:top-1 min-[22.5rem]:bottom-auto min-[22.5rem]:left-full min-[22.5rem]:ml-1.5 min-[22.5rem]:w-[5.5rem] min-[22.5rem]:translate-x-0 min-[22.5rem]:whitespace-normal sm:w-auto sm:whitespace-nowrap lg:text-[17px]">
                {contactCopy.cheer}
              </p>
              <Drawing name="bia" className="h-[64px] w-[66px]" />
            </div>
          </div>
          <p className="mt-3 font-serif text-[length:var(--step-1)] leading-snug text-fg-muted italic">
            {contactCopy.lead}
          </p>
        </header>

        <div className="mt-10 grid items-start gap-y-10 lg:mt-10 lg:grid-cols-[minmax(20.5rem,430fr)_minmax(0,740fr)] lg:gap-x-[clamp(2.5rem,4.8vw,4.375rem)]">
          {/* Not `.no-print`: the card is worth printing. */}
          <div className="pt-6 lg:pt-5">
            <BusinessCard bookingUrl={bookingUrl} />
          </div>
          <div className="min-w-0">
            <Postcard emailDeliveryConfigured={emailDeliveryConfigured} />
            <div className="mt-3 flex items-center justify-end gap-3 pr-1 lg:mt-2 lg:pr-14">
              <p className="font-serif text-[14px] text-fg-muted italic">{contactCopy.tet}</p>
              <Drawing name="banh-tet" className="h-[34px] w-[115px] shrink-0" />
            </div>
          </div>
        </div>

        {/* Screen-only: a printed page cannot ask anything. `scroll-mt-20`
            clears the sticky header, the offset `Section` uses. */}
        <div id="ask" className="paper-lift no-print mt-6 scroll-mt-20 overflow-hidden rounded-[4px] bg-surface">
          <AskLoader liveModeConfigured={askLiveModeConfigured} heading={<AskHeading />} />
        </div>
      </div>
    </Section>
  );
}
