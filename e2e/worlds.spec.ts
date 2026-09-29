import { test, expect, type Page } from "@playwright/test";
import { resolveWorlds } from "../src/lib/worlds";

const WORLDS = resolveWorlds();

test.describe("the worlds list is the feature; the canvas is decoration", () => {
  test("every world, plaque and source is reachable with the canvas chunk blocked", async ({
    page,
  }) => {
    // Not "with JavaScript off" — with the *canvas* gone, which is the claim
    // the spec actually makes and the one a flaky deploy actually produces.
    await page.route(/GlobeCanvas/, (route) => route.abort());
    await page.goto("/#worlds");

    const section = page.locator("#worlds");
    await expect(section).toBeVisible();

    // Scoped to the list: "Face Việt Nam" is also a button containing that name.
    const list = section.getByRole("list", { name: /the seven/i });
    for (const world of WORLDS) {
      await list.getByRole("button", { name: new RegExp(world.name, "i") }).click();
      await expect(section.getByRole("heading", { level: 3, name: world.name })).toBeVisible();
      for (const plaque of world.plaques) {
        await expect(section.getByText(plaque.text, { exact: true })).toBeVisible();
      }
    }
  });

  test("the rail's counts match the resolved content", async ({ page }) => {
    await page.goto("/#worlds");
    const rail = page.locator("#worlds dl");
    const plaques = WORLDS.reduce((total, world) => total + world.plaques.length, 0);
    const offMap = WORLDS.filter((world) => world.point === null).length;

    // Scoped to each note's own <dd> — the whole <dl>'s text also contains
    // the crossing's km figure and the other notes' own numbers, so an
    // unscoped toContainText can pass for a reason that has nothing to do
    // with the fact it claims to check: move the two pins and 19 plaques
    // could just as easily read "13,719 km", which also contains a "19".
    const offMapRow = rail.locator("div", { hasText: "Off the map" });
    const plaquesRow = rail.locator("div", { hasText: "Plaques" });

    await expect(offMapRow.locator("dd")).toContainText(String(offMap));
    await expect(plaquesRow.locator("dd")).toContainText(String(plaques));
  });

  test("the seven buttons are reachable by keyboard alone", async ({ page }) => {
    await page.goto("/#worlds");
    const section = page.locator("#worlds");
    const first = section
      .getByRole("list", { name: /the seven/i })
      .getByRole("button", { name: new RegExp(WORLDS[0].name, "i") });
    await first.focus();
    await expect(first).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(first).toHaveAttribute("aria-current", "true");
  });

  test("no horizontal overflow at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/#worlds");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

/**
 * Frames the globe itself asks for, plus what the whole page asked for, over
 * `ms` of rest.
 *
 * Counting `window.requestAnimationFrame` on the whole page cannot express
 * this claim on *this* page, and pretending it could would make the test wrong
 * in both directions. `Companion.tsx` — the pair of cats who roam the whole
 * document, a separate component with its own contract — holds a 60 Hz rAF
 * loop open for as long as they are awake, which in a fresh browser reporting
 * `(pointer: fine)` and no reduced-motion preference is indefinitely (measured:
 * ~120 callbacks per two seconds, still ~120 after 25 seconds of total idle,
 * every one of them from that loop). A whole-page count would therefore fail
 * with a perfect globe, and could only ever pass by the accident of the cats
 * being asleep.
 *
 * So the measurement is attributed instead. Every pass of the globe's loop
 * begins with exactly one `clearRect` on its own canvas, and nothing else on
 * the page draws to that canvas. Counting those is stricter than counting the
 * globe's rAF calls rather than looser: a `draw()` reached from the resize or
 * theme observers instead of from the loop is also work happening at rest, and
 * is also counted here.
 */
async function framesAtRest(page: Page, ms: number) {
  return page.evaluate(async (duration) => {
    const canvas = document.querySelector<HTMLCanvasElement>("#worlds canvas");
    if (!canvas) return { globe: -1, page: -1 };
    let globe = 0;
    let everything = 0;

    const clearRect = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function patched(
      this: CanvasRenderingContext2D,
      x: number,
      y: number,
      width: number,
      height: number,
    ) {
      if (this.canvas === canvas) globe += 1;
      clearRect.call(this, x, y, width, height);
    };
    const raf = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => {
      everything += 1;
      return raf.call(window, callback);
    };

    await new Promise((resolve) => setTimeout(resolve, duration));

    CanvasRenderingContext2D.prototype.clearRect = clearRect;
    window.requestAnimationFrame = raf;
    return { globe, page: everything };
  }, ms);
}

/** A cheap fingerprint of what is currently on the globe, so a test can say
 *  "it moved" and "it stopped moving" about pixels rather than about state it
 *  cannot see. */
async function globeSignature(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("#worlds canvas");
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return "no canvas";
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let hash = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      hash = (hash * 31 + data[i] + data[i + 1] * 3 + data[i + 2] * 7 + i) | 0;
    }
    return String(hash);
  });
}

