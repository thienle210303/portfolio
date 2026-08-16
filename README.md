# Thien Le — Portfolio

A personal portfolio for a software engineer working on automation, developer
experience, performance, and workflows that did not previously exist.

The site is a single narrative page: a code-led hero, a problem-solving
philosophy, six case studies, an AI Workflow Lab with a dated learning log, a
career timeline, an interactive résumé, and a contact experience that starts from
what the visitor actually came to say.

**Positioning:** *I engineer software that turns complex work into clear,
reliable systems.*
**Recurring idea:** *Unsolved is not the same as unsolvable.*

---

## Technology stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router) | Server Components by default; minimal client JS |
| UI | **React 19** | Bundled with Next 16 |
| Language | **TypeScript** (strict) | The content layer is typed so facts cannot drift |
| Styling | **Tailwind CSS v4** | Configured in CSS via `@theme` — there is no `tailwind.config.js` |
| Icons | **lucide-react** | Lightweight, tree-shaken |
| Validation | **Zod** | Server-side contact validation |
| Email | **Resend** | Optional — the form degrades honestly without it |
| Fonts | **next/font** | Instrument Serif, Inter, JetBrains Mono, self-hosted, `display: swap` |
| Tests | **Vitest** + Testing Library, **Playwright** | Component behaviour and real-viewport smoke tests |
| Package manager | **pnpm** | Exclusively — do not introduce another lockfile |

No database, no CMS, no state-management library, no component library. Every
component in `src/components` and `src/sections` is written for this site.

---

## Local setup

Requires **Node.js 20.9+** and **pnpm**.

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

### Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Development server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | ESLint (Next.js core-web-vitals + TypeScript) |
| `pnpm typecheck` | `tsc --noEmit`, strict |
| `pnpm test` | Vitest component/unit tests, single run |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm test:e2e` | Playwright browser + responsive tests |
| `pnpm verify` | typecheck → lint → test → build, in order |

`pnpm test:e2e` starts its own dev server. If you already have one running on
port 3000 it will reuse it.

---

## Where the content lives

**All facts live in two files.** Nothing factual is written inline in JSX, so a
date, employer or metric exists in exactly one place.

| File | Contains |
|---|---|
| `src/content/portfolio.ts` | Profile, social links, navigation, hero code tabs, philosophy, career entries, case studies, skills, education, certifications, achievements, contact intents |
| `src/content/ai-experiments.ts` | Workflow stages, AI experiments, learning log |
| `src/types/portfolio.ts` | The types both files are checked against |

`careerEntries` is the canonical source for organisations, roles and dates. Case
studies reference a career entry by `careerEntryId` rather than restating them,
so the timeline, the case studies and the résumé cannot disagree.

### The `[NEEDS INPUT]` convention

When a fact is not known, the content file holds an explicit marker:

```ts
location: "[NEEDS INPUT: city / metro to display]",
```

These are **never rendered**. Fields typed `Maybe<T>` are unwrapped with
`resolved()` from `src/types/portfolio.ts`, which returns `undefined` for a
marker — and its return type is written so that a field currently holding a
marker collapses to `undefined` at compile time. Rendering an unsupplied fact is
a type error, not just a runtime no-op.

For markers embedded inside a longer sentence, `stripNeedsInput()` from
`src/lib/content.ts` removes them before display.

To supply a missing fact, replace the marker string with the real value. Nothing
else needs to change.

### Adding a career entry

Append to `careerEntries` in `src/content/portfolio.ts`:

```ts
{
  id: "unique-id",
  type: "work",            // "work" | "learning" | "milestone"
  dateRange: "March 2027 — Present",
  sortKey: "2027-03",      // YYYY-MM; entries sort by this, descending
  role: "Staff Engineer",
  organization: "Company",
  locationOrMode: undefined,        // or a string, or a [NEEDS INPUT] marker
  context: "One sentence of setting.",
  responsibilities: ["…"],
  built: ["…"],
  impact: ["…"],
  learned: "What the work taught you.",
  technologies: ["…"],
  link: { label: "example.com", href: "https://example.com" }, // optional
  lenses: ["engineering", "automation"],   // drives the résumé lens filter
}
```

The timeline filter counts (All / Work / Learning / Milestones) are computed from
the data — there is nothing to update.

Where two entries share a `YYYY-MM`, append a disambiguating suffix to `sortKey`
(`"2025-05-a"`, `"2025-05-b"`) — sorting is reverse-lexicographic on the string.

### Adding a project / case study

Append to `projects` in `src/content/portfolio.ts`. Every case study follows the
same narrative arc, and the fields are named for it:

**Problem** (`problem`, `whyItMattered`, `assumption`) → **Constraint**
(`constraints`, `responsibility`) → **Decision** (`decisions`, `pathsExplored`,
`whatFailed`, `failureLesson`) → **Build** (`built`, `workflow`) → **Proof**
(`proof`, `metrics`) → **Lesson** (`learned`, `nextQuestion`).

- `careerEntryId` must match an existing entry in `careerEntries`; the
  organisation and date range are read from it.
- `metrics` entries require a `source` field naming where the figure came from.
  The provenance is rendered next to the number. Do not add a metric you cannot
  source.
- `workflow` (before/after diagram) is optional — include it only when the real
  before-state is known.
- `inProgressNote` renders a written "case study in progress" state instead of a
  half-finished deep dive.

### Adding an AI experiment

Append to `experiments` in `src/content/ai-experiments.ts`.

```ts
{
  id: "unique-id",
  title: "…",
  started: "Q1 2027",   // coarse and true beats precise and invented
  sortKey: "2027-01",   // YYYY-MM, used for ordering only
  status: "Exploring",  // Exploring | Tested | Adopted | Retired
  question: "…",
  hypothesis: "…",
  toolIds: ["claude-code"],   // must exist in `aiTools` in portfolio.ts
  whyThisTool: "…",
  contextSupplied: ["…"],
  stageIds: ["implement"],    // must exist in `workflowStages`
  humanDecisionPoints: ["…"],
  safetyBoundaries: ["…"],
  verification: [],           // MUST stay empty until something is verified
  nextExperiment: "…",
  lastUpdated: "2027-01-15",
}
```

Rules enforced by review, not by the compiler:

- An `Exploring` experiment has an **empty `verification` array and no
  `outcome`**. The UI renders "no results yet" for these. Do not add an outcome
  to make an entry look complete.
- Any claim about a tool's current capabilities needs a `sources` entry linking
  to the vendor's own documentation, because those capabilities change faster
  than this file does.
- Nothing on this page runs live. Never add simulated output.

### Updating the learning log

`learningLog` in `src/content/ai-experiments.ts`:

- `lastUpdated` — bump this whenever you touch the log; it drives the
  "Last updated" indicator.
- `exploringNow` — what you are learning right now (undated).
- `changedMyThinking` — `{ before, after }` pairs.
- `wantToTestNext` — open intentions (undated).
- `entries` — **dated** entries, `YYYY-MM-DD`. Only add an entry you can date
  honestly; the undated arrays exist precisely so you never have to invent one.

Dates are formatted by `formatIsoDate()` in `src/lib/content.ts`, which uses a
hardcoded month table rather than `Intl` — this is deliberate, so server and
client render identically and hydration stays clean. Do not swap it for
`toLocaleDateString`.

### Replacing the résumé PDF

Replace `public/thien-le-resume.pdf`, keeping the filename. It is referenced by
`profile.resumePdf` in `src/content/portfolio.ts`; change that value if you
rename the file. Set it to `undefined` and every "Download PDF" affordance
disappears cleanly.

The résumé is the source of truth for employers, dates, education, skills and
metrics. When it changes, reconcile `careerEntries`, `education`,
`certifications`, `achievements` and any `metrics.source` that cites it.

---

## Contact form configuration

The form has two honest modes and picks one **on the server** at render time.

**Unconfigured (default).** The submit button reads **"Open email app"**, the UI
says so before you submit, and submitting builds a URL-encoded `mailto:` link.
No message is ever sent without an explicit visitor action, and a success message
is never shown for a send that did not happen. Copy-email, LinkedIn and GitHub
alternatives are always offered.

**Configured.** Set all three variables below and the form POSTs to
`/api/contact`, which validates with Zod and sends via Resend.

```bash
cp .env.example .env.local
```

| Variable | Required | Purpose |
|---|---|---|
| `RESEND_API_KEY` | yes | Resend API key |
| `CONTACT_TO_EMAIL` | yes | Where messages are delivered |
| `CONTACT_FROM_EMAIL` | yes | Verified sender on your Resend domain |

All three are **server-only**. Never prefix them with `NEXT_PUBLIC_` — that would
publish your API key to every visitor. Only a single boolean
(`emailDeliveryConfigured`) crosses to the client.

The route additionally enforces a hidden honeypot field, length limits on every
input, and returns `503 { ok: false, reason: "not-configured" }` if the
environment is incomplete, so the client can fall back to the email-app flow.

### Site URL

`SITE_URL` in `src/content/portfolio.ts` drives `metadataBase`, the canonical
URL, Open Graph tags, JSON-LD and the sitemap. Update it when the real domain is
live.

---

## Testing

```bash
pnpm test        # Vitest: components, filters, forms, content helpers
pnpm test:e2e    # Playwright: navigation, keyboard, responsive widths
```

The Playwright suite checks for horizontal overflow at **320, 375, 390, 768,
1024 and 1440px**, keyboard navigation, mobile-menu focus restoration, and
reduced-motion behaviour.

Run everything the way CI would:

```bash
pnpm verify
```

---

## Project structure

```
src/
  app/            layout, page, route handlers, robots/sitemap/OG image
    api/contact/  server-side contact endpoint (Zod + Resend)
  components/
    layout/       header, nav, footer, skip link
    ui/           Section, Button, Tabs, Disclosure, FilterGroup, CodeBlock, …
  sections/       one folder per page section; Server Component + client island
  content/        ← all facts live here
  types/          the contracts content is checked against
  hooks/          small client-side hooks
  lib/            pure helpers (cn, highlight, content)
tests/            Vitest component tests
e2e/              Playwright specs
public/           résumé PDF
```

Sections are Server Components. Interactivity is isolated into the smallest
possible `"use client"` island inside each section folder.

---

## Accessibility and performance

The site targets **WCAG 2.2 AA**: semantic landmarks, a logical heading order, a
skip link, visible focus indicators everywhere, full keyboard access, no
hover-only information, no colour-only status, accessible tabs/accordions/filters,
focus restoration when the mobile menu closes, `aria-live` form feedback, and
`prefers-reduced-motion` support.

Performance targets are Lighthouse 90+/95+/95+/95+. That is a design constraint,
not an afterthought — it is why there is no motion library, no icon font, no
component kit, and why every section renders on the server.

---

## Licence

Personal portfolio content and copy © Thien Le. The code is provided as-is.
