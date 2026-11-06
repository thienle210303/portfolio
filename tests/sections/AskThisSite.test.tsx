import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AskThisSite, { clearThreadCache } from "@/sections/Contact/AskThisSite";
import { answer } from "@/lib/answers";
import { figureRuns } from "@/sections/Contact/answer-figures";

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
  return screen.getByRole("textbox", { name: "Your question" });
}

/** A passage on its clipping, by its whole text: since round 24 its measured
 *  values are spans of their own, so the paragraph's own text nodes alone
 *  (what `getByText` matches) are not the passage. */
function passage(container: HTMLElement, text: string): HTMLElement {
  return within(container).getByText((_, element) => element?.tagName === "P" && element.textContent === text);
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
  // The thread lives in module scope (so it survives an unmount and remount
  // -- see the comment above `threadCache` in AskThisSite.tsx), which means it
  // also survives from one test in this file to the next unless something
  // clears it. Every pre-existing test here renders a fresh component
  // expecting an empty thread, so isolation has to cover the whole file,
  // not just the new "thread persistence" cases below.
  clearThreadCache();
});

describe("AskThisSite -- scrolling thread window", () => {
  it("is as tall as its promise while idle, and not a tab stop -- nothing to scroll yet", () => {
    render(<AskThisSite liveModeConfigured={false} />);
    const region = screen.getByRole("log", { name: "Conversation thread" });
    expect(region).not.toHaveAttribute("tabindex");
    // Round 25 (it reverses round 22's "one fixed height"): idle, the window
    // is not open, so it has no fixed height and nothing to scroll.
    expect(region).toHaveClass("ask-window");
    expect(region).not.toHaveAttribute("data-open");
    expect(region.className).not.toMatch(/(^|\s)(lg:)?h-\[/);
  });

  it("becomes a keyboard-reachable, bounded scroll region once a turn exists", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AskThisSite liveModeConfigured={false} />);

    await user.click(screen.getByRole("button", { name: "What have you measured?" }));

    const region = conversationRegion();
    expect(region).toHaveAttribute("tabindex", "0");
    // Open: `.ask-window[data-open]` in globals.css gives it its one height
    // and makes it scroll (tests/sections/AskLoader.test.tsx reads the rule).
    expect(region).toHaveClass("ask-window");
    expect(region).toHaveAttribute("data-open");

    // Still the same list, same accessible name, that every other ask.spec
    // locator (and the round-10 contract test) already depends on -- only
    // wrapped in a scroll region now, not replaced by one.
    expect(within(region).getByRole("list", { name: "Conversation" })).toBeInTheDocument();
  });

  it("scrolls the scroll window to its bottom when a turn is added, smoothly by default", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AskThisSite liveModeConfigured={false} />);

    await user.click(screen.getByRole("button", { name: "What have you measured?" }));

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

    await user.click(screen.getByRole("button", { name: "What have you measured?" }));

    const lastCall = scrollToSpy.mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({ behavior: "auto" });
  });

  it("keeps every turn in the thread and in order as more are asked (the honest round-10 contract)", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AskThisSite liveModeConfigured={false} />);

    await user.click(screen.getByRole("button", { name: "What do you do at DoorDash?" }));
    await user.type(questionField(), "what is the capital of France");
    await user.keyboard("{Enter}");

    const region = conversationRegion();
    const turns = within(region).getByRole("list", { name: "Conversation" });
    const items = within(turns).getAllByRole("listitem", { hidden: false }).filter(
      (el) => el.parentElement === turns,
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("What do you do at DoorDash?");
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

    await user.click(screen.getByRole("button", { name: "What have you measured?" }));
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

    // An unmount and remount: today a client-side trip to /resume and back
    // (through round 17, a switch of the hero's code tabs).
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
    await user.click(screen.getByRole("button", { name: "What do you do at DoorDash?" }));
    await screen.findByRole("tablist", { name: "Answer view" });

    // An unmount (a `useRef(0)` counter would reset here, even
    // though the restored thread below keeps its old ids) and remount.
    first.unmount();
    render(<AskThisSite liveModeConfigured={false} />);

    await user.click(screen.getByRole("button", { name: "What have you measured?" }));
    await screen.findAllByRole("tablist", { name: "Answer view" });

    // Both turns are present, independently -- not reconciled into one
    // fiber by a duplicate key.
    const region = conversationRegion();
    const turns = within(region).getByRole("list", { name: "Conversation" });
    const items = within(turns).getAllByRole("listitem", { hidden: false }).filter(
      (el) => el.parentElement === turns,
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("What do you do at DoorDash?");
    expect(items[1]).toHaveTextContent("What have you measured?");

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

    expect(await screen.findByText(/writing/)).toBeInTheDocument();

    // An unmount: the chat that asked the question -- and is waiting on its
    // response -- goes away before the network call returns.
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
    expect(screen.queryByText(/writing/)).not.toBeInTheDocument();
  });
});

