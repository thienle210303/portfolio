# Round 18 Plan D — Follow-ups: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the owner's 2026-10-05 decisions on top of Plan C. The crossing replays while it is watched. A Moon and a Sun mark the robot's two laps. Six recordings ship where a visitor can find them, each with a plain description. The hero stops repeating itself and gets shorter, and Contact keeps the page's one blue control. Plan C's parked residuals are closed.

**Architecture:** The replay is a scheduler in `WorldsStage`, the stage that already owns the autoplay observer. It drives the globe only through the existing `GlobeControls` (`fly`, `reset`, `settle`), so `GlobeCanvas`'s loop and its rest contract are unchanged. Between cycles there is a `setTimeout`, never a frame. The Sun and Moon are overlay drawings chosen by a pure function of the robot's progress, so the GL and 2D-fallback paths get them identically. The recordings move out of the closed disclosure, gain an authored `recordingDescription`, and two more attach to the credentials-strip lines of the two hackathon entries. Neither hackathon entry has a project record, and inventing case-study prose for one is not allowed.

**Tech Stack:** Next.js 16 (App Router), TypeScript strict, Tailwind v4 via `@theme`, Canvas 2D + WebGL2 (no library), vitest + jsdom, Playwright + axe-core, ffmpeg 7.1 at `C:/ffmpeg-7.1-essentials_build/bin`, pnpm only.

**Spec:** [docs/superpowers/specs/2026-09-30-round-18-design.md](../specs/2026-09-30-round-18-design.md) — §4, §5.3, §5.5, §6.4. Where the owner's 2026-10-05 decisions supersede it (§5.5 "does not loop", §4 "location in the rail", §6.4 "inside the branch's disclosure"), Task 11 adds a dated note to the spec.

**Evidence:** [.superpowers/sdd/plan-d/preflight.md](../../../.superpowers/sdd/plan-d/preflight.md). Every premise here was checked against `80d0a13`, and the preflight file gives its file:line. Background: `.superpowers/sdd/plan-d/plan-c-ledger.md`, `plan-c-final-review.md`, `plan-c-final-rereview.md`.

**Depends on:** Plan C, merged (`80d0a13`).

## Global Constraints

- No 3D library and no new dependency of any kind. `pnpm install` needs `npm_config_package_lock=true`.
- Initial JS is **204,258 B** by `pnpm perf`; main before Plan C was 202,734 B. Keep growth minimal. Re-measure, and record a row in `docs/feedback-tracker.md`, after any change to the globe chunk (`src/sections/Worlds/*`, `src/lib/globe.ts`). Read initial JS first. A run that reports skipped responses is not recorded.
- `src/sections/Worlds/coastline-data.ts` is imported only by `GlobeCanvas.tsx`. `GlobeCanvas` reaches the page only through `WorldsStage.tsx`'s `import()`.
- Plaques stay at 12 quoted plus 7 computed, string-for-string. A decoration's accessible name carries `DECORATION_LABEL` ("no plaque · decoration"). Never relax `tests/lib/worlds.test.ts` to a substring.
- Use the semantic aliases only (`text-fg`, `text-fg-muted`, `border-rule`, `bg-surface`, `text-accent`, `bg-ground`). Never use a raw `--color-*` token or a hex value. Blue is never decoration. Contact's "Send it as written" is the only blue fill on the page.
- WCAG 2.2 AA, in both themes and all three tones.
- A false comment, doc or line of copy counts as **Important**. Fix or delete every comment a task makes untrue, in that task.
- A test that can pass while asserting nothing is worse than no test. Every new assertion must be shown to fail against a deliberately broken implementation, and the mutation recorded in the task report.
- The retrieval floors 0.9 / 0.95 / 0.7 / 0.8 never move. Nothing in this plan adds a field to the chat's indexed surface. **Do not index `recordingDescription`**: generic vocabulary costs precision (CLAUDE.md, the `file` lesson).
- `src/lib/` never imports from `src/sections/`.
- Ask before any copy the owner has not seen ships as final. Every new sentence in this plan is a **draft**, and the owner will rewrite page-wide copy later.

### Running e2e and perf in this worktree (every task)

- e2e: copy `playwright.config.ts` to an untracked `playwright.local.config.ts`, which is never committed. In the copy, set `use.baseURL` and `webServer.port` to a free **31xx** port and `webServer.command` to `pnpm dev -p 31xx`. Set `reuseExistingServer: false` and `launchOptions.executablePath` to `C:/Users/thien/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe`. Run `npx playwright test -c playwright.local.config.ts <spec> --workers=2`.
- **Never pipe test output through `tail`.** It hides the failure count.
- Afterwards, kill the server by PID: `netstat -ano | grep ":31xx .*LISTEN"`, then `Stop-Process -Id <pid>`. **Leave PID 4292 and port 3000 alone.**
- To retry an e2e flake, run that spec alone. Report both runs. Never call a flake "pre-existing" without a run on `80d0a13` that shows it.
- perf: run `pnpm build`, then `PORT=31xx pnpm start` in the background. Run a throwaway copy of `scripts/perf.mjs` pointed at the headless shell above, three times. Every run must report 0 skipped responses. Stop the server by PID.

## Review Focus

1. **A replay timer firing for nobody.** Watch for a hold that ends after the stage has left view, after the tab was hidden, or after unmount. Any of these would request frames or move the globe while the visitor is elsewhere, which is the owner's standing rule. → Task 4 unit tests advance fake timers past every exit path, and its e2e measures zero draws off-screen across a full cycle.
2. **"Stop the replay" read as a fly.** The press that stops the loop must never start a flight. An interaction handler that flips the label on `pointerdown` would rebind the button before `click`. → Task 4 tests a pointer press and an Enter press on the button. Each must call `settle` and never `fly`.
3. **A cycle resetting under the visitor's focus.** If the handoff link or any control in the section has keyboard focus when a hold ends, the reset would hide the focused link (`visibility: hidden`). → Task 4 tests that focus inside the section stops the loop instead of resetting.
4. **The replay speaking.** Autoplayed cycles must write nothing to the live region. A flight the visitor asks for after stopping must still be announced. → Task 4 unit tests cover both.
5. **The label swap or the moving link shifting the page.** "Take the flight" ↔ "Stop the replay" must not move "Face Việt Nam". The handoff line already reserves its space. → Task 4 e2e compares the boxes before and after the loop starts.

---

## File Structure

**The replay (Tasks 1–4)**
- Create `src/sections/Worlds/replay.ts`. It holds only the two timing constants, as a plain module so e2e and unit tests can import them without React.
- Modify `src/sections/Worlds/WorldsStage.tsx`. It gets the scheduler, the stop control, the demoted flight button, and the announcement order in `select()`.
- Modify `src/sections/Worlds/GlobeCanvas.tsx`. Only the header's rest rule changes in Task 4.
- Modify `tests/sections/WorldsStage.autoplay.test.tsx`, `e2e/worlds.spec.ts`, `e2e/axe.spec.ts` and `e2e/contact.spec.ts`.
- Modify `src/sections/Footer/Closing.tsx`.

**Sun and Moon, residuals (Tasks 5–6)**
- Modify `src/types/portfolio.ts` (`GlyphId`), `src/sections/Worlds/glyphs.ts`, `src/content/worlds.ts`, `src/sections/Worlds/gl/robot.ts`, `src/sections/Worlds/GlobeCanvas.tsx`, `src/sections/Worlds/gl/context.ts`, `src/components/companion/companion-dialogue.ts` (comment) and `docs/editing.md`.

**The hero (Task 7)**
- Modify `src/sections/Hero/Hero.tsx`, `tests/sections/Hero.test.tsx`, `docs/editing.md`, `src/lib/companion-facts.ts` (comment) and `CLAUDE.md` (one line, gated).

**Recordings (Tasks 8–10)**
- Modify `src/sections/CareerTree/CaseStudy.tsx`, `ProjectRecording.tsx` and `CredentialsStrip.tsx`, plus `src/types/portfolio.ts` and `src/content/portfolio.ts`.
- Create `public/media/mentorhub.{mp4,jpg}` and `public/media/foodroute.{mp4,jpg}`.
- Modify `tests/sections/ProjectRecording.test.tsx` and `e2e/sections.spec.ts`.

