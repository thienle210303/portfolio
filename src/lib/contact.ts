import type { ContactIntent } from "@/types/portfolio";

/**
 * What the contact form sends, built once and used by both delivery paths.
 *
 * The limits are the API's own: `src/app/api/contact/route.ts` imports them
 * from here, and so does the form's client-side validation, so the two cannot
 * drift. Everything here except `openMailClient` is a pure function.
 */

export const NAME_MAX = 100;
export const EMAIL_MAX = 200;
export const REASON_MAX = 120;
export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 5000;

const FALLBACK_SUBJECT = "Message from your portfolio site";

/** The subject line: the intent's own, plus the case study the visitor was
 *  reading when they followed its "Discuss this project" link. */
export function buildReason(intent: Pick<ContactIntent, "subject">, projectTitle: string | null): string {
  return projectTitle ? `${intent.subject} — ${projectTitle}` : intent.subject;
}

export interface MailtoMessage {
  readonly subject: string;
  readonly message: string;
  readonly name: string;
  readonly email: string;
}

/** RFC 6068 wants percent-encoding, not `application/x-www-form-urlencoded`
 * encoding — `URLSearchParams` would turn every space into a literal `+` in
 * the opened compose window. The body is the message, then the same
 * name/email footer the API puts under a delivered message. */
export function buildMailtoHref(toEmail: string, { subject, message, name, email }: MailtoMessage): string {
  const body = [message.trim(), "", "—", `Name: ${name.trim()}`, `Email: ${email.trim()}`].join("\n");
  const resolvedSubject = subject.trim() || FALLBACK_SUBJECT;
  return `mailto:${toEmail}?subject=${encodeURIComponent(resolvedSubject)}&body=${encodeURIComponent(body)}`;
}

/** Hands a `mailto:` href to the browser. The only impure export here, kept
 *  apart so a test can observe the href without a real navigation. */
export function openMailClient(href: string): void {
  window.location.href = href;
}
