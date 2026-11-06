# SDD ledger — plan: docs/superpowers/plans/2026-09-30-round-18-plan-c-the-living-earth.md

Worktree .claude/worktrees/plan-c, branch round-18/plan-c, base 71e3638 (main = origin/main).
Spec: docs/superpowers/specs/2026-09-30-round-18-design.md (binding authority).
Setup: deps installed with npm_config_package_lock=true (global ~/.npmrc package-lock=false disables pnpm lockfile otherwise).

## Preflight
Preflight scan (opus, read-only) → preflight.md (premise tables §1, cross-task table §2, collisions §3, blockers §4). Rulings → rulings.md.
Ruling: R1 coastline fence unchanged; bake takes rings as arg — spec §5.2 + CLAUDE.md — cost if wrong: one test-fence edit later.
Ruling: R2 texture = pure-JS scanline coverage buffer, no ImageData/OffscreenCanvas — jsdom lacks them; plan tests could not fail — cost: rasteriser code to maintain.
Ruling: R3 two canvases (GL surface under 2D overlay), fallback = shipped 2D globe incl. forced-colors/context loss — plan Renderer could not fall back post-compile — cost: extra DOM element.
Ruling: R4 shader geometry from globe.ts (uCenter/uRadius/uInverseRotation) with TS twin tested vs unproject — plan shader misaligned with markers — cost: more uniforms.
Ruling: R5 no literal colours in shader; skins are mixes of ink/paper/accent — "never hard-coded", blue-only hue — cost: skins less vivid than spec prose (owner blocker A).
Ruling: R6 chapter ids keep "tech"; merge sweep list; worlds.test.ts:116-126 byte-identical — hard-coded id + Plan B quote fence — cost: plan test text edited.
Ruling: R7 skins typed + @ts-expect-error fence; skins not counted in plaque/decoration rows; disabled without WebGL — plan test asserted nothing; spec fallback — cost: rail wording.
Ruling: R8 drop createCrossingLoop; autoplay existing fly() once per load via own observer, settle() on exit — flight already exists — cost: e2e rewrites.
Ruling: R9 robot in tech chapter, tests at 0.4/0.9, reduced-motion two-state toggle — plan's tests fail its own code — cost: test values differ from plan.
Ruling: R10 bún cá draws without town claim; disclosure "Five objects, and he named every one. Nothing here was invented to fill the space." — owner chose province level — cost: weaker map tie-in.
Ruling: R11 extend existing worlds e2e; drop focus-to-panel/Escape — not in spec, markers not DOM — cost: one plan bullet unimplemented.
Ruling: R12 e2e selectors to canvas[data-chunk="globe-canvas"], count GL drawArrays in rest probe — keep rest contract honest — cost: harness churn.
Ruling: R13 ship four recordings behind a press-to-mount button; ffmpeg yuv420p, no upscale — Disclosure keeps children mounted; muted attr untestable — cost: mentorhub/foodroute not shipped (blocker C).
Ruling: R14 perf baseline 198.1 KB/202,822 B; 31xx port; content check for shader/coast strings in initial JS — plan number stale — cost: none.
Ruling: R15 spec deviations ledgered and reported, not invented — cost: some spec beats (Sky/Animals visuals) deferred.
Ruling: R16 order T4→T8→T5→T1→T2→T3a→T3b→T7→T6→T9→T10→T11; opus for T3/T7/T6 — dependency order — cost: none.
Ruling: R17 tests in tests/lib or tests/sections; lib never imports sections — repo convention.
Task 4: dispatched (sonnet, BASE 71e3638, implementer a6a028b4e3a627e14)
Task 4: implementer DONE_WITH_CONCERNS commit 788425d (BASE 71e3638); NEXT = review-package 71e3638..788425d + task review (sonnet). Concerns: e2e only 375/1440; both living-earth pins use star glyph (T8 to revisit); duplicate LIVING EARTH label when both pins face; new combined 'where' string (see report).
Task 4: review → spec ✅, quality needs fixes (2 Important: stale USA comments; no test that 2nd living-earth pin selects chapter). FIX_BASE 788425d. Fix round 1/5 dispatched (resume implementer) incl. retrieval eval + responsive 320 + all-viewport worlds/fragments e2e.
Task 4: minor (deferred): latent whole-chapter shift in sharesAPin; duplicate "LIVING EARTH" labels when both pins face; both living-earth pins use `star` glyph (T8 revisit); CHAPTER_IDS no src consumer yet (T3a will consume).
Task 4: fix round 1 implemented 243ce91 (comments fixed, e2e 2nd-pin test proven-failing, 320px overflow regression fixed via overflow-wrap in WorldPanel; 150 e2e pass). NEXT: scoped re-review 788425d..243ce91.
Task 4: fix round 1/5 (2 addressed, 0 open; commits 788425d..243ce91)
Task 4: minor (deferred): e2e p.front failure message says "far side" but expects near; src/lib/worlds.ts:263 still says "`usa` could not be opened".
Task 4: complete (commits 71e3638..243ce91, review clean)
Task 8: dispatched (sonnet, BASE 243ce91)
Task 8: implementer DONE commit 3998e8b; pins left as star (pin glyph separate field); bowl shared by two dishes; glyphs not browser-checked. Review dispatched.
Task 8: review → spec ✅, quality approved, 0 Crit/Imp, 4 minor. Controller promoted 2 to Important (false doc rule): docs/editing.md ~198 stale cơm tấm example; glyphs.ts:30 unverified "hoa mai" claim. FIX_BASE 3998e8b. Fix round 1/5 dispatched (resume implementer).
Task 8: minor (deferred): GLYPHS "exists" test weak — no test pins the ±12 glyph box (jelly overflowed once); bún cá draws asserted with toContain not exact; bún bò/bún cá share bowl glyph; glyphs not browser-checked.
Task 8: fix round 1/5 (2 addressed, 0 open; commits 3998e8b..e1ecff7)
Task 8: complete (commits 243ce91..e1ecff7, review clean)
Task 5: dispatched (sonnet, BASE e1ecff7)
Task 5: implementer DONE 85d2f3d; skins resolved in new src/lib/skins.ts (lib/worlds.ts already in an initial chunk); rail '5 — the look only, carrying no fact'. Review dispatched.
Task 5: review → spec ✅ (lib/skins.ts placement sound), quality needs fixes: 1 Important (skin draws copy promises sand/viewpoint/every-city beyond R5's ink/paper/accent renderer). FIX_BASE 85d2f3d.
Ruling: Task 5 skin draws strings reworded to what an ink/paper/accent shader can draw (spec §5.3 prose describes richer hues; R5 forbids them pending owner blocker A) — cost if wrong: copy edit once the owner approves extra hues.
Task 5: fix round 1/5 dispatched (resume implementer).
Task 5: minor (deferred): lowercase accessible names; opacity-70 contrast margin on disabled skin buttons; weak pressed-state cue; 44px test checks class string only; near-tautological SKIN_IDS test; toHaveTextContent("") vs toBeEmptyDOMElement(); no docs/editing.md recipe for adding a skin.
Task 5: fix round 1 implemented 6650ad7 (draws reworded; Ice Age too). Re-review dispatched.
Task 5: fix round 1/5 (1 addressed, 0 open; commits 85d2f3d..6650ad7)
Task 5: complete (commits e1ecff7..6650ad7, review clean)
Task 1: dispatched (sonnet, BASE 6650ad7)
Task 1: implementer DONE 44d584a. Review dispatched.
Task 1: review → spec ✅, quality approved, 0 Crit/Imp. ⚠️ webglcontextlost + surface removal → resolved: R3 assigns them to T3b; MUST be in T3b dispatch.
Task 1: minor (deferred): no test asserts shader/program deletes (vertex-ok/fragment-fail branch unexercised); pickSurface guard precedence untested; toEqual({}) doesn't prove same ctx passthrough; premultipliedAlpha rim comment unverifiable until T3; three near-identical delete blocks.
Task 1: complete (commits 6650ad7..44d584a, review clean)
Task 2: dispatched (sonnet, BASE 44d584a)
Task 2: implementer DONE 72bf278 (bake ~40ms @2048x1024, 33% land). Review dispatched.
Task 2: review → spec ✅, quality approved, 0 Crit/Imp; reviewer verified maths by script (area-weighted land 28.9% vs Earth 29.2%). ⚠️ GlobeCanvas passing COASTLINES → T3b contract.
Task 2: minor (deferred): pole-closure threshold |last-first|>width/2 vs comment "ends 360° away" (latent, no data hits it); pole choice by summed-lat sign undocumented; test (a) square ring can't catch swapped axes; Antarctica finder min<-85 has 0.6° margin; no north-pole / east-to-west test.
Task 2: complete (commits 44d584a..72bf278, review clean)
Task 3a: dispatched (opus, BASE 72bf278) — pure modules: shaders.ts, sphere.ts, inverse rotation + TS twin vs unproject, index-contract tests.
Task 3a: implementer DONE 95a5bf2 (855 tests). Notes for 3b: unused uniforms may have null location; share sphereView with GlobeCanvas; option 'coverage' + required 'colors'. Review dispatched (opus).
Task 3a: review (opus) → spec ❌ (no id-order pin; tech lattice blue decoration), quality needs fixes. Shaders compiled+linked in headless Chromium, orientation verified. 3 Important + 1 Minor promoted (test named column-major/undoes rotate asserts neither). FIX_BASE 95a5bf2.
Ruling: Tech chapter lattice drawn in ink/paper, not accent — CLAUDE.md "blue is never decoration" outranks my R5 dispatch wording "lattice in accent" — cost if wrong: tech chapter less striking; one-line shader change.
Task 3a: fix round 1/5 dispatched (resume implementer).
Task 3a: minor (deferred): colour-literal check has two loopholes; CHAPTER_INDEX loose typing; null uniform-location path not unit-tested (real driver OK); lattice aliasing near limb/poles; day atmosphere rim near-invisible; Ice Age (day) / Night side (night) disc blends into ground; atan(0,0) pole point; draw() allocates arrays per frame.
Task 3a: fix round 1/5 (4 addressed, 0 open; commits 95a5bf2..8f7abaa)
Task 3a: complete (commits 72bf278..8f7abaa, review clean)
Task 3b: dispatched (opus, BASE 8f7abaa)
Task 3b: implementer DONE 912032b; GL path ran in e2e (264 pass/0 fail); fallback proven (null ctx, forced-colors at load + later). Concerns: day rim invisible, night disc ~ground, graticule white-on-grey by day, fallback one-way, initial chunks 238,674 B gzip-6 (not perf.mjs measure). Review dispatched (opus) incl. perf comparison vs main.
Task 3b: review (opus) → spec ✅, quality needs fixes. PERF (perf.mjs, 3 runs, 0 skipped): branch 912032b 203,256 B vs main 71e3638 202,734 B → +522 B for all Plan C so far. Context-loss probed manually OK. 1 Important (false comment worlds.spec.ts:156).
Ruling: promote to Important — (a) context-loss e2e test + exact fallback-ink comparison (Review Focus 1/5 is the plan's top risk); (b) day-theme blue canvas labels at ~2:1 on mid-grey GL disc → retune shader so labels keep ≥4.5:1 (regression vs shipped legibility) — cost if wrong: a paler planet than the plan imagined.
Task 3b: fix round 1/5 dispatched (resume implementer). FIX_BASE 912032b.
Task 3b: minor (deferred): 8 MB coverage buffer retained after upload; bake+compile run under forced-colors at load; fallback one-way per visit; three-tone check not done (only base tone); day rim 1.07:1, night edge 1.12–1.23:1 (R15/blocker A).
Task 3b: fix round 1/5 implemented (commits 912032b..5f43d6a): comment fixed; context-loss e2e + exact fallback equality (mutation-proven); unskinned labels ≥4.79:1 both themes [SUPERSEDED by Plan D Task 6: at halo 3.5 skins measured as low as 1.67:1; halo widened to 5]. Re-review deferred to cover round 2 too.
Ruling: canvas labels get a ground-coloured halo (strokeText then fillText), always, instead of narrowing skin palettes — skins left labels ~1:1 (legibility failure), halo is standard and preserves skin looks — cost if wrong: slightly heavier label rendering.
Task 3b: fix round 2/5 dispatched (resume implementer). Unskinned planet now pale by day / dark by night (cost of 4.5:1 labels with ink/paper fill) → For Thien.
Task 3b: fix round 2 implemented acd525b (label halo; accent labels ≥5.9:1 p5 every skin/theme [SUPERSEDED by Plan D Task 6 probe: open label down to 1.67:1 at halo 3.5]; e2e 240/0). Scoped re-review of 912032b..acd525b dispatched.
Task 3b: fix rounds 1-2/5 (5 addressed incl. 2 controller-promoted + 1 ruling, 0 open; commits 912032b..acd525b)
Task 3b: minor (deferred): 3.5px label halo can clip adjacent marker ring/coast glow; halo AA edge ~2:1 on some skins; graticule ≤ shipped contrast on disc.
Task 3b: complete (commits 8f7abaa..acd525b, review clean)
Task 7: dispatched (opus, BASE acd525b)
Task 7: implementer DONE c3cb7b8 (877 unit, e2e 258/0). Concerns: robot behind planet ~half lap; panel lines are glyph accessible names not visible text; reduced-motion toggle always enabled; 2D fallback draws robot + coast dots; initial JS +few hundred B est. Review dispatched (opus).
Task 7: review (opus) → spec ✅, quality approved, 0 Crit/Imp, 10 minor.
Ruling: R15 deviation recorded — spec §5.3 says the robot "walks the terminator twice"; plan/R9 walk a full longitude circle (robot hidden ~half each lap) — cost if wrong: re-path the walk along the terminator.
Task 7: minor (deferred): reduced-motion hook in WorldsStage.tsx:93-108 adds initial JS (CSS motion-reduce:flex would remove it); walk keeps running off-screen up to 6 s (→ carried into T6 settle()); no e2e asserts the walk ends lit; unmount mid-walk leaves robot mid-lap (reset to -1 at GlobeCanvas.tsx:1028); toggle not gated on !canvasFailed; two identical robot glyphs in panel; + 4 more in task-7-review.md.
Task 7: complete (commits acd525b..c3cb7b8, review clean)
Task 6: dispatched (opus, BASE c3cb7b8)
Task 6: implementer DONE f57cf4a (889 unit; full e2e 649/1 then fixed; worlds 180/180). PERF initial JS 203,788 B (+1,054 B vs main, all Plan C). Concerns: 'then reset' not implemented (R8); robot walks off-screen if Technology chosen while stage off-screen; settle no-op mid-drag; <314px tall never autoplays. Review dispatched (opus).
Task 6: review (opus) → spec ✅, quality needs fixes: 2 Important (worlds.spec.ts:1409 comment claims ended-vs-paused untested; WorldsStage "never flown at unasked" false for sub-half-visible drag/ArrowRight). FIX_BASE f57cf4a.
Ruling: promote 3 minors to the fix round — "settles a walking robot too" test has no robot (asserts nothing); robot walk off-screen when Technology chosen off-screen (owner's explicit "non-sense if it keep playing"); handoff link layout shift (Lighthouse CLS constraint) — cost if wrong: a little extra code in WorldsStage.
Ruling: "then reset" (owner note) NOT implemented — R8 + link must persist after autoplay; question goes to For Thien — cost if wrong: add reset behaviour later.
Task 6: fix round 1/5 dispatched (resume implementer).
Task 6: minor (deferred): bare pointerdown/tap makes autoplayed landing announce; context-loss exact comparison now only under reduced motion; <314px-tall viewports never autoplay (thresholds [0,.25,.5] fix); settle no-op mid mouse-drag; + others in task-6-review.md.
Task 6: fix round 1 implemented ccdfc87 (e2e 276/0, mutation-proven; perf 203,824 B = +1,090 B vs main). Re-review dispatched.
Task 6: fix round 1/5 (5 addressed, 0 open; commits f57cf4a..ccdfc87)
Task 6: minor (deferred): inViewRef false until first observer report (settle no-op in that window); layout-shift check only bites at narrow widths (acceptable — link in shorter column at wide).
Task 6: complete (commits c3cb7b8..ccdfc87, review clean)
Task 9: dispatched (sonnet, BASE ccdfc87)
Task 9: implementer DONE_WITH_CONCERNS 0e4fea9 (axe matrix 24/0 violations; worlds 204, axe 37, companion 77, 0 fail). Added roving arrow keys moveFocusAmongButtons in WorldsStage (initial bundle; size unmeasured → T11). Globe always tone=deep. Review dispatched.
Task 9: review → spec issues (small), quality needs fixes: 3 Important (false assertion message worlds.spec.ts:1780; no modifier guard in roving keys WorldsStage.tsx:103-114; skin coverage silently skips without GL surface). Size est. +~270 B gz → Plan C ≈ +1.36 KB. FIX_BASE 0e4fea9.
Ruling: skin e2e/axe tests REQUIRE the GL surface (wait then fail naming WebGL) instead of skipping — headless shell 1234 runs WebGL, and a silent skip audits nothing — cost if wrong: tests fail on a GL-less CI runner (there is no CI-only runner today).
Task 9: fix round 1/5 dispatched (resume implementer).
Task 9: fix round 1 implemented 72a920a (worlds+axe 241/0; WebGL-null stub proves skin tests fail loudly). Re-review dispatched.
Task 9: fix round 1/5 (2 addressed, 1 open — remaining GL-conditional skips at worlds.spec.ts:636,1393,1401,1469,1492; commits 0e4fea9..72a920a). Fix round 2/5 dispatched.
Task 9: fix round 2/5 (1 addressed, 0 open; commits 72a920a..c1f409f). Re-review flagged stale 'skip' comment axe.spec.ts:384 → false comment = Important; fix round 3/5 dispatched.
Task 9: fix round 3/5 (1 addressed, 0 open; commits c1f409f..288a1aa) — one-line comment; controller verified against axe.spec.ts skin case (toHaveCount(1,15s) with WebGL2 message).
Task 9: minor (deferred): modifier-guard test not mutation-run (re-review judged it would fail without guard); + 6 minors in task-9-review.md.
Task 9: complete (commits ccdfc87..288a1aa, review clean)
Task 10: dispatched (sonnet, BASE 288a1aa)
Task 10: implementer DONE 3b1ac4c (896 unit; recordings e2e 12/12; sections+axe+responsive 133/0). mp4s 138KB/76KB/938KB/1.10MB, ~2.4MB repo total. Concern: tests/sections WorldsStage.autoplay.test.tsx flaky under full-suite load (from T6) → final fix wave. Review dispatched.
Task 10: review → spec ✅ (ffprobe verified h264 High yuv420p faststart no audio ≤1.5MB; R13 Disclosure placement in UnbranchedCaseStudies), quality approved, 0 Crit/Imp, 7 minor.
Ruling: recordings live in UnbranchedCaseStudies (all four projects belong to demoted usc-degree) rather than a drawn branch — R13 names CaseStudy's Disclosure, which they are in — cost if wrong: move them if the owner wants them on a drawn branch.
Task 10: minor (deferred; candidates for final fix wave): video has no aspect ratio → layout jump (aspect-video); four identical "Play the screen recording" buttons (ambiguous a11y names); play() rejection swallowed/untested, focus not asserted; reduced motion still plays after press (defensible, decision); WCAG 1.2.1 text alternative needs authored copy (For Thien); conscea poster weak ("No rows" table); e2e press test chess-only.
Task 10: complete (commits 288a1aa..3b1ac4c, review clean)
Task 11: dispatched (sonnet, BASE 3b1ac4c)
Task 11: implementer DONE_WITH_CONCERNS e8c6dfc. pnpm verify 5/5 (896); full e2e 709/1 (drag-roll 768 flake, passes alone ×6). PERF initial JS 204,678 B = +1,944 B vs main 202,734 (0 skipped ×3); GL/coast/skins only in lazy chunk (78,728 B raw). Review dispatched.
Task 11: review → spec ✅, quality approved, 0 Crit/Imp, 5 minor. All added doc claims verified against code.
Task 11: minor (deferred; final wave candidates): CLAUDE.md:76-77 lists four gl/ files, a fifth (robot.ts) exists; "199.9 KB measured now" will go stale; docs/editing.md residual "world" wording; tracker Before row thin.
Task 11: complete (commits 3b1ac4c..e8c6dfc, review clean)
FINAL: whole-branch review dispatched (opus) on 71e3638..e8c6dfc.
FINAL review (opus): ready to merge with fixes; 12 must-fix, 69 can-wait (triaged in final-review.md). Unit 896/896, typecheck+lint clean, no dependency changes.
Ruling: final #3 — Night side / Volcanic coastline glow switches from accent to the palest of ink/paper — same reasoning as T3a lattice ruling (blue never decoration; a skin carries no fact), overriding R5's permission — cost if wrong: skins less vivid; one-line shader revert if owner allows accent on skins.
Ruling: final #5 — recordings get aria-describedby pointing at the case study's existing authored prose (no new copy); per-recording descriptions go to For Thien — cost if wrong: WCAG 1.2.1 equivalence arguable until the owner authors one line per recording.
Ruling: apply both initial-JS trims (plain <button> + read reduced-motion on press in ProjectRecording; CSS motion-reduce instead of WorldsStage hook) — Plan C sits at the +2 KB edge — cost if wrong: small refactor risk, covered by e2e.
FINAL fix wave dispatched (opus, FIX_BASE e8c6dfc).
FINAL fix wave implemented e8c6dfc..80d0a13 (8 commits; verify 904 unit; full e2e 715/1 robot-walk fps floor flake, passes 18/18 alone). PERF 204,258 B = +1,524 B vs main. Also fixed sphere.test literal-backspace guard (9079204). Scoped re-review dispatched.
MERGED: main fast-forwarded 71e3638→80d0a13 (unit 904/904 on merged tree). Residuals parked (no second fix wave): gl/context.ts:47 stale 'must not paint the accent' comment; robot-walk e2e >60-draws floor (worlds.spec.ts:1447,:498) flaky on slow runners; pressed-flight + mid-flight chapter pick announces landing not chapter; skin label contrast over pale Night/Volcanic glow unmeasured. NOT pushed — awaiting Thien.
