"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { CircleAlert, CircleCheck, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { withCaseStudyReferral } from "@/lib/content";
import {
  buildMailtoHref,
  buildReason,
  EMAIL_MAX,
  MESSAGE_MAX,
  MESSAGE_MIN,
  NAME_MAX,
  openMailClient,
} from "@/lib/contact";
import { contactIntents, profile } from "@/content/portfolio";
import type { ContactIntent } from "@/types/portfolio";
import VisuallyHidden from "@/components/ui/VisuallyHidden";
import IntentChooser from "./IntentChooser";

/**
 * The client island for Contact: choose an intent, read the finished message
 * it produces, give a name and somewhere to reply, send.
 *
 * The draft is shown as plain paragraphs, one `<p>` per paragraph of
 * `messageDraft`, and not inside a `<textarea>` or a disclosure: the visitor
 * is about to send these words over their own name, so they are in front of
 * them before any interaction. "Add a line of my own" swaps the paragraphs for
 * a textarea seeded with the same text; from then on the textarea is what is
 * sent. Choosing another intent goes back to that intent's draft.
 *
 * With no intent chosen there is nothing to send: the form holds only the
 * honeypot and the two live regions, and the chooser's legend says what
 * choosing does. The `<form>` itself is rendered from the first paint anyway,
 * because the companion watches it for `data-cat-secret` with an attribute
 * observer, which only sees a change on a node that already exists.
 *
 * A "message sent" confirmation can only come from the one branch in
 * `handleSubmit` that reads `response.ok && payload?.ok === true` from a real
 * `fetch` to `/api/contact`. Every other path — validation failure, network
 * failure, a non-OK response, an unconfigured server, or
 * `emailDeliveryConfigured` being `false` from the start — ends in either an
 * honest "opened your email app" status or a real error, never success.
 */

const HONEYPOT_STYLE: CSSProperties = {
  position: "absolute",
  left: "-10000px",
  top: "auto",
  width: "1px",
  height: "1px",
  overflow: "hidden",
};

const FIELD_CLASS =
  "min-h-11 w-full border bg-ground px-3 py-2 text-[length:var(--step-0)] text-fg";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The fields a visitor can see and fix. `message` is only on screen once
 *  "Add a line of my own" has opened the textarea. */
type FieldName = "name" | "email" | "message";

type FieldErrors = Partial<Record<FieldName, string>>;

type SubmitStatus =
  | { kind: "idle" }
  | { kind: "success" }
  | { kind: "mail-client-opened" }
  | { kind: "fallback-opened" }
  | { kind: "error"; message: string };

/** Minimal shape this file reads from `/api/contact`'s JSON body. Kept as a
 * local, hand-written type rather than importing from the route module, so
 * this client file has no dependency — type-only or otherwise — on
 * server-only code. */
interface ContactApiPayload {
  ok: boolean;
  reason?: "invalid" | "not-configured" | "rate-limited" | "send-failed";
  fieldErrors?: Partial<Record<string, string>>;
}

const GENERIC_ERROR_MESSAGE =
  "Something went wrong sending that. Please try again, or use the email address on the card.";
const FIX_FIELDS_MESSAGE = "Please fix the highlighted field before sending.";

