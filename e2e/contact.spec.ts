import { test, expect, type Page } from "@playwright/test";
import { contactCopy, profile } from "../src/content/portfolio";
import { buildLeadMailto } from "../src/lib/contact";

/**
 * Contact: the chat beside a business card that flips to a short lead form.
 *
 * Which way the form delivers depends on the build: with the three Resend env
 * vars set it posts to /api/contact, without them it opens a `mailto:`. The
 * posting tests mock the route with `page.route` and skip on a mailto build;
 * the fallback test runs on either (directly, or through a mocked 503).
 */

const PAIR_ERROR = "Add an email or a phone number so I can reach you.";
const WIDTHS = [390, 1440];

async function open(page: Page) {
  // Wait for the islands to hydrate: key presses race React otherwise.
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await card(page).scrollIntoViewIfNeeded();
}

const card = (page: Page) => page.locator('#contact aside[aria-label="Thien Le — business card"]');
const flip = (page: Page) => card(page).locator("[data-flip]");
const front = (page: Page) => card(page).locator('[data-face="front"]');
const back = (page: Page) => card(page).locator('[data-face="back"]');
const trigger = (page: Page) => front(page).getByRole("button", { name: "Let me reach you" });
const field = (page: Page, label: RegExp) => back(page).getByLabel(label);

/** The build's delivery mode, which the form declares. */
async function postsToApi(page: Page): Promise<boolean> {
  return (await back(page).locator("form").getAttribute("data-delivery")) === "api";
}

async function flipToForm(page: Page) {
  await trigger(page).click();
  await expect(flip(page)).toHaveAttribute("data-flipped", "true");
  await expect(field(page, /^Name/)).toBeFocused();
}

/** Records every POST body sent to /api/contact and answers with `reply`. */
async function mockApi(page: Page, status: number, reply: unknown) {
  const bodies: unknown[] = [];
  await page.route("**/api/contact", async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(reply) });
  });
  return bodies;
}

function onlyAt(page: Page, widths: readonly number[]) {
  const width = page.viewportSize()?.width ?? 0;
  test.skip(!widths.includes(width), `runs at ${widths.join(" and ")} px`);
}

test("card front has every way to reach me", async ({ page }) => {
  onlyAt(page, WIDTHS);
  await open(page);
  const face = front(page);
  await expect(face.getByText(profile.name, { exact: true })).toBeVisible();
  await expect(face.getByText(profile.title, { exact: true })).toBeVisible();
  await expect(face.getByText(profile.location, { exact: true })).toBeVisible();
  await expect(face.getByText(`“${profile.philosophy}”`)).toBeVisible();
  await expect(face.getByRole("link", { name: profile.email })).toHaveAttribute("href", `mailto:${profile.email}`);
  await expect(face.getByRole("button", { name: "Copy email address" })).toBeVisible();
  for (const name of [/^GitHub/, /^LinkedIn/]) {
    await expect(face.getByRole("link", { name })).toHaveAttribute("target", "_blank");
    await expect(face.getByRole("link", { name })).toHaveAttribute("rel", "noopener noreferrer");
  }
  await expect(face.getByRole("link", { name: "Résumé", exact: true })).toHaveAttribute("href", "/resume");
  const vcf = face.getByRole("link", { name: "Save contact" });
  await expect(vcf).toHaveAttribute("href", "/contact.vcf");
  await expect(vcf).toHaveAttribute("download", "");
  await expect(trigger(page)).toBeVisible();
});

test("copy email copies", async ({ page }) => {
  onlyAt(page, WIDTHS);
  // The headless shell has no system clipboard to settle a real write
  // against, so the write is recorded instead.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async (text: string) => void ((window as unknown as { __copied: string }).__copied = text) },
    });
  });
  await open(page);
  const button = front(page).getByRole("button", { name: "Copy email address" });
  await button.click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __copied?: string }).__copied)).toBe(profile.email);
  await expect(flip(page)).toHaveAttribute("data-flipped", "false");
});

test("the email copy control's hit area reaches a full 44px even though its visible box is 32px", async ({ page }) => {
  onlyAt(page, [1440]);
  await open(page);
  const button = front(page).getByRole("button", { name: "Copy email address" });
  const box = await button.boundingBox();
  if (!box) throw new Error("copy control did not render a box");
  expect(box.width).toBeCloseTo(32, 0);
  expect(box.height).toBeCloseTo(32, 0);

  // Record the real click's target rather than waiting on the clipboard.
  await page.evaluate(() => {
    window.addEventListener(
      "click",
      (e) => {
        const t = e.target as HTMLElement;
        (window as unknown as { __target: string }).__target = `${t.tagName}[${t.getAttribute("aria-label") ?? ""}]`;
      },
      true,
    );
  });
  // 5px outside the visible box: inside CopyButton's compact halo.
  await page.mouse.click(box.x - 5, box.y + box.height / 2);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __target?: string }).__target))
    .toBe("BUTTON[Copy email address]");
});

