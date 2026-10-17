import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import TreeBox, { SeeHowItGrows } from "@/sections/CareerTree/TreeBox";

/*
 * The tree box's half of the growth: when the player starts, and how many are
 * mounted. The player itself (beats, the conductor, the companion's events)
 * needs a real layout and is in `e2e/origin.spec.ts`; here it is a fake that
 * counts its own mounts.
 */

const player = vi.hoisted(() => ({ mounts: 0, live: 0, close: (() => {}) as (restoreFocus: boolean) => void }));

vi.mock("@/sections/CareerTree/OriginStory", () => ({
  default: function FakePlayer({ onClose }: { onClose: (restoreFocus: boolean) => void }) {
    useEffect(() => {
      player.mounts += 1;
      player.live += 1;
      player.close = onClose;
      return () => {
        player.live -= 1;
      };
    }, [onClose]);
    return <div data-origin-stage="" />;
  },
}));

class FakeObserver {
  static all: FakeObserver[] = [];
  readonly targets: Element[] = [];
  constructor(readonly callback: IntersectionObserverCallback) {
    FakeObserver.all.push(this);
  }
  observe(target: Element) {
    this.targets.push(target);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  /** Report the box at `ratio` visible, in a viewport much taller than it. */
  report(ratio: number, rootHeight = 10_000) {
    const entries = this.targets.map(
      (target) =>
        ({
          target,
          isIntersecting: ratio > 0,
          intersectionRatio: ratio,
          intersectionRect: { height: ratio * 100 },
          rootBounds: { height: rootHeight },
        }) as unknown as IntersectionObserverEntry,
    );
    act(() => this.callback(entries, this as unknown as IntersectionObserver));
  }
}

const motion = { reduce: false };

function setup() {
  render(
    <>
      <SeeHowItGrows />
      <TreeBox>
        <p>the drawing</p>
      </TreeBox>
    </>,
  );
  const observer = FakeObserver.all.at(-1);
  if (!observer) throw new Error("the box never observed itself");
  return observer;
}

const stages = () => document.querySelectorAll("[data-origin-stage]");
const button = () => screen.getByRole("button", { name: "See how it grows" });
/** Lets the lazy `import()` and the commit after it land. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

describe("TreeBox", () => {
  beforeEach(() => {
    FakeObserver.all = [];
    player.mounts = 0;
    player.live = 0;
    motion.reduce = false;
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: motion.reduce && query.includes("prefers-reduced-motion: reduce"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("auto-plays once at 50% in view", async () => {
    const observer = setup();
    observer.report(0.3);
    await settle();
    expect(stages()).toHaveLength(0);

    observer.report(0.5);
    // It waits for the visitor to stop on the box, not just pass it.
    await settle();
    expect(stages()).toHaveLength(0);
    await waitFor(() => expect(stages()).toHaveLength(1), { timeout: 2_000 });

    act(() => player.close(false));
    observer.report(0);
    observer.report(1);
    await settle();
    expect(stages()).toHaveLength(0);
    expect(player.mounts).toBe(1);
  });

  it("does not spend the auto-play on a visitor scrolling straight past", async () => {
    const observer = setup();
    observer.report(0.5);
    observer.report(0.1);
    await act(() => new Promise((resolve) => setTimeout(resolve, 1_000)));
    expect(stages()).toHaveLength(0);
    // Still scrolling through it, half in view the whole time: still waiting.
    observer.report(0.5);
    for (let i = 0; i < 5; i += 1) {
      await act(() => new Promise((resolve) => setTimeout(resolve, 250)));
      window.dispatchEvent(new Event("scroll"));
    }
    expect(stages()).toHaveLength(0);
    // Stopping on it plays it.
    await waitFor(() => expect(stages()).toHaveLength(1), { timeout: 2_000 });
  });

  it("never plays a box that is not displayed", async () => {
    // Chrome reports a `display: none` target (the box below 1024px) with
    // zero-height root bounds, so "half the screen" would be zero pixels.
    const observer = setup();
    observer.report(0, 0);
    await settle();
    expect(stages()).toHaveLength(0);
  });

  it("does not auto-play under reduced motion", async () => {
    motion.reduce = true;
    const observer = setup();
    observer.report(1);
    await settle();
    expect(stages()).toHaveLength(0);

    // The button still takes the visitor there; it just does not animate.
    fireEvent.click(button());
    await settle();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(stages()).toHaveLength(0);
    expect(player.mounts).toBe(0);
  });

  it("button restarts with exactly one player", async () => {
    const observer = setup();
    fireEvent.click(button());
    await waitFor(() => expect(stages()).toHaveLength(1));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);

    fireEvent.click(button());
    await waitFor(() => expect(player.mounts).toBe(2));
    expect(stages()).toHaveLength(1);
    expect(player.live).toBe(1);

    // A press counts as the first view: scrolling there does not start a third.
    observer.report(1);
    await settle();
    expect(player.mounts).toBe(2);
  });

  it("does not auto-play after the visitor already pressed the button", async () => {
    const observer = setup();
    fireEvent.click(button());
    await waitFor(() => expect(stages()).toHaveLength(1));
    act(() => player.close(true));
    observer.report(1);
    await settle();
    expect(stages()).toHaveLength(0);
    expect(player.mounts).toBe(1);
  });
});
