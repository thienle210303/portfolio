import { describe, expect, it } from "vitest";
import { navItems } from "@/content/portfolio";
import {
  isLastStop,
  startTour,
  TOUR_STOPS,
} from "@/components/companion/companion-tour";

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