test("clicking the card's empty area flips; clicking a link does not", async ({ page }) => {
  onlyAt(page, WIDTHS);
  await open(page);
  // Keep the links' own navigation from leaving the page; the card still
  // sees the click.
  await page.evaluate(() =>
    document.addEventListener("click", (e) => (e.target as Element).closest("a") && e.preventDefault(), true),
  );
  for (const name of ["Résumé", "Save contact", profile.email]) {
    await front(page).getByRole("link", { name, exact: true }).click();
    await expect(flip(page), name).toHaveAttribute("data-flipped", "false");
  }
  await front(page).click({ position: { x: 12, y: 12 } });
  await expect(flip(page)).toHaveAttribute("data-flipped", "true");
  // The back face does not flip on its own area: only Back and Escape.
  await back(page).click({ position: { x: 12, y: 12 } });
  await expect(flip(page)).toHaveAttribute("data-flipped", "true");
});

test("flip by keyboard: focus lands in the name field; Escape flips back to the trigger", async ({ page }) => {
  onlyAt(page, WIDTHS);
  await open(page);
  await trigger(page).focus();
  await page.keyboard.press("Enter");
  await expect(flip(page)).toHaveAttribute("data-flipped", "true");
  await expect(field(page, /^Name/)).toBeFocused();
  await page.keyboard.type("Jamie");
  await page.keyboard.press("Escape");
  await expect(flip(page)).toHaveAttribute("data-flipped", "false");
  await expect(trigger(page)).toBeFocused();

  // Back, by keyboard, returns focus the same way.
  await page.keyboard.press("Enter");
  await expect(field(page, /^Name/)).toBeFocused();
  await back(page).getByRole("button", { name: "Back" }).focus();
  await page.keyboard.press("Enter");
  await expect(trigger(page)).toBeFocused();
});

test("hidden face is inert", async ({ page }) => {
  onlyAt(page, WIDTHS);
  await open(page);
  await expect(back(page)).toHaveAttribute("inert", "");
  await expect(front(page)).not.toHaveAttribute("inert");
  // Playwright's role queries ignore `inert`, so ask the browser: an inert
  // field refuses focus.
  await back(page).locator("#lead-name").evaluate((el: HTMLElement) => el.focus());
  await expect(back(page).locator("#lead-name")).not.toBeFocused();

  await flipToForm(page);
  await expect(front(page)).toHaveAttribute("inert", "");
  await expect(back(page)).not.toHaveAttribute("inert");
  // Tabbing through the whole back face never lands on the front.
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press("Tab");
    expect(await front(page).evaluate((el) => el.contains(document.activeElement))).toBe(false);
  }
});

test("email-only lead posts and shows success", async ({ page }) => {
  onlyAt(page, WIDTHS);
  await open(page);
  test.skip(!(await postsToApi(page)), "this build has no Resend env, so the form never posts");
  const bodies = await mockApi(page, 200, { ok: true });
  await flipToForm(page);
  await field(page, /^Name/).fill("Jamie Reviewer");
  await field(page, /^Email/).fill("jamie@example.com");
  await back(page).getByRole("button", { name: "Send" }).click();

  await expect(back(page).getByRole("status")).toHaveText(contactCopy.success);
  expect(bodies).toEqual([{ name: "Jamie Reviewer", email: "jamie@example.com", phone: "", website: "" }]);
  await expect(field(page, /^Name/)).toHaveValue("");
});

test("phone-only lead posts", async ({ page }) => {
  onlyAt(page, WIDTHS);
  await open(page);
  test.skip(!(await postsToApi(page)), "this build has no Resend env, so the form never posts");
  const bodies = await mockApi(page, 200, { ok: true });
  await flipToForm(page);
  await field(page, /^Name/).fill("Jamie Reviewer");
  await field(page, /^Phone/).fill("+1 (864) 555-0100");
  await back(page).getByRole("button", { name: "Send" }).click();

  await expect(back(page).getByRole("status")).toHaveText(contactCopy.success);
  expect(bodies).toEqual([{ name: "Jamie Reviewer", email: "", phone: "+1 (864) 555-0100", website: "" }]);
});

test("neither shows the paired error", async ({ page }) => {
  onlyAt(page, WIDTHS);
  await open(page);
  const bodies = await mockApi(page, 200, { ok: true });
  await flipToForm(page);
  await field(page, /^Name/).fill("Jamie Reviewer");
  await back(page).getByRole("button", { name: "Send" }).click();

  await expect(back(page).getByText(PAIR_ERROR)).toHaveCount(1);
  for (const label of [/^Email/, /^Phone/]) {
    await expect(field(page, label)).toHaveAttribute("aria-invalid", "true");
    await expect(field(page, label)).toHaveAccessibleDescription(PAIR_ERROR);
  }
  await expect(field(page, /^Email/)).toBeFocused();
  await expect(back(page).getByRole("status")).toHaveText("");
  expect(bodies).toEqual([]);
});

