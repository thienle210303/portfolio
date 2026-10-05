/**
 * Hero identity column: the eyebrow (name + title), the page's single <h1>
 * (profile.headline), then About itself — the site's one-line positioning
 * (`profile.positioning`) as its lead, one type step above `profile.about`'s
 * three paragraphs — and the hero's two links.
 *
 * The social links row (GitHub/LinkedIn/Email) that used to close this column
 * is gone (owner feedback, round 2): Contact already carries the same three
 * as cards, and the site footer lists them again on every page, so the hero
 * was one more repetition of a fact stated twice already. A "Contact me" link
 * went the same way in round 18: the sticky header's "Let's talk" is always
 * on screen and goes to the same place.
 *
 * Through round 17 the About paragraphs lived in a full-width band below the
 * fold (`HeroAbout`), because they were too long for this column. Round 18
 * cut them to three short paragraphs, so they render here and the band is
 * gone. Location and availability are not in this column any more: they
 * moved to the section's margin rail (Hero.tsx), which states each once.
 *
 * No heading below the <h1>. Hero has nothing at <h2> (every other section's
 * <h2> comes from `SectionHeading`, which the hero deliberately does not use),
 * so an <h3> here would skip a level and fail the document-wide heading-order
 * check in e2e/accessibility.spec.ts.
 *
 * About asks for nothing (spec §4): one quiet link into the World (`#worlds`,
 * the next section) and the résumé. Neither is a filled blue `primary`;
 * tests/sections/Hero.test.tsx checks that no element in the hero carries the
 * accent fill.
 *
 * "Open résumé" points at /resume, the résumé *view*, rather than straight at
 * the PDF. The view offers the download itself, so this keeps the visitor on
 * the site by default and still gets them the file in one more click — and it
 * means a phone, where a downloaded PDF is an awkward thing to receive
 * unasked, shows a readable page instead.
 */
import Link from "next/link";
import { profile } from "@/content/portfolio";
import { Button } from "@/components/ui/Button";

interface HeroIdentityProps {
  /** Must match the id passed as the enclosing <Section>'s `labelledBy`. */
  readonly headingId: string;
}

const RESUME_LINK_CLASS =
  "inline-flex min-h-11 items-center justify-center gap-2 border border-[color:var(--rule-color)] bg-transparent px-6 py-2.5 font-sans text-[length:var(--step-0)] font-medium text-[color:var(--fg)] transition-colors duration-200 hover:border-[color:var(--fg)] active:translate-y-px";

export default function HeroIdentity({ headingId }: HeroIdentityProps) {
  return (
    <div>
      <p data-hero-step="eyebrow" className="eyebrow">
        {profile.name} <span aria-hidden="true">·</span> {profile.title}
      </p>

      {/* LCP guard (Workstream 3, P2): this h1 is the page's most likely
          Largest Contentful Paint candidate, so its `data-hero-step="h1"`
          keyframe in globals.css (`ink-rise`) is transform-only and never
          starts from `opacity: 0` — see that block's own comment. */}
      <h1
        id={headingId}
        data-hero-step="h1"
        className="mt-6 max-w-[18ch] text-balance font-display text-[length:var(--step-5)] font-normal leading-[1.02] tracking-(--tracking-display-lg) text-[color:var(--fg)]"
      >
        {profile.headline}
      </h1>

      {/* About: the positioning line as its lead, then the three paragraphs.
          Plain <p>s with no eyebrow or heading of their own — see the heading
          note in this file's banner. */}
      <div data-hero-step="intro" className="mt-6 max-w-[56ch] space-y-4">
        <p className="text-[length:var(--step-1)] leading-[1.5] text-[color:var(--fg)]">
          {profile.positioning}
        </p>
        {profile.about.map((paragraph) => (
          <p
            key={paragraph}
            className="text-[length:var(--step-0)] leading-[1.6] text-[color:var(--fg-muted)]"
          >
            {paragraph}
          </p>
        ))}
      </div>

      <div data-hero-step="meta-actions" className="mt-8 flex flex-wrap items-center gap-4">
        <Button href="#worlds" variant="quiet">
          Explore my work
        </Button>
        <Link href="/resume" className={RESUME_LINK_CLASS}>
          Open résumé
        </Link>
      </div>
    </div>
  );
}
