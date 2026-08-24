import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AskThienHeroTab from "@/sections/Hero/AskThienHeroTab";

/**
 * `AskThienHeroTab` is the always-in-the-hero-bundle half of the "Ask Thien"
 * tab: a loading line plus one `import()` of `AskThienMini`, the module that
 * actually pulls in `@/lib/answers` (the lexical index over the whole
 * site). Mounting *is* activation here — `HeroCodeArtifact`'s `Tabs` only
 * ever renders the active panel, so this component's function body runs for
 * the first time exactly when a visitor selects the "Ask Thien" tab. What
 * this file pins: the mount-triggers-import contract, and that a loading
 * state is shown (and announced) in between.
 */

vi.mock("@/sections/AIWorkflowLab/AskThienMini", () => ({
  default: () => <div data-testid="mini-chat">The real mini chat</div>,
}));

describe("AskThienHeroTab", () => {
  it("shows an announced loading state immediately on mount, before the chunk resolves", () => {
    render(<AskThienHeroTab />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("dynamically imports and renders the mini chat once the import resolves", async () => {
    render(<AskThienHeroTab />);
    expect(screen.queryByTestId("mini-chat")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("mini-chat")).toBeInTheDocument();
    });

    // The loading line is gone once the real panel has taken its place.
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
  });
});
