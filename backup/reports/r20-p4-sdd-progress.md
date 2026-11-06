# SDD ledger — plan: docs/superpowers/plans/2026-10-17-round-20-phase-4-earth.md
Spec §4. Worktree .claude/worktrees/r20-earth, branch round-20/earth, base ce6f610. Push pre-approved.

## Preflight scan
| Pair / task | Shared | Finding |
|---|---|---|
| T1–T2 | OriginStop type, lib/worlds.ts | T2 consumes OriginStop; T1 keeps deprecated chapter exports so GlobeCanvas compiles until T2/T3. OK |
| T2–T3 | GlobeCanvas props/controls | T3 consumes focusStop + new props. OK |
| T1–T3 | deprecated exports | T3 deletes them. OK |
| T1 | self | crossingKm value recorded before move. OK |
| T2 | self | robot lap after landing replaces tech gate. OK |
| T3 | self | 2D fallback test; PNG block removal. OK |
Ruling: the robot walks one lap after each landing (replacing the Technology-chapter gate and the two-lap toggle) — spec keeps the robot + Sun/Moon but retires the chapter that hosted them — cost if wrong: the robot appears more often than before; one condition to change.
Ruling: USC coordinates (Columbia SC, 33.9938, -81.0300) are authored as a new public-location fact — spec requires clicking stop 3 to turn the globe — cost if wrong: the pin is slightly off campus centre.
Task 1: implementer DONE_WITH_CONCERNS (afb6378). vitest 1015; eval r@1 70.0 r@3 93.3 r@5 96.7 MRR 0.807 (taylors stop not indexed — r@3 fell to 90.0 with it). crossingKm still a function (14960 km). Deprecated: lib/worlds.ts, content/worlds.ts, content/skins.ts, lib/skins.ts — Task 3 deletes.
Task 1: review Needs fixes (worlds expansion vocabulary sends cat/Vietnam queries to stop captions — probed; 3 false comments). Fix round 1 dispatched.
Task 1: Ruling: leaving Taylors' caption unindexed is accepted (place/date indexed via origin doc; headline fact via eastside-high.context) — cost if wrong: the exact sentence isn't retrievable.
Task 1: carried to Task 3 lens: answer-corpus.ts:233-236 "plaques are retired" and companion-facts.ts stops-count "the section computes" become true only once Task 3 lands; Task 3 deletes worlds.test.ts + CareerTree plaque assertions.
Task 1: fix round 1/5 (2 addressed, 0 open; commits afb6378..5ad0b73)
Task 1: Owner note: the chat now has no answer about the cats (only the retired Animals plaque carried them) — Ruling: leave it unindexed this phase; offer a cats document (from the pets content) to Thien — cost if wrong: "what are his cats called" returns nothing.
Task 1: complete (commits ce6f610..5ad0b73, review clean)
Task 2: implementer DONE_WITH_CONCERNS (68faf5a). verify 1019; JS at load −606 B; globe chunk 79,771→73,435 B (gz 30,074→27,711). Carried to Task 3: WorldsStage "seed" copy false + dead skin buttons + robot toggle; Taylors/USC pins ~140 km apart overlap on phones; e2e must wait for/settle the ~6 s robot walk after landing; glyphs.ts trimmable after deletions.
Task 2: Ruling: keep the existing Moon-then-Sun walk as "one lap after landing" — the owner asked for the full circle with Sun/Moon in round 18 — cost if wrong: ~6 s of frames after each landing.
Task 2: review Needs fixes (Sun/robot/lit cities persist at rest after walk; sphere test title false).
Task 2: Ruling: Sun/Moon, robot and lit cities show only while the robot walks; a finished walk returns to the plain planet (robot = -1), except reduced motion keeps the still pose — matches "Sun/Moon only while walking" and keeps the rest look plain — cost if wrong: the owner may want the lit planet to linger.
Task 2: carried to Task 3 lens: GlobeCanvas header "every stop it pins is also a button" and click-to-orient "the stop buttons" become true only after Task 3; WorldsStage reset doc "seed"; ROBOT_HOLDS/RobotHold/robot toggle removal.
Task 2: fix round 1/5 (5 addressed, 0 open; commits 68faf5a..254fb48). minor (deferred): one redundant plain redraw after the walk ends.
Task 2: complete (commits 5ad0b73..254fb48, review clean)
Task 3: implementer DONE_WITH_CONCERNS (7729c5b). verify 964; e2e worlds 246/0, axe 19, fragments 6, ask 28, responsive 24, interactions 7, companion 75/1 flake→pass. JS −4.3 KB. Concerns: replay jumps globe into view on phones; AskThisSite intro copy changed; Carolina pins overlap (active covers other); dead exports actForProject/arcApex/arcMidpoint/SCENE_NAMES.
Task 3: review Needs fixes (stop-3 sources in CLAUDE.md/editing.md; README count line; contact.spec stale locator; pin comment; rail repeats prose).
Task 3: Ruling: drop the rail's "Stops" row (h2 states three) and keep the crossing distance only in the rail (remove the km line under the globe) — CLAUDE.md: the rail never restates the prose beside it — cost if wrong: the km line under the globe was a nice caption; restore by moving it out of the rail instead.
Task 3: Ruling: "Worlds" eyebrow stays in Section's slot (not the stop column) — reviewer accepted at 1440 — cost if wrong: minor layout variance from the Earth A board.
Task 3: Owner note: AskThisSite intro now says "or a few of them joined into one line" (true; owner may reword).
Task 3: fix round 1/5 (7 addressed, 0 open; commits 7729c5b..ae0cdc6)
Task 3: complete (commits 254fb48..ae0cdc6, review clean)
Task 4: DONE (383064b). verify 961; eval 70.0/93.3/96.7/0.807; e2e 914/706/0; JS at load 169,377 B; globe chunk 73,734 B; lag (idle CPU 4–10%) 44–46 fps, worst 117–150 ms, worlds entry 56–65 ms.
Ruling: Task 4 reviewed inside the final whole-branch review (docs/measurements only) — cost if wrong: one fewer look at the tracker row.
Task 4: complete (commits ae0cdc6..383064b, reviewed in final review)
Final fix wave: 3 commits + screenshots at HEAD; mini-Thien over stop list was mid-walk (0 resting overlaps in 4 loads × 18 s). Re-review: controller read report + screenshot.
