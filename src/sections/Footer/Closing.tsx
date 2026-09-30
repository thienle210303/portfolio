import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Button from "@/components/ui/Button";
import { closing, closingSignoffs } from "@/content/portfolio";

// One sign-off per deploy: day-of-year modulo the authored set, computed in
// this Server Component at build time — the page is statically prerendered,
// so the pick is frozen into the HTML and there is no client render to
// disagree with it (the same hydration concern SiteFooter's hardcoded year
// documents does not arise here).
const DAY_OF_YEAR = Math.floor(
  (Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86_400_000,
);
const signoff = closingSignoffs[DAY_OF_YEAR % closingSignoffs.length];

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
      // Compressed against the standard section rhythm (owner, round 15:
      // the merged closing+footer chapter read "too huge") — 60% on top,
      // 35% below the fleuron, because the colophon line right under it is
      // the chapter's real last line and the fleuron already provides the
      // typographic pause. A farewell earns a full-bleed ground, not a
      // full chapter's worth of air.
      className="no-print pt-[calc(var(--section-y)*0.6)] pb-[calc(var(--section-y)*0.35)]"
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

      {/* The sign-off (round 15, item 4): the page's parting line, set in the
          display face with the pun's pivot word as an inline code token — the
          site's own mono delivering the punchline. One authored line per
          deploy (see `closingSignoffs`); a pivot-less signoff is a plain
          line. Plain paragraph semantics — the code chip is typography, not
          meaning.

          Round 17 took the italic off this line, and it was the only one of
          the four display italics where the slope was doing real work: it
          marked the change of voice that makes a parting line read as spoken
          rather than as one more heading. It went because the display
          italic is its own font file — 151.7 KB measured, 40% of the font
          payload — and this was one line below the fold. The code chip still
          carries the voice shift, and it is now the only thing that does, so
          a pivot-less signoff is a genuinely quieter line than it used to
          be. If the slope is ever wanted back here, the honest options are
          paying for the file or accepting a synthesised oblique; a
          faux-sheared high-contrast serif at --step-2 is why the second was
          not taken. */}
      <p className="mt-10 font-display text-[length:var(--step-2)] leading-snug text-fg">
        {signoff.lead}
        {signoff.pivot ? (
          <>
            <code className="rounded-none border border-rule bg-surface px-2 py-0.5 font-mono text-[0.72em] tracking-tight text-fg">
              {signoff.pivot}
            </code>
            {signoff.tail}
          </>
        ) : null}
      </p>

      {/* The colophon (Workstream 3, P5): a terminal ornament closing out
          the page's one contrast chapter, built the same way BusinessCard's
          own registration marks are — absolute, aria-hidden, pointer-events-
          none, drawn from `border-rule`/`bg-*` only, never a `box-shadow`.
          See `.colophon` in globals.css for the fleuron itself. */}
      <div aria-hidden="true" className="colophon mx-auto mt-10" />
    </Section>
  );
}
