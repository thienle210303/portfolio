# Round 20 Phase 5 (Journey) ledger

Branch round-20/journey, base 071f81a, head 35e1b7f (plus the Record commit).

## Per task
- Task 1 (071f81a..514a593): highlight cards (17h -> 3m, 99.9%, 96%, 3M+, 200+), each traced to its entry and linking to `#journey-entry-<id>`; review fixes: first-card focus ring, Schaeffler label, bento fill, `hasToken` escaping.
- Task 2 (514a593..1815f5e): pinned stage replaced by a one-open timeline; anchors moved onto rows; `anchors.ts` deleted; DrawnTree lost its branch panels; legacy ids kept in SSR HTML.
- Task 3 (1815f5e..35e1b7f): tree in a fixed-height (about min(720px, 80svh)) scroll box that plays once on sight, follows the growth up, and replays from "See how it grows"; OriginStory's unreachable reduced-motion storyboard deleted; click-to-advance keeps following.
- Task 4: verify, e2e, perf, lag, screenshots, this ledger.

## Rulings (verbatim from progress.md)
Ruling: DrawnTree loses its branch panels/case studies (the timeline owns impact, chips and case studies; branch labels link to rows) — spec gives the timeline those details and two copies would duplicate the work-<id> ids — cost if wrong: desktop visitors lose in-tree detail cards; the row is one click away.
Ruling: act-* anchors are deleted — nothing links to them and CLAUDE.md's retired-id list doesn't include them — cost if wrong: an external link to #act-* lands at the page top.
Ruling: the tree box and "See how it grows" are ≥1024 px only, like the drawing today — cost if wrong: phone visitors don't see the tree grow.
Task 3: Ruling: the tree box is a fixed-height scroll container (≈min(720px, 80svh)) holding the full-size tree; play scrolls the CONTAINER to the ground then follows the growth front upward on each beat (stops if the visitor scrolls it); the button scrolls the page to centre the box then plays — matches spec's "fixed-height box" and the owner's "don't make the user hunt" without page scroll-jacking or WCAG-shrinking the tree — cost if wrong: a nested scroll area on desktop.
Task 3: Ruling: delete OriginStory's unreachable reduced-motion storyboard — cost if wrong: none (unreachable).
Task 3: Ruling: accept losing WatchOrigin's "Loading…"/failure copy — the box auto-plays and a failed chunk just leaves the finished tree visible, which is the honest fallback — cost if wrong: a press during a slow chunk load gives no feedback for a moment.

## Deferred minors
- Task 1: no rendered focus-contrast measurement (structural guard only); no accessible-name test.
- Task 2: `arrivedAge()` is test-only; JS-off second in-page link collapses the previous row (accepted); docs/voice.md cites ACTS title historically.
- Task 3: companion.spec allows one cat asleep during a mounted stage (documented).

## Owner notes
- The tree box and "See how it grows" exist at >= 1024 px only; phones get the timeline and highlights.
- The box is a nested scroll area (720 px high on desktop) inside the page scroll.
- WatchOrigin's "Loading..." / failure copy is gone; a failed chunk leaves the finished tree visible.
- Highlight labels are authored short phrases next to figures that trace to each entry's headline/impact.
- `arrivedAge()` deleted in the final-review fixes (it had no production caller).
- Task 4 observation, corrected by the final-review A/B (tracker, R20-P5): the Journey scroll band is unchanged against P4 (about 46 fps, fewer drops). The lower total fps comes from the page being 1,051 px shorter, plus a `worlds` band that was slower in all three runs (traced afterwards to Journey content repainted every frame, mostly the tree box's drawing). `about` rest busy is higher in every run (about 11-12% against 8-9%), which rules out noise. The trace attributes most of it to compositing-update work from the tree box being a scroll container. The box was not auto-playing in any lag sample.
- During a show, released branch labels are now working links. A click anywhere else on the drawing still advances the story. The auto-play does not start if the pointer or focus is already in the box.
- Lag fixes after the A/B (owner's #1 complaint): the tree box is now drawn and scrollable only within 200 px of the viewport or while it plays. Its links leave the accessibility tree while far away; every one is also a timeline row. The timeline and the unbranched case studies skip painting while far off screen at lg. Traces under heavy load show `about` compositing and Worlds paint back to or below `ae0cdc6`. The `pnpm lag` A/B could not be re-run on an idle machine, so it is still pending.
