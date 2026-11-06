---
name: builder-model-sonnet
description: Thien wants coding/implementation subagents on Sonnet 5.5; the controller (Opus) reviews and merges
metadata:
  node_type: memory
  type: feedback
  originSessionId: 6a7fe831-6eb6-42ed-ac86-5a7eae481cda
  modified: 2026-10-23T21:49:52.574Z
---

Spawn coding and implementation subagents with `model: "sonnet"` (Sonnet 5.5). The main session stays the final reviewer: it reads screenshots, sends fixes back and merges.

**Why:** Thien asked on 2026-10-23: "let use Sonnet 5.5 to work on coding and implement!" That came after the Opus builders hit the weekly usage limit.
**How to apply:** pass `model: "sonnet"` on every Agent call that writes code. Review, planning and judgement stay in the main session. Related: [[round-20-redesign]].
