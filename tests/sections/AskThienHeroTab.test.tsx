import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AskThienHeroTab from "@/sections/Hero/AskThienHeroTab";

/**
 * `AskThienHeroTab` is the always-in-the-hero-bundle half of the "Ask Thien"
 * tab: a loading line plus one `import()` of `AskThisSite`, the module that
 * pulls in `@/lib/answers` (the lexical index over the whole site). Mounting
 * *is* activation — `HeroCodeArtifact`'s `Tabs` renders only the active
 * panel — so this component's body first runs when a visitor selects the
 * tab. What this file pins: the mount-triggers-import contract, that the
 * live-mode flag reaches the chat, and that a failed import says so out loud
 * and offers a retry.
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
 * lands in the same `.catch()` a real network failure would.
 */
const chunkState = vi.hoisted(() => ({ fail: false }));

vi.mock("@/sections/Hero/AskThisSite", () => ({
  get default() {
    if (chunkState.fail) throw new Error("chunk failed");
    return function Chat({ liveModeConfigured }: { readonly liveModeConfigured: boolean }) {
      return <div data-testid="chat">chat live={String(liveModeConfigured)}</div>;
    };
  },
}));

beforeEach(() => {
  chunkState.fail = false;
});

describe("AskThienHeroTab", () => {
  it("shows an announced loading state immediately on mount", () => {
    render(<AskThienHeroTab liveModeConfigured={false} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("imports and renders the full chat once the import resolves", async () => {
    render(<AskThienHeroTab liveModeConfigured={false} />);
    expect(screen.queryByTestId("chat")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("chat")).toBeInTheDocument());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("passes the live-mode flag through to the chat", async () => {
    render(<AskThienHeroTab liveModeConfigured={true} />);
    await waitFor(() => expect(screen.getByTestId("chat")).toHaveTextContent("live=true"));
  });
});

describe("AskThienHeroTab when the chunk cannot be fetched", () => {
  it("says so out loud instead of sitting on a loading line", async () => {
    chunkState.fail = true;
    render(<AskThienHeroTab liveModeConfigured={false} />);

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
    render(<AskThienHeroTab liveModeConfigured={false} />);
    const retry = await screen.findByRole("button", { name: /try again/i });

    chunkState.fail = false;
    await userEvent.setup().click(retry);

    await waitFor(() => expect(screen.getByTestId("chat")).toBeInTheDocument());
  });
});
