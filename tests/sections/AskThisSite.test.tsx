import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AskThisSite, { clearThreadCache } from "@/sections/Hero/AskThisSite";

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
 *
 * ## Why this file sets its own timeout, and types with `delay: null`
 *
 * These tests are legitimately slow, and the 5s default was never calibrated
 * for them. Every test that types a question runs ~1.4-1.7s; every test that
 * only clicks runs ~0.3s. The difference is one `user.type()` of a ~33-char
 * question: each keystroke is a real React re-render of the whole panel
 * through jsdom, measured at ~25ms/char even with the inter-key delay
 * switched off.
 *
 * `delay: null` removes the part that was pure waste -- `userEvent`'s default
 * delay between keystrokes, measured at 2143ms vs 829ms for the same 33
 * characters. Nothing here asserts anything about typing cadence, so that
 * delay bought nothing. The remaining ~800ms is real work and cannot be
 * optimised away from the test side; `onChange` only calls `setQuery`, and
 * retrieval (`answer()`) runs in the submit handler, not per keystroke, so
 * there is no product-side inefficiency behind it either -- checked.
 *
 * That left ~3x headroom against the old 5s default, on a machine where a
 * full parallel suite inflates wall-clock 3-6x, and four full-suite runs in
 * ten timed out here while the file passed every time in isolation. That part
 * was never specific to this file -- the same timeout took out two other files
 * in turn -- so the budget is set once, globally, in `vitest.config.mts`. What
 * stays here is `delay: null`, which removed real waste rather than buying
 * headroom.
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
  // The thread now lives in module scope (so it survives a tab switch --
  // see the comment above `cachedTurns` in AskThisSite.tsx), which means it
  // also survives from one test in this file to the next unless something
  // clears it. Every pre-existing test here renders a fresh component
  // expecting an empty thread, so isolation has to cover the whole file,
  // not just the new "thread persistence" cases below.
  clearThreadCache();
});

