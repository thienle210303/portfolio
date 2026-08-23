import { describe, expect, it } from "vitest";
import { navItems } from "@/content/portfolio";
import {
  isLastStop,
  startTour,
  stopsFor,
  TOUR_STOPS,
  type TourRoute,
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
  it("begins at the first stop, walking, not yet arrived, on the default route unchosen", () => {
    const run = startTour();
    expect(run.index).toBe(0);
    expect(run.phase).toBe("walking");
    expect(run.arrivedAt).toBe(0);
    expect(run.route).toBe("grey");
    expect(run.routeChosen).toBe(false);
  });
});

describe("isLastStop", () => {
  it("is true only for the final index", () => {
    expect(isLastStop(TOUR_STOPS.length - 1)).toBe(true);
    expect(isLastStop(0)).toBe(TOUR_STOPS.length === 1);
    expect(isLastStop(TOUR_STOPS.length)).toBe(true);
  });
});

describe("stopsFor", () => {
  const ROUTES: TourRoute[] = ["grey", "tabby"];

  it("both routes carry exactly the same eight stops — nothing skipped, nothing invented", () => {
    const bySection = (stops: readonly { sectionId: string }[]) =>
      new Set(stops.map((stop) => stop.sectionId));
    for (const route of ROUTES) {
      const stops = stopsFor(route);
      expect(stops).toHaveLength(TOUR_STOPS.length);
      expect(bySection(stops)).toEqual(bySection(TOUR_STOPS));
    }
  });

  it("agrees on the shared prefix (About, Philosophy) and the shared suffix (Contact)", () => {
    const grey = stopsFor("grey");
    const tabby = stopsFor("tabby");
    expect(grey[0]).toEqual(tabby[0]);
    expect(grey[1]).toEqual(tabby[1]);
    expect(grey[0].sectionId).toBe("about");
    expect(grey[1].sectionId).toBe("philosophy");
    expect(grey.at(-1)).toEqual(tabby.at(-1));
    expect(grey.at(-1)!.sectionId).toBe("contact");
  });

  it("walks the builder's route work outward, and the curious route in reverse", () => {
    const middle = (route: TourRoute) => stopsFor(route).slice(2, -1).map((stop) => stop.sectionId);
    expect(middle("grey")).toEqual(["work", "journey", "skills", "tree", "lab"]);
    expect(middle("tabby")).toEqual(["lab", "tree", "skills", "journey", "work"]);
  });
});
