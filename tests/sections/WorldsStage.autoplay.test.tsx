import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import type { GlobeControls } from "@/sections/Worlds/WorldsStage";
import { WorldsStage } from "@/sections/Worlds/WorldsStage";
import { crossingKm, resolveChapters } from "@/lib/worlds";
import { resolveSkins } from "@/lib/skins";
import { REPLAY_HOLD_MS, REPLAY_RETURN_MS } from "@/sections/Worlds/replay";

/*
 * The crossing replays itself while the stage is watched: fly, land, hold,
 * reset, fly again. What is tested here is the stage's half of that: which
 * observer asks, when it asks the globe to fly, reset or settle, and what
 * stops it. The globe's own half (the flight, `settle()` drawing the landed
 * frame, zero frames through a hold) needs a real canvas and is in
 * `e2e/worlds.spec.ts`.
 */

const globe = vi.hoisted(() => ({
  controls: null as null | {
    nudge: ReturnType<typeof vi.fn>;
    fly: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
    focusWorld: ReturnType<typeof vi.fn>;
    settle: ReturnType<typeof vi.fn>;
  },
  land: () => {},
}));

vi.mock("@/sections/Worlds/GlobeCanvas", () => ({
  default: function FakeGlobe({
    onReady,
    onLanded,
  }: {
    onReady: (controls: GlobeControls | null) => void;
    onLanded: () => void;
  }) {
    useEffect(() => {
      globe.land = onLanded;
    });
    useEffect(() => {
      const controls = {
        nudge: vi.fn(),
        fly: vi.fn(),
        reset: vi.fn(),
        focusWorld: vi.fn(),
        settle: vi.fn(),
      };
      globe.controls = controls;
      onReady(controls);
      return () => onReady(null);
    }, [onReady]);
    return null;
  },
}));

class FakeObserver {
  static all: FakeObserver[] = [];
  readonly targets: Element[] = [];
  disconnected = false;
  constructor(
    readonly callback: IntersectionObserverCallback,
    readonly options: IntersectionObserverInit = {},
  ) {
    FakeObserver.all.push(this);
  }
  observe(target: Element) {
    this.targets.push(target);
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  takeRecords() {
    return [];
  }
  /** Report the stage at `ratio` visible. */
  report(ratio: number) {
    const entries = this.targets.map(
      (target) =>
        ({ target, isIntersecting: ratio > 0, intersectionRatio: ratio }) as IntersectionObserverEntry,
    );
    act(() => this.callback(entries, this as unknown as IntersectionObserver));
  }
}

const importObserver = () => FakeObserver.all.find((o) => o.options.threshold === undefined);
const autoplayObserver = () => FakeObserver.all.filter((o) => o.options.threshold === 0.5);

async function stageWithLiveGlobe({ skinsAvailable = false } = {}) {
  const view = render(
    <WorldsStage
      worlds={resolveChapters()}
      skins={resolveSkins()}
      skinsAvailable={skinsAvailable}
      crossingKm={crossingKm()}
    />,
  );
  importObserver()?.report(1);
  // Testing Library's own 1 s default, not vitest's 20 s, governs these two
  // waits; the first pays for the dynamic import, which under full-suite load
  // runs 3-6x slower than alone (see vitest.config.mts).
  await screen.findByRole("button", { name: /take the flight/i }, { timeout: 10_000 });
  // The observer is made in a passive effect, which can run just after the
  // label above has painted.
  await waitFor(
    () =>
      expect(autoplayObserver(), "one autoplay observer, once the controls exist").toHaveLength(1),
    { timeout: 10_000 },
  );
  const observers = autoplayObserver();
  const controls = globe.controls;
  if (!controls) throw new Error("the fake globe never handed its controls up");
  return { observer: observers[0], controls, unmount: view.unmount };
}

/** jsdom has no `matchMedia` (`vitest.setup.ts`); the stage asks it for the
 *  motion preference at the moment it decides, so a test sets the answer. */
const motion = { reduce: false };
function stubMatchMedia() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: motion.reduce && query.includes("prefers-reduced-motion: reduce"),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const flightButton = () => screen.getByRole("button", { name: /take the flight|stop the replay/i });
const stageGroup = () => screen.getByRole("group", { name: /playground earth/i });

/** In view, the first crossing landed: the start of the first hold. Fake
 *  timers from here on, after the dynamic import has resolved on real ones. */
async function holding(options?: { skinsAvailable?: boolean }) {
  const live = await stageWithLiveGlobe(options);
  vi.useFakeTimers();
  live.observer.report(0.6);
  act(() => globe.land());
  return live;
}

type User = ReturnType<typeof userEvent.setup>;

/** user-event under vitest's fake timers. Testing Library waits out a
 *  `setTimeout(0)` after every event and advances it only when it sees a
 *  `jest` global, so without one each press hangs until the test times out.
 *  With the stub in place, a `waitFor` or `findBy*` after this call would
 *  advance the fake clock by its polling interval on every retry, and move
 *  the hold under the test: use neither after it. */
function fakeTimerUser() {
  vi.stubGlobal("jest", { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) });
  return userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
}

