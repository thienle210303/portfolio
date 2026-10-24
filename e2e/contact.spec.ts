import { test, expect, type Page } from "@playwright/test";
import { contactCopy, profile } from "../src/content/portfolio";
import { buildLeadMailto } from "../src/lib/contact";

/**
 * Contact (round 21): my business card clipped beside a postcard whose
 * address side is the lead form, always visible; the chat as a strip below.
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
  await postcard(page).scrollIntoViewIfNeeded();
}

const card = (page: Page) => page.locator('#contact aside[aria-label="Thien Le — business card"]');
const postcard = (page: Page) => page.locator("#contact [data-postcard]");
const field = (page: Page, label: RegExp) => postcard(page).getByLabel(label);
const send = (page: Page) => postcard(page).getByRole("button", { name: contactCopy.send });

/** The build's delivery mode, which the form declares. */
async function postsToApi(page: Page): Promise<boolean> {
  return (await postcard(page).locator("form").getAttribute("data-delivery")) === "api";
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

test("my card has every way to reach me", async ({ page }) => {
  onlyAt(page, WIDTHS);
  await open(page);
  const face = card(page);
  await expect(face.getByText(profile.name, { exact: true })).toBeVisible();
  await expect(face.getByText(profile.title, { exact: true })).toBeVisible();
  await expect(face.getByText(profile.location, { exact: true })).toBeVisible();
  await expect(face.getByText(profile.philosophy, { exact: true })).toBeVisible();
  await expect(face.getByText("Thiện", { exact: true })).toBeVisible();
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
  // The email never truncates: the whole address is on the card.
  const clipped = await face
    .getByRole("link", { name: profile.email })
    .evaluate((a) => a.scrollWidth > a.clientWidth);
  expect(clipped).toBe(false);
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
  await card(page).getByRole("button", { name: "Copy email address" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __copied?: string }).__copied)).toBe(profile.email);
});

