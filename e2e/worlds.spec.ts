import { test, expect, type Page } from "@playwright/test";
import { buildStops, crossingKm } from "../src/lib/origin-stops";

const STOPS = buildStops();

// The value of the `data-chunk` attribute on the <canvas> in
// `src/sections/Worlds/GlobeCanvas.tsx`. No other module carries it, so only the
// lazy canvas chunk does.
const CANVAS_CHUNK_MARKER = "globe-canvas";

/** The 2D overlay, which carries every handler and every positional stroke,
 *  and the GL surface under it (present only while WebGL2 is drawing). */
const OVERLAY = '#worlds canvas[data-chunk="globe-canvas"]';
const SURFACE = "#worlds canvas[data-globe-surface]";

/** The stop buttons, in order. Selected by structure, not by text, because a
 *  place name is content and may contain anything. */
const STOP_BUTTONS = "#worlds ol > li > button";
const stopButton = (index: number) => `#worlds ol > li:nth-child(${index + 1}) > button`;

test.describe("the stops are the feature; the canvas is decoration", () => {
  test("every stop and its caption is listed and pressable with the canvas chunk blocked", async ({
    page,
  }) => {
    // Not "with JavaScript off" — with the *canvas* gone, which is the claim
    // the section makes and the one a flaky deploy actually produces.
    //
    // Identified by content, not by name. The bundler picks chunk file names
    // and picks them differently per mode, so no URL pattern is stable. Each
    // script request is fetched and refused if its body carries the
    // `globe-canvas` marker, the value of a `data-chunk` attribute that only
    // `GlobeCanvas.tsx` sets. A string literal survives minification.
    let aborted = 0;
    await page.route(/\.js(\?|$)/, async (route) => {
      const response = await route.fetch();
      const body = await response.text();
      if (body.includes(CANVAS_CHUNK_MARKER)) {
        aborted += 1;
        return route.abort();
      }
      return route.fulfill({ response, body });
    });
    await page.goto("/#worlds");

    const section = page.locator("#worlds");
    await expect(section).toBeVisible();
    for (const [index, stop] of STOPS.entries()) {
      const button = page.locator(stopButton(index));
      await expect(button).toContainText(stop.caption);
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(section.getByRole("status")).toContainText(stop.place);
    }

    // The stage is in view by now, so the import has been attempted. If
    // nothing was blocked, this test proved nothing about a missing canvas.
    await expect
      .poll(() => aborted, {
        message:
          "no canvas chunk request was aborted — no script body carried the canvas chunk marker, so either GlobeCanvas.tsx lost its data-chunk attribute or the chunk was never requested",
      })
      .toBeGreaterThan(0);
    // Set on the `.catch()` path in `WorldsStage.tsx` and nowhere else.
    await expect(section.getByRole("button", { name: "Globe not available" })).toBeVisible();
  });

  test("the crossing's distance is printed once, in the rail, and the rail holds nothing else", async ({
    page,
  }) => {
    await page.goto("/#worlds");
    const rail = page.locator("#worlds dl");
    const km = `${crossingKm().toLocaleString("en-US")} km`;
    await expect(rail.locator("dt")).toHaveText(["Crossing"]);
    await expect(rail.locator("dd")).toHaveText(`${km} · computed from the two pins`);
    // The rail never restates the prose beside it, and the prose does not
    // restate the rail: the distance appears in #worlds exactly once.
    const text = (await page.locator("#worlds").textContent()) ?? "";
    expect(text.split(km).length - 1, "the crossing's distance is printed more than once").toBe(1);
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
 * as long as they are awake, and in a fresh browser reporting `(pointer: fine)`
 * and no reduced-motion preference that is every window in this file. They do
 * now reach rest rather than running forever (`d363739`, merged from `main`),
 * but on a twenty-second idle clock (`EXPLORE_IDLE_MS`; it was fourteen when
 * this was measured), and the longest measurement here is two seconds: measured on this branch, every non-reduced-motion window below
 * reads 52.5–60.5 Hz, all of it theirs. A page-wide count would therefore fail
 * with a perfect globe, and could only ever pass by the accident of the cats
 * being asleep.
 *
 * ## The coupling this leans on, and where it is pinned
 *
 * So `draws` is attributed instead, to the globe's two canvases and nothing
 * else on the page: `clearRect` calls on the 2D overlay (`overlayDraws`) plus
 * `drawArrays` calls on the GL surface under it, when there is one
 * (`glDraws`). Counting both is what stops a surface looping on its own from
 * passing as "at rest" beside a still overlay. Reading `draws === 0` as
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
    const canvas = document.querySelector<HTMLCanvasElement>('#worlds canvas[data-chunk="globe-canvas"]');
    if (!canvas) return { draws: -1, overlayDraws: -1, glDraws: -1, framesThatDrew: -1, ticks: -1, pageHz: -1 };
    // The GL surface under the overlay, when there is one. Its draws count
    // into `draws` too: a surface looping on its own would otherwise pass "at
    // rest" with the overlay perfectly still.
    const surface = document.querySelector<HTMLCanvasElement>("#worlds canvas[data-globe-surface]");
    let overlayDraws = 0;
    let glDraws = 0;
    let framesThatDrew = 0;
    let everything = 0;
    let drewInThisFrame = false;
    // Distinct frame timestamps, whichever loop asked for them: callbacks of
    // one frame share a timestamp.
    const frameTimes = new Set<number>();

    const clearRect = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function patched(
      this: CanvasRenderingContext2D,
      x: number,
      y: number,
      width: number,
      height: number,
    ) {
      if (this.canvas === canvas) {
        overlayDraws += 1;
        drewInThisFrame = true;
      }
      clearRect.call(this, x, y, width, height);
    };
    const GL = window.WebGL2RenderingContext?.prototype;
    const drawArrays = GL?.drawArrays;
    if (GL && drawArrays) {
      GL.drawArrays = function patched(this: WebGL2RenderingContext, mode: number, first: number, count: number) {
        if (surface && this.canvas === surface) {
          glDraws += 1;
          drewInThisFrame = true;
        }
        drawArrays.call(this, mode, first, count);
      };
    }
    const raf = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => {
      everything += 1;
      // rAF callbacks never nest, so one shared flag is enough to say which
      // frame a draw belonged to.
      return raf.call(window, (time) => {
        frameTimes.add(time);
        drewInThisFrame = false;
        callback(time);
        if (drewInThisFrame) framesThatDrew += 1;
      });
    };

    await new Promise((resolve) => setTimeout(resolve, duration));

    CanvasRenderingContext2D.prototype.clearRect = clearRect;
    if (GL && drawArrays) GL.drawArrays = drawArrays;
    window.requestAnimationFrame = raf;
    return {
      draws: overlayDraws + glDraws,
      overlayDraws,
      glDraws,
      framesThatDrew,
      ticks: frameTimes.size,
      pageHz: (everything * 1000) / duration,
    };
  }, ms);
}

/**
 * "A per-frame loop ran", measured without a frame-rate threshold: every frame
 * the page ticked in the window drew, bar the first and last (which may
 * straddle it), and enough frames went by that a non-loop cannot reach it.
 * A slow runner ticks less and still passes; a loop that skips frames fails.
 */
function expectEveryFrameDrew(m: { ticks: number; framesThatDrew: number }, what: string) {
  expect(
    m.framesThatDrew,
    `${what}: a frame went by without the globe drawing (${m.framesThatDrew}/${m.ticks})`,
  ).toBeGreaterThanOrEqual(m.ticks - 2);
  expect(m.framesThatDrew, `${what}: no per-frame loop ran`).toBeGreaterThan(10);
}

/**
 * The ceiling `pageHz` has to stay under, for the two kinds of page this file
 * measures. Both numbers are measured, not assumed — see `expectAtRest`.
 */
const CATS_AWAKE_HZ = 100;
const SILENT_HZ = 5;

/**
 * The rest contract, in one place because eight cases assert it.
 *
 * Two halves. The globe drew nothing, which given the coupling above means it
 * asked for no frames. And the page as a whole was no busier than what is
 * legitimately running on it, which is what turns `pageHz` from a number
 * printed in a failure message into an actual assertion: a globe running a
 * loop that somehow never drew would add ~60 Hz here and be caught, rather
 * than slipping past the `draws` count. (CPU contention only ever pushes the
 * rate down, so a ceiling cannot flake upward — it can only fail to bite.)
 *
 * What "no busier" means depends on the page, and the difference is large
 * enough that one number cannot serve both. Measured on this branch, headless
 * Chromium, at 390 and 1440:
 *
 * - With motion allowed, **52.5–60.5 Hz** at every site. That is the cats, and
 *   it is not a loop the merge from `main` left running: they reach rest now,
 *   but on a twenty-second idle clock (fourteen when this was measured), and
 *   the longest window here is two seconds. `CATS_AWAKE_HZ` sits above that and below the ~120 a second loop
 *   would read.
 * - Under `prefers-reduced-motion: reduce`, **0.00 Hz** — not a low rate, no
 *   callbacks at all, six runs out of six. The cats never start a loop there.
 *   That page takes `SILENT_HZ`, because leaving it at the awake ceiling would
 *   hand a globe spinning an undrawn loop a free 60 Hz to hide in, which is
 *   the exact failure this half of the assertion exists to catch.
 */
async function expectAtRest(page: Page, ms: number, what: string, ceilingHz = CATS_AWAKE_HZ) {
  const frames = await measureGlobeFrames(page, ms);
  expect(frames.draws, `${what} — the globe drew at rest (page: ${frames.pageHz.toFixed(0)} Hz)`).toBe(
    0,
  );
  expect(
    frames.pageHz,
    `${what} — the page is running more than one animation loop at rest (ceiling ${ceilingHz} Hz)`,
  ).toBeLessThan(ceilingHz);
}

/** A cheap fingerprint of what is currently on the globe, so a test can say
 *  "it moved" and "it stopped moving" about pixels rather than about state it
 *  cannot see. */
async function globeSignature(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#worlds canvas[data-chunk="globe-canvas"]');
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
  const stage = await reachLiveGlobe(page);
  // Every test here starts from "landed, at rest, autoplay over"; the ones
  // about the autoplay itself call `reachLiveGlobe` or `reachFlightInTheAir`.
  await stopTheReplay(page);
  await expect(stage, "the replay was stopped somewhere other than on a landing").toHaveAttribute(
    "data-crossing",
    "landed",
  );
  return stage;
}

/** `waitForLiveGlobe` without the stop: the autoplay's landing, at rest. */
async function reachLiveGlobe(page: Page) {
  const stage = page.getByRole("group", { name: /playground earth/i });
  await expect(stage).toBeVisible();
  await expect(
    page.locator("#worlds").getByRole("button", { name: /replay the flight|stop the replay/i }),
  ).toBeVisible({
    timeout: 30_000,
  });
  await stage.evaluate((element) =>
    element.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await page.waitForTimeout(300);
  // The stage is now in view, so the crossing plays itself (R8).
  await waitForAutoplayedLanding(page);
  return stage;
}

/** Longer than the 6.5 s cycle the crossing used to loop on (a 5 s hold and a
 *  1.5 s return): a window in which a restart, if there still were one, would
 *  have shown. */
const NO_RESTART_WINDOW_MS = 8_000;

/** The stage in view and the autoplay's flight in the air: "Stop the replay"
 *  is showing, which it does from the first frame until the landing. */
async function reachFlightInTheAir(page: Page) {
  const stage = page.getByRole("group", { name: /playground earth/i });
  await expect(stage).toBeVisible();
  await expect(
    page.locator("#worlds").getByRole("button", { name: /replay the flight|stop the replay/i }),
  ).toBeVisible({ timeout: 30_000 });
  await stage.evaluate((element) =>
    element.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await expect(page.locator("#worlds").getByRole("button", { name: "Stop the replay" })).toBeVisible();
  return stage;
}

/** Press "Stop the replay" if it is showing (it never does under reduced
 *  motion), then wait for the globe to be at rest either way. */
async function stopTheReplay(page: Page) {
  const stop = page.locator("#worlds").getByRole("button", { name: "Stop the replay" });
  if (await stop.isVisible()) await stop.click();
  await expect
    .poll(async () => (await measureGlobeFrames(page, 300)).draws, {
      timeout: 20_000,
      message: "the globe never came to rest after the replay was stopped",
    })
    .toBe(0);
}

/** Counts every write to the live region and every change to the stage's
 *  `data-crossing` from now on, so a test can say "nothing was said" and
 *  "it never left the landing" about a whole window, not two instants. */
async function watchStatusAndCrossing(page: Page) {
  await page.evaluate(() => {
    const status = document.querySelector('#worlds [role="status"]');
    const stage = document.querySelector('#worlds [aria-roledescription="globe"]');
    if (!status || !stage) throw new Error("no status region or no stage");
    const counts = window as unknown as { __statusWrites: number; __crossingChanges: number };
    counts.__statusWrites = 0;
    counts.__crossingChanges = 0;
    new MutationObserver((records) => {
      counts.__statusWrites += records.length;
    }).observe(status, { childList: true, subtree: true, characterData: true });
    new MutationObserver((records) => {
      counts.__crossingChanges += records.length;
    }).observe(stage, { attributes: true, attributeFilter: ["data-crossing"] });
  });
  return () =>
    page.evaluate(() => {
      const counts = window as unknown as { __statusWrites: number; __crossingChanges: number };
      return { statusWrites: counts.__statusWrites, crossingChanges: counts.__crossingChanges };
    });
}

/**
 * The crossing plays itself when half the stage is in view. Wait for the
 * stage to say it landed, then for the tail (the camera's last few degrees and
 * the robot's ~6 s walk) to finish, so a test's own rest measurement is about
 * what it did, not about the landing still settling.
 */
async function waitForAutoplayedLanding(page: Page) {
  const stage = page.getByRole("group", { name: /playground earth/i });
  await expect(stage, "the crossing never played itself on arrival").toHaveAttribute(
    "data-crossing",
    "landed",
    { timeout: 15_000 },
  );
  await expect
    .poll(async () => (await measureGlobeFrames(page, 300)).draws, {
      timeout: 20_000,
      message: "the globe never came to rest after the crossing played itself",
    })
    .toBe(0);
}

/**
 * Counts the overlay's draws from the moment the page loads, before any
 * observer has had a chance to start the crossing. `measureGlobeFrames` is
 * installed after the fact and cannot see a flight that started without a
 * press.
 */
async function countOverlayDrawsFromLoad(page: Page) {
  await page.addInitScript(() => {
    const counted = window as unknown as { __overlayDraws: number };
    counted.__overlayDraws = 0;
    const clearRect = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function patched(
      this: CanvasRenderingContext2D,
      x: number,
      y: number,
      width: number,
      height: number,
    ) {
      if (this.canvas instanceof HTMLCanvasElement && this.canvas.dataset.chunk === "globe-canvas") {
        counted.__overlayDraws += 1;
      }
      clearRect.call(this, x, y, width, height);
    };
  });
  return () => page.evaluate(() => (window as unknown as { __overlayDraws: number }).__overlayDraws);
}

/**
 * Make sure a `page.mouse` press at (x, y) lands on the planet, and fail
 * saying so if it cannot.
 *
 * Centring the stage is not enough on its own, because the cats roam.
 * `Companion.tsx` is a `fixed` layer above the page, its two cats are
 * `pointer-events-auto` buttons, and they walk the whole document while awake —
 * which they are in every test here that does not ask for reduced motion. A cat
 * standing on the press point takes the `pointerdown` and the globe never hears
 * it; the drag test then reports "the inertia was not drawing frame by frame"
 * with zero draws about a loop that was never started. That was this file's
 * intermittent failure: logged across 100 drags against `next dev` at 390 and
 * 768, the five that drew nothing were exactly the five whose `pointerdown`
 * target was inside `[data-companion]`.
 *
 * The cats do not rest on the stage any more (`data-cat-avoid` on it, read by
 * `companion-space.ts`, and `companion.spec.ts` asserts it), but they may still
 * walk across it, so a cat can in principle be passing over the press point at
 * the instant of the check. Nothing is done about that here on purpose: the
 * companion layer is left fully pressable, because making it transparent to the
 * pointer would be testing a page the visitor never sees.
 *
 * So the point is checked rather than assumed: anything that comes to sit over
 * the globe, a cat included, fails here by name instead of as a planet that did
 * not move.
 */
async function aimAtGlobe(page: Page, x: number, y: number) {
  const hit = await page.evaluate(
    ([px, py]) => {
      const element = document.elementFromPoint(px, py);
      if (!element) return "nothing";
      return element.matches('#worlds canvas[data-chunk="globe-canvas"]')
        ? "canvas"
        : `<${element.tagName.toLowerCase()} class="${element.getAttribute("class") ?? ""}">`;
    },
    [x, y] as const,
  );
  expect(hit, `a press at (${x}, ${y}) would land on ${hit}, not on the globe`).toBe("canvas");
}

/**
 * The forced-colours probe: the authored accent is nowhere on the overlay,
 * and each system ink the globe uses is somewhere on it. See the test that
 * uses it first for why those are the two halves that survive compositing.
 */
async function drewInSystemInk(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#worlds canvas[data-chunk="globe-canvas"]');
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
}


/** Where an element sits on the page, not in the viewport: a press that
 *  scrolls the page must not read as the element moving. */
async function pageBox(locator: ReturnType<Page["locator"]>) {
  return locator.evaluate((element) => {
    const r = element.getBoundingClientRect();
    return { x: r.x + window.scrollX, y: r.y + window.scrollY, width: r.width, height: r.height };
  });
}

/** The camera has finished turning and any walk is over. A turn eases for
 *  about a second; a landing adds the robot's ~6 s walk. */
async function waitForRest(page: Page, what: string) {
  await expect
    .poll(async () => (await measureGlobeFrames(page, 300)).draws, {
      timeout: 20_000,
      message: `the globe never came to rest ${what}`,
    })
    .toBe(0);
}

test.describe("one crossing, three stops", () => {
  test("three stops, in order, with captions from content", async ({ page }) => {
    await page.goto("/#worlds");
    const section = page.locator("#worlds");
    await expect(section.getByRole("heading", { level: 2 })).toHaveText("One crossing, three stops.");
    const buttons = page.locator(STOP_BUTTONS);
    await expect(buttons).toHaveCount(STOPS.length);
    for (const [index, stop] of STOPS.entries()) {
      const button = buttons.nth(index);
      await expect(button).toContainText(stop.when);
      await expect(button).toContainText(stop.place);
      await expect(button).toContainText(stop.caption);
      await expect(button).toHaveAttribute("aria-pressed", "false");
    }
  });

  test("clicking a stop turns the globe", async ({ page }) => {
    await page.goto("/#worlds");
    await waitForLiveGlobe(page);
    const status = page.locator("#worlds").getByRole("status");
    const overlay = page.locator(OVERLAY);
    await expect(overlay).not.toHaveAttribute("data-active-stop");

    // The autoplay left the globe on the arrival; each of these is a turn.
    for (const index of [0, 2, 1]) {
      const stop = STOPS[index];
      const before = await globeSignature(page);
      await page.locator(stopButton(index)).click();
      await expect(overlay).toHaveAttribute("data-active-stop", stop.id);
      await expect(status).toContainText(stop.place);
      await expect(page.locator(stopButton(index))).toHaveAttribute("aria-pressed", "true");
      await expect.poll(() => globeSignature(page), { timeout: 5_000 }).not.toBe(before);
      await waitForRest(page, `after turning to ${stop.id}`);
    }
    await expectAtRest(page, 1_000, "after the last turn");
  });

  test("stops by keyboard", async ({ page }) => {
    await page.goto("/#worlds");
    await waitForLiveGlobe(page);
    const overlay = page.locator(OVERLAY);
    await page.locator(stopButton(0)).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(stopButton(0))).toHaveAttribute("aria-pressed", "true");
    await expect(overlay).toHaveAttribute("data-active-stop", STOPS[0].id);

    await page.keyboard.press("Tab");
    await expect(page.locator(stopButton(1))).toBeFocused();
    await page.keyboard.press("Space");
    await expect(page.locator(stopButton(1))).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(stopButton(0))).toHaveAttribute("aria-pressed", "false");

    await page.keyboard.press("Tab");
    await expect(page.locator(stopButton(2))).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(overlay).toHaveAttribute("data-active-stop", STOPS[2].id);

    // And the flight's control is the next stop in the order.
    await page.keyboard.press("Tab");
    await expect(page.locator("#worlds [data-replay]")).toBeFocused();
  });

  test("stop chosen mid-flight lands first", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/#worlds");
    const stage = await waitForLiveGlobe(page);
    await page.locator("#worlds").getByRole("button", { name: "Replay the flight" }).click();
    await expect(stage).not.toHaveAttribute("data-crossing", "landed");

    // In-page, so the in-the-air check and the press are one task.
    const inAir = await page.evaluate((selector) => {
      const stageElement = document.querySelector('#worlds [aria-roledescription="globe"]');
      const flying = stageElement?.getAttribute("data-crossing") !== "landed";
      const button = document.querySelector<HTMLButtonElement>(selector);
      if (!button) throw new Error("no first stop button");
      button.click();
      return flying;
    }, stopButton(0));
    expect(inAir, "the flight had already landed before the stop was pressed").toBe(true);

    // It lands where it is, at once, rather than being thrown away — and the
    // stop, not the landing, has the last word.
    await expect(stage).toHaveAttribute("data-crossing", "landed", { timeout: 1_000 });
    const status = page.locator("#worlds").getByRole("status");
    await expect(status).toContainText(STOPS[0].place);
    await expect(status).not.toContainText(/landed/i);
    await expect(page.locator(OVERLAY)).toHaveAttribute("data-active-stop", STOPS[0].id);
    await waitForRest(page, "after a stop chosen mid-flight");

    // The camera came to rest on the stop, not on the arrival the landing
    // would otherwise have turned it to: pressing the same stop again has no
    // turn left to make — a frame to find that out, not a second of easing.
    const again = await pressCounting(page, stopButton(0), /./, 1_000);
    expect(again.overlayDraws, "the camera was not resting on the chosen stop").toBeLessThanOrEqual(3);
  });

  test("replay the flight replays once", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/#worlds");
    const stage = await waitForLiveGlobe(page);
    const section = page.locator("#worlds");
    const counts = await watchStatusAndCrossing(page);
    const replay = section.getByRole("button", { name: "Replay the flight" });
    const box = await pageBox(replay);

    await replay.click();
    // Below 1024px the press may scroll the globe into view; focus stays on
    // the button the visitor pressed.
    await expect(replay).toBeFocused();
    // The visitor's own flight is not an autoplay, so nothing offers to stop it.
    await expect(section.getByRole("button", { name: "Stop the replay" })).toHaveCount(0);
    await expect(stage).toHaveAttribute("data-crossing", "landed", { timeout: 10_000 });
    await expect(section.getByRole("status")).toContainText(/landed/i);
    // The flight, then the robot's one walk, then nothing.
    await waitForRest(page, "after the replay");
    await expectAtRest(page, NO_RESTART_WINDOW_MS, "after the replay");
    // Cleared once and landed once: two changes, and none in the long window.
    expect((await counts()).crossingChanges, "the replay flew more than once").toBe(2);
    expect(await pageBox(replay)).toEqual(box);
  });

  test("reduced motion snaps to stops", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#worlds");
    await waitForLiveGlobe(page);
    const overlay = page.locator(OVERLAY);
    let previous = await globeSignature(page);
    for (const index of [0, 2, 1]) {
      const pressed = await pressCounting(page, stopButton(index), /./, 700);
      // `focusStop` reaches `lookAt` and nothing else, and its reduced-motion
      // branch draws once, synchronously, and never asks for a frame.
      expect(pressed.frames, `turning to ${STOPS[index].id} asked for frames`).toBe(0);
      await expect(overlay).toHaveAttribute("data-active-stop", STOPS[index].id);
      const now = await globeSignature(page);
      expect(now, `the globe did not turn to ${STOPS[index].id}`).not.toBe(previous);
      previous = now;
      await expectAtRest(page, 400, `after snapping to ${STOPS[index].id}`, SILENT_HZ);
    }
  });

  test("stops work on the 2D globe", async ({ page }) => {
    await withoutWebGL2(page);
    await page.goto("/#worlds");
    await waitForLiveGlobe(page);
    await expect(page.locator(SURFACE)).toHaveCount(0);
    const overlay = page.locator(OVERLAY);
    for (const index of [0, 2]) {
      const before = await globeSignature(page);
      await page.locator(stopButton(index)).click();
      await expect(overlay).toHaveAttribute("data-active-stop", STOPS[index].id);
      await expect.poll(() => globeSignature(page), { timeout: 5_000 }).not.toBe(before);
      await waitForRest(page, `on the 2D globe after ${STOPS[index].id}`);
    }
  });

  test("no chapters, skins or plaques remain", async ({ page }) => {
    await page.goto("/#worlds");
    await waitForLiveGlobe(page);
    const section = page.locator("#worlds");
    const text = (await section.textContent()) ?? "";
    expect(text).not.toMatch(/Chapters/);
    expect(text).not.toMatch(/plaque/i);
    expect(text).not.toMatch(/needs WebGL/i);
    await expect(section.getByRole("group", { name: /skins/i })).toHaveCount(0);
    await expect(section.getByRole("group", { name: /robot/i })).toHaveCount(0);
    await expect(section.locator("[aria-current]")).toHaveCount(0);
    await expect(section.getByRole("link")).toHaveCount(0);
  });

  test("#worlds height is stable when the surface goes live", async ({ page }) => {
    // The surface goes live only once the coverage PNG has decoded, so holding
    // that one response back gives a measurable "canvas up, no surface yet".
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/globe/coastline.png", async (route) => {
      await held;
      await route.continue();
    });
    await page.goto("/#worlds");
    await reachFlightInTheAir(page);
    const section = page.locator("#worlds");
    const stage = section.locator("[data-surface]");
    await expect(stage, "the surface went live with its PNG held back").toHaveCount(0);
    const height = () => section.evaluate((element) => element.getBoundingClientRect().height);
    const before = await height();

    release();
    await expect(section.locator('[data-surface="gl"]')).toHaveCount(1, { timeout: 15_000 });
    expect((await height()) - before, "the section changed height when the surface went live").toBe(0);
  });
});

