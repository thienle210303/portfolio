# Plan D preflight — evidence notes

Worktree `.claude/worktrees/plan-d`, branch `round-18/plan-d`, HEAD `80d0a13` (= main).
Read-only investigation, 2026-10-05. Every line number below was read at `80d0a13`.
"Verified" = read in code or measured; "inferred" = reasoned from verified facts.

## 1. A — the crossing loops

| Premise | Evidence | Status |
|---|---|---|
| Autoplay is a second IntersectionObserver at threshold 0.5 that flies once and settles on exit | `src/sections/Worlds/WorldsStage.tsx:311-335` | verified |
| "Once" is `spentRef`; `quietRef` silences the autoplayed landing | `WorldsStage.tsx:142-153`, `:192-198` | verified |
| Interactions that spend autoplay today: Fly, Reset, ArrowRight, pointerdown on the stage | `:234`, `:262`, `:357-358`, `:405-408` | verified |
| `select()` does not spend autoplay (final-review m8) | `:158-170` | verified |
| `settle()` exists, cancels the pending frame, lands a playing flight, ends an easing camera | `GlobeCanvas.tsx:1379-1395`, `settle.ts:29-51` | verified |
| `reset()` eases the camera home via `lookAt` (frames), clears flight/seed | `GlobeCanvas.tsx:1396-1406`, `:983-999` | verified |
| `fly()` under reduced motion lands in one synchronous draw, no `start()` | `GlobeCanvas.tsx:1359-1375` | verified |
| reset swing Taylors → Kiên Giang ≈ 172.7° ≈ 53 reference frames ≈ 0.9 s at the 0.13 easing | arithmetic from `:913` easing and `origin.coordinates` | inferred |
| jsdom has no `matchMedia`; tests must stub it | `vitest.setup.ts:3-10` | verified |
| GlobeCanvas header "The rule about rest" names "once per page load the stage's autoplay" | `GlobeCanvas.tsx:69-85`, `:95-101` | verified — becomes false with A |
| Flight button label/handler lives in one element | `WorldsStage.tsx:427-447` | verified |
| WCAG 2.2.2 (Pause, Stop, Hide, Level A) applies to auto-starting motion that runs > 5 s beside other content | WCAG 2.2 | the loop needs a visible stop control → plan adds "Stop the replay" (flag to controller) |

**Every test that assumes autoplay plays once** (A must rewrite or adapt each):

Unit — `tests/sections/WorldsStage.autoplay.test.tsx`
- `:121` "flies once across two entries into view, and never replays" — once.
- `:141-150` "settles the flight when the stage leaves mid-flight" — `:147-149` asserts re-entry replays nothing.
- `:176-185` "still announces a flight the visitor asked for" — clicks /take the flight/ while autoplay is armed; under A the label reads "Stop the replay".
- `:152`, `:165`, `:187`, `:198`, `:208`, `:226` stay true (re-checked against the A design).

e2e — `e2e/worlds.spec.ts`
- `:319-354` `waitForLiveGlobe` / `waitForAutoplayedLanding`: waits for the label /take the flight/ (`:322`) and assumes landed-then-rest is permanent. ~35 tests call it.
- `:489-516` "plays the crossing once on arrival…" incl. `:498` `> 60` draws floor and `:510-515` "once per visit".
- `:518-546` "leaving mid-flight lands it at once, and coming back does not replay it" (`:544-545`).
- `:1146-1260` reduced motion: stays true (loop never runs) — keep, extend.
- `:1756-1766` reduced-motion "crossing is already landed": stays true.

e2e — `e2e/axe.spec.ts:264` and `:394`: wait for `data-crossing="landed"` then audit; under A the hold could end mid-audit → stop the replay first.

Companion "page goes still" tests count page-wide rAF at the page top (`e2e/companion.spec.ts:1388`, `:1757`, `:2431`); `#worlds` is not in view there (hero ≥ 1034 px after G3 at 1440×900 + 64 px header). Inferred safe; Task 4 re-runs companion.spec at 1440.

## 2. B — skin hues

