# Final whole-branch review: Round 18 Plan D (80d0a13..9a63d39)

Reviewer: opus, read-only. Method: requesting-code-review/code-reviewer.md. I read the whole-branch diff in passes: source, then tests and e2e, then docs. I did not run any servers or suites. Evidence for the runtime claims (verify 5/5, e2e 788/0, perf 205,415 B) comes from task-11-report.md and the tracker. What I verified myself is marked (verified). What I reasoned from code without running it is marked (inferred).

## Strengths

- **The replay state machine is small and closed.** It has three states, `idle | looping | stopped`, plus `pausedRef` and a single `timerRef`.
  - Every stop path clears the timer.
  - `tick` bails unless the state is `looping`, so a missed clear is harmless.
  - Between cycles only a timer is pending, never a frame. The e2e measures this through `measureGlobeFrames`, which counts overlay `clearRect` and GL `drawArrays`.
- **WCAG 2.2.2 is met.** "Stop the replay" is the same element as "Take the flight", and its name comes from its content. Its width is fixed (`min-w-39`, measured), so the label swap moves nothing.
  - Focus on the button is exempt, so a keyboard or screen-reader user parked on it never hears it flip to the opposite action (Task 4 I2 fixed).
  - Reduced motion never loops. The first sight lands the crossing in one synchronous draw.
- **Interaction capture is principled.**
  - It uses the capture phase, so handlers that stop propagation cannot hide an interaction.
  - A touch scroll (`pointercancel`) is not a takeover. This follows the owner ruling, and a real CDP touch e2e proves it.
  - The release is heard on `window`, so a press that wanders out cannot hold the loop forever.
  - A landing during an undecided press keeps its silence.
- **The integration points are correct.** (Inferred unless marked.)
  - Context loss swaps only the surface. The controls object, and so the loop, is unaffected.
  - The robot walk runs only on Technology, and reaching Technology takes a pick, which stops the replay. So the walk and the replay never overlap.
  - A chapter pick during a replayed flight stops the loop (click capture runs before `handlePick`), lands quietly, then announces the chapter. A pick during the visitor's own flight announces the chapter last. Both orders are covered by unit tests and e2e.
  - The cats' fix keeps the `<p>` box and hides only its `<span>`, so `elementsFromPoint` never reads a recurring hidden line as free ground.
- **Fences hold** (verified by grep).
  - `coastline-data` is imported only by `GlobeCanvas.tsx`, and `GlobeCanvas` loads only via `import()` (WorldsStage.tsx:382).
  - The new `gestures.ts` and `replay.ts` are dependency-free constants, so the stage reads them without touching the lazy chunk.
  - Nothing under `src/lib` imports from `src/sections`.
  - There is no new dependency. No initial script contains `#version 300 es` (Task 11 report).
- **Plaques and decorations still follow the rule.** The plaques are still 12 quoted and 7 computed. Moon and Sun are added as decorations with `draws` strings and the decoration label. `worlds.test` was updated (`tech` 3 → 4 decorations). The companion comment that hard-coded "nineteen plus nine" is now count-free.
- **The résumé PDF matches the owner's file.** Its SHA-256 is identical to `Downloads/Thien_Le_Software_Engineering_Resume.pdf` (verified). `pdftotext` diffs it against the shipped file in exactly the two places the tracker names. The two $2.8M bullets are quoted correctly at lines 21 and 23 (verified).
- **"Book a call" is complete.** The label, both doc comments, `.env.example` and the tests all changed. No "twenty minutes" remains in src, tests, e2e or the live docs (verified).
- **Task 6 found and fixed a real contrast failure.** The halo probe caught 1.67:1 at `HALO_PX = 3.5` and fixed it at 5. The probe now fails if an expected label is not measured.

## Issues

### Critical

None.

### Important

