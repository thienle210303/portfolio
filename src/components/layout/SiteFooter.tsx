import { analyticsEnabled } from "@/components/layout/SiteAnalytics";
import { footerLine, profile } from "@/content/portfolio";

/**
 * Hardcoded rather than `new Date().getFullYear()` — computing the year
 * during render risks a server/client hydration mismatch if the page is
 * ever rendered right at a year boundary, and this route has no build-time
 * date injection to pull from instead. Bump this by hand when the year
 * turns over.
 */
const COPYRIGHT_YEAR = 2026;

/**
 * Server Component, no client islands. One line: copyright, the owner's
 * quip, and — only where the scripts it describes actually run — the
 * analytics disclosure. It wraps to a second line on a narrow viewport and
 * no further. Email and social links live in Contact, not here.
 *
 * `tone-contrast` stays because the strip is now the page's last contrast
 * surface: the companion's `syncTone` repoints the cats' ink there, and the
 * tone's contrast pairings (scripts/contrast.mjs) stay exercised. Aliases only.
 */
export default function SiteFooter() {
  return (
    <footer className="tone-contrast bg-ground text-fg">
      <div className="shell">
        {/* `tabular-nums`: the year sets in the default sans face, not the
            mono the rail's figures get — see the note on `.rail` in
            globals.css. */}
        <p className="py-4 text-[length:var(--step--1)] text-fg-subtle tabular-nums">
          © {COPYRIGHT_YEAR} {profile.name} · {footerLine}
          {/* Behind the same `analyticsEnabled()` predicate as the scripts
              themselves: ungated, a preview or local build claimed
              measurement that was not happening. Plain text, not a link —
              the only outbound-looking thing in the strip would not be
              Thien's own. */}
          {analyticsEnabled() ? (
            <>
              {" "}
              <span aria-hidden="true">·</span> <span>Anonymous page counts, no cookies (Vercel)</span>
            </>
          ) : null}
        </p>
      </div>
    </footer>
  );
}
