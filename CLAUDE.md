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
budget (207 KB when the comparison was made, 199.9 KB measured now), a
minimal three.js scene is ~133 KB gz, `@react-three/fiber` + `drei` ~254 KB,
and `globe.gl` ~509 KB. The globe uses no runtime dependency at all: a
hand-written WebGL2 surface (`src/sections/Worlds/gl/`: `context`,
`coastline-texture`, `shaders`, `sphere`) under a Canvas 2D overlay, an
orthographic projector in `src/lib/globe.ts`, and a pre-generated simplified
coastline. The shipped 2D globe is the fallback, and it takes over for good
when there is no WebGL2, a program fails to compile or link, the context is
lost, or `forced-colors` is active. Do not add a library.

**Chapters carry facts; skins carry none.** The globe has six chapters
(`living-earth`, `sea`, `sky`, `plants`, `animals`, `tech`, in
`src/content/worlds.ts`) and five skins (`src/content/skins.ts`, resolved in
`src/lib/skins.ts`). A skin is a look, labelled `no plaque · decoration` in
its own accessible name, and it may never carry a plaque.

`src/sections/Worlds/coastline-data.ts` is fenced: `GlobeCanvas.tsx` is the
only file allowed to import it, and `tests/lib/coastline-data.test.ts` fails if
anything else does. `GlobeCanvas` itself reaches the page only through the
`import()` in `WorldsStage.tsx` — a static import of it from anything
server-rendered pulls the engine *and* the coastlines into the initial bundle.

## Changing what the site says

The page is four sections, in this order: About (`#about` — one layout, no
second band: the hero with the About paragraphs in it, its height a floor
rather than one screen), Worlds (`#worlds`, the globe), the Journey (`#tree`,
the pinned stage) and Contact (`#contact`, which also holds the chat at
`#ask`).
`navItems` in `src/content/portfolio.ts` is the same four items in the same
order; the nav doubles as the page's table of contents.

The retired ids — `#journey`, `#work`, `#skills`, `#workshop`, every
`journey-entry-<id>` and every `work-<projectId>` — are all still in the
server-rendered HTML, and the section and per-entry ones land on the Journey
with JavaScript off (`e2e/legacy-anchors.spec.ts`). Nothing on the page links
to most of them; they exist for inbound links the site does not control, so
"unreferenced" is not a reason to delete one.

There is no résumé section on the page — it is a route, `/resume`, that reads
the same content. Do not reintroduce it as a section: it was almost entirely a
second rendering of the timeline and the case studies.

Everything factual lives in `src/content/portfolio.ts` (the globe's addresses
into it live in `src/content/worlds.ts`); components read from it and never
restate a fact. One career entry feeds the Journey, the résumé, the globe's
plaques and the hero's "Now" rail note at once. Practical recipes — adding a
metric, adding a role, attaching a case study — are in
[docs/editing.md](docs/editing.md).

Round 18 deleted the AI Workflow Lab's content outright:
`src/content/ai-experiments.ts` no longer exists, and neither do
`workflowStages`, `experiments`, `learningLog`, `scrapingPlaybook`, the four
Lab strings, the `experimentsIndexable` adapter, the Workshop section and the
invented `problemSolvingLoop` / `principles` / `philosophyIntro`. Nothing is
"retained pending a home". If a later plan wants any of it back, it comes from
git history and a decision by Thien, not from this file.

One rule from that history is still true and worth keeping: **never index
agent-stage failure-mode strings** (the old `workflowStages[].watchFor`). Round
16 indexed them and shipped a precision hole — three of them were the corpus's
only carriers of the word "file", so "how do I file my taxes" retrieved them.
The fix was to take the strings off the indexed surface, which the retrieval
eval priced at zero, where gating the engine harder instead cost ten points of
recall@3. The strings are gone now, so no test fences them; the lesson is that
text whose vocabulary is generic costs precision everywhere and earns recall
nowhere the eval can see. `aiTools` is `src/content/portfolio.ts` content and
composes the globe's Technology plaque through `computedFact("ai-tools")`.

### The Journey's tree

The tree draws only authored relationships. Each branch is one career entry
(chronological, each exactly once) and its leaves are that entry's own
`technologies` and `impact` fields, verbatim. Do not make it infer edges by
matching skill names against technology strings: the two vocabularies only
overlap 17 of 38 ways, so loose matching invents links and strict matching
claims real skills were never used. `tests/lib/knowledge-tree.test.ts`
enforces this.

- **What is drawn.** The stage draws `buildDrawnTree()`: every career entry
  except the nine in `DEMOTED_ENTRY_IDS` (`src/lib/knowledge-tree.ts`), which
  render as one credentials line instead. Their content is unchanged and still
  indexed; only the limb is gone.
- **No roots.** Nothing is drawn below the ground line. The story starts at the
  crossing — the first act, which is the arrival itself, authored on `origin`
  rather than on any career entry. The root labels, root system and plinth
  that used to sit under the tree (`skillCategories` as labels linking to the
  Skills section) were retired in round 18; skill categories now render on
  `/resume` and in the chat corpus, not on the tree. Do not bring them back as
  roots: no category → entry edge has ever been authored.
- **Concurrency is computed.** A branch's "Ran alongside" line comes from
  `concurrentWith()`, comparing the entries' own `sortKey`/`endSortKey` months
  inclusively, limited to drawn branches by `drawnSiblings()`. `usc-degree`
  contains every role from 2021 to 2025 rather than running beside them, and is
  demoted, so it is never drawn as anyone's sibling. A guessed end month
  creates overlaps by itself — see the comment on `fu-of-kyoto`.
- **Acts are authored.** Which act draws an entry is `ENTRY_ACTS` in
  `src/lib/anchors.ts` — an editorial call about the story, not a computation
  over dates.

### `src/lib/` never imports from `src/sections/`

Through round 17 `src/lib/worlds.ts` imported an anchor helper from a section's
own folder, and deleting that section broke the library at compile time. Round
18 moved everything the library needs — the act ids, the entry → act map and
the act anchors — into `src/lib/anchors.ts`, and nothing under `src/lib/`
imports from `src/sections/` now. Keep it that way: when a library function
needs something a section owns, the thing moves into `lib/`. No lint rule or
test fences this boundary, so grep for `@/sections` under `src/lib/` before
adding an import.

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
