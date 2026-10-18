# Round 20 Phase 6 — Contact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Contact becomes the chat on the left and the business card on the right. The card's front carries every way to reach Thien plus a "Save contact" vCard. Clicking the card flips it to a short lead form (name, then email or phone), with no message field. The intent picker, the drafted message form and the case-study prefill are removed.

**Architecture:**
- `/api/contact` gets a lead schema `{ name, email?, phone? }`, keeping its honeypot, rate limit and Resend send. The `mailto:` fallback stays for when Resend isn't configured.
- A static route handler, `src/app/contact.vcf/route.ts`, serves the vCard, built from `profile`.
- `BusinessCard` becomes a client component with two faces. The faces flip with a CSS 3D transform, the hidden face is `inert`, and focus moves to the face that turns up.
- `ContactForm`, `IntentChooser`, `contactIntents` and their helpers are deleted.

**Tech Stack:** Next.js 16 route handlers, React, zod (already a dependency), Resend (already a dependency), vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-10-round-20-redesign-design.md` §6 (plus the owner requests of 2026-10-11: "click the card → flip to the form", "copy my email", "a brief form so I can chase them; they don't need to message me first").

## Global Constraints

- **Project rules:** pnpm only. Strict TS. No new dependency. Semantic aliases only. Blue is never decoration, and there is one primary control per screen. WCAG 2.2 AA in both themes. `src/lib/` never imports `src/sections/`.
- **Layout:** chat (`AskThisSite`, `#ask`) on the left, business card on the right. At ≥ 1024 px they sit side by side; below that they stack with the card first. The card stays the only `<aside>` in `#contact` and keeps `data-cat-hide`; the companion perches on `#contact aside`. `#ask` is never an aside.
- **Card front:**
  - name, role, "Taylors, South Carolina" (from `profile.location`)
  - the philosophy line (the chat cites it to Contact)
  - email with the existing `CopyButton`
  - LinkedIn
  - "Book a call" (only when `validBookingUrl(BOOKING_URL)`)
  - "Résumé" (→ `/resume`)
  - "Save contact" (→ `/contact.vcf`, `download`)
  - "Let me reach you" (the flip control)
- **Flip:**
  - Clicking the card's empty area, or the "Let me reach you" button, flips it. Clicks on links and buttons never flip.
  - The motion is a CSS 3D transform. Under reduced motion the global rule already makes it an instant swap.
  - The hidden face is `inert`.
  - On flip, focus moves to the first field. On flip back, it returns to "Let me reach you".
  - "Back" (on the form) and Escape flip it back.
- **Lead form (back face):**
  - Fields: name (required), email, phone. At least one of email or phone is required.
  - There is no message field.
  - One line explains that the details are used only to reply.
  - A Send button.
  - Success and error show on the card.
- **API:** the schema is `{ name: string(1..NAME_MAX), email?: email(..EMAIL_MAX), phone?: string matching /^\+?[\d ().-]{7,20}$/, website?: honeypot }`, with "email or phone" enforced by a refine.
  - The rate limit, honeypot, env re-check and Resend send keep their order.
  - Subject: `Portfolio lead — ${name}`.
  - `replyTo`: the email when present.
  - The body lists name, email and phone.
  - The response union is unchanged in shape: `{ ok: true }`, `invalid` + fieldErrors, `not-configured`, `rate-limited`, `send-failed`.
- **Fallback:** when Resend isn't configured, the form opens the visitor's mail client:
  - recipient: `profile.email`
  - subject: `Portfolio lead — ${name}`
  - body: name, email and phone
  - The status then says the mail app was opened.
- **Removed:** `ContactForm.tsx`, `IntentChooser.tsx`, `DirectLinks.tsx` (its links move to the card), `contactIntents` and its type, `lib/contact.ts`'s `buildReason`/intent code, `withCaseStudyReferral`, the companion's `data-cat-secret` path, and the `portfolio:contact-sent` source.
  - The lead form's success dispatches `portfolio:contact-sent` instead, so the cats still cheer.
  - Case studies keep a "Discuss this project" link to `#contact`, without the prefill.
- **Copy (drafts; first person per `docs/voice.md`):**
  - Section lead: "Ask the site something, or leave a way to reach you."
  - Back face heading: "Leave a way to reach you."
  - Note: "I'll only use this to get back to you."
  - Success: "Got it — I'll be in touch."
