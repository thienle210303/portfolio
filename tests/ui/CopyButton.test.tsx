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
});
