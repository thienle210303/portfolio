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

  it("gives the stage a focusable group with a globe roledescription", () => {
    renderStage();
    const stage = screen.getByRole("group", { name: /playground earth/i });
    expect(stage).toHaveAttribute("aria-roledescription", "globe");
    expect(stage).toHaveAttribute("tabindex", "0");
  });

  it("announces the open world in a status region", async () => {
    const user = userEvent.setup();
    renderStage();
    await user.click(screen.getByRole("button", { name: /united states/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/United States/);
  });
});
