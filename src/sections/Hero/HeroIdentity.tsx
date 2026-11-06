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
 * Each action names where it lands (round 22). "See what I've built" is the
 * screen's one primary control and goes to the Journey, whose tags carry the
 * work at every width; it used to say "Start with where I'm from", which the
 * Journey only drew from 1024. The quiet action is "Book a call with me" with
 * `BOOKING_URL` set, an external link (Button routes `http` hrefs through
 * `ExternalLink`); without one it says "Send me a postcard" and goes to
 * `#contact`, where the postcard is, rather than promise a call nobody can
 * book. The actions row is the cats' perch.
 *
 * The two actions share a row wherever they fit (from about 375) and wrap
 * where they do not; nothing stacks them by width (round 25: the yard's poles
 * start below the hint now, so nothing stands beside the row).
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
          primary action below a 1024×768 screen. From 640 to 1023 my words
          sit in a column beside my field tag, which is the container there
          (`.hero-yard` in globals.css), so the size follows that column. */}
      <h1
        id={headingId}
        data-hero-step="h1"
        className="max-w-[18ch] text-balance font-display text-[length:var(--step-5)] font-semibold sm:max-lg:text-[length:min(var(--step-5),13cqw)] lg:text-[length:min(var(--step-5),9cqw_-_40px)] leading-[0.98] tracking-(--tracking-display-lg) text-fg"
      >
        {profile.headline}
      </h1>

      <p data-hero-step="intro" className="mt-5 max-w-[40ch] text-[length:var(--step-1)] leading-[1.5] text-fg-muted">
        {profile.positioning} {hero.invitation}
      </p>

      <div
        data-hero-step="meta-actions"
        data-cat-perch=""
        className="mt-6.5 flex w-fit flex-wrap items-center gap-x-2.5 gap-y-2 sm:gap-x-4 lg:gap-x-5 lg:gap-y-4"
      >
        <Button href="#tree">See what I&apos;ve built</Button>
        <Button href={bookingUrl ?? "#contact"} variant="quiet">
          {bookingUrl ? "Book a call with me" : "Send me a postcard"}
        </Button>
      </div>
    </div>
  );
}
