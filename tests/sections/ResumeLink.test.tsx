import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResumeLink from "@/sections/Contact/ResumeLink";
import { profile } from "@/content/portfolio";

// jsdom has no <dialog> behaviour beyond the attribute, so the two methods
// that matter are stubbed to flip `open` and fire `close`.
function stubDialog() {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  });
}

function width(wide: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: wide, media: query, addEventListener() {}, removeEventListener() {} }));
}

const frame = (container: HTMLElement) => container.querySelector("iframe") as HTMLIFrameElement;

beforeEach(stubDialog);
afterEach(() => vi.unstubAllGlobals());

describe("the résumé link", () => {
  it("is a link to the PDF, and the PDF is not loaded until the dialog opens", () => {
    const { container } = render(<ResumeLink className="chip">Résumé</ResumeLink>);
    expect(screen.getByRole("link", { name: "Résumé" })).toHaveAttribute("href", profile.resumePdf);
    expect(frame(container)).not.toHaveAttribute("src");
  });

  it("from 640px opens the dialog, sets the frame's src, and hands focus back on close", async () => {
    width(true);
    const user = userEvent.setup();
    const { container } = render(<ResumeLink className="chip">Résumé</ResumeLink>);
    const trigger = screen.getByRole("link", { name: "Résumé" });
    await user.click(trigger);

    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
    expect(frame(container)).toHaveAttribute("src", profile.resumePdf);
    expect(container.querySelector("dialog a[download]")).toHaveAttribute("href", profile.resumePdf);
    expect(container.querySelector("dialog a[target=_blank]")).toHaveAttribute("href", profile.resumePdf);

    await user.click(screen.getByRole("button", { name: "Close the résumé", hidden: true }));
    expect(trigger).toHaveFocus();
  });

  it("below 640px just follows the link", async () => {
    width(false);
    const user = userEvent.setup();
    const { container } = render(<ResumeLink className="chip">Résumé</ResumeLink>);
    await user.click(screen.getByRole("link", { name: "Résumé" }));
    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();
    expect(frame(container)).not.toHaveAttribute("src");
  });
});