**I1. A false doc bullet in `docs/editing.md`** (docs/editing.md:82-83, Task 7).
- The problem: "the hero's positioning line, which names the employer in prose — changing jobs also means editing `profile.positioning`" sits inside the list introduced by "One entry feeds all of:".
- Why it is false: no career entry feeds `profile.positioning`, which is hand-authored at portfolio.ts:70-71.
- Failure scenario: an editor adds a new role, trusts the list, and expects the hero to update. The hero keeps naming DoorDash.
- Fix: take the bullet out of the list and add a sentence after it: "The hero's positioning line names the employer in its own prose, and no entry feeds it: changing jobs also means editing `profile.positioning`."

**I2. A false spec note** (docs/superpowers/specs/2026-09-30-round-18-design.md:213, Task 11).
- The problem: the note says location leaves the rail "because the prose beside it already says where he arrived from".
- Why it is false: `profile.location` is "Taylors, South Carolina", where he lives and where he arrived *to*. Where he arrived *from* is Kiên Giang.
- Failure scenario: a later reader concludes the rail note being dropped was the origin, not the location.
- Fix: "…because the first About paragraph already says where he lives (Taylors, South Carolina)."

**I3. A stale measured figure in a comment** (src/sections/Hero/Hero.tsx:39-40, made stale by Task 7; inferred).
- The problem: the comment says "at 1280×800 its top is at 912px; at 1024×768, 886px".
- Why it is stale: those figures were measured with `gap-y-14`. Task 7 changed the stacked layout's gap to `gap-y-10`, a 16 px reduction in the only gap above the code artifact below 1360 px. The content is taller than the floor at those sizes, so `justify-center` adds no offset. The code top is therefore about 16 px higher now (about 896 and 870).
- Failure scenario: the comment is the evidence for the "first screen" claim. A future edit re-tunes against numbers that are no longer true.
- Fix: re-measure at both sizes and update the numbers, or delete the parenthetical.

**I4. The manual browser pass was not done** (Task 11 brief Step 4; CLAUDE.md "Before calling anything done").
- The problem: the `pnpm dev` check in a real browser, in both themes, was required for the replay, Stop, the Moon and Sun, the five recordings and the hero. task-11-report.md says it was not done.
- Failure scenario: e2e asserts structure, rest and contrast. It does not look at the sky body's placement against the satellite at every width, the thin crescent, the widened halo plate on each skin, or the play buttons now in plain sight. These are exactly the visual changes the owner will judge.
- Fix: run the pass in both themes before merge and record it in the tracker close-out.

**I5. The tracker's owner-decision list is incomplete** (docs/feedback-tracker.md:1526-1531, Task 11 spec compliance).
- The problem: the brief asks for "the owner decisions". The list omits four of the ten:
  - the robot's full circle under a Moon and Sun;
  - one blue control per page ("Get in touch" and the flight button demoted);
  - the hero made shorter, with "Now" also dropped (only location is listed);
  - Food Route shipped **trimmed**. The `-ss 0.3` cut removed a sign-in frame showing an email address, and that privacy trim is recorded nowhere in the tracker.
- Failure scenario: the next round re-encodes `foodroute.mp4` from the source GIF without the trim and ships the email address.
- Fix: add four bullets, including the exact trim (`-ss 0.3`, 604×568, 289,730 B) and why.

### Minor

- **m1.** CLAUDE.md:43 and README.md:99 say "the single primary control per screen".
  - Spec §4 (`:221`), the owner decision and `e2e/contact.spec.ts` "the whole page has one blue fill" all say per page.
  - This is not false, because a per-page rule implies the per-screen one, but it understates the rule a future agent will read.
  - Fix: "per page (Contact's send)". It is a CLAUDE.md edit, so it is owner-gated.
- **m2.** A naming collision. One companion cat is named "Moon" (src/content/portfolio.ts:137), and the Technology chapter now draws "a moon over the robot's first lap".
  - The panel lists both words in one session. A visitor or screen-reader user may read the drawn moon as the cat.
  - This is an owner call. Rewording the decoration ("a crescent moon…") would settle it.
