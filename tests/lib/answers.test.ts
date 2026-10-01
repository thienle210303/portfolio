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
  profile.positioning,
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
]);

/** Sections an answer may link into. `resume` is deliberately absent: the résumé
 *  is its own route now, so `#resume` would be a dead anchor. `workshop` was
 *  here from round 16 until round 18 removed the section — a document pointing
 *  at a section id the page does not have is exactly the dead fragment the
 *  second case below exists to catch. */
const LINKABLE_SECTIONS = /^(about|worlds|work|journey|skills)$/;

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
      // Round 16 replaced "how do I file my taxes" here. It is now pinned as a
      // known hole in its own case below — see "the `file` hole" — rather than
      // only deleted, so that an engine change which closes it and one which
      // widens it do not look identical to this suite.
      //
      // These two are not equal in strength, and a reader should not think
      // they are:
      //
      //  - "how do I renew my passport" is a **zero-signal control**. Neither
      //    "renew" nor "passport" is in the vocabulary at all, so it refuses
      //    for the same trivial reason "capital of France" does. It is here to
      //    keep a plain out-of-domain case in the set, not to test anything
      //    subtle.
      //  - "who won the world cup" is the **load-bearing** probe, and the
      //    strongest refusal case in this file. Three of its four terms are
      //    genuine index terms ("who" is a deliberate non-stop-word aliased
      //    onto About; "won" is in an award line; "world" is on the globe), so
      //    vocabulary alone does not save it. It refuses only because
      //    `requiredMatches` demands two matches in one document at four
      //    terms, and no document holds two of them. Loosen that gate and this
      //    is the probe that goes red first.
      "how do I renew my passport",
      "who won the world cup",
      // These two were pinned below as a shipped hole until
      // `workflowStages[].watchFor` left the indexed surface — see that case
      // for the measurement. Be honest about their strength now: dropping
      // those ten strings removed "file" from the vocabulary altogether, so
      // these refuse for the same trivial reason "passport" does rather than
      // by out-reasoning the gate. They are here to catch the surface coming
      // back, and the mechanism assertion that actually pins it is below.
      "how do I file my taxes",
      "how do I file a bug",
    ]) {
      expect(answer(offTopic), `"${offTopic}" should return nothing`).toEqual([]);
    }
  });

  /**
   * The engine half of a hole round 16 shipped and round 17 closed. The
   * agent stages' `watchFor` strings, which carried the hole, were deleted in
   * round 18 along with the Workshop; the account below is kept because the
   * gate boundary it describes is still true of the engine.
   *
   * ## The hole this replaced
   *
   * Round 16 indexed `workflowStages[].watchFor`, and it shipped a precision
   * defect: three of the ten failure modes mention source *files* and were the
   * only documents in the whole corpus holding that word, so "file" carried a
   * near-maximal IDF (3.82, against a ~4.9 ceiling for a single-document
   * term). English stop words then eat four of the six words in "how do I file
   * my taxes" ("how", "do", "i", "my"), leaving two terms — and at two terms
   * `requiredMatches` admits a document on one match. One incidental "files"
   * cleared the bar alone, so the site answered a tax question with three
   * sentences about source files.
   *
   * ## Why the surface moved and the engine did not
   *
   * Both arms were measured against `answers-retrieval.test.ts`, not argued.
   *
   *  - **Gate harder** (`requiredMatches` demanding two matches at two terms):
   *    closes it, and costs recall@1 76.7% → 70.0%, recall@3 93.3% → 83.3%,
   *    recall@5 96.7% → 83.3%, MRR 0.851 → 0.761, plus the "How does he
   *    approach a problem?" suggestion chip. Real two-term questions genuinely
   *    match on one term ("what awards has he won" → ["award","won"], "where
   *    did he go to school" → ["go","school"]), so the cost is structural, not
   *    a tuning accident.
   *  - **Drop these ten strings from the surface**: closes it with the eval
   *    **byte-identical to baseline** on all four thresholds.
   *
   * So the engine is tuned and this content was the part not paying for its
   * precision cost. The precedent is in `answer-corpus.ts` already — `source`
   * is excluded from the surface for the same class of reason.
   *
   * ## What did not close, and is not this case's job
   *
   * The *instance*, not the *class*. `requiredMatches` still admits on one
   * match out of two terms, so any future corpus term that is rare here and
   * common in English can do this again. "can I get the project files" still
   * returns three lines — now on "project", at 1.45 — which is a defensible
   * answer rather than a wrong one, and is why it is not in the refusal list
   * above. If that gate is ever reopened, the numbers above are what a change
   * has to beat.
   */
  it("still refuses a two-term question that matches one incidental term", () => {
    // The gate boundary the old pin asserted last. Round 18 deleted the ten
    // strings this case used to fence off the indexed surface (the agent
    // lane that rendered them went with the Workshop), so what is left is the
    // one assertion that is about the engine rather than the corpus.
    expect(answer("my tax return files")).toEqual([]);
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
