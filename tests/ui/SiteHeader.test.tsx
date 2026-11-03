import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SiteHeader from "@/components/layout/SiteHeader";

describe("SiteHeader", () => {
  it("draws \"Let's talk\" as a postage stamp, not a control fill", () => {
    // The header is on every screen, Contact's included, and Contact's send
    // button is the one primary control there (round 18, spec §4).
    const { container } = render(<SiteHeader />);
    const cta = screen.getByRole("link", { name: "Let’s talk" });
    expect(cta).toHaveAttribute("href", "#contact");
    const html = container.querySelector("header")!.innerHTML;
    expect(html).not.toMatch(/bg-control|var\(--control\)|--mark|bg-mark/);
    expect(cta.className).toMatch(/(^|\s)nav-stamp(\s|$)/);
    expect(cta.querySelector(".nav-stamp-paper")).not.toBeNull();
  });

  it("is no bar: transparent, borderless, and it passes clicks through to the page", () => {
    const { container } = render(<SiteHeader />);
    const cls = container.querySelector("header")!.className;
    expect(cls).not.toMatch(/(^|\s)sky-fill(\s|$)/);
    expect(cls).not.toMatch(/(^|\s)bg-/);
    expect(cls).not.toMatch(/(^|\s)border/);
    expect(cls).toMatch(/(^|\s)pointer-events-none(\s|$)/);
  });

  it("puts the nav and the theme switch on one strip of paper whose wrapper has no transform or filter", () => {
    // The phone menu's panel is position: fixed inside the strip; a transform or
    // filter on the strip would make it, not the window, the panel's box.
    const { container } = render(<SiteHeader />);
    const strip = container.querySelector(".nav-strip")!;
    expect(strip).not.toBeNull();
    expect(strip.className).not.toMatch(/rotate|filter|drop-shadow|backdrop|transform|will-change/);
    expect(strip.querySelector(".nav-paper-shadow .nav-paper")).not.toBeNull();
    expect(strip.querySelectorAll(".nav-tape")).toHaveLength(2);
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /switch to night theme/i })).toBeInTheDocument();
  });

  it("numbers nothing: the links say only their labels", () => {
    render(<SiteHeader />);
    const links = screen.getByRole("navigation", { name: "Primary" }).querySelectorAll("a");
    expect(links.length).toBeGreaterThan(0);
    for (const a of links) expect(a.textContent).not.toMatch(/\d/);
  });
});
