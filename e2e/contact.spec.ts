import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { contactCopy, profile } from "../src/content/portfolio";

/**
 * Contact (round 21): my business card clipped beside a postcard whose
 * address side is the lead form, always visible; the chat as a strip below.
 *
 * Which way the form delivers depends on the build: with the three Resend env
 * vars set it posts to /api/contact; without them it says it cannot send and
 * offers my address to copy (round 23: it never opens the visitor's mail app).
 * The posting tests mock the route with `page.route` and skip on a build
 * without the env; the "cannot send" test runs on either (directly, or through
 * a mocked 503).
 *
 * Round 24: the SENT stamp lands on empty paper (the picture's sky where the
 * postcard's sides stand side by side, the address side under the confirmation
 * where they stack), and email-or-phone is said before they try.
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
/** The stamp's two copies are both in the DOM (the picture's and the address
 *  side's); CSS shows exactly one, by the postcard's own width. */
const stamp = (page: Page) => postcard(page).locator("[data-sent-stamp]:visible");

async function sendAnEmailLead(page: Page) {
  await field(page, /^Your name/).fill("Jamie Reviewer");
  await field(page, /^Email/).fill("jamie@example.com");
  await send(page).click();
  await expect(postcard(page).getByRole("status")).toContainText(contactCopy.success);
}

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
  await expect(face.getByRole("link", { name: "Résumé", exact: true })).toHaveAttribute("href", profile.resumePdf!);
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

test("Tab runs from the postcard into my card, in reading order", async ({ page }) => {
  // Round 22: the postcard leads at every width, so its form comes first.
  onlyAt(page, WIDTHS);
  await open(page);
  await postcard(page).locator("input[name=name]").focus();
  const order: string[] = [];
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press("Tab");
    order.push(
      await page.evaluate(() => {
        const el = document.activeElement;
        if (el?.closest("aside")) return `card:${el.getAttribute("href") ?? el.textContent?.trim() ?? ""}`;
        return el?.getAttribute("name") ?? el?.textContent ?? "";
      }),
    );
  }
  expect(order).toEqual(["email", "phone", contactCopy.send, `card:mailto:${profile.email}`]);
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
  await expect(stamp(page)).toContainText(contactCopy.stamp);
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

test("email or phone is said before they try: one marker, one note, neither line required alone", async ({ page }) => {
  onlyAt(page, WIDTHS);
  await open(page);
  const pair = postcard(page).getByRole("group", { name: contactCopy.pairGroup });
  await expect(pair).toBeVisible();
  await expect(pair.getByText(contactCopy.pairNote)).toBeVisible();
  await expect(pair).toHaveAccessibleDescription(contactCopy.pairNote);
  expect(((await pair.textContent()) ?? "").match(/\*/g)).toHaveLength(1);
  for (const label of [/^Email/, /^or phone/]) {
    await expect(field(page, label)).not.toHaveAttribute("required", "");
    await expect(field(page, label)).not.toHaveAttribute("aria-invalid", "true");
  }
  // Nothing to fix yet, and nothing is said about the pair as an error.
  await expect(postcard(page).getByText(PAIR_ERROR)).toHaveCount(0);
});

test("neither shows the paired error", async ({ page }) => {
  onlyAt(page, WIDTHS);
  await open(page);
  const bodies = await mockApi(page, 200, { ok: true });
  await field(page, /^Your name/).fill("Jamie Reviewer");
  await send(page).click();

  await expect(postcard(page).getByText(PAIR_ERROR)).toHaveCount(1);
  await expect(postcard(page).getByText(contactCopy.pairNote)).toHaveCount(1);
  for (const label of [/^Email/, /^or phone/]) {
    await expect(field(page, label)).toHaveAttribute("aria-invalid", "true");
    await expect(field(page, label)).toHaveAccessibleDescription(PAIR_ERROR);
  }
  await expect(field(page, /^Email/)).toBeFocused();
  await expect(postcard(page).getByRole("status")).toHaveText("");
  expect(bodies).toEqual([]);
});

test("when it cannot send, it says so, offers my address to copy, and never opens the mail app", async ({ page }) => {
  onlyAt(page, WIDTHS);
  await open(page);
  // A posting build is pushed there by the server's own answer.
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

  await expect(postcard(page).getByRole("alert")).toContainText(contactCopy.offline);
  await expect(postcard(page).locator("[data-reach]")).toContainText(profile.email);
  await expect(postcard(page).locator("p[role=status]")).not.toContainText(contactCopy.success);
  await expect(postcard(page).locator("[data-sent-stamp]")).toHaveCount(0);
  expect(requested.filter((url) => url.startsWith("mailto:"))).toEqual([]);

  // The copy button writes my address (the clipboard is recorded, not real).
  await page.evaluate(() => {
    (navigator.clipboard as unknown as { writeText: (v: string) => Promise<void> }).writeText = async (v) => {
      (window as unknown as { __copied?: string }).__copied = v;
    };
  });
  await postcard(page).getByRole("button", { name: contactCopy.copyAddress }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __copied?: string }).__copied)).toBe(profile.email);
});

