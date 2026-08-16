import { test, expect } from "@playwright/test";
import { contactIntents } from "../src/content/portfolio";

test.beforeEach(async ({ page }) => {
  // Playwright retries clicks until an element is actionable, but it dispatches
  // key presses immediately and reads the DOM immediately. Both race React's
  // hydration on a page this long, which is how a suite that passed became
  // intermittently red once sections were reordered. Waiting for the network to
  // settle is the closest available "the islands are live now" signal.
  await page.goto("/");
  await page.waitForLoadState("networkidle");
});

test("selecting an intent prefills subject and message, and both remain editable", async ({ page }) => {
  const contact = page.locator("#contact");
  const intent = contactIntents[1];

  await contact.getByRole("radio", { name: intent.label }).check();

  const reason = contact.locator("#contact-reason");
  const message = contact.locator("#contact-message");
  await expect(reason).toHaveValue(intent.subject);
  await expect(message).toHaveValue(intent.messageStarter);

  await expect(message).toBeEditable();
  await message.fill(`${intent.messageStarter}Extra detail from me.`);
  await expect(message).toHaveValue(/Extra detail from me\.$/);

  await expect(reason).toBeEnabled();
  await reason.selectOption(contactIntents[0].subject);
  await expect(reason).toHaveValue(contactIntents[0].subject);
});

test("submitting with empty required fields shows inline validation, not a submission", async ({ page }) => {
  const form = page.locator("#contact form");

  await form.getByRole("button", { name: "Open email app" }).click();

  await expect(form.getByRole("alert")).toHaveText(/fix the highlighted field/i);
  await expect(page.locator("#contact-name")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#contact-name-error")).toHaveText("Enter your name.");
  await expect(page.locator("#contact-email-error")).toHaveText("Enter your email address.");
  await expect(page.locator("#contact-message-error")).toHaveText(/at least 10 characters/);

  await expect(form.getByRole("status")).toHaveText("");
  await expect(page).toHaveURL(/\/$/);
});

// The single most important behavioural guarantee on the page: this
// environment has no RESEND_API_KEY / CONTACT_TO_EMAIL / CONTACT_FROM_EMAIL
// configured, so the form must degrade to an honest mailto: fallback and
// must never claim a message was actually sent.
test('with email delivery unconfigured, submit reads "Open email app" and never claims success', async ({
  page,
}) => {
  const form = page.locator("#contact form");
  const submit = form.getByRole("button", { name: "Open email app" });
  await expect(submit).toBeVisible();
  await expect(form.getByRole("button", { name: "Send message" })).toHaveCount(0);

  await page.locator("#contact-name").fill("Jamie Reviewer");
  await page.locator("#contact-email").fill("jamie@example.com");
  await page.locator("#contact-message").fill("Just checking the contact form behaves as documented.");

  await submit.click();

  const status = form.getByRole("status");
  await expect(status).toContainText("email app should now be open");
  await expect(status).not.toContainText(/message sent/i);
  await expect(page.getByText(/message sent/i)).toHaveCount(0);
  await expect(form.getByRole("alert")).toHaveText("");
  await expect(submit).toHaveText("Open email app");
});

test("the honeypot field is present and not reachable by Tab", async ({ page }) => {
  const form = page.locator("#contact form");
  const honeypot = form.locator("#contact-website");

  await expect(honeypot).toHaveCount(1);
  await expect(honeypot).toHaveAttribute("tabindex", "-1");
  await expect(honeypot).toHaveAttribute("aria-hidden", "true");

  await form.locator("#contact-message").focus();
  await page.keyboard.press("Tab");

  await expect(honeypot).not.toBeFocused();
  await expect(form.getByRole("button", { name: "Open email app" })).toBeFocused();
});

/**
 * The one-field "ask me to reach out" path that sits above the full form.
 *
 * It exists so a visitor can start a conversation without composing one, so
 * what matters here is that it stays operable and honest: it must never claim
 * to have sent something it did not, and its direct links must go where they
 * say. Delivery itself is not exercised — the suite runs without Resend
 * configured, which is exactly the mailto-fallback state the site ships in.
 */
test.describe("quick connect", () => {
  test("offers email, GitHub and LinkedIn as direct one-tap links", async ({ page }) => {
    await page.goto("/");
    const quick = page.locator("#contact form").first();

    // Email is a real mailto, not a JS handler.
    const mailto = page.locator('#contact a[href^="mailto:"]').first();
    await expect(mailto).toBeVisible();

    for (const name of [/^GitHub/, /^LinkedIn/]) {
      const link = page.locator("#contact").getByRole("link", { name });
      await expect(link.first()).toHaveAttribute("rel", "noopener noreferrer");
      await expect(link.first()).toHaveAttribute("target", "_blank");
    }

    await expect(quick.getByPlaceholder("Email or phone number")).toBeVisible();
  });

  test("rejects an empty submission without claiming to have sent anything", async ({ page }) => {
    await page.goto("/");
    const field = page.getByPlaceholder("Email or phone number");
    await field.scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Ask me to reach out" }).click();

    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText(/Enter an email address or a phone number/)).toBeVisible();
    await expect(page.getByText(/I'll be in touch/)).toHaveCount(0);
  });

  test("the field advertises exactly one autofill purpose", async ({ page }) => {
    await page.goto("/");
    const field = page.getByPlaceholder("Email or phone number");
    // The autocomplete spec allows one field-name token, so the field cannot
    // claim both purposes — `email tel` is invalid and axe fails it under
    // 1.3.5. Pinned here because the temptation to "helpfully" add `tel` back
    // is real.
    await expect(field).toHaveAttribute("autocomplete", "email");
  });
});
