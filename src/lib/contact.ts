import { z } from "zod";

/**
 * The lead form's contract. `leadSchema`, and the limits it is built from, is
 * the single source for both `src/app/api/contact/route.ts` and the client
 * form, so the two cannot drift. Everything here except `openMailClient` is a
 * pure function.
 */

export const NAME_MAX = 100;
export const EMAIL_MAX = 200;
export const PHONE_MAX = 20;
// A literal space, not \s: \s would accept a newline.
const PHONE_PATTERN = /^\+?[\d ().-]{7,20}$/;
// No CR, LF or other control character: the name goes into the email subject.
const SINGLE_LINE = /^[^\x00-\x1f\x7f]*$/;

export interface Lead {
  readonly name: string;
  readonly email?: string;
  readonly phone?: string;
}

/** A blank optional field is "not given", not "invalid". */
const optional = (field: z.ZodType<string>) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), field.optional());

/** Shared by the form and `/api/contact`. `website` is the honeypot. */
export const leadSchema: z.ZodType<Lead & { website?: string }> = z
  .object({
    name: z.string().trim().min(1, "Enter your name.").max(NAME_MAX, `Keep your name under ${NAME_MAX} characters.`).regex(SINGLE_LINE, "Use a single line."),
    email: optional(
      z
        .string()
        .trim()
        .pipe(z.email("Enter a valid email address.").max(EMAIL_MAX, `Keep your email under ${EMAIL_MAX} characters.`)),
    ),
    phone: optional(z.string().trim().regex(PHONE_PATTERN, "Enter a valid phone number.")),
    website: z.string().optional(),
  })
  .superRefine((lead, ctx) => {
    if (lead.email || lead.phone) return;
    const message = "Add an email or a phone number so I can reach you.";
    ctx.addIssue({ code: "custom", path: ["email"], message });
    ctx.addIssue({ code: "custom", path: ["phone"], message });
  });

export function leadSubject(name: string): string {
  return `Portfolio lead — ${name.trim()}`;
}

/** RFC 6068 percent-encoding (not `+` for spaces). Body mirrors the API's email. */
export function buildLeadMailto(lead: Lead, toEmail: string): string {
  const lines = [`Name: ${lead.name.trim()}`];
  if (lead.email?.trim()) lines.push(`Email: ${lead.email.trim()}`);
  if (lead.phone?.trim()) lines.push(`Phone: ${lead.phone.trim()}`);
  const body = lines.join("\n");
  return `mailto:${toEmail}?subject=${encodeURIComponent(leadSubject(lead.name))}&body=${encodeURIComponent(body)}`;
}

/** Hands a `mailto:` href to the browser. The only impure export here, kept
 *  apart so a test can observe the href without a real navigation. */
export function openMailClient(href: string): void {
  window.location.href = href;
}
