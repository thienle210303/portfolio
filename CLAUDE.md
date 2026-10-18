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
- The business card's lead form (name plus an email or phone, no message)
  falls back from Resend to a `mailto:` flow whenever `RESEND_API_KEY` /
  `CONTACT_TO_EMAIL` / `CONTACT_FROM_EMAIL` aren't all set (see
  `.env.example`). That fallback is intentional, not a bug.
- Targets: **WCAG 2.2 AA** and Lighthouse 90+/95+/95+/95+. These are design
  constraints, not afterthoughts — they're why there's no motion library, no
  icon font, and why sections render on the server by default.

## The design system ("The Pass, outdoors")

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
- **Moss-deep is the primary control, red is the single mark, the flag colours
  live only in the flag.** Which alias carries what: `--accent` for links,
  measured values and annotation; `--control` for the one primary control per
  screen; `--mark` for the single mark. Colour is never decoration.
- **The margin rail carries facts already true in the content layer** —
  counts, dates, sources, computed from the data. It never restates the prose
  beside it, and it never holds a fact that exists nowhere else.
- Changing any palette token means re-running `pnpm contrast`, which
  regenerates `docs/contrast.md` and **fails if any pairing drops below
  4.5:1**. Check tertiary tones against `--color-lichen-deep`, not
  `--color-lichen` — the half-step-darker ground is where they fail first.

### The globe

`#worlds` is the origin story: one crossing, three stops. The globe flies the
crossing once on first view ("Replay the flight" replays it), and pressing a
stop in the list beside it turns the globe to that stop's pin. Every word in
that list — each stop's place, date and caption — and the crossing's distance
in the rail come from the content layer through `buildStops()` and
`crossingKm()` in `src/lib/origin-stops.ts`: `origin` (the crossing's two pins,
its places and dates), `eastside-high`'s `headline` (the second caption),
`usc-degree`'s `organization` and `dateRange` (the third stop's place and
date), and `originStops` (the first and third captions and the university's
pin). The distance is printed once, in the rail. To change what a stop
says, edit the field; nothing in `src/sections/Worlds/` types a fact.

**No 3D library, and that was measured, not assumed.** Against the initial-JS
budget (207 KB when the comparison was made, 199.5 KB after round 18 Plan C), a
minimal three.js scene is ~133 KB gz, `@react-three/fiber` + `drei` ~254 KB,
and `globe.gl` ~509 KB. The globe uses no runtime dependency at all: a
hand-written WebGL2 surface (`src/sections/Worlds/gl/`: `context`, `robot`,
`shaders`, `sphere`) under a Canvas 2D overlay, an orthographic projector in
`src/lib/globe.ts`, and a pre-generated simplified coastline. The surface's
coverage texture is a PNG baked ahead of time by `gl/coastline-texture`
(`scripts/bake-coastline.ts`); nothing at runtime imports the baker. The shipped
2D globe is the fallback, and it takes over for good when there is no WebGL2, a
program fails to compile or link, the context is lost, `forced-colors` is
active, or the coverage PNG fails to load or decode. Do not add a library.

`src/sections/Worlds/coastline-data.ts` is fenced: `GlobeCanvas.tsx` is the
only file under `src/` allowed to import it, and
`tests/lib/coastline-data.test.ts` fails if anything else there does. The GL
surface does not rasterise it at runtime: it decodes
`public/globe/coastline.png`, which `pnpm bake:coastline` bakes from it, and
`tests/lib/coastline-png.test.ts` fails until the committed PNG matches a fresh
bake. `GlobeCanvas` itself reaches the page only through the `import()` in
`WorldsStage.tsx` — a static import of it from anything server-rendered pulls
the engine *and* the coastlines into the initial bundle.

## Changing what the site says

The page is four sections, in this order: About (`#about` — the hero: a short
identity column beside a terminal card built from content, no rail, no height
floor: it is as tall as its content), Worlds (`#worlds`, the globe), the Journey (`#tree`: highlight cards, the
drawn tree at >=1024px, then a one-open timeline of rows) and Contact
(`#contact`: the chat at `#ask` on the left, and a business card on the right
that flips to the lead form).
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

Copy rules (first person, surface vs depth, headlines) live in
[docs/voice.md](docs/voice.md).

Everything factual lives in `src/content/portfolio.ts`; components read from
it and never restate a fact. One career entry feeds the Journey, the résumé
and the chat at once. Practical recipes — adding a
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
nowhere the eval can see. `aiTools` is `src/content/portfolio.ts` content; the
hero's terminal reads it.

### The Journey's tree

The tree draws only authored relationships. Each branch is one career entry
(chronological, each exactly once) and its leaves are that entry's own
`technologies`, verbatim. Its `impact` lines render verbatim in that entry's
timeline row, not as leaves; its `headline` is shown with the branch and the
row at rest, and the branch's label links to the row. Do not make it infer edges by
matching skill names against technology strings: the two vocabularies only
overlap 17 of 38 ways, so loose matching invents links and strict matching
claims real skills were never used. `tests/lib/knowledge-tree.test.ts`
enforces this.

- **What is drawn.** The Journey draws `buildDrawnTree()`: every career entry
  except the nine in `DEMOTED_ENTRY_IDS` (`src/lib/knowledge-tree.ts`), which
  render as one credentials line instead. Their content is unchanged and still
  indexed; only the limb is gone.
- **No roots.** Nothing is drawn below the ground line. The root labels, root
  system and plinth
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
- **The timeline owns the fragments.** Each drawn entry's row carries
  `journey-entry-<id>` and its case studies' `work-<projectId>`; a demoted
  entry's credentials line carries its `journey-entry-<id>`. One row is open at
  a time; a fragment opens its row, and with JavaScript off `:target` does.

### `src/lib/` never imports from `src/sections/`

Through round 17 `src/lib/worlds.ts` imported an anchor helper from a section's
own folder, and deleting that section broke the library at compile time. Round
18 moved what the library needed into `lib/` (round 20 then deleted it with the
acts), and nothing under `src/lib/` imports from `src/sections/` now. Keep it
that way: when a library function needs something a section owns, the thing
moves into `lib/`. No lint rule or test fences this boundary, so grep for
`@/sections` under `src/lib/` before adding an import.

## Before calling anything done

Run `pnpm verify` (typecheck → lint → contrast → test → build). For UI changes,
also run `pnpm dev` and check the change in a real browser **in both themes**,
then run `pnpm test:e2e` (Playwright + axe-core) — it audits both themes and
all three tones, and checks keyboard nav, focus restoration, reduced motion,
and horizontal overflow at 320–1440px.

For any change that touches the globe's chunk — `src/lib/globe.ts`,
`src/sections/Worlds/*`, or anything that might import them — also re-run
`pnpm perf` against a production build and record the row in
[docs/feedback-tracker.md](docs/feedback-tracker.md). Read the `JS at
load` column first: the globe chunk only loads after `load`, so the engine or
the coastline data leaking into the initial bundle shows there, and a move of
more than a kilobyte or two means it has. The 8 s `JS` total is no longer the primary
leak detector (a jump against its new baseline still means something moved): since R20-P3 the hero is short enough that, at perf's 412×823
viewport, the globe stage is inside the post-`load` prefetch's one-screen margin,
so the total includes the globe chunk (about +25 KB, a new baseline). `pnpm perf` prints a skipped-response count and a
`content-length` cross-check beside its own total; a run reporting any skipped
responses is under-reported and must not be recorded.
