import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import { contactCopy } from "@/content/portfolio";
import AskLoader from "./AskLoader";
import BusinessCard from "./BusinessCard";

/**
 * Server Component; layout only. The interactive pieces are client islands:
 * `BusinessCard` (which flips to the lead form) and `AskLoader`, the chat's
 * lazy boundary.
 *
 * At >=1024px the chat ("Ask about my work", `#ask`) sits on the left and the
 * card on the right. The card comes first in the DOM, so below 1024px it
 * stacks first and it reads and tabs as what it is, an introduction;
 * `lg:col-start-2` moves it right. It is sticky (`lg:top-24`, the offset
 * `.rail` uses) because the chat beside it is taller, and `lg:items-start`
 * keeps the grid row from stretching it.
 *
 * `#ask` is a plain wrapper with an `<h3>`, never an `<aside>`: the card must
 * stay the section's only `<aside>`, because the companion perches on it.
 *
 * Three server-side values arrive from `page.tsx`; nothing here reads
 * `process.env`. Only booleans and the validated booking URL cross to the
 * client, never a key.
 *
 * Tone is `deep`, not `contrast`: a full inversion here read as disconnected
 * from the rest of the page. That device is left to the footer strip.
 */

interface ContactProps {
  emailDeliveryConfigured: boolean;
  /** Computed in `page.tsx` by `askLiveModeConfigured()`; handed to the chat. */
  askLiveModeConfigured: boolean;
  /** Validated in `page.tsx`; `null` means no booking link renders. */
  bookingUrl: string | null;
}

export default function Contact({ emailDeliveryConfigured, askLiveModeConfigured, bookingUrl }: ContactProps) {
  return (
    <Section id="contact" labelledBy="contact-heading" eyebrow="Contact" tone="deep">
      <SectionHeading id="contact-heading" lead={contactCopy.lead}>
        Let&rsquo;s talk
      </SectionHeading>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-x-16 xl:grid-cols-[minmax(0,1fr)_24rem]">
        {/* Not `.no-print`: the card's front is worth printing. */}
        <div className="lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1">
          <BusinessCard bookingUrl={bookingUrl} emailDeliveryConfigured={emailDeliveryConfigured} />
        </div>

        {/* Screen-only: a printed page cannot ask anything. `scroll-mt-20`
            clears the sticky header, the offset `Section` uses. */}
        <div id="ask" className="no-print min-w-0 max-w-[46rem] scroll-mt-20 lg:col-start-1 lg:row-start-1">
          <h3 className="font-display text-[length:var(--step-1)] font-semibold leading-snug tracking-(--tracking-display-sm) text-fg">
            Ask about my work
          </h3>
          <div className="mt-4">
            <AskLoader liveModeConfigured={askLiveModeConfigured} />
          </div>
        </div>
      </div>
    </Section>
  );
}