- Skins are ink/paper in code: `src/content/skins.ts:14-18` draws strings; shader accent removed (`plan-c-final-rereview.md` I3).
- Only the spec's §5.3 prose still describes hues ("molten", "rim burns orange", "surface to sand") — `docs/superpowers/specs/2026-09-30-round-18-design.md:289-292`. CLAUDE.md:42, README.md:98 say blue is the only hue (consistent). → dated note in spec, Task 11.

## 3. C — MentorHub and Food Route

| Premise | Evidence | Status |
|---|---|---|
| Both are **career entries**, `type: "milestone"`, not projects | `src/content/portfolio.ts:459-478` (`cockyhacks`), `:479-498` (`code-to-give`) | verified |
| Both are **demoted** (not drawn) | `src/lib/knowledge-tree.ts:242-252` | verified |
| They render only as one line in `CredentialsStrip`, with their repo link | `src/sections/CareerTree/CredentialsStrip.tsx:28-65`; comment `knowledge-tree.ts:212-217` | verified |
| `achievements` (`:1390-1401`) restate them for `/resume`; not a render site for media | `portfolio.ts:1388-1401` | verified |
| `recording` exists only on `Project` | `src/types/portfolio.ts:238-239` | verified |
| No project record exists for either; creating one would require inventing case-study prose | `Project` requires problem/whyItMattered/... (`types/portfolio.ts:200-243`) | verified → honest site is the strip line |
| The strip renders inside the act with `showsCredentials`, in the act text column, not the sticky frame | `Stage.tsx:418-468` | verified |
| Recipe used by Plan C: libx264 High, yuv420p, preset slow (ref=5), crf 30 (toys 34), no audio, 1280×720 | ffprobe + SEI strings of `public/media/*.mp4` | verified |
| Sources: mentorhub.mp4 1920×1080 30 fps 15.37 s **with AAC audio**, 7,548,165 B; foodroute.gif 604×568 10 fps 23 s, 10,564,667 B | ffprobe | verified |
| Trial encode (scratchpad, not committed): mentorhub 1280×720 **385,641 B**; foodroute 604×568 (no scale) **296,761 B** | ffmpeg 7.1 | verified ≤ 1.5 MB |
| `RecordingVideo` comment "Every recording is 1280×720" → false once foodroute ships | `ProjectRecording.tsx:58-60` | verified |

**Owner flags from the MentorHub frames** (`frames/mentorhub-sheet.png`): a browser "Change your password — found in a data breach" dialog, a failed login "Request failed with status code 401", an email `thien@gmail.com`, and an About Us page naming two teammates (Aarsh Patel, Maximus Fernandez) with bios. Food Route shows "Atlanta Community Food Bank" branding. degreework (already shipped) shows `thienle210303@gmail.com` typed into a form.

## 4. D — recording placement

- `ProjectRecording` renders **inside** CaseStudy's `Disclosure` (`CaseStudy.tsx:371-390`). Disclosure keeps children mounted but `invisible` while closed (`Disclosure.tsx:105-112`).
- All four recorded projects belong to demoted `usc-degree`, so they render in `UnbranchedCaseStudies` ("Coursework and capstone", after the stage) — `UnbranchedCaseStudies.tsx:25-43`, `CareerTree.tsx:170`.
- A visitor therefore needs: scroll past the whole Journey stage → find "Coursework and capstone" → open "Read the full case study" → find the play button above "Problem". The e2e confirms this route (`e2e/sections.spec.ts:181-185`). Unit test needs `hidden: true` to find the button (`tests/sections/ProjectRecording.test.tsx:127-130`).
- Recommendation: move the recording block out of the Disclosure to the always-visible part of the article, directly before the action row (`CaseStudy.tsx:333`). Zero-request-until-press is unchanged (the button mounts nothing).

## 5. E — descriptions (drafts, from frames only)

Contact sheets: `frames/{chess,conscea,degreework,toys,mentorhub,foodroute}-sheet.png` (9 frames each, evenly spaced). Drafts describe only what is on screen:

