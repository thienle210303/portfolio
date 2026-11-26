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
 * screen's one primary control and goes to Work (round 32), the case studies
 * right under this section; it went to the Journey's tags before, and said
 * "Start with where I'm from" before that. The quiet action is "Book a call with me" with
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
import { cn } from "@/lib/cn";

/**
 * My name, title and what I work on (round 32: an outside audit found my name
 * only inside the field tag). Not a heading: the h1 stays the page's one and
 * only, and its words stay Thien's (2026-10-28). One copy per band, so the
 * order a reader hears is the order they see and only one is ever shown:
 * from 1024 Hero.tsx sets it in the yard's row the hint used to hold, over
 * the h1; from 640 it is the first line of these words; on a phone it follows
 * the h1, as a byline, because over it the h1's long first line ran into the
 * sun and the name line under it (both are drawn in the sky's top right).
 */
export function NameLine({
  className,
  yard,
  stack,
}: {
  readonly className?: string;
  readonly yard?: boolean;
  /** My name on a line of its own (the phone's byline). */
  readonly stack?: boolean;
}) {
  return (
    <p data-name-line="" {...(yard ? { "data-yard": "name" } : {})} className={cn("leading-[1.35]", className)}>
      <span
        className={cn(
          "mr-3 font-display text-[length:var(--step-1)] leading-[1.3] font-bold tracking-(--tracking-display) text-fg",
          stack && "block",
        )}
      >
        {profile.name}
      </span>
      <span className="font-mono text-[length:var(--step--1)] text-fg-muted">
        {profile.title} · {profile.specialty}
      </span>
    </p>
  );
}

interface HeroIdentityProps {
  /** Must match the id passed as the enclosing <Section>'s `labelledBy`. */
  readonly headingId: string;
  readonly bookingUrl: string | null;
}

export default function HeroIdentity({ headingId, bookingUrl }: HeroIdentityProps) {
  return (
    <div data-hero-identity="">
      <NameLine className="mb-3 hidden sm:block lg:hidden" />
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

      <NameLine stack className="mt-4 sm:hidden" />

      <p data-hero-step="intro" className="mt-5 max-w-[40ch] text-[length:var(--step-1)] leading-[1.5] text-fg-muted">
        {profile.positioning} {hero.invitation}
      </p>

      <div
        data-hero-step="meta-actions"
        data-cat-perch=""
        className="mt-6.5 flex w-fit flex-wrap items-center gap-x-2.5 gap-y-2 sm:gap-x-4 lg:gap-x-5 lg:gap-y-4"
      >
        <Button href="#work">See what I&apos;ve built</Button>
        <Button href={bookingUrl ?? "#contact"} variant="quiet" className="swash">
          {bookingUrl ? "Book a call with me" : "Send me a postcard"}
        </Button>
      </div>
    </div>
  );
}
