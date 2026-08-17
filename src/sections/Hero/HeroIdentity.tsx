/**
 * Hero identity column: the eyebrow (name + title), the page's single <h1>
 * (profile.headline), the intro paragraph, an optional location/availability
 * metadata row, the three hero actions, and the social links row.
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
import { profile, socialLinks } from "@/content/portfolio";
import { resolved } from "@/types/portfolio";
import { Button } from "@/components/ui/Button";
import { ExternalLink } from "@/components/ui/ExternalLink";

interface HeroIdentityProps {
  /** Must match the id passed as the enclosing <Section>'s `labelledBy`. */
  readonly headingId: string;
}

const RESUME_LINK_CLASS =
  "inline-flex min-h-11 items-center justify-center gap-2 border border-[color:var(--rule-color)] bg-transparent px-6 py-2.5 font-sans text-[length:var(--step-0)] font-medium text-[color:var(--fg)] transition-colors duration-200 hover:border-[color:var(--fg)]";

const SOCIAL_LINK_CLASS =
  "wrap-anywhere inline-flex min-h-11 items-center py-1 font-mono text-[length:var(--step--1)] uppercase tracking-[0.08em] text-[color:var(--fg-muted)] transition-colors duration-200 hover:text-[color:var(--fg)]";

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

      {/*
        `gap-y-0` is not an oversight. Each link already carries `min-h-11` for
        its 44px tap target, so on a phone — where these always wrap to one per
        row — a vertical gap on top of that stacked to ~170px of near-empty
        column. The rows sit flush; the tap targets are untouched.
      */}
      <ul role="list" aria-label="Social links" className="mt-8 flex flex-wrap gap-x-6 gap-y-0">
        {socialLinks.map((link) => (
          <li key={link.id}>
            {link.external ? (
              <ExternalLink href={link.href} className={SOCIAL_LINK_CLASS}>
                {link.label} · {link.handle}
              </ExternalLink>
            ) : (
              <a href={link.href} className={SOCIAL_LINK_CLASS}>
                {link.label} · {link.handle}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
