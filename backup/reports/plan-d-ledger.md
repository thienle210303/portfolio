# SDD ledger — plan: docs/superpowers/plans/2026-10-05-round-18-plan-d-follow-ups.md

Worktree .claude/worktrees/plan-d, branch round-18/plan-d, base 80d0a13 (local main, Plan C merged, unpushed). Plan commit 3e79631. Preflight (opus planner) → preflight.md; frames in .superpowers/sdd/plan-d/frames/.
Ruling: recordings move out of the closed disclosure to above CaseStudy's action row (planner's D recommendation) — most discoverable honest spot, still press-to-mount — cost if wrong: move back.
Ruling: MentorHub recording (Task 10) is GATED on owner approval — its frames show a password-breach dialog, a 401, an email address and two teammates' names/bios (privacy); Food Route proceeds alone in Task 10 — cost if wrong: MentorHub ships later.
Ruling: "Stop the replay" label + 5 s hold accepted as drafts (WCAG 2.2.2 needs a stop control for a looping animation) — cost: copy edit.
Ruling: CLAUDE.md:119 one-line edit approved for Task 7 (the line becomes false when "Now" leaves the rail).
Ruling: Task 11 also (a) ships the owner-attached résumé PDF (C:/Users/thien/Downloads/Thien_Le_Software_Engineering_Resume.pdf; diff vs shipped = "from 17 hours", "PROJECTS"; still has two $2.8M bullets → For Thien) and (b) changes the booking label "Book twenty minutes" → "Book a call" (event length unverified; duration-free label is always true) plus the two doc comments saying "twenty minutes" — cost: owner may prefer a duration.
Task 1: dispatched (sonnet, BASE 3e79631)
Task 1: implementer DONE f0cca5a (robot walk 30/30, fail-proof 60/120). Incident: implementer ran pkill -f 'next start'; afterwards :3000 has no listener and PID 4292 absent — unknown whether running before. common.md now forbids pattern kills. Review dispatched.
Task 1: review → spec ✅, quality approved, 0 Crit/Imp.
Task 1: minor (deferred): framesThatDrew counts callbacks vs ticks frames (masking possible if two drawing callbacks per frame); .next holds mutated build → next task must rebuild.
Task 1: complete (commits 3e79631..f0cca5a, review clean)
Task 2: dispatched (sonnet, BASE f0cca5a)
Task 2: implementer DONE_WITH_CONCERNS 3ff83ea (unit 905; no e2e run). Review dispatched.
Task 2: review → spec ✅, quality approved, 0 Crit/Imp.
Task 2: minor (deferred): test does not assert landing ran; landing sentence not spoken on this path (accepted by brief); no e2e for pick-mid-flight with real GlobeCanvas (→ Task 4 e2e can cover).
Task 2: complete (commits f0cca5a..3ff83ea, review clean)
Task 3: dispatched (sonnet, BASE 3ff83ea)
Task 3: implementer DONE_WITH_CONCERNS b87b259 (906 unit; contact+axe+worlds 46/0; scan ignores ≤2px hairline rules). Review dispatched.
Task 3: review → spec ✅, quality approved, 0 Crit/Imp.
Task 3: minor (deferred): hairline filter broader than needed; Button.tsx still defaults to primary (future second blue risk); ready flight button now looks like "Face Việt Nam"; demoted-control border 1.42:1 (same as existing secondary recipe, label ≥4.5:1).
Task 3: complete (commits 3ff83ea..b87b259, review clean)
Task 4: dispatched (opus, BASE b87b259)
Task 4: implementer DONE_WITH_CONCERNS f27a4e6 (919 unit; full e2e 738/2 → contact fix in-commit, contact 71/71; perf 204,592 B = +334 vs 204,258). New string 'Stop the replay'. Review dispatched (opus).
Task 4: review (opus) → spec ✅, quality needs fixes: 3 Important (loop cycles while <half visible; Stop label flips under focus; chapter-stop e2e can pass with mechanism deleted). FIX_BASE f27a4e6. Fix round 1/5 dispatched (resume implementer).
Task 4: fix round 1/5 implemented 346bb4f (3 Important fixed; 922 unit; worlds+axe+contact+companion 419/0; perf 204,636 B; also fixed companion cat-on-hidden-line race). Ruling: touch scroll starting on the section must not stop the replay for good — only deliberate interaction (tap/click, globe drag, keys, focus-in, picks) — owner wants phone visitors to see the loop — cost if wrong: an accidental tap still stops it. Fix round 2/5 dispatched before re-review; one scoped re-review will cover f27a4e6..round-2.
Task 4: fix round 2/5 implemented 7d4ea98 (touch scroll via pointercancel ignored; 6px tap slop shared; 927 unit; worlds+companion 317/0; touch e2e proven). Scoped re-review of f27a4e6..7d4ea98 dispatched (opus).
Task 4: re-review 1 → I1/I2/I3 + touch ruling ADDRESSED, no new Crit/Imp. Ruling: promote M1 (hold waits forever when press released outside section) + M2 (landing during touch press stalls loop) to fix round 3 — both leave 'Stop the replay' showing on a frozen loop (false visible state); also M5 wording. Fix round 3/5 dispatched. Deferred minors: M3 touch scroll cuts camera ease; M4 touch e2e doesn't assert loop keeps cycling.
Task 4: fix round 3/5 implemented 489e97c (M1/M2/M5; 929 unit; worlds 240/0; perf 204,910 B = +652 vs 204,258). Re-review 2 dispatched.
Task 4: fix rounds 1-3/5 (3 Important + touch ruling + M1/M2/M5 addressed, 0 open; commits f27a4e6..489e97c)
Task 4: minor (deferred): M3 touch scroll cuts camera ease; M4 touch e2e does not assert loop keeps cycling; second finger pointerup ends first press early (benign); + 9 minors in task-4-review.md.
Task 4: complete (commits b87b259..489e97c, review clean)
Task 5: dispatched (sonnet, BASE 489e97c)
Task 5: implementer DONE e24a67a (931 unit; worlds+axe+companion 366/0; perf 205,035 B = +777 vs 204,258). Commit trailer says Sonnet 5.5 not Opus 5.5 (cosmetic). Review dispatched.
Task 5: review → spec ✅, quality needs fixes: 1 Important (Sun/Moon e2e passes with a glyph missing). FIX_BASE e24a67a. Fix round 1/5 dispatched. Minor (deferred): double blank line; three waitForTimeout(300); thin Moon crescent (owner may want heavier).
Task 5: fix round 1 implemented 99c1ebe (ground-diff ink + shape identity; mutations a/b/c fail; worlds 252/0). Re-review dispatched.
Task 5: fix round 1/5 (1 addressed, 0 open; commits e24a67a..99c1ebe)
Task 5: minor (deferred): Moon right-of-centre check margin only 1.4 CSS px (revisit if glyph scale changes).
Task 5: complete (commits 489e97c..99c1ebe, review clean)
Task 6: dispatched (sonnet, BASE 99c1ebe)
Task 6: implementer DONE_WITH_CONCERNS 065c02a — probe found real failure: at HALO_PX 3.5 every skin failed in one theme (worst 1.67:1 Desert night on open label); halo widened to 5 (smallest passing); probe 12/12; worlds 231/4 (browser crashes in reduced-motion block, pass alone). Review dispatched.
Task 6: review → spec ✅, quality needs fixes: 1 Important (labels with zero changed pixels skipped silently) + promoted false doc ('every canvas label' but only Living Earth pose). FIX_BASE 065c02a. Fix round 1/5 dispatched. Minor (deferred): p5 statistic looser than per-pair WCAG; forced-colours not probed; reduced-motion browser crashes likely Windows process-init exhaustion under added load; plan-c-ledger.md ≥5.9:1 claim superseded (process record) + 9 in task-6-review.md.
Task 6: fix round 1/5 (2 addressed, 0 open; commits 065c02a..15736d2)
Task 6: complete (commits 99c1ebe..15736d2, review clean)
Task 7: dispatched (sonnet, BASE 15736d2)
Task 7: implementer DONE_WITH_CONCERNS d304c75 (hero 1138→1074 @1440, 1836→1671 @390; top padding kept 1× because 0.6× let a cat rest on hero text at 390 — companion test; 931 unit, retrieval 6/6, e2e 210/0). Ruling: accept top padding at 1× rather than a phone-only override coupled to a cat test — cost: hero 40px taller than planned at 1440. Review dispatched.
Task 7: review → spec ✅ (ruled deviation), quality needs fixes: 2 Important (HeroIdentity comment false; profile.location orphaned) + 2 stale-comment minors promoted. Ruling: keep profile.location (content rewrite next; deleting an authored fact is the bigger change), fix its comment — cost: one unrendered field. FIX_BASE d304c75. Fix round 1/5 dispatched.
Task 7: fix round 1/5 (4 addressed, 0 open; commits d304c75..d7f7b75) — comment/test-title only; controller verified diff against code.
Task 7: minor (deferred): "Now" restatement only caught by hard-coded regex; one Hero.tsx comment repeats the banner.
Task 7: complete (commits 15736d2..d7f7b75, review clean)
Task 8: dispatched (sonnet, BASE d7f7b75)
Task 8: implementer DONE bca8c72 (932 unit; sections+print+axe+responsive 187/0; press e2e fails on old placement). Review dispatched.
Task 8: review → spec ✅, quality approved, 0 Crit/Imp.
Task 8: minor (deferred; final wave): rejected-play test name overclaims + catch spy asserts shape; eager Promise.reject relies on sync .catch; no e2e computed size/colour check on play button.
Task 8: complete (commits d7f7b75..bca8c72, review clean)
Task 9: dispatched (sonnet, BASE bca8c72)
Task 9: implementer DONE 293deef (934 unit, retrieval 6/6, sections+axe 109/0). Drafts relayed to owner. Review dispatched.
Task 9: fix round 1/5 (1 addressed, 0 open; commits 293deef..57face2) — one-string copy fix; controller verified diff.
Task 9: minor (deferred): play button has no aria-describedby to caption (optional).
Task 9: complete (commits bca8c72..57face2, review clean)
Task 10: dispatched (sonnet, BASE 57face2) — Food Route only; MentorHub still owner-gated (no answer).
Task 10: implementer BLOCKED — foodroute.gif frame 0 shows sign-in form with hey@gmail.com (<0.1 s). Ruling: trim the sign-in frames (-ss) and ship Food Route — owner asked to ship it; trimming removes the only personal data and invents nothing — cost if wrong: owner wanted the untrimmed clip. Resumed implementer.
Task 10: implementer DONE 8bf53b2 (-ss 0.3 trim; 289,730 B 604x568; 937 unit; e2e 162/0; perf 205,415 B). Review dispatched.
Task 10: review → spec ✅, quality approved, 0 Crit/Imp (reviewer independently checked frames: no personal data).
Task 10: minor (deferred): per-entry e2e listener attached after load; ~0.5 s black at loop seam; ACFB third-party branding (owner call); unit test pins ["foodroute"] (intentional).
Task 10: complete (commits 57face2..8bf53b2, review clean)
Task 11: dispatched (sonnet, BASE 8bf53b2)
Task 11: implementer DONE_WITH_CONCERNS 9a63d39 (verify 5/5, 937 unit; FULL e2e 788/0; perf 205,415 B = +1,157 vs 204,258; résumé PDF shipped; "Book a call"; no CLAUDE.md change claimed necessary).
Ruling: Task 11 task-review folded into the final whole-branch review (explicit T11 section) — it is docs/verification only and the final reviewer reads the same files — cost if wrong: one extra review round.
FINAL: whole-branch review dispatched (opus) on 80d0a13..9a63d39.
FINAL review (opus): merge with fixes; 5 must-fix (editing.md:82-83 list; spec:213 'from' wording; Hero.tsx:39-40 stale px; both-theme browser check undone; tracker missing 4 owner decisions incl. Food Route -ss 0.3 trim). 45 can-wait. Ruling: also fold in the macOS right-click loop freeze (ignore non-primary pointerdown) — same stuck-'Stop the replay' class as M1 — cost: tiny. Ruling: caption-to-server-only trim (~300-400 B) NOT done — bends 'facts live in portfolio.ts'; For Thien. FINAL fix wave dispatched (sonnet, FIX_BASE 9a63d39).
FINAL fix wave implemented 9a63d39..8a8d6ec (verify 5/5, 939 unit; e2e green by width, 1 flake passes alone; ffmpeg trim reproduces byte-for-byte; 25 fw-*.png). Screenshot notes: satellite overprints 'EARTH' mid-replay (passing); Journey crossfade capture overlap (transient); night Contact copy icon looks faint (unmeasured). Scoped re-review dispatched.
MERGED: main fast-forwarded 80d0a13→8a8d6ec (unit 939/939 on merged tree). NOT pushed.
