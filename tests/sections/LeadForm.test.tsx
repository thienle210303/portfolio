import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LeadForm from "@/sections/Contact/LeadForm";
import { contactCopy, profile } from "@/content/portfolio";
import { buildLeadMailto, openMailClient } from "@/lib/contact";

// jsdom cannot follow a `mailto:` navigation, so the one impure helper is
// replaced; everything else in the module is real.
vi.mock("@/lib/contact", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/contact")>()),
  openMailClient: vi.fn(),
}));

const PAIR_ERROR = "Add an email or a phone number so I can reach you.";

function stubFetch(status: number, body: unknown) {
  const spy = vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
  vi.stubGlobal("fetch", spy);
  return spy;
}

function sentBody(spy: ReturnType<typeof vi.fn>) {
  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy.mock.calls[0][0]).toBe("/api/contact");
  return JSON.parse(spy.mock.calls[0][1].body as string) as Record<string, string>;
}

const nameField = () => screen.getByLabelText(/^Name/);
const emailField = () => screen.getByLabelText(/^Email/);
const phoneField = () => screen.getByLabelText(/^Phone/);
const send = () => screen.getByRole("button", { name: "Send" });

beforeEach(() => vi.mocked(openMailClient).mockClear());
afterEach(() => vi.unstubAllGlobals());

describe("the lead form", () => {
  it("asks for a name and an email or phone, and nothing else", () => {
    const { container } = render(<LeadForm emailDeliveryConfigured={true} onBack={() => {}} />);
    expect(screen.getByRole("heading", { name: contactCopy.formHeading })).toBeInTheDocument();
    expect(screen.getByText(contactCopy.formNote)).toBeInTheDocument();
    expect(nameField()).toBeRequired();
    expect(emailField()).toHaveAttribute("type", "email");
    expect(phoneField()).toHaveAttribute("type", "tel");
    expect(container.querySelector("textarea")).toBeNull();
  });

  it("shows the paired error once, on both fields, and sends nothing when neither is given", async () => {
    const spy = stubFetch(200, { ok: true });
    const user = userEvent.setup();
    render(<LeadForm emailDeliveryConfigured={true} onBack={() => {}} />);
    await user.type(nameField(), "Jamie");
    await user.click(send());

    expect(screen.getAllByText(PAIR_ERROR)).toHaveLength(1);
    expect(emailField()).toHaveAttribute("aria-invalid", "true");
    expect(phoneField()).toHaveAttribute("aria-invalid", "true");
    expect(emailField()).toHaveAccessibleDescription(PAIR_ERROR);
    expect(emailField()).toHaveFocus();
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects a malformed phone on its own", async () => {
    stubFetch(200, { ok: true });
    const user = userEvent.setup();
    render(<LeadForm emailDeliveryConfigured={true} onBack={() => {}} />);
    await user.type(nameField(), "Jamie");
    await user.type(phoneField(), "call me");
    await user.click(send());
    expect(phoneField()).toHaveAccessibleDescription("Enter a valid phone number.");
    expect(emailField()).not.toHaveAttribute("aria-invalid");
  });

  it("posts an email-only lead, confirms on the card, clears, and tells the cats", async () => {
    const spy = stubFetch(200, { ok: true });
    const cheer = vi.fn();
    window.addEventListener("portfolio:contact-sent", cheer);
    const user = userEvent.setup();
    render(<LeadForm emailDeliveryConfigured={true} onBack={() => {}} />);
    await user.type(nameField(), "Jamie");
    await user.type(emailField(), "jamie@example.com");
    await user.click(send());

    expect(sentBody(spy)).toEqual({ name: "Jamie", email: "jamie@example.com", phone: "", website: "" });
    expect(await screen.findByRole("status")).toHaveTextContent(contactCopy.success);
    expect(screen.getByRole("status")).toHaveFocus();
    expect(nameField()).toHaveValue("");
    expect(cheer).toHaveBeenCalledTimes(1);
    window.removeEventListener("portfolio:contact-sent", cheer);
  });

  it("posts a phone-only lead", async () => {
    const spy = stubFetch(200, { ok: true });
    const user = userEvent.setup();
    render(<LeadForm emailDeliveryConfigured={true} onBack={() => {}} />);
    await user.type(nameField(), "Jamie");
    await user.type(phoneField(), "+1 (864) 555-0100");
    await user.click(send());
    expect(sentBody(spy)).toMatchObject({ name: "Jamie", email: "", phone: "+1 (864) 555-0100" });
    expect(await screen.findByRole("status")).toHaveTextContent(contactCopy.success);
  });

  it("opens the mail app instead of posting when delivery is not configured", async () => {
    const spy = stubFetch(200, { ok: true });
    const user = userEvent.setup();
    render(<LeadForm emailDeliveryConfigured={false} onBack={() => {}} />);
    expect(send()).toHaveAccessibleDescription(/opens your email app/i);
    await user.type(nameField(), "Jamie");
    await user.type(phoneField(), "864 555 0100");
    await user.click(send());

    expect(spy).not.toHaveBeenCalled();
    expect(openMailClient).toHaveBeenCalledWith(buildLeadMailto({ name: "Jamie", phone: "864 555 0100" }, profile.email));
    expect(screen.getByRole("status")).toHaveTextContent(/email app/i);
    expect(screen.getByRole("status")).not.toHaveTextContent(contactCopy.success);
  });

  it("falls back to the mail app when the server says it is not configured", async () => {
    stubFetch(503, { ok: false, reason: "not-configured" });
    const user = userEvent.setup();
    render(<LeadForm emailDeliveryConfigured={true} onBack={() => {}} />);
    await user.type(nameField(), "Jamie");
    await user.type(emailField(), "jamie@example.com");
    await user.click(send());
    expect(openMailClient).toHaveBeenCalledWith(
      buildLeadMailto({ name: "Jamie", email: "jamie@example.com" }, profile.email),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(/email app/i);
  });

  it("puts the server's field errors on the fields", async () => {
    stubFetch(400, { ok: false, reason: "invalid", fieldErrors: { email: "Enter a valid email address." } });
    const user = userEvent.setup();
    render(<LeadForm emailDeliveryConfigured={true} onBack={() => {}} />);
    await user.type(nameField(), "Jamie");
    await user.type(emailField(), "jamie@example.com");
    await user.click(send());
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(emailField()).toHaveAttribute("aria-invalid", "true");
  });

  it("says so on the card when the send fails, and never claims success", async () => {
    stubFetch(502, { ok: false, reason: "send-failed" });
    const user = userEvent.setup();
    render(<LeadForm emailDeliveryConfigured={true} onBack={() => {}} />);
    await user.type(nameField(), "Jamie");
    await user.type(emailField(), "jamie@example.com");
    await user.click(send());
    expect(await screen.findByRole("alert")).toHaveTextContent(/went wrong/i);
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("hands Back and Escape to its caller, clearing what it last said", async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<LeadForm emailDeliveryConfigured={true} onBack={onBack} />);
    expect(screen.getByRole("form", { name: contactCopy.formHeading })).toHaveAttribute("data-delivery", "api");
    await user.click(send());
    expect(screen.getByRole("alert")).not.toHaveTextContent("");
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert")).toHaveTextContent("");
    await user.type(nameField(), "{Escape}");
    expect(onBack).toHaveBeenCalledTimes(2);
  });
});
