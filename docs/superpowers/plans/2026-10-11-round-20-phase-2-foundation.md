# Round 20 Phase 2 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the whole site smaller and denser (type, spacing, width, header), use IBM Plex only, and replace the half-screen footer with one line.

**Architecture:** Mostly token changes in `src/app/globals.css`, which every section already reads. A pinned e2e measures the result at 390 px and 1440 px. Fraunces leaves `layout.tsx`. The `#closing` band is deleted, and the footer collapses to one authored line.

**Tech Stack:** Next.js 16, Tailwind v4 `@theme`, next/font, Playwright, vitest.

**Spec:** `docs/superpowers/specs/2026-10-10-round-20-redesign-design.md` §2.

## Global Constraints

- pnpm only. Strict TS. No new dependency. Semantic colour aliases only. Blue is never decoration. WCAG 2.2 AA.
- Spec §2 targets, binding at 1440 px desktop and 390 px mobile:
  - Body: 15–16 px.
  - Section titles: 24–28 px.
  - Hero headline: 40–48 px.
  - Space between sections: about 64 px on desktop, about 48 px on mobile.
  - Content width: about 1120 px max.
  - Header: ≤ 56 px.
- No section keeps a `100svh` floor, the hero included. The Journey stage's pinned `60svh` acts are out of scope; Phase 5 removes the stage.
- Fonts: IBM Plex Sans + IBM Plex Mono only. Fraunces is removed. JetBrains Mono is not added.
- Footer copy, verbatim, authored in `src/content/portfolio.ts`: `© 2026 Thien Le · Two cats reviewed this code. Both approved.` The name comes from `profile.name`. The analytics disclosure stays as a link on the same line when analytics is on.
- `#closing` (`src/sections/Footer/Closing.tsx`, the `closing` content) is removed.
- Copy rules come from `docs/voice.md`. A false comment, doc or copy is an Important finding.
- Worktree `.claude/worktrees/r20-foundation`, branch `round-20/foundation`.
  - Install with `npm_config_package_lock=true pnpm install`.
  - Use 31xx ports, with a throwaway playwright config and `--workers=2`.
  - Kill by exact PID only.
- Merge into `main`, then ask before pushing.

## Review Focus

1. **Long words and narrow phones (320 px).** Smaller type must not create horizontal overflow, and headings must still wrap. *Covered by `e2e/responsive.spec.ts` overflow at 320–1440, which Task 4 runs in full.*
2. **Night theme and the three tones.** Contrast holds after the font swap; weight changes affect legibility, not the tokens. *Task 4 runs `pnpm contrast` and the axe spec in both themes.*
3. **The sticky header shrinks.** Anchors land below it, not under it, because `scroll-margin` / `--header-h` stay in sync. *Test in Task 1: `nav anchor lands below the header`.*
4. **The cats' safe area reads the header height.** Cats never sit under the shorter header. *Task 1 runs the companion e2e.*
5. **Print.** The footer line and the removed closing don't break `/` print or `/resume`. *Task 3 runs `e2e/print.spec.ts`.*

---

### Task 1: Scale tokens, width and header

**Files:**
- Modify: `src/app/globals.css:141-176` (`--step-*`, `--section-y`, `--header-h`), `:533-539` (`.shell` max-width)
- Modify: `src/components/layout/SiteHeader.tsx:21` (`h-16` → a height of 56 px, read from `--header-h`)
- Modify: `src/sections/Hero/Hero.tsx:88` (drop the `min-h-[calc(100svh…)]` floor and its comment)
- Create: `e2e/scale.spec.ts`

**Interfaces:** Produces the rescaled tokens. Every later task and phase sizes against them.

New token values:

