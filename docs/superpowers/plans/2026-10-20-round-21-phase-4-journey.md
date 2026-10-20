# Round 21 Phase 4 — The Journey (the live oak) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the Journey with the approved oak board: "The work, as it grew." over a live oak with Spanish moss whose long limb carries the highlight tags (DoorDash as one ticket with a perforated 2026 stub), a Hội An lantern lit at night, rice at the trunk, the bánh mì / trà đá vignette, and "Watch it grow" opening the drawn tree, with the timeline rows staying below until Phase 5.

**Architecture:**
- **Drawings stay files.** `oak()` and its helpers (`cubicD`, `taper`, `twigs`, `moss`), `hoiAn`, `STILL.banhMi`, `STILL.traDa` and the board's limb list are ported verbatim into `scripts/draw-scenery.mjs`, which writes 10 more committed SVGs. The oak is three one-colour masks (bark, leaves, moss), so day ink and night silhouette are one file each, recoloured by aliases. The lantern and the vignette are art files swapped by `--art-lantern` / `--art-journey-vignette`. The Journey reuses the hero's sky file (`--art-sky`, already cached and preloaded). Zero JS for scenery.
- **One layout per width band, same DOM.** From 1280 the stage is the board: tags, lantern, rice and vignette are placed in a 1440×900 frame anchored at `--fx` (centred, or pulled left so the last tag clears the right edge), each string as long as the generator says. Below 1280 it is "the hanging branch": a crop of the crown across the top, then the tags in one column hanging by strings from twigs of a vertical oak branch at the right edge. CSS only; no duplicated tags.
- **No new client code.** `HangingTags` is a server component. The only client file touched is `TreeBox.tsx` (the button's label and look).
- **Content.** `highlights` gains `name`, an optional `measure` and an optional `year`; a sixth highlight (the 2026 stub) and a sixth DoorDash impact line carry the new 2 → 25 figure, so `/resume` and the chat get it too. `buildTickets()` groups consecutive halves of one entry into one ticket. Journey copy goes in a new `journey` export.
- **Timeline rows stay on the Journey** until Phase 5 moves them to the Record. Every `journey-entry-<id>` / `work-<id>` fragment and every retired id keeps resolving on `#tree` throughout.

**Tech Stack:** Next.js 16.3 App Router (server components; `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`), Tailwind v4 `@theme`, CSS masks, vitest + Testing Library, Playwright + axe-core, `scripts/contrast.mjs`, `scripts/perf.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-18-round-21-outdoors-design.md` — §4 Journey; "A little Việt Nam on every page" (the oak's one Hội An lantern, lit at night); the morning/evening vignette table (Journey row); the DoorDash ticket paragraph; "Owner answers" (rows move to the Record); §1 palette and night. **Visual source of truth:** `design/round-21-outdoors/v1/boards/NatJourney.dc.html` / `NatJourneyNight.dc.html`, `previews/NatJourney.png` / `NatJourneyNight.png`, and the `// ---------- journey ----------` block of `design/round-21-outdoors/v1/source/gen-nature.mjs` (`oak`, `limbs`, `yAt`, `items`, `xs`/`drops`/`rots`, `hoiAn`, `HOI_DEFS`, `daily("journey")`, the rice call, `frame()`'s `skyLayer([1180, 110], 2)`). `design/README.md` explains the folder. Phase 3 precedent: `docs/superpowers/plans/2026-10-19-round-21-phase-3-hero.md`.

## Global Constraints

- **Unchanged rules:** pnpm only; strict TS; Tailwind v4 `@theme`; **no new dependency**; components use semantic aliases only (hex lives in `globals.css` tokens and in generated `public/scenery/` files); lowercase hex in CSS; WCAG 2.2 AA; every change checked in day and night; retired anchors stay in the server HTML; `src/lib/` never imports from `src/sections/`; nothing at runtime imports `scripts/`.
- **The tree's rules are unchanged** (CLAUDE.md "The Journey's tree"): authored edges only, `DEMOTED_ENTRY_IDS`, computed concurrency, the timeline owns the fragments, one row open at a time.
- **Copy, verbatim:** heading "The work, as it grew."; button "Watch it grow"; vignette captions "bánh mì on the way" (day) and "trà đá on the corner" (night); ticket: "DoorDash", "17h → 3m", 2025, "3.9% → 0% error", "Reverse engineering scraper"; stub: "2 → 25", 2026, "onboarded merchants/month", "An agent-driven workflow that adapts to every merchant"; tag names "Wordification", "Schaeffler", "USC research", "USC teaching" (board).
- **The italic line ships corrected:** the board's "Every job I've had is a branch and every tool I used is a leaf." is false — 15 technologies of demoted entries (PyTorch, Azure, Redux, …) are leaves nowhere (verified 2026-10-20 against `buildDrawnTree()`). Ship "Every job I've had is a branch, and the tools I used there are its leaves. Each tag holds what I measured there." (Open question 1).
- **Voice:** first person (`docs/voice.md` rules 1, 7); surface vs depth (rule 2): tags show results; impact sentences stay behind the row's click.
- **Controls:** "Watch it grow" is the Journey's one primary control (`Button variant="primary"`, `--control`). No `--mark` on the Journey stage (the lantern's red is in its art file, not the mark).
- **Night:** oak bark is a silhouette (`--scene-bark` → `#070c0d`), leaves `--accent` at the board's 50%, moss `#8c9a86` both themes; tags are lantern paper (`bg-surface`); the lantern glows.
- **Retrieval eval floors:** recall@1 0.70, @3 0.90, @5 0.95, MRR 0.80; baseline 70.0 / 93.3 / 96.7 / 0.807. Never lower a floor or tighten the gate; if a figure moves, fix it on the index surface. The new impact line **is indexed** (specific vocabulary: merchants, onboarded, agent-driven). The `journey` copy is **not** indexed.
- **Perf:** no new client JS; `JS at load` (R21-P3 phone hero: 167,695 B) may move by at most **+1 KB**. `#tree` DOM (baseline 1782 at 1440×900) may grow by at most **+60**; more is a finding.
- **Responsive:** no horizontal page overflow at 320–1440. Board layout ≥ 1280; hanging branch < 1280. `#tree` gets `overflow-x-clip` (not `hidden`: no scroll container).
- **Commands.** Check `node -v` first; every `pnpm`/`node` command below assumes v26.12.0 — if not, prefix it with `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" &&`. Worktree `D:/Project/portfolio/.claude/worktrees/r21-journey` (bash `/d/Project/portfolio/.claude/worktrees/r21-journey`), branch `round-21/journey`. Ports **3200–3209** only; never 3000, never PID 4292; kill by exact PID (`taskkill //PID <pid> //F`). E2E against a production build through an untracked `playwright.r21.config.ts` (spreads `playwright.config.ts`, `use.baseURL` = the port, `webServer: undefined`), `--workers=2`, one isolated retry before believing a failure. Stage files by name; never `git add -A`.
- **Parallel phases:** Contact (`r21-contact`) and Cats (`r21-cats`) run beside this branch and also touch `draw-scenery.mjs`, `scenery.test.ts` and `globals.css`. Journey merges first; later branches re-run `pnpm draw:scenery` after rebasing.
- **Testing:** a false comment, doc or copy line is an Important finding.

