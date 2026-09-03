import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HeroCodeArtifact from "@/sections/Hero/HeroCodeArtifact";

/**
 * Round 12, WP-K: the hero code artifact tightened its own frame (smaller
 * type/padding, via `CodeBlock`'s `compact` prop — see `CodeBlock.test.tsx`
 * for that prop's own coverage) and gained a fourth tab, "Ask Thien". This
 * file is scoped to what belongs to the artifact itself: the tab set, the
 * three authored tabs staying `compact`, and the wrapper's own tightened
 * padding. `AskThienHeroTab`'s lazy-loading contract has its own test file.
 */

// `AskThienHeroTab` is a real "use client" component with its own effect
// (the dynamic import behind the fourth tab); mocked here to a plain marker
// so this file can assert the tab *exists* and is wired into the same
// tablist without needing jsdom to resolve a dynamic import.
vi.mock("@/sections/Hero/AskThienHeroTab", () => ({
  default: ({ liveModeConfigured }: { liveModeConfigured: boolean }) => (
    <div data-testid="ask-thien-mock">Ask Thien panel live={String(liveModeConfigured)}</div>
  ),
}));

describe("HeroCodeArtifact", () => {
  it("renders exactly four tabs: the three authored code tabs plus Ask Thien, in that order", () => {
    render(<HeroCodeArtifact liveModeConfigured={false} />);
    const tablist = screen.getByRole("tablist", { name: "Code artifact tabs" });
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Profile",
      "Principles",
      "Currently exploring",
      "Ask Thien",
    ]);
  });

  it("keeps the first authored tab (Profile) active by default, not Ask Thien", () => {
    render(<HeroCodeArtifact liveModeConfigured={false} />);
    expect(screen.getByRole("tab", { name: "Profile" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Ask Thien" })).toHaveAttribute("aria-selected", "false");
    // Only the active panel mounts (Tabs' own contract) -- the mocked Ask
    // Thien panel must not be in the document until its tab is selected.
    expect(screen.queryByTestId("ask-thien-mock")).not.toBeInTheDocument();
  });

  it("renders the active authored tab's CodeBlock in compact mode (smaller padding than the ordinary default)", () => {
    const { container } = render(<HeroCodeArtifact liveModeConfigured={false} />);
    const region = screen.getByRole("region", { name: "builder.ts" });
    expect(region).toHaveClass("p-3");
    expect(region).not.toHaveClass("p-4");

    const codeEl = container.querySelector("code");
    expect(codeEl).toHaveClass("text-[length:var(--step--2)]");
  });

  it("tightened the wrapper's own padding from p-4 to p-3", () => {
    const { container } = render(<HeroCodeArtifact liveModeConfigured={false} />);
    const wrapper = container.querySelector('[data-hero-step="code"]');
    expect(wrapper).toHaveClass("p-3");
    expect(wrapper).not.toHaveClass("p-4");
  });

  it("hands the live-mode flag to the Ask Thien panel", async () => {
    render(<HeroCodeArtifact liveModeConfigured={true} />);
    await userEvent.setup().click(screen.getByRole("tab", { name: "Ask Thien" }));
    expect(screen.getByTestId("ask-thien-mock")).toHaveTextContent("live=true");
  });
});