- **m3.** A screen-reader user in browse mode sees "The career tree grows from that spot →" leave the accessibility tree for about 3 s of every cycle (WorldsStage.tsx:687, `visibility: hidden` on the span).
  - It is not a 2.2.2 failure. It is a mild instability until the visitor stops the replay or focuses inside, either of which stops the loop.
- **m4.** A mouse right-click in the section on macOS Chrome can lose its `pointerup` behind the context menu (WorldsStage.tsx:499; inferred). `pressRef` then stays set, and every tick re-arms. The loop freezes while the button still says "Stop the replay", until the next `pointerup` anywhere.
  - Fix: ignore `event.button !== 0` in `pressStart`, or also clear the press on `contextmenu`.
- **m5.** The CaseStudy header (CaseStudy.tsx:11-12) lists the row's order as figures, technologies, actions, deep dive. It omits the recording that now sits before the actions. It is incomplete, not false.
- **m6.** A double blank line at GlobeCanvas.tsx:172-173 (left by moving `TAP_SLOP_PX`). This is the same nit as Task 5's e2e one.
- **m7.** WorldsStage.tsx:465 duplicates the observer effect's cleanup (Task 4 review, Minor 3, still open). It is harmless.

## Task 11 verdicts

- **Spec compliance: ✅ with gaps.**
  - Done:
    - all four dated spec notes, placed under the paragraphs they supersede;
    - the B grep;
    - G4, with the owner PDF shipped per the Ruling and the hash verified;
    - G5, with `BOOKING_URL` unset and nothing rendered;
    - the Ruling (b) label and comments;
    - verify, full e2e, perf ×3, and the GLSL content check.
  - Gaps:
    - I4: the browser pass was not done;
    - I5: owner decisions are missing, including the Food Route trim;
    - I2: the §4 note is false.
- **"CLAUDE.md needed no change": correct, with one understatement.** I read it fully.
  - It never says the crossing plays once.
  - It names `robot` only as a file and gives no decoration count. Plaque counts (12 + 7 of 19) are unchanged.
  - It says nothing about the halo, recordings or Sun/Moon.
  - Its hero-rail line (`:118-119`) was fixed in Task 7.
  - "The 2D globe … takes over for good when … the context is lost" is still true; the loop does not touch it.
  - "Before calling anything done" is unchanged.
  - The only gap is m1, "per screen" against the page-wide rule. Not false.
- **docs/editing.md: one false bullet (I1).**
  - "Five decorations" for Living Earth is still true; Technology's grew, but the doc does not count it.
  - "Add a plaque/decoration to a chapter" is now correctly worded.
- **README.md: no stale statements.** There is no play-once, rail "Now", recording placement, booking label or decoration count. It has the same "per screen" wording as m1.
- **Tracker row: accurate where it speaks, incomplete where it does not.**
  - Verified: 205,415 − 204,258 = 1,157; 205,415 − 202,734 = 2,681; 200.6 KB; the PDF size and diff; the two $2.8M lines; `/resume` carrying one $2.8M line (portfolio.ts:289).
  - The Cal.com URL was supplied and checked by the controller (session transcript), not invented.
  - Gaps: I5, and Tasks 8–10's +380 B is not attributed anywhere (see the initial-JS section).

## Cross-task integration

