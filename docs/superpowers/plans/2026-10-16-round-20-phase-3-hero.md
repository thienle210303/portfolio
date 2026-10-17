# Round 20 Phase 3 — Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the hero as Hero A: a split layout with a short identity column on the left and a dark terminal card on the right showing `whoami` / `now` / `exploring`, built only from content.

**Architecture:**
- A pure `buildTerminal()` in `src/lib/terminal.ts` turns content fields into terminal tabs, so every value can be tested against the content layer.
- `HeroTerminal` renders those tabs with the existing `Tabs` primitive and types each output out once in CSS.
- `Hero` and `HeroIdentity` are slimmed to: eyebrow, headline, one paragraph, two actions. The margin rail goes.

**Tech Stack:** Next.js 16 server components, existing `Tabs` (client), Tailwind v4, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-10-round-20-redesign-design.md` §3. Design reference: the Hero A board in https://claude.ai/artifact/DtnsC1ZKxmbV4CTmsL3AmE (layout only; its copy is not content).

## Global Constraints

- pnpm only. Strict TS. No new dependency. Semantic aliases only, no literal colours. Blue is never decoration, and there is one primary control. WCAG 2.2 AA in both themes. `src/lib/` never imports from `src/sections/`.
- Every value shown in the terminal is read from `src/content/portfolio.ts`. Nothing is labelled as real source code. `codeTabs` and its "From this site's own source code." strings are deleted.
- Terminal tabs and values, verbatim from spec §3 plus the owner request of 2026-10-11:
  - `whoami`: role, employer, based in, from, focus, cats, and the motto `Practice makes AI.`
  - `now`: what I'm working on now.
  - `exploring`: the `aiTools` list.
- The terminal stays dark in both themes through the `contrast` tone (`tone-contrast`), not through literal colours.
- The output types out once, with CSS steps and no JS timer. Under `prefers-reduced-motion: reduce` it shows complete. The text is in the DOM from first paint, so the reveal is visual only. No layout shift (CLS 0).
- The hero is: eyebrow (role · employer), headline, one short paragraph, two actions ("See my work" → `#tree`, "Book a call"). The margin rail is removed.
- Phase 2 scale targets still hold, as `e2e/scale.spec.ts` checks: the h1 is 40–48 px and ≤ 4 lines at 390, with no min-height floor.
- Copy rules come from `docs/voice.md`. A false comment, doc or copy is an Important finding.
- Worktree `.claude/worktrees/r20-hero`, branch `round-20/hero`.
  - Install with `npm_config_package_lock=true pnpm install`.
  - Use 3130–3139 ports, a throwaway playwright config and `--workers=2`.
  - Kill by exact PID only.
- Merge into `main`. Pushing was pre-approved by Thien for this round on 2026-10-16 ("the rest as well").

## Review Focus

1. **No booking URL configured** (`BOOKING_URL` unset or invalid). "Book a call" must not be a dead link. It falls back to `#contact`. *Test: Task 2, `book a call falls back to #contact`.*
2. **Keyboard on the terminal tabs.** Arrow keys and Home/End move between `whoami` / `now` / `exploring` (the existing `Tabs` contract), and focus is visible on the dark card. *Task 2 runs `e2e/interactions.spec.ts` / `accessibility.spec.ts`.*
3. **Long values at 320 px.** The focus sentence and tool names wrap inside the card with no horizontal overflow. *Covered by `e2e/responsive.spec.ts` overflow at 320–1440.*
4. **Switching tabs after the first typing.** Only `whoami` types, once on load, and switching tabs never re-types. *Test: Task 2, `switching tabs never re-types`: after the load animation, switch to `now` then back to `whoami`; no `[data-type-line]` has a running animation.*
5. **Night theme.** The terminal is still the darkest surface, and its text keeps ≥ 4.5:1. *Task 2 runs axe in both themes and `pnpm contrast`.*

---

### Task 1: Terminal model and card

