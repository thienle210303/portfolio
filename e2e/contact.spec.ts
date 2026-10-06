import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
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

/** The form that owns the name field — the one the companion also watches. */
function contactForm(page: Page) {
  return page.locator("#contact form", { has: page.locator("#contact-name") });
}

test("Contact holds one form, and nothing to send until an intent is chosen", async ({ page }) => {
  const contact = page.locator("#contact");
  // The one-field "leave a number" form is gone (round 18): choosing an
  // intent now produces the whole message instead.
  await expect(contact.locator("form")).toHaveCount(1);
  await expect(contact.getByRole("button", { name: /send it/i })).toHaveCount(0);
  await expect(contact.locator("#contact-name")).toHaveCount(0);
  await expect(contact.getByRole("group", { name: "What brings you here?", exact: true })).toBeVisible();
});

test("choosing an intent shows its whole draft as paragraphs, with no textarea", async ({ page }) => {
  const contact = page.locator("#contact");
  for (const intent of contactIntents) {
    await contact.getByRole("radio", { name: intent.label, exact: true }).check();
    const form = contactForm(page);
    const paragraphs = intent.messageDraft.split("\n\n");
    for (const paragraph of paragraphs) {
      const node = form.getByText(paragraph, { exact: true });
      await expect(node).toBeVisible();
      expect(await node.evaluate((el) => el.tagName), paragraph).toBe("P");
    }
    await expect(form.getByText(intent.subject, { exact: true })).toBeVisible();
    await expect(form.locator("textarea")).toHaveCount(0);
  }
});

test("after choosing, the send button is the only blue fill in Contact", async ({ page }) => {
  const contact = page.locator("#contact");
  await contact.getByRole("radio", { name: contactIntents[0].label, exact: true }).check();
  const send = contact.getByRole("button", { name: "Send it as written" });
  await expect(send).toBeVisible();
  // Both spellings of an accent fill (the Hero test scans the same pair),
  // anchored on whitespace so `hover:bg-accent-strong` is not counted.
  const blue = await contact.evaluate((root) =>
    Array.from(root.querySelectorAll("*"))
      .filter((el) =>
        [/(^|\s)bg-accent(\s|$)/, /(^|\s)bg-\[color:var\(--accent\)\](\s|$)/].some((fill) =>
          fill.test(el.getAttribute("class") ?? ""),
        ),
      )
      .map((el) => el.textContent?.trim()),
  );
  expect(blue).toEqual(["Send it as written"]);
});

test("the whole page has one blue fill, and it is Contact's send", async ({ page }) => {
  await page
    .locator("#contact")
    .getByRole("radio", { name: contactIntents[0].label, exact: true })
    .check();
  // The globe's controls only take their ready style once the lazy chunk has
  // loaded, so wait for that before scanning the page. The stage, not the
  // section: at 320–375 the section's top leaves the stage outside the
  // import observer's margin, and the chunk is never fetched.
  const worlds = page.locator("#worlds");
  await worlds.getByRole("group", { name: /playground earth/i }).scrollIntoViewIfNeeded();
  const flight = worlds.getByRole("button", { name: /take the flight|stop the replay/i });
  await expect(flight).toBeVisible({ timeout: 20_000 });
  // Hairlines are not fills: the nav's 1px active-underline (one per link)
  // uses `bg-accent` to draw a rule, so only boxes taller than 2px count.
  const blue = await page.evaluate(() =>
    Array.from(document.body.querySelectorAll("*"))
      .filter((el) => el.getBoundingClientRect().height > 2)
      .filter((el) =>
        [/(^|\s)bg-accent(\s|$)/, /(^|\s)bg-\[color:var\(--accent\)\](\s|$)/].some((fill) =>
          fill.test(el.getAttribute("class") ?? ""),
        ),
      )
      .map((el) => el.textContent?.trim()),
  );
  expect(blue).toEqual(["Send it as written"]);
});

