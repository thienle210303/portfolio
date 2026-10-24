---
name: eval-fixtures-must-target-the-real-branch
description: "When pressure-testing a process-doc change, the fixture must route down the same branch the real failure took — otherwise a passing control proves nothing"
metadata:
  node_type: memory
  type: project
  originSessionId: 65c6e2f8-d246-4d1a-a6b5-f58b33012a62
  modified: 2026-09-30T03:23:11.476Z
---

Testing a change to agent-guidance prose (a skill, a prompt template), the
fixture has to send the agent down **the same branch the real incident took**.

My first controller fixture made the reported concern *block* the task's own
goal. That routes into SDD's existing "address correctness concerns before
review" path, which already works — so 10 reps proved only that a branch I
wasn't testing is fine. The real incident had a **non-blocking** concern: task
goal met, adjacent gap in a file the task didn't own. Rebuilding the fixture
there is the only reason the result meant anything. Both branches came back
clean, which is what justified closing the PR — see
[[sdd-followup-routing-evals]].

Method that worked, from `superpowers:writing-skills`:

- **Always run a no-guidance control.** If the control doesn't exhibit the
  failure, there is nothing to fix. Stop.
- Take the pristine arm from `git show upstream/<branch>:<path>`, never from a
  local copy that may already carry the edit. Assert the marker string is
  absent from control and present in treatment before dispatching.
- System context = the real full template the guidance lives in, not the
  guidance in isolation. 5+ reps per arm.
- **Read every rep manually.** Counts overstate both failure and success.
- **Variance is a metric**: when wording binds, reps converge on one shape.
- Test each **actor** separately. The failure may be caused by a different role
  than the one the fix targets.
- Vary the **model**. A negative control on one model is weak evidence.

Also: mutation-test any assertion before trusting it green. Stub out the thing
under test, confirm the test goes red, restore, and verify the restore by
checksum — see [[worktree-e2e-verification]].
