"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { CircleAlert, CircleCheck, Loader2, TriangleAlert } from "lucide-react";
import {
  EMAIL_MAX,
  LEAD_ERRORS,
  NAME_MAX,
  PHONE_MAX,
  PHONE_PATTERN,
  SINGLE_LINE,
  type Lead,
} from "@/lib/contact";
import { contactCopy, profile } from "@/content/portfolio";
import VisuallyHidden from "@/components/ui/VisuallyHidden";
import CopyButton from "@/components/ui/CopyButton";
import { SentImpression, stampDate, useSetStamp } from "./SentStamp";

/**
 * The postcard's address side: a name and an email or phone, written on
 * lines, so I can get back to the visitor. No message field.
 *
 * Validation is a hand check against the limits, patterns and messages in
 * `@/lib/contact`, so zod stays on the server. `/api/contact`'s zod schema is
 * the final check, and its field errors land on the same fields.
 *
 * "Sent" can only come from a real `fetch` answering `{ ok: true }`, and it
 * is stamped on the postcard (round 23; round 24 inks it on empty paper, see
 * `SentStamp`). Nothing here ever opens the visitor's mail app: when this build
 * cannot send (no Resend env, or the server says `not-configured`) or a send
 * fails, the form says so in my voice and offers my address with a copy button.
 *
 * Email or phone is one requirement, said before they try (round 24): the two
 * lines, each the form's full width (round 25), share one bracket down their
 * side, one `*` and one note under them, and a miss is one error about the
 * pair.
 */

type FieldName = "name" | "email" | "phone";
type FieldErrors = Partial<Record<FieldName, string>>;
type Status = "idle" | "success" | "offline" | "failed" | "rate-limited" | { error: string };

/** The part of `/api/contact`'s response this file reads, mirrored locally so
 *  a client file never imports a route module. */
interface ApiPayload {
  ok: boolean;
  /** A thank-you email went to the visitor (only with `CONTACT_REPLY_FROM` set). */
  thanked?: boolean;
  reason?: "invalid" | "not-configured" | "rate-limited" | "send-failed";
  fieldErrors?: FieldErrors;
}

const ORDER: readonly FieldName[] = ["name", "email", "phone"];
/** Counted, and in my voice: the email-or-phone error is one problem, said
 *  once, however many fields it marks. */
function fixFields(errors: FieldErrors): string {
  const count = new Set(Object.values(errors)).size;
  return count === 1
    ? "One thing above to fix, then this can reach me."
    : `${count} things above to fix, then this can reach me.`;
}

/** Off-screen rather than `display: none`, which some bots skip filling. */
const HONEYPOT_STYLE: CSSProperties = { position: "absolute", left: "-10000px", width: "1px", height: "1px", overflow: "hidden" };

/** Written on a line, like an address. 16px keeps phones from zooming in. */
const FIELD_CLASS =
  "min-h-11 w-full min-w-0 border-0 border-b-[1.5px] border-fg bg-transparent px-0.5 pt-3 pb-1 text-[16px] text-fg aria-invalid:border-mark";

/** The bracket that ties the email and phone lines: a rule down their left
 *  side with a short tick at its head and its foot, drawn by the box itself. */
const PAIR_BRACKET =
  "relative flex flex-col gap-1 border-l-[1.5px] border-fg-muted py-1 pl-3.5 before:absolute before:top-0 before:left-0 before:w-2 before:border-t-[1.5px] before:border-fg-muted before:content-[''] after:absolute after:bottom-0 after:left-0 after:w-2 after:border-t-[1.5px] after:border-fg-muted after:content-['']";

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
}

