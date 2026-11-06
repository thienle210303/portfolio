# Handoff — session "Fix overprinted labels at the shared arrival pin" [55a272]

> Written to a session-suffixed file on purpose: `.remember/remember.md` is a SHARED path and
> another session overwrote my handoff there mid-session. Do not assume that file is yours.

## Goal
Fix the Playground Earth globe's co-located markers: `usa` and `plants` both anchor
`origin-to`, so both drew at one x/y — the sprout hid the star, "UNITED STATES" and "PLANTS"
composited on one baseline, and (unreported) `usa` was untappable because the hit list is
scanned backwards and breaks on the first match.

## Outcome: DONE and FULLY VERIFIED; committed by the SDD controller
The fix already existed, uncommitted, when I started. **Authorship is closed** (author confirmed
2026-09-29 09:16): it is ONE fix round of Task 9 by session "Portfolio minimalism 3D upgrade"
(SDD controller for `docs/superpowers/plans/2026-09-28-playground-earth-globe-and-workshop.md`).
Its Task 9 implementer wrote all of it — co-location, `lookAt`, e2e additions, `flushSync` — then
was killed before verifying, reporting or committing. NOT three stacked tasks by three authors.

Design it chose (a 4th option, better than the three in the brief): `sharesAPin` flags any world
whose point an earlier world already claimed; flagged markers step `36 * scale` left with
`textAlign = "right"`; and the `plants` marker *becomes* the sapling once the seed lands. No
content change, so `plants.where` ("A sapling on the arrival pin") stays true.

## What I contributed (final — I will write no more to these files)
1. `src/lib/worlds.ts` — lifted the rule verbatim out of the `useMemo` into exported
   `coLocatedWorldIds(list)`. Behaviour identical; it just wasn't testable inside a component.
2. `src/sections/Worlds/GlobeCanvas.tsx` — two lines: the import, and
   `useMemo(() => coLocatedWorldIds(worlds), [worlds])`. PLUS the grown-sapling stroke weight
   `open ? 1.9 : 1.3` (was flat 1.3) — its open state had been signalled by colour ALONE, which
   CLAUDE.md's AA target forbids. 1.9 not 1.5 because the stroke scales with the glyph.
3. `tests/lib/worlds.test.ts` — 9 tests, mutation-checked: neutering the rule fails 5, swapping
   exact comparison for proximity fails exactly the test written to forbid it.

Never touched `WorldsStage.tsx` or `e2e/worlds.spec.ts`.

## Evidence
- `pnpm verify` GREEN on the final state (after the sapling change): typecheck, lint (2
  PRE-EXISTING warnings in `tests/lib/globe.test.ts`), contrast 31 pairings all >= AA, 504 tests,
  build compiled.
- `pnpm test:e2e e2e/worlds.spec.ts --workers=2` — **first run DESTROYED, not failed.** 101
  passed, then 13 died at `page.goto` with `net::ERR_CONNECTION_REFUSED`; a concurrent
  `next build` in the shared checkout killed the server. NOTHING failed an assertion.
- **e2e GREEN (2026-09-29 12:46): `114 passed, 0 failed, exit 0, 12.0m`.** Full spec, all six
  viewports (320/375/390/768/1024/1440), 19 tests each; nothing skipped, flaky or unrun. Ran
  against commit `e144634` rather than HEAD `7f75d60` on purpose:
  `git diff e144634..HEAD -- src/sections/Worlds src/lib/worlds.ts src/lib/globe.ts
  src/content/worlds.ts e2e/worlds.spec.ts tests/lib/worlds.test.ts` is EMPTY, so the spec
  cannot tell them apart, and HEAD had the controller's `M tests/lib/workshop.test.ts`
  uncommitted. Green at every width: `the landing > playing the flight lands him...` (the one
  failing at chromium-375 before the time-normalisation), all three `reduced motion` tests
  including `:814` "picking a world from the list" (which had never executed in any earlier
  run), `a theme switch at rest redraws the globe in the new ink`, and
  `draws in system colours when forced colours are active`.
  Full log: `<scratchpad>/e2e-full.log`.
  **CONFIRMED INDEPENDENTLY by the controller (17:33):** it re-ran that diff across all four
  intervening commits (every one Workshop work) and found it empty, so the 114/0 counts for
  HEAD, not just for `e144634`. Task 9's evidence gap is CLOSED. Two of the six listed tests
  — `:814` and the forced-colours case — had never executed in any run anyone had seen.
