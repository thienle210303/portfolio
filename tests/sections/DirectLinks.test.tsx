import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import DirectLinks from "@/sections/Contact/DirectLinks";
import Contact from "@/sections/Contact/Contact";
import { profile, socialLinks } from "@/content/portfolio";

describe("the no-form row", () => {
  it("offers the résumé PDF at the path the profile names, in a new tab", () => {
    render(<DirectLinks />);
    const link = screen.getByRole("link", { name: /résumé/i });
    expect(link).toHaveAttribute("href", profile.resumePdf);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(link).toHaveAccessibleName(/opens in a new tab/i);
  });

  it("restates nothing the business card already carries", () => {
    render(<DirectLinks />);
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    for (const link of socialLinks) expect(hrefs).not.toContain(link.href);
    expect(hrefs.some((h) => h?.startsWith("mailto:"))).toBe(false);
  });

  it("uses no accent fill: the send button is the section's one primary", () => {
    const { container } = render(<DirectLinks />);
    expect(container.innerHTML).not.toMatch(/\bbg-accent\b/);
  });
});

describe("Contact with the no-form row", () => {
  it("renders the résumé link once, outside the business card aside", () => {
    const { container } = render(<Contact emailDeliveryConfigured={false} />);
    const asides = container.querySelectorAll("aside");
    expect(asides).toHaveLength(1);
    expect(within(asides[0] as HTMLElement).queryByRole("link", { name: /résumé/i })).toBeNull();
    expect(screen.getAllByRole("link", { name: /résumé/i })).toHaveLength(1);
  });
});
