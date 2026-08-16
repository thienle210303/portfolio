@AGENTS.md

# Thien Le — Portfolio

Single-page Next.js 16 (App Router) portfolio. Full stack rationale and command
reference: [README.md](README.md).

## Non-negotiables

- **pnpm only** — never introduce an npm/yarn lockfile.
- TypeScript is strict; keep it that way.
- Tailwind v4 is configured via `@theme` in CSS — there is no
  `tailwind.config.js`. Don't create one.
- No database, no CMS, no component library. Every component under
  `src/components` and `src/sections` is bespoke — don't reach for a
  dependency to replace one without discussing it first.
- The Contact form falls back from Resend to a `mailto:` flow whenever
  `RESEND_API_KEY` / `CONTACT_TO_EMAIL` / `CONTACT_FROM_EMAIL` aren't all set
  (see `.env.example`). That fallback is intentional, not a bug.
- Targets: **WCAG 2.2 AA** and Lighthouse 90+/95+/95+/95+. These are design
  constraints, not afterthoughts — they're why there's no motion library, no
  icon font, and why sections render on the server by default.

## The design system ("Blueprint")

Two axes, and they must stay independent. Read the theme block in
`src/app/globals.css` before touching colour.

- **Theme** (`day` | `night`) is the visitor's choice, stamped on `<html>` as
  `data-theme` by an inline script before first paint.
- **Tone** (`base` | `deep` | `contrast`) is the author's choice per
  `<Section>`. It repoints the semantic aliases; it does not paint anything
  itself.

Rules that keep that working:

- **Components style against the semantic aliases only** — `text-fg`,
  `text-fg-muted`, `border-rule`, `bg-surface`, `text-accent`, `bg-ground`.
  Never a raw `--color-*` token, never a literal hex. A raw token freezes a
  component into one theme and one tone, which is exactly the bug the alias
  layer exists to prevent.
- **Blue is the only hue**, and it is reserved for annotation, links, measured
  values and the single primary control per screen. It is never decoration.
- **The margin rail carries facts already true in the content layer** —
  counts, dates, sources, computed from the data. It never restates the prose
  beside it, and it never holds a fact that exists nowhere else.
- Changing any palette token means re-running `pnpm contrast`, which
  regenerates `docs/contrast.md` and **fails if any pairing drops below
  4.5:1**. Check tertiary tones against `--color-paper-deep`, not
  `--color-paper` — the half-step-darker ground is where they fail first.

## Changing what the site says

Everything factual lives in `src/content/portfolio.ts` and
`src/content/ai-experiments.ts`; components read from them and never restate a
fact. One career entry feeds the timeline, the résumé, the knowledge tree and
the hero's "Now" line at once. Practical recipes — adding a metric, adding a
role, attaching a case study — are in [docs/editing.md](docs/editing.md).

The knowledge tree draws only authored relationships (`lenses`,
`technologies`). Do not make it infer edges by matching skill names against
technology strings: the two vocabularies only overlap 17 of 38 ways, so loose
matching invents links and strict matching claims real skills were never used.
`tests/lib/knowledge-tree.test.ts` enforces this.

## Before calling anything done

Run `pnpm verify` (typecheck → lint → contrast → test → build). For UI changes,
also run `pnpm dev` and check the change in a real browser **in both themes**,
then run `pnpm test:e2e` (Playwright + axe-core) — it audits both themes and
all three tones, and checks keyboard nav, focus restoration, reduced motion,
and horizontal overflow at 320–1440px.
