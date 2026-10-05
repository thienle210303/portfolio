import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactForm from "@/sections/Contact/ContactForm";
import { contactIntents, profile } from "@/content/portfolio";
import { buildMailtoHref, openMailClient } from "@/lib/contact";
import { withCaseStudyReferral } from "@/lib/content";

// jsdom cannot follow a `mailto:` navigation, so the one impure helper the
// form calls for it is replaced; everything else in the module is real.
vi.mock("@/lib/contact", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/contact")>()),
  openMailClient: vi.fn(),
}));

const opportunity = contactIntents.find((intent) => intent.id === "opportunity")!;
const secret = contactIntents.find((intent) => intent.id === "secret")!;

function okFetch() {
  const spy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  vi.stubGlobal("fetch", spy);
  return spy;
}

function sentBody(spy: ReturnType<typeof vi.fn>) {
  expect(spy).toHaveBeenCalledTimes(1);
  return JSON.parse(spy.mock.calls[0][1].body as string) as Record<string, string>;
}

function form() {
  return document.querySelector("form")!;
}

beforeEach(() => {
  vi.mocked(openMailClient).mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the contact form, before an intent is chosen", () => {
  it("has nothing to send yet, and says what choosing does", () => {
    render(<ContactForm emailDeliveryConfigured={true} />);
    // The form element exists from the first render: the companion watches
    // it for `data-cat-secret` with an attribute observer, which only sees
    // an attribute change on a node that is already there.
    expect(form()).toBeInTheDocument();
    expect(within(form()).queryByRole("button")).toBeNull();
    expect(within(form()).queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("group", { name: /pick one and a finished message appears below/i })).toBeVisible();
  });
});

