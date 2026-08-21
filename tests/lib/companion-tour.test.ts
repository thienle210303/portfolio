import { describe, expect, it } from "vitest";
import { navItems } from "@/content/portfolio";
import {
  isLastStop,
  startTour,
  TOUR_STOPS,
  tourLine,
} from "@/components/companion/companion-tour";
import type { CompanionFacts } from "@/lib/companion-facts";

const FACTS: CompanionFacts = {
  about: { role: "Staff Engineer", organization: "Acme" },
  philosophy: { principles: 7 },
  work: { caseStudies: 5, sourcedMetrics: 13 },
  journey: { entries: 21, work: 9, learning: 8, milestones: 4 },
  skills: { categories: 6, distinctSkills: 33 },
  tree: { branches: 4, leaves: 25, technologies: 17 },
  lab: { experiments: 11, verified: 6 },
  contact: { email: "hi@example.com" },
};

describe("TOUR_STOPS", () => {
  it("is exactly navItems, in order — the tour can neither skip a section nor invent one", () => {
    expect(TOUR_STOPS.length).toBe(navItems.length);
    TOUR_STOPS.forEach((stop, index) => {
      expect(stop.sectionId).toBe(navItems[index].sectionId);
      expect(stop.label).toBe(navItems[index].label);
    });
  });

  it("has at least one stop, so isLastStop and startTour always have somewhere to point", () => {
    expect(TOUR_STOPS.length).toBeGreaterThan(0);
  });
});

describe("startTour", () => {
  it("begins at the first stop, walking, not yet arrived", () => {
    const run = startTour();
    expect(run.index).toBe(0);
    expect(run.phase).toBe("walking");
    expect(run.arrivedAt).toBe(0);
  });
});

describe("isLastStop", () => {
  it("is true only for the final index", () => {
    expect(isLastStop(TOUR_STOPS.length - 1)).toBe(true);
    expect(isLastStop(0)).toBe(TOUR_STOPS.length === 1);
    expect(isLastStop(TOUR_STOPS.length)).toBe(true);
  });
});

describe("tourLine", () => {
  it("has a non-empty line for every real stop", () => {
    for (const stop of TOUR_STOPS) {
      expect(tourLine(stop.sectionId, FACTS).length).toBeGreaterThan(0);
    }
  });

  it("returns an empty string for an id with no stop", () => {
    expect(tourLine("not-a-section", FACTS)).toBe("");
  });

  it("quotes each stop's own computed figure from CompanionFacts, never a typed number", () => {
    expect(tourLine("philosophy", FACTS)).toContain(String(FACTS.philosophy.principles));
    expect(tourLine("work", FACTS)).toContain(String(FACTS.work.caseStudies));
    expect(tourLine("work", FACTS)).toContain(String(FACTS.work.sourcedMetrics));
    expect(tourLine("journey", FACTS)).toContain(String(FACTS.journey.entries));
    expect(tourLine("journey", FACTS)).toContain(String(FACTS.journey.work));
    expect(tourLine("skills", FACTS)).toContain(String(FACTS.skills.categories));
    expect(tourLine("skills", FACTS)).toContain(String(FACTS.skills.distinctSkills));
    expect(tourLine("tree", FACTS)).toContain(String(FACTS.tree.branches));
    expect(tourLine("tree", FACTS)).toContain(String(FACTS.tree.leaves));
    expect(tourLine("tree", FACTS)).toContain(String(FACTS.tree.technologies));
    expect(tourLine("lab", FACTS)).toContain(String(FACTS.lab.experiments));
    expect(tourLine("lab", FACTS)).toContain(String(FACTS.lab.verified));
  });

  it("names the current role and organization at the first stop", () => {
    expect(tourLine("about", FACTS)).toContain(FACTS.about.role);
    expect(tourLine("about", FACTS)).toContain(FACTS.about.organization);
  });
});
