import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import type { GlobeControls } from "@/sections/Worlds/WorldsStage";
import { WorldsStage } from "@/sections/Worlds/WorldsStage";
import { buildStops } from "@/lib/origin-stops";

/*
 * The crossing plays itself once, the first time half the stage is in view:
 * fly, land, rest. What is tested here is the stage's half of that: which
 * observer asks, when it asks the globe to fly or settle, and what ends it.
 * The globe's own half (the flight, `settle()` drawing the landed frame, zero
 * frames at rest) needs a real canvas and is in `e2e/worlds.spec.ts`.
 */

const globe = vi.hoisted(() => ({
  controls: null as null | {
    nudge: ReturnType<typeof vi.fn>;
    fly: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
    focusStop: ReturnType<typeof vi.fn>;
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
        focusStop: vi.fn(),
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

const STOPS = buildStops();

async function stageWithLiveGlobe() {
  const view = render(<WorldsStage stops={STOPS} />);
  importObserver()?.report(1);
  // Testing Library's own 1 s default, not vitest's 20 s, governs these two
  // waits; the first pays for the dynamic import, which under full-suite load
  // runs 3-6x slower than alone (see vitest.config.mts).
  await screen.findByRole("button", { name: /replay the flight/i }, { timeout: 10_000 });
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
const flightButton = () => screen.getByRole("button", { name: /replay the flight|stop the replay/i });
const stageGroup = () => screen.getByRole("group", { name: /playground earth/i });
const stopButton = (index: number) => within(screen.getByRole("list")).getAllByRole("button")[index];
/** Inside the section, and neither focusable nor clickable. */
const plainText = () => screen.getByText(/drag east/i);

/** In view, the autoplay's flight in the air and not yet landed. */
async function inFlight() {
  const live = await stageWithLiveGlobe();
  // Fake timers from here on, after the dynamic import has resolved on real ones.
  vi.useFakeTimers();
  live.observer.report(0.6);
  return live;
}

type User = ReturnType<typeof userEvent.setup>;

/** user-event under vitest's fake timers. Testing Library waits out a
 *  `setTimeout(0)` after every event and advances it only when it sees a
 *  `jest` global, so without one each press hangs until the test times out.
 *  With the stub in place, a `waitFor` or `findBy*` after this call would
 *  advance the fake clock by its polling interval on every retry, and move
 *  the clock under the test: use neither after it. */
function fakeTimerUser() {
  vi.stubGlobal("jest", { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) });
  return userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
}

describe("WorldsStage, the crossing plays itself once", () => {
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

  it("marks the landing, but an autoplayed landing says nothing", async () => {
    const { observer } = await stageWithLiveGlobe();
    const stage = screen.getByRole("group", { name: /playground earth/i });
    expect(stage).not.toHaveAttribute("data-crossing");
    observer.report(1);
    act(() => globe.land());
    expect(stage).toHaveAttribute("data-crossing", "landed");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("draws the flight button without an accent fill (Contact's send is the page's one blue control)", async () => {
    await stageWithLiveGlobe();
    const { className } = screen.getByRole("button", { name: /replay the flight/i });
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

  it("turns the globe to a chosen stop, and settles the turn when the stage is out of view", async () => {
    // Chosen from the list with the globe off-screen (a phone, where the list
    // sits below it), the turn must end at once rather than run for nobody.
    const user = userEvent.setup();
    const { observer, controls } = await stageWithLiveGlobe();
    observer.report(0);
    controls.settle.mockClear();
    await user.click(stopButton(2));
    expect(controls.focusStop).toHaveBeenLastCalledWith(STOPS[2].id);
    expect(controls.settle).toHaveBeenCalledTimes(1);

    // In view, the turn is there to be watched: no settle.
    observer.report(1);
    controls.settle.mockClear();
    await user.click(stopButton(1));
    expect(controls.focusStop).toHaveBeenLastCalledWith(STOPS[1].id);
    expect(controls.settle).not.toHaveBeenCalled();
  });

  it("a stop chosen during the visitor's own flight is announced, not the landing it causes", async () => {
    const { controls } = await inFlight();
    act(() => globe.land());
    const user = fakeTimerUser();
    await user.click(screen.getByRole("button", { name: "Replay the flight" }));
    // The real globe lands an in-air flight inside `focusStop`.
    controls.focusStop.mockImplementation(() => globe.land());
    await user.click(stopButton(2));
    expect(stageGroup()).toHaveAttribute("data-crossing", "landed");
    expect(screen.getByRole("status")).toHaveTextContent(STOPS[2].place);
    expect(screen.getByRole("status")).not.toHaveTextContent(/landed/i);
    expect(stopButton(2)).toHaveAttribute("aria-pressed", "true");
  });

  it("a replay lets go of the chosen stop", async () => {
    const { controls } = await inFlight();
    act(() => globe.land());
    const user = fakeTimerUser();
    await user.click(stopButton(0));
    expect(stopButton(0)).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Replay the flight" }));
    expect(controls.fly).toHaveBeenCalledTimes(2);
    expect(stopButton(0)).toHaveAttribute("aria-pressed", "false");
  });

  it("does not fly itself after the visitor already has", async () => {
    const user = userEvent.setup();
    const { observer, controls } = await stageWithLiveGlobe();
    await user.click(screen.getByRole("button", { name: /replay the flight/i }));
    observer.report(1);
    expect(controls.fly).toHaveBeenCalledTimes(1);
  });

  it("plays once: flies, lands silently, then stays put however long it is watched", async () => {
    const { observer, controls } = await inFlight();
    const stage = stageGroup();
    expect(controls.fly).toHaveBeenCalledTimes(1);
    expect(flightButton()).toHaveAccessibleName("Stop the replay");
    expect(flightButton()).toHaveAttribute("data-replay", "");
    expect(flightButton()).not.toBeDisabled();

    act(() => globe.land());
    expect(stage).toHaveAttribute("data-crossing", "landed");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(flightButton()).toHaveAccessibleName("Replay the flight");

    // No timer is left to reset the camera or fly again, and coming back
    // into view does not start it over.
    advance(60_000);
    observer.report(0);
    observer.report(1);
    advance(60_000);
    expect(controls.reset).not.toHaveBeenCalled();
    expect(controls.fly).toHaveBeenCalledTimes(1);
    expect(stage).toHaveAttribute("data-crossing", "landed");
  });

  it("the flight button replays it on request, once, and announces the landing", async () => {
    const { controls } = await inFlight();
    act(() => globe.land());
    const user = fakeTimerUser();
    await user.click(screen.getByRole("button", { name: "Replay the flight" }));
    expect(controls.fly).toHaveBeenCalledTimes(2);
    expect(flightButton()).toHaveAccessibleName("Replay the flight");
    act(() => globe.land());
    expect(screen.getByRole("status")).toHaveTextContent(/landed/i);
    advance(60_000);
    expect(controls.reset).not.toHaveBeenCalled();
    expect(controls.fly).toHaveBeenCalledTimes(2);
  });

  it("leaving view mid-flight lands it, and coming back does not fly again", async () => {
    const { observer, controls } = await stageWithLiveGlobe();
    // The real globe's settle lands a flight in the air, quietly.
    controls.settle.mockImplementation(() => globe.land());
    observer.report(0.6);
    observer.report(0);
    expect(controls.settle).toHaveBeenCalledTimes(1);
    expect(stageGroup()).toHaveAttribute("data-crossing", "landed");
    expect(flightButton()).toHaveAccessibleName("Replay the flight");
    observer.report(0.6);
    expect(controls.fly).toHaveBeenCalledTimes(1);
  });

  it("a dip below half that is still intersecting leaves the flight alone", async () => {
    const { observer, controls } = await inFlight();
    observer.report(0.3);
    expect(controls.settle).not.toHaveBeenCalled();
    expect(flightButton()).toHaveAccessibleName("Stop the replay");
  });

  it("a visitor's own motion is settled when the observer reports no intersection, not on a still-intersecting dip below half", async () => {
    // Spec-shaped report: a third in view is still intersecting. Chromium,
    // with this observer's single 0.5 threshold, reports that dip as not
    // intersecting (measured) and settles there too; the stage follows
    // whichever the browser says, and this pins the spec engines' half.
    const user = fakeTimerUser();
    const { observer, controls } = await inFlight();
    await user.click(screen.getByRole("button", { name: "Stop the replay" }));
    controls.settle.mockClear();
    observer.report(0.3);
    expect(controls.settle).not.toHaveBeenCalled();
    observer.report(0);
    expect(controls.settle).toHaveBeenCalledTimes(1);
  });

  it.each<[string, (user: User) => Promise<void>]>([
    [
      "clicking a stop",
      async (user) => {
        await user.click(stopButton(1));
      },
    ],
    [
      "a key on the focused stage",
      async (user) => {
        stageGroup().focus();
        await user.keyboard("{ArrowLeft}");
      },
    ],
  ])("%s stops it for good", async (_, interact) => {
    const { controls } = await inFlight();
    const user = fakeTimerUser();
    await interact(user);
    expect(flightButton()).toHaveAccessibleName("Replay the flight");
    act(() => globe.land());
    advance(60_000);
    expect(controls.fly).toHaveBeenCalledTimes(1);
    expect(flightButton()).toHaveAccessibleName("Replay the flight");
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
    const { controls } = await inFlight();
    const user = fakeTimerUser();
    await press(user);
    expect(controls.settle).toHaveBeenCalledTimes(1);
    expect(controls.fly).toHaveBeenCalledTimes(1);
    expect(flightButton()).toHaveAccessibleName("Replay the flight");
    advance(60_000);
    expect(controls.reset).not.toHaveBeenCalled();
    expect(controls.fly).toHaveBeenCalledTimes(1);
  });

  it("focus entering the section stops the autoplay at once", async () => {
    const { controls } = await inFlight();
    act(() => stopButton(1).focus());
    expect(flightButton()).toHaveAccessibleName("Replay the flight");
    act(() => globe.land());
    advance(60_000);
    expect(controls.fly).toHaveBeenCalledTimes(1);
  });

  it("focus on Stop the replay itself keeps the name until it is pressed", async () => {
    const { controls } = await inFlight();
    const user = fakeTimerUser();
    const stop = screen.getByRole("button", { name: "Stop the replay" });
    act(() => stop.focus());
    expect(stop).toHaveAccessibleName("Stop the replay");
    await user.keyboard("{Enter}");
    expect(controls.settle).toHaveBeenCalledTimes(1);
    expect(flightButton()).toHaveAccessibleName("Replay the flight");
  });

  /** A pointer gesture in the section, as the browser reports it: a press,
   *  then either a release at (x + dx, y) or the browser taking the gesture
   *  over for a page scroll. `plainText()` is inside the section and is
   *  neither focusable nor clickable, so nothing but the pointer events can
   *  stop the replay here. */
  function gesture(target: Element, end: "pointerup" | "pointercancel", dx = 0) {
    act(() => {
      fireEvent.pointerDown(target, { pointerId: 1, clientX: 100, clientY: 100 });
      if (end === "pointerup") fireEvent.pointerUp(target, { pointerId: 1, clientX: 100 + dx, clientY: 100 });
      else fireEvent.pointerCancel(target, { pointerId: 1, clientX: 100, clientY: 140 });
    });
  }

  it("a press the browser hands to the page scroll (pointercancel) does not stop the autoplay", async () => {
    await inFlight();
    gesture(plainText(), "pointercancel");
    expect(flightButton()).toHaveAccessibleName("Stop the replay");
  });

  it("a touch scroll that starts on the stage mid-flight leaves the autoplayed landing silent", async () => {
    await inFlight();
    gesture(stageGroup(), "pointercancel");
    expect(flightButton()).toHaveAccessibleName("Stop the replay");
    act(() => globe.land());
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("a tap (press and release without moving) stops it for good", async () => {
    const { controls } = await inFlight();
    gesture(plainText(), "pointerup");
    expect(flightButton()).toHaveAccessibleName("Replay the flight");
    act(() => globe.land());
    advance(60_000);
    expect(controls.fly).toHaveBeenCalledTimes(1);
  });

  it("a press that travels off the globe and is released elsewhere is not a tap", async () => {
    await inFlight();
    gesture(plainText(), "pointerup", 40);
    expect(flightButton()).toHaveAccessibleName("Stop the replay");
  });

  it("a drag of the globe stops it for good", async () => {
    await inFlight();
    const stage = stageGroup();
    act(() => {
      fireEvent.pointerDown(stage, { pointerId: 1, clientX: 100, clientY: 100 });
    });
    act(() => {
      fireEvent.pointerUp(stage, { pointerId: 1, clientX: 180, clientY: 100 });
    });
    expect(flightButton()).toHaveAccessibleName("Replay the flight");
  });

  it("a press released outside the section does not leave a press set", async () => {
    await inFlight();
    // A mouse press in the section, a text selection that overshoots it, and
    // the release somewhere else on the page.
    act(() => {
      fireEvent.pointerDown(plainText(), { pointerId: 1, clientX: 100, clientY: 100 });
      fireEvent.pointerUp(document.body, { pointerId: 1, clientX: 100, clientY: 400 });
    });
    expect(flightButton()).toHaveAccessibleName("Stop the replay");
    // The landing is a quiet one: no press is left to make it a visitor's.
    act(() => globe.land());
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(flightButton()).toHaveAccessibleName("Replay the flight");
  });

  it("a right-click whose release the context menu swallows neither stops the autoplay nor leaves a press set", async () => {
    await inFlight();
    act(() => {
      fireEvent.pointerDown(plainText(), { pointerId: 1, button: 2, clientX: 100, clientY: 100 });
    });
    expect(flightButton()).toHaveAccessibleName("Stop the replay");
    act(() => globe.land());
    expect(flightButton()).toHaveAccessibleName("Replay the flight");
  });

  it("a control-click on macOS (its right-click) is not a press either", async () => {
    const platform = vi.spyOn(window.navigator, "platform", "get").mockReturnValue("MacIntel");
    try {
      await inFlight();
      act(() => {
        fireEvent.pointerDown(plainText(), { pointerId: 1, button: 0, ctrlKey: true, clientX: 100, clientY: 100 });
      });
      expect(flightButton()).toHaveAccessibleName("Stop the replay");
    } finally {
      platform.mockRestore();
    }
  });

  it("an autoplayed flight that lands while a touch on the stage is still undecided stays silent and ends the autoplay", async () => {
    const { controls } = await inFlight();
    const stage = stageGroup();
    act(() => {
      fireEvent.pointerDown(stage, { pointerId: 1, clientX: 100, clientY: 100 });
    });
    act(() => globe.land());
    act(() => {
      fireEvent.pointerCancel(stage, { pointerId: 1, clientX: 100, clientY: 140 });
    });
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(flightButton()).toHaveAccessibleName("Replay the flight");
    advance(60_000);
    expect(controls.fly).toHaveBeenCalledTimes(1);
  });

  it("never plays out under reduced motion: one landing, no Stop control", async () => {
    motion.reduce = true;
    const { observer, controls } = await stageWithLiveGlobe();
    vi.useFakeTimers();
    observer.report(0.6);
    expect(controls.fly).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Stop the replay" })).toBeNull();
    act(() => globe.land());
    advance(60_000);
    expect(controls.fly).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Stop the replay" })).toBeNull();
  });

  it("still announces a flight the visitor asked for, after stopping the replay", async () => {
    const { controls } = await inFlight();
    const user = fakeTimerUser();
    await user.click(screen.getByRole("button", { name: "Stop the replay" }));
    await user.click(screen.getByRole("button", { name: "Replay the flight" }));
    expect(controls.fly).toHaveBeenCalledTimes(2);
    act(() => globe.land());
    expect(screen.getByRole("status")).toHaveTextContent(/landed/i);
    expect(flightButton()).toHaveAccessibleName("Replay the flight");
  });
});
