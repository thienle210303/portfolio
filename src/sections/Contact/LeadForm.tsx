"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { CircleAlert, CircleCheck, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  buildLeadMailto,
  EMAIL_MAX,
  LEAD_ERRORS,
  NAME_MAX,
  openMailClient,
  PHONE_MAX,
  PHONE_PATTERN,
  SINGLE_LINE,
  type Lead,
} from "@/lib/contact";
import { contactCopy, profile } from "@/content/portfolio";
import VisuallyHidden from "@/components/ui/VisuallyHidden";

/**
 * The business card's back face: a name and an email or phone, so I can get
 * back to the visitor. No message field.
 *
 * Validation is a hand check against the limits, patterns and messages in
 * `@/lib/contact`, so zod stays on the server. `/api/contact`'s zod schema is
 * the final check, and its field errors land on the same fields.
 * "Sent" can only come from a real `fetch` answering `{ ok: true }`; every
 * other path ends in an honest "opened your email app" status or an error.
 */

type FieldName = "name" | "email" | "phone";
type FieldErrors = Partial<Record<FieldName, string>>;
type Status = "idle" | "success" | "mail-opened" | "fallback-opened" | { error: string };

/** The part of `/api/contact`'s response this file reads, mirrored locally so
 *  a client file never imports a route module. */
interface ApiPayload {
  ok: boolean;
  reason?: "invalid" | "not-configured" | "rate-limited" | "send-failed";
  fieldErrors?: FieldErrors;
}

const ORDER: readonly FieldName[] = ["name", "email", "phone"];
const GENERIC_ERROR = "Something went wrong sending that. Please try again, or use the email on the front.";
const FIX_FIELDS = "Please fix the highlighted field.";

/** Off-screen rather than `display: none`, which some bots skip filling. */
const HONEYPOT_STYLE: CSSProperties = { position: "absolute", left: "-10000px", width: "1px", height: "1px", overflow: "hidden" };

const FIELD_CLASS = "min-h-11 w-full border bg-ground px-3 py-2 text-[length:var(--step-0)] text-fg";

/** Same messages as the server's schema; length caps are the inputs' `maxLength`. */
function check(lead: Required<Lead>, emailMalformed: boolean): FieldErrors {
  const errors: FieldErrors = {};
  if (!lead.name) errors.name = LEAD_ERRORS.nameRequired;
  else if (!SINGLE_LINE.test(lead.name)) errors.name = LEAD_ERRORS.singleLine;
  if (lead.email && emailMalformed) errors.email = LEAD_ERRORS.email;
  if (lead.phone && !PHONE_PATTERN.test(lead.phone)) errors.phone = LEAD_ERRORS.phone;
  if (!lead.email && !lead.phone) errors.email = errors.phone = LEAD_ERRORS.pair;
  return errors;
}

