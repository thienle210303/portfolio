/**
 * Hero identity column (round 20, spec §3): the eyebrow (current role ·
 * employer), the page's single <h1> (`profile.headline`), one paragraph
 * (`profile.positioning`) and two actions.
 *
 * The eyebrow reads `currentEntry()`, the same call the terminal's `now` tab
 * makes, so the two cannot name different jobs. `profile.about` left the hero
 * in round 20; the field stays because the chat corpus indexes it
 * (answer-corpus.ts). Nothing else renders it.
 *
 * No heading below the <h1>. Hero has nothing at <h2> (every other section's
 * <h2> comes from `SectionHeading`, which the hero deliberately does not use),
 * so an <h3> here would skip a level and fail the document-wide heading-order
 * check in e2e/accessibility.spec.ts.
 *
 * "See my work" is the screen's one primary control. "Book a call" is quiet:
 * with `BOOKING_URL` set it is an external link (Button routes `http` hrefs
 * through `ExternalLink`); without one it falls back to `#contact` rather
 * than rendering a dead link.
 */
import { profile } from "@/content/portfolio";
import { Button } from "@/components/ui/Button";
import { currentEntry } from "@/lib/terminal";

interface HeroIdentityProps {
  /** Must match the id passed as the enclosing <Section>'s `labelledBy`. */
  readonly headingId: string;
  readonly bookingUrl: string | null;
}

export default function HeroIdentity({ headingId, bookingUrl }: HeroIdentityProps) {
  const current = currentEntry();
  return (
    <div data-hero-identity="">
      <p data-hero-step="eyebrow" className="eyebrow">
        {current.role} <span aria-hidden="true">·</span> {current.organization}
      </p>

      {/* LCP guard (Workstream 3, P2): this h1 is the page's most likely
          Largest Contentful Paint candidate, so its `data-hero-step="h1"`
          keyframe in globals.css (`ink-rise`) is transform-only and never
          starts from `opacity: 0` — see that block's own comment. */}
      <h1
        id={headingId}
        data-hero-step="h1"
        className="mt-6 max-w-[18ch] text-balance font-display text-[length:var(--step-5)] font-semibold leading-[1.1] tracking-(--tracking-display-lg) text-[color:var(--fg)]"
      >
        {profile.headline}
      </h1>

      <p
        data-hero-step="intro"
        className="mt-6 max-w-[56ch] text-[length:var(--step-0)] leading-[1.6] text-[color:var(--fg-muted)]"
      >
        {profile.positioning}
      </p>

      <div data-hero-step="meta-actions" className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
        <Button href="#tree">See my work</Button>
        <Button href={bookingUrl ?? "#contact"} variant="quiet">
          Book a call
        </Button>
      </div>
    </div>
  );
}