describe("the contact form, with an intent chosen", () => {
  it("shows every paragraph of every draft as its own visible paragraph", async () => {
    // Review Focus 1: the visitor is about to send prewritten words over
    // their own name. Those words must be plainly visible, not folded into a
    // disclosure or a textarea they have to open.
    const user = userEvent.setup();
    render(<ContactForm emailDeliveryConfigured={true} />);
    for (const intent of contactIntents) {
      await user.click(screen.getByRole("radio", { name: intent.label }));
      const paragraphs = intent.messageDraft.split("\n\n");
      expect(paragraphs.length, intent.id).toBeGreaterThan(2);
      for (const paragraph of paragraphs) {
        const node = within(form()).getByText(paragraph);
        expect(node.tagName, `${intent.id}: ${paragraph}`).toBe("P");
        expect(node).toBeVisible();
      }
      expect(within(form()).getByText(intent.subject)).toBeVisible();
    }
    expect(form().querySelector("details, textarea")).toBeNull();
  });

  it("offers one blue send and one quiet expansion", async () => {
    const user = userEvent.setup();
    render(<ContactForm emailDeliveryConfigured={true} />);
    await user.click(screen.getByRole("radio", { name: opportunity.label }));

    const send = screen.getByRole("button", { name: /send it as written/i });
    const expand = screen.getByRole("button", { name: /add a line of my own/i });
    expect(send).toHaveAttribute("type", "submit");
    expect(expand).toHaveAttribute("type", "button");
    const blue = Array.from(form().querySelectorAll("*")).filter((el) =>
      /(^|\s)bg-accent(\s|$)/.test(el.getAttribute("class") ?? ""),
    );
    expect(blue).toEqual([send]);
  });

  it("will not send without a name or somewhere to reply", async () => {
    // Review Focus 5: a message with no reply address cannot be answered,
    // and the API rejects one with no name.
    const fetchSpy = okFetch();
    const user = userEvent.setup();
    render(<ContactForm emailDeliveryConfigured={true} />);
    await user.click(screen.getByRole("radio", { name: opportunity.label }));

    const email = screen.getByLabelText(/where to reply/i);
    const name = screen.getByLabelText(/your name/i);
    expect(email).toHaveAttribute("type", "email");
    expect(email).toBeRequired();
    expect(name).toBeRequired();
    expect(name).toHaveAttribute("id", "contact-name");

    await user.click(screen.getByRole("button", { name: /send it as written/i }));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Enter your name.")).toBeVisible();
    expect(screen.getByText("Enter your email address.")).toBeVisible();
    expect(name).toHaveFocus();

    await user.type(name, "Jamie");
    await user.type(email, "not-an-address");
    await user.click(screen.getByRole("button", { name: /send it as written/i }));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a valid email address.")).toBeVisible();
    expect(email).toHaveFocus();
  });

  it("sends the draft verbatim, then says so and tells the companion", async () => {
    const fetchSpy = okFetch();
    const cheered = vi.fn();
    window.addEventListener("portfolio:contact-sent", cheered);
    const user = userEvent.setup();
    render(<ContactForm emailDeliveryConfigured={true} />);
    await user.click(screen.getByRole("radio", { name: opportunity.label }));
    await user.type(screen.getByLabelText(/your name/i), "Jamie Reviewer");
    await user.type(screen.getByLabelText(/where to reply/i), "jamie@example.com");
    await user.click(screen.getByRole("button", { name: /send it as written/i }));

    expect(fetchSpy.mock.calls[0][0]).toBe("/api/contact");
    expect(sentBody(fetchSpy)).toEqual({
      name: "Jamie Reviewer",
      email: "jamie@example.com",
      reason: opportunity.subject,
      message: opportunity.messageDraft,
      website: "",
    });
    expect(await screen.findByText(/message sent/i)).toBeVisible();
    expect(cheered).toHaveBeenCalledTimes(1);
    expect(openMailClient).not.toHaveBeenCalled();
    window.removeEventListener("portfolio:contact-sent", cheered);
  });

  it("sends the visitor's own version once they add a line", async () => {
    const fetchSpy = okFetch();
    const user = userEvent.setup();
    render(<ContactForm emailDeliveryConfigured={true} />);
    await user.click(screen.getByRole("radio", { name: opportunity.label }));
    await user.click(screen.getByRole("button", { name: /add a line of my own/i }));

    const textarea = screen.getByRole("textbox", { name: /your message/i });
    expect(textarea).toHaveValue(opportunity.messageDraft);
    expect(textarea).toHaveFocus();
    expect(screen.queryByRole("button", { name: /add a line of my own/i })).toBeNull();

    await user.clear(textarea);
    await user.type(textarea, "Hi Thien, a line of my own.");
    await user.type(screen.getByLabelText(/your name/i), "Jamie");
    await user.type(screen.getByLabelText(/where to reply/i), "jamie@example.com");
    await user.click(screen.getByRole("button", { name: /^send it$/i }));

    expect(sentBody(fetchSpy).message).toBe("Hi Thien, a line of my own.");
  });

  it("puts a case study the visitor was reading into the draft and the subject", async () => {
    const fetchSpy = okFetch();
    const user = userEvent.setup();
    render(
      <>
        <a href="#contact" data-project-title="Chess">
          Discuss this project
        </a>
        <ContactForm emailDeliveryConfigured={true} />
      </>,
    );
    await user.click(screen.getByRole("link", { name: "Discuss this project" }));
    await user.click(screen.getByRole("radio", { name: opportunity.label }));
    expect(within(form()).getByText(/your case study, "Chess\."/)).toBeVisible();

    await user.type(screen.getByLabelText(/your name/i), "Jamie");
    await user.type(screen.getByLabelText(/where to reply/i), "jamie@example.com");
    await user.click(screen.getByRole("button", { name: /send it as written/i }));
    const body = sentBody(fetchSpy);
    expect(body.message).toBe(withCaseStudyReferral(opportunity.messageDraft, "Chess"));
    expect(body.reason).toBe(`${opportunity.subject} — Chess`);
  });

  it("raises data-cat-secret only while the secret intent is chosen", async () => {
    const user = userEvent.setup();
    render(<ContactForm emailDeliveryConfigured={true} />);
    expect(form()).not.toHaveAttribute("data-cat-secret");
    await user.click(screen.getByRole("radio", { name: secret.label }));
    expect(form()).toHaveAttribute("data-cat-secret", "");
    await user.click(screen.getByRole("radio", { name: opportunity.label }));
    expect(form()).not.toHaveAttribute("data-cat-secret");
  });

  it("keeps the honeypot out of reach and sends whatever a bot put in it", async () => {
    const fetchSpy = okFetch();
    const user = userEvent.setup();
    render(<ContactForm emailDeliveryConfigured={true} />);
    const honeypot = form().querySelector<HTMLInputElement>("#contact-website")!;
    expect(honeypot).toHaveAttribute("tabindex", "-1");
    expect(honeypot.closest("[aria-hidden='true']")).not.toBeNull();

    await user.click(screen.getByRole("radio", { name: opportunity.label }));
    await user.type(honeypot, "spam.example");
    await user.type(screen.getByLabelText(/your name/i), "Jamie");
    await user.type(screen.getByLabelText(/where to reply/i), "jamie@example.com");
    await user.click(screen.getByRole("button", { name: /send it as written/i }));
    expect(sentBody(fetchSpy).website).toBe("spam.example");
  });
});

