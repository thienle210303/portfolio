import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import BusinessCard from "./BusinessCard";
import ContactForm from "./ContactForm";
import DirectLinks from "./DirectLinks";

/**
 * Server Component. Owns layout only; every interactive piece lives in a
 * client island — `ContactForm`, which turns a chosen intent into a finished
 * message — so this file itself ships with no client JS of its own.
 * `BusinessCard` is a Server Component too (it renders `CopyButton`, a
 * client island, as a child, which costs nothing extra here).
 *
 * Two panes at >=1024px: the form beside one business-card panel that
 * carries email, GitHub and LinkedIn plus the name, title and philosophy
 * line that make it read as an actual card rather than a link list. Under
 * the form, `DirectLinks` adds the one way out the card lacks, the résumé PDF.
 * Round 18
 * removed the one-field "leave a number" form that used to sit above the full
 * one: choosing an intent now produces a whole message, which is the
 * shortcut that field was standing in for.
 *
 * DOM order deliberately does not match visual order at >=1024px: the card
 * comes first in markup — so it reads and tabs as what it is, an introduction,
 * ahead of the request for a message — and `lg:col-start-2` is what moves it
 * to the right visually. Below 1024px there is no grid to place it into, so
 * DOM order *is* visual order: the card stacks first, then the form.
 *
 * The card is sticky within the section at >=1024px (`lg:sticky lg:top-24`,
 * the same offset `.rail` uses in globals.css) because it is short and the
 * form beside it is not — without that it would scroll out of view long
 * before the form does. `lg:items-start` on the grid is what makes the grid
 * row taller than the card instead of stretching the card to match, which is
 * what lets the sticky range be "this row" rather than "the whole page".
 *
 * `emailDeliveryConfigured` is computed once, server-side, in `page.tsx`
 * from the three Resend env vars. Only this boolean crosses to the client;
 * nothing here ever references `process.env` directly. `BusinessCard` never
 * receives it — every link on the card (mailto, GitHub, LinkedIn) works
 * identically whether or not direct sending is configured.
 *
 * Tone is `deep`, not `contrast`. A full inversion right where visitors do
 * their most form-focused reading read as disconnected from the rest of the
 * page rather than as a deliberate chapter break — that device stays
 * reserved for `Closing`, the page's one true contrast section.
 */

interface ContactProps {
  emailDeliveryConfigured: boolean;
}

export default function Contact({ emailDeliveryConfigured }: ContactProps) {
  return (
    <Section id="contact" labelledBy="contact-heading" eyebrow="Contact" tone="deep">
      <SectionHeading
        id="contact-heading"
        lead="Pick a reason. The message is already written."
      >
        Let&rsquo;s talk
      </SectionHeading>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-x-16 xl:grid-cols-[minmax(0,1fr)_24rem]">
        {/* Pure identity, not wrapped in `.no-print`: unlike the form
            beside it, a business card is exactly the kind of thing worth
            printing. See BusinessCard's own comment for the fuller case. */}
        <BusinessCard className="lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1" />

        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          {/* Screen-only: a printed résumé should not carry a dead form. */}
          <div className="no-print max-w-[46rem]">
            <ContactForm emailDeliveryConfigured={emailDeliveryConfigured} />
          </div>
          <DirectLinks />
        </div>
      </div>
    </Section>
  );
}
