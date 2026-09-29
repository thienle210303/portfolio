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
 * What the globe drew over `ms`, how many animation frames did the drawing,
 * and how fast the whole page was asking for frames while that happened.
 *
 * ## Why the globe's own frames are not counted directly
 *
 * Counting `window.requestAnimationFrame` page-wide cannot express this claim
 * on *this* page, and pretending it could would make the test wrong in both
 * directions. `Companion.tsx` — the pair of cats who roam the whole document,
 * a separate component with its own contract — holds a 60 Hz rAF loop open for
 * as long as they are awake, which in a fresh browser reporting
 * `(pointer: fine)` and no reduced-motion preference is indefinitely
 * (measured: 121 callbacks per two seconds, and still 60/s after 110 seconds
 * of total idle, every one of them from that one caller). A page-wide count
 * would therefore fail with a perfect globe, and could only ever pass by the
 * accident of the cats being asleep.
 *
 * ## The coupling this leans on, and where it is pinned
 *
 * So `draws` is attributed instead: `clearRect` calls on the globe's own
 * canvas, which nothing else on the page draws to. Reading `draws === 0` as
 * "the globe asked for no frames" is only sound while the globe's loop draws
 * on every pass — `step()` in `GlobeCanvas.tsx` calls `draw()`
 * unconditionally, and there is a comment there pointing back here.
 *
 * That coupling is not left to the comments. `framesThatDrew` counts the rAF
 * callbacks during which such a draw happened, and the drag case asserts the
 * one-draw-per-frame identity directly *while the globe is moving*. An early
 * return added to `step()`, or a draw throttled to every Nth frame, breaks
 * that assertion instead of silently disarming this one.
 *
 * Attributing this way is also stricter than counting the globe's rAF calls
 * rather than looser: a `draw()` reached from the resize or theme observers
 * instead of from the loop is also work happening at rest, and is also
 * counted.
 *
 * `pageHz` is asserted rather than merely reported — see `expectAtRest`.
 */
async function measureGlobeFrames(page: Page, ms: number) {
  return page.evaluate(async (duration) => {
    const canvas = document.querySelector<HTMLCanvasElement>("#worlds canvas");
    if (!canvas) return { draws: -1, framesThatDrew: -1, pageHz: -1 };
    let draws = 0;
    let framesThatDrew = 0;
    let everything = 0;
    let drewInThisFrame = false;

    const clearRect = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function patched(
      this: CanvasRenderingContext2D,
      x: number,
      y: number,
      width: number,
      height: number,
    ) {
      if (this.canvas === canvas) {
        draws += 1;
        drewInThisFrame = true;
      }
      clearRect.call(this, x, y, width, height);
    };
    const raf = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => {
      everything += 1;
      // rAF callbacks never nest, so one shared flag is enough to say which
      // frame a draw belonged to.
      return raf.call(window, (time) => {
        drewInThisFrame = false;
        callback(time);
        if (drewInThisFrame) framesThatDrew += 1;
      });
    };

    await new Promise((resolve) => setTimeout(resolve, duration));

    CanvasRenderingContext2D.prototype.clearRect = clearRect;
    window.requestAnimationFrame = raf;
    return { draws, framesThatDrew, pageHz: (everything * 1000) / duration };
  }, ms);
}

/**
 * The rest contract, in one place because five cases assert it.
 *
 * Two halves. The globe drew nothing, which given the coupling above means it
 * asked for no frames. And the page was asking for frames no faster than a
 * single 60 Hz loop — the cats' — which is what turns `pageHz` from a number
 * printed in a failure message into an actual assertion: a globe running a
 * loop that somehow never drew would roughly double this and be caught here
 * rather than slipping past the `draws` count. (CPU contention only ever
 * pushes the rate down, so the ceiling cannot flake upward.)
 */
