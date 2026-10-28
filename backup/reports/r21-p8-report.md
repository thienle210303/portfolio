# Round 21 phase 8: motion and polish, report

Branch `round-21/motion` in `D:/Project/portfolio/.claude/worktrees/r21-motion`, based on main `4d08a81`, head `bc0f984` (22 commits on main: 9 from the previous builder, 13 mine). Not pushed, not merged.

## Branch range

`git log --oneline 4d08a81..bc0f984`. Mine, oldest first: `2a100e0` polish (moon, tap targets, field tag), `136c26a` moon check reads the sky, `6095d9b` contact at 320 and balanced headings, `2af8d89` tree box focus ring and centred stamps, `e66e884` and `5575e61` test spelling, `e6139cf` snapping is for scrolling, `bdb0bfc` cat probe, `1ecaaa8` settle the notebook and 320 targets, then the contact e2e hardening and three tracker commits (the last is `bc0f984`).

## Test results

- `pnpm verify` at head: 5/5. 933 unit tests in 60 files; contrast 62 pairings, lowest 4.52:1. `docs/contrast.md` came out unchanged apart from line endings, so it was reverted.
- Full e2e on a fresh production build (`rm -rf .next`, build, start on `:3248`, `playwright.p8.config.ts`, `--workers=2`): **883 passed, 1523 skipped, 0 failed (20.4 min)**.
- The runs before it, all fixed and re-run: 20 failed (the snapping, below), then 2 (a ring click aimed at the notebook still opening; the card's links at 320), then 1 (the contact layout test read the postcard mid-entrance).
- Motion e2e (`e2e/motion.spec.ts`, 8 tests, the previous builder's plus mine): reduced motion means no animation and no snapping; every entrance is drawn and opaque before scrolling and with JS off; print is off; nav clicks land on their section through a View Transition (and jump under reduced motion); a wheel scroll mid-Record on a phone is not pulled by a snap; snapping is on, off after a fragment link, on again after Back.

## Perf (`pnpm perf`, production, 0 skipped, 3 runs each, bytes identical within each build)

| When | JS | JS at load | CSS | Fonts | CLS | DOM nodes |
|---|---|---|---|---|---|---|
| Before (`4d08a81`, built in a second worktree) | 198,990 B | 169,192 B | 21,052 B | 117,868 B | 0 / 0 / 0 | 2741 |
| After (head) | 199,035 B | 168,821 B | 22,054 B | 117,868 B | 0 / 0 / 0 | 2743 |

JS at load -371 B (budget +512 B). LCP and TBT are noisy at this throttle: before 2316-2664 ms and 213-217 ms, after 2352-2556 ms and 203-216 ms. The row is in `docs/feedback-tracker.md` under "Round 21 phase 8 — motion and polish".

## Every fix

Polish list, item by item:

1. **Moon behind a heading on phones at night.** The Journey's sun and moon were already taken out (`b6c187e`). The hero's moon sat on "curious" at 320. Under 360 it now drops beside the headline's short lines. The existing "moon stays off the headline" check had never worked below 1024 (it read `calc(100% + 520px)` as NaN) and measured the whole headline block. It now reads the calc and measures line by line, and runs at 320, 340, 360, 390, 414, 600, 768 and 844x390, day and night. The Contact moon (xl only) clears its heading at 1280 to 1920 in the screenshots.
2. **Mini-Thien's bubble over a hero tag.** Done in `6ec7b36`. The cat-coverage e2e only ran by day; it now also runs at 390 at night.
3. **Hero.** The nón lá shows wherever the bamboo shows (phone and desktop), the pine stands clear of the field tag at 1024 to 1439, and "Kiên Giang" stays on one line at 1024 to 1279 (chapter titles one step smaller there). All were done in `a5bb015`, but nothing tested them. New e2e: the nón lá at 13 widths from 320 to 1920, no chapter place wraps and the pine clears the field tag at 1024, 1100, 1180 and 1279. The night buffalo was done in `e2871bf`; it is visible in the night screenshots.
4. **The Record spread.** Balanced from 1280 (stamps at the foot of the left page, `dfc4736`); confirmed in the 1280, 1366, 1440 and 1920 screenshots. Below 1280 the stamps now centre in their row instead of hugging the left.
5. **iOS sky.** Done in `5ae05c5`. **Not verified in WebKit.** Only Chromium is installed for this Playwright, and I did not download a browser.
6. **Hunt.** Walked all four sections at the 11 sizes, day and night, plus programmatic probes (tap targets, horizontal overflow, last-line orphans, focus-ring clipping). Fixed:
   - **Contact at 320: card and postcard ran 14px past the window**, their right edges clipped. The card's rows set the grid track's minimum (309px in a 280px column). The track is `minmax(0, 1fr)` below lg and the email steps down to 11.5px under 340. New e2e: the papers sit inside the window at 320, 360, 390, 414 and 768.
   - **Tap targets under 44px**: the header logo (17px wide), the Record's filter buttons (40px) and the card's email, GitHub and LinkedIn links (28 to 30px) now reach 44px below 1024. The e2e measures what answers a touch 21px around each centre.
   - **Focus ring cut by the tree box's top edge** on three limb labels (focus scrolled them flush to the edge). The scroller keeps 24px of scroll padding. The e2e focuses every drawn link; it finds 1px of room without the padding.
   - **Last-line orphans**: `text-wrap: balance` on h1 to h4 ("dry." and "year." were stranded at 320 and 414); the field tag binds each value's last two words ("Việt / Nam ★" no longer breaks) and balances its stamp ("PRACTICE MAKES / AI."); the card's line is balanced.
7. **The motion's snapping**, the one real bug: see Decisions.

## Decisions

- **Snapping is for scrolling.** `scroll-snap-type: y proximity` pulls a landing within about a third of a screen of a page's top back to that top. With it on everywhere: `/#record-2019` landed 489px off its row, a pressed card's row 126px off, `/#ask` short of where it was sent, and Watch it grow's centred box back to the Journey's top. It now applies only while the URL names no fragment (`html:not(:has(:target), [data-no-snap])`), and Watch it grow sets `data-no-snap` for the visit. Wheel, touch and key scrolling are unchanged. **The cost: after a first nav click, a visitor no longer snaps.** The alternative, JS that re-enables snapping on the next wheel, would re-snap a landing that sits near a page edge on that first wheel tick, which is the same hijack one step later. If you want snapping to survive navigation, that is a decision for you.
- **Companion layout-shift probe** now turns snapping off with scroll anchoring: a layout change makes the browser re-snap, a scroll that test says it does not make.
- **Contact layout test** lays the papers out under reduced motion: the postcard settles from 28px up and 3.5 degrees, so a read mid-entrance is not where it lies.
- **The record ring test** waits for the notebook to finish opening before aiming at a ring (the entrance is scroll-driven, so a click point computed during it was stale).
- `docs/contrast.md` was reverted (line endings only). `playwright.p8.config.ts` stays untracked.

## What I did not fix, and why

- **WebKit**: not installed; the iOS sky is checked in Chromium only.
- **Parked cats still sit on some words at narrow widths.** At 320 they rest on "I'll write first." on the postcard and on "I said" in the chat strip: the corner picker found no corner clear of words. They are live, so they move on, and I left the picker alone.
- **A day-sky bird crosses "this" in the hero headline at 320.** It is in the sky drawing; moving it means redrawing the sky in `scripts/draw-scenery.mjs`, which I judged out of scope.
- **"low-code." breaks as "low- / code."** in the 96% tag at 1366. That is content text; a no-break hyphen would change searchable text.
- **Hero field tag at 320** wraps most values onto two lines (the label column is 104px). Readable, a little ragged.
- The Journey's framed tree box (1024 and up, day) has a thin border frame I did not touch; it predates this phase.

## Concerns

- The first full run was red on 20 tests because of the snapping, in specs the previous builder did not run. Run the full suite after any change to the snapping rule.
- The View Transition and snapping are Chromium-verified only.
- The scroll-driven entrances move transforms while scrolling, so any e2e that measures geometry or aims a pointer right after a scroll can read mid-entrance. I fixed the two that did; a new one would need the same care (wait for the box to settle, or run under reduced motion).

## Screens

`D:/Project/portfolio/reports/r21-p8-screens/` (180 files, untracked): `<section>-<w>x<h>-<day|night>-<n>.png` for about, tree, record and contact at 320, 360, 390, 414 and 768 (1800px tall viewports), 844x390, 1024x768, 1280x800, 1366x768, 1440x900 and 1920x1080, each section stepped down in viewport-tall slices (not fullPage, because the fixed sky fakes a seam). I looked at roughly 40 of them directly (every size, both themes, every section at least once, and the Record spread at 1024 to 1920) and covered the rest with the programmatic checks above; I did not open all 180.

## Servers

Stopped: `:3248` (e2e and screenshots) and `:3246` (baseline). The baseline worktree `r21-p8-base` was unregistered and its folder removed.
