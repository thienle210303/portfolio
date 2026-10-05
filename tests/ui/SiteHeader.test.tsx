import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SiteHeader from "@/components/layout/SiteHeader";

describe("SiteHeader", () => {
  it("draws \"Let's talk\" as an outline, not a blue fill", () => {
    // The header is on every screen, Contact's included, and Contact's send
    // button is the one blue primary control there (round 18, spec §4).
    render(<SiteHeader />);
    const cta = screen.getByRole("link", { name: "Let’s talk" });
    expect(cta).toHaveAttribute("href", "#contact");
    expect(cta.className).not.toMatch(/(^|\s)bg-accent(\s|$)/);
    expect(cta.className).not.toMatch(/(^|\s)bg-\[color:var\(--accent\)\]/);
    expect(cta.className).toMatch(/(^|\s)border-\[color:var\(--rule-color\)\]/);
  });
});
