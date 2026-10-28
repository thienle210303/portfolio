# Round 21 phase 4 — the Journey: report

**Status:** done, not merged, not pushed. Branch `round-21/journey`, commits `26cd85a`..`0e01ac0` on `3589620`.

## Changed

| Commit | What |
|---|---|
| `26cd85a` | `highlights` gain `name`, `measure`, `year`, `projectId`; the 2026 stub; the owner-approved DoorDash impact line (indexed); `journey` copy; `buildTickets()`. |
| `9ba5cfa` | `draw-scenery.mjs` `// ---- Journey drawings ----` block: oak (bark/leaves/moss masks), phone branch, rice, both lanterns, both still lifes; `journeySpots()`. 10 committed SVGs. |
| `c6fc84b` | `--color-dusk-bark`, `--color-spanish-moss`; `--scene-bark`, `--scene-moss`, `--art-lantern`, `--art-journey-vignette` in all three theme scopes; `--step-chapter`; `SectionHeading size="chapter"`. |
| `4089f7f` | `HangingTags` (server): five tags, DoorDash a two-paper ticket; `JourneyHighlights` deleted. |
| `9ec4ea5` | The stage: `OakScenery`, `OakCrown`, heading + corrected lead, `WatchItGrow` (primary, >=1024, JS only), the vignette; no rail, no eyebrow; hanging-branch CSS. |
| `200a9fc` | `e2e/journey.spec.ts` (25 tests) and the other spec edits; CLAUDE.md, README, docs/editing.md, design/README. |
| `c2fd447` | Wide screens: the oak fades past its frame, one unwrapped sky tile. |
| `0e01ac0` | `docs/feedback-tracker.md` "Round 21 phase 4". |

## Decisions (beyond the plan body)

- **Owner answer 3** is built as a stub that is its own link to `#work-dd-feasibility-agent` (opens the DoorDash row at that case study); the 2025 half links to the row. Two papers joined at the perforation, each inside its link, so there are 6 tag links. The case study text was not changed.
- **640–1279: the branch runs down the middle, tags alternate sides** (like the hero's phone line). Below 640 one column at the right edge, as planned. The plan's single column left most of a tablet screen empty. The branch rises into the crown to meet the limb; tags hang from tapered CSS-mask twigs; the branch fades out at its foot. The e2e test for this layout was written to match.
- **Past 1440** the oak fades at the frame's edges and the sky is one tile starting 300px into the frame (a wrapped tile put a second sun on screen at 1920).
- Single tags' name row is `--step--1` (the board's 15px wrapped "Wordification 2024"); "onboarded merchants/month" wraps in the ticket.
- Bugs the new e2e caught and fixed: "Watch it grow" was visible below 1024 (`inline-flex` beat `hidden`; now `max-lg:hidden`); the ticket's notches counted as overflow.
- `origin.spec.ts` "keyboard press from far above" now starts from the page top (the button is ~160px above the box, so no scroll position has the button in view and the box far). `print.spec.ts` rail test no longer requires a rail (no section has one). `knowledge-tree`/`CareerTree` impact-line guards moved 16 -> 17 (the new line).
- Tried and reverted: `content-visibility: auto` on the oak containers (no byte saving inside perf's window; one run had CLS 0.0218).

## Validation

- `pnpm verify` 5/5: 870 unit tests (56 files); contrast 60 pairings, lowest 4.52:1; build OK.
- Retrieval eval: recall@1 70.0%, recall@3 93.3%, recall@5 96.7%, MRR@10 0.807 (unchanged; new line indexed).
- e2e on the production build, `--workers=2`: full suite 790 passed, 1190 skipped, 0 failed (no retries). Before it, journey 25/25; sections, origin, legacy-anchors, fragments, responsive, scale, contact, axe, accessibility, print, reveal, interactions, hero, companion all green after the fixes above.
- `pnpm perf` x3, 0 skipped: JS at load 168,049 B (+351 B vs 167,698 at `3589620`; +354 B vs 163.8 KB), JS 194,612 B, CSS 18,042 B, LCP 2672-3052 ms (CPU 99-100%, noise), CLS 0.
- DOM at 1440: `#tree` 1782 -> 1830 (+48, budget +60); other sections unchanged.
- Screens: `reports/r21-p4-screens/` (10 sizes x day/night + Watch it grow playing), all with no horizontal overflow.

## Remaining risks

- The oak adds ~47 KB over the wire (7 requests at phone width) fetched during load; LCP could not be judged on a saturated machine.
- The resting cats overlap a tag's year at 390 (companion branch owns them).
- Contact and cats branches touch `globals.css`, `draw-scenery.mjs`, `scenery.test.ts`, `contact.spec.ts` (control-fills list now includes "Watch it grow"); they must re-run `pnpm draw:scenery` after rebasing.
- The 640–1279 zig-zag and the stub link are my calls on top of the approved plan; the owner has not seen them.
