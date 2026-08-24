import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CopyButton } from "@/components/ui/CopyButton";

/**
 * `navigator.clipboard` in this suite is never left to jsdom's own default.
 *
 * Diagnosed directly (not assumed): `@testing-library/user-event`'s
 * `setup()` -- called at the top of every interactive test in this file --
 * itself installs a *working* `navigator.clipboard` stub as a side effect
 * (see `@testing-library/user-event/dist/.../utils/dataTransfer/Clipboard.js`,
 * `attachClipboardStubToView`, called unconditionally from `setup.js`), to
 * support user-event's own `copy()`/`paste()`/`cut()` helpers. That stub's
 * `writeText` always resolves. Its installation is a `configurable: true`
 * own-property getter on `navigator` that persists for the rest of the test
 * *file* (only `afterAll` tears it down) -- so "jsdom has no
 * navigator.clipboard by default" stops being true the moment any earlier
 * test in this file calls `userEvent.setup()`, which makes it an
 * order-dependent, non-deterministic premise for "clipboard unavailable" to
 * rely on implicitly. Every test below sets `navigator.clipboard` to
 * exactly the state it needs, explicitly.
 */
function installClipboard(writeText: (text: string) => Promise<void>): void {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
}

function removeClipboard(): void {
  Object.defineProperty(navigator, "clipboard", {
    value: undefined,
    configurable: true,
  });
}

