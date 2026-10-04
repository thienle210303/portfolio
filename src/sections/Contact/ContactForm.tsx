"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { CircleAlert, CircleCheck, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { withCaseStudyReferral } from "@/lib/content";
import { contactIntents, profile } from "@/content/portfolio";
import type { ContactIntent } from "@/types/portfolio";
import Button from "@/components/ui/Button";
import VisuallyHidden from "@/components/ui/VisuallyHidden";
import IntentChooser from "./IntentChooser";

/**
 * The client island for Contact. Everything that needs state, a browser API
 * or an event handler lives here; `Contact.tsx` stays a Server Component and
 * only decides layout and the "alternative ways to reach me" column around
 * this.
 *
 * The single most important property of this file: a "message sent"
 * confirmation can only ever be produced by the one branch in
 * `handleSubmit` that reads `response.ok && payload?.ok === true` from a
 * real `fetch` to `/api/contact`. Every other path — validation failure,
 * network failure, a non-OK response, an unconfigured server, or
 * `emailDeliveryConfigured` being `false` from the start — leads to either
 * an honest "opened your email app" status or a real error, never success.
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
  "min-h-11 w-full border bg-surface px-3 py-2 text-[length:var(--step-0)] text-fg";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldName = "name" | "email" | "company" | "reason" | "message";

interface FormState {
  name: string;
  email: string;
  company: string;
  reason: string;
  message: string;
  website: string;
}

const EMPTY_STATE: FormState = {
  name: "",
  email: "",
  company: "",
  reason: "",
  message: "",
  website: "",
};

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
  fieldErrors?: FieldErrors;
}

const GENERIC_ERROR_MESSAGE =
  "Something went wrong sending that. Please try again, or use one of the options to the side.";

function validateField(field: FieldName, value: string): string | undefined {
  switch (field) {
    case "name":
      if (value.trim().length === 0) return "Enter your name.";
      if (value.length > 100) return "Keep your name under 100 characters.";
      return undefined;
    case "email":
      if (value.trim().length === 0) return "Enter your email address.";
      if (!EMAIL_PATTERN.test(value.trim())) return "Enter a valid email address.";
      if (value.length > 200) return "Keep your email under 200 characters.";
      return undefined;
    case "company":
      if (value.length > 120) return "Keep the company name under 120 characters.";
      return undefined;
    case "reason":
      if (value.length > 120) return "Keep the reason under 120 characters.";
      return undefined;
    case "message":
      if (value.trim().length < 10) return "Say a little more — at least 10 characters.";
      if (value.length > 5000) return "Keep your message under 5000 characters.";
      return undefined;
    default:
      return undefined;
  }
}

const FIELD_ORDER: readonly FieldName[] = ["name", "email", "company", "reason", "message"];

function validateAll(state: FormState): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of FIELD_ORDER) {
    const error = validateField(field, state[field]);
    if (error) errors[field] = error;
  }
  return errors;
}

function buildReason(intent: ContactIntent, projectTitle: string | null): string {
  return projectTitle ? `${intent.subject} — ${projectTitle}` : intent.subject;
}

/** RFC 6068 wants percent-encoding, not `application/x-www-form-urlencoded`
 * encoding — `URLSearchParams` would turn every space into a literal `+` in
 * the opened compose window, which is exactly the "not properly encoded"
 * bug this avoids. */
