# Cats leave their explorer stops independently (owner request, 2026-10-03)

Today `ExploreRun` (src/components/companion/Companion.tsx ~1167) holds ONE plan for both cats:
one `arrivedAt` (set only when BOTH are within 4px), one `until`, so the pair always set off at the
same instant — reads lockstep. The spec (docs/superpowers/specs/2026-10-02-companion-explorers-design.md
§1) says "Each cat independently holds a target and, on arrival, dwells 4000–9000 ms, then picks a new
one."

## Change
- Give each cat its own stay clock in the run: `arrivedLead`/`arrivedFollow`, `untilLead`/`untilFollow`
  (rename as you like), each set when THAT cat is within 4px of its own spot, dwell
  `EXPLORE_DWELL + rng*EXPLORE_DWELL_SPREAD` rolled per cat. Facing rolled per cat on its own arrival
  (seeded as today via randomFacing with that cat's key).
- When ONE cat's stay (or its walk cap EXPLORE_WALK_MAX) ends, re-pick ONLY that cat's spot: its own
  half (`"left"` lead / `"right"` follow) via `pickExploreSpot` with `other` = the partner's CURRENT
  target, probe = `exploreClear` (the head-band probe used by planExplore), so the 160px gap and
  60px-column rules hold against the partner's spot; fall back exactly as planExplore does for a single
  null pick. Re-record that cat's head-clear flag (headLead/headFollow) for the new spot (so
  `heldExploreClear` stays truthful). Apply `clearFollowOfToggle` when re-picking the follower.
  Expose a small pure helper in companion-moods.ts for "re-pick one cat against its partner" so it is
  unit-testable; don't duplicate planExplore's logic.
- Perch stops stay paired: she trails him; when a perch stay ends, the pair re-plan together via
  planExplore exactly as today (then subsequent stops are independent).
- Everything that today drops the whole run (re-probe failing, chase start, section change, resize,
  ride out of view) still drops the whole run — unchanged.
- Napping / waking / idle stillness unchanged: when idle, both settle and the loop stops (0 rAF).
- Update every comment this falsifies (ExploreRun doc, "How long the explorers stay somewhere once
  they both get there", exploreTo comments, the `arrivedAt` consumers at ~3255/~3374 which read
  `exploreRun.current?.arrivedAt` for facing — make them per-cat).

## Tests (failing first)
- Unit (tests/lib/companion-scenes.test.ts or companion-space.test.ts): the re-pick helper keeps the
  partner's spot, respects 160px/column against it, stays in its own half, falls back as planExplore
  does; seeded rng.
- e2e (e2e/companion.spec.ts, desktop): over ~30 s of activity, record each cat's departure times
  from still stops; assert at least one departure where the two cats left more than 1000 ms apart
  (RED on main today: they always leave together), AND keep the existing "both halves / never one
  column while both still" assertions passing. Non-vacuous: require ≥ 3 departures per cat.

## Gates
pnpm verify; companion e2e at --workers=2 on a production build (throwaway config spreading
playwright.config.ts, 31xx port — 3000 is the main checkout's dev server — webServer undefined,
launchOptions.executablePath = C:/Users/thien/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe);
the new e2e + "explorers use both halves" + the nap test at --repeat-each=8 (8/8). Never pipe e2e
through tail; kill servers by PID; delete throwaways; leave PID 4292 alone.
