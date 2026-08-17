import { describe, expect, it } from "vitest";
import { answer } from "@/lib/answers";
import { EVAL_CASES, MUST_BE_EMPTY, type EvalCase } from "@/../tests/fixtures/answers-eval";

/**
 * Scores the real index against the eval set, and fails if retrieval quality
 * regresses.
 *
 * ## Why this file exists
 *
 * It was written to justify adding an embedding model, and it is the reason
 * there isn't one. The plan was a second, opt-in tier: MiniLM via
 * transformers.js, ~25 MB, vectors cached in IndexedDB, blended with the lexical
 * score. The measurement was supposed to be the before-picture that proved a
 * model was needed.
 *
 * Instead it found bugs. Every one of the defects below was invisible without a
 * scoreboard, because each one fails *silently* — the panel returns three
 * plausible answers to some other question, or nothing at all, and nothing looks
 * broken. Measured over the 31 cases in the fixture:
 *
 *                              recall@1  recall@3  recall@5  MRR@10  refusals
 *   as merged                     19.4%     29.0%     29.0%   0.246     4/4
 *   folding, stemming, aliases,
 *     skills + impact indexed     67.7%     77.4%     83.9%   0.737     3/4
 *   filler stop-listed,
 *     coverage gate added         64.5%     74.2%     77.4%   0.694     4/4
 *   boilerplate out of the
 *     surface, alias scope fixed  80.6%     93.5%     96.8%   0.868     4/4
 *
 * Two things in that table are worth more than the last row. The second step
 * traded a refusal away for recall — "kubernetes helm operator" started
 * answering with "Deployed to shop-floor operators" — and the third bought it
 * back at a real cost in recall, which is what a single score threshold forces
 * you to choose between. Only separating coverage from ranking got both.
 *
 * The defects, in order of damage done:
 *
 *  1. **Skills were not indexed at all**, and career impact lines were plumbed
 *     as far as `answer-sources` and then dropped. "What languages does he know"
 *     and "mendix" and "graphql" had nothing to match.
 *  2. **"who" was a stop word.** "Who is he" tokenised to nothing, so the most
 *     basic question about a person hit the honest-refusal path.
 *  3. **IDF inverted on filler.** In a corpus this small, "anyone" and
 *     "actually" are rarer than "scraper", so they scored higher.
 *  4. **No stemming.** "projects" never matched "project"; "languages" never
 *     matched "language".
 *  5. **Generated boilerplate reached the index.** Folding `source` into the
 *     search surface put ", what it taught him" on every project's lesson, so
 *     "has he taught anyone" tied five ways across passages about scrapers.
 *
 * ## What the numbers do and do not prove
 *
 * They prove the *relative* movement — the same 31 queries, scored before and
 * after. They do not prove the absolute figures generalise, because the queries
 * and the aliases in `src/content/answer-expansion.ts` were written by the same
 * hand. That limitation is recorded in both files and is the main reason to
 * re-run this against real queries if the site ever logs them.
 *
 * The guard against the worst version of that circularity is the rule in the
 * fixture: a query may not be reworded to make it pass, and an alias may only be
 * added if it describes its subject to someone who has never seen the eval. Two
 * cases here are still carried as *known weaknesses* rather than tuned away —
 * "what happens when a long job quietly breaks" and "how does he decide what is
 * worth working on" both rank a correct answer outside the top slot, because the
 * passages that answer them share no vocabulary with the question at all. That
 * is the shape of query an embedding model would genuinely help with, and two
 * cases out of thirty-one is the honest size of the gap it would close.
 */

/** How deep to look. Beyond ~10 nobody scrolls, so nothing below it counts. */
const DEPTH = 10;

/** 1-based rank of the first correct answer, or 0 when there is none. */
function rankOfFirstHit(testCase: EvalCase): number {
  const results = answer(testCase.query, DEPTH);
  for (const [index, result] of results.entries()) {
    if (testCase.expect.some((snippet) => result.text.includes(snippet))) return index + 1;
  }
  return 0;
}

const RANKS = EVAL_CASES.map(rankOfFirstHit);

function recallAt(k: number): number {
  return RANKS.filter((rank) => rank > 0 && rank <= k).length / RANKS.length;
}

const MRR =
  RANKS.reduce((total, rank) => total + (rank > 0 ? 1 / rank : 0), 0) / RANKS.length;

/**
 * Attached to every assertion below, because Vitest's default reporter swallows
 * `console.log` from a passing test — so without this the numbers this whole
 * file exists to produce would only ever be visible on a failure.
 */
function scoreboard(): string {
  const misses = EVAL_CASES.filter((_, index) => RANKS[index] === 0).map(
    (testCase) => `      ✗ "${testCase.query}" — ${testCase.probes}`,
  );
  // Zipped before filtering: mapping after a filter renumbers the index and
  // reports every one of these at rank 1.
  const deep = EVAL_CASES.map((testCase, index) => ({ testCase, rank: RANKS[index] }))
    .filter(({ rank }) => rank > 3)
    .map(({ testCase, rank }) => `      ~ "${testCase.query}" at rank ${rank}`);
  return [
    "",
    `    cases ${RANKS.length}`,
    `    recall@1 ${(recallAt(1) * 100).toFixed(1)}%`,
    `    recall@3 ${(recallAt(3) * 100).toFixed(1)}%`,
    `    recall@5 ${(recallAt(5) * 100).toFixed(1)}%`,
    `    MRR@${DEPTH}   ${MRR.toFixed(3)}`,
    ...(misses.length ? ["    missed entirely:", ...misses] : []),
    ...(deep.length ? ["    found below rank 3:", ...deep] : []),
    "",
  ].join("\n");
}

describe("retrieval quality", () => {
  /**
   * Guards the eval itself. Without this a content edit turns a case into a
   * permanent miss and the suite reports a retrieval regression that is really
   * a stale fixture — the failure mode that makes eval sets rot.
   */
  it("every expected snippet still exists in the content layer", () => {
    // A snippet is reachable if *some* query surfaces it; searching for the
    // snippet's own words is the cheapest way to ask that.
    for (const testCase of EVAL_CASES) {
      for (const snippet of testCase.expect) {
        const found = answer(snippet, 40).some((result) => result.text.includes(snippet));
        expect(found, `eval snippet no longer in the index: "${snippet}"`).toBe(true);
      }
    }
  });

  it(`finds a correct answer in the top 3 for ≥90% of queries${scoreboard()}`, () => {
    expect(recallAt(3), scoreboard()).toBeGreaterThanOrEqual(0.9);
  });

  it("finds a correct answer in the top 5 for ≥95% of queries", () => {
    expect(recallAt(5), scoreboard()).toBeGreaterThanOrEqual(0.95);
  });

  it("ranks a correct answer first for ≥70% of queries", () => {
    expect(recallAt(1), scoreboard()).toBeGreaterThanOrEqual(0.7);
  });

  it("holds mean reciprocal rank above 0.8", () => {
    expect(MRR, scoreboard()).toBeGreaterThanOrEqual(0.8);
  });

  /**
   * The other half of the job. A retriever that answers everything is not
   * better than one that admits a gap — on a page making factual claims about
   * employment history, a confident wrong passage costs more than silence.
   */
  it("returns nothing for questions the site does not answer", () => {
    for (const testCase of MUST_BE_EMPTY) {
      expect(
        answer(testCase.query),
        `"${testCase.query}" should return nothing (${testCase.probes})`,
      ).toEqual([]);
    }
  });
});
