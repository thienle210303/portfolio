import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import HeroTerminal from "@/sections/Hero/HeroTerminal";
import { buildTerminal } from "@/lib/terminal";

describe("HeroTerminal", () => {
  it("renders one tab per terminal tab, whoami first, on a contrast card", () => {
    const { container } = render(<HeroTerminal />);
    const tabs = within(screen.getByRole("tablist", { name: "Terminal" })).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(buildTerminal().map((tab) => tab.id));
    expect(container.firstElementChild?.className).toMatch(/(^|\s)tone-contrast(\s|$)/);
    expect(container.textContent?.toLowerCase()).not.toContain("source code");
  });

  it("types whoami once: its lines are marked on first mount, not after a switch back", async () => {
    // TypeOnce remembers in module scope (per page load); start from a fresh module.
    vi.resetModules();
    const { default: FreshTerminal } = await import("@/sections/Hero/HeroTerminal");
    const { container } = render(<FreshTerminal />);
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveTextContent("$ whoami");
    expect(panel).toHaveTextContent("motto: Practice makes AI.");
    expect(panel).toHaveTextContent('cats: ["Moon", "Mi"]');
    expect(container.querySelector("[data-typing]")).not.toBeNull();
    expect(panel.querySelectorAll("[data-type-line]").length).toBe(buildTerminal()[0].lines.length + 1);

    const [whoami, now] = screen.getAllByRole("tab");
    fireEvent.click(now);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("$ now");
    expect(screen.getByRole("tabpanel").querySelector("[data-type-line]")).toBeNull();

    fireEvent.click(whoami);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("motto: Practice makes AI.");
    expect(container.querySelector("[data-typing]")).toBeNull();
  });
});
