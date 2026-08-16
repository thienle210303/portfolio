import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import CopyButton from "@/components/ui/CopyButton";
import ExternalLink from "@/components/ui/ExternalLink";
import { socialLinks } from "@/content/portfolio";
import ContactForm from "./ContactForm";

/**
 * Server Component. Owns layout and the static "alternative ways to reach
 * me" column; all interactivity (the intent chooser, the form, the mailto
 * fallback) lives in the `ContactForm` client island so this file — and the
 * bulk of the section's markup — ships with zero client JS of its own.
 *
 * `emailDeliveryConfigured` is computed once, server-side, in `page.tsx`
 * from the three Resend env vars. Only this boolean crosses to the client;
 * nothing here ever references `process.env` directly.
 */

interface ContactProps {
  emailDeliveryConfigured: boolean;
}

export default function Contact({ emailDeliveryConfigured }: ContactProps) {
  const emailLink = socialLinks.find((link) => link.platform === "Email");
  const otherLinks = socialLinks.filter((link) => link.platform !== "Email");

  return (
    <Section id="contact" labelledBy="contact-heading" eyebrow="07 / CONTACT" tone="ink">
      <SectionHeading
        id="contact-heading"
        lead="Pick whatever best describes why you're here, or skip straight to the form — everything stays editable before anything goes anywhere."
      >
        Let&rsquo;s talk
      </SectionHeading>

      <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-x-10">
        {/* Screen-only: a printed résumé should not carry a dead form. The
            contact details in the aside beside it do still print, since
            those are useful on paper. */}
        <div className="no-print lg:col-span-7">
          <ContactForm emailDeliveryConfigured={emailDeliveryConfigured} />
        </div>

        <aside className="lg:col-span-5" aria-labelledby="contact-alternatives-heading">
          <h3 id="contact-alternatives-heading" className="text-[length:var(--step-0)] font-medium text-paper">
            Prefer another way?
          </h3>

          <div className="mt-6 flex flex-col gap-6 border border-hairline bg-surface p-6">
            {emailLink ? (
              <div className="flex flex-col gap-2">
                <span className="text-[length:var(--step--1)] uppercase tracking-[0.08em] text-muted">Email</span>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="wrap-anywhere text-[length:var(--step-0)] text-paper">{emailLink.handle}</span>
                  <CopyButton value={emailLink.handle} label="Copy email address" />
                </div>
              </div>
            ) : null}

            {otherLinks.length > 0 ? (
              <div className="flex flex-col gap-3">
                <span className="text-[length:var(--step--1)] uppercase tracking-[0.08em] text-muted">
                  Elsewhere
                </span>
                <ul className="flex flex-col gap-3">
                  {otherLinks.map((link) => (
                    <li key={link.id}>
                      <ExternalLink
                        href={link.href}
                        className="inline-flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 text-[length:var(--step-0)] text-paper"
                      >
                        {link.label}
                        <span className="wrap-anywhere text-[length:var(--step--1)] text-silver">
                          {link.handle}
                        </span>
                      </ExternalLink>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </Section>
  );
}