test("a failed send is said plainly, with the same way out", async ({ page }) => {
  onlyAt(page, WIDTHS);
  await open(page);
  test.skip(!(await postsToApi(page)), "this build has no Resend env, so the form never posts");
  await mockApi(page, 502, { ok: false, reason: "send-failed" });
  await field(page, /^Your name/).fill("Jamie Reviewer");
  await field(page, /^Email/).fill("jamie@example.com");
  await send(page).click();
  await expect(postcard(page).getByRole("alert")).toContainText(contactCopy.failed);
  await expect(postcard(page).locator("[data-reach]")).toContainText(profile.email);
  await expect(postcard(page).locator("[data-sent-stamp]")).toHaveCount(0);
});

test("the Résumé chip opens the PDF in a dialog from 640px, and the PDF waits until then", async ({ page }) => {
  onlyAt(page, [1440]);
  const pdfRequests: string[] = [];
  page.on("request", (r) => r.url().endsWith(profile.resumePdf!) && pdfRequests.push(r.url()));
  await open(page);
  const chip = card(page).getByRole("link", { name: "Résumé", exact: true });
  const dialog = page.locator("dialog[data-resume-dialog]");
  await expect(dialog).toBeHidden();
  expect(pdfRequests).toEqual([]);

  await chip.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("iframe")).toHaveAttribute("src", profile.resumePdf!);
  await expect(dialog.getByRole("link", { name: "Download" })).toHaveAttribute("download", "");
  await expect(dialog.getByRole("link", { name: "Open in a new tab" })).toHaveAttribute("target", "_blank");
  const box = await dialog.boundingBox();
  expect(box!.width).toBeGreaterThan(900);
  expect(box!.height).toBeGreaterThan(700);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(chip).toBeFocused();
});