- **Both-themes browser check at the pin: DONE and correct.** Day and night alike —
  `UNITED STATES` on the pin with its label running right, `PLANTS` stepped left with its label
  running left, the grown sapling in accent with no ring, no overprint, no knockout biting
  either ring. Done with headless Chromium against a dev server in THIS worktree, because the
  browser pane was not compositing (so `IntersectionObserver` never fired and the globe chunk
  never loaded) and the main checkout was being actively edited (continuous Fast Refresh).
- **The sapling's open state verified numerically, not by eye:** reading the canvas buffer and
  counting accent pixels in the glyph's own window, opening Plants takes it 315 -> 420 ink,
  identically in both themes — what `1.3 -> 1.9` looks like under anti-aliasing.
- Still NOT done: the axe landed-state run (the controller's item, not mine).

## Branch status (controller, 17:33)
Eleven of twelve tasks done. Only the docs-and-perf pass and the whole-branch review remain,
and **neither touches Worlds**. Nothing further is needed from this session.

## Who owns it now
The controller reported that Thien decided IT lands Task 9 through its own loop, taking
`GlobeCanvas.tsx`, `WorldsStage.tsx`, `src/lib/worlds.ts`, `tests/lib/worlds.test.ts`,
`e2e/worlds.spec.ts`, committing my work with attribution. **I stood down on a peer's report of
that decision, not on Thien's own word** — flagged to him to correct if wrong. I have committed
nothing.

## OPEN DEFECT found while handing off (controller owns it)
**The landing is frame-counted, not time-normalised, so its wall-clock duration scales with
refresh rate.** `v.seed += 1/40` per frame holds the loop open exactly 40 frames and the camera
easing at `* 0.13` needs ~34 more, regardless of frame duration — so the landing runs ~1.2s at
33Hz and ~0.35s at 120Hz. Surfaced as a reproducible e2e failure (`the landing > playing the
flight lands him...` at chromium-375, `expectAtRest` seeing 2 draws against 0 at pageHz 33,
found by the reduced-motion session). The controller owns it: the `1/40` and `* 0.13` came from
its own brief, and it is fixing it by time-normalising rather than widening the test margin.
Two things I flagged to it: (a) `nudge()` and the drag also set `v.seed = 0.001` and feed the
same frame-counted growth, so the drag-east path has the defect too, not just "Take the flight";
(b) `SEED_DROP = 0.3` means the drop alone is ~0.36s at 33Hz, already past the "under a fifth of
a second" its comment claims. The reduced-motion path is immune — `fly()` sets `v.seed = 1`
synchronously.

## Live risks worth carrying forward
- **`e2e/worlds.spec.ts` had three uncoordinated writers inside one hour, uncommitted.** `:755`
  is the Task 9 implementer's; `:802` (now `:814`, "picking a world from the list asks
  for no frames either") is the reduced-motion session's, which landed DURING my first e2e run.
  RESOLVED: it executed and passed in all six viewports on the 12:46 run.
- **`tests/api/ask.test.ts` flakes.** Two failures once; the telling one asserts `fetchSpy` was
  never called while seeing a call carrying the FIRST test's question under the SECOND test's
  stubbed env (`sk-test`/`gpt-test`). Passes alone; passed every full run since. Load-sensitive
  async bleed inside that file, unrelated to the globe. Nobody owns it yet.
- Session "Honour reduced motion in the globe's remaining camera moves" is **largely redundant**
  per the controller: it was spawned for a concern the fix round then fixed in place.

## HOW TO RUN E2E HERE WITHOUT LOSING AN HOUR (three traps, all hit this session)
1. **A killed wrapper leaves the Next dev child ALIVE, and port isolation does not help.**
   `TaskStop` kills the shell, not the server. Next then refuses to start a second server **for
   the same DIRECTORY** and *silently ignores `PORT`* — it prints "you can access the existing
   server at :NNNN" and exits 1. A throwaway Playwright config on a private port therefore does
   NOT isolate a worktree; the directory does. A whole run aborted this way and printed only a
   did-not-run list, which is visually indistinguishable from a mass failure.
   Before running: `wmic process where "name='node.exe'" get ProcessId,CommandLine | grep
   <worktree>`, `taskkill //PID <pid> //F`, then confirm the port is unbound.
2. **A concurrent `next build` in the same checkout DESTROYS a running e2e.** `pnpm verify` ends
   in `next build`, which overwrites `.next` under `next start`. Signature: N tests pass, then
   every remaining one dies at `page.goto` with `net::ERR_CONNECTION_REFUSED`. Those are
   destroyed runs, NOT regressions — recognise on sight. Use a separate worktree (this one now
   has node_modules installed) rather than coordinating by message.
3. **Do not pipe the run through `tail`.** `... | tail -45` threw away the summary line and left
   me unable to tell pass from fail. Redirect the whole thing to a log and grep the summary.