**Files:**
- Create: `src/lib/terminal.ts`, `src/sections/Hero/HeroTerminal.tsx`
- Modify: `src/content/portfolio.ts`
  - add `profile.motto: "Practice makes AI."` and its type in `src/types/portfolio.ts`;
  - delete `codeTabs` and its type.
- Modify: `src/app/globals.css` (terminal typing keyframes, reduced-motion rule)
- Delete: `src/sections/Hero/HeroCodeArtifact.tsx`
- Test: `tests/lib/terminal.test.ts`. Replace the "hero's code artifact" block in `tests/lib/content.test.ts` with a one-line removal check, or delete it.

**Interfaces:**

```ts
export interface TerminalLine { readonly key: string; readonly value: string | readonly string[] }
export interface TerminalTab { readonly id: "whoami" | "now" | "exploring"; readonly command: string; readonly lines: readonly TerminalLine[] }
export function buildTerminal(): readonly TerminalTab[]
```

Values per tab:

- `whoami`:
  - `role` = `profile.title`
  - `employer` = the current career entry's `organization`
  - `based` = `profile.location`
  - `from` = `origin.from`
  - `focus` = `profile.focus`
  - `cats` = the pet `name`s at `portfolio.ts:~137-145`, in authored order
  - `motto` = `profile.motto`
- `now`:
  - `role` = the current entry's `role`
  - `at` = its `organization`
  - `shipping` = its `headline`
- `exploring`:
  - `tools` = `aiTools.map(t => t.name)`

The "current career entry" is the one whose `dateRange` ends in "Present". If there is more than one, take the latest `sortKey`. If there is none, throw at build time.

`command` is `whoami`, `now` and `ls exploring/`.

`HeroTerminal` (no "use client"; `Tabs` supplies the boundary):
- a `tone-contrast` card holding the existing `Tabs` (`idPrefix="hero-terminal"`, label "Terminal");
- each panel is a `<pre>`-like block that starts with a `$ <command>` prompt line, then one `key: value` line per entry, with arrays shown as `["a", "b"]`;
- each line carries `data-type-line` and a `--line` index for the CSS stagger;
- the card has a title bar with three decorative dots (`aria-hidden`) and the label `thien@portfolio`. That label is decoration, not content, so it is not added to `portfolio.ts`.

Typing:
- `@keyframes term-type` reveals each line with `clip-path: inset(0 100% 0 0)` → `inset(0 0 0 0)` in `steps(28)`, 0.6 s per line, staggered by `--line × 120ms`, `animation-fill-mode: both`.
- It applies only under `@media (prefers-reduced-motion: no-preference)`.
- `Tabs` mounts only the active panel, so a switch re-mounts its panel. Decision: only the first tab (`whoami`) types, once, on page load. Its lines carry `data-type-line`; `now` and `exploring` render complete with no animation. Switching back to `whoami` re-mounts it, so its lines carry the attribute only until the first animation ends: `HeroTerminal` passes `animate` to the panel for the initial render only. If that needs client state, put it in a tiny `"use client"` wrapper around the panel content, not around the whole hero.

- [ ] **Step 1: Write `tests/lib/terminal.test.ts`.**
  - `whoami carries the motto verbatim`: a `whoami` line `motto` === `"Practice makes AI."` === `profile.motto`.
  - `every value is a content string`: for each line, each value (or array element) is `===` one of the source fields named above.
  - `exploring lists every ai tool in order`: equals `aiTools.map(t => t.name)`.
  - `now is the current role`: the `now` line `at` equals DoorDash's `organization`.
  - `throws without a current entry`: mock or inject; implement `buildTerminal(entries = careerEntries)` so it is testable.
  - `no source-code framing`: none of the tab commands or keys contains `.ts`, and nothing contains "source code".
- [ ] **Step 2:** Run `pnpm vitest run tests/lib/terminal.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement the model, the motto field, `HeroTerminal`, and the CSS. Delete `codeTabs` and `HeroCodeArtifact`. Grep for `codeTabs`, `HeroCodeArtifact` and "own source code" and remove every reference, including e2e and docs.
- [ ] **Step 4:** Run the unit tests (PASS) and `pnpm typecheck`.
- [ ] **Step 5: Commit:** `Replace the hero's source excerpts with a terminal built from content`.

