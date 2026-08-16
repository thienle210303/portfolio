import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Button from "@/components/ui/Button";
import ExternalLink from "@/components/ui/ExternalLink";
import { closing, socialLinks } from "@/content/portfolio";

/**
 * Server Component, tone `paper` — the second and last warm off-white
 * section on the page. `Section` applies `.on-light` for this tone, which
 * (per SPEC.md §1/§2) is responsible for flipping every shared-primitive
 * colour, including the focus ring, so `Button`/`SectionHeading`/
 * `ExternalLink` below need no special handling here.
 *
 * Text and borders this file draws itself (not through a shared primitive)
 * use the explicit "-light" tokens from the palette table directly —
 * `text-ink-light` / `text-muted-light` / `border-hairline-light` — rather
 * than relying on any implicit cross-tone flip, so this section's contrast
 * is correct by construction regardless of exactly how that flip is
 * implemented elsewhere.
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
      eyebrow="08 / CLOSING"
      tone="paper"
      className="no-print"
    >
      <SectionHeading id="closing-heading">{closing.heading}</SectionHeading>

      <p className="max-w-[68ch] text-[length:var(--step-1)] text-muted-light">{closing.body}</p>

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
            className="wrap-anywhere inline-flex min-h-11 items-center text-[length:var(--step-0)] text-ink-light"
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
                  className="inline-flex min-h-11 items-center gap-2 text-[length:var(--step--1)] text-ink-light"
                >
                  {link.label}
                  <span className="wrap-anywhere text-muted-light">{link.handle}</span>
                </ExternalLink>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Section>
  );
}
