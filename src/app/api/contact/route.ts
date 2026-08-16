import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

/**
 * Contact form delivery endpoint.
 *
 * Contract with the client (`ContactForm.tsx`):
 *  - `emailDeliveryConfigured` is computed once on the server in `page.tsx`
 *    and only ever crosses to the browser as a boolean. The client only
 *    POSTs here when that boolean was `true`.
 *  - This route re-checks the same three env vars independently, because a
 *    prop computed at render time can go stale relative to the process's
 *    actual environment, and this endpoint must never be the reason a
 *    visitor sees a false "sent" confirmation. If it finds itself
 *    unconfigured, it says so explicitly (503 / "not-configured") so the
 *    client can fall back to the mailto flow honestly instead of guessing.
 *  - Every response is one of the shapes in `ContactApiResponse` below.
 *    Nothing else is ever returned, and nothing throws past this module —
 *    nodejs runtime errors are caught and turned into a generic
 *    "send-failed" response rather than a 500.
 */

export const runtime = "nodejs";

const NAME_MAX = 100;
const EMAIL_MAX = 200;
const COMPANY_MAX = 120;
const REASON_MAX = 120;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 5000;

const contactSchema = z.object({
  name: z
    .string()
    .min(1, "Enter your name.")
    .max(NAME_MAX, `Keep your name under ${NAME_MAX} characters.`),
  email: z
    .email("Enter a valid email address.")
    .max(EMAIL_MAX, `Keep your email under ${EMAIL_MAX} characters.`),
  company: z.string().max(COMPANY_MAX, `Keep the company name under ${COMPANY_MAX} characters.`),
  reason: z.string().max(REASON_MAX, `Keep the reason under ${REASON_MAX} characters.`),
  message: z
    .string()
    .min(MESSAGE_MIN, `Say a little more — at least ${MESSAGE_MIN} characters.`)
    .max(MESSAGE_MAX, `Keep your message under ${MESSAGE_MAX} characters.`),
});

type ContactField = keyof z.infer<typeof contactSchema>;
type FieldErrors = Partial<Record<ContactField, string>>;

/**
 * Every possible response this route returns. Kept as a single exhaustive
 * union so the client can switch on `ok` / `reason` instead of guessing at
 * shapes. Not exported — the client component (`ContactForm.tsx`) mirrors
 * the small parts of this shape it needs locally rather than importing from
 * a route module.
 */
type ContactApiResponse =
  | { ok: true }
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
  // field (see ContactForm's honeypot input); any value here means the
  // submission is automated. Respond exactly as a genuine success would,
  // and send nothing.
  if (asString(body.website) !== "") {
    return respond({ ok: true }, 200);
  }

  const configured = Boolean(
    process.env.RESEND_API_KEY && process.env.CONTACT_TO_EMAIL && process.env.CONTACT_FROM_EMAIL
  );
  if (!configured) {
    return respond({ ok: false, reason: "not-configured" }, 503);
  }

  const parsed = contactSchema.safeParse({
    name: asString(body.name),
    email: asString(body.email),
    company: asString(body.company),
    reason: asString(body.reason),
    message: asString(body.message),
  });

  if (!parsed.success) {
    const fieldErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field !== "string") continue;
      if (field !== "name" && field !== "email" && field !== "company" && field !== "reason" && field !== "message") {
        continue;
      }
      // First message per field is enough for a form that validates one
      // field's worth of rules at a time.
      if (!fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return respond({ ok: false, reason: "invalid", fieldErrors }, 400);
  }

  const { name, email, company, reason, message } = parsed.data;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const subject = reason ? `Portfolio contact — ${reason}` : "New message from your portfolio site";
    const textLines = [message, "", "—", `Name: ${name}`, `Email: ${email}`];
    if (company) textLines.push(`Company: ${company}`);

    const { error } = await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL as string,
      to: process.env.CONTACT_TO_EMAIL as string,
      replyTo: email,
      subject,
      text: textLines.join("\n"),
    });

    if (error) {
      // Log server-side only. The API key never appears in this log line,
      // and the provider's own error text (which can describe account or
      // domain configuration) never reaches the client.
      console.error("[contact] Resend rejected the message:", error.name, error.message);
      return respond({ ok: false, reason: "send-failed" }, 502);
    }

    return respond({ ok: true }, 200);
  } catch (err) {
    console.error("[contact] Unexpected error while sending:", err instanceof Error ? err.message : err);
    return respond({ ok: false, reason: "send-failed" }, 502);
  }
}
