"use client";

import { useId, useState } from "react";
import { profile } from "@/content/portfolio";
import { cn } from "@/lib/cn";

/**
 * The one-field "ask me to reach out" path that sits above the full form.
 *
 * This used to open with a row of three direct-link cards (email, GitHub,
 * LinkedIn) above the field below. Round-3 feedback folded that row into
 * `BusinessCard` instead — one card, on the right of Contact's two-pane
 * layout at >=1024px, rather than three link cards competing with this
 * field for the same "zero-effort" attention. What is left here is the
 * other zero-typing idea: leave an email address or a phone number and
 * nothing else. No name, no subject, no message — a single input is the
 * smallest thing that still produces something actionable.
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

export default function QuickConnect({ emailDeliveryConfigured }: QuickConnectProps) {
  const inputId = useId();
  const messageId = useId();
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

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
          {/* The etched inner keyline + mechanical press (Workstream 3, P3) —
              same recipe as `Button`'s `primary` variant and SiteHeader's
              "Let's talk", by hand, since this submit renders neither. */}
          <button
            type="submit"
            disabled={status === "sending"}
            className="relative min-h-12 shrink-0 border border-accent bg-accent px-6 text-[length:var(--step-0)] font-medium text-fg-inverse transition-colors duration-200 after:pointer-events-none after:absolute after:inset-[3px] after:border after:border-current after:opacity-0 after:transition-opacity after:duration-150 hover:border-accent-strong hover:bg-accent-strong hover:text-ground hover:after:opacity-40 active:translate-y-px disabled:opacity-60"
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
  );
}
