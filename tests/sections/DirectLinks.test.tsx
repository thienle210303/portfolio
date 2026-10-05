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
    const { container } = render(<Contact emailDeliveryConfigured={false} askLiveModeConfigured={false} />);
    const asides = container.querySelectorAll("aside");
    expect(asides).toHaveLength(1);
    expect(within(asides[0] as HTMLElement).queryByRole("link", { name: /résumé/i })).toBeNull();
    expect(screen.getAllByRole("link", { name: /résumé/i })).toHaveLength(1);
  });
});

describe("booking in the no-form row", () => {
  const url = "https://cal.com/thienle/20min";

  it("renders no booking link, label or 'undefined' when no URL is configured", () => {
    const { container } = render(<DirectLinks bookingUrl={undefined} />);
    expect(screen.queryByRole("link", { name: /twenty minutes/i })).toBeNull();
    expect(container.textContent).not.toMatch(/undefined|null/);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("renders a plain external link when an https URL is configured", () => {
    const { container } = render(<DirectLinks bookingUrl={url} />);
    const link = screen.getByRole("link", { name: /book twenty minutes/i });
    expect(link).toHaveAttribute("href", url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(container.querySelector("script, iframe")).toBeNull();
    expect(container.innerHTML).not.toMatch(/\bbg-accent\b/);
  });

  it.each(["cal.com/thienle/20min", "http://cal.com/x", "javascript:alert(1)", "", "   "])(
    "renders nothing for the non-https value %j",
    (bad) => {
      render(<DirectLinks bookingUrl={bad} />);
      expect(screen.queryByRole("link", { name: /twenty minutes/i })).toBeNull();
      expect(screen.getAllByRole("link")).toHaveLength(1);
    },
  );

  it("labels the row so a list of links is not unexplained", () => {
    render(<DirectLinks bookingUrl={url} />);
    const list = screen.getByRole("list", { name: /skip the form/i });
    expect(within(list).getAllByRole("link")).toHaveLength(2);
  });
});

describe("Contact with a booking URL", () => {
  it("shows the booking link once, outside the card, only when given", () => {
    const { container, rerender } = render(<Contact emailDeliveryConfigured={false} askLiveModeConfigured={false} />);
    expect(screen.queryByRole("link", { name: /twenty minutes/i })).toBeNull();
    rerender(<Contact emailDeliveryConfigured={false} askLiveModeConfigured={false} bookingUrl="https://cal.com/a/b" />);
    expect(screen.getAllByRole("link", { name: /twenty minutes/i })).toHaveLength(1);
    const aside = container.querySelector("aside") as HTMLElement;
    expect(within(aside).queryByRole("link", { name: /twenty minutes/i })).toBeNull();
  });
});
