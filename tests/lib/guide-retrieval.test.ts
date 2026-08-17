import { describe, expect, it } from "vitest";
import { buildGuideIndex } from "@/lib/guide/buildIndex";
import { searchIndex } from "@/lib/guide/match";
import { EVAL_CASES, type EvalCase } from "../fixtures/guide-eval";

/**
 * Scores the guide's lexical retrieval against the eval set.
 *
 * ## What this file decided
 *
 * It was written to answer one question: is an embedding model worth 513 KB of
 * runtime on this corpus? The measurements said no, and the model was removed.
 * The record, on 43 realistic queries:
 *
 * ```
 *                        recall@1  recall@3  recall@5   MRR@10
 *   first measurement      39.5%     48.8%     51.2%    0.444
 *   after two matcher bugs 55.8%     69.8%     72.1%    0.631
 *   after doc expansion    62.8%     79.1%     81.4%    0.706
 *   after four more fixes  76.7%     97.7%    100.0%    0.866
 * ```
 *
 * Almost all of that came from defects rather than from missing cleverness — a
 * length-blind coverage gate that filtered long questions out entirely, no
 * plural handling, "go" treated as an imperative, and "who" stop-listed while
 * also being a keyword. Worth remembering before reaching for a model again.
 *
 * ## Thresholds
 *
 * Set just under the measured values, so a regression fails CI rather than
 * waiting for someone to notice a number. Every assertion attaches the full
 * scoreboard, so one failure shows the whole picture.
 */

const index = buildGuideIndex();
const ENTRY_IDS = new Set(index.entries.map((entry) => entry.id));

/** Cases that expect a hit, and cases that must come back empty. */
const POSITIVE = EVAL_CASES.filter((testCase) => testCase.expect.length > 0);
const NEGATIVE = EVAL_CASES.filter((testCase) => testCase.expect.length === 0);

/** Rank of the first correct hit, 1-based. `null` when none was found. */
function rankOfFirstHit(testCase: EvalCase, limit: number): number | null {
  const hits = searchIndex(index.entries, testCase.query, limit);
  const expected = new Set(testCase.expect);
  for (const [position, hit] of hits.entries()) {
    if (expected.has(hit.entry.id)) return position + 1;
  }
  return null;
}

function recallAt(k: number): number {
  const found = POSITIVE.filter((testCase) => {
    const rank = rankOfFirstHit(testCase, k);
    return rank !== null && rank <= k;
  }).length;
  return found / POSITIVE.length;
}

/**
 * Mean reciprocal rank over the positive cases, computed to depth 10. A case
 * with no correct hit in the top 10 contributes 0, which is the standard
 * treatment and keeps the metric sensitive to outright misses.
 */
function meanReciprocalRank(): number {
  const total = POSITIVE.reduce((sum, testCase) => {
    const rank = rankOfFirstHit(testCase, 10);
    return sum + (rank === null ? 0 : 1 / rank);
  }, 0);
  return total / POSITIVE.length;
}

describe("the eval set itself", () => {
  it("references only entry ids that actually exist", () => {
    // Without this, renaming a content field silently turns a case into a
    // permanent miss and the whole eval drifts into meaninglessness.
    const unknown = EVAL_CASES.flatMap((testCase) =>
      testCase.expect.filter((id) => !ENTRY_IDS.has(id)).map((id) => `${testCase.query} → ${id}`),
    );
    expect(unknown, "eval cases naming ids that are not in the index").toEqual([]);
  });

  it("is big enough for the percentages to mean something", () => {
    expect(POSITIVE.length).toBeGreaterThanOrEqual(40);
    expect(NEGATIVE.length).toBeGreaterThanOrEqual(3);
  });
});

/**
 * Every metric, formatted. Attached to each threshold assertion rather than
 * logged: Vitest's default reporter swallows `console.log`, so a printed
 * dashboard is invisible exactly when you need it. This way any threshold
 * failure reports the whole picture, not just the one number that tripped.
 */
function scoreboard(): string {
  return [
    "",
    `  cases     ${POSITIVE.length} positive, ${NEGATIVE.length} must-be-empty`,
    `  recall@1  ${(recallAt(1) * 100).toFixed(1)}%`,
    `  recall@3  ${(recallAt(3) * 100).toFixed(1)}%`,
    `  recall@5  ${(recallAt(5) * 100).toFixed(1)}%`,
    `  MRR@10    ${meanReciprocalRank().toFixed(3)}`,
    "",
  ].join("\n");
}

describe("lexical retrieval quality", () => {
  it("finds a correct passage in the top 3 for most queries", () => {
    expect(recallAt(3), scoreboard()).toBeGreaterThanOrEqual(0.9); // measured 97.7%
  });

  it("finds a correct passage in the top 5 for nearly all queries", () => {
    expect(recallAt(5), scoreboard()).toBeGreaterThanOrEqual(0.95); // measured 100%
  });

  it("puts a correct passage first more often than not", () => {
    expect(recallAt(1), scoreboard()).toBeGreaterThanOrEqual(0.7); // measured 76.7%
  });

  it("ranks correct passages near the top on average", () => {
    expect(meanReciprocalRank(), scoreboard()).toBeGreaterThanOrEqual(0.8); // measured 0.866
  });

  it("returns nothing for questions the site does not answer", () => {
    // The guide's credibility rests on being able to say "no". A retriever that
    // always produces something is worse than one that sometimes declines.
    for (const testCase of NEGATIVE) {
      expect(
        searchIndex(index.entries, testCase.query),
        `"${testCase.query}" should return no results (${testCase.probes})`,
      ).toEqual([]);
    }
  });
});

describe("per-case detail", () => {
  // One test per case, so a failure names the query that broke rather than
  // reporting an aggregate that dropped by 2%.
  for (const testCase of POSITIVE) {
    it(`"${testCase.query}" → top 5 (${testCase.probes})`, () => {
      const rank = rankOfFirstHit(testCase, 5);
      const actual = searchIndex(index.entries, testCase.query, 5).map((hit) => hit.entry.id);
      expect(
        rank,
        `expected one of [${testCase.expect.join(", ")}]\n  got [${actual.join(", ")}]`,
      ).not.toBeNull();
    });
  }
});
