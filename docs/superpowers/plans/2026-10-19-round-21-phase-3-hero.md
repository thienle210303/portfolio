# Round 21 Phase 3 — The Hero (the clothesline) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the identity-plus-terminal hero with the approved clothesline board: a twine line from a bamboo pole to a pine, four chapter tags that turn over, my field tag with the LinkedIn QR and the "PRACTICE MAKES AI." stamp, the headline "Just a curious kid, and this is my youth.", and a morning/evening field (sun or moon, rice, buffalo, nón lá, cà phê phin or lẩu, Moon off duty) that swaps with the theme without JavaScript.

**Architecture:**
- **Drawings are files, not runtime code.** The canvas generator's drawing functions are ported, unchanged in output, into `scripts/draw-scenery.mjs` (seeded RNG, no dependency). `pnpm draw:scenery` writes 14 committed SVGs to `public/scenery/`; a unit test fails until the committed files equal a fresh draw. Nothing at runtime imports the script.
- **Painting.** One-colour line drawings are CSS masks painted with a semantic alias (`.scene-ink`: `background-color: currentColor` + `mask: var(--art)`), so they recolour by theme for free. Fixed multi-colour pieces (nón lá) are CSS backgrounds (`.scene-art`). Pieces that differ by theme (the sky, the stool vignette) take their `url()` from a theme alias (`--art-sky`, `--art-vignette`), so only the active theme's file is fetched, and the no-JS `prefers-color-scheme` twin works because it is the same custom-property block. Zero SVG nodes in the DOM for scenery, zero JS.
- **One client component.** `ChapterTags` (`"use client"`) owns which tag is open. Everything else — `Hero`, `Scenery`, `FieldTag`, `LinkedInQr`, `Tag`, `Drawing` — is a server component.
- **Content.** Every fact comes from `src/content/portfolio.ts` through `src/lib/hero.ts` (`buildChapters()`, `buildFieldTag()`); the authored lines the board adds go into a new `hero` export there.
- **Retired:** the terminal card (`HeroTerminal`, `TypeOnce`, `src/lib/terminal.ts` and their tests), the hero eyebrow, the "Scroll" row and `.blueprint-grid`.

**Tech Stack:** Next.js 16.3 App Router (server components; one `"use client"` boundary, per `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`), Tailwind v4 `@theme`, CSS masks, vitest + Testing Library, Playwright + axe-core, `scripts/contrast.mjs`, `scripts/perf.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-18-round-21-outdoors-design.md` — §3 Hero; "Day is a morning field" (§1); the night palette in `docs/superpowers/plans/2026-10-18-round-21-phase-1-2-foundation.md` Global Constraints ("moonlit field"); "A little Việt Nam on every page"; the morning/evening vignette table (Hero row); §7 "Only the live cats are cats". **Visual source of truth:** the hero block of the canvas generator `gen-nature.mjs` (session scratchpad; functions `rice`, `pine`, `palmetto`, the hero's `bamboo`, `nonLa`, `buffalo`, `cat`, `stool`, `STILL.phin`, `STILL.lau`, `skyLayer`, `ripples`, `TAG_CLIP`, `hole`, `QR_PATHS`) and its renders `preview/NatHero.png` / `NatHeroNight.png`. Copy `gen-nature.mjs` and `qr.svg` into the worktree's untracked `reports/r21-p3-source/` before Task 1 so implementers can read them.

## Global Constraints

- **Unchanged rules:** pnpm only; strict TS; Tailwind v4 `@theme` (no config file); **no new dependency** (runtime or dev); no QR encoder or decoder ships; no `next/image` in the hero (it would add client JS); components use semantic aliases only — never a raw `--color-*` token, never a literal hex (hex lives only in `globals.css` tokens and in the generated files under `public/scenery/`); lowercase hex in CSS; WCAG 2.2 AA; every change checked in day and night; retired anchors stay in the server HTML.
- **Copy, verbatim (spec §3):** headline "Just a curious kid, and this is my youth."; primary button "Start with where I'm from" → `#tree`; quiet button "Book a call with me" → `BOOKING_URL`, else `#contact`; "Read this part"; field tag status "Still growing"; stamp from `profile.motto`, upper-cased by CSS only.
- **Body:** "Body as today" — `profile.positioning`, unchanged. The board's extra sentence "Come in, I'll show you around." is **not** shipped (Open question 4).
- **Voice:** first person everywhere (`docs/voice.md` rules 1 and 7). Rule 4's "no adjectives about the person" governs record headlines; the hero `<h1>` is the owner's own line from the spec.
- **One mark per screen:** the stamp is the hero's red (`--mark`). An open tag is not painted red. **One primary control:** "Start with where I'm from" (`--control`).
- **Night:** sky ground with silhouettes and moonlit lines; tags and the field tag are lantern paper (`bg-surface`, whose night scope already repoints the text aliases to dark ink).
- **Contrast:** every text pairing ≥ 4.5:1 via `pnpm contrast` (sky stops included since Phase 1). No hero text sits under `opacity < 1`.
- **Retired anchors (Phase 2 ledger, "Phase 3 must keep"):** `ABOUT_LEGACY_SECTION_IDS` spans stay the **first children** of `#about`, `aria-hidden="true"`, `sr-only scroll-mt-20`. Do **not** add a "`#tree` is not in the viewport" assertion anywhere.
- **`src/lib/` never imports from `src/sections/`.** `buildChapters()` returns entry ids; the section turns them into hrefs with `journeyEntryAnchorId()`.
- **Retrieval eval floors:** recall@1 0.70, @3 0.90, @5 0.95, MRR 0.80; baseline 70.0 / 93.3 / 96.7 / 0.807. Never lower a floor or tighten the gate. The hero's new authored lines are **not indexed** (generic vocabulary costs precision; see CLAUDE.md's `watchFor` lesson).
- **Perf:** no JS for scenery; `ChapterTags` is the only new client code. `JS at load` (R21-P2: 166,832 B) may move by at most +3 KB; more is a finding.
- **Responsive:** no horizontal page overflow at 320–1440. Below 1024 px the chapter tags are a **2×2 grid** (not a scroll row: a scrollable region would need its own focus stop and fights the overflow test). Bamboo, nón lá, pine and ripples render at ≥ 1280 px only (below that they collide with the content column; Open question 6).
- **Commands.** Worktree `D:/Project/portfolio/.claude/worktrees/r21-hero` (bash: `/d/Project/portfolio/.claude/worktrees/r21-hero`), branch `round-21/hero`. The machine default is Node 20, so **every** `pnpm`/`node` command in this plan is written with the prefix `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" &&`. Ports 3180–3189 only; never 3000, never PID 4292; kill by exact PID (`taskkill //PID <pid> //F`). E2E runs against a production build through an untracked `playwright.r21.config.ts` (spreads `playwright.config.ts`, sets `use.baseURL` to the port, `webServer: undefined`), `--workers=2`, one isolated retry before believing a failure. Stage files by name; never `git add -A` (the main checkout has untracked logs and `reports/`).
- **Testing:** a false comment, doc or copy line is an Important finding.

## Review Focus