describe("AskThisSite -- a sectioned passage links to its section", () => {
  it("renders \"More on this in X\" pointing at the passage's own section anchor", async () => {
    // The positive half of the pair below, and the only place the verify gate
    // asserts it (the browser-level check lives in e2e/ask.spec.ts). The
    // expectation is derived from `answer()` itself, and its precondition is
    // asserted so the test cannot pass by finding no sectioned answer to check.
    const question = "What do you do at DoorDash?";
    const sectioned = answer(question, 3).filter(
      (result) => result.sectionId !== undefined && result.sectionLabel !== undefined,
    );
    expect(sectioned.length, "the probe no longer retrieves a sectioned passage").toBeGreaterThan(0);
    const expected = sectioned[0];

    const user = userEvent.setup({ delay: null });
    render(<AskThisSite liveModeConfigured={false} />);
    await user.click(screen.getByRole("button", { name: question }));

    const answers = await screen.findByRole("list", { name: "Sourced answers" });
    const item = passage(answers, expected.text).closest("li");
    expect(item).not.toBeNull();
    const link = within(item as HTMLElement).getByRole("link", { name: /More on this in/ });
    expect(link).toHaveAttribute("href", `#${expected.sectionId}`);
    // The wording is load-bearing, not cosmetic: a `sectionId` promises the
    // section renders the passage's *subject*, not the sentence (see
    // `Document.sectionId`), so a link saying "Read it in …" would overclaim on
    // the 38 career documents whose sentence is not rendered there.
    expect(link).toHaveTextContent(`More on this in ${expected.sectionLabel}`);
    expect(link.textContent, "the link must not claim the sentence is there").not.toMatch(
      /Read it in/,
    );
  });
});

describe("AskThisSite -- a passage whose subject is rendered nowhere has no section link", () => {
  it("shows the answer and its source, but no section link at all, for a skills evidence line", async () => {
    // Skills evidence is indexed but no subject of it (a skill category) is
    // rendered anywhere on the page, so its document carries no section (see `Document` in answer-corpus.ts). The
    // precondition is asserted rather than assumed: if this query stops
    // retrieving a sectionless passage, the test must fail, not pass having
    // checked a different answer.
    const question = "what languages does he know";
    const sectionless = answer(question, 3).filter((result) => result.sectionId === undefined);
    expect(sectionless.length, "the probe no longer retrieves a skills passage").toBeGreaterThan(0);

    const user = userEvent.setup({ delay: null });
    render(<AskThisSite liveModeConfigured={false} />);
    await user.type(questionField(), question);
    await user.keyboard("{Enter}");

    const answers = await screen.findByRole("list", { name: "Sourced answers" });
    expect(passage(answers, sectionless[0].text)).toBeInTheDocument();
    const item = passage(answers, sectionless[0].text).closest("li");
    expect(item).not.toBeNull();
    expect(within(item as HTMLElement).queryByRole("link")).toBeNull();
    expect(within(item as HTMLElement).getByText(sectionless[0].source)).toBeInTheDocument();
  });
});

/**
 * The panel's promise, in its own words. Not every answer is a sentence quoted
 * whole: some documents join a record's fields into one line. So the copy
 * says "comes from what's written", never "quoted word for word". (It said
 * "or a count made from them" while the globe's computed plaques were in the
 * corpus; round 20 retired them, and with them every count.) Pinned
 * exactly, because a false sentence here is the defect this file guards.
 */
