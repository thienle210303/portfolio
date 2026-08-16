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
 * Server Component — no interactivity needed. "Back to top" is a plain
 * anchor to `#main`, so it (and everything else here) keeps working with
 * JavaScript disabled.
 */
export default function SiteFooter() {
  const email = socialLinks.find((link) => link.platform === "Email");
  const externalLinks = socialLinks.filter((link) => link.platform !== "Email");

  return (
    <footer className="border-t border-hairline bg-ink text-paper">
      <div className="shell flex flex-col gap-8 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-4">
          {email ? (
            <a
              href={email.href}
              className="wrap-anywhere inline-flex min-h-11 w-fit items-center text-[length:var(--step-0)] text-paper"
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
                  className="inline-flex min-h-11 items-center gap-2 text-[length:var(--step--1)] text-muted transition-colors duration-150 hover:text-paper"
                >
                  {link.label}
                  <span className="text-silver">{link.handle}</span>
                  {link.external ? <span className="sr-only"> (opens in a new tab)</span> : null}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col items-start gap-4 sm:items-end">
          <a
            href="#main"
            className="inline-flex min-h-11 items-center border border-hairline px-4 text-[length:var(--step--1)] uppercase tracking-[0.14em] text-paper"
          >
            Back to top
          </a>
          <p className="text-[length:var(--step--1)] text-silver">
            © {COPYRIGHT_YEAR} {profile.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
