import { z } from "zod";
import { EMAIL_MAX, LEAD_ERRORS, NAME_MAX, PHONE_PATTERN, SINGLE_LINE, type Lead } from "@/lib/contact";

/**
 * The server's final check on a lead. Server-only: the form imports the
 * constants above, never this file, so zod stays out of the client bundle
 * (`tests/lib/contact-zod-fence.test.ts`).
 */

/** A blank optional field is "not given", not "invalid". */
const optional = (field: z.ZodType<string>) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), field.optional());

/** `website` is the honeypot. */
export const leadSchema: z.ZodType<Lead & { website?: string }> = z
  .object({
    name: z.string().trim().min(1, LEAD_ERRORS.nameRequired).max(NAME_MAX, LEAD_ERRORS.nameTooLong).regex(SINGLE_LINE, LEAD_ERRORS.singleLine),
    email: optional(z.string().trim().pipe(z.email(LEAD_ERRORS.email).max(EMAIL_MAX, LEAD_ERRORS.emailTooLong))),
    phone: optional(z.string().trim().regex(PHONE_PATTERN, LEAD_ERRORS.phone)),
    website: z.string().optional(),
  })
  .superRefine((lead, ctx) => {
    if (lead.email || lead.phone) return;
    ctx.addIssue({ code: "custom", path: ["email"], message: LEAD_ERRORS.pair });
    ctx.addIssue({ code: "custom", path: ["phone"], message: LEAD_ERRORS.pair });
  });
