import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import BusinessCard from "./BusinessCard";
import ContactForm from "./ContactForm";
import QuickConnect from "./QuickConnect";

/**
 * Server Component. Owns layout only; every interactive piece lives in a
 * client island — `QuickConnect` for the one-field path, `ContactForm` for
 * the full one — so this file itself ships with no client JS of its own.
 * `BusinessCard` is a Server Component too (it renders `CopyButton`, a
 * client island, as a child, which costs nothing extra here).
 *
 * Round-3 feedback reshaped this from a single stacked column into two
 * panes at >=1024px: a "contact me" pane (this same one field, then the
 * full form, in the order they always rendered in) beside one business-card
 * panel that now carries everything QuickConnect's old three-card row used
 * to — email, GitHub, LinkedIn — plus the name, title and philosophy line
 * that make it read as an actual card rather than a link list.
 *
 * DOM order deliberately does not match visual order at >=1024px, the same
 * choice `SelectedWork` already makes for `ProjectIndex`: the card comes
 * first in markup — so it reads and tabs as what it is, an introduction,
 * ahead of the request for a message — and `lg:col-start-2` is what moves it
 * to the right visually. Below 1024px there is no grid to place it into, so
 * DOM order *is* visual order: the card stacks first, then the one field,
 * then the full form — the same "least effort first" progression this
 * section always used, just with three link cards now folded into one.
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
        lead="Take a link, leave a number, or write properly — whichever suits. Nothing is sent until you send it."
      >
        Let&rsquo;s talk
      </SectionHeading>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-x-16 xl:grid-cols-[minmax(0,1fr)_24rem]">
        {/* Pure identity, not wrapped in `.no-print`: unlike the two forms
            beside it, a business card is exactly the kind of thing worth
            printing. See BusinessCard's own comment for the fuller case. */}
        <BusinessCard className="lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1" />

        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          {/* Above the form on purpose. Most visitors want a shortcut, not a
              conversation with a text field — this gives them the smallest
              possible thing to fill in. */}
          <div className="no-print">
            <QuickConnect emailDeliveryConfigured={emailDeliveryConfigured} />
          </div>

          {/* Screen-only: a printed résumé should not carry a dead form. */}
          <div className="no-print max-w-[46rem]">
            <ContactForm emailDeliveryConfigured={emailDeliveryConfigured} />
          </div>
        </div>
      </div>
    </Section>
  );
}
