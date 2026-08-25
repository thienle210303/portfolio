import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Button from "@/components/ui/Button";
import { closing } from "@/content/portfolio";

/**
 * Server Component, tone `contrast` — the page's closing chapter, and the
 * page's one inverting section since Contact moved to `deep` (round 0,
 * FB-4). Ending on the inverted ground gives the call to action a ground of
 * its own to sit on after a long light read. Since round 15 the SiteFooter
 * colophon shares this same tone scope and renders directly below with no
 * separating border — chapter and colophon read as one closing block, and
 * the page's single "Back to top" lives down there.
 *
 * Everything here — this file's own text and borders as much as the shared
 * `Button` / `SectionHeading` primitives — styles against the semantic
 * aliases, so the inversion is handled entirely by the tone class on
 * <Section> and nothing below needs a per-tone branch.
 *
 * The email/GitHub/LinkedIn links that used to sit beside these two buttons
 * are gone (owner feedback, round 2): `SiteFooter` renders immediately below
 * this section on every page and already lists all three, so Closing was
 * repeating a fact that was about to appear again one scroll later. "Get in
 * touch" still routes to Contact, where the same links live as cards, for
 * anyone who wants one directly instead of scrolling.
 *
 * The copyright line lives in `SiteFooter`; it is deliberately not repeated
 * here.
 */
export default function Closing() {
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

      {/* One action, not two (round 15): the colophon line directly below —
          same tone scope since the footer joined this chapter — already
          carries the page's single "Back to top", so a second boxed copy a
          few hundred pixels above it was pure duplication. "Get in touch"
          stays as the chapter's one primary control. */}
      <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
        <Button href="#contact" variant="primary" size="md">
          Get in touch
        </Button>
      </div>

      {/* The colophon (Workstream 3, P5): a terminal ornament closing out
          the page's one contrast chapter, built the same way BusinessCard's
          own registration marks are — absolute, aria-hidden, pointer-events-
          none, drawn from `border-rule`/`bg-*` only, never a `box-shadow`.
          See `.colophon` in globals.css for the fleuron itself. */}
      <div aria-hidden="true" className="colophon mx-auto mt-14" />
    </Section>
  );
}
