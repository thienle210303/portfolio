/**
 * Hero identity column: the eyebrow (name + title), the page's single <h1>
 * (profile.headline), the intro paragraph, an optional location/availability
 * metadata row, and the three hero actions.
 *
 * The social links row (GitHub/LinkedIn/Email) that used to close this column
 * is gone (owner feedback, round 2): Contact already carries the same three
 * as cards, and the site footer lists them again on every page, so the hero
 * was one more repetition of a fact stated twice already. The three actions
 * below already route to Contact for anyone who wants them.
 *
 * The About paragraphs used to render at the bottom of this column, but at
 * >=1360px that made them a lone narrow stack beside a large empty area once
 * the code artifact ended (FB-2). They now render in `HeroAbout`, a
 * full-width band `Hero` places below the fold instead of inside this
 * column — same content, same `<Section id="about">`, different composition.
 *
 * `location`/`availability` are `Maybe<string>`. Through round 17 both were
 * unsupplied and the metadata row rendered nothing; round 18 authored real
 * values, so the row renders now (`tests/lib/content.test.ts` pins both).
 * `resolved()` is still typed so a `[NEEDS INPUT: ...]` marker collapses to
 * `undefined` at compile time (see its doc comment in @/types/portfolio) —
 * the branch below is structurally incapable of rendering a marker, not just
 * guarded by a runtime check.
 *
 * "Open résumé" points at /resume, the résumé *view*, rather than straight at
 * the PDF. The view offers the download itself, so this keeps the visitor on
 * the site by default and still gets them the file in one more click — and it
 * means a phone, where a downloaded PDF is an awkward thing to receive
 * unasked, shows a readable page instead.
 */
import Link from "next/link";
import { profile } from "@/content/portfolio";
import { resolved } from "@/types/portfolio";
import { Button } from "@/components/ui/Button";

interface HeroIdentityProps {
  /** Must match the id passed as the enclosing <Section>'s `labelledBy`. */
  readonly headingId: string;
}

const RESUME_LINK_CLASS =
  "inline-flex min-h-11 items-center justify-center gap-2 border border-[color:var(--rule-color)] bg-transparent px-6 py-2.5 font-sans text-[length:var(--step-0)] font-medium text-[color:var(--fg)] transition-colors duration-200 hover:border-[color:var(--fg)] active:translate-y-px";

export default function HeroIdentity({ headingId }: HeroIdentityProps) {
  const location = resolved(profile.location);
  const availability = resolved(profile.availability);
  const hasMeta = location !== undefined || availability !== undefined;

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

      <p
        data-hero-step="intro"
        className="mt-6 max-w-[56ch] text-[length:var(--step-1)] leading-[1.6] text-[color:var(--fg-muted)]"
      >
        {profile.intro}
      </p>

      {hasMeta ? (
        <dl data-hero-step="meta-actions" className="mt-6 flex flex-wrap gap-x-8 gap-y-2">
          {location ? (
            <div className="flex items-baseline gap-2">
              <dt className="eyebrow">Location</dt>
              <dd className="wrap-anywhere text-[length:var(--step--1)] text-[color:var(--fg-muted)]">
                {location}
              </dd>
            </div>
          ) : null}
          {availability ? (
            <div className="flex items-baseline gap-2">
              <dt className="eyebrow">Availability</dt>
              <dd className="wrap-anywhere text-[length:var(--step--1)] text-[color:var(--fg-muted)]">
                {availability}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <div data-hero-step="meta-actions" className="mt-8 flex flex-wrap items-center gap-4">
        <Button href="#tree">Explore my work</Button>
        <Link href="/resume" className={RESUME_LINK_CLASS}>
          Open résumé
        </Link>
        <Button href="#contact" variant="quiet">
          Contact me
        </Button>
      </div>
    </div>
  );
}