async function expectAtRest(page: Page, ms: number, what: string) {
  const frames = await measureGlobeFrames(page, ms);
  expect(frames.draws, `${what} — the globe drew at rest (page: ${frames.pageHz.toFixed(0)} Hz)`).toBe(
    0,
  );
  expect(
    frames.pageHz,
    `${what} — the page is running more than one animation loop at rest`,
  ).toBeLessThan(100);
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
    // The whole argument for a hand-written loop over a library: a globe at
    // rest costs nothing. A non-zero number here means something is animating
    // that nobody asked for — most likely the satellite's orbit being counted
    // as "busy".
    await expectAtRest(page, 2_000, "untouched since load");
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

    // Straight away, while the inertia is still running: this is the one
    // window in the file where the loop can be watched working, so it is
    // where the identity every rest assertion leans on gets pinned — one draw
    // per animation frame, no more and no fewer. If `step()` ever gains an
    // early return, or draws on only every Nth frame, this fails here instead
    // of quietly turning `expectAtRest` into a test of nothing.
    const moving = await measureGlobeFrames(page, 400);
    expect(moving.draws, "the inertia was not drawing frame by frame").toBeGreaterThan(10);
    // `draws` may lead by exactly one: the frame already queued when the
    // instrumentation went in was scheduled through the real rAF, so its draw
    // is counted but its callback is not wrapped.
    expect(
      moving.draws - moving.framesThatDrew,
      `${moving.draws} draws across ${moving.framesThatDrew} frames — the loop no longer draws once per frame`,
    ).toBeLessThanOrEqual(1);
    expect(moving.framesThatDrew).toBeLessThanOrEqual(moving.draws);

    // It rolled. Without this the rest of the test passes on a globe that
    // never moved, which is the one failure it exists to catch.
    expect(await globeSignature(page)).not.toBe(before);

    // 3s, not 2: a synthetic drag hands the flick model a far higher release
    // velocity than a hand can, and at DECAY = 0.93 that takes about 1.8s to
    // fall under REST_EPSILON. The margin is the difference between measuring
    // rest and measuring the tail of the spin.
    await page.waitForTimeout(3_000);
    const settled = await globeSignature(page);
    await expectAtRest(page, 1_500, "after a drag");
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
    await expectAtRest(page, 1_500, "after a cancelled gesture");
  });

  test("a cancelled gesture tears down, but does not commit a tap", async ({ page }) => {
    // The other half of handling `pointercancel` like `pointerup`: identical
    // *teardown* is the requirement, and committing a tap is not part of it. A
    // browser-initiated cancel with little or no movement is ordinary — a
    // long-press opening the context menu, palm rejection, a system edge
    // gesture — and it must not open a world or swing the planet round out of
    // a gesture the person abandoned.
    await page.goto("/#worlds");
    const section = page.locator("#worlds");
    const list = section.getByRole("list", { name: /the seven/i });
    const stage = await waitForLiveGlobe(page);
    const animals = list.getByRole("button", { name: /Animals/i });
    const vietnam = list.getByRole("button", { name: /Việt Nam/ });

    // Animals lives on the plinth, so opening it moves `aria-current` off
    // Việt Nam without moving the view — which leaves Việt Nam's marker at the
    // centre of the disc, where both gestures below land.
    await animals.click();
    await expect(animals).toHaveAttribute("aria-current", "true");
    await page.waitForTimeout(1_200);

    const press = (end: "pointerup" | "pointercancel") =>
      stage.evaluate((element, type) => {
        const canvas = element.querySelector("canvas");
        if (!canvas) throw new Error("no canvas");
        const rect = canvas.getBoundingClientRect();
        // Dead centre of the near hemisphere, and not one pixel of movement,
        // so `moved` is 0 and only the event type can decide what happens.
        const base = {
          bubbles: true,
          pointerId: 3,
          pointerType: "touch",
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height * 0.44,
        };
        canvas.dispatchEvent(new PointerEvent("pointerdown", base));
        canvas.dispatchEvent(new PointerEvent(type, base));
      }, end);

    await press("pointercancel");
    // A second of settling, instrumented — so the `aria-current` check below
    // is looking at a finished state rather than racing a React update it
    // would otherwise pass straight through.
    const afterCancel = await measureGlobeFrames(page, 1_000);

    // Nothing was opened.
    await expect(animals).toHaveAttribute("aria-current", "true");

    // And nothing was turned. Measured rather than eyeballed, because both
    // halves of a committed tap animate for about a second and neither leaves
    // a mark a fingerprint could separate from one step of the satellite's
    // orbit: a committed tap draws tens of frames here, and a gesture that
    // commits nothing wakes the loop just long enough to find nothing to do.
    // (Verified by mutation: dropping the `pointerup` guard makes this 29.)
    expect(
      afterCancel.draws,
      `a cancelled gesture moved the planet (${afterCancel.draws} frames)`,
    ).toBeLessThanOrEqual(3);
    await expectAtRest(page, 1_000, "after a cancelled tap");

    // The control. The same press, at the same point, completed rather than
    // cancelled: now it is a tap and it opens the world under it. Without this
    // half the assertions above would pass on a globe where no gesture did
    // anything at all.
    await press("pointerup");
    await expect(vietnam).toHaveAttribute("aria-current", "true", { timeout: 5_000 });
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
    await expectAtRest(page, 1_500, "after the keyboard path");
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

    // 3. Complete the signature moment, end to end, from single clicks: the
    //    crossing plays, the status region says he landed, and the handoff
    //    link into the career tree appears. Both halves are asserted because
    //    the sr-only region and the visible link are the two audiences, and a
    //    press that reached only one of them has not completed the moment for
    //    someone using a head pointer or eye-gaze.
    await section.getByRole("button", { name: /take the flight/i }).click();
    await expect(section.getByRole("status")).toHaveText(/landed/i, { timeout: 10_000 });
    await expect(section.getByRole("link", { name: /career tree/i })).toBeVisible();
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
    await expectAtRest(page, 1_500, "after a theme switch");
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

/**
 * The end of the moment. What is asserted here is deliberately not "the globe
 * looks different": the landing's contract is that something was drawn, that
 * the page then says one true thing about it, and that the whole lot comes to
 * rest — and every one of those is observable without reading pixels.
 */
test.describe("the landing", () => {
  test("playing the flight lands him, drops a seed, offers the tree — and then stops", async ({
    page,
  }) => {
    await page.goto("/#worlds");
    await waitForLiveGlobe(page);
    const section = page.locator("#worlds");

    // Nothing has flown, so nothing may be claimed.
    await expect(section.getByRole("link", { name: /career tree/i })).toHaveCount(0);

    await section.getByRole("button", { name: /take the flight/i }).click();

    const handoff = section.getByRole("link", { name: /career tree/i });
    await expect(handoff).toBeVisible({ timeout: 10_000 });
    await expect(section.getByRole("status")).toContainText(/landed/i);

    // The seed finishes growing 667 ms after the landing and the camera's last
    // twelve degrees arrive inside that, and then there is nothing left
    // moving: the played crossing must clear its own `playing` flag and the
    // sapling must stop at full size. A flight that ended by looping forever
    // would still pass every assertion above.
    //
    // This wait is also the regression guard for the tail's *duration*, which
    // is why it is a fixed wall-clock number and not a poll on a state signal.
    // Those 667 ms used to be forty animation frames and the settle another
    // ~34, so at the 33 Hz this project reports at 375px the tail ran past 1.2
    // s and this assertion caught draws that should have finished — the beat
    // was twice its intended length on that device and half of it on a 120 Hz
    // one. `frameStep` in `src/lib/globe.ts` makes both of those durations
    // wall-clock, so 1.5 s is now a 2.2× margin at every frame rate instead of
    // a coin flip at low ones. Put the frame counting back and this fails on
    // the slow projects again, which is the intent.
    await page.waitForTimeout(1_500);
    await expectAtRest(page, 1_500, "after the played flight");

    // Where it came to rest is deliberately *not* asserted here. The camera
    // chases the bird at 0.1 a frame against a bird covering ~1.2° a frame, so
    // the chase alone leaves it a steady ~12° short of the pin — which is why
    // `step()` hands the last twelve degrees to `target` on completion, so the
    // played landing ends on the same frame the reduced-motion one produces
    // directly. Pinning that in a test would mean computing where the pin
    // projects, and the only honest way to do that is to re-derive the disc's
    // centre and radius from the stage box — three layout formulas that live
    // in `GlobeCanvas`'s resize effect. Copying them here would create a
    // second source of truth for the geometry, which rots the moment the
    // stage's aspect changes. (A click at the disc's centre does not work as a
    // proxy: tilt compensates only 0.55 of latitude, so the arrival pin rests
    // ~70px above the centre by design.)

    // And the claim is retractable, which is the other half of only saying
    // true things: facing Việt Nam again takes the seed off the globe, so the
    // sentence about it leaves the page with it.
    await section.getByRole("button", { name: /face việt nam/i }).click();
    await expect(handoff).toHaveCount(0);
  });

  test("the landing link actually reaches the tree", async ({ page }) => {
    // A handoff that does not hand off is worse than no handoff: the link is
    // the only thing in this section that points at another one.
    await page.goto("/#worlds");
    await waitForLiveGlobe(page);
    const section = page.locator("#worlds");
    await section.getByRole("button", { name: /take the flight/i }).click();
    await section.getByRole("link", { name: /career tree/i }).click({ timeout: 10_000 });
    await expect(page.locator("#tree")).toBeInViewport();
  });

  test("the keyboard alone reaches the whole signature moment", async ({ page }) => {
    await page.goto("/#worlds");
    const stage = await waitForLiveGlobe(page);
    await stage.focus();
    // Rolling east flies him, 12° at a time, and 2.6 radians completes the
    // crossing — so about thirteen presses, with a margin. The keyboard reaches
    // the landing by *flying* it, not by a shortcut that jumps to the end.
    for (let press = 0; press < 20; press += 1) {
      await page.keyboard.press("ArrowRight");
    }
    const section = page.locator("#worlds");
    await expect(section.getByRole("status")).toContainText(/landed/i, { timeout: 10_000 });
    await expect(section.getByRole("link", { name: /career tree/i })).toBeVisible();
  });
});

test.describe("reduced motion", () => {
  test("gives the finished frame and the caption, and asks for no frames", async ({ page }) => {
    // `emulateMedia` rather than `test.use({ reducedMotion })`: as of
    // Playwright 1.62 that option is no longer on `PlaywrightTestOptions` (it
    // lives under `contextOptions`), and this is the same idiom the
    // forced-colors test above already uses. Set before `goto`, so the cats
    // and the origin story's player see it at mount and never start a loop.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#worlds");
    await waitForLiveGlobe(page);
    const section = page.locator("#worlds");

    // The counter has to be installed *before* the press, so the click happens
    // in-page too. Everything else in this file drives the UI with Playwright
    // locators; this one block is the exception, and that is the reason — a
    // `locator.click()` would land after the counter was already running and
    // could not be told apart from a frame the press itself caused.
    //
    // Page-wide `requestAnimationFrame` is the right instrument here, unlike
    // everywhere else in this file: under `prefers-reduced-motion: reduce` the
    // companion cats have no roaming loop and the origin story's player never
    // starts one, so the page is genuinely silent and the globe is the only
    // thing that could ask for a frame.
    // `statusWrites` rides along with the frame count because both are facts
    // about one press that can only be observed while it happens. A live
    // region handed text byte-identical to what it already holds
    // produces no DOM mutation and a screen reader reads nothing — which is
    // exactly what a *second* press under reduced motion would do, since the
    // landing is synchronous there and React would batch the clear and the
    // re-landing into one no-op commit. Counting mutations is the only way to
    // assert "it spoke again" from outside a screen reader.
    const press = (label: RegExp) =>
      page.evaluate(
        async (pattern) => {
          let frames = 0;
          let statusWrites = 0;
          const original = window.requestAnimationFrame;
          window.requestAnimationFrame = (callback) => {
            frames += 1;
            return original.call(window, callback);
          };
          const status = document.querySelector('#worlds [role="status"]');
          const observer = new MutationObserver((records) => {
            statusWrites += records.length;
          });
          if (status) {
            observer.observe(status, { childList: true, characterData: true, subtree: true });
          }
          const match = new RegExp(pattern.source, pattern.flags);
          const button = [...document.querySelectorAll<HTMLButtonElement>("#worlds button")].find(
            (candidate) => match.test(candidate.textContent ?? ""),
          );
          button?.click();
          await new Promise((resolve) => setTimeout(resolve, 1_500));
          observer.disconnect();
          window.requestAnimationFrame = original;
          return { frames, statusWrites };
        },
        { source: label.source, flags: label.flags },
      );

    const beforeFlight = await globeSignature(page);
    const landing = await press(/take the flight/i);

    // The outcome, not a slower animation — and not one frame requested to
    // produce it.
    expect(landing.frames, "reduced motion asked for animation frames to land").toBe(0);
    // And the outcome is on the *canvas*, not only in the DOM. Without this
    // the whole test passes with the synchronous `draw()` deleted from
    // `fly()`'s reduced-motion branch: the link and the status line are React
    // state, and nothing else would ever ask the globe to repaint, so the
    // planet would sit at Việt Nam under a sentence saying he had landed.
    const landed = await globeSignature(page);
    expect(landed, "the finished frame was never drawn").not.toBe(beforeFlight);
    await expect(section.getByRole("link", { name: /career tree/i })).toBeVisible();
    await expect(section.getByRole("status")).toContainText(/landed/i);
    expect(landing.statusWrites, "the landing was never announced").toBeGreaterThan(0);

    // Pressing it again reaches the same finished frame — and says so again.
    // The frame is identical (nothing moved, and nothing is animating to make
    // it differ), so the announcement is the only observable, which is the
    // whole point: a control that does something must not be silent.
    const again = await press(/take the flight/i);
    expect(again.frames, "a replay under reduced motion asked for frames").toBe(0);
    expect(again.statusWrites, "a second press announced nothing").toBeGreaterThan(0);
    await expect(section.getByRole("status")).toContainText(/landed/i);
    expect(await globeSignature(page)).toBe(landed);

    // And the way back, which is the same size of motion: one row of two
    // buttons, both of which owe the same answer to the same preference.
    const home = await press(/face việt nam/i);
    expect(home.frames, "reduced motion asked for animation frames to come home").toBe(0);
    await expect(section.getByRole("link", { name: /career tree/i })).toHaveCount(0);
    expect(await globeSignature(page), "the globe never came home").not.toBe(landed);
  });

  test("orienting the globe with one click asks for no frames either", async ({ page }) => {
    // The WCAG 2.5.7 path, which is the one that matters most here: a visitor
    // on a head pointer or eye-gaze cannot hold a drag, so click-to-orient is
    // how they move the planet at all. Before this it was the last camera move
    // still easing under reduced motion — which left that visitor with no
    // non-animating way to move the globe while the two buttons beside it had
    // one.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#worlds");
    const stage = await waitForLiveGlobe(page);
    const box = await stage.boundingBox();
    if (!box) throw new Error("the stage has no box");

    const before = await globeSignature(page);
    const frames = await page.evaluate(
      async ([x, y]) => {
        let count = 0;
        const original = window.requestAnimationFrame;
        window.requestAnimationFrame = (callback) => {
          count += 1;
          return original.call(window, callback);
        };
        const canvas = document.querySelector<HTMLCanvasElement>("#worlds canvas");
        // Dispatched in-page for the same reason the press above is: the
        // counter has to be installed before the gesture, or the frames the
        // gesture causes cannot be told from the ones it did not.
        if (canvas) {
          const base = { bubbles: true, pointerId: 7, pointerType: "mouse", clientX: x, clientY: y };
          canvas.dispatchEvent(new PointerEvent("pointerdown", base));
          canvas.dispatchEvent(new PointerEvent("pointerup", base));
        }
        await new Promise((resolve) => setTimeout(resolve, 1_500));
        window.requestAnimationFrame = original;
        return count;
      },
      [box.x + box.width * 0.35, box.y + box.height * 0.3] as const,
    );

    // One frame is allowed and one only: `release` wakes the loop
    // unconditionally, because a real drag's inertia needs it to, and that
    // pass finds nothing to do and stops. What must not happen is a second of
    // easing, which is ~60.
    expect(frames, "click-to-orient is still easing under reduced motion").toBeLessThanOrEqual(1);
    // It moved, so the assertion above is about a gesture that did something.
    expect(await globeSignature(page), "the click did not orient the globe").not.toBe(before);
  });

  test("picking a world from the list asks for no frames either", async ({ page }) => {
    // The path all seven list buttons take, and the one holding the largest
    // swing the section can be asked for: Việt Nam → United States is the
    // crossing itself, ~156° of planet, the same distance "Take the flight"
    // above refuses to animate. Easing it here while the button beside it
    // snapped would have made the preference depend on which control the
    // visitor happened to reach for.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#worlds");
    await waitForLiveGlobe(page);
    const list = page.locator("#worlds").getByRole("list", { name: /the seven/i });

    const pickFromTheList = (label: RegExp) =>
      page.evaluate(
        async (pattern) => {
          let frames = 0;
          const original = window.requestAnimationFrame;
          window.requestAnimationFrame = (callback) => {
            frames += 1;
            return original.call(window, callback);
          };
          const match = new RegExp(pattern.source, pattern.flags);
          // Scoped to the list rather than to `#worlds button`: "Face Việt
          // Nam" is also a button whose text contains that name, and it is
          // `reset`, a different path that the test above already covers.
          const button = [
            ...document.querySelectorAll<HTMLButtonElement>(
              '#worlds ul[aria-labelledby="worlds-list-label"] button',
            ),
          ].find((candidate) => match.test(candidate.textContent ?? ""));
          // Thrown rather than optional-chained away: a selector that stopped
          // matching would otherwise report zero frames and pass, which is the
          // one failure this test cannot afford to call a success.
          if (!button) throw new Error(`no world in the list matching ${match}`);
          button.click();
          await new Promise((resolve) => setTimeout(resolve, 1_500));
          window.requestAnimationFrame = original;
          return frames;
        },
        { source: label.source, flags: label.flags },
      );

    // Face Việt Nam from the list first, so the press being measured is the
    // half-planet swing rather than whatever distance the globe happened to
    // mount at — and so this press is itself held to the same contract.
    expect(await pickFromTheList(/việt nam/i), "facing Việt Nam from the list eased").toBe(0);
    const facingVietnam = await globeSignature(page);

    // Zero, not click-to-orient's "at most one": `focusWorld` reaches `lookAt`
    // and nothing else, and `lookAt`'s reduced-motion branch draws once
    // synchronously and never calls `start()`. `release` is the only path that
    // wakes the loop unconditionally, which is why that test has one frame to
    // spend and this one has none.
    expect(
      await pickFromTheList(/united states/i),
      "picking a world is still easing under reduced motion",
    ).toBe(0);

    // And the swing happened. Without both halves this passes just as well on a
    // `focusWorld` that was quietly made to do nothing at all.
    await expect(list.getByRole("button", { name: /united states/i })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(await globeSignature(page), "the globe never swung to the far pin").not.toBe(
      facingVietnam,
    );
    // It arrived, rather than easing on after the counter was put back.
    await expectAtRest(page, 700, "after picking a world under reduced motion");
  });
});
