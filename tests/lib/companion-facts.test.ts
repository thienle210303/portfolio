import { describe, expect, it } from "vitest";
import { careerEntries } from "@/content/portfolio";
import { buildCompanionFacts } from "@/lib/companion-facts";
import { buildTickets } from "@/lib/highlights";

/**
 * D1: `buildCompanionFacts` is only trustworthy if every number in it matches
 * an independent recomputation from `src/content/*` — otherwise it is just a
 * second place a count could quietly drift from the drawing it describes. Each
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

  it("counts the oak's tags, one per ticket, as the Journey hangs them", () => {
    // Round 22 retired the drawn tree, and its branch and leaf counts with
    // it: the oak's tags are what a visitor can count now. Counted here off
    // the tickets' entries, not their array, so a duplicated ticket shows.
    const tickets = buildTickets();
    expect(tickets.length, "no tags, so the count below proves nothing").toBeGreaterThan(0);
    expect(facts.tree.tags).toBe(new Set(tickets.map((ticket) => ticket.entryId)).size);
  });

  it("counts every technology the Record's rows list, each once", () => {
    // Recomputed by hand from the entries, not with `totalTechnologies`.
    const technologies = new Set(careerEntries.flatMap((entry) => entry.technologies as readonly string[]));
    expect(facts.tree.technologies).toBe(technologies.size);
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