| Seam | Verdict |
|---|---|
| Loop × robot walk / Sun-Moon (T4 × T5) | No overlap is reachable. Technology needs a pick, and a pick stops the replay. `robotSky` is only drawn when `currentId === tech`. Under reduced motion the holds map to Moon and Sun (unit-tested). |
| Loop × context loss | `fallBack` only drops the surface and redraws. Controls, timers and the observer are untouched, so the loop continues on 2D. Clean. |
| Loop × companion cats | The `<p>`-kept and `<span>`-hidden fix is correct. Cats are outside `rootRef`, so a click on a cat does not stop the replay, and that is right. |
| Loop × chapter-pick announce (T2) | Correct in both orders (see Strengths). The e2e proves the in-air check and the press in one task. |
| Halo 5 px (T6) × cat names | The names "MOON" and "MI" sit at catX and catX+34, 8.5 px font. The gap between them is about 19 px against a halo reach of 2.5 px, so neither overpaints the other or the cats. The probe measured both names at the 4.74 / 4.98 ceiling. |
| Hero (T7) × cat resting spots | The top padding was kept at 1× precisely because 0.6× put a cat on paragraph text at 390 px. The companion e2e passes in the full run. The `data-cat-perch` margin `mt-14` → `mt-8` is covered by the same run. |
| Recordings (T8–10) × print | The wrapper is `no-print` in both CaseStudy and CredentialsStrip; the print e2e passed. The caption is suppressed with the button, which is acceptable because the video never prints. |
| Recordings × /resume | `/resume` renders neither CaseStudy nor recordings. It is unchanged. |
| Recordings × duplicate ids | CaseStudy is rendered twice (drawing and list) with `idScope`, so the ids are distinct. CredentialsStrip renders once (only the `two-jobs` act sets `showsCredentials`). Unit tests assert one element per id. |
| Leaks | The window `pointerup` / `pointercancel` listeners are removed on end, cancel or unmount (`endPressRef`). The observer disconnects and clears the timer. The unmount effect clears the timer. The hidden-tab path re-arms one timer, not a frame chain. Test-side MutationObservers are page-scoped. No leak found. |

## Triage of deferred minors (ledger)

None is must-fix before merge.

| Task | Item | Triage |
|---|---|---|
| T1 | `framesThatDrew` counts callbacks, not ticks | can-wait |
| T1 | `.next` held a mutated build | resolved (rebuilt by every later task) |
| T2 | test does not assert the landing ran | can-wait (the e2e now covers it) |
| T2 | landing sentence not spoken on this path | can-wait (accepted by brief) |
| T2 | no e2e for a pick mid-flight | resolved (the Task 4 e2e "a chapter picked during the visitor's own flight") |
| T3 | hairline filter broader than needed | can-wait |
| T3 | `Button` defaults to `primary` | can-wait (the page-wide one-blue-fill e2e now guards it) |
| T3 | ready flight button looks like "Face Việt Nam" | can-wait (design) |
| T3 | demoted border 1.42:1 | can-wait (same as the existing secondary recipe; label ≥ 4.5:1) |
| T4 | M3 touch scroll cuts the camera ease | can-wait (cosmetic) |
| T4 | M4 touch e2e does not assert continued cycling | can-wait |
| T4 | a second finger's `pointerup` ends the press | can-wait |
| T4 | review Minor 1: tick guard | resolved (the guard is present) |
| T4 | review Minor 2: touch scroll stops the loop | resolved (owner ruling, fix round 2) |
| T4 | review Minor 3: duplicate unmount cleanup | can-wait (m7) |
| T4 | review Minor 4: hold-window flake margin | resolved (1,500 ms) |
| T4 | review Minor 5: `fakeTimerUser` comment | can-wait |
| T4 | review Minor 6: GlobeCanvas header incomplete | resolved (now lists focus) |
| T4 | review Minor 7: `landedRef` passive sync | can-wait |
| T4 | review Minor 8: trailing `toHaveCount(0)` | can-wait (the immediate read carries the claim) |
| T4 | review Minor 9: record the contact fix | resolved (it is in the tracker) |
| T5 | double blank line | can-wait |
| T5 | three `waitForTimeout(300)` | can-wait |
| T5 | thin crescent | can-wait (owner, by eye; I4 covers looking) |
| T5 | Moon margin 1.4 px | can-wait |
| T6 | p5 statistic | can-wait |
| T6 | letters include AA fringe | can-wait |
| T6 | one pose only | can-wait (now worded truthfully) |
| T6 | cats hidden / marker clearance checked by eye | can-wait |
| T6 | stale plan-c-ledger 5.9:1 claim | can-wait (process record, not shipped) |
| T6 | flip-redraw ordering fragility | can-wait |
| T6 | per-label allocations | can-wait |
| T6 | duplicate theme-flip hook | can-wait |
| T6 | visible halo change, for the owner | can-wait (owner; I4) |
| T6 | reduced-motion browser crashes | can-wait (environmental; the full run was 788/0) |
| T7 | "Now" restatement only caught by a hard-coded regex | can-wait |
| T7 | Hero comment repeats the banner | can-wait |
| T8 | rejected-play test name and spy shape | can-wait |
| T8 | eager `Promise.reject` | can-wait |
| T8 | no e2e size or colour check on the play button | can-wait |
| T9 | no `aria-describedby` from the play button to its caption | can-wait (optional) |
| T10 | per-entry listener attached after load | can-wait |
| T10 | about 0.5 s of black at the loop seam | can-wait |
| T10 | ACFB branding | can-wait (owner) |
| T10 | unit test pins `["foodroute"]` | can-wait (intentional) |

