# Round 21 polish 2 - report (INCOMPLETE: stopped early at the owner's request)

Branch round-21/polish-2, base 9b54c68. Not merged.

## Fixes (commits, oldest first)
1. Parked cats: `pickCorner` now lets a peek (tucked off the right edge) win over a corner that sits on words. Unit test added; new e2e "at 320 the parked pair tucks off the edge..." fails on the base build (3253) and passes on the fix build. Verified in after screenshots at 320 day/night.
2. Day-sky birds: first attempt (clamp y) was wrong; the sky span starts at y 57 and the headline covers sky y 34-221 at every phone width. Final: birds with x < 920 (the only ones phones show) move 200 east in `scripts/draw-scenery.mjs`; `sky-day.svg` regenerated; unit test asserts all 5 birds start at x >= 920. NOT visually re-verified: the fix2 "after" screenshots were taken before this second fix and still show birds at the headline.
3. "low-code." wrap: hyphenated words in the Journey tag labels are wrapped in a nowrap span (text unchanged). Unit-test exemption added (data-whole-word). NOT visually verified after build; fix3 "after" shots were not re-checked at 1024-1920.
4. Field tag at 320: below 380px the label stacks over its value. Verified at 320 day in the after screenshot; 360/night not looked at.

## Validation
- `pnpm verify`: passed (exit 0) at the head after the last commit.
- Full e2e: NOT RUN. After perf: NOT RUN.
- Baseline perf (main 9b54c68, one run, :3253): JS 199,823 B, JS at load 169,610 B, CSS 22,054 B, fonts 117,868 B, CLS 0, DOM 2743, skipped 0. No "after" row, nothing added to docs/feedback-tracker.md.
- Playwright here wants chromium 1248; only 1234 is installed, so tooling used an executablePath override (local only, not committed).

## Screenshots
reports/r21-polish2-screens/: fix1 (contact postcard, ask strip, 320/360), fix2 (hero 320/360/390/414), fix3 (tags 1024/1366/1920), fix4 (field tag 320/360), each -before/-after, day and night. Only after shots for fix1 and fix4 at 320 day (and fix1 ask night) were looked at.

## Remaining
Rebuild, look at all after shots (esp. fix2, fix3), full e2e, pnpm perf after, tracker row.
