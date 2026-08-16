import { profile } from "@/content/portfolio";
import SiteNav from "./SiteNav";

/**
 * Server Component shell. The only genuinely interactive pieces — active-
 * section tracking and the mobile menu (open state, focus trap, Escape,
 * scroll lock) — live in the client island `SiteNav`. The logo and the
 * "Let's talk" CTA are plain anchors: they need no state, so they stay on
 * the server and keep working with JavaScript disabled.
 *
 * The header is a solid `--color-ink` panel regardless of which section is
 * scrolled underneath it (never `.on-light`) — it is fixed chrome, not
 * page content, per the "no glassmorphism" rule.
 */
export default function SiteHeader() {
  return (
    <header className="no-print sticky top-0 z-50 h-16 border-b border-hairline bg-ink text-paper">
      <div
        className="shell flex h-full items-center justify-between gap-4"
        style={{
          paddingLeft: "max(var(--gutter), env(safe-area-inset-left))",
          paddingRight: "max(var(--gutter), env(safe-area-inset-right))",
        }}
      >
        <a
          href="#about"
          className="inline-flex min-h-11 items-center text-[length:var(--step-0)] font-medium tracking-[0.02em] text-paper"
        >
          {profile.monogram}
          <span className="sr-only"> — {profile.name}, back to top</span>
        </a>

        <div className="flex items-center gap-3 lg:gap-6">
          <SiteNav />
          <a
            href="#contact"
            className="inline-flex min-h-11 items-center whitespace-nowrap border border-hairline px-4 text-[length:var(--step--1)] font-medium tracking-[0.01em] transition-opacity duration-150 hover:opacity-90"
            style={{ backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
          >
            Let&rsquo;s talk
          </a>
        </div>
      </div>
    </header>
  );
}
