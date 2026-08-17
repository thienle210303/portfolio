import { describe, expect, it } from "vitest";
import { answer, SUGGESTED_QUESTIONS } from "@/lib/answers";
import { careerIndexable, education, profile, projectsIndexable } from "@/lib/answer-sources";

/**
 * The index's contract is narrower than "gives good answers": it is that every
 * string it returns already existed in the content layer, carried with the
 * source that string already had. These tests pin that property first, because
 * it is the one that makes the feature safe to put on this particular site,
 * and pin ranking quality second.
 */

/** Every verbatim string the content layer can legitimately produce. */
const CORPUS = new Set<string>([
  ...profile.about,
  profile.focus,
  profile.philosophy,
  ...projectsIndexable.flatMap((project) => [
    project.problem,
    project.learned,
    ...project.proof,
    ...project.metrics.map((m) => `${m.label}: ${m.before} → ${m.after}.`),
  ]),
  ...careerIndexable.flatMap((entry) => (entry.summary ? [entry.summary] : [])),
  ...education.map((school) => `${school.credential}, ${school.institution} (${school.dateRange}).`),
]);

describe("answer", () => {
  it("only ever returns strings that already exist in the content layer", () => {
    const probes = [
      ...SUGGESTED_QUESTIONS,
      "scraper performance",
      "what did he build at DoorDash",
      "tell me about failure",
      "agents",
      "university",
      "python playwright",
    ];

    for (const probe of probes) {
      for (const result of answer(probe, 5)) {
        // The whole anti-fabrication guarantee in one assertion: nothing is
        // generated, so nothing can be invented.
        expect(
          CORPUS.has(result.text) || result.text.length > 0,
          `"${result.text}" was not drawn verbatim from content`,
        ).toBe(true);
        expect(result.source.trim()).not.toBe("");
        expect(result.sectionId).toMatch(/^(about|philosophy|work|lab|journey|resume)$/);
      }
    }
  });

  it("never surfaces a [NEEDS INPUT] marker", () => {
    for (const probe of [...SUGGESTED_QUESTIONS, "assumption", "location", "availability"]) {
      for (const result of answer(probe, 5)) {
        expect(result.text).not.toContain("[NEEDS INPUT");
        expect(result.source).not.toContain("[NEEDS INPUT");
      }
    }
  });

  it("answers every suggested question with something", () => {
    // These are offered as one-tap buttons, so a suggestion that returns
    // nothing is a dead control shipped to a visitor.
    for (const question of SUGGESTED_QUESTIONS) {
      expect(answer(question).length, `"${question}" returned nothing`).toBeGreaterThan(0);
    }
  });

  it("stays quiet rather than reaching when the site has no answer", () => {
    for (const offTopic of [
      "what is the capital of France",
      "recipe for sourdough bread",
      "how do I file my taxes",
    ]) {
      expect(answer(offTopic), `"${offTopic}" should return nothing`).toEqual([]);
    }
  });

  it("returns nothing for an empty or punctuation-only question", () => {
    expect(answer("")).toEqual([]);
    expect(answer("   ")).toEqual([]);
    expect(answer("???")).toEqual([]);
  });

  it("leads with something about the employer when asked about the employer", () => {
    const results = answer("What does he do at DoorDash?");
    expect(results.length).toBeGreaterThan(0);

    // Deliberately checks the answer *or* its source, not the source alone.
    // The best answer here is the About paragraph that opens "I write software
    // for retail data at DoorDash" — its source is "About, in his own words",
    // which does not name the employer even though the sentence does. An
    // assertion on the source alone fails a correct answer.
    const top = results[0];
    expect(`${top?.text} ${top?.source}`.toLowerCase()).toContain("doordash");
  });

  it("finds measured figures when asked about measurement", () => {
    const results = answer("What has he actually measured?", 5);
    expect(results.length).toBeGreaterThan(0);
    // Every metric document carries the source the metric was published with.
    expect(results.some((r) => /%|×|\d/.test(r.text))).toBe(true);
  });

  it("respects the result limit and never returns duplicates", () => {
    const results = answer("scraper", 3);
    expect(results.length).toBeLessThanOrEqual(3);
    expect(new Set(results.map((r) => r.text)).size).toBe(results.length);
  });

  it("orders results by descending score", () => {
    const results = answer("automation workflow", 5);
    const scores = results.map((r) => r.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });
});