## Review Focus

1. **Text running into the crown.** The board's twigs start at y ≈ 195; at 1280 the heading and its lead wrap differently from the board, and a lead that reaches the twigs fails contrast where it crosses bark. *Test: Task 6 `the words clear the crown` (at 1280 and 1440 the lead's bottom ≤ 190 px below `#tree`'s top, and the h2 is one line).*
2. **Focus on a tilted, cut tag.** Each tag is a link wrapping cut-corner paper. The ring must be on the `<a>`, unclipped, visible on the sky in both themes; Tab order heading → tags in board order → "Watch it grow" → the tree box. *Tests: Task 4 `the paper is never the focusable`; Task 6 `focus is visible on every tag and on Watch it grow, in both themes` and `tab order`.*
3. **320 px and the ticket.** "17h → 3m 2025", "onboarded merchants/month" and the Vietnamese captions in a narrow column must neither overflow the page nor clip inside the paper. *Tests: Task 4 `no fixed heights, no nowrap below 1280`; Task 6 `no tag clips its text at 320` plus `e2e/responsive.spec.ts` at all six widths.*
4. **Theme after load, and JS off.** The toggle must swap the lantern (plain ↔ lit), the vignette and its caption at once; JS off with a dark scheme must get the night scene; JS off must not show a "Watch it grow" that does nothing. *Tests: Task 3 `the no-JS night block matches the stamped one` (extended by the new aliases); Task 6 `the toggle swaps the lantern and the vignette in place`, `JS off, dark scheme: the night Journey`, `JS off: no Watch it grow`.*
5. **Arriving by fragment.** The stage is now ~900 px tall at 1440; the hero's "Read this part" links and inbound `journey-entry-*` / retired ids must still open and land their row at the 80 px margin. *Tests: Task 6 `the hero's Read this part lands the DoorDash row`; `e2e/legacy-anchors.spec.ts` unchanged and green.*

---

### Before Task 1: worktree and baselines

- [ ] **Step 1:** `git -C /d/Project/portfolio worktree add .claude/worktrees/r21-journey -b round-21/journey main`, then in the worktree `NPM_CONFIG_PACKAGE_LOCK=true pnpm install --frozen-lockfile`.
- [ ] **Step 2: Eval baseline.** `pnpm exec vitest run tests/lib/answers-retrieval.test.ts --reporter=verbose`. Expected: PASS; the recall@3 test's name prints 70.0 / 93.3 / 96.7 / 0.807.
- [ ] **Step 3: Perf and DOM baseline.** `pnpm build`, then `PORT=3200 pnpm start` in the background (note PID), then `PERF_URL=http://localhost:3200/ pnpm perf`. Expected: 0 skipped; JS at load ≈ 167,695 B. Record per-section DOM counts with Phase 3's throwaway Playwright snippet (`[...document.querySelectorAll("body > *, main > section")].map(el => [el.id || el.tagName.toLowerCase(), el.querySelectorAll("*").length])` at 1440×900 after `networkidle`, script kept untracked in the worktree's `reports/`). Expected `#tree` 1782. Kill the server by PID.

---

### Task 1: The new facts, the tags' words and the ticket grouping

**Files:**
- Modify: `src/types/portfolio.ts` (`Highlight`; new `JourneyCopy`)
- Modify: `src/content/portfolio.ts` (doordash `impact`; `highlights`; new `journey` export after `hero`)
- Modify: `src/lib/highlights.ts`
- Modify: `src/sections/CareerTree/JourneyHighlights.tsx` (key only; deleted in Task 4)
- Test: `tests/lib/highlights.test.ts`, `tests/lib/content.test.ts`, `tests/lib/answers.test.ts`

**Interfaces:**
- `Highlight`: `{ readonly entryId: string; readonly name: string; readonly value: string; readonly label: string; readonly measure?: string; readonly year?: string }`. `name` is the tag's short name (board); `measure` the mono line under the value; `year` only when the figure belongs to a later year than the entry's start. Doc comment rewritten to say so.
- `highlights`, in order:
  1. doordash: name "DoorDash", value "17h → 3m", measure "3.9% → 0% error", label "Reverse engineering scraper"
  2. doordash: name "DoorDash", value "2 → 25", measure "onboarded merchants/month", label "An agent-driven workflow that adapts to every merchant", year "2026"
  3. wordification "Wordification"; 4. schaeffler "Schaeffler"; 5. usc-scraping "USC research"; 6. usc-ta "USC teaching" — values and labels unchanged.
