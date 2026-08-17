"use client";

import type { Ref } from "react";
import { navItems, profile, socialLinks } from "@/content/portfolio";
import { cn } from "@/lib/cn";

/**
 * The quick-actions panel the lead cat carries.
 *
 * Every action in here also exists in the header, the hero or the contact
 * section. That is the rule the whole companion depends on: it is a shortcut,
 * never the only route, which is what makes it safe to send the cats away and
 * safe to remove them entirely.
 *
 * Split out from `Companion` because it has nothing to do with the animation —
 * no position, no frame, no timing. It is ordinary markup with ordinary
 * handlers, and keeping it here leaves the orchestrator to the one hard thing
 * it actually does.
 */

export const PANEL_ID = "companion-actions";

/** Sections the cats will jump to. Each is resolved against `navItems` rather
 *  than relabelled here, so the panel cannot drift from the nav. */
const JUMP_TO = ["work", "journey", "skills", "contact"] as const;

interface ToolkitPanelProps {
  readonly copied: boolean;
  readonly onCopyEmail: () => void;
  /** Closes the panel — a jump inside a single page leaves it hanging open. */
  readonly onNavigate: () => void;
  readonly onSendAway: () => void;
  readonly onTurnOff: () => void;
  readonly panelRef?: Ref<HTMLDivElement>;
}

export function ToolkitPanel({
  copied,
  onCopyEmail,
  onNavigate,
  onSendAway,
  onTurnOff,
  panelRef,
}: ToolkitPanelProps) {
  const github = socialLinks.find((link) => link.platform === "GitHub");
  const linkedin = socialLinks.find((link) => link.platform === "LinkedIn");

  return (
    // Deliberately not `role="menu"`. That role promises a menu widget —
    // arrow-key navigation between items, Home/End, typeahead — and this is a
    // small panel of ordinary links and buttons that Tab already handles
    // correctly. Claiming the role without implementing the keyboard contract
    // is worse for a screen-reader user than claiming nothing, so the panel is
    // a plain labelled group and the cat points at it with aria-controls.
    <div
      ref={panelRef}
      id={PANEL_ID}
      aria-label="Quick actions"
      className={cn(
        // Anchored to the corner rather than to the cat: the cat moves every
        // frame, and a panel that tracked it would be a moving target to click.
        // It clears the cats' own resting height so the two never overlap —
        // they return to this corner whenever the panel opens.
        "pointer-events-auto absolute bottom-[4.75rem] right-6 w-[min(19rem,calc(100vw-3rem))]",
        "border border-rule bg-surface p-1 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)]",
      )}
    >
      <p className="px-3 pb-2 pt-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-fg-subtle">
        Jump to
      </p>
      <div className="grid grid-cols-2 gap-px">
        {JUMP_TO.map((sectionId) => {
          const item = navItems.find((nav) => nav.sectionId === sectionId);
          if (!item) return null;
          return (
            <a
              key={item.id}
              // Root-relative, so the toolkit works from /resume as well as
              // from the home page.
              href={`/#${item.sectionId}`}
              onClick={onNavigate}
              className="flex min-h-11 items-center px-3 text-[length:var(--step--1)] text-fg hover:text-accent"
            >
              {item.label}
            </a>
          );
        })}
      </div>

      <p className="px-3 pb-2 pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-fg-subtle">
        Reach me
      </p>
      <div className="flex flex-col">
        <button
          type="button"
          onClick={onCopyEmail}
          className="flex min-h-11 items-center justify-between gap-3 px-3 text-left text-[length:var(--step--1)] text-fg hover:text-accent"
        >
          <span className="wrap-anywhere">{profile.email}</span>
          <span
            aria-live="polite"
            className="shrink-0 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-fg-subtle"
          >
            {copied ? "Copied" : "Copy"}
          </span>
        </button>
        {github ? (
          <a
            href={github.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center px-3 text-[length:var(--step--1)] text-fg hover:text-accent"
          >
            GitHub
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : null}
        {linkedin ? (
          <a
            href={linkedin.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center px-3 text-[length:var(--step--1)] text-fg hover:text-accent"
          >
            LinkedIn
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : null}
      </div>

      {/* Two exits, not one. "Away" is reversible and shows you where they
          went; "off" is the preference. Conflating them is what made the old
          single control a trapdoor. */}
      <div className="mt-2 flex flex-col border-t border-rule">
        <button
          type="button"
          onClick={onSendAway}
          className="flex min-h-11 items-center px-3 text-left font-mono text-[0.62rem] uppercase tracking-[0.14em] text-fg-subtle hover:text-fg"
        >
          Send the cats away
        </button>
        <button
          type="button"
          onClick={onTurnOff}
          className="flex min-h-11 items-center px-3 text-left font-mono text-[0.62rem] uppercase tracking-[0.14em] text-fg-subtle hover:text-fg"
        >
          Turn the cats off
        </button>
      </div>
    </div>
  );
}

export default ToolkitPanel;
