"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { contactCopy, profile, socialLinks } from "@/content/portfolio";
import CopyButton from "@/components/ui/CopyButton";
import ExternalLink from "@/components/ui/ExternalLink";
import LeadForm from "./LeadForm";

/**
 * A business card that flips over to a short lead form.
 *
 * Front: who I am and every way to reach me — email (with copy), GitHub,
 * LinkedIn, the résumé, a vCard to save, a booking link when `BOOKING_URL`
 * is valid — and "Let me reach you", which turns the card over. A click on
 * the front's empty area turns it too; a click on a link or button never does.
 * Back: `LeadForm`. Its Back button and Escape turn it over again.
 *
 * The flip is a CSS 3D rotation of `[data-flip]`; both faces share one grid
 * cell, so the card is as tall as the taller face. Under reduced motion the
 * global rule in globals.css removes the transition and the turn is instant.
 * The face turned away is `inert`, and focus follows the turn: to the name
 * field going over, to the trigger coming back.
 *
 * No fixed aspect ratio any more. Until round 20 the one-sided card held
 * `lg:aspect-[13/10]`, measured to clear its content at both column widths
 * (352px and 384px). Measured on a production build in round 20 phase 6, each
 * face at its natural height: front 384.9px / 351.2px and back 448.5px /
 * 450.9px at 352px / 384px, against 270.8px / 295.4px for 13/10. Neither
 * face fits, so the card takes its height from the taller face (the back) at
 * every width. `e2e/contact.spec.ts` checks that neither face clips.
 *
 * `data-cat-hide` is a contract with src/components/companion: this panel is
 * opaque and has a clear band above its top edge, so the cats occasionally
 * duck behind it. It is the only element on the site that carries it, and the
 * companion perches on `#contact aside`, so this stays the section's only
 * `<aside>`.
 *
 * Print shows the front only: the back face is `.no-print`, and the print
 * stylesheet un-turns `[data-flip]`. Decorations (engraved frame, corner
 * ticks, fleuron) are out of flow, `aria-hidden`, built from `border-rule` so
 * they survive print, and colour stays on the semantic aliases throughout.
 * The front's content sits at the top of its face; when the back is taller,
 * the spare height falls below the actions, not between the blocks.
 */

interface BusinessCardProps {
  /** Already validated by `validBookingUrl` in `page.tsx`; `null` renders no booking link. */
  readonly bookingUrl: string | null;
  readonly emailDeliveryConfigured: boolean;
}

const FACE_CLASS =
  "relative isolate overflow-hidden border border-rule bg-surface p-6 [grid-area:1/1] backface-hidden sm:p-7";

const LINK_ROW_CLASS = "group flex items-baseline gap-2 py-1 text-fg transition-colors duration-200";

/** One column for "GitHub" and "LinkedIn", so both handles start at the same x. */
const LINK_LABEL_CLASS = "inline-block w-[4.5rem] shrink-0 whitespace-nowrap text-fg-subtle";

/** `.ink-link-quiet` by hand: the hover belongs to the parent row's `<a>`. */
const HANDLE_CLASS =
  "whitespace-nowrap underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color] duration-(--dur-quick) group-hover:text-accent group-hover:decoration-current";

const ACTION_LINK_CLASS = "ink-link-quiet inline-flex min-h-6 items-center text-fg hover:text-accent";

const QUIET_BUTTON_CLASS =
  "inline-flex min-h-11 items-center justify-center border border-rule bg-surface px-4 text-[length:var(--step--1)] text-fg transition-colors duration-150 hover:border-fg-muted active:translate-y-px";

function Frame() {
  return (
    <>
      <span aria-hidden="true" className="pointer-events-none absolute inset-3 border border-rule" />
      <span aria-hidden="true" className="pointer-events-none absolute top-1 left-1 h-1.5 w-1.5 border-t border-l border-rule" />
      <span aria-hidden="true" className="pointer-events-none absolute top-1 right-1 h-1.5 w-1.5 border-t border-r border-rule" />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-1 left-1 h-1.5 w-1.5 border-b border-l border-rule" />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-1 right-1 h-1.5 w-1.5 border-b border-r border-rule" />
    </>
  );
}

