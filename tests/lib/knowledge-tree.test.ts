import { describe, expect, it } from "vitest";
import {
  buildKnowledgeTree,
  careerYearSpan,
  techSlug,
  totalTechnologies,
} from "@/lib/knowledge-tree";
import { careerEntries, projects, resumeLenses } from "@/content/portfolio";
import type { CareerEntry } from "@/types/portfolio";

// Widened for the same reason knowledge-tree.ts widens it — see the note there.
const ENTRIES: readonly CareerEntry[] = careerEntries;

/**
 * The tree's contract is that every edge it draws was authored by a human in
 * the content layer. These tests exist to keep it that way: the temptation to
 * "improve coverage" by fuzzy-matching skill names against technology strings
 * would invent relationships nobody stated, and this file is what fails when
 * someone tries.
 */
describe("buildKnowledgeTree", () => {
  const tree = buildKnowledgeTree();

  it("draws only branches the content layer actually tags", () => {
    for (const root of tree) {
      for (const branch of root.branches) {
        const entry = ENTRIES.find((candidate) => candidate.id === branch.id);
        expect(entry, `branch ${branch.id} has no career entry`).toBeDefined();
        expect(
          entry?.lenses.includes(root.id),
          `${branch.id} appears under "${root.id}" but is not tagged with it`,
        ).toBe(true);
      }
    }
  });

  it("draws only leaves the branch itself lists", () => {
    for (const root of tree) {
      for (const branch of root.branches) {
        const entry = ENTRIES.find((candidate) => candidate.id === branch.id);
        for (const leaf of branch.leaves) {
          expect(
            entry?.technologies.includes(leaf.name),
            `"${leaf.name}" is drawn under ${branch.id} but that entry does not list it`,
          ).toBe(true);
        }
      }
    }
  });

  it("never renders an empty root", () => {
    for (const root of tree) {
      expect(root.branches.length, `"${root.label}" has no branches`).toBeGreaterThan(0);
    }
  });

  it("covers every lens that has anything tagged to it", () => {
    const tagged = resumeLenses.filter((lens) =>
      ENTRIES.some((entry) => entry.lenses.includes(lens.id)),
    );
    expect(tree.map((root) => root.id).sort()).toEqual(tagged.map((lens) => lens.id).sort());
  });

  it("orders branches newest first, like the timeline", () => {
    for (const root of tree) {
      const keys = root.branches.map(
        (branch) => ENTRIES.find((entry) => entry.id === branch.id)?.sortKey ?? "",
      );
      expect([...keys].sort().reverse()).toEqual(keys);
    }
  });

  it("counts a technology's other homes without counting its own", () => {
    for (const root of tree) {
      for (const branch of root.branches) {
        for (const leaf of branch.leaves) {
          const homes = ENTRIES.filter((entry) =>
            entry.technologies.includes(leaf.name),
          ).length;
          expect(leaf.alsoUsedIn).toBe(homes - 1);
          expect(leaf.alsoUsedIn).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("de-duplicates technologies within a branch", () => {
    for (const root of tree) {
      for (const branch of root.branches) {
        const names = branch.leaves.map((leaf) => leaf.name);
        expect(new Set(names).size).toBe(names.length);
      }
    }
  });

  it("attaches case studies to the role they were built in, completely and correctly", () => {
    for (const root of tree) {
      for (const branch of root.branches) {
        const expected = projects.filter((project) => project.careerEntryId === branch.id);

        // Same set, not just "some real titles": a branch must carry every
        // case study built in that role, and no others.
        expect(branch.caseStudies.map((cs) => cs.id).sort()).toEqual(
          expected.map((project) => project.id).sort(),
        );

        for (const caseStudy of branch.caseStudies) {
          const project = expected.find((p) => p.id === caseStudy.id);
          expect(project, `case study id "${caseStudy.id}" resolves to a real project`).toBeDefined();
          expect(caseStudy.title).toBe(project?.title);
        }
      }
    }
  });

  it("reports each branch's startYear honestly against its dateRange", () => {
    for (const root of tree) {
      for (const branch of root.branches) {
        const entry = ENTRIES.find((candidate) => candidate.id === branch.id);
        expect(entry).toBeDefined();
        // startYear is read off sortKey, not scraped from dateRange prose —
        // but the two must still agree: sortKey is YYYY-MM[-x] and dateRange
        // always names that same year somewhere in its opening date ("October
        // 2025 — Present", "2024 — 2025", "May 2025").
        expect(branch.startYear).toBe(Number(entry?.sortKey.slice(0, 4)));
        expect(branch.dateRange.includes(String(branch.startYear))).toBe(true);
      }
    }
  });

  it("orders each root's branches by non-increasing startYear", () => {
    // A stronger form of "orders branches newest first": years must never
    // decrease down a bough, which is the invariant the year-marker rendering
    // (one mark per change) actually depends on.
    for (const root of tree) {
      const years = root.branches.map((branch) => branch.startYear);
      for (let i = 1; i < years.length; i += 1) {
        expect(years[i]).toBeLessThanOrEqual(years[i - 1]);
      }
    }
  });

  it("reports a technology total that matches the content layer", () => {
    const expected = new Set(ENTRIES.flatMap((entry) => entry.technologies)).size;
    expect(totalTechnologies()).toBe(expected);
  });

  it("is worth rendering at all", () => {
    // Guards against a refactor that quietly empties it.
    expect(tree.length).toBeGreaterThanOrEqual(3);
    expect(tree.some((root) => root.branches.length >= 3)).toBe(true);
    expect(totalTechnologies()).toBeGreaterThan(10);
  });
});

describe("careerYearSpan", () => {
  it("spans exactly the lens-tagged entries' years, inclusively", () => {
    const tagged = ENTRIES.filter((entry) => entry.lenses.length > 0);
    const years = tagged.map((entry) => Number(entry.sortKey.slice(0, 4)));
    const expectedFirst = Math.min(...years);
    const expectedLast = Math.max(...years);

    const span = careerYearSpan();
    expect(span.firstYear).toBe(expectedFirst);
    expect(span.lastYear).toBe(expectedLast);
    // Inclusive: the first year itself counts as one year, not zero.
    expect(span.years).toBe(expectedLast - expectedFirst + 1);
    expect(span.years).toBeGreaterThan(0);
  });
});

describe("techSlug", () => {
  it("is lower-case, alphanumeric-and-hyphen only, with no leading or trailing hyphen", () => {
    const names = new Set(ENTRIES.flatMap((entry) => entry.technologies));
    for (const name of names) {
      const slug = techSlug(name);
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("is unique across every technology actually listed in the content layer", () => {
    const names = [...new Set(ENTRIES.flatMap((entry) => entry.technologies))];
    const slugs = names.map(techSlug);
    expect(new Set(slugs).size).toBe(names.length);
  });

  it("is stable for the same input", () => {
    expect(techSlug("JavaScript/React")).toBe(techSlug("JavaScript/React"));
  });
});
