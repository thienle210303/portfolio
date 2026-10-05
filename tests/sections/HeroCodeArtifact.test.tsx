import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { codeTabs } from "@/content/portfolio";
import HeroCodeArtifact from "@/sections/Hero/HeroCodeArtifact";

/**
 * Round 12, WP-K: the hero code artifact tightened its own frame (smaller
 * type/padding, via `CodeBlock`'s `compact` prop — see `CodeBlock.test.tsx`
 * for that prop's own coverage). Round 18 moved its fourth tab, "Ask
 * Thien", into Contact (`#ask`), so the artifact is back to the three
 * authored code tabs. This file is scoped to what belongs to the artifact
 * itself: the tab set, the tabs staying `compact`, and the wrapper's own
 * tightened padding.
 */

describe("HeroCodeArtifact", () => {
  it("renders exactly the three authored code tabs, in order, and no chat", () => {
    render(<HeroCodeArtifact />);
    const tablist = screen.getByRole("tablist", { name: "Code artifact tabs" });
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(codeTabs.map((tab) => tab.label));
    expect(tabs.map((tab) => tab.textContent)).toEqual(["The globe", "The rule", "The overlap"]);
    expect(screen.queryByRole("tab", { name: "Ask Thien" })).not.toBeInTheDocument();
  });

  it("keeps the first authored tab (The globe) active by default", () => {
    render(<HeroCodeArtifact />);
    expect(screen.getByRole("tab", { name: "The globe" })).toHaveAttribute("aria-selected", "true");
  });

  it("renders the active authored tab's CodeBlock in compact mode (smaller padding than the ordinary default)", () => {
    const { container } = render(<HeroCodeArtifact />);
    const region = screen.getByRole("region", { name: "src/lib/globe.ts" });
    expect(region).toHaveClass("p-3");
    expect(region).not.toHaveClass("p-4");

    const codeEl = container.querySelector("code");
    expect(codeEl).toHaveClass("text-[length:var(--step--2)]");
  });

  it("shows where the active excerpt came from, under the panel", () => {
    render(<HeroCodeArtifact />);
    expect(screen.getByText(codeTabs[0].source)).toBeInTheDocument();
  });

  it("tightened the wrapper's own padding from p-4 to p-3", () => {
    const { container } = render(<HeroCodeArtifact />);
    const wrapper = container.querySelector('[data-hero-step="code"]');
    expect(wrapper).toHaveClass("p-3");
    expect(wrapper).not.toHaveClass("p-4");
  });
});
