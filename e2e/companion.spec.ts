import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * The companion cats, their play menu, and the one place they can be put away.
 *
 * The cats are decoration with a job attached, and the job is what these tests
 * cover: they must be operable by keyboard, must never be the only route to
 * anything, must stay out of the way when a visitor asks for less motion, must
 * never park on top of content, must always be somewhere a visitor can see
 * them, and must be dismissable to somewhere with a way back.
 *
 * That last clause used to read "…with a way back from everything except the
 * one action that says it has no way back". There is no such action any more.
 * "Turn the cats off" and "send the cats to bed" were the same thing said
 * twice — both stop the loop, both end the roaming — except that one of them
 * left a visitor with nothing on the page to undo it, which then needed a
 * footer control existing purely to rescue them. Both are gone; the bed is the
 * only quiet state and it carries its own Wake button. What survives of that
 * contract is stronger rather than weaker, and is asserted below: a browser
 * that stored the retired mode still finds cats.
 *
 * Their animation is deliberately not asserted. Pose, phase and position are
 * cosmetic, one of the two cats is deliberately non-deterministic, and pinning
 * any of it would make the suite fail every time the drawing is retouched. The
 * exceptions below are not about how the cats look: "somewhere you can see
 * them", "somewhere you can find them" and "never on top of what you are
 * reading" are the ways this feature has actually failed a visitor, and none of
 * them is cosmetic.
 *
 * ## Scenes
 *
 * An unprompted scene opens minutes apart, only while the visitor is idle, and
 * never at all without a roaming loop — so waiting for one would mean minutes
 * of real time per worker for a decoration whose failure mode is "a line
 * drawing appears". What is asserted is the two places it could hurt somebody
 * (absent under reduced motion, never resting on content) and the one place it
 * is now a *control*: the play menu, where a visitor asks for a scene by name
 * and is owed either the scene or an answer.
 *
 * `[data-cat-play]` is how a scene is observed at all. Two of the four on the
 * menu draw a prop and one does not — the chase is two cats and nothing else —
 * so the attribute on the companion's own root is the only handle on "a scene
 * is running" that works for all of them.
 *
 * ## Driving the cats
 *
 * Anything that clicks the lead cat is clicking a target that moves every
 * frame, and Playwright waits for an element to hold still before it clicks.
 * Straight after a load the pair are parked in their corner and a click is
 * safe; once they are walking — mid-scene, mid-mood, trailing the pointer — it
 * is not, and the wait runs to the test timeout. So every *re*-open below is
 * `focus()` plus Enter, which needs no stability and exercises the keyboard
 * path at the same time.
 *
 * ## Counting cats
 *
 * `[data-companion] svg` used to mean "a cat", because cats were the only thing
 * the companion drew. They are not any more: the corner furniture — a bed, a
 * cardboard box and a sheet of paper — and the props are line drawings in the
 * same technique on the same layer. So the assertions that are about *animals*
 * say `svg[data-cat]`, and the two that are about anything the companion paints
 * over somebody's page — never off-screen, never behind the header — keep the
 * wider selector on purpose. The furniture obeys the same clamps the cats do,
 * and those tests are where that is proved.
 */

const DESKTOP_WIDTH = 1440;
const MOBILE_WIDTH = 375;

/** The play menu, in the order the panel draws it. */
const SCENES = [
  { kind: "yarn", name: /toss the yarn/i },
  { kind: "moth", name: /release a moth/i },
  { kind: "bowl", name: /dinner time/i },
  { kind: "chase", name: /start a chase/i },
] as const;

function viewportWidth(page: Page): number {
  return page.viewportSize()?.width ?? 0;
}

/** The lead cat: the only companion element with an accessible name, because
 *  it is the only one that is a control. */
function catButton(page: Page) {
  return page.getByRole("button", { name: /quick actions/i });
}

function toolkit(page: Page) {
  return page.locator("#companion-actions");
}

function restingBox(page: Page) {
  return page.getByRole("button", { name: /wake the cats/i });
}

/**
 * Wait until the roaming loop is demonstrably live — both cats positioned by
 * their first animation frames. The pointer listener attaches in the same
 * mount commit as the loop, so once this holds, a synthetic mouse move cannot
 * race the handler. Without it, a `mouse.move` fired immediately after
 * networkidle can land ~80ms before hydration finishes attaching the effect,
 * and the test's one presence stamp silently evaporates — which is exactly
 * how three of these tests flaked on a warm dev server.
 */
async function companionAwake(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            Array.from(document.querySelectorAll("[data-companion] svg[data-cat]")).filter(
              (svg) => {
                const el = svg.closest("[data-companion] > *") as HTMLElement | null;
                return el?.style.transform.includes("translate3d") ?? false;
              },
            ).length,
        ),
      { timeout: 10_000 },
    )
    .toBe(2);
}

/** Open the panel from the keyboard, which works whether or not the cat
 *  happens to be walking. See "Driving the cats" above. */
async function openToolkit(page: Page): Promise<void> {
  const cat = catButton(page);
  if ((await cat.getAttribute("aria-expanded")) === "true") return;
  await cat.focus();
  await page.keyboard.press("Enter");
  await expect(cat).toHaveAttribute("aria-expanded", "true");
}

/**
 * Open it the way a visitor with a mouse does, which is the harder half.
 *
 * The pointer arriving on top of the lead cat is the same event that sends him
 * walking — he keeps a personal-space radius from the cursor and moves out of
 * it — so a single click can land on the patch of page he has just left. That
 * is the product working as designed, and it says nothing about whether
 * clicking the cat opens his panel. So the attempt is retried rather than
 * forced to succeed on the first frame, and `force` skips Playwright's
 * hold-still check, which a cat by definition never satisfies.
 */
async function clickOpenToolkit(page: Page): Promise<void> {
  const cat = catButton(page);
  await expect
    .poll(
      async () => {
        if ((await cat.getAttribute("aria-expanded")) === "true") return "true";
        await cat.click({ force: true, timeout: 5_000 }).catch(() => {});
        return cat.getAttribute("aria-expanded");
      },
      { timeout: 20_000, message: "clicking the cat never opened its panel" },
    )
    .toBe("true");
}

/** Put something under the reading band with no smooth-scroll animation to
 *  wait out, then park the pointer somewhere quiet so the pair settle. */
async function readTo(page: Page, selector: string, pointer: [number, number]): Promise<void> {
  await page.evaluate((sel) => {
    const target = document.querySelector(sel);
    if (!target) throw new Error(`nothing matches ${sel}`);
    const box = target.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + box.top - 100, behavior: "instant" as ScrollBehavior });
  }, selector);
  await page.mouse.move(pointer[0], pointer[1]);
  await page.mouse.move(pointer[0] + 2, pointer[1] + 2);
}

