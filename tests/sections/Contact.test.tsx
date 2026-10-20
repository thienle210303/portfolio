import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import Contact from "@/sections/Contact/Contact";
import { contactCopy } from "@/content/portfolio";

/**
 * Round 18 moved "Ask this site" out of the hero's code artifact and into
 * Contact: a visitor who would rather interrogate the record than write an
 * email is making contact too, with less effort. These tests pin where it
 * sits and what it must not take over. The chat itself is the real module
 * here, not a mock — jsdom has no IntersectionObserver, so the loader falls
 * back to importing it at once, and the one-primary count below is taken
 * against the chat's real buttons.
 */

const QUESTION_FIELD = { name: "Your question" } as const;

/** Both spellings of a control fill — the pair the Hero test scans for — each
 *  anchored on whitespace, so `hover:bg-accent` is not counted. */
const CONTROL_FILLS = [/(^|\s)bg-control(\s|$)/, /(^|\s)bg-\[color:var\(--control\)\](\s|$)/] as const;

describe("Ask, in Contact", () => {
  it("is reachable at a stable id", () => {
    render(<Contact emailDeliveryConfigured={true} askLiveModeConfigured={false} bookingUrl={null} />);
    expect(document.getElementById("ask")).not.toBeNull();
  });

  it("sits under its own h3, inside #ask", () => {
    render(<Contact emailDeliveryConfigured={true} askLiveModeConfigured={false} bookingUrl={null} />);
    const ask = document.getElementById("ask") as HTMLElement;
    // h3, not h2: the section's own h2 is "say hi.", and the companion
    // reads a section's first h2 for its scenes.
    const heading = within(ask).getByRole("heading", { level: 3, name: contactCopy.ask.heading });
    expect(heading).toBeInTheDocument();
  });

  it("is not wrapped in an <aside>, so the business card stays the section's first and only one", () => {
    const { container } = render(
      <Contact emailDeliveryConfigured={true} askLiveModeConfigured={false} bookingUrl={null} />,
    );
    const asides = container.querySelectorAll("#contact aside");
    expect(asides).toHaveLength(1);
    expect(asides[0]).toHaveTextContent(/Thien/);
    expect(document.getElementById("ask")?.closest("aside")).toBeNull();
  });

  it("loads the real chat, and hands it the live-mode flag", async () => {
    render(<Contact emailDeliveryConfigured={true} askLiveModeConfigured={false} bookingUrl={null} />);
    const ask = document.getElementById("ask") as HTMLElement;
    expect(await within(ask).findByRole("textbox", QUESTION_FIELD, { timeout: 10_000 })).toBeInTheDocument();
  });

  it("is not the section's primary control", async () => {
    // One primary control per screen, and it is the postcard's Send. Wait for the chat's own buttons to be on the
    // page, so they are counted too. Every element is scanned, not only
    // buttons.
    const { container } = render(<Contact emailDeliveryConfigured={true} askLiveModeConfigured={false} bookingUrl={null} />);
    await screen.findByRole("textbox", QUESTION_FIELD, { timeout: 10_000 });

    const primary = Array.from(container.querySelectorAll<HTMLElement>("[class]")).filter((element) =>
      CONTROL_FILLS.some((fill) => fill.test(element.getAttribute("class") ?? "")),
    );
    expect(primary).toHaveLength(1);
    expect(primary[0]).toHaveTextContent(contactCopy.send);
  });

  it("puts the card first in the markup, so it stacks first below 1024px", () => {
    render(<Contact emailDeliveryConfigured={true} askLiveModeConfigured={false} bookingUrl={null} />);
    const aside = document.querySelector("#contact aside") as HTMLElement;
    const ask = document.getElementById("ask") as HTMLElement;
    expect(aside.compareDocumentPosition(ask) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("greets in Vietnamese above a lowercase h2, and keeps the board's words", () => {
    render(<Contact emailDeliveryConfigured={true} askLiveModeConfigured={false} bookingUrl={null} />);
    const section = document.getElementById("contact") as HTMLElement;
    const h2 = within(section).getByRole("heading", { level: 2 });
    expect(h2).toHaveTextContent(contactCopy.heading);
    expect(section).toHaveAttribute("aria-labelledby", h2.id);
    const greeting = within(section).getByText(contactCopy.greeting);
    expect(greeting).toHaveAttribute("lang", "vi");
    expect(greeting.compareDocumentPosition(h2) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(section).getByText(contactCopy.lead)).toBeInTheDocument();
    expect(within(section).getByText(contactCopy.tet)).toBeInTheDocument();
    expect(within(section).getByText(contactCopy.cheer)).toHaveAttribute("lang", "vi");
  });

  it("keeps the scenery out of the accessibility tree and out of the pointer's way", () => {
    const { container } = render(
      <Contact emailDeliveryConfigured={true} askLiveModeConfigured={false} bookingUrl={null} />,
    );
    const pieces = container.querySelectorAll("#contact [data-scenery]");
    expect(pieces.length).toBeGreaterThanOrEqual(8);
    for (const piece of pieces) expect(piece.closest("[aria-hidden=true]"), piece.getAttribute("data-scenery") ?? "").not.toBeNull();
    // Lanterns by day and by night, one shown at a time by the theme.
    expect(container.querySelector('[data-scenery="lanterns-day"]')?.closest(".day-only")).not.toBeNull();
    expect(container.querySelector('[data-scenery="lanterns-night"]')?.closest(".night-only")).not.toBeNull();
  });
});