describe("AskThisSite -- scrolling thread window", () => {
  it("has no scroll region markup while idle -- nothing to reach or scroll yet", () => {
    render(<AskThisSite liveModeConfigured={false} />);
    const region = screen.getByRole("log", { name: "Conversation thread" });
    expect(region).not.toHaveAttribute("tabindex");
    expect(region).not.toHaveClass("max-h-[22rem]");
  });

  it("becomes a keyboard-reachable, bounded scroll region once a turn exists", async () => {
    const user = userEvent.setup({ delay: null });
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
    const user = userEvent.setup({ delay: null });
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
    const user = userEvent.setup({ delay: null });
    render(<AskThisSite liveModeConfigured={false} />);

    await user.click(screen.getByRole("button", { name: "Where did he study?" }));

    const lastCall = scrollToSpy.mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({ behavior: "auto" });
  });

  it("keeps every turn in the thread and in order as more are asked (the honest round-10 contract)", async () => {
    const user = userEvent.setup({ delay: null });
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
    const user = userEvent.setup({ delay: null });
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

describe("thread persistence across unmount", () => {
  afterEach(() => {
    clearThreadCache();
  });

  it("keeps the conversation when the component is unmounted and mounted again", async () => {
    const user = userEvent.setup({ delay: null });
    const first = render(<AskThisSite liveModeConfigured={false} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "What did Thien build at DoorDash?");
    await user.keyboard("{Enter}");

    const question = await screen.findByText("What did Thien build at DoorDash?");
    expect(question).toBeInTheDocument();

    // The tab switch: Tabs unmounts the panel that is not active.
    first.unmount();
    render(<AskThisSite liveModeConfigured={false} />);

    expect(screen.getByText("What did Thien build at DoorDash?")).toBeInTheDocument();
  });

  it("mints a fresh turn id after an unmount and remount, instead of colliding with the restored thread", async () => {
    const user = userEvent.setup({ delay: null });
    const first = render(<AskThisSite liveModeConfigured={false} />);

    // Both questions are picked from SUGGESTED_QUESTIONS specifically because
    // they resolve to real, non-empty results -- the point of this test is
    // the two turns' own "Answer view" `Tabs` instances, which a no-results
    // turn never renders at all.
    await user.click(screen.getByRole("button", { name: "What does he do at DoorDash?" }));
    await screen.findByRole("tablist", { name: "Answer view" });

    // The tab switch: unmount (a `useRef(0)` counter would reset here, even
    // though the restored thread below keeps its old ids) and remount.
    first.unmount();
    render(<AskThisSite liveModeConfigured={false} />);

    await user.click(screen.getByRole("button", { name: "Where did he study?" }));
    await screen.findAllByRole("tablist", { name: "Answer view" });

    // Both turns are present, independently -- not reconciled into one
    // fiber by a duplicate key.
    const region = conversationRegion();
    const turns = within(region).getByRole("list", { name: "Conversation" });
    const items = within(turns).getAllByRole("listitem", { hidden: false }).filter(
      (el) => el.parentElement === turns,
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("What does he do at DoorDash?");
    expect(items[1]).toHaveTextContent("Where did he study?");

    // Each turn's own "Answer view" tablist is independently present and
    // interactive -- the symptom a duplicate `turn.id` key produces is a
    // shared or lost `Tabs` instance between the two turns.
    const firstTablist = within(items[0]).getByRole("tablist", { name: "Answer view" });
    const secondTablist = within(items[1]).getByRole("tablist", { name: "Answer view" });
    expect(firstTablist).toBeInTheDocument();
    expect(secondTablist).toBeInTheDocument();
    expect(firstTablist).not.toBe(secondTablist);

    // The turn id itself is otherwise invisible (it is a React key and an id
    // prefix, not rendered text) -- but `Tabs` (src/components/ui/Tabs.tsx)
    // threads its `idPrefix` (built from `turn.id`) straight into real DOM
    // ids on each tab button, so the two turns' ids are directly observable
    // and directly assertable here: distinct, not a `turn-0` collision.
    const firstTabId = within(firstTablist).getByRole("tab", { name: "Prose" }).id;
    const secondTabId = within(secondTablist).getByRole("tab", { name: "Prose" }).id;
    expect(firstTabId).toContain("turn-0");
    expect(secondTabId).toContain("turn-1");
    expect(firstTabId).not.toBe(secondTabId);
  });

  it("clearThreadCache empties the thread for the next mount", async () => {
    const user = userEvent.setup({ delay: null });
    const first = render(<AskThisSite liveModeConfigured={false} />);
    await user.type(screen.getByRole("textbox"), "What did Thien build at DoorDash?");
    await user.keyboard("{Enter}");
    await screen.findByText("What did Thien build at DoorDash?");

    first.unmount();
    clearThreadCache();
    render(<AskThisSite liveModeConfigured={false} />);

    expect(screen.queryByText("What did Thien build at DoorDash?")).not.toBeInTheDocument();
  });
});

describe("thread persistence across unmount -- live mode in flight", () => {
  afterEach(() => {
    clearThreadCache();
    vi.unstubAllGlobals();
  });

  /** Waits out a macrotask so every already-settled microtask (the chain of
   *  `await`s inside `askLive`, including its own `await response.json()`)
   *  has had a turn to run, without needing a mounted component for
   *  `findBy*`/`waitFor` to poll. */
  function flushMicrotasks() {
    return new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  it("delivers a live answer into the cache even after the panel that asked has unmounted, instead of leaving it stuck on pending", async () => {
    let resolveFetch!: (response: Pick<Response, "json">) => void;
    const fetchPromise = new Promise<Pick<Response, "json">>((resolve) => {
      resolveFetch = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(fetchPromise));

    const user = userEvent.setup({ delay: null });
    const first = render(<AskThisSite liveModeConfigured={true} />);

    await user.type(screen.getByRole("textbox"), "What did Thien build at DoorDash?");
    await user.keyboard("{Enter}");

    expect(await screen.findByText(/Asking the live model/)).toBeInTheDocument();

    // The tab switch: the panel that asked the question -- and is waiting on
    // its response -- unmounts before the network call returns.
    first.unmount();

    resolveFetch({
      json: () =>
        Promise.resolve({
          ok: true,
          grounded: false,
          text: "He built the Dasher-facing tools at DoorDash.",
        }),
    });
    await flushMicrotasks();

    // Remounting (switching back to the tab) should show the answer that
    // arrived while nobody was watching, not a spinner stuck forever.
    render(<AskThisSite liveModeConfigured={true} />);

    expect(screen.getByText("He built the Dasher-facing tools at DoorDash.")).toBeInTheDocument();
    expect(screen.queryByText(/Asking the live model/)).not.toBeInTheDocument();
  });
});