/**
 * The label flips from "Loading the globe…" the moment `onReady` lands, so
 * waiting for it is the honest wait for "the chunk arrived and the canvas is
 * live" — no sleep, and no guess about how long a cold dev compile takes.
 *
 * Then the stage is centred, because `page.mouse` takes viewport coordinates
 * and does not scroll to reach anything. At 320 and 375 the section's heading
 * and lead fill the first screen, so `#worlds` scrolled to the top leaves the
 * globe entirely below the fold: every press in this file would land on
 * whatever happens to be at those coordinates instead, and the tests would
 * fail reporting that a perfectly good planet did not move.
 */
async function waitForLiveGlobe(page: Page) {
  const stage = page.getByRole("group", { name: /playground earth/i });
  await expect(stage).toBeVisible();
  await expect(page.locator("#worlds").getByRole("button", { name: /take the flight/i })).toBeVisible({
    timeout: 30_000,
  });
  await stage.evaluate((element) =>
    element.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await page.waitForTimeout(300);
  return stage;
}

test.describe("the live globe", () => {
  test("requests zero animation frames once it has settled", async ({ page }) => {
    await page.goto("/#worlds");
    await waitForLiveGlobe(page);
    // Nothing has been touched, so there was never any inertia to decay: the
    // first draw comes from the sizing effect, not from a frame.
    const frames = await framesAtRest(page, 2_000);

    // The whole argument for a hand-written loop over a library: a globe at
    // rest costs nothing. A non-zero number here means something is animating
    // that nobody asked for — most likely the satellite's orbit being counted
    // as "busy".
    expect(frames.globe, `the globe drew while at rest (page total: ${frames.page})`).toBe(0);
  });

  test("a drag rolls the planet and then stops", async ({ page }) => {
    await page.goto("/#worlds");
    const stage = await waitForLiveGlobe(page);

    const before = await globeSignature(page);
    const box = await stage.boundingBox();
    if (!box) throw new Error("the stage has no box");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    for (let step = 1; step <= 10; step += 1) {
      await page.mouse.move(box.x + box.width / 2 + step * 12, box.y + box.height / 2);
    }
    await page.mouse.up();

    // It rolled. Without this the rest of the test passes on a globe that
    // never moved, which is the one failure it exists to catch.
    expect(await globeSignature(page)).not.toBe(before);

    // 3s, not 2: a synthetic drag hands the flick model a far higher release
    // velocity than a hand can, and at DECAY = 0.93 that takes about 1.8s to
    // fall under REST_EPSILON. The margin is the difference between measuring
    // rest and measuring the tail of the spin.
    await page.waitForTimeout(3_000);
    const settled = await globeSignature(page);
    const frames = await framesAtRest(page, 1_500);
    expect(frames.globe, `the globe never settled (page total: ${frames.page})`).toBe(0);
    // And the inertia left it where it stopped rather than creeping on.
    expect(await globeSignature(page)).toBe(settled);
  });

  test("a pointercancel mid-drag ends the drag like a pointerup", async ({ page }) => {
    // The browser sends this, not pointerup, the moment it claims the gesture
    // for page scrolling. Handled differently, the planet keeps turning under
    // a finger that has left and the next tap continues a dead drag.
    await page.goto("/#worlds");
    const stage = await waitForLiveGlobe(page);

    const before = await globeSignature(page);
    await stage.evaluate((element) => {
      const canvas = element.querySelector("canvas");
      if (!canvas) throw new Error("no canvas");
      const base = { bubbles: true, pointerId: 1, pointerType: "touch", clientX: 100, clientY: 100 };
      canvas.dispatchEvent(new PointerEvent("pointerdown", base));
      canvas.dispatchEvent(new PointerEvent("pointermove", { ...base, clientX: 180 }));
      canvas.dispatchEvent(new PointerEvent("pointercancel", { ...base, clientX: 180 }));
    });

    // The gesture was real: it turned the planet before it was taken away.
    await expect
      .poll(() => globeSignature(page), { timeout: 5_000 })
      .not.toBe(before);

    await page.waitForTimeout(3_000);
    const frames = await framesAtRest(page, 1_500);
    expect(
      frames.globe,
      `the globe never came to rest after a cancelled gesture (page total: ${frames.page})`,
    ).toBe(0);
  });

  test("the arrow keys rotate it and Home brings Việt Nam back", async ({ page }) => {
    await page.goto("/#worlds");
    const section = page.locator("#worlds");
    const list = section.getByRole("list", { name: /the seven/i });
    const stage = await waitForLiveGlobe(page);
    // The stage is tabbable only once the canvas has handed its controls back
    // — before that the arrow keys are inert and there is nothing to focus.
    await expect(stage).toHaveAttribute("tabindex", "0");
    await stage.focus();
    await expect(stage).toBeFocused();

    const before = await globeSignature(page);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => globeSignature(page), { timeout: 5_000 }).not.toBe(before);

    // Open the world that lives on the plinth: it has no map point, so
    // `focusWorld` leaves the view exactly where the arrow keys left it while
    // still moving `aria-current` off Việt Nam — which is what gives the tap
    // below something to prove.
    await list.getByRole("button", { name: /Animals/i }).click();
    await expect(list.getByRole("button", { name: /Animals/i })).toHaveAttribute(
      "aria-current",
      "true",
    );

    await stage.focus();
    await page.keyboard.press("Home");
    // What matters beyond the pixels: the page did not scroll (the handler
    // preventDefaults) and the stage kept focus.
    await expect(stage).toBeFocused();
    await page.waitForTimeout(2_000);

    // Home is a reset, and this is the observable form of "Việt Nam is back":
    // one click at the centre of the disc opens it, which it could not do
    // while the planet was still two arrow-presses east of home. Comparing
    // bitmaps would not do — the satellite advances one step per frame of the
    // journey home, so the resting image is never byte-identical twice.
    const box = await stage.boundingBox();
    if (!box) throw new Error("the stage has no box");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.44);
    await expect(list.getByRole("button", { name: /Việt Nam/ })).toHaveAttribute(
      "aria-current",
      "true",
      { timeout: 5_000 },
    );

    // And then it stops, which is the same rest contract on the keyboard path.
    await page.waitForTimeout(2_000);
    const frames = await framesAtRest(page, 1_500);
    expect(frames.globe, `the keyboard path never settled (page total: ${frames.page})`).toBe(0);
  });

  test("everything the drag does is reachable with single clicks, no dragging", async ({
    page,
  }) => {
    // WCAG 2.5.7 Dragging Movements (AA, new in 2.2): the function must be
    // achievable "by a single pointer without dragging". Keyboard support does
    // not satisfy it — this criterion exists for head pointers, eye-gaze and
    // mouth sticks, which are pointers that cannot hold a drag. So this test
    // uses single clicks only and never mouse.down/move/up, deliberately.
    await page.goto("/#worlds");
    const section = page.locator("#worlds");
    const stage = await waitForLiveGlobe(page);

    // 1. Orient the planet by clicking a point on it. One click, and the place
    //    under it turns round to face the viewer.
    const before = await globeSignature(page);
    const box = await stage.boundingBox();
    if (!box) throw new Error("the stage has no box");
    await page.mouse.click(box.x + box.width * 0.42, box.y + box.height * 0.3);
    await expect.poll(() => globeSignature(page), { timeout: 5_000 }).not.toBe(before);

    // 2. Open any world.
    await section
      .getByRole("list", { name: /the seven/i })
      .getByRole("button", { name: new RegExp(WORLDS[1].name, "i") })
      .click();
    await expect(
      section.getByRole("heading", { level: 3, name: WORLDS[1].name }),
    ).toBeVisible();

    // 3. Complete the signature moment. The landing's *visible* consequence —
    //    the seed, the sapling, and the handoff link into the career tree — is
    //    Task 9's to build; asserting a link that does not exist yet would be
    //    asserting Task 9. What exists to check today is the status region the
    //    stage already writes when `onLanded` fires, and it is the observable
    //    proof that a whole crossing completed from single clicks and no drag.
    await section.getByRole("button", { name: /take the flight/i }).click();
    await expect(section.getByRole("status")).toHaveText(/landed/i, { timeout: 10_000 });
  });

  test("draws in system colours when forced colours are active", async ({ page }) => {
    // A canvas bitmap is the one thing forced-colors does not repaint: the CSS
    // custom properties still hold their authored values, so a globe that
    // trusted them would draw mid-blue on a forced black page and the one hue
    // that carries meaning would stop carrying it.
    //
    // What this does NOT assert is that the result is grey. It is tempting —
    // and wrong: a forced palette maps the system keywords to whatever the
    // user's theme says, and in this Chromium's own emulated palette
    // `GrayText` is #600000, a dark red. A "no saturated pixel" check would
    // fail on a globe that did exactly the right thing.
    //
    // Nor can it assert that every pixel *equals* a system colour: a stroke
    // anti-aliased over one of the `Canvas`-filled knockouts composites the
    // two, and #600000 at 96% over white is a real, correct #650a0a.
    //
    // So the claim is put in the two halves that survive compositing: the
    // authored accent is nowhere in the bitmap, and each system ink the globe
    // uses is somewhere in it. The first is the failure this exists to catch —
    // blue surviving into a forced page — and the second stops it passing on a
    // globe that drew nothing at all.
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto("/#worlds");
    await waitForLiveGlobe(page);

    const drewInSystemInk = await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>("#worlds canvas");
      if (!canvas) return "no canvas";
      const ctx = canvas.getContext("2d");
      if (!ctx) return "no context";

      const parse = (value: string) => {
        const probe = document.createElement("canvas").getContext("2d");
        if (!probe) return null;
        probe.fillStyle = "#010203";
        probe.fillStyle = value;
        const hex = String(probe.fillStyle);
        if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
        return [
          parseInt(hex.slice(1, 3), 16),
          parseInt(hex.slice(3, 5), 16),
          parseInt(hex.slice(5, 7), 16),
        ] as const;
      };
      // The four the globe is allowed, resolved through the forced palette.
      const names = ["Canvas", "CanvasText", "GrayText", "LinkText"] as const;
      const allowed = names.map(parse);
      // The one the globe must not have used, read straight off the element —
      // forced colours leave custom properties alone, which is the trap. Only
      // `--accent`: it is a distinctive blue that no blend of the forced inks
      // can reach, whereas the near-black `--fg` is a few levels from any
      // anti-aliased `CanvasText`, so testing for it would flag correct work.
      const accent = parse(getComputedStyle(canvas).getPropertyValue("--accent").trim());
      if (!accent || allowed.some((c) => c === null)) return "could not resolve the palettes";

      const near = (
        pixel: readonly [number, number, number],
        colour: readonly [number, number, number],
        tolerance: number,
      ) =>
        Math.abs(pixel[0] - colour[0]) <= tolerance &&
        Math.abs(pixel[1] - colour[1]) <= tolerance &&
        Math.abs(pixel[2] - colour[2]) <= tolerance;

      const found = new Set<string>();
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < data.length; i += 4) {
        // getImageData un-premultiplies, so anti-aliasing varies alpha and
        // leaves RGB alone — except at low alpha, where the reconstruction has
        // almost no bits left and drifts by tens of levels. Anything that
        // faint is invisible and says nothing either way.
        if (data[i + 3] < 200) continue;
        const pixel = [data[i], data[i + 1], data[i + 2]] as const;
        if (near(pixel, accent, 8)) return `the authored accent survived: ${pixel.join(",")}`;
        allowed.forEach((ink, index) => {
          if (ink && near(pixel, ink, 2)) found.add(names[index]);
        });
      }
      const missing = names.filter((name) => !found.has(name));
      if (missing.length > 0) return `nothing drawn in ${missing.join(", ")}`;
      return "ok";
    });
    expect(drewInSystemInk).toBe("ok");
  });

  test("a theme switch at rest redraws the globe in the new ink", async ({ page }) => {
    // At rest there is no frame to piggyback on, so the redraw has to be asked
    // for: a MutationObserver on `data-theme`. Without it the planet keeps the
    // old theme's ink until something else happens to move it.
    await page.goto("/#worlds");
    await waitForLiveGlobe(page);

    const before = await globeSignature(page);
    await page.evaluate(() => {
      const root = document.documentElement;
      root.dataset.theme = root.dataset.theme === "night" ? "day" : "night";
    });
    await expect.poll(() => globeSignature(page), { timeout: 5_000 }).not.toBe(before);
    // Exactly one redraw, and then back to costing nothing.
    const frames = await framesAtRest(page, 1_500);
    expect(frames.globe, `the theme switch left a loop running (page total: ${frames.page})`).toBe(0);
  });

  test("scrolling works with a finger on the globe", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await page.goto("/#worlds");
    const stage = await waitForLiveGlobe(page);
    const touchAction = await stage.evaluate((element) => getComputedStyle(element).touchAction);
    // `none` here would trap the page scroll on a phone, which is the single
    // worst thing a decorative canvas can do.
    expect(touchAction).toBe("pan-y");
    // And the canvas itself, which is the element a finger actually lands on:
    // it is positioned over the stage, so its own touch-action is the one the
    // browser consults, and the stage's pan-y would not save the page.
    const canvasTouchAction = await stage.evaluate((element) => {
      const canvas = element.querySelector("canvas");
      return canvas ? getComputedStyle(canvas).touchAction : "no canvas";
    });
    expect(canvasTouchAction).toBe("pan-y");
  });
});