| Token | New value | Size range |
|---|---|---|
| `--step--2` | unchanged | |
| `--step--1` | unchanged | |
| `--step-0` | `clamp(0.9375rem, 0.92rem + 0.08vw, 1rem)` | 15–16 px |
| `--step-1` | `clamp(1.0625rem, 1.02rem + 0.2vw, 1.1875rem)` | |
| `--step-2` | `clamp(1.25rem, 1.18rem + 0.3vw, 1.5rem)` | |
| `--step-3` | `clamp(1.5rem, 1.42rem + 0.35vw, 1.75rem)` | 24–28 px, section titles |
| `--step-4` | `clamp(1.75rem, 1.6rem + 0.6vw, 2.25rem)` | |
| `--step-5` | `clamp(2.5rem, 2.25rem + 1.1vw, 3rem)` | 40–48 px, hero h1 |
| `--section-y` | `clamp(1.5rem, 1.1rem + 1.4vw, 2rem)` | |
| `--header-h` | `3.5rem` | |
| `.shell` max-width | `calc(1120px + 2 * var(--gutter))` | |

Sections contribute `--section-y` on both sides, so the gap between sections is 48–64 px.

Update the comments on each token you change so they are true: the "6.5rem ceiling" and "4.25rem" histories become one line each.

- [ ] **Step 1: Write `e2e/scale.spec.ts`.** Run it at 1440×900 and 390×844 in day theme. Each assertion has a tolerance of ±0.5 px.
  - `body text is 15–16px`: computed `font-size` of the first `#about p` is in [15, 16].
  - `section titles are 24–28px`: the `h2` in `#worlds`, `#tree` and `#contact` is in [24, 28].
  - `hero headline is 40–48px`: the `#about h1` at 1440 is in [40, 48]. At 390 it is ≤ 48, and its line count is ≤ 4 (`height / line-height`).
  - `header is at most 56px`: `header` `getBoundingClientRect().height` ≤ 56.
  - `content is at most 1120px wide`: the widest `.shell` content box (`clientWidth` minus padding) at 1440 is ≤ 1120.
  - `sections are about 64px apart on desktop, 48 on mobile`: `#worlds`'s computed `padding-bottom` + `#tree`'s `padding-top` is in [56, 72] at 1440 and [40, 56] at 390.
  - `hero has no full-screen floor`: at 1440×900, the `#about` height is less than 900 − 56.
  - `nav anchor lands below the header`: click the nav "Contact" link. The `#contact` heading's top is ≥ the header's bottom.
- [ ] **Step 2:** Run the spec on port 3120 against a fresh build. Expected: FAIL (body 16–17, h2 up to 46, header 64, …).
- [ ] **Step 3:** Change the tokens, `.shell`, the header and the hero as listed.
  - Tie the header height to the token (`h-[var(--header-h)]`) so the two cannot drift.
  - Grep `src/` for sizes that bypass the scale and break the targets: `text-[`, `text-4xl`/`5xl`/`6xl`, `min-h-[`, `py-24`/`py-32`, `leading-` with large rem values. Fix only those inside the four sections, the header and the footer. List each change in the report.
- [ ] **Step 4:** Run `scale.spec.ts` (PASS). Run `responsive.spec.ts`, `navigation.spec.ts` and `companion.spec.ts` on 3120 (PASS; companion flake: retry once).
- [ ] **Step 5:** Take day and night screenshots of each section at 1440 and 390 and save them to `reports/r20-p2-screens/` (untracked). Commit: `Shrink the type scale, section spacing, width and header to the round 20 targets`.

### Task 2: IBM Plex only

**Files:**
- Modify: `src/app/layout.tsx:2`, `:52-65` (remove the Fraunces import, the call and its `variable` on `<html>`)
- Modify: `src/app/globals.css:131` (`--font-display` → the Plex Sans variable, then the existing sans fallbacks)
- Test: `e2e/scale.spec.ts` (add a case)

**Interfaces:** `--font-display` stays as a name, so the 13 files that use `font-display` keep working, but it now resolves to Plex Sans.

Display text uses weight 600, which is already loaded. If a `font-display` element relied on Fraunces axes (`font-variation-settings` with `opsz`, `SOFT` or `WONK`), remove those settings. Grep for them.

