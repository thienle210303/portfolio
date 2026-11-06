# Rare flake: a cat's first stop overlaps a hero button (owner request, 2026-10-04)

## Symptom
In `e2e/companion.spec.ts` "a layout shift with no scroll still moves resting explorers off the text it
brings" (~:1361), about 2 in ~150 runs fail the setup check "the stop was not clear to begin with" with
`button at 1087,185` / `button at 846,183` — a cat's feet/belly (three-point probe) over a hero button at
its first stop in a section. That first stop is usually the section's PERCH (`planExplore` with
`firstInSection`, `planMood` → hero `[data-cat-perch]` "Scroll" row), picked by the three-point
`isClearSpot` alone.

## Leading hypothesis (confirm or refute with evidence first)
The same drift the explorer stops just got fixed for: `advance()` (companion-motion.ts) stops a cat
within 0.6px of its target, so a perch/mood/fallback spot whose probe clears a button edge by a fraction
of a pixel comes to rest over it. `exploreClear` now checks an `EXPLORE_REST_MARGIN` (1px) square
(companion-moods.ts ~334-366); the perch path and the `findClearSpot` fallbacks do not.
Other candidates: hero content shifting under a held perch without scroll/body resize (the documented
gap in `reprobeHeld`), or the follower trailing the lead (`trailLead`) onto a button.

## Do
1. Reproduce: run that test at --repeat-each=40 on a production build (chromium-1440, --workers=2),
   instrumented (throwaway, never committed) to log, for any failing stop: which branch produced it
   (perch / explore pick / fallback / trail), the target spot, the rest position, and the button rect.
   Also measure on a production build of 7c... no — of main BEFORE the stagger work, 70cdb3f, at the
   same repeat, to say whether this predates the last change.
2. Fix the root cause in the product (not by loosening the test). If it is the drift: apply the same
   rest-margin check to perch spots and to the trailing follower's settle — preferably by extending the
   shared probe used where those spots are chosen (e.g. a `restClear(point, probe)` helper reused by
   `exploreClear` and the perch/mood path), without changing moods' semantics otherwise. Unit-test it
   (a spot whose probe clears an edge by 0.1px is rejected).
3. Keep every comment true; a false comment is a defect here.

## Prove
- That test at --repeat-each=60 on the fixed production build: 60/60.
- Full companion.spec.ts + axe.spec.ts at --workers=2: 0 failures, twice.
- pnpm verify.
Rules: 31xx ports (3000 is the main checkout's dev server); throwaway playwright config spreading
playwright.config.ts, webServer undefined, launchOptions.executablePath =
C:/Users/thien/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe;
never pipe e2e through tail; kill servers by PID; delete throwaways; leave PID 4292 alone; no subagents.