describe("CopyButton", () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, "clipboard");
  });

  it("announces success via a role=status region and updates the visible label, when clipboard.writeText resolves", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    installClipboard(writeText);

    render(<CopyButton value="npm install thing" label="Copy" copiedLabel="Copied!" />);

    await user.click(screen.getByRole("button", { name: "Copy" }));

    // Wait for the actual state transition: the button only re-renders with
    // this label once `state` flips to "copied" after the awaited promise
    // resolves.
    await screen.findByRole("button", { name: "Copied!" });

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("npm install thing");
    expect(screen.getByRole("status")).toHaveTextContent("Copied!");
  });

  it("does NOT claim success when navigator.clipboard is unavailable -- announces failure instead", async () => {
    const user = userEvent.setup();
    // setup() above just installed user-event's own working clipboard stub
    // (see the file-level comment) -- explicitly force the actual condition
    // under test rather than relying on it having never been installed.
    removeClipboard();
    expect(navigator.clipboard).toBeUndefined();

    render(<CopyButton value="npm install thing" label="Copy" />);

    await user.click(screen.getByRole("button", { name: "Copy" }));

    await screen.findByRole("button", { name: "Copy failed" });

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(/copy failed/i);
    // The important assertion: it must never claim success.
    expect(status).not.toHaveTextContent(/^Copied/);
    expect(screen.queryByRole("button", { name: "Copy" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copied" })).not.toBeInTheDocument();
  });

  it("does NOT claim success when navigator.clipboard.writeText rejects", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error("permission denied"));
    installClipboard(writeText);

    render(<CopyButton value="npm install thing" label="Copy" />);

    await user.click(screen.getByRole("button", { name: "Copy" }));

    await screen.findByRole("button", { name: "Copy failed" });

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(/copy failed/i);
    // The important assertion: a rejected writeText must never announce or
    // display a success state.
    expect(status).not.toHaveTextContent(/^Copied/);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("npm install thing");
  });

  it("does NOT claim success when navigator.clipboard exists but has no writeText function", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      value: {},
      configurable: true,
    });

    render(<CopyButton value="npm install thing" label="Copy" />);

    await user.click(screen.getByRole("button", { name: "Copy" }));

    await screen.findByRole("button", { name: "Copy failed" });
    expect(screen.getByRole("status")).not.toHaveTextContent(/^Copied/);
  });

  it("is idle (no announcement) before any interaction", () => {
    render(<CopyButton value="npm install thing" label="Copy" />);
    expect(screen.getByRole("status")).toHaveTextContent("");
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  describe('variant="icon"', () => {
    it("carries the full accessible name via aria-label while rendering no visible label text", () => {
      render(<CopyButton value="npm install thing" label="Copy email address" variant="icon" />);

      const button = screen.getByRole("button", { name: "Copy email address" });
      expect(button).toHaveAttribute("aria-label", "Copy email address");
      // The label never renders as visible text -- only the icon does. An
      // icon-only button relies entirely on aria-label for its name, so a
      // stray text node here would be a silent regression back toward the
      // default variant's presentation.
      expect(button).toHaveTextContent("");
    });

    it("has a >=44px hit area from padding, same as the default variant", () => {
      render(<CopyButton value="npm install thing" label="Copy" variant="icon" />);
      const button = screen.getByRole("button", { name: "Copy" });
      expect(button.className).toMatch(/\bmin-h-11\b/);
      expect(button.className).toMatch(/\bmin-w-11\b/);
    });

    it("moves the accessible name to the copied state and announces it, on a successful copy", async () => {
      const user = userEvent.setup();
      const writeText = vi.fn().mockResolvedValue(undefined);
      installClipboard(writeText);

      render(
        <CopyButton
          value="npm install thing"
          label="Copy email address"
          copiedLabel="Copied!"
          variant="icon"
        />,
      );

      await user.click(screen.getByRole("button", { name: "Copy email address" }));

      const button = await screen.findByRole("button", { name: "Copied!" });
      expect(button).toHaveTextContent("");
      expect(screen.getByRole("status")).toHaveTextContent("Copied!");
    });

    it("never claims success in its accessible name when clipboard.writeText rejects", async () => {
      const user = userEvent.setup();
      const writeText = vi.fn().mockRejectedValue(new Error("permission denied"));
      installClipboard(writeText);

      render(
        <CopyButton value="npm install thing" label="Copy email address" variant="icon" />,
      );

      await user.click(screen.getByRole("button", { name: "Copy email address" }));

      const button = await screen.findByRole("button", { name: "Copy failed" });
      expect(button).toHaveAttribute("aria-label", "Copy failed");
      expect(screen.getByRole("status")).toHaveTextContent(/copy failed/i);
    });
  });

  describe('variant="compact"', () => {
    it("carries the full accessible name via aria-label while rendering no visible label text", () => {
      render(<CopyButton value="npm install thing" label="Copy email address" variant="compact" />);

      const button = screen.getByRole("button", { name: "Copy email address" });
      expect(button).toHaveAttribute("aria-label", "Copy email address");
      expect(button).toHaveTextContent("");
    });

    it("keeps the visible box at 32px (h-8 w-8) while extending the hit area to 44px via an out-of-flow pseudo-element, not by growing the box", () => {
      render(<CopyButton value="npm install thing" label="Copy" variant="compact" />);
      const button = screen.getByRole("button", { name: "Copy" });

      // The box you can SEE stays 32px -- this is the whole point of the
      // variant. Unlike `variant="icon"`, this must NOT carry min-h-11/
      // min-w-11 (44px) on the button itself.
      expect(button.className).toMatch(/\bh-8\b/);
      expect(button.className).toMatch(/\bw-8\b/);
      expect(button.className).not.toMatch(/\bmin-h-11\b/);
      expect(button.className).not.toMatch(/\bmin-w-11\b/);

      // The box you can CLICK reaches 44px through `relative` positioning on
      // the button plus an absolutely-positioned, empty `::before` inset
      // exactly -7px on every side -- out of flow, so it costs the
      // surrounding layout nothing and never changes what `className`
      // reports on the button's own box. An absolutely-positioned child's
      // containing block is its ancestor's *padding* box, and this button's
      // border-box sizing (`h-8 w-8` = 32px total) leaves only a 30px
      // padding box once the 1px border on each side is subtracted -- so
      // the inset is written as an exact `-inset-[7px]`, not the `-inset-
      // 1.5` (6px) the 44px target would suggest at a glance: 30 + 7 + 7 =
      // 44px, the same target size `variant="icon"` and the default variant
      // both guarantee, just reached without the 44px box those variants
      // pay for directly. (jsdom performs no layout, so the actual 44px is
      // exercised in the browser: see e2e/contact.spec.ts's "business card"
      // describe block, which clicks 5px outside this box and confirms the
      // click still lands on the button.)
      expect(button.className).toMatch(/\brelative\b/);
      expect(button.className).toMatch(/before:absolute/);
      expect(button.className).toMatch(/before:-inset-\[7px\]/);
      expect(button.className).toMatch(/before:content-\[''\]/);
    });

    it("moves the accessible name to the copied state and announces it, on a successful copy", async () => {
      const user = userEvent.setup();
      const writeText = vi.fn().mockResolvedValue(undefined);
      installClipboard(writeText);

      render(
        <CopyButton
          value="npm install thing"
          label="Copy email address"
          copiedLabel="Copied!"
          variant="compact"
        />,
      );

      await user.click(screen.getByRole("button", { name: "Copy email address" }));

      const button = await screen.findByRole("button", { name: "Copied!" });
      expect(button).toHaveTextContent("");
      expect(screen.getByRole("status")).toHaveTextContent("Copied!");
    });

    it("never claims success in its accessible name when clipboard.writeText rejects", async () => {
      const user = userEvent.setup();
      const writeText = vi.fn().mockRejectedValue(new Error("permission denied"));
      installClipboard(writeText);

      render(
        <CopyButton value="npm install thing" label="Copy email address" variant="compact" />,
      );

      await user.click(screen.getByRole("button", { name: "Copy email address" }));

      const button = await screen.findByRole("button", { name: "Copy failed" });
      expect(button).toHaveAttribute("aria-label", "Copy failed");
      expect(screen.getByRole("status")).toHaveTextContent(/copy failed/i);
    });
  });

  it("renders the default variant identically whether or not `variant` is passed explicitly", () => {
    const implicit = render(
      <CopyButton value="npm install thing" label="Copy" copiedLabel="Copied!" />,
    );
    const implicitButton = screen.getByRole("button", { name: "Copy" });
    const implicitClassName = implicitButton.className;
    const implicitHasAriaLabel = implicitButton.hasAttribute("aria-label");
    implicit.unmount();

    render(
      <CopyButton value="npm install thing" label="Copy" copiedLabel="Copied!" variant="default" />,
    );
    const explicitButton = screen.getByRole("button", { name: "Copy" });

    expect(explicitButton.className).toBe(implicitClassName);
    expect(explicitButton.hasAttribute("aria-label")).toBe(implicitHasAriaLabel);
    expect(implicitHasAriaLabel).toBe(false);
  });
});
