import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import CompanionCat from "@/components/companion/CompanionCat";

const hrefs = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("use")).map((use) => use.getAttribute("href"));

function media(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
}

/** The sheets are fetched once each and put on the page; any symbol will do. */
function sheets() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('<svg><symbol id="look-4"></symbol></svg>') }),
  );
}

describe("CompanionCat", () => {
  beforeEach(() => {
    media(false);
    sheets();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("draws each cat from its own sheet, fetched once and put on the page", async () => {
    const moon = render(<CompanionCat variant="grey" pose="walk" phase={0.3} blinking={false} />);
    await waitFor(() => expect(hrefs(moon.container)).toEqual(["#cat-moon-walk-2"]));
    const mi = render(<CompanionCat variant="tabby" pose="sleep" phase={0} blinking />);
    await waitFor(() => expect(hrefs(mi.container)).toEqual(["#cat-mi-react-8"]));
    expect(document.querySelector("#cat-sheets #cat-moon-look-4")).not.toBeNull();
    render(<CompanionCat variant="grey" pose="sit" phase={0} blinking={false} />);
    // Once each, however many cats draw from it.
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => url === "/cats/moon.svg")).toHaveLength(1);
  });

  it("a sitting cat has a tail to sway under its body", async () => {
    const { container } = render(<CompanionCat variant="tabby" pose="sit" phase={0} blinking={false} />);
    await waitFor(() => expect(hrefs(container)).toEqual(["#cat-mi-tail", "#cat-mi-look-4"]));
    expect(container.querySelector("svg")?.getAttribute("data-cat-pose")).toBe("sit");
  });

  it("the police cat only stands and walks", async () => {
    const { container } = render(<CompanionCat variant="police" pose="sit" phase={0} blinking />);
    await waitFor(() => expect(hrefs(container)).toEqual(["#cat-police-tail", "#cat-police-look-4"]));
  });

  it("a press on the cat's button holds one reaction, then lets go", () => {
    // Moon's sheet is on the page already (the first test fetched it).
    vi.useFakeTimers();
    const { container } = render(
      <button type="button">
        <CompanionCat variant="grey" pose="sit" phase={0} blinking={false} />
      </button>,
    );
    fireEvent.click(container.querySelector("button")!);
    expect(hrefs(container)).toContain("#cat-moon-react-2");
    act(() => vi.advanceTimersByTime(800));
    expect(hrefs(container)).toContain("#cat-moon-look-4");
  });

  it("does not follow the pointer when motion is reduced or the pointer is coarse", () => {
    const add = vi.spyOn(window, "addEventListener");
    render(<CompanionCat variant="grey" pose="sit" phase={0} blinking={false} />);
    expect(add.mock.calls.some(([type]) => type === "pointermove")).toBe(false);
    add.mockRestore();
  });

  it("follows a fine pointer while sitting", () => {
    media(true);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    const { container } = render(<CompanionCat variant="grey" pose="sit" phase={0} blinking={false} />);
    const svg = container.querySelector("svg")!;
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 50, height: 42 }) as DOMRect;
    act(() => {
      window.dispatchEvent(Object.assign(new MouseEvent("pointermove", { clientX: 400, clientY: 21 }), { pointerType: "mouse" }));
    });
    expect(hrefs(container)).toContain("#cat-moon-look-5");
  });
});
