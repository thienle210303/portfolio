# Round 20 Phase 3 (Hero) ledger

Branch round-20/hero, base d2eb5aa. Commits: 9405587, e381dee (Task 1), 69f852d, 07da969, bce9d59, 766d95b, d8ff8b2 (Task 2), 5d36963 (detourAround edge epsilon), then `Record round 20 phase 3` (tracker rows).

## Per task
- Task 1 (9405587, fix round e381dee): hero code excerpts replaced by a terminal built from `portfolio.ts` (`src/lib/terminal.ts`, tabs whoami / now / exploring); typing once via CSS steps (`TypeOnce.tsx` client wrapper, module-level typed flag); `codeTabs` and the "From this site's own source code." line deleted.
- Task 2 (69f852d, fixes 07da969, bce9d59, 766d95b, d8ff8b2): hero laid out as identity beside the terminal, margin rail removed, eyebrow / headline / paragraph / two actions; companion fix so a requested scene's follower reaches her seat; résumé link moved to Contact; philosophy citation re-pointed to Contact; `detourAround` unreachable-target guard.
- Task 3 (5d36963 + record commit): detourAround guard given a quarter-pixel epsilon (non-integer lead x put the trailing seat a float hair inside the edge, ~4% of frames), unit test added; verify, full e2e, perf, lag x3, tracker rows.

## Rulings (verbatim from progress.md)
Ruling: T1 also exports `currentEntry(entries = careerEntries)` from src/lib/terminal.ts — the plan's T2 Interfaces name it but T1's block doesn't — cost if wrong: none.
Task 2: Ruling: companion regression must be fixed in the companion before merge, tests untouched.
Task 2: Ruling: résumé stays reachable by adding "Résumé" to Contact's DirectLinks now (hero keeps the spec's two actions) — cost if wrong: Phase 6 restyles it anyway.
Task 2: Ruling: re-point profile.philosophy's chat citation from About to Contact (it no longer renders in #about) — false citation otherwise.
Task 2: Ruling: night terminal a shade lighter than the night ground is accepted (passes the dark-card test) — cost if wrong: owner may want it darker; one alias swap.

## Deferred minors
- ask.spec "both themes" check deleted (axe covers both themes).
- `CodeBlock` `compact` prop now unused ("no product caller").
- Stale comments carried from Task 1 to Task 2: globals.css:135-136, tests/ui/CodeBlock.test.tsx:126, AskThisSite.tsx:27,505, AskLoader.tsx:14, ask-live-config.ts:11, e2e/sections.spec.ts:31 title (Task 2 "tidied round 20 leftovers" in d8ff8b2; not re-audited in Task 3, unknown whether all are gone).

## Numbers
- `pnpm verify` 5/5: 1007 unit tests, 59 files; contrast 31 pairings, lowest 4.66:1.
- Full e2e (`:3133`, `--workers=2`): 949 passed, 791 skipped, 0 failed, no retries.
- `pnpm perf` (0 skipped): JS 227.6 KB, JS at load 172.9 KB, fonts 72.3 KB, CSS 14.1 KB, LCP 2404 ms (h1#hero-heading), TBT 1363 ms, CLS 0, 2996 DOM nodes. JS +25.2 KB (25,836 B) over R20-P2 because the globe chunk now prefetches (`#worlds` top 834 px at 412x823, inside the observer's 100% rootMargin); JS at load +83 B.
- `pnpm lag` x3: fps 22.3 / 16.3 / 15.9; worst frame 267 / 283 / 267 ms; long tasks 83 / 122 / 125. CPU 95-100% throughout, so not comparable with earlier rows. Full table in docs/feedback-tracker.md.

## Owner notes
- Book a call falls back to `#contact` (no booking link) when `BOOKING_URL` is unset.
- DoorDash is named three times in the hero view.
- The night terminal is a shade lighter than the night ground (accepted by ruling; one alias swap if Thien wants it darker).
- The perf JS column jumped because the hero got shorter; decide whether the globe prefetch should be gated differently (e.g. smaller rootMargin) or the new JS baseline accepted.