test("mailto fallback when not configured", async ({ page }) => {
  onlyAt(page, WIDTHS);
  await open(page);
  // A posting build is pushed down the fallback by the server's own answer.
  if (await postsToApi(page)) await mockApi(page, 503, { ok: false, reason: "not-configured" });

  // A `mailto:` navigation leaves no page or network trace, but the renderer
  // still asks the browser for it.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Page.enable");
  const requested: string[] = [];
  cdp.on("Page.frameRequestedNavigation", ({ url }) => requested.push(url));

  await flipToForm(page);
  await field(page, /^Name/).fill("Jamie Reviewer");
  await field(page, /^Email/).fill("jamie@example.com");
  await field(page, /^Phone/).fill("864 555 0100");
  await back(page).getByRole("button", { name: "Send" }).click();

  const href = buildLeadMailto({ name: "Jamie Reviewer", email: "jamie@example.com", phone: "864 555 0100" }, profile.email);
  await expect.poll(() => requested).toContain(href);
  await expect(back(page).getByRole("status")).toContainText(/email app/i);
  await expect(back(page).getByRole("status")).not.toContainText(contactCopy.success);
});

test("GET /contact.vcf returns text/vcard as an attachment", async ({ page, request }) => {
  onlyAt(page, [1440]);
  const response = await request.get("/contact.vcf");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("text/vcard; charset=utf-8");
  expect(response.headers()["content-disposition"]).toBe('attachment; filename="thien-le.vcf"');
  const body = await response.text();
  expect(body.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n")).toBe(true);
  expect(body).toContain(`EMAIL;TYPE=INTERNET:${profile.email}`);
});

test("chat on the left, card on the right at 1440; stacked at 390", async ({ page }) => {
  onlyAt(page, WIDTHS);
  await open(page);
  const cardBox = await card(page).boundingBox();
  const askBox = await page.locator("#ask").boundingBox();
  if (!cardBox || !askBox) throw new Error("card or chat rendered no box");
  if (page.viewportSize()!.width === 1440) {
    expect(askBox.x + askBox.width).toBeLessThanOrEqual(cardBox.x);
    expect(Math.abs(askBox.y - cardBox.y)).toBeLessThan(80);
  } else {
    expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(askBox.y);
    expect(cardBox.width).toBeGreaterThan(300);
  }
});

test("neither face clips its content", async ({ page }) => {
  onlyAt(page, [390, 1024, 1440]);
  await open(page);
  // The monogram bleeds off the front on purpose, so scrollHeight says
  // nothing: compare the last in-flow child's bottom with the face's
  // padding edge instead.
  for (const face of [front(page), back(page)]) {
    const overshoot = await face.evaluate((el) => {
      const flow = Array.from(el.children).filter((c) => getComputedStyle(c).position !== "absolute");
      const last = flow[flow.length - 1].getBoundingClientRect().bottom;
      const edge = el.getBoundingClientRect().bottom - parseFloat(getComputedStyle(el).paddingBottom);
      return last - edge;
    });
    expect(overshoot).toBeLessThanOrEqual(1);
  }
});

test("cats cheer on success", async ({ page }) => {
  onlyAt(page, [1440]);
  await open(page);
  test.skip(!(await postsToApi(page)), "this build has no Resend env, so nothing is ever sent");
  await mockApi(page, 200, { ok: true });
  await page.evaluate(() =>
    window.addEventListener("portfolio:contact-sent", () => ((window as unknown as { __sent: number }).__sent = 1)),
  );
  await flipToForm(page);
  await field(page, /^Name/).fill("Jamie Reviewer");
  await field(page, /^Email/).fill("jamie@example.com");
  await back(page).getByRole("button", { name: "Send" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __sent?: number }).__sent)).toBe(1);
});

test("the page's only blue fills are the hero's See my work and the lead form's Send", async ({ page }) => {
  onlyAt(page, [1440]);
  await open(page);
  // The globe's controls only take their ready style once its chunk loads.
  const worlds = page.locator("#worlds");
  await worlds.getByRole("group", { name: /playground earth/i }).scrollIntoViewIfNeeded();
  await expect(worlds.getByRole("button", { name: /replay the flight|stop the replay/i })).toBeVisible({
    timeout: 20_000,
  });
  // Hairlines are not fills: the nav's 1px underline uses `bg-accent`.
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
  expect(blue).toEqual(["See my work", "Send"]);
});

test("the honeypot is present and not reachable by Tab", async ({ page }) => {
  onlyAt(page, [1440]);
  await open(page);
  const honeypot = back(page).locator("#lead-website");
  await expect(honeypot).toHaveAttribute("tabindex", "-1");
  await expect(honeypot).toHaveAttribute("aria-hidden", "true");
  await flipToForm(page);
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press("Tab");
    await expect(honeypot).not.toBeFocused();
  }
});

test("under reduced motion the flip is instant", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-1440", "runs at 1440 px");
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await open(page);
  expect(await flip(page).evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
  await flipToForm(page);
  await context.close();
});

test("leaving the form clears its status", async ({ page }) => {
  onlyAt(page, [1440]);
  await open(page);
  await flipToForm(page);
  await back(page).getByRole("button", { name: "Send" }).click();
  await expect(back(page).getByRole("alert")).not.toHaveText("");
  await page.keyboard.press("Escape");
  await expect(trigger(page)).toBeFocused();
  await trigger(page).click();
  await expect(back(page).getByRole("alert")).toHaveText("");
});
