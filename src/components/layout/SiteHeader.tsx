import { careerEntries, contactCopy, profile } from "@/content/portfolio";
import { buildTickets } from "@/lib/highlights";
import SiteNav from "./SiteNav";
import ThemeToggle from "./ThemeToggle";

/**
 * Server Component shell. The only genuinely interactive pieces — active-
 * section tracking, the mobile menu (open state, focus trap, Escape, scroll
 * lock) and the theme switch — live in client islands. The logo and the
 * "Let's talk" CTA are plain anchors: they need no state, so they stay on
 * the server and keep working with JavaScript disabled.
 *
 * The header is painted on the sky (`sky-fill`), so it shows exactly the
 * pixels behind it and never takes a section's tone, even when a `contrast`
 * section scrolls under it — it is fixed chrome, not page content, and it
 * stays opaque rather than translucent per the "no glassmorphism" rule.
 */
/** One fact per stop on the menu's trail, computed from the content, never
 *  restating a page's prose. Computed here, on the server, so the client
 *  island only receives four strings. */
const STOP_FACTS: Readonly<Record<string, string>> = {
  about: profile.title,
  tree: `${buildTickets().length} tags`,
  record: `${careerEntries.length} entries`,
  contact: contactCopy.postcard.place,
};

export default function SiteHeader() {
  return (
    <header
      data-site-header
      className="no-print sticky top-0 z-50 h-[var(--header-h)] border-b border-rule sky-fill text-fg"
    >
      <div
        className="shell flex h-full items-center justify-between gap-4"
        style={{
          paddingLeft: "max(var(--gutter), env(safe-area-inset-left))",
          paddingRight: "max(var(--gutter), env(safe-area-inset-right))",
        }}
      >
        {/* TL on a paper tag (round 22), punched and hung like the hero's
            clothesline tags; it swings level on hover. The drop shadow is on
            the wrapper: the tag's own clip-path would clip it. */}
        <a
          href="#about"
          aria-label={`${profile.name} — back to top`}
          className="group inline-flex min-h-11 min-w-11 items-center"
        >
          <span className="stamp-lift">
            <span data-paper="" className="brand-tag inline-flex h-8 -rotate-3 items-center pr-3 pl-[21px] font-display text-[length:var(--step-0)] font-semibold tracking-[0.04em] text-fg transition-transform duration-300 ease-(--ease-ink) group-hover:rotate-0">
              {profile.monogram}
            </span>
          </span>
        </a>

        <div className="flex items-center gap-2 lg:gap-4">
          <SiteNav facts={STOP_FACTS} />
          <ThemeToggle />
          {/* An outline, not a fill: the header shares every screen with the
              rest of the page, including Contact, whose send button is the one
              primary control (round 18, spec §4). This is the same recipe
              as `Button`'s `secondary` variant — rule-coloured border, accent
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