test("the email copy control's hit area reaches a full 44px even though its visible box is 32px", async ({ page }) => {
  onlyAt(page, [1440]);
  await open(page);
  const button = card(page).getByRole("button", { name: "Copy email address" });
  const box = await button.boundingBox();
  if (!box) throw new Error("copy control did not render a box");
  // The card is turned 2.5°, so the box grows by a pixel or so.
  expect(box.width).toBeLessThan(36);
  expect(box.height).toBeLessThan(36);

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

test("the postcard is the form: always there, nothing to turn over", async ({ page }) => {
  onlyAt(page, WIDTHS);
  await open(page);
  const pc = postcard(page);
  await expect(pc.getByText(contactCopy.postcard.greetings)).toBeVisible();
  await expect(pc.getByText(contactCopy.postcard.place, { exact: true })).toBeVisible();
  await expect(pc.getByRole("heading", { name: contactCopy.formHeading })).toBeVisible();
  await expect(pc.getByText(contactCopy.formNote)).toBeVisible();
  for (const label of [/^Your name/, /^Email/, /^or phone/]) await expect(field(page, label)).toBeVisible();
  await expect(send(page)).toBeVisible();
  await expect(page.locator("#contact [data-flip]")).toHaveCount(0);
  await expect(page.locator("#contact").getByRole("button", { name: /Let me reach you|^Back$/ })).toHaveCount(0);
});

test("Tab runs from my card into the postcard, in reading order", async ({ page }) => {
  onlyAt(page, WIDTHS);
  await open(page);
  await card(page).getByRole("link", { name: "Save contact" }).focus();
  const order: string[] = [];
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press("Tab");
    order.push(await page.evaluate(() => document.activeElement?.getAttribute("name") ?? document.activeElement?.textContent ?? ""));
  }
  expect(order).toEqual(["name", "email", "phone", contactCopy.send]);
});

test("email-only lead posts and shows success", async ({ page }) => {
  onlyAt(page, WIDTHS);
  await open(page);
  test.skip(!(await postsToApi(page)), "this build has no Resend env, so the form never posts");
  const bodies = await mockApi(page, 200, { ok: true });
  await field(page, /^Your name/).fill("Jamie Reviewer");
  await field(page, /^Email/).fill("jamie@example.com");
  await send(page).click();

  await expect(postcard(page).getByRole("status")).toHaveText(contactCopy.success);
  expect(bodies).toEqual([{ name: "Jamie Reviewer", email: "jamie@example.com", phone: "", website: "" }]);
  await expect(field(page, /^Your name/)).toHaveValue("");
});

test("phone-only lead posts", async ({ page }) => {
  onlyAt(page, WIDTHS);
  await open(page);
  test.skip(!(await postsToApi(page)), "this build has no Resend env, so the form never posts");
  const bodies = await mockApi(page, 200, { ok: true });
  await field(page, /^Your name/).fill("Jamie Reviewer");
  await field(page, /^or phone/).fill("+1 (864) 555-0100");
  await send(page).click();

  await expect(postcard(page).getByRole("status")).toHaveText(contactCopy.success);
  expect(bodies).toEqual([{ name: "Jamie Reviewer", email: "", phone: "+1 (864) 555-0100", website: "" }]);
});

test("neither shows the paired error", async ({ page }) => {
  onlyAt(page, WIDTHS);
  await open(page);
  const bodies = await mockApi(page, 200, { ok: true });
  await field(page, /^Your name/).fill("Jamie Reviewer");
  await send(page).click();

  await expect(postcard(page).getByText(PAIR_ERROR)).toHaveCount(1);
  for (const label of [/^Email/, /^or phone/]) {
    await expect(field(page, label)).toHaveAttribute("aria-invalid", "true");
    await expect(field(page, label)).toHaveAccessibleDescription(PAIR_ERROR);
  }
  await expect(field(page, /^Email/)).toBeFocused();
  await expect(postcard(page).getByRole("status")).toHaveText("");
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

  await field(page, /^Your name/).fill("Jamie Reviewer");
  await field(page, /^Email/).fill("jamie@example.com");
  await field(page, /^or phone/).fill("864 555 0100");
  await send(page).click();

  const href = buildLeadMailto({ name: "Jamie Reviewer", email: "jamie@example.com", phone: "864 555 0100" }, profile.email);
  await expect.poll(() => requested).toContain(href);
  await expect(postcard(page).getByRole("status")).toContainText(/email app/i);
  await expect(postcard(page).getByRole("status")).not.toContainText(contactCopy.success);
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

test("card beside the postcard from 1024, the chat strip under both; stacked below", async ({ page }) => {
  onlyAt(page, [390, 768, 1024, 1440]);
  // Where the papers lie, not where they are mid-entrance: the postcard settles
  // (scroll-driven, round 21 phase 8) from 28px up and 3.5 degrees turned.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  const [cardBox, postBox, askBox] = await Promise.all([card(page), postcard(page), page.locator("#ask")].map((l) => l.boundingBox()));
  if (!cardBox || !postBox || !askBox) throw new Error("card, postcard or chat rendered no box");
  const side = page.viewportSize()!.width >= 1024;
  if (side) {
    // Turned paper: allow the few pixels a 2.5° turn adds.
    expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(postBox.x + 8);
    expect(Math.abs(cardBox.y - postBox.y)).toBeLessThan(60);
  } else {
    expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(postBox.y + 8);
  }
  expect(Math.max(cardBox.y + cardBox.height, postBox.y + postBox.height)).toBeLessThanOrEqual(askBox.y + 8);
});

test("nothing on the card or the postcard overflows its paper", async ({ page }) => {
  onlyAt(page, [390, 1024, 1440]);
  await open(page);
  for (const paper of [card(page).locator(".paper-lift"), postcard(page).locator(".paper-lift")]) {
    const spill = await paper.evaluate((el) => {
      // The monogram bleeds off the card on purpose; it is aria-hidden.
      const flow = Array.from(el.querySelectorAll<HTMLElement>("p, a, button, input, label, h3, li")).filter(
        (n) => !n.closest("[aria-hidden=true]"),
      );
      const box = el.getBoundingClientRect();
      return flow
        .map((n) => n.getBoundingClientRect())
        .filter((r) => r.right > box.right + 1 || r.bottom > box.bottom + 1 || r.left < box.left - 1).length;
    });
    expect(spill).toBe(0);
  }
});

test("no scenery sits on top of a control", async ({ page }) => {
  onlyAt(page, [390, 1024, 1440]);
  await open(page);
  // Wait for the chat, so its controls are measured too.
  await page.locator("#ask").scrollIntoViewIfNeeded();
  await expect(page.getByRole("textbox", { name: "Your question" })).toBeVisible({ timeout: 15_000 });
  const controls = page.locator("#contact").locator("a, button, input");
  const count = await controls.count();
  expect(count).toBeGreaterThan(10);
  for (let i = 0; i < count; i += 1) {
    const control = controls.nth(i);
    if (!(await control.isVisible()) || (await control.getAttribute("tabindex")) === "-1") continue;
    await control.scrollIntoViewIfNeeded();
    const hit = await control.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !top || el === top || el.contains(top) || top.contains(el) ? "ok" : (top.closest("[data-scenery]")?.getAttribute("data-scenery") ?? "ok");
    });
    expect(hit, `scenery over control ${i}`).toBe("ok");
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
  await field(page, /^Your name/).fill("Jamie Reviewer");
  await field(page, /^Email/).fill("jamie@example.com");
  await send(page).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __sent?: number }).__sent)).toBe(1);
});

