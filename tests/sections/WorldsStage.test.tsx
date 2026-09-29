import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorldsStage } from "@/sections/Worlds/WorldsStage";
import { crossingKm, resolveWorlds } from "@/lib/worlds";

const WORLDS = resolveWorlds();

function renderStage() {
  return render(<WorldsStage worlds={WORLDS} crossingKm={crossingKm()} />);
}

/**
 * The world list, scoped. Every query for a world's button goes through this —
 * "Face Việt Nam" is also a button whose name contains "Việt Nam", so an
 * unscoped `getByRole("button", { name: /Việt Nam/ })` matches two elements and
 * throws. The list has an accessible name ("The seven") precisely so this is
 * one line rather than a fragile regex.
 */
function worldButton(name: string) {
  return within(screen.getByRole("list", { name: /the seven/i })).getByRole("button", {
    name: new RegExp(name, "i"),
  });
}

describe("WorldsStage, with no canvas at all", () => {
  it("renders one button per world, numbered and counted", () => {
    renderStage();
    for (const world of WORLDS) {
      expect(worldButton(world.name)).toBeInTheDocument();
    }
    // Every list button names its own plaque count; the two globe controls do not.
    expect(
      within(screen.getByRole("list", { name: /the seven/i })).getAllByRole("button"),
    ).toHaveLength(WORLDS.length);
  });

  it("opens the first world by default and marks it current", () => {
    renderStage();
    expect(worldButton(WORLDS[0].name)).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("heading", { level: 3, name: WORLDS[0].name })).toBeInTheDocument();
  });

  it("switches the panel when another world is pressed", async () => {
    const user = userEvent.setup();
    renderStage();
    const usa = WORLDS.find((world) => world.id === "usa");
    if (!usa) throw new Error("the United States world is missing from the content layer");

    await user.click(worldButton(usa.name));

    expect(screen.getByRole("heading", { level: 3, name: usa.name })).toBeInTheDocument();
    for (const plaque of usa.plaques) {
      expect(screen.getByText(plaque.text)).toBeInTheDocument();
    }
  });

  it("shows every plaque's source line, so nothing reads as the site's own claim", async () => {
    const user = userEvent.setup();
    renderStage();
    for (const world of WORLDS) {
      await user.click(worldButton(world.name));
      for (const plaque of world.plaques) {
        expect(screen.getByText(plaque.text)).toBeInTheDocument();
        expect(screen.getByText(new RegExp(plaque.source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))).toBeInTheDocument();
      }
    }
  });

  it("says out loud that a decoration carries no fact", async () => {
    const user = userEvent.setup();
    renderStage();
    const vietnam = WORLDS.find((world) => world.id === "vietnam");
    if (!vietnam || vietnam.decorations.length === 0) {
      throw new Error("the Việt Nam world lost its one authored object");
    }
    await user.click(worldButton(vietnam.name));
    for (const decoration of vietnam.decorations) {
      expect(screen.getByLabelText(decoration.label)).toBeInTheDocument();
    }
  });

  it("gives the stage a group with a globe roledescription, not yet focusable", () => {
    renderStage();
    const stage = screen.getByRole("group", { name: /playground earth/i });
    expect(stage).toHaveAttribute("aria-roledescription", "globe");
    // Not "0": there is nothing to drag and the arrow keys are inert until a
    // canvas supplies real GlobeControls, so a keyboard user should not tab
    // into an empty box a screen reader announces as a globe. The task that
    // creates that canvas is the one that flips this to "0", once
    // `controlsReady` can actually become true.
    expect(stage).toHaveAttribute("tabindex", "-1");
  });

  it("keeps the two globe controls reachable and clearly disabled, not vanished", () => {
    renderStage();
    const fly = screen.getByRole("button", { name: /loading the globe/i });
    const reset = screen.getByRole("button", { name: /face việt nam/i });
    for (const control of [fly, reset]) {
      // `aria-disabled`, never the native `disabled` attribute: a truly
      // `disabled` button drops out of the tab order, and the whole point of
      // this pattern (see WorldsStage.tsx's own comment on it) is that a
      // control which vanishes and reappears is worse than one that says
      // "not yet" — which only works if it stays reachable while it says it.
      expect(control).toHaveAttribute("aria-disabled", "true");
      expect(control).not.toHaveAttribute("disabled");
      expect(control).not.toHaveAttribute("tabindex", "-1");
    }
  });

  it("announces the open world in a status region", async () => {
    const user = userEvent.setup();
    renderStage();
    await user.click(screen.getByRole("button", { name: /united states/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/United States/);
  });

  it("does not claim a seed was dropped before anything has flown", () => {
    renderStage();
    // The handoff link is a claim about something that happened. Before the
    // flight it must not be on the page at all — the section's whole argument
    // is that it only says things that are currently true.
    expect(screen.queryByRole("link", { name: /career tree/i })).not.toBeInTheDocument();
  });

  it("keeps the flight control present but disabled, and pressing it claims nothing", async () => {
    const user = userEvent.setup();
    renderStage();
    // jsdom has no IntersectionObserver, so the canvas never loads here — which
    // makes this the exact state a visitor on a flaky deploy sees. The control
    // says "not yet" rather than vanishing, and it is not pressable.
    const fly = screen.getByRole("button", { name: /loading the globe/i });
    expect(fly).toHaveAttribute("aria-disabled", "true");

    // The half that is this task's: a press with no globe behind it must
    // produce no landing, no link and no announcement. jsdom does not apply
    // the `pointer-events-none` that actually stops the press in a browser, so
    // the handler really does run here — which is exactly the path worth
    // covering, because it is the one a missing canvas leaves exposed.
    await user.click(fly);

    expect(screen.queryByRole("link", { name: /career tree/i })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  // The presence half — the link appearing once a seed is genuinely on the
  // globe — is in `e2e/worlds.spec.ts`, not here. It needs a real canvas, and
  // a test that mounted a fake one to check a link would be testing the fake.
});
