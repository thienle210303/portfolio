# Final fix wave re-review (9a63d39..8a8d6ec)

1. editing.md positioning bullet - ADDRESSED. Moved out of the "One entry feeds all of:" list (editing.md:82-83); the new sentence is true (portfolio.ts:70 hand-authors `positioning`).
2. Spec :213 "from" wording - ADDRESSED. New text matches `profile.about[0]` (portfolio.ts:79, Kiên Giang to Taylors, December 2018).
3. Hero.tsx stale px - ADDRESSED. Now 896/870; the report claims 3 production-build runs, which I did not re-measure. The comment is consistent with the review's inferred ~16 px shift. Cosmetic: the comment line is over-long.
4. Both-theme browser pass - ADDRESSED. 25 fw-*.png exist, the tracker records the pass, and the images I viewed match the claims: Stop the replay vs Take the flight, a video mounted after the press, no email frame. The tracker is honest about the three doubtful frames.
5. Tracker owner decisions - ADDRESSED. All four are added (Moon/Sun, one blue control, shorter hero with "Now" dropped, Food Route -ss 0.3 privacy trim with the exact command), and a comment sits at portfolio.ts beside `recording: "foodroute"`. Both checkable claims are true: Hero.tsx RAIL has no Now or location row, and its comment says so. The byte-identity SHA claim is the implementer's, not re-run.
6. Right-click ruling - ADDRESSED. `pressStart` returns early for `button !== 0` or a Mac ctrl-click (WorldsStage.tsx:487), so no press is recorded and nothing is left to freeze. Two tests were added and reported failing before the change. Minor: the stage's own onPointerDown (WorldsStage.tsx:613) still sets `quietRef=false` on a right-click. That is harmless (a later landing speaks) and was not in scope.

Screenshots
- Satellite over "LIVING EARTH" (fw-night-worlds-replay.png, right label "LIVING EARTH" with the glyph on "EARTH"): a real but transient defect. It is a moving decoration colliding with a canvas label, which is unreadable for a few frames. Can wait, not Important. It is not a plaque or contrast failure, and nothing in WCAG 1.4.11 or 1.4.3 binds a passing overlap. Worth a ledger item (draw the label halo above the satellite, or skip the satellite near labels).
- Journey crossfade overlap (fw-day-case-viewport.png, fw-night-case-before.png): not shown to be a defect. The frames are scroll-driven mid-transition (heading over the previous date line, "07" over the YEAR slider, trunk behind the buttons), and the implementer did not investigate. Can wait. Settled frames are clean, and the sticky nav stitched into element captures is a capture artifact. If it recurs at rest, it becomes Important.
- Faint copy icon in night Contact: not a defect. The brightest icon pixel in fw-night-contact.png is rgb(154,166,174) on card rgb(22,32,42), 6.6:1. Antialiasing makes this a lower bound, so it clears the 3:1 of 1.4.11 comfortably. It reads faint only because it is thin and small. Can wait or drop.

New breakage in the fix diff: none Critical or Important. The doc, comment and test changes are accurate against the code. The implementer reported one unrelated flaky e2e (worlds "leaving mid-walk", passed alone 2/2) and a crashed all-project run from environmental causes (0xC0000142), both unverified here.

Verdict: all 6 items ADDRESSED, no new Critical or Important breakage.