test.describe("the live globe", () => {
  test("plays the crossing once on first view, silently, and then draws nothing and never restarts", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto("/#worlds");
    const stage = await reachLiveGlobe(page);
    const section = page.locator("#worlds");
    const counts = await watchStatusAndCrossing(page);

    // Nobody asked for the flight, so nothing was said into the live region.
    await expect(section.getByRole("status")).not.toContainText(/landed|Back at/);
    // The autoplay is over: the button offers the flight, not a stop.
    await expect(section.getByRole("button", { name: "Replay the flight" })).toBeVisible();
    await expect(section.getByRole("button", { name: "Stop the replay" })).toHaveCount(0);
    const stops = await pageBox(page.locator(STOP_BUTTONS).first());

    // A globe at rest costs nothing, for as long as it takes the old loop to
    // have reset and flown again. A crossing change means it restarted.
    await expectAtRest(page, NO_RESTART_WINDOW_MS, "after the one crossing");
    await expect(stage).toHaveAttribute("data-crossing", "landed");
    const { statusWrites, crossingChanges } = await counts();
    expect(crossingChanges, "the crossing restarted without a click").toBe(0);
    expect(statusWrites, "the crossing wrote to the live region").toBe(0);
    expect(await pageBox(page.locator(STOP_BUTTONS).first())).toEqual(stops);
  });

  test("leaving mid-flight lands it at once, nothing draws off-screen, and coming back does not fly it again", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const overlayDraws = await countOverlayDrawsFromLoad(page);
    await page.goto("/");
    const stage = page.getByRole("group", { name: /playground earth/i });
    await stage.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
    // In the air: frames are being drawn and nothing has landed yet.
    await expect.poll(overlayDraws, { timeout: 30_000, intervals: [50] }).toBeGreaterThan(10);
    await expect(stage).not.toHaveAttribute("data-crossing", "landed");

    // The Journey and Contact are well over a screen tall, so the bottom of
    // the page has no globe in view. Landed straight away — the walk that landing would start
    // finished with it — and nothing after: a few draws, not a fast-forward.
    const atExit = await page.evaluate(() => {
      const drawn = (window as unknown as { __overlayDraws: number }).__overlayDraws;
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
      return drawn;
    });
    await expect(stage).toHaveAttribute("data-crossing", "landed", { timeout: 500 });
    await expectAtRest(page, NO_RESTART_WINDOW_MS, "off-screen");
    expect((await overlayDraws()) - atExit, "the exit fast-forwarded the flight").toBeLessThanOrEqual(5);
    await expect(stage).toHaveAttribute("data-crossing", "landed");
    await expect(page.locator("#worlds").getByRole("status")).not.toContainText(/landed/i);

    // Back: the autoplay is spent, so it neither flies nor draws.
    await stage.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
    await expectAtRest(page, NO_RESTART_WINDOW_MS, "back in view after the autoplay");
    await expect(stage).toHaveAttribute("data-crossing", "landed");
  });

  test("Stop the replay ends the flight where it was going, and the flight is the visitor's again", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto("/#worlds");
    const stage = await reachFlightInTheAir(page);
    const section = page.locator("#worlds");

    const stop = section.getByRole("button", { name: "Stop the replay" });
    const before = await pageBox(stop);
    // Pressed in-page, without scrolling to it. Below 1024px the button sits
    // under the stop list, and a locator click's own scroll can take the
    // stage out of view first — which settles the flight by itself, flips the
    // label, and the click then lands on "Replay the flight" instead.
    const label = await stop.evaluate((button) => {
      const text = button.textContent;
      (button as HTMLButtonElement).click();
      return text;
    });
    expect(label, "the flight had landed before Stop was pressed").toBe("Stop the replay");
    const flight = section.getByRole("button", { name: "Replay the flight" });
    await expect(flight).toBeVisible();
    // One element, and the label swap moves nothing.
    expect(await pageBox(flight), "the label swap moved the button").toEqual(before);
    await expect(stage).toHaveAttribute("data-crossing", "landed");
    const counts = await watchStatusAndCrossing(page);

    await expectAtRest(page, NO_RESTART_WINDOW_MS, "after Stop");
    expect((await counts()).crossingChanges, "the crossing left its landing after Stop").toBe(0);
    await expect(flight).toBeVisible();

    await flight.click();
    await expect(section.getByRole("status")).toContainText(/landed/i, { timeout: 10_000 });
  });

  test("less than half the stage in view: nothing restarts for a sliver of globe", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto("/#worlds");
    const stage = await reachLiveGlobe(page);
    const counts = await watchStatusAndCrossing(page);

    // A visitor scrolling on past the globe, with a third of it left at the
    // top of the screen.
    const visible = await stage.evaluate((element) => {
      const before = element.getBoundingClientRect();
      window.scrollBy({ top: before.bottom - 0.3 * before.height, behavior: "instant" });
      const after = element.getBoundingClientRect();
      return (Math.min(window.innerHeight, after.bottom) - Math.max(0, after.top)) / after.height;
    });
    expect(visible).toBeGreaterThan(0.1);
    expect(visible).toBeLessThan(0.5);
    await page.waitForTimeout(300);

    await expectAtRest(page, NO_RESTART_WINDOW_MS, "less than half in view");
    await expect(stage).toHaveAttribute("data-crossing", "landed");
    expect((await counts()).crossingChanges, "the crossing reset with less than half the stage in view").toBe(0);

    // Back to the middle of the screen: still landed, still at rest.
    await stage.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
    await expectAtRest(page, NO_RESTART_WINDOW_MS, "back in the middle of the screen");
    expect((await counts()).crossingChanges, "coming back restarted the crossing").toBe(0);
  });

  test("a touch scroll that starts on the globe leaves the autoplay running", async ({ browser, page }) => {
    test.setTimeout(60_000);
    // A phone visitor scrolling on past the globe: a real touch gesture, which
    // the browser takes over for the page scroll and ends in pointercancel.
    const context = await browser.newContext({ viewport: page.viewportSize() ?? undefined, hasTouch: true });
    const phone = await context.newPage();
    try {
      await phone.goto("/#worlds");
      const stage = await reachFlightInTheAir(phone);
      await phone.evaluate(() => {
        const counts = window as unknown as { __downs: number; __cancels: number };
        counts.__downs = 0;
        counts.__cancels = 0;
        const stageElement = document.querySelector('#worlds [aria-roledescription="globe"]');
        stageElement?.addEventListener("pointerdown", () => (counts.__downs += 1), true);
        stageElement?.addEventListener("pointercancel", () => (counts.__cancels += 1), true);
      });
      const box = await stage.boundingBox();
      if (!box) throw new Error("the stage has no box");
      const before = await phone.evaluate(() => window.scrollY);
      // Raw touch points through the browser's input pipeline. CDP's
      // `synthesizeScrollGesture` does not scroll this headless shell (it
      // ends in pointerup, measured), so it cannot stand in for a phone.
      const cdp = await context.newCDPSession(phone);
      const x = Math.round(box.x + box.width / 2);
      const y = Math.round(box.y + box.height / 2);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      for (let step = 1; step <= 12; step += 1) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y - step * 12 }] });
        await phone.waitForTimeout(16);
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await phone.waitForTimeout(100);

      // The gesture really did start on the stage and really became a scroll.
      const { downs, cancels, scrolled } = await phone.evaluate((start) => {
        const counts = window as unknown as { __downs: number; __cancels: number };
        return { downs: counts.__downs, cancels: counts.__cancels, scrolled: window.scrollY - start };
      }, before);
      expect(downs, "the touch never reached the stage").toBeGreaterThan(0);
      expect(cancels, "the browser never took the gesture over for the scroll").toBeGreaterThan(0);
      expect(scrolled, "the page did not scroll").toBeGreaterThan(0);

      // Read once, with the flight still in the air: the label only turns
      // back to "Replay the flight" at the landing or a takeover, so a single
      // read is the whole claim.
      expect(
        await phone.locator("#worlds [data-replay]").textContent(),
        "a touch scroll over the globe stopped the replay",
      ).toBe("Stop the replay");
    } finally {
      await context.close();
    }
  });

  test("picking a stop stops the autoplay for good", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/#worlds");
    const stage = await reachFlightInTheAir(page);

    // Clicked in-page, the way assistive tech activates a button: a click
    // with no focus and no pointer press, so the click alone has to stop it.
    // Read once — after one task, which is when React commits the click's
    // update — with focus out of the section: the focus stop must not be what
    // turns the label.
    const label = await page.evaluate(async (selector) => {
      const button = document.querySelector<HTMLButtonElement>(selector);
      if (!button) throw new Error("no stop button");
      // Same task as the click: a flight that landed first would pass vacuously.
      const before = document.querySelector("#worlds [data-replay]")?.textContent;
      button.click();
      (document.activeElement as HTMLElement | null)?.blur();
      await new Promise((resolve) => setTimeout(resolve, 0));
      return { before, after: document.querySelector("#worlds [data-replay]")?.textContent };
    }, stopButton(2));
    expect(label.before, "the flight was already over before the click").toBe("Stop the replay");
    expect(label.after, "picking a stop did not stop the replay").toBe("Replay the flight");
    // The landing it caused walks the robot and the camera turns; let both
    // finish, then outlast the old cycle.
    await waitForRest(page, "after picking a stop");
    await expectAtRest(page, NO_RESTART_WINDOW_MS, "after picking a stop");
    await expect(stage).toHaveAttribute("data-crossing", "landed");
  });

  test("a drag rolls the planet and then stops", async ({ page }) => {
    await page.goto("/#worlds");
    const stage = await waitForLiveGlobe(page);

    const before = await globeSignature(page);
    const box = await stage.boundingBox();
    if (!box) throw new Error("the stage has no box");
    await aimAtGlobe(page, box.x + box.width / 2, box.y + box.height / 2);
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
    expect(moving.overlayDraws, "the inertia was not drawing frame by frame").toBeGreaterThan(10);
    // The overlay's draws, not `draws`: with a GL surface every frame is two
    // draws, one per canvas (the next test pins that pairing). `overlayDraws`
    // may lead by exactly one: the frame already queued when the
    // instrumentation went in was scheduled through the real rAF, so its draw
    // is counted but its callback is not wrapped.
    expect(
      moving.overlayDraws - moving.framesThatDrew,
      `${moving.overlayDraws} draws across ${moving.framesThatDrew} frames — the loop no longer draws once per frame`,
    ).toBeLessThanOrEqual(1);
    expect(moving.framesThatDrew).toBeLessThanOrEqual(moving.overlayDraws);

    // It rolled. Without this the rest of the test passes on a globe that
    // never moved, which is the one failure it exists to catch.
    expect(await globeSignature(page)).not.toBe(before);

    // 3s, not 2: a synthetic drag hands the flick model a far higher release
    // velocity than a hand can, and at DECAY = 0.93 that takes about 1.8s to
    // fall under REST_EPSILON.
    await page.waitForTimeout(3_000);
    const settled = await globeSignature(page);
    await expectAtRest(page, 1_500, "after a drag");
    // And the inertia left it where it stopped rather than creeping on.
    expect(await globeSignature(page)).toBe(settled);
  });

  test("the GL surface draws once per overlay draw while moving, and never on its own", async ({
    page,
  }) => {
    // The surface has no loop of its own: it draws from inside the overlay's
    // `draw()`. So while the planet moves, every overlay draw has exactly one
    // GL draw beside it, and at rest both counts are zero.
    await page.goto("/#worlds");
    const stage = await waitForLiveGlobe(page);
    await requireSurface(page);

    const box = await stage.boundingBox();
    if (!box) throw new Error("the stage has no box");
    await aimAtGlobe(page, box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    for (let step = 1; step <= 10; step += 1) {
      await page.mouse.move(box.x + box.width / 2 + step * 12, box.y + box.height / 2);
    }
    await page.mouse.up();

    const moving = await measureGlobeFrames(page, 400);
    expect(moving.glDraws, "the surface was not drawing while the planet moved").toBeGreaterThan(10);
    expect(
      moving.glDraws,
      `${moving.glDraws} GL draws against ${moving.overlayDraws} overlay draws`,
    ).toBe(moving.overlayDraws);

    await page.waitForTimeout(3_000);
    await expectAtRest(page, 1_500, "the GL surface after a drag");
  });

  test("a pointercancel mid-drag ends the drag like a pointerup", async ({ page }) => {
    // The browser sends this, not pointerup, the moment it claims the gesture
    // for page scrolling. Handled differently, the planet keeps turning under
    // a finger that has left and the next tap continues a dead drag.
    await page.goto("/#worlds");
    const stage = await waitForLiveGlobe(page);

    const before = await globeSignature(page);
    await stage.evaluate((element) => {
      const canvas = element.querySelector<HTMLCanvasElement>('canvas[data-chunk="globe-canvas"]');
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
    // gesture — and it must not swing the planet round out of a gesture the
    // person abandoned.
    await page.goto("/#worlds");
    const stage = await waitForLiveGlobe(page);

    const press = (end: "pointerup" | "pointercancel") =>
      stage.evaluate((element, type) => {
        const canvas = element.querySelector<HTMLCanvasElement>('canvas[data-chunk="globe-canvas"]');
        if (!canvas) throw new Error("no canvas");
        const rect = canvas.getBoundingClientRect();
        // Off the centre of the near hemisphere, so a committed tap has
        // somewhere to turn to, and not one pixel of movement, so `moved` is 0
        // and only the event type can decide what happens.
        const base = {
          bubbles: true,
          pointerId: 3,
          pointerType: "touch",
          clientX: rect.left + rect.width * 0.35,
          clientY: rect.top + rect.height * 0.3,
        };
        canvas.dispatchEvent(new PointerEvent("pointerdown", base));
        canvas.dispatchEvent(new PointerEvent(type, base));
      }, end);

    await press("pointercancel");
    const afterCancel = await measureGlobeFrames(page, 1_000);
    // A committed tap eases for about a second, tens of frames; a gesture that
    // commits nothing wakes the loop just long enough to find nothing to do.
    expect(
      afterCancel.overlayDraws,
      `a cancelled gesture moved the planet (${afterCancel.overlayDraws} frames)`,
    ).toBeLessThanOrEqual(3);
    await expectAtRest(page, 1_000, "after a cancelled tap");

    // The control: the same press, completed rather than cancelled, is a tap,
    // and it turns the planet. Without this half the assertions above would
    // pass on a globe where no gesture did anything at all.
    await press("pointerup");
    const afterTap = await measureGlobeFrames(page, 1_000);
    expect(afterTap.overlayDraws, "a completed tap did not orient the globe").toBeGreaterThan(3);
  });

  test("the arrow keys rotate it, Home clears the flight, and the keys alone fly him again", async ({ page }) => {
    await page.goto("/#worlds");
    const section = page.locator("#worlds");
    const stage = await waitForLiveGlobe(page);
    // The stage is tabbable only once the canvas has handed its controls back
    // — before that the arrow keys are inert and there is nothing to focus.
    await expect(stage).toHaveAttribute("tabindex", "0");
    await stage.focus();
    await expect(stage).toBeFocused();

    const before = await globeSignature(page);
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => globeSignature(page), { timeout: 5_000 }).not.toBe(before);

    // Home is a reset: back to Việt Nam with the crossing cleared. The page
    // did not scroll (the handler preventDefaults) and the stage kept focus.
    await page.keyboard.press("Home");
    await expect(stage).toBeFocused();
    await expect(stage).not.toHaveAttribute("data-crossing", "landed");
    await expect(section.getByRole("status")).toContainText(/^Back at /);
    await waitForRest(page, "after Home");

    // Rolling east flies him, 12° at a time, and 2.6 radians completes the
    // crossing — so about thirteen presses, with a margin. The keyboard reaches
    // the landing by *flying* it, not by a shortcut that jumps to the end.
    for (let pressed = 0; pressed < 20; pressed += 1) {
      await page.keyboard.press("ArrowRight");
    }
    await expect(section.getByRole("status")).toContainText(/landed/i, { timeout: 10_000 });
    await expect(stage).toHaveAttribute("data-crossing", "landed");

    // And then it stops, which is the same rest contract on the keyboard path.
    await waitForRest(page, "after the keyboard flight");
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

    // 1. Orient the planet by clicking a point on it.
    const before = await globeSignature(page);
    const box = await stage.boundingBox();
    if (!box) throw new Error("the stage has no box");
    await aimAtGlobe(page, box.x + box.width * 0.42, box.y + box.height * 0.3);
    await page.mouse.click(box.x + box.width * 0.42, box.y + box.height * 0.3);
    await expect.poll(() => globeSignature(page), { timeout: 5_000 }).not.toBe(before);

    // 2. Turn to any stop.
    await page.locator(stopButton(1)).click();
    await expect(page.locator(OVERLAY)).toHaveAttribute("data-active-stop", STOPS[1].id);

    // 3. Fly the crossing, end to end: the status region says he landed.
    await section.getByRole("button", { name: /replay the flight/i }).click();
    await expect(section.getByRole("status")).toHaveText(/landed/i, { timeout: 10_000 });
  });

  test("draws in system colours when forced colours are active", async ({ page }) => {
    // A canvas bitmap is the one thing forced-colors does not repaint: the CSS
    // custom properties still hold their authored values, so a globe that
    // trusted them would draw mid-blue on a forced black page and the one hue
    // that carries meaning would stop carrying it.
    //
    // What this does NOT assert is that the result is grey: a forced palette
    // maps the system keywords to whatever the user's theme says, and in this
    // Chromium's own emulated palette `GrayText` is #600000, a dark red. Nor
    // that every pixel *equals* a system colour: anti-aliasing over a
    // `Canvas`-filled knockout composites the two.
    //
    // So the claim is put in the two halves that survive compositing: the
    // authored accent is nowhere in the bitmap, and each system ink the globe
    // uses is somewhere in it.
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto("/#worlds");
    await waitForLiveGlobe(page);

    await expect(page.locator(SURFACE), "a GL surface survived forced colours").toHaveCount(0);
    expect(await drewInSystemInk(page)).toBe("ok");
  });

  test("forced colours switched on later take the surface away and keep the system inks", async ({
    page,
  }) => {
    await page.goto("/#worlds");
    await waitForLiveGlobe(page);
    await requireSurface(page);
    await page.emulateMedia({ forcedColors: "active" });
    await expect(page.locator(SURFACE)).toHaveCount(0);
    // The overlay redrew with its own coastlines, in system ink.
    await expect.poll(() => drewInSystemInk(page), { timeout: 5_000 }).toBe("ok");
    await expectAtRest(page, 1_500, "after forced colours dropped the surface");
  });

  test("a theme switch at rest redraws the globe in the new ink", async ({ page }) => {
    // At rest there is no frame to piggyback on, so the redraw has to be asked
    // for: a MutationObserver on `data-theme`.
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
    // `none` here would trap the page scroll on a phone.
    expect(touchAction).toBe("pan-y");
    // And the canvas itself, which is the element a finger actually lands on.
    const canvasTouchAction = await stage.evaluate((element) => {
      const canvas = element.querySelector<HTMLCanvasElement>('canvas[data-chunk="globe-canvas"]');
      return canvas ? getComputedStyle(canvas).touchAction : "no canvas";
    });
    expect(canvasTouchAction).toBe("pan-y");
  });
});