describe("AskThisSite -- what it says about its answers", () => {
  it("says, before any question, that answers come from what's written, or joined from it", () => {
    render(<AskThisSite liveModeConfigured={false} />);
    expect(
      screen.getByText(
        "Pick a question or ask your own. Every answer is something I’ve written here, as written or a few lines of it joined into one, with where it came from. No model, nothing generated. If I haven’t written it down, I’ll say so.",
      ),
    ).toBeVisible();
    expect(screen.queryByText(/word for word/)).toBeNull();
  });

  it("declines a question nothing answers without claiming everything is quoted", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AskThisSite liveModeConfigured={false} />);
    await user.type(questionField(), "what is the capital of France");
    await user.keyboard("{Enter}");
    expect(
      screen.getByText(
        "I haven’t written anything here that answers that, so I’d rather say so than guess.",
      ),
    ).toBeVisible();
  });
});

/**
 * Round 24: each turn is paper exchanged on the notepad. What jsdom can pin is
 * the markup the paper carries and the words it says; the look itself is
 * checked in a browser (e2e/ask.spec.ts and the round's screenshots).
 */
describe("figureRuns -- measured values are found, not authored", () => {
  function figures(text: string): string[] {
    return figureRuns(text)
      .filter((run) => run.figure)
      .map((run) => run.text);
  }

  it("finds magnitudes, pluses, percentages and time units", () => {
    expect(
      figures(
        "3M+ records at USC; 20+ live retailer integrations and 30+ scrapers in a week at DoorDash; Damerau–Levenshtein matching over 1M+ records at Schaeffler.",
      ),
    ).toEqual(["3M+", "20+", "30+", "1M+"]);
    expect(figures("Uptime held at 99.9% while failures fell from 3.9% to zero.")).toEqual(["99.9%", "3.9%"]);
    expect(figures("Time to a feasibility answer: Days of manual investigation → Under 1 hour, end to end.")).toEqual([
      "1 hour",
    ]);
  });

  it("reads a before and after as one measurement", () => {
    expect(figures("Legacy scraper runtime: 17 hours → 3 minutes.")).toEqual(["17 hours → 3 minutes"]);
    expect(figures("runtime 17 hours to 3 minutes, coverage 654 to 1,529 products")).toEqual([
      "17 hours to 3 minutes",
      "654 to 1,529",
    ]);
    expect(figures("onboarded merchants went from 2 to 25 a month.")).toEqual(["2 to 25"]);
    expect(figures("17h → 3m")).toEqual(["17h → 3m"]);
  });

  it("leaves dates, ordinals, number words and glued digits as prose", () => {
    expect(figures("I moved in December 2018, at fifteen, with my family.")).toEqual([]);
    expect(figures("Every year from 2021 to 2025, and the 1990s before me.")).toEqual([]);
    expect(figures("2nd Place, with a team of three, on Next.js v16 and H2O.")).toEqual([]);
  });

  it("cuts the passage without losing a character", () => {
    for (const question of ["What have you measured?", "What do you do at DoorDash?", "scraper", "awards"]) {
      for (const result of answer(question)) {
        expect(figureRuns(result.text).map((run) => run.text).join("")).toBe(result.text);
      }
    }
  });
});

