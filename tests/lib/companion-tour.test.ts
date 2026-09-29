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
  it("is true only for the final index of the given total", () => {
    expect(isLastStop(TOUR_STOPS.length - 1, TOUR_STOPS.length)).toBe(true);
    expect(isLastStop(0, TOUR_STOPS.length)).toBe(TOUR_STOPS.length === 1);
    expect(isLastStop(TOUR_STOPS.length, TOUR_STOPS.length)).toBe(true);
  });

  it("measures against the total it is given, not a fixed count — a shorter list ends sooner", () => {
    // This is the property a caller that kept comparing against
    // `TOUR_STOPS.length` instead of `stopsFor(route).length` would get
    // wrong: a `GREY_MIDDLE` typo drops a stop, `stopsFor` returns a
    // shorter array, and "last stop" has to mean the end of *that* array.
    expect(isLastStop(3, 4)).toBe(true);
    expect(isLastStop(2, 4)).toBe(false);
  });
});

describe("stopsFor", () => {
  const ROUTES: TourRoute[] = ["grey", "tabby"];

  it("both routes carry exactly the same stops — nothing skipped, nothing invented", () => {
    const bySection = (stops: readonly { sectionId: string }[]) =>
      new Set(stops.map((stop) => stop.sectionId));
    for (const route of ROUTES) {
      const stops = stopsFor(route);
      expect(stops).toHaveLength(TOUR_STOPS.length);
      expect(bySection(stops)).toEqual(bySection(TOUR_STOPS));
    }
  });

  it("agrees on the shared first stop (About) and the shared last stop (Contact)", () => {
    // Round 16: Work moved into the derived middle (see stopsFor's own
    // comment) so a sixth section could join without a second hard-coded
    // prefix stop — it is no longer a stop both routes share in the same
    // position. Only the very first and very last stops stay fixed.
    const grey = stopsFor("grey");
    const tabby = stopsFor("tabby");
    expect(grey[0]).toEqual(tabby[0]);
    expect(grey[0].sectionId).toBe("about");
    expect(grey.at(-1)).toEqual(tabby.at(-1));
    expect(grey.at(-1)!.sectionId).toBe("contact");
  });

  it("walks the builder's route work outward, and the curious route in reverse", () => {
    const middle = (route: TourRoute) => stopsFor(route).slice(1, -1).map((stop) => stop.sectionId);
    expect(middle("grey")).toEqual(["worlds", "work", "skills", "tree"]);
    expect(middle("tabby")).toEqual(["tree", "skills", "work", "worlds"]);
  });

  it("visits every nav section, in an order that includes the new ones", () => {
    const grey = stopsFor("grey").map((stop) => stop.sectionId);
    expect(grey).toEqual(navItems.map((item) => item.sectionId));
  });

  it("never yields an undefined stop for either route", () => {
    for (const route of ["grey", "tabby"] as const) {
      for (const stop of stopsFor(route)) {
        expect(stop).toBeDefined();
        expect(stop.sectionId).toBeTruthy();
      }
    }
  });
});
