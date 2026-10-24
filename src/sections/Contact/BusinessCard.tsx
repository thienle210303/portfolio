import type { ReactNode } from "react";
import Link from "next/link";
import { profile, socialLinks } from "@/content/portfolio";
import { Drawing } from "@/components/scenery/Drawing";
import CopyButton from "@/components/ui/CopyButton";
import ExternalLink from "@/components/ui/ExternalLink";
import VisuallyHidden from "@/components/ui/VisuallyHidden";

/**
 * My business card, paper-clipped and slightly turned (round 21's postcard
 * board): name, title and my seal, where I live, the quote on a moss rule,
 * then every way to reach me with its icon, and Résumé / Save contact (and
 * Book a call, when `BOOKING_URL` is valid) as outlined chips. The faint
 * "TL" monogram bleeds off the bottom right. A server component: only the
 * copy button is a client island. The lead form is the postcard beside it.
 *
 * `data-cat-hide` is a contract with src/components/companion: this panel is
 * opaque and has a clear band above its top edge, so the cats occasionally
 * duck behind it. It is the only element on the site that carries it, and the
 * companion perches on `#contact aside`, so this stays the section's only
 * `<aside>`.
 *
 * Every decoration (clip, monogram, icons) is `aria-hidden`. Platform names
 * are visually hidden at the start of each link, so a row is never announced
 * as a bare handle and the visible handle stays inside the name.
 */

/** The board's own line icons, 16px, drawn in `currentColor`. */
const ICON = {
  pin: <path d="M7 13s4.5-4.2 4.5-7.3A4.5 4.5 0 0 0 2.5 5.7C2.5 8.8 7 13 7 13ZM8.5 5.7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />,
  mail: <path d="M2.5 3.5h11a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1ZM2 4.5l6 4.5 6-4.5" />,
  code: <path d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5" />,
  linkedin: <path d="M3.5 1.5h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2ZM5 7v4.5M5 4.6v.1M8 11.5V8.8c0-1 .7-1.8 1.7-1.8s1.8.8 1.8 1.8v2.7" />,
  doc: <path d="M3.5 1.5h6L13 5v9.5H3.5ZM9.5 1.5V5H13M5.7 8h4.6M5.7 10.8h4.6" />,
  card: <path d="M2.5 3.5h11a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1ZM7.2 7.4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM3.6 11c.4-1.1 1.1-1.6 2.1-1.6s1.7.5 2.1 1.6M9.2 6.8h3.3M9.2 9.2h2.8" />,
  calendar: <path d="M2.5 3.5h11v10h-11ZM2.5 6.5h11M5.5 2v3M10.5 2v3" />,
} as const;

function Icon({ name, className = "size-4" }: { readonly name: keyof typeof ICON; readonly className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICON[name]}
    </svg>
  );
}

/** An outlined chip, 34px to the eye; `before:` grows the hit area to 44px. */
const CHIP =
  "relative inline-flex h-[34px] items-center gap-[7px] rounded-full border border-rule bg-surface px-[13px] text-[14px] text-fg transition-colors duration-150 before:absolute before:inset-x-0 before:-inset-y-[5px] hover:border-fg-muted";

function Chip({ icon, children }: { readonly icon: keyof typeof ICON; readonly children: ReactNode }) {
  return (
    <>
      <Icon name={icon} className="size-3.5" />
      {children}
    </>
  );
}

