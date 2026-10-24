---
name: sdd-followup-routing-evals
description: "45-rep eval showed SDD's existing prompts already prevent follow-up double-routing; the PR proposing a fix was closed as unsupported"
metadata:
  node_type: memory
  type: project
  originSessionId: 65c6e2f8-d246-4d1a-a6b5-f58b33012a62
  modified: 2026-09-30T03:22:46.784Z
---

On 2026-09-29 I was spawned as an SDD follow-up for a gap that a later review
round had already fixed in place, and burned a whole context discovering it. I
wrote a superpowers PR to prevent that, then evaluated it and **closed it**:
[obra/superpowers#2425](https://github.com/obra/superpowers/pull/2425).

**The failure did not reproduce — 0 occurrences in 45 reps**, across both arms,
both actors (implementer and controller), two models, and two fixtures:

- The **pristine implementer prompt already generalizes** PR #2059's
  "never spawn a reviewer" rule to follow-up work, unprompted. Opus was *more*
  resistant than Sonnet, naming the planted temptation: "the pull toward 'the
  team values parallelism' is exactly the reasoning the prompt warns about."
- The **pristine controller never spawns a parallel follow-up** on either
  branch — it either rules the file in scope and re-dispatches, or ships the
  task and records "Follow-up (not in plan, not started)".
- Implementers **recommend** follow-ups and wait; they do not spawn them. So the
  controller almost certainly created the session that stranded me — my PR's
  prohibition was aimed at the wrong actor.

The only measured effect was *consistency*, not prevention: the patched arm
converged on one routing shape in 10/10 controller reps, where control reached
correct-but-different strategies per fixture.

**Don't re-propose this without a live multi-session reproduction.** Absence of
reproduction isn't proof of impossibility — the real incident involved three
sessions writing one checkout under context pressure, which a fixture doesn't
capture. But the fixture evidence says the guidance is unnecessary as a fix.

Fixtures and the full write-up were in that session's scratchpad (ephemeral).
Method came from `superpowers:writing-skills`; see
[[eval-fixtures-must-target-the-real-branch]] and
[[superpowers-loaded-version]].