/** What `restingOnContent` reports instead of a verdict when the pair have not
 *  finished moving. Not a failure — a "come back later". */
const WALKING = "cats still walking";

/**
 * Every cat currently resting on something readable. Empty is the contract:
 * crossing prose while they walk is fine and deliberate, parking on it is not.
 *
 * `still` is what makes the second half of that sentence answerable. The probe
 * cannot tell a cat that has *stopped* on a paragraph from one mid-stride
 * across it, so asked at an arbitrary instant it answers a question the product
 * never promised anything about — a cat two thirds of the way to a mood's
 * anchor is over content by design, and says so. With `still`, the pair's
 * drawn positions are read twice with a pause between and the sample is thrown
 * away unless nothing moved; a pair still walking reports itself as `WALKING`,
 * so a caller polling this waits the walk out instead of photographing it.
 */
function restingOnContent(page: Page, { still = false }: { still?: boolean } = {}) {
  return page.evaluate(
    async ({ requireStill, walking }) => {
      // Animals only. This rule has always been about where a *cat* comes to
      // rest; the corner furniture is placed rather than probed, and it lives
      // where the toolkit panel and the resting box already do.
      const cats = () => Array.from(document.querySelectorAll("[data-companion] svg[data-cat]"));

      if (requireStill) {
        const where = () =>
          cats()
            .map((svg) => {
              const box = svg.getBoundingClientRect();
              return `${box.left.toFixed(2)},${box.top.toFixed(2)}`;
            })
            .join(" ");
        const before = where();
        // Long enough that even the last crawling pixels of a walk show up: the
        // loop only lets a cat stop once it is within 0.6px of its target, and
        // that is still a dozen-odd frames of visible movement.
        await new Promise((resolve) => setTimeout(resolve, 250));
        if (where() !== before) return [walking];
      }

      const readable =
        "p,h1,h2,h3,h4,h5,h6,li,dt,dd,blockquote,pre,code,figure,table,a,button,input,textarea,select,label";
      return cats().flatMap((svg) => {
        const rect = svg.getBoundingClientRect();
        // The feet and the belly, which is where a cat actually rests.
        const points: Array<[number, number]> = [
          [rect.left + 6, rect.bottom - 6],
          [rect.right - 6, rect.bottom - 6],
          [rect.left + rect.width / 2, rect.top + rect.height * 0.6],
        ];
        return points.flatMap(([x, y]) =>
          document
            .elementsFromPoint(x, y)
            .filter((el) => !el.closest("[data-companion]"))
            .slice(0, 1)
            .filter((el) => el.closest(readable))
            .map((el) => `${el.tagName.toLowerCase()} at ${Math.round(x)},${Math.round(y)}`),
        );
      });
    },
    { requireStill: still, walking: WALKING },
  );
}

/**
 * Wait for the pair to actually stop, and assert that where they stopped is
 * clear of anything readable.
 *
 * Two things have to be true of the sample this asserts on, and each of them
 * is a way the obvious version of this check goes wrong.
 *
 * It has to be taken while they are *stopped*, because "not on content" is a
 * claim about a resting cat and a walking one is over prose by design. The
 * moment a mood's arrival poll succeeds — "a cat is within 120px of the card" —
 * is emphatically not that moment: it is true while the pair are still walking
 * in, so a snapshot there is a coin toss about legal behaviour. Hence `still`.
 *
 * And it has to be the *first* such sample, which is why the verdict is latched
 * out of the poll rather than being the poll's own predicate. Left alone for
 * fourteen seconds the pair give up on the mood and walk home to their corner,
 * which is furniture and always clear — so a poll that simply retried the
 * purity check would let a cat that parked squarely on a paragraph wait out its
 * own violation and pass on the tidy rest that followed.
 */
async function expectRestClearOfContent(page: Page, message: string): Promise<void> {
  let rest: string[] | null = null;
  await expect
    .poll(
      async () => {
        const sample = await restingOnContent(page, { still: true });
        if (rest === null && sample[0] !== WALKING) rest = sample;
        return rest === null ? "still walking" : "stopped";
      },
      { timeout: 25_000, message: `${message} (they never stopped moving)` },
    )
    .toBe("stopped");
  expect(rest ?? [], message).toEqual([]);
}

