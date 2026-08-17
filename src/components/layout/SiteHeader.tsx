import { profile } from "@/content/portfolio";
import SiteNav from "./SiteNav";
import ThemeToggle from "./ThemeToggle";

/**
 * Server Component shell. The only genuinely interactive pieces — active-
 * section tracking, the mobile menu (open state, focus trap, Escape, scroll
 * lock) and the theme switch — live in client islands. The logo and the
 * "Let's talk" CTA are plain anchors: they need no state, so they stay on
 * the server and keep working with JavaScript disabled.
 *
 * The header sits on the *quiet* ground of whichever theme is active and never
 * takes a section's tone, even when a `contrast` section scrolls under it — it
 * is fixed chrome, not page content, and it stays solid rather than
 * translucent per the "no glassmorphism" rule.
 */
export default function SiteHeader() {
  return (
    <header className="no-print sticky top-0 z-50 h-16 border-b border-rule bg-ground text-fg">
      <div
        className="shell flex h-full items-center justify-between gap-4"
        style={{
          paddingLeft: "max(var(--gutter), env(safe-area-inset-left))",
          paddingRight: "max(var(--gutter), env(safe-area-inset-right))",
        }}
      >
        <a
          href="#about"
          aria-label={`${profile.name} — back to top`}
          className="inline-flex min-h-11 items-center text-[length:var(--step-0)] font-medium tracking-[0.02em] text-fg"
        >
          {profile.monogram}
        </a>

        <div className="flex items-center gap-2 lg:gap-4">
          <SiteNav />
          <ThemeToggle />
          {/* The one filled control in the chrome. `--accent` paired with
              `--fg-inverse` clears 7:1 in both themes — see docs/contrast.md —
              which a hardcoded white-on-blue would not once night inverts the
              accent to the lighter blue. */}
          <a
            href="#contact"
            className="inline-flex min-h-11 items-center whitespace-nowrap bg-accent px-4 text-[length:var(--step--1)] font-medium tracking-[0.01em] text-fg-inverse transition-colors duration-150 hover:bg-accent-strong hover:text-ground"
          >
            Let&rsquo;s talk
          </a>
        </div>
      </div>
    </header>
  );
}
