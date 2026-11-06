# SDD ledger — plan: docs/superpowers/plans/2026-10-11-round-20-phase-2-foundation.md
Spec §2. Worktree .claude/worktrees/r20-foundation, branch round-20/foundation, base 2de7b11. Execution: subagent-driven (owner "keep going", same method as Phase 1).

## Preflight scan
| Pair / task | Shared | Finding |
|---|---|---|
| T1–T2 | globals.css, e2e/scale.spec.ts | T1 edits :141-176/:533; T2 edits :131 and adds a case to scale.spec. Disjoint. OK |
| T1–T3 | e2e/scale.spec.ts | T3 adds footer cases. OK |
| T3–T4 | CLAUDE.md, tracker | T4 consumes. OK |
| T1 | self | spacing test uses padding sum; hero floor removal matches spec. OK |
| T2 | self | --font-display kept as name → 13 users unchanged. OK |
| T3 | self | year literal 2026 per spec copy. OK |
| T4 | self | OK |
Scan clean.
Task 1: implementer DONE_WITH_CONCERNS (551e34c). 1440: body 15.9, h2 27.8, h1 48, header 56, content 1120, gap 64. Deviations: body selector → first About paragraph; section h2 step-4→step-3; hero split even at ≥1360; companion e2e fixture covers cats' corner.
Task 1: review Needs fixes (mobile menu top-16 gap; case-study h3/numeral/metrics now ≥ h2; false header/hero comments). Deviations 1–4 accepted by reviewer. Fix round 1 dispatched.
Task 1: minor (deferred): hero 813 px vs 844 bound at 1440×900 — only 31 px headroom (Phase 3 note)
Task 1: minor (deferred): report presents computed body sizes as measured
Task 1: fix round 1/5 (4 addressed, 0 open; commits 551e34c..021a9e1)
Task 1: minor (deferred): decorative case-study numeral at step-3 equals h2 size (aria-hidden, fg-subtle)
Task 1: Ruling: accept the reviewer-approved deviations — body-text selector, section h2 → step-3, even hero split at ≥1360 (holdover for Phase 3), companion e2e cover fixture — cost if wrong: Phase 3 revisits the hero split anyway.
Task 1: complete (commits 2de7b11..021a9e1, review clean)
Task 2: implementer DONE (fddebd0). fonts 223.8 → 72.3 KB; contrast 4.66:1 min; scale.spec 16/3; e2e 129/0. No RED run (needed second build).
Task 2: review Needs fixes (vacuous no-Fraunces-URL assertion — hashed filenames). Ruling: replace with a document.fonts family check and prove it binds — cost if wrong: none. Fix round 1 dispatched.
Task 2: fix round 1/5 (1 addressed + 2 minors trimmed; d95eba6, 97cc532). Proof: case FAILS with Fraunces re-added, PASSES after revert. Re-review by controller (small test/comment diff read).
Task 2: complete (commits 021a9e1..97cc532, review clean)
Task 3: implementer DONE_WITH_CONCERNS (8be58fd). Footer one line; removed Back-to-top; no contrast section remains (companion "stays visible" test now uses #contact deep tone).
Phase 2 regression found: axe target-size fails at 1440 day+night (two cat buttons overlap) — present before Task 3, absent at end of Phase 1 (0 e2e failures) → introduced by P2 Task 1 or 2. Must be fixed before merge.
Task 3: review Needs fixes (contrast.mjs/docs "Contact and Closing" false; AskLoader comment; lost contrast-tone companion coverage). Back-to-top removal accepted (sticky header brand link + skip link remain).
Task 3: Ruling: cover the companion's contrast-tone arm with a syncTone unit test over footer.tone-contrast instead of an e2e walk into the ~50 px footer — cost if wrong: unit test stubs hit-testing, so a real-layout regression in the footer could slip.
Task 3: fix round 1 also carries the axe target-size regression (cats overlap at 1440, introduced in P2 T1/T2) — root-cause fix in placement, not an axe exclusion.
Task 3: fix round 1 (f01fa89 docs/coverage, d2e7c78 axe: follower spawns above lead + detourAround for first 2.5 s); axe+companion 112/0; vitest 1007.
Task 3: fix round 1/5 (3 addressed, 1 open — axe fix wall-clock gated; commits 8be58fd..d2e7c78)
Task 3: Ruling: end the follower's detour on walk state, not a 2.5 s clock, AND make the follower's button pointer-events:none while the two cat targets overlap — fixes the WCAG 2.5.8 overlap a visitor can meet at any time, not just at axe's sample — cost if wrong: during an overlap a click lands on the lead, never the follower.
Task 3: fix round 2 (a2b2da7): state-gated detour, single-target pointer-events rule, per-frame e2e 3/3; axe+companion 113/0.
Task 3: fix round 2/5 (2 addressed (contrast wording, b-stuck checks), open: (a) freeze/watch ordering ends routing early; 24 px mute band mutes whole chase; e2e not a (b)-alone regression; wrap; commits d2e7c78..a2b2da7)
Task 3: Ruling (revises round-2 ruling): mute the follower only on true overlap (gap < 0), not within 24 px — both targets are ≥ 24×24 so 2.5.8 only fails on overlap; the band muted her for the whole chase — cost if wrong: none known.
Task 3: fix round 3/5 (4 addressed, 0 open; commits a2b2da7..c8c8953)
Task 3: carried to Task 4: Companion.tsx:3539-3542 comment names "a scene's stand-still" (no such path; real third hold is stretching) — false comment, fix in Task 4.
Task 3: minor (deferred): long comment lines Companion.tsx:3744, :1528, companion.spec.ts:1010; double blank line ~:218; import order
Task 3: complete (commits 97cc532..c8c8953, review clean)
Task 4: implementer DONE (d7bc64f, 1437cb3). verify ok; e2e 919/767/0; perf JS at load 172.8 KB, fonts 72.3, LCP 2296, CLS 0. lag (1 run, CPU 56→39%): scroll4x 31.4 fps, worst 200 ms — worse than P1 second pass (44 / 133). Cause unisolated → A/B dispatched.
A/B lag (interleaved 3+3, CPU 45–60%): main 36.5 fps (30.1–38.3) vs foundation 29.6 (29.2–31.2); worst 167 vs 217; long tasks 24 vs 47; traces same composition and hot functions.
Ruling: treat the Phase 2 scroll difference as not demonstrated (main's own spread covers it) and merge — this machine can't resolve <20% with 3 runs; a 5–10% effect is not ruled out — cost if wrong: Phase 2 shipped a small scroll regression; re-measure on an idle machine before Phase 5 work.
Task 4: review Needs fixes (false CPU comparability sentence; ledger §2 provenance/footer figures). Fix round 1 dispatched with A/B result.
Task 4: fix round 1/5 (2 addressed, 0 open; b407300 + untracked ledger; footer 53/71.2 sourced to an unsaved read-out script on :3123 @ d7bc64f — disclosed).
Task 4: complete (commits c8c8953..b407300, review clean)
Final review: with fixes (heading weight 400 vs comments/plan 600; no screenshots of the shipped state; stale back-to-top comment; footer with analytics likely > 80 px at 390). Fix wave dispatched (final-fix-brief.md).
Final: Ruling: display headings at Plex Sans 600 (font-semibold) with leading/tracking retuned for Plex — the plan said 600 and Plex Regular at display sizes reads thin — cost if wrong: headings look heavier than the owner wants; one class change to revert.
Final fix wave: daee2a4 24a6442 9ab5144 123ed82 384d3e0 4e355e6 (page scrolled 250–323 px past footer: sr-only summary escaping collapsed code panel; 'relative' fix + e2e). verify 1011; e2e 393/0; footer 71.2/53 px analytics on/off; hero 821 px. Disclosure never a link → spec wording wrong.
Final fix wave re-review: all addressed. minor (deferred): wrap Disclosure's overflow-hidden div in `relative` (general guard); 'page ends at footer' e2e should wait for the chat mount; boundsFor import order.