test.describe("reduced motion", () => {
  test("gives the finished frame, announces a pressed landing, and asks for no frames", async ({ page }) => {
    // Set before `goto`, so the cats and the origin story's player see it at
    // mount and never start a loop: under reduced motion the page is
    // genuinely silent, so a page-wide `requestAnimationFrame` count is the
    // right instrument here, unlike everywhere else in this file.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#worlds");
    const stage = await waitForLiveGlobe(page);
    const section = page.locator("#worlds");

    // The counter has to be installed *before* the press, so the press
    // happens in-page too. `statusWrites` rides along: a live region handed
    // text byte-identical to what it holds produces no DOM mutation, and a
    // second press under reduced motion would do exactly that without the
    // stage's `flushSync`.
    const press = (what: { button: string } | { key: "Home" }) =>
      page.evaluate(async (action) => {
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
        if (status) observer.observe(status, { childList: true, characterData: true, subtree: true });
        if ("key" in action) {
          const target = document.querySelector('#worlds [aria-roledescription="globe"]');
          if (!target) throw new Error("no stage");
          target.dispatchEvent(new KeyboardEvent("keydown", { key: action.key, bubbles: true, cancelable: true }));
        } else {
          const button = [...document.querySelectorAll<HTMLButtonElement>("#worlds button")].find(
            (candidate) => candidate.textContent === action.button,
          );
          if (!button) throw new Error(`no button "${action.button}"`);
          button.click();
        }
        await new Promise((resolve) => setTimeout(resolve, 1_500));
        observer.disconnect();
        window.requestAnimationFrame = original;
        return { frames, statusWrites };
      }, what);

    // On arrival the crossing landed itself — `fly()`'s synchronous path —
    // with nothing said, since nobody asked.
    await expect(section.getByRole("status")).not.toContainText(/landed/i);
    await expectAtRest(page, 700, "after the crossing landed itself under reduced motion", SILENT_HZ);
    // Redrawn once the fonts are in, so it compares with the pressed landing below.
    const { signature: autoplayed } = await settledOverlay(page);

    // Back to Việt Nam, so the press below has a flight to make.
    const home = await press({ key: "Home" });
    expect(home.frames, "reduced motion asked for animation frames to come home").toBe(0);
    await expect(stage).not.toHaveAttribute("data-crossing", "landed");
    const beforeFlight = await globeSignature(page);
    expect(beforeFlight, "the globe never came home").not.toBe(autoplayed);

    const landing = await press({ button: "Replay the flight" });
    // The outcome, not a slower animation — and not one frame requested.
    expect(landing.frames, "reduced motion asked for animation frames to land").toBe(0);
    // And the outcome is on the *canvas*, not only in the DOM.
    const landed = await globeSignature(page);
    expect(landed, "the finished frame was never drawn").not.toBe(beforeFlight);
    // The same finished frame the autoplay drew: one landing, however it came.
    expect((await settledOverlay(page)).signature, "the pressed landing is not the autoplay's frame").toBe(
      autoplayed,
    );
    await expect(section.getByRole("status")).toContainText(/landed/i);
    expect(landing.statusWrites, "the landing was never announced").toBeGreaterThan(0);

    // Pressing it again reaches the same finished frame — and says so again.
    const again = await press({ button: "Replay the flight" });
    expect(again.frames, "a replay under reduced motion asked for frames").toBe(0);
    expect(again.statusWrites, "a second press announced nothing").toBeGreaterThan(0);
    expect(await globeSignature(page)).toBe(landed);
  });

  test("orienting the globe with one click asks for no frames either", async ({ page }) => {
    // The WCAG 2.5.7 path: a visitor on a head pointer or eye-gaze cannot hold
    // a drag, so click-to-orient is how they move the planet at all.
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
        const canvas = document.querySelector<HTMLCanvasElement>('#worlds canvas[data-chunk="globe-canvas"]');
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
    expect(await globeSignature(page), "the click did not orient the globe").not.toBe(before);
  });
});

