---
name: windows-node-version
description: "Node 26 default was lost on 2026-10-18 (nvm now points at 20.20.2); use the verified portable Node 26.12 in the session scratchpad via PATH for pnpm test/verify"
metadata: 
  node_type: memory
  type: project
  originSessionId: 23505b57-672a-4874-a335-22f21984c61b
  modified: 2026-08-22T18:11:04.042Z
---

Resolved 2026-08-22: Thien upgraded the machine's default Node to 26.7.0, so
`pnpm test` runs natively (the old default 20.17 broke vitest/jsdom, which
needs >=22.12 — `package.json` engines documents that floor). If a stray
shell ever picks up an old nvm version (20.x/22.9 still exist under
nvm-windows), the failure signature is rolldown/`require(esm)` startup
errors, not real test failures. Also: after any `pnpm install --force`, make
sure no dev server is running — a held native-binding lock (tailwind oxide)
can leave a package half-installed and break all breakpoint CSS in dev.

Update 2026-10-18: around 18:04 the machine's default Node changed to v20.20.2 (nvm symlink; installed: 20.10, 20.17, 20.20.2, 22.9 — no 26 any more). Not done by me. vitest needs >=22.12, so `pnpm verify` fails on the default. Workaround used: official portable node-v26.12.0-win-x64 (checksum-verified) unzipped in the session scratchpad, prepended to PATH per command; the global Node was left alone. Ask Thien before changing the machine-wide Node.

Update 2026-10-19: Thien uses `nvm use 20` for another project. Node 26.12.0 is now installed under nvm (AppData/Roaming/nvm/v26.12.0). `nvm use` must run in an interactive admin terminal: it rewrites the C:/Program Files/nodejs symlink, and without admin it prints "Now using" but nothing changes. For this repo, prefix commands with export PATH="/c/Users/thien/AppData/Roaming/nvm/v26.12.0:$PATH".
2026-10-19 later: Thien switched the default back to Node 26.12.0 (admin `nvm use`); `pnpm verify` passes natively on main (802 tests). No PATH prefix needed while it stays on 26; he may switch to 20 for other projects, so check `node -v` first.
