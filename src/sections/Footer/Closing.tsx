import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Button from "@/components/ui/Button";
import ExternalLink from "@/components/ui/ExternalLink";
import { closing, socialLinks } from "@/content/portfolio";

/**
 * Server Component, tone `contrast` — the page's closing chapter, and one of
 * only two sections that invert against the active theme (Contact is the
 * other). Ending on the inverted ground gives the two calls to action a
 * ground of their own to sit on after a long light read.
 *
 * Everything here — this file's own text and borders as much as the shared
 * `Button` / `SectionHeading` / `ExternalLink` primitives — styles against the
 * semantic aliases, so the inversion is handled entirely by the tone class on
 * <Section> and nothing below needs a per-tone branch.
 *
 * The copyright line lives in `SiteFooter`; it is deliberately not repeated
 * here.
 */
export default function Closing() {
  const emailLink = socialLinks.find((link) => link.platform === "Email");
  const otherLinks = socialLinks.filter((link) => link.platform !== "Email");

  return (
    <Section
      id="closing"
      labelledBy="closing-heading"
      eyebrow="Closing"
      tone="contrast"
      className="no-print"
    >
      <SectionHeading id="closing-heading">{closing.heading}</SectionHeading>

      <p className="max-w-[68ch] text-[length:var(--step-1)] text-fg-muted">{closing.body}</p>

      <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
        <Button href="#contact" variant="primary" size="md">
          Get in touch
        </Button>

        <Button href="#main" variant="secondary" size="md">
          Back to top
        </Button>

        {emailLink ? (
          <a
            href={emailLink.href}
            className="wrap-anywhere inline-flex min-h-11 items-center text-[length:var(--step-0)] text-fg"
          >
            {emailLink.handle}
          </a>
        ) : null}

        {otherLinks.length > 0 ? (
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {otherLinks.map((link) => (
              <li key={link.id}>
                <ExternalLink
                  href={link.href}
                  className="inline-flex min-h-11 items-center gap-2 text-[length:var(--step--1)] text-fg"
                >
                  {link.label}
                  <span className="wrap-anywhere text-fg-muted">{link.handle}</span>
                </ExternalLink>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Section>
  );
}
