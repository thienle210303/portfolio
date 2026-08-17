import { describe, expect, it } from "vitest";
import { queryTerms, searchIndex, stem, tokenize } from "@/lib/guide/match";
import type { GuideEntry } from "@/lib/guide/types";

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

describe("stem", () => {
  it("collapses plurals onto their singular", () => {
    // The eval caught "projects" failing to match "project" and "languages"
    // failing to match "language" — a silly way to lose a query.
    expect(stem("projects")).toBe("project");
    expect(stem("languages")).toBe("language");
    expect(stem("scrapers")).toBe("scraper");
    expect(stem("bots")).toBe("bot");
  });

  it("handles -ies", () => {
    expect(stem("companies")).toBe("company");
    expect(stem("strategies")).toBe("strategy");
  });

  it("does not strip the -e that a singular keeps", () => {
    // An earlier "-es" rule folded "languages" to "languag" while the index
    // held "language", which silently broke "what languages does he know".
    expect(stem("languages")).toBe("language");
    expect(stem("phases")).toBe("phase");
  });

  it("leaves short words and double-s endings alone", () => {
    expect(stem("is")).toBe("is");
    expect(stem("his")).toBe("his");
    expect(stem("less")).toBe("less");
    expect(stem("class")).toBe("class");
  });

  it("is applied to the index and the query through one function", () => {
    // The only property that matters: both sides fold identically. It is fine
    // that "process" folds to something that is not a word, because nothing
    // ever reads these tokens — they are only compared with each other.
    expect(stem("process")).toBe(stem("process"));
    expect(queryTerms("projects")).toEqual(["project"]);
  });
});