**Close-out (Task 11)**
- Modify `docs/superpowers/specs/2026-09-30-round-18-design.md` (dated notes) and `docs/feedback-tracker.md`.

## Task order, tiers, dependencies

| # | Task | Tier | Depends on |
|---|---|---|---|
| 1 | Frame floors that measure the loop, not the machine | sonnet | — |
| 2 | A chapter picked mid-flight is what gets announced | sonnet | — |
| 3 | One blue control on the page | sonnet | — |
| 4 | The crossing replays while it is watched | **opus** | 1, 2, 3 |
| 5 | A Moon and a Sun over the robot's laps | sonnet | 4 |
| 6 | Skin labels measured over the pale skins | sonnet | 5 |
| 7 | The hero says each thing once, and is shorter | sonnet | — |
| 8 | Recordings in plain sight | sonnet | — |
| 9 | Every recording described | sonnet | 8 |
| 10 | MentorHub and Food Route | sonnet | 9 |
| 11 | Docs, the résumé PDF check, whole-branch verification | sonnet | 1–10 |

Run them in the order above. Tasks 7 and 8 touch no file that Tasks 1–6 touch, so they can move earlier if a reviewer is waiting.

---

### Task 1: Frame floors that measure the loop, not the machine

Residual H2. `e2e/worlds.spec.ts:1447` asserts `overlayDraws > 60` in 2 s, which really asserts a frame rate above 30 Hz. The walk is wall-clock normalised, so a 30 Hz runner walks correctly and still fails. The question the test exists to answer is "did a per-frame loop run". The honest measure is that every frame drew, plus a small floor that no non-loop can reach. The crossing's own `> 60` floor (`:498`) is rewritten by Task 4, using the helper this task adds.

**Files:**
- Modify: `e2e/worlds.spec.ts:179-243` (`measureGlobeFrames`), `:1389-1431` (`pressCounting`), `:1447`

**Interfaces:**
- Produces: `measureGlobeFrames(page, ms)` and `pressCounting(...)` both also return `ticks: number`, the count of distinct `requestAnimationFrame` callback timestamps seen in the window, whichever loop requested them. `pressCounting` also returns `framesThatDrew: number`, with the same meaning as in `measureGlobeFrames`. Also produces `expectEveryFrameDrew(m: { ticks: number; framesThatDrew: number }, what: string): void`. Task 4 uses the helper for the crossing.

- [ ] **Step 1: Add the counts and the helper.** In both wrappers, record each callback's `time` in a `Set<number>`, and return `ticks: set.size`. In `pressCounting`, reset a `drewInThisFrame` flag per callback, as `measureGlobeFrames` already does at `:221-227`, and count `framesThatDrew`. `expectEveryFrameDrew` asserts two things:

```ts
expect(m.framesThatDrew, `${what}: a frame went by without the globe drawing (${m.framesThatDrew}/${m.ticks})`)
  .toBeGreaterThanOrEqual(m.ticks - 2); // the first and last frame of the window may straddle it
expect(m.framesThatDrew, `${what}: no per-frame loop ran`).toBeGreaterThan(10);
```

- [ ] **Step 2: Replace `:1447`** (`walking.overlayDraws > 60`) with `expectEveryFrameDrew(walking, "opening Technology")`. Leave `:1474` (`> 10` in 1 s) alone: it is already a small floor.

- [ ] **Step 3: Prove it can fail.** Temporarily make `GlobeCanvas`'s `step()` skip `draw()` on every other frame (`if (frames % 2) draw()` style). Run `e2e/worlds.spec.ts -g "opening Technology walks it once"` at `chromium-1440`. Expected: FAIL on the "a frame went by" message. Revert. Record the mutation and its output in the report.

- [ ] **Step 4: Run** `e2e/worlds.spec.ts -g "robot walks twice"` at all viewports with `--workers=2`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add e2e/worlds.spec.ts
git commit -m "Measure the robot's walk by frames drawn, not frames per second"
```

---

### Task 2: A chapter picked mid-flight is what gets announced

Residual H3. `select()` writes the chapter announcement at `WorldsStage.tsx:163-166`, then calls `focusWorld` at `:167`. For a pressed (non-quiet) flight, `focusWorld` lands it (`GlobeCanvas.tsx:1416-1421`). `handleLanded` then overwrites the live region with the landing sentence (`WorldsStage.tsx:216-219`). React batches both writes, the last one wins, and the chapter the visitor chose is never spoken.

**Files:**
- Modify: `src/sections/Worlds/WorldsStage.tsx:158-170`
- Test: `tests/sections/WorldsStage.autoplay.test.tsx`

**Interfaces:**
- Consumes/Produces: nothing new. `select(id)` keeps its signature.

- [ ] **Step 1: Write the failing test** in the autoplay file. The fake globe's `focusWorld` lands synchronously, as the real one does mid-flight:

```ts
it("announces the chapter, not the landing, when a chapter is picked mid-flight", async () => {
  const user = userEvent.setup();
  const { controls } = await stageWithLiveGlobe();
  controls.focusWorld.mockImplementation(() => globe.land());
  await user.click(screen.getByRole("button", { name: /take the flight/i }));
  await user.click(screen.getByRole("button", { name: /^02\s*Sea/i }));
  expect(screen.getByRole("status")).toHaveTextContent(/^Sea\. /);
  expect(screen.getByRole("status")).not.toHaveTextContent(/landed/i);
});
```

(Match the Sea button however the file's other tests do. The list buttons carry a numeral, a name and a count.)

- [ ] **Step 2: Run** `pnpm vitest run tests/sections/WorldsStage.autoplay.test.tsx`. Expected: FAIL, because the status holds the landing sentence.

- [ ] **Step 3: Implement.** In `select()`, call `controlsRef.current?.focusWorld(id)` **before** `setAnnouncement(...)`. Add one comment line explaining why the order matters: a flight landed by this choice must not have the last word.

- [ ] **Step 4: Run** the file. Expected: PASS. The existing "still announces a flight the visitor asked for" also still passes.

- [ ] **Step 5: Commit**

```bash
git add src/sections/Worlds/WorldsStage.tsx tests/sections/WorldsStage.autoplay.test.tsx
git commit -m "Announce the chapter a visitor picks mid-flight, not the landing it caused"
```

---

### Task 3: One blue control on the page

Item G2. Spec §4 says the page's single blue control is Contact's "Send it as written". Two others still carry the accent fill: "Take the flight" (`WorldsStage.tsx:441-443`) and Closing's "Get in touch" (`Closing.tsx:65`, `Button variant="primary"`).

**Files:**
- Modify: `src/sections/Worlds/WorldsStage.tsx:427-447` (classes and the comment at `:434-440`)
- Modify: `src/sections/Footer/Closing.tsx:58-67` (variant and the comment "stays as the chapter's one primary control")
- Test: `e2e/contact.spec.ts`, `tests/sections/WorldsStage.autoplay.test.tsx`

**Interfaces:**
- Produces: when ready, the flight button's classes equal "Face Việt Nam"'s resting classes (`border border-rule text-[color:var(--fg)]`, plus its own `min-h-11 px-5`). Task 4 adds `data-replay` and a min-width to the same element.

- [ ] **Step 1: Write the failing tests.**
  - e2e, `e2e/contact.spec.ts`: `"the whole page has one blue fill, and it is Contact's send"`. Check the first intent, as `:46-63` does. Scroll `#worlds`'s stage into view and wait for `/take the flight|stop the replay/i` to be visible, so that the globe controls are in their ready state. Then scan `document.body` with the same two regexes `:54-58` uses. Expect `["Send it as written"]`.
  - unit, autoplay file: once the stage is live, the flight button's `className` matches neither `/(^|\s)bg-\[color:var\(--accent\)\]/` nor `/(^|\s)bg-accent(\s|$)/`.

- [ ] **Step 2: Run both.** Expected: FAIL. The e2e lists three fills.