| recording | draft `recordingDescription` |
|---|---|
| chess | A desktop chess window: pieces move one turn at a time, each move is highlighted on the board, and the move list grows beside it. |
| conscea | The Conscea web app's Certificate List, Dashboard and Profile pages, opened in turn from its top menu, with empty tables and blank profile fields. |
| degreework | A University of South Carolina degree-audit desktop app: a sign-up form, a course search with a course's details, a semester-by-semester plan and a degree-progress chart. |
| toys | The JVToys storefront: its home page, a contact form, product cards and a product pop-up, a cart with quantities and a total, and a sign-in page. |
| mentorhub | MentorHub's welcome page, its About Us page, a login that fails and then succeeds, and a dashboard with a profile card and recommended mentors. |
| foodroute | A food bank's ordering site: items with stock and expiry dates, an order being placed, and a delivery-status table with a map of marked sites joined by lines. |

Not indexed for the chat: `answer-sources.ts:46-63`, `:83-92` pick fields explicitly; recordings are not among them (keep it so — generic vocabulary costs precision, CLAUDE.md).

## 6. F — Sun and Moon

- Robot drawn on the overlay only when Technology is open: `GlobeCanvas.tsx:707-737`; GL path vs fallback only differs in who draws the lights (`:711-727`), so an overlay drawing works on both paths.
- `robotLights(progress).pass` gives lap 1/2 (`gl/robot.ts:98-108`); holds `unsupervised = 0.5 − ε` (pass 1), `human-in-the-loop = 1` (pass 2) (`robot.ts:125-128`).
- Technology decorations: two robot lines `src/content/worlds.ts:128-131`. Panel renders `GLYPHS[decoration.glyph]` (`WorldPanel.tsx:1`, `:77-90`), so glyphs are in the initial bundle (inferred: WorldPanel is imported by WorldsStage `:19`).
- Counts that move: `tests/lib/worlds.test.ts:118` (`["tech", 3, 2]` → 4), `tests/sections/WorldsStage.test.tsx:267` (`toHaveLength(2)` → 4), Worlds rail `Decorations` (`Worlds.tsx:57`, `:69`) 9 → 11, companion dialogue comment `companion-dialogue.ts:177` "nine decorations" → false.
- `GlyphId` union `types/portfolio.ts:390-411`. Plaques unaffected (12 field + 7 computed, `worlds.test.ts:122-128`).

## 7. G — four old items

**G1.** Hero rail `Hero.tsx:63-72`: "Now" = `currentRole.role, organization` → "Software Engineer, DoorDash"; positioning `portfolio.ts:70-71` says "…retail data at DoorDash." "Based" = `profile.location` "Taylors, South Carolina"; about[0] `portfolio.ts:79` says "…to Taylors, South Carolina…". Both restate prose. "Open to", "Focus", "Holds", "Reach me" appear nowhere in the identity column. Docs that name the "Now" note: `docs/editing.md:82`, `CLAUDE.md:119`, `src/lib/companion-facts.ts:80` (comment). Tests: `tests/sections/Hero.test.tsx:35-49`. Spec §4 (`spec:210-211`) put location in the rail — superseded by the rail rule.

**G2.** Accent fills besides Contact's send: `WorldsStage.tsx:441-443` ("Take the flight", `bg-[color:var(--accent)]`), `src/sections/Footer/Closing.tsx:65` (`Button variant="primary"` "Get in touch"). Spec §4 `spec:217-220`. Existing scoped test: `e2e/contact.spec.ts:46-63` (Contact only).

**G3.** Measured with headless shell 1234 on `next dev -p 3141` (stopped by PID afterwards), reduced motion, fonts ready:

| | 1440×900 | 390×844 |
|---|---|---|
| `#about` height now | **1138 px** | **1836 px** |
| identity column | 859 (h1 3 lines @68px, intro 502) | 756 |
| code artifact | side by side | 445, below identity after `gap-y-14` |
| rail | 484, in margin (does not set height) | 358, endnotes after the floor |
| section padding | 100.8 + 100.8 | 56 + 56 |
| "Scroll" perch | `mt-14` + 21 | `mt-14` + 20 |
| after G1 (drop Now, Based) | 1138 (−0) | 1734 (−102) |
| + padding × 0.6 | 1058 | 1689 |
| + perch `mt-8` | 1034 | 1665 |
| + `gap-y-10` | 1034 | **1649** |

