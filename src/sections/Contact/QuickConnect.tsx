"use client";

import { useId, useState } from "react";
// `lucide-react` dropped brand/logo marks (GitHub, LinkedIn, …) some
// versions ago — trademark reasons, not an oversight — so these are the
// closest neutral stand-ins: GitBranch for a code-hosting platform,
// Briefcase for a professional one. The mono eyebrow beside each still
// names the platform in words, so nothing depends on the icon alone to say
// what it is.
import { ArrowUpRight, Briefcase, GitBranch, Mail, type LucideIcon } from "lucide-react";
import { profile, socialLinks } from "@/content/portfolio";
import CopyButton from "@/components/ui/CopyButton";
import ExternalLink from "@/components/ui/ExternalLink";
import { cn } from "@/lib/cn";

/**
 * The zero-effort route to a conversation, sitting above the full form.
 *
 * Two ideas, in order of how little they ask of a visitor:
 *
 *  1. Direct links, as structured cards rather than interchangeable rows —
 *     each states what it is (a mono eyebrow naming the platform), the
 *     identity itself, and how it is used (copy, for email; an outbound
 *     arrow, for the two platforms that leave the site). Most people who
 *     want to reach out already know which of these they prefer, and none
 *     of them require typing anything at all.
 *  2. One field. If they would rather be chased than chase, they leave an
 *     email address or a phone number and nothing else. No name, no subject,
 *     no message — a single input is the smallest thing that still produces
 *     something actionable.
 *
 * A browser cannot read a visitor's phone number; no API exposes it, for good
 * reason. What `autocomplete` and `inputmode` below buy is the next best
 * thing — their keyboard offers the number they have saved, so "typing" it is
 * usually one tap.
 *
 * The full form underneath is untouched and still the right tool for anyone
 * with something specific to say. This is a shortcut past it, not a
 * replacement for it.
 */

interface QuickConnectProps {
  /** Computed server-side in page.tsx from the three Resend env vars. */
  readonly emailDeliveryConfigured: boolean;
}

type Status = "idle" | "sending" | "sent" | "error";

const FIELD_CLASS =
  "min-h-12 w-full border border-rule bg-surface px-3 text-[length:var(--step-0)] text-fg placeholder:text-fg-subtle";

/*
 * The three link cards share one shape — eyebrow row, identity, affordance —
 * so `justify-between` in a fixed-height column is what keeps that rhythm
 * identical across all three regardless of how long a handle happens to be.
 * `bg-surface` on `tone="deep"`'s slightly darker ground is what reads as a
 * raised card rather than a flat row; the hairline grid around them (see the
 * `bg-rule` container below) is the same technique Skills and
 * MetricHighlights use, so this reads as one family with the rest of the
 * page rather than a one-off card style invented here.
 */
const CARD_CLASS = "flex min-h-[11.5rem] flex-col justify-between gap-6 bg-surface p-6 text-fg";

const AFFORDANCE_CLASS =
  "inline-flex items-center gap-1.5 text-[length:var(--step--1)] text-fg-subtle transition-colors duration-200 group-hover:text-accent";

interface PlatformCardProps {
  readonly icon: LucideIcon;
  readonly platform: string;
  readonly handle: string;
  readonly href: string;
}

/** GitHub and LinkedIn are the same shape — a mono platform eyebrow, the
 * handle as the identity, and a "View profile" affordance carrying the
 * outbound arrow icon — so the card is a link's entire accessible name,
 * not decoration bolted onto one. Colour never carries that affordance
 * alone: the handle also underlines and the arrow shifts on hover/focus. */
function PlatformCard({ icon: Icon, platform, handle, href }: PlatformCardProps) {
  return (
    <ExternalLink href={href} className={cn(CARD_CLASS, "group")}>
      <span className="flex items-start justify-between gap-3">
        <span className="eyebrow">{platform}</span>
        <Icon
          aria-hidden="true"
          focusable="false"
          className="h-4 w-4 shrink-0 text-fg-subtle transition-colors duration-200 group-hover:text-accent"
        />
      </span>
      <span className="wrap-anywhere text-[length:var(--step-0)] font-medium underline-offset-4 group-hover:text-accent group-hover:underline">
        {handle}
      </span>
      <span className={AFFORDANCE_CLASS}>
        View profile
        <ArrowUpRight
          aria-hidden="true"
          focusable="false"
          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
      </span>
    </ExternalLink>
  );
}