- [ ] **Step 3: Implement.**
  - Closing: change to `variant="secondary"`, and rewrite the comment so it no longer calls "Get in touch" the chapter's primary control.
  - WorldsStage: in the ready branch, use the reset button's classes. Rewrite the `:434-440` comment to say the accent fill belongs to Contact's send (spec §4), and drop the measured-opacity numbers that described the old fill.

- [ ] **Step 4: Run** the unit file, then `e2e/contact.spec.ts`, `e2e/axe.spec.ts` and `e2e/worlds.spec.ts` at `--workers=2`. Expected: PASS, with axe clean in both themes.

- [ ] **Step 5: Commit**

```bash
git add src/sections/Worlds/WorldsStage.tsx src/sections/Footer/Closing.tsx e2e/contact.spec.ts tests/sections/WorldsStage.autoplay.test.tsx
git commit -m "Leave Contact's send as the page's only blue control"
```

---

### Task 4: The crossing replays while it is watched

Item A, as the owner decided: "then reset" means looping the autoplay. The design follows.

- **One cycle:** the flight lands, the globe holds for `REPLAY_HOLD_MS`, `reset()` eases the camera back to Việt Nam (about 0.9 s), the next timer waits `REPLAY_RETURN_MS` from the reset, and then the crossing flies again.
- **While held there are only timers, never frames.** The globe's own loop already stops at rest.
- **It stops at once when the stage leaves view.** Timers are cleared and `settle()` is called. Coming back resumes: a landed globe holds first, and one at Việt Nam flies at once.
- **It stops for good on any interaction** inside the section: a pointer press, a key, a click (which includes assistive-tech activation), picking a chapter, or keyboard focus inside the section when a hold ends.
- **It never loops under reduced motion.** The single autoplayed landing stays: one synchronous draw, as today.
- **Autoplayed cycles stay silent.** `quietRef` is set before every replayed `fly()`.
- **WCAG 2.2.2 (Pause, Stop, Hide, Level A) needs a visible way to stop auto-started motion that runs longer than 5 s.** While the loop runs, the flight button reads **"Stop the replay"**. Pressing it stops the loop and settles. The button then reads "Take the flight" again. This is one element and adds no new control, but the wording is new: **show it to the controller** as part of the report.

The rest contract is redefined. Zero frames hold:
- after any interaction, for good;
- whenever the stage is off-screen;
- under reduced motion;
- through every hold between cycles.

Frames run only while a cycle's flight, landing tail or return is on screen.

**Files:**
- Create: `src/sections/Worlds/replay.ts`
- Modify: `src/sections/Worlds/WorldsStage.tsx`
  - `:142-153`: the `spentRef` doc and the ref itself, replaced.
  - `:192-198`: `handleLanded`.
  - `:311-335`: the autoplay observer.
  - `:378-447`: the root div and the flight button.
  - `:403-408`: the stage pointerdown.
- Modify: `src/sections/Worlds/GlobeCanvas.tsx:69-85` and `:95-101` (the header: "once per page load the stage's autoplay" becomes untrue)
- Test: `tests/sections/WorldsStage.autoplay.test.tsx`; `e2e/worlds.spec.ts` (`:319-354`, `:489-546`, `:1756-1766`); `e2e/axe.spec.ts:264`, `:394`

**Interfaces:**
- Consumes: `GlobeControls.fly`, `.reset` and `.settle`, unchanged (`WorldsStage.tsx:44-61`). `expectEveryFrameDrew` comes from Task 1. The demoted flight-button classes come from Task 3.
- Produces:
  - `src/sections/Worlds/replay.ts`: `export const REPLAY_HOLD_MS = 5_000;` and `export const REPLAY_RETURN_MS = 1_500;`. These are the only timing constants, and tests import them.
  - The flight button carries `data-replay=""`. Its label is `"Stop the replay"` while the loop runs and `"Take the flight"` otherwise. It is never `disabled`.
  - `e2e/worlds.spec.ts` gains `stopTheReplay(page)`: if "Stop the replay" is visible it clicks it, and either way it waits for rest. `waitForLiveGlobe` calls it, so every existing test still starts from "landed, at rest, not looping".

**Every test that assumed one play** (preflight §1). Rewrite or adapt each one; do not delete any:
- unit `:121`, `:141-150`, `:176-185`;
- e2e worlds `:319-354` (helpers; the label wait at `:322` becomes `/take the flight|stop the replay/i`), `:489-516` (including the `> 60` floor at `:498`, which becomes `expectEveryFrameDrew` over a 1 s window mid-flight), `:518-546`;
- axe `:264`, `:394`, which call `stopTheReplay` after the landing and before auditing.

- [ ] **Step 1: Write the failing unit tests.** Use `vi.useFakeTimers()` after `stageWithLiveGlobe()` resolves. Stub `matchMedia` (jsdom has none, `vitest.setup.ts:3-10`) with `reduce` controllable per test. Advance with `act(() => vi.advanceTimersByTime(ms))`. Assertions per test:
  1. *"replays while in view: land, hold, reset, fly again, all silent."* Fly is called once at 0.6 in view. `globe.land()` is called. After `REPLAY_HOLD_MS - 1`, `reset` has not been called; at `REPLAY_HOLD_MS`, `reset` has been called once and `data-crossing` is absent. After a further `REPLAY_RETURN_MS`, `fly` has been called twice. Call `globe.land()` again: the status is empty and the button name is "Stop the replay".
  2. *"leaving view clears the pending cycle at once."* During a hold, `report(0)`; `settle` is called. Advance 20 s: `reset` and `fly` counts do not change.
  3. *"coming back resumes: a landed globe holds first, one at Việt Nam flies at once."* Exit during a hold, then `report(1)`: no `fly` yet, and after `REPLAY_HOLD_MS`, `reset` is called. Exit during the return, then `report(1)`: `fly` is called immediately.
  4. *"any press, key or click in the section stops it for good."* For each of: clicking the Sea chapter, `keyboard("{ArrowLeft}")` on the focused stage, and clicking a skin button. Then advance 20 s: no further `reset` or `fly`, and the button reads "Take the flight".
  5. *"Stop the replay settles and never flies, by pointer or by Enter."* `user.click(stop)`: `settle` is called once, `fly` count is unchanged, and the button reads "Take the flight". Repeat on a fresh render with `stop.focus(); user.keyboard("{Enter}")`.
  6. *"a focused control in the section stops the cycle instead of resetting under it."* During a hold, focus the career-tree link (it is in the DOM, visibility-hidden only when not landed). Advance `REPLAY_HOLD_MS`: `reset` is not called, and the button reads "Take the flight".
  7. *"never loops under reduced motion."* With `reduce: true`, entering view calls `fly` once. After `globe.land()`, advance 20 s: `reset` is not called, and the button never reads "Stop the replay".
  8. *"a hidden tab re-arms the hold instead of advancing."* Set `document.hidden` to true (via `vi.spyOn(document, "hidden", "get")`). Advance `REPLAY_HOLD_MS`: `reset` is not called. Set it to false and advance `REPLAY_HOLD_MS` again: `reset` is called once.
  9. *"unmount clears the pending timer."* `unmount()` during a hold, then advance 20 s: `reset` is not called.
  10. A visitor's own flight after stopping is still announced. This is the rewrite of `:176`: stop, then take the flight, then `globe.land()`, then the status matches `/landed/i`.
  Rewrite `:121` as test 1's "once into view starts one cycle, not two", and `:141-150` as test 3.

- [ ] **Step 2: Run** `pnpm vitest run tests/sections/WorldsStage.autoplay.test.tsx`. Expected: FAIL, because `replay.ts` does not exist.

