import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import CompanionCat, { SIT_SWAY_RATE } from "@/components/companion/CompanionCat";

const swayed = (container: HTMLElement) => container.querySelectorAll("path[class]");

describe("CompanionCat swaying", () => {
  it("hands the plain sit's tail, mask and ink, to the CSS sway, started phase-in", () => {
    const { container } = render(
      <CompanionCat variant="tabby" pose="sit" phase={0.25} blinking={false} swaying />,
    );
    // Tail ink, tail mask, and the tabby's two tail rings.
    expect(swayed(container)).toHaveLength(4);
    const period = 1000 / 60 / SIT_SWAY_RATE.tabby;
    const g = container.querySelector("svg > g") as SVGGElement;
    expect(g.style.getPropertyValue("--sway-period")).toBe(`${period}ms`);
    expect(g.style.getPropertyValue("--sway-delay")).toBe(`${-0.25 * period}ms`);
  });

  it("draws the tail from phase, unswayed, when the loop runs at frame rate", () => {
    const { container } = render(<CompanionCat variant="grey" pose="sit" phase={0.25} blinking={false} />);
    expect(swayed(container)).toHaveLength(0);
  });

  it("leaves every other pose to the drawing", () => {
    for (const pose of ["bat", "groom", "stretch", "walk", "sleep"] as const) {
      const { container } = render(
        <CompanionCat variant="grey" pose={pose} phase={0.25} blinking={false} swaying />,
      );
      expect(swayed(container), pose).toHaveLength(0);
    }
  });
});
