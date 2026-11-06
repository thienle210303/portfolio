---
name: impeccable-hybrid-plan
description: "Impeccable + Hallmark installed with hooks (2026-10-24), DESIGN.md/PRODUCT.md pointers and the-pass skill that wins on conflicts; uncommitted at write time"
metadata:
  node_type: memory
  type: project
  originSessionId: 4ea71213-fcf3-4a44-94de-e0b98056de40
  modified: 2026-10-24T15:58:30.740Z
---

2026-10-24: Thien asked for both Impeccable (npm `impeccable` 4.7.0, pbakaus) and Hallmark (`nutlope/hallmark` via `npx skills@1.7.4`, hash in skills-lock.json) at project scope with hooks, used "as improvement, not conflict". Installed with telemetry off (~/.impeccable/config.json; skills run with DO_NOT_TRACK=1).

Layout: `.claude/skills/{impeccable,hallmark,the-pass}`; root `DESIGN.md` (both tools read it; Hallmark treats it as a locked system) and `PRODUCT.md` are pointers only — no token frontmatter, never run `/impeccable document`. Impeccable's hooks (SessionStart, PostToolUse Edit|Write, Stop) sit in the gitignored `.claude/settings.local.json`, so other machines need `npx impeccable install --project --providers=claude -y`; its ~20 MB engine binary is gitignored and re-downloaded by the launcher. Hallmark's lint hook is in shared `.claude/settings.json` via $CLAUDE_PROJECT_DIR and only lints .tsx because `.hallmark/` exists.

**Why:** the-pass assigns Impeccable to refining inside the system and Hallmark to audit/sloplint/study only; theme builds, redesign, colorize, document are banned on this site.

**How to apply:** triage findings as real / intentional / noise using the-pass's table. Known open real-or-check items from the 9b54c68 scan: tight-leading on a stamp button, gate 33 SVGs in DrawnTree/OriginStory without aria-hidden (verify parent), 4 em-dashes in companion copy, arrow glued to "More on this in →". PRODUCT.md `## Users` awaits Thien. See [[round-20-redesign]].
