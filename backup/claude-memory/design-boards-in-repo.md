---
name: design-boards-in-repo
description: Approved Claude Design boards are versioned in the repo under design/<round>/vN; copy to vN+1 to refine, never edit an old version
metadata:
  type: project
---

Since 2026-10-20 the approved design canvas lives in the repo: `design/round-21-outdoors/v1/` (boards/*.dc.html + canvas.json, previews/*.png, source/gen-nature.mjs + qr.svg), described in `design/README.md`. Canvas URL: https://claude.ai/artifact/7qhYeRtHtWf3woKJPdH6sq. `design/**` is excluded from eslint; nothing in src imports it.

**Why:** Thien: "keep this Claude Design in the repo as we will need to refine later — we will have multiple versions."
**How to apply:** when the owner changes or approves boards, copy the round's latest vN to vN+1, regenerate with the generator there, re-render previews, add a row to design/README.md's version table, and republish the canvas. The working generator copy in the session scratchpad is not the source of truth any more. Related: [[round-20-redesign]].
