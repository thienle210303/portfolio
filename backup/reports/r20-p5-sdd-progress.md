# SDD ledger — plan: docs/superpowers/plans/2026-10-17-round-20-phase-5-journey.md
Spec §5. Worktree .claude/worktrees/r20-journey, branch round-20/journey, base 071f81a. Push pre-approved.

## Preflight scan
| Pair / task | Shared | Finding |
|---|---|---|
| T1–T2 | CareerTree.tsx | T1 renders highlights above the stage; T2 rearranges blocks. OK |
| T1–T2 | #journey-entry-<id> hrefs | T1 links to ids T2 creates; T1 e2e for the jump lives in T2. OK |
| T2–T3 | WatchOrigin/[data-origin-host], DrawnTree | T2 keeps the tree static inside [data-origin-host]; T3 wraps it in TreeBox. OK |
| T2 | self | ids move from Stage spans to rows + work-<id> main scope — duplicate-id risk if the tree still renders CaseStudy; T2 removes BranchPanel case studies. OK |
| T3 | self | scale-to-fit vs natural height decided by measurement, recorded. OK |
Ruling: DrawnTree loses its branch panels/case studies (the timeline owns impact, chips and case studies; branch labels link to rows) — spec gives the timeline those details and two copies would duplicate the work-<id> ids — cost if wrong: desktop visitors lose in-tree detail cards; the row is one click away.
Ruling: act-* anchors are deleted — nothing links to them and CLAUDE.md's retired-id list doesn't include them — cost if wrong: an external link to #act-* lands at the page top.
Ruling: the tree box and "See how it grows" are ≥1024 px only, like the drawing today — cost if wrong: phone visitors don't see the tree grow.
Task 1: implementer DONE_WITH_CONCERNS (1f8104c). vitest 968; no lint/browser/contrast yet (Task 2/4 run e2e+axe).
Task 1: review Needs fixes (first-card focus ring 2.1:1 in day; misplaced comment; figure trace too loose; Schaeffler label misattributes lift; bento leaves empty cells). Fix round 1 dispatched.
Task 1: fix round 1/5 (5 addressed, 1 open — hasToken escaping; 1f8104c..449c8b2)
Task 1: fix round 2/5 (1 addressed, 0 open; 514a593; controller read the 1-line diff + false-case tests).
Task 1: minor (deferred): no rendered focus-contrast measurement (structural guard only); no accessible-name test.
Task 1: complete (commits 071f81a..514a593, review clean)
Task 2: implementer DONE_WITH_CONCERNS (9420cbd). verify 937; e2e brief specs 347/0 after content-integrity fixes; companion 76/0. anchors.ts deleted. Concerns: JS-off second in-page link collapses previous row; same-highlight re-click doesn't reopen a closed row; arrivedAge() test-only.
Task 2: review Needs fixes (screenshots.mjs clicks removed button; same-link re-click lands on closed row; 4 stale comments/docs). Legacy anchors judged equal-or-stronger. Fix round 1 dispatched. minor (deferred): arrivedAge() test-only; JS-off second-link collapse accepted; docs/voice.md cites ACTS title historically.
Task 2: fix round 1/5 (4 addressed, 0 open; commits 9420cbd..1815f5e)
Task 2: complete (commits 514a593..1815f5e, review clean)
Task 3: implementer DONE_WITH_CONCERNS (c9cabc4). Tree natural height 1,986 px @1440; scale-to-fit to 720 fails WCAG target size → natural height; button landed on trunk tip while growth plays ~1,100 px lower.
Task 3: Ruling: the tree box is a fixed-height scroll container (≈min(720px, 80svh)) holding the full-size tree; play scrolls the CONTAINER to the ground then follows the growth front upward on each beat (stops if the visitor scrolls it); the button scrolls the page to centre the box then plays — matches spec's "fixed-height box" and the owner's "don't make the user hunt" without page scroll-jacking or WCAG-shrinking the tree — cost if wrong: a nested scroll area on desktop.
Task 3: Ruling: delete OriginStory's unreachable reduced-motion storyboard — cost if wrong: none (unreachable).
Task 3: ruling round done (9a1f11a): fixed-height scroll container, follow-growth, storyboard deleted. e2e all green; JS at load +0.7 KB; lag −2.4 fps avg vs base (worst frame/long tasks same or better).
Task 3: Ruling: accept losing WatchOrigin's "Loading…"/failure copy — the box auto-plays and a failed chunk just leaves the finished tree visible, which is the honest fallback — cost if wrong: a press during a slow chunk load gives no feedback for a moment.
Task 3: review Needs fixes (click-to-advance stops the follow; 4 false comments incl. vacuous phone test). Fix round 1 dispatched. Note: companion.spec allows one cat asleep during a mounted stage (documented).
Task 3: fix round 1/5 (6 addressed, 0 open; commits 9a1f11a..35e1b7f)
Task 3: complete (commits 1815f5e..35e1b7f, review clean)
Task 4: DONE_WITH_CONCERNS (6e08c04). verify 942; eval unchanged (r@1 on floor); e2e 963/711/0; JS at load −104 B; DOM 2902→2135; LCP 1564 ms; lag (CPU 4–10%) 40–44 fps vs P4 44–46, worst 133–167 vs 117–150, tree rest busy 6.5–9.1% (sample lands on the auto-playing box), about rest ~15% (unexplained).
Ruling: Task 4 reviewed inside the final review — cost if wrong: one fewer look at the tracker rows.
Task 4: complete (commits 35e1b7f..6e08c04, reviewed in final review)
Final review: with fixes (I1 overlay swallows branch links during auto-play; I2 tracker lag explanation false; I3 vacuous TreeBox waits). Fix wave dispatched with A/B + per-section lag bands.
Final fix wave: a9c7b9c, 542da26, 53ed5a6 (links pass through; no auto-play when pointer/focus inside), 19244fb (lag per-section bands), 8914285 (tracker rewrite). A/B ae0cdc6 vs HEAD: Journey same; Worlds slower every pair (28→22–24 fps); about rest busy up (8–9%→11–12.5%) — trace: PaintArtifactCompositor ~2×, mostly from the tree box scroll container even off screen.
Ruling: fix both perf regressions before merge (owner's #1 complaint was lag) — content-visibility/near-viewport overflow on the tree box first, trace Worlds — cost if wrong: another fix round.
Correction (final fix wave): the Task 4 line's "(sample lands on the auto-playing box)" is false — at rest #tree leaves ~17% of the box in view (under the 50% gate) and scroll4x resets the dwell every frame, so the box never played in a lag sample. The ae0cdc6 A/B (final-fix-report.md) puts the about-rest rise on the off-screen box scroller (compositor update) and the Worlds-band slowdown on timeline paint.
Fix wave 2: 00aea8f/278b7e1 (box content-visibility:hidden + overflow:clip when >200 px from viewport and no show), d5241ac/2977f07 (timeline + case studies skip paint far off screen ≥1024), 4ab5050 docs. Traces: about compositor 131–138 → 68–71 ms/5s; Worlds paint 84–87 → 41–69 ms. A/B fps re-run BLOCKED: machine at 92–100% CPU (other project).
Ruling: accept the far-off-screen tree drawing leaving the a11y tree/tab order — every drawing link duplicates a timeline row — cost if wrong: screen-reader browse mode finds the "Career tree" region empty until scrolled near.
Ruling: merge on trace evidence; the idle-machine fps A/B moves to Phase 6's verify step — the machine is saturated by another project — cost if wrong: a residual Worlds fps regression ships one phase longer.
Fix wave 3: 587696e (clear data-far before the player mounts; e2e red on 4ab5050, green now; stale sentences fixed). Controller read the 4-line fix. Lag A/B still open → Phase 6 verify.