1. **Focus on a turned tag.** After Enter on a tag, focus must land on something visible on the back face, and coming back it must land on the front again — never on an `inert` or rotated-away face, and the focus ring must not be clipped by the tag's cut corners. *Tests: Task 4 `focus follows the turn`; Task 7 `focus is visible on every tag, the QR link and both actions, in both themes`.*
2. **Scenery stealing the pointer.** Absolute layers (rice band, buffalo, vignette, sky) overlap the actions at some widths. A click on "Book a call with me" or on a tag must reach it. *Test: Task 7 `nothing in the scenery sits on top of a control` (`elementFromPoint` at each control's centre, at 1024, 1280 and 1440).*
3. **No-JS night.** A visitor with JS off and `prefers-color-scheme: dark` must get the moon, stars, fireflies, the lẩu and the night captions, not the day scene on a night sky. *Tests: Task 2 `the no-JS night block matches the stamped one` (extended automatically by the new aliases); Task 7 `JS off, dark scheme: the night scene`.*
4. **Theme toggled after load.** Pressing the theme toggle must swap sun ↔ moon and phin ↔ lẩu at once, with no reload. *Test: Task 7 `the toggle swaps the scene in place`.*
5. **320 px.** Two tag columns at ~136 px each, Vietnamese place names, a wrapped back-face line, and the mono field tag rows must neither overflow the page nor clip inside a tag. *Tests: Task 4 `the back face grows to fit its line` (no fixed height); Task 7 runs `e2e/responsive.spec.ts` at all six widths plus `no tag clips its text at 320`.*

---

### Before Task 1: worktree and baselines

- [ ] **Step 1:** `git -C /d/Project/portfolio worktree add .claude/worktrees/r21-hero -b round-21/hero main`, then in the worktree `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" && NPM_CONFIG_PACKAGE_LOCK=true pnpm install --frozen-lockfile`. Copy `gen-nature.mjs`, `qr.svg` and the two `preview/NatHero*.png` boards into `reports/r21-p3-source/` (untracked).
- [ ] **Step 2: Eval baseline.** `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" && pnpm test tests/lib/answers-retrieval.test.ts`. Expected: PASS; record 70.0 / 93.3 / 96.7 / 0.807.
- [ ] **Step 3: Perf and DOM baseline (main, before any change).** `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" && pnpm build`, then start `PORT=3180 pnpm start` in the background (same prefix), note its PID, then `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" && PERF_URL=http://localhost:3180/ pnpm perf`. Expected: 0 skipped; JS at load ≈ 166,832 B, DOM ≈ 2097. Then record per-section DOM counts with a throwaway Playwright script in `reports/` evaluating `[...document.querySelectorAll("body > *, main > section")].map(el => [el.id || el.tagName.toLowerCase(), el.querySelectorAll("*").length])` at 1440×900 after `networkidle`. Kill the server by PID. These numbers are the Phase 2 "+44 DOM nodes" investigation's "before".

---

### Task 1: The scenery, drawn once into committed SVGs

**Files:**
- Create: `scripts/draw-scenery.mjs`
- Create: `public/scenery/*.svg` (14 files, generated)
- Create: `tests/lib/scenery.test.ts`
- Modify: `package.json` (`"draw:scenery": "node scripts/draw-scenery.mjs"`)

**Interfaces:**
- Produces `export function drawScenery(): Record<string, string>` (file stem → SVG text) in `scripts/draw-scenery.mjs`. Run directly, the module writes every entry to `public/scenery/<stem>.svg` (main guard: `import.meta.url === pathToFileURL(process.argv[1]).href`) and prints each file's byte count.
- Port `rng`, `f`, `cubic`, `rice`, `pine`, `palmetto`, `ripples`, `buffalo`, `nonLa`, `stool`, `STILL.phin`, `STILL.lau`, the hero's `bamboo` IIFE, the DoorDash laptop art and both branches of `skyLayer` **verbatim** (same seeds, same rounding), parameterised only by colour. Each file is the drawing in board coordinates with its own `viewBox` (the crop below), `xmlns`, no width/height.
- Files. **ink** = one-colour mask, every paint `#000` (bamboo leaf fill keeps its alpha as `fill-opacity="0.18"`); **art** = the board's own colours, verbatim.

  | Stem | Kind | Board call | viewBox |
  |---|---|---|---|
  | `bamboo` | ink | hero `bamboo` | `0 110 170 790` |
  | `pine` | ink | `translate(1356 900) scale(2.7)` `pine(0,0,300)` | `1260 80 180 820` |
  | `rice-field` | ink | `rice(640, 890, 15, 34, 11, _, 70, 70)` | `600 740 620 160` |
  | `ripples` | ink | `ripples(560, 872, 640, 3, _, 3)` | `560 860 660 30` |
  | `buffalo` | ink | `buffalo(930, 790, 0.78, _)` | `905 790 150 80` |
  | `tag-rice` | ink | `rice(52, 84, 3, 20, 4, _, 44, 26)` | `0 0 150 88` |
  | `tag-pine` | ink | `pine(75, 84, 76, _)` | `0 0 150 88` |
  | `tag-palmetto` | ink | `palmetto(75, 84, 48, _)` | `0 0 150 88` |
  | `tag-laptop` | ink | the DoorDash `rect`/`path` art | `0 0 150 88` |
  | `non-la` | art | `nonLa(104, 444, 0.9)` + the strap twine `M80 372Q96 380 102 396` in `#8b7b5e` | `44 370 120 130` |
  | `sky-day` | art | day `skyLayer([880, 120], 1)` | `0 0 1440 900` |
  | `sky-night` | art | night `skyLayer([880, 120], 1)` | `0 0 1440 900` |
  | `morning` | art | `stool(470, 840, "#C8352B")` + `STILL.phin(470, 838)` | `420 750 100 134` |
  | `evening` | art | `stool(470, 840, "#2E6DB4")` + `STILL.lau(470, 838)` | `420 750 100 134` |

  Captions are **not** in the files (an SVG used as an image cannot load Newsreader); they are HTML in Task 6.

- [ ] **Step 1: Write the failing test** `tests/lib/scenery.test.ts` (imports `drawScenery` from `../../scripts/draw-scenery.mjs`):
  - `the committed scenery is exactly today's draw`: for every `[stem, svg]`, `readFileSync(\`public/scenery/${stem}.svg\`, "utf8") === svg`; and `readdirSync("public/scenery").sort()` equals the stems + `.svg`, sorted (no stale file).
  - `each file has its pinned viewBox`: the table above, as a literal map.
  - `ink files paint in one colour`: every `stroke="…"` / `fill="…"` value in an ink file is `#000` or `none`.
  - `the draw is deterministic`: two calls return deep-equal objects.
  - `no file can run or fetch anything`: no file matches `/<script|href=|xlink:|@import|url\(http/i`.
  - `no file is over 40 KB`.
- [ ] **Step 2:** `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" && pnpm test tests/lib/scenery.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement `scripts/draw-scenery.mjs` and the `draw:scenery` script, then `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" && pnpm draw:scenery`. Header comment: what it draws, that the canvas board is the source, and that the test fails until the files are re-drawn and committed.
- [ ] **Step 4:** Re-run the test. Expected: PASS. Open `sky-day.svg`, `sky-night.svg`, `morning.svg`, `evening.svg` and `non-la.svg` in a browser tab and compare by eye with `NatHero.png` / `NatHeroNight.png`.
- [ ] **Step 5:** `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" && pnpm typecheck && pnpm lint`. Expected: PASS (if lint or `tsc` reaches the `.mjs`, fix the finding; do not exclude the file).
- [ ] **Step 6: Commit:** `git add scripts/draw-scenery.mjs public/scenery package.json tests/lib/scenery.test.ts` → `Draw the hero's scenery once into committed SVGs`.

### Task 2: Scene tokens, aliases and paint utilities; the header on the sky; `.blueprint-grid` retired

**Files:**
- Modify: `src/app/globals.css` (first `@theme` block; `:root` alias block; `:root[data-theme="night"]` block and its `prefers-color-scheme` twin; `@layer components`; the `.blueprint-grid` rule, its reduced-transparency rule and every comment naming it)
- Modify: `src/app/layout.tsx:167` (drop `blueprint-grid` from `<body>`)
- Modify: `src/components/layout/SiteHeader.tsx:21` (`bg-ground` → `sky-fill`)
- Modify: comments in `src/components/layout/ThemeToggle.tsx:23`, `src/components/ui/Section.tsx:96`
- Create: `src/components/scenery/Drawing.tsx`
- Test: `tests/lib/palette.test.ts`, `tests/ui/SiteHeader.test.tsx`, `tests/ui/Drawing.test.tsx`

**Interfaces:**
- Raw tokens (lowercase): `--color-twine` `#8b7b5e`, `--color-dusk-twine` `#b3a27f` (spec); `--color-gold` `#d4a21a` (the field tag's star, both themes; **not** the flag yellow); `--color-water` `#9fb3ae` / `--color-dusk-water` `#3f5a5a`; `--color-buffalo` `#3b433e` / `--color-dusk-buffalo` `#0a1012` (board values).
- Aliases, set in `:root` (day) and in the night block **and** its twin: `--twine`, `--gold`, `--scene-water`, `--scene-buffalo`, `--art-sky` (`url(/scenery/sky-day.svg)` / `url(/scenery/sky-night.svg)`), `--art-vignette` (`url(/scenery/morning.svg)` / `url(/scenery/evening.svg)`), `--show-day` (`block` / `none`), `--show-night` (`none` / `block`). Components read them as `[color:var(--twine)]` etc.; they are not registered as Tailwind colours (the raw names would collide).
- Utilities in `@layer components`:
  - `.scene-ink { background-color: currentColor; mask: var(--art) no-repeat center / contain; pointer-events: none; }`
  - `.scene-art { background: var(--art) no-repeat center / contain; pointer-events: none; }`
  - `.day-only { display: var(--show-day); } .night-only { display: var(--show-night); }`
  - `.sky-fill`: shares the existing `:root body` sky declarations (`background-image: var(--sky); background-size: 100% 100%; background-attachment: fixed`) through one selector list, so the sticky header paints exactly the pixels of the sky behind it (Phase 1 deferred "tint band under the header"). The cats' `--ground` fills stay as they are: Phase 7 redraws the cats.
  - `--step-5` becomes `clamp(2.5rem, 1.6rem + 3.4vw, 4.375rem)` (40 px at 390, 70 px at 1440, the board's size; Open question 8), with its comment rewritten.
- `Drawing.tsx` (server-safe, no hooks):
  - `export const INK_DRAWINGS = ["bamboo", "pine", "rice-field", "ripples", "buffalo", "tag-rice", "tag-pine", "tag-palmetto", "tag-laptop"] as const;` `export type InkDrawing = (typeof INK_DRAWINGS)[number];`
  - `export function Drawing({ name, className }: { readonly name: InkDrawing | "non-la"; readonly className?: string }): JSX.Element` → `<span aria-hidden="true" data-scenery={name} className={cn(name === "non-la" ? "scene-art" : "scene-ink", "block", className)} style={{ "--art": \`url(/scenery/${name}.svg)\` }} />`. Colour comes from the caller's `text-*` class.

- [ ] **Step 1: Write the failing tests.**
  - `palette.test.ts`: `scene tokens are the board's` (each raw token above with its value); `every theme scope sets the scene aliases` (`:root` alias block and the night block each declare `--twine:`, `--gold:`, `--scene-water:`, `--scene-buffalo:`, `--art-sky:`, `--art-vignette:`, `--show-day:`, `--show-night:`); `blueprint-grid is gone` (no `blueprint-grid` in `globals.css` or `layout.tsx`); `the header shares the body's sky` (one rule whose selector list contains both `:root body` and `.sky-fill`). The existing `the no-JS night block matches the stamped one` must still pass with the new aliases — that is Review Focus 3.
  - `SiteHeader.test.tsx`: the `<header>` class list contains `sky-fill` and not `bg-ground`.
  - `Drawing.test.tsx`: `renders an aria-hidden ink mask` (`data-scenery="tag-rice"`, class `scene-ink`, style `--art: url(/scenery/tag-rice.svg)`); `non-la is art, not ink`; `every ink drawing has a committed file` (`existsSync(\`public/scenery/${n}.svg\`)` for each of `INK_DRAWINGS`).
- [ ] **Step 2:** `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" && pnpm test tests/lib/palette.test.ts tests/ui/SiteHeader.test.tsx tests/ui/Drawing.test.tsx`. Expected: FAIL on each new assertion.
- [ ] **Step 3:** Implement. Rewrite the sky comment in `globals.css` (it says the hero's `.blueprint-grid` still draws over the sky).
- [ ] **Step 4:** `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" && pnpm test && pnpm contrast && pnpm typecheck`. Expected: PASS; contrast still 60 pairings, lowest 4.52:1 (no new pairing: twine, gold, water and buffalo never carry text — the doc template's "not measured" line gains them).
- [ ] **Step 5:** `grep -rn "blueprint-grid" src scripts e2e tests README.md CLAUDE.md docs/editing.md`. Expected: only the palette test's absence assertion.
- [ ] **Step 6: Commit:** `Add the scene tokens and paint utilities; the header sits on the sky`.

### Task 3: The hero's words, in the content layer

**Files:**
- Modify: `src/content/portfolio.ts` (`profile.headline`; new `hero` export after `companions`; comments that name the terminal: lines 92–93, the `aiTools` comment)
- Modify: `src/types/portfolio.ts` (`HeroCopy`)
- Modify: `src/lib/content.ts` (gains `currentEntry`), `src/lib/terminal.ts` (imports `currentEntry` from `./content` and re-exports nothing new; deleted in Task 6)
- Create: `src/lib/hero.ts`
- Test: `tests/lib/hero.test.ts`; `tests/lib/content.test.ts` (gains the two `currentEntry` cases moved from `tests/lib/terminal.test.ts`: `now is the current role`'s selection rule and `throws without a current entry`)

**Interfaces:**
- `profile.headline = "Just a curious kid, and this is my youth."` (nothing else renders `profile.headline`; it is not indexed).
- `hero` (satisfies `HeroCopy`), first person, verbatim:
  - `hint`: "This line runs from a bamboo pole to a pine. Press a tag and I'll tell you that part."
  - `chapterLines`: `origin` "Where I start. Rice, rivers, and a lot of questions." (**written by the assistant; ships only with the owner's approval — Open question 1**), `"usc-degree"` "Chemical engineering first, then computer science.", `doordash` "Now I write software for retail data." The `eastside-high` line is that entry's own `headline`, by reference.
  - `fieldTag`: `number` "001", `aside` "That's me", `habitat` "DoorDash, retail data", `formerly` "Chef, family kitchen", `companionsLead` "Two cats", `status` "Still growing", `linkLabel` "My LinkedIn".
  - `vignette`: `morning` "cà phê phin, first", `evening` "lẩu, after work".
  - `offDuty`: "off duty" (the caption is `${companions[0].name}, ${hero.offDuty}`).
- `src/lib/content.ts`: `export function currentEntry(entries: readonly CareerEntry[] = careerEntries): CareerEntry` (moved verbatim with its comment).
- `src/lib/hero.ts`:
  - `export type ChapterId = "origin" | "eastside-high" | "usc-degree" | "doordash";`
  - `export interface Chapter { readonly id: ChapterId; readonly year: string; readonly place: string; readonly line: string; readonly entryId: string | null; readonly drawing: "tag-rice" | "tag-pine" | "tag-palmetto" | "tag-laptop"; }` — `entryId` is the career entry the "Read this part" link opens; `null` means the Journey itself.
  - `export function shortPlace(name: string): string` — the first comma segment; if that segment has three or more words, the initials of its capitalised words.
  - `export function buildChapters(): readonly Chapter[]` — in order:
    - origin: year `origin.born.slice(0, 4)`, place `shortPlace(origin.from)`, `entryId: null`, `tag-rice`
    - eastside-high: year `Dec 2018` from `origin.arrivedOn` (three-letter month + year), place `shortPlace(origin.to)`, line = the entry's `headline`, `tag-pine`
    - usc-degree: year = `sortKey.slice(0, 4)`, place `shortPlace(organization)`, `tag-palmetto`
    - doordash: year = `sortKey.slice(0, 4)`, place `shortPlace(organization)`, `tag-laptop`
    - Throws if any of the three career ids is missing.
  - `export interface FieldTagRow { readonly label: string; readonly value: string; readonly star?: true; }`
  - `export function buildFieldTag(): { readonly number: string; readonly aside: string; readonly rows: readonly FieldTagRow[]; readonly status: string; readonly motto: string; readonly linkedin: string; readonly linkLabel: string }` — rows: Name `profile.name`; Native to `origin.from` (`star: true`); Transplanted `origin.to`; Habitat; Formerly; Companions `"Two cats, Moon and Mi"` (`companionsLead` + names joined `", "` … `" and "`). `motto` is `profile.motto`; `linkedin` is the LinkedIn `socialLinks` href.

- [ ] **Step 1: Write the failing tests** in `tests/lib/hero.test.ts`:
  - `chapters are the four stops, in order`: ids `["origin", "eastside-high", "usc-degree", "doordash"]`; years `["2003", "Dec 2018", "2021", "2025"]`; places `["Kiên Giang", "Taylors", "USC", "DoorDash"]`; drawings in the order above; entry ids `[null, "eastside-high", "usc-degree", "doordash"]`.
  - `the Taylors line is the entry's own headline` (`=== careerEntries.find(e => e.id === "eastside-high")!.headline`).
  - `the other lines are the authored ones`: origin, usc-degree and doordash lines equal `hero.chapterLines[...]`.
  - `shortPlace`: `"Kiên Giang, Việt Nam"` → `"Kiên Giang"`, `"University of South Carolina"` → `"USC"`, `"DoorDash, Inc."` → `"DoorDash"`, `"Taylors, South Carolina"` → `"Taylors"`.
  - `field tag rows come from content`: labels `["Name", "Native to", "Transplanted", "Habitat", "Formerly", "Companions"]`; Native to is `origin.from` with `star: true`; Transplanted is `origin.to`; Companions is `"Two cats, Moon and Mi"`; `status === "Still growing"`; `motto === profile.motto`; `linkedin === "https://www.linkedin.com/in/thienle210303"`.
  - `authored rows stay true to the record`: `hero.fieldTag.habitat.startsWith(currentEntry().organization.split(",")[0])`; the `fu-of-kyoto` role starts with `"Chef"` and `hero.fieldTag.formerly` starts with `"Chef"`; `companions.length === 2` (the "Two" is authored).
  - `the off-duty cat is Moon`: `companions[0].id === "moon"`.
  - `the hero's authored lines are not indexed`: no `buildDocuments()` text contains `hero.hint` or any `hero.chapterLines` value.
  - In `tests/lib/content.test.ts`: `currentEntry picks the open entry with the latest sortKey` and `currentEntry throws without a current entry`.
- [ ] **Step 2:** `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" && pnpm test tests/lib/hero.test.ts tests/lib/content.test.ts`. Expected: FAIL (`@/lib/hero` not found).
- [ ] **Step 3:** Implement the content, the type, `currentEntry`'s move and `src/lib/hero.ts`. The old `Hero`/`e2e/hero.spec.ts` still import `@/lib/terminal`'s `currentEntry` re-export until Task 6, so keep `export { currentEntry } from "./content";` in `terminal.ts` for now.
- [ ] **Step 4:** `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" && pnpm test && pnpm typecheck`. Expected: PASS (the old `Hero.test.tsx` headline case reads `profile.headline`, so it follows the new value). Eval unchanged: 70.0 / 93.3 / 96.7 / 0.807.
- [ ] **Step 5: Commit:** `Put the hero's chapters and field tag in the content layer`.

### Task 4: The `Tag` paper and the chapter tags that turn over

**Files:**
- Create: `src/components/ui/Tag.tsx`
- Create: `src/sections/Hero/ChapterTags.tsx` (`"use client"`)
- Modify: `src/app/globals.css` (`.tag-cut` clip-path utility)
- Test: `tests/sections/ChapterTags.test.tsx`

**Interfaces:**
- Consumes `Chapter` (Task 3), `Drawing` (Task 2).
- `.tag-cut { clip-path: polygon(22px 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%, 0 22px); }` (the board's `TAG_CLIP`).
- `export function Tag({ children, className }: { readonly children: ReactNode; readonly className?: string }): JSX.Element` — server-safe. Renders `<div className={cn("tag-cut relative bg-surface text-fg", className)}>` + the hole: an `aria-hidden` 12 px circle centred 12 px from the top, `bg-ground` with a 1.5 px `--twine` inset ring. **The clip lives on this inner paper, never on a focusable element**, so focus rings are not clipped.
- `export default function ChapterTags({ chapters }: { readonly chapters: readonly (Chapter & { readonly href: string })[] }): JSX.Element`:
  - `<ul data-hero-step="line" className="grid grid-cols-2 gap-x-4 gap-y-8 lg:flex lg:gap-[38px]">`, one `<li>` per chapter with `style={{ "--drop": DROPS[i] }}` where `const DROPS = ["0px", "19px", "27px", "25px"]` (the board's sag at 1440) and `lg:translate-y-(--drop)`; tag width 152 px at ≥ 1024, the grid cell below; a slight resting tilt `[-3, 2, -1.5, 2.5]` deg at ≥ 1024 only.
  - State: `const [open, setOpen] = useState<ChapterId | null>(null)`.
  - Each tag is a `perspective-distant` wrapper around `<div data-flip className={cn("grid transform-3d transition-transform duration-(--dur-settle) ease-(--ease-ink)", isOpen && "rotate-y-180")}>`, the same mechanism as `BusinessCard` (the global reduced-motion rule removes the transition, so under reduced motion the back simply shows):
    - **Front** (`[grid-area:1/1] backface-hidden`): `<button type="button" aria-expanded={isOpen} aria-controls={backId} inert={isOpen} onClick={() => setOpen(isOpen ? null : id)}>` wrapping a `Tag` with the year (`font-mono text-[length:var(--step--2)] text-fg-muted`), the place (`font-semibold`, `--step-1`) and `<Drawing name={drawing} className="mt-1.5 h-[88px] w-full text-accent" />`. Its accessible name is "year place" (the drawing is `aria-hidden`).
    - **Back** (`[grid-area:1/1] backface-hidden rotate-y-180`, `id={backId}`, `inert={!isOpen}`): a `Tag` holding `<button type="button" onClick={close}>` whose content is the line (`font-serif italic`, `--step-1`) — pressing the line turns the tag back — and, below it, `<a href={href}>Read this part</a>` (`font-semibold underline underline-offset-4`).
    - Both faces share one grid cell; the tag is as tall as its taller face (`min-h-[190px]`, never a fixed height).
  - Focus follows the turn (as `BusinessCard`): opening focuses the back's line button; closing (line button, Escape anywhere in the `<li>`, or opening another tag) focuses that tag's front button.
  - Twine below 1024 px: each `<li>` draws its own 2 px `--twine` segment across its cell's top (`before:`), so each row of two reads as one line; the per-tag string (`after:`, 1.3 px, from the hole up to the line) shows at every width. At ≥ 1024 the row segments switch off and Task 6's clothesline takes over.

- [ ] **Step 1: Write the failing tests** (`tests/sections/ChapterTags.test.tsx`, rendering with `buildChapters()` mapped to hrefs `["#tree", "#journey-entry-eastside-high", "#journey-entry-usc-degree", "#journey-entry-doordash"]`):
  - `renders four closed tags in order`: four front buttons named `/2003\s+Kiên Giang/`, `/Dec 2018\s+Taylors/`, `/2021\s+USC/`, `/2025\s+DoorDash/`, each `aria-expanded="false"`; every back face is `inert`.
  - `a press turns one tag over`: click Kiên Giang → its front `aria-expanded="true"` and `inert`; its back is not `inert`, shows `hero.chapterLines.origin`, and its "Read this part" link has `href="#tree"`; its `[data-flip]` has class `rotate-y-180`.
  - `one tag open at a time`: open Kiên Giang, then press USC's front → Kiên Giang closed (`aria-expanded="false"`, back `inert`), USC open.
  - `focus follows the turn`: Enter on Taylors' front → the back's line button has focus; Escape → Taylors' front has focus and the tag is closed; open it again, press the line button → closed, front focused.
  - `the back face grows to fit its line`: no element inside a tag has an `h-[…]` or `height` style other than the drawing's `h-[88px]`.
  - `the drawing is decoration`: each front's `[data-scenery]` is `aria-hidden="true"`.
- [ ] **Step 2:** `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" && pnpm test tests/sections/ChapterTags.test.tsx`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement `Tag`, `.tag-cut` and `ChapterTags`.
- [ ] **Step 4:** Re-run, then `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" && pnpm typecheck && pnpm lint`. Expected: PASS.
- [ ] **Step 5: Commit:** `Hang four chapter tags that turn over to my line`.

### Task 5: My field tag and the LinkedIn QR

**Files:**
- Create: `src/sections/Hero/LinkedInQr.tsx`
- Create: `src/sections/Hero/FieldTag.tsx`
- Test: `tests/sections/LinkedInQr.test.ts`, `tests/sections/FieldTag.test.tsx`

**Interfaces:**
- `LinkedInQr.tsx`:
  - `export const QR_URL = "https://www.linkedin.com/in/thienle210303";` — the string segno encoded; the comment says the code was generated once offline (segno, version 3, 29 modules, no border) and must be re-generated, never hand-edited, if the URL changes.
  - `export const QR_PATH: string` — the `d` attribute of `qr.svg`'s single path, verbatim.
  - `export default function LinkedInQr({ className }: { readonly className?: string })` → `<svg aria-hidden="true" viewBox="-1 -1 31 31" shape-rendering="crispEdges" className={className}><path d={QR_PATH} stroke="currentColor" /></svg>`. Painted `text-fg` on paper (dark ink in both themes, through the night paper scope). The paper around it is the quiet zone: nothing dark within 10 px of the code.
- `FieldTag.tsx` (server): `export default function FieldTag()` reads `buildFieldTag()` and renders, inside `<Tag>` (`data-hero-step="field-tag"`, `font-mono`, 13.5 px ≈ `--step--1`, `leading-[1.75]`):
  - header row: `Field tag No. {number}` and `{aside}` (both `font-bold`), then a dashed 1.5 px `border-fg` rule; **no heading element** (the hero has only its `<h1>`).
  - rows as a `<dl>` in a `grid-cols-[104px_1fr]` grid, labels `text-fg-muted`; the Native to row ends with an `aria-hidden` 10 px star SVG filled `var(--gold)`.
  - dashed rule, then the Status row (bold).
  - the QR link: `ExternalLink` to `linkedin`, containing `<LinkedInQr className="size-[72px]" />` and the visible text `{linkLabel}` — the visible text is the accessible name.
  - the stamp: `<p>` with `profile.motto` as text, `uppercase font-bold tracking-[0.04em] border-[2.5px] border-[color:var(--mark)] text-[color:var(--mark)] -rotate-6`, opacity 1.
  - width 380 px at ≥ 1024, full column width (max 380 px) below; a 2° resting tilt at ≥ 1024.

- [ ] **Step 1: Write the failing tests.**
  - `LinkedInQr.test.ts` parses `QR_PATH` (absolute `M x y`, then relative `m dx dy` and `h n`, where `h n` darkens `n` modules on row `floor(y)`) into a 29×29 boolean matrix:
    - `is a 29-module code`: every dark module lies in `[0, 29)²` and rows 0 and 28 both have dark modules.
    - `has the three finder patterns`: at (0,0), (0,22) and (22,0), the 7×7 block's outer ring and 3×3 centre are dark and the ring between is light; the separator row/column next to each is light.
    - `has the timing patterns`: row 6 and column 6, from 8 to 20, are dark exactly at even indices.
    - `has version 3's dark module`: (row 21, col 8) is dark.
    - `encodes my LinkedIn`: `QR_URL === socialLinks.find(l => l.id === "linkedin")!.href`.
  - `FieldTag.test.tsx`:
    - `rows read from content`: the `<dt>`/`<dd>` text pairs equal `buildFieldTag().rows`; "Still growing" is present.
    - `stamps the motto`: an element has text exactly `profile.motto` and a class `uppercase`.
    - `the QR is a named link to my LinkedIn`: `getByRole("link", { name: "My LinkedIn" })` has `href` `QR_URL`, `target="_blank"`; its `<svg>` is `aria-hidden`.
    - `adds no heading`: no `h1`–`h6`.
    - `uses the mark once`: exactly one element in the tag carries `--mark`.
- [ ] **Step 2:** `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" && pnpm test tests/sections/LinkedInQr.test.ts tests/sections/FieldTag.test.tsx`. Expected: FAIL (modules not found).
- [ ] **Step 3:** Implement both components.
- [ ] **Step 4:** Re-run. Expected: PASS. The structural test proves the path was not corrupted in the port; it does **not** prove the code scans — that is the owner's phone scan in Task 8.
- [ ] **Step 5: Commit:** `Add my field tag, with the LinkedIn QR and the motto stamp`.

### Task 6: The new hero, and the terminal retired

**Files:**
- Rewrite: `src/sections/Hero/Hero.tsx`, `src/sections/Hero/HeroIdentity.tsx` (identity column without the eyebrow)
- Create: `src/sections/Hero/Scenery.tsx`
- Delete: `src/sections/Hero/HeroTerminal.tsx`, `src/sections/Hero/TypeOnce.tsx`, `src/lib/terminal.ts`, `tests/sections/HeroTerminal.test.tsx`, `tests/lib/terminal.test.ts`
- Modify: `src/app/globals.css` (hero `data-hero-step` choreography; delete `term-type` and `[data-typing]`; rewrite the LCP-guard block comment)
- Modify: `src/lib/answer-corpus.ts:144-162` (`profile.focus` document loses `sectionId`/`sectionLabel`; comment rewritten)
- Modify: `src/components/companion/companion-moods.ts:193-194` (comment: the perch is the actions row)
- Modify: comments `src/components/ui/Tabs.tsx:17`, `src/components/ui/CodeBlock.tsx:14`, `src/app/globals.css:153,743`, `src/content/portfolio.ts` (`focus`, `aiTools`)
- Test: rewrite `tests/sections/Hero.test.tsx`; `tests/lib/answers.test.ts`

**Interfaces:**
- `Hero({ bookingUrl }: { readonly bookingUrl: string | null })` — signature unchanged. `<Section id="about" labelledBy="hero-heading" tone="base" reveal={false} className="relative isolate overflow-hidden pb-[130px] lg:pb-[150px]">`, children in this order:
  1. the `ABOUT_LEGACY_SECTION_IDS` spans (first, unchanged);
  2. `<Scenery />`;
  3. the layout grid: below 1024 a single column; at ≥ 1024 `grid-cols-[minmax(0,1fr)_380px] gap-x-(--gutter)` with `grid-template-areas: "line tag" "text tag"`.
     **DOM order is text → line → tag** at every width, so a phone reads the headline first. The ≥ 1024 grid places the clothesline above the text. Tab order is therefore actions → tags → QR, which keeps meaning (the three groups are independent); Task 7 pins it.
     - **text** (`HeroIdentity`): `<h1 id="hero-heading" data-hero-step="h1">` `profile.headline` at `--step-5`, `max-w-[18ch]`; `<p data-hero-step="intro">` `profile.positioning` at `--step-1` in `text-fg-muted`, `max-w-[40ch]`; actions `<div data-hero-step="meta-actions" data-cat-perch="" className="w-fit …">` with `<Button href="#tree">Start with where I'm from</Button>` and `<Button href={bookingUrl ?? "#contact"} variant="quiet">Book a call with me</Button>`. The perch is `w-fit` so the companion's `besideRect` has room beside it.
     - **line**: `<ChapterTags chapters={…} />` with `href = entryId ? \`#${journeyEntryAnchorId(entryId)}\` : "#tree"`, then `<p className="font-serif italic text-fg-muted">{hero.hint}</p>`. At ≥ 1024 the tags start ~84 px below the section's top padding (board: tag tops at y≈189 in a 1440×900 viewport).
     - **tag**: `<FieldTag />`, top aligned with the tags, `-8px` drop.
- `Scenery()` (server; one `aria-hidden="true"` `data-scenery="hero"` wrapper, `pointer-events-none absolute inset-0 -z-10`). Positions are the board's, measured from the section's bottom-left; "xl" = ≥ 1280, "lg" = 1024–1279, "base" = below 1024:

  | Piece | Element | Paint | xl | lg | base |
  |---|---|---|---|---|---|
  | sky | `span.scene-art` `style={{ "--art": "var(--art-sky)" }}` | — | `inset-x-0 top-0 h-[900px]`, `background-size: max(100%, 1440px) auto`, `background-position: top center` | same | same |
  | clothesline | inline `<svg viewBox="0 0 1440 140" preserveAspectRatio="none">` with `<path d="M76 14Q703 238 1330 0" vector-effect="non-scaling-stroke" stroke-width="2">`, `stroke` `var(--twine)` | `--twine` | `inset-x-0 h-[140px]`, top at the tags' hole line | same | hidden |
  | bamboo | `Drawing bamboo` | `text-accent` | `left-0 bottom-0 w-[170px] h-[790px]` | hidden | hidden |
  | nón lá | `Drawing non-la` | art | `left-[44px] bottom-[400px] w-[120px] h-[130px]` | hidden | hidden |
  | pine | `Drawing pine` | `text-accent` | `right-0 bottom-0 w-[180px] h-[820px]` | hidden | hidden |
  | ripples | `Drawing ripples` | `text-[color:var(--scene-water)]` | `left-[38.9%] bottom-[10px] w-[660px] h-[30px]` | hidden | hidden |
  | buffalo | `Drawing buffalo` (before the rice in the DOM, so the stalks draw over it) | `text-[color:var(--scene-buffalo)]` | `left-[62.8%] bottom-[30px] w-[150px] h-[80px]` | `left-[60%]` | `right-[8%] bottom-[20px] w-[110px] h-[59px]` |
  | rice | `Drawing rice-field` | `text-accent` | `left-[41.7%] bottom-0 w-[620px] h-[160px]` | `left-[38%]` | `inset-x-0 bottom-0 h-[120px]` |
  | vignette | `span.scene-art` `style={{ "--art": "var(--art-vignette)" }}` | — | `left-[29.2%] bottom-[16px] w-[100px] h-[134px]` | same | `left-[44%] bottom-[12px] w-[72px] h-[96px]` |
  | vignette caption | two `<p>`: `.day-only` `hero.vignette.morning`, `.night-only` `hero.vignette.evening`; `font-serif italic text-[length:var(--step--1)] text-fg-muted` | — | `left-[29%] bottom-[4px]` | same | `left-[40%] bottom-0` |
  | Moon, off duty | `<span data-moon-off-duty="">` holding an inline `<svg viewBox="18 28 136 74">` (the board's `cat` paths, `stroke="currentColor"` `text-fg`, body/ears/head filled `var(--ground)`) and the caption `` `${companions[0].name}, ${hero.offDuty}` `` in `font-serif italic text-fg-muted` | — | `left-[11.1%] bottom-[19px]`, svg `w-[121px] h-[66px]`, caption to its right | same | `left-4 bottom-8`, svg `w-[96px] h-[52px]` |

  `data-moon-off-duty` is the **stable hook Phase 7's surprise reads**: exactly one element, a stable box, in `#about`. It is the only static cat drawing on the site after this phase's hero (Phase 7 removes the others).
- Choreography (`globals.css`, under `html[data-motion]` and `prefers-reduced-motion: no-preference`): `h1` `ink-rise` 0 ms (LCP guard kept), `intro` `ink-fade-rise` 50 ms, `meta-actions` `ink-fade-rise` 100 ms, `line` `ink-fade-rise` 120 ms, `field-tag` `ink-rise` 160 ms. Delete the `eyebrow`, `code` and `scroll` steps. The block comment names the h1 as the expected LCP element and says the field tag uses `ink-rise` because it is a large text block.
- `profile.focus` is printed nowhere once the terminal goes, so its corpus document follows the section-less precedent (`answer-corpus.ts`'s skills-evidence note): no `sectionId`, no `sectionLabel`; text and label unchanged, so the eval is byte-identical. `aiTools` is rendered nowhere after this task; it stays in the content layer pending Open question 5, and its comment says so.

- [ ] **Step 1: Write the failing tests.** Rewrite `tests/sections/Hero.test.tsx`:
  - keep `carries the retired #worlds anchor`, adding: the span is `#about`'s **first** element child.
  - `renders the headline and my one paragraph`: `<h1>` text `"Just a curious kid, and this is my youth."` (= `profile.headline`); the `[data-hero-step="intro"]` text is `profile.positioning`.
  - `offers the two actions`: link "Start with where I'm from" `href="#tree"` and matching the control-fill regex `/(^|\s)bg-\[color:var\(--control\)\](\s|$)|(^|\s)bg-control(\s|$)/`; link "Book a call with me" `href="#contact"` (and the configured URL with `target="_blank"` when `bookingUrl` is set).
  - `fills only Start with where I'm from with the control colour`.
  - `hangs four chapter tags and my field tag`: four buttons with `aria-expanded`; "Read this part" hrefs (in DOM order) `["#tree", "#journey-entry-eastside-high", "#journey-entry-usc-degree", "#journey-entry-doordash"]`; the field tag's "My LinkedIn" link.
  - `has exactly one h1 and no other heading`.
  - `has no margin rail`; `no longer renders the About paragraphs` (kept).
  - `the scenery is decoration`: every `[data-scenery]` is inside an `aria-hidden="true"` ancestor or is one; no `button`, `a` or `[tabindex]` is inside `[data-scenery="hero"]`.
  - `Moon sleeps in the rice`: exactly one `[data-moon-off-duty]`, with text `"Moon, off duty"`.
  - `shows the morning by day and the evening at night`: one `.day-only` with `hero.vignette.morning`, one `.night-only` with `hero.vignette.evening`.
  - `keeps the cats' perch on the actions row`: `[data-cat-perch]` is the element with `data-hero-step="meta-actions"`.
  - `keeps the load choreography's hooks`: steps `["h1", "intro", "meta-actions", "line", "field-tag"]` present; `eyebrow`, `code`, `scroll` absent.
  - `the terminal is gone`: no `tablist`, no `[data-typing]`, no text `whoami`.
  - In `tests/lib/answers.test.ts`: `focus is indexed but cited nowhere`: the document whose text is `profile.focus` has `sectionId === undefined`.
- [ ] **Step 2:** `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" && pnpm test tests/sections/Hero.test.tsx tests/lib/answers.test.ts`. Expected: FAIL on the new cases.
- [ ] **Step 3:** Implement `Hero`, `HeroIdentity`, `Scenery`, the CSS and the corpus change; delete the terminal files and tests; update the listed comments.
- [ ] **Step 4:** `grep -rn "lib/terminal\|HeroTerminal\|TypeOnce\|buildTerminal\|data-typing\|term-type" src tests scripts`. Expected: no hits.
- [ ] **Step 5:** `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" && pnpm verify`. Expected: 5/5; retrieval 70.0 / 93.3 / 96.7 / 0.807 (the focus change does not touch the search surface).
- [ ] **Step 6: Look at it.** `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" && pnpm dev -p 3182` (background, note PID). At 1440×900, day and night, compare with `NatHero.png` / `NatHeroNight.png`: tag tops ≈ 189 px, h1 top ≈ 458 px, buttons ≈ 733–785 px, field tag top ≈ 183 px, each within ±16 px; strings meet the line within a few px at 1024, 1280 and 1440. Tune `DROPS`, the clothesline's top and the section's top spacing until they do; then check 390 and 320. Kill the dev server by PID.
- [ ] **Step 7: Commit:** `Hang the clothesline in the hero; retire the terminal card`.

### Task 7: The e2e suite and the docs follow the new hero

**Files:**
- Rewrite: `e2e/hero.spec.ts`
- Modify: `e2e/sections.spec.ts` (delete `terminal tabs switch panels via mouse and keyboard` and the `buildTerminal` import), `e2e/interactions.spec.ts` (delete the `hero terminal` describe), `e2e/responsive.spec.ts` (delete `hero terminal panel wraps…`, fix the header comment's "hero code panel"), `e2e/reveal.spec.ts` (`the hero h1 and field tag are fully opaque immediately`, selector `[data-hero-step="field-tag"]`), `e2e/scale.spec.ts`, `e2e/contact.spec.ts:310-324`, `e2e/axe.spec.ts`, `e2e/companion.spec.ts:1417-1419,2076-2083` (comments: the perch is the actions row), `e2e/legacy-anchors.spec.ts:187-189,239-242` (comments: the hero's height; still no "`#tree` off screen" assertion)
- Docs: `CLAUDE.md` (the page description's About line; "`aiTools` … the hero's terminal reads it"; a short "### The hero's scenery" paragraph), `README.md:7` and its design-system alias table (`--twine`, `--gold`, `--scene-water`, `--scene-buffalo`, `--art-sky`, `--art-vignette`), `docs/editing.md:73-74` (`currentEntry()` now in `src/lib/content.ts`; the field tag's Habitat row reads it) plus a short "The hero's tags and field tag" recipe (where each line lives; `pnpm draw:scenery` after changing a drawing)

**Interfaces:** consumes everything above. The CLAUDE.md scenery paragraph states: drawings are generated SVG files under `public/scenery/` from `scripts/draw-scenery.mjs` (`pnpm draw:scenery`), `tests/lib/scenery.test.ts` fails until they match; one-colour drawings are masks painted by an alias, theme-dependent pieces take their file from `--art-*`; no runtime drawing, no library; `data-moon-off-duty` is Phase 7's hook.

- [ ] **Step 1: Write the failing e2e** in `e2e/hero.spec.ts` (each test pins its own viewport and skips other projects, as today):
  - `headline, my paragraph and two actions at 1440 and 390`: `#about h1` text `profile.headline`; `[data-hero-step="intro"]` text `profile.positioning`; "Start with where I'm from" `href="#tree"`; "Book a call with me" `href="#contact"` (no `BOOKING_URL` on the test server).
  - `the tags turn over, one at a time`: click Kiên Giang → `aria-expanded="true"`, "Where I start…" visible, "Read this part" visible with `href="#tree"`; click DoorDash → Kiên Giang `aria-expanded="false"`, `getByRole("button", { expanded: true })` count 1.
  - `focus follows the turn, by keyboard`: focus Taylors' front, Enter → the focused element's text is the eastside-high headline; Tab → "Read this part" focused; Escape → Taylors' front focused, closed.
  - `reduced motion: the tag turns without a transition`: `emulateMedia({ reducedMotion: "reduce" })`; after a press, `[data-flip]`'s computed `transition-duration` parses to ≤ 0.01 ms and the back is visible immediately.
  - `focus is visible on every tag, the QR link and both actions, in both themes`: for each control reached by Tab inside `#about` — the tab sequence is exactly `["Start with where I'm from", "Book a call with me", 4 tag fronts in order, "My LinkedIn"]` — computed `outline-style` is not `none`, `outline-width` ≥ 2 px, and the element's own `clip-path` is `none`.
  - `nothing in the scenery sits on top of a control` (Review Focus 2): at 1024, 1280 and 1440, `document.elementFromPoint` at each control's centre returns the control or a descendant.
  - `layout at 1440: the line above the text, my field tag to the right`: every tag's bottom < h1 top; field tag left ≥ the last tag's right; field tag top within 40 px of the first tag's top.
  - `layout at 390: text first, then a 2×2 grid of tags, then my field tag`: h1 top < first tag top; tags 0 and 1 share a top, tags 0 and 2 share a left; field tag top > tag 3 bottom.
  - `no tag clips its text at 320`: for each tag (front and, after opening, back), `scrollHeight <= clientHeight + 1` on the paper.
  - `day shows the sun and the phin; night the moon and the lẩu`: computed `background-image` of the sky span contains `sky-day.svg` by day and `sky-night.svg` at night; the visible caption is `hero.vignette.morning` by day and `hero.vignette.evening` at night.
  - `the toggle swaps the scene in place` (Review Focus 4): load day, press the theme toggle, the sky contains `sky-night.svg` and the evening caption is visible, without a navigation.
  - `JS off, dark scheme: the night scene` (Review Focus 3): new context `{ javaScriptEnabled: false, colorScheme: "dark" }`; sky contains `sky-night.svg`; evening caption visible; four tag fronts visible.
  - `the field tag reads from content`: rows match `buildFieldTag().rows`; the stamp's text is `profile.motto` rendered upper-case (`text-transform: uppercase`), computed opacity `1`; `getByRole("link", { name: "My LinkedIn" })` has `href` `https://www.linkedin.com/in/thienle210303`.
  - `the header sits on the sky`: the header's computed `background-image` equals `body`'s and its `background-attachment` is `fixed`.
  - Elsewhere:
    - `scale.spec.ts`: `hero headline is 64–72px at 1440` (below 1440: ≤ 72 px and ≤ 4 lines); `hero lead is 17–19px` on `[data-hero-step='intro']`; move the `body text is 15–16px` check to a Journey paragraph rendered at `--step-0` (pick it by computed style in the browser; name the selector in the test comment).
    - `contact.spec.ts`: rename to `the page's only control fills are the hero's Start with where I'm from and the lead form's Send`; `toEqual(["Start with where I'm from", "Send"])`.
    - `axe.spec.ts`: add `About (#about) with a tag open has zero WCAG violations`, day and night (open Kiên Giang first).
- [ ] **Step 2:** Build and serve: `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" && pnpm build`, then `PORT=3183 pnpm start` (background, same prefix, note PID), with `playwright.r21.config.ts` pointing at `http://localhost:3183`. Run `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" && pnpm exec playwright test -c playwright.r21.config.ts --workers=2 e2e/hero.spec.ts`. Expected: PASS for every new test that Task 6 already satisfies; any FAIL is a Task 6 defect — fix it in the hero, not in the test.
- [ ] **Step 3:** Apply the other spec edits and the docs. Then `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" && pnpm exec playwright test -c playwright.r21.config.ts --workers=2 e2e/hero.spec.ts e2e/sections.spec.ts e2e/interactions.spec.ts e2e/responsive.spec.ts e2e/reveal.spec.ts e2e/scale.spec.ts e2e/contact.spec.ts e2e/axe.spec.ts e2e/accessibility.spec.ts e2e/legacy-anchors.spec.ts e2e/companion.spec.ts e2e/print.spec.ts`. Expected: 0 failed after one isolated retry per failure. If a companion test moves because the perch moved, report what was measured; do not loosen a threshold.
- [ ] **Step 4:** `grep -rniE "terminal|whoami|See my work|Scroll row|blueprint" src e2e tests README.md CLAUDE.md docs/editing.md`. Expected hits only: `Tabs.tsx`/`CodeBlock.tsx` history comments if still true, and nothing that describes the hero as having a terminal. Fix any false line.
- [ ] **Step 5:** Kill the server by PID. **Commit:** `Point the e2e suite and the docs at the clothesline hero`.

### Task 8: Phase 3 close-out

**Files:** `docs/feedback-tracker.md`. `reports/r21-p3-screens/` and `playwright.r21.config.ts` stay untracked.

- [ ] **Step 1:** `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" && pnpm verify`. Expected: 5/5; eval 70.0 / 93.3 / 96.7 / 0.807; contrast lowest 4.52:1.
- [ ] **Step 2:** Production build, `PORT=3184 pnpm start` (prefixed, background, PID noted), full suite `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" && pnpm exec playwright test -c playwright.r21.config.ts --workers=2`. Expected: 0 failed after one isolated retry each. Record passed/skipped counts.
- [ ] **Step 3: Screens.** 1440×900, 1024×768, 390×844 and 320×568, day and night, plus 1440 day with Kiên Giang turned over, into `reports/r21-p3-screens/`. Put the 1440 pair beside `NatHero.png` / `NatHeroNight.png` and list every visible difference; anything beyond the decisions in this plan is a finding.
- [ ] **Step 4: Perf.** On the same server, `export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH" && PERF_URL=http://localhost:3184/ pnpm perf`, three runs, 0 skipped responses.
  - `JS at load` against the baseline from "Before Task 1": expected between −5 KB and +3 KB (`TypeOnce` and the hero's `Tabs` import leave the initial chunk; `ChapterTags` joins it). Above +3 KB is a finding: find the module with the build's chunk report before recording.
  - LCP element: expected `h1#hero-heading`. If it is the sky span or a scenery file, record it and raise it with the owner rather than hiding the sky.
  - Scenery weight: sum of `public/scenery/*.svg`, raw and gzip (`node -e` with `zlib.gzipSync`), and the request count the hero adds (expected 13 in day: no `sky-night`/`evening` fetch).
  - **DOM (Phase 2's open +44).** Re-run the per-section count from "Before Task 1". Report `#about`'s before/after and every other section's delta. If any section other than `#about` moved, or the Phase 2 rise is still unexplained by per-section counts, say which element types account for it (count by `tagName` within the section that moved).
- [ ] **Step 5: Owner gates (before merge).**
  - Phone-scan the QR on the running page in both themes (owner). Expected: opens `https://www.linkedin.com/in/thienle210303`. A failed scan blocks the merge.
  - Owner approval of the Kiên Giang line (Open question 1). Until approved, the merge waits.
- [ ] **Step 6:** Add `## Round 21 phase 3 (date) — the hero` to `docs/feedback-tracker.md`: the perf row in R21-P2's prose format with deltas, LCP element, scenery bytes and requests, the DOM investigation, verify and e2e counts, the eval figures, the scan result, and every decision below that changed the board.
- [ ] **Step 7: Commit:** `Record round 21 phase 3`.
- [ ] **Step 8:** Kill the server by PID. Merge `round-21/hero` into `main` and push (pre-approved per phase, after Step 5's gates).

---

## Decisions this plan makes (and why)

- **Generated files over hand-ported path data:** the generator stays the source of truth, a test proves the files match it, and nothing ships to the client. Masks plus `--art-*` aliases give theme swaps with no JS and no duplicated DOM.
- **Board deviations, all from the one-name-per-place rule or the spec:** the Taylors tag says "Taylors" (board: "Taylors, SC"); the field tag says `origin.from` "Kiên Giang, Việt Nam" (board: "Kiên Giang, VN"); the body is `profile.positioning` without "Come in, I'll show you around."; the Taylors back line is the entry's headline ("Started American…", board: "I started American…").
- **The Kiên Giang "Read this part" goes to `#tree`:** the origin is not a career entry, so there is no row to open. The other three go to `#journey-entry-<id>`, which follows the rows when Phase 5 moves them to the Record.
- **With JS off the tags do not turn.** Their fronts, the headline, both actions and the field tag all work; the back lines are in the HTML but not shown.
- **Not built here:** paper grain, the tag back's tinted paper, tags swaying in (Phase 8), the cats' sky fills (Phase 7), a `Stamp` component (Phase 5's postage stamps are a different object).

## Open questions for the owner

1. **The Kiên Giang line** "Where I start. Rice, rivers, and a lot of questions." was written by the assistant, not by you. Approve it, or give me your line. (Merge gate.)
2. **"Kiên Giang, Việt Nam" in the mono field tag:** Courier Prime has no Vietnamese subset, so "ệ" falls back to another mono face mid-word. Keep it, show that one value in Bricolage, or write the row as the board did ("Kiên Giang, VN")? The last needs a second name for the place, which the content rules forbid today.
3. **"Taylors" on the tag** instead of the board's "Taylors, SC". OK?
4. **Body:** ship only "I write software for retail data at DoorDash. Before that I was a chef in my family's restaurant." (spec), or add the board's "Come in, I'll show you around."?
5. **`aiTools`** (Claude Code, …) was shown only by the terminal and is now rendered nowhere. Keep it for a later page, or delete it?
6. **Below 1280 px** there is no room for the bamboo pole, the nón lá or the pine beside the content, so they are hidden; Việt Nam still shows through the Kiên Giang tag, the gold star and the cà phê phin / lẩu. OK, or should the nón lá find another place on phones?
7. **Phone scan** of the QR, day and night, before merge.
8. **Headline size:** the board sets it at 70 px; round 20 brought it down to 48 px because the page felt too big. This plan follows the board.

## Owner answers (2026-10-19)

- Kiên Giang back line: keep "Where I start. Rice, rivers, and a lot of questions."
- "Kiên Giang, Việt Nam" on the field tag: set that value in Bricolage (the main face) so "ệ" renders; the rest of the tag stays Courier Prime.
- Body: `profile.positioning` plus "Come in, I'll show you around."
- Headline: like the board, about 70px on desktop, scaling down on smaller screens.
- Controller rulings on the rest: the tag reads "Taylors" (the content's own name; no new string); `aiTools` stays in content untouched (deleting it is out of scope); hiding bamboo, nón lá and pine below 1280px is accepted; the QR phone scan by the owner stays a merge gate.