test.describe("the robot walks once after each landing", () => {
  test("it walks frame by frame, then leaves a plain planet at rest", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/#worlds");
    const stage = await waitForLiveGlobe(page);
    await requireSurface(page);
    await page.locator("#worlds").getByRole("button", { name: "Replay the flight" }).click();
    await expect(stage).toHaveAttribute("data-crossing", "landed", { timeout: 10_000 });

    // The first stretch of the ~6 s walk: a frame-by-frame loop, and with a
    // surface, one GL draw per overlay draw as everywhere else.
    const walking = await measureGlobeFrames(page, 1_500);
    expectEveryFrameDrew(walking, "the walk after a landing");
    expect(Math.abs(walking.glDraws - walking.overlayDraws)).toBeLessThanOrEqual(1);

    await waitForRest(page, "after the robot's walk");
    expect((await skyBodyInk(page)).count, "a Sun or Moon stayed in the sky after the walk").toBe(0);
    await expectAtRest(page, 1_500, "after the robot's walk");
  });

  test("leaving mid-walk ends it at once, and nothing walks off-screen", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/#worlds");
    const stage = await waitForLiveGlobe(page);
    await page.locator("#worlds").getByRole("button", { name: "Replay the flight" }).click();
    await expect(stage).toHaveAttribute("data-crossing", "landed", { timeout: 10_000 });
    const walking = await measureGlobeFrames(page, 500);
    expect(walking.overlayDraws, "the landing did not start the walk").toBeGreaterThan(10);

    // The bottom of the page has no globe in view. The observer reports the exit
    // on a coming frame, not inside the scroll, so a couple of frames may
    // still draw; 200 ms covers that and stays well inside the walk.
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await page.waitForTimeout(200);
    await expectAtRest(page, 1_500, "with the robot's walk left behind off-screen");

    // Back in view it is not walking either, and it ended rather than paused:
    // a paused walk would carry on at the next wake of the loop, which a
    // nudge gives it.
    await stage.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
    await expectAtRest(page, 1_500, "after coming back to a settled walk");
    await stage.focus();
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(300);
    await expectAtRest(page, 1_000, "after waking a settled walk with a nudge");
  });

  test("a stop chosen with the globe out of view moves nothing for nobody", async ({ page }) => {
    // On a phone the list sits below the stage, so a stop can be chosen with
    // the globe scrolled away. Its turn must end at once.
    await page.goto("/#worlds");
    const stage = await waitForLiveGlobe(page);
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await page.waitForTimeout(300);
    // In-page press, so the button is not scrolled into view (and the globe
    // with it) by a locator click.
    const chosen = await pressCounting(page, stopButton(0), /./, 1_500);
    // The settle's draw and the active pin's: a couple of draws, not a turn.
    expect(chosen.overlayDraws, "the turn ran with nobody watching").toBeLessThanOrEqual(3);
    await expectAtRest(page, 1_000, "after choosing a stop off-screen");
    await stage.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
    await stage.focus();
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(300);
    await expectAtRest(page, 1_000, "after waking the off-screen choice with a nudge");
  });

  test("a Moon over the dark lap, then a Sun over the lit one, then neither, on the GL path", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/#worlds");
    await waitForLiveGlobe(page);
    await requireSurface(page);
    await expectMoonThenSun(page);
  });

  test("a Moon over the dark lap, then a Sun over the lit one, then neither, on the 2D fallback", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await withoutWebGL2(page);
    await page.goto("/#worlds");
    await waitForLiveGlobe(page);
    await expect(page.locator(SURFACE)).toHaveCount(0);
    await expectMoonThenSun(page);
  });

  test("under reduced motion the landing holds the robot still, under the Sun, on both paths", async ({
    page,
    browser,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#worlds");
    await waitForLiveGlobe(page);
    await requireSurface(page);
    expectSun(await skyBodyInk(page), "GL");
    await expectAtRest(page, 700, "the still robot", SILENT_HZ);

    const context = await browser.newContext({ viewport: page.viewportSize() ?? undefined, reducedMotion: "reduce" });
    const fallback = await context.newPage();
    try {
      await withoutWebGL2(fallback);
      await fallback.goto("/#worlds");
      await waitForLiveGlobe(fallback);
      await expect(fallback.locator(SURFACE)).toHaveCount(0);
      expectSun(await skyBodyInk(fallback), "2D");
    } finally {
      await context.close();
    }
  });
});

