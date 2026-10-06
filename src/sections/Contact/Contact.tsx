import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import AskLoader from "./AskLoader";
import BusinessCard from "./BusinessCard";
import ContactForm from "./ContactForm";
import DirectLinks from "./DirectLinks";

/**
 * Server Component. Owns layout only; every interactive piece lives in a
 * client island — `ContactForm`, which turns a chosen intent into a finished
 * message, and `AskLoader`, the chat's lazy boundary — so this file itself
 * ships with no client JS of its own.
 * `BusinessCard` is a Server Component too (it renders `CopyButton`, a
 * client island, as a child, which costs nothing extra here).
 *
 * Two panes at >=1024px: the form beside one business-card panel that
 * carries email, GitHub and LinkedIn plus the name, title and philosophy
 * line that make it read as an actual card rather than a link list. Under
 * the form, `DirectLinks` adds the ways out the card lacks: the résumé PDF
 * and, when a booking URL is configured, a link to book a call.
 * Round 18 removed the one-field "leave a number" form that used to sit above
 * the full one: choosing an intent now produces a whole message, which is the
 * shortcut that field was standing in for.
 *
 * Under those, "Ask about my work" (`#ask`): the chat over the site's own
 * content, moved here from the hero's code artifact in round 18. A visitor
 * who would rather interrogate the record than write an email is making
 * contact too, with less effort. It is a plain wrapper with an `<h3>`, not an
 * `<aside>` — the business card must stay the first and only `<aside>` in
 * this section, because the companion perches on it — and not a section of
 * its own either: its heading sits under "Let's talk" in the outline. The
 * chat itself only downloads as it nears the viewport (see `AskLoader`).
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
 * Three server-side values are computed once in `page.tsx` and arrive as
 * props; nothing here ever references `process.env` directly.
 * `emailDeliveryConfigured` comes from the three Resend env vars and
 * `askLiveModeConfigured` from the two `ASK_LLM_*` ones; those two booleans
 * are all that cross to the client, never a key. `bookingUrl` comes from
 * `BOOKING_URL` and goes only to `DirectLinks`, a Server Component.
 * `BusinessCard` receives none of the three: every link on the card (mailto,
 * GitHub, LinkedIn) works identically either way.
 *
 * Tone is `deep`, not `contrast`. A full inversion right where visitors do
 * their most form-focused reading read as disconnected from the rest of the
 * page rather than as a deliberate chapter break — that device stays
 * reserved for `Closing`, the page's one true contrast section.
 */

interface ContactProps {
  emailDeliveryConfigured: boolean;
  /** Computed in `page.tsx` by `askLiveModeConfigured()`; handed to the chat. */
  askLiveModeConfigured: boolean;
  /** Validated in `page.tsx`; `undefined` means no booking link renders. */
  bookingUrl?: string;
}

export default function Contact({
  emailDeliveryConfigured,
  askLiveModeConfigured,
  bookingUrl,
}: ContactProps) {
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
          <DirectLinks bookingUrl={bookingUrl} />

          {/* Screen-only, like the form: a printed page cannot ask anything.
              `scroll-mt-20` clears the sticky header, the offset `Section`
              uses for its own anchors. */}
          <div id="ask" className="no-print mt-12 max-w-[46rem] scroll-mt-20">
            <h3 className="font-display text-[length:var(--step-1)] font-normal leading-snug tracking-(--tracking-display-sm) text-fg">
              Ask about my work
            </h3>
            <div className="mt-4">
              <AskLoader liveModeConfigured={askLiveModeConfigured} />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
