# Handoff

## State (2026-10-24)
- **Round 21 "The Pass, outdoors" is done.** All 8 phases are merged and pushed to main (9b54c68), and CI is green.
- **Page order:** About → Journey (#tree) → Record (#record) → Contact.
- **Design boards:** design/round-21-outdoors/v1/. Spec: docs/superpowers/specs/2026-10-18-round-21-outdoors-design.md.
- **Open PR #22** (https://github.com/thienle210303/portfolio/pull/22), branch `round-21/polish-2`, worktree .claude/worktrees/r21-polish2. Auto-fix is on; auto-merge is off. It has 4 commits:
  - parked cats tuck off the edge and stop sitting on words at 320
  - day-sky birds stay off the 320 headline
  - "low-code." never splits across lines in the Journey tags
  - field tag stacks label over value below 380px
- The Sonnet builder may still be finishing verify, full e2e, perf and screenshots on that branch. It may push more commits to the PR (allowed), never to main.
- **Owner decisions:**
  - Coding agents run on Sonnet (`model: "sonnet"`). The main session reviews and merges.
  - Certificates stay exactly as supplied: names, Forage codes and CockyHacks teammates.
  - "Nguyen MT Le" is Thien's own name in US order.
  - Snapping turns off after a fragment or nav click (builder's call; the owner may revisit).

## Next
1. Read the builder's report: D:/Project/portfolio/reports/r21-polish2-report.md and its screenshots in reports/r21-polish2-screens/. Check the PR's CI, then merge PR #22 if green.
2. After the merge, remove the worktree .claude/worktrees/r21-polish2 and run `git worktree prune`.
3. The iOS fixed-sky check is still unverified. Either the owner checks on an iPhone, or WebKit is installed with the owner's OK.
4. A paused "Impeccable hybrid plan" exists in memory. Ask the owner whether to resume it now that round 21 is done.

## Context
- **Node and pnpm:** use Node 26. If pnpm resolves to a Node 20 shim, prefix PATH with /c/Users/thien/AppData/Roaming/nvm/v26.12.0.
- **Processes:** kill servers by exact PID only. Never use port 3000 or PID 4292.
- **Generated files:** public/scenery is generated (`pnpm draw:scenery`). The guard hook flags merged-in scenery files; that is a false positive if a fresh draw leaves git clean.
- **docs/contrast.md** often shows a CRLF-only diff after `pnpm verify`. Run `git checkout -- docs/contrast.md` before merging.
- **Worktrees:** copy reports and ledgers to reports/ before removing a worktree.