export default function QuickConnect({ emailDeliveryConfigured }: QuickConnectProps) {
  const inputId = useId();
  const messageId = useId();
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const github = socialLinks.find((link) => link.platform === "GitHub");
  const linkedin = socialLinks.find((link) => link.platform === "LinkedIn");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = contact.trim();

    if (trimmed === "") {
      setError("Enter an email address or a phone number.");
      setStatus("error");
      return;
    }

    // Without Resend configured there is no server to receive this, so rather
    // than pretend, hand the details to the visitor's own mail app prefilled.
    // Same deliberate fallback the full form uses.
    if (!emailDeliveryConfigured) {
      const subject = encodeURIComponent("Please reach out");
      const body = encodeURIComponent(`Hi Thien — please get in touch with me at ${trimmed}.`);
      window.location.href = `mailto:${profile.email}?subject=${subject}&body=${body}`;
      return;
    }

    setStatus("sending");
    setError(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "callback", contact: trimmed, website: "" }),
      });
      const result = await response.json();

      if (result?.ok) {
        setStatus("sent");
        setContact("");
        return;
      }

      setStatus("error");
      setError(
        result?.fieldErrors?.contact ??
          "That didn't send. Email me directly and it will definitely reach me.",
      );
    } catch {
      setStatus("error");
      setError("That didn't send. Email me directly and it will definitely reach me.");
    }
  }

  return (
    <div className="mb-14 border-b border-rule pb-12">
      {/* A hairline grid, not three separate boxes: the container fills with
          --rule-color and `gap-px` lets exactly one pixel of it show between
          cells, so the dividers are the same weight as every other rule on
          the page instead of a doubled-up border where two cards meet. */}
      <div className="grid gap-px border border-rule bg-rule sm:grid-cols-3">
        <div className={CARD_CLASS}>
          <div className="flex items-start justify-between gap-3">
            <p className="eyebrow">Email</p>
            <Mail aria-hidden="true" focusable="false" className="h-4 w-4 shrink-0 text-fg-subtle" />
          </div>
          <a
            href={`mailto:${profile.email}`}
            className="wrap-anywhere text-[length:var(--step-0)] font-medium underline-offset-4 hover:text-accent hover:underline"
          >
            {profile.email}
          </a>
          {/* Stacks under the address rather than sitting inline with it:
              "thienle210303@gmail.com" plus a labelled button does not fit
              one line at the card's width, and trimming the button's label
              to "Copy" would cost a screen reader the only thing that says
              what is being copied. */}
          <CopyButton value={profile.email} label="Copy email address" />
        </div>
        {github ? (
          <PlatformCard icon={GitBranch} platform={github.platform} handle={github.handle} href={github.href} />
        ) : null}
        {linkedin ? (
          <PlatformCard
            icon={Briefcase}
            platform={linkedin.platform}
            handle={linkedin.handle}
            href={linkedin.href}
          />
        ) : null}
      </div>

      <div className="mt-10">
        <h3 className="font-display text-[length:var(--step-1)] text-fg">
          You won&rsquo;t need to chase me — I&rsquo;ll find my way to you.
        </h3>

        <form onSubmit={onSubmit} noValidate className="mt-5">
          <label htmlFor={inputId} className="block text-[length:var(--step--1)] text-fg-muted">
            Leave an email or phone number
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id={inputId}
              name="contact"
              type="text"
              value={contact}
              onChange={(event) => {
                setContact(event.target.value);
                if (status === "error") setStatus("idle");
              }}
              // `email`, not `email tel`. The autocomplete spec allows exactly
              // one field-name token, and axe flags the pair as invalid under
              // 1.3.5 — a field cannot advertise two purposes at once. Email is
              // the one worth advertising: it is the commoner answer and the one
              // that needs no follow-up. A phone number still works, it just
              // does not autofill.
              autoComplete="email"
              inputMode="text"
              placeholder="Email or phone number"
              aria-describedby={status === "idle" ? undefined : messageId}
              aria-invalid={status === "error"}
              className={cn(FIELD_CLASS, "sm:flex-1", status === "error" && "border-fg")}
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="min-h-12 shrink-0 border border-accent bg-accent px-6 text-[length:var(--step-0)] font-medium text-fg-inverse transition-colors duration-200 hover:border-accent-strong hover:bg-accent-strong hover:text-ground disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : "I'll come to you"}
            </button>
          </div>

          {/* Always in the DOM so the live region exists before it has anything
              to announce — a region inserted at the same moment as its text is
              frequently missed by screen readers. */}
          <p
            id={messageId}
            aria-live="polite"
            className="mt-3 min-h-6 text-[length:var(--step--1)] text-fg-muted"
          >
            {status === "sent"
              ? "Got it — I'll be in touch."
              : status === "error"
                ? error
                : null}
          </p>
        </form>
      </div>
    </div>
  );
}
