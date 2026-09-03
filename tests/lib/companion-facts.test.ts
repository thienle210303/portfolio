import { describe, expect, it } from "vitest";
import { careerEntries, projects, skillCategories } from "@/content/portfolio";
import { experiments } from "@/content/ai-experiments";
import { buildCompanionFacts } from "@/lib/companion-facts";
import { buildCareerTree, totalTechnologies } from "@/lib/knowledge-tree";

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

  it("counts case studies and their sourced metrics", () => {
    expect(facts.work.caseStudies).toBe(projects.length);
    let metrics = 0;
    for (const project of projects) metrics += project.metrics?.length ?? 0;
    expect(facts.work.sourcedMetrics).toBe(metrics);
  });

  it("counts skill categories and distinct skills", () => {
    expect(facts.skills.categories).toBe(skillCategories.length);
    const distinct = new Set(skillCategories.flatMap((category) => category.skills));
    expect(facts.skills.distinctSkills).toBe(distinct.size);
  });

  it("counts tree branches, leaves and technologies from the same builder the tree itself renders from", () => {
    const tree = buildCareerTree();
    expect(facts.tree.branches).toBe(tree.length);
    expect(facts.tree.leaves).toBe(tree.reduce((total, branch) => total + branch.leaves.length, 0));
    expect(facts.tree.technologies).toBe(totalTechnologies());
  });

  it("has one branch per career entry now the tree has inverted (round 12)", () => {
    expect(facts.tree.branches).toBe(facts.tree.entries);
  });

  it("splits the absorbed journey by entry type on the tree fact, and the parts sum to the whole", () => {
    expect(facts.tree.entries).toBe(careerEntries.length);
    expect(facts.tree.work).toBe(careerEntries.filter((e) => e.type === "work").length);
    expect(facts.tree.learning).toBe(careerEntries.filter((e) => e.type === "learning").length);
    expect(facts.tree.milestones).toBe(careerEntries.filter((e) => e.type === "milestone").length);
    expect(facts.tree.work + facts.tree.learning + facts.tree.milestones).toBe(facts.tree.entries);
  });

  it("counts lab experiments and how many are verified", () => {
    expect(facts.lab.experiments).toBe(experiments.length);
    expect(facts.lab.verified).toBe(
      experiments.filter((experiment) => experiment.verification.length > 0).length,
    );
  });

  it("carries the same contact email the Contact section links to", () => {
    expect(facts.contact.email).toMatch(/@/);
  });

  it("is a plain serializable object — no functions, no class instances", () => {
    expect(() => JSON.parse(JSON.stringify(facts))).not.toThrow();
  });
});