describe("WorldsStage, the crossing plays itself", () => {
  beforeEach(() => {
    FakeObserver.all = [];
    globe.controls = null;
    motion.reduce = false;
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    stubMatchMedia();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("once into view starts one cycle, not two", async () => {
    const { observer, controls } = await stageWithLiveGlobe();
    observer.report(0.6);
    observer.report(0.9);
    expect(controls.fly).toHaveBeenCalledTimes(1);
    // Persistent: it keeps watching so it can settle a later exit.
    expect(observer.disconnected).toBe(false);
  });

  it("waits until half the stage is in view", async () => {
    const { observer, controls } = await stageWithLiveGlobe();
    observer.report(0.2);
    expect(controls.fly).not.toHaveBeenCalled();
    observer.report(0.5);
    expect(controls.fly).toHaveBeenCalledTimes(1);
  });

  it("settles the flight when the stage leaves mid-flight", async () => {
    const { observer, controls } = await stageWithLiveGlobe();
    observer.report(1);
    expect(controls.settle).not.toHaveBeenCalled();
    observer.report(0);
    expect(controls.settle).toHaveBeenCalledTimes(1);
  });

  it("asks the globe to settle on every exit, not only one mid-flight", async () => {
    // The robot's walk can start long after the crossing has landed, so the
    // stage asks on every exit and the globe decides what is moving. That a
    // walk asked this way ends lit is `tests/lib/settle.test.ts`'s to prove.
    const { observer, controls } = await stageWithLiveGlobe();
    observer.report(1);
    act(() => globe.land());
    observer.report(0);
    observer.report(1);
    observer.report(0);
    expect(controls.settle).toHaveBeenCalledTimes(2);
  });

  it("marks the landing and shows the link, but an autoplayed landing says nothing", async () => {
    const { observer } = await stageWithLiveGlobe();
    const stage = screen.getByRole("group", { name: /playground earth/i });
    expect(stage).not.toHaveAttribute("data-crossing");
    observer.report(1);
    act(() => globe.land());
    expect(stage).toHaveAttribute("data-crossing", "landed");
    expect(screen.getByRole("link", { name: /career tree/i })).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("draws the flight button without an accent fill (Contact's send is the page's one blue control)", async () => {
    await stageWithLiveGlobe();
    const { className } = screen.getByRole("button", { name: /take the flight/i });
    expect(className).not.toMatch(/(^|\s)bg-\[color:var\(--accent\)\]/);
    expect(className).not.toMatch(/(^|\s)bg-accent(\s|$)/);
  });

  it("does not fly itself after the visitor has had a hand on the globe", async () => {
    // A drag east or ArrowRight flies him part-way before half the stage is in
    // view; the autoplay must not wipe that and fly the whole crossing.
    const user = userEvent.setup();
    const { observer, controls } = await stageWithLiveGlobe();
    const stage = screen.getByRole("group", { name: /playground earth/i });
    await user.pointer({ keys: "[MouseLeft>]", target: stage });
    observer.report(1);
    expect(controls.fly).not.toHaveBeenCalled();
  });

  it("does not fly itself after the visitor has flown him with the keyboard", async () => {
    const user = userEvent.setup();
    const { observer, controls } = await stageWithLiveGlobe();
    screen.getByRole("group", { name: /playground earth/i }).focus();
    await user.keyboard("{ArrowRight}");
    expect(controls.nudge).toHaveBeenCalledTimes(1);
    observer.report(1);
    expect(controls.fly).not.toHaveBeenCalled();
  });

  it("settles a chapter chosen while the stage is out of view, so nothing walks for nobody", async () => {
    // Technology starts the robot's walk. Chosen from the list with the globe
    // off-screen (a phone, where the list sits below it), the walk must end
    // at once rather than run for six seconds nobody sees.
    const user = userEvent.setup();
    const { observer, controls } = await stageWithLiveGlobe();
    observer.report(0);
    controls.settle.mockClear();
    await user.click(screen.getByRole("button", { name: /technology/i }));
    expect(controls.settle).toHaveBeenCalledTimes(1);

    // In view, the walk is there to be watched: no settle.
    observer.report(1);
    controls.settle.mockClear();
    await user.click(screen.getByRole("button", { name: /animals/i }));
    expect(controls.settle).not.toHaveBeenCalled();
  });

  it("does not fly itself after the visitor already has", async () => {
    const user = userEvent.setup();
    const { observer, controls } = await stageWithLiveGlobe();
    await user.click(screen.getByRole("button", { name: /take the flight/i }));
    observer.report(1);
    expect(controls.fly).toHaveBeenCalledTimes(1);
  });

  it("announces the chapter, not the landing, when a chapter is picked mid-flight", async () => {
    const user = userEvent.setup();
    const { controls } = await stageWithLiveGlobe();
    controls.focusWorld.mockImplementation(() => globe.land());
    await user.click(screen.getByRole("button", { name: /take the flight/i }));
    await user.click(screen.getByRole("button", { name: /^02\s*Sea/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/^Sea\. /);
    expect(screen.getByRole("status")).not.toHaveTextContent(/landed/i);
  });

  it("replays while in view: land, hold, reset, fly again, all silent", async () => {
    const { controls } = await holding();
    const stage = stageGroup();
    expect(controls.fly).toHaveBeenCalledTimes(1);
    expect(stage).toHaveAttribute("data-crossing", "landed");
    expect(flightButton()).toHaveAccessibleName("Stop the replay");
    expect(flightButton()).toHaveAttribute("data-replay", "");
    expect(flightButton()).not.toBeDisabled();

    advance(REPLAY_HOLD_MS - 1);
    expect(controls.reset).not.toHaveBeenCalled();
    advance(1);
    expect(controls.reset).toHaveBeenCalledTimes(1);
    expect(stage).not.toHaveAttribute("data-crossing");

    advance(REPLAY_RETURN_MS - 1);
    expect(controls.fly).toHaveBeenCalledTimes(1);
    advance(1);
    expect(controls.fly).toHaveBeenCalledTimes(2);

    act(() => globe.land());
    expect(stage).toHaveAttribute("data-crossing", "landed");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(flightButton()).toHaveAccessibleName("Stop the replay");

    // And the cycle after that.
    advance(REPLAY_HOLD_MS + REPLAY_RETURN_MS);
    expect(controls.reset).toHaveBeenCalledTimes(2);
    expect(controls.fly).toHaveBeenCalledTimes(3);
  });

  it("leaving view clears the pending cycle at once", async () => {
    const { observer, controls } = await holding();
    advance(REPLAY_HOLD_MS / 2);
    observer.report(0);
    expect(controls.settle).toHaveBeenCalledTimes(1);
    advance(20_000);
    expect(controls.reset).not.toHaveBeenCalled();
    expect(controls.fly).toHaveBeenCalledTimes(1);
  });

  it("coming back resumes: a landed globe holds first, one at Việt Nam flies at once", async () => {
    const { observer, controls } = await holding();
    advance(REPLAY_HOLD_MS / 2);
    observer.report(0);
    observer.report(1);
    expect(controls.fly).toHaveBeenCalledTimes(1);
    advance(REPLAY_HOLD_MS - 1);
    expect(controls.reset).not.toHaveBeenCalled();
    advance(1);
    expect(controls.reset).toHaveBeenCalledTimes(1);

    // Now on the way back to Việt Nam.
    advance(REPLAY_RETURN_MS / 2);
    observer.report(0);
    advance(20_000);
    expect(controls.fly).toHaveBeenCalledTimes(1);
    observer.report(1);
    expect(controls.fly).toHaveBeenCalledTimes(2);
  });

  it("a dip below half the stage lands a flight in the air, and coming back holds rather than re-flying", async () => {
    const { observer, controls } = await stageWithLiveGlobe();
    // The real globe's settle lands a flight in the air, quietly.
    controls.settle.mockImplementation(() => globe.land());
    vi.useFakeTimers();
    observer.report(0.6);
    observer.report(0.3);
    expect(controls.settle).toHaveBeenCalledTimes(1);
    expect(stageGroup()).toHaveAttribute("data-crossing", "landed");
    advance(20_000);
    expect(controls.reset).not.toHaveBeenCalled();
    observer.report(0.6);
    expect(controls.fly).toHaveBeenCalledTimes(1);
    advance(REPLAY_HOLD_MS);
    expect(controls.reset).toHaveBeenCalledTimes(1);
  });

  it("less than half the stage in view pauses a hold: no reset, no flight, while mostly scrolled away", async () => {
    const { observer, controls } = await holding();
    advance(REPLAY_HOLD_MS / 2);
    observer.report(0.3);
    expect(controls.settle).toHaveBeenCalledTimes(1);
    advance(20_000);
    expect(controls.reset).not.toHaveBeenCalled();
    expect(controls.fly).toHaveBeenCalledTimes(1);
    // Half back in view: the hold starts again.
    observer.report(0.6);
    advance(REPLAY_HOLD_MS);
    expect(controls.reset).toHaveBeenCalledTimes(1);
  });

  it("a visitor's own motion is settled only on a full exit, not on a dip below half", async () => {
    const user = fakeTimerUser();
    const { observer, controls } = await holding();
    await user.click(screen.getByRole("button", { name: "Stop the replay" }));
    controls.settle.mockClear();
    observer.report(0.3);
    expect(controls.settle).not.toHaveBeenCalled();
    observer.report(0);
    expect(controls.settle).toHaveBeenCalledTimes(1);
  });

  it.each<[string, (user: User) => Promise<void>]>([
    [
      "clicking a chapter",
      async (user) => {
        await user.click(screen.getByRole("button", { name: /^02\s*Sea/i }));
      },
    ],
    [
      "a key on the focused stage",
      async (user) => {
        stageGroup().focus();
        await user.keyboard("{ArrowLeft}");
      },
    ],
    [
      "clicking a skin",
      async (user) => {
        const skin = resolveSkins()[0];
        await user.click(screen.getByRole("button", { name: new RegExp(`^${skin.name}`) }));
      },
    ],
  ])("%s stops it for good", async (_, interact) => {
    const { controls } = await holding({ skinsAvailable: true });
    const user = fakeTimerUser();
    await interact(user);
    expect(flightButton()).toHaveAccessibleName("Take the flight");
    advance(20_000);
    expect(controls.reset).not.toHaveBeenCalled();
    expect(controls.fly).toHaveBeenCalledTimes(1);
    expect(flightButton()).toHaveAccessibleName("Take the flight");
  });

  it.each<[string, (user: User) => Promise<void>]>([
    ["pointer", (user) => user.click(screen.getByRole("button", { name: "Stop the replay" }))],
    [
      "Enter",
      (user) => {
        screen.getByRole("button", { name: "Stop the replay" }).focus();
        return user.keyboard("{Enter}");
      },
    ],
  ])("Stop the replay settles and never flies, by %s", async (_, press) => {
    const { controls } = await holding();
    const user = fakeTimerUser();
    await press(user);
    expect(controls.settle).toHaveBeenCalledTimes(1);
    expect(controls.fly).toHaveBeenCalledTimes(1);
    expect(flightButton()).toHaveAccessibleName("Take the flight");
    advance(20_000);
    expect(controls.reset).not.toHaveBeenCalled();
    expect(controls.fly).toHaveBeenCalledTimes(1);
  });

  it("focus entering the section stops the replay at once, not when the hold ends", async () => {
    const { controls } = await holding();
    act(() => screen.getByRole("link", { name: /career tree/i }).focus());
    expect(flightButton()).toHaveAccessibleName("Take the flight");
    advance(REPLAY_HOLD_MS);
    expect(controls.reset).not.toHaveBeenCalled();
    expect(flightButton()).toHaveAccessibleName("Take the flight");
    advance(20_000);
    expect(controls.fly).toHaveBeenCalledTimes(1);
  });

  it("focus on Stop the replay itself keeps the loop, and the name, until it is pressed", async () => {
    const { controls } = await holding();
    const user = fakeTimerUser();
    const stop = screen.getByRole("button", { name: "Stop the replay" });
    act(() => stop.focus());
    advance(REPLAY_HOLD_MS);
    // The cycle carried on, and the focused button still says what it does.
    expect(controls.reset).toHaveBeenCalledTimes(1);
    expect(stop).toHaveAccessibleName("Stop the replay");
    await user.keyboard("{Enter}");
    expect(controls.settle).toHaveBeenCalledTimes(1);
    expect(flightButton()).toHaveAccessibleName("Take the flight");
    advance(20_000);
    expect(controls.fly).toHaveBeenCalledTimes(1);
  });

  it("never loops under reduced motion", async () => {
    motion.reduce = true;
    const { observer, controls } = await stageWithLiveGlobe();
    vi.useFakeTimers();
    observer.report(0.6);
    expect(controls.fly).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Stop the replay" })).toBeNull();
    act(() => globe.land());
    expect(screen.queryByRole("button", { name: "Stop the replay" })).toBeNull();
    advance(20_000);
    expect(controls.reset).not.toHaveBeenCalled();
    expect(controls.fly).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Stop the replay" })).toBeNull();
  });

  it("a hidden tab re-arms the hold instead of advancing", async () => {
    const { controls } = await holding();
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    advance(REPLAY_HOLD_MS);
    expect(controls.reset).not.toHaveBeenCalled();
    hidden.mockReturnValue(false);
    advance(REPLAY_HOLD_MS);
    expect(controls.reset).toHaveBeenCalledTimes(1);
  });

  it("unmount clears the pending timer", async () => {
    const { controls, unmount } = await holding();
    unmount();
    advance(20_000);
    expect(controls.reset).not.toHaveBeenCalled();
  });

  it("still announces a flight the visitor asked for, after stopping the replay", async () => {
    const { controls } = await holding();
    const user = fakeTimerUser();
    await user.click(screen.getByRole("button", { name: "Stop the replay" }));
    await user.click(screen.getByRole("button", { name: "Take the flight" }));
    expect(controls.fly).toHaveBeenCalledTimes(2);
    act(() => globe.land());
    expect(screen.getByRole("status")).toHaveTextContent(/landed/i);
    expect(flightButton()).toHaveAccessibleName("Take the flight");
  });
});
