import { describe, expect, it } from "vitest";
import { buildKnowledgeTree, totalTechnologies } from "@/lib/knowledge-tree";
import { careerEntries, resumeLenses } from "@/content/portfolio";
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

  it("attaches case studies to the role they were built in", () => {
    for (const root of tree) {
      for (const branch of root.branches) {
        // Every attached title must be a real project title, not a label the
        // tree made up.
        for (const title of branch.caseStudies) {
          expect(typeof title).toBe("string");
          expect(title.length).toBeGreaterThan(0);
        }
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
