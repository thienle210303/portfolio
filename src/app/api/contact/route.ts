import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { SITE_URL } from "@/content/portfolio";
import { leadSubject, thankYouFrom, thankYouMessage } from "@/lib/contact";
// Built from the limits and patterns the form also checks; this is the final check.
import { leadSchema } from "./schema";

/**
 * Lead delivery endpoint.
 *
 * Contract with the client (the lead form):
 *  - `emailDeliveryConfigured` is computed once on the server in `page.tsx`
 *    and only ever crosses to the browser as a boolean. The client only
 *    POSTs here when that boolean was `true`.
 *  - This route re-checks the same three env vars independently, because a
 *    prop computed at render time can go stale relative to the process's
 *    actual environment, and this endpoint must never be the reason a
 *    visitor sees a false "sent" confirmation. If it finds itself
 *    unconfigured, it says so explicitly (503 / "not-configured") so the
 *    client can show my address and a copy button honestly instead of
 *    guessing. No path ever opens the visitor's mail app (round 23).
 *  - Every response is one of the shapes in `ContactApiResponse` below.
 *    Nothing else is ever returned, and nothing throws past this module —
 *    nodejs runtime errors are caught and turned into a generic
 *    "send-failed" response rather than a 500.
 *  - Round 24: once my own copy has sent, and only when `CONTACT_REPLY_FROM`
 *    (an address on a domain verified in Resend) is set and the visitor gave
 *    an email, they get a short thank-you through the same client, replying to
 *    my inbox. It is static: it never repeats anything the visitor typed, not
 *    even their name. A thank-you that fails never fails the lead (it is
 *    logged), and the response says whether one went (`thanked`). A phone-only
 *    lead gets nothing: there is no SMS.
 */

export const runtime = "nodejs";

type ContactField = "name" | "email" | "phone";
type FieldErrors = Partial<Record<ContactField, string>>;

function isContactField(value: unknown): value is ContactField {
  return value === "name" || value === "email" || value === "phone";
}

/** First message per field is enough for a form that validates one field's
 *  worth of rules at a time. */
function collectFieldErrors(issues: readonly z.core.$ZodIssue[]): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (!isContactField(field)) continue;
    if (!fieldErrors[field]) fieldErrors[field] = issue.message;
  }
  return fieldErrors;
}

/**
 * Every possible response this route returns. Kept as a single exhaustive
 * union so the client can switch on `ok` / `reason` instead of guessing at
 * shapes. Not exported — the client component (the lead form) mirrors
 * the small parts of this shape it needs locally rather than importing from
 * a route module.
 */
type ContactApiResponse =
  | { ok: true; thanked: boolean }
  | { ok: false; reason: "invalid"; fieldErrors: FieldErrors }
  | { ok: false; reason: "not-configured" }
  | { ok: false; reason: "rate-limited" }
  | { ok: false; reason: "send-failed" };

function respond(body: ContactApiResponse, status: number): NextResponse<ContactApiResponse> {
  return NextResponse.json(body, { status });
}

/** Non-string, missing or malformed input collapses to "", which then fails
 * validation normally instead of throwing — the route must never 500 just
 * because a client sent a weird shape. */
function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/* -------------------------------------------------------------------------- */
/* Rate limiting                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Minimal fixed-window limiter, in memory only. It is intentionally not a
 * durable security boundary (a serverless cold start resets it, and it only
 * protects a single process) — its job is to blunt obvious flooding, not to
 * replace real infrastructure. Disabled outside production so it can never
 * get in the way of local development or repeated manual testing.
 */
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  if (process.env.NODE_ENV !== "production") return false;

  const now = Date.now();
  const recent = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  requestLog.set(ip, recent);

  return recent.length > RATE_LIMIT_MAX_REQUESTS;
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const first = forwardedFor?.split(",")[0]?.trim();
  if (first) return first;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

/* -------------------------------------------------------------------------- */
/* The thank-you                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Sends the visitor a short thank-you, when one is due: `CONTACT_REPLY_FROM`
 * is set (an address on a domain verified in Resend) and they gave an email.
 * Resolves `true` only when the mail service accepted it. It never throws and
 * its failure is only logged, because the lead has already reached me.
 */
async function thank(
  resend: Resend,
  replyFrom: string | undefined,
  visitorEmail: string | undefined,
  myInbox: string,
): Promise<boolean> {
  const from = replyFrom?.trim();
  if (!from || !visitorEmail) return false;
  try {
    const { error } = await resend.emails.send({
      from: thankYouFrom(from),
      to: visitorEmail,
      replyTo: myInbox,
      ...thankYouMessage(SITE_URL),
    });
    if (error) {
      console.error("[contact] Resend rejected the thank-you:", error.name, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[contact] Unexpected error while thanking:", err instanceof Error ? err.message : err);
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Handler                                                                     */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest): Promise<NextResponse<ContactApiResponse>> {
  if (isRateLimited(getClientIp(request))) {
    return respond({ ok: false, reason: "rate-limited" }, 429);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    // Malformed JSON body — a 400, never a 500.
    return respond({ ok: false, reason: "invalid", fieldErrors: {} }, 400);
  }

  const body: Record<string, unknown> = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};

  // Honeypot check happens before anything else — including the config
  // check and real validation — so a bot's request is never distinguishable
  // from a real one by its response. A real visitor can never populate this
  // field (see the lead form's honeypot input); any value here means the
  // submission is automated. Respond exactly as a genuine success would,
  // and send nothing.
  if (asString(body.website) !== "") {
    return respond({ ok: true, thanked: false }, 200);
  }

  // Re-checked independently of `page.tsx`'s own boolean — read directly
  // into locals (rather than a `Boolean(a && b && c)` check discarded
  // afterwards) so TypeScript itself proves every value below is a real
  // string, with no cast required.
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL;
  const fromEmail = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !toEmail || !fromEmail) {
    return respond({ ok: false, reason: "not-configured" }, 503);
  }

  const parsed = leadSchema.safeParse({
    name: asString(body.name),
    email: asString(body.email),
    phone: asString(body.phone),
  });

  if (!parsed.success) {
    return respond(
      { ok: false, reason: "invalid", fieldErrors: collectFieldErrors(parsed.error.issues) },
      400,
    );
  }

  const { name, email, phone } = parsed.data;

  try {
    const resend = new Resend(apiKey);

    const lines = [`Name: ${name}`];
    if (email) lines.push(`Email: ${email}`);
    if (phone) lines.push(`Phone: ${phone}`);
    const text = lines.join("\n");

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      ...(email ? { replyTo: email } : {}),
      subject: leadSubject(name),
      text,
    });

    if (error) {
      // Log server-side only. The API key never appears in this log line,
      // and the provider's own error text (which can describe account or
      // domain configuration) never reaches the client.
      console.error("[contact] Resend rejected the message:", error.name, error.message);
      return respond({ ok: false, reason: "send-failed" }, 502);
    }

    // My copy is out; only now does a thank-you go, and what happens to it
    // can no longer change the answer to the lead.
    const thanked = await thank(resend, process.env.CONTACT_REPLY_FROM, email, toEmail);
    return respond({ ok: true, thanked }, 200);
  } catch (err) {
    console.error("[contact] Unexpected error while sending:", err instanceof Error ? err.message : err);
    return respond({ ok: false, reason: "send-failed" }, 502);
  }
}
