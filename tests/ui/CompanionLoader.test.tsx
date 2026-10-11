import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import CompanionLoader from "@/components/companion/CompanionLoader";
import type { CompanionFacts } from "@/lib/companion-facts";

vi.mock("@/components/companion/Companion", () => ({
  default: () => <div data-testid="companion" />,
}));

const facts = {} as CompanionFacts;
const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });

describe("CompanionLoader", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("cancelIdleCallback", vi.fn());
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders nothing before idle", async () => {
    vi.stubGlobal("requestIdleCallback", vi.fn());
    const { queryByTestId } = render(<CompanionLoader facts={facts} />);
    await flush();
    expect(queryByTestId("companion")).toBeNull();
  });

  it("renders Companion after idle callback", async () => {
    const ric = vi.fn((cb: () => void) => { cb(); return 1; });
    vi.stubGlobal("requestIdleCallback", ric);
    const { findByTestId } = render(<CompanionLoader facts={facts} />);
    await flush();
    expect(ric).toHaveBeenCalledWith(expect.any(Function), { timeout: 2000 });
    vi.useRealTimers();
    expect(await findByTestId("companion")).toBeTruthy();
  });

  it("falls back to setTimeout without requestIdleCallback", async () => {
    vi.stubGlobal("requestIdleCallback", undefined);
    const { queryByTestId, findByTestId } = render(<CompanionLoader facts={facts} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(1199); });
    expect(queryByTestId("companion")).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    vi.useRealTimers();
    expect(await findByTestId("companion")).toBeTruthy();
  });

  it("renders nothing when the import rejects", async () => {
    vi.resetModules();
    vi.doMock("@/components/companion/Companion", () => {
      throw new Error("chunk failed");
    });
    const { default: Loader } = await import("@/components/companion/CompanionLoader");
    vi.stubGlobal("requestIdleCallback", (cb: () => void) => { cb(); return 1; });
    const { queryByTestId, container } = render(<Loader facts={facts} />);
    await flush();
    vi.useRealTimers();
    await new Promise((r) => setTimeout(r, 20));
    expect(queryByTestId("companion")).toBeNull();
    expect(container.innerHTML).toBe("");
  });
});
