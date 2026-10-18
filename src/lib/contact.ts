/**
 * The lead form's shared limits, patterns and messages, read by both the form
 * and `src/app/api/contact/schema.ts`. Deliberately zod-free: the form is a
 * client component, and zod here would ship in the initial bundle. The
 * server's zod schema is the final check. Everything here except
 * `openMailClient` is a pure function.
 */

export const NAME_MAX = 100;
export const EMAIL_MAX = 200;
// The pattern allows a leading `+` plus 20 more characters.
export const PHONE_MAX = 21;
// At least seven digits; a literal space, not \s, since \s would accept a newline.
export const PHONE_PATTERN = /^\+?(?=(?:\D*\d){7})[\d ().-]{7,20}$/;
// No CR, LF or other control character: the name goes into the email subject.
export const SINGLE_LINE = /^[^\x00-\x1f\x7f]*$/;

export const LEAD_ERRORS = {
  nameRequired: "Enter your name.",
  nameTooLong: `Keep your name under ${NAME_MAX} characters.`,
  singleLine: "Use a single line.",
  email: "Enter a valid email address.",
  emailTooLong: `Keep your email under ${EMAIL_MAX} characters.`,
  phone: "Enter a valid phone number.",
  pair: "Add an email or a phone number so I can reach you.",
} as const;

export interface Lead {
  readonly name: string;
  readonly email?: string;
  readonly phone?: string;
}

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