test("adding a line opens the draft in an editable textarea", async ({ page }) => {
  const contact = page.locator("#contact");
  const intent = contactIntents[1];
  await contact.getByRole("radio", { name: intent.label, exact: true }).check();
  await contact.getByRole("button", { name: "Add a line of my own" }).click();

  const message = contact.locator("#contact-message");
  await expect(message).toHaveValue(intent.messageDraft);
  await expect(message).toBeFocused();
  await message.fill(`${intent.messageDraft}\n\nExtra detail from me.`);
  await expect(message).toHaveValue(/Extra detail from me\.$/);
  await expect(contact.getByRole("button", { name: "Send it", exact: true })).toBeVisible();
  await expect(contact.getByRole("button", { name: "Add a line of my own" })).toHaveCount(0);

  // Words the visitor typed survive a change of intent, arrow keys included;
  // only the subject follows the new choice.
  const edited = await message.inputValue();
  await contact.getByRole("radio", { name: intent.label, exact: true }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(contact.getByRole("radio", { name: contactIntents[0].label, exact: true })).toBeChecked();
  await expect(message).toHaveValue(edited);
  await expect(contact.getByText(contactIntents[0].subject, { exact: true })).toBeVisible();
});

test("an untouched draft in the textarea follows a change of intent", async ({ page }) => {
  const contact = page.locator("#contact");
  await contact.getByRole("radio", { name: contactIntents[1].label, exact: true }).check();
  await contact.getByRole("button", { name: "Add a line of my own" }).click();
  await expect(contact.locator("#contact-message")).toHaveValue(contactIntents[1].messageDraft);

  await contact.getByRole("radio", { name: contactIntents[0].label, exact: true }).check();
  await expect(contact.locator("#contact-message")).toHaveCount(0);
  await expect(contact.getByRole("button", { name: "Send it as written" })).toBeVisible();
});

test("the secret intent declares data-cat-secret on the form, and only while selected", async ({ page }) => {
  const contact = page.locator("#contact");
  const form = contactForm(page);
  const secret = contactIntents.find((intent) => intent.id === "secret");
  if (!secret) throw new Error("The secret intent left the content layer — update this spec with it.");

  // Declaration side of the companion contract only: the cats' reaction is
  // pinned in companion.spec.ts. Here the form must raise the flag while the
  // secret intent is selected and lower it the moment another intent is.
  // The bare `form` element exists before any choice; the name field (and so
  // this locator) only once one is made.
  await expect(contact.locator("form")).not.toHaveAttribute("data-cat-secret");
  await contact.getByRole("radio", { name: secret.label, exact: true }).check();
  await expect(form).toHaveAttribute("data-cat-secret", "");
  await contact.getByRole("radio", { name: contactIntents[0].label, exact: true }).check();
  await expect(form).not.toHaveAttribute("data-cat-secret");
});

test("sending with no name or reply address shows inline validation, not a submission", async ({ page }) => {
  const contact = page.locator("#contact");
  await contact.getByRole("radio", { name: contactIntents[0].label, exact: true }).check();
  const form = contactForm(page);

  await form.getByRole("button", { name: "Send it as written" }).click();

  await expect(form.getByRole("alert")).toHaveText(/fix the highlighted field/i);
  await expect(page.locator("#contact-name")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#contact-name")).toBeFocused();
  await expect(page.locator("#contact-name-error")).toHaveText("Enter your name.");
  await expect(page.locator("#contact-email-error")).toHaveText("Enter your email address.");
  await expect(page.locator("#contact-email")).toHaveAttribute("type", "email");

  await expect(form.getByRole("status")).toHaveText("");
  await expect(page).toHaveURL(/\/$/);
});

// The single most important behavioural guarantee on the page: this
// environment has no RESEND_API_KEY / CONTACT_TO_EMAIL / CONTACT_FROM_EMAIL
// configured, so the form must degrade to an honest mailto: fallback and
// must never claim a message was actually sent.
test("with email delivery unconfigured, the same send opens the email app and never claims success", async ({
  page,
}) => {
  const contact = page.locator("#contact");
  await contact.getByRole("radio", { name: contactIntents[2].label, exact: true }).check();
  const form = contactForm(page);
  const send = form.getByRole("button", { name: "Send it as written" });
  await expect(send).toBeVisible();
  await expect(send).toHaveAccessibleDescription(/opens your email app/i);

  await page.locator("#contact-name").fill("Jamie Reviewer");
  await page.locator("#contact-email").fill("jamie@example.com");
  await send.click();

  const status = form.getByRole("status");
  await expect(status).toContainText("email app should now be open");
  await expect(status).not.toContainText(/message sent/i);
  await expect(page.getByText(/message sent/i)).toHaveCount(0);
  await expect(form.getByRole("alert")).toHaveText("");
  // Focus stays where the visitor was (WCAG 2.4.3); the Resend path's own
  // focus move is unit-tested, since this suite runs without Resend.
  expect(await page.evaluate(() => document.activeElement?.closest("#contact") !== null)).toBe(true);
});

test("the honeypot field is present and not reachable by Tab", async ({ page }) => {
  const contact = page.locator("#contact");
  const form = contact.locator("form");
  const honeypot = form.locator("#contact-website");

  await expect(honeypot).toHaveCount(1);
  await expect(honeypot).toHaveAttribute("tabindex", "-1");
  await expect(honeypot).toHaveAttribute("aria-hidden", "true");

  // The honeypot sits after the last control in DOM order, so tabbing off
  // the last button is the step that would land on it.
  await contact.getByRole("radio", { name: contactIntents[0].label, exact: true }).check();
  await form.getByRole("button", { name: "Add a line of my own" }).focus();
  await page.keyboard.press("Tab");
  await expect(honeypot).not.toBeFocused();
  await expect(form.getByRole("button", { name: "Add a line of my own" })).not.toBeFocused();
});

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

test("the card offers email, GitHub and LinkedIn as direct links, no form needed", async ({ page }) => {
  const card = page.locator('#contact aside[aria-label$="business card"]');

  // Email is a real mailto, not a JS handler.
  await expect(card.locator('a[href^="mailto:"]').first()).toBeVisible();

  for (const name of [/^GitHub/, /^LinkedIn/]) {
    const link = card.getByRole("link", { name });
    await expect(link.first()).toHaveAttribute("rel", "noopener noreferrer");
    await expect(link.first()).toHaveAttribute("target", "_blank");
  }
});

/**
 * The page-wide axe audits (axe.spec.ts) see Contact only before an intent is
 * chosen, when the draft, the fields and the send button do not exist yet.
 * This audits the states this form adds, scoped to #contact, in both themes.
 */
for (const theme of ["day", "night"] as const) {
  test(`the chosen, expanded and invalid states add no WCAG violations (${theme})`, async ({ page }) => {
    test.skip(page.viewportSize()?.width !== 1440, "contrast and ARIA are viewport-independent; run once");
    await page.addInitScript((value) => window.localStorage.setItem("theme", value), theme);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

    const contact = page.locator("#contact");
    const audit = async (state: string) => {
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .include("#contact")
        .analyze();
      expect(violations.map((v) => `${state}: [${v.id}] ${v.nodes.map((n) => n.target.join(" ")).join("; ")}`)).toEqual([]);
    };

    await contact.getByRole("radio", { name: contactIntents[0].label, exact: true }).check();
    await contact.getByRole("button", { name: "Send it as written" }).click();
    await expect(page.locator("#contact-name-error")).toBeVisible();

    // The section inks in as it scrolls into view: until every `[data-ink]`
    // child has finished fading, axe measures contrast against text that is
    // still partly transparent. Wait for the finished state, not a timeout.
    await expect(contact).toHaveAttribute("data-inked", "");
    await expect
      .poll(() =>
        contact.evaluate((root) =>
          Array.from(root.querySelectorAll("[data-ink]")).filter((el) => getComputedStyle(el).opacity !== "1").length,
        ),
      )
      .toBe(0);
    await audit("chosen, invalid");

    await contact.getByRole("button", { name: "Add a line of my own" }).click();
    await expect(page.locator("#contact-message")).toBeFocused();
    await audit("expanded");
  });
}