export default function BusinessCard({ bookingUrl, emailDeliveryConfigured }: BusinessCardProps) {
  const github = socialLinks.find((link) => link.platform === "GitHub");
  const linkedin = socialLinks.find((link) => link.platform === "LinkedIn");

  const [flipped, setFlipped] = useState(false);
  // Focus only follows a turn the visitor made, never the first render.
  const turned = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!turned.current) return;
    if (flipped) backRef.current?.querySelector("input")?.focus();
    else triggerRef.current?.focus();
  }, [flipped]);

  function turn(to: boolean) {
    turned.current = true;
    setFlipped(to);
  }

  function onFrontClick(event: MouseEvent) {
    if ((event.target as Element).closest("a, button")) return;
    // A drag that selected text (an address, say) is not a request to flip.
    if (window.getSelection()?.toString()) return;
    turn(true);
  }

  return (
    <aside aria-label={`${profile.name} — business card`} data-cat-hide className="perspective-distant">
      <div
        data-flip
        data-flipped={flipped}
        className={`grid transform-3d transition-transform duration-(--dur-settle) ease-(--ease-ink) ${flipped ? "rotate-y-180" : ""}`}
      >
        <div
          data-face="front"
          inert={flipped}
          onClick={onFrontClick}
          className={`${FACE_CLASS} cursor-pointer`}
        >
          <Frame />

          <div className="relative">
            <p className="font-display text-[length:var(--step-1)] leading-[1.05] tracking-[-0.02em] text-fg">
              {profile.name}
            </p>
            <p className="eyebrow mt-1 leading-tight">{profile.title}</p>
            <p className="mt-1 text-[length:var(--step--1)] text-fg-muted">{profile.location}</p>
            {/* The chat corpus cites this line to Contact; keep it on the front. */}
            <p className="hanging-quote mt-3 font-display text-[length:var(--step--1)] leading-snug text-fg-muted">
              &ldquo;{profile.philosophy}&rdquo;
            </p>
          </div>

          <div className="relative mt-5 space-y-2 border-t border-rule pt-3 font-mono text-[length:var(--step--1)] leading-snug">
            {/* Fleuron: a rotated square sitting on the rule, out of flow. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-[3.5px] left-1/2 h-[7px] w-[7px] -translate-x-1/2 rotate-45 border border-rule bg-surface"
            />
            {/* The compact CopyButton keeps a 44px hit area on a 32px box,
                which is what fits it beside the address on one row. */}
            <div className="flex items-center justify-between gap-2">
              <a
                href={`mailto:${profile.email}`}
                className="ink-link-quiet block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-fg hover:text-accent"
              >
                {profile.email}
              </a>
              <CopyButton value={profile.email} label="Copy email address" variant="compact" className="shrink-0" />
            </div>
            {/* The platform name is part of each link's own name, so a row is
                never announced as a bare handle. */}
            {github ? (
              <ExternalLink href={github.href} className={LINK_ROW_CLASS}>
                <span className={LINK_LABEL_CLASS}>{github.platform}</span>{" "}
                <span className={HANDLE_CLASS}>{github.handle}</span>
              </ExternalLink>
            ) : null}
            {linkedin ? (
              <ExternalLink href={linkedin.href} className={LINK_ROW_CLASS}>
                <span className={LINK_LABEL_CLASS}>{linkedin.platform}</span>{" "}
                <span className={HANDLE_CLASS}>{linkedin.handle}</span>
              </ExternalLink>
            ) : null}
          </div>

          <div className="relative mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <ul role="list" className="flex flex-wrap gap-x-4 gap-y-1 text-[length:var(--step--1)]">
              {/* next/link: the trip to /resume and back keeps the chat's
                  thread (see `threadCache` in AskThisSite.tsx). */}
              <li>
                <Link href="/resume" className={ACTION_LINK_CLASS}>
                  Résumé
                </Link>
              </li>
              <li>
                <a href="/contact.vcf" download className={ACTION_LINK_CLASS}>
                  Save contact
                </a>
              </li>
              {bookingUrl ? (
                <li>
                  <ExternalLink href={bookingUrl} className={ACTION_LINK_CLASS}>
                    Book a call
                  </ExternalLink>
                </li>
              ) : null}
            </ul>
            <button ref={triggerRef} type="button" onClick={() => turn(true)} className={QUIET_BUTTON_CLASS}>
              {contactCopy.flip}
            </button>
          </div>
        </div>

        <div ref={backRef} data-face="back" inert={!flipped} className={`${FACE_CLASS} no-print rotate-y-180`}>
          <Frame />
          <LeadForm emailDeliveryConfigured={emailDeliveryConfigured} onBack={() => turn(false)} />
        </div>
      </div>
    </aside>
  );
}
