import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import BusinessCard from "@/sections/Contact/BusinessCard";
import { profile } from "@/content/portfolio";

const BOOKING = "https://cal.com/thienle/20min";

describe("my business card", () => {
  it("carries every way to reach me", () => {
    render(<BusinessCard bookingUrl={BOOKING} />);
    expect(screen.getByText(profile.name)).toBeInTheDocument();
    expect(screen.getByText(profile.title)).toBeInTheDocument();
    expect(screen.getByText(profile.location)).toBeInTheDocument();
    // The chat corpus cites the philosophy line to Contact; keep it on the card.
    expect(screen.getByText(profile.philosophy)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: profile.email })).toHaveAttribute("href", `mailto:${profile.email}`);
    expect(screen.getByRole("button", { name: "Copy email address" })).toBeInTheDocument();
    const github = screen.getByRole("link", { name: /^GitHub/ });
    expect(github).toHaveAttribute("href", "https://github.com/thienle210303");
    // The visible text is part of the name (WCAG 2.5.3).
    expect(github).toHaveAccessibleName(/^GitHub github\.com\/thienle210303/);
    expect(screen.getByRole("link", { name: /^LinkedIn/ })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: /^Book a call/ })).toHaveAttribute("href", BOOKING);
    expect(screen.getByRole("link", { name: "Résumé" })).toHaveAttribute("href", "/resume");
    const vcf = screen.getByRole("link", { name: "Save contact" });
    expect(vcf).toHaveAttribute("href", "/contact.vcf");
    expect(vcf).toHaveAttribute("download");
  });

  it("is stamped with my name in Vietnamese", () => {
    const { container } = render(<BusinessCard bookingUrl={null} />);
    const seal = container.querySelector("[lang=vi]");
    expect(seal).toHaveTextContent("Thiện Lê");
    expect(seal?.closest("p")).toHaveTextContent("My seal: Thiện Lê");
  });

  it("has nothing to turn over: no flip, no form on the card", () => {
    const { container } = render(<BusinessCard bookingUrl={null} />);
    expect(container.querySelector("[data-flip], form")).toBeNull();
    expect(screen.queryByRole("button", { name: "Let me reach you" })).toBeNull();
  });

  it("renders no booking link without a booking URL", () => {
    const { container } = render(<BusinessCard bookingUrl={null} />);
    expect(screen.queryByRole("link", { name: /book a call/i })).toBeNull();
    expect(container.textContent).not.toMatch(/undefined|null/);
  });

  it("is an aside the companion can hide behind, with its decorations out of the tree", () => {
    const { container } = render(<BusinessCard bookingUrl={null} />);
    const aside = container.querySelector("aside")!;
    expect(aside).toHaveAttribute("aria-label", `${profile.name} — business card`);
    expect(aside).toHaveAttribute("data-cat-hide");
    for (const deco of container.querySelectorAll("[data-scenery], [data-monogram]")) {
      expect(deco.closest("[aria-hidden=true]")).not.toBeNull();
    }
    expect(container.querySelector("[data-monogram]")).toHaveAttribute("data-monogram", profile.monogram);
  });
});
