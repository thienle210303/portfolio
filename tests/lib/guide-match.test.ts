import { describe, expect, it } from "vitest";
import {
  blendHits,
  cosineSimilarity,
  queryTerms,
  searchIndex,
  tokenize,
} from "@/lib/guide/match";
import type { GuideEntry, GuideHit } from "@/lib/guide/types";

function entry(overrides: Partial<GuideEntry> & Pick<GuideEntry, "id">): GuideEntry {
  return {
    kind: "content",
    source: "Selected work",
    title: "",
    quote: "",
    keywords: [],
    action: { kind: "goto", sectionId: "work" },
    ...overrides,
  };
}

describe("tokenize", () => {
  it("lowercases and splits on non-alphanumerics", () => {
    expect(tokenize("Playwright / HTTP-API analysis")).toEqual([
      "playwright",
      "http",
      "api",
      "analysis",
    ]);
  });

  it("keeps digits, which carry real meaning in this corpus", () => {
    expect(tokenize("30+ scrapers in 1 week")).toEqual(["30", "scrapers", "in", "1", "week"]);
  });

  /**
   * The single most consequential case in this file. The site writes "Résumé"
   * everywhere and a visitor types "resume"; without diacritic folding the
   * likeliest query on a portfolio returns nothing at all.
   */
  it("folds diacritics so 'resume' matches 'Résumé'", () => {
    expect(tokenize("Résumé")).toEqual(["resume"]);
    expect(tokenize("Damerau–Levenshtein")).toEqual(["damerau", "levenshtein"]);
  });

  it("returns no tokens for punctuation-only or empty input", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("—  ·  …")).toEqual([]);
  });
});

describe("queryTerms", () => {
  it("drops stop words and collapses duplicates", () => {
    expect(queryTerms("what is the the scraper")).toEqual(["scraper"]);
  });

  it("returns nothing when the query is entirely stop words", () => {
    expect(queryTerms("what is the")).toEqual([]);
  });
});

describe("searchIndex", () => {
  const entries: readonly GuideEntry[] = [
    entry({
      id: "scrapers",
      title: "Thirty scrapers in a week",
      quote: "Turning one-off collection scripts into a standardised delivery system.",
      keywords: ["Python", "Playwright"],
    }),
    entry({
      id: "records",
      title: "Two million records, unattended",
      quote: "Research-scale collection that survived months of unsupervised running.",
      keywords: ["Selenium"],
    }),
    entry({
      id: "copy-email",
      kind: "command",
      source: "Contact",
      title: "Copy email address",
      quote: "Copies the address to your clipboard.",
      keywords: ["copy", "email", "contact"],
      action: { kind: "copy-email" },
    }),
  ];

  it("returns nothing for an empty query rather than listing everything", () => {
    // A panel that silently dumps the whole index looks broken.
    expect(searchIndex(entries, "")).toEqual([]);
    expect(searchIndex(entries, "   ")).toEqual([]);
  });

  it("returns nothing when the query is only stop words", () => {
    expect(searchIndex(entries, "what is the")).toEqual([]);
  });

  it("ranks a title match above a quote-only match", () => {
    const hits = searchIndex(entries, "scrapers");
    expect(hits[0]?.entry.id).toBe("scrapers");
  });

  it("matches on keywords that never appear in the visible prose", () => {
    // "Selenium" is a keyword of the records entry and appears in no quote.
    const hits = searchIndex(entries, "selenium");
    expect(hits.map((hit) => hit.entry.id)).toContain("records");
  });

  it("promotes commands when the query reads as an instruction", () => {
    // "email" alone appears in the command's keywords; the imperative "copy"
    // is what should lift it to the top rather than merely include it.
    const hits = searchIndex(entries, "copy email");
    expect(hits[0]?.entry.id).toBe("copy-email");
    expect(hits[0]?.entry.kind).toBe("command");
  });

  it("finds a longer word by prefix", () => {
    const hits = searchIndex(entries, "collect");
    expect(hits.length).toBeGreaterThan(0);
  });

  it("ignores prefixes too short to carry signal", () => {
    expect(searchIndex(entries, "co")).toEqual([]);
  });

  it("honours the result limit", () => {
    expect(searchIndex(entries, "collection", 1)).toHaveLength(1);
  });

  it("is deterministic across repeated identical queries", () => {
    const first = searchIndex(entries, "collection").map((hit) => hit.entry.id);
    const second = searchIndex(entries, "collection").map((hit) => hit.entry.id);
    expect(first).toEqual(second);
  });

  it("scores descending", () => {
    const hits = searchIndex(entries, "scrapers collection");
    const scores = hits.map((hit) => hit.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });
});

describe("cosineSimilarity", () => {
  it("returns 1 for identical unit vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it("accepts typed arrays, which is how the vector cache stores them", () => {
    const a = new Float32Array([0.6, 0.8]);
    const b = new Float32Array([0.6, 0.8]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(1);
  });

  /**
   * A cache holding vectors from a different model must degrade to "no
   * semantic signal", never to NaN — a NaN would propagate through the sort
   * and scramble the entire ranking.
   */
  it("returns 0 on a length mismatch rather than NaN", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0])).toBe(0);
    expect(cosineSimilarity([], [])).toBe(0);
  });
});

describe("blendHits", () => {
  const a = entry({ id: "a", title: "A" });
  const b = entry({ id: "b", title: "B" });

  it("keeps a lexical-only hit when semantic found nothing", () => {
    const blended = blendHits([{ entry: a, score: 1 }], []);
    expect(blended.map((hit) => hit.entry.id)).toEqual(["a"]);
  });

  it("keeps a semantic-only hit when lexical found nothing", () => {
    const blended = blendHits([], [{ entry: b, score: 1 }]);
    expect(blended.map((hit) => hit.entry.id)).toEqual(["b"]);
  });

  it("sums both signals for an entry found by each, ranking it above either alone", () => {
    const lexical: GuideHit[] = [{ entry: a, score: 1 }];
    const semantic: GuideHit[] = [
      { entry: a, score: 1 },
      { entry: b, score: 1 },
    ];
    const blended = blendHits(lexical, semantic);
    expect(blended[0]?.entry.id).toBe("a");
    expect(blended[0]?.score).toBeGreaterThan(blended[1]?.score ?? Infinity);
  });

  it("does not duplicate an entry present in both inputs", () => {
    const blended = blendHits([{ entry: a, score: 1 }], [{ entry: a, score: 1 }]);
    expect(blended).toHaveLength(1);
  });

  it("honours the result limit", () => {
    const blended = blendHits(
      [
        { entry: a, score: 1 },
        { entry: b, score: 0.9 },
      ],
      [],
      1,
    );
    expect(blended).toHaveLength(1);
  });
});