- **vCard:** version 3.0, built from `profile`: `FN`, `N`, `TITLE`, `EMAIL`, `URL` (`SITE_URL`), `ADR` locality and region from `profile.location`, plus the social URLs as `URL;type=…` or `X-SOCIALPROFILE`. Served with `Content-Type: text/vcard; charset=utf-8` and `Content-Disposition: attachment; filename="thien-le.vcf"`. Static, with no request data.
- **CLAUDE.md:** the "Contact form falls back from Resend to a `mailto:` flow" non-negotiable is rewritten for the lead form and keeps its meaning (the fallback is intentional). README's contact sections and `.env.example` comments are updated.
- **Testing:** a false comment, doc or copy is an Important finding.
- **Workspace:**
  - Worktree `.claude/worktrees/r20-contact`, branch `round-20/contact`.
  - Install with `npm_config_package_lock=true pnpm install`.
  - Use ports 3160–3169, a throwaway Playwright config and `--workers=2`.
  - Kill processes by exact PID only.
- **Merge:** merge when done. Pushing is pre-approved.

## Review Focus

1. **Phone-only and email-only leads.** Both are accepted. If both are missing, the error names the pair and sits next to the fields. If the phone is malformed, its own error appears. *Tests: Task 1 schema tests and Task 3 e2e.*
2. **Keyboard flip.** A keyboard user can complete the whole flow: Tab to "Let me reach you", Enter, fill, Send, then Back. Escape flips back and focus returns to the trigger. There is no focus inside the inert face. *Test: Task 3, `flip by keyboard`.*
3. **Honeypot and spam.** A filled `website` returns a fake `ok` and sends nothing. The rate limit applies only in production. *Tests: Task 1 route tests.*
4. **No Resend env.** The mailto fallback opens with the right subject and body, and the status text says so. *Tests: Task 1 unit + Task 3 e2e with env unset.*
5. **Print and the 390 px layout.** Print shows the front face only, with no form. At 320–390 px the card fits with no overflow, and the flipped face fits too. *Tests: Task 3, `responsive` + `print` specs.*

---

### Task 1: Lead API and mailto fallback

**Files:**
- Modify: `src/app/api/contact/route.ts`
- Modify: `src/lib/contact.ts` — keep the limits; replace `buildReason` and the intent mailto with `buildLeadMailto(lead)`.
- Create: `tests/api/contact.test.ts`
- Rewrite: `tests/lib/contact.test.ts`

**Interfaces:**

```ts
export interface Lead { readonly name: string; readonly email?: string; readonly phone?: string }
export const leadSchema: z.ZodType<Lead & { website?: string }>   // in src/lib/contact.ts so client and route share it
export function buildLeadMailto(lead: Lead, toEmail: string): string
export function leadSubject(name: string): string   // `Portfolio lead — ${name}`
```

- [ ] **Step 1: Write the failing tests.**
  - Schema:
    - `accepts email only`
    - `accepts phone only`
    - `rejects neither, with the error on both fields`
    - `rejects a malformed phone`
    - `trims and caps lengths`
  - Mailto: `subject and body carry name, email, phone; omits missing ones`.
  - Route (mock `resend` and env):
    - `ok sends one email with replyTo when email present`
    - `phone-only sends without replyTo`
    - `honeypot returns ok and sends nothing`
    - `invalid returns 400 with fieldErrors`
    - `not-configured returns 503`
    - `send failure returns 502`
    - `rate-limited after 5 in production`
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement. The intent-based helpers stay until Task 3 removes their caller; mark them `@deprecated` if they must survive for the build.
- [ ] **Step 4:** Run the tests and typecheck. Expected: PASS.
- [ ] **Step 5: Commit:** `Accept a short lead — a name and an email or phone — at /api/contact`.

### Task 2: vCard route

**Files:**
- Create: `src/app/contact.vcf/route.ts`
- Create: `src/lib/vcard.ts` (pure builder)
- Create: `tests/lib/vcard.test.ts`
- Check: `next.config` / `robots` / `sitemap` exclusions, so the route isn't listed as a page.

**Interfaces:** `export function buildVCard(p = profile, links = socialLinks, site = SITE_URL): string`. Lines end in CRLF, and commas and semicolons are escaped. The route is `export const dynamic = "force-static"`, and its `GET` returns the string with the headers above.

- [ ] **Step 1: Write the failing tests.**
  - `BEGIN/END and VERSION:3.0`
  - `FN and N from profile.name`
  - `EMAIL, TITLE, URL`
  - `ADR locality/region from location`
  - `escapes commas/semicolons`
  - `CRLF line endings`
  - e2e (in Task 3): `GET /contact.vcf returns text/vcard as an attachment`.
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement. Read `node_modules/next/dist/docs/` for route handlers and static export in this Next version first.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit:** `Serve a vCard built from the profile at /contact.vcf`.

