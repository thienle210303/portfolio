/**
 * A hand-copied excerpt of the real ranking loop in `src/lib/answers.ts`.
 *
 * That file is read-only from this section (see AGENTS.md/CLAUDE.md): this
 * panel excerpts it rather than importing or re-deriving anything from it, so
 * there is no risk of quietly reshaping the logic while "just" formatting it
 * for display. `SCORING_EXCERPT` below is a manual, byte-checked transcript of
 * the `for (const { doc, text, label } of INDEX)` loop inside `answer()`
 * (roughly lines 472-497 of that file at the time of writing) — every line
 * that survives is copied verbatim, indentation aside. Two things are
 * shortened, both marked in place rather than silently dropped:
 *
 *  - The result object's pass-through fields (`text`, `source`, `sectionId`,
 *    `sectionLabel`) collapse to a `// …` comment, because they are not part
 *    of the ranking decision — only `score` is.
 *  - Nothing about the scoring/admission logic itself (the term loop, the
 *    0.6 label weight, the `matched >= needed && score >= MIN_SCORE` gate)
 *    is trimmed, reordered or rewritten.
 *
 * If `answer()`'s ranking logic ever changes, this excerpt has to be updated
 * by hand to match — there is no build step that keeps the two in sync, by
 * design (that would mean either generating prose from code, which the Code
 * tab already does for the *output*, not the mechanism, or importing internals
 * `answers.ts` does not — and should not — export).
 */

export const SCORING_EXCERPT_FILENAME = "src/lib/answers.ts — excerpt";

export const SCORING_EXCERPT = `for (const { doc, text, label } of INDEX) {
  let score = 0;
  let matched = 0;
  for (const term of unique) {
    const weight = IDF.get(term) ?? 0;
    if (text.has(term)) {
      score += weight;
      matched += 1;
    } else if (label.has(term)) {
      // A title match is evidence about *which* thing is being asked about,
      // so it counts — but less than the answer text actually containing it.
      score += weight * 0.6;
      matched += 1;
    }
  }
  if (matched >= needed && score >= MIN_SCORE) {
    scored.push({
      // … text, source, sectionId, sectionLabel — passed through unchanged
      score,
    });
  }
}`;

export const SCORING_EXCERPT_SUMMARY =
  "A short, hand-copied excerpt from src/lib/answers.ts: the loop that scores each candidate " +
  "passage by summed IDF-weighted term overlap, then admits it only if it matches enough " +
  "distinct query terms and clears a minimum score. The four pass-through result fields are " +
  "elided with an ellipsis comment; the scoring and admission logic is unchanged from the source.";

/**
 * The same rule stated as notation, matching the excerpt above term for term:
 * `idf(t)` is `IDF.get(term)`, the `1` / `0.6` split is the `text.has` /
 * `label.has` branches, and the admission clause is the closing `if`.
 */
export const SCORING_MATH = [
  "score(d) = Σ idf(t) · w(t,d),  w = 1 if t∈text(d), 0.6 if t∈label(d) only",
  "admit d ⇔ matched(d) ≥ needed(query) and score(d) ≥ 0.8",
].join("\n");
