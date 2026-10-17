import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorldsStage } from "@/sections/Worlds/WorldsStage";
import { buildStops, crossingKm } from "@/lib/origin-stops";

const STOPS = buildStops();

function renderStage() {
  return render(<WorldsStage stops={STOPS} crossingKm={crossingKm()} />);
}

const stopButtons = () => within(screen.getByRole("list")).getAllByRole("button");

describe("WorldsStage, with no canvas at all", () => {
  it("lists the three stops in order, each with its date, place and caption", () => {
    renderStage();
    const buttons = stopButtons();
    expect(buttons).toHaveLength(STOPS.length);
    STOPS.forEach((stop, index) => {
      const button = buttons[index];
      expect(button).toHaveTextContent(stop.when);
      expect(button).toHaveTextContent(stop.place);
      expect(button).toHaveTextContent(stop.caption);
    });
  });

  it("presses no stop until one is chosen, then exactly that one, and names its place", async () => {
    const user = userEvent.setup();
    renderStage();
    for (const button of stopButtons()) expect(button).toHaveAttribute("aria-pressed", "false");
    // The list is the feature: it works before (and without) any globe.
    await user.click(stopButtons()[2]);
    expect(stopButtons().map((button) => button.getAttribute("aria-pressed"))).toEqual(["false", "false", "true"]);
    expect(screen.getByRole("status")).toHaveTextContent(STOPS[2].place);
    await user.click(stopButtons()[0]);
    expect(stopButtons().map((button) => button.getAttribute("aria-pressed"))).toEqual(["true", "false", "false"]);
    expect(screen.getByRole("status")).toHaveTextContent(STOPS[0].place);
  });

  it("renders the heading it is given above the stops", () => {
    render(
      <WorldsStage stops={STOPS} crossingKm={crossingKm()}>
        <h2>One crossing, three stops.</h2>
      </WorldsStage>,
    );
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading.compareDocumentPosition(screen.getByRole("list")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("gives the stage a group with a globe roledescription, not yet focusable", () => {
    renderStage();
    const stage = screen.getByRole("group", { name: /playground earth/i });
    expect(stage).toHaveAttribute("aria-roledescription", "globe");
    // Not "0": there is nothing to drag and the arrow keys are inert until a
    // canvas supplies real GlobeControls.
    expect(stage).toHaveAttribute("tabindex", "-1");
    expect(stage).toHaveAccessibleName(/every stop is also a button beside it/i);
  });

  it("keeps the flight control reachable and clearly disabled, and pressing it claims nothing", async () => {
    const user = userEvent.setup();
    renderStage();
    // jsdom has no IntersectionObserver, so the canvas never loads here — the
    // exact state a visitor on a flaky deploy sees.
    const fly = screen.getByRole("button", { name: /loading the globe/i });
    // `aria-disabled`, never the native `disabled`: a truly disabled button
    // drops out of the tab order, and a control that vanishes and reappears
    // is worse than one that says "not yet".
    expect(fly).toHaveAttribute("aria-disabled", "true");
    expect(fly).not.toHaveAttribute("disabled");
    expect(fly).not.toHaveAttribute("tabindex", "-1");

    // `pointer-events-none` does not stop a keyboard press, so the handler's
    // own guard is what keeps this silent.
    await user.click(fly);
    fly.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("has no chapters, skins, plaques, handoff link or reset button", () => {
    renderStage();
    expect(screen.queryByText(/chapters/i)).toBeNull();
    expect(screen.queryByRole("group", { name: /skins/i })).toBeNull();
    expect(document.body.textContent).not.toMatch(/plaque|needs WebGL|seed/i);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button", { name: /face việt nam/i })).toBeNull();
  });
});