/**
 * Presses a button inside `#worlds` from in-page, with the frame counters
 * already running — the same reason the reduced-motion block above presses
 * in-page: a locator click lands after the counter, and its frames could not
 * be told apart from ones the press caused.
 */
async function pressCounting(page: Page, selector: string, label: RegExp, ms: number) {
  return page.evaluate(
    async ({ selector, pattern, ms }) => {
      let frames = 0;
      let overlayDraws = 0;
      let glDraws = 0;
      let framesThatDrew = 0;
      let drewInThisFrame = false;
      const frameTimes = new Set<number>();
      const overlay = document.querySelector('#worlds canvas[data-chunk="globe-canvas"]');
      const surface = document.querySelector("#worlds canvas[data-globe-surface]");
      const raf = window.requestAnimationFrame;
      window.requestAnimationFrame = (callback) => {
        frames += 1;
        return raf.call(window, (time) => {
          frameTimes.add(time);
          drewInThisFrame = false;
          callback(time);
          if (drewInThisFrame) framesThatDrew += 1;
        });
      };
      const clearRect = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function patched(this: CanvasRenderingContext2D, ...args) {
        if (this.canvas === overlay) {
          overlayDraws += 1;
          drewInThisFrame = true;
        }
        clearRect.apply(this, args);
      };
      const GL = window.WebGL2RenderingContext?.prototype;
      const drawArrays = GL?.drawArrays;
      if (GL && drawArrays) {
        GL.drawArrays = function patched(this: WebGL2RenderingContext, ...args) {
          if (surface && this.canvas === surface) {
            glDraws += 1;
            drewInThisFrame = true;
          }
          drawArrays.apply(this, args);
        };
      }
      const match = new RegExp(pattern.source, pattern.flags);
      const button = [...document.querySelectorAll<HTMLButtonElement>(selector)].find((candidate) =>
        match.test(candidate.textContent ?? ""),
      );
      // Thrown, not skipped: a press that found nothing would count zero frames
      // and pass as "nothing animated".
      if (!button) throw new Error(`no button matching ${match} in ${selector}`);
      button.click();
      await new Promise((resolve) => setTimeout(resolve, ms));
      window.requestAnimationFrame = raf;
      CanvasRenderingContext2D.prototype.clearRect = clearRect;
      if (GL && drawArrays) GL.drawArrays = drawArrays;
      return { frames, overlayDraws, glDraws, framesThatDrew, ticks: frameTimes.size };
    },
    { selector, pattern: { source: label.source, flags: label.flags }, ms },
  );
}