test("on a phone the Résumé chip just opens the PDF", async ({ page }) => {
  onlyAt(page, [390]);
  await open(page);
  const chip = card(page).getByRole("link", { name: "Résumé", exact: true });
  // A headless browser turns a PDF navigation into a download, so watch for the request.
  const asked = page.waitForRequest((r) => r.url().endsWith(profile.resumePdf!));
  await chip.click();
  await asked;
  await expect(page.locator("dialog[data-resume-dialog]")).toBeHidden();
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

test("postcard beside the card from 1024, the chat strip under both; stacked below", async ({ page }) => {
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
    // Round 22 mirrors the board: the postcard on the left, my card on the right.
    expect(postBox.x + postBox.width).toBeLessThanOrEqual(cardBox.x + 8);
    expect(Math.abs(cardBox.y - postBox.y)).toBeLessThan(60);
  } else {
    expect(postBox.y + postBox.height).toBeLessThanOrEqual(cardBox.y + 8);
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
        (n) => !n.closest("[aria-hidden=true], dialog:not([open])"),
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

test("the page's only control fills are See what I've built, Watch it grow and Send the postcard", async ({ page }) => {
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
  expect(fills).toEqual(["See what I've built", "Watch it grow", contactCopy.send]);
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

/* -------------------------------------------------------------------------- */
/* Round 24: the SENT stamp on empty paper                                     */
/* -------------------------------------------------------------------------- */

const ALL_WIDTHS = [320, 375, 390, 768, 1024, 1440];

test("the SENT stamp lands on empty paper, in view, over no word, field or control", async ({ page }) => {
  onlyAt(page, ALL_WIDTHS);
  // Where the paper lies, not mid-entrance, and with the scroll settled at once.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  test.skip(!(await postsToApi(page)), "this build has no Resend env, so the form never posts");
  await mockApi(page, 200, { ok: true, thanked: true });
  await sendAnEmailLead(page);
  await expect(stamp(page)).toHaveCount(1);
  await expect(stamp(page)).toHaveAttribute("aria-hidden", "true");
  await expect(stamp(page)).toContainText(contactCopy.stamp);
  await expect(stamp(page)).toContainText("TAYLORS SC");

  const found = await stamp(page).evaluate((el) => {
    const mine = el.getBoundingClientRect();
    const hits: string[] = [];
    const overlaps = (a: DOMRect, b: DOMRect, slack = 1) =>
      a.left < b.right - slack && a.right > b.left + slack && a.top < b.bottom - slack && a.bottom > b.top + slack;
    const paper = el.closest("[data-postcard]")!;
    // Every word, field and control on the postcard, and its two drawn stamps.
    const things = paper.querySelectorAll<HTMLElement>(
      "h3, p, label, input, button, a, [data-scenery='flag-stamp'], [data-scenery='postmark'], [data-scenery='postmark'] + span",
    );
    for (const thing of things) {
      if (el.contains(thing) || thing.id === "lead-website") continue;
      const box = thing.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      if (overlaps(mine, box)) hits.push(`${thing.tagName.toLowerCase()} ${(thing.textContent ?? thing.getAttribute("data-scenery") ?? "").trim().slice(0, 30)}`);
    }
    return { hits, where: (el as HTMLElement).dataset.sentStamp, rect: [mine.left, mine.top, mine.right, mine.bottom].map(Math.round) };
  });
  expect(found.hits, `the stamp ${JSON.stringify(found.rect)} sits over: ${found.hits.join(", ")}`).toEqual([]);
  // In view, whole, once the scroll that brings it there has settled.
  await expect
    .poll(
      () =>
        stamp(page).evaluate((el) => {
          const r = el.getBoundingClientRect();
          // A pixel of slack: a stamp scrolled "to the nearest edge" ends on it.
          return r.top >= -1 && r.bottom <= window.innerHeight + 1 && r.left >= -1 && r.right <= window.innerWidth + 1;
        }),
      { message: "the stamp is wholly in view", timeout: 5_000 },
    )
    .toBe(true);
  // Side by side it is on the picture; stacked, on the address side's paper.
  expect(found.where).toBe((page.viewportSize()?.width ?? 0) >= 768 ? "board" : "slot");
});

test("on the picture the stamp keeps to the empty sky: left of the sun, above the pines, under the heading", async ({ page }) => {
  onlyAt(page, [768, 1024, 1440]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  test.skip(!(await postsToApi(page)), "this build has no Resend env, so the form never posts");
  await mockApi(page, 200, { ok: true });
  await sendAnEmailLead(page);
  await expect(stamp(page)).toHaveAttribute("data-sent-stamp", "board");

  // In the drawing's own 340 x 440 units, from layout sizes (not the turned
  // screen boxes), so the postcard's slight tilt does not blur the answer.
  const sky = await stamp(page).evaluate((node) => {
    const el = node as HTMLElement;
    const box = el.offsetParent as HTMLElement;
    const scale = 340 / box.offsetWidth;
    const w = el.offsetWidth, h = el.offsetHeight, a = (5 * Math.PI) / 180;
    // The stamp's own turn of 5 degrees: the corners of its box, about its centre.
    const cx = el.offsetLeft + w / 2, cy = el.offsetTop + h / 2;
    const spanX = (w * Math.cos(a) + h * Math.sin(a)) / 2, spanY = (w * Math.sin(a) + h * Math.cos(a)) / 2;
    const heading = box.closest(".postcard-sky")!.querySelector("p")!;
    const headingBottom = heading.offsetTop + heading.offsetHeight - box.offsetTop;
    return {
      left: (cx - spanX) * scale,
      right: (cx + spanX) * scale,
      top: cy - spanY,
      bottom: (cy + spanY) * scale,
      topAboveHeadingPx: cy - spanY - headingBottom,
      boxWidth: box.offsetWidth,
    };
  });
  // The sun's ring starts at x 216 and the pines' tips are at y 150.
  expect(sky.left, "inside the picture").toBeGreaterThanOrEqual(0);
  expect(sky.right, "clear of the sun").toBeLessThanOrEqual(212);
  expect(sky.bottom, "clear of the pines").toBeLessThanOrEqual(146);
  expect(sky.topAboveHeadingPx, "clear of the heading (px)").toBeGreaterThanOrEqual(4);
  expect(sky.boxWidth).toBeGreaterThan(200);
});

test("the stamp is bigger and easier to see than round 23's: at least the size of its words", async ({ page }) => {
  onlyAt(page, [390, 1440]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  test.skip(!(await postsToApi(page)), "this build has no Resend env, so the form never posts");
  await mockApi(page, 200, { ok: true });
  await sendAnEmailLead(page);
  const box = await stamp(page).boundingBox();
  // Round 23's was ~135 x 65. This one is a double-ruled plate with SENT in heavy caps.
  expect(box!.width).toBeGreaterThan(150);
  expect(box!.height).toBeGreaterThan(85);
  const sizes = await stamp(page).evaluate((el) => ({
    word: getComputedStyle(el.querySelector(".sent-stamp__word")!).fontWeight,
    wordPx: parseFloat(getComputedStyle(el.querySelector(".sent-stamp__word")!).fontSize),
    smallPx: parseFloat(getComputedStyle(el.querySelector(".sent-stamp__place")!).fontSize),
    rule: getComputedStyle(el).borderTopStyle,
    masked: getComputedStyle(el).maskImage,
  }));
  expect(Number(sizes.word)).toBeGreaterThanOrEqual(800);
  expect(sizes.wordPx).toBeGreaterThan(30);
  expect(sizes.smallPx, "the small lines stay legible").toBeGreaterThanOrEqual(8);
  expect(sizes.rule).toBe("solid");
  expect(sizes.masked).toContain("/scenery/stamp-wear.svg");
});

test("it lands like a stamp where motion is welcome, and is simply there under reduced motion", async ({ page }) => {
  onlyAt(page, [1440]);
  for (const motion of ["no-preference", "reduce"] as const) {
    await page.emulateMedia({ reducedMotion: motion });
    await open(page);
    test.skip(!(await postsToApi(page)), "this build has no Resend env, so the form never posts");
    await page.unroute("**/api/contact").catch(() => {});
    await mockApi(page, 200, { ok: true });
    await sendAnEmailLead(page);
    const now = await stamp(page).evaluate((el) => {
      const cs = getComputedStyle(el);
      return { name: cs.animationName, opacity: cs.opacity, scale: cs.scale };
    });
    if (motion === "reduce") expect(now, "already there").toMatchObject({ name: "none", opacity: "1", scale: "none" });
    else expect(now.name).toBe("sent-stamp-press");
    // And once it has landed, it is whole and settled either way.
    await expect.poll(() => stamp(page).evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  }
});

test("a thank-you line appears only when a thank-you went, and phone-only gets none", async ({ page }) => {
  onlyAt(page, [390, 1440]);
  await open(page);
  test.skip(!(await postsToApi(page)), "this build has no Resend env, so the form never posts");
  await mockApi(page, 200, { ok: true, thanked: true });
  await sendAnEmailLead(page);
  await expect(postcard(page).getByRole("status")).toContainText(contactCopy.thanked);

  await page.unroute("**/api/contact");
  await mockApi(page, 200, { ok: true, thanked: false });
  await field(page, /^Your name/).fill("Jamie Reviewer");
  await field(page, /^or phone/).fill("+1 (864) 555-0100");
  await send(page).click();
  await expect(postcard(page).getByRole("status")).toContainText(contactCopy.success);
  await expect(postcard(page).getByRole("status")).not.toContainText(contactCopy.thanked);
});

test("the stamped postcard has zero WCAG violations, by day and by night", async ({ page }) => {
  onlyAt(page, [1440]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  test.skip(!(await postsToApi(page)), "this build has no Resend env, so the form never posts");
  await mockApi(page, 200, { ok: true, thanked: true });
  await sendAnEmailLead(page);
  await page.waitForTimeout(500);
  for (const theme of ["day", "night"] as const) {
    if ((await page.locator("html").getAttribute("data-theme")) !== theme) {
      await page.getByRole("button", { name: `Switch to ${theme} theme` }).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    }
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .include("#contact [data-postcard]")
      .analyze();
    expect(
      results.violations.map((v) => `[${v.id}] ${v.help}: ${v.nodes.map((n) => n.target.join(" ")).join("; ")}`),
      theme,
    ).toEqual([]);
  }
});