export default function LeadForm({ emailDeliveryConfigured }: LeadFormProps) {
  const [values, setValues] = useState({ name: "", email: "", phone: "", website: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [submitting, setSubmitting] = useState(false);
  // The date inked on the stamp, and whether a thank-you email is on its way.
  const [sentOn, setSentOn] = useState<string | null>(null);
  const [thanked, setThanked] = useState(false);
  const setPictureStamp = useSetStamp();
  const refs = { name: useRef<HTMLInputElement>(null), email: useRef<HTMLInputElement>(null), phone: useRef<HTMLInputElement>(null) };
  const statusRef = useRef<HTMLParagraphElement>(null);

  // Success clears the fields; focus goes to the line that confirms it.
  useEffect(() => {
    if (status === "success") statusRef.current?.focus();
  }, [status]);

  // The picture side's stamp comes and goes with the confirmation line.
  const stampedOn = status === "success" ? sentOn : null;
  useEffect(() => {
    setPictureStamp(stampedOn);
    return () => setPictureStamp(null);
  }, [stampedOn, setPictureStamp]);

  // "Neither email nor phone" is one error about the pair: shown once, under
  // both fields, and described on both.
  const pairError = errors.email && errors.email === errors.phone ? errors.email : undefined;
  const describedBy = (field: FieldName) =>
    field !== "name" && pairError ? "lead-pair-error" : errors[field] ? `lead-${field}-error` : undefined;

  function showErrors(next: FieldErrors) {
    setErrors(next);
    setStatus({ error: fixFields(next) });
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

    if (!emailDeliveryConfigured) return setStatus("offline");

    setSubmitting(true);
    setStatus("idle");
    // The stamp's wear is a file only the stamp uses; fetch it while the send
    // is in flight so the stamp lands whole instead of waiting on it.
    new Image().src = "/scenery/stamp-wear.svg";
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json().catch(() => null)) as ApiPayload | null;

      if (response.ok && payload?.ok === true) {
        setValues({ name: "", email: "", phone: "", website: "" });
        setSentOn(stampDate());
        setThanked(payload.thanked === true);
        setStatus("success");
        // The companion cheers on this; nothing here knows a cat is watching.
        window.dispatchEvent(new CustomEvent("portfolio:contact-sent"));
      } else if (payload?.reason === "not-configured") {
        // The server says, authoritatively, that it cannot send.
        setStatus("offline");
      } else if (payload?.reason === "rate-limited") {
        setStatus("rate-limited");
      } else if (payload?.reason === "invalid" && payload.fieldErrors && ORDER.some((f) => payload.fieldErrors?.[f])) {
        showErrors(payload.fieldErrors);
      } else {
        setStatus("failed");
      }
    } catch {
      setStatus("failed");
    } finally {
      setSubmitting(false);
    }
  }

  const info = status === "success" ? contactCopy.success : "";
  const fault =
    status === "offline"
      ? contactCopy.offline
      : status === "failed"
        ? contactCopy.failed
        : status === "rate-limited"
          ? contactCopy.rateLimited
          : "";
  const error = typeof status === "object" ? status.error : fault;

  const input = (field: FieldName, label: string, props: { type: string; autoComplete: string; maxLength: number }) => (
    <div className="flex flex-col gap-0.5">
      <label htmlFor={`lead-${field}`} className="font-mono text-[12.5px] text-fg-muted">
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
        className={FIELD_CLASS}
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
      aria-labelledby="lead-heading"
      data-delivery={emailDeliveryConfigured ? "api" : "off"}
      className="relative flex h-full flex-col"
    >
      <h3 id="lead-heading" className="font-serif text-[length:var(--step-1)] leading-tight italic text-fg">
        {contactCopy.formHeading}
      </h3>
      <p className="mt-1 text-[length:var(--step--1)] text-fg-muted">{contactCopy.formNote}</p>

      <div className="mt-4 flex flex-col gap-2">
        {input("name", contactCopy.fields.name, { type: "text", autoComplete: "name", maxLength: NAME_MAX })}
        {/* Two whole lines at every width, one above the other (round 25: side
            by side they were 100 to 150px each, too short for an address),
            tied by one bracket down their left side. One bracket, one marker,
            one note: it is one requirement, and one is enough. */}
        <div
          role="group"
          aria-label={contactCopy.pairGroup}
          aria-describedby="lead-pair-note"
          className="flex flex-col gap-1.5"
        >
          <div data-pair-bracket="" className={PAIR_BRACKET}>
            {input("email", contactCopy.fields.email, { type: "email", autoComplete: "email", maxLength: EMAIL_MAX })}
            {input("phone", contactCopy.fields.phone, { type: "tel", autoComplete: "tel", maxLength: PHONE_MAX })}
          </div>
          <p
            id="lead-pair-note"
            className="font-serif text-[length:var(--step--1)] leading-snug text-fg-muted italic"
          >
            <span aria-hidden="true" className="not-italic text-fg">* </span>
            {contactCopy.pairNote}
          </p>
          {pairError ? <ErrorLine id="lead-pair-error">{pairError}</ErrorLine> : null}
        </div>
      </div>

      <div className="mt-auto pt-6">
        {/* Contact's one primary control and its only control fill; the keyline
            recipe is `Button`'s primary, by hand so the fill is `bg-control`. */}
        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting || undefined}
          aria-describedby="lead-send-note"
          className="relative inline-flex min-h-[46px] items-center justify-center rounded-[3px] border border-control bg-control px-[22px] text-[15px] font-semibold text-fg-inverse transition-colors duration-200 after:pointer-events-none after:absolute after:inset-[3px] after:rounded-[2px] after:border after:border-current after:opacity-0 after:transition-opacity after:duration-150 hover:border-accent hover:bg-accent hover:after:opacity-40 active:translate-y-px disabled:opacity-60"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 aria-hidden="true" focusable="false" className="h-4 w-4 animate-spin" />
              Sending…
            </span>
          ) : (
            contactCopy.send
          )}
        </button>
        <p id="lead-send-note" className="mt-2 text-[length:var(--step--1)] text-fg-muted">
          {emailDeliveryConfigured ? contactCopy.sendNote : contactCopy.sendOffNote}
        </p>
      </div>

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
              <span>
                {info}
                {thanked ? <span data-thanked="" className="mt-1 block">{contactCopy.thanked}</span> : null}
              </span>
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
        {fault ? (
          // The way out: my address as text (never a mailto: link) and a copy button.
          <p data-reach="" className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[length:var(--step--1)] text-fg">
            <span className="break-all">{profile.email}</span>
            <CopyButton value={profile.email} label={contactCopy.copyAddress} variant="compact" className="shrink-0 rounded-full" />
          </p>
        ) : null}
      </div>

      {/* Where the postcard's sides stack, the stamp lands here, on the address
          side's own paper under the confirmation (CSS shows exactly one of this
          and the picture side's copy). */}
      {stampedOn ? <SentImpression date={stampedOn} where="slot" /> : null}
    </form>
  );
}
