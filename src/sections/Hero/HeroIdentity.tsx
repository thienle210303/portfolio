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
 * `location`/`availability` are `Maybe<string>` and currently hold literal
 * `[NEEDS INPUT: ...]` markers in content. `resolved()` is typed so those
 * collapse to `undefined` at compile time (see its doc comment in
 * @/types/portfolio) — the branch below is structurally incapable of
 * rendering a marker, not just guarded by a runtime check. Once real values
 * are supplied, this exact code renders the metadata row with no changes.
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
  "inline-flex min-h-11 items-center justify-center gap-2 border border-[color:var(--rule-color)] bg-transparent px-6 py-2.5 font-sans text-[length:var(--step-0)] font-medium text-[color:var(--fg)] transition-colors duration-200 hover:border-[color:var(--fg)]";

export default function HeroIdentity({ headingId }: HeroIdentityProps) {
  const location = resolved(profile.location);
  const availability = resolved(profile.availability);
  const hasMeta = location !== undefined || availability !== undefined;

  return (
    <div>
      <p className="eyebrow">
        {profile.name} <span aria-hidden="true">·</span> {profile.title}
      </p>

      <h1
        id={headingId}
        className="mt-6 max-w-[18ch] text-balance font-display text-[length:var(--step-5)] font-normal leading-[1.02] tracking-[-0.03em] text-[color:var(--fg)]"
      >
        {profile.headline}
      </h1>

      <p className="mt-6 max-w-[56ch] text-[length:var(--step-1)] leading-[1.6] text-[color:var(--fg-muted)]">
        {profile.intro}
      </p>

      {hasMeta ? (
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2">
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

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Button href="#work">Explore my work</Button>
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
