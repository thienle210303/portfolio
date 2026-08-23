# Origin Story Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Career Tree gains an on-demand, lazy-loaded "How it grew" animation (bird → seed → seasons-as-forces → the living tree), an always-on unfinished shoot, a dissolved ground band replacing the boxed plinth, and a properly dense root system.

**Architecture:** One new authored `origin` block; one pure derivation module (`src/lib/origin-story.ts`); always-on SVG/markup changes inside the existing server-rendered tree components; a tiny client button island that lazy-imports the player chunk; the player is an overlay inside `TreeFigure`'s box ending in a re-trigger of the figure's existing ink draw-in.

**Tech Stack:** Next.js 16 / React, TypeScript strict, SVG + CSS (`stroke-dashoffset`, existing `--ease-ink`/duration tokens), vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-22-origin-story-design.md` — read it; its constraint list binds every task.

## Global Constraints

- Node >= 22.12; pnpm only; TypeScript strict; no new dependencies.
- Semantic color aliases only — never a raw `--color-*` token or hex in components.
- No `Date`/`Math.random()` in any render or derivation path — years come from `careerYearSpan()` (sortKeys), variation from the existing `hash01`/`vary` idiom in `DrawnTree.tsx`.
- Exactly ONE geographic fact anywhere in the feature: `origin` (Việt Nam → United States, December 2018). City names appear nowhere else, in no caption.
- Initial page gains no JS beyond the button island inside the existing section chunk; the player is a separate `import()`ed chunk, target < 15 KB gzipped, no images/fonts.
- Reduced motion → static storyboard; no-JS → button never mounts; print unchanged.
- After every task: `pnpm typecheck && pnpm lint` green. `pnpm contrast` must remain byte-identical (no token changes allowed).
- e2e runs on this machine need `--workers=3` (default concurrency crashes the browser — environment note, not fixable here).

---

### Task 1: The facts and the seasons — `origin` block + `src/lib/origin-story.ts`

**Files:**
- Modify: `src/types/portfolio.ts` (add `Origin` interface), `src/content/portfolio.ts` (add `origin` export near `profile`)
- Create: `src/lib/origin-story.ts`
- Test: `tests/lib/origin-story.test.ts`

**Interfaces:**
- Consumes: `careerEntries`, `origin` from `@/content/portfolio`; `careerYearSpan` from `@/lib/knowledge-tree`.
- Produces (Tasks 3–4 rely on these exact names):
  - `interface SeasonForces { readonly learning: number; readonly work: number; readonly milestones: number }`
  - `type SeasonKind = "rain" | "sun" | "storm" | "quiet"`
  - `interface Season { readonly year: number; readonly forces: SeasonForces; readonly kind: SeasonKind; readonly caption: string }`
  - `seasonsFor(): readonly Season[]`
  - `growthStage(year: number): number` (0..1, clamped; 0 at `origin.arrivedYear`, 1 at `careerYearSpan().lastYear`)
  - `CAPTION_MAX_CHARS = 72`

**Content contract for the authored `origin` block (exact values):**

```ts
export const origin = {
  from: "Rạch Giá, Việt Nam",
  to: "United States",
  arrived: "December 2018",
  arrivedYear: 2018,
} as const;
```

**Derivation rules (implement exactly):** one `Season` per year from `origin.arrivedYear` through `careerYearSpan().lastYear` inclusive. `forces` counts career entries whose `sortKey.slice(0,4)` equals the year, per `type` (`learning`/`work`/`milestone`). Kind precedence: milestones > 0 → `"storm"`; else learning > 0 → `"rain"`; else work > 0 → `"sun"`; else `"quiet"`. Captions are authored templates around computed counts — write one template per kind, e.g. storm: `` `${year} — a storm year: ${forces.milestones} hard-won ${forces.milestones === 1 ? "milestone" : "milestones"}` ``; rain: `` `${year} — rain for the roots: education` ``; sun: `` `${year} — steady sun: working growth` ``; quiet: `` `${year} — quiet growth underground` ``. (Refine wording freely at implementation time; keep each ≤ 72 chars with realistic counts, no city names, year always leading.)

- [ ] **Step 1: Write failing tests** — `tests/lib/companion-dialogue.test.ts` shows the house style. Cover: first season year is 2018 and last equals `careerYearSpan().lastYear`; seasons are consecutive years with no gaps; every year's `forces` equal a hand-computed filter of the real `careerEntries` (compute expected counts in the test from the imported content, not hardcoded); kind precedence (find a real storm year — 2024 has milestones — and assert; synthesize precedence with crafted `SeasonForces` via a small exported helper `kindFor(forces: SeasonForces): SeasonKind` so precedence is testable without fake content); every caption ≤ `CAPTION_MAX_CHARS`, starts with its year, and contains no comma-separated place string (assert `not.toMatch(/Rạch|Việt|Taylors|Columbia|Cheraw/)`); `growthStage(2018) === 0`, `growthStage(careerYearSpan().lastYear) === 1`, monotonic, clamped outside the range.
- [ ] **Step 2: Run, verify failure** — `pnpm vitest run tests/lib/origin-story.test.ts` fails (module missing).
- [ ] **Step 3: Implement** — `Origin` type, `origin` block (doc comment: "the only geographic fact the origin story may draw"), the module (pure; export `kindFor` for the precedence test). Follow `src/lib/companion-facts.ts`'s comment voice.
- [ ] **Step 4: Run, verify pass** — the focused file, then `pnpm vitest run` (full).
- [ ] **Step 5: Typecheck, lint, commit** — message: `Plant the origin: one flight authored, every season computed`, ending with the Co-Authored-By line for Claude Fable 5.

---

### Task 2: The living tree and the dissolved ground (always-on)

**Files:**
- Modify: `src/sections/CareerTree/DrawnTree.tsx` (unfinished shoot + root density), `src/sections/CareerTree/KnowledgeTree.tsx` (ground band), possibly the `GroundHatch` component wherever it lives (grep it).
- Test: extend `e2e/sections.spec.ts` career-tree block minimally (see Step 5).

**Interfaces:**
- Consumes: `careerYearSpan` (already imported in the tree path); `hash01`/`vary` in `DrawnTree.tsx`.
- Produces: `[data-tree-shoot]` on the unfinished shoot path group (Task 4's player names it); the ground band keeps `data-cat-nap`.

- [ ] **Step 1: Unfinished shoot.** In `DrawnTree.tsx`'s canopy SVG, add one path rising from the highest branch tip: stroke-width 0.75, `text-fg-subtle` color context, open-ended (no node/leaf terminator), group carrying `data-tree-shoot` and class `tree-draw` so the existing ink draw-in animates it — give it the LAST `--ink-delay` so it is the final line to draw. Beside its tip, an aria-hidden `<text>` annotation in the figure's existing annotation style: `still growing · {lastYear}` (computed, not typed). Deterministic geometry (hash-vary off a stable id).
- [ ] **Step 2: Root density.** In `RootSystem`/`TAPROOT_AND_TEXTURE` territory: fork each category root 2–3 levels (same `vary` idiom as branches; stable ids per fork), add feeder-root texture strokes (width ≤ 0.5, subtle) between mains. `ROOT_H` may rise to ≤ 240. Keep every new path inside the existing color/stroke conventions; nothing interactive changes (root labels keep their positions relative to their root tips — verify `RootLabels.tsx` alignment survives, adjust its anchor math if it reads root tip coordinates).
- [ ] **Step 3: Ground band.** In `KnowledgeTree.tsx`, rework the plinth div: at `lg:` remove `border border-rule bg-surface` and the padding box; compose instead — a full-width hairline (the ground line) that `GroundHatch` ticks hang from, `profile.name` in `font-display` at a small size (`--step-0`/`--step-1`) centred at the trunk's base, `profile.philosophy` as the italic inscription (`text-fg-muted`, centred, `--step--1`), the kinds/technologies eyebrow beneath as today. Below `lg:` keep the same content unboxed with a plain top hairline (`border-t border-rule`, no bg, reduced padding). `data-cat-nap` stays on the band; the mobile trunk-stub span stays.
- [ ] **Step 4: Verify visually** — `pnpm dev`; screenshot day + night at 1440 (headless script or browser tools): shoot visible and open-ended with annotation; roots read dense; ground band boxless with legible name/inscription in both themes. Also 375: list header unboxed and sane.
- [ ] **Step 5: e2e touch-up.** In `e2e/sections.spec.ts` career-tree block add two assertions (desktop-only, existing skip idiom): `#tree [data-tree-shoot]` exists and its annotation text matches `/still growing/`; the ground band no longer has a visible box — assert the band element (locate by `profile.name` text within `#tree`) has `background-color: rgba(0, 0, 0, 0)` at 1440. Run `pnpm exec playwright test e2e/sections.spec.ts --project=chromium-1440 --project=chromium-375 --workers=3`.
- [ ] **Step 6: Gate + commit** — `pnpm typecheck && pnpm lint && pnpm vitest run`; confirm `git diff docs/contrast.md` is empty after `pnpm contrast`. Commit: `Let the tree keep growing, and give the ground back to the drawing`, with the Co-Authored-By line.