That is 45 items: 7 resolved, **38 can-wait**, 0 must-fix. Adding this review's own minors m1–m7, which are all can-wait, gives **45 can-wait** in total.

## Initial JS: where the +1,157 B came from, and safe trims

The attribution comes from the tracker rows: Task 4 and fix rounds +652, Task 5 +125, Tasks 8–10 +380. That sums to +1,157.

- **Tasks 1–4, +652 B.** This is WorldsStage's loop:
  - the state refs and `arm` / `scheduleHold`;
  - the press machinery (`pressStart`, `pressEnd`, `pressCancel` and their window listeners, about 274 B by the tracker);
  - the label ternary.
- **Task 5, +125 B.** This is the `sun` and `moon` paths in `GLYPHS` (initial via `WorldPanel`) and two decoration strings.
- **Tasks 8–10, +380 B.** This is mostly the five `recordingDescription` captions (750 B raw, about 450 B gzipped alone).
  - Verified: the captions are present in the initial chunk `.next/static/chunks/2n9jmac8bbasr.js` ("A desktop chess window…" found there).
  - The reason: client modules (Companion, AskThisSite, WorldsStage and others) import `@/content/portfolio`, so every field on `projects` and `careerEntries` ships to the client. The captions themselves are rendered only by server components (CaseStudy, CredentialsStrip) and reach `ProjectRecording` as props.

Safe trims, largest first:

1. **Captions out of the client graph, about −300 to −400 B.** Move the captions into a server-only map that no `"use client"` module imports, for example `src/content/recordings.ts` keyed by media id. Read it in CaseStudy and CredentialsStrip.
   - Behaviour is identical.
   - It touches the "everything factual lives in portfolio.ts" convention. The captions describe media rather than the owner, but put it to the owner first.
2. **Delete the duplicate unmount effect** (WorldsStage.tsx:465), about −20 B. The observer effect's cleanup already clears the timer on unmount.
3. **Fold `landedRef`'s sync effect into the setters**, about −30 B. Write `landedRef.current` beside each `setLanded`. Low value, low risk.

Not worth trimming:
- The glyph paths (the panel draws them).
- The press machinery (each piece carries a ruling).

None of this is a leak: +1,157 B is well inside CLAUDE.md's "a kilobyte or two", and GLSL is absent from the initial scripts.

## Declined to judge

- Owner-draft copy: the six captions, the two `draws` strings and "Stop the replay". These are drafts held by the owner and are listed in the plan's "Still with the owner".
- The MentorHub recording: gated by Ruling and not shipped.
- The Plan C carry-over can-wait items listed in the plan's "Out of scope". Each was triaged there.
- A behaviour where intersection observers report `isIntersecting` below the threshold differently across engines. The comment states the Chromium measurement and the full-exit behaviour is unchanged from before Plan D.

## Merge verdict

**Ready to merge: With fixes.** The code is sound. The loop, its stop control, the integrations and the fences hold, and nothing critical was found. Five Important items block merge:
- three false or stale docs and comments (I1–I3);
- the required browser pass in both themes (I4);
- the owner-decision record, including the Food Route privacy trim (I5).

All five are doc fixes or a verification step. None needs a source-logic change.