### Task 2: Hero A layout

**Files:**
- Modify: `src/sections/Hero/Hero.tsx`, `src/sections/Hero/HeroIdentity.tsx`
- Modify: `src/app/page.tsx` (pass `bookingUrl` to `Hero`, as `DirectLinks` gets it from `validBookingUrl`)
- Modify: `CLAUDE.md` (About bullet: "the hero with the About paragraphs in it" no longer holds), `docs/editing.md` if it mentions the hero code tabs
- Test: `e2e/sections.spec.ts` (or a new `e2e/hero.spec.ts`)

**Interfaces:**
- Produces `Hero({ bookingUrl }: { bookingUrl: string | null })`.
- Eyebrow: `{current entry role} · {current entry organization}`, reusing a small exported helper `currentEntry()` from `src/lib/terminal.ts` (one source of truth with Task 1).
- Headline: `profile.headline`.
- Paragraph: `profile.positioning`. `profile.about` leaves the hero. The field stays, because the résumé and the chat corpus read it. Verify with grep and say so.
- Actions:
  - "See my work" (`href="#tree"`, the page's primary control);
  - "Book a call" (`href={bookingUrl ?? "#contact"}`, quiet style; external links get `rel="noopener noreferrer"` via the existing `ExternalLink` or `Button` pattern).
- Layout:
  - ≥ 1024 px: two columns, identity | terminal, `items-center`, gap ≈ `--gutter`.
  - Below 1024 px: stacked, terminal after identity.
  - The 1360 px breakpoint and its holdover comments go, and so do the rail (`RAIL`, `rail={RAIL}`) and the hairline divider.
  - Keep the `data-hero-step` hooks the load choreography uses and the `data-cat-perch` scroll marker.

- [ ] **Step 1: Write failing e2e tests** at 1440 and 390, day theme:
  - `hero shows role · employer, headline, one paragraph and two actions`: exactly one `p` of body copy in the identity column, `#about a[href="#tree"]` is present, and the "Book a call" link is present.
  - `book a call falls back to #contact`: with the test server's `BOOKING_URL` unset, the href is `#contact`.
  - `hero has no margin rail`: `#about [data-rail]` (or the rail's own marker; check `Section`) has count 0.
  - `terminal sits beside the identity at 1440 and below it at 390`: compare bounding boxes.
  - `terminal is dark in both themes`: the terminal card's computed background is darker than the page ground in day theme. Its luminance is < 0.2 in both themes.
  - `terminal types once and shows complete under reduced motion`: with `reducedMotion: "reduce"`, every `[data-type-line]` has no running animation (`getAnimations().length === 0`) and the text is fully visible.
- [ ] **Step 2:** Run on port 3131. Expected: FAIL.
- [ ] **Step 3:** Implement. Check: `pnpm contrast`; axe in both themes; `scale.spec.ts`; `companion.spec.ts`; `interactions.spec.ts`; `responsive.spec.ts`. The cats still must not rest on hero text.
- [ ] **Step 4:** Take day and night screenshots of the hero at 1440 and 390 and save them to `reports/r20-p3-screens/` (untracked). Look at them and report anything that reads broken.
- [ ] **Step 5: Commit:** `Lay the hero out as identity beside the terminal and drop its rail`.

### Task 3: Verify and record

- [ ] Run `pnpm verify`.
- [ ] Run the full `pnpm test:e2e` (port 3133, `--workers=2`). Retry failures once in isolation, and paste the summary lines.
- [ ] Run `pnpm perf` (0 skipped; JS, JS at load, fonts, LCP, CLS) and `pnpm lag` ×3, with the CPU load beside each. Add `docs/feedback-tracker.md` R20-P3 rows.
- [ ] Write `reports/r20-p3-ledger.md` (untracked): rulings verbatim, deferred minors, numbers.
- [ ] **Commit:** `Record round 20 phase 3`.