- [ ] **Step 1: Add the test** `headings use IBM Plex Sans`: the computed `font-family` of `#about h1` and `#worlds h2` starts with the Plex Sans family name that next/font emits. Read it from `body`'s computed `font-family` and compare the first family. Also, no network response URL contains "Fraunces" (case-insensitive) during load.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Remove Fraunces and repoint `--font-display`. Rewrite the `layout.tsx` font comment block so it says only what is true now: Plex Sans and Mono, and why the weights are listed.
- [ ] **Step 4:** Run the spec (PASS). Run `pnpm perf` on 3121 (0 skipped). The fonts KB must fall from 223.8 KB; record the number.
- [ ] **Step 5: Commit:** `Set the whole site in IBM Plex and drop Fraunces`.

### Task 3: One-line footer, no closing band

**Files:**
- Modify: `src/content/portfolio.ts` (add `footerLine`; delete `closing` at ~:1526-1545)
- Modify: `src/components/layout/SiteFooter.tsx`
- Delete: `src/sections/Footer/Closing.tsx`. Modify `src/app/page.tsx:5`, `:62`.
- Modify: tests that reference `closing` / `#closing`: `tests/lib/content.test.ts`, `tests/ui/SiteFooter.test.tsx`, `e2e/{ask,axe,companion,print}.spec.ts` (update their selectors; never weaken an unrelated assertion)
- Modify: the `Companion.tsx:~4870` comment that names the Closing section; `src/app/layout.tsx:46` comment

**Interfaces:**
- Produces `export const footerLine = "Two cats reviewed this code. Both approved." as const;` in `portfolio.ts`.
- `SiteFooter` renders exactly `© 2026 ${profile.name} · ${footerLine}`, plus ` · <analytics disclosure link>` when `analyticsEnabled()`, in one `<footer>` (contentinfo).
- Keep the existing year source if it computes the year; otherwise keep 2026 literal as today.
- The footer has no email or social links; Contact carries them.

- [ ] **Step 1: Write failing tests.**
  - In `tests/ui/SiteFooter.test.tsx`:
    - `renders the one-line footer`: the text content equals `© 2026 Thien Le · Two cats reviewed this code. Both approved.` with analytics off.
    - `appends the analytics disclosure when on`.
    - `has no email or social links`: no `a[href^="mailto:"]`, and no `a` to GitHub or LinkedIn.
  - In `e2e/scale.spec.ts`:
    - `footer is one line under 80px`: the `footer` height is < 80 at 1440 and 390.
    - `no closing band`: `#closing` count is 0.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Delete `Closing.tsx` and the `closing` content. Remove what becomes unused: `SiteFooter`'s now-unused imports and any CSS only `#closing` used. Grep for `closing`.
- [ ] **Step 4:** Run the tests, `pnpm typecheck`, and the `print`, `axe`, `companion` and `ask` e2e specs on 3122 (PASS).
- [ ] **Step 5: Commit:** `Replace the closing band and footer with one line`.

### Task 4: Verify, record, document

**Files:** `docs/feedback-tracker.md` (R20-P2 rows), `CLAUDE.md` (the About bullet "its height a floor rather than one screen" → no floor; any line naming Fraunces or a serif), `reports/r20-p2-ledger.md` (untracked)

- [ ] **Step 1:** Run `pnpm verify` (includes `pnpm contrast`).
- [ ] **Step 2:** Run the full `pnpm test:e2e` on 3123 (throwaway config, `--workers=2`). Retry each failure once in isolation, and report raw counts.
- [ ] **Step 3:** Run `pnpm perf` (0 skipped): record JS, JS at load, fonts KB, LCP, CLS and DOM nodes. Run `pnpm lag` once. Record the CPU load beside both.
- [ ] **Step 4:** Update the tracker and CLAUDE.md, then commit `Record round 20 phase 2`. The controller merges after the final review.
