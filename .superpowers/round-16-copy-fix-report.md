# Round 16 copy fix — report

Branch `claude/round-16-demolition`, starting head `d532f3a`.

## The three edits

### 1. `src/content/portfolio.ts:1101` — the stale clause

Before:
```
"Multi-agent feasibility workflow at DoorDash; DistilBERT fine-tuning at 92% accuracy; see the AI Workflow Lab for dated experiments."
```

After:
```
"Multi-agent feasibility workflow at DoorDash; DistilBERT fine-tuning at 92% accuracy."
```

Byte-exact to the spec in the task. No other characters touched.

### 2. `src/lib/answers.ts:281` — the suggested question

Before:
```
"What is he exploring with AI agents?",
```

After:
```
"How does he use AI agents?",
```

Rationale: the only answer this question can return (the DoorDash multi-agent
feasibility workflow + DistilBERT fine-tuning line) describes a shipped,
adopted engineering practice, not an open-ended exploration. "How does he use
AI agents?" states the premise the answer actually supports.

I deliberately did not follow the task's example wording "How does he use AI
in his work?" — tried it first and it fails badly (see verification below):
the word "work" is a heavily-aliased term across the Selected Work section
(sectionExpansions for sectionId "work"), so it out-competes the Skills/AI
document entirely and the suggested question would return a wrong top-1 about
a vehicle-data project, not the AI answer. "AI agents" instead of "AI ... in
his work" avoids that collision and keeps the query specific to the one
document that should answer it.

### 3. `tests/fixtures/answers-eval.ts:302-311` — the eval case

Before:
```ts
{
  query: "what is he exploring with ai agents",
  expect: ["Multi-agent feasibility workflow at DoorDash"],
  probes: "the lab, asked in the site's own terms",
},
```

After:
```ts
{
  query: "how does he use ai agents",
  expect: ["Multi-agent feasibility workflow at DoorDash"],
  probes: "the site's own suggested question, reworded after the AI Workflow Lab was removed",
},
```

The expected snippet (`"Multi-agent feasibility workflow at DoorDash"`) needed
no change — it is a prefix of the still-present sentence, verified against
the edited content by the eval's own
"every expected snippet still exists in the content layer" test, which
passed.

## Verifying the reworded question actually retrieves something

Method: added a temporary Vitest spec (`tests/tmp/probe.test.ts`, deleted
after use — not part of the diff) that imported `answer` from `src/lib/answers.ts`
directly and logged `answer(question)` for several candidate rewordings, run
via `npx vitest run tests/tmp/probe.test.ts --reporter=verbose`.

Results:

- `"How does he use AI in his work?"` → **wrong top-1**: scored the Selected
  Work "Vehicle information is spread across..." passage at 3.198, ahead of
  the AI/Skills document at 2.517. Rejected for this reason (see rationale
  above).
- `"How does he use AI agents?"` (chosen) → **single, correct result**:
  ```
  3.077 skills - Multi-agent feasibility workflow at DoorDash; DistilBERT fine-tuning at 92% accuracy.
  ```
  Only one document qualifies at all — no ambiguity, no competing answer.
- `"What does he do with AI agents?"` → wrong top-1 (matched Selected Work
  passages instead).
- `"How does he use AI day to day?"` → no results (below the match-count
  gate).

Term-count / gate analysis for the chosen question, `"How does he use AI
agents?"`: tokenizing drops the stop words "how", "does", "he", giving unique
terms `{use, ai, agent}` — 3 terms, so `requiredMatches(3) = 2` (not the
fragile 1-term/1-required boundary another reword in this branch sits on).
The AI/Skills document matches on 2 of those terms (`use` via the "uses"
alias, `ai` via the category label "AI-assisted engineering"), for a score of
3.077, comfortably above `MIN_SCORE = 0.8`. This has more margin than a
single-term match would.

## Retrieval metrics (`tests/lib/answers-retrieval.test.ts`)

