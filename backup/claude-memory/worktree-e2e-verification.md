---
name: worktree-e2e-verification
description: "How to run the portfolio's Playwright e2e suite from a git worktree when another session's dev server holds port 3000"
metadata: 
  node_type: memory
  type: project
  originSessionId: 115a84ae-5891-431a-b4e9-31e9c7e79c3a
  modified: 2026-08-24T02:18:19.585Z
---

Port 3000 is often held by another chat's dev server running from the main
checkout (D:\Project\portfolio), so a worktree's changes are invisible on it.
`.claude/launch.json` now has `"autoPort": true` (added 2026-08-23), so
`preview_start portfolio-dev` in a worktree gets an assigned port. To run e2e
against that server, `playwright.config.ts` hardcodes baseURL :3000 — create a
throwaway config in the worktree root that spreads the base config, overrides
`use.baseURL` to the assigned port, and sets `webServer: undefined`; delete it
after. Also: `next dev` chokes under 6 parallel Playwright workers
(ERR_CONNECTION_RESET near the end of a run) — re-run failures with
`--workers=2` before believing them. Related: [[windows-node-version]].

The same worktree trick is the answer for `pnpm perf` too, for a different
reason: `next build` clears `.next`, Next 16's dev server lives in
`.next/dev`, so a production build in the main checkout kills a dev server
running there. Build and `PORT=3100 pnpm start` in a detached worktree at the
commit under test instead. `pnpm install` there needs
`NPM_CONFIG_PACKAGE_LOCK=true` — the global `~/.npmrc` sets
`package-lock=false`, which makes `--frozen-lockfile` fail with
ERR_PNPM_NO_LOCKFILE even though the lockfile is right there. Scripts that
`require("@playwright/test")` must live inside the worktree; resolution is
relative to the script's own path, so one kept in the scratchpad cannot find
it.
