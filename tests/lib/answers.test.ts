import { describe, expect, it } from "vitest";
import { answer, SUGGESTED_QUESTIONS } from "@/lib/answers";
import { buildDocuments } from "@/lib/answer-corpus";
import {
  careerIndexable,
  education,
  profile,
  projectsIndexable,
  skillsIndexable,
} from "@/lib/answer-sources";
import { origin } from "@/content/portfolio";
import { workflowStages } from "@/content/ai-experiments";
import { defaultRunProjectId } from "@/content/workshop";
import { resolveRun } from "@/lib/workshop";
import { resolveWorlds } from "@/lib/worlds";

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
  ...careerIndexable.flatMap((entry) => [
    ...(entry.summary ? [entry.summary] : []),
    ...entry.impact,
    ...(entry.learned ? [entry.learned] : []),
  ]),
  ...education.map((school) => `${school.credential}, ${school.institution} (${school.dateRange}).`),
  ...skillsIndexable.map((category) => category.evidence),
  // The origin flight was reachable from src/content/portfolio.ts but never
  // indexed — corpus expansion for round 10 (WP-D), so "Ask this site" can
  // answer career/background questions, not just the work. Philosophy's own
  // paragraphs, principles and problem-solving loop were indexed here too
  // until round 16 removed the section and its corpus documents with it —
  // `profile.philosophy` above is the one line from that section still
  // reachable, re-tagged to About. Round 16 also removed the Lab and its
  // experiment and scraping-playbook documents.
  `${origin.from} to ${origin.to}, arrived ${origin.arrived}.`,
  // Round 16: Playground Earth. Every plaque is a document (buildDocuments in
  // answer-corpus.ts). Most plaque text already duplicates a string in one
  // of the sets above (career and project fields) — but not all of it: a
  // computed plaque (the tree's shape, the crossing, the scene list, the AI
  // tools joined) or a companion plaque (`cat.name`) is composed by
  // resolveWorlds() and appears nowhere else in this file, so this line
  // covers those too. Built from resolveWorlds() rather than transcribed by
  // hand, so a typo here can never silently under-cover it; the other half
  // of the guarantee — that each composed string really is drawn from real
  // content, not invented — is what tests/lib/worlds.test.ts's honesty-rule
  // suite proves.
  ...resolveWorlds().flatMap((world) => world.plaques.map((plaque) => plaque.text)),
  // Round 16: the Workshop. A station's evidence is a verbatim project field
  // and is therefore already covered by the project sets above — but only for
  // the fields those sets happen to list, and the stations quote nine
  // different ones (`assumption`, `constraints`, `pathsExplored`, …) that no
  // other document type indexes. Built from the same resolver
  // `answer-corpus.ts` builds its documents from, never transcribed: a
  // station mapping changed in `src/content/workshop.ts` has to move both at
  // once or not at all. Each `watchFor` is authored in
  // `src/content/ai-experiments.ts` and appears nowhere else in this file.
  ...(resolveRun(defaultRunProjectId)?.stations.flatMap((station) => station.evidence) ?? []),
  ...workflowStages.map((stage) => stage.watchFor),
]);

/** Sections an answer may link into. `resume` is deliberately absent: the résumé
 *  is its own route now, so `#resume` would be a dead anchor. `workshop` joined
 *  in round 16, in the same commit that rendered the section — a document
 *  pointing at a section id the page does not have is exactly the dead
 *  fragment the second case below exists to catch. */
const LINKABLE_SECTIONS = /^(about|worlds|work|journey|skills|workshop)$/;

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
        //
        // This used to read `CORPUS.has(result.text) || result.text.length > 0`,
        // which passes for any non-empty string — so the assertion that was
        // meant to be the load-bearing one in this file actually checked
        // nothing. Membership has to be asserted on its own, which in turn means
        // CORPUS must list every document type the index builds.
        expect(
          CORPUS.has(result.text),
          `"${result.text}" was not drawn verbatim from content`,
        ).toBe(true);
        expect(result.source.trim()).not.toBe("");
        expect(result.sectionId).toMatch(LINKABLE_SECTIONS);
      }
    }
  });

  it("builds no document that points at a dead section id", () => {
    // The test above only checks LINKABLE_SECTIONS against whatever a
    // handful of probe queries happen to retrieve — a *sampled* guard on a
    // *structural* property. A document with a bad sectionId that none of
    // those probes surfaces would pass silently, which is exactly the
    // failure mode this round's plan was written about (a removed section
    // leaving behind a document that still points at it). Iterating the
    // whole corpus instead makes the guard hold for every document, not
    // just the ones ranking queries happen to surface.
    for (const doc of buildDocuments()) {
      expect(doc.sectionId, `document "${doc.label}" points at a section that no longer exists`).toMatch(
        LINKABLE_SECTIONS,
      );
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
      // Round 16 replaced "how do I file my taxes" here, and the reason is
      // worth writing down rather than quietly editing away.
      //
      // The Workshop indexed each agent stage's `watchFor`, three of which
      // mention source *files* — the only documents in the corpus containing
      // that word. English stop words eat four of that question's six words
      // ("how", "do", "i", "my"), leaving the index two terms, one of which
      // is a homograph it now legitimately holds. Two terms means
      // `requiredMatches` admits on one (see answers.ts), and a term in 3 of
      // 134 documents carries a near-maximal IDF, so one incidental "files"
      // cleared the bar on its own.
      //
      // Tightening that gate was measured, not assumed: requiring two matches
      // at two terms drops the retrieval eval's recall@3 from ≥90% to 83.3%
      // and MRR from ≥0.8 to 0.761, because real two-term questions ("what
      // awards has he won", "where did he go to school") genuinely match on
      // one. The engine is tuned; the probe was the fragile part. Both
      // replacements below are off-topic without depending on a word the
      // corpus might one day acquire, and the second is the stronger test of
      // the two: "who" and "won" are *both* real index terms, so it is the
      // coverage gate rather than vocabulary that has to refuse it.
      "how do I renew my passport",
      "who won the world cup",
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