Ran via `npx vitest run tests/lib/answers-retrieval.test.ts --reporter=verbose`:

```
cases 30
recall@1 80.0%
recall@3 93.3%
recall@5 96.7%
MRR@10   0.869
found below rank 3:
  ~ "any experience with messy or duplicated data" at rank 6
  ~ "how many retailers has he integrated" at rank 4
```

Identical to the pre-edit baseline stated in the task (recall@1 80.0%,
recall@3 93.3%, recall@5 96.7%, MRR 0.869). All four floors held:

| Metric | Floor | Actual |
|---|---|---|
| recall@3 | ≥ 90% | 93.3% |
| recall@5 | ≥ 95% | 96.7% |
| top-1 (recall@1) | ≥ 70% | 80.0% |
| MRR | > 0.8 | 0.869 |

## Grep for the old string

```
grep -rn "AI Workflow Lab\|exploring with AI agents\|exploring with ai agents\|see the AI Workflow" tests/ e2e/ src/ docs/
```

No test or e2e spec pins the old evidence string or the old question
verbatim. Matches found are all either:
- unrelated defensive comments about nav-label substring matching
  (`e2e/navigation.spec.ts`),
- references to the still-existing, intentionally untouched
  `src/content/ai-experiments.ts` module and its doc comments,
- historical planning/spec docs under `docs/superpowers/` and
  `docs/feedback-tracker.md` describing round 16's removal (not assertions),
- `docs/editing.md`'s note that `ai-experiments.ts` content is currently
  unrendered.

None of these assert the deleted clause or the old question text as a
value under test.

## `pnpm verify`

```
> portfolio@0.1.0 verify
> pnpm typecheck && pnpm lint && pnpm contrast && pnpm test && pnpm build

> typecheck: tsc --noEmit                    -> clean, no output
> lint: eslint                                -> clean, no output
> contrast: node scripts/contrast.mjs
✓ 31 pairings, all >= AA. Lowest 4.66:1 (Night, code comments). Wrote docs/contrast.md
> test: vitest run
 Test Files  25 passed (25)
      Tests  426 passed (426)
> build: next build
▲ Next.js 16.3.1 (Turbopack)
✓ Compiled successfully in 5.7s
✓ Generating static pages using 11 workers (10/10)
```

`docs/contrast.md` was regenerated byte-identical (git only flagged an
LF/CRLF line-ending note, no content diff) — no palette token was touched, as
expected.

## Scoped e2e — `pnpm test:e2e ask sections`

Single run, no retry needed:

```
151 passed (3.3m)
119 skipped
[exited with code 0]
```

(Skipped entries are the non-matching Chromium viewport/project combinations
Playwright enumerates but that this filtered run doesn't execute — 0 failures
across everything that did run, including
`e2e/ask.spec.ts:128:7 › ask this site › every suggested question is a live
control, not a dead one`, which exercises every entry in
`SUGGESTED_QUESTIONS` including the reworded one, and
`e2e/ask.spec.ts:84:7 › ask this site › answers a suggested question with
sourced, linked evidence`.)

## Self-review

- Content string is byte-exact to the spec: confirmed by diff above.
- New suggested question verified to retrieve a real, unambiguous answer via
  a direct call to `answer()` — not assumed. Rejected the task's own example
  wording after testing showed it fails.
- All four retrieval floors held, at the same values as the pre-edit
  baseline — the edit had no measurable effect on the eval set beyond the one
  case it targets.
- Grepped for the old string across `tests/` and `e2e/`; nothing pins it.
- Diff touches exactly three files: `src/content/portfolio.ts`,
  `src/lib/answers.ts`, `tests/fixtures/answers-eval.ts`. No other authored
  content string, and `src/content/ai-experiments.ts` is untouched.

## Concerns

None. The fix is narrow, verified, and both dependents were retuned and
re-checked rather than left to assumption.
