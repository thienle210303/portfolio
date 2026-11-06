---
name: answer-gate-vs-index-surface
description: The chat's "file" false positive was closed by narrowing the index surface, not the gate — both arms measured, shipped in dad2553
metadata:
  type: project
---

The Ask-this-site hole (1–2-term queries whose one corpus hit was `file` returned
three Workshop `watchFor` lines at 3.82) is **fixed**, on
`claude/answer-surface-watchfor` at `dad2553` (2026-09-30, unpushed as of then).
`workflowStages[].watchFor` no longer reaches `buildDocuments()`.

Both arms were measured against `tests/lib/answers-retrieval.test.ts` first:

- **Raise the coverage gate** (`requiredMatches`: `termCount <= 1 ? 1 : 2`) —
  recall@1 76.7→70.0, @3 93.3→83.3, @5 96.7→83.3, MRR 0.851→0.761, kills the
  `"How does he approach a problem?"` chip, breaks the eval harness's own snippet
  check. Reproduces the original implementer's numbers exactly; their revert was
  right.
- **Drop `watchFor` from the indexed surface** — eval byte-identical to baseline.
  Shipped. Full gate green, 554 tests.

**Why:** the trade had been recorded as gate-vs-nothing, so the cheap arm looked
unexplored when it was actually free on the current eval.

**How to apply:** do not reopen the gate without beating those numbers —
`tests/lib/answers.test.ts`'s "keeps each agent stage's failure mode out of the
indexed surface" asserts against `buildDocuments()`, so re-indexing goes red at
the mechanism. Two caveats stayed true: the eval has no query targeting
`watchFor` content, so "zero cost" means the eval cannot see the loss, and only
the *instance* closed — one match out of two terms is still admissible, so a
future corpus term that is rare here and common in English can reopen it. See
[[evidence-before-claims]].