Proposal total: 1440×900 **1138 → 1034 (−104)**; 390×844 **1836 → 1649 (−187)**. Measured by applying the styles in-page, not estimated. The floor calc `min-h-[calc(100svh-var(--header-h)-var(--section-y)*2)]` (`Hero.tsx:94`) must change with the padding. Also `Hero.tsx:7-9` says Section has "no `className` passthrough on the `<section>`" — false: `Section.tsx:32`, `:94-100`.

**G4.** `pdftotext -layout public/thien-le-resume.pdf` lines 21 and 23:
- "Automated eight-stage SKU governance process with one run, restoring SKUs that generated $2.8M cumulative GOV"
- "Built a monthly 8-stage SKU governance pipeline, protecting $2.8M in sales and freeing capacity for new selection"
`/resume` renders `entry.impact` only (`src/app/resume/page.tsx:115-117`); doordash impact has one $2.8M line (`portfolio.ts:286`); the governance `built` line (`:280`) carries no figure. So `/resume` does **not** duplicate. Owner's PDF to fix.

**G5.** `BOOKING_URL=` empty in `.env.example:78`; validator `src/lib/booking.ts:13-23` renders nothing for unset.

## 8. H — parked residuals

- **H1** `gl/context.ts:47-48` (file lines; `pickSurface` body) "Forced colours must not paint the accent" — the shader has no accent since `uAccent` was removed (rereview I3). Also the `forced-colors` reason is unreachable at mount from GlobeCanvas, which never builds a sphere under forced colours (`GlobeCanvas.tsx:1102-1109`).
- **H2** `e2e/worlds.spec.ts:1447` `walking.overlayDraws > 60` in 2 s (= > 30 Hz); `:498` `> 60` for the crossing. `pressCounting` (`:1389-1431`) counts page-wide rAF `frames` (cats included), so `frames` cannot be the denominator; `measureGlobeFrames` (`:179-243`) has `framesThatDrew` but no tick count.
- **H3** `select()` sets the chapter announcement (`WorldsStage.tsx:163-166`) **then** `focusWorld` (`:167`) → `GlobeCanvas.tsx:1416-1421` lands a pressed (non-quiet) flight → `handleLanded` overwrites the announcement (`WorldsStage.tsx:216-219`). Batched: last write wins.
- **H4** No skin label-contrast probe exists in e2e (grep: no contrast/luminance in `worlds.spec.ts`). Labels get a `--ground` halo (`GlobeCanvas.tsx:488-500`, `HALO_PX = 3.5` `:224`).

## 9. Can-wait triage (69 items, `plan-c-final-review.md`)

Folded (cheap, file already edited by a Plan D task):
- m7 `"tech"` literals `GlobeCanvas.tsx:766,768` → Task 5.
- m8 `select()` doesn't spend autoplay → resolved by Task 4 (any press stops the loop).
- T7 GlobeCanvas header list omits the robot (`GlobeCanvas.tsx:51-53`) → Task 5 (robot, sun, moon).
- T10 rejected `play()` and focus move untested → Task 8.
- T10 e2e presses chess only → Task 10 (every recording).
- T11 `docs/editing.md` "world" wording in the plaque/decoration recipes (`:153-213`) → Task 5.
- Rereview residual 4 (`forced-colors` reason dead at mount) → Task 5's comment fix states it.

Everything else is out of scope (listed in the plan).

## 10. Perf baseline

`docs/feedback-tracker.md:1400-1410`: initial JS **204,258 B** (main before Plan C 202,734 B), measured with a production build on `:3112` and a throwaway `scripts/perf.mjs` copy pointed at headless shell 1234, 3 runs, 0 skipped. Initial-bundle files Plan D touches: `WorldsStage.tsx` (A, G2, H3), `glyphs.ts` via `WorldPanel` (F), `ProjectRecording.tsx` (E). GlobeCanvas/robot.ts are lazy.
