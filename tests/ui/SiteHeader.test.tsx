import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SiteHeader from "@/components/layout/SiteHeader";

describe("SiteHeader", () => {
  it("draws \"Let's talk\" as an outline, not a control fill", () => {
    // The header is on every screen, Contact's included, and Contact's send
    // button is the one primary control there (round 18, spec §4).
    render(<SiteHeader />);
    const cta = screen.getByRole("link", { name: "Let’s talk" });
    expect(cta).toHaveAttribute("href", "#contact");
    expect(cta.className).not.toMatch(/(^|\s)bg-control(\s|$)/);
    expect(cta.className).not.toMatch(/(^|\s)bg-\[color:var\(--control\)\]/);
    expect(cta.className).toMatch(/(^|\s)border-\[color:var\(--rule-color\)\]/);
  });

  it("paints the sky behind it, not a flat ground", () => {
    const { container } = render(<SiteHeader />);
    const cls = container.querySelector("header")!.className;
    expect(cls).toMatch(/(^|\s)sky-fill(\s|$)/);
    expect(cls).not.toMatch(/(^|\s)bg-ground(\s|$)/);
  });
});
