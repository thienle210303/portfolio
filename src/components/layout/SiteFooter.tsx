import { Fragment } from "react";
import { profile, socialLinks } from "@/content/portfolio";

/**
 * Hardcoded rather than `new Date().getFullYear()` — computing the year
 * during render risks a server/client hydration mismatch if the page is
 * ever rendered right at a year boundary, and this route has no build-time
 * date injection to pull from instead. Bump this by hand when the year
 * turns over.
 */
const COPYRIGHT_YEAR = 2026;

/**
 * Server Component, no client islands. "Back to top" is a plain anchor to
 * `#main`, so it (and every link here) keeps working with JavaScript
 * disabled; the target carries `tabIndex={-1}` (see `layout.tsx`), which is
 * what turns the fragment jump into a real focus move rather than a scroll
 * that strands the keyboard cursor.
 *
 * Reads as one colophon line — copyright, email, GitHub, LinkedIn, Back to
 * top — separated by quiet `·` dividers, wrapping to more than one line only
 * once a narrow viewport forces it. Each divider is `aria-hidden`: the
 * accessible structure is just a flat run of a paragraph and links, nothing
 * a screen reader needs to announce as a list. Every link keeps a 44px tap
 * target via `min-h-11` + padding, never a larger font, so the line stays
 * visually quiet while remaining easy to hit on touch.
 *
 * `CompanionRecoveryLink`, the one client island this file used to render,
 * is gone along with the companion's `off` mode it existed to escape — the
 * bed is the only rest state now, so there is nothing left to recover from.
 */
export default function SiteFooter() {
  const email = socialLinks.find((link) => link.platform === "Email");
  const externalLinks = socialLinks.filter((link) => link.platform !== "Email");

  const divider = (
    <span aria-hidden="true" className="px-2 text-fg-subtle">
      ·
    </span>
  );

  return (
    // `tone-contrast`, matching the Closing section directly above (round 15,
    // item 5, deepened by the owner's follow-up): the page's final chapter
    // used to end with a hard cut — dark thank-you, then a light colophon
    // strip, then TWO "Back to top" controls within one screen. The footer
    // now lives inside the closing's tone scope with no separating border
    // (the closing's own fleuron ornament above is the typographic break),
    // and carries the page's single Back to top — the closing's boxed copy
    // is gone. Aliases only; the companion's tone sampler picks this scope
    // up like any other.
    <footer className="tone-contrast bg-ground text-fg">
      <div className="shell">
        <div className="flex flex-wrap items-center gap-y-2 py-5 text-[length:var(--step--1)] text-fg-subtle">
          {/* `tabular-nums` (Workstream 3, P4): the year sets in this line's
              default sans face, not the mono the rail's own figures get for
              free — see the note on `.rail` in globals.css. */}
          <p className="inline-flex items-center py-1 tabular-nums">
            © {COPYRIGHT_YEAR} {profile.name}
          </p>

          {email ? (
            <Fragment>
              {divider}
              <a
                href={email.href}
                className="wrap-anywhere inline-flex min-h-11 items-center px-1 text-fg"
              >
                {email.handle}
              </a>
            </Fragment>
          ) : null}

          {externalLinks.map((link) => (
            <Fragment key={link.id}>
              {divider}
              <a
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                className="inline-flex min-h-11 items-center px-1 text-fg-muted transition-colors duration-150 hover:text-fg"
              >
                {link.label}
                {link.external ? <span className="sr-only"> (opens in a new tab)</span> : null}
              </a>
            </Fragment>
          ))}

          {divider}
          {/* The site's one piece of self-referential copy, and it earns the
              space by naming a source the way every plaque and rail figure
              does. Vercel Web Analytics is cookieless and stores nothing
              personal, so no consent banner is required — but "we measure
              this" is still a fact about the page, and the alternative to
              saying it here is not saying it anywhere. Deliberately plain
              text, not a link: an outbound link would be the only one in the
              colophon that is not Thien's own. Only true in production; see
              `SiteAnalytics.tsx`. */}
          <p className="inline-flex items-center py-1">Anonymous page counts, no cookies (Vercel)</p>

          {divider}
          {/* This was the one boxed clickable on the page with neither a
              hover state nor a transition to it (Workstream 3, P3) — every
              other bordered control on the site darkens/accents on hover and
              now presses on click; this one did neither. */}
          <a
            href="#main"
            className="inline-flex min-h-11 items-center border border-rule px-4 uppercase tracking-[0.14em] text-fg transition-colors duration-150 hover:border-accent hover:text-accent active:translate-y-px"
          >
            Back to top
          </a>
        </div>
      </div>
    </footer>
  );
}
