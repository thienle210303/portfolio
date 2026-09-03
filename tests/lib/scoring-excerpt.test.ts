import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCORING_EXCERPT,
  SCORING_MATH,
} from "@/sections/Hero/scoring-excerpt";

/**
 * The "How this answers" panel shows a hand-copied excerpt of the ranking loop
 * and tells the visitor it is "the actual mechanism, not a retelling of one".
 * Nothing in the build keeps the copy honest — the excerpt is a string, and the
 * engine it quotes is free to change without it.
 *
 * That is the whole reason this file exists. A claim about how the site works
 * is a fact like any other on this page, and the site's rule is that facts come
 * from one place. Here the one place is `src/lib/answers.ts`, so these tests
 * fail the moment the quote stops being true — which is cheaper than a visitor
 * reading a scoring rule the code abandoned two commits ago.
 */

const ANSWERS_SOURCE = readFileSync(
  join(process.cwd(), "src/lib/answers.ts"),
  "utf8",
);

/** Lines of the excerpt that claim to be verbatim source — i.e. everything
 *  except the two comment lines, one of which marks an elision. */
const quotedLines = SCORING_EXCERPT.split("\n")
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith("//"));

describe("the scoring excerpt quotes the real engine", () => {
  it.each(quotedLines)("`%s` still appears in src/lib/answers.ts", (line) => {
    // Compared trimmed and whitespace-normalised: the excerpt is re-indented
    // for display in a narrow panel, and indentation is the one thing it is
    // allowed to change.
    const normalised = line.replace(/\s+/g, " ");
    const haystack = ANSWERS_SOURCE.split("\n")
      .map((sourceLine) => sourceLine.trim().replace(/\s+/g, " "));
    expect(haystack).toContain(normalised);
  });

  it("states the same minimum score the engine enforces", () => {
    const declared = /const MIN_SCORE = ([\d.]+);/.exec(ANSWERS_SOURCE)?.[1];
    expect(declared, "MIN_SCORE should still be a literal in answers.ts").toBeDefined();
    // The notation spells the threshold out rather than naming the constant,
    // so the number itself has to keep matching.
    expect(SCORING_MATH).toContain(`≥ ${declared}`);
  });

  it("states the same label weight the engine applies", () => {
    // 0.6 appears in both the excerpt and the notation; if the engine reweights
    // title matches, all three have to move together.
    expect(SCORING_EXCERPT).toContain("weight * 0.6");
    expect(SCORING_MATH).toContain("0.6");
    expect(ANSWERS_SOURCE).toContain("weight * 0.6");
  });
});
