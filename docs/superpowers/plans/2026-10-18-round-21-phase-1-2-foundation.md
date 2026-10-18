# Round 21 Phases 1–2 — Foundation, and Removing Worlds — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase 1 swaps the Blueprint palette and IBM Plex for the outdoors palette (day and night) and Bricolage Grotesque / Courier Prime / Newsreader, keeping every component on the semantic aliases. Phase 2 deletes the Worlds section, the globe and everything only it used, and `#worlds` lands on `#about`.

**Architecture:**
- **Palette.** The raw tokens in the first `@theme` block of `src/app/globals.css` are replaced. The theme/tone machinery (`--q-*` / `--l-*` sets, `.tone-*` scopes, the night block and its no-JS media-query twin) stays as it is.
- **Aliases.** `--accent` becomes moss: links, measured values, annotation. Two aliases are added: `--control` (moss-deep, the one primary control's fill) and `--mark` (red, the single mark). `--accent-strong` is deleted, because only the primary control's hover used it.
- **Fonts.** `next/font/google` keeps the variable names `--font-sans` and `--font-mono` (the `@theme inline` self-reference depends on them) and adds `--font-serif` for the Newsreader italic.
- **Phase 2** is pure deletion plus one retired anchor: a zero-size `#worlds` span at the top of the hero, listed in `src/sections/Hero/anchors.ts` the way the Journey's are listed in `src/sections/CareerTree/anchors.ts`.

**Tech Stack:** Next.js 16.3 (`next/font/google`), Tailwind v4 `@theme`, vitest, Playwright + axe-core, `scripts/contrast.mjs`, `scripts/perf.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-18-round-21-outdoors-design.md` §1 Foundation, §2 Remove Worlds, the global rules at its top, "Checks per phase" and "Owner answers".

## Global Constraints

- **Unchanged rules:** pnpm only, strict TS, Tailwind v4 `@theme`, no new runtime dependency, no 3D library, semantic aliases only, WCAG 2.2 AA, every fact from `src/content/portfolio.ts`, the day/night toggle kept (every change checked in both), and retired anchors stay in the server HTML.
- **Day palette (spec, verbatim):**
  - Lichen ground `#E4E8E0`
  - paper `#FBFBF8`
  - ink `#1D2321`
  - muted `#56605A`
  - moss `#46603A`
  - moss-deep `#1F3A30` (the one primary control per screen)
  - twine `#8B7B5E`
  - hairline `#C9D0C8`
  - red `#C8102E` (one mark per screen: the stamp, the selected tag, the route)
  - The flag's red `#DA251D` and yellow `#FFDD00` appear only inside the Vietnam flag and its stamp.
- **Night palette (shown to the owner on the canvas):**
  - ground `#141A17`
  - paper/card `#222B26`
  - raised `#26302A`
  - ink/fg `#E4E9E3`
  - muted `#A3AEA6`
  - moss `#8FB27E`
  - primary control bg `#A8C99A` with label `#141A17`
  - twine `#A8977A`
  - red mark `#FF7A85`
  - hairline `#3A4741`
- **Contrast is the judge.** If any pairing fails, adjust the lighter or darker token of that pair as little as possible until it passes, and record the final value in the tracker. A changed night value goes back to the owner before Phase 1 merges. (Pre-computed: every pairing in Task 1 passes as given, with the lowest at 4.52:1.)
- **Hex is lowercase in CSS.** `scripts/contrast.mjs` only parses `#[0-9a-f]{6}`, so an uppercase hex is silently not measured.
- **Rule replacing "Blue is the only hue" (spec, verbatim):** "moss-deep is the primary control, red is the single mark, the flag colours live only in the flag."
- **Contrast floor:** every pairing ≥ 4.5:1 in both themes, `pnpm contrast` passing.
- **Fonts (spec, verbatim):** self-hosted through `next/font/google`, not a runtime dependency: Bricolage Grotesque (display and body), Courier Prime (tags, dates, data), Newsreader italic (annotations only). IBM Plex is dropped.
- **Worlds (spec, verbatim):** "`#worlds` joins the retired ids and lands on `#about`." `navItems` is About, Journey, Contact until Phase 5 adds Record.
- **Voice (spec):** `docs/voice.md` gains "every word is me talking to you", covering chat questions, suggestion chips and empty states.
- **`src/lib/` never imports from `src/sections/`.**
- **Retrieval eval floors:** recall@1 0.70, @3 0.90, @5 0.95, MRR 0.80. Never lower a floor, and never tighten the answer gate to make one pass (see the `watchFor` history in CLAUDE.md).
- **Checks per phase:**
  - `pnpm verify`
  - `pnpm test:e2e` (both themes, all tones, keyboard, reduced motion, 320–1440 px overflow)
  - `pnpm perf`, with the `JS at load` row recorded
  - screenshots in both themes into `reports/r21-p<n>-screens/` (untracked)
- **Testing:** a false comment, doc or copy line is an Important finding.
- **Workspace:**
  - Phase 1: worktree `.claude/worktrees/r21-foundation`, branch `round-21/foundation`, ports 3170–3174.
  - Phase 2: worktree `.claude/worktrees/r21-remove-worlds`, branch `round-21/remove-worlds` (cut from `main` after Phase 1 merges), ports 3175–3179.
  - Install with `NPM_CONFIG_PACKAGE_LOCK=true pnpm install --frozen-lockfile`.
  - For e2e, use a throwaway `playwright.r21.config.ts` (never committed) that spreads `playwright.config.ts` and sets `use.baseURL` to the dev port and `webServer: undefined`. Run with `--workers=2`, and retry a failure once in isolation before believing it.
  - Kill processes by exact PID only.
- **Merge:** one merge per phase into `main`. Pushing after each phase is pre-approved by the owner.

## Review Focus

1. **Night with JavaScript off.** The `prefers-color-scheme: dark` twin of `:root[data-theme="night"]` must declare exactly the same properties. Drift there gives no-JS dark visitors a third palette. *Test: Task 1, `the no-JS night block matches the stamped one`.*
2. **Vietnamese diacritics.** "Kiên Giang, Việt Nam" must render in Bricolage, not a fallback face mid-word. Courier Prime has no `vietnamese` subset, so ệ in a mono line falls back; that is recorded as an open question, not fixed here. *Test: Task 3, `Bricolage covers ệ`.*
3. **320 px with wider faces.** Courier Prime's advance is wider than Plex Mono's, and the uppercase mono eyebrows, rail labels and terminal lines are where overflow appears first. *Test: Task 3 runs `e2e/responsive.spec.ts` at all six widths.*
4. **An old `/#worlds` link with JavaScript off.** It must resolve, as `:target`, to an element inside `#about`. It must not be a dead fragment that merely happens to show the top of the page. *Test: Task 6, `#worlds lands a scriptless browser on About`.*
5. **"Where is he from?" after the stop documents go.** The chat must still answer origin questions from About's origin document. *Test: Task 5, `origin questions still cite About`.*

---

## Phase 1 — Foundation

### Task 1: Outdoors palette, aliases and contrast

**Files:**
- Modify: `src/app/globals.css`:
  - first `@theme` block (lines 23–44)
  - `@theme inline` aliases (78–88)
  - the `:root` / night / media-query blocks (194–331)
  - the alias block (351–380)
  - the palette and `.blueprint-grid` comments that name blue
- Modify: `scripts/contrast.mjs` (PAIRINGS, doc template: title, scope notes, "Known tight spots")
- Regenerate: `docs/contrast.md`
- Create: `tests/lib/palette.test.ts`
- Modify: `CLAUDE.md` ("The design system" section)
- Modify: `README.md` (Design system, alias table, Colour and contrast)

**Interfaces:**
- Produces raw tokens (lowercase hex):
  - Day: `--color-lichen` `#e4e8e0`, `--color-lichen-deep` `#dfe3da` (**Assumed**, not in the spec: the `deep` tone's half-step ground), `--color-paper` `#fbfbf8`, `--color-ink` `#1d2321`, `--color-muted` `#56605a`, `--color-moss` `#46603a`, `--color-moss-deep` `#1f3a30`, `--color-hairline` `#c9d0c8`, `--color-red` `#c8102e`.
  - Night: `--color-dusk` `#141a17`, `--color-dusk-deep` `#1a211d` (**Assumed**), `--color-dusk-card` `#222b26`, `--color-dusk-raised` `#26302a`, `--color-dusk-ink` `#e4e9e3`, `--color-dusk-muted` `#a3aea6`, `--color-dusk-moss` `#8fb27e`, `--color-dusk-control` `#a8c99a`, `--color-dusk-hairline` `#3a4741`, `--color-dusk-red` `#ff7a85`.
  - Twine (`#8b7b5e` / `#a8977a`) and the flag colours are **not** added here. They never carry text, so contrast has nothing to measure, and their first consumer is Phase 3's clothesline and field tag. That phase adds them with a `--twine` alias.
- Produces aliases (and Tailwind colours via `@theme inline`): `--control` → `bg-control` / `border-control`, and `--mark` → `text-mark` / `border-mark`.
- `--accent-strong` survives this task, pointing at the `--control` value, so `Button` keeps rendering; Task 2 deletes it.
- Alias mapping:

  | Alias | Day quiet | Day loud (`tone-contrast`) | Night quiet | Night loud |
  |---|---|---|---|---|
  | ground | lichen (deep: lichen-deep) | ink | dusk (deep: dusk-deep) | dusk-card |
  | surface | paper | dusk-card | dusk-card | dusk-raised |
  | fg | ink | paper | dusk-ink | dusk-ink |
  | fg-muted, fg-subtle | muted | dusk-muted | dusk-muted | dusk-muted |
  | fg-inverse (label on control) | paper | dusk | dusk | dusk |
  | accent, ring-color | moss | dusk-moss | dusk-moss | dusk-moss |
  | control | moss-deep | dusk-control | dusk-control | dusk-control |
  | mark | red | dusk-red | dusk-red | dusk-red |
  | rule-color | hairline | dusk-hairline | dusk-hairline | dusk-hairline |

  - `fg-subtle` collapses onto muted because the spec gives no third text tone.
  - The grids are retinted from the accent at the same alphas: `--q-grid` `rgba(70, 96, 58, 0.06)` by day, `rgba(143, 178, 126, 0.07)` by night; `--l-grid` `rgba(143, 178, 126, 0.08)` / `0.09`.
  - The code scrims stay as they are.

- [ ] **Step 1: Write the failing test** `tests/lib/palette.test.ts`. It parses `globals.css` the way `scripts/contrast.mjs` does.
  - `day palette is the spec's`: the first `@theme` block's `--color-*` map contains every day token above with exactly those values.
  - `night palette is the owner's dusk set`: the same check for the night tokens.
  - `no Blueprint token survives`: none of `blue`, `blue-deep`, `blue-bright`, `slate`, `slate-soft`, `mist`, `mist-soft`, `night`, `night-card`, `night-raised`, `line`, `line-night`, `card`, `paper-deep`.
  - `registers control and mark as Tailwind colours`: the `@theme inline` block contains `--color-control: var(--control)` and `--color-mark: var(--mark)`.
  - `every tone scope sets control and mark`: the `:root, .tone-base, .tone-deep` rule and the `.tone-contrast` rule each declare `--control:` and `--mark:`.
  - `the no-JS night block matches the stamped one`: the declarations inside `:root[data-theme="night"] { … }` equal, as a set, those inside `@media (prefers-color-scheme: dark) { :root:not([data-theme="day"]) { … } }`.
  - `no component reads a raw palette token`: no file under `src/` other than `globals.css` contains `var(--color-<name>)` for any token name in the map.
- [ ] **Step 2:** Run `pnpm test tests/lib/palette.test.ts`. Expected: FAIL (`--color-lichen` undefined).
- [ ] **Step 3: Rewrite `PAIRINGS` in `scripts/contrast.mjs`** to exactly these rows (bg, fg, use). Day loud reuses the dusk tokens on an ink ground, as Blueprint did.
  - Day quiet:
    - `lichen` with `ink`, `muted`, `moss`, `red`
    - `lichen-deep` with `ink`, `muted`, `moss`, `red`
    - `paper` with `ink`, `muted`, `moss`, `red`
    - `moss-deep`/`paper` (primary control label)
    - `moss`/`paper` (primary control, hover)
  - Day loud:
    - `ink` with `paper`, `dusk-muted`, `dusk-moss`, `dusk-red`
    - `dusk-card` with `paper`, `dusk-muted`
    - `dusk-control`/`dusk` (control label)
    - `dusk-moss`/`dusk` (control hover)
  - Night quiet:
    - `dusk` with `dusk-ink`, `dusk-muted`, `dusk-moss`, `dusk-red`
    - the same four on `dusk-deep` and on `dusk-card`
    - `dusk-control`/`dusk`
    - `dusk-moss`/`dusk`
  - Night loud: `dusk-raised` with `dusk-ink`, `dusk-muted`, `dusk-moss`, `dusk-red`.
  - Template:
    - Retitle the document "Contrast — outdoors palette".
    - Add one line: twine and hairline never carry text and are not measured here.
    - Rewrite "Known tight spots" for `red` on `lichen-deep` (4.52:1) and `red` on `lichen` (4.74:1). Red is the first thing to re-check if the ground moves.
- [ ] **Step 4:** Run `pnpm contrast`. Expected: exit 1 with `--color-lichen is no longer defined in globals.css`.
- [ ] **Step 5: Implement the tokens, aliases and scopes in `globals.css`** per the Interfaces table.
  - Keep the palette as the **first** `@theme` block.
  - Point `--accent-strong` at `--control`'s value in every scope, and say in a comment that Task 2 removes it.
  - Rewrite every comment that describes blue, Blueprint's "cool paper" or the 4.66:1 floor so it states the new palette and the current lowest pairing.
- [ ] **Step 6:** Run `pnpm contrast && pnpm test tests/lib/palette.test.ts`. Expected:
  - `✓ 40 pairings, all >= AA. Lowest 4.52:1` (or the recorded minimum after an adjustment)
  - palette tests PASS
- [ ] **Step 7: Docs.**
  - In `CLAUDE.md`, the design-system heading becomes `("The Pass, outdoors")`. The "Blue is the only hue" bullet is replaced by the spec's rule, plus one line on which alias carries what: `--accent` for links, measured values and annotation; `--control` for the one primary control; `--mark` for the single mark. "Check tertiary tones against `--color-paper-deep`" becomes `--color-lichen-deep`.
  - In `README.md`: update the alias table (add `--control` and `--mark`; `--fg-inverse` becomes "label on a `--control` fill"), the Blueprint intro paragraph and "Colour and contrast".
- [ ] **Step 8: Commit:** `Swap the Blueprint palette for the outdoors one, day and night`.

### Task 2: The one primary control fills with `--control`

**Files:**
- Modify: `src/components/ui/Button.tsx:88-104` (primary recipe and its comment)
- Modify: `src/sections/Contact/LeadForm.tsx:218-225`
- Modify: `src/app/resume/page.tsx:75`
- Modify: `src/app/globals.css` (delete `--accent-strong` and `--color-accent-strong` from every scope)
- Modify: `tests/lib/palette.test.ts`
- Modify: `tests/ui/Button.test.tsx`, `tests/sections/Hero.test.tsx:58-76`, `tests/sections/Contact.test.tsx:17-19,61`, `tests/ui/SiteHeader.test.tsx`, `tests/sections/ProjectRecording.test.tsx:76`
- Modify: `e2e/contact.spec.ts:310-331`
- Modify: the blue-naming comments in `src/components/layout/SiteHeader.tsx`, `src/components/companion/CompanionToy.tsx`, `src/components/companion/CatIcon.tsx`, `src/sections/CareerTree/MetricHighlights.tsx`, `src/sections/CareerTree/JourneyHighlights.tsx`, `src/sections/CareerTree/OriginStory.tsx` and `docs/editing.md:27` ("large and blue")

**Interfaces:**
- Consumes `--control`, `--fg-inverse` and `--accent` from Task 1.
- Produces the primary recipe:
  - at rest: `border-[color:var(--control)] bg-[color:var(--control)] text-[color:var(--fg-inverse)]`
  - on hover: `hover:border-[color:var(--accent)] hover:bg-[color:var(--accent)]`, with the label unchanged
  - the keyline `after:` classes stay as they are
- `LeadForm` and `resume/page.tsx` use the same recipe through the `bg-control` / `border-control` / `hover:bg-accent` utilities.
- Tests recognise "the primary fill" by `/(^|\s)bg-control(\s|$)/` or `/(^|\s)bg-\[color:var\(--control\)\](\s|$)/`.

- [ ] **Step 1: Write the failing tests.**
  - `Button.test.tsx`: `primary fills with --control and labels with --fg-inverse` (className matches both). `secondary and quiet never fill with --control`.
  - `palette.test.ts`: `accent-strong is gone` (no `--accent-strong` and no `--color-accent-strong` anywhere in `globals.css`).
  - Update to the control regex, then rename:
    - `Hero.test.tsx` → `fills only See my work with the control colour`
    - `Contact.test.tsx` → `ACCENT_FILLS` → `CONTROL_FILLS`
    - `SiteHeader.test.tsx` → `draws "Let's talk" as an outline, not a control fill`
    - `ProjectRecording.test.tsx`
    - `e2e/contact.spec.ts` → `the page's only control fills are the hero's See my work and the lead form's Send`, still `toEqual(["See my work", "Send"])`
- [ ] **Step 2:** Run `pnpm test tests/ui tests/sections tests/lib/palette.test.ts`. Expected: FAIL on the new assertions.
- [ ] **Step 3:** Implement the recipe in the three places and delete `--accent-strong`. Rewrite the listed comments so none claims a blue hue. The "blue cat" coat in `companions` is a content fact and stays, as does the cat-fancy note in `CompanionCat.tsx`.
- [ ] **Step 4:** Run `pnpm test` and `pnpm typecheck`. Expected: PASS.
- [ ] **Step 5: e2e.** Start `pnpm dev -p 3170` in the worktree. Then run `pnpm exec playwright test -c playwright.r21.config.ts --workers=2 e2e/contact.spec.ts e2e/axe.spec.ts`. Expected: PASS. axe checks the hover-free state; hover contrast is covered by the `moss`/`paper` and `dusk-moss`/`dusk` pairings.
- [ ] **Step 6:** Run `grep -rniE "blue" src docs/editing.md README.md CLAUDE.md`. Expected: only `blueprint-grid` (class name, kept until the Phase 3 hero replaces it), and the cats' coat lines (`companions[].coat`, `CompanionCat.tsx`). Fix any other hit.
- [ ] **Step 7: Commit:** `Fill the one primary control with moss-deep through --control`.

### Task 3: Bricolage Grotesque, Courier Prime and Newsreader

**Files:**
- Modify: `src/app/layout.tsx:1-34,153` (imports, loaders, `className`)
- Modify: `src/app/globals.css` (font `@theme inline` block and its comment, around lines 90–116; the Plex Mono tabular-digits comment around line 653)
- Modify: `src/components/ui/SectionHeading.tsx:23` (comment)
- Modify: `e2e/scale.spec.ts:26-46`
- Modify: `README.md:44` (Fonts row)

**Interfaces:**
- `Bricolage_Grotesque({ subsets: ["latin"], display: "swap", variable: "--font-sans" })`. The font is variable, so `weight` is omitted, and so is `axes` (only `wght` ships).
- `Courier_Prime({ weight: ["400", "700"], subsets: ["latin"], display: "swap", variable: "--font-mono" })`. It is static, so a `font-semibold` mono line resolves to the 700 file.
- `Newsreader({ style: "italic", subsets: ["latin"], display: "swap", preload: false, variable: "--font-serif" })`. It is not preloaded because it is annotation-only and never a Largest Contentful Paint candidate.
- `globals.css` registers `--font-serif: var(--font-serif), Georgia, "Times New Roman", serif;` in the same `@theme inline` block, with the same self-reference caveat as `--font-sans` / `--font-mono`. Later phases use `font-serif italic`.
- `--font-display` stays an alias of `--font-sans`.
- The API was checked against `node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md` and `font-data.json`:
  - Bricolage Grotesque: variable, 200–800, subsets `latin`, `latin-ext`, `vietnamese`.
  - Courier Prime: 400/700, `latin` and `latin-ext` only.
  - Newsreader: variable, with italic, includes `vietnamese`.

- [ ] **Step 1: Write the failing e2e** in `e2e/scale.spec.ts`, replacing `headings use IBM Plex Sans`:
  - `headings use Bricolage Grotesque`: the first family of `body`, `#about h1` and `#worlds h2` contains `"Bricolage Grotesque"`. In Phase 2, `#worlds h2` becomes `#tree h2` (Task 6).
  - `data uses Courier Prime`: the first family of the first `.eyebrow` contains `"Courier Prime"`.
  - `Newsreader is declared, and IBM Plex is not`: `[...document.fonts].map(f => f.family)` includes a family matching `/newsreader/i`, and none matches `/plex/i` or `/fraunces/i`.
  - `Bricolage covers ệ`: `(await document.fonts.load('16px "Bricolage Grotesque"', "ệ")).length > 0`. If this fails with `subsets: ["latin"]`, add `"vietnamese"` to Bricolage's subsets. Record which one held, and the extra font bytes, in the tracker.
- [ ] **Step 2:** Run `pnpm exec playwright test -c playwright.r21.config.ts --workers=2 e2e/scale.spec.ts`. Expected: FAIL (`IBM Plex Sans`).
- [ ] **Step 3:** Implement the loaders. Rewrite the `layout.tsx` and `globals.css` comments to name the new faces and why each has its weight list.
- [ ] **Step 4:** Run `pnpm typecheck && pnpm build`. Expected: PASS.
- [ ] **Step 5:** Run `pnpm exec playwright test -c playwright.r21.config.ts --workers=2 e2e/scale.spec.ts e2e/responsive.spec.ts e2e/print.spec.ts`. Expected: PASS at all six widths. If 320 px overflows, fix the overflowing element's wrapping (`wrap-anywhere`, `min-w-0`). Never shrink the type scale to fit.
- [ ] **Step 6: Commit:** `Set the site in Bricolage Grotesque, Courier Prime and Newsreader`.

### Task 4: Phase 1 close-out

**Files:** `docs/voice.md`, `docs/feedback-tracker.md`. `reports/r21-p1-screens/` stays untracked.

- [ ] **Step 1:** In `docs/voice.md`, add rule 7 under the existing six: "**Every word is me talking to you.** All copy, including chat questions, suggestion chips and empty states, is first person ("What do you do at DoorDash?", "Ask me")." Source: the Round 21 spec. The copy that rule changes is rewritten in the phases that own it (the chips in Phase 6).
- [ ] **Step 2:** Run `pnpm verify`. Expected: 5/5. The retrieval eval is unchanged from R20-P6 (recall@1 70.0%, @3 93.3%, @5 96.7%, MRR 0.807), because no content moved.
- [ ] **Step 3:** Run the full `pnpm exec playwright test -c playwright.r21.config.ts --workers=2` against `pnpm dev -p 3171`. Expected: 0 failed after one isolated retry per failure. Record the counts.
- [ ] **Step 4: Screenshots.** Every section at 1440 and 390, day and night, into `reports/r21-p1-screens/`. Look at each one and report anything that reads wrong. Check in particular:
  - the `tone-contrast` terminal card and first highlight card by day
  - the footer in both themes
  - the focus ring on lichen
- [ ] **Step 5: Perf.** Run `pnpm build`, start `PORT=3172 pnpm start` (background, note its PID), then run `PERF_URL=http://localhost:3172/ pnpm perf`. Requirements:
  - 0 skipped responses.
  - Baseline is R20-P6 at `50d0907`: JS 223,555 B, JS at load 169,235 B, fonts 72.3 KB.
  - Expected: JS at load within ±2 KB, since no JS changed.
  - The fonts figure moves with the new faces. Record it, and the Bricolage subset decision from Task 3.
- [ ] **Step 6:** Add `## Round 21 phase 1 (date) — foundation` to `docs/feedback-tracker.md`. Include:
  - the R21-P1 perf row, in R20-P6's prose format
  - the verify and e2e counts
  - the lowest contrast pairing
  - any token that contrast forced off its owner-approved value
- [ ] **Step 7: Commit:** `Record round 21 phase 1`.
- [ ] **Step 8:** If any night value changed in Task 1, send the screenshots to the owner and wait. Otherwise merge `round-21/foundation` into `main` and push (pre-approved).

---

## Phase 2 — Remove Worlds

Cut `round-21/remove-worlds` from `main` after Phase 1 merges. Before touching anything, run `pnpm test tests/lib/answers-retrieval.test.ts` and record the four eval figures as this phase's baseline.

### Task 5: The chat stops citing Worlds

**Files:**
- Modify: `src/lib/answer-corpus.ts:10,238-253` (drop the `buildStops` import and the stop-document loop)
- Modify: `src/content/answer-expansion.ts:324-327,385-389` (drop the two `stop-*` subject expansions and the `worlds` section expansion, with its comment)
- Modify: `tests/lib/answers.test.ts:13,58-61` (drop `buildStops` from the indexed-text list)

**Interfaces:** no `CorpusDocument` has `sectionId: "worlds"`, and nothing under `src/lib/answer*` imports `@/lib/origin-stops`.

- [ ] **Step 1: Write the failing tests** in `tests/lib/answers.test.ts`.
  - `no document cites Worlds`: `buildDocuments().filter(d => d.sectionId === "worlds")` is `[]`.
  - `origin questions still cite About`: for each of `"where is he from"`, `"is he from vietnam"` and `"when did he move to the US"`, the top answer's `sectionId` is `"about"` and its text contains `origin.from`.
- [ ] **Step 2:** Run `pnpm test tests/lib/answers.test.ts`. Expected: FAIL on `no document cites Worlds`.
- [ ] **Step 3:** Delete the loop, the expansions and the test import.
- [ ] **Step 4:** Run `pnpm test tests/lib/answers.test.ts tests/lib/answers-retrieval.test.ts`. Expected: PASS, with all four floors held.
  - Recall@1 sat exactly on 0.70 at R20-P6. If a floor fails, find the case that moved (the scoreboard prints ranks).
  - Fix it on the index surface: put the lost vocabulary on the surviving document that should win, for example `"việt nam"` / `"kien giang"` on About's `origin` label in `answer-corpus.ts:175-190`.
  - Never lower a floor or raise the coverage gate.
  - Record before/after figures for the tracker.
- [ ] **Step 5: Commit:** `Stop indexing the globe's stops in the chat`.

### Task 6: Worlds leaves the page; `#worlds` lands on About

**Files:**
- Modify: `src/app/page.tsx` (drop `Worlds`; rewrite the section-order comment for three sections, with Record arriving in Phase 5)
- Modify: `src/content/portfolio.ts:200-212` (`navItems` without `nav-worlds`; rewrite the comment)
- Create: `src/sections/Hero/anchors.ts`
- Modify: `src/sections/Hero/Hero.tsx` (render the retired span)
- Modify: `src/components/companion/companion-tour.ts:55-73` (`GREY_MIDDLE = ["tree"]`; rewrite the comment)
- Modify: `src/components/companion/companion-dialogue.ts:173-178` (delete `TOUR.worlds`)
- Modify: `src/lib/companion-facts.ts` (delete `worlds` from `CompanionFacts` and from `buildCompanionFacts`, and the `origin-stops` import)
- Modify: `src/components/companion/Companion.tsx:2187,2585,4644` (comments)
- Tests:
  - `tests/lib/content.test.ts:410-415`
  - `tests/sections/Hero.test.tsx`
  - `tests/lib/companion-tour.test.ts:79-83`
  - `tests/lib/companion-dialogue.test.ts:28,36,78,260`
  - `tests/lib/companion-facts.test.ts:26-28`
- E2E:
  - `e2e/legacy-anchors.spec.ts`
  - `e2e/scale.spec.ts` (`#worlds h2` → `#tree h2`)
  - `e2e/sections.spec.ts:537-538` (read in `#tree`)
  - `e2e/contact.spec.ts:313-318` (drop the globe wait)
  - `e2e/axe.spec.ts`:
    - delete the replay helper (≈ lines 78–83), `with the globe landed and a stop chosen`, and `the globe's stops`, with its `buildStops` import
    - retarget `Worlds (#worlds, tone deep)` → `Contact (#contact, tone deep) has zero WCAG violations`
    - retarget the night `deep and contrast tones` audit from `#worlds` to `#contact`
  - `e2e/companion.spec.ts`:
    - retarget `explorers use both halves of the page while the reader is active` and `each explorer leaves its stop on its own clock, not both at once` from `#worlds` to `#tree`, which is also mood-less
    - delete `never rests on the globe stage, loaded or not`
    - in the two tour tests, `stop N of 4` → `of 3`, and rename `walks all four stops` → `walks all three stops`

**Interfaces:**
- `src/sections/Hero/anchors.ts` exports `export const ABOUT_LEGACY_SECTION_IDS = ["worlds"] as const;`. A comment in the file says the list only grows, and that Phase 3's new hero must keep rendering it.
- `Hero` renders `{ABOUT_LEGACY_SECTION_IDS.map(id => <span key={id} id={id} aria-hidden="true" className="sr-only scroll-mt-20" />)}` as the first child inside `<Section id="about">`, the same pattern as `CareerTree.tsx:122`.
- `CompanionFacts` becomes `{ about; tree; contact }`.

- [ ] **Step 1: Write the failing tests.**
  - `content.test.ts`: `lists exactly About, Journey and Contact` → `["about", "tree", "contact"]`.
  - `Hero.test.tsx`: `carries the retired #worlds anchor`. `container.querySelector("#about #worlds")` is not null, has `aria-hidden="true"` and a class matching `scroll-mt-20`. `ABOUT_LEGACY_SECTION_IDS` equals `["worlds"]`.
  - `companion-tour.test.ts`: both routes' middle is `["tree"]`.
  - `companion-dialogue.test.ts`: `FACTS` has no `worlds`, `TOUR_ONLY_SECTIONS = ["contact"]`, and `sceneFor("tour", "worlds", FACTS)` is `null`.
  - `companion-facts.test.ts`: `"worlds" in facts` is `false`.
  - `legacy-anchors.spec.ts`:
    - add `...ABOUT_LEGACY_SECTION_IDS` to `ALL_LEGACY_IDS`, and its length to the count assertion
    - new test `#worlds lands a scriptless browser on About`:
      - `goto("about:blank")`, then `goto("/#worlds")`
      - `#about #worlds` has count 1
      - `page.evaluate(() => document.querySelector(":target")?.id)` is `"worlds"`
      - `#about` is in the viewport
      - `#tree` is not
- [ ] **Step 2:** Run `pnpm test` (expected: FAIL on the above). Then, against `pnpm dev -p 3175`, run `pnpm exec playwright test -c playwright.r21.config.ts --workers=2 e2e/legacy-anchors.spec.ts`. Expected: FAIL (`#worlds` is a section, not inside `#about`).
- [ ] **Step 3:** Implement. `src/sections/Worlds/` stays on disk but is unimported after this task.
- [ ] **Step 4:** Run `pnpm verify`. Expected: PASS.
- [ ] **Step 5:** Run `pnpm exec playwright test -c playwright.r21.config.ts --workers=2 e2e/legacy-anchors.spec.ts e2e/scale.spec.ts e2e/sections.spec.ts e2e/contact.spec.ts e2e/axe.spec.ts e2e/companion.spec.ts e2e/navigation.spec.ts`. Expected: PASS, retrying companion flakes once in isolation.
  - If the explorer tests behave differently in `#tree`, report what was measured.
  - Do not loosen their thresholds.
- [ ] **Step 6: Commit:** `Take Worlds off the page; #worlds now lands on About`.

### Task 7: Delete what only the globe used

**Files:**
- Delete:
  - `src/sections/Worlds/` (all ten files: `Worlds.tsx`, `WorldsStage.tsx`, `GlobeCanvas.tsx`, `coastline-data.ts`, `gestures.ts`, `glyphs.ts`, `palette.ts`, `settle.ts`, and `gl/` with `context`, `robot`, `shaders`, `sphere`, `coastline-texture`)
  - `src/lib/globe.ts`, `src/lib/origin-stops.ts`
  - `public/globe/`
  - `scripts/bake-coastline.ts`, `scripts/png.ts`
  - `e2e/worlds.spec.ts`
- Delete these tests:
  - `tests/lib/`: `coastline-data`, `coastline-png`, `coastline-texture`, `gl-context`, `globe-palette`, `globe`, `origin-stops`, `robot`, `settle`, `sphere`
  - `tests/sections/`: `GlobeCanvas.motion`, `GlobeCanvas.texture`, `WorldsStage.autoplay`, `WorldsStage`
- Modify:
  - `package.json` (drop `bake:coastline`)
  - `tsconfig.json:33` (drop the exclude entry)
  - `src/content/portfolio.ts:101-147`:
    - delete `originStops` and `origin.coordinates` with their comments (only the globe and `crossingKm` read them)
    - keep the rest of `origin`, which the hero, the origin story, the résumé and the chat read
  - `src/types/portfolio.ts`: delete `GeoPoint`, `OriginStops` and `Origin.coordinates`
  - `tests/lib/origin-story.test.ts:262-286`: delete `carries coordinates…` and `keeps latitudes…`; rename the describe to `origin`
  - comments that would now be false: `src/lib/answers.ts:52`, `src/lib/knowledge-tree.ts:316`, `src/components/companion/scene-names.ts:4`, `src/sections/CareerTree/KnowledgeTreeList.tsx:46`, `src/content/portfolio.ts:108-113`
  - `scripts/perf.mjs:17` ("globe-chunk leak detector" → what it catches now: anything fetched on idle)
  - `scripts/lag.mjs`: drop `worlds` from `SECTIONS`, and the Worlds-entry block (lines 156–177) with its `worldsEntryWorstTaskMs` field and header lines
  - `scripts/screenshots.mjs:48-58`: drop `worlds`
  - `CLAUDE.md`:
    - "The page is four sections" becomes three, with Record coming in Phase 5
    - add `#worlds` to the retired ids, landing on `#about` via `src/sections/Hero/anchors.ts`
    - replace "### The globe" with a short paragraph: the globe and its WebGL engine were removed in Round 21 because the hero's clothesline now tells the crossing, so the globe was redundant, and it was the heaviest code on the page; it is in git history; there is still no 3D library
    - rewrite the `pnpm perf` paragraph in "Before calling anything done": `JS at load` is the primary leak detector; drop the globe-chunk baseline note
  - `README.md`: Worlds in the intro, the content table row and the rail example (`CareerTree.tsx` only)
  - `docs/editing.md`: line 9 row, line 11 note, lines 185–201
- Leave `docs/feedback-tracker.md`, old plans and specs, and the history comment in `vitest.config.mts:42` as they are.

**Interfaces:** none produced. After this task, nothing references `@/lib/globe`, `@/lib/origin-stops`, `sections/Worlds`, `coastline`, `crossingKm`, `buildStops`, `originStops` or `GeoPoint`.

- [ ] **Step 1: Write the failing check.** Add `tests/lib/no-globe.test.ts` with one test, `nothing under src, scripts, e2e or tests names the globe engine`. It reads every `.ts`, `.tsx`, `.mjs` and `.css` file under those four directories (excluding itself) and expects no match for `/@\/lib\/globe|origin-stops|sections\/Worlds|coastline|crossingKm|buildStops|originStops|GeoPoint|bake:coastline/`. It also expects `existsSync("public/globe")` to be `false`.
- [ ] **Step 2:** Run `pnpm test tests/lib/no-globe.test.ts`. Expected: FAIL, listing the files.
- [ ] **Step 3:** Delete and edit per the file list.
- [ ] **Step 4:** Run `pnpm test tests/lib/no-globe.test.ts && pnpm verify`. Expected: PASS. The eval figures match Task 5's, since no indexed text changed.
- [ ] **Step 5:** Run `grep -rniE "globe|worlds" src scripts e2e tests README.md docs/editing.md CLAUDE.md`. Expected hits only:
  - the `globe` cat icon (`CatIcon.tsx`, used by the flight beat)
  - the `#worlds` retired-anchor lines (`Hero/anchors.ts`, `legacy-anchors.spec.ts`, `Hero.test.tsx`, `companion-dialogue.test.ts`'s `null` assertion)
  - CLAUDE.md's removal note
  - `no-globe.test.ts` itself

  Every other hit is a stale comment: fix it.
- [ ] **Step 6: Commit:** `Delete the globe, its engine and everything only it used`.

### Task 8: Phase 2 close-out

- [ ] **Step 1:** Run `pnpm verify`. Expected: 5/5, with the four eval figures recorded.
- [ ] **Step 2:** Run the full e2e suite against `pnpm dev -p 3176` with `--workers=2`. Expected: 0 failed after one isolated retry each.
- [ ] **Step 3:** Take screenshots at 1440 and 390, day and night, into `reports/r21-p2-screens/`. Confirm the hero is followed directly by the Journey, and that the nav reads About, Journey, Contact.
- [ ] **Step 4: Perf.** Run `pnpm build`, then `PORT=3177 pnpm start`, then `PERF_URL=http://localhost:3177/ pnpm perf`, with 0 skipped responses.
  - Compare against R21-P1. Expected: JS (8 s total) and JS at load both drop. The globe chunk (about 25 KB per CLAUDE.md) leaves the total, and the `WorldsStage` client code leaves JS at load.
  - Any rise is a finding: investigate it before recording.
  - Note DOM nodes and LCP.
- [ ] **Step 5:** Add `## Round 21 phase 2 (date) — Worlds removed` to the tracker, with:
  - the R21-P2 perf row and its deltas against R21-P1
  - the eval before/after from Task 5
  - the e2e counts
  - the deleted line count (`git diff --stat main...HEAD | tail -1`)
- [ ] **Step 6: Commit:** `Record round 21 phase 2`.
- [ ] **Step 7:** Merge `round-21/remove-worlds` into `main` and push (pre-approved).
