import { describe, expect, it } from "vitest";
import { buildGuideIndex } from "@/lib/guide/buildIndex";
import { searchIndex } from "@/lib/guide/match";
import { navItems, profile, resumeLenses } from "@/content/portfolio";

/**
 * These run against the **real** content index, not a fixture. That is the
 * point: the guide's central promise is that every result it shows is a
 * verbatim passage from this site, so the invariants worth testing are ones
 * about the actual corpus.
 */
const index = buildGuideIndex();

describe("buildGuideIndex", () => {
  it("produces a non-trivial index", () => {
    expect(index.entries.length).toBeGreaterThan(50);
  });

  it("assigns every entry a unique id", () => {
    const ids = index.entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never emits an entry with an empty title or quote", () => {
    // An unsupplied field must be skipped, not rendered as a blank result.
    for (const entry of index.entries) {
      expect(entry.title.trim(), `entry ${entry.id} has an empty title`).not.toBe("");
      expect(entry.quote.trim(), `entry ${entry.id} has an empty quote`).not.toBe("");
    }
  });

  it("never leaks a [NEEDS INPUT] marker into a title, quote or keyword", () => {
    for (const entry of index.entries) {
      const surface = [entry.title, entry.quote, ...entry.keywords].join(" ");
      expect(surface, `entry ${entry.id} leaks a marker`).not.toContain("NEEDS INPUT");
    }
  });

  it("only ever points `goto` at a section id that the nav also uses", () => {
    // A goto whose target does not exist scrolls nowhere and strands focus.
    const navSectionIds = new Set(navItems.map((item) => item.sectionId));
    for (const entry of index.entries) {
      if (entry.action.kind !== "goto") continue;
      expect(navSectionIds, `entry ${entry.id} targets an unknown section`).toContain(
        entry.action.sectionId,
      );
    }
  });

  it("exposes one command per navigable section, one per résumé lens, plus the three tools", () => {
    const commands = index.entries.filter((entry) => entry.kind === "command");
    const kinds = commands.map((command) => command.action.kind);

    expect(kinds.filter((kind) => kind === "goto")).toHaveLength(navItems.length);
    expect(kinds.filter((kind) => kind === "resume-lens")).toHaveLength(resumeLenses.length);
    expect(kinds).toContain("copy-email");
    expect(kinds).toContain("print-resume");
    expect(kinds).toContain("download-resume");
  });

  it("only ever names a résumé lens the section actually offers", () => {
    // The action carries a bare string, so this is what stops a renamed lens
    // from becoming a command that silently does nothing.
    const lensIds = new Set(resumeLenses.map((lens) => lens.id));
    for (const entry of index.entries) {
      if (entry.action.kind !== "resume-lens") continue;
      expect(lensIds, `entry ${entry.id} names an unknown lens`).toContain(entry.action.lensId);
    }
  });

  it("fingerprints the content, and the fingerprint is stable across builds", () => {
    expect(index.revision).toMatch(/^[0-9a-f]{8}$/);
    // Determinism matters: the revision is the IndexedDB cache key for locally
    // computed embedding vectors, so a value that drifted between builds would
    // silently re-encode the corpus on every visit.
    expect(buildGuideIndex().revision).toBe(index.revision);
  });
});

describe("the real index answers the queries it exists to answer", () => {
  /**
   * Each case is a plausible visitor question paired with an entry id that
   * must appear. These are regression tests for the *scoring*, using real
   * prose — a weight change that breaks findability shows up here.
   */
  const cases: ReadonlyArray<{ query: string; expectId: string }> = [
    { query: "scrapers", expectId: "project-dd-scraper-platform-tagline" },
    { query: "resume", expectId: "command-print-resume" },
    { query: "copy email", expectId: "command-copy-email" },
    { query: "print", expectId: "command-print-resume" },
    { query: "mendix", expectId: "skills-platforms" },
    { query: "doordash", expectId: "career-doordash-context" },
  ];

  for (const { query, expectId } of cases) {
    it(`"${query}" finds ${expectId}`, () => {
      const hits = searchIndex(index.entries, query, 8);
      expect(hits.map((hit) => hit.entry.id)).toContain(expectId);
    });
  }

  it("finds the fuzzy-matching work by its algorithm name, accents and all", () => {
    const hits = searchIndex(index.entries, "damerau levenshtein", 8);
    expect(hits.length).toBeGreaterThan(0);
  });

  it("returns nothing for a query the site genuinely has no answer to", () => {
    // Honesty check: the guide must be able to come back empty. If this ever
    // matches, the scoring floor has gone too low to be trustworthy.
    expect(searchIndex(index.entries, "kubernetes helm rustaceans")).toEqual([]);
  });

  it("quotes the profile verbatim rather than a paraphrase", () => {
    const positioning = index.entries.find((entry) => entry.id === "profile-positioning");
    expect(positioning?.quote).toBe(profile.positioning);
  });
});
