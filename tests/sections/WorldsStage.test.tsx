import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorldsStage } from "@/sections/Worlds/WorldsStage";
import { crossingKm, resolveChapters } from "@/lib/worlds";
import { resolveSkins } from "@/lib/skins";

const WORLDS = resolveChapters();
const SKINS = resolveSkins();

function renderStage() {
  return render(<WorldsStage worlds={WORLDS} skins={SKINS} crossingKm={crossingKm()} />);
}

/**
 * The world list, scoped. Every query for a world's button goes through this —
 * "Face Việt Nam" is also a button whose name contains "Việt Nam", so an
 * unscoped `getByRole("button", { name: /Việt Nam/ })` matches two elements and
 * throws. The list has an accessible name ("Chapters") precisely so this is
 * one line rather than a fragile regex.
 */
function worldButton(name: string) {
  return within(screen.getByRole("list", { name: /chapters/i })).getByRole("button", {
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
      within(screen.getByRole("list", { name: /chapters/i })).getAllByRole("button"),
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
    const sea = WORLDS.find((world) => world.id === "sea");
    if (!sea) throw new Error("the Sea chapter is missing from the content layer");

    await user.click(worldButton(sea.name));

    expect(screen.getByRole("heading", { level: 3, name: sea.name })).toBeInTheDocument();
    for (const plaque of sea.plaques) {
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
    const livingEarth = WORLDS.find((world) => world.id === "living-earth");
    if (!livingEarth || livingEarth.decorations.length === 0) {
      throw new Error("the Living Earth chapter lost its one authored object");
    }
    await user.click(worldButton(livingEarth.name));
    for (const decoration of livingEarth.decorations) {
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
    // The list it points at is called "Chapters", so the name says chapter.
    expect(stage).toHaveAccessibleName(/every chapter is also a button in the list/i);
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
    await user.click(worldButton("Sea"));
    expect(screen.getByRole("status")).toHaveTextContent(/Sea/);
  });

  it("does not claim a seed was dropped before anything has flown", () => {
    renderStage();
    // The handoff link is a claim about something that happened. Before the
    // flight it must not be on the page at all — the section's whole argument
    // is that it only says things that are currently true.
    expect(screen.queryByRole("link", { name: /career tree/i })).not.toBeInTheDocument();
  });

  it("keeps both globe controls present but disabled, and pressing either claims nothing", async () => {
    const user = userEvent.setup();
    renderStage();
    // jsdom has no IntersectionObserver, so the canvas never loads here — which
    // makes this the exact state a visitor on a flaky deploy sees. Both
    // controls say "not yet" rather than vanishing.
    const fly = screen.getByRole("button", { name: /loading the globe/i });
    const reset = screen.getByRole("button", { name: /face việt nam/i });
    expect(fly).toHaveAttribute("aria-disabled", "true");
    expect(reset).toHaveAttribute("aria-disabled", "true");

    // The half that is this task's: a press with no globe behind it must
    // produce no landing, no link and no announcement.
    //
    // `pointer-events-none` is *not* what makes that true, in jsdom or in a
    // browser. It suppresses pointer hit-testing only, and neither control
    // carries the native `disabled` attribute (see the test above — they have
    // to stay in the tab order), so Enter or Space on a focused one fires a
    // real `click` on a real page. The handler running here is therefore the
    // production keyboard path, not a jsdom artefact, and the guard at the
    // top of each handler is the only thing standing in it.
    await user.click(fly);
    expect(screen.queryByRole("link", { name: /career tree/i })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    // The reset is the one that could speak a whole false sentence: its
    // announcement claims a flight and a seed were cleared, and before the
    // canvas loads there has never been either. Pressed by keyboard, which is
    // the path that reaches it.
    reset.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    await user.keyboard(" ");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    await user.click(reset);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.queryByRole("link", { name: /career tree/i })).not.toBeInTheDocument();
  });

  // The presence half — the link appearing once a seed is genuinely on the
  // globe — is in `e2e/worlds.spec.ts`, not here. It needs a real canvas, and
  // a test that mounted a fake one to check a link would be testing the fake.
});

describe("WorldsStage, the skins group", () => {
  function skinsGroup() {
    return screen.getByRole("group", { name: /skins/i });
  }

  it("is a separate labelled group, not part of the chapters list", () => {
    renderStage();
    const list = screen.getByRole("list", { name: /chapters/i });
    expect(within(list).queryByRole("button", { name: /ice age/i })).toBeNull();
    expect(skinsGroup().textContent).toMatch(/look/i);
    expect(within(skinsGroup()).getAllByRole("button")).toHaveLength(SKINS.length);
  });

  it("renders nothing for skins when none are passed", () => {
    render(<WorldsStage worlds={WORLDS} skins={[]} crossingKm={crossingKm()} />);
    expect(screen.queryByRole("group", { name: /skins/i })).toBeNull();
  });

  it("is aria-disabled, says it needs WebGL, and never presses while no GL surface exists", async () => {
    const user = userEvent.setup();
    renderStage();
    for (const button of within(skinsGroup()).getAllByRole("button")) {
      expect(button).toHaveAttribute("aria-disabled", "true");
      expect(button).toHaveAccessibleName(/needs webgl/i);
      expect(button).toHaveAttribute("aria-pressed", "false");
      await user.click(button);
      expect(button).toHaveAttribute("aria-pressed", "false");
    }
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("carries the no-fact label in every skin's accessible name", () => {
    renderStage();
    for (const skin of SKINS) {
      const button = within(skinsGroup()).getByRole("button", { name: new RegExp(skin.name, "i") });
      expect(button.getAttribute("aria-label")).toContain(skin.label);
    }
  });

  it("is at least 44px tall", () => {
    renderStage();
    for (const button of within(skinsGroup()).getAllByRole("button")) {
      expect(button.className).toMatch(/min-h-11/);
    }
  });

  describe("once a GL surface exists", () => {
    function renderAvailable() {
      return render(<WorldsStage worlds={WORLDS} skins={SKINS} skinsAvailable crossingKm={crossingKm()} />);
    }

    it("drops aria-disabled and the WebGL wording", () => {
      renderAvailable();
      for (const button of within(skinsGroup()).getAllByRole("button")) {
        expect(button).not.toHaveAttribute("aria-disabled", "true");
        expect(button).not.toHaveAccessibleName(/needs webgl/i);
      }
    });

    it("presses at most one at a time, and pressing it again clears it", async () => {
      const user = userEvent.setup();
      renderAvailable();
      const [first, second] = within(skinsGroup()).getAllByRole("button");
      await user.click(first);
      expect(first).toHaveAttribute("aria-pressed", "true");
      await user.click(second);
      expect(first).toHaveAttribute("aria-pressed", "false");
      expect(second).toHaveAttribute("aria-pressed", "true");
      await user.click(second);
      for (const button of within(skinsGroup()).getAllByRole("button")) {
        expect(button).toHaveAttribute("aria-pressed", "false");
      }
    });

    it("leaves the chapter selector alone", async () => {
      const user = userEvent.setup();
      renderAvailable();
      await user.click(within(skinsGroup()).getAllByRole("button")[0]);
      expect(worldButton(WORLDS[0].name)).toHaveAttribute("aria-current", "true");
    });
  });
});

describe("WorldsStage, the robot's two laps", () => {
  const TECH = WORLDS.find((world) => world.id === "tech");
  if (!TECH) throw new Error("the Technology chapter is missing from the content layer");

  const laps = () => screen.queryByRole("group", { name: /robot/i });

  it("names both laps in the Technology panel, each as a drawing that carries no fact", async () => {
    const user = userEvent.setup();
    renderStage();
    await user.click(worldButton(TECH.name));
    expect(TECH.decorations).toHaveLength(2);
    for (const decoration of TECH.decorations) {
      expect(screen.getByLabelText(decoration.label)).toBeInTheDocument();
    }
  });

  it("is a still pair of states behind a toggle under reduced motion, ending lit by default", async () => {
    // jsdom applies no stylesheet, so the toggle is in the tree here whatever
    // the preference; which preference shows it is the class's job, below.
    const user = userEvent.setup();
    renderStage();
    await user.click(worldButton(TECH.name));
    const group = laps();
    if (!group) throw new Error("no toggle for the robot's laps under reduced motion");
    const unsupervised = within(group).getByRole("button", { name: "Unsupervised" });
    const human = within(group).getByRole("button", { name: "Human in the loop" });
    expect(within(group).getAllByRole("button")).toHaveLength(2);
    expect(human).toHaveAttribute("aria-pressed", "true");
    expect(unsupervised).toHaveAttribute("aria-pressed", "false");

    await user.click(unsupervised);
    expect(unsupervised).toHaveAttribute("aria-pressed", "true");
    expect(human).toHaveAttribute("aria-pressed", "false");
    // Pressing the shown state again keeps it shown: one of the two is always on.
    await user.click(unsupervised);
    expect(unsupervised).toHaveAttribute("aria-pressed", "true");
    await user.click(human);
    expect(human).toHaveAttribute("aria-pressed", "true");
    expect(unsupervised).toHaveAttribute("aria-pressed", "false");

    for (const button of [unsupervised, human]) {
      expect(button.tagName).toBe("BUTTON");
      expect(button.className).toMatch(/min-h-11/);
    }
  });

  it("is shown only under reduced motion, by CSS, and not at all outside Technology", async () => {
    // `hidden` unless `prefers-reduced-motion: reduce`, which is what keeps it
    // out of the way of the walk. That the browser honours this is
    // `e2e/worlds.spec.ts`'s to prove, both ways.
    const user = userEvent.setup();
    renderStage();
    expect(laps()).toBeNull();
    await user.click(worldButton(TECH.name));
    const group = laps();
    if (!group) throw new Error("no toggle for the robot's laps in Technology");
    expect(group.className.split(/\s+/)).toEqual(expect.arrayContaining(["hidden", "motion-reduce:flex"]));
    expect(group.className.split(/\s+/)).not.toContain("flex");
  });
});