- doordash `impact` gains a sixth line, written by the assistant (**ships only with the owner's approval — Open question 2**): "Built an agent-driven onboarding workflow that adapts to every merchant: onboarded merchants went from 2 to 25 a month."
- `journey` (satisfies `JourneyCopy`): `heading` "The work, as it grew.", `lead` (the corrected line in Global Constraints), `watch` "Watch it grow", `tagsLabel` "What I measured", `vignette: { morning: "bánh mì on the way", evening: "trà đá on the corner" }`.
- `src/lib/highlights.ts`:
  - `ResolvedHighlight` = `Highlight` fields + `year: string` (`h.year ?? entry.sortKey.slice(0, 4)`), `organization`, `href: \`#journey-entry-${string}\``.
  - `export interface Ticket { readonly entryId: string; readonly name: string; readonly href: \`#journey-entry-${string}\`; readonly halves: readonly ResolvedHighlight[] }`
  - `export function buildTickets(entries?: readonly CareerEntry[]): readonly Ticket[]` — consecutive highlights with one `entryId` become one ticket, in order.
- `JourneyHighlights` keys its `<li>` by `` `${h.entryId}-${h.year}` `` so it renders the six until Task 4 replaces it.

- [ ] **Step 1: Write the failing tests.**
  - `highlights.test.ts`:
    - `six highlights in order`: entry ids `["doordash", "doordash", "wordification", "schaeffler", "usc-scraping", "usc-ta"]`; years `["2025", "2026", "2024", "2024", "2022", "2023"]`.
    - extend the trace test to `${h.value} ${h.measure ?? ""} ${h.label}`, with the source's `zero` read as `0%` (`source.replace(/\bzero\b/g, "0%")`, commented: the prose says "failures 3.9% to zero").
    - `an authored year falls inside its entry`: when `year` is set, `year >= entry.sortKey.slice(0, 4)` and `year <= (entry.endSortKey?.slice(0, 4) ?? String(new Date().getFullYear()))`.
    - `the tag name is the entry's own`: the name's first word is a word of `entry.organization`, or the initials of its capitalised words (`"USC"` for "University of South Carolina").
    - `tickets group one entry's halves`: `buildTickets()` → 5 tickets; the first has `name` "DoorDash", `href` `#journey-entry-doordash` and halves with values `["17h → 3m", "2 → 25"]`; the other four have one half; all halves of a ticket share `name`.
    - `labels are at most 8 words` and `href points at the entry row` kept; the JourneyHighlights link count becomes 6.
  - `content.test.ts`: `the 2 → 25 figure is on the record`: doordash `impact` contains "2 to 25" exactly once and `figures(...)` of that line include `"2"` and `"25"`.
  - `answers.test.ts`: `the 2 → 25 line is indexed and cited on the Journey` (a document whose text is that impact line, `sectionId === "tree"`); `the Journey's own copy is not indexed` (no `buildDocuments()` text contains `journey.lead` or either vignette caption).
- [ ] **Step 2:** `pnpm test tests/lib/highlights.test.ts tests/lib/content.test.ts tests/lib/answers.test.ts`. Expected: FAIL on each new case.
- [ ] **Step 3:** Implement the type, the content, `buildTickets` and the key change.
- [ ] **Step 4:** `pnpm test && pnpm typecheck`. Expected: PASS.
- [ ] **Step 5: Eval.** `pnpm exec vitest run tests/lib/answers-retrieval.test.ts --reporter=verbose`. Expected: PASS; record the four figures. If any moved, find the query in the scoreboard (`found below rank 3` / `missed entirely`) and fix on the index surface — the new document's label vocabulary in `answer-corpus.ts` first; never a fixture query, never a floor. If only de-indexing the line restores the baseline, stop and report: that contradicts this plan's decision.
- [ ] **Step 6: Commit:** `Author the 2 → 25 figure and the Journey's tag words`.

### Task 2: The oak, the lantern, the rice and the vignette, drawn into committed SVGs

**Files:**
- Modify: `scripts/draw-scenery.mjs`
- Create: `public/scenery/` — 10 generated files (table)
- Modify: `tests/lib/scenery.test.ts`

**Interfaces:**
- Port verbatim (same seeds, same rounding, colour as a parameter): `cubicD`, `taper`, `twigs`, `moss`, `oak` (split as `oakLayers(limbs, seed, cfg) → { leaves, moss, bark }`: the same draws in the same order, `bark` = the tapered bodies followed by the twig lines), `hoiAn` + `HOI_DEFS` (`night` as a parameter), `STILL.banhMi`, `STILL.traDa`, the journey `limbs`, `yAt`, `xs` `[520, 720, 920, 1120, 1320]`, `drops` `[8, 40, 96, 52, 84]`. Header comment names the Journey too.
- `export function journeySpots(): readonly { x: number; ly: number; top: number }[]` — per tag, `ly = f(yAt(x < 990 ? limbs[4] : limbs[5], x))`, `top = Math.round(ly + drop)` (the board's own arithmetic).
- New phone limb (not on the board; Open question 3), drawn with the same `oakLayers`, seed 13, `{ twig: 34 }`: `[{ p: [[60, 0], [40, 500], [80, 1100], [56, 1700]], w0: 14, w1: 4, twigs: 12, moss: 8 }]`; leaves discarded.
- Files (**ink** = every paint `#000`, opacity attributes kept; **art** = board colours):

  | Stem | Kind | Content | viewBox |
  |---|---|---|---|
  | `oak` | ink | journey oak `bark` (trunk, limbs, twigs) | `0 120 1440 780` |
  | `oak-leaves` | ink | journey oak `leaves`, `fill-opacity="0.5"` kept | `0 120 1440 780` |
  | `oak-moss` | ink | journey oak Spanish moss (`stroke-width="0.9"`) | `0 120 1440 780` |
  | `oak-branch` | ink | phone limb `bark` | `0 0 120 1700` |
  | `oak-branch-moss` | ink | phone limb moss | `0 0 120 1700` |
  | `journey-rice` | ink | `rice(330, 896, 7, 22, 31, _, 26, 22)` | `236 776 320 124` |
  | `lantern-day` | art | twine `M152 512V546` (`#8b7b5e`, 1.2) + `hoiAn(152, 552, "#C8352B", 1)` day | `104 510 96 122` |
  | `lantern-night` | art | twine (`#b3a27f`) + `HOI_DEFS("#C8352B")` + `hoiAn` night (glow + lit gradient) | `104 510 96 122` |
  | `journey-morning` | art | `stool(1240, 826, "#C8352B")` + `STILL.banhMi(1240, 820)` | `1196 780 92 90` |
  | `journey-evening` | art | `stool(1240, 826, "#2E6DB4")` + `STILL.traDa(1232, 824)` | `1196 780 92 90` |

  Captions are HTML (Task 5). The Journey draws no sky file: it reuses `sky-day` / `sky-night`.

- [ ] **Step 1: Write the failing tests** in `scenery.test.ts`: add the ten stems to `VIEWBOXES` and the six ink stems to `INK`; and
  - `the oak's leaves are the one large file`: every file ≤ 40 KB raw except `oak-leaves`, which is ≤ 32 KB gzipped (`zlib.gzipSync`); comment: 2,093 leaves, ~181 KB raw, ~29 KB gzip, served compressed.
  - `the tags hang where the board hangs them`: `journeySpots()` has 5 entries with `x` equal to the board's `xs`, every `top > ly`, and `ly` between 290 and 520.
  - `the lantern is lit only at night`: `lantern-night` contains `url(#hoiLit)` and `url(#hoiGlow)`; `lantern-day` contains neither.
  - `the hero's files are unchanged` is the existing byte-equality test; it must stay green with no hero file re-drawn differently.
- [ ] **Step 2:** `pnpm test tests/lib/scenery.test.ts`. Expected: FAIL (stems missing).
- [ ] **Step 3:** Implement, then `pnpm draw:scenery`. Expected: the 16 hero files print the same byte counts as before; 10 new files.
- [ ] **Step 4:** Re-run the test. Expected: PASS. Open `oak*.svg`, both lanterns and both vignettes in a browser and compare by eye with `NatJourney.png` / `NatJourneyNight.png`; if any piece is cut by its viewBox, widen that viewBox and update the table in the test.
- [ ] **Step 5:** `pnpm typecheck && pnpm lint`. Expected: PASS.
- [ ] **Step 6: Commit:** `Draw the Journey's oak, lantern, rice and vignette into committed SVGs`.

### Task 3: Bark and moss tokens, the Journey's art aliases, the chapter heading size

**Files:**
- Modify: `src/app/globals.css` (first `@theme` block; `:root` scenery aliases; the night block and its `prefers-color-scheme` twin; `--step-chapter`)
- Modify: `src/components/scenery/Drawing.tsx` (`INK_DRAWINGS` + the six ink stems)
- Modify: `src/components/ui/SectionHeading.tsx` (`size` prop)
- Modify: `scripts/contrast.mjs` (the "not measured" line names bark and moss)
- Test: `tests/lib/palette.test.ts`, `tests/ui/Drawing.test.tsx`, `tests/ui/SectionHeading.test.tsx` (create if absent)

**Interfaces:**
- Tokens: `--color-dusk-bark: #070c0d`, `--color-spanish-moss: #8c9a86` (board values).
- Aliases, in `:root` and in the night block **and** its twin: `--scene-bark` (`var(--color-ink)` / `var(--color-dusk-bark)`), `--scene-moss` (`var(--color-spanish-moss)` both), `--art-lantern` (`url(/scenery/lantern-day.svg)` / `…-night.svg`), `--art-journey-vignette` (`url(/scenery/journey-morning.svg)` / `…-evening.svg`).
- `--step-chapter: clamp(2rem, 1.44rem + 2.29vw, 3.5rem)` (32 px at 390, 56 px at 1440, the board's h2).
- `SectionHeading` gains `readonly size?: "section" | "chapter"` (default `"section"`); `"chapter"` sets the h2 to `--step-chapter` and `leading-[1.05]`; nothing else changes.

- [ ] **Step 1: Write the failing tests.**
  - `palette.test.ts`: `bark and moss are the board's` (two tokens); `every theme scope sets the Journey's aliases` (each of the three blocks declares `--scene-bark:`, `--scene-moss:`, `--art-lantern:`, `--art-journey-vignette:`). The existing `the no-JS night block matches the stamped one` must pass with them (Review Focus 4).
  - `Drawing.test.tsx`: `every ink drawing has a committed file` covers the new stems automatically; add `oak-leaves is an ink mask`.
  - `SectionHeading.test.tsx`: `a chapter heading uses the chapter step` (class contains `--step-chapter`); `the default is unchanged` (class contains `--step-3`).
- [ ] **Step 2:** `pnpm test tests/lib/palette.test.ts tests/ui/Drawing.test.tsx tests/ui/SectionHeading.test.tsx`. Expected: FAIL on the new cases.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `pnpm test && pnpm contrast && pnpm typecheck`. Expected: PASS; contrast unchanged at 60 pairings, lowest 4.52:1 (bark and moss never carry text).
- [ ] **Step 5: Commit:** `Add the oak's bark and moss, the lantern and vignette aliases, and a chapter heading size`.

### Task 4: `HangingTags` — the tags, the ticket and its stub, at both widths

**Files:**
- Create: `src/sections/CareerTree/HangingTags.tsx` (server)
- Modify: `src/app/globals.css` (the hanging-branch strings, `@media (width < 80rem)`)
- Delete: `src/sections/CareerTree/JourneyHighlights.tsx` and its cases in `tests/lib/highlights.test.ts` (`the focus outline is not drawn from inside .tone-contrast`, the link count)
- Test: `tests/sections/HangingTags.test.tsx`

**Interfaces:**
- Consumes `buildTickets()` (Task 1), `journeySpots()` (Task 2, test only), `Tag`, `Drawing` (`oak-branch`, `oak-branch-moss`).
- `export const TAG_SPOTS: readonly { readonly left: number; readonly top: number; readonly string: number; readonly tilt: number; readonly width: number }[]` — board frame px. `width` `[210, 176, 176, 176, 176]`; `left = x - width / 2` (the ticket's hole is centred, so it hangs 13 px right of the board's ticket; the board's hole and string disagree there); `string = top + 18 - ly` (limb to the hole's centre); `tilt` `[-2.5, 1.5, -1, 2, -1.5]` deg about the hole (`transform-origin: 50% 18px`). The values are literals, not imports.
- `export default function HangingTags({ className }: { readonly className?: string })`:
  - wrapper `<div data-hanging-tags="">` (`relative` below 1280, `xl:static`), holding, below 1280 only, an `aria-hidden` `no-print` branch: `Drawing oak-branch` (`text-[color:var(--scene-bark)]`) and `Drawing oak-branch-moss` (`text-[color:var(--scene-moss)]`), `absolute top-0 bottom-0 -right-10 w-[120px] [mask-position:top] [mask-size:100%_auto]` (stem 20 px in from the column's right edge; the drawing runs on and is clipped).
  - `<ul role="list" aria-label={journey.tagsLabel}>`, one `<li>` per ticket with `style={{ "--x": \`${left}px\`, "--y": \`${top}px\`, "--string": \`${string}px\`, "--tilt": \`${tilt}deg\`, "--w": \`${width}px\` }}`:
    - **≥ 1280:** `xl:absolute xl:left-[calc(var(--fx)+var(--x))] xl:top-(--y) xl:w-(--w) xl:rotate-(--tilt)`; its string is `xl:after:` a 1.3 px `--twine` line from `-(--string)+18px` to the hole.
    - **< 1280:** one column `ml-auto mr-11 w-[min(100%-44px,340px)]`, `gap-y-10`, tilt kept; `before:` a 3 px `--scene-bark` twig from the hole's x to the stem, 22 px above the tag; `after:` a 1.3 px `--twine` string from the twig down to the hole (globals.css, keyed on `[data-hanging-tags] li`).
    - `<a href={ticket.href} className="block">` wrapping a `Tag` (the clip stays on the paper; the ring on the `<a>`).
    - **One half** (board's tag): value (`font-display font-semibold text-[length:var(--step-4)] leading-none`), then a row with `name` (semibold) and `year` (`font-mono text-[length:var(--step--2)] text-fg-muted`), then `label` (`text-[length:var(--step--1)] text-fg-muted`).
    - **Two halves** (the ticket): `name` once at the top; each half: value + year on one baseline row (`flex flex-wrap justify-between gap-x-2`), `measure` (`font-mono text-[length:var(--step--2)] text-accent`), `label`; between halves an `aria-hidden` perforation: `border-t-[1.5px] border-dashed border-rule` across the paper with two 14 px `bg-(--hole)` notches centred on its ends (the paper's clip cuts them to half-circles).
    - Values render through the moved `Value` helper ("→" is `aria-hidden`, a screen reader hears "to").
  - `whitespace-nowrap` only at `xl:` (the board's), never below.

- [ ] **Step 1: Write the failing tests** (`HangingTags.test.tsx`):
  - `hangs five tags in board order, each a link to its row`: five links; hrefs `["#journey-entry-doordash", "#journey-entry-wordification", "#journey-entry-schaeffler", "#journey-entry-usc-scraping", "#journey-entry-usc-ta"]`; the list is named "What I measured".
  - `DoorDash is one ticket with a 2026 stub`: the first link's text contains, in order, "DoorDash", "17h", "3m", "2025", "3.9%", "0% error", "Reverse engineering scraper", "2", "25", "2026", "onboarded merchants/month", "An agent-driven workflow that adapts to every merchant"; "DoorDash" occurs once in it; it holds one `[aria-hidden="true"]` perforation.
  - `a screen reader hears "to", not an arrow`: every "→" is inside `aria-hidden`, and each is followed by an `sr-only` " to ".
  - `the paper is never the focusable`: no element with class `tag-cut` is an `a`, `button` or has `tabindex`.
  - `no fixed heights, no nowrap below 1280`: no class in the list matches `/(^|\s)h-\[|(^|\s)whitespace-nowrap/` (only `xl:whitespace-nowrap` allowed).
  - `the spots are the generator's`: for each `i`, `TAG_SPOTS[i].top === journeySpots()[i].top` and `TAG_SPOTS[i].string === journeySpots()[i].top + 18 - journeySpots()[i].ly` and `TAG_SPOTS[i].left === journeySpots()[i].x - TAG_SPOTS[i].width / 2`.
  - `the branch is decoration`: every `[data-scenery]` is `aria-hidden="true"`.
- [ ] **Step 2:** `pnpm test tests/sections/HangingTags.test.tsx`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement `HangingTags` and its CSS; delete `JourneyHighlights` and its tests (`CareerTree.tsx` switches to `HangingTags` here so the tree compiles; Task 5 places it).
- [ ] **Step 4:** `pnpm test && pnpm typecheck && pnpm lint`. Expected: PASS except `CareerTree.test.tsx`'s `stacks highlights, …` (its `[aria-label="Highlights"]` selector), fixed in Task 5.
- [ ] **Step 5: Commit:** `Hang the highlight tags and the DoorDash ticket`.

### Task 5: The Journey's stage — heading, oak, lantern, vignette, "Watch it grow"

**Files:**
- Modify: `src/sections/CareerTree/CareerTree.tsx` (rewrite the stage; drop `eyebrow` and `rail` and the rail's computations; the header comment)
- Create: `src/sections/CareerTree/OakScenery.tsx` (server)
- Modify: `src/sections/CareerTree/TreeBox.tsx` (`SeeHowItGrows` → `WatchItGrow`; comments naming "See how it grows", also `OriginStory.tsx:711`, `WatchOrigin.tsx:19`)
- Test: `tests/sections/CareerTree.test.tsx`, `tests/sections/TreeBox.test.tsx`, `tests/lib/companion-facts.test.ts` (comments that cite the rail)

**Interfaces:**
- `<Section id="tree" labelledBy="tree-heading" tone="base" className="relative isolate overflow-x-clip [--fx:min(50%-720px,100%-1424px)]">` — no eyebrow, no rail (Open question 4). `--fx` is the board frame's left edge from 1280: centred, or pulled left so the last tag (board right 1408) stays 16 px inside the viewport. Board y 0 is the section's top edge. Children in order:
  1. the `LEGACY_SECTION_IDS` spans (first, unchanged);
  2. `<OakScenery />`;
  3. `<div data-journey-stage="" className="xl:min-h-[calc(900px-var(--section-y))]">` (static at every width): `<SectionHeading id="tree-heading" size="chapter" lead={<span className="font-serif italic">{journey.lead}</span>}>{journey.heading}</SectionHeading>`; below 1280 the crown band (`aria-hidden`, `xl:hidden`, `mt-6 aspect-[1440/520] w-full relative`, holding the three oak masks at `[mask-size:100%_auto] [mask-position:top]` and the lantern at `left-[7.2%] top-[75%] w-[6.7%] aspect-[96/122]`); `<HangingTags className="mt-6 xl:mt-0" />`; `<WatchItGrow />` (`mt-8`, `xl:absolute xl:top-[790px] xl:left-[max(var(--fx)+40px,var(--gutter))] xl:mt-0`); the vignette group (below);
  4. `TreeBox` + `DrawnTree`, `KnowledgeTreeList`, `CredentialsStrip`, `UnbranchedCaseStudies` — unchanged, in that order.
- `OakScenery()` (server; `aria-hidden="true"` `data-scenery="journey"` `no-print`, `pointer-events-none absolute inset-x-0 top-0 h-[900px] -z-10`):

  | Piece | Element | Paint | ≥ 1280 (frame) | < 1280 |
  |---|---|---|---|---|
  | sky | `span.scene-art` `--art: var(--art-sky)` | — | `left-(--fx) w-[1440px] h-[900px] bg-repeat-x bg-[size:1440px_auto] bg-[position:300px_0]` (the hero's sky with its sun moved to the board's x 1180) | `inset-x-0 h-[900px] bg-[size:1440px_auto] bg-[position:right_-220px_top_-60px]` (sun top right, clear of the heading) |
  | leaves, moss, bark (DOM order) | `Drawing oak-leaves` / `oak-moss` / `oak` | `text-accent` / `--scene-moss` / `--scene-bark` | `left-(--fx) top-[120px] w-[1440px] h-[780px]` | hidden (the band carries them) |
  | lantern | `span.scene-art` `--art: var(--art-lantern)` | — | `left-[calc(var(--fx)+104px)] top-[510px] w-[96px] h-[122px]` | hidden (in the band) |
  | rice | `Drawing journey-rice` | `text-accent` | `left-[calc(var(--fx)+236px)] top-[776px] w-[320px] h-[124px]` | hidden |

- The vignette group (in the stage, `aria-hidden`): `span.scene-art` `--art: var(--art-journey-vignette)` 92×90 plus `<p className="day-only">{journey.vignette.morning}</p><p className="night-only">{journey.vignette.evening}</p>` in `font-serif italic text-[length:var(--step--1)] text-fg-muted`. ≥ 1280: art at frame `(1196, 780)`, caption at `(1186, 870)`; < 1280: in flow after the tags, `mt-8 w-fit` at the left.
- `TreeBox.tsx`: `export function WatchItGrow({ label, className }: { readonly label: string; readonly className?: string })` — `<Button variant="primary" onClick={…dispatch GROW_EVENT…} className={cn("no-print hidden lg:inline-flex [html:not([data-motion])_&]:hidden", className)}>{label}</Button>`; `CareerTree` passes `journey.watch`. The label is a prop because `TreeBox.tsx` is a client module: importing `src/content/portfolio.ts` there would ship the whole content file to the browser. Only at ≥ 1024 (where the box is) and only with JS (no `data-motion` means the script never ran; the finished tree is right below). Behaviour unchanged otherwise.

- [ ] **Step 1: Write the failing tests.**
  - `CareerTree.test.tsx`:
    - `opens with the heading and my line`: `h2#tree-heading` text "The work, as it grew."; the lead is `journey.lead` inside a `font-serif italic` element.
    - `the lead is true`: every `type: "work"` entry is a branch of `buildDrawnTree()`, and every leaf of a drawn branch is one of that entry's own `technologies` (what the corrected line claims).
    - rewrite `stacks …` as `stacks the tags, Watch it grow, drawing, timeline, credentials and the unbranched case studies, in that order` (`[data-hanging-tags]`, the "Watch it grow" button, `[data-origin-host]`, `[data-timeline]`, `[data-credentials-strip]`, `[data-unbranched-case-studies]`).
    - replace `says in the rail how many entries became credentials` with `has no rail and no eyebrow` (no `.rail`, no `.eyebrow-lead` in `#tree`).
    - `the scenery is decoration`: every `[data-scenery]` in `#tree` is or sits inside `aria-hidden="true"`; no `a`, `button` or `[tabindex]` inside `[data-scenery="journey"]`.
    - `the morning by day and the evening at night`: one `.day-only` with `journey.vignette.morning`, one `.night-only` with `journey.vignette.evening`.
    - `the oak holds one lantern per layout`: exactly two `--art: var(--art-lantern)` spans in `#tree`, one inside `[data-scenery="journey"]` (≥ 1280) and one inside the crown band (< 1280), both under `aria-hidden="true"`.
    - keep every other case (retired ids, fragments, rows, third person, subjects) green unchanged.
    - rename the `offers "See how it grows"` case to `offers "Watch it grow" before the box, as the primary control` (class matches the control-fill regex from `e2e/contact.spec.ts`).
  - `TreeBox.test.tsx`: `button()` finds `{ name: "Watch it grow" }`; add `Watch it grow hides without the page script` (class contains `[html:not([data-motion])_&]:hidden`).
- [ ] **Step 2:** `pnpm test tests/sections/CareerTree.test.tsx tests/sections/TreeBox.test.tsx`. Expected: FAIL on the new cases.
- [ ] **Step 3:** Implement `OakScenery`, the stage and `WatchItGrow`; update the comments listed.
- [ ] **Step 4:** `grep -rn "See how it grows\|JourneyHighlights\|What it adds up to\|Started in a kitchen" src tests`. Expected: no hits.
- [ ] **Step 5:** `pnpm verify`. Expected: 5/5; eval as recorded in Task 1.
- [ ] **Step 6: Look at it.** `pnpm dev -p 3202` (background, PID noted). At 1440×900, day and night, scrolled so `#tree`'s top is at 0, compare with `NatJourney.png` / `NatJourneyNight.png`: h2 top ≈ 64, tag tops ≈ the board's (ticket ≈ 466, Wordification ≈ 425), "Watch it grow" ≈ (40, 790), lantern ≈ (152, 552), vignette ≈ (1240, 826), each within ±16 px (the heading's x follows the content column, not the board's 96); every string meets the limb within 3 px. Then 1280, 1024, 768, 390 and 320 in both themes. Kill the server by PID.
- [ ] **Step 7: Commit:** `Grow the Journey from a live oak; Watch it grow opens the tree`.

### Task 6: The e2e suite and the docs follow the new Journey

**Files:**
- Create: `e2e/journey.spec.ts`
- Modify: `e2e/axe.spec.ts:162`, `e2e/companion.spec.ts:3709`, `e2e/origin.spec.ts:65,97` (button name), `e2e/contact.spec.ts:310-324`, `e2e/scale.spec.ts:102-106`, `e2e/print.spec.ts`, `e2e/sections.spec.ts:212-215,407-430` (comments: tags, not cards), `e2e/fragments.spec.ts:17`, `e2e/legacy-anchors.spec.ts:65` (comments)
- Docs: `CLAUDE.md` (the page description's Journey line; "### The hero's scenery" becomes "### The scenery" and names the Journey's files and aliases; the margin-rail rule's mention of the Journey if any), `README.md:9` and the scenery alias table (`--scene-bark`, `--scene-moss`, `--art-lantern`, `--art-journey-vignette`), `docs/editing.md` (a "The Journey's tags" recipe: a highlight's `name`/`measure`/`year`, consecutive halves become one ticket, a figure must be in the entry's headline or impact, `pnpm draw:scenery` after a drawing change), `design/README.md` (the last paragraph: the hero's and the Journey's drawings)

**Interfaces:** consumes everything above.

- [ ] **Step 1: Write the failing e2e** in `e2e/journey.spec.ts` (each test pins its viewport and skips other projects, as `hero.spec.ts` does):
  - `heading, my line and five tags at 1440 and 390`: `#tree h2` text "The work, as it grew."; five links in `[data-hanging-tags]`; the first contains "2 → 25" and "2026".
  - `the words clear the crown` (Review Focus 1): at 1280 and 1440, scrolled so `#tree` top = 0, the h2 is one line (height < 1.4 × its font size) and the lead's bottom ≤ 190.
  - `tags hang from the limb at 1440`: each `li`'s top within 16 px of `TAG_SPOTS[i].top` (section-relative) and its left within 16 px of `(viewport − 1440) / 2 + TAG_SPOTS[i].left`; no two tags' boxes overlap.
  - `the board holds at 1280`: no tag's right edge > 1264; "Watch it grow" overlaps no tag.
  - `below 1280 the tags hang in one column`: at 1024 and 390 the five tags share a right edge (±2 px) and each top > the previous bottom.
  - `no tag clips its text at 320` (Review Focus 3): for each tag paper, `scrollHeight <= clientHeight + 1` and `scrollWidth <= clientWidth + 1`.
  - `tab order`: from the h2, Tab reaches the five tags in board order, then "Watch it grow" (≥ 1024), then the tree box.
  - `focus is visible on every tag and on Watch it grow, in both themes` (Review Focus 2): computed `outline-style` ≠ `none`, `outline-width` ≥ 2 px, the focused element's own `clip-path` is `none`.
  - `a tag opens its row`: click the Schaeffler tag → `#tree-list-branch-schaeffler-trigger` `aria-expanded="true"`, row top within 2 px of 80.
  - `the hero's Read this part lands the DoorDash row` (Review Focus 5): turn the DoorDash chapter tag in `#about`, follow "Read this part" → the doordash row is open and its top within 2 px of 80.
  - `Watch it grow plays the tree`: press it → `[data-tree-box]` in view and the companion's `origin-story` start event fires (as `origin.spec.ts` checks today).
  - `day: unlit lantern and bánh mì; night: lit lantern and trà đá`: the lantern span's computed `background-image` contains `lantern-day.svg` / `lantern-night.svg`; the visible caption is the matching one.
  - `the toggle swaps the lantern and the vignette in place` (Review Focus 4): load day, press the theme toggle, lantern contains `lantern-night.svg` and the evening caption is visible, without a navigation.
  - `JS off, dark scheme: the night Journey`: new context `{ javaScriptEnabled: false, colorScheme: "dark" }`; lantern `lantern-night.svg`; evening caption visible; five tags visible.
  - `JS off: no Watch it grow`: same context, light scheme, at 1440: the button is not visible; the tree box is.
  - `reduced motion: nothing on the stage moves`: `emulateMedia({ reducedMotion: "reduce" })`; after load, `document.querySelector("[data-journey-stage]").getAnimations({ subtree: true })` is empty and no element in it has a computed `transition-duration` above 0.01 ms.
  - Elsewhere:
    - `contact.spec.ts`: rename to `the page's only control fills are Start with where I'm from, Watch it grow and Send`; `toEqual(["Start with where I'm from", "Watch it grow", "Send"])`.
    - `scale.spec.ts`: `section titles are 24–28px` keeps `contact` only; add `the Journey's title is 52–58px at 1440 and 30–34px at 390`.
    - `print.spec.ts`: `the Journey prints its tags, not its oak`: under `emulateMedia({ media: "print" })` every `[data-scenery]` in `#tree` is `display: none`, and the five tag links are visible.
    - `axe.spec.ts`: rename the button; add `Journey stage has zero WCAG violations`, day and night, at 1440 and 390.
- [ ] **Step 2:** `pnpm build`, then `PORT=3203 pnpm start` (background, PID noted), `playwright.r21.config.ts` → `http://localhost:3203`. `pnpm exec playwright test -c playwright.r21.config.ts --workers=2 e2e/journey.spec.ts`. Expected: PASS; a FAIL is a Task 4/5 defect — fix the Journey, not the test.
- [ ] **Step 3:** Apply the other spec edits and the docs, then `pnpm exec playwright test -c playwright.r21.config.ts --workers=2 e2e/journey.spec.ts e2e/sections.spec.ts e2e/origin.spec.ts e2e/legacy-anchors.spec.ts e2e/fragments.spec.ts e2e/responsive.spec.ts e2e/scale.spec.ts e2e/contact.spec.ts e2e/axe.spec.ts e2e/accessibility.spec.ts e2e/print.spec.ts e2e/reveal.spec.ts e2e/interactions.spec.ts e2e/companion.spec.ts e2e/hero.spec.ts`. Expected: 0 failed after one isolated retry each. The companion's tour stop and explorer tests must pass unchanged; if one moves because the Journey is taller, report what was measured — do not loosen a threshold.
- [ ] **Step 4:** `grep -rniE "See how it grows|highlight cards?|What it adds up to|margin rail.*Journey|JourneyHighlights" src e2e tests README.md CLAUDE.md docs/editing.md design/README.md`. Expected: no line that describes the Journey as it was. Fix any false line.
- [ ] **Step 5:** Kill the server by PID. **Commit:** `Point the e2e suite and the docs at the oak`.

### Task 7: Phase 4 close-out

**Files:** `docs/feedback-tracker.md`. `reports/r21-p4-screens/`, `playwright.r21.config.ts` and the DOM script stay untracked.

- [ ] **Step 1:** `pnpm verify`. Expected: 5/5; eval as in Task 1; contrast lowest 4.52:1.
- [ ] **Step 2:** Production build, `PORT=3204 pnpm start` (background, PID noted), full suite `pnpm exec playwright test -c playwright.r21.config.ts --workers=2`. Expected: 0 failed after one isolated retry each. Record passed/skipped counts.
- [ ] **Step 3: Screens.** 1440×900, 1280×800, 1024×768, 390×844 and 320×568, day and night, scrolled to `#tree`, into `reports/r21-p4-screens/`. Put the 1440 pair beside `NatJourney.png` / `NatJourneyNight.png` and list every visible difference; anything beyond this plan's decisions is a finding.
- [ ] **Step 4: Perf.** `PERF_URL=http://localhost:3204/ pnpm perf`, three runs, 0 skipped responses; record CPU load (`Get-CimInstance Win32_Processor`) before and after.
  - `JS at load` against the baseline: expected within +1 KB of 167,695 B; above is a finding — find the module in the build's chunk report before recording.
  - Scenery: the ten new files' raw and gzip bytes (`node -e` with `zlib.gzipSync`), and the over-the-wire bytes and requests the Journey adds in day at perf's viewport (expected: the sky is not fetched twice). Note that "trà đá" pulls Newsreader's `latin-ext` file at night (not in perf's day row).
  - **DOM:** re-run the per-section count. `#tree` before/after (budget 1782 + 60) and every other section's delta; by `tagName` if `#tree` is over budget.
- [ ] **Step 5: Owner gates (before merge).** Owner approval of the new DoorDash impact line (Open question 2) and of the corrected italic line (Open question 1). Until both are answered, the merge waits.
- [ ] **Step 6:** Add `## Round 21 phase 4 (date) — the Journey` to `docs/feedback-tracker.md`: the perf row in R21-P3's prose format with deltas, scenery bytes and requests, the DOM numbers, verify and e2e counts, the eval figures, the owner's answers, and every decision below that changed the board.
- [ ] **Step 7: Commit:** `Record round 21 phase 4`.
- [ ] **Step 8:** Kill the server by PID. Merge `round-21/journey` into `main` and push (pre-approved per phase, after Step 5's gates).
- [ ] **Step 9: Keep the ledger, then remove the worktree.** `cp .superpowers/sdd/2026-10-20-round-21-phase-4-journey/progress.md /d/Project/portfolio/reports/r21-p4-sdd-progress.md` (from the worktree; if the plan folder is named differently, copy that folder's `progress.md`) and confirm the copy exists and is non-empty; **only then** `git -C /d/Project/portfolio worktree remove .claude/worktrees/r21-journey` (`.superpowers/` is gitignored and goes with the worktree; Phase 3's ledger was lost this way).

---

## Decisions this plan makes (and why)

- **The timeline rows stay on the Journey for this phase.** The spec moves them to the Record (§4, owner), but the Record is Phase 5; moving them now would leave `journey-entry-*` / `work-*` and the hero's "Read this part" links with nowhere to land between phases. Phase 5 moves the rows, their fragments and the legacy-anchor spec together.
- **The oak is three masks, not two art files.** Bark, leaves and moss each take one colour per theme, so one file each serves day ink and night silhouette through aliases; two full-colour art files would be ~450 KB raw. The leaves file is the exception to the 40 KB cap (181 KB raw, ~29 KB gzip), pinned by a gzip cap rather than thinned: thinning would redraw the approved tree.
- **The Journey reuses the hero's sky** shifted so its sun sits at the board's x 1180: same file, already preloaded, zero new requests. The stars and seeds are the hero's pattern, not the Journey board's (seed 2).
- **Board ≥ 1280, hanging branch below.** The board's tags span x 415–1408 of 1440; below ~1280 that row cannot fit beside the gutters at a readable size. The frame anchors at `min(50% − 720px, 100% − 1424px)` so 1280–1439 keeps every tag on screen (the trunk moves left; at 1280 the lantern's string is 8 px from the edge and its glow is cut by it). The JourneyHighlights cards are replaced by the tags (same `buildHighlights` data plus the stub).
- **Board deviations:** heading x follows the content column (board 96); the ticket's string meets its centred hole (board: 13 px off); no ground line at y 896 and no drop shadows (the hero has neither); tag names are the board's but every figure and year comes from content; the lead is corrected (Open question 1).
- **No rail, no eyebrow on the Journey** (the board has neither, and a rail track would push the oak's frame). Its counts are derived facts, so nothing is lost; Phase 5 decides whether the Record carries them (Open question 4).
- **"Watch it grow" is a button, hidden without JS** (it only starts the player; with JS off the finished tree is directly below), shown ≥ 1024 only, as today's button.
- **Reduced motion and no-JS need nothing new:** nothing on the stage animates in this phase (the tags' drop is Phase 8), the tags are server-rendered links, the theme swap is CSS, and the tree box keeps its own reduced-motion rule.
- **Not built here:** tags swaying or dropping in (Phase 8), paper grain, the Record's move of the rows (Phase 5).

## Open questions for the owner

1. **The italic line.** The board's "Every job I've had is a branch and every tool I used is a leaf." is not true of the drawing: 15 tools from the nine credentials (PyTorch, Azure, Redux, …) are leaves nowhere. This plan ships "Every job I've had is a branch, and the tools I used there are its leaves. Each tag holds what I measured there." Approve, or give me your line. (Merge gate.)
2. **The new DoorDash impact line** (shows on the timeline row, on `/resume` and in the chat): "Built an agent-driven onboarding workflow that adapts to every merchant: onboarded merchants went from 2 to 25 a month." The figure and the tag's line are yours; this sentence is mine. Approve or rewrite. Also: is this the same work as the feasibility-agent case study (`dd-feasibility-agent`), or separate? (Merge gate.)
3. **Below 1280 there is no Journey board.** This plan hangs the tags in one column from twigs of a vertical oak branch at the right edge, under a crop of the crown with the lantern. The branch is a new drawing in the oak's style. Approve from the screens, or draw a phone board.
4. **The Journey's margin rail** (entries, split, branches, leaves, technologies, heaviest) goes, as on the board. Bring it back on the Record in Phase 5, or let it go?
5. **The heading at 56 px** (the board) where every other section title is 24–28 px. Keep the board's size?