test.describe("companion", () => {
  test("opens and closes its toolkit, and Escape returns focus to the cat", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "state is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const cat = catButton(page);
    await expect(cat).toHaveAttribute("aria-expanded", "false");

    await clickOpenToolkit(page);
    await expect(toolkit(page).getByRole("button", { name: SCENES[0].name })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(cat).toHaveAttribute("aria-expanded", "false");
    await expect(cat).toBeFocused();
  });

  test("is reachable and operable by keyboard alone", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "state is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const cat = catButton(page);
    await cat.focus();
    await expect(cat).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(cat).toHaveAttribute("aria-expanded", "true");

    // Opening moves focus into the panel, so the first Tab stays inside it
    // rather than stranding the visitor back at the top of the document.
    const focusedInPanel = await page.evaluate(() =>
      document.getElementById("companion-actions")?.contains(document.activeElement),
    );
    expect(focusedInPanel).toBe(true);

    // And Tab walks every item in the order they are drawn, ending on the two
    // below the rule: what the cats do with themselves the rest of the time,
    // and the one that puts them away. Plain buttons in a plain group: that is
    // the whole keyboard contract, and the reason the panel does not claim
    // `role="menu"` — the role would promise arrow keys, Home/End and
    // typeahead, none of which exist here.
    const order = [
      ...SCENES.map((scene) => scene.name),
      /let them wander|follow my cursor/i,
      /send the cats to bed/i,
    ];
    for (const [index, name] of order.entries()) {
      if (index > 0) await page.keyboard.press("Tab");
      await expect(toolkit(page).getByRole("button", { name })).toBeFocused();
    }
  });

  test("the toolkit offers play and bed, and nothing the page already carries", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "content is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);
    await openToolkit(page);

    const panel = toolkit(page);

    // The cat points at the panel, and the panel names itself. Neither claims
    // to be a menu widget: a `role="menu"` without arrow keys, Home/End and
    // typeahead is a promise to a screen-reader user that nothing keeps.
    await expect(catButton(page)).toHaveAttribute("aria-controls", "companion-actions");
    await expect(panel).toHaveAttribute("aria-label", /quick actions/i);
    expect(await panel.getAttribute("role")).toBeNull();

    // The panel used to duplicate the site nav and the contact section — jump
    // links and social links, a second copy of routes that already exist twice
    // over. The owner had it replaced with the one thing only the cats can
    // offer, so the absence of navigation here is the assertion, not an
    // oversight.
    await expect(panel.locator("a")).toHaveCount(0);

    for (const scene of SCENES) {
      await expect(panel.getByRole("button", { name: scene.name })).toHaveCount(1);
    }
    await expect(panel.getByRole("button", { name: /send the cats to bed/i })).toHaveCount(1);
    // One control for what the pair do when nobody is asking them for a scene,
    // and it says which way it is about to go rather than naming a state — a
    // label that reads true whichever way round it currently is.
    await expect(
      panel.getByRole("button", { name: /let them wander|follow my cursor/i }),
    ).toHaveCount(1);
    // Six, and no seventh: the permanent exit is gone from here and from
    // everywhere else on the page.
    await expect(panel.getByRole("button")).toHaveCount(SCENES.length + 2);
    await expect(page.getByRole("button", { name: /turn the cats off/i })).toHaveCount(0);

    // Every control here is reachable and operable without a mouse, which is
    // the bar any of them has to clear to be a control at all.
    for (const control of await panel.getByRole("button").all()) {
      await expect(control).toBeEnabled();
      const box = await control.boundingBox();
      expect(box, "a control with no box cannot be pressed").not.toBeNull();
      expect(box!.height, "44px minimum target").toBeGreaterThanOrEqual(44);
    }
  });

  test("plays every scene on demand, or says why it cannot", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    const broken: string[] = [];
    page.on("pageerror", (error) => broken.push(String(error)));

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);

    for (const scene of SCENES) {
      await openToolkit(page);
      await toolkit(page).getByRole("button", { name: scene.name }).click();

      /*
       * Two honest outcomes, and silence is not one of them. Either the scene
       * is running — which the companion says on its own root — or the panel
       * says there is nowhere to put it, which is a real answer rather than a
       * fault: asking for a scene skips the idle timer and nothing else, so the
       * same clear-spot probe an unprompted scene goes through still has to
       * find room for a rolling ball or a bowl and two cats facing each other.
       * A button that does neither is the failure this exists to catch.
       */
      const outcome = () =>
        page.evaluate(() => ({
          playing: document.querySelector("[data-cat-play]")?.getAttribute("data-cat-play") ?? null,
          said: (
            document.querySelector("#companion-actions [role='status']")?.textContent ?? ""
          ).trim(),
        }));
      const nothing = JSON.stringify({ playing: null, said: "" });
      await expect
        .poll(async () => JSON.stringify(await outcome()), {
          timeout: 5_000,
          message: `"${scene.kind}" did nothing at all`,
        })
        .not.toBe(nothing);

      const { playing, said } = await outcome();
      if (playing !== null) {
        expect(playing).toBe(scene.kind);
        // A scene cannot run under an open panel — the cats are called home to
        // the corner it is anchored to, and the loop drops any scene while they
        // are — so asking for one closes it, and hands focus back to the cat
        // exactly as Escape does rather than dropping it on <body>.
        await expect(catButton(page)).toHaveAttribute("aria-expanded", "false");
        await expect(catButton(page)).toBeFocused();
      } else {
        expect(said).toMatch(/no room/i);
        // Refusing leaves the menu open, so the visitor can try another one.
        await expect(catButton(page)).toHaveAttribute("aria-expanded", "true");
      }
    }

    expect(broken).toEqual([]);
  });

  test("holds a scene the visitor asked for against the next mouse move", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);

    const playing = () =>
      page.evaluate(
        () => document.querySelector("[data-cat-play]")?.getAttribute("data-cat-play") ?? null,
      );
    const refused = () =>
      page.evaluate(() =>
        /no room/i.test(document.querySelector("#companion-actions [role='status']")?.textContent ?? ""),
      );

    // Whichever scene the page has room for is the one under test — the rule is
    // about provenance, not about any particular ball of wool.
    let kind: string | null = null;
    for (const scene of SCENES) {
      await openToolkit(page);
      await toolkit(page).getByRole("button", { name: scene.name }).click();
      await expect
        .poll(async () => ((await playing()) !== null ? "playing" : (await refused()) ? "refused" : "silent"), {
          timeout: 5_000,
          message: `"${scene.kind}" did nothing at all`,
        })
        .not.toBe("silent");
      kind = await playing();
      if (kind !== null) break;
    }
    expect(kind, "no scene had room to run, so there was nothing to hold").not.toBeNull();

    /*
     * FB-9.1, and the reason this test is not "wait and check": the hand that
     * clicked the menu item is still on the mouse. Every unprompted scene is
     * dropped the frame the pointer moves — that rule stays — but a scene the
     * visitor *chose* used to die the same way, which made four of the five
     * menu items unusable with a mouse. A second of real movement is far more
     * than the one frame it took.
     */
    for (let i = 0; i < 12; i += 1) {
      await page.mouse.move(320 + i * 28, 400 + i * 11);
      await page.waitForTimeout(60);
    }
    expect(await playing(), "the scene was taken away by the pointer").toBe(kind);

    /*
     * And held against the pointer *only*. Reopening the panel calls the pair
     * back to the corner it is anchored to, so it still ends the scene — the
     * fix is a scene the visitor keeps, not a scene they cannot get out of.
     */
    await openToolkit(page);
    await expect
      .poll(playing, { timeout: 3_000, message: "reopening the panel left the scene running" })
      .toBeNull();
  });

  /** One drawing, and how it reads against the section it is currently over. */
  type Drawing = { section: string | null; steady: boolean; ratio: number | null };

  test("stays visible over the section it is crossing", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);

    /*
     * FB-9.2. `syncTone` repoints each drawing's aliases to the section it is
     * over, but a drawing that never names a colour of its own inherits one
     * already resolved on the layer root — outside every tone scope — and over
     * the closing section in day theme the root's ink *is* that section's
     * ground. The follower, the toy and the bed were being drawn in the colour
     * they were standing on, which is how a visitor loses a cat.
     *
     * The assertion is the product rule rather than the mechanism: whatever
     * the companion draws has to be visible against whatever is behind it.
     * 3:1 is WCAG 2.2's floor for a non-text graphic, which is what a line
     * drawing of a cat is.
     */
    const sample = (): Promise<Drawing[]> =>
      page.evaluate(async () => {
        const channels = (value: string): [number, number, number] | null => {
          const trimmed = value.trim();
          if (trimmed.startsWith("#") && trimmed.length === 7) {
            return [1, 3, 5].map((i) => parseInt(trimmed.slice(i, i + 2), 16)) as [
              number,
              number,
              number,
            ];
          }
          const parts = trimmed.match(/-?[\d.]+/g);
          return parts && parts.length >= 3
            ? (parts.slice(0, 3).map(Number) as [number, number, number])
            : null;
        };
        const relative = (rgb: [number, number, number]) => {
          const [r, g, b] = rgb.map((v) => {
            const c = v / 255;
            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const drawings = () =>
          Array.from(document.querySelectorAll("[data-companion] > *")).filter((node) =>
            node.querySelector("svg"),
          );
        // The companion's own layer is see-through to this question: what is
        // being measured is the cats, not what they are standing on.
        const under = (node: Element) => {
          const box = node.getBoundingClientRect();
          return document
            .elementsFromPoint(box.left + box.width / 2, box.top + box.height / 2)
            .find((el) => !el.closest("[data-companion]"));
        };

        // Read twice. The loop re-samples the tone every 320ms, so a cat that
        // crossed a boundary a moment ago is legitimately still wearing the
        // section it came from — `steady` is what tells the caller it is
        // looking at a settled answer rather than at the sampling interval.
        const before = drawings().map((node) => under(node)?.closest("section")?.id ?? null);
        await new Promise((resolve) => setTimeout(resolve, 400));

        return drawings().map((node, index) => {
          const behind = under(node);
          const section = behind?.closest("section")?.id ?? null;
          const ink = channels(getComputedStyle(node).color);
          const ground = behind
            ? channels(getComputedStyle(behind).getPropertyValue("--ground"))
            : null;
          const steady = section !== null && section === before[index];
          if (!ink || !ground) return { section, steady, ratio: null };
          const light = Math.max(relative(ink), relative(ground));
          const dark = Math.min(relative(ink), relative(ground));
          return { section, steady, ratio: (light + 0.05) / (dark + 0.05) };
        });
      });

    for (const theme of ["day", "night"] as const) {
      if ((await page.locator("html").getAttribute("data-theme")) !== theme) {
        await page.getByRole("button", { name: `Switch to ${theme} theme` }).click();
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      }

      /*
       * The closing section is the one that proves it: the page's only
       * `contrast` tone, which in day theme is a dark band under a light page.
       * The cats are brought there the way the visitor brought them — by
       * trailing a cursor across it, not by being left alone, which sends them
       * back up to whatever the visitor is actually reading.
       */
      const middle = await page.evaluate(() => {
        const closing = document.querySelector("#closing");
        if (!closing) throw new Error("the page has no closing section");
        const box = closing.getBoundingClientRect();
        window.scrollTo({
          top: window.scrollY + box.top - (window.innerHeight - box.height) / 2,
          behavior: "instant" as ScrollBehavior,
        });
        const settled = closing.getBoundingClientRect();
        return {
          x: Math.round(settled.left + settled.width / 2),
          y: Math.round(settled.top + settled.height / 2),
        };
      });

      // Latched out of the poll rather than re-asked by it: the first sample
      // that can answer the question is the one that has to answer it, or a
      // cat drawn in the ground it is standing on gets to walk somewhere
      // friendlier and pass there.
      const seen: { drawings: Drawing[] | null } = { drawings: null };
      let step = 0;
      await expect
        .poll(
          async () => {
            for (let i = 0; i < 8; i += 1) {
              const angle = (step += 1) / 5;
              await page.mouse.move(
                middle.x + Math.cos(angle) * 200,
                middle.y + Math.sin(angle) * 110,
              );
              await page.waitForTimeout(50);
            }
            const drawings = await sample();
            if (
              seen.drawings === null &&
              drawings.length > 0 &&
              drawings.every((cat) => cat.steady && cat.section === "closing")
            ) {
              seen.drawings = drawings;
            }
            return seen.drawings !== null;
          },
          {
            timeout: 30_000,
            message: `the cats never followed the cursor onto the closing section in ${theme}`,
          },
        )
        .toBe(true);

      for (const cat of seen.drawings ?? []) {
        expect(
          cat.ratio,
          `a drawing over "${cat.section}" in ${theme} could not be measured`,
        ).not.toBeNull();
        expect(
          cat.ratio ?? 0,
          `a drawing over "${cat.section}" in ${theme} is invisible`,
        ).toBeGreaterThan(3);
      }
    }
  });

  test("takes the cats off the cursor when asked, and keeps them out of the bed there", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    // Real time, and deliberately: the second half of this is the fourteen-second
    // idle threshold seen from the one mode it does not apply in, and faking the
    // clock would test a different feature.
    test.setTimeout(120_000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);

    // One move, so a pointer exists. The idle bed is gated on that, which is
    // what makes "no bed here" a claim about the mode rather than about a page
    // nobody has touched.
    await page.mouse.move(700, 500);

    await openToolkit(page);
    await toolkit(page).getByRole("button", { name: /let them wander/i }).click();

    // Written down like the bed is: this is a preference, not a session quirk,
    // and it is the same key both of the others use.
    expect(await page.evaluate(() => window.localStorage.getItem("companion"))).toBe("wander");
    // The item now offers the way back, which is the whole of its two states.
    await expect(toolkit(page).getByRole("button", { name: /follow my cursor/i })).toHaveCount(1);
    await expect(toolkit(page).getByRole("button", { name: /let them wander/i })).toHaveCount(0);
    // And the cat is still the control it was: same name, same wiring, same
    // focus behaviour on the way out.
    await expect(catButton(page)).toHaveAttribute("aria-controls", "companion-actions");
    await page.keyboard.press("Escape");
    await expect(catButton(page)).toHaveAttribute("aria-expanded", "false");
    await expect(catButton(page)).toBeFocused();

    /*
     * Now leave them alone with the pointer parked, for a good deal longer than
     * the fourteen seconds that sends a roaming pair to bed. Two things have to
     * hold across every one of those seconds. The bed must never appear, because
     * in this mode a visitor doing nothing is a visitor *watching* and a
     * companion that turned in fourteen seconds into it would be a mode fourteen
     * seconds long. And the pair have to demonstrably go somewhere of their own
     * accord, or "they ignore the cursor" would be indistinguishable from "they
     * stopped".
     */
    const spots = new Set<string>();
    for (let tick = 0; tick < 24; tick += 1) {
      await page.waitForTimeout(1000);
      await expect(page.locator("[data-cat-bed]")).toHaveCount(0);
      spots.add(
        await page.evaluate(() => {
          const cat = document.querySelector("[data-companion] svg[data-cat]");
          const box = cat?.getBoundingClientRect();
          // Rounded hard: what is being counted is places, not pixels.
          return box ? `${Math.round(box.left / 60)},${Math.round(box.top / 60)}` : "gone";
        }),
      );
    }
    expect(
      spots.size,
      "the pair never took themselves anywhere with the pointer parked",
    ).toBeGreaterThan(2);
  });

  test("plays with the page itself while it wanders", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    /*
     * The slowest test in the file, and the reason is the product rule it is
     * about: scenes are minutes apart for somebody reading and a third of that
     * for somebody watching, so the first one is thirty to ninety seconds off
     * however this is driven. There is deliberately no way to ask for one of
     * these three by name — they are about somewhere the visitor happens to be,
     * and a button that fired one would be promising a place the page may not
     * have — so waiting is the only honest way to see one.
     */
    test.setTimeout(300_000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);
    await page.mouse.move(700, 500);

    await openToolkit(page);
    await toolkit(page).getByRole("button", { name: /let them wander/i }).click();
    await page.keyboard.press("Escape");

    // Somewhere all three anchors exist at once: the contact section's own top
    // hairline, its heading, and the business card, which is one of the two
    // panels on this page that declares itself as somewhere to hide.
    await page.evaluate(() => {
      const contact = document.querySelector("#contact");
      if (!contact) throw new Error("the page has no contact section");
      const box = contact.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + box.top - 140, behavior: "instant" as ScrollBehavior });
    });
    await expect(page.locator("[data-cat-hide]")).not.toHaveCount(0);

    const anchored = ["peek", "scratch", "stalk"];
    const seen: { kind: string | null; clipped: string[] } = { kind: null, clipped: [] };
    await expect
      .poll(
        async () => {
          const now = await page.evaluate(() => ({
            kind: document.querySelector("[data-cat-play]")?.getAttribute("data-cat-play") ?? null,
            // Hiding is drawn rather than composited — nothing on the page paints
            // over the companion's layer — so a clipped drawing is the only
            // evidence that a cat is behind something.
            clipped: Array.from(document.querySelectorAll("[data-companion] span"))
              .map((node) => (node as HTMLElement).style.clipPath)
              .filter((clip) => clip.startsWith("inset(")),
          }));
          if (now.kind !== null && anchored.includes(now.kind)) {
            seen.kind ??= now.kind;
            if (now.kind === "peek" && now.clipped.length > 0) seen.clipped = now.clipped;
          }
          /*
           * Waits for the *peek* specifically, and not because the other two
           * matter less. An earlier version of this test latched whichever
           * anchored scene arrived first and checked the clipping only if that
           * happened to be the peek, which meant it passed against a build with
           * hiding switched off about one run in three. A test that only
           * sometimes asks the question is worse than one that admits it is not
           * asking: it reads as coverage.
           *
           * So the scratch and the stalk turning up first is progress rather
           * than an answer — they still prove the mode produces anchored scenes
           * — and the poll keeps going until a cat is actually drawn clipped.
           * The walk in is two cats in plain view, so the clipped frame is the
           * only evidence that anything is hiding behind anything.
           */
          if (seen.clipped.length === 0) return null;
          return seen.kind;
        },
        {
          timeout: 210_000,
          intervals: [500],
          message: "no cat ever hid behind anything while the pair wandered",
        },
      )
      .not.toBeNull();
    expect(seen.kind, "the first anchored scene should have been observed").not.toBeNull();

    // And whatever it was, it obeys the rule every other scene obeys: crossing
    // the page is fine, coming to rest on it is not.
    await expectRestClearOfContent(page, "a cat came to rest on the page it was playing with");
  });

  test("draws two independently positioned cats, not one pair", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Two separately positioned elements is the whole point of FB-6: one
    // element containing both cats cannot give them different behaviour. Their
    // *positions* are not asserted — the tabby is deliberately erratic.
    await expect(page.locator("[data-companion] svg[data-cat]")).toHaveCount(2);

    // Polled, not sampled once: the transforms are written by the first
    // animation frames after hydration, and under full-suite worker load that
    // first frame can land after networkidle. What is asserted is the settled
    // state, so waiting for it is correct rather than lenient.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const wrappers = Array.from(
              document.querySelectorAll("[data-companion] svg[data-cat]"),
            ).map((svg) => svg.closest("[data-companion] > *") as HTMLElement | null);
            return {
              distinct: new Set(wrappers).size,
              positioned: wrappers.filter((el) => el?.style.transform.includes("translate3d"))
                .length,
            };
          }),
        { timeout: 10_000 },
      )
      .toEqual({ distinct: 2, positioned: 2 });
  });

  test("sends the cats to a visible resting box, which brings them back", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "state is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await openToolkit(page);
    await page.getByRole("button", { name: /send the cats to bed/i }).click();

    // Gone from roaming, but not gone: the bed is a real, labelled control and
    // focus has followed the visitor into it.
    await expect(catButton(page)).toHaveCount(0);
    await expect(restingBox(page)).toBeVisible();
    await expect(restingBox(page)).toBeFocused();

    // And it is the *only* control on the bed. "Turn the cats off" used to sit
    // beside it; the owner asked for the bed to be just the bed, so the
    // permanent exit lives in the toolkit alone. A second button reappearing
    // here is the regression this asserts.
    await expect(page.getByRole("button", { name: /turn the cats off/i })).toHaveCount(0);
    await expect(page.locator("[data-companion] button")).toHaveCount(1);

    // Survives a reload — this is a preference, not a session quirk.
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(catButton(page)).toHaveCount(0);
    await expect(restingBox(page)).toBeVisible();

    // Sleeping cats snore, and it is decoration all the way down: hidden from
    // assistive technology, and never a target. Asserted after the reload
    // rather than straight after the dismissal, because the corner only fills
    // once the escort has finished walking them into it.
    //
    // Two streams now, not one: the pair no longer share a bed. One of them is
    // wedged in the cardboard box and the other is flat out on a sheet of
    // paper, a good 60px apart, and a single "z" rising between them would be
    // coming out of the empty bed.
    const snore = page.locator("[data-cat-snore]");
    await expect(snore).toHaveCount(2);
    for (const one of await snore.all()) {
      await expect(one).toHaveAttribute("aria-hidden", "true");
    }
    expect(
      await page.evaluate(() =>
        Array.from(document.querySelectorAll("[data-cat-snore]")).map(
          (el) => window.getComputedStyle(el).pointerEvents,
        ),
      ),
    ).toEqual(["none", "none"]);

    // And the way back exists, which is the entire point of FB-5.
    await restingBox(page).click();
    await expect(catButton(page)).toBeVisible();
    await expect(restingBox(page)).toHaveCount(0);
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(catButton(page)).toBeVisible();
  });

  test("wakes the cats into the mode they went to bed in", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);

    // Wandering is a choice about how the cats behave, and the bed is a pause
    // rather than a reset — so the round trip through it has to come back to
    // the same answer. It came back to the cursor before this test existed,
    // which is the site quietly undoing something the visitor said.
    await openToolkit(page);
    await toolkit(page)
      .getByRole("button", { name: /let them wander/i })
      .click();
    await page.getByRole("button", { name: /send the cats to bed/i }).click();
    await expect(restingBox(page)).toBeVisible();

    await restingBox(page).click();
    await expect(catButton(page)).toBeVisible({ timeout: 15_000 });
    await openToolkit(page);
    await expect(toolkit(page).getByRole("button", { name: /follow my cursor/i })).toHaveCount(1);
    expect(await page.evaluate(() => window.localStorage.getItem("companion"))).toBe("wander");

    // And it is only ever a memory of the *last* choice: turning the cursor
    // back on and repeating the trip has to bring the cursor back, or the
    // second key has stopped tracking the first.
    await toolkit(page)
      .getByRole("button", { name: /follow my cursor/i })
      .click();
    await page.getByRole("button", { name: /send the cats to bed/i }).click();
    await expect(restingBox(page)).toBeVisible();
    await restingBox(page).click();
    await expect(catButton(page)).toBeVisible({ timeout: 15_000 });
    await openToolkit(page);
    await expect(toolkit(page).getByRole("button", { name: /let them wander/i })).toHaveCount(1);
  });

  test("wakes visible cats from a stored preference it has never heard of", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "state is viewport-independent; run once");

    // The same promise the `off` migration keeps, made about the second key:
    // whatever a browser is carrying under it — a value from a later version,
    // or something that was never a mode at all — waking has to land on a page
    // with cats on it rather than on a state this build cannot draw.
    await page.goto("/");
    await page.evaluate(() => {
      window.localStorage.setItem("companion", "resting");
      window.localStorage.setItem("companion-roam", "somersault");
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(restingBox(page)).toBeVisible();
    await restingBox(page).click();
    await expect(catButton(page)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("[data-companion] svg[data-cat]")).toHaveCount(2);

    // And it lands on the default rather than passing the unknown word along:
    // `roam` is stored by storing nothing, so the key this build cannot read is
    // gone and the menu is offering the way out of the mode it actually chose.
    expect(await page.evaluate(() => window.localStorage.getItem("companion"))).toBeNull();
    await openToolkit(page);
    await expect(toolkit(page).getByRole("button", { name: /let them wander/i })).toHaveCount(1);
  });

  test("an old stored 'off' preference becomes a nap, not an empty corner", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "state is viewport-independent; run once");

    // "Off" was a third state until the owner pointed out that sending the cats
    // to bed already means the same thing. Removing it left one hazard: every
    // visitor who had already chosen it was carrying the word in localStorage,
    // and a value outside the union would otherwise render nothing at all —
    // the exact stranding the bed exists to prevent. It has to read as rest.
    await page.goto("/");
    await page.evaluate(() => window.localStorage.setItem("companion", "off"));
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(restingBox(page)).toBeVisible();
    await expect(catButton(page)).toHaveCount(0);

    // And the way back still works from there, so the migration lands them
    // somewhere with an exit rather than somewhere quiet.
    await restingBox(page).click();
    await expect(catButton(page)).toBeVisible({ timeout: 15_000 });
  });

  test("the bed is furniture, not a control panel", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "state is viewport-independent; run once");
    await page.goto("/");
    await page.evaluate(() => window.localStorage.setItem("companion", "resting"));
    await page.reload();
    await page.waitForLoadState("networkidle");

    // One control on the cluster, and it wakes them. Nothing else — no second
    // exit, no settings surface growing quietly in the corner.
    await expect(restingBox(page)).toBeVisible();
    await expect(page.locator("[data-companion] button")).toHaveCount(1);
    await expect(page.getByRole("button", { name: /turn the cats off/i })).toHaveCount(0);
  });

  test("never comes to rest on top of readable content", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await companionAwake(page);

    // Park the pointer in the middle of the hero's prose and let them settle.
    // Passing overlap while they walk is fine and deliberate; what must never
    // happen is a cat asleep on a paragraph — so this polls rather than waiting
    // a fixed time, which also keeps it honest about *when* the rule applies.
    const prose = page.locator("#main p").first();
    await prose.scrollIntoViewIfNeeded();
    const box = await prose.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);

    await expect
      .poll(() => restingOnContent(page), {
        timeout: 10_000,
        message: "a cat came to rest on top of content",
      })
      .toEqual([]);
  });

  test("settles where the visitor is reading, without covering it", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "the moods need the desktop layout; run once");
    // Four waits, two of them for the pair to stop moving rather than merely to
    // arrive, and each capped at 25s: the budget is the sum, not the usual case.
    test.setTimeout(120_000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);

    /*
     * The cats read the page's own scrollspy — the same signal the nav's
     * `aria-current` comes from — and answer it by choosing *where to sit*.
     * Nothing here asserts a coordinate: a mood declines outright whenever the
     * ground beside its anchor is not clear, and pinning one to the pixel would
     * fail every time a section is re-laid-out. What is asserted is the two
     * claims a mood is allowed to make — beside the thing you are reading, and
     * never on top of it — and the one it must never make, which is any claim
     * at all to a screen reader.
     */

    // Work: in the margin beside the case study, not in it.
    await readTo(page, "#work article", [300, 500]);
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const current = document.querySelector('#work [aria-current="true"]');
            const href = current?.getAttribute("href") ?? "";
            const study = href.startsWith("#")
              ? document.getElementById(href.slice(1))
              : document.querySelector("#work article");
            if (!study) return "no case study on screen";
            const box = study.getBoundingClientRect();
            const beside = Array.from(
              document.querySelectorAll("[data-companion] svg[data-cat]"),
            ).filter((svg) => {
              const cat = svg.getBoundingClientRect();
              const clearOfIt = cat.right <= box.left || cat.left >= box.right;
              const alongside = cat.bottom > box.top && cat.top < box.bottom;
              return clearOfIt && alongside;
            });
            return beside.length > 0 ? "beside it" : "nowhere near it";
          }),
        { timeout: 25_000, message: "the cats ignored the case study being read" },
      )
      .toBe("beside it");
    await expectRestClearOfContent(
      page,
      "a cat came to rest on the case study it was sent to sit beside",
    );

    // Contact: one of them on the edge of the business card.
    await readTo(page, "#contact aside", [300, 500]);
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const card = document.querySelector("#contact aside")?.getBoundingClientRect();
            if (!card) return "no card on screen";
            const near = Array.from(
              document.querySelectorAll("[data-companion] svg[data-cat]"),
            ).filter((svg) => {
              const cat = svg.getBoundingClientRect();
              const x = cat.left + cat.width / 2;
              const y = cat.top + cat.height / 2;
              return (
                x > card.left - 120 &&
                x < card.right + 120 &&
                y > card.top - 120 &&
                y < card.bottom + 120
              );
            });
            return near.length > 0 ? "at the card" : "nowhere near it";
          }),
        { timeout: 25_000, message: "nobody came to the business card" },
      )
      .toBe("at the card");
    await expectRestClearOfContent(
      page,
      "a cat came to rest on the business card it was sent to perch on",
    );

    // And through all of it the companion says nothing. The cats are
    // decoration; a decoration that narrates where it has just sat down is
    // noise in somebody's ear, so no mood may add a live region or a status.
    await expect(
      page.locator("[data-companion] [aria-live], [data-companion] [role='status']"),
    ).toHaveCount(0);
  });

  test("never leaves a cat off-screen or behind the sticky header", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // The two ways a cat becomes invisible without ever leaving the DOM. The
    // header is `sticky top-0 z-50` over a companion layer at `z-40`, and it is
    // opaque; `overflow-x: clip` on the document means a cat past an edge does
    // not even produce a scrollbar to hint at where it went.
    //
    // Deliberately every svg the companion paints, not just the animals: the
    // corner furniture is line work on the same fixed layer and is subject to
    // exactly the same clamps.
    const hidden = () =>
      page.evaluate(() => {
        const header = document.querySelector("header")?.getBoundingClientRect();
        const width = document.documentElement.clientWidth;
        const height = document.documentElement.clientHeight;
        return Array.from(document.querySelectorAll("[data-companion] svg"))
          .map((svg) => svg.getBoundingClientRect())
          .filter(
            (r) =>
              r.left < 0 ||
              r.top < 0 ||
              r.right > width ||
              r.bottom > height ||
              (header !== undefined && header.bottom > 0 && r.top < header.bottom),
          )
          .map((r) => `${Math.round(r.left)},${Math.round(r.top)}`);
      });

    await companionAwake(page);

    // Walk the pointer up into the chrome and leave it there. Crossing the
    // header while they move is fine; ending up under it is not.
    await page.mouse.move(700, 500);
    await page.mouse.move(700, 70, { steps: 20 });
    await expect
      .poll(hidden, { timeout: 10_000, message: "a cat settled where it cannot be seen" })
      .toEqual([]);

    // And then take the viewport away from underneath them, which is the case
    // that used to strand a cat outside it indefinitely: the targets were
    // invalidated on resize, but the cats' own positions never were.
    await page.setViewportSize({ width: 760, height: 560 });
    await expect
      .poll(hidden, { timeout: 10_000, message: "a resize left a cat outside the viewport" })
      .toEqual([]);
  });

  test("puts itself to bed when left alone, and does not remember doing it", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    // Deliberately real time: the threshold this exercises is the one a visitor
    // hits by looking away, and faking it would test a different feature.
    test.setTimeout(90_000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await companionAwake(page);

    // One move, then nothing. Idle sleep is gated on a pointer having existed,
    // so a page nobody has touched keeps the old corner behaviour.
    await page.mouse.move(600, 400);

    // `[data-cat-bed]` is the whole corner now — the bed, the cardboard box and
    // the sheet of paper — and it is carried by the layer drawn *behind* the
    // animals, so it stays exactly one element. The carton's front panel is a
    // second element with its own hook, because it has to paint over the cat
    // wedged into the box.
    const bed = page.locator("[data-cat-bed]");
    await expect(bed).toBeVisible({ timeout: 40_000 });
    await expect(page.locator("[data-cat-bed-front]")).toHaveCount(1);

    // The furniture is bigger than the bed it replaced, and it is placed rather
    // than probed — so the one thing that has to hold is that all of it is still
    // on the screen.
    expect(
      await page.evaluate(() => {
        const r = document.querySelector("[data-cat-bed]")!.getBoundingClientRect();
        return (
          r.left >= 0 &&
          r.top >= 0 &&
          r.right <= document.documentElement.clientWidth &&
          r.bottom <= document.documentElement.clientHeight
        );
      }),
    ).toBe(true);

    // Both of them end up inside it — in the wrong furniture, which is the joke,
    // but inside it. This is the whole point of the corner: cats that go quiet
    // somewhere expected read as cats, and cats that go quiet in whatever margin
    // they were standing in read as a bug.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const box = document.querySelector("[data-cat-bed]")?.getBoundingClientRect();
            if (!box) return -1;
            return Array.from(
              document.querySelectorAll("[data-companion] svg[data-cat]"),
            ).filter((svg) => {
              const r = svg.getBoundingClientRect();
              return (
                r.left < box.left - 4 ||
                r.right > box.right + 4 ||
                r.top < box.top - 4 ||
                r.bottom > box.bottom + 4
              );
            }).length;
          }),
        { timeout: 30_000, message: "a cat never made it into the bed" },
      )
      .toBe(0);

    // It is a moment, not a preference — the distinction the resting box owns.
    // Nothing is written down, so nothing has to be undone.
    expect(await page.evaluate(() => window.localStorage.getItem("companion"))).toBeNull();

    // Any real sign of life releases them, and the lead cat was a working
    // control the entire time it was asleep.
    await expect(catButton(page)).toBeVisible();
    await page.mouse.move(300, 300, { steps: 12 });
    await page.mouse.move(720, 520, { steps: 12 });
    await expect(bed).toHaveCount(0);

    // And a reload starts them roaming, with no trace of the nap.
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(catButton(page)).toBeVisible();
    await expect(page.locator("[data-cat-bed]")).toHaveCount(0);
  });

  test("stays with a visitor who is reading, and comes back when the page moves", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    // Real time again, and for the same reason as the test above: this is the
    // fourteen-second threshold seen from the other side.
    test.setTimeout(120_000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const bed = page.locator("[data-cat-bed]");

    /*
     * Reading a page is scrolling it with the mouse held still, and that is the
     * shape of the bug this covers: a wheel turned under a stationary pointer
     * fires no pointer event at all, so on a pointer-only idle clock a visitor
     * three paragraphs down reads as absent. The cats walked off to the corner
     * and went to sleep while somebody was plainly there, and no amount of
     * further scrolling brought them back — the pointer handler owned the only
     * way out of the bed, and the pointer never moved.
     *
     * Every other test in this file drives the cats with the mouse, which is
     * exactly why the suite was green while the owner was watching two cats
     * leave the screen for the rest of a visit.
     */
    await companionAwake(page);
    await page.mouse.move(760, 600);
    let lastTickAt = Date.now();
    for (let tick = 0; tick < 20; tick += 1) {
      await page.mouse.wheel(0, 420);
      await page.waitForTimeout(800);
      // Not polled at the end: the claim is that they never go, so it has to
      // hold on every step past the threshold, not just once it has passed.
      //
      // Unless the harness itself stalled. Under full-suite worker load a
      // tick can arrive seconds late, and a long-enough gap in scroll events
      // IS the product's definition of "nobody is here" — the bed engaging
      // then is correct behaviour, not the bug. So a late tick re-establishes
      // presence and skips its assertion instead of failing on the product
      // doing what it should.
      const gap = Date.now() - lastTickAt;
      lastTickAt = Date.now();
      if (gap > 8_000) continue;
      await expect(bed).toHaveCount(0);
    }

    // Now actually leave. The bed is a real behaviour, not a thing to suppress
    // — it just has to mean "nobody is here" rather than "the mouse is still".
    await expect(bed).toBeVisible({ timeout: 40_000 });
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const box = document.querySelector("[data-cat-bed]")?.getBoundingClientRect();
            if (!box) return -1;
            return Array.from(
              document.querySelectorAll("[data-companion] svg[data-cat]"),
            ).filter((svg) => {
              const r = svg.getBoundingClientRect();
              return (
                r.left < box.left - 4 ||
                r.right > box.right + 4 ||
                r.top < box.top - 4 ||
                r.bottom > box.bottom + 4
              );
            }).length;
          }),
        { timeout: 30_000, message: "a cat never made it into the bed" },
      )
      .toBe(0);

    /*
     * Two sleeping cats have no animation frames, and the clamp that keeps a
     * cat inside the viewport only runs inside one. So the moment the viewport
     * changes underneath them is the moment nothing is holding them in it —
     * counted in frames rather than milliseconds, because the failure was a
     * quarter of a second of two cats outside a window that, with
     * `overflow-x: clip` on the document, shows nothing at all where they went.
     */
    await page.evaluate(() => {
      const seen: string[] = [];
      (window as unknown as { __companionOffScreen: string[] }).__companionOffScreen = seen;
      const watch = () => {
        const width = document.documentElement.clientWidth;
        const height = document.documentElement.clientHeight;
        for (const svg of document.querySelectorAll("[data-companion] svg")) {
          const r = svg.getBoundingClientRect();
          if (r.left < -1 || r.top < -1 || r.right > width + 1 || r.bottom > height + 1) {
            seen.push(`${Math.round(r.left)},${Math.round(r.top)} in ${width}x${height}`);
          }
        }
        requestAnimationFrame(watch);
      };
      requestAnimationFrame(watch);
    });

    await page.setViewportSize({ width: 980, height: 700 });
    await page.waitForTimeout(600);

    // And scrolling gets them up, which is the half a visitor actually feels:
    // the page moved, so somebody is here, so the cats are back.
    await page.mouse.wheel(0, 500);
    await expect(bed).toHaveCount(0, { timeout: 3_000 });

    expect(
      await page.evaluate(
        () => (window as unknown as { __companionOffScreen: string[] }).__companionOffScreen,
      ),
    ).toEqual([]);
  });

  test("does not roam when the visitor asks for reduced motion", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: DESKTOP_WIDTH, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const cat = catButton(page);
    const before = await cat.boundingBox();
    await page.mouse.move(300, 300);
    await page.mouse.move(1100, 700);
    await page.waitForTimeout(600);
    const after = await cat.boundingBox();

    expect(before).not.toBeNull();
    expect(after).toEqual(before);
    // Nothing to play with either: props belong to scenes the roaming loop acts
    // out, and there is no roaming loop here.
    await expect(page.locator("[data-cat-toy]")).toHaveCount(0);
    await expect(page.locator("[data-cat-play]")).toHaveCount(0);
    // No idle furniture either: it belongs to the roaming layer, which does not
    // exist here, and a corner full of furniture appearing under a pair of cats
    // that never walked to it would be pure decoration.
    await expect(page.locator("[data-cat-bed]")).toHaveCount(0);
    await expect(page.locator("[data-cat-bed-front]")).toHaveCount(0);
    // Still fully usable — they are parked, not removed.
    await cat.click();
    await expect(cat).toHaveAttribute("aria-expanded", "true");

    // And the play menu is not offered rather than offered and refused: there
    // is no loop here for a scene to run in, so the panel says as much in one
    // sentence and keeps the single action that still means something. A
    // disabled row a keyboard visitor has to tab through to discover would be
    // the worse half of both options.
    for (const scene of SCENES) {
      await expect(toolkit(page).getByRole("button", { name: scene.name })).toHaveCount(0);
    }
    await expect(toolkit(page).getByRole("button")).toHaveCount(1);

    // And the dismissal still works, without any of the escort theatrics: the
    // cats are in the box the moment the action is taken.
    await page.getByRole("button", { name: /send the cats to bed/i }).click();
    await expect(restingBox(page)).toBeVisible();
    await expect(catButton(page)).toHaveCount(0);
    // No third cat anywhere: the police escort is skipped entirely here. Counted
    // as animals rather than as drawings, because the corner they land in is
    // three more drawings on its own.
    await expect(page.locator("[data-companion] svg[data-cat]")).toHaveCount(2);
    // And the whole cluster is still one control with one name, which the
    // reduced-motion path reaches without any of the walking.
    await expect(page.locator("[data-companion] button")).toHaveCount(1);

    // The snore is removed rather than slowed. The global reduced-motion rule
    // collapses animations to 0.01ms, which would park these three glyphs at
    // their last keyframe instead of taking them off the page — so this asserts
    // the companion's own stylesheet, not the global one.
    expect(
      await page.evaluate(() => {
        const el = document.querySelector("[data-cat-snore]");
        return el ? window.getComputedStyle(el).display : "missing";
      }),
    ).toBe("none");

    await context.close();
  });

  test("adds no WCAG violations with its toolkit open", async ({ page }) => {
    test.skip(viewportWidth(page) !== MOBILE_WIDTH, "contrast is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await openToolkit(page);
    await expect(toolkit(page)).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations,
      results.violations.map((violation) => `[${violation.id}] ${violation.help}`).join("\n"),
    ).toEqual([]);
  });

  test("adds no WCAG violations with the cats in their box", async ({ page }) => {
    test.skip(viewportWidth(page) !== MOBILE_WIDTH, "contrast is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => window.localStorage.setItem("companion", "resting"));
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(restingBox(page)).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations,
      results.violations.map((violation) => `[${violation.id}] ${violation.help}`).join("\n"),
    ).toEqual([]);
  });

  test("is not printed", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "print CSS is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.emulateMedia({ media: "print" });
    await expect(catButton(page)).toBeHidden();
  });
});
