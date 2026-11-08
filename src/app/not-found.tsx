import type { Metadata } from "next";
import Link from "next/link";
import { TICKET_CLASSES, TicketFace } from "@/components/ui/Ticket";
import { navItems } from "@/content/portfolio";

/**
 * A page that isn't here. Server-rendered, in my voice, on the same sky: an
 * empty tag taped to the page, then the way back in, the site's four parts as
 * the nav names them. Not indexed, and with no canonical (the layout's would
 * point a search engine at the home page as if this were it).
 */
export const metadata: Metadata = {
  title: "Not here",
  robots: { index: false, follow: true },
  alternates: { canonical: null },
};

export default function NotFound() {
  return (
    <div className="tone-base section-ground flex min-h-[calc(100svh-var(--header-h,0px))] flex-col">
      <div className="shell flex w-full flex-1 flex-col justify-center gap-8 py-16">
        {/* An empty tag taped to the page: nothing written on it yet. (Not on
            a line: a line has to be strung between two things that stand.) */}
        <div aria-hidden="true" className="relative h-[110px] w-[120px]">
          <span className="tag-cut absolute top-3 left-4 h-[90px] w-[84px] rotate-6 bg-surface [--cut:18px]" />
          <span className="absolute top-1 left-[26px] h-[18px] w-[64px] -rotate-3 bg-[color-mix(in_srgb,var(--twine)_45%,var(--surface))] opacity-85" />
        </div>

        <div className="grid max-w-[34rem] gap-3">
          <p className="font-mono text-[length:var(--step--2)] font-bold tracking-[0.08em] text-fg-muted">404</p>
          <h1 className="font-display text-[length:var(--step-chapter)] leading-[1.05] font-bold tracking-[-0.02em] text-balance text-fg">
            Nothing hangs here.
          </h1>
          <p className="text-[length:var(--step-1)] text-pretty text-fg-muted">
            This page isn&apos;t on my line. Maybe the link was old, or a letter slipped. Everything I&apos;ve written is on one page:
          </p>
        </div>

        <nav aria-label="The site" className="grid gap-4">
          <ul role="list" className="flex flex-wrap gap-x-6 gap-y-1">
            {navItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/#${item.sectionId}`}
                  className="inline-flex min-h-11 items-center font-semibold text-fg underline decoration-rule underline-offset-4 transition-colors duration-200 hover:text-accent hover:decoration-current"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/" className={`${TICKET_CLASSES} self-start font-semibold`}>
            <TicketFace>Back to the site</TicketFace>
          </Link>
        </nav>
      </div>
    </div>
  );
}
