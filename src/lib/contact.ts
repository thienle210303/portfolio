/**
 * The lead form's shared limits, patterns and messages, read by both the form
 * and `src/app/api/contact/schema.ts`. Deliberately zod-free: the form is a
 * client component, and zod here would ship in the initial bundle. The
 * server's zod schema is the final check. Everything here is pure.
 */
import { contactCopy, profile } from "@/content/portfolio";

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

/* -------------------------------------------------------------------------- */
/* The thank-you email (round 24)                                             */
/* -------------------------------------------------------------------------- */

/**
 * `Thien Le <address>` for the thank-you's From header. `CONTACT_REPLY_FROM`
 * is meant to be a bare address, but a pasted `Name <address>` keeps its
 * address instead of nesting one display name inside another.
 */
export function thankYouFrom(configured: string): string {
  const address = (configured.match(/<([^<>]+)>/)?.[1] ?? configured).trim();
  return `${profile.name} <${address}>`;
}

// Text and double-quoted attributes only, which is all the message below uses.
const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (c) => HTML_ESCAPES[c]);

/**
 * The thank-you a visitor who left an email address gets, once I have a
 * verified sending domain: plain text and a minimal HTML twin. It takes no
 * visitor input at all, so it cannot repeat anything they typed (not even their
 * name): a form that echoed its input to any address would be a relay for
 * whatever text a stranger wanted delivered.
 */
export function thankYouMessage(siteUrl: string): { subject: string; text: string; html: string } {
  const { subject, body, signoff } = contactCopy.thanks;
  const host = siteUrl.replace(/^https?:\/\//, "");
  return {
    subject,
    text: `${body}\n\n${signoff}\n${siteUrl}\n`,
    html: `<p>${escapeHtml(body)}</p><p>${escapeHtml(signoff)}<br><a href="${escapeHtml(siteUrl)}">${escapeHtml(host)}</a></p>`,
  };
}
