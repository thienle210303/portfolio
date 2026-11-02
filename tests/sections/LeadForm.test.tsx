import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LeadForm from "@/sections/Contact/LeadForm";
import { BoardStamp, PostcardStamps, stampDate } from "@/sections/Contact/SentStamp";
import { contactCopy, profile } from "@/content/portfolio";

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

const nameField = () => screen.getByLabelText(/^Your name/);
const emailField = () => screen.getByLabelText(/^Email/);
const phoneField = () => screen.getByLabelText(/^or phone/);
const send = () => screen.getByRole("button", { name: contactCopy.send });

afterEach(() => vi.unstubAllGlobals());

describe("the lead form", () => {
  it("asks for a name and an email or phone, and nothing else", () => {
    const { container } = render(<LeadForm emailDeliveryConfigured={true} />);
    expect(screen.getByRole("heading", { name: contactCopy.formHeading })).toBeInTheDocument();
    expect(screen.getByText(contactCopy.formNote)).toBeInTheDocument();
    expect(nameField()).toBeRequired();
    expect(emailField()).toHaveAttribute("type", "email");
    expect(phoneField()).toHaveAttribute("type", "tel");
    expect(container.querySelector("textarea")).toBeNull();
  });

  it("says before they try that email or phone is one requirement, marked once", () => {
    render(<LeadForm emailDeliveryConfigured={true} />);
    const pair = screen.getByRole("group", { name: contactCopy.pairGroup });
    expect(within(pair).getByLabelText(/^Email/)).toBeInTheDocument();
    expect(within(pair).getByLabelText(/^or phone/)).toBeInTheDocument();
    // One marker and one note for the two lines, not a marker on each.
    expect(pair).toHaveAccessibleDescription(contactCopy.pairNote);
    expect(pair.textContent?.match(/\*/g)).toHaveLength(1);
    // Neither line is required on its own: only the name is.
    expect(emailField()).not.toBeRequired();
    expect(phoneField()).not.toBeRequired();
  });

  it("shows the paired error once, on both fields, and sends nothing when neither is given", async () => {
    const spy = stubFetch(200, { ok: true });
    const user = userEvent.setup();
    render(<LeadForm emailDeliveryConfigured={true} />);
    await user.type(nameField(), "Jamie");
    await user.click(send());

    expect(screen.getAllByText(PAIR_ERROR)).toHaveLength(1);
    expect(emailField()).toHaveAttribute("aria-invalid", "true");
    expect(phoneField()).toHaveAttribute("aria-invalid", "true");
    expect(emailField()).toHaveAccessibleDescription(PAIR_ERROR);
    expect(emailField()).toHaveFocus();
    expect(spy).not.toHaveBeenCalled();
    // The note that was there before they tried is still there, once.
    expect(screen.getAllByText(contactCopy.pairNote)).toHaveLength(1);
  });

  it("rejects a malformed phone on its own", async () => {
    stubFetch(200, { ok: true });
    const user = userEvent.setup();
    render(<LeadForm emailDeliveryConfigured={true} />);
    await user.type(nameField(), "Jamie");
    await user.type(phoneField(), "call me");
    await user.click(send());
    expect(phoneField()).toHaveAccessibleDescription("Enter a valid phone number.");
    expect(emailField()).not.toHaveAttribute("aria-invalid");
  });

  it("rejects a malformed email and a digitless phone before posting", async () => {
    const spy = stubFetch(200, { ok: true });
    const user = userEvent.setup();
    render(<LeadForm emailDeliveryConfigured={true} />);
    await user.type(nameField(), "Jamie");
    await user.type(emailField(), "not-an-email");
    await user.type(phoneField(), "-------");
    await user.click(send());
    expect(emailField()).toHaveAccessibleDescription("Enter a valid email address.");
    expect(phoneField()).toHaveAccessibleDescription("Enter a valid phone number.");
    expect(emailField()).toHaveFocus();
    expect(spy).not.toHaveBeenCalled();
  });

  it("posts an email-only lead, confirms on the card, clears, and tells the cats", async () => {
    const spy = stubFetch(200, { ok: true });
    const cheer = vi.fn();
    window.addEventListener("portfolio:contact-sent", cheer);
    const user = userEvent.setup();
    render(<LeadForm emailDeliveryConfigured={true} />);
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
    render(<LeadForm emailDeliveryConfigured={true} />);
    await user.type(nameField(), "Jamie");
    await user.type(phoneField(), "+1 (864) 555-0100");
    await user.click(send());
    expect(sentBody(spy)).toMatchObject({ name: "Jamie", email: "", phone: "+1 (864) 555-0100" });
    expect(await screen.findByRole("status")).toHaveTextContent(contactCopy.success);
  });

  it("never opens the mail app: unconfigured, it says so and offers my address to copy", async () => {
    const spy = stubFetch(200, { ok: true });
    const navigate = vi.fn();
    vi.stubGlobal("open", navigate);
    const user = userEvent.setup();
    const { container } = render(<LeadForm emailDeliveryConfigured={false} />);
    expect(send()).toHaveAccessibleDescription(contactCopy.sendOffNote);
    await user.type(nameField(), "Jamie");
    await user.type(phoneField(), "864 555 0100");
    await user.click(send());

    expect(spy).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(contactCopy.offline);
    expect(container.querySelector("p[role=status]")).toHaveTextContent("");
    expect(container.querySelector("[data-reach]")).toHaveTextContent(profile.email);
    expect(screen.getByRole("button", { name: contactCopy.copyAddress })).toBeInTheDocument();
    expect(container.querySelector("a[href^='mailto:']")).toBeNull();
    expect(container.querySelector("[data-sent-stamp]")).toBeNull();
  });

  it("when the server says it cannot send, the same honest way out", async () => {
    stubFetch(503, { ok: false, reason: "not-configured" });
    const user = userEvent.setup();
    const { container } = render(<LeadForm emailDeliveryConfigured={true} />);
    await user.type(nameField(), "Jamie");
    await user.type(emailField(), "jamie@example.com");
    await user.click(send());
    expect(await screen.findByRole("alert")).toHaveTextContent(contactCopy.offline);
    expect(container.querySelector("[data-reach]")).toHaveTextContent(profile.email);
    expect(container.querySelector("[data-sent-stamp]")).toBeNull();
    expect(emailField()).toHaveValue("jamie@example.com");
  });

  it("stamps the postcard when it sends, and the line says it is in my inbox", async () => {
    stubFetch(200, { ok: true });
    const user = userEvent.setup();
    const { container } = render(<LeadForm emailDeliveryConfigured={true} />);
    expect(send()).toHaveAccessibleDescription(contactCopy.sendNote);
    expect(container.querySelector("[data-sent-stamp]")).toBeNull();
    await user.type(nameField(), "Jamie");
    await user.type(emailField(), "jamie@example.com");
    await user.click(send());
    await screen.findByText(contactCopy.success);
    const stamp = container.querySelector("[data-sent-stamp]");
    expect(stamp).toHaveTextContent(contactCopy.stamp);
    expect(stamp).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("[data-reach]")).toBeNull();
  });

  it("inks TAYLORS SC, SENT and the visitor's own date, and says none of it twice to a screen reader", async () => {
    stubFetch(200, { ok: true });
    const user = userEvent.setup();
    const { container } = render(<LeadForm emailDeliveryConfigured={true} />);
    await user.type(nameField(), "Jamie");
    await user.type(emailField(), "jamie@example.com");
    await user.click(send());
    await screen.findByText(contactCopy.success);
    const stamp = container.querySelector("[data-sent-stamp]") as HTMLElement;
    expect(stamp.querySelector(".sent-stamp__place")).toHaveTextContent("TAYLORS SC");
    expect(stamp.querySelector(".sent-stamp__word")).toHaveTextContent(contactCopy.stamp);
    expect(stamp.querySelector(".sent-stamp__date")?.textContent).toBe(stampDate());
    // Nothing of the stamp is in the accessibility tree: the status line is the confirmation.
    expect(stamp.closest("[aria-hidden=true]")).toBe(stamp);
    expect(screen.getByRole("status")).toHaveTextContent(contactCopy.success);
  });

  it("puts the same stamp on the picture side, and takes it off again with the next send", async () => {
    stubFetch(200, { ok: true });
    const user = userEvent.setup();
    render(
      <PostcardStamps>
        <LeadForm emailDeliveryConfigured={true} />
        <BoardStamp />
      </PostcardStamps>,
    );
    expect(document.querySelector('[data-sent-stamp="board"]')).toBeNull();
    await user.type(nameField(), "Jamie");
    await user.type(emailField(), "jamie@example.com");
    await user.click(send());
    await screen.findByText(contactCopy.success);
    const board = document.querySelector('[data-sent-stamp="board"]');
    expect(board).toHaveAttribute("aria-hidden", "true");
    expect(board).toHaveTextContent(contactCopy.stamp);
    expect(board?.querySelector(".sent-stamp__date")?.textContent).toBe(stampDate());
    // The address side has its own copy for where the sides stack; CSS shows one.
    expect(document.querySelectorAll("[data-sent-stamp]")).toHaveLength(2);

    // A new send that is not (yet) a success un-stamps both.
    await user.click(send());
    expect(document.querySelector("[data-sent-stamp]")).toBeNull();
  });

  it("is not stamped when the send fails", async () => {
    stubFetch(502, { ok: false, reason: "send-failed" });
    const user = userEvent.setup();
    render(
      <PostcardStamps>
        <LeadForm emailDeliveryConfigured={true} />
        <BoardStamp />
      </PostcardStamps>,
    );
    await user.type(nameField(), "Jamie");
    await user.type(emailField(), "jamie@example.com");
    await user.click(send());
    await screen.findByRole("alert");
    expect(document.querySelector("[data-sent-stamp]")).toBeNull();
  });

  it("adds the thank-you line only when the server says a thank-you went", async () => {
    stubFetch(200, { ok: true, thanked: true });
    const user = userEvent.setup();
    const { unmount } = render(<LeadForm emailDeliveryConfigured={true} />);
    await user.type(nameField(), "Jamie");
    await user.type(emailField(), "jamie@example.com");
    await user.click(send());
    await screen.findByText(contactCopy.success);
    expect(screen.getByRole("status")).toHaveTextContent(contactCopy.thanked);
    unmount();

    stubFetch(200, { ok: true, thanked: false });
    render(<LeadForm emailDeliveryConfigured={true} />);
    await user.type(nameField(), "Jamie");
    await user.type(emailField(), "jamie@example.com");
    await user.click(send());
    await screen.findByText(contactCopy.success);
    expect(screen.getByRole("status")).not.toHaveTextContent(contactCopy.thanked);
  });

  it("says nothing of a thank-you when the server's answer has no `thanked` at all", async () => {
    stubFetch(200, { ok: true });
    const user = userEvent.setup();
    render(<LeadForm emailDeliveryConfigured={true} />);
    await user.type(nameField(), "Jamie");
    await user.type(phoneField(), "+1 (864) 555-0100");
    await user.click(send());
    await screen.findByText(contactCopy.success);
    expect(screen.getByRole("status")).not.toHaveTextContent(contactCopy.thanked);
  });

  it("puts the server's field errors on the fields", async () => {
    stubFetch(400, { ok: false, reason: "invalid", fieldErrors: { email: "Enter a valid email address." } });
    const user = userEvent.setup();
    render(<LeadForm emailDeliveryConfigured={true} />);
    await user.type(nameField(), "Jamie");
    await user.type(emailField(), "jamie@example.com");
    await user.click(send());
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(emailField()).toHaveAttribute("aria-invalid", "true");
  });

  it("says so on the card when the send fails, and never claims success", async () => {
    stubFetch(502, { ok: false, reason: "send-failed" });
    const user = userEvent.setup();
    const { container } = render(<LeadForm emailDeliveryConfigured={true} />);
    await user.type(nameField(), "Jamie");
    await user.type(emailField(), "jamie@example.com");
    await user.click(send());
    expect(await screen.findByRole("alert")).toHaveTextContent(contactCopy.failed);
    expect(container.querySelector("p[role=status]")).toHaveTextContent("");
    expect(screen.getByText(profile.email)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: contactCopy.copyAddress })).toBeInTheDocument();
  });

  it("tells a flooder to wait, and still offers my address", async () => {
    stubFetch(429, { ok: false, reason: "rate-limited" });
    const user = userEvent.setup();
    render(<LeadForm emailDeliveryConfigured={true} />);
    await user.type(nameField(), "Jamie");
    await user.type(emailField(), "jamie@example.com");
    await user.click(send());
    expect(await screen.findByRole("alert")).toHaveTextContent(contactCopy.rateLimited);
    expect(screen.getByRole("button", { name: contactCopy.copyAddress })).toBeInTheDocument();
  });

  it("is the postcard itself: no Back, and Escape does nothing to it", async () => {
    const user = userEvent.setup();
    render(<LeadForm emailDeliveryConfigured={true} />);
    expect(screen.getByRole("form", { name: contactCopy.formHeading })).toHaveAttribute("data-delivery", "api");
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    await user.type(nameField(), "Jamie{Escape}");
    expect(nameField()).toHaveValue("Jamie");
  });

  it("holds Send while a send is in flight", async () => {
    let answer!: (value: unknown) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => (answer = resolve))));
    const user = userEvent.setup();
    render(<LeadForm emailDeliveryConfigured={true} />);
    await user.type(nameField(), "Jamie");
    await user.type(emailField(), "jamie@example.com");
    await user.click(send());

    expect(screen.getByRole("button", { name: /Sending/ })).toBeDisabled();
    answer({ ok: true, status: 200, json: async () => ({ ok: true }) });
    expect(await screen.findByRole("status")).toHaveTextContent(contactCopy.success);
    expect(send()).toBeEnabled();
  });
});
