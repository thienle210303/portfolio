# SDD ledger — plan: docs/superpowers/plans/2026-09-30-round-18-plan-b-about-and-contact.md

Spec: docs/superpowers/specs/2026-09-30-round-18-design.md (§4, §7, §10).
Worktree: D:\Project\portfolio\.claude\worktrees\plan-b, branch round-18/plan-b, base d1ae75b.
Owner instruction 2026-10-04: "start round 18 plan B" + "keep going until nothing left" (then Plan C).
Plan written 2026-09-30, BEFORE Plan A + companion rounds shipped — preflight staleness scan dispatched (opus) → preflight.md.
Preflight (OPUS) → preflight.md: plan is stale in places (fabricated code excerpts in T1; T7 would put the chat engine in
  initial JS; T2/T7 double-delete; several plan tests unpassable; name-optional breaks the API; HeroAbout deletion orphans
  positioning/focus corpus docs). Rulings R1–R16 written to rulings.md (binding on every dispatch). Summary:
Ruling 1: T1 excerpts verbatim from real files + substring test — plan's excerpts are fabricated. Cost if wrong: none.
Ruling 2: T1 chess tab swapped for an in-repo excerpt — engine.py not on disk. Cost: one tab differs from spec's example.
Ruling 3: order 1→3→4→5→6→7→2; T7 owns AskThienHeroTab. Cost: none.
Ruling 4: T7 keeps a lazy chat boundary + perf row. Cost: one extra file.
Ruling 5: server values read in page.tsx, passed as props; bookingUrl must be https. Cost: none.
Ruling 6-9: T2 one-place facts, keep positioning/focus truthful, demote hero "Explore my work" to non-blue (spec §4),
  clean buildKnowledgeTree fully incl. docs. Cost if wrong (R8): one button's colour.
