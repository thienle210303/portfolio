import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AskLoader from "@/sections/Contact/AskLoader";
import AskPlaceholder from "@/sections/Contact/AskPlaceholder";
import { IDLE_HINT, PROMISE, PROMISE_LIVE, SHEET } from "@/sections/Contact/ask-sheet";

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

describe("AskLoader holds the chat's place before it arrives", () => {
  it("marks the waiting and loading states as the slot, and the chat is not inside one", async () => {
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    const { container } = render(<AskLoader liveModeConfigured={false} />);
    const slot = container.querySelector("[data-ask-slot]");
    expect(slot).not.toBeNull();
    // The slot is as tall as what is drawn in it; a `min-h-*` would be a
    // hand-measured room again.
    expect(slot?.className ?? "").not.toMatch(/min-h-/);

    act(() => FakeObserver.instances[0].reveal());
    expect(screen.getByRole("status").closest("[data-ask-slot]")).not.toBeNull();

    await waitFor(() => expect(screen.getByTestId("chat")).toBeInTheDocument());
    expect(container.querySelector("[data-ask-slot]")).toBeNull();
  });

  it("shows the placeholder it is handed while it waits and while it loads, and announces the load out of flow", async () => {
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    const { container } = render(
      <AskLoader liveModeConfigured={false} placeholder={<div data-testid="held">the idle notepad</div>} />,
    );
    const slot = container.querySelector("[data-ask-slot]") as HTMLElement;
    expect(within(slot).getByTestId("held")).toBeInTheDocument();
    expect(slot).not.toHaveAttribute("aria-busy");

    act(() => FakeObserver.instances[0].reveal());
    // Still there while the chunk is in flight, so the slot keeps its height;
    // "Loading" is said to assistive tech from a box that takes no room.
    expect(within(slot).getByTestId("held")).toBeInTheDocument();
    expect(slot).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveClass("sr-only");

    await waitFor(() => expect(screen.getByTestId("chat")).toBeInTheDocument());
    expect(screen.queryByTestId("held")).not.toBeInTheDocument();
  });
});

