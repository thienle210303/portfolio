---
name: evidence-before-claims
description: "Thien wants work withdrawn rather than re-scoped when evidence contradicts its central claim — and wants the contradicting evidence published, not quietly dropped"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 65c6e2f8-d246-4d1a-a6b5-f58b33012a62
  modified: 2026-09-30T03:23:42.778Z
---

On 2026-09-29, given four options for a PR whose central claim my own evals had
just contradicted, Thien chose **"post results, then close it"** — over
re-scoping it to the narrower claim the evidence did support, and over leaving
the maintainer to decide.

**Why:** a claim that survives only by being narrowed until it's true still
costs a reviewer their time. Publishing the contradicting evidence and
withdrawing is cheaper for everyone and leaves an honest record for whoever
finds it next. He had also asked me to run those evals knowing they might kill
the work.

**How to apply:**

- When evidence undercuts something I've shipped or claimed, surface it
  immediately and plainly, including in public where the claim was made. Don't
  sit on it, and don't soften the claim to keep it alive.
- Offer withdrawal as a real option, listed first, not as a token choice.
- Say which boxes I can't honestly check rather than checking them — dropping
  the eval-gated part of a change (my Red Flags rows) was the right call and he
  endorsed it by picking the narrowed submission earlier in the same session.
- He also wants outcomes reported faithfully in-session: I twice reported a
  green result that was a wrapper's exit code masking a real failure
  (Playwright, then a GitHub API TLS timeout). Verify the thing itself, not the
  shell's exit status.

Related: [[sdd-followup-routing-evals]],
[[eval-fixtures-must-target-the-real-branch]].