describe("AskThisSite -- paper, exchanged (round 24)", () => {
  it("hands the question over as a numbered slip, its number for the eye only", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AskThisSite liveModeConfigured={false} />);
    await user.click(screen.getByRole("button", { name: "What do you do at DoorDash?" }));
    await user.click(screen.getByRole("button", { name: "What have you measured?" }));

    const turns = within(conversationRegion()).getByRole("list", { name: "Conversation" });
    const second = within(turns)
      .getAllByRole("listitem")
      .filter((el) => el.parentElement === turns)[1] as HTMLElement;
    expect(within(second).getByText("you asked")).toBeInTheDocument();
    expect(within(second).getByText("What have you measured?")).toBeInTheDocument();
    // The stub's number is the turn's place in the thread, hidden from
    // assistive tech (it hears "you asked" and the question).
    const stub = second.querySelector(".ask-slip-stub");
    expect(stub).toHaveTextContent("No.02");
    expect(stub).toHaveAttribute("aria-hidden", "true");
  });

  it("sets the measured values of a clipping in accent mono, the passage's words unchanged", async () => {
    const question = "What have you measured?";
    const measured = answer(question).find((result) => result.text.includes("17 hours → 3 minutes"));
    expect(measured, "the probe no longer retrieves the scraper benchmark").toBeDefined();

    const user = userEvent.setup({ delay: null });
    render(<AskThisSite liveModeConfigured={false} />);
    await user.click(screen.getByRole("button", { name: question }));

    const answers = await screen.findByRole("list", { name: "Sourced answers" });
    const text = passage(answers, measured!.text);
    const figure = text.querySelector(".ask-figure");
    expect(figure).toHaveTextContent("17 hours → 3 minutes");
    // The source is inked on under it, and its section is a tab off the edge.
    const clipping = text.closest("li") as HTMLElement;
    expect(within(clipping).getByText(measured!.source)).toBeInTheDocument();
    expect(within(clipping).getByRole("link", { name: `More on this in ${measured!.sectionLabel}` })).toHaveAttribute(
      "href",
      `#${measured!.sectionId}`,
    );
  });

  it("keeps Prose and Code as two tabs under \"I said\", the label outside the tablist", async () => {
    const user = userEvent.setup({ delay: null });
    render(<AskThisSite liveModeConfigured={false} />);
    await user.click(screen.getByRole("button", { name: "What have you measured?" }));

    const tablist = screen.getByRole("tablist", { name: "Answer view" });
    expect(within(tablist).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Prose", "Code"]);
    expect(within(tablist).queryByText("I said")).toBeNull();
    expect(within(conversationRegion()).getByText("I said")).toBeInTheDocument();
  });

  it("thinks in ink while a live answer is on its way, never a spinner", async () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    const user = userEvent.setup({ delay: null });
    const { container } = render(<AskThisSite liveModeConfigured={true} />);
    await user.click(screen.getByRole("button", { name: "What have you measured?" }));

    const writing = await screen.findByText("writing");
    expect(writing.querySelectorAll(".ask-ink-dots > span")).toHaveLength(3);
    expect(writing.querySelector(".ask-ink-dots")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector(".animate-spin")).toBeNull();
    vi.unstubAllGlobals();
  });

  it("types a live model's answer rather than clipping it, labelled and grounded", async () => {
    const [citation] = answer("What have you measured?");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            ok: true,
            grounded: true,
            text: "I took a scraper from 17 hours to 3 minutes.",
            citations: [citation],
          }),
      }),
    );
    const user = userEvent.setup({ delay: null });
    render(<AskThisSite liveModeConfigured={true} />);
    await user.click(screen.getByRole("button", { name: "What have you measured?" }));

    const typed = await screen.findByText((_, element) =>
      element?.tagName === "P" && element.textContent === "I took a scraper from 17 hours to 3 minutes.",
    );
    expect(typed.closest(".ask-typed")).not.toBeNull();
    expect(typed.closest(".ask-clip")).toBeNull();
    expect(typed.querySelector(".ask-figure")).toHaveTextContent("17 hours to 3 minutes");
    expect(screen.getByText("Live model")).toBeInTheDocument();
    const grounded = screen.getByRole("list", { name: "Grounded in" });
    expect(within(grounded).getByText(citation.source, { exact: false })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("writes the promise on ruled lines under a blank slip while nothing is asked", () => {
    render(<AskThisSite liveModeConfigured={false} />);
    const region = conversationRegion();
    expect(within(region).getByText("No question asked yet.").closest(".ask-slip")).not.toBeNull();
    expect(within(region).getByText(/^Pick a question or ask your own\./)).toHaveClass("ask-lined");
    // "I said" stays its own words: the cats' parking test reads it.
    expect(within(region).getByText("I said")).toBeInTheDocument();
  });
});
