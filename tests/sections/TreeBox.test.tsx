import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import TreeBox, { SeeHowItGrows } from "@/sections/CareerTree/TreeBox";

/*
 * The tree box's half of the growth: when the player starts, and how many are
 * mounted. The player itself (beats, the conductor, the companion's events)
 * needs a real layout and is in `e2e/origin.spec.ts`; here it is a fake that
 * counts its own mounts.
 *
 * The clock is fake. On a real one, the box's 600 ms dwell, the lazy import
 * and React's commits raced the test's own waits, and under CPU load the test
 * could close the player before the fake had mounted (and set `player.close`).
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
  constructor(
    readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit,
  ) {
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
  /** Report the box at `ratio` visible. */
  report(ratio: number) {
    const entries = this.targets.map(
      (target) =>
        ({
          target,
          isIntersecting: ratio > 0,
          intersectionRatio: ratio,
        }) as IntersectionObserverEntry,
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
  // The auto-play's observer, not the one that keeps the box a scroller nearby.
  const observer = FakeObserver.all.find((o) => Array.isArray(o.options?.threshold));
  if (!observer) throw new Error("the box never observed itself");
  return observer;
}

const stages = () => document.querySelectorAll("[data-origin-stage]");
const button = () => screen.getByRole("button", { name: "See how it grows" });
/** Runs what is already due, lets the lazy `import()` land, and commits it
 *  with its effects. */
const settle = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(0);
    await vi.dynamicImportSettled();
  });
const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
/** Longer than TreeBox's 600 ms dwell: a "nothing played" check before this
 *  proves nothing, because nothing would have played yet anyway. */
const pastDwell = () => wait(800);

describe("TreeBox", () => {
  beforeEach(() => {
    vi.useFakeTimers();
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
    vi.useRealTimers();
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
    await pastDwell();
    await settle();
    expect(stages()).toHaveLength(1);

    act(() => player.close(false));
    observer.report(0);
    observer.report(1);
    await pastDwell();
    expect(stages()).toHaveLength(0);
    expect(player.mounts).toBe(1);
  });

  it("does not spend the auto-play on a visitor scrolling straight past", async () => {
    const observer = setup();
    observer.report(0.5);
    observer.report(0.1);
    await wait(1_000);
    expect(stages()).toHaveLength(0);
    // Still scrolling through it, half in view the whole time: still waiting.
    observer.report(0.5);
    for (let i = 0; i < 5; i += 1) {
      await wait(250);
      window.dispatchEvent(new Event("scroll"));
    }
    expect(stages()).toHaveLength(0);
    // Stopping on it plays it.
    await pastDwell();
    await settle();
    expect(stages()).toHaveLength(1);
  });

  it("is a named, keyboard-scrollable window onto the tree", () => {
    setup();
    const box = screen.getByRole("region", { name: "Career tree" });
    expect(box).toHaveAttribute("tabindex", "0");
    expect(box).toContainElement(screen.getByText("the drawing"));
  });

  it("jumps to the ground when a show starts, and stays put when it ends", () => {
    setup();
    const box = screen.getByRole("region", { name: "Career tree" });
    Object.defineProperty(box, "scrollHeight", { configurable: true, value: 2_000 });
    expect(box.scrollTop).toBe(0);
    act(() => {
      document.dispatchEvent(new CustomEvent("origin-story", { detail: "start" }));
    });
    expect(box.scrollTop).toBe(2_000);
    box.scrollTop = 40;
    act(() => {
      document.dispatchEvent(new CustomEvent("origin-story", { detail: "end" }));
    });
    expect(box.scrollTop).toBe(40);
  });

  it("does not auto-play under reduced motion", async () => {
    motion.reduce = true;
    const observer = setup();
    observer.report(1);
    await pastDwell();
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
    await settle();
    expect(stages()).toHaveLength(1);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);

    fireEvent.click(button());
    await settle();
    expect(player.mounts).toBe(2);
    expect(stages()).toHaveLength(1);
    expect(player.live).toBe(1);

    // A press counts as the first view: scrolling there does not start a third.
    observer.report(1);
    await pastDwell();
    expect(player.mounts).toBe(2);
  });

  it("pressed first, then scrolled into view: no second auto-play", async () => {
    const observer = setup();
    fireEvent.click(button());
    await settle();
    expect(stages()).toHaveLength(1);
    act(() => player.close(true));
    observer.report(1);
    await pastDwell();
    expect(stages()).toHaveLength(0);
    expect(player.mounts).toBe(1);
  });

  it("does not auto-play under a visitor already focused in the box, and spends the one auto-play", async () => {
    const observer = setup();
    observer.report(1);
    act(() => screen.getByRole("region", { name: "Career tree" }).focus());
    await pastDwell();
    expect(stages()).toHaveLength(0);

    act(() => (document.activeElement as HTMLElement).blur());
    observer.report(0);
    observer.report(1);
    await pastDwell();
    expect(player.mounts).toBe(0);
  });

  it("is drawn and scrollable only near the viewport or while a show runs", () => {
    setup();
    const box = screen.getByRole("region", { name: "Career tree" });
    const nearby = FakeObserver.all.find((o) => o.options?.rootMargin);
    if (!nearby) throw new Error("no nearby observer");
    nearby.report(0);
    expect(box).toHaveAttribute("data-far");
    nearby.report(0.1);
    expect(box).not.toHaveAttribute("data-far");
    nearby.report(0);
    act(() => {
      document.dispatchEvent(new CustomEvent("origin-story", { detail: "start" }));
    });
    expect(box).not.toHaveAttribute("data-far");
    act(() => {
      document.dispatchEvent(new CustomEvent("origin-story", { detail: "end" }));
    });
    expect(box).toHaveAttribute("data-far");
  });
});