test("the page's only control fills are Start with where I'm from, Watch it grow and Send the postcard", async ({ page }) => {
  onlyAt(page, [1440]);
  await open(page);
  // Hairlines are not fills: the nav's 1px underline uses `bg-accent`, not a control fill.
  const fills = await page.evaluate(() =>
    Array.from(document.body.querySelectorAll("*"))
      .filter((el) => el.getBoundingClientRect().height > 2)
      .filter((el) =>
        [/(^|\s)bg-control(\s|$)/, /(^|\s)bg-\[color:var\(--control\)\](\s|$)/].some((fill) =>
          fill.test(el.getAttribute("class") ?? ""),
        ),
      )
      .map((el) => el.textContent?.trim()),
  );
  expect(fills).toEqual(["Start with where I'm from", "Watch it grow", contactCopy.send]);
});

test("the honeypot is present and not reachable by Tab", async ({ page }) => {
  onlyAt(page, [1440]);
  await open(page);
  const honeypot = postcard(page).locator("#lead-website");
  await expect(honeypot).toHaveAttribute("tabindex", "-1");
  await expect(honeypot).toHaveAttribute("aria-hidden", "true");
  await field(page, /^Your name/).focus();
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press("Tab");
    await expect(honeypot).not.toBeFocused();
  }
});

test("the night lanterns are lit and the day's silk is not fetched at night", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-1440", "runs at 1440 px");
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
  const page = await context.newPage();
  const fetched: string[] = [];
  page.on("request", (r) => fetched.push(r.url()));
  await open(page);
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await expect(page.locator('#contact [data-scenery="lanterns-night"]')).toBeVisible();
  await expect(page.locator('#contact [data-scenery="lanterns-day"]')).toBeHidden();
  await expect(page.locator("#contact").getByText(contactCopy.cheer)).toBeVisible();
  await expect(page.locator('#contact [data-scenery="pho"]')).toBeHidden();
  await page.waitForLoadState("networkidle");
  expect(fetched.some((u) => u.endsWith("/scenery/lanterns-night.svg"))).toBe(true);
  expect(fetched.some((u) => u.endsWith("/scenery/lanterns-day.svg"))).toBe(false);
  await context.close();
});