describe("AskPlaceholder, the idle notepad that holds the chat's place", () => {
  const suggestions = ["What do you do at DoorDash?", "What have you measured?"];

  it("draws the idle notepad the chat will draw: the same sheet, the promise, the question line and the suggestions", () => {
    // Round 25: built from the chat's own pieces (`ask-sheet.tsx`), so it is
    // the chat's height at every width without a measured number.
    // e2e/ask.spec.ts compares the two in a browser.
    const { container } = render(<AskPlaceholder liveModeConfigured={false} suggestions={suggestions} />);
    const sheet = container.firstElementChild as HTMLElement;
    expect(sheet.className).toBe(SHEET);
    expect(sheet).toHaveAttribute("data-ask-sheet", "idle");
    expect(sheet).toHaveTextContent(IDLE_HINT);
    expect(sheet).toHaveTextContent(PROMISE);
    expect(sheet).toHaveTextContent("Your question");
    for (const question of suggestions) expect(sheet).toHaveTextContent(question);
    expect(sheet.querySelector(".ask-window")).not.toBeNull();
    // Idle: the window is not open, so it has no fixed height.
    expect(sheet.querySelector(".ask-window")).not.toHaveAttribute("data-open");
  });

  it("writes the live promise when a model will answer", () => {
    const { container } = render(<AskPlaceholder liveModeConfigured={true} suggestions={suggestions} />);
    expect(container).toHaveTextContent(PROMISE_LIVE);
    expect(container).toHaveTextContent("Live mode");
  });

  it("is paper, not controls: nothing in it can be pressed, typed in or tabbed to", () => {
    const { container } = render(
      <AskPlaceholder liveModeConfigured={false} heading={<h3>Ask me</h3>} suggestions={suggestions} />,
    );
    expect(container.querySelectorAll("a, button, input, textarea, select, [tabindex]")).toHaveLength(0);
    // Everything but the heading is inert and hidden from assistive tech.
    const shells = Array.from(container.querySelectorAll<HTMLElement>("[data-ask-shell]"));
    expect(shells.length).toBeGreaterThanOrEqual(3);
    for (const shell of shells) {
      expect(shell).toHaveAttribute("aria-hidden", "true");
      expect(shell).toHaveAttribute("inert");
    }
    expect(screen.getByRole("heading", { name: "Ask me" }).closest("[data-ask-shell]")).toBeNull();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("is a Server Component that imports only the sheet", () => {
    // No "use client", no engine: it costs the page's JavaScript nothing.
    const source = readFileSync("src/sections/Contact/AskPlaceholder.tsx", "utf8");
    expect(source).not.toMatch(/^\s*["']use client["']/m);
    const imports = [...source.matchAll(/^\s*import\s[^;]*?from\s+["']([^"']+)["']/gm)].map((match) => match[1]);
    expect(imports.sort()).toEqual(["./ask-sheet", "react"]);
  });

  it("is not shown where JavaScript is off, and the chat's window has one height once it is open", () => {
    // jsdom applies no stylesheet, so the rules are read as text. The gate is
    // `html[data-motion]`, stamped by layout.tsx's pre-paint script.
    const css = readFileSync("src/app/globals.css", "utf8");
    // Unlayered: the shell's own `flex` is a utility and would outrank a
    // layered `display: none`.
    expect(css).toMatch(/\n\}\nhtml:not\(\[data-motion\]\) \[data-ask-sheet="idle"\] \{\s*display: block;\s*\}\nhtml:not\(\[data-motion\]\) \[data-ask-shell\] \{\s*display: none;/);
    expect(css).toMatch(/\.ask-window\[data-open\] \{\s*height: var\(--ask-window\);\s*overflow-y: auto;/);
    // The hand-measured room is gone, and must not come back as a rule.
    expect(css).not.toMatch(/min-height: var\(--ask-room\)/);
  });

  it("keeps the chat's root on the shared sheet, free of a min-h utility", () => {
    const source = readFileSync("src/sections/Contact/AskThisSite.tsx", "utf8");
    expect(source, "the chat's root lost its data-ask-chat attribute").toMatch(
      /<div data-ask-chat="" className=\{SHEET\}>/,
    );
    expect(SHEET).not.toMatch(/min-h-/);
  });
});

describe("AskLoader's lazy boundary", () => {
  it("never imports the chat or the answer engine statically", () => {
    // The whole point of this file: a static import of either would pull the
    // engine and its index into the chunk Contact ships with. Only the
    // dynamic `import("./AskThisSite")` may name the chat.
    const source = readFileSync("src/sections/Contact/AskLoader.tsx", "utf8");
    const staticImports = [...source.matchAll(/^\s*import\s[^;]*?from\s+["']([^"']+)["']/gm)].map(
      (match) => match[1],
    );
    expect(staticImports).not.toContain("./AskThisSite");
    expect(staticImports).not.toContain("@/sections/Contact/AskThisSite");
    expect(staticImports).not.toContain("@/lib/answers");
    expect(staticImports.every((specifier) => specifier === "react")).toBe(true);
    expect(source).toMatch(/import\("\.\/AskThisSite"\)/);
  });

  it("leaves the sheet the chat and its placeholder share importing nothing but React's types", () => {
    // `ask-sheet.tsx` is rendered on the server (the placeholder) and rides in
    // the chat's chunk; it must never be a way for the engine to reach either.
    const source = readFileSync("src/sections/Contact/ask-sheet.tsx", "utf8");
    const imports = [...source.matchAll(/^\s*import\s([^;]*?)from\s+["']([^"']+)["']/gm)];
    expect(imports.map((match) => match[2])).toEqual(["react"]);
    expect(imports[0][1].trim()).toMatch(/^type\s/);
  });
});
