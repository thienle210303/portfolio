import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import type { GlobeControls } from "@/sections/Worlds/WorldsStage";
import { WorldsStage } from "@/sections/Worlds/WorldsStage";
import { crossingKm, resolveChapters } from "@/lib/worlds";
import { resolveSkins } from "@/lib/skins";

/*
 * The crossing plays itself once, when the stage comes into view (R8). What is
 * tested here is the stage's half of that: which observer asks, how often it
 * asks the globe to fly, and when it asks the globe to settle. The globe's own
 * half (the flight, `settle()` drawing the landed frame, the robot ending lit)
 * needs a real canvas and is in `e2e/worlds.spec.ts`.
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

async function stageWithLiveGlobe() {
  render(
    <WorldsStage worlds={resolveChapters()} skins={resolveSkins()} crossingKm={crossingKm()} />,
  );
  importObserver()?.report(1);
  await screen.findByRole("button", { name: /take the flight/i });
  // The observer is made in a passive effect, which can run just after the
  // label above has painted.
  await waitFor(() =>
    expect(autoplayObserver(), "one autoplay observer, once the controls exist").toHaveLength(1),
  );
  const observers = autoplayObserver();
  const controls = globe.controls;
  if (!controls) throw new Error("the fake globe never handed its controls up");
  return { observer: observers[0], controls };
}

describe("WorldsStage, the crossing plays itself once", () => {
  beforeEach(() => {
    FakeObserver.all = [];
    globe.controls = null;
    vi.stubGlobal("IntersectionObserver", FakeObserver);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("flies once across two entries into view, and never replays", async () => {
    const { observer, controls } = await stageWithLiveGlobe();
    observer.report(0.6);
    expect(controls.fly).toHaveBeenCalledTimes(1);
    act(() => globe.land());
    observer.report(0);
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
    // Re-entry after a settle is a re-entry like any other: nothing replays.
    observer.report(1);
    expect(controls.fly).toHaveBeenCalledTimes(1);
  });

  it("settles a walking robot too: every exit asks, not only the flight's", async () => {
    // The robot's walk can start long after the crossing has landed, so the
    // stage asks the globe to settle on every exit and the globe decides what
    // is moving (a robot mid-walk jumps to its lit end; at rest, nothing).
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

  it("still announces a flight the visitor asked for", async () => {
    const user = userEvent.setup();
    const { observer, controls } = await stageWithLiveGlobe();
    observer.report(1);
    act(() => globe.land());
    await user.click(screen.getByRole("button", { name: /take the flight/i }));
    expect(controls.fly).toHaveBeenCalledTimes(2);
    act(() => globe.land());
    expect(screen.getByRole("status")).toHaveTextContent(/landed/i);
  });

  it("does not fly itself after the visitor already has", async () => {
    const user = userEvent.setup();
    const { observer, controls } = await stageWithLiveGlobe();
    await user.click(screen.getByRole("button", { name: /take the flight/i }));
    observer.report(1);
    expect(controls.fly).toHaveBeenCalledTimes(1);
  });
});
