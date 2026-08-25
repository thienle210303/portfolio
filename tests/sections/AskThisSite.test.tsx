import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AskThisSite from "@/sections/AIWorkflowLab/AskThisSite";

/**
 * The scrolling thread + "Clear conversation" control (round 12, WP-K).
 * `e2e/ask.spec.ts` covers the real-browser scroll/layout contract (a fixed
 * `max-h-*`, the page's own height not growing); this file covers what
 * jsdom can actually verify without a layout engine: the ARIA wiring on the
 * scroll region, the clear control's visibility and focus-return, and that
 * the newest turn triggers a scroll-to-bottom call (and with which
 * `behavior`), since jsdom has no `Element.prototype.scrollTo` of its own to
 * fall back on.
 *
 * The component scrolls via `logRef.current.scrollTo({ top: scrollHeight })`
 * rather than `lastTurn.scrollIntoView()` deliberately -- verified directly
 * in a real browser during this round's work, `scrollIntoView` walks every
 * scrollable ancestor including the page itself, and Chromium will happily
 * "satisfy" it by scrolling the *page* several thousand pixels instead of
 * the inner window when the inner box alone can't bring the target into the
 * outer viewport. `Element.scrollTo()` is scoped to the single scrolling box
 * it is called on and never touches an ancestor -- see the doc comment on
 * the effect in `AskThisSite.tsx` for the full account.
 */

function conversationRegion() {
  return screen.getByRole("log", { name: "Conversation thread" });
}

function questionField() {
  return screen.getByRole("textbox", { name: "Ask a question about this portfolio" });
}

let scrollToSpy: ReturnType<typeof vi.fn>;
let matchMediaMatches = false;

beforeEach(() => {
  scrollToSpy = vi.fn();
  // jsdom does not implement Element.scrollTo at all -- calling the real
  // (missing) method throws, so every test in this file needs the stub
  // regardless of whether it asserts on it.
  Element.prototype.scrollTo = scrollToSpy as unknown as typeof Element.prototype.scrollTo;

  matchMediaMatches = false;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: matchMediaMatches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AskThisSite -- scrolling thread window", () => {
  it("has no scroll region markup while idle -- nothing to reach or scroll yet", () => {
    render(<AskThisSite liveModeConfigured={false} />);
    const region = screen.getByRole("log", { name: "Conversation thread" });
    expect(region).not.toHaveAttribute("tabindex");
    expect(region).not.toHaveClass("max-h-[22rem]");
  });

  it("becomes a keyboard-reachable, bounded scroll region once a turn exists", async () => {
    const user = userEvent.setup();
    render(<AskThisSite liveModeConfigured={false} />);

    await user.click(screen.getByRole("button", { name: "Where did he study?" }));

    const region = conversationRegion();
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toHaveClass("max-h-[22rem]");
    expect(region).toHaveClass("overflow-y-auto");

    // Still the same list, same accessible name, that every other ask.spec
    // locator (and the round-10 contract test) already depends on -- only
    // wrapped in a scroll region now, not replaced by one.
    expect(within(region).getByRole("list", { name: "Conversation" })).toBeInTheDocument();
  });

  it("scrolls the scroll window to its bottom when a turn is added, smoothly by default", async () => {
    const user = userEvent.setup();
    render(<AskThisSite liveModeConfigured={false} />);

    await user.click(screen.getByRole("button", { name: "Where did he study?" }));

    expect(scrollToSpy).toHaveBeenCalled();
    // Called on the log region itself -- not on a turn's own element, and
    // not on `window` -- so nothing outside this one box ever moves.
    expect(scrollToSpy.mock.instances.at(-1)).toBe(conversationRegion());
    const lastCall = scrollToSpy.mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({ behavior: "smooth" });
    expect(lastCall).toHaveProperty("top");
  });

  it("scrolls instantly, not smoothly, under prefers-reduced-motion", async () => {
    matchMediaMatches = true;
    const user = userEvent.setup();
    render(<AskThisSite liveModeConfigured={false} />);

    await user.click(screen.getByRole("button", { name: "Where did he study?" }));

    const lastCall = scrollToSpy.mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({ behavior: "auto" });
  });

  it("keeps every turn in the thread and in order as more are asked (the honest round-10 contract)", async () => {
    const user = userEvent.setup();
    render(<AskThisSite liveModeConfigured={false} />);

    await user.click(screen.getByRole("button", { name: "What does he do at DoorDash?" }));
    await user.type(questionField(), "what is the capital of France");
    await user.keyboard("{Enter}");

    const region = conversationRegion();
    const turns = within(region).getByRole("list", { name: "Conversation" });
    const items = within(turns).getAllByRole("listitem", { hidden: false }).filter(
      (el) => el.parentElement === turns,
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("What does he do at DoorDash?");
    expect(items[1]).toHaveTextContent("what is the capital of France");
  });
});

describe("AskThisSite -- Clear conversation", () => {
  it("is not shown while the thread is empty", () => {
    render(<AskThisSite liveModeConfigured={false} />);
    expect(screen.queryByRole("button", { name: "Clear conversation" })).not.toBeInTheDocument();
  });

  it("appears once a turn exists, empties the thread when pressed, and returns focus to the question field", async () => {
    const user = userEvent.setup();
    render(<AskThisSite liveModeConfigured={false} />);

    await user.click(screen.getByRole("button", { name: "Where did he study?" }));
    const clearButton = screen.getByRole("button", { name: "Clear conversation" });
    expect(clearButton).toBeInTheDocument();

    await user.click(clearButton);

    expect(screen.queryByRole("button", { name: "Clear conversation" })).not.toBeInTheDocument();
    expect(screen.getByText(/No question asked yet/)).toBeInTheDocument();
    expect(questionField()).toHaveFocus();
  });
});
