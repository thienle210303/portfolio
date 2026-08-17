import { profile, socialLinks } from "@/content/portfolio";
import CompanionRecoveryLink from "./CompanionRecoveryLink";

/**
 * Hardcoded rather than `new Date().getFullYear()` — computing the year
 * during render risks a server/client hydration mismatch if the page is
 * ever rendered right at a year boundary, and this route has no build-time
 * date injection to pull from instead. Bump this by hand when the year
 * turns over.
 */
const COPYRIGHT_YEAR = 2026;

/**
 * Server Component. "Back to top" is a plain anchor to `#main`, so it (and
 * every link here) keeps working with JavaScript disabled. The one
 * exception is `CompanionRecoveryLink`, a tiny client island rendered
 * below — see that file for why it has to be one, and why it stays absent
 * (not merely hidden) on every load except the one it exists for.
 */
export default function SiteFooter() {
  const email = socialLinks.find((link) => link.platform === "Email");
  const externalLinks = socialLinks.filter((link) => link.platform !== "Email");

  return (
    <footer className="border-t border-rule bg-ground text-fg">
      <div className="shell flex flex-col gap-8 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-4">
          {email ? (
            <a
              href={email.href}
              className="wrap-anywhere inline-flex min-h-11 w-fit items-center text-[length:var(--step-0)] text-fg"
            >
              {email.handle}
            </a>
          ) : null}

          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {externalLinks.map((link) => (
              <li key={link.id}>
                <a
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  className="inline-flex min-h-11 items-center gap-2 text-[length:var(--step--1)] text-fg-muted transition-colors duration-150 hover:text-fg"
                >
                  {link.label}
                  <span className="text-fg-subtle">{link.handle}</span>
                  {link.external ? <span className="sr-only"> (opens in a new tab)</span> : null}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col items-start gap-4 sm:items-end">
          <a
            href="#main"
            className="inline-flex min-h-11 items-center border border-rule px-4 text-[length:var(--step--1)] uppercase tracking-[0.14em] text-fg"
          >
            Back to top
          </a>
          <p className="text-[length:var(--step--1)] text-fg-subtle">
            © {COPYRIGHT_YEAR} {profile.name}
          </p>
          <CompanionRecoveryLink />
        </div>
      </div>
    </footer>
  );
}