function validateField(field: FieldName, value: string): string | undefined {
  switch (field) {
    case "name":
      if (value.trim().length === 0) return "Enter your name.";
      if (value.length > NAME_MAX) return `Keep your name under ${NAME_MAX} characters.`;
      return undefined;
    case "email":
      if (value.trim().length === 0) return "Enter your email address.";
      if (!EMAIL_PATTERN.test(value.trim())) return "Enter a valid email address.";
      if (value.length > EMAIL_MAX) return `Keep your email under ${EMAIL_MAX} characters.`;
      return undefined;
    case "message":
      if (value.trim().length < MESSAGE_MIN) return `Say a little more — at least ${MESSAGE_MIN} characters.`;
      if (value.length > MESSAGE_MAX) return `Keep your message under ${MESSAGE_MAX} characters.`;
      return undefined;
  }
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[length:var(--step--1)] font-medium uppercase tracking-[0.08em] text-fg-muted"
    >
      {children}
      <span aria-hidden="true" className="ml-0.5 text-fg">
        *
      </span>
      <VisuallyHidden> required</VisuallyHidden>
    </label>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="flex items-start gap-1.5 text-[length:var(--step--1)] text-fg">
      <CircleAlert aria-hidden="true" focusable="false" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

interface ContactFormProps {
  emailDeliveryConfigured: boolean;
}

export default function ContactForm({ emailDeliveryConfigured }: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [selectedIntentId, setSelectedIntentId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [body, setBody] = useState("");
  const [referredProjectTitle, setReferredProjectTitle] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [status, setStatus] = useState<SubmitStatus>({ kind: "idle" });
  const [submitting, setSubmitting] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  // Set by "Add a line of my own", read once by the effect below: the
  // textarea does not exist until the render that follows the click.
  const focusMessageNext = useRef(false);

  const selected: ContactIntent | null = contactIntents.find((intent) => intent.id === selectedIntentId) ?? null;
  const draft = selected ? withCaseStudyReferral(selected.messageDraft, referredProjectTitle) : "";
  const subject = selected ? buildReason(selected, referredProjectTitle) : "";
  const message = expanded ? body : draft;

  // Case-study referral: `CaseStudy` (rendered inside the Journey's branch
  // panels) renders "Discuss this project" links to #contact carrying
  // `data-project-title`. Reading `location.hash` during render would make
  // the very first render depend on the URL, which differs between the
  // server (no hash) and the client (hash present) — a hydration mismatch.
  // This effect instead runs once, after mount, purely as a `document`-level
  // click listener; it never touches render output directly, only state that
  // a *later* render reads. The draft and subject are derived from that state
  // on every render, so a referral reaches them whether it arrives before or
  // after an intent is chosen. A visitor who has already opened the textarea
  // owns its text; a referral arriving after that does not rewrite it.
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[data-project-title]");
      if (!link) return;
      const title = link.getAttribute("data-project-title")?.trim();
      if (title) setReferredProjectTitle(title);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    if (expanded && focusMessageNext.current) {
      focusMessageNext.current = false;
      messageRef.current?.focus();
    }
  }, [expanded]);

  function updateField(field: FieldName, value: string) {
    if (field === "name") setName(value);
    else if (field === "email") setEmail(value);
    else setBody(value);
    if (touched[field]) setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
  }

  function blurField(field: FieldName, value: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
  }

  function chooseIntent(intent: ContactIntent) {
    setSelectedIntentId(intent.id);
    setExpanded(false);
    setBody("");
    setFieldErrors((prev) => ({ ...prev, message: undefined }));
    setStatus({ kind: "idle" });
  }

  function expand() {
    setBody(draft);
    focusMessageNext.current = true;
    setExpanded(true);
  }

  function focusField(field: FieldName) {
    const ref = field === "name" ? nameRef : field === "email" ? emailRef : messageRef;
    ref.current?.focus();
  }

  function validateVisible(): FieldErrors {
    const errors: FieldErrors = {
      name: validateField("name", name),
      email: validateField("email", email),
    };
    if (expanded) errors.message = validateField("message", body);
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !selected) return;

    const errors = validateVisible();
    setFieldErrors(errors);
    setTouched({ name: true, email: true, message: expanded });

    const order: readonly FieldName[] = ["message", "name", "email"];
    const firstInvalid = order.find((field) => errors[field]);
    if (firstInvalid) {
      focusField(firstInvalid);
      setStatus({ kind: "error", message: FIX_FIELDS_MESSAGE });
      return;
    }

    const mailto = () => buildMailtoHref(profile.email, { subject, message, name, email });

    if (!emailDeliveryConfigured) {
      // Still an explicit visitor action (this submit) building a properly
      // encoded mailto: — never a fake "sent" confirmation.
      openMailClient(mailto());
      setStatus({ kind: "mail-client-opened" });
      return;
    }

    setSubmitting(true);
    setStatus({ kind: "idle" });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, reason: subject, message, website }),
      });

      let payload: ContactApiPayload | null = null;
      try {
        payload = (await response.json()) as ContactApiPayload;
      } catch {
        payload = null;
      }

      if (response.ok && payload?.ok === true) {
        setStatus({ kind: "success" });
        setName("");
        setEmail("");
        setWebsite("");
        setBody("");
        setExpanded(false);
        setTouched({});
        setFieldErrors({});
        setSelectedIntentId(null);
        // D3: a neutral event the companion listens for to cheer — nothing
        // here knows or cares that a cat is watching. See Companion.tsx.
        window.dispatchEvent(new CustomEvent("portfolio:contact-sent"));
      } else if (payload && payload.ok === false && payload.reason === "not-configured") {
        // The server just told us, authoritatively, that it cannot send.
        // Fall back the same honest way the unconfigured mode does, rather
        // than showing a bare error for something the visitor can still
        // complete themselves.
        openMailClient(mailto());
        setStatus({ kind: "fallback-opened" });
      } else if (payload && payload.ok === false && payload.reason === "invalid" && payload.fieldErrors) {
        // Only errors on a field the visitor can see are worth pointing at;
        // anything else (the subject, say) has nothing on screen to fix.
        const returned = payload.fieldErrors;
        const visible: FieldErrors = {
          name: returned.name,
          email: returned.email,
          message: expanded ? returned.message : undefined,
        };
        if (visible.name || visible.email || visible.message) {
          setFieldErrors(visible);
          setStatus({ kind: "error", message: FIX_FIELDS_MESSAGE });
        } else {
          setStatus({ kind: "error", message: GENERIC_ERROR_MESSAGE });
        }
      } else {
        setStatus({ kind: "error", message: GENERIC_ERROR_MESSAGE });
      }
    } catch {
      setStatus({ kind: "error", message: GENERIC_ERROR_MESSAGE });
    } finally {
      setSubmitting(false);
    }
  }

  const infoMessage =
    status.kind === "success"
      ? `Message sent. Thanks for reaching out — I'll reply from ${profile.email}.`
      : status.kind === "mail-client-opened"
        ? "Your email app should now be open with this message ready to go. Nothing has been sent until you send it from there."
        : status.kind === "fallback-opened"
          ? "Direct sending isn't available right now, so I opened your email app with this message ready to go instead. Nothing has been sent until you send it from there."
          : "";
  const errorMessage = status.kind === "error" ? status.message : "";

  return (
    <>
      {referredProjectTitle ? (
        <p className="mb-6 flex items-start gap-2 border border-rule bg-surface px-4 py-3 text-[length:var(--step--1)] text-fg-muted">
          <span>
            Carried over from the case study you were reading:{" "}
            <span className="wrap-anywhere text-fg">&ldquo;{referredProjectTitle}&rdquo;</span>
            {expanded ? "." : selected ? ". The message below mentions it." : ". The message will mention it."}
          </span>
        </p>
      ) : null}

      <IntentChooser
        legendId="contact-intent-legend"
        groupName="contact-intent"
        intents={contactIntents}
        selectedId={selectedIntentId}
        onSelect={chooseIntent}
      />

      <form
        noValidate
        onSubmit={handleSubmit}
        // Declarative contract with the companion (same shape as
        // data-cat-nap): while the "secret" intent is selected, the cats
        // creep toward this form and perk up. Nothing here knows a cat is
        // listening; removing the attribute ends the scene.
        data-cat-secret={selectedIntentId === "secret" ? "" : undefined}
        className="mt-8 flex flex-col gap-6 scroll-mt-20"
      >
        {selected ? (
          <>
            <div className="border border-rule bg-surface p-6">
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule pb-4">
                <span className="eyebrow shrink-0">Subject</span>
                <span className="wrap-anywhere font-mono text-[length:var(--step--1)] text-fg">{subject}</span>
              </p>
              {expanded ? (
                <div className="mt-4 flex flex-col gap-2">
                  <FieldLabel htmlFor="contact-message">Your message</FieldLabel>
                  <textarea
                    ref={messageRef}
                    id="contact-message"
                    name="message"
                    required
                    rows={9}
                    value={body}
                    onChange={(event) => updateField("message", event.target.value)}
                    onBlur={() => blurField("message", body)}
                    aria-invalid={fieldErrors.message ? "true" : undefined}
                    aria-describedby={fieldErrors.message ? "contact-message-error" : undefined}
                    className={cn(FIELD_CLASS, "resize-y leading-[1.7]", fieldErrors.message ? "border-fg" : "border-rule")}
                  />
                  <FieldError id="contact-message-error" message={fieldErrors.message} />
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-4 text-[length:var(--step-0)] leading-[1.7] text-fg">
                  {draft.split("\n\n").map((paragraph, index) => (
                    <p key={index} className="whitespace-pre-line">
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="contact-name">Your name</FieldLabel>
                <input
                  ref={nameRef}
                  id="contact-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(event) => updateField("name", event.target.value)}
                  onBlur={() => blurField("name", name)}
                  aria-invalid={fieldErrors.name ? "true" : undefined}
                  aria-describedby={fieldErrors.name ? "contact-name-error" : undefined}
                  className={cn(FIELD_CLASS, fieldErrors.name ? "border-fg" : "border-rule")}
                />
                <FieldError id="contact-name-error" message={fieldErrors.name} />
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel htmlFor="contact-email">Where to reply</FieldLabel>
                <input
                  ref={emailRef}
                  id="contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => updateField("email", event.target.value)}
                  onBlur={() => blurField("email", email)}
                  aria-invalid={fieldErrors.email ? "true" : undefined}
                  aria-describedby={fieldErrors.email ? "contact-email-error" : undefined}
                  className={cn(FIELD_CLASS, fieldErrors.email ? "border-fg" : "border-rule")}
                />
                <FieldError id="contact-email-error" message={fieldErrors.email} />
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
              {/* Contact's one primary control and its only blue fill. The
                  etched inner keyline is the recipe `Button`'s `primary`
                  variant carries, by hand here so the fill is the
                  `bg-accent` utility itself. */}
              <button
                type="submit"
                disabled={submitting}
                aria-busy={submitting || undefined}
                aria-describedby={emailDeliveryConfigured ? undefined : "contact-send-note"}
                className="relative inline-flex min-h-12 items-center justify-center border border-accent bg-accent px-6 text-[length:var(--step-0)] font-medium text-fg-inverse transition-colors duration-200 after:pointer-events-none after:absolute after:inset-[3px] after:border after:border-current after:opacity-0 after:transition-opacity after:duration-150 hover:border-accent-strong hover:bg-accent-strong hover:text-ground hover:after:opacity-40 active:translate-y-px disabled:opacity-60"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 aria-hidden="true" focusable="false" className="h-4 w-4 animate-spin" />
                    Sending…
                  </span>
                ) : expanded ? (
                  "Send it"
                ) : (
                  "Send it as written"
                )}
              </button>
              {expanded ? null : (
                <button
                  type="button"
                  onClick={expand}
                  className="inline-flex min-h-12 items-center justify-center border border-rule px-5 text-[length:var(--step-0)] text-fg transition-colors duration-150 hover:border-fg-muted active:translate-y-px"
                >
                  Add a line of my own
                </button>
              )}
              {emailDeliveryConfigured ? null : (
                <p id="contact-send-note" className="text-[length:var(--step--1)] text-fg-muted">
                  Opens your email app with this message in it. Nothing is sent until you send it from there.
                </p>
              )}
            </div>
          </>
        ) : null}

        {/* Honeypot. Off-screen via absolute positioning (not display:none
            or visibility:hidden, both of which some bots and some autofill
            engines simply skip when deciding what to fill), unreachable by
            keyboard, and removed from the accessibility tree — a real
            visitor can never see it, tab to it, or have it announced. */}
        <div style={HONEYPOT_STYLE} aria-hidden="true">
          <label htmlFor="contact-website">Website</label>
          <input
            id="contact-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>

        {/* Both live regions are always in the DOM, so they exist before they
            have anything to announce, and the success status outlives the
            draft it confirms. */}
        <p
          role="status"
          className={cn(
            "flex items-center gap-2 text-[length:var(--step--1)] text-fg",
            infoMessage && "border border-rule bg-surface px-4 py-3",
          )}
        >
          {infoMessage ? (
            <>
              <CircleCheck aria-hidden="true" focusable="false" className="h-4 w-4 shrink-0" />
              <span>{infoMessage}</span>
            </>
          ) : null}
        </p>

        <p
          role="alert"
          className={cn(
            "flex items-start gap-2 text-[length:var(--step--1)] text-fg",
            errorMessage && "border border-rule bg-surface px-4 py-3",
          )}
        >
          {errorMessage ? (
            <>
              <TriangleAlert aria-hidden="true" focusable="false" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </>
          ) : null}
        </p>
      </form>
    </>
  );
}
