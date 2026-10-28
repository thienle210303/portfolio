---
name: feedback-tracker-2026-08
description: "Thien's 2026-08-17 feedback round is tracked in docs/feedback-tracker.md; PM session coordinates Opus/Sonnet owners"
metadata: 
  node_type: memory
  type: project
  originSessionId: a52b6c65-60e3-450a-a1b4-5edf59dce533
  modified: 2026-08-17T04:29:11.480Z
---

Thien runs this portfolio with a PM-style workflow: Claude acts as lead
product/engineering manager, evaluates his feedback (Accepted / Needs
clarification / Rejected), and assigns work to "Opus" (architecture,
behaviour) and "Sonnet" (UI, polish). The live tracker for the 2026-08-17
feedback round is `docs/feedback-tracker.md` in the repo — statuses, owners,
task breakdowns, and three open questions (Q1 keep blue accent, Q2 keep
Contact's dark tone, Q3 previews in Selected Work) with stated defaults.

**Why:** Continuing sessions must update that tracker rather than re-evaluate
from scratch, and must respect the sequencing it records (Companion.tsx work
is strictly serial: FB-05 → FB-06 → FB-07).

**How to apply:** Read `docs/feedback-tracker.md` before touching feedback
work; move statuses as items progress; nothing is Done before `pnpm verify` +
`pnpm test:e2e` + a both-themes browser check.
