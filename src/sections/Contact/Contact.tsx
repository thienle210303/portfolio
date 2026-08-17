import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import ContactForm from "./ContactForm";
import QuickConnect from "./QuickConnect";

/**
 * Server Component. Owns layout only; every interactive piece lives in a
 * client island — `QuickConnect` for the one-field path, `ContactForm` for
 * the full one — so this file itself ships with no client JS.
 *
 * The section is ordered by how much it asks of a visitor. Direct links
 * first, then a single field for anyone who would rather be chased than
 * chase, then the full form for anyone with something specific to say. There
 * is no longer a separate "prefer another way?" column: it listed the same
 * three links QuickConnect now puts at the top, and two copies of one list is
 * not an alternative, it is clutter.
 *
 * `emailDeliveryConfigured` is computed once, server-side, in `page.tsx`
 * from the three Resend env vars. Only this boolean crosses to the client;
 * nothing here ever references `process.env` directly.
 */

interface ContactProps {
  emailDeliveryConfigured: boolean;
}

export default function Contact({ emailDeliveryConfigured }: ContactProps) {
  return (
    <Section id="contact" labelledBy="contact-heading" eyebrow="Contact" tone="contrast">
      <SectionHeading
        id="contact-heading"
        lead="Take a link, leave a number, or write properly — whichever suits. Nothing is sent until you send it."
      >
        Let&rsquo;s talk
      </SectionHeading>

      {/* Above the form on purpose. Most visitors want a link, not a
          conversation with a text field — this gives them one, and gives the
          rest the smallest possible thing to fill in. */}
      <div className="mt-10 no-print">
        <QuickConnect emailDeliveryConfigured={emailDeliveryConfigured} />
      </div>

      {/* Screen-only: a printed résumé should not carry a dead form. */}
      <div className="no-print max-w-[46rem]">
        <ContactForm emailDeliveryConfigured={emailDeliveryConfigured} />
      </div>

    </Section>
  );
}
