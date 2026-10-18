import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BusinessCard from "@/sections/Contact/BusinessCard";
import { profile } from "@/content/portfolio";

const BOOKING = "https://cal.com/thienle/20min";

function faces(container: HTMLElement) {
  const flip = container.querySelector<HTMLElement>("[data-flip]")!;
  const front = container.querySelector<HTMLElement>('[data-face="front"]')!;
  const back = container.querySelector<HTMLElement>('[data-face="back"]')!;
  return { flip, front, back };
}

describe("the business card's front", () => {
  it("carries every way to reach me", () => {
    const { container } = render(<BusinessCard bookingUrl={BOOKING} emailDeliveryConfigured={false} />);
    const front = within(faces(container).front);
    expect(front.getByText(profile.name)).toBeInTheDocument();
    expect(front.getByText(profile.title)).toBeInTheDocument();
    expect(front.getByText(profile.location)).toBeInTheDocument();
    // The chat corpus cites the philosophy line to Contact.
    expect(front.getByText(`“${profile.philosophy}”`)).toBeInTheDocument();
    expect(front.getByRole("link", { name: profile.email })).toHaveAttribute("href", `mailto:${profile.email}`);
    expect(front.getByRole("button", { name: "Copy email address" })).toBeInTheDocument();
    expect(front.getByRole("link", { name: /^LinkedIn/ })).toHaveAttribute("target", "_blank");
    expect(front.getByRole("link", { name: /^Book a call/ })).toHaveAttribute("href", BOOKING);
    expect(front.getByRole("link", { name: "Résumé" })).toHaveAttribute("href", "/resume");
    const vcf = front.getByRole("link", { name: "Save contact" });
    expect(vcf).toHaveAttribute("href", "/contact.vcf");
    expect(vcf).toHaveAttribute("download");
    expect(front.getByRole("button", { name: "Let me reach you" })).toBeInTheDocument();
  });

  it("renders no booking link without a booking URL", () => {
    const { container } = render(<BusinessCard bookingUrl={null} emailDeliveryConfigured={false} />);
    expect(screen.queryByRole("link", { name: /book a call/i })).toBeNull();
    expect(container.textContent).not.toMatch(/undefined|null/);
  });

  it("is an aside the companion can hide behind", () => {
    const { container } = render(<BusinessCard bookingUrl={null} emailDeliveryConfigured={false} />);
    const aside = container.querySelector("aside")!;
    expect(aside).toHaveAttribute("aria-label", `${profile.name} — business card`);
    expect(aside).toHaveAttribute("data-cat-hide");
  });
});

describe("the flip", () => {
  it("starts on the front, with the back inert", () => {
    const { container } = render(<BusinessCard bookingUrl={null} emailDeliveryConfigured={false} />);
    const { flip, front, back } = faces(container);
    expect(flip).toHaveAttribute("data-flipped", "false");
    expect(front).not.toHaveAttribute("inert");
    expect(back).toHaveAttribute("inert");
  });

  it("flips from the trigger, moves focus to the name field, and Escape flips back to the trigger", async () => {
    const user = userEvent.setup();
    const { container } = render(<BusinessCard bookingUrl={null} emailDeliveryConfigured={false} />);
    const { flip, front, back } = faces(container);
    const trigger = screen.getByRole("button", { name: "Let me reach you" });

    await user.click(trigger);
    expect(flip).toHaveAttribute("data-flipped", "true");
    expect(front).toHaveAttribute("inert");
    expect(back).not.toHaveAttribute("inert");
    expect(within(back).getByLabelText(/^Name/)).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(flip).toHaveAttribute("data-flipped", "false");
    expect(trigger).toHaveFocus();
  });

  it("flips back from the form's Back button", async () => {
    const user = userEvent.setup();
    const { container } = render(<BusinessCard bookingUrl={null} emailDeliveryConfigured={false} />);
    await user.click(screen.getByRole("button", { name: "Let me reach you" }));
    await user.click(within(faces(container).back).getByRole("button", { name: "Back" }));
    expect(faces(container).flip).toHaveAttribute("data-flipped", "false");
    expect(screen.getByRole("button", { name: "Let me reach you" })).toHaveFocus();
  });

  it("flips on the card's empty area, never on a link or button", async () => {
    const user = userEvent.setup();
    const { container } = render(<BusinessCard bookingUrl={BOOKING} emailDeliveryConfigured={false} />);
    const { flip, front } = faces(container);

    await user.click(within(front).getByRole("link", { name: "Résumé" }));
    await user.click(within(front).getByRole("button", { name: "Copy email address" }));
    expect(flip).toHaveAttribute("data-flipped", "false");

    await user.click(within(front).getByText(profile.title));
    expect(flip).toHaveAttribute("data-flipped", "true");
  });
});
