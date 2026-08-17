"use client";

import { useId, useState } from "react";
import { profile, socialLinks } from "@/content/portfolio";
import CopyButton from "@/components/ui/CopyButton";
import ExternalLink from "@/components/ui/ExternalLink";
import { cn } from "@/lib/cn";

/**
 * The zero-effort route to a conversation, sitting above the full form.
 *
 * Two ideas, in order of how little they ask of a visitor:
 *
 *  1. Direct links. Email, GitHub and LinkedIn as large one-tap targets. Most
 *     people who want to reach out already know which of these they prefer,
 *     and none of them require typing anything at all.
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

const LINK_CLASS =
  "flex min-h-12 items-center justify-between gap-3 border border-rule bg-surface px-4 text-[length:var(--step-0)] text-fg transition-colors duration-200 hover:border-accent hover:text-accent";

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
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Stacks on a phone rather than shortening the copy button's label:
            "thienle210303@gmail.com" plus a labelled button does not fit on one
            390px line, and trimming the label to "Copy" would cost a screen
            reader the only thing that says what is being copied. */}
        <div
          className={cn(
            LINK_CLASS,
            "flex-1 flex-col items-start gap-2 py-3 hover:border-rule hover:text-fg",
            "sm:flex-row sm:items-center sm:gap-3 sm:py-0",
          )}
        >
          <a
            href={`mailto:${profile.email}`}
            className="wrap-anywhere min-w-0 hover:text-accent"
          >
            {profile.email}
          </a>
          <CopyButton value={profile.email} label="Copy email address" />
        </div>
        {github ? (
          <ExternalLink href={github.href} className={cn(LINK_CLASS, "whitespace-nowrap")}>
            GitHub
            <span className="font-mono text-[length:var(--step--1)] text-fg-subtle">
              {github.handle}
            </span>
          </ExternalLink>
        ) : null}
        {linkedin ? (
          <ExternalLink href={linkedin.href} className={cn(LINK_CLASS, "whitespace-nowrap")}>
            LinkedIn
            <span className="font-mono text-[length:var(--step--1)] text-fg-subtle">
              {linkedin.handle}
            </span>
          </ExternalLink>
        ) : null}
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-8">
        <label htmlFor={inputId} className="block text-[length:var(--step-0)] text-fg-muted">
          Or leave your details and I&rsquo;ll come to you
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
            {status === "sending" ? "Sending…" : "Ask me to reach out"}
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
  );
}
