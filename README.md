# Thien Le — Portfolio

A personal portfolio for a software engineer working on automation, developer
experience, performance, and workflows that did not previously exist.

The site is a single narrative page in four sections: **About** — a
code-led hero, with a chat that answers questions about the page grounded only
in what it says, and an About band; **Worlds** — a drawn globe of seven worlds
made entirely of the site's own authored facts; the **Journey** — a career
tree on a pinned stage, told in seven acts from 2018, with the case studies
inside it (in the branches of the roles that produced them, or after the acts
for the coursework); and **Contact**, which
starts from what the visitor actually came to say. The résumé is its own route
at `/resume`, reading the same content, and it is the only place the skills
inventory renders.

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
| Fonts | **next/font** | Fraunces, IBM Plex Sans, IBM Plex Mono, self-hosted, `display: swap` |
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
else. `CareerTree.tsx` (every note counted off the tree it draws) and
`Worlds.tsx` are the reference examples.

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

Requires **Node.js 22.12+** and **pnpm**. (The site itself builds on 20.9+,
but `pnpm test`'s jsdom chain needs 22.12's stable `require(esm)` — one
runtime for everything keeps the pipeline honest.)

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
| `pnpm screenshots` | Captures every section at 320/390/1440 into a tmp dir |
| `pnpm perf` | Measures a running production build: JS/CSS/font bytes, LCP, TBT, CLS, DOM nodes |

`pnpm test:e2e` starts its own dev server. If you already have one running on
port 3000 it will reuse it.

`pnpm perf` does **not** start one — it is deliberately outside `pnpm verify`,
which must stay hermetic. Run `pnpm build`, then `PORT=3100 pnpm start`, then
`pnpm perf` against it. Read its skipped-response count: a run that reports
any is under-reported and the number must not be recorded. The measured table
lives in [`docs/feedback-tracker.md`](docs/feedback-tracker.md).

---

## Where the content lives

**Every fact lives in `src/content/`.** Nothing factual is written inline in
JSX, so a date, employer or metric exists in exactly one place.

| File | Contains |
|---|---|
| `src/content/portfolio.ts` | Profile, the origin (the 2018 crossing the Journey opens on), the companion cats, social links, navigation, hero code tabs, career entries, case studies, résumé lenses, skills, education, certifications, achievements, `aiTools` — the reference whose tool names the globe's Technology plaque is composed from — contact intents and the closing |
| `src/content/worlds.ts` | The seven worlds of the globe — **addresses, not sentences**: each plaque names a record and a field in `portfolio.ts`, and the words are quoted from it verbatim |
| `src/types/portfolio.ts` | The types every one of them is checked against |

Round 18 deleted `src/content/ai-experiments.ts` (the AI Workflow Lab's
experiments, learning log, scraping playbook and agent stages) and
`src/content/workshop.ts` along with the Workshop section. They are in git
history if a later round wants them; nothing on the site reads them.

(`src/content/answer-expansion.ts` sits beside them but holds no facts — it is
checked-in search vocabulary for "Ask this site", not anything the page says.)

`careerEntries` is the canonical source for organisations, roles and dates. Case
studies reference a career entry by `careerEntryId` rather than restating them,
so the Journey, the case studies and the résumé cannot disagree.

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
  // endSortKey: "2028-06", // YYYY-MM once it has ended; omit while it runs
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

Two more decisions the entry cannot make for itself: which of the Journey's
seven acts draws it (add its `id` to `ENTRY_ACTS` in `src/lib/anchors.ts` —
`tests/lib/acts.test.ts` fails until you do), and, once it has ended, its
`endSortKey`, which the Journey compares month by month to say what ran
alongside what. The rail's counts are computed from the data — there is
nothing else to update. [docs/editing.md](docs/editing.md) has the longer
recipe.

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
4. **Turn on Web Analytics and Speed Insights** (Project → Analytics, and
   Project → Speed Insights). The code is already there and inert until you
   do — there is nothing to install and no key to set.

### Analytics

`src/components/layout/SiteAnalytics.tsx` mounts Vercel Web Analytics and
Speed Insights, and it is gated on `VERCEL_ENV === "production"` — set by
Vercel itself, never by hand. Previews and local builds render nothing at all.

That gate is not a preference, it is load-bearing in two places:

- `e2e/accessibility.spec.ts` allows **zero** `console.error` on load, and the
  Playwright suite runs against `pnpm dev`, where `@vercel/analytics` fetches a
  debug script from `va.vercel-scripts.com`. Ungated, an offline or sandboxed
  run would fail that gate for a reason unrelated to the page. A second test in
  that file asserts no analytics request is made outside production, so
  removing the gate fails loudly instead of going quietly flaky.
- Events are counted **per team, not per project** — 50,000/month on Hobby, a
  pageview being one event. Preview traffic is almost entirely your own
  reloads, so counting it would spend the allowance and skew the number.

Both services are cookieless and store nothing personal, which is why there is
no consent banner. The footer carries one plain line saying so, behind the same
`analyticsEnabled()` predicate — so a preview or a local build never claims
measurement that is not happening, and removing the scripts takes the sentence
with them. It costs a gate-off build two DOM nodes fewer (the line and its
divider); see the round 17 stage 4 row in `docs/feedback-tracker.md`.

Because the gate reads `VERCEL_ENV`, a plain `pnpm perf` run measures the
build *without* analytics. To measure the real production page, set it:

```bash
VERCEL_ENV=production pnpm build
```

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
  lib/            pure helpers (cn, highlight, content, the act anchors, …);
                  never imports from sections/
docs/             generated contrast table, editing recipes, feedback tracker
scripts/          contrast measurement, screenshots, `pnpm perf`
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