### Task 3: The flip card and the new Contact section

**Files:**
- Modify: `src/sections/Contact/BusinessCard.tsx` (becomes `"use client"`; keep its aspect and measurement comments true or update them), `src/sections/Contact/Contact.tsx`, `src/app/page.tsx` (pass `bookingUrl` and `emailDeliveryConfigured` to the card).
- Create: `src/sections/Contact/LeadForm.tsx`.
- Delete: `ContactForm.tsx`, `IntentChooser.tsx`, `DirectLinks.tsx`, `contactIntents` and its type, `withCaseStudyReferral`, the deprecated intent helpers, and the companion `data-cat-secret`/`SECRET_ATTR` path and its slots (if nothing else uses them).
- Modify: `src/sections/CareerTree/CaseStudy.tsx` (drop `data-project-title`), `src/content/portfolio.ts` (new copy strings).
- Tests:
  - Rewrite `e2e/contact.spec.ts`.
  - Update `e2e/ask.spec.ts` (:396 Résumé link now on the card; :412-422 aside rules), `e2e/companion.spec.ts` (delete the secret-intent test at :3841+; `#contact aside` uses still hold), `e2e/axe.spec.ts`.
  - Update `tests/lib/content.test.ts` (:433-495), `tests/sections/ContactForm.test.tsx` (delete), and add `tests/sections/BusinessCard.test.tsx` and `LeadForm.test.tsx`.
- Docs: `CLAUDE.md`, `README.md`, `.env.example`.

**Interfaces:**
- `BusinessCard({ bookingUrl, emailDeliveryConfigured }: { bookingUrl: string | null; emailDeliveryConfigured: boolean })`
- `LeadForm({ emailDeliveryConfigured, onBack }: { emailDeliveryConfigured: boolean; onBack: () => void })`

Card markup:
- `<aside aria-label="Thien Le — business card" data-cat-hide>` wraps a `div[data-flip]` with `data-flipped` toggled. That div holds two faces, `[data-face="front"]` and `[data-face="back"]`.
- Each face has `backface-visibility: hidden`. The back is pre-rotated `rotateY(180deg)`. The flip transition uses `--dur-settle`.
- The card's height is the larger of the two faces; use a CSS grid stack so both faces occupy the same cell. Keep `lg:aspect-[13/10]` only if both faces fit. Otherwise relax it and update the measured comment honestly.

- [ ] **Step 1: Write the failing tests** (e2e on port 3162, at 1440 and 390, both themes where it matters):
  - `card front has every way to reach me` (incl. the "Save contact" link to `/contact.vcf` with `download`).
  - `copy email copies` (existing).
  - `clicking the card's empty area flips; clicking a link does not`.
  - `flip by keyboard: focus lands in the name field; Escape flips back to the trigger`.
  - `hidden face is inert`.
  - `email-only lead posts and shows success` (route mocked via `page.route`).
  - `phone-only lead posts`.
  - `neither shows the paired error`.
  - `mailto fallback when not configured` (unset env build or a `page.route` 503 → asserts the opened `mailto:` href).
  - `GET /contact.vcf returns text/vcard as an attachment`.
  - `chat on the left, card on the right at 1440; stacked at 390`.
  - `cats cheer on success` (`portfolio:contact-sent` fired).
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement, then run `pnpm contrast`.
- [ ] **Step 4:** Run `contact`, `ask`, `axe` (both themes), `companion`, `responsive`, `print`, `interactions` and `accessibility` (PASS; companion flake: retry once).
- [ ] **Step 5:** Take screenshots of `#contact` at 1440 and 390, day and night, front and back, into `reports/r20-p6-screens/` (untracked). Look at them and report.
- [ ] **Step 6: Commit:** `Make Contact the chat beside a business card that flips to a short lead form`.

### Task 4: Verify, record, and the open lag A/B

- [ ] Run `pnpm verify`. The retrieval eval must hold its floors.
- [ ] Run the full `pnpm test:e2e` (port 3163). Retry each failure once in isolation.
- [ ] Run `pnpm perf` (0 skipped; JS at load).
- [ ] **Run the lag A/B carried from Phase 5.** Wait for the machine to be idle (CPU < 20% for 3 consecutive 5 s samples, checking every 5 min for up to 60 min). Then run `ae0cdc6` vs HEAD, 3 runs each, interleaved, with the per-section bands. If the machine never goes idle, record that, run it anyway, and label it.
- [ ] Add R20-P6 rows to the tracker and write `reports/r20-p6-ledger.md` (untracked).
- [ ] **Commit:** `Record round 20 phase 6`.
