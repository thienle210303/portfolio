# Round 20 Phase 4 (Earth) ledger

Branch `round-20/earth`, base `ce6f610`, head `ae0cdc6` (plus the record commit). Spec section 4.

## Per-task summary
- Task 1 (`afb6378`, `5ad0b73`): origin story modelled as three stops (Kien Giang, Taylors, USC with new authored coordinates); plaque documents dropped from the chat corpus; stop vocabulary kept off the cat/moon terms. Review clean after 1 fix round.
- Task 2 (`68faf5a`, `254fb48`): globe engine stripped to coastlines, the flight, the robot and three stop pins; Sun/Moon, robot and lit cities show only while the robot walks. Globe chunk 79,771 -> 73,435 B raw. Review clean after 1 fix round (5 addressed).
- Task 3 (`7729c5b`, `ae0cdc6`): Worlds laid out as "One crossing, three stops."; chapters, skins, plaques and WorldPanel deleted; the crossing distance printed once, in the rail. Review clean after 1 fix round (7 addressed).
- Task 4: verify, e2e, perf, lag and tracker rows recorded (see docs/feedback-tracker.md, "Round 20 phase 4").

## Rulings (verbatim from progress.md)
Ruling: the robot walks one lap after each landing (replacing the Technology-chapter gate and the two-lap toggle) — spec keeps the robot + Sun/Moon but retires the chapter that hosted them — cost if wrong: the robot appears more often than before; one condition to change.
Ruling: USC coordinates (Columbia SC, 33.9938, -81.0300) are authored as a new public-location fact — spec requires clicking stop 3 to turn the globe — cost if wrong: the pin is slightly off campus centre.
Task 1: Ruling: leaving Taylors' caption unindexed is accepted (place/date indexed via origin doc; headline fact via eastside-high.context) — cost if wrong: the exact sentence isn't retrievable.
Task 1: Owner note: the chat now has no answer about the cats (only the retired Animals plaque carried them) — Ruling: leave it unindexed this phase; offer a cats document (from the pets content) to Thien — cost if wrong: "what are his cats called" returns nothing.
Task 2: Ruling: keep the existing Moon-then-Sun walk as "one lap after landing" — the owner asked for the full circle with Sun/Moon in round 18 — cost if wrong: ~6 s of frames after each landing.
Task 2: Ruling: Sun/Moon, robot and lit cities show only while the robot walks; a finished walk returns to the plain planet (robot = -1), except reduced motion keeps the still pose — matches "Sun/Moon only while walking" and keeps the rest look plain — cost if wrong: the owner may want the lit planet to linger.
Task 3: Ruling: drop the rail's "Stops" row (h2 states three) and keep the crossing distance only in the rail (remove the km line under the globe) — CLAUDE.md: the rail never restates the prose beside it — cost if wrong: the km line under the globe was a nice caption; restore by moving it out of the rail instead.
Task 3: Ruling: "Worlds" eyebrow stays in Section's slot (not the stop column) — reviewer accepted at 1440 — cost if wrong: minor layout variance from the Earth A board.

## Deferred minors
- One redundant plain redraw after the robot's walk ends (Task 2).
- Dead exports noted by Task 3 (actForProject, arcApex, arcMidpoint, SCENE_NAMES) were dropped in the fix round per its commit title; glyphs.ts was trimmed in the fix round (4 glyphs left: bird, robot, sun, moon; all drawn).
- Replay jumps the globe into view on phones (Task 3 concern, not recorded as fixed).
- Retrieval recall@1 is exactly on its 0.7 floor (70.0%); any one-case regression fails the eval.

## Owner notes
- Cats are no longer answerable in chat: only the retired Animals plaque carried them; offer a cats document from the pets content.
- AskThisSite intro now says "or a few of them joined into one line" (true; reword if wanted).
- Carolina pins (Taylors and USC, about 140 km apart) touch on phones when neither is active; the active one covers the other.
- The robot clears after its walk: the finished walk returns to the plain planet (reduced motion keeps the still pose).