describe("the contact form without email delivery", () => {
  it("offers the same send, and opens the visitor's email app with the same message", async () => {
    // The mailto: fallback is intentional. Choosing an intent and sending
    // behaves the same from the visitor's side; only where it goes differs.
    const fetchSpy = okFetch();
    const user = userEvent.setup();
    render(<ContactForm emailDeliveryConfigured={false} />);
    await user.click(screen.getByRole("radio", { name: opportunity.label }));
    const send = screen.getByRole("button", { name: /send it as written/i });
    expect(send).toHaveAccessibleDescription(/opens your email app/i);

    await user.type(screen.getByLabelText(/your name/i), "Jamie Reviewer");
    await user.type(screen.getByLabelText(/where to reply/i), "jamie@example.com");
    await user.click(send);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(openMailClient).toHaveBeenCalledWith(
      buildMailtoHref(profile.email, {
        subject: opportunity.subject,
        message: opportunity.messageDraft,
        name: "Jamie Reviewer",
        email: "jamie@example.com",
      }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(/email app should now be open/i);
    expect(screen.queryByText(/message sent/i)).toBeNull();
  });

  it("will not open the email app without somewhere to reply", async () => {
    const user = userEvent.setup();
    render(<ContactForm emailDeliveryConfigured={false} />);
    await user.click(screen.getByRole("radio", { name: opportunity.label }));
    await user.type(screen.getByLabelText(/your name/i), "Jamie");
    await user.click(screen.getByRole("button", { name: /send it as written/i }));
    expect(openMailClient).not.toHaveBeenCalled();
    expect(screen.getByText("Enter your email address.")).toBeVisible();
  });

  it("falls back to the email app when the server says it cannot send", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ ok: false, reason: "not-configured" }) }),
    );
    const user = userEvent.setup();
    render(<ContactForm emailDeliveryConfigured={true} />);
    await user.click(screen.getByRole("radio", { name: opportunity.label }));
    await user.type(screen.getByLabelText(/your name/i), "Jamie");
    await user.type(screen.getByLabelText(/where to reply/i), "jamie@example.com");
    await user.click(screen.getByRole("button", { name: /send it as written/i }));

    expect(await screen.findByText(/direct sending isn't available right now/i)).toBeVisible();
    expect(openMailClient).toHaveBeenCalledTimes(1);
    expect(vi.mocked(openMailClient).mock.calls[0][0]).toContain(encodeURIComponent(opportunity.subject));
    expect(screen.queryByText(/message sent/i)).toBeNull();
  });
});
