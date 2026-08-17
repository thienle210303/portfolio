# Thien Le — Portfolio

A personal portfolio for a software engineer working on automation, developer
experience, performance, and workflows that did not previously exist.

The site is a single narrative page: a code-led hero, a problem-solving
philosophy, six case studies, an AI Workflow Lab with a dated learning log, a
career timeline, an interactive résumé, and a contact experience that starts from
what the visitor actually came to say.

Visually it is **Blueprint**: a cool paper ground ruled with a faint measurement
grid, one blue reserved for annotation and measured values, and a margin rail
down each section carrying the counts, dates and sources the content layer
already guarantees. It ships in two themes — day and night — and the design
survives both. See [Design system](#design-system) below.

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
| Fonts | **next/font** | Newsreader, IBM Plex Sans, IBM Plex Mono, self-hosted, `display: swap` |
| Tests | **Vitest** + Testing Library, **Playwright** | Component behaviour and real-viewport smoke tests |
| Package manager | **pnpm** | Exclusively — do not introduce another lockfile |

No database, no CMS, no state-management library, no component library. Every
component in `src/components` and `src/sections` is written for this site.

---

## Design system

Two independent axes, both defined in `src/app/globals.css`.

**Theme** — `day` or `night`, the visitor's choice. An inline script in
`layout.tsx` resolves it (stored preference, else `prefers-color-scheme`) and
stamps `data-theme` on `<html>` *before first paint*, so there is no flash and
no hydration guessing. `globals.css` additionally carries a
`prefers-color-scheme` fallback for the case where that script never runs.

Night is not a mirror of day. In day, `tone="contrast"` is a true inversion — a
paper site closing on two ink chapters. Mirroring that would make night's
contrast sections full paper, a bright full-width flash for someone who asked
for a dark page, so in night `contrast` *deepens* to a raised panel instead.

**Tone** — `base`, `deep` or `contrast`, set per `<Section>`. The tone class
repoints the semantic aliases and paints nothing itself.

### Styling a component

Use the semantic aliases, never a raw `--color-*` token and never a literal:

| Alias | Utility | For |
|---|---|---|
| `--fg` | `text-fg` | primary text |
| `--fg-muted` | `text-fg-muted` | secondary text |
| `--fg-subtle` | `text-fg-subtle` | eyebrows, counts, sources |
| `--fg-inverse` | `text-fg-inverse` | text on an `--accent` fill |
| `--ground` | `bg-ground` | the section's own ground |
| `--surface` | `bg-surface` | raised panels: cards, code, the rail |
| `--accent` | `text-accent` / `bg-accent` | links, measured values, primary control |
| `--rule-color` | `border-rule` | 1px borders |

This is what lets one component render correctly across two themes × three
tones with no per-tone branch anywhere. A raw token freezes it into one.

### The margin rail

`<Section rail={…} />` renders a `<dl>` of annotations in an 11rem left margin
at ≥1024px, stacking after the body as endnotes below that. Every note must be
a fact **computed from the content layer** — a count, a date, a source — never
a restatement of the prose beside it, and never a fact that exists nowhere
else. `SelectedWork` and `AIWorkflowLab` are the reference examples.

Philosophy deliberately has no rail: `ProblemSolvingLoop` lays out nine
columns, and surrendering the margin drops each to ~127px.

### Colour and contrast

Blue is the only hue in the palette, reserved for annotation, links, measured
values and the single primary control per screen — never decoration.

`pnpm contrast` measures every pairing the design can produce, regenerates
[`docs/contrast.md`](docs/contrast.md), and **exits non-zero below 4.5:1**. It
runs inside `pnpm verify`. AA is the floor for all of them, including small
mono text, where the large-text 3:1 allowance does not apply.

One trap worth knowing: check tertiary tones against `--color-paper-deep`, not
`--color-paper`. The original `#5f6b72` passed at 4.79:1 on the base ground and
failed at 4.44:1 on the half-step-darker one.

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
| `pnpm contrast` | Re-measures every palette pairing; regenerates `docs/contrast.md`; fails below AA |
| `pnpm test` | Vitest component/unit tests, single run |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm test:e2e` | Playwright browser + responsive tests |
| `pnpm verify` | typecheck → lint → contrast → test → build, in order |

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
URL, Open Graph tags, JSON-LD and the sitemap. It resolves in this order:

| Source | When it wins |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | always, if set — this is the one to set on your host |
| `NEXT_PUBLIC_VERCEL_URL` | on a deployment that exposes its own hostname |
| the literal in `portfolio.ts` | everywhere else, including local dev |

The middle rung exists so a preview deployment describes *itself*. Without it,
every preview publishes canonical URLs and a sitemap claiming to be production.

This one is deliberately `NEXT_PUBLIC_` — unlike the contact variables, it is
public information (it is printed in the page's own `<head>`), and it must
resolve to the same string on the server and in the browser or the two disagree
about what page this is.

---

## Deploying

The app is a stock Next.js App Router build with one dynamic route
(`/api/contact`); everything else prerenders. Vercel is the path of least
resistance — import the repo, and it detects Next.js and pnpm from
`pnpm-lock.yaml` on its own. No `vercel.json` is needed, and there isn't one:
an empty config file only overrides detection that is already correct.

1. **Import the repository** on Vercel. Leave the framework preset, build
   command and output directory alone.
2. **Set the environment variables** (Project → Settings → Environment
   Variables):

   | Variable | Environments | Notes |
   |---|---|---|
   | `NEXT_PUBLIC_SITE_URL` | Production | your real domain, e.g. `https://thienle.dev` |
   | `RESEND_API_KEY` | Production (+ Preview to test it) | omit and the form falls back to `mailto:` |
   | `CONTACT_TO_EMAIL` | same as above | |
   | `CONTACT_FROM_EMAIL` | same as above | must be on a domain verified in Resend |

   The three contact variables are all-or-nothing: with any one missing the
   route returns `503 { reason: "not-configured" }` and the UI switches to the
   email-app flow. That is a working site, not a broken one — so it is safe to
   deploy before Resend is set up.
3. **Add the domain** (Project → Settings → Domains) and point DNS at it. Then
   set `NEXT_PUBLIC_SITE_URL` to it and redeploy, so canonical URLs, the
   sitemap and the JSON-LD all agree with where the site actually is.

Two things to know before it is live:

- **The rate limiter in `/api/contact` is per-instance and in memory.** A cold
  start resets it, and concurrent instances do not share a count. It is a
  courtesy throttle, not a security boundary; the honeypot, the Zod schema and
  the length limits are what actually protect the endpoint. If the form ever
  attracts real abuse, move the counter to a shared store.
- **The résumé PDF is a static file**, not a render of `/resume`. See
  [Replacing the résumé PDF](#replacing-the-résumé-pdf) — deploying does not
  regenerate it.

Nothing about the app is Vercel-specific: `pnpm build && pnpm start` runs it
anywhere Node 20.9+ does, and with the contact route removed it would export
statically.

---

## Testing

```bash
pnpm test        # Vitest: components, filters, forms, content helpers
pnpm test:e2e    # Playwright: navigation, keyboard, responsive widths
```

The Playwright suite checks for horizontal overflow at **320, 375, 390, 768,
1024 and 1440px**, keyboard navigation, mobile-menu focus restoration, and
reduced-motion behaviour.

`e2e/axe.spec.ts` audits **both themes** — the night theme is set the way a
visitor sets it, by seeding `localStorage` before the document runs so the
inline theme script is the thing under test — plus the `deep` and `contrast`
tones, which are where a contrast regression is likeliest to hide.

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
docs/             generated contrast table
scripts/          contrast measurement, screenshots
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

Contrast is enforced by a script rather than by review: `pnpm contrast` fails
the build below 4.5:1 on any pairing in either theme. The measured table lives
in [`docs/contrast.md`](docs/contrast.md).

Performance targets are Lighthouse 90+/95+/95+/95+. That is a design constraint,
not an afterthought — it is why there is no motion library, no icon font, no
component kit, and why every section renders on the server.

---

## Licence

Personal portfolio content and copy © Thien Le. The code is provided as-is.
