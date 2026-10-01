import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import CareerTree from "@/sections/CareerTree/CareerTree";
import { DEMOTED_ENTRY_IDS } from "@/lib/knowledge-tree";
import { caseStudyAnchorId } from "@/sections/CareerTree/anchors";
import { careerEntries, projects } from "@/content/portfolio";
import { resolveWorlds } from "@/lib/worlds";

/**
 * The section as a whole, rendered once. Anything that is true of "the Journey"
 * and not of a single component lives here: that no case study went missing
 * when nine entries stopped being branches, and that rendering the same case
 * study in two presentations did not put an id in the document twice.
 */
describe("the Journey section", () => {
  it("still answers #journey", () => {
    render(<CareerTree />);
    expect(document.getElementById("journey")).not.toBeNull();
  });

  it("renders every case study somewhere, whether or not its entry is a branch", () => {
    render(<CareerTree />);
    for (const project of projects) {
      expect(document.getElementById(caseStudyAnchorId(project.id)), project.id).not.toBeNull();
    }
  });

  it("puts the projects of demoted entries under the stage, not inside a branch", () => {
    render(<CareerTree />);
    const homeless = projects.filter((project) =>
      (DEMOTED_ENTRY_IDS as readonly string[]).includes(project.careerEntryId),
    );
    // Not vacuous: the degree and the capstone really do own projects.
    expect(homeless.length).toBeGreaterThan(0);
    const extras = document.querySelector("[data-unbranched-case-studies]");
    if (!(extras instanceof HTMLElement)) throw new Error("no unbranched case studies rendered");
    for (const project of homeless) {
      expect(extras.querySelector(`#${caseStudyAnchorId(project.id)}`), project.id).not.toBeNull();
    }
  });

  it("never writes an id into the document twice", () => {
    // The drawing and the list each hold the branches' case studies, and only
    // one of them is ever displayed; without a scope on the second copy every
    // `id`, `aria-controls` and `aria-labelledby` here would exist twice and
    // point at whichever came first.
    render(<CareerTree />);
    const seen = new Map<string, number>();
    for (const element of document.querySelectorAll("[id]")) {
      seen.set(element.id, (seen.get(element.id) ?? 0) + 1);
    }
    const duplicated = [...seen].filter(([, count]) => count > 1).map(([id]) => id);
    expect(duplicated).toEqual([]);
  });

  it("says in the rail how many entries became credentials", () => {
    render(<CareerTree />);
    expect(document.body.textContent).toContain(
      `${careerEntries.length - DEMOTED_ENTRY_IDS.length} drawn · ${DEMOTED_ENTRY_IDS.length} as credentials`,
    );
  });

  it("draws the same number of branches the globe's tree-shape plaque says it does", () => {
    // Two places on one page state how many branches there are: the rail beside
    // the drawing and a plaque on the globe. They once disagreed (20 against 11)
    // because only one of them knew nine entries had become credentials.
    render(<CareerTree />);
    const plaque = resolveWorlds()
      .flatMap((world) => world.plaques)
      .find((candidate) => /\d+ branches ·/.test(candidate.text));
    if (!plaque) throw new Error("no tree-shape plaque on the globe");
    const claimed = Number(/(\d+) branches ·/.exec(plaque.text)?.[1]);
    expect(claimed).toBe(document.querySelectorAll("[data-tree-branch][data-branch-act]").length);
    expect(document.body.textContent).toContain(`${claimed} drawn · `);
  });
});