/**
 * The ink in the patch of sky where the Moon or Sun hangs: upper left, outside
 * the limb. Nothing else is drawn there, so a count of zero means no body.
 * The box is taken from the canvas the way the globe lays itself out (centre at
 * 44% of the height, radius 0.42 of the smaller of the width and 0.82 of the
 * height), in device pixels.
 */
async function skyBodyInk(page: Page) {
  return page.evaluate(() => {
    const none = { count: -1, ink: 0, rightInk: 0, centroidX: 0, hash: "no canvas" };
    const canvas = document.querySelector<HTMLCanvasElement>('#worlds canvas[data-chunk="globe-canvas"]');
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return none;
    const rect = canvas.getBoundingClientRect();
    const k = canvas.width / rect.width;
    const cx = (rect.width / 2) * k;
    const cy = rect.height * 0.44 * k;
    const r = Math.min(rect.width, rect.height * 0.82) * 0.42 * k;
    const x0 = Math.round(cx - 1.15 * r);
    const x1 = Math.round(cx - 0.8 * r);
    const y0 = Math.round(cy - 1.2 * r);
    const y1 = Math.round(cy - 0.85 * r);
    const w = x1 - x0;
    const { data } = ctx.getImageData(x0, y0, w, y1 - y0);
    // The body's centre, and the knockout's ground colour read 17 CSS px to
    // its right: inside the 19 px disc, outside any glyph (at most ~14 px).
    const bx = cx - 0.97 * r - x0;
    const by = cy - 1.02 * r - y0;
    const g = (Math.round(by) * w + Math.round(bx + 17 * k)) * 4;
    const ground = [data[g], data[g + 1], data[g + 2]];
    let count = 0;
    let ink = 0;
    let rightInk = 0;
    let sumX = 0;
    let hash = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      count += 1;
      hash = (hash * 31 + data[i] + data[i + 1] * 3 + data[i + 2] * 7 + data[i + 3] + i) | 0;
      const away =
        Math.abs(data[i] - ground[0]) + Math.abs(data[i + 1] - ground[1]) + Math.abs(data[i + 2] - ground[2]);
      if (away < 120) continue;
      const dx = ((i / 4) % w) - bx;
      ink += 1;
      sumX += dx;
      if (dx > 6 * k) rightInk += 1;
    }
    return { count, ink, rightInk, centroidX: ink ? sumX / ink / k : 0, hash: String(hash) };
  });
}


