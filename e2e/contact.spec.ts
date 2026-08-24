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

test("the secret intent declares data-cat-secret on the form, and only while selected", async ({ page }) => {
  const contact = page.locator("#contact");
  // Two forms live in #contact (quick connect above, the full form below);
  // anchor on the field only the full form has rather than on DOM order.
  const form = contact.locator("form", { has: page.locator("#contact-name") });
  const secret = contactIntents.find((intent) => intent.id === "secret");
  if (!secret) throw new Error("The secret intent left the content layer — update this spec with it.");

  // Declaration side of the companion contract only: the cats' reaction is
  // pinned in companion.spec.ts. Here the form must raise the flag while the
  // secret intent is selected and lower it the moment another intent is.
  await expect(form).not.toHaveAttribute("data-cat-secret");
  await contact.getByRole("radio", { name: secret.label }).check();
  await expect(form).toHaveAttribute("data-cat-secret", "");
  await contact.getByRole("radio", { name: contactIntents[0].label }).check();
  await expect(form).not.toHaveAttribute("data-cat-secret");
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
/**
 * The right-hand business card (BusinessCard.tsx, >=1024px only). Its
 * column is a fixed `22rem`/`24rem` (Contact.tsx), never a fluid width, so
 * it only ever actually renders at exactly two widths — the two of this
 * repo's six-viewport Playwright matrix that land in each range.
 */
test.describe("business card", () => {
  test("holds a true 13:10 card ratio with zero content clipping, at both fixed column widths Contact.tsx provides", async ({
    page,
  }) => {
    const width = page.viewportSize()?.width ?? 0;
    test.skip(
      width !== 1024 && width !== 1440,
      "the card's column is a fixed 22rem (lg, 1024-1279px) or 24rem (xl, >=1280px), not fluid -- only these two projects land in each range",
    );

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const card = page.locator('aside[aria-label$="business card"]');
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    if (!box) throw new Error("business card did not render a box");

    // The ratio CopyButton's compact variant unlocked -- see BusinessCard.tsx's
    // CARD_ASPECT comment for the measured margin at each of these two widths.
    expect(box.width / box.height).toBeCloseTo(1.3, 1);

    // Zero clipping: the ratio-driven height must never be shorter than the
    // content's own natural (unconstrained) height. Undershooting doesn't
    // clip visibly at the card's outer edge -- it eats into the bottom
    // padding instead, the same family of defect round 4 first found here
    // (see BusinessCard.tsx). Measured the same way that file documents:
    // strip the ratio and any explicit height, read the natural box, put
    // both back.
    const natural = await card.evaluate((el) => {
      const node = el as HTMLElement;
      const prevAspect = node.style.aspectRatio;
      const prevHeight = node.style.height;
      node.style.aspectRatio = "auto";
      node.style.height = "auto";
      const height = node.getBoundingClientRect().height;
      node.style.aspectRatio = prevAspect;
      node.style.height = prevHeight;
      return height;
    });
    expect(box.height).toBeGreaterThanOrEqual(natural - 1);
  });

  test("the email copy control's hit area reaches a full 44px even though its visible box is 32px", async ({
    page,
  }) => {
    const width = page.viewportSize()?.width ?? 0;
    test.skip(width !== 1440, "control geometry is viewport-independent at >=1024; run once");

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const button = page
      .locator('aside[aria-label$="business card"]')
      .getByRole("button", { name: "Copy email address" });
    await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox();
    if (!box) throw new Error("copy control did not render a box");

    // The visible box is 32px -- this is the compact variant's whole point.
    expect(box.width).toBeCloseTo(32, 0);
    expect(box.height).toBeCloseTo(32, 0);

    // A capture-phase listener records the real click's `target`, read back
    // afterwards -- rather than waiting on the button's own post-click state
    // (aria-label flipping to "Copied"/"Copy failed"), which depends on
    // `navigator.clipboard.writeText()` actually settling. That call can
    // hang indefinitely for a *trusted* click in a headless/sandboxed
    // browser with no real system clipboard to write to, which would make
    // this test about clipboard plumbing instead of about the hit area it
    // exists to check.
    await page.evaluate(() => {
      (window as unknown as { __clickTarget?: string }).__clickTarget = "none";
      window.addEventListener(
        "click",
        (e) => {
          const target = e.target as HTMLElement;
          (window as unknown as { __clickTarget?: string }).__clickTarget =
            target.tagName + (target.getAttribute("aria-label") ? `[aria-label="${target.getAttribute("aria-label")}"]` : "");
        },
        true,
      );
    });

    // Click 5px outside the visible box's left edge: inside the pseudo-
    // element's 7px halo (CopyButton.tsx's `variant="compact"`), never
    // touching the 32px box itself, and comfortably clear of the adjacent
    // email link (the row's own `gap-2` leaves 8px of empty space there).
    await page.mouse.click(box.x - 5, box.y + box.height / 2);

    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __clickTarget?: string }).__clickTarget))
      .toBe('BUTTON[aria-label="Copy email address"]');
  });
});

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
    await page.getByRole("button", { name: "I'll come to you" }).click();

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