function buildMailtoHref(toEmail: string, state: FormState): string {
  const subject = state.reason.trim() || "Message from your portfolio site";
  const lines = [
    state.message.trim(),
    "",
    "—",
    `Name: ${state.name.trim()}`,
    `Email: ${state.email.trim()}`,
  ];
  if (state.company.trim()) lines.push(`Company: ${state.company.trim()}`);
  const body = lines.join("\n");
  return `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function FieldLabel({
  htmlFor,
  required,
  optional,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[length:var(--step--1)] font-medium uppercase tracking-[0.08em] text-fg-muted"
    >
      {children}
      {required ? (
        <>
          <span aria-hidden="true" className="ml-0.5 text-fg">
            *
          </span>
          <VisuallyHidden> required</VisuallyHidden>
        </>
      ) : null}
      {optional ? (
        <span className="ml-1.5 font-normal normal-case tracking-normal text-fg-subtle">(optional)</span>
      ) : null}
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
  const [state, setState] = useState<FormState>(EMPTY_STATE);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [selectedIntentId, setSelectedIntentId] = useState<string | null>(null);
  const [referredProjectTitle, setReferredProjectTitle] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>({ kind: "idle" });
  const [submitting, setSubmitting] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLSelectElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  // Case-study referral: `CaseStudy` (rendered inside the Journey's branch
  // panels) renders "Discuss this project" links to #contact carrying
  // `data-project-title`. Reading `location.hash`
  // during render would make the very first render depend on the URL,
  // which differs between the server (no hash) and the client (hash
  // present) — a hydration mismatch. This effect instead runs once, after
  // mount, purely as a `document`-level click listener; it never touches
  // render output directly, only state that a *later* render reads. Both
  // the server render and the first client render therefore produce
  // identical HTML (`referredProjectTitle` starts `null` in both places),
  // and the DOM only changes in a normal post-hydration update once a
  // visitor actually clicks such a link.
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

  function handleFieldChange(field: FieldName, value: string) {
    setState((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!touched[field]) return prev;
      return { ...prev, [field]: validateField(field, value) };
    });
  }

  function handleFieldBlur(field: FieldName, value: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
  }

  function focusField(field: FieldName) {
    switch (field) {
      case "name":
        nameRef.current?.focus();
        break;
      case "email":
        emailRef.current?.focus();
        break;
      case "company":
        companyRef.current?.focus();
        break;
      case "reason":
        reasonRef.current?.focus();
        break;
      case "message":
        messageRef.current?.focus();
        break;
    }
  }

  function applyIntent(intent: ContactIntent) {
    setSelectedIntentId(intent.id);
    setState((prev) => ({
      ...prev,
      reason: buildReason(intent, referredProjectTitle),
      message: withCaseStudyReferral(intent.messageDraft, referredProjectTitle),
    }));
    setFieldErrors((prev) => ({ ...prev, reason: undefined, message: undefined }));
    setStatus({ kind: "idle" });

    const reduceMotion = prefersReducedMotion();
    formRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    nameRef.current?.focus({ preventScroll: true });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const errors = validateAll(state);
    setFieldErrors(errors);
    setTouched({ name: true, email: true, company: true, reason: true, message: true });

    const firstInvalid = FIELD_ORDER.find((field) => errors[field]);
    if (firstInvalid) {
      focusField(firstInvalid);
      setStatus({ kind: "error", message: "Please fix the highlighted field before sending." });
      return;
    }

    if (!emailDeliveryConfigured) {
      // Still an explicit visitor action (this submit click) building a
      // properly encoded mailto: — never a fake "sent" confirmation.
      window.location.href = buildMailtoHref(profile.email, state);
      setStatus({ kind: "mail-client-opened" });
      return;
    }

    setSubmitting(true);
    setStatus({ kind: "idle" });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.name,
          email: state.email,
          company: state.company,
          reason: state.reason,
          message: state.message,
          website: state.website,
        }),
      });

      let payload: ContactApiPayload | null = null;
      try {
        payload = (await response.json()) as ContactApiPayload;
      } catch {
        payload = null;
      }

      if (response.ok && payload?.ok === true) {
        setStatus({ kind: "success" });
        setState(EMPTY_STATE);
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
        window.location.href = buildMailtoHref(profile.email, state);
        setStatus({ kind: "fallback-opened" });
      } else if (payload && payload.ok === false && payload.reason === "invalid" && payload.fieldErrors) {
        setFieldErrors((prev) => ({ ...prev, ...payload.fieldErrors }));
        setStatus({ kind: "error", message: "Please fix the highlighted field before sending." });
      } else {
        setStatus({ kind: "error", message: GENERIC_ERROR_MESSAGE });
      }
    } catch {
      setStatus({ kind: "error", message: GENERIC_ERROR_MESSAGE });
    } finally {
      setSubmitting(false);
    }
  }

  const baseReasonSubjects = contactIntents.map((intent) => intent.subject);
  const hasCustomReason = state.reason.trim() !== "" && !baseReasonSubjects.includes(state.reason);

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
            Carried over from the case study you were reading —{" "}
            <span className="wrap-anywhere text-fg">&ldquo;{referredProjectTitle}&rdquo;</span> — mentioned
            below once you pick a reason. Feel free to change anything.
          </span>
        </p>
      ) : null}

      <IntentChooser
        legendId="contact-intent-legend"
        groupName="contact-intent"
        intents={contactIntents}
        selectedId={selectedIntentId}
        onSelect={applyIntent}
      />

      {!emailDeliveryConfigured ? (
        <p className="mt-8 flex items-start gap-2 border border-rule bg-surface px-4 py-3 text-[length:var(--step--1)] text-fg-muted">
          <TriangleAlert aria-hidden="true" focusable="false" className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" />
          <span>
            Direct sending isn&rsquo;t configured on this site yet — submitting this form opens your own email
            app with the message prefilled instead, so nothing is sent until you send it yourself from there.
          </span>
        </p>
      ) : null}

      <form
        ref={formRef}
        noValidate
        onSubmit={handleSubmit}
        // Declarative contract with the companion (same shape as
        // data-cat-nap): while the "secret" intent is selected, the cats
        // creep toward this form and perk up. Nothing here knows a cat is
        // listening; removing the attribute ends the scene.
        data-cat-secret={selectedIntentId === "secret" ? "" : undefined}
        className="mt-8 flex flex-col gap-6 scroll-mt-20"
      >
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="contact-name" required>
            Name
          </FieldLabel>
          <input
            ref={nameRef}
            id="contact-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            value={state.name}
            onChange={(event) => handleFieldChange("name", event.target.value)}
            onBlur={() => handleFieldBlur("name", state.name)}
            aria-invalid={fieldErrors.name ? "true" : undefined}
            aria-describedby={fieldErrors.name ? "contact-name-error" : undefined}
            className={cn(FIELD_CLASS, fieldErrors.name ? "border-fg" : "border-rule")}
          />
          <FieldError id="contact-name-error" message={fieldErrors.name} />
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="contact-email" required>
            Email
          </FieldLabel>
          <input
            ref={emailRef}
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={state.email}
            onChange={(event) => handleFieldChange("email", event.target.value)}
            onBlur={() => handleFieldBlur("email", state.email)}
            aria-invalid={fieldErrors.email ? "true" : undefined}
            aria-describedby={fieldErrors.email ? "contact-email-error" : undefined}
            className={cn(FIELD_CLASS, fieldErrors.email ? "border-fg" : "border-rule")}
          />
          <FieldError id="contact-email-error" message={fieldErrors.email} />
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="contact-company" optional>
            Company
          </FieldLabel>
          <input
            ref={companyRef}
            id="contact-company"
            name="company"
            type="text"
            autoComplete="organization"
            value={state.company}
            onChange={(event) => handleFieldChange("company", event.target.value)}
            onBlur={() => handleFieldBlur("company", state.company)}
            aria-invalid={fieldErrors.company ? "true" : undefined}
            aria-describedby={fieldErrors.company ? "contact-company-error" : undefined}
            className={cn(FIELD_CLASS, fieldErrors.company ? "border-fg" : "border-rule")}
          />
          <FieldError id="contact-company-error" message={fieldErrors.company} />
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="contact-reason" optional>
            Reason
          </FieldLabel>
          <select
            ref={reasonRef}
            id="contact-reason"
            name="reason"
            value={state.reason}
            onChange={(event) => handleFieldChange("reason", event.target.value)}
            onBlur={() => handleFieldBlur("reason", state.reason)}
            aria-invalid={fieldErrors.reason ? "true" : undefined}
            aria-describedby={fieldErrors.reason ? "contact-reason-error" : undefined}
            className={cn(FIELD_CLASS, fieldErrors.reason ? "border-fg" : "border-rule")}
          >
            <option value="">Choose a reason</option>
            {hasCustomReason ? <option value={state.reason}>{state.reason}</option> : null}
            {contactIntents.map((intent) => (
              <option key={intent.id} value={intent.subject}>
                {intent.subject}
              </option>
            ))}
          </select>
          <FieldError id="contact-reason-error" message={fieldErrors.reason} />
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="contact-message" required>
            Message
          </FieldLabel>
          <textarea
            ref={messageRef}
            id="contact-message"
            name="message"
            required
            rows={7}
            value={state.message}
            onChange={(event) => handleFieldChange("message", event.target.value)}
            onBlur={() => handleFieldBlur("message", state.message)}
            aria-invalid={fieldErrors.message ? "true" : undefined}
            aria-describedby={fieldErrors.message ? "contact-message-error" : undefined}
            className={cn(FIELD_CLASS, "resize-y", fieldErrors.message ? "border-fg" : "border-rule")}
          />
          <FieldError id="contact-message-error" message={fieldErrors.message} />
        </div>

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
            value={state.website}
            onChange={(event) => setState((prev) => ({ ...prev, website: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={submitting}
            aria-busy={submitting || undefined}
            className="w-full justify-center sm:w-auto"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 aria-hidden="true" focusable="false" className="h-4 w-4 animate-spin" />
                Sending…
              </span>
            ) : emailDeliveryConfigured ? (
              "Send message"
            ) : (
              "Open email app"
            )}
          </Button>

          <p
            role="status"
            className={cn(
              "flex items-center gap-2 text-[length:var(--step--1)] text-fg",
              infoMessage && "border border-rule bg-surface px-4 py-3"
            )}
          >
            {infoMessage ? (
              <>
                <CircleCheck aria-hidden="true" focusable="false" className="h-4 w-4 shrink-0" />
                <span>{infoMessage}</span>
              </>
            ) : null}
          </p>
        </div>

        <p
          role="alert"
          className={cn(
            "flex items-start gap-2 text-[length:var(--step--1)] text-fg",
            errorMessage && "border border-rule bg-surface px-4 py-3"
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
