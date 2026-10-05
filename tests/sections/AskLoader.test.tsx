import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AskLoader from "@/sections/Contact/AskLoader";

/**
 * `AskLoader` is the half of the chat that ships with Contact: a placeholder,
 * a visibility trigger and one `import()` of `AskThisSite`, the module that
 * pulls in `@/lib/answers` (the lexical index over the whole site). What
 * this file pins: nothing is imported until the block comes near the
 * viewport, the live-mode flag reaches the chat, a browser without
 * IntersectionObserver still gets the chat, and a failed import says so out
 * loud and offers a retry.
 */

/*
 * The mock's `default` is a GETTER on purpose, and `chunkState` is created
 * with `vi.hoisted` because `vi.mock` factories are hoisted above ordinary
 * `const`s.
 *
 * Why a getter rather than a factory that throws: a module that fails to
 * evaluate is cached as failed, so a second `import()` of it never re-runs
 * the factory — a retry test written that way passes or fails for reasons
 * that have nothing to do with the component. A getter is re-evaluated on
 * every `mod.default` access, and because the component reads `mod.default`
 * inside its `.then()`, a throwing getter rejects that promise chain and
 * lands in the same `.catch()` a real network failure would. `reads` counts
 * those accesses, which is how "not imported yet" is observed.
 */
const chunkState = vi.hoisted(() => ({ fail: false, reads: 0 }));

vi.mock("@/sections/Contact/AskThisSite", () => ({
  get default() {
    chunkState.reads += 1;
    if (chunkState.fail) throw new Error("chunk failed");
    return function Chat({ liveModeConfigured }: { readonly liveModeConfigured: boolean }) {
      return <div data-testid="chat">chat live={String(liveModeConfigured)}</div>;
    };
  },
}));

/** A hand-driven IntersectionObserver: `reveal()` reports every observed
 *  element as intersecting, the way a real one does when the visitor
 *  scrolls the block within its root margin. */
class FakeObserver {
  static instances: FakeObserver[] = [];
  readonly targets: Element[] = [];
  disconnected = false;
  constructor(
    private readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit,
  ) {
    FakeObserver.instances.push(this);
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
  reveal() {
    this.callback(
      this.targets.map((target) => ({ target, isIntersecting: true }) as IntersectionObserverEntry),
      this as unknown as IntersectionObserver,
    );
  }
}

beforeEach(() => {
  chunkState.fail = false;
  chunkState.reads = 0;
  FakeObserver.instances = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AskLoader, before the visitor gets near it", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", FakeObserver);
  });

  it("imports nothing and announces nothing while it is out of view", async () => {
    render(<AskLoader liveModeConfigured={false} />);
    // Give any stray promise a chance to settle before asserting it never ran.
    await act(async () => {});
    expect(chunkState.reads).toBe(0);
    expect(screen.queryByTestId("chat")).not.toBeInTheDocument();
    // Nothing is in flight, so nothing claims to be loading.
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("starts loading ahead of arrival, not at the exact edge", () => {
    render(<AskLoader liveModeConfigured={false} />);
    expect(FakeObserver.instances).toHaveLength(1);
    expect(FakeObserver.instances[0].options?.rootMargin).toMatch(/^\d+px/);
    expect(parseInt(FakeObserver.instances[0].options?.rootMargin ?? "0", 10)).toBeGreaterThan(0);
  });

  it("announces loading, then renders the chat, once it comes into view", async () => {
    render(<AskLoader liveModeConfigured={false} />);
    act(() => FakeObserver.instances[0].reveal());
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    await waitFor(() => expect(screen.getByTestId("chat")).toBeInTheDocument());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    // One trigger is all it needs: the observer lets go once it has fired.
    expect(FakeObserver.instances[0].disconnected).toBe(true);
  });

  it("passes the live-mode flag through to the chat", async () => {
    render(<AskLoader liveModeConfigured={true} />);
    act(() => FakeObserver.instances[0].reveal());
    await waitFor(() => expect(screen.getByTestId("chat")).toHaveTextContent("live=true"));
  });
});

describe("AskLoader in a browser without IntersectionObserver", () => {
  it("loads the chat straight away rather than never", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<AskLoader liveModeConfigured={false} />);
    await waitFor(() => expect(screen.getByTestId("chat")).toBeInTheDocument());
  });
});

describe("AskLoader when the chunk cannot be fetched", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", undefined);
  });

  it("says so out loud instead of sitting on a loading line", async () => {
    chunkState.fail = true;
    render(<AskLoader liveModeConfigured={false} />);

    // Gate on the button, not on the status text: the loading line is ALSO
    // a `role="status"` and also contains "load", so asserting on the text
    // first would pass while the chunk was merely still in flight. The retry
    // button exists in the failure branch and nowhere else.
    await screen.findByRole("button", { name: /try again/i });

    // Now the status region can only be the failure line. Matched by regex
    // because the copy uses a curly apostrophe (`&rsquo;`) — a straight-
    // quoted "didn't" would never match.
    expect(screen.getByRole("status")).toHaveTextContent(/didn.t load/i);
  });

  it("retrying asks for the chunk again and shows it when it arrives", async () => {
    chunkState.fail = true;
    render(<AskLoader liveModeConfigured={false} />);
    const retry = await screen.findByRole("button", { name: /try again/i });

    chunkState.fail = false;
    await userEvent.setup().click(retry);

    await waitFor(() => expect(screen.getByTestId("chat")).toBeInTheDocument());
  });
});

describe("AskLoader holds the chat's room before it arrives", () => {
  it("marks the waiting and loading states as the reserved slot, and the chat is not inside one", async () => {
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    const { container } = render(<AskLoader liveModeConfigured={false} />);
    const slot = container.querySelector("[data-ask-slot]");
    expect(slot).not.toBeNull();
    // A `min-h-*` utility sits in a later cascade layer than the stylesheet's
    // reserved height and would silently replace it.
    expect(slot?.className ?? "").not.toMatch(/min-h-/);

    act(() => FakeObserver.instances[0].reveal());
    expect(screen.getByRole("status").closest("[data-ask-slot]")).not.toBeNull();

    await waitFor(() => expect(screen.getByTestId("chat")).toBeInTheDocument());
    expect(container.querySelector("[data-ask-slot]")).toBeNull();
  });

  it("is given a height by the stylesheet, only when JavaScript runs", () => {
    // jsdom applies no stylesheet, so the rule is read as text. The gate is
    // `html[data-motion]`, stamped by layout.tsx's pre-paint script.
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toMatch(/html\[data-motion\] \[data-ask-slot\] \{\s*min-height: \d+rem;/);
  });
});
