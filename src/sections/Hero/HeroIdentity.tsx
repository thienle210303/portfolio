/**
 * Hero identity column (round 21): the page's single <h1>
 * (`profile.headline`), one paragraph (`profile.positioning`, then
 * `hero.invitation`) and two actions.
 *
 * `profile.about` left the hero in round 20; the field stays because the chat
 * corpus indexes it (answer-corpus.ts). Nothing else renders it.
 *
 * No heading below the <h1>. Hero has nothing at <h2> (every other section's
 * <h2> comes from `SectionHeading`, which the hero deliberately does not use),
 * so an <h3> here would skip a level and fail the document-wide heading-order
 * check in e2e/accessibility.spec.ts.
 *
 * "Start with where I'm from" is the screen's one primary control. "Book a
 * call with me" is quiet: with `BOOKING_URL` set it is an external link
 * (Button routes `http` hrefs through `ExternalLink`); without one it falls
 * back to `#contact` rather than rendering a dead link. The actions row is the
 * cats' perch.
 */
import { hero, profile } from "@/content/portfolio";
import { Button } from "@/components/ui/Button";

interface HeroIdentityProps {
  /** Must match the id passed as the enclosing <Section>'s `labelledBy`. */
  readonly headingId: string;
  readonly bookingUrl: string | null;
}

export default function HeroIdentity({ headingId, bookingUrl }: HeroIdentityProps) {
  return (
    <div data-hero-identity="">
      {/* LCP guard: the sky SVG is the expected Largest Contentful Paint, but
          this h1 is the largest text candidate, so its `data-hero-step="h1"`
          keyframe in globals.css (`ink-rise`) is transform-only and never
          starts from `opacity: 0`. From 1024 to ~1180 the column beside my
          field tag is narrow, so the size follows it (`9cqw - 40px`, the hero
          is the container) and the headline stays two lines: three pushed the
          primary action below a 1024×768 screen. */}
      <h1
        id={headingId}
        data-hero-step="h1"
        className="max-w-[18ch] text-balance font-display text-[length:var(--step-5)] font-semibold lg:text-[length:min(var(--step-5),9cqw_-_40px)] leading-[0.98] tracking-(--tracking-display-lg) text-fg"
      >
        {profile.headline}
      </h1>

      <p data-hero-step="intro" className="mt-5 max-w-[40ch] text-[length:var(--step-1)] leading-[1.5] text-fg-muted">
        {profile.positioning} {hero.invitation}
      </p>

      <div
        data-hero-step="meta-actions"
        data-cat-perch=""
        className="mt-6.5 flex w-fit flex-wrap items-center gap-x-5 gap-y-4"
      >
        <Button href="#tree">Start with where I&apos;m from</Button>
        <Button href={bookingUrl ?? "#contact"} variant="quiet">
          Book a call with me
        </Button>
      </div>
    </div>
  );
}
