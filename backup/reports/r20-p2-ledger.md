# R20 Phase 2 ledger (foundation)

## Per task
- Task 1 (551e34c..021a9e1): type/spacing/width/header rescale to spec §2; hero floor removed; review fix round for mobile menu gap, case-study sizes, false comments.
- Task 2 (..97cc532): IBM Plex Sans + Mono only, Fraunces removed; fonts 223.8 -> 72.3 KB; document.fonts family assertion proven to bind.
- Task 3 (..c8c8953): footer is one line, #closing and Back-to-top removed; companion cats' overlapping buttons fixed (state-gated detour, follower muted only on true overlap); contrast-tone arm pinned by a syncTone unit test.
- Task 4: comment fixes (hold list, re-wraps, double blank), verification, tracker rows, CLAUDE.md About bullet.

## Measured §2 targets
Sources: [A] read-out script run against the production build of d7bc64f on :3123 (computed font sizes, getBoundingClientRect; throwaway script, output in task-4-report.md session, not kept). [B] Task 1 report (task-1-report.md, 551e34c). [C] e2e/scale.spec.ts bound passing in the full e2e run on :3123 (919 passed, 0 failed); bounds only, no value read.
| Target | 1440 | 390 |
|---|---|---|
| body 15-16 px | 15.9 [B] | within bound [C] |
| section titles 24-28 px | h2 27.76 [A] | h2 24.09 [A] |
| hero headline 40-48 px | h1 48 [A] | h1 40.29 [A] |
| header <= 56 px | 56 [A] | 56 [A] |
| content <= 1120 px | 1120 [B]; bound passes [C] | widest element 390 = viewport [A] |
| section gap ~64 / ~48 | 64 [B]; bound passes [C] | bound passes [C] |
| hero no 100svh floor | #about 813 px, below 900 - 56 [A] | 1576 px [A] |
| footer one line < 80 px | 53 [A] | 71.2 [A] |

## Rulings (verbatim from progress.md)
Task 1: Ruling: accept the reviewer-approved deviations — body-text selector, section h2 → step-3, even hero split at ≥1360 (holdover for Phase 3), companion e2e cover fixture — cost if wrong: Phase 3 revisits the hero split anyway.
Task 2: review Needs fixes (vacuous no-Fraunces-URL assertion — hashed filenames). Ruling: replace with a document.fonts family check and prove it binds — cost if wrong: none. Fix round 1 dispatched.
Task 3: Ruling: cover the companion's contrast-tone arm with a syncTone unit test over footer.tone-contrast instead of an e2e walk into the ~50 px footer — cost if wrong: unit test stubs hit-testing, so a real-layout regression in the footer could slip.
Task 3: Ruling: end the follower's detour on walk state, not a 2.5 s clock, AND make the follower's button pointer-events:none while the two cat targets overlap — fixes the WCAG 2.5.8 overlap a visitor can meet at any time, not just at axe's sample — cost if wrong: during an overlap a click lands on the lead, never the follower.
Task 3: Ruling (revises round-2 ruling): mute the follower only on true overlap (gap < 0), not within 24 px — both targets are ≥ 24×24 so 2.5.8 only fails on overlap; the band muted her for the whole chase — cost if wrong: none known.

## Deferred minors
Task 1: minor (deferred): hero 813 px vs 844 bound at 1440×900 — only 31 px headroom (Phase 3 note)
Task 1: minor (deferred): report presents computed body sizes as measured
Task 1: minor (deferred): decorative case-study numeral at step-3 equals h2 size (aria-hidden, fg-subtle)
Task 3: minor (deferred): import order (the long comment lines and the double blank line were fixed in Task 4, d7bc64f)

## Lag A/B (main 7dfe59e vs foundation 1437cb3, interleaved 3+3, same machine)
Median scroll4x fps 36.5 vs 29.6 (main 30.1-38.3, foundation 29.2-31.2), worst frame 167 vs 217 ms, long tasks 24 vs 47. Traces: same style/layout/paint/commit and hot functions. Verdict: not a demonstrated regression (main's spread covers the gap); a 5-10% effect is not ruled out. Full report: ab-lag-report.md in the SDD folder.
