import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Contact from "@/sections/Contact/Contact";

/**
 * Round 18 moved "Ask this site" out of the hero's code artifact and into
 * Contact: a visitor who would rather interrogate the record than write an
 * email is making contact too, with less effort. These tests pin where it
 * sits and what it must not take over. The chat itself is the real module
 * here, not a mock — jsdom has no IntersectionObserver, so the loader falls
 * back to importing it at once, and the one-primary count below is taken
 * against the chat's real buttons.
 */

const QUESTION_FIELD = { name: "Ask a question about this portfolio" } as const;

/** Both spellings of an accent fill — the pair the Hero test scans for — each
 *  anchored on whitespace, so `hover:bg-accent-strong` is not counted. */
const ACCENT_FILLS = [/(^|\s)bg-accent(\s|$)/, /(^|\s)bg-\[color:var\(--accent\)\](\s|$)/] as const;

describe("Ask, in Contact", () => {
  it("is reachable at a stable id", () => {
    render(<Contact emailDeliveryConfigured={true} askLiveModeConfigured={false} />);
    expect(document.getElementById("ask")).not.toBeNull();
  });

  it("sits under its own h3, inside #ask", () => {
    render(<Contact emailDeliveryConfigured={true} askLiveModeConfigured={false} />);
    const ask = document.getElementById("ask") as HTMLElement;
    // h3, not h2: the section's own h2 is "Let's talk", and the companion
    // reads a section's first h2 for its scenes.
    const heading = within(ask).getByRole("heading", { level: 3, name: /ask about my work/i });
    expect(heading).toBeInTheDocument();
  });

  it("is not wrapped in an <aside>, so the business card stays the section's first and only one", () => {
    const { container } = render(
      <Contact emailDeliveryConfigured={true} askLiveModeConfigured={false} />,
    );
    const asides = container.querySelectorAll("#contact aside");
    expect(asides).toHaveLength(1);
    expect(asides[0]).toHaveTextContent(/Thien/);
    expect(document.getElementById("ask")?.closest("aside")).toBeNull();
  });

  it("loads the real chat, and hands it the live-mode flag", async () => {
    render(<Contact emailDeliveryConfigured={true} askLiveModeConfigured={false} />);
    const ask = document.getElementById("ask") as HTMLElement;
    expect(await within(ask).findByRole("textbox", QUESTION_FIELD, { timeout: 10_000 })).toBeInTheDocument();
  });

  it("is not the section's primary control", async () => {
    // One primary control per screen, and it is the send button. It only
    // renders once an intent is chosen, so choose one first; and wait for
    // the chat's own buttons to be on the page, so they are counted too.
    // Every element is scanned, not only buttons.
    const { container } = render(<Contact emailDeliveryConfigured={true} askLiveModeConfigured={false} />);
    await userEvent.setup().click(screen.getByRole("radio", { name: /career opportunity/i }));
    await screen.findByRole("textbox", QUESTION_FIELD, { timeout: 10_000 });

    const primary = Array.from(container.querySelectorAll<HTMLElement>("[class]")).filter((element) =>
      ACCENT_FILLS.some((fill) => fill.test(element.getAttribute("class") ?? "")),
    );
    expect(primary).toHaveLength(1);
    expect(primary[0]).toHaveTextContent(/^Send it as written$/);
  });
});