- [ ] **Step 3: Implement the scheduler in `WorldsStage.tsx`.**
  - Replace `spentRef` with `loopRef = useRef<"idle" | "looping" | "stopped">("idle")`. Add `const [looping, setLooping] = useState(false)`, `timerRef` (the pending timeout id), `landedRef` (mirrors `landed` for the observer's closure) and `rootRef` on the outer grid div.
  - `stopReplay()`: set `loopRef = "stopped"`, clear the timer, call `setLooping(false)`. Calling it from `"idle"` stops the first autoplay too, which keeps today's tests at `:187`, `:198` and `:226` true.
  - Autoplay observer:
    - On exit: clear the timer, then `settle()` (as now).
    - On entry at a ratio of 0.5 or more:
      - `"idle"` under reduced motion: set `"stopped"` and do a quiet `fly()`. It lands synchronously.
      - `"idle"` otherwise: set `"looping"`, call `setLooping(true)`, and do a quiet `fly()`.
      - `"looping"`: if `landedRef.current`, schedule the hold; otherwise do a quiet `fly()`.
    - Read the motion preference with `window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true`, at the moment of asking, with no subscription. That keeps the initial-JS cost out, as Plan C's trim 2 did.
  - `handleLanded`: in the quiet branch, schedule the hold only when `loopRef.current === "looping" && inViewRef.current`.
  - Each timer's callback checks the following, in order:
    1. Reduced motion is now on: `stopReplay()`.
    2. `document.hidden`: re-arm the same timer and do not advance.
    3. `rootRef.current?.contains(document.activeElement)`: `stopReplay()`.
    4. Otherwise advance. The hold timer advances by calling `controls.reset()` and `setLanded(false)`, then scheduling the return. The return timer advances by setting `quietRef = true` and calling `controls.fly()`.
  - The reset here does **not** go through `handleReset`, which would announce.
  - Clear the timer in the observer effect's cleanup and in an unmount effect.
  - Root div: add `onPointerDownCapture`, `onKeyDownCapture` and `onClickCapture`, each calling `stopReplay()` unless `(event.target as Element).closest("[data-replay]")`. Without that exemption, a `pointerdown` on "Stop the replay" would re-render it as "Take the flight" before its `click`, which is Review Focus 2.
  - Remove the `spentRef` writes from the stage `onPointerDown` and the `ArrowRight` branch, since the capture handlers cover them. Keep their `quietRef = false`.
  - Flight button:
    - add `data-replay=""`;
    - label: `controlsReady ? (looping ? "Stop the replay" : "Take the flight") : canvasFailed ? … : …`;
    - `onClick={looping ? handleStopReplay : handleFly}`, where `handleStopReplay` calls `stopReplay()` then `controlsRef.current?.settle()`. `handleFly` and `handleReset` also call `stopReplay()` themselves. The capture handlers exempt this button, so without that call a "Take the flight" press before the first autoplay would leave the loop `"idle"`, and the next entry into view would fly over the visitor's flight (`:226`);
    - add a `min-w-*` wide enough for the longer label at this font, so the swap moves nothing. Measure it; do not guess.
  - Rewrite the doc comments at `:142-153` and `:311-314` to describe the loop truthfully.

- [ ] **Step 4: Rewrite `GlobeCanvas.tsx`'s header** (`:69-85`, `:95-101`). The loop still requests a frame only while something moves. What wakes it: the visitor, or the stage's replay, which runs only while the stage is in view, stops for good on interaction, and never runs under reduced motion. List the four rest conditions from this task's intro. No code changes in this file.

- [ ] **Step 5: Run** the unit file. Expected: PASS. Then run `pnpm test`. Expected: all pass.

- [ ] **Step 6: Write and adapt the e2e.**
  - Helpers:
    - `waitForLiveGlobe` waits for `/take the flight|stop the replay/i` (`:322`).
    - `waitForAutoplayedLanding` stays as it is.
    - Add `stopTheReplay(page)`, called at the end of `waitForLiveGlobe`.
    - Import `REPLAY_HOLD_MS` and `REPLAY_RETURN_MS` from `../src/sections/Worlds/replay`.
  - Replace `:489-516` with *"replays the crossing while the stage is in view, silently, and draws nothing while it holds"*:
    - Wait for the first landing and rest. `expectAtRest(page, 2_000, "inside the hold")`.
    - Record the boxes of "Face Việt Nam" and the career-tree line.
    - `expect.poll` for `data-crossing` to go absent, with a timeout of `REPLAY_HOLD_MS + 3_000`.
    - Once the flight is drawing, `expectEveryFrameDrew(await measureGlobeFrames(page, 1_000), "the replayed crossing")`.
    - Wait for it to land again. Through all of this the status region never contains `/landed|Back at/`, which a MutationObserver installed before the cycle confirms by counting zero writes.
    - Both boxes are unchanged.
  - Replace `:518-546` with *"leaving mid-flight lands it at once, nothing draws off-screen through a whole cycle, and coming back resumes after a hold"*:
    - Exit mid-flight: landed within 500 ms.
    - `expectAtRest(page, REPLAY_HOLD_MS + REPLAY_RETURN_MS + 1_000, "off-screen")`.
    - Come back: `expectAtRest(page, 2_000, "back, holding")`, then `data-crossing` goes absent within `REPLAY_HOLD_MS + 3_000`.
  - New: *"Stop the replay stops it for good, and the flight is the visitor's again"*:
    - Press Stop.
    - `expectAtRest(page, REPLAY_HOLD_MS + REPLAY_RETURN_MS + 1_000, "after Stop")`.
    - `data-crossing="landed"` throughout.
    - The button reads "Take the flight". Pressing it gets the status `/landed/i`.
  - New: *"picking a chapter stops the replay for good"*: during a hold, click Sea, then assert at rest for `REPLAY_HOLD_MS + REPLAY_RETURN_MS + 1_000` and no reset.
  - Extend `:1756-1766` (reduced motion): after the landing, assert at rest with `SILENT_HZ` for `REPLAY_HOLD_MS + REPLAY_RETURN_MS + 1_000`, `data-crossing` still "landed", and no button named "Stop the replay".
  - In axe `:264` and `:394`, call the same stop (inline or a shared helper) after `landed` and before auditing.

- [ ] **Step 7: Prove the new e2e can fail.** Mutate each in turn, run, see the named failure, revert:
  - drop the hold-timer clear on exit (the off-screen test fails);
  - make `stopReplay` not clear the timer (the Stop test fails);
  - drop the `data-replay` exemption (the Stop test fails, or flies);
  - drop `quietRef = true` before the replayed `fly()` (the silent-cycle test fails).
  Record all four in the report.

- [ ] **Step 8: Run** `e2e/worlds.spec.ts`, `e2e/axe.spec.ts`, `e2e/companion.spec.ts`, `e2e/contact.spec.ts` and `e2e/responsive.spec.ts`, all viewports, `--workers=2`. Expected: PASS. Then `pnpm verify`. Expected: 5/5.

- [ ] **Step 9: perf.** Initial JS before vs after, three runs, 0 skipped. Add a Plan D row to `docs/feedback-tracker.md`. A move of more than ~600 B is a finding to report, not a reason to stop.

- [ ] **Step 10: Commit**

```bash
git add src/sections/Worlds/replay.ts src/sections/Worlds/WorldsStage.tsx src/sections/Worlds/GlobeCanvas.tsx tests/sections/WorldsStage.autoplay.test.tsx e2e/worlds.spec.ts e2e/axe.spec.ts docs/feedback-tracker.md
git commit -m "Replay the crossing while the globe is watched, and stop for good on any touch"
```

---

### Task 5: A Moon and a Sun over the robot's laps

Item F, with residual H1, folded can-wait items m7 and T7 (header), and T11 (editing.md wording). The full-circle walk is unchanged. While Technology is open, a **Moon** shows during lap 1 (unsupervised, the lights go out) and a **Sun** during lap 2 (human in the loop, the lights come back). Both are decorations drawn on the overlay in ink, with a ground knockout. The overlay serves both the GL path and the 2D fallback. Under reduced motion each still lap shows its own body.

**Files:**
- Modify: `src/types/portfolio.ts:390-411` (`GlyphId` += `"sun" | "moon"`)
- Modify: `src/sections/Worlds/glyphs.ts` (two paths)
- Modify: `src/content/worlds.ts:128-131` (two decorations)
- Modify: `src/sections/Worlds/gl/robot.ts` (`robotSky`)
- Modify: `src/sections/Worlds/GlobeCanvas.tsx`
  - `:51-53`: the header's overlay list gains robot, sun and moon (T7);
  - `:707-737`: draw the body;
  - `:766-768`: replace the `"tech"` literals with `TECH_WORLD_ID` (m7).
- Modify: `src/sections/Worlds/gl/context.ts:47-48` (H1)
- Modify: `src/components/companion/companion-dialogue.ts:175-178` (the "nine decorations" comment becomes false)
- Modify: `docs/editing.md:153-213` ("world" becomes "chapter" in the plaque and decoration recipes)
- Test: `tests/lib/robot.test.ts`, `tests/lib/worlds.test.ts:111-120`, `tests/sections/WorldsStage.test.tsx:267`, `e2e/worlds.spec.ts`

**Interfaces:**
- Consumes: `robotPass` and `ROBOT_HOLDS` (`robot.ts:65-79`, `:125-128`).
- Produces: `robotSky(progress: number): "moon" | "sun" | null`, exported from `gl/robot.ts`. It returns null below 0, `"moon"` on pass 1 and `"sun"` on pass 2. Also produces `GLYPHS.sun` and `GLYPHS.moon`.

- [ ] **Step 1: Write the failing tests.**
  - `robot.test.ts`:
    - `robotSky(-1) === null`;
    - `robotSky(0) === "moon"`;
    - `robotSky(0.49) === "moon"`;
    - `robotSky(0.5) === "sun"`;
    - `robotSky(1) === "sun"`;
    - `robotSky(ROBOT_HOLDS.unsupervised) === "moon"`;
    - `robotSky(ROBOT_HOLDS["human-in-the-loop"]) === "sun"`.
  - `worlds.test.ts:118`: `["tech", 3, 4]`. The plaque totals at `:122-128` stay `{ field: 12, computed: 7 }`.
  - `WorldsStage.test.tsx:267`: `toHaveLength(4)`. Each label is found by `getByLabelText` and contains `DECORATION_LABEL`.
  - e2e, `e2e/worlds.spec.ts`, in "the robot walks twice": *"a Moon over the dark lap and a Sun over the lit one, on the GL path and the fallback"*.
    - Run under reduced motion, both with `requireSurface` and with `withoutWebGL2`.
    - Use an in-page probe that counts overlay pixels with alpha > 0 inside the box x ∈ [cx − 1.15r, cx − 0.8r], y ∈ [cy − 1.2r, cy − 0.85r]. Take the disc from the canvas box the way `:583-592` does.
    - With Living Earth open the count is 0. With Technology open on "Human in the loop" it is > 0, and so it is on "Unsupervised".
    - The two boxes' fingerprints differ.

- [ ] **Step 2: Run** the unit files and the new e2e. Expected: FAIL.

- [ ] **Step 3: Implement.**
  - `GlyphId`: add `"sun" | "moon"`.
  - `GLYPHS`: open strokes inside the ±12 box. Suggested paths, to be checked by eye in both themes:
    - sun: `"M-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M0 -11V-7M0 7V11M-11 0H-7M7 0H11M-7.8 -7.8L-5 -5M5 5L7.8 7.8M-7.8 7.8L-5 5M5 -5L7.8 -7.8"`
    - moon: `"M3 -10A10 10 0 0 0 3 10A12 12 0 0 1 3 -10"`. The inner radius is 12, not under 10, so SVG does not rescale the arc. That is the trap the jelly comment at `glyphs.ts:42-47` records.
  - `content/worlds.ts`: append after the two robot lines. These are draft copy, and they describe the drawing only:
    - `{ glyph: "moon", draws: "a moon over the robot's first lap, while the lights go out" }`
    - `{ glyph: "sun", draws: "a sun over the robot's second lap, while the lights come back" }`
  - `GlobeCanvas` draw, inside the `if (lights)` block:
    - `const body = robotSky(v.robot)`.
    - If it is non-null, draw a ground-filled knockout and `glyph(GLYPHS[body], ...)` in `c.fg` at `(geo.cx - 0.97 * geo.radius, geo.cy - 1.02 * geo.radius)`.
    - Name that offset as a constant, with a one-line comment: outside the limb, clear of the orbit ellipse.
    - Keep it ink, not accent: it carries no fact.
  - `context.ts:47-48`: replace the comment with what is true now. Forced colours keep the overlay because only the overlay honours the system palette. `GlobeCanvas` never builds a sphere under forced colours (`GlobeCanvas.tsx:1102-1109`), so this branch is reached only by a caller that does.
  - `companion-dialogue.ts:177`: reword so the comment carries no count ("…plaques plus decorations is the sum, not three of them"). The line it explains reads the numbers from `f.worlds`.
  - `docs/editing.md:153-213`: "world" becomes "chapter" wherever it means a chapter. Check each occurrence; leave quoted ids alone.

- [ ] **Step 4: Run** `pnpm test`, then `e2e/worlds.spec.ts` and `e2e/axe.spec.ts` (Technology in both themes) at `--workers=2`. Expected: PASS. Check the Moon and Sun in a real browser, in both themes, on both paths. The Worlds rail's "Decorations" now reads 11, computed rather than typed (`Worlds.tsx:57`, `:69`).

- [ ] **Step 5: Prove the e2e can fail.** Draw the Moon on both laps, run, and see the fingerprint assertion fail. Revert.

- [ ] **Step 6: perf.** Re-measure. `glyphs.ts` is in the initial bundle through `WorldPanel`, so expect roughly +100–200 B. Add the row.

- [ ] **Step 7: Commit**

```bash
git add src/types/portfolio.ts src/sections/Worlds/glyphs.ts src/content/worlds.ts src/sections/Worlds/gl/robot.ts src/sections/Worlds/GlobeCanvas.tsx src/sections/Worlds/gl/context.ts src/components/companion/companion-dialogue.ts docs/editing.md tests/lib/robot.test.ts tests/lib/worlds.test.ts tests/sections/WorldsStage.test.tsx e2e/worlds.spec.ts docs/feedback-tracker.md
git commit -m "Hang a Moon over the robot's dark lap and a Sun over its lit one"
```

---

### Task 6: Skin labels measured over the pale skins

Residual H4. After Plan C's final wave, the Night side and Volcanic coastline glow mixes toward the palest of ink and paper (`gl/shaders.ts:222`). Label contrast under it was checked by eye only, and no probe exists. Labels get a `--ground` halo (`GlobeCanvas.tsx:488-500`, `HALO_PX = 3.5`).

**Files:**
- Test: `e2e/worlds.spec.ts` (a new test in the skins block)
- Modify, only if the measure fails: `src/sections/Worlds/GlobeCanvas.tsx:221-224` (`HALO_PX`)
- Docs: `docs/feedback-tracker.md` (the measured minima)

**Interfaces:**
- Consumes: `requireSurface`, `settledOverlay` and `SKINS` from the spec file.

- [ ] **Step 1: Write the test.** *"every canvas label keeps 4.5:1 against what touches its letters, under every skin, in both themes."* For day/night × five skins, with Living Earth open and `requireSurface`:
  1. Patch `CanvasRenderingContext2D.prototype.fillText` on the overlay to record `{ text, x, y, font, textAlign, fillStyle }`, then force one redraw by flipping the theme there and back (the `settledOverlay` mechanism).
  2. Take `page.screenshot({ clip: stageBox })`, which is composited GL plus overlay. Decode it in-page with `createImageBitmap(new Blob([bytes]))` onto a canvas.
  3. For each label, rasterise the same text with the same font and alignment into an offscreen canvas to get the glyph mask. Dilate it by 1 px. The **surround** is the dilation minus the mask: the pixels that touch the letters.
  4. Compute the WCAG contrast of the label's `fillStyle` against every surround pixel and take the 5th percentile. Assert `>= 4.5`, with a message naming the skin, the theme, the label and the value.
  Log every label's p5 and record the minima per skin and theme in the tracker.

- [ ] **Step 2: Run it.** If it passes, prove it can fail: set `HALO_PX = 0`, run, see it fail on Night side or Volcanic, revert. If it fails, go to Step 3.

- [ ] **Step 3 (only if Step 2 failed): Widen `HALO_PX`** to the smallest value that passes everywhere. Check in a browser that the halo does not blot the neighbouring marker ring (Plan C T3b minor). Then re-run Step 2's mutation.

- [ ] **Step 4: Run** the skins block at all viewports, `--workers=2`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add e2e/worlds.spec.ts docs/feedback-tracker.md   # plus GlobeCanvas.tsx if Step 3 ran
git commit -m "Measure canvas labels against what touches them under every skin"
```

---

### Task 7: The hero says each thing once, and is shorter

Items G1 and G3.

**G1.** CLAUDE.md says the rail "never restates the prose beside it". "Now" ("Software Engineer, DoorDash", `Hero.tsx:64-66`) restates the positioning line ("…retail data at DoorDash", `portfolio.ts:70-71`). "Based" ("Taylors, South Carolina", `:67`) restates `about[0]` (`portfolio.ts:79`). Drop both. Keep "Open to", "Focus", "Holds" and "Reach me": none of them appears in the identity column.

**G3**, measured in preflight §7 and applied in-page at `80d0a13`:

| Hero height | 1440×900 | 390×844 |
|---|---|---|
| Now | 1138 px | 1836 px |
| After G1 (rail trim) | 1138 px | 1734 px |
| + block padding × 0.6 (as `Closing.tsx` already does) | 1058 px | 1689 px |
| + "Scroll" perch `mt-14` → `mt-8` | 1034 px | 1665 px |
| + identity/code `gap-y-14` → `gap-y-10` | 1034 px | **1649 px** |
| **Total change** | **−104 px** | **−187 px** |

The height stays a floor, not one screen (CLAUDE.md, spec §4). Rebalancing the 5.25/6.75 columns was rejected because the code artifact needs about 494 px of inner width (`Hero.tsx:107-110`).

**Files:**
- Modify: `src/sections/Hero/Hero.tsx`
  - `:7-13`: a false comment. `Section` does take `className` (`Section.tsx:32`, `:94-100`).
  - `:45-72`: the rail, and the now-unused `currentRole`/`location`.
  - `:76-94`: padding and the floor calc.
  - `:112`: the gap.
  - `:141-144`: the perch.
- Modify: `tests/sections/Hero.test.tsx:35-49`
- Modify: `docs/editing.md:82` (the "Now" rail-note bullet)
- Modify: `src/lib/companion-facts.ts:80` (a comment naming Hero's "Now" note)
- Modify: `CLAUDE.md:119` ("…and the hero's "Now" rail note at once"). **Gated: show the one-line diff to the controller before committing.**

**Interfaces:**
- Produces: the rail terms are exactly `["Open to", "Focus", "Holds", "Reach me"]`.

- [ ] **Step 1: Write the failing unit tests.** In `Hero.test.tsx`, replace `:35-39` with *"carries only facts the prose beside it does not say"*:
  - the `dt` texts equal `["Open to", "Focus", "Holds", "Reach me"]`;
  - for every `dd`, neither `profile.positioning` nor any `profile.about` paragraph contains its text;
  - `within(rail).queryByText(/DoorDash|Taylors/)` is null.
  Keep the `:41-49` availability-once assertions. Drop the location-in-rail half, and assert instead that `profile.location` is not in the rail.

- [ ] **Step 2: Run** `pnpm vitest run tests/sections/Hero.test.tsx`. Expected: FAIL.

- [ ] **Step 3: Implement.**
  - Rail: drop "Now" and "Based", and remove the `currentRole` and `location` consts and their comments.
  - Section: pass `className="blueprint-grid pt-[calc(var(--section-y)*0.6)] pb-[calc(var(--section-y)*0.6)]"`. This is the same override `Closing.tsx` uses; `cn` is a plain join (`src/lib/cn.ts`).
  - Floor: `min-h-[calc(100svh-var(--header-h)-var(--section-y)*1.2)]`, and update its comment.
  - Spacing: `gap-y-10` and `mt-8`.
  - Fix the false banner comment at `:7-13`.
  - `docs/editing.md:82`: replace the bullet with the truth. The hero's positioning line names the employer in prose, so changing jobs also means editing `profile.positioning`.
  - `companion-facts.ts:80`: the lookup is its own; drop the Hero reference.
  - `CLAUDE.md:119`: "One career entry feeds the Journey, the résumé and the globe's plaques at once." Gated.

- [ ] **Step 4: Measure.** Run `next dev` on a 31xx port with headless shell 1234, reduced motion and `document.fonts.ready`. Record `#about`'s height at 1440×900 and 390×844 in the report and the tracker. Expected: about 1034 and 1649. This is a measurement, not a permanent test, because a height ceiling would fail the owner's own copy rewrite.

- [ ] **Step 5: Run** `pnpm test`, then `e2e/sections.spec.ts`, `e2e/responsive.spec.ts`, `e2e/axe.spec.ts` and `e2e/companion.spec.ts` (the hero perch and the "page goes still" tests sit at the page top) at `--workers=2`. Check in a browser in both themes. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/sections/Hero/Hero.tsx tests/sections/Hero.test.tsx docs/editing.md src/lib/companion-facts.ts CLAUDE.md docs/feedback-tracker.md
git commit -m "Keep the hero's rail to facts the prose does not say, and tighten its spacing"
```

---

### Task 8: Recordings in plain sight

Item D, with folded can-wait item T10 (`play()` rejection and focus).

Today a visitor has to scroll past the whole Journey stage, find "Coursework and capstone", and open "Read the full case study". Only then does the play button appear, above "Problem" (`CaseStudy.tsx:371-390`; `Disclosure.tsx:105-112` keeps it `invisible`). The e2e walks exactly that route (`e2e/sections.spec.ts:181-185`). **Placement (controller's call): move the recording block out of the disclosure, to the always-visible part of the article, directly before the action row (`CaseStudy.tsx:333`).** The button then sits beside the case study's title, tagline and proof. Press-to-mount and zero requests before the press are unchanged.

**Files:**
- Modify: `src/sections/CareerTree/CaseStudy.tsx:333`, `:371-390`
- Modify: `src/sections/CareerTree/ProjectRecording.tsx:3-11` (the header names the Disclosure as the reason; that reason now applies only to the old placement)
- Test: `tests/sections/ProjectRecording.test.tsx:115-142`, `e2e/sections.spec.ts:172-194`

**Interfaces:**
- Produces: the recording renders outside `[role="region"]` (the disclosure panel), inside a wrapper with `no-print`. `ProjectRecording`'s props are unchanged in this task.

- [ ] **Step 1: Write the failing tests.**
  - Unit, `:122-142`: find the button **without** `hidden: true`, and `expect(button.closest('[role="region"]')).toBeNull()`.
  - Unit, new: *"a rejected play() leaves the video focused with its controls"*. Mock `play` with `mockRejectedValue(new Error("NotAllowedError"))`, press, then `await Promise.resolve()`. Expect `document.activeElement` to be the video and the `controls` attribute to be present. vitest fails on an unhandled rejection, which covers the `.catch`.
  - e2e, `:172-194`: rename it to *"pressing play on a closed case study requests one mp4 and one poster"*. Drop the disclosure click, and assert that the disclosure trigger still has `aria-expanded="false"` after the press.

- [ ] **Step 2: Run them.** Expected: the placement assertions FAIL. The rejection test should pass already; if it does, prove it can fail by deleting `.catch(() => {})` at `ProjectRecording.tsx:44`.

- [ ] **Step 3: Implement.** Move the `project.recording ? (...) : null` block out of `<Disclosure>` to just before the action row, in a `<div className="no-print mt-8">`. Rewrite the `ProjectRecording` header so it says why nothing mounts before the press: zero requests until asked (spec §6.4). The Disclosure is no longer part of the reason.

- [ ] **Step 4: Run** `pnpm test`, then `e2e/sections.spec.ts`, `e2e/print.spec.ts`, `e2e/axe.spec.ts` and `e2e/responsive.spec.ts` at `--workers=2`. The full-scroll "requests nothing from /media/" test (`:152-170`) must still pass unchanged. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sections/CareerTree/CaseStudy.tsx src/sections/CareerTree/ProjectRecording.tsx tests/sections/ProjectRecording.test.tsx e2e/sections.spec.ts
git commit -m "Put each recording's play button on the case study, not behind its disclosure"
```

---

### Task 9: Every recording described

Item E, WCAG 1.2.1. Today the text alternative is the case study's tagline (`CaseStudy.tsx:382-388`), which says what the project is, not what the video shows. Each recording gets one plain sentence describing **only what is visibly on screen**, drafted from the extracted frames in `.superpowers/sdd/plan-d/frames/*-sheet.png`. The sentence renders as a visible caption under the play button and stays after the press. The video's `aria-describedby` points at that caption.

**Drafts** (preflight §5). These are drafts: the owner will rewrite page-wide copy later.

| recording | `recordingDescription` |
|---|---|
| chess | A desktop chess window: pieces move one turn at a time, each move is highlighted on the board, and the move list grows beside it. |
| conscea | The Conscea web app's Certificate List, Dashboard and Profile pages, opened in turn from its top menu, with empty tables and blank profile fields. |
| degreework | A University of South Carolina degree-audit desktop app: a sign-up form, a course search with a course's details, a semester-by-semester plan and a degree-progress chart. |
| toys | The JVToys storefront: its home page, a contact form, product cards and a product pop-up, a cart with quantities and a total, and a sign-in page. |

**Files:**
- Modify: `src/types/portfolio.ts:238-239` (`Project.recordingDescription`)
- Modify: `src/content/portfolio.ts` (the four projects at about `:1150`, `:1180`, `:1212` and `:1245`)
- Modify: `src/sections/CareerTree/ProjectRecording.tsx` (props and caption)
- Modify: `src/sections/CareerTree/CaseStudy.tsx:190`, `:268-270`, `:384-388`
- Test: `tests/sections/ProjectRecording.test.tsx`

**Interfaces:**
- Produces:
  - `Project.recordingDescription?: string`, with this doc comment: "One plain sentence of what the recording visibly shows: its text alternative (WCAG 1.2.1). Required when `recording` is set."
  - `ProjectRecording(props: { title: string; recording: string; description: string; descriptionId: string })`. It replaces the `project`/`describedBy` props. It renders the button or the video, then `<p id={descriptionId} className="mt-2 text-[length:var(--step--1)] text-fg-muted">{description}</p>`.
  - Task 10 calls the same signature.

- [ ] **Step 1: Write the failing tests.**
  - *"every project with a recording has a non-empty description"*: for each `projects` entry with `recording`, `recordingDescription?.trim()` is truthy.
  - Rewrite `:122-142`: the caption is visible before the press (`getByText(description)`). After the press, `expect(video).toHaveAccessibleDescription(project.recordingDescription)`, and the description element's id is unique in the document.
  - Update the `renderRecording()` helper and `PLAY` to the new props. The button name stays `Play the screen recording of ${title}`.

- [ ] **Step 2: Run** the file. Expected: FAIL.

- [ ] **Step 3: Implement.** Add the type, the four drafts, the props and the caption. In `CaseStudy`, use `descriptionId = \`${project.id}-recording${scope}\`` and pass `title={project.title}`. Remove the tagline's `id` and `taglineId` if nothing else references them (grep first), and remove the comment at `:382-383`. Do not add `recordingDescription` to `answer-sources.ts`.

- [ ] **Step 4: Show the four drafts to the controller,** who relays them to the owner. Proceed with them as drafts unless the controller returns other wording. Record the controller's answer in the report.

- [ ] **Step 5: Run** `pnpm test`, then `e2e/sections.spec.ts` and `e2e/axe.spec.ts` at `--workers=2`. Expected: PASS. The retrieval eval is unchanged because the corpus is not touched: confirm by running `pnpm vitest run tests/lib/answers-retrieval.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/types/portfolio.ts src/content/portfolio.ts src/sections/CareerTree/ProjectRecording.tsx src/sections/CareerTree/CaseStudy.tsx tests/sections/ProjectRecording.test.tsx
git commit -m "Describe what each recording shows, in one plain sentence beside it"
```

---

### Task 10: MentorHub and Food Route

Item C.
- `cockyhacks` (MentorHub, `portfolio.ts:459-478`) and `code-to-give` (Food Route, `:479-498`) are **career entries** of `type: "milestone"`, and both are **demoted** (`knowledge-tree.ts:242-252`).
- No project record exists for either, and creating one would mean authoring case-study prose nobody wrote.
- Each renders as one line of the credentials strip (`CredentialsStrip.tsx:37-61`) in the act text column, not the sticky frame (`Stage.tsx:418-468`). The recording attaches to that line: the entry it belongs to, rendered once.

**Gate before Step 4: the owner must approve the MentorHub video's content.** Its frames show:
- a browser "Change your password: found in a data breach" dialog;
- a failed login, "Request failed with status code 401";
- the email `thien@gmail.com`;
- an About Us page naming two teammates (Aarsh Patel, Maximus Fernandez) with bios.

Food Route shows "Atlanta Community Food Bank" branding. Ask the controller. If the owner declines MentorHub, ship Food Route alone; do not trim the video into a different story.

**Drafts:**

| entry | `recording` | `recordingDescription` |
|---|---|---|
| cockyhacks | mentorhub | MentorHub's welcome page, its About Us page, a login that fails and then succeeds, and a dashboard with a profile card and recommended mentors. |
| code-to-give | foodroute | A food bank's ordering site: items with stock and expiry dates, an order being placed, and a delivery-status table with a map of marked sites joined by lines. |

**Files:**
- Create: `public/media/mentorhub.mp4`, `mentorhub.jpg`, `foodroute.mp4` and `foodroute.jpg`
- Modify: `src/types/portfolio.ts` (`CareerEntry.recording?`, `CareerEntry.recordingDescription?`)
- Modify: `src/content/portfolio.ts:459-498`
- Modify: `src/sections/CareerTree/CredentialsStrip.tsx` (render `ProjectRecording` under a line that has `recording`, and fix the component comment)
- Modify: `src/sections/CareerTree/ProjectRecording.tsx:58-60` ("Every recording is 1280×720" becomes false: foodroute is 604×568 and letterboxes inside the 16:9 frame)
- Test: `tests/sections/ProjectRecording.test.tsx`, `e2e/sections.spec.ts:149-194`

**Interfaces:**
- Consumes: `ProjectRecording({ title, recording, description, descriptionId })` from Task 9.
- Produces: `CareerEntry.recording?: string` and `CareerEntry.recordingDescription?: string`, with the same contract as `Project`. The strip calls `title={entry.role}` (verbatim, nothing invented) and `descriptionId={\`${entry.id}-recording\`}`.

- [ ] **Step 1: Write the failing tests.**
  - Unit: *"every recording on the site exists, is at most 1.5 MB, and is described."* For each `recording` across `projects` **and** `careerEntries`:
    - `public/media/<id>.mp4` and `.jpg` exist (`node:fs`);
    - the mp4 is `<= 1_500_000` bytes;
    - `recordingDescription?.trim()` is truthy.
    This also guards the four shipped ones.
  - Unit: render `CredentialsStrip`. Buttons named `Play the screen recording of Best Design — MentorHub` and `…of 2nd Place — Food Route` exist. Each caption's text equals its entry's `recordingDescription`.
  - Unit `:118-120`: the projects' list stays `["chess", "conscea", "degreework", "toys"]`. Add the entries' list, `["mentorhub", "foodroute"]`.
  - e2e (folds T10, "chess only"): parametrise the press test over **every** recording, project or entry. Locate each by its button name and press it. Exactly one `/media/<id>.mp4` and one `/media/<id>.jpg` are requested. The full-scroll zero-requests test (`:152-170`) is unchanged and now covers six.

- [ ] **Step 2: Run them.** Expected: FAIL (no files, no fields).

- [ ] **Step 3: Encode.** Use Plan C's recipe, as read from the shipped files: libx264 High, yuv420p, preset slow, crf 30, no audio, faststart. Do not upscale.

```bash
F=/c/ffmpeg-7.1-essentials_build/bin; S=/d/Project/Portfolio-v2/src/assets/experience
"$F/ffmpeg" -i "$S/mentorhub.mp4" -vf scale=1280:-2 -c:v libx264 -crf 30 -preset slow -pix_fmt yuv420p -an -movflags +faststart public/media/mentorhub.mp4
"$F/ffmpeg" -i "$S/foodroute.gif" -c:v libx264 -crf 30 -preset slow -pix_fmt yuv420p -an -movflags +faststart public/media/foodroute.mp4
for f in mentorhub foodroute; do "$F/ffmpeg" -i "public/media/$f.mp4" -vframes 1 -q:v 4 "public/media/$f.jpg"; done
for f in mentorhub foodroute; do "$F/ffprobe" -v error -show_entries stream=codec_type,codec_name,profile,pix_fmt,width,height -of compact "public/media/$f.mp4"; done
```

Expected:
- mentorhub: 1280×720 h264 High yuv420p, video only, about 386 KB.
- foodroute: 604×568, same codec, about 297 KB. These are the trial sizes from preflight §3.

Look at both posters. If the first frame is blank, pick a later one with `-ss`.

- [ ] **Step 4 (after the gate): Implement.** Add the type fields, the two entries' fields and the strip rendering (a `<div className="no-print mt-2">` under the line). Fix the `RecordingVideo` comment so it says the frame is 16:9 and a recording that is not 16:9 letterboxes inside it rather than shifting the page. Fix `CredentialsStrip`'s banner to mention the recording.

- [ ] **Step 5: Run** `pnpm test`, then `e2e/sections.spec.ts`, `e2e/axe.spec.ts`, `e2e/responsive.spec.ts` (320 px overflow) and `e2e/origin.spec.ts` (the stage) at `--workers=2`. Check in a browser in both themes, in the pinned stage at 1440 and in the stacked cards under reduced motion. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add public/media/mentorhub.mp4 public/media/mentorhub.jpg public/media/foodroute.mp4 public/media/foodroute.jpg src/types/portfolio.ts src/content/portfolio.ts src/sections/CareerTree/CredentialsStrip.tsx src/sections/CareerTree/ProjectRecording.tsx tests/sections/ProjectRecording.test.tsx e2e/sections.spec.ts
git commit -m "Ship the MentorHub and Food Route recordings on their credentials lines"
```

---

### Task 11: Docs, the résumé PDF check, whole-branch verification

Items B, G4 and G5, plus the close-out.

**Files:**
- Modify: `docs/superpowers/specs/2026-09-30-round-18-design.md`. Add four dated one-line notes ("**2026-10-05, owner:** …"), each placed under the paragraph it supersedes:
  - §4 (`:209-211`): location leaves the rail because the prose says it;
  - §5.3 (`:287-292`): skins are ink and paper, and the hue words describe intent only;
  - §5.5 (`:319-321`): the crossing replays while in view and stops on interaction;
  - §6.4 (`:424-426`): recordings sit outside the disclosure and carry a `recordingDescription`.
- Modify: `docs/feedback-tracker.md`. Add a Plan D section: the owner decisions, G3 before/after, H4 minima, the perf rows, G4 and G5.

- [ ] **Step 1: B.** `grep -rn -i "orange\|molten\|sand\b\|hue" CLAUDE.md README.md docs/editing.md src/content/skins.ts src/lib/skins.ts src/sections/Worlds/gl/shaders.ts`. Only the spec prose may describe a skin hue (preflight §2). Add the §5.3 note. No code change.

- [ ] **Step 2: G4.** Run `pdftotext -layout public/thien-le-resume.pdf - | grep -n -i -B1 -A1 '2\.8'`. Report both bullets verbatim in the tracker. At `80d0a13` they were lines 21 and 23:
  - "Automated eight-stage SKU governance process with one run, restoring SKUs that generated $2.8M cumulative GOV"
  - "Built a monthly 8-stage SKU governance pipeline, protecting $2.8M in sales and freeing capacity for new selection"
  `/resume` renders `impact` only (`src/app/resume/page.tsx:115-117`), and it carries one $2.8M line (`portfolio.ts:286`), so the route does not duplicate it. **No edit**: the PDF is the owner's to fix.

- [ ] **Step 3: G5.** Record in the tracker that `BOOKING_URL` is unset (`.env.example:78`). The booking control renders nothing until the owner supplies a URL (`src/lib/booking.ts`).

- [ ] **Step 4: Verify the whole branch.**
  - `pnpm verify`: expected 5/5.
  - Full `pnpm test:e2e` through the throwaway config at `--workers=2`: report pass, fail and skip counts. Re-run each failure alone and report both runs.
  - `pnpm perf` against a production build, 3 runs, 0 skipped. Record the final row: initial JS against 204,258 B (Plan C) and 202,734 B (pre-Plan C).
  - Content check: none of the initial scripts contains `#version 300 es`.
  - Check `pnpm dev` in a browser in both themes: the replay, Stop, the Moon and Sun, all six recordings, and the hero.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-09-30-round-18-design.md docs/feedback-tracker.md
git commit -m "Record Plan D's decisions, measurements and the résumé's two \$2.8M lines"
```

---

## Out of scope

These are the 69 can-wait items from `plan-c-final-review.md`, minus the folds listed in preflight §9: m7, m8, T7 header, T10 play rejection, T10 chess-only e2e, T11 editing.md wording, and rereview residual 4. Each was triaged "wait" there and none touches a line this plan changes:

- **T4:** latent `sharesAPin` shift; duplicate LIVING EARTH labels; both living-earth pins use `star`; e2e "far side" message.
- **T8:** no ±12 glyph-box test (Task 5's new glyphs are checked by eye instead); bún cá `toContain`; the shared bowl glyph; glyphs not browser-checked.
- **T5:** lowercase accessible names; opacity-70 disabled skins; weak pressed cue; 44 px class-only test; tautological `SKIN_IDS` test; no editing.md skin recipe.
- **T1:** shader-delete test; `pickSurface` precedence; `toEqual({})` passthrough; premultipliedAlpha comment; three delete blocks.
- **T2:** pole-closure threshold comment; pole choice undocumented; square-ring axes; Antarctica margin; no north-pole or east-to-west test.
- **T3a:** colour-literal loopholes; `CHAPTER_INDEX` typing; null uniform path; lattice aliasing; day rim; Ice Age and Night side disc blending; `atan(0,0)`; per-frame allocations.
- **T3b:** one-way fallback; three-tone check; day rim and night edge; halo clipping the marker ring (revisited only if Task 6 widens `HALO_PX`); halo AA edge; graticule contrast.
- **T7:** ~1.6 s hidden per lap; two identical robot glyphs; lap toggle live after a chunk failure; "ends lit" e2e; "brighter" wording.
- **T6:** a bare tap announcing; context-loss comparison only under reduced motion; under-314 px-tall viewports never autoplay; settle no-op mid-drag; `inViewRef` window; layout-shift check width.
- **T9:** modifier guard not mutation-run; weak style-count floor; arrow keys undiscoverable; linear skin order; `buttons.last()` coupling; axe presses only "Unsupervised"; crossing-landed asserted only at load.
- **T10:** reduced motion plays after the press; weak conscea poster.
- **T11:** "the seven worlds had" history line; thin tracker "Before" row.
- **New:** m9 (Technology lattice has no decoration line).

## Still with the owner

1. The MentorHub video's content (Task 10 gate).
2. The six recording descriptions and the two Sun/Moon `draws` strings. All are drafts.
3. "Stop the replay": the wording of the WCAG 2.2.2 control (Task 4).
4. The résumé PDF's two differently worded $2.8M bullets (G4).
5. `BOOKING_URL` (G5).
6. The `CLAUDE.md:119` one-line edit (Task 7, gated).
