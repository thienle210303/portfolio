import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import Hero from "@/sections/Hero/Hero";
import { profile } from "@/content/portfolio";

/**
 * Round 18, Plan B Task 2: one fold, two columns. The About band that used to
 * sit under the fold is merged into it, so everything About says renders in
 * the identity column or the margin rail — once each.
 */

function renderHero() {
  const { container } = render(<Hero />);
  const rail = container.querySelector<HTMLElement>("dl.rail");
  if (!rail) throw new Error("Hero rendered no margin rail");
  return { container, rail };
}

describe("About", () => {
  it("opens on where he came from", () => {
    renderHero();
    expect(screen.getByText(/Kiên Giang/)).toBeInTheDocument();
  });

  it("renders the positioning line and every About paragraph, verbatim", () => {
    renderHero();
    // The chat corpus cites #about for each of these (answer-corpus.ts), so
    // each must be printed there whole.
    expect(screen.getByText(profile.positioning)).toBeInTheDocument();
    for (const paragraph of profile.about) {
      expect(screen.getByText(paragraph)).toBeInTheDocument();
    }
  });

  it("carries the location and availability in the rail", () => {
    const { rail } = renderHero();
    expect(within(rail).getByText(/Taylors, South Carolina/)).toBeInTheDocument();
    expect(within(rail).getByText(/Open to remote/)).toBeInTheDocument();
  });

  it("says location and availability once — no second metadata row", () => {
    renderHero();
    // The rail is the one place for these. The old identity-column <dl>
    // labelled them "Location" / "Availability".
    expect(screen.getAllByText(profile.availability as string)).toHaveLength(1);
    expect(screen.getAllByText(profile.location as string)).toHaveLength(1);
    expect(screen.queryByText("Location")).toBeNull();
    expect(screen.queryByText("Availability")).toBeNull();
  });

  it("renders the focus line in the rail", () => {
    // answer-corpus.ts cites #about for `profile.focus`; it has to be there.
    const { rail } = renderHero();
    expect(within(rail).getByText(profile.focus)).toBeInTheDocument();
  });

  it("has exactly one h1 and no h2 of its own", () => {
    // Hero owns the page's only h1, and nothing here may be an h2 — every
    // other section's h2 comes from SectionHeading, so a stray one here
    // breaks the document-wide heading order check in e2e.
    renderHero();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
  });

  it("no longer renders the Ask panel", () => {
    // It moved to Contact in Task 7.
    renderHero();
    expect(screen.queryByRole("tab", { name: /ask/i })).toBeNull();
  });

  it("drops the band's counts and lens list", () => {
    renderHero();
    expect(screen.queryByText("By the numbers")).toBeNull();
    expect(screen.queryByText("Where it shows up")).toBeNull();
  });

  it("asks for nothing in blue — the page's one primary control is in Contact", () => {
    const { container } = renderHero();
    const explore = screen.getByRole("link", { name: "Explore my work" });
    expect(explore.className).not.toMatch(/bg-\[color:var\(--accent\)\]/);
    for (const element of container.querySelectorAll<HTMLElement>("[class]")) {
      expect(element.className).not.toMatch(/(^|\s)bg-\[color:var\(--accent\)\]/);
      expect(element.className).not.toMatch(/(^|\s)bg-accent(\s|$)/);
    }
  });

  it("keeps the résumé link and the cats' perch", () => {
    const { container } = renderHero();
    expect(screen.getByRole("link", { name: "Open résumé" })).toHaveAttribute("href", "/resume");
    const perch = container.querySelector("[data-cat-perch]");
    expect(perch).not.toBeNull();
    expect(perch).toHaveTextContent("Scroll");
  });

  it("keeps About to three paragraphs", () => {
    // Sixty seconds, not a biography. The owner asked for a "quick less
    // introduction".
    expect(profile.about).toHaveLength(3);
  });
});
