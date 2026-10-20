import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@testing-library/react";
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

describe("CompanionCat", () => {
  beforeEach(() => media(false));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("draws each cat from its own sheet", () => {
    const moon = render(<CompanionCat variant="grey" pose="walk" phase={0.3} blinking={false} />);
    expect(hrefs(moon.container)).toEqual(["/cats/moon.svg#walk-2"]);
    const mi = render(<CompanionCat variant="tabby" pose="sleep" phase={0} blinking />);
    expect(hrefs(mi.container)).toEqual(["/cats/mi.svg#react-8"]);
  });

  it("a sitting cat has a tail to sway under its body", () => {
    const { container } = render(<CompanionCat variant="tabby" pose="sit" phase={0} blinking={false} />);
    expect(hrefs(container)).toEqual(["/cats/mi.svg#tail", "/cats/mi.svg#look-4"]);
    expect(container.querySelector("svg")?.getAttribute("data-cat-pose")).toBe("sit");
  });

  it("the police cat only stands and walks", () => {
    const { container } = render(<CompanionCat variant="police" pose="sit" phase={0} blinking />);
    expect(hrefs(container)).toEqual(["/cats/police.svg#tail", "/cats/police.svg#look-4"]);
  });

  it("a press on the cat's button holds one reaction, then lets go", () => {
    vi.useFakeTimers();
    const { container } = render(
      <button type="button">
        <CompanionCat variant="grey" pose="sit" phase={0} blinking={false} />
      </button>,
    );
    fireEvent.click(container.querySelector("button")!);
    expect(hrefs(container)).toContain("/cats/moon.svg#react-2");
    act(() => vi.advanceTimersByTime(800));
    expect(hrefs(container)).toContain("/cats/moon.svg#look-4");
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
    expect(hrefs(container)).toContain("/cats/moon.svg#look-5");
  });
});