export default function BusinessCard({ bookingUrl }: { readonly bookingUrl: string | null }) {
  const github = socialLinks.find((link) => link.platform === "GitHub");
  const linkedin = socialLinks.find((link) => link.platform === "LinkedIn");

  return (
    <aside
      aria-label={`${profile.name} — business card`}
      data-cat-hide
      className="relative mx-auto w-full max-w-[430px] -rotate-1 lg:mx-0 lg:-rotate-[2.5deg]"
    >
      <div className="paper-lift relative isolate flex h-full flex-col overflow-hidden bg-surface p-3">
        {/* Drawn by `::before`, not as text: a watermark at 6% is not text
            to read, and axe would measure it as text however hidden. */}
        <span
          aria-hidden="true"
          data-monogram={profile.monogram}
          className="pointer-events-none absolute right-[22px] -bottom-[34px] -z-10 font-display text-[210px] leading-[0.8] font-semibold tracking-[-0.02em] text-fg opacity-[0.06] before:content-[attr(data-monogram)]"
        />

        <div className="flex flex-1 flex-col border border-rule px-5 pt-6 pb-5 sm:pt-[26px] sm:pb-[22px] xl:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-display text-[30px] leading-none font-semibold tracking-[-0.02em] text-fg">
                {profile.name}
              </p>
              <p className="mt-2 font-mono text-[12.5px] tracking-[0.16em] text-fg-muted uppercase">{profile.title}</p>
            </div>
            {/* My name as it is written at home, on a red seal. */}
            <p className="flex h-[66px] w-[58px] shrink-0 -rotate-[4deg] flex-col items-center justify-center rounded-[4px] bg-mark font-serif text-[19px] leading-[1.05] text-fg-inverse italic shadow-[inset_0_0_0_3px_var(--mark),inset_0_0_0_4.5px_var(--fg-inverse)]">
              <VisuallyHidden>My seal: </VisuallyHidden>
              <span lang="vi" className="contents">
                <span>Thiện</span> <span>Lê</span>
              </span>
            </p>
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-[14px] text-fg-muted">
            <Icon name="pin" className="size-[13px]" />
            {profile.location}
          </p>
          {/* The chat corpus cites this line to Contact; keep it on the card. */}
          <p className="mt-4 border-l-2 border-accent pl-3 [text-wrap:balance] font-serif text-[18px] leading-[1.35] text-fg italic">
            {profile.philosophy}
          </p>

          <div className="mt-5 mb-3.5 h-px bg-rule" />

          <ul role="list" className="relative flex flex-col gap-[3px] font-mono text-[13px] max-[339px]:text-[11.5px] leading-snug xl:text-[14.5px]">
            <li className="flex items-center gap-2 xl:gap-2.5">
              <Icon name="mail" className="size-4 text-accent" />
              <a
                href={`mailto:${profile.email}`}
                className="ink-link-quiet min-w-0 flex-1 overflow-hidden py-1 max-lg:py-[13px] max-[339px]:py-[15px] text-ellipsis whitespace-nowrap text-fg hover:text-accent"
              >
                {profile.email}
              </a>
              {/* 32px to the eye, 44px to the pointer (CopyButton's compact). */}
              <CopyButton
                value={profile.email}
                label="Copy email address"
                variant="compact"
                className="shrink-0 rounded-full"
              />
            </li>
            {github ? (
              <li className="flex items-center gap-2 xl:gap-2.5">
                <Icon name="code" className="size-4 text-accent" />
                <ExternalLink href={github.href} className="ink-link-quiet min-w-0 py-1 max-lg:py-[13px] max-[339px]:py-[15px] text-fg hover:text-accent">
                  <VisuallyHidden>{github.platform}</VisuallyHidden>{" "}
                  <span className="break-all">{github.href.replace(/^https:\/\//, "")}</span>
                </ExternalLink>
              </li>
            ) : null}
            {linkedin ? (
              <li className="flex items-center gap-2 xl:gap-2.5">
                <Icon name="linkedin" className="size-4 text-accent" />
                <ExternalLink href={linkedin.href} className="ink-link-quiet min-w-0 py-1 max-lg:py-[13px] max-[339px]:py-[15px] text-fg hover:text-accent">
                  <VisuallyHidden>{linkedin.platform}</VisuallyHidden>{" "}
                  {linkedin.handle}
                </ExternalLink>
              </li>
            ) : null}
          </ul>

          <ul role="list" className="mt-auto flex flex-wrap gap-2 pt-6">
            {/* next/link: the trip to /resume and back keeps the chat's
                thread (see `threadCache` in AskThisSite.tsx). */}
            <li>
              <Link href="/resume" className={CHIP}>
                <Chip icon="doc">Résumé</Chip>
              </Link>
            </li>
            <li>
              <a href="/contact.vcf" download className={CHIP}>
                <Chip icon="card">Save contact</Chip>
              </a>
            </li>
            {bookingUrl ? (
              <li>
                <ExternalLink href={bookingUrl} className={CHIP}>
                  <Chip icon="calendar">Book a call</Chip>
                </ExternalLink>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
      <Drawing
        name="paper-clip"
        className="pointer-events-none absolute -top-[26px] left-[55%] h-[86px] w-[34px]"
      />
    </aside>
  );
}
