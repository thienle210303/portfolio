import { careerEntries, contactCopy, profile } from "@/content/portfolio";
import { buildTickets } from "@/lib/highlights";
import SiteNav from "./SiteNav";
import ThemeToggle from "./ThemeToggle";

/**
 * Server Component shell. The only genuinely interactive pieces — active-
 * section tracking, the mobile menu (open state, focus trap, Escape, scroll
 * lock) and the theme switch — live in client islands. The logo and the
 * "Let's talk" stamp are plain anchors: they need no state, so they stay on
 * the server and keep working with JavaScript disabled.
 *
 * Round 23: there is no bar. The header is transparent, and three bits of
 * paper sit on the sky — my TL tag, a torn strip held up by washi tape that
 * carries the nav and the sun or moon, and a postage stamp for "Let's talk".
 * Each is opaque paper (`bg-surface`) so what scrolls behind them never
 * shows through, and the header itself takes no pointer events, so the gaps
 * between the paper pass clicks to the page. The strip's wrapper must not
 * carry a transform or a filter: the phone menu's panel is `position: fixed`
 * inside it, and either would make the strip, not the window, its box. The
 * paper's tilt and shadow live on its own aria-hidden layers instead.
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
      className="no-print pointer-events-none sticky top-0 z-50 h-[var(--header-h)] text-fg"
    >
      <div
        className="shell flex h-full items-start justify-between gap-4"
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
          className="group pointer-events-auto inline-flex min-h-11 min-w-11 items-center self-center"
        >
          <span className="stamp-lift">
            <span data-paper="" className="brand-tag inline-flex h-8 -rotate-3 items-center pr-3 pl-[21px] font-display text-[length:var(--step-0)] font-semibold tracking-[0.04em] text-fg transition-transform duration-300 ease-(--ease-ink) group-hover:rotate-0">
              {profile.monogram}
            </span>
          </span>
        </a>

        <div className="flex items-start gap-3 lg:gap-5">
          {/* The strip. `data-paper` scopes the ink to the paper, as on the
              Record's pages; the paper itself is the two aria-hidden layers
              (shadow, then the torn sheet) and the tape. */}
          <div data-paper="" className="nav-strip pointer-events-auto relative mt-1.5 flex h-[3.125rem] items-start pr-1 pb-1.5 pl-1.5">
            <span aria-hidden="true" className="nav-paper-shadow">
              <span className="nav-paper bg-surface" />
            </span>
            <span aria-hidden="true" className="nav-tape nav-tape-l" />
            <span aria-hidden="true" className="nav-tape nav-tape-r" />
            <SiteNav facts={STOP_FACTS} />
            <ThemeToggle />
          </div>

          {/* A postage stamp, not a button: it shares every screen with the
              page, including Contact, whose send button is the one primary
              control (round 18, spec §4), so it is paper and ink and never
              `--control`. Hidden under 640px, where the menu has Contact. */}
          <a
            href="#contact"
            className="group nav-stamp stamp-lift pointer-events-auto mt-1.5 hidden h-11 rotate-2 items-center whitespace-nowrap text-fg transition-transform duration-150 hover:-translate-y-px active:translate-y-px sm:inline-flex"
          >
            <span data-paper="" className="nav-stamp-paper bg-surface">
              <span className="nav-stamp-face border border-rule font-display text-[length:var(--step--1)] font-semibold tracking-[0.01em] text-fg transition-colors duration-150 group-hover:text-accent">
                Let&rsquo;s talk
              </span>
            </span>
          </a>
        </div>
      </div>
    </header>
  );
}