type SkyBody = Awaited<ReturnType<typeof skyBodyInk>>;

/** Ink is what differs from the knockout's ground, so the disc alone is not a
 *  body. The Sun is round with rays, so it reaches more than 6 CSS px to the
 *  right of its centre and is centred on it; the Moon is a crescent opening to
 *  the right, so it is left of centre and stays off that side. */
const isSun = (body: SkyBody) => body.ink > 0 && body.rightInk > 0 && Math.abs(body.centroidX) < 1.5;
const isMoon = (body: SkyBody) => body.ink > 0 && body.rightInk === 0 && body.centroidX < -1;

function expectSun(body: SkyBody, where: string) {
  expect(body.ink, `${where}: no body over the still robot`).toBeGreaterThan(0);
  expect(body.rightInk, `${where}: the body has no rays to the right: not a Sun`).toBeGreaterThan(0);
  expect(Math.abs(body.centroidX), `${where}: the body is not centred: not a Sun`).toBeLessThan(1.5);
}

/** Replays the flight and watches the sky through the walk that follows: the
 *  Moon over the dark lap, the Sun over the lit one, then an empty sky. Polled,
 *  because the walk runs on the wall clock and this machine's frame rate does
 *  not. */
async function expectMoonThenSun(page: Page) {
  expect((await skyBodyInk(page)).count, "a body hangs in the sky at rest").toBe(0);
  await page.locator("#worlds").getByRole("button", { name: "Replay the flight" }).click();
  await expect(page.getByRole("group", { name: /playground earth/i })).toHaveAttribute("data-crossing", "landed", {
    timeout: 10_000,
  });
  const seen: { moon?: SkyBody; sun?: SkyBody } = {};
  await expect
    .poll(
      async () => {
        const body = await skyBodyInk(page);
        if (isMoon(body)) seen.moon = body;
        return seen.moon !== undefined;
      },
      { timeout: 6_000, intervals: [50], message: "no Moon over the dark lap" },
    )
    .toBe(true);
  await expect
    .poll(
      async () => {
        const body = await skyBodyInk(page);
        if (isSun(body)) seen.sun = body;
        return seen.sun !== undefined;
      },
      { timeout: 8_000, intervals: [50], message: "no Sun over the lit lap" },
    )
    .toBe(true);
  expect(seen.sun?.hash, "the Moon and the Sun are the same drawing").not.toBe(seen.moon?.hash);
  await expect
    .poll(async () => (await skyBodyInk(page)).count, { timeout: 10_000, message: "the sky never cleared" })
    .toBe(0);
}

/**
 * How many pixels of the overlay carry any ink. Coastlines are the bulk of
 * what the overlay stops drawing once a GL surface takes them, so this is how
 * the context-loss test tells "coastlines drawn" from "coastlines left to a
 * surface that is not there".
 */
async function overlayInk(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#worlds canvas[data-chunk="globe-canvas"]');
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return -1;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let inked = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) inked += 1;
    return inked;
  });
}

/** Every webgl2 request answers null, which is what a browser without WebGL2
 *  (or with it blocklisted) does. */
async function withoutWebGL2(page: Page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext(
      this: HTMLCanvasElement,
      type: string,
      options?: unknown,
    ) {
      if (type === "webgl2") return null;
      return original.call(this, type as "2d", options as CanvasRenderingContext2DSettings);
    } as typeof original;
  });
}

/**
 * The overlay's ink and fingerprint after two fresh redraws, once the fonts
 * have settled. Two pages compared with this were last drawn under the same
 * conditions, so any difference is in what they draw rather than in when a
 * web font happened to arrive. A theme flip there and back is the existing
 * at-rest redraw hook, and it leaves the page in the theme it started in.
 */
async function settledOverlay(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const root = document.documentElement;
    const theme = root.dataset.theme;
    root.dataset.theme = theme === "night" ? "day" : "night";
    await new Promise((resolve) => setTimeout(resolve, 50));
    root.dataset.theme = theme;
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
  return { ink: await overlayInk(page), signature: await globeSignature(page) };
}


test.describe("without WebGL2", () => {
  test("the shipped 2D globe draws", async ({ page }) => {
    await withoutWebGL2(page);
    await page.goto("/#worlds");
    await waitForLiveGlobe(page);

    await expect(page.locator(SURFACE)).toHaveCount(0);
    expect(await globeSignature(page), "the fallback globe drew nothing").not.toBe("0");
    await expectAtRest(page, 1_500, "the fallback globe, untouched");
  });

  test("a lost context falls back to exactly the globe a browser without WebGL2 gets", async ({
    page,
    browser,
  }) => {
    // After the context goes, the overlay is the same drawing, pixel for pixel
    // by these two measures, as the page that never had WebGL2. A fallback
    // that left the coastlines to a dead surface differs here by every
    // coastline pixel.
    //
    // Both pages under reduced motion: only the synchronous landing puts two
    // pages on exactly the same frame.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#worlds");
    await waitForLiveGlobe(page);
    await requireSurface(page);
    const withSurface = await settledOverlay(page);

    await page.evaluate(() => {
      const surface = document.querySelector<HTMLCanvasElement>("#worlds canvas[data-globe-surface]");
      const gl = surface?.getContext("webgl2");
      const lose = gl?.getExtension("WEBGL_lose_context");
      if (!lose) throw new Error("WEBGL_lose_context is unavailable");
      lose.loseContext();
    });
    await expect(page.locator(SURFACE), "the surface outlived its context").toHaveCount(0);
    const lost = await settledOverlay(page);

    // The coastlines came back onto the overlay: it carries more ink than it
    // did while the shader held them.
    expect(lost.ink, "the overlay did not take the coastlines back").toBeGreaterThan(withSurface.ink);

    const context = await browser.newContext({
      viewport: page.viewportSize() ?? undefined,
      reducedMotion: "reduce",
    });
    const control = await context.newPage();
    try {
      await withoutWebGL2(control);
      await control.goto("/#worlds");
      await waitForLiveGlobe(control);
      await expect(control.locator(SURFACE)).toHaveCount(0);
      const never = await settledOverlay(control);
      expect(lost.ink, "inked pixels: context lost vs never had WebGL2").toBe(never.ink);
      expect(lost.signature, "overlay fingerprint: context lost vs never had WebGL2").toBe(never.signature);
    } finally {
      await context.close();
    }
    await expectAtRest(page, 1_500, "after the context was lost", SILENT_HZ);
  });
});

/**
 * Every element in `#worlds`, and its `::before`/`::after`, that would still
 * animate or transition. Under `prefers-reduced-motion: reduce` globals.css
 * sets `animation-duration: 0.01ms` and `transition: none` on everything, so
 * the list is empty by construction; this reads the computed style of every
 * node rather than trusting the rule, which is what makes it fail if a later
 * rule (or a Tailwind `transition` utility without that guard) escapes it.
 */
async function elementsStillMoving(page: Page) {
  return page.evaluate(() => {
    const seconds = (list: string) =>
      list.split(",").map((part) => {
        const value = parseFloat(part);
        return part.trim().endsWith("ms") ? value / 1000 : value;
      });
    const root = document.querySelector("#worlds");
    if (!root) return { checked: 0, offenders: ["no #worlds"] };
    const nodes = [root, ...root.querySelectorAll("*")];
    const offenders: string[] = [];
    let checked = 0;
    for (const node of nodes) {
      for (const pseudo of [null, "::before", "::after"]) {
        const style = getComputedStyle(node, pseudo);
        checked += 1;
        const label = `<${node.tagName.toLowerCase()} class="${node.getAttribute("class") ?? ""}">${pseudo ?? ""}`;
        // 0.01ms is 1e-5s; allow float noise.
        if (Math.max(...seconds(style.animationDuration)) > 1.0001e-5) {
          offenders.push(`${label} animation-duration ${style.animationDuration}`);
        }
        if (style.transitionProperty !== "none") {
          offenders.push(`${label} transition-property ${style.transitionProperty}`);
        }
      }
    }
    return { checked, offenders };
  });
}

/** This environment's headless shell runs WebGL2, so the surface's absence is
 *  a failure to name, never a reason to skip. */
async function requireSurface(page: Page) {
  await expect(
    page.locator(SURFACE),
    "no GL surface appeared: WebGL2 is unavailable or the globe failed to create it",
  ).toHaveCount(1, { timeout: 15_000 });
}

test.describe("reduced motion across every stop", () => {
  test("nothing in #worlds animates or transitions, and the crossing is already landed", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#worlds");
    // Not `waitForLiveGlobe`: its stop would hide a replay that should never
    // have started.
    const stage = await reachLiveGlobe(page);
    await expect(stage).toHaveAttribute("data-crossing", "landed");
    // Read once, now — not a retrying assertion.
    expect(
      await page.locator("#worlds [data-replay]").textContent(),
      "a replay started under reduced motion",
    ).toBe("Replay the flight");
    const { checked, offenders } = await elementsStillMoving(page);
    expect(checked, "the sweep covered almost nothing").toBeGreaterThan(50);
    expect(offenders, offenders.join("\n")).toEqual([]);

    // And it never plays out: nothing resets, and there is nothing to stop.
    await expectAtRest(page, NO_RESTART_WINDOW_MS, "under reduced motion", SILENT_HZ);
    await expect(stage).toHaveAttribute("data-crossing", "landed");
    await expect(page.locator("#worlds").getByRole("button", { name: "Stop the replay" })).toHaveCount(0);
  });
});