function ErrorLine({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1.5 text-[length:var(--step--1)] text-fg">
      <CircleAlert aria-hidden="true" focusable="false" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

interface LeadFormProps {
  emailDeliveryConfigured: boolean;
  onBack: () => void;
}

export default function LeadForm({ emailDeliveryConfigured, onBack }: LeadFormProps) {
  const [values, setValues] = useState({ name: "", email: "", phone: "", website: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [submitting, setSubmitting] = useState(false);
  const refs = { name: useRef<HTMLInputElement>(null), email: useRef<HTMLInputElement>(null), phone: useRef<HTMLInputElement>(null) };
  const statusRef = useRef<HTMLParagraphElement>(null);

  // Success clears the fields; focus goes to the line that confirms it.
  useEffect(() => {
    if (status === "success") statusRef.current?.focus();
  }, [status]);

  // Leaving the form clears what it last said; the fields keep their values.
  function back() {
    // A send in flight would land its status on a face nobody is looking at.
    if (submitting) return;
    setStatus("idle");
    onBack();
  }

  // "Neither email nor phone" is one error about the pair: shown once, under
  // both fields, and described on both.
  const pairError = errors.email && errors.email === errors.phone ? errors.email : undefined;
  const describedBy = (field: FieldName) =>
    field !== "name" && pairError ? "lead-pair-error" : errors[field] ? `lead-${field}-error` : undefined;

  function showErrors(next: FieldErrors) {
    setErrors(next);
    setStatus({ error: FIX_FIELDS });
    const first = ORDER.find((field) => next[field]);
    if (first) refs[first].current?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const trimmed = { name: values.name.trim(), email: values.email.trim(), phone: values.phone.trim() };
    const fieldErrors = check(trimmed, refs.email.current?.validity.typeMismatch ?? false);
    if (ORDER.some((field) => fieldErrors[field])) return showErrors(fieldErrors);
    setErrors({});
    const lead: Lead = { name: trimmed.name, email: trimmed.email || undefined, phone: trimmed.phone || undefined };
    const openMail = (next: Status) => {
      openMailClient(buildLeadMailto(lead, profile.email));
      setStatus(next);
    };

    if (!emailDeliveryConfigured) return openMail("mail-opened");

    setSubmitting(true);
    setStatus("idle");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json().catch(() => null)) as ApiPayload | null;

      if (response.ok && payload?.ok === true) {
        setValues({ name: "", email: "", phone: "", website: "" });
        setStatus("success");
        // The companion cheers on this; nothing here knows a cat is watching.
        window.dispatchEvent(new CustomEvent("portfolio:contact-sent"));
      } else if (payload?.reason === "not-configured") {
        // The server says, authoritatively, that it cannot send.
        openMail("fallback-opened");
      } else if (payload?.reason === "invalid" && payload.fieldErrors && ORDER.some((f) => payload.fieldErrors?.[f])) {
        showErrors(payload.fieldErrors);
      } else {
        setStatus({ error: GENERIC_ERROR });
      }
    } catch {
      setStatus({ error: GENERIC_ERROR });
    } finally {
      setSubmitting(false);
    }
  }

  const info =
    status === "success"
      ? contactCopy.success
      : status === "mail-opened"
        ? "Your email app should be open with this ready to send. Nothing is sent until you send it there."
        : status === "fallback-opened"
          ? "Direct sending isn't available right now, so I opened your email app instead. Nothing is sent until you send it there."
          : "";
  const error = typeof status === "object" ? status.error : "";

  const input = (field: FieldName, label: string, props: { type: string; autoComplete: string; maxLength: number }) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`lead-${field}`} className="text-[length:var(--step--1)] font-medium text-fg-muted">
        {label}
        {field === "name" ? (
          <>
            <span aria-hidden="true" className="ml-0.5 text-fg">*</span>
            <VisuallyHidden> required</VisuallyHidden>
          </>
        ) : null}
      </label>
      <input
        ref={refs[field]}
        id={`lead-${field}`}
        name={field}
        required={field === "name"}
        {...props}
        value={values[field]}
        onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
        aria-invalid={errors[field] ? "true" : undefined}
        aria-describedby={describedBy(field)}
        className={cn(FIELD_CLASS, errors[field] ? "border-fg" : "border-rule")}
      />
      {errors[field] && !(field !== "name" && pairError) ? (
        <ErrorLine id={`lead-${field}-error`}>{errors[field]}</ErrorLine>
      ) : null}
    </div>
  );

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      onKeyDown={(e) => e.key === "Escape" && back()}
      aria-labelledby="lead-heading"
      data-delivery={emailDeliveryConfigured ? "api" : "mailto"}
      className="relative flex flex-col gap-3"
    >
      <div>
        <h3 id="lead-heading" className="font-display text-[length:var(--step-1)] leading-[1.05] tracking-[-0.02em] text-fg">
          {contactCopy.formHeading}
        </h3>
        <p className="mt-1 text-[length:var(--step--1)] text-fg-muted">{contactCopy.formNote}</p>
      </div>

      {input("name", "Name", { type: "text", autoComplete: "name", maxLength: NAME_MAX })}
      {input("email", "Email", { type: "email", autoComplete: "email", maxLength: EMAIL_MAX })}
      {input("phone", "Phone", { type: "tel", autoComplete: "tel", maxLength: PHONE_MAX })}
      {pairError ? <ErrorLine id="lead-pair-error">{pairError}</ErrorLine> : null}

      <div className="mt-1 flex flex-wrap items-center gap-3">
        {/* Contact's one primary control and its only blue fill; the keyline
            recipe is `Button`'s primary, by hand so the fill is `bg-accent`. */}
        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting || undefined}
          aria-describedby={emailDeliveryConfigured ? undefined : "lead-send-note"}
          className="relative inline-flex min-h-11 items-center justify-center border border-accent bg-accent px-6 text-[length:var(--step-0)] font-medium text-fg-inverse transition-colors duration-200 after:pointer-events-none after:absolute after:inset-[3px] after:border after:border-current after:opacity-0 after:transition-opacity after:duration-150 hover:border-accent-strong hover:bg-accent-strong hover:text-ground hover:after:opacity-40 active:translate-y-px disabled:opacity-60"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 aria-hidden="true" focusable="false" className="h-4 w-4 animate-spin" />
              Sending…
            </span>
          ) : (
            "Send"
          )}
        </button>
        <button
          type="button"
          onClick={back}
          disabled={submitting}
          className="inline-flex min-h-11 items-center justify-center border border-rule px-5 text-[length:var(--step-0)] text-fg transition-colors duration-150 hover:border-fg-muted active:translate-y-px disabled:opacity-60"
        >
          Back
        </button>
      </div>
      {emailDeliveryConfigured ? null : (
        <p id="lead-send-note" className="text-[length:var(--step--1)] text-fg-muted">
          Opens your email app. You send it from there.
        </p>
      )}

      {/* Honeypot: unreachable by keyboard and absent from the accessibility tree. */}
      <div style={HONEYPOT_STYLE} aria-hidden="true">
        <label htmlFor="lead-website">Website</label>
        <input
          id="lead-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={values.website}
          onChange={(e) => setValues((v) => ({ ...v, website: e.target.value }))}
        />
      </div>

      {/* Both live regions exist before they have anything to say, in one
          wrapper so the idle pair costs the column one gap, not two. */}
      <div>
        <p ref={statusRef} role="status" tabIndex={-1} className="flex items-start gap-2 text-[length:var(--step--1)] text-fg">
          {info ? (
            <>
              <CircleCheck aria-hidden="true" focusable="false" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{info}</span>
            </>
          ) : null}
        </p>
        <p role="alert" className="flex items-start gap-2 text-[length:var(--step--1)] text-fg">
          {error ? (
            <>
              <TriangleAlert aria-hidden="true" focusable="false" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </>
          ) : null}
        </p>
      </div>
    </form>
  );
}
