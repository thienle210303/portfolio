# R21 Phase 5 — the Record: build report (2026-10-23)

Branch `round-21/record`, `df1472b..97fe0d1` (9 commits), worktree `.claude/worktrees/r21-record`. Not pushed, not merged. Merges cleanly onto current main (`14b08a5`, the guard hook commits).
Plan: `docs/superpowers/plans/2026-10-21-round-21-phase-5-record.md`. Full numbers and decisions: `docs/feedback-tracker.md`, "Round 21 phase 5 — the Record". No SDD ledger: the plan was executed inline, not through subagent-driven development.

## Results
- `pnpm verify` 5/5: 894 unit tests (58 files), contrast 62 pairings lowest 4.52:1, build OK.
- Retrieval eval 70.0 / 93.3 / 96.7 / 0.807, unchanged.
- Full e2e, fresh production build on :3232, `--workers=2`: 806 passed, 1282 skipped, 0 failed (21.8 min).
- Perf (3 runs each, 0 skipped): JS at load 167,236 -> 168,400 B (+1,164 B); fonts +15,248 B (Newsreader latin-ext for "đ"); DOM 2293 -> 2734.

## Facts to check (owner)
- Certificate names/dates read off the images; SE.jpg is issued to "Nguyen MT Le", FoodRoute.jpg to "Nguyen Le"; the Forage certificates print verification codes; Cocky.jpg names two teammates. All published as provided.
- AT&T: nothing added, no stamp (owner); the existing `att` entry stays on /resume.

## Concerns
- Cats (round-21/cats): the cats rest on the Record's cards and rows (seen at 414 and 1280 in the screens), and `src/components/companion/companion-space.ts` has a stale comment naming the deleted `list-ink.tsx`. The tour change here is one line (`GREY_MIDDLE` gains "record") and one scene; it will need reconciling with the cats branch.
- CLS 0.0218 under perf throttling is a pre-existing hero shift (reproduced on df1472b).
- JS at load is +1,164 B, at the edge of the ~+1 KB budget.
- The guard hook in the main checkout reported `public/scenery/bamboo.svg` as hand-edited during this session; this worktree never touched it (git status clean for it). Probably the hook reading the main checkout.
