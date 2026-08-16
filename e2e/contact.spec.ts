import { test, expect } from "@playwright/test";
import { contactIntents } from "../src/content/portfolio";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
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
