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
    <header
      data-site-header
      className="no-print sticky top-0 z-50 h-16 border-b border-rule bg-ground text-fg"
    >
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
          {/* An outline, not a fill: the header shares every screen with the
              rest of the page, including Contact, whose send button is the one
              blue primary control (round 18, spec §4). This is the same recipe
              as `Button`'s `secondary` variant — rule-coloured border, blue
              only on hover — written by hand because the header does not
              render through `Button`. `active:translate-y-px` is the
              mechanical press every boxed clickable on the site gets. */}
          <a
            href="#contact"
            className="inline-flex min-h-11 items-center whitespace-nowrap border border-[color:var(--rule-color)] bg-transparent px-4 text-[length:var(--step--1)] font-medium tracking-[0.01em] text-[color:var(--fg)] transition-colors duration-150 hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] active:translate-y-px"
          >
            Let&rsquo;s talk
          </a>
        </div>
      </div>
    </header>
  );
}
