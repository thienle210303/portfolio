# SDD ledger — plan: docs/superpowers/plans/2026-10-16-round-20-phase-3-hero.md
Spec §3. Worktree .claude/worktrees/r20-hero, branch round-20/hero, base d2eb5aa. SDD skill dir: C:/Users/thien/AppData/Roaming/Claude/rpm/6ad9374e/ee19dcaf/plugin_01JETPTMWTgidsotmEhVkQTG/skills/subagent-driven-development
Push pre-approved for this round (Thien 2026-10-16 "the rest as well").

## Preflight scan
| Pair / task | Shared | Finding |
|---|---|---|
| T1–T2 | src/lib/terminal.ts (currentEntry), HeroTerminal | T2 consumes currentEntry() and HeroTerminal; T1 must export currentEntry. OK — noted in T1 dispatch |
| T1–T2 | typing-once test | Review Focus 4 test lives in T2's e2e; T1 implements the mechanism. OK |
| T2–T3 | tracker | OK |
| T1 | self | buildTerminal(entries = careerEntries) for testability; motto field added. OK |
| T2 | self | bookingUrl fallback #contact; rail removal. OK |
Ruling: T1 also exports `currentEntry(entries = careerEntries)` from src/lib/terminal.ts — the plan's T2 Interfaces name it but T1's block doesn't — cost if wrong: none.
Task 1: implementer DONE (9405587). vitest 1006; e2e specs edited but not run (Task 2 runs them). TypeOnce.tsx client wrapper, module-level typed flag. Concerns: tab labels uppercase via Tabs; CodeBlock compact now unused; Hero height comments stale.
Task 1: review Needs fixes (globals.css LCP-guard comment false). Fix round 1 dispatched with test-tightening minors. minor (deferred): ask.spec 'both themes' check deleted (axe covers); CodeBlock compact prop now unused.
Task 1: fix round 1/5 (5 addressed, 0 open; commits 9405587..e381dee)
Task 1: carried to Task 2: stale comments globals.css:135-136, tests/ui/CodeBlock.test.tsx:126, AskThisSite.tsx:27,505, AskLoader.tsx:14, ask-live-config.ts:11 (hero "Ask Thien" tab / code artifact); e2e/sections.spec.ts:31 title; CodeBlock "no product caller".
Task 1: complete (commits d2eb5aa..e381dee, review clean)
Task 2: implementer DONE_WITH_CONCERNS (69f852d). LCP = hero h1 (4/4). Hero 466 px @1440×900. Full e2e 946/2 fail (companion :698, :754 @1440 — regression, passes on e381dee).
Task 2: Ruling: companion regression must be fixed in the companion before merge, tests untouched.
Task 2: Ruling: résumé stays reachable by adding "Résumé" to Contact's DirectLinks now (hero keeps the spec's two actions) — cost if wrong: Phase 6 restyles it anyway.
Task 2: Ruling: re-point profile.philosophy's chat citation from About to Contact (it no longer renders in #about) — false citation otherwise.
Task 2: Ruling: night terminal a shade lighter than the night ground is accepted (passes the dark-card test) — cost if wrong: owner may want it darker; one alias swap.
Task 2: rulings done (07da969 companion: routing off during requested-scene walk; bce9d59 résumé in DirectLinks; 766d95b philosophy cite → Contact). companion @1440 3×55/0; ask/contact/hero/fragments/axe 152/0. Full suite not re-run (Task 3).
Task 2: review Needs fixes (content.test.ts:226 false comment). Fix round 1 dispatched incl. non-mutating routing skip + detourAround unreachable-target guard + dead rail path. Owner notes: Book-a-call fallback lands on #contact with no booking link when BOOKING_URL unset; DoorDash named 3× in hero view.
Task 2: fix round 1/5 (5 addressed, 0 open; commits 766d95b..d8ff8b2)
Task 2: carried to Task 3: detourAround guard float edge — ~4% of non-integer lead x make the trailing seat test as inside → unrouted frame; add epsilon to the guard.
Task 2: complete (commits e381dee..d8ff8b2, review clean)
Task 3: implementer DONE_WITH_CONCERNS (5d36963 epsilon 0.25 px; ec67513 record). verify 1007; e2e 949/791/0; perf JS 227.6 KB (+25.4 — globe chunk now prefetches at 412×823 since hero shrank), JS at load 172.9, LCP h1 2404 ms, CLS 0; lag 22/16/16 fps at 95–100% CPU.
Task 3: Ruling: accept the post-load globe prefetch as the new JS-total baseline (off the load path; JS at load unchanged) and switch CLAUDE.md's leak-detector guidance to `JS at load` — cost if wrong: a leak that only shows in the 8 s total would be missed; the globe chunk never loads before `load`, so a leak into the initial bundle still shows in JS at load.
Task 3: follow-up 8699491 (CLAUDE.md leak detector → JS at load; tracker baseline note; CodeBlock.tsx:53 stale line).
Ruling: Task 3 (docs/measurements + a 1-line epsilon with its own unit test) is reviewed inside the final whole-branch review rather than a separate task review — its diff is small and the final reviewer reads the same files — cost if wrong: one fewer independent look at the docs.
Task 3: complete (commits d8ff8b2..8699491, reviewed in final review)
Final review: with fixes (detourAround edge parks follower ~5%; about-paragraph citations false; stale comments/numbers). Fix wave dispatched.
Final fix wave: 6e10474 (1 px shared box; stepping test 0/1001 park), 48aae14, 962f436, 6079c67. verify 1008; e2e 322/0; companion @1440 2×55/0.
Fix wave re-review: all addressed.
Final: parked — follower can visibly pass through the lead on the "from across, level or below" detour route (~19 px overlap for a few frames; pre-existing since Phase 2; pointer mute covers WCAG) — Ruling: deferred to a later companion pass, not load-bearing for Phase 4 — cost if wrong: a brief visual overlap at spawn in some placements.