Ruling 10: QuickConnect removed (spec §7). Cost if wrong: restore one component.
Ruling 11: DirectLinks only carries what BusinessCard lacks. Cost: none.
Ruling 12: name stays required. Cost: none (API contract).
Ruling 13-14: tests in tests/sections/; explicit e2e ownership per task.
Ruling 15: résumé PDF NOT replaced (personal document — owner's explicit OK needed); surfaced at the end.
Ruling 16: implementers edit CLAUDE.md only where their task makes a line false.
Task 1: dispatched (SONNET) BASE d1ae75b with rulings R1/R2/R13/R14/R16.
Ruling 15 REVISED by Thien: use the Downloads résumé PDF (verify 2.8M present, no phone number) in Task 5.
Ruling 15 REVISED by Thien: use the Downloads résumé PDF (verify 2.8M present, no phone number) in Task 5.
Task 1: implemented (c13ccba; verify 700; e2e 116+13 on prod). Tabs: globe project / worlds honesty test / concurrentWith; uniform source line. Review dispatched (SONNET).
Task 1: review (SONNET) — spec ✅, Approved; all three excerpts byte-identical. Minors (deferred): substring test accepts
  mid-line fragments; uniform "source" line adds nothing per tab; honesty excerpt keeps its 2-space indent.
Task 1: complete (commits d1ae75b..c13ccba, review clean). Carry: hero tab labels are now "The globe"/"The rule"/"The overlap".
Task 3: dispatched (SONNET) BASE c13ccba.
Task 3: implemented (7cb721e; verify 707; new tests 7/7 red first). Added withCaseStudyReferral; committed an incidental docs/contrast.md rewrite. Review dispatched (SONNET).
Task 3: review (SONNET) — spec ✅; 1 Important: mailto-length test uses lengths below the API maxima. Fix round 1 dispatched.
Ruling 17: Task 4 moves buildMailtoHref + buildReason into src/lib/ as pure functions and the mailto test calls them
  directly (removing the stand-in) — Task 4 rewrites the form anyway. Cost if wrong: one small move.
Task 3: minor (deferred): withCaseStudyReferral matches the literal "\n\nBest,"; a future sign-off change silently appends after it.
Task 3: fix round 1/5 (1 addressed, 0 open; 7cb721e..820cc9e) — re-review done by controller (diff is test constants + true comment).
Task 3: complete (commits c13ccba..820cc9e, review clean)
Task 4: dispatched (OPUS — form rewrite with companion contracts, both delivery modes, e2e) BASE 820cc9e, carries Ruling 17.
Task 4: implemented (6eadbae; verify 725; new tests red first; contact e2e 59/0, companion+axe+print 140/0 on prod; checked both themes). Calls beyond brief: company/reason fields removed, no scroll/focus on intent pick, API callback branch removed, send label same in both modes + described note. Review dispatched (OPUS).
Task 4: review (OPUS) — spec ✅; 2 Important: false docs/editing.md:224-231 (deleted one-field form); focus lost to <body>
  after successful send (WCAG 2.4.3). Judged sound: (a) fields removed, (b) callback branch removed (no callers),
  (c) same label + described note honest, (d) no scroll/focus on pick, (e) referral after expansion untouched.
Ruling 18: typed text survives an intent change — reset only when body === current draft (data-loss trap otherwise).
  Cost if wrong: a stale draft stays in an edited textarea after switching intent.
Ruling 19: copy trimmed (owner likes short): lead "Pick a reason. The message is already written."; mailto note "Opens your
  email app with this message. You send it from there."; dead optional `company` removed from the API if unread. Cost: copy only.
Task 4: fix round 1 dispatched (resumed implementer).
Task 4: fix round 1/5 (2 Important + 5 ruled Minors addressed, 0 open; 6eadbae..8b65ae7).
Task 4: minor (deferred): after a post-expansion referral, a later intent change keeps an untouched textarea (could compare
  against a seeded-text ref); Resend-mode focus covered by unit test only.
Task 4: complete (commits 820cc9e..8b65ae7, review clean)
Task 5: dispatched (SONNET) BASE 8b65ae7 — DirectLinks + résumé PDF swap (R11, R15 owner-approved).
Task 5: implemented (cbec61d; PDF verified 2.8M x2, no phone, 1 page 135,813 B; verify 733; contact+axe 77/1 — axe target-size on a cat button at 1440 full-page, 3/3 alone). Review dispatched (SONNET).
Task 5: review (SONNET) — spec ✅, Approved. PDF confirmed on disk. axe cat-button target-size failure judged the known
  cats-crossing-controls class (not this change). Minors carried into Task 6 (it edits DirectLinks): forward-reference
  comment about booking; unexplained one-link row (add a short label or drop the list); ragged comment reflow.
Task 5: complete (commits 8b65ae7..cbec61d, review clean)
Task 6: dispatched (SONNET) BASE cbec61d with R5 + Task 5 carry-overs.
Task 6: implemented (194e35d; verify 750; new tests red first; booking in DirectLinks per R11; no e2e run). Review dispatched (SONNET).
Task 6: review (SONNET) — spec ✅, Approved. Minors carried into Task 7 (it edits Contact.tsx): Contact.tsx ~38 ragged
  reflow + ambiguous "never receives it" → "either"; .env.example "Server-only" header misleads for BOOKING_URL (it is
  printed as a link); validBookingUrl accepts bare "https://" (reject an empty host).
Task 6: complete (commits cbec61d..194e35d, review clean)
Task 7: dispatched (OPUS) BASE 194e35d — R4 lazy chat boundary + perf row, R5, R10, R14, + Task 6 carry-overs.
Task 7: implemented (b120ea4 5ebe3f2 7743630; perf +160 B; verify 766; full e2e 569/1 — companion:1511 setup timing, 4/4 alone). Reserved chat height via data-ask-slot; Stage.tsx re-lands fragments after the Journey (outside brief). Review dispatched (OPUS).
Task 7: review (OPUS) — spec ✅; lazy boundary verified in the build. 4 Important: false chat-intro/NOTHING_FOUND/README claim
  ("sentence lifted from this page"); Stage re-land jumps readers after reload-restore to #contact; ask.spec:298 bound can't
  fail; reserved chat height is drift-prone constants. Fix round 1 dispatched (resumed implementer) with reviewer's wording.
Ruling 20: chat copy → "Every answer below is quoted word for word from what Thien wrote for this site, with its source. No
  model, nothing generated. If he hasn't written it down, you're told so." Cost if wrong: one sentence.
Task 7: fix round 1 implemented (c81d9c0; verify 770; e2e 169/0 + 133/0; reload e2e red on old Stage at 1024/1440; ≤2px shift e2e green at 5 widths; perf 202,822 B, +238 vs 194e35d). Re-review dispatched (SONNET).
Task 7: fix round 1/5 (4 Important + Minors addressed, 0 open; 7743630..c81d9c0).
Task 7: minor (deferred): base-breakpoint --ask-room leaves ~250-300px blank panel at 400-639px (mid-base step ~30rem would fix);
  Stage landedOnFragment measured at mount only; live-mode heights covered by measurement, not a test.
Task 7: complete (commits 194e35d..c81d9c0, review clean)
Task 2: dispatched (OPUS) BASE c81d9c0 with R6-R9, R16; carry: ask.spec résumé round-trip uses the hero's "Open résumé" link.
Task 2: implemented (852b52c; verify 776; full e2e 578/1 — contact.spec:297 axe contrast at 1440 day, 8/8 rerun). Concerns: #about 1331px at 1440x900 (not one fold); intro+positioning+rail Now say the same thing 3x; header/footer primaries still blue; Explore → #tree; lenses data unread. Review dispatched (OPUS).
Task 2: review (OPUS) — spec ❌ (plan-caused): not one fold (content ~1130px vs ~640 budget); not "one quiet link into the
  World". Important: false Hero.tsx:24-28 comment; false "single primary" comment/test title; intro duplicates positioning;
  hero perch off-screen at 1440x900 → cats clamp onto prose (390 night shot shows it).
Ruling 21: stop rendering + delete profile.intro (unindexed, unread elsewhere). Cost: one sentence of Plan A copy.
Ruling 22: "one fold" = one layout (no second band), opening argument in the first screen — not one screen tall. Cost: if
  Thien wants literal one screen, he must cut paragraphs (his copy).
Ruling 23: hero action = one quiet link "Explore my work" → #worlds; drop hero "Contact me" (header duplicates). Cost: one link.
Ruling 24: header "Let's talk" demoted to secondary; Closing's primary left (spec §2 untouched) — FOR THIN. Cost: one button style.
Ruling 25: delete unread lenses data (ResumeLensId, lenses fields, recipe lines) in a separate commit. Cost: re-add if a future /resume filter wants it.
Ruling 26: verify cats on load at 1440/390; if over text, heroMood declines when the perch is off-screen + e2e. Cost: hero mood used less.
Task 2: fix round 1 dispatched (resumed implementer).
Task 2: fix round 1 implemented (b6fe975 4e8a973; verify 783; full e2e 580/1 — contact.spec:297 again, 8/8 alone; new cats-on-load e2e 2/5 red → 20/20). R26 went into companion core: findClearSpot prefers head-clear; held stop re-checked head-and-all after animationend/body-resize. Re-review dispatched (OPUS).
Task 2: fix round 1/5 (R21,R23,R24,R25,minors addressed; open: R22 breakpoint is 1360 not 1024; R26 false comments
  companion-space.ts:612-614,:699-705 + untested per-frame head preference in tour/mood follower paths; 852b52c..4e8a973).
Ruling 27: head-clear preference in findClearSpot is opt-in — only the explorer fallback and settle/nap paths use it; the
  per-frame tour/mood/restSpots callers keep the feet-only rule (avoids target chasing her own position + ~180 hit tests/frame).
  Cost if wrong: a tour-stop follower may rest head-on-content in a crowded viewport (as before this branch).
Task 2: fix round 2 dispatched (resumed implementer).
Task 2: fix round 2 implemented (3f8d738; verify 785; companion spec 75/0 incl. all tour tests; on-load 20/20). preferHead opt-in: explorer fallbacks, declined path, settled() (cached). Re-review dispatched (SONNET).
Task 2: fix round 2/5 (R22 + opt-in preferHead + :612-614 addressed; open: companion-space.ts:699-702 names mini-Thien as
  per-frame (false); companion-moods.ts:411-418 wording; 4e8a973..3f8d738). settled() recompute on pointermove noted (minor).
Task 2: fix round 3 dispatched (comments only).
Task 2: fix round 3/5 (comments; addressed — checked by controller; 3f8d738..7b028d4).
Task 2: complete (commits c81d9c0..7b028d4, review clean, 3 fix rounds)

## Final whole-branch review
Final review dispatched (OPUS) over d1ae75b..7b028d4.
Final review (OPUS): ready WITH FIXES, 0 Critical. MUST: false chat copy (word-for-word claim vs computed plaques/templated lines), contact.spec:297 timing, --ask-room blank band. Should: seeded-text ref, settled() pointermove recompute, one-blue test patterns, duplicate legend, answer-corpus.ts:216. FOR THIN: rail repeats prose (Now/Based), Closing + Worlds 'Take the flight' blue, one-fold height, résumé duplicate 2.8M bullets, BOOKING_URL. Final fix wave dispatched (OPUS) → final-fix-wave.md.
Final fix wave implemented (be2e1e8 a4bc777 c924894 fce88fd; verify 789; e2e 186/0; contact+axe x10 780/0). ask-room: live never taller than static, so not keyed on mode; steps at 400/520px, max blank 181px. Scoped re-review dispatched (SONNET).
Fix wave re-review (SONNET): 8/9 addressed; item 6 partial — settled() still re-probes per frame on pointer move during an
  asked scene's walk to its stage (queued set, playRef null); 2 comments false. Minor: "a count made from them" under-describes
  list plaques / joined docs; 320-399px keeps the 67.5rem step.
Ruling 28: residual adjudication — the smallest change: gate onMove's settleSpots clear on !playRef && !queued and fix both
  comments (one line + comments), sent to the fix implementer rather than parked, because the comments are false. Cost: none.
Residual (71e3638): gate applied as a guard — re-reviewer's premise didn't hold (no per-frame re-probe during the walk); new e2e fails 201-226 hit tests if introduced. verify 789; companion 77/0. Plan B DONE.
