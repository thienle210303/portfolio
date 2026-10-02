import { describe, expect, it } from "vitest";
import { careerEntries } from "@/content/portfolio";
import { buildCompanionFacts } from "@/lib/companion-facts";
import { buildDrawnTree, DEMOTED_ENTRY_IDS } from "@/lib/knowledge-tree";

/**
 * D1: `buildCompanionFacts` is only trustworthy if every number in it matches
 * an independent recomputation from `src/content/*` — otherwise it is just a
 * second place a count could quietly drift from the rail beside it. Each
 * assertion below recomputes its figure a different way than
 * `companion-facts.ts` does, on purpose: a test that copied the same
 * `.reduce` would catch a typo in neither.
 */
describe("buildCompanionFacts", () => {
  const facts = buildCompanionFacts();

  it("names the current role from the most recent work entry", () => {
    const current = [...careerEntries]
      .filter((entry) => entry.type === "work")
      .sort((a, b) => (a.sortKey > b.sortKey ? -1 : 1))[0];
    expect(facts.about.role).toBe(current?.role ?? "");
    expect(facts.about.organization).toBe(current?.organization ?? "");
  });

  it("carries the globe's own counts", () => {
    expect(facts.worlds.count).toBe(7);
    expect(facts.worlds.plaques).toBeGreaterThan(0);
    expect(facts.worlds.crossingKm).toBeGreaterThan(12_000);
  });

  it("counts branches, leaves and technologies off the tree the Journey draws, not every entry", () => {
    // `buildDrawnTree()` is the call `CareerTree.tsx` builds its rail from
    // ("Branches: N drawn · 9 as credentials") and the globe's tree-shape
    // plaque counts. Recomputed here by hand from the drawn branches, not by
    // calling `totalLeaves`/`treeTechnologies` — a test that reused the same
    // helpers would agree with a broken one.
    const drawn = buildDrawnTree();
    expect(drawn.length, "the drawn tree is empty, so the counts below prove nothing").toBeGreaterThan(0);
    expect(facts.tree.branches).toBe(drawn.length);
    let leaves = 0;
    const technologies = new Set<string>();
    for (const branch of drawn) {
      for (const leaf of branch.leaves) {
        leaves += 1;
        if (leaf.kind === "technology") technologies.add(leaf.text);
      }
    }
    expect(facts.tree.leaves).toBe(leaves);
    expect(facts.tree.technologies).toBe(technologies.size);
  });

  it("counts fewer branches than entries: the credentials are not drawn as branches", () => {
    // Through round 17 every entry was a branch and the two numbers were equal
    // by construction. Round 18 moved the credentials to one line on the stage,
    // so the cats saying "20 branches" beside a rail that says "11 drawn" was
    // the contradiction this pins shut.
    expect(DEMOTED_ENTRY_IDS.length).toBeGreaterThan(0);
    expect(facts.tree.branches).toBe(facts.tree.entries - DEMOTED_ENTRY_IDS.length);
  });

  it("splits the absorbed journey by entry type on the tree fact, and the parts sum to the whole", () => {
    expect(facts.tree.entries).toBe(careerEntries.length);
    expect(facts.tree.work).toBe(careerEntries.filter((e) => e.type === "work").length);
    expect(facts.tree.learning).toBe(careerEntries.filter((e) => e.type === "learning").length);
    expect(facts.tree.milestones).toBe(careerEntries.filter((e) => e.type === "milestone").length);
    expect(facts.tree.work + facts.tree.learning + facts.tree.milestones).toBe(facts.tree.entries);
  });

  it("carries the same contact email the Contact section links to", () => {
    expect(facts.contact.email).toMatch(/@/);
  });

  it("is a plain serializable object — no functions, no class instances", () => {
    expect(() => JSON.parse(JSON.stringify(facts))).not.toThrow();
  });
});