---

### Task 3: The player — button island, lazy chunk, beats, storyboard

**Files:**
- Create: `src/sections/CareerTree/WatchOrigin.tsx` (tiny client island: the button + lazy mount), `src/sections/CareerTree/OriginStory.tsx` (the player, default-exported for `next/dynamic`/`import()`)
- Modify: `src/sections/CareerTree/KnowledgeTree.tsx` (mount `WatchOrigin` near the drawing, `hidden lg:block`), `src/app/globals.css` (a small "Origin story" keyframes/classes block inside the existing motion-token conventions)
- Test: unit only where pure (beat sequencing helpers may live in the component file; if any logic grows beyond trivial, lift it into `origin-story.ts` and test there). e2e lands in Task 5.

**Interfaces:**
- Consumes: `seasonsFor`, `growthStage`, `origin`, `Season` (Task 1); `[data-tree-figure]`/`data-inked` contract (globals.css "Career tree figure" block); `[data-tree-shoot]` (Task 2).
- Produces: `document` CustomEvents `origin-story` with `detail: "start" | "end"` (Task 4 listens); `[data-origin-stage]` on the overlay root (Task 5's e2e locates it).

- [ ] **Step 1: `WatchOrigin.tsx`.** A client component rendering one quiet text button ("Watch how it grew", `.ink-link`-style or the rail's eyebrow type, `hidden lg:block` handled by the parent). On press: `const Player = (await import("./OriginStory")).default` via `next/dynamic`-free manual lazy state (useState + import()), render `<Player onClose={...} />`. While loading, the button shows a subtle busy state (`aria-busy`). On player close: unmount, return focus to the button (`ref.focus()`).
- [ ] **Step 2: `OriginStory.tsx` — structure.** Absolutely-positioned overlay filling the nearest `[data-tree-figure]` box (the component renders inside the figure; position with `absolute inset-0` + `bg-ground`, z above the drawing). Container `role="group"` `aria-label="How the tree grew"` `data-origin-stage`; one `role="status"` polite `<p>` for the current caption (real text — the SVG is `aria-hidden`); a "Skip" button (top-right, the HUD's button style). Beat model: `type Beat = { id: string; caption: string; durationMs: number }` — flight (3000), seed (2500), one per season (2000 each, caption from `Season.caption`), reveal (2000), stillGrowing (2500). Auto-advance by `setTimeout` per beat; click on the stage advances immediately (the duet idiom); Escape or Skip → `end()`; an IntersectionObserver on the figure (or a scroll listener checking the figure left the viewport) → `end()`.
- [ ] **Step 3: The drawing.** One SVG, viewBox matching the canopy's aspect: sky band (upper 40%), ground line, silhouette group. Flight: a 4–6 stroke line bird translated along an arc via CSS `offset-path` — if `offset-path` complicates the budget, translate via a CSS keyframe on x/y — with a dashed path drawing behind (`stroke-dashoffset` animation); label text = `` `${origin.from.split(",")[1]?.trim() ?? "Việt Nam"} → ${origin.to} · ${origin.arrived}` `` — actually use the spec's exact label: `Việt Nam → United States · December 2018` composed from `origin` fields (`origin.from` contains the city; render only the country part — split on ", " and take the last segment; test-guard in Task 1 already bans city names in captions, and this label must obey it too). Seed: small arc drop + mound. Season glyphs: sun = 6 radiating strokes; rain = 5 slanted hatch strokes falling; storm = denser hatch + one bent stroke; quiet = bare horizon; year numeral + caption via the status region (mirrored small in the SVG aria-hidden). Silhouette: a simplified trunk + 3–4 limbs whose total path length draws to `growthStage(year)` per season (one path, `stroke-dashoffset` stepped by inline style). All animation via the CSS classes added to globals.css using existing duration/easing tokens; every class under `@media (prefers-reduced-motion: no-preference)`.
- [ ] **Step 4: The reveal.** `end of seasons` beat: fade overlay opacity to 0 over `--dur-settle` while re-triggering the figure's draw-in: `const fig = closest [data-tree-figure]; fig.removeAttribute("data-inked"); requestAnimationFrame(() => fig.setAttribute("data-inked", ""))` — the "Career tree figure" CSS replays (600ms draw). The stillGrowing beat holds the caption "…and still growing." while the real `[data-tree-shoot]` (last `--ink-delay`) finishes. Then `onClose()`. Dispatch `origin-story` `"start"` on mount / `"end"` on every exit path (unmount cleanup included).
- [ ] **Step 5: Storyboard (reduced motion).** If `matchMedia("(prefers-reduced-motion: reduce)")` matches at mount: render, instead of the animated stage, a static vertical storyboard inside the same overlay — captioned frames: flight (bird + path, final state), seed, one frame per distinct `SeasonKind` present (labelled with the years that kind covers, e.g. "Rain years — 2021, 2022, 2023"), and the grown tree note. Each frame is a small static SVG + its caption as real text. Skip/Escape/focus behavior identical.
- [ ] **Step 6: Wire the button** into `KnowledgeTree.tsx` beside the `DrawnTree` mount (`hidden lg:block` wrapper — the drawing presentation only). Confirm SSR stays clean (`WatchOrigin` is an island; the section otherwise server-rendered — no content arrays may be imported by the island; pass nothing but what it needs, which is nothing: the player imports its own data).
- [ ] **Step 7: Verify by hand** — dev server; press the button at 1440: beats run, click-advance works, Skip/Escape restores the figure with its draw-in replaying, focus lands back on the button. Reduced motion (`page.emulateMedia` or OS toggle): storyboard. Check the player chunk size: `pnpm build` then find the chunk in `.next` output listing — record the gzipped size in the report; it must be < 15 KB.
- [ ] **Step 8: Gate + commit** — typecheck, lint, vitest, contrast-unchanged check. Commit: `Stage the flight, weather the years, and hand the ending back to the tree`, with the Co-Authored-By line.

---

### Task 4: The cats come to watch (stretch — cut cleanly if it fights)

**Files:**
- Modify: `src/components/companion/Companion.tsx` only.

**Interfaces:** consumes the `origin-story` CustomEvent (Task 3). No new exports.

- [ ] **Step 1:** In `Companion.tsx`, add a `useEffect` listening on `document` for `origin-story`. On `"start"`, when `roams && roaming` and nothing forced (no escort/tour/nap/open panel): compute two sit spots beside the tree figure (reuse the tour's spot-finding for the `tree` section — `tourStopSpots("tree")` or the equivalent helper), set a ref the loop reads (`watchRef = { until: Infinity, spots }`) that steers `leadWant`/`followWant` there below tour/nap priority but above plain wandering; pose `sit` once arrived; clear on `"end"` (and on any forced state claiming the cats — the same asymmetric drop the scenes use).
- [ ] **Step 2:** Duet integration: on `"end"`, if quiet and the figure section is current, queue one tabby exchange — reuse `sceneFor("encore", "tree", facts)`; no new authored scenes (YAGNI: the tree encore already exists and is exactly about the tree lighting up).
- [ ] **Step 3:** Verify by hand: start the story with cats roaming — they walk over and sit; Skip mid-show — they release; nap/escort during show — the forced state wins. If this task's diff exceeds ~120 lines or destabilises the loop, STOP, revert the task, and report it cut (the spec marks it stretch; the CustomEvent contract stays for a future pass).
- [ ] **Step 4:** Gate + commit — typecheck, lint, vitest; companion e2e at 1440 (`--workers=3`) must stay green. Commit: `Let the cats take a seat for the show`, with the Co-Authored-By line.

---

### Task 5: e2e coverage and the full gate

**Files:**
- Modify: `e2e/sections.spec.ts` (origin-story block) or a new `e2e/origin.spec.ts` (implementer's call; a new file keeps sections.spec.ts from growing — prefer it), `e2e/axe.spec.ts` only if the audit needs a player-open variant.

- [ ] **Step 1: Tests** (desktop project, existing skip idiom; `--workers=3` runs):
  - button visible at 1440 inside `#tree`, absent at 375;
  - press → `[data-origin-stage]` appears; `role="status"` shows the flight caption containing `December 2018` and NOT matching `/Rạch|Taylors|Columbia|Cheraw/`;
  - click the stage → caption changes (beat advanced);
  - Escape → stage gone, figure visible, focus on the button;
  - reduced-motion (`test.use({ contextOptions: { reducedMotion: "reduce" } })` block) → press renders the storyboard: every `Season.caption`'s year present as text, no animation classes required;
  - axe: run the existing axe helper with the player open — zero violations;
  - always-on: `[data-tree-shoot]` + `/still growing/` annotation assertions if Task 2 did not already land them.
- [ ] **Step 2: Full gate** — `pnpm verify`; `pnpm exec playwright test --workers=3` (full matrix). Capture tails.
- [ ] **Step 3: Manual dual-theme pass** — day + night screenshots of: the story mid-season, the reveal, the ground band, the roots. Defer to controller if no browser.
- [ ] **Step 4: Commit** — `Prove the story: captions honest, escape clean, the tree still growing`, with the Co-Authored-By line.

---

## Self-review notes

- Spec coverage: origin block + derivation (T1), shoot/ground/roots (T2), stage/beats/reveal/storyboard/chunk budget (T3), cats (T4 stretch with explicit cut rule), tests/gate (T5). One-geography constraint enforced by T1's caption tests AND T3's label composition AND T5's status assertion.
- Type consistency: `Season`/`seasonsFor`/`growthStage`/`kindFor` names identical across T1 (producer), T3 (consumer), T5 (test text). `[data-origin-stage]`, `[data-tree-shoot]`, `origin-story` event names consistent T2/T3/T4/T5.
- No placeholders: exact values given where they are contracts (origin block, kind precedence, beat durations, budgets); wording explicitly delegated where it is authored copy.
