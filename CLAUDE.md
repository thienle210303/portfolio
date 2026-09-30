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

### The globe

Every drawn object in `#worlds` is exactly one of two things, and the
distinction is the section's whole reason to exist. A **plaque** comes in two
kinds, and both name their source in the panel. `kind: "field"` is a typed
reference to one field of one authored record, rendered **verbatim** — no
plaque may quote a sub-sentence, and a reference that resolves to nothing is
dropped rather than rendered. `kind: "computed"` renders one named computation
over the content layer (`computedFact()` in `src/lib/worlds.ts`: a count of
branches, a count of seasons, the list of scene names, the list of tool
names); its `source` names the computation rather than a record and a field.
Twelve of the nineteen plaques are quoted fields and seven are computations,
and the rail says so — do not let any prose round that back to "every plaque
is one field, quoted whole". A **decoration** carries no fact at all and is
labelled `no plaque · decoration` in its own accessible name.
`tests/lib/worlds.test.ts` enforces this string-for-string. If a quoted
plaque's text is not `===` a string the content layer produces, fix the
reference or edit the authored field — never relax the assertion to a
substring or a normalised comparison.

**No 3D library, and that was measured, not assumed.** Against the initial-JS
budget (207 KB when the comparison was made, 188.2 KB after the demolition), a
minimal three.js scene is ~133 KB gz, `@react-three/fiber` + `drei` ~254 KB,
and `globe.gl` ~509 KB. The globe uses no runtime dependency at all: an
orthographic projector in `src/lib/globe.ts`, Canvas 2D, and a pre-generated
simplified coastline. Do not add one.

`src/sections/Worlds/coastline-data.ts` is fenced: `GlobeCanvas.tsx` is the
only file allowed to import it, and `tests/lib/coastline-data.test.ts` fails if
anything else does. `GlobeCanvas` itself reaches the page only through the
`import()` in `WorldsStage.tsx` — a static import of it from anything
server-rendered pulls the engine *and* the coastlines into the initial bundle.

## Changing what the site says

There is no résumé section on the page — it is a route, `/resume`, that reads
the same content. Do not reintroduce it as a section: it was almost entirely a
second rendering of the timeline and the case studies.

Everything factual lives in `src/content/portfolio.ts` and
`src/content/ai-experiments.ts`; components read from them and never restate a
fact. One career entry feeds the timeline, the résumé, the knowledge tree and
the hero's "Now" line at once. Practical recipes — adding a metric, adding a
role, attaching a case study — are in [docs/editing.md](docs/editing.md).

Round 16 removed the AI Workflow Lab section, and round 16's second plan
re-homed exactly one of its arrays: `workflowStages` is now rendered by
`#workshop`'s agent lane, and is read by `src/lib/answer-corpus.ts` (so the
chat cites it) and by `src/lib/companion-facts.ts`. `experiments`,
`learningLog` and `scrapingPlaybook` are still retained and still unrendered
— nothing on the page reads them and nothing in the corpus cites them —
pending a future plan that gives them a home. Four strings in that file are
dead in a stronger sense and are a separate question: `labPositioning`,
`labIntro`, `labLiveNotice` and `heroAskCaption` were the removed Lab's own
copy, they describe a section that no longer exists, and they are awaiting
Thien's decision rather than a home. Do not treat "unreferenced" as "dead":
the three content arrays are live content, just without a home yet.

`problemSolvingLoop` and `aiTools` are **not** in that file — both are
`src/content/portfolio.ts` content, and both are rendered. The nine loop steps
are `#workshop`'s stations; `aiTools` composes the globe's Technology plaque
through `computedFact("ai-tools")`.

The same holds one layer up, for code derived from that content rather than
the content itself: `src/lib/answer-sources.ts`'s `experimentsIndexable` has
zero consumers today, and is kept on purpose as the adapter the next plan
re-uses once the Lab's content is re-homed — do not delete it as dead code.



The career tree draws only authored relationships. Since round 12 each
branch is one career entry (chronological, each exactly once) and its leaves
are that entry's own `technologies` and `impact` fields, verbatim. Do not
make it infer edges by matching skill names against technology strings: the
two vocabularies only overlap 17 of 38 ways, so loose matching invents links
and strict matching claims real skills were never used.
`tests/lib/knowledge-tree.test.ts` enforces this. The roots are
`skillCategories` labels linking to the Skills section — label-only, no
drawn category → entry edge, because nobody has authored one.
`buildKnowledgeTree()` (the old lens-grouped shape) survives solely for the
hero's "Where it shows up" list, which wants entries-per-lens — a different
authored fact.

## Before calling anything done

Run `pnpm verify` (typecheck → lint → contrast → test → build). For UI changes,
also run `pnpm dev` and check the change in a real browser **in both themes**,
then run `pnpm test:e2e` (Playwright + axe-core) — it audits both themes and
all three tones, and checks keyboard nav, focus restoration, reduced motion,
and horizontal overflow at 320–1440px.

For any change that touches the globe's chunk — `src/lib/globe.ts`,
`src/sections/Worlds/*`, or anything that might import them — also re-run
`pnpm perf` against a production build and record the row in
[docs/feedback-tracker.md](docs/feedback-tracker.md). Read initial JS first: a
move of more than a kilobyte or two means the engine or the coastline data has
leaked out of the lazy chunk. `pnpm perf` prints a skipped-response count and a
`content-length` cross-check beside its own total; a run reporting any skipped
responses is under-reported and must not be recorded.