/**
 * Contrast of the one label the globe draws — the active stop's place name —
 * against what actually touches its letters, for every stop in both themes.
 * "What touches its letters" is the ring of pixels one step outside the glyphs
 * in the composited bitmap (GL surface plus overlay), so it is the halo where
 * the halo reaches and the planet where it does not.
 *
 * The glyphs are found by the page itself, not modelled: the overlay is redrawn
 * three times at rest. Normally (what a visitor sees), then with the halos
 * suppressed and every word kept, then with the halos and the words suppressed.
 * The pixels that differ between the last two are exactly the letters, as the
 * live canvas rasterised them.
 */
test.describe("the active stop's canvas label", () => {
  for (const theme of ["day", "night"] as const) {
    test(`keeps 4.5:1 against what touches its letters, every stop, ${theme}`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto("/#worlds");
      await waitForLiveGlobe(page);
      await requireSurface(page);
      // The cats are hidden for the shots below; a lazy mount after the hide
      // would put them back in frame.
      await expect(page.locator("[data-companion]")).toBeAttached();

      await page.evaluate(
        ({ t, selector }) => {
          document.documentElement.dataset.theme = t;
          const w = window as unknown as { __labels: unknown[]; __mode: string };
          w.__labels = [];
          w.__mode = "normal";
          const fill = CanvasRenderingContext2D.prototype.fillText;
          const stroke = CanvasRenderingContext2D.prototype.strokeText;
          CanvasRenderingContext2D.prototype.fillText = function (
            this: CanvasRenderingContext2D,
            ...args: [string, number, number, number?]
          ) {
            if (!this.canvas.matches(selector)) return fill.apply(this, args);
            if (w.__mode === "normal") {
              w.__labels.push({
                text: args[0],
                x: args[1],
                y: args[2],
                font: this.font,
                textAlign: this.textAlign,
                textBaseline: this.textBaseline,
                fillStyle: String(this.fillStyle),
                cw: this.canvas.width,
                ch: this.canvas.height,
              });
            }
            if (w.__mode === "none") return undefined;
            return fill.apply(this, args);
          };
          CanvasRenderingContext2D.prototype.strokeText = function (
            this: CanvasRenderingContext2D,
            ...args: [string, number, number, number?]
          ) {
            if (this.canvas.matches(selector) && w.__mode !== "normal") return undefined;
            return stroke.apply(this, args);
          };
        },
        { t: theme, selector: OVERLAY },
      );

      /** Redraw the overlay once in `mode` (a theme flip away and back is the
       *  at-rest redraw hook) and screenshot exactly the canvas. */
      const shoot = async (mode: "normal" | "bare" | "none") => {
        await page.evaluate(async (m) => {
          await document.fonts.ready;
          const w = window as unknown as { __labels: unknown[]; __mode: string };
          const root = document.documentElement;
          const current = root.dataset.theme;
          root.dataset.theme = current === "night" ? "day" : "night";
          await new Promise((resolve) => setTimeout(resolve, 100));
          w.__mode = m;
          if (m === "normal") w.__labels = [];
          root.dataset.theme = current;
          await new Promise((resolve) => setTimeout(resolve, 150));
        }, mode);
        const box = await page.locator(OVERLAY).boundingBox();
        if (!box) throw new Error("the overlay has no box");
        const clip = {
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
          height: Math.round(box.height),
        };
        const viewport = page.viewportSize()!;
        expect(
          clip.x >= 0 &&
            clip.y >= 0 &&
            clip.x + clip.width <= viewport.width &&
            clip.y + clip.height <= viewport.height,
          `the canvas ${JSON.stringify(clip)} is not wholly inside the ${viewport.width}x${viewport.height} viewport`,
        ).toBe(true);
        return (await page.screenshot({ clip })).toString("base64");
      };

      const failures: string[] = [];
      for (const [index, stop] of STOPS.entries()) {
        await page.locator(stopButton(index)).click();
        await expect(page.locator(OVERLAY)).toHaveAttribute("data-active-stop", stop.id);
        // The whole canvas has to be on screen for a viewport screenshot.
        await page
          .locator(OVERLAY)
          .evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
        await waitForRest(page, `after turning to ${stop.id}`);

        // The compositor resamples a canvas that sits on a fractional pixel,
        // which would blur the letter edges by a fraction of the very ring
        // being measured. Nudge the canvas onto the pixel grid for the three
        // shots and undo it after. The cats are DOM and may be walking across
        // the stage, so they are hidden for the three shots too.
        await page.locator(OVERLAY).evaluate((el) => {
          const r = el.getBoundingClientRect();
          el.style.translate = `${Math.round(r.left) - r.left}px ${Math.round(r.top) - r.top}px`;
          document.querySelectorAll<HTMLElement>("[data-companion]").forEach((c) => {
            c.style.visibility = "hidden";
          });
        });
        const normal = await shoot("normal");
        const bare = await shoot("bare");
        const none = await shoot("none");
        await page.evaluate(() => {
          (window as unknown as { __mode: string }).__mode = "normal";
        });
        await page.locator(OVERLAY).evaluate((el) => {
          el.style.translate = "";
          document.querySelectorAll<HTMLElement>("[data-companion]").forEach((c) => {
            c.style.visibility = "";
          });
        });

        const result = await page.evaluate(
          async ({ normal, bare, none, selector }) => {
            const decode = async (b64: string) => {
              const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
              const bitmap = await createImageBitmap(new Blob([bytes]));
              const canvas = document.createElement("canvas");
              canvas.width = bitmap.width;
              canvas.height = bitmap.height;
              const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
              ctx.drawImage(bitmap, 0, 0);
              return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
            };
            const [A, B, C] = await Promise.all([decode(normal), decode(bare), decode(none)]);
            const W = A.width;
            const H = A.height;
            const overlay = document.querySelector<HTMLCanvasElement>(selector)!;
            const labels = (
              window as unknown as {
                __labels: {
                  text: string;
                  x: number;
                  y: number;
                  font: string;
                  textAlign: CanvasTextAlign;
                  textBaseline: CanvasTextBaseline;
                  fillStyle: string;
                  cw: number;
                  ch: number;
                }[];
              }
            ).__labels;

            const channel = (v: number) => {
              const s = v / 255;
              return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
            };
            const luminance = (r: number, g: number, b: number) =>
              0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
            const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
            const parse = (css: string) => {
              probe.clearRect(0, 0, 1, 1);
              probe.fillStyle = "#000";
              probe.fillStyle = css;
              probe.fillRect(0, 0, 1, 1);
              const d = probe.getImageData(0, 0, 1, 1).data;
              return [d[0], d[1], d[2]] as const;
            };

            // Every pixel the words changed, whichever word it belongs to.
            const letter = new Uint8Array(W * H);
            for (let i = 0; i < W * H; i += 1) {
              const j = i * 4;
              if (B.data[j] !== C.data[j] || B.data[j + 1] !== C.data[j + 1] || B.data[j + 2] !== C.data[j + 2]) {
                letter[i] = 1;
              }
            }

            const seen = new Set<string>();
            const out: { text: string; p5: number; n: number }[] = [];
            for (const l of labels) {
              if (l.cw !== overlay.width || l.ch !== overlay.height) continue;
              const key = `${l.text}|${l.x}|${l.y}`;
              if (seen.has(key)) continue;
              seen.add(key);
              // This word's own letters: the changed pixels inside its box.
              probe.font = l.font;
              probe.textAlign = l.textAlign;
              probe.textBaseline = l.textBaseline;
              const m = probe.measureText(l.text);
              const x0 = Math.floor(l.x - m.actualBoundingBoxLeft) - 2;
              const x1 = Math.ceil(l.x + m.actualBoundingBoxRight) + 2;
              const y0 = Math.floor(l.y - m.actualBoundingBoxAscent) - 2;
              const y1 = Math.ceil(l.y + m.actualBoundingBoxDescent) + 2;
              const mine = new Uint8Array(W * H);
              let count = 0;
              for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y += 1) {
                for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x += 1) {
                  if (letter[y * W + x]) {
                    mine[y * W + x] = 1;
                    count += 1;
                  }
                }
              }
              // A word with no letter pixels is not skipped: it measures as 0 and fails.
              if (count === 0) {
                out.push({ text: l.text, p5: 0, n: 0 });
                continue;
              }
              const ink = parse(l.fillStyle);
              const inkL = luminance(ink[0], ink[1], ink[2]);
              const values: number[] = [];
              for (let y = Math.max(1, y0 - 2); y <= Math.min(H - 2, y1 + 2); y += 1) {
                for (let x = Math.max(1, x0 - 2); x <= Math.min(W - 2, x1 + 2); x += 1) {
                  // The surround is the one-pixel dilation minus the letters.
                  if (mine[y * W + x]) continue;
                  let touches = false;
                  for (let dy = -1; dy <= 1 && !touches; dy += 1) {
                    for (let dx = -1; dx <= 1; dx += 1) {
                      if (mine[(y + dy) * W + (x + dx)]) {
                        touches = true;
                        break;
                      }
                    }
                  }
                  if (!touches) continue;
                  const i = (y * W + x) * 4;
                  values.push(ratio(inkL, luminance(A.data[i], A.data[i + 1], A.data[i + 2])));
                }
              }
              values.sort((p, q) => p - q);
              out.push({ text: l.text, p5: values[Math.floor(0.05 * (values.length - 1))], n: values.length });
            }
            return out;
          },
          { normal, bare, none, selector: OVERLAY },
        );

        const expected = stop.place.toUpperCase();
        expect(
          result.map((r) => r.text),
          `${theme}/${stop.id}: "${expected}" was not measured`,
        ).toContain(expected);
        for (const r of result) {
          console.log(`label contrast ${theme} / ${stop.id}: "${r.text}" p5 ${r.p5.toFixed(2)}`);
          if (r.p5 < 4.5) failures.push(`${stop.id}, ${theme}: label "${r.text}" has p5 contrast ${r.p5.toFixed(2)} (< 4.5)`);
        }
      }
      expect(failures, failures.join("\n")).toEqual([]);
    });
  }
});
