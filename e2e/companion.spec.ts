import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { contactIntents } from "../src/content/portfolio";

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
 * them is cosmetic. Nor are the explorers' two promises — that while you read
 * they cover both halves of the page, and that when you stop they fall asleep
 * and the page goes still — which is why those tests read halves, cells and
 * the `sleep` pose, and never a coordinate.
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

/**
 * Animation frames requested page-wide over one second, against the counter the
 * rest test installs before load. Reads and waits, and drives nothing: a
 * `page.evaluate` is not a sign of life, so a page measured this way is still a
 * page nobody has touched.
 */
async function framesPerSecond(page: Page): Promise<number> {
  const read = () => page.evaluate(() => (window as unknown as { __frames: number }).__frames);
  const before = await read();
  await page.waitForTimeout(1_000);
  return (await read()) - before;
}

/** How long the reader may do nothing before the cats nap — mirrors
 *  `EXPLORE_IDLE_MS` in `src/components/companion/Companion.tsx`, which a
 *  spec cannot import (it is a client component). */
const EXPLORE_IDLE_MS = 20_000;

/** How near the pointer has to come to the lead cat's centre before he
 *  chases it — mirrors `CHASE_RADIUS` in Companion.tsx. */
const CHASE_RADIUS = 200;

/** The column and cell size the explorers are spaced by — mirrors
 *  `EXPLORE_COLUMN` in companion-space.ts, which measures by left edge. */
const COLUMN = 60;

/**
 * Whether both cats are lying in the bottom-right corner, where the furniture
 * cluster sits. The numbers are restated by hand from `CLUSTER_INSET` (24),
 * `CLUSTER_W` (186) and `CLUSTER_H` (60) in
 * `src/components/companion/RestingBox.tsx` — a client component a spec cannot
 * import — so change them together; four pixels of slack. Roaming cats who nap where they stop
 * are not both there; cats who walked to a corner bed would be.
 */
function bothInCorner(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;
    const box = { left: width - 24 - 186, top: height - 24 - 60, right: width - 24, bottom: height - 24 };
    const cats = Array.from(document.querySelectorAll("[data-companion] svg[data-cat]"));
    return (
      cats.length === 2 &&
      cats.every((svg) => {
        const r = svg.getBoundingClientRect();
        return (
          r.left >= box.left - 4 &&
          r.right <= box.right + 4 &&
          r.top >= box.top - 4 &&
          r.bottom <= box.bottom + 4
        );
      })
    );
  });
}

/** Both roaming cats' poses, grey first. The grey cat is the one inside the
 *  toolkit toggle. */
function poses(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const button = document.querySelector('[aria-controls="companion-actions"]');
    const cats = Array.from(document.querySelectorAll("[data-companion] svg[data-cat]"));
    const grey = cats.find((svg) => button?.contains(svg));
    const tabby = cats.find((svg) => !button?.contains(svg));
    return [grey, tabby].map((svg) => svg?.getAttribute("data-cat-pose") ?? "missing");
  });
}

interface CatAt {
  /** Centre, in viewport x — which half of the page it is in. */
  readonly centreX: number;
  readonly centreY: number;
  /** Which 60px column its left edge is in. */
  readonly column: number;
  /** Which 60px cell of the *document* it is in, so riding a scroll is not
   *  counted as going somewhere. */
  readonly cell: string;
  /** Only meaningful when asked for: unmoved across a quarter of a second. */
  readonly still: boolean;
}

/** Where the two roaming cats are, grey first. */
async function catPair(page: Page, { still = false } = {}): Promise<[CatAt, CatAt]> {
  const read = () =>
    page.evaluate(() => {
      const button = document.querySelector('[aria-controls="companion-actions"]');
      const cats = Array.from(document.querySelectorAll("[data-companion] svg[data-cat]"));
      const grey = cats.find((svg) => button?.contains(svg));
      const tabby = cats.find((svg) => !button?.contains(svg));
      if (!grey || !tabby) throw new Error("two roaming cats were not on the page");
      return [grey, tabby].map((svg) => {
        const r = svg.getBoundingClientRect();
        return {
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
          x: window.scrollX,
          y: window.scrollY,
        };
      });
    });
  const before = still ? await read() : null;
  if (still) await page.waitForTimeout(250);
  const after = await read();
  const at = after.map((r, index) => ({
    centreX: r.left + r.width / 2,
    centreY: r.top + r.height / 2,
    column: Math.floor(r.left / COLUMN),
    cell: `${Math.floor((r.left + r.x) / COLUMN)},${Math.floor((r.top + r.y) / COLUMN)}`,
    still:
      before !== null &&
      Math.abs(before[index].left - r.left) < 0.5 &&
      Math.abs(before[index].top - r.top) < 0.5,
  }));
  return [at[0], at[1]];
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
 * Every *standing* cat whose head is over something readable — the band
 * `restingOnContent` never looks at. Its three points are the feet and the
 * belly, all in the bottom half of a 42px drawing, so a cat could stop with
 * its ears and face across a link or a line of prose and pass, and the cats
 * are buttons: a head on a link hides the words and takes the click.
 *
 * The points are `headClear`'s own (companion-space.ts): 6px and 16px down
 * from the drawing's top, at 12px in from either side and at the centre —
 * either side because the head is on whichever side the cat faces. Only cats
 * that held still across a quarter of a second are read, each on its own, so
 * a cat crossing prose on its way somewhere (allowed) is never counted and a
 * cat that has stopped is counted even while its partner is still walking.
 * Each hit is keyed by the cat and its place in the *document*, so one stop
 * sampled twice is one stop. `stops` is every standing cat read, hit or not,
 * at its document position — what a caller counts distinct stops from.
 */
function headsOnContent(
  page: Page,
): Promise<{ standing: number; hits: string[]; stops: Array<{ cat: string; x: number; y: number }> }> {
  return page.evaluate(async () => {
    const button = document.querySelector('[aria-controls="companion-actions"]');
    const cats = () => Array.from(document.querySelectorAll("[data-companion] svg[data-cat]"));
    const boxes = () => cats().map((svg) => svg.getBoundingClientRect());
    const before = boxes();
    const scrolledBefore = window.scrollY;
    await new Promise((resolve) => setTimeout(resolve, 250));
    const after = boxes();
    if (window.scrollY !== scrolledBefore) return { standing: 0, hits: [], stops: [] };
    const readable =
      "p,h1,h2,h3,h4,h5,h6,li,dt,dd,blockquote,pre,code,figure,table,a,button,input,textarea,select,label";
    let standing = 0;
    const stops: Array<{ cat: string; x: number; y: number }> = [];
    const found = cats().flatMap((svg, index) => {
      const rect = after[index];
      const was = before[index];
      if (!rect || !was || Math.abs(rect.left - was.left) >= 0.5 || Math.abs(rect.top - was.top) >= 0.5) {
        return [];
      }
      standing += 1;
      const name = button?.contains(svg) ? "grey" : "tabby";
      stops.push({ cat: name, x: rect.left + window.scrollX, y: rect.top + window.scrollY });
      const points: Array<[number, number]> = [];
      for (const dy of [6, 16]) {
        for (const x of [rect.left + 12, rect.left + rect.width / 2, rect.right - 12]) {
          points.push([x, rect.top + dy]);
        }
      }
      const hits = points.flatMap(([x, y]) =>
        document
          .elementsFromPoint(x, y)
          .filter((el) => !el.closest("[data-companion]"))
          .slice(0, 1)
          .filter((el) => el.closest(readable))
          .map((el) => {
            const what = el.closest(readable)!;
            const text = (what.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 32);
            return `${what.tagName.toLowerCase()} "${text}"`;
          }),
      );
      if (hits.length === 0) return [];
      const at = `${Math.round(rect.left + window.scrollX)},${Math.round(rect.top + window.scrollY)}`;
      return [`${name} at ${at}: head on ${[...new Set(hits)].join(" + ")}`];
    });
    return { standing, hits: found, stops };
  });
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
 * out of the poll rather than being the poll's own predicate. The pair do not
 * stay where they first stop — explorers move on within seconds — so a poll
 * that simply retried the purity check would let a cat that parked squarely on
 * a paragraph wait out its own violation and pass on the tidy rest that
 * followed.
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

function scenePlaying(page: Page): Promise<string | null> {
  return page.evaluate(
    () => document.querySelector("[data-cat-play]")?.getAttribute("data-cat-play") ?? null,
  );
}

/**
 * Install the page clock, load, and leave a requested scene walking to its
 * stage with the clock paused — one that fits somewhere, but not where the cats
 * already stand. The panel calls them to its corner, which is where the request
 * measures "here" from, so each try lets them get there first; inside the
 * Journey's stage that corner sits on content, so they always have to walk.
 */
async function queueARequest(page: Page): Promise<void> {
  await page.clock.install();
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await companionAwake(page);
  await page.evaluate(() => {
    const stage = document.querySelector("#tree");
    if (!stage) throw new Error("no #tree on the page");
    const top = window.scrollY + stage.getBoundingClientRect().top + 300;
    window.scrollTo({ top, behavior: "instant" as ScrollBehavior });
  });
  await page.waitForTimeout(1_000);

  const refused = () =>
    page.evaluate(() =>
      /no room/i.test(document.querySelector("#companion-actions [role='status']")?.textContent ?? ""),
    );
  for (const scene of SCENES) {
    await openToolkit(page);
    await page.waitForTimeout(2_500);
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 20);
    await toolkit(page).getByRole("button", { name: scene.name }).focus();
    await page.keyboard.press("Enter");
    // Accepted (the panel closes) with nothing open yet: walking.
    if ((await scenePlaying(page)) === null && !(await refused())) {
      await expect(catButton(page)).toHaveAttribute("aria-expanded", "false");
      return;
    }
    await page.clock.resume();
  }
  throw new Error("no request had to walk to its stage, so nothing could be abandoned");
}

/**
 * Wait out the idle timer (90–270s, or `PLAY_RETRY` after a refusal) with the
 * pointer as far from the lead as the viewport allows — a reader using the
 * page, not somebody playing with the cat — until an unprompted scene opens.
 * Then bring a moving pointer near the lead: a scene nobody asked for ends on
 * that frame.
 */
async function expectNextUnpromptedSceneUnheld(page: Page): Promise<void> {
  const leadCentre = async () => {
    const box = await catButton(page).boundingBox();
    if (!box) throw new Error("the lead cat has no box");
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  let unprompted: string | null = null;
  for (let jump = 0; jump < 16 && unprompted === null; jump += 1) {
    await page.clock.fastForward(jump === 0 ? 271_000 : 26_000);
    for (let i = 0; i < 6 && unprompted === null; i += 1) {
      const lead = await leadCentre();
      const x = lead.x < DESKTOP_WIDTH / 2 ? DESKTOP_WIDTH - 40 : 40;
      const y = lead.y < 450 ? 860 : 120;
      await page.mouse.move(x, y);
      await page.mouse.move(x + 2, y + 2);
      await page.waitForTimeout(250);
      unprompted = await scenePlaying(page);
    }
  }
  expect(unprompted, "the idle timer never opened a scene").not.toBeNull();

  const lead = await leadCentre();
  for (let i = 0; i < 4; i += 1) {
    await page.mouse.move(lead.x + 60 - i * 6, lead.y + i * 4);
    await page.waitForTimeout(50);
  }
  expect(
    await scenePlaying(page),
    "an unprompted scene was held through the pointer, as if it had been asked for",
  ).toBeNull();
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

    // And Tab walks every item in the order they are drawn, ending on the one
    // below the rule, which puts them away. Plain buttons in a plain group:
    // that is the whole keyboard contract, and the reason the panel does not
    // claim `role="menu"` — the role would promise arrow keys, Home/End and
    // typeahead, none of which exist here.
    const order = [
      /show me around/i,
      ...SCENES.map((scene) => scene.name),
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

    // Round 11's headline offer, first in the list and reachable the same way
    // every other item here is.
    await expect(panel.getByRole("button", { name: /show me around/i })).toHaveCount(1);
    for (const scene of SCENES) {
      await expect(panel.getByRole("button", { name: scene.name })).toHaveCount(1);
    }
    await expect(panel.getByRole("button", { name: /send the cats to bed/i })).toHaveCount(1);
    // There used to be a control for what the pair do when nobody is asking
    // them for a scene — on the cursor, or off wandering. Exploring is what
    // they do now, so it had nothing left to switch, and it must not creep
    // back as a toggle with nothing behind it.
    await expect(
      panel.getByRole("button", { name: /let them wander|follow my cursor/i }),
    ).toHaveCount(0);
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

  /*
   * Two routes abandon a requested scene without ever opening it: its walk to
   * the stage expiring (`STAGE_WALK_MAX` in Companion.tsx, 6s — a tab put in
   * the background mid-walk is the ordinary way to reach it), and the re-probe
   * on arrival declining. Neither goes through `endPlay`, so neither used to
   * clear the "asked for" mark — and the next scene the *idle timer* opened
   * inherited it, and was held through the pointer as if the visitor had
   * chosen it.
   *
   * The idle timer is minutes long, so both tests own the page's clock: it is
   * paused across the request, so the walk cannot finish before the test has
   * seen that there is one, and then jumped forward to wait the timer out.
   */
  test("a request whose walk expires does not hold the next unprompted scene", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    await queueARequest(page);

    // One frame, 7s later: the walk has expired, and the scene never opens.
    await page.clock.fastForward(7_000);
    await page.clock.resume();
    await page.waitForTimeout(1_500);
    expect(await scenePlaying(page), "the expired request opened anyway").toBeNull();

    await expectNextUnpromptedSceneUnheld(page);
  });

  test("a request its stage refuses on arrival does not hold the next unprompted scene", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    await queueARequest(page);

    // Content appears over the whole viewport while they walk, without a scroll
    // or a resize to report it, so the re-probe on arrival declines.
    await page.evaluate(() => {
      const cover = document.createElement("p");
      cover.id = "round-4-cover";
      cover.textContent = "cover";
      Object.assign(cover.style, { position: "fixed", inset: "0", margin: "0", opacity: "0" });
      document.body.append(cover);
    });
    await page.clock.resume();
    // The walk is under two seconds; the expiry is six. Taking the cover away at
    // 3.5s means a pair still walking would open the scene before the expiry
    // could drop it — so no scene at 4.5s is the refusal, not the expiry.
    await page.waitForTimeout(3_500);
    await page.evaluate(() => document.getElementById("round-4-cover")?.remove());
    await page.waitForTimeout(1_000);
    expect(await scenePlaying(page), "the stage did not refuse the scene").toBeNull();

    await expectNextUnpromptedSceneUnheld(page);
  });

  /** One drawing, and how it reads against the section it is currently over. */
  type Drawing = { section: string | null; steady: boolean; ratio: number | null };

  test("stays visible over the section it is crossing", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    // Two themes, each walking the pair to the closing section and waiting
    // for a settled reading there: two polls of up to 30s.
    test.setTimeout(90_000);

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
       * The cats are brought there the way a visitor brings them — by the lead
       * chasing a cursor — not by being left alone, which sends them off
       * exploring wherever their next stop happens to be. A cursor that only
       * circles the section's middle does not do it: the lead chases a moving
       * pointer only within `CHASE_RADIUS` (200px) of him. So the cursor is
       * led: each step reads where he is and puts the pointer 135px from him
       * toward the middle — inside his reach, outside the `LEAD_SPACE` (96px)
       * he keeps from it, so he walks after it and she trails him. Once he is
       * within 100px of the middle, the cursor circles it, small enough to
       * stay inside his reach, so the pair stay there.
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
              const [lead] = await catPair(page);
              const dx = middle.x - lead.centreX;
              const dy = middle.y - lead.centreY;
              const away = Math.hypot(dx, dy);
              if (away > 100) {
                await page.mouse.move(lead.centreX + (dx / away) * 135, lead.centreY + (dy / away) * 135);
              } else {
                const angle = (step += 1) / 5;
                await page.mouse.move(middle.x + Math.cos(angle) * 60, middle.y + Math.sin(angle) * 30);
              }
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

  test("explorers use both halves of the page while the reader is active", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    test.setTimeout(120_000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);

    /*
     * A reader with a hand on the mouse: the pointer moves in small steps the
     * whole time and the page scrolls a little every two seconds — but the
     * pointer is kept well away from both cats (always further than
     * `CHASE_RADIUS` from the lead), which is a reader using the page, not
     * one playing with the cat. A moving mouse anywhere used to be a chase.
     *
     * Read in `#worlds` because it is the one section with no mood: the first
     * stop in a section is that section's perch, and a perch seats the pair
     * side by side on purpose. Sampling starts once they have stopped
     * somewhere with a column each, so what is measured is the explorers and
     * not the walk in.
     */
    const SPOTS = [80, 400, 720, 1040, 1360].flatMap((x) => [180, 450, 820].map((y) => ({ x, y })));
    let pointer = { x: 720, y: 450 };
    const far = (grey: CatAt, tabby: CatAt) =>
      SPOTS.reduce((best, spot) => {
        const reach = (p: { x: number; y: number }) =>
          Math.min(
            Math.hypot(p.x - grey.centreX, p.y - grey.centreY),
            Math.hypot(p.x - tabby.centreX, p.y - tabby.centreY),
          );
        return reach(spot) > reach(best) ? spot : best;
      });
    /** Keep the pointer moving, in small steps, but always far from both. */
    let nudge = 1;
    let closest = Infinity;
    const keepAway = async () => {
      const [grey, tabby] = await catPair(page);
      const fromLead = Math.hypot(pointer.x - grey.centreX, pointer.y - grey.centreY);
      const fromTabby = Math.hypot(pointer.x - tabby.centreX, pointer.y - tabby.centreY);
      closest = Math.min(closest, fromLead);
      if (fromLead < CHASE_RADIUS + 160 || fromTabby < CHASE_RADIUS) pointer = far(grey, tabby);
      else pointer = { x: pointer.x + 3 * nudge, y: pointer.y + 2 * nudge };
      nudge = -nudge;
      await page.mouse.move(pointer.x, pointer.y);
      return [grey, tabby] as const;
    };

    await page.evaluate(() => {
      const worlds = document.querySelector("#worlds");
      if (!worlds) throw new Error("the page has no worlds section");
      const box = worlds.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + box.top + 200, behavior: "instant" as ScrollBehavior });
    });
    await expect
      .poll(
        async () => {
          await keepAway();
          const [grey, tabby] = await catPair(page, { still: true });
          return grey.still && tabby.still && grey.column !== tabby.column;
        },
        { timeout: 30_000, message: "the pair never stopped anywhere after reaching #worlds" },
      )
      .toBe(true);

    let greyLeft = 0;
    let tabbyRight = 0;
    const cells = new Set<string>();
    // The column rule is about where they *stand*: walking cats may cross
    // (the file banner's rule 1). So a sample counts only when both cats held
    // still across a quarter of a second, and how many did is counted — so the
    // check cannot pass on none.
    const shared: string[] = [];
    let bothStill = 0;
    // Every stop a cat stood at with its head over something readable, and
    // every distinct stop a standing cat was looked at — by cat and document
    // position, 4px being the loop's own "arrived" — so the check cannot pass
    // on none, nor on one stop sampled many times.
    const heads = new Set<string>();
    const stopsRead: Array<{ cat: string; x: number; y: number }> = [];
    let direction = 1;
    closest = Infinity;
    for (let tick = 0; tick < 96; tick += 1) {
      // A little scroll every two seconds as well: the pair ride the page, so
      // their place in the document only changes when they walk.
      if (tick % 8 === 0) {
        await page.mouse.wheel(0, 80 * direction);
        direction = -direction;
      }
      await page.waitForTimeout(250);
      const [grey, tabby] = await keepAway();
      if (tick % 2 === 1) {
        // The other half of the ticks look at where the standing cats' heads are.
        const sample = await headsOnContent(page);
        sample.hits.forEach((hit) => heads.add(hit));
        for (const stop of sample.stops) {
          const seen = stopsRead.some(
            (read) => read.cat === stop.cat && Math.hypot(read.x - stop.x, read.y - stop.y) <= 4,
          );
          if (!seen) stopsRead.push(stop);
        }
        continue;
      }
      if (grey.centreX < DESKTOP_WIDTH / 2) greyLeft += 1;
      if (tabby.centreX >= DESKTOP_WIDTH / 2) tabbyRight += 1;
      cells.add(`grey ${grey.cell}`);
      cells.add(`tabby ${tabby.cell}`);
      const [greyAt, tabbyAt] = await catPair(page, { still: true });
      if (greyAt.still && tabbyAt.still) {
        bothStill += 1;
        if (greyAt.column === tabbyAt.column) shared.push(`tick ${tick}: column ${greyAt.column}`);
      }
    }

    // The setup held: the pointer never came within chasing range.
    expect(closest, "the test let the pointer come within chasing range").toBeGreaterThan(CHASE_RADIUS);
    expect(greyLeft, "the grey cat never explored the left half").toBeGreaterThanOrEqual(1);
    expect(tabbyRight, "the tabby never explored the right half").toBeGreaterThanOrEqual(1);
    expect(cells.size, `only ${cells.size} places visited: ${[...cells].join(", ")}`).toBeGreaterThan(3);
    expect(bothStill, "too few samples had both cats standing for the column check to mean anything").toBeGreaterThan(3);
    expect(shared, "the pair stood in one 60px column").toEqual([]);
    expect(
      stopsRead.length,
      `too few distinct stops were looked at for the head check to mean anything: ${JSON.stringify(stopsRead)}`,
    ).toBeGreaterThanOrEqual(3);
    expect([...heads], "an explorer stopped with its head on something readable").toEqual([]);
  });

  test("the lead still chases a pointer that comes near him", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);
    await expect
      .poll(async () => (await catPair(page, { still: true }))[0].still, {
        timeout: 20_000,
        message: "the lead never stood still",
      })
      .toBe(true);

    // About a hundred pixels from him, towards the middle of the page, and
    // then drawn away at a walking pace — never further than the chase's
    // reach, so it is always a pointer he should come after.
    const [start] = await catPair(page);
    const dx = start.centreX < DESKTOP_WIDTH / 2 ? 1 : -1;
    let pointer = { x: start.centreX + dx * 100, y: start.centreY };
    await page.mouse.move(pointer.x, pointer.y);
    let furthest = 0;
    for (let tick = 0; tick < 30; tick += 1) {
      await page.waitForTimeout(100);
      const [grey] = await catPair(page);
      const gap = Math.hypot(pointer.x - grey.centreX, pointer.y - grey.centreY);
      furthest = Math.max(furthest, gap);
      if (gap < 170) pointer = { x: Math.min(1400, Math.max(40, pointer.x + dx * 15)), y: pointer.y };
      await page.mouse.move(pointer.x, pointer.y);
    }
    const [end] = await catPair(page);
    expect(furthest, "the test let the pointer out of chasing range").toBeLessThanOrEqual(CHASE_RADIUS);
    expect((end.centreX - start.centreX) * dx, "the lead did not come after the pointer").toBeGreaterThan(150);
    expect(Math.hypot(pointer.x - end.centreX, pointer.y - end.centreY)).toBeLessThanOrEqual(CHASE_RADIUS);
  });

  test("explorers nap when the reader stops, and the page goes still", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    // Real time: this is the threshold a reader reaches by stopping.
    test.setTimeout(120_000);
    await page.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window);
      let frames = 0;
      window.requestAnimationFrame = (callback) => {
        frames += 1;
        return raf(callback);
      };
      Object.defineProperty(window, "__frames", { get: () => frames });
    });
    // By day: at night the nap comes `NIGHT_SLEEP_TRIM` (3s) sooner, which is
    // flavour this test is not about.
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
    await companionAwake(page);

    // Some activity, then nothing at all.
    for (let i = 0; i < 6; i += 1) {
      await page.mouse.move(400 + i * 12, 420 + i * 6);
      await page.waitForTimeout(150);
    }
    await page.mouse.wheel(0, 120);
    const stoppedAt = Date.now();

    // Not before the threshold: two seconds short of it they are still about.
    await page.waitForTimeout(EXPLORE_IDLE_MS - 2_000);
    expect(await poses(page), "asleep before the reader had been gone 20s").not.toContain("sleep");

    // And after it, both asleep where they stopped — by the time the threshold
    // plus six seconds to finish a walk and lie down have passed — and not in
    // the corner: napping in place is not going to bed.
    await expect
      .poll(() => poses(page), {
        timeout: Math.max(1_000, stoppedAt + EXPLORE_IDLE_MS + 6_000 - Date.now()),
        intervals: [250],
        message: "the cats were not both asleep 26s after the reader stopped",
      })
      .toEqual(["sleep", "sleep"]);
    expect(await bothInCorner(page), "they walked to the corner to sleep").toBe(false);
    // Waited out rather than sampled once: the pose turns to sleep while the
    // last fraction of a pixel of the walk is still easing in.
    await expectRestClearOfContent(page, "asleep on content");
    // And with their heads clear too — which is more than the product promises
    // every nap. A nap is wherever the held stop was (or `settled()` with no
    // plan), and only a stop `planExplore` drew from its half of the page is
    // probed in the head band (`exploreClear`); a perch, a `findClearSpot` or
    // `nearbySpots()` fallback and `settled()` are probed at feet and belly
    // alone. It holds in this setup because, 20s on, the pair have normally
    // left the hero's perch (walk capped at 8s, stay at most 9s) for a
    // half-page stop, and a half-page draw almost never falls back here: at
    // 1440×900 between 39% and 61% of each half of the hero clears the head
    // band as well, against 24 draws. So a failure here may be a nap on a
    // perch or a fallback — this assumption breaking — rather than a
    // half-page stop with its head on content.
    const asleep = await headsOnContent(page);
    expect(asleep.standing, "the sleeping pair were not both still").toBe(2);
    expect(asleep.hits, "asleep with a head on something readable").toEqual([]);

    // Asleep is still: nothing on the page is asking for frames any more.
    await expect
      .poll(() => framesPerSecond(page), {
        timeout: 10_000,
        intervals: [1_000],
        message: "the page never stopped requesting animation frames",
      })
      .toBe(0);

    // Any input wakes them — a three-pixel nudge of the mouse, nowhere near
    // either cat, is enough — and each stretches on the way up.
    const stretched = new Set<string>();
    const noteStretches = (now: string[]) =>
      now.forEach((pose, index) => {
        if (pose === "stretch") stretched.add(index === 0 ? "grey" : "tabby");
      });
    await page.mouse.move(463, 453);
    await expect
      .poll(
        async () => {
          const now = await poses(page);
          noteStretches(now);
          return now.every((pose) => pose !== "sleep");
        },
        { timeout: 2_000, intervals: [50], message: "one small pointer move did not wake them" },
      )
      .toBe(true);
    await expect
      .poll(
        async () => {
          noteStretches(await poses(page));
          return [...stretched].sort();
        },
        { timeout: 1_000, intervals: [50], message: "they woke without a stretch" },
      )
      .toEqual(["grey", "tabby"]);
  });

  test("a layout shift with no scroll still moves resting explorers off the text it brings", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    test.setTimeout(90_000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);

    /*
     * The pair are out exploring from the moment they wake (the presence clock
     * is stamped when the loop starts), so nothing is touched here: no pointer,
     * no key, no scroll. Wait for an arrival — seen walking, then both still,
     * and not in the corner — because a stay is 4 to 9 seconds from the
     * moment they both get there, and everything below has to happen well
     * inside the shortest one. On a build that never re-probes, the cats sit
     * on the inserted text until that stay runs out; caught late in a stay,
     * the stay's own end would move them and hide the bug.
     */
    let sawWalking = false;
    await expect
      .poll(
        async () => {
          const [grey, tabby] = await catPair(page, { still: true });
          if (!grey.still || !tabby.still) {
            sawWalking = true;
            return "walking";
          }
          if (!sawWalking || (await bothInCorner(page))) return "not out exploring yet";
          return "arrived";
        },
        { timeout: 20_000, intervals: [50], message: "the explorers never arrived anywhere" },
      )
      .toBe("arrived");
    expect(await restingOnContent(page, { still: true }), "the stop was not clear to begin with").toEqual(
      [],
    );

    /*
     * Shift the ground under them with no scroll at all. Scroll anchoring is
     * turned off first: left on, the browser would answer content inserted
     * above the viewport's anchor by scrolling to compensate — a scroll event,
     * which reaches the companion's existing scroll path and would let this
     * pass without the path under test ever running. The block goes at the
     * top of `main`, tall enough to reach past both cats, and carries one
     * paragraph under each, so what pushes the page down is also what lands
     * beneath them.
     */
    const shift = await page.evaluate(() => {
      document.documentElement.style.overflowAnchor = "none";
      const counted = window as unknown as { __shiftScrolls: number };
      counted.__shiftScrolls = 0;
      window.addEventListener("scroll", () => (counted.__shiftScrolls += 1), { passive: true });
      const scrolledBefore = window.scrollY;
      const cats = Array.from(document.querySelectorAll("[data-companion] svg[data-cat]")).map((svg) =>
        svg.getBoundingClientRect(),
      );
      const main = document.querySelector("main");
      if (!main) throw new Error("no <main> to shift");
      const block = document.createElement("div");
      block.style.position = "relative";
      main.prepend(block);
      const origin = block.getBoundingClientRect();
      block.style.height = `${Math.max(...cats.map((r) => r.bottom)) + 40 - origin.top}px`;
      for (const r of cats) {
        const p = document.createElement("p");
        p.textContent = "A paragraph the layout brought in under a resting cat. ".repeat(4);
        Object.assign(p.style, {
          position: "absolute",
          margin: "0",
          overflow: "hidden",
          left: `${r.left - 20 - origin.left}px`,
          top: `${r.top - 20 - origin.top}px`,
          width: `${r.width + 40}px`,
          height: `${r.height + 40}px`,
        });
        block.append(p);
      }
      return {
        scrolledBefore,
        height: block.getBoundingClientRect().height,
        stops: cats.map((r) => ({ left: r.left, top: r.top })),
      };
    });
    expect(shift.height, "the inserted block took no room").toBeGreaterThan(0);
    // Not vacuous: before the 250 ms re-probe can have fired, all six probe
    // points — three per cat — are on the paragraph the shift put there.
    expect(await restingOnContent(page), "the shift did not put text under the cats").toHaveLength(6);

    /*
     * Within a second and a half, no cat is still resting on it: each has
     * walked off the stop it was holding. Measured as distance from where it
     * stood when the text arrived, not with `restingOnContent`'s `still`
     * sample — that reports `WALKING` for the last sub-pixel of a cat easing
     * into its stop, and a first draft that accepted `WALKING` as a pass did
     * pass once on a build that never re-probes, with both cats still on the
     * paragraph. Four pixels is the explorers' own "arrived" distance; a
     * re-plan only picks ground its probe finds clear, and the paragraph
     * reaches 20px past the cat on every side, so a cat sent anywhere new
     * moves well past it. The stay this window sits inside is at least four
     * seconds, so on a build that never re-probes neither cat goes anywhere.
     */
    await expect
      .poll(
        () =>
          page.evaluate((stops) => {
            const cats = Array.from(document.querySelectorAll("[data-companion] svg[data-cat]"));
            return cats.flatMap((svg, index) => {
              const r = svg.getBoundingClientRect();
              const from = stops[index];
              return from && Math.hypot(r.left - from.left, r.top - from.top) < 4
                ? [`cat ${index} still at ${Math.round(r.left)},${Math.round(r.top)}`]
                : [];
            });
          }, shift.stops),
        { timeout: 1_500, intervals: [50], message: "a cat stayed on the text the layout put under it" },
      )
      .toEqual([]);

    // And it was not a scroll that did it.
    const after = await page.evaluate(() => ({
      scrolls: (window as unknown as { __shiftScrolls: number }).__shiftScrolls,
      scrollY: window.scrollY,
    }));
    expect(after.scrolls, "the shift fired a scroll event").toBe(0);
    expect(after.scrollY, "the shift moved the page").toBe(shift.scrolledBefore);

    // Where they go instead is clear: the next rest is off the text too.
    await expectRestClearOfContent(page, "re-planned onto content after the shift");
  });

  test("a layout that keeps changing on its own does not keep the cats awake", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    test.setTimeout(120_000);
    await page.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window);
      let frames = 0;
      window.requestAnimationFrame = (callback) => {
        frames += 1;
        return raf(callback);
      };
      Object.defineProperty(window, "__frames", { get: () => frames });
    });
    // By day, as in the nap test above: night trims the threshold.
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
    await companionAwake(page);

    /*
     * A block at the foot of the page that grows and shrinks every second, for
     * the whole test, with nobody touching anything. Each change resizes
     * `body`, which is what the companion's re-probe watches — and the test
     * keeps its own count of those resizes, so "the cats napped through it"
     * cannot pass on a page whose body never actually changed size. At the
     * foot, nothing above it moves, so their stop stays clear and the re-probe
     * has nothing to drop: what is left to see is whether a layout change is
     * being counted as a reader, or waking cats for nothing.
     */
    await page.evaluate(() => {
      const counted = window as unknown as { __bodyResizes: number };
      counted.__bodyResizes = 0;
      new ResizeObserver(() => (counted.__bodyResizes += 1)).observe(document.body);
      const block = document.createElement("div");
      block.style.height = "0px";
      document.body.append(block);
      window.setInterval(() => {
        block.style.height = block.style.height === "0px" ? "240px" : "0px";
      }, 1_000);
    });
    const resizes = () =>
      page.evaluate(() => (window as unknown as { __bodyResizes: number }).__bodyResizes);

    await expect
      .poll(() => poses(page), {
        timeout: EXPLORE_IDLE_MS + 15_000,
        intervals: [500],
        message: "a body that kept resizing kept the cats awake",
      })
      .toEqual(["sleep", "sleep"]);
    await expect
      .poll(() => framesPerSecond(page), {
        timeout: 10_000,
        intervals: [1_000],
        message: "the page never stopped requesting animation frames",
      })
      .toBe(0);

    // And it stays still while the body goes on resizing under them: three
    // more one-second windows, each with a toggle in it, and not one frame.
    const before = await resizes();
    for (let second = 0; second < 3; second += 1) {
      expect(await framesPerSecond(page), "a body resize woke the loop with nothing dropped").toBe(0);
    }
    expect(await resizes(), "the body did not resize while the frames were counted").toBeGreaterThanOrEqual(
      before + 2,
    );
    expect(await poses(page)).toEqual(["sleep", "sleep"]);
  });

  test("a keyboard-only reader still counts as active", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    test.setTimeout(90_000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);

    // No mouse at all: not a move, not a click. Paging down every three
    // seconds is somebody reading, and the cats should be about — not asleep,
    // and not parked in the corner waiting for a cursor that never comes.
    let greyLeft = 0;
    const cells = new Set<string>();
    for (let press = 0; press < 8; press += 1) {
      await page.keyboard.press("PageDown");
      for (let sample = 0; sample < 6; sample += 1) {
        await page.waitForTimeout(500);
        const [grey, tabby] = await catPair(page);
        if (grey.centreX < DESKTOP_WIDTH / 2) greyLeft += 1;
        cells.add(`grey ${grey.cell}`);
        cells.add(`tabby ${tabby.cell}`);
      }
    }

    expect(await poses(page)).not.toContain("sleep");
    expect(cells.size, `only ${cells.size} places visited: ${[...cells].join(", ")}`).toBeGreaterThan(1);
    // The corner is on the right; exploring is what takes the grey cat left.
    expect(greyLeft, "the grey cat never left the right-hand side").toBeGreaterThanOrEqual(1);
  });

  test("a key that never scrolls still counts as activity", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    test.setTimeout(60_000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);

    // Paging down is a key *and* a scroll, so the test above cannot tell which
    // of the two kept the cats up. Here: Tab forward and back between the first
    // two stops on the page, every three seconds, for longer than the nap
    // threshold — no mouse, and the page never moves.
    for (let press = 0; press < 8; press += 1) {
      await page.keyboard.press(press % 2 === 0 ? "Tab" : "Shift+Tab");
      await page.waitForTimeout(3_000);
      expect(await page.evaluate(() => window.scrollY), "the page scrolled").toBe(0);
    }
    expect(await poses(page), "asleep while somebody was typing").not.toContain("sleep");
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

  test("an old stored 'wander' preference wakes as explorers, and is retired", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "state is viewport-independent; run once");

    // `wander` was a mode, remembered under both keys — `companion` while it
    // was on, and `companion-roam` so a trip to the bed came back to it. The
    // explorers made it the default, so a browser still carrying the word has
    // to find the cats out on the page, and lose the word, without a fuss.
    await page.goto("/");
    await page.evaluate(() => {
      window.localStorage.setItem("companion", "wander");
      window.localStorage.setItem("companion-roam", "wander");
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(catButton(page)).toBeVisible();
    await companionAwake(page);
    await expect
      .poll(() =>
        page.evaluate(() => [
          window.localStorage.getItem("companion"),
          window.localStorage.getItem("companion-roam"),
        ]),
      )
      .toEqual([null, null]);
    await openToolkit(page);
    await expect(toolkit(page).getByRole("button", { name: /let them wander|follow my cursor/i })).toHaveCount(0);

    // And the bed is still a pause, not a reset: there and back lands on the
    // page again, with nothing stored for the default.
    await page.getByRole("button", { name: /send the cats to bed/i }).click();
    await expect(restingBox(page)).toBeVisible();
    await restingBox(page).click();
    await expect(catButton(page)).toBeVisible({ timeout: 15_000 });
    expect(await page.evaluate(() => window.localStorage.getItem("companion"))).toBeNull();
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
    // gone — and so is the retired second key, whatever it held — and the menu
    // offers the way back to bed from the mode it actually chose.
    expect(
      await page.evaluate(() => [
        window.localStorage.getItem("companion"),
        window.localStorage.getItem("companion-roam"),
      ]),
    ).toEqual([null, null]);
    await openToolkit(page);
    await expect(toolkit(page).getByRole("button", { name: /send the cats to bed/i })).toHaveCount(1);
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
    // Two waits, one of them for the pair to stop moving rather than merely to
    // arrive, and each capped at 25s: the budget is the sum, not the usual case.
    // (There were four while Work had a mood of its own; round 18 deleted that
    // section and the mood with it.)
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

  test("naps where it stops when left alone, and does not remember doing it", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    // Deliberately real time: the threshold this exercises is the one a visitor
    // hits by looking away, and faking it would test a different feature.
    test.setTimeout(90_000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await companionAwake(page);

    // One move, then nothing — the visitor who arrived, looked, and went back
    // to reading. The page nobody touches at all naps by the same clock; that
    // it also stops costing frames there is the test below.
    await page.mouse.move(600, 400);

    // Both of them asleep, each where it stopped. Not in the corner: the bed
    // is for a visitor who sent them there ("Send the cats to bed"), and a
    // roaming pair that wandered off to it every time the reader looked away
    // spent half the visit walking to the same spot. `bothInCorner` is the
    // check: nothing on the roaming layer draws a bed any more, so there is no
    // bed element to look for.
    await expect
      .poll(() => poses(page), { timeout: 40_000, intervals: [500], message: "the cats never fell asleep" })
      .toEqual(["sleep", "sleep"]);
    expect(await bothInCorner(page), "they walked to the corner to sleep").toBe(false);
    // Asleep somewhere clear — a nap on a paragraph is a cat on a paragraph —
    // and somewhere they can be seen.
    // Waited out rather than sampled once: the pose turns to sleep while the
    // last fraction of a pixel of the walk is still easing in.
    await expectRestClearOfContent(page, "asleep on content");
    expect(
      await page.evaluate(() =>
        Array.from(document.querySelectorAll("[data-companion] svg[data-cat]")).every((svg) => {
          const r = svg.getBoundingClientRect();
          return (
            r.left >= 0 &&
            r.top >= 0 &&
            r.right <= document.documentElement.clientWidth &&
            r.bottom <= document.documentElement.clientHeight
          );
        }),
      ),
    ).toBe(true);

    // It is a moment, not a preference — the distinction the resting box owns.
    // Nothing is written down, so nothing has to be undone.
    expect(await page.evaluate(() => window.localStorage.getItem("companion"))).toBeNull();

    // Any sign of life releases them — no distance to travel first — and the
    // lead cat was a working control the entire time it was asleep.
    await expect(catButton(page)).toBeVisible();
    await page.mouse.move(603, 402);
    await expect
      .poll(() => poses(page), { timeout: 2_000, message: "a small move did not wake them" })
      .not.toContain("sleep");

    // And a reload starts them roaming, with no trace of the nap.
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(catButton(page)).toBeVisible();
    expect(await poses(page), "a reload woke them asleep").not.toContain("sleep");
  });

  test("costs nothing on a page nobody has touched, and wakes on the next scroll", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    // Real time, for the same reason as the test above: this is the threshold a
    // visitor reaches by reading rather than by doing anything.
    test.setTimeout(120_000);

    /*
     * The claim is about cost, so it is measured in animation frames rather
     * than in poses: a page at rest should request none. Counted page-wide
     * rather than per-loop on purpose — "the cats stopped asking" is not the
     * claim, "nothing on this page is asking" is, and a loop that stops while
     * some other one spends the same budget has not bought the visitor
     * anything.
     *
     * The distinguishing case from the test above is the pointer: this visitor
     * never moves one. That used to be the difference between a page that came
     * to rest and a page that ran at 60Hz for as long as it was open, because
     * both the doze and the walk to bed were gated on a pointer having
     * existed. A reader who scrolls, a visitor who tabs through, and a laptop
     * left open on a page all live in exactly that gap.
     */
    await page.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window);
      let frames = 0;
      window.requestAnimationFrame = (callback) => {
        frames += 1;
        return raf(callback);
      };
      Object.defineProperty(window, "__frames", { get: () => frames });
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);

    // Nothing is touched from here until the wheel below — no move, no click,
    // no key. `framesPerSecond` reads a counter and waits; it drives nothing.
    await expect
      .poll(() => framesPerSecond(page), {
        timeout: 60_000,
        intervals: [1_000],
        message: "the page never stopped requesting animation frames",
      })
      .toBe(0);

    // Asleep, not abandoned: both of them in the sleep pose, where they last
    // stopped rather than walked off to a corner bed, and the lead cat still
    // the control it always was. The pose is the point — two cats who go still
    // in whatever margin they were standing in, *awake*, read as a bug,
    // whether or not a pointer was ever involved.
    expect(await poses(page), "the page went still with the cats awake").toEqual(["sleep", "sleep"]);
    expect(await bothInCorner(page), "they walked to the corner to sleep").toBe(false);
    await expect(catButton(page)).toBeVisible();

    // And the page moving is a sign of life, exactly as it is for a visitor who
    // did move a pointer once: frames come back, and so do the cats.
    await page.mouse.wheel(0, 600);
    expect(await framesPerSecond(page)).toBeGreaterThan(0);
    await expect
      .poll(() => poses(page), { timeout: 5_000, message: "a scroll did not wake them" })
      .not.toContain("sleep");

    // Then it settles again, which is what makes this a resting state rather
    // than a one-off.
    await expect
      .poll(() => framesPerSecond(page), {
        timeout: 60_000,
        intervals: [1_000],
        message: "the page never came back to rest after a scroll",
      })
      .toBe(0);
  });

  test("stays with a visitor who is reading, and comes back when the page moves", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    // Real time again, and for the same reason as the test above: this is the
    // twenty-second threshold seen from the other side.
    test.setTimeout(120_000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    /*
     * Reading a page is scrolling it with the mouse held still, and that is the
     * shape of the bug this covers: a wheel turned under a stationary pointer
     * fires no pointer event at all, so on a pointer-only idle clock a visitor
     * three paragraphs down reads as absent. The cats walked off to the corner
     * and went to sleep while somebody was plainly there, and no amount of
     * further scrolling brought them back — the pointer handler owned the only
     * way out of the bed, and the pointer never moved. (They nap where they
     * stop now rather than in a corner bed; the clock is the same question.)
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
      // IS the product's definition of "nobody is here" — the nap engaging
      // then is correct behaviour, not the bug. So a late tick re-establishes
      // presence and skips its assertion instead of failing on the product
      // doing what it should.
      const gap = Date.now() - lastTickAt;
      lastTickAt = Date.now();
      if (gap > 8_000) continue;
      expect(await poses(page), "asleep while somebody was reading").not.toContain("sleep");
    }

    // Now actually leave. The nap is a real behaviour, not a thing to suppress
    // — it just has to mean "nobody is here" rather than "the mouse is still".
    // Where they stop, not in a corner bed.
    await expect
      .poll(() => poses(page), { timeout: 40_000, intervals: [500], message: "the cats never fell asleep" })
      .toEqual(["sleep", "sleep"]);
    expect(await bothInCorner(page), "they walked to the corner to sleep").toBe(false);

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
    await expect
      .poll(() => poses(page), { timeout: 3_000, message: "a scroll did not wake them" })
      .not.toContain("sleep");

    expect(
      await page.evaluate(
        () => (window as unknown as { __companionOffScreen: string[] }).__companionOffScreen,
      ),
    ).toEqual([]);
  });

  test("rides the page during a scroll instead of drifting at scroll speed relative to the text", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);

    /*
     * WP-R round 15: the owner's report from the far side of round 14's own
     * fix — "when I scroll up and down the cat is moving really forward and
     * backward". Round 14 capped how fast a cat *chases* a target; this bug
     * has nothing to do with chasing at all. The cats are `position: fixed`,
     * so a settled one holds its exact viewport pixel while the page moves
     * underneath it — and relative to whatever paragraph it was "standing
     * beside", a cat that has not taken a single step is the one doing the
     * travelling. The fix is that the pair now ride the page: what has to
     * stay constant across a scroll is their position relative to the
     * *document*, not the viewport.
     *
     * `document.body` stands in for "the content" rather than any one piece
     * of it — every element on the page moves by exactly the distance the
     * page scrolled, so the cat's offset from the body's own rect makes the
     * same claim a specific paragraph would, without this test depending on
     * markup another WP-R lane owns concurrently.
     */
    await page.mouse.move(700, 500);
    await page.mouse.move(700, 500);
    // Past SETTLE_AFTER (2.4s): the pair have stopped trailing the pointer
    // and are holding a real resting spot — the case the report is about.
    await page.waitForTimeout(2700);

    const measure = () =>
      page.evaluate(() => {
        const svg = document.querySelector("[data-companion] svg[data-cat]");
        const cat = svg?.closest("[data-companion] > *") as HTMLElement | null;
        if (!cat) return null;
        const c = cat.getBoundingClientRect();
        const b = document.body.getBoundingClientRect();
        const header = document.querySelector("header");
        return {
          top: c.top,
          offset: { x: c.left - b.left, y: c.top - b.top },
          safeTop: header ? header.getBoundingClientRect().bottom : 0,
        };
      });

    const start = await measure();
    expect(start, "no cat found to measure").not.toBeNull();

    /*
     * Round 15's own clamp — a riding cat holds at the viewport edge rather
     * than being carried off it — is real, deliberate behaviour, and a
     * different claim than the one this test makes. Wherever the section
     * mood or the pointer happened to settle the pair vertically, the scroll
     * budget below stays inside the headroom they actually have above the
     * header, so this exercises riding in isolation rather than conflating
     * it with the edge clamp a further scroll would legitimately trigger.
     */
    const headroom = Math.max(40, start!.top - start!.safeTop - 20);
    const total = Math.min(420, headroom);
    const perTick = total / 6;

    const baseline = start!.offset;
    // Scroll hard, continuously, and sample throughout rather than only at
    // the end — the claim under test is that the pair hold their place
    // *during* the scroll, not merely that they land somewhere sensible once
    // it stops. Each gap is well inside both the ride's own settle window
    // and the loop's scroll-quiet debounce, so this is one continuous ride
    // from the loop's point of view, the same as a visitor's own scrolling.
    for (let tick = 0; tick < 6; tick += 1) {
      await page.mouse.wheel(0, perTick);
      await page.waitForTimeout(50);
      const now = await measure();
      expect(now, "no cat found to measure").not.toBeNull();
      const drift = Math.hypot(now!.offset.x - baseline.x, now!.offset.y - baseline.y);
      // The honest contract: not "did not move" (a chase that merely lags
      // still moves), but "moved far less than the total scroll this loop
      // just applied" — the gap between riding the page and sliding across
      // the text at scroll speed.
      expect(drift, `drifted ${drift.toFixed(1)}px from the content mid-scroll`).toBeLessThan(60);
    }

    // And once the page actually stops moving, the pair are still somewhere
    // legal: not stranded off their anchor, not left parked on a paragraph by
    // the walk back to wherever their mode wants them once the ride ends.
    await expectRestClearOfContent(page, "after a hard scroll settles");
  });

  test("keeps the toolkit toggle clear even when a hard scroll rides the pair into a corner", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");

    /*
     * WP-R round 15 follow-up: the ride's own translation is uniform — both
     * cats move by the same amount, so it cannot by itself change the vector
     * between them — but `keepInView` clamps each cat independently, against
     * bounds that know nothing about the other animal, and a hard, deep
     * scroll like the one below can ride the pair far enough from wherever
     * they were (a page-load default is the bottom-right corner) that the
     * walk back afterwards is a real, multi-second one — during which grey
     * and tabby are each walking toward their *own* target independently,
     * and their paths can legitimately cross for a frame or two. That is
     * "crossing while it moves", the same licence every other walk on this
     * layer already has (see the file banner's rule 1) — so what this test
     * holds honestly to two separate claims, on two different clocks: the
     * correction holds *throughout* the ride itself (the frozen window the
     * bug report actually described), and the pair land clear once they
     * have actually stopped moving, not merely once some fixed delay has
     * elapsed. Axe caught the gap live at exactly this deep-scroll shape,
     * top-right and just under the header, after the same jump
     * `axe.spec.ts`'s own "case-study disclosure" test makes to reach
     * `#tree-heading` (it was `#work-heading` until round 18; the Journey now
     * sits where Work did, straight after the globe).
     */
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);

    const measure = () =>
      page.evaluate(() => {
        const button = document.querySelector('[aria-controls="companion-actions"]');
        const cats = Array.from(document.querySelectorAll("[data-companion] svg[data-cat]"));
        if (!button || cats.length < 2) return null;
        // The follower is whichever cat's own drawing is not inside the
        // button — the lead's is, since the toggle *is* the lead cat.
        const follow = cats.find((svg) => !button.contains(svg));
        if (!follow) return null;
        const b = button.getBoundingClientRect();
        const f = follow.getBoundingClientRect();
        const dxOut = Math.max(f.left - b.right, b.left - f.right);
        const dyOut = Math.max(f.top - b.bottom, b.top - f.bottom);
        return { gap: Math.max(dxOut, dyOut), fx: f.x, fy: f.y };
      });

    /*
     * The same single, instant jump `axe.spec.ts` makes to reach the Journey's
     * own heading — large enough, this deep in the page, to clamp both cats
     * toward the top of the viewport in one frame. (Round 18 retargeted this
     * from `#work-heading`: Work is deleted and the Journey occupies the slot
     * right after the globe that Work did, so it is the same jump by position.
     * The distances are not identical and nothing here has re-measured them.)
     * Made from inside the page, centred as `scrollIntoViewIfNeeded` centres,
     * so the clock below starts at the scroll itself.
     *
     * Claim one: the correction holds for as long as the ride itself does,
     * which is `RIDE_SETTLE_MS` (companion-motion.ts, 220ms) after the loop
     * last saw the page move. Sampled on every animation frame from inside the
     * page, because a round trip per sample from here spends most of that
     * window in transit and lands its later samples after the ride has ended
     * and the pair are walking again — where crossing is allowed. The first
     * frame after the jump is skipped: the loop's own callback may run after
     * the sampler's in that frame, so what it would read is the layout from
     * before the loop had seen the scroll. From the second frame on, the loop
     * has ridden and corrected at least once. Only samples taken within 220ms
     * of the scroll are kept, and the loop sees the scroll no earlier than
     * that, so every kept sample is inside the ride. No settle beforehand: the
     * pair are wherever they happen to be, often mid-walk, which is the case
     * the correction is for.
     */
    const RIDE_SETTLE_MS = 220;
    const riding = await page.evaluate(async (settle) => {
      const button = document.querySelector('[aria-controls="companion-actions"]');
      const cats = Array.from(document.querySelectorAll("[data-companion] svg[data-cat]"));
      const follow = cats.find((svg) => !button?.contains(svg));
      const heading = document.querySelector("#tree-heading");
      if (!button || !follow || !heading) return null;
      const samples: Array<{ frame: number; at: number; gap: number }> = [];
      const scrolledAt = performance.now();
      heading.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
      await new Promise<void>((resolve) => {
        let frame = 0;
        const sample = () => {
          frame += 1;
          const at = performance.now() - scrolledAt;
          if (at >= settle) return resolve();
          if (frame > 1) {
            const b = button.getBoundingClientRect();
            const f = follow.getBoundingClientRect();
            const gap = Math.max(
              Math.max(f.left - b.right, b.left - f.right),
              Math.max(f.top - b.bottom, b.top - f.bottom),
            );
            samples.push({ frame, at: Math.round(at), gap });
          }
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      return { scrolled: window.scrollY, samples };
    }, RIDE_SETTLE_MS);
    expect(riding, "no cat pair or no #tree-heading to measure").not.toBeNull();
    expect(riding!.scrolled, "the jump did not scroll the page").toBeGreaterThan(0);
    expect(
      riding!.samples.length,
      `only ${riding!.samples.length} frames sampled inside the ride`,
    ).toBeGreaterThanOrEqual(3);
    for (const [index, { frame, at, gap }] of riding!.samples.entries()) {
      expect(
        gap,
        `sample ${index} (frame ${frame}, ${at}ms after the jump): only ${gap.toFixed(1)}px clear of the toggle while riding`,
      ).toBeGreaterThanOrEqual(24);
    }

    // Claim two: once they have actually stopped — not "once some fixed
    // delay has passed", which is the whole reason the axe test upstream
    // still flakes on this shape of scroll — the gap clears too. Polled the
    // same way `expectRestClearOfContent` waits out a walk: two samples with
    // a pause between, thrown away unless the follower's own drawn position
    // was still (within noise) between them. WCAG 2.5.8's own target-size
    // minimum (24px) is the bar `TOGGLE_CLEARANCE` is built to clear.
    await expect
      .poll(
        async () => {
          const a = await measure();
          if (!a) return "no cats";
          await page.waitForTimeout(250);
          const b = await measure();
          if (!b) return "no cats";
          if (Math.hypot(b.fx - a.fx, b.fy - a.fy) > 1) return "still walking";
          return b.gap >= 24 ? "clear" : `only ${b.gap.toFixed(1)}px clear at rest`;
        },
        { timeout: 20_000, message: "the pair never settled clear of the toggle" },
      )
      .toBe("clear");
  });

  test("the follower never drops under WCAG clearance while the walk back is observed", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");

    /*
     * WP-R round 15's second follow-up ("the follower trails the lead on
     * long walks"): the previous test above proves the ride's own frozen
     * window and the final rest are both clear. What axe kept flaking on
     * (~1-in-8, even with every settle spot vetted) was neither of those —
     * it was the multi-second walk *between* them: grey and tabby used to
     * head for two separately-computed points independently, and two
     * animals each closing on their own target at their own capped speed
     * can cross paths on the way however clear the two endpoints are. Gap
     * measured as low as -36px (real overlap) at the moment axe's own fixed
     * wait happened to land mid-transit.
     *
     * The fix is structural: for as long as the lead is still walking, the
     * follower's target is his *live* position (`trailBehind`,
     * companion-motion.ts), not a fixed point of her own — so there is no
     * second path left to cross. This samples every ~20ms across the
     * entire walk, not just the two endpoints the test above already
     * covers, which is the only way to actually make the claim "never
     * drops under the WCAG minimum" rather than "usually doesn't" — but
     * only if at least one sample actually lands mid-walk; see the
     * `movedSamples` assertion below for why that is checked explicitly
     * rather than assumed.
     */
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);

    // The same single, instant jump the axe test makes to reach the Journey's
    // own heading (`#tree-heading`; `#work-heading` until round 18 deleted
    // Work — see the note on the test above about that retarget).
    //
    // Round 16 note: this used to be a genuinely multi-second walk, because
    // Philosophy sat between Hero and Work and made the jump a deep one.
    // With Philosophy gone the jump is short — about 3600px of page height
    // left with it — and landing on it settles in well under 100ms rather
    // than drifting for seconds. That is not a regression to work around:
    // measured directly, the jump this used to make (page-load to
    // `#work-heading`) stays clear of the 24px minimum throughout. It is NOT
    // true of every jump this page can produce — a jump all the way to `#contact-heading`
    // measured 19.0px, below the floor, on a page anyone can reach from the
    // nav, the tour, or a bare URL fragment. That is a separate, pre-existing
    // defect in `trailBehind` (companion-motion.ts) — recorded as a
    // `test.fixme` right below this test rather than fixed here, because
    // fixing it means changing motion internals, which is out of scope for
    // a content-removal task. Sampling below is tuned to what this smaller,
    // safe jump actually produces; it is not a claim that every jump is
    // safe.
    //
    // Round 16 follow-up: this used to sample from Node, one `page.evaluate`
    // round trip and a 20ms `waitForTimeout` per loop iteration (30-80ms
    // effective under six-worker contention), *after* awaiting
    // `scrollIntoViewIfNeeded` to completion. With the walk itself now
    // settling in well under 100ms, that round trip reliably lost the race:
    // the first sample already landed at rest, `movedSamples` stayed 0, and
    // the "never actually observed the walk" assertion fired on a passing
    // page — which is exactly what happened once in a full matrix run. The
    // sampler now runs *inside* the page: a `requestAnimationFrame` loop is
    // armed first, and the scroll is triggered in the same `page.evaluate`
    // call immediately after, so there is no round trip between "armed" and
    // "walking" and every rendered frame is a candidate sample. The trace is
    // read back once the in-page loop reports it is done.
    await page.evaluate(() => {
      const button = document.querySelector('[aria-controls="companion-actions"]');
      const trace: Array<{ gap: number; fx: number; fy: number; stable: boolean; moved: boolean }> = [];
      (window as unknown as { __companionTrace: typeof trace }).__companionTrace = trace;
      (window as unknown as { __companionTraceDone: boolean }).__companionTraceDone = false;

      function measure() {
        const cats = Array.from(document.querySelectorAll("[data-companion] svg[data-cat]"));
        if (!button || cats.length < 2) return null;
        const follow = cats.find((svg) => !button.contains(svg));
        if (!follow) return null;
        const b = button.getBoundingClientRect();
        const f = follow.getBoundingClientRect();
        const dxOut = Math.max(f.left - b.right, b.left - f.right);
        const dyOut = Math.max(f.top - b.bottom, b.top - f.bottom);
        return { gap: Math.max(dxOut, dyOut), fx: f.x, fy: f.y };
      }

      let previous: { fx: number; fy: number } | null = null;
      let stableStreak = 0;
      const deadline = performance.now() + 15_000;

      function tick() {
        const m = measure();
        if (m) {
          // `previous` is null only if the pre-scroll seed below failed to
          // find a cat pair at all (the pair genuinely was not there yet) —
          // once seeded, every ticked frame has something to compare against,
          // including the very first one, which is what lets that first
          // frame register the ride's single-frame jump as "moved" rather
          // than being exempted from comparison the way an unseeded first
          // sample would be.
          const stable = previous !== null && Math.hypot(m.fx - previous.fx, m.fy - previous.fy) < 0.5;
          const moved = previous !== null && !stable;
          trace.push({ ...m, stable, moved });
          stableStreak = stable ? stableStreak + 1 : 0;
          previous = { fx: m.fx, fy: m.fy };
        }
        if (stableStreak >= 3 || performance.now() > deadline) {
          (window as unknown as { __companionTraceDone: boolean }).__companionTraceDone = true;
          return;
        }
        requestAnimationFrame(tick);
      }

      // Seed `previous` with a reading taken *before* the scroll is
      // triggered, in the same synchronous task — but do not push it into
      // `trace` itself. The ride shift this jump produces (`rideStep`,
      // companion-motion.ts) is a single-frame correction: the browser's own
      // instant, non-smooth `scrollIntoView` reports the fully-scrolled
      // position the very first time the animation loop reads
      // `window.scrollY`, so the whole ride delta lands in one rAF tick
      // rather than being spread across several. Without this pre-scroll
      // baseline to compare the first tick against, that entire shift would
      // happen *between* "armed" and the first sampled frame, so the first
      // trace entry would already show the settled position and the move
      // would go uncounted even though it demonstrably happened — exactly
      // the false "never observed" failure this guard exists to catch, just
      // moved one step earlier.
      //
      // The seed reading itself is deliberately excluded from `trace`: it is
      // the cats' ambient, pre-test position, which this test has no claim
      // about (they are still roaming when the walk-back test starts, and
      // that position can itself sit a couple of pixels either side of 24px
      // — a different, ambient invariant, not the "walk back" one this test
      // asserts). Pushing it would have this
      // test spuriously fail on ambient jitter that has nothing to do with
      // the jump or the walk back from it.
      const initial = measure();
      if (initial) previous = { fx: initial.fx, fy: initial.fy };
      requestAnimationFrame(tick);

      // Triggered from inside the same task the sampler was just armed in —
      // no gap for the walk to start and finish unobserved before Node gets
      // a chance to do anything else.
      document.getElementById("tree-heading")?.scrollIntoView();
    });

    await page.waitForFunction(() => (window as unknown as { __companionTraceDone?: boolean }).__companionTraceDone === true, null, {
      timeout: 20_000,
    });
    const trace = await page.evaluate(
      () => (window as unknown as { __companionTrace: Array<{ gap: number; stable: boolean; moved: boolean }> }).__companionTrace,
    );

    expect(trace.length, "never found a cat pair to measure").toBeGreaterThanOrEqual(3);

    // Checked before the clearance assertions below, on purpose: they are
    // only meaningful if the walk was actually watched happening, not just
    // its two endpoints. Distinct from trace.length: this only counts frames
    // where the follower's own drawn position actually differed from the
    // previous frame — i.e. a frame caught mid-walk, not at rest.
    // trace.length alone is not a reliable proxy for "the walk was actually
    // observed": the loop's own exit condition (`stableStreak >= 3`) is
    // satisfiable by three consecutive *identical* readings, so a walk that
    // is over before the second sampled frame would still produce a trace
    // without ever showing the cat in motion. A regression that let the
    // follower cut through the toggle mid-walk could pass silently if every
    // frame this run happened to catch was already at rest. Requiring at
    // least one moved frame is what keeps this test honest about having
    // watched the walk, not just its two endpoints.
    const movedSamples = trace.filter((t) => t.moved).length;
    expect(
      movedSamples,
      "every sampled frame was already at rest — this run never actually observed the walk, so the clearance assertions below would prove nothing",
    ).toBeGreaterThan(0);

    const lastThree = trace.slice(-3);
    expect(
      lastThree.length === 3 && lastThree.every((t) => t.stable),
      "the pair never actually settled inside the sampling window",
    ).toBe(true);

    const worst = trace.reduce((min, t) => Math.min(min, t.gap), Infinity);
    expect(worst, `only ${worst.toFixed(1)}px clear of the toggle at the worst sampled frame`).toBeGreaterThanOrEqual(24);
  });

  // Recorded, not fixed: `trailBehind` (companion-motion.ts) can let the
  // follower drop below the 24px WCAG target-size clearance during a
  // sufficiently deep single scroll jump, or a compound jump (landing
  // somewhere and immediately re-triggering a second walk before the first
  // settles). Confirmed pre-existing and unrelated to round 16's Philosophy
  // removal: a jump straight to `#contact-heading` measures ~18-19px of
  // clearance (below the 24px floor) on both this branch and unmodified
  // `main`, using the exact same measurement the test above makes. The
  // compound-jump shape measures worse still (down to -45px, real overlap)
  // on this branch; that shape has NOT been cross-checked against `main`, so
  // treat only the single-deep-jump finding as confirmed pre-existing and
  // the compound-jump number as unverified pending someone actually doing
  // that comparison. Fixing `trailBehind`'s clamping for large or
  // back-to-back jumps is out of scope for a content-removal task — this
  // `fixme` exists so the finding survives in the tree rather than only in a
  // task report that gets deleted.
  test.fixme(
    "the follower stays clear of the toggle during a deep single jump to Contact",
    async ({ page }) => {
      test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await companionAwake(page);

      const measure = () =>
        page.evaluate(() => {
          const button = document.querySelector('[aria-controls="companion-actions"]');
          const cats = Array.from(document.querySelectorAll("[data-companion] svg[data-cat]"));
          if (!button || cats.length < 2) return null;
          const follow = cats.find((svg) => !button.contains(svg));
          if (!follow) return null;
          const b = button.getBoundingClientRect();
          const f = follow.getBoundingClientRect();
          const dxOut = Math.max(f.left - b.right, b.left - f.right);
          const dyOut = Math.max(f.top - b.bottom, b.top - f.bottom);
          return { gap: Math.max(dxOut, dyOut), fx: f.x, fy: f.y };
        });

      await page.locator("#contact-heading").scrollIntoViewIfNeeded();

      let previous: { fx: number; fy: number } | null = null;
      let stableStreak = 0;
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline && stableStreak < 3) {
        const m = await measure();
        if (m) {
          expect(
            m.gap,
            `only ${m.gap.toFixed(1)}px clear of the toggle mid-walk`,
          ).toBeGreaterThanOrEqual(24);
          stableStreak =
            previous && Math.hypot(m.fx - previous.fx, m.fy - previous.fy) < 0.5 ? stableStreak + 1 : 0;
          previous = { fx: m.fx, fy: m.fy };
        }
        await page.waitForTimeout(20);
      }
    },
  );

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
    // Nor a bubble, mini-Thien, or his caption: none of the duet's scenes ever
    // play without the roaming loop, so the narrator this round adds never has
    // anything to translate here either — the negative control the spec asks
    // for, direct rather than inferred from "no scene plays".
    await expect(page.locator("[data-cat-bubble]")).toHaveCount(0);
    await expect(page.locator("[data-thien]")).toHaveCount(0);
    await expect(page.locator("[data-cat-caption]")).toHaveCount(0);
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
    // Nor is the tour, which needs the same roaming loop the scenes do — and
    // the panel's one sentence of explanation covers both now.
    await expect(toolkit(page).getByRole("button", { name: /show me around/i })).toHaveCount(0);
    await expect(toolkit(page).getByText(/tour/i)).toBeVisible();
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

  /**
   * The same rule the axe scan below can only catch by luck.
   *
   * Both cats are buttons — the lead carries the toolkit toggle, the tabby
   * carries the storyteller tap — and the panel is anchored to the corner
   * they are both called home to. On a phone that panel is nearly as wide as
   * the window and the corner sits directly beneath it, so for as long as a
   * cat is still walking home it is walking *under the open menu*, with its
   * own target and the menu item’s both cut below the 24px WCAG 2.5.8 asks
   * for. The scan below sees one instant, and mostly sees the walk already
   * finished — it caught this about one run in six. This watches every frame
   * of the walk instead, which is what makes the contract testable at all.
   */
  test("neither cat obscures the open toolkit while walking home to it", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);

    // Put the pair well up the page first: a visitor with a pointer drags them
    // to wherever they are reading, which is the state the toggle is actually
    // pressed from. Straight from the corner there is no walk to catch. The
    // lead only chases a pointer within `CHASE_RADIUS` of him, so the pointer
    // starts beside him and leads him up, never getting further ahead than
    // he will follow.
    const target = { x: Math.round(viewportWidth(page) / 3), y: 220 };
    const lead = async () => (await catPair(page))[0];
    const start = await lead();
    let pointer = { x: start.centreX, y: start.centreY - 60 };
    await page.mouse.move(pointer.x, pointer.y);
    for (let tick = 0; tick < 80; tick += 1) {
      await page.waitForTimeout(50);
      const grey = await lead();
      const gap = Math.hypot(pointer.x - grey.centreX, pointer.y - grey.centreY);
      const left = Math.hypot(target.x - pointer.x, target.y - pointer.y);
      if (gap < 150 && left > 1) {
        const stride = Math.min(12, left);
        pointer = {
          x: pointer.x + ((target.x - pointer.x) / left) * stride,
          y: pointer.y + ((target.y - pointer.y) / left) * stride,
        };
      }
      await page.mouse.move(pointer.x, pointer.y);
    }

    // And they have to have actually gone, or the assertion below would pass
    // by meaning nothing the day something keeps them parked in the corner.
    const strayed = await page.evaluate(() => {
      const cat = document
        .querySelector('[data-companion] button[aria-controls="companion-actions"]')!
        .getBoundingClientRect();
      return window.innerHeight - cat.bottom;
    });
    expect(strayed, "the cats never left the corner, so nothing was tested").toBeGreaterThan(120);

    await openToolkit(page);
    await expect(toolkit(page)).toBeVisible();

    // Sampled on the companion’s own clock rather than on a poll: the lead
    // walks at ~4.4px a frame, so a 100ms poll would step straight over the
    // frames that matter.
    //
    // The toggle is a target too, and the one a visitor presses to close the
    // panel: the tabby must not cover it either. Opening the panel drops both
    // cats onto the corner's row (`keepOutOfPanel`), and a tabby dropped on or
    // to the right of the lead used to walk left through him to her seat —
    // axe caught that at 375px as a `target-size` failure on the toggle. Six
    // seconds rather than the items' two and a half, because that crossing
    // comes at the end of the walk home, once both are on the corner's row.
    const worst = await page.evaluate(
      () =>
        new Promise<{
          overlap: number;
          cat: string;
          item: string;
          toggle: { overlap: number; at: number; frames: number; cat: string };
        }>((resolve) => {
          const panel = document.querySelector("#companion-actions");
          const items = panel ? Array.from(panel.querySelectorAll("button")) : [];
          const toggleButton = document.querySelector('[data-companion] button[aria-controls="companion-actions"]');
          let worstSoFar = { overlap: 0, cat: "none", item: "none" };
          const toggle = { overlap: 0, at: -1, frames: 0, cat: "none" };
          const started = performance.now();
          const sample = () => {
            const elapsed = performance.now() - started;
            const t = toggleButton?.getBoundingClientRect();
            for (const button of Array.from(
              document.querySelectorAll<HTMLElement>("[data-companion] button"),
            )) {
              if (panel?.contains(button)) continue;
              const a = button.getBoundingClientRect();
              if (t && button !== toggleButton && !button.contains(toggleButton)) {
                const covered =
                  Math.max(0, Math.min(a.right, t.right) - Math.max(a.left, t.left)) *
                  Math.max(0, Math.min(a.bottom, t.bottom) - Math.max(a.top, t.top));
                if (covered > 0) toggle.frames += 1;
                if (covered > toggle.overlap) {
                  toggle.overlap = covered;
                  toggle.at = Math.round(elapsed);
                  toggle.cat = (button.getAttribute("aria-label") ?? button.textContent ?? "").trim().slice(0, 40);
                }
              }
              if (elapsed > 2500) continue;
              for (const item of items) {
                const b = item.getBoundingClientRect();
                const overlap =
                  Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
                  Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
                if (overlap > worstSoFar.overlap) {
                  worstSoFar = {
                    overlap,
                    cat: (button.textContent ?? "").trim().slice(0, 40),
                    item: (item.textContent ?? "").trim().slice(0, 40),
                  };
                }
              }
            }
            if (elapsed > 6000) resolve({ ...worstSoFar, toggle });
            else requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        }),
    );

    expect(
      worst.overlap,
      `"${worst.cat}" covered ${worst.overlap.toFixed(0)}px² of "${worst.item}"`,
    ).toBe(0);
    expect(
      worst.toggle.overlap,
      `"${worst.toggle.cat}" covered up to ${worst.toggle.overlap.toFixed(0)}px² of the toggle (worst ${worst.toggle.at}ms after opening, ${worst.toggle.frames} frames)`,
    ).toBe(0);
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

  /* ------------------------------------------------------------- D4/D5: the guided tour -- */

  test("walks all four stops, choosing a route at the fork, and ends back on the cat", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    test.setTimeout(60_000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);
    await openToolkit(page);
    await toolkit(page).getByRole("button", { name: /show me around/i }).click();

    const hud = page.getByLabel(/guided tour/i);
    const status = hud.getByRole("status");

    for (let stop = 1; stop <= 4; stop += 1) {
      await expect(hud.getByText(new RegExp(`stop ${stop} of 4`, "i"))).toBeVisible({
        timeout: 10_000,
      });
      const before = await page.evaluate(() => window.scrollY);
      // The narration is empty while the pair are still walking to the stop,
      // and filled once they arrive — the HUD's own `role="status"` is the
      // wait condition, not a fixed delay. It is `sr-only` since round 10
      // (mini-Thien carries the visible translation now), which does not
      // change what a screen reader announces or what this reads here.
      await expect(status).not.toHaveText("", { timeout: 10_000 });
      if (stop > 1) {
        // Every stop after the first required scrolling to reach — the tour
        // moves the page, not just the cats.
        const after = await page.evaluate(() => window.scrollY);
        expect(after).not.toBe(before);
      }
      if (stop === 1) {
        // The one fork in the walk, after About: the derived middle is just
        // Worlds and Journey now (round 18 removed Work, Skills and the
        // Workshop — see companion-tour.ts's GREY_MIDDLE/stopsFor) — so About
        // is the only stop every route still shares. "Next stop" is gone
        // here, replaced by the two routes — both of which reach every one
        // of the four stops, just in a different order. This run follows
        // Grey's.
        await expect(hud.getByRole("button", { name: /next stop/i })).toHaveCount(0);
        await expect(hud.getByRole("button", { name: /follow grey/i })).toBeVisible();
        await expect(hud.getByRole("button", { name: /follow tabby/i })).toBeVisible();
        await hud.getByRole("button", { name: /follow grey/i }).click();
        continue;
      }
      const isLast = stop === 4;
      await hud.getByRole("button", { name: isLast ? /finish tour/i : /next stop/i }).click();
    }

    // The tour ends itself on the last "Finish tour" press, and focus lands
    // back on the cat — the same place Escape and "End tour" send it.
    await expect(hud).toBeHidden();
    await expect(catButton(page)).toBeFocused();
  });

  test("the other route reaches every stop too, ending on Contact", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    test.setTimeout(60_000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);
    await openToolkit(page);
    await toolkit(page).getByRole("button", { name: /show me around/i }).click();

    const hud = page.getByLabel(/guided tour/i);
    const status = hud.getByRole("status");

    // To the fork — About alone, the derived middle being Worlds and Journey
    // — and pick the cat the other test did not: the curious route, which
    // walks the middle two stops in the opposite order.
    await expect(hud.getByText(/stop 1 of 4/i)).toBeVisible({ timeout: 10_000 });
    await expect(status).not.toHaveText("", { timeout: 10_000 });
    await hud.getByRole("button", { name: /follow tabby/i }).click();

    for (let stop = 2; stop <= 4; stop += 1) {
      await expect(hud.getByText(new RegExp(`stop ${stop} of 4`, "i"))).toBeVisible({
        timeout: 10_000,
      });
      await expect(status).not.toHaveText("", { timeout: 10_000 });
      const isLast = stop === 4;
      if (isLast) {
        // Both routes share the same last stop — Contact — regardless of
        // which way the middle two were walked.
        await expect(hud.getByText(/stop 4 of 4.*contact/i)).toBeVisible();
      }
      await hud.getByRole("button", { name: isLast ? /finish tour/i : /next stop/i }).click();
    }

    await expect(hud).toBeHidden();
    await expect(catButton(page)).toBeFocused();
  });

  test("Escape cancels the tour mid-walk and returns focus to the cat", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);
    await openToolkit(page);
    await toolkit(page).getByRole("button", { name: /show me around/i }).click();

    const hud = page.getByLabel(/guided tour/i);
    await expect(hud).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(hud).toBeHidden();
    await expect(catButton(page)).toBeFocused();
  });

  test("a wheel scroll cancels the tour rather than the tour's own scroll cancelling itself", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);
    await openToolkit(page);
    await toolkit(page).getByRole("button", { name: /show me around/i }).click();

    const hud = page.getByLabel(/guided tour/i);
    await expect(hud).toBeVisible();
    // The tour's own smooth scroll to stop one must not have cancelled it by
    // the time this fires — if it had, the HUD would already be gone here.
    await expect(hud).toBeVisible();

    await page.mouse.wheel(0, 400);
    await expect(hud).toBeHidden({ timeout: 5_000 });
  });

  test("the tour panel item is not offered on /resume, which has no first stop", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    await page.goto("/resume");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);
    await openToolkit(page);
    await toolkit(page).getByRole("button", { name: /show me around/i }).click();
    // Refused, not started: no HUD appears, and the panel's own status line
    // says so in the same voice a "no room" scene refusal does.
    await expect(page.getByLabel(/guided tour/i)).toHaveCount(0);
    await expect(toolkit(page).getByText(/nowhere to start/i)).toBeVisible();
  });

  test("adds no WCAG violations with the tour HUD open", async ({ page }) => {
    test.skip(viewportWidth(page) !== MOBILE_WIDTH, "contrast is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await openToolkit(page);
    await toolkit(page).getByRole("button", { name: /show me around/i }).click();
    await expect(page.getByLabel(/guided tour/i)).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations,
      results.violations.map((violation) => `[${violation.id}] ${violation.help}`).join("\n"),
    ).toEqual([]);
  });

  test("adds no WCAG violations with the tour's route choice visible", async ({ page }) => {
    test.skip(viewportWidth(page) !== MOBILE_WIDTH, "contrast is viewport-independent; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await openToolkit(page);
    await toolkit(page).getByRole("button", { name: /show me around/i }).click();

    const hud = page.getByLabel(/guided tour/i);
    await expect(hud).toBeVisible();
    // Round 16: the fork is offered at the very first stop (About) now that
    // Work has moved into the derived middle (see companion-tour.ts's
    // stopsFor), so no "Next stop" click is needed to reach it — clicking one
    // here would skip past the fork stop rather than land on it.
    await expect(hud.getByRole("button", { name: /follow grey/i })).toBeVisible({ timeout: 10_000 });
    await expect(hud.getByRole("button", { name: /follow tabby/i })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations,
      results.violations.map((violation) => `[${violation.id}] ${violation.help}`).join("\n"),
    ).toEqual([]);
  });

  test("the tour HUD carries both speakers' subtitles", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);
    await openToolkit(page);
    await toolkit(page).getByRole("button", { name: /show me around/i }).click();

    const hud = page.getByLabel(/guided tour/i);
    const status = hud.getByRole("status");
    // Same wait condition "walks all four stops" uses: the status region is
    // the arrival signal, not a fixed delay.
    await expect(status).not.toHaveText("", { timeout: 10_000 });
    // Both voices, not one line quoting whichever cat spoke last — the tour
    // narrates every beat of the stop's scene, grey and tabby both.
    await expect(status).toContainText("Grey:");
    await expect(status).toContainText("Tabby:");
  });

  /* -------------------------------------------------------------------- D5: the duet -- */

  test("the hello duet plays: cats meow only, mini-Thien carries the translation", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    test.setTimeout(45_000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);
    // Settle the pair somewhere with a mood answer rather than leaving them
    // trailing the pointer, which never reads as "settled".
    await page.mouse.move(700, 500);
    await page.waitForTimeout(200);

    // Round 10: cats speak meow only — the bubble carries exactly one line,
    // and it reads as a meow, never as English prose.
    const bubble = page.locator("[data-companion] [data-cat-bubble]").first();
    await expect(bubble).toBeVisible({ timeout: 15_000 });
    await expect(bubble).toHaveAttribute("aria-hidden", "true");
    await expect(bubble.locator("p")).toHaveCount(1);
    const meow = await bubble.locator("p").first().textContent();
    expect(meow).toMatch(/^m[a-z!?.\- ]*$/i);

    // Mini-Thien walks in and carries the caption a bubble used to.
    const thien = page.locator("[data-companion] [data-thien]");
    await expect(thien).toBeVisible({ timeout: 5_000 });
    await expect(thien).toHaveAttribute("aria-hidden", "true");
    const caption = page.locator("[data-companion] [data-cat-caption]");
    await expect(caption).toBeVisible();
    await expect(caption).toHaveAttribute("aria-hidden", "true");
    const sub = await caption.locator("p").first().textContent();
    expect(sub?.length ?? 0).toBeGreaterThan(0);
    // And it is not itself a meow — one consistent rule, cats meow, Thien
    // translates.
    expect(sub).not.toMatch(/^m[a-z!?.\- ]*$/i);

    // Both the bubble and the caption stay inside the viewport whatever edge
    // the cats and Thien chose.
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    for (const el of [bubble, caption]) {
      const box = await el.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
    }
  });

  test("the hello duet stays clear of content at a narrow viewport too", async ({ page }) => {
    test.skip(viewportWidth(page) !== MOBILE_WIDTH, "narrow-viewport specific; run once");
    await page.setViewportSize({ width: MOBILE_WIDTH, height: 812 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Touch viewports have no roaming loop and therefore no duet bubble, no
    // narrator and no caption at all — the pair are parked in the corner
    // button. This asserts the honest absence rather than a false positive,
    // and doubles as the negative control the narrator needs: it never
    // appears where there is no roaming loop to walk it in.
    await expect(page.locator("[data-companion] [data-cat-bubble]")).toHaveCount(0);
    await expect(page.locator("[data-companion] [data-thien]")).toHaveCount(0);
    await expect(page.locator("[data-companion] [data-cat-caption]")).toHaveCount(0);
  });

  test("bubbles and Thien's caption paint above the cats, and register as occupied ground", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    test.setTimeout(45_000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);
    await page.mouse.move(700, 500);
    await page.waitForTimeout(200);

    const bubble = page.locator("[data-companion] [data-cat-bubble]").first();
    const caption = page.locator("[data-companion] [data-cat-caption]");
    await expect(bubble).toBeVisible({ timeout: 15_000 });
    await expect(caption).toBeVisible();

    // The collision fix's first half: painted after both cats in source
    // order, which — with no explicit `z-index` on this layer — is what
    // makes them paint on top rather than under a cat crossing them.
    const paintedAfterBothCats = await page.evaluate(() => {
      const layer = document.querySelector("[data-companion]");
      const cats = Array.from(layer?.querySelectorAll("svg[data-cat]") ?? []);
      const overlays = Array.from(
        layer?.querySelectorAll("[data-cat-bubble], [data-cat-caption]") ?? [],
      );
      if (cats.length === 0 || overlays.length === 0) return false;
      return overlays.every((overlay) =>
        cats.every((cat) => {
          const relation = cat.compareDocumentPosition(overlay);
          // DOCUMENT_POSITION_FOLLOWING (4): the overlay comes after this cat.
          return (relation & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
        }),
      );
    });
    expect(paintedAfterBothCats).toBe(true);

    // The collision fix's second half: with the scene still running, poll
    // for a moment and confirm neither cat's own drawn box ever overlaps the
    // bubble's or the caption's — the placement probe now treats both as
    // occupied ground (`setReservedRects` in companion-space.ts), so neither
    // animal should settle on or cross onto resting there.
    const overlapsOverlay = () =>
      page.evaluate(() => {
        const rectsOf = (selector: string) =>
          Array.from(document.querySelectorAll(selector)).map((el) => el.getBoundingClientRect());
        const cats = rectsOf("[data-companion] svg[data-cat]");
        const overlays = rectsOf("[data-companion] [data-cat-bubble], [data-companion] [data-cat-caption]");
        const intersects = (a: DOMRect, b: DOMRect) =>
          a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        return cats.some((cat) => overlays.some((overlay) => intersects(cat, overlay)));
      });
    for (let sample = 0; sample < 10; sample += 1) {
      expect(await overlapsOverlay(), `sample ${sample}`).toBe(false);
      await page.waitForTimeout(200);
    }
  });

  test("clicking the tabby advances the duet a beat", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    test.setTimeout(45_000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);
    // Settle the pair exactly as "the hello duet plays" does: by the time the
    // bubble shows, the settle threshold has long passed and the tabby is not
    // walking, so a plain click is safe here — see "Driving the cats" above.
    await page.mouse.move(700, 500);
    await page.waitForTimeout(200);

    const bubble = page.locator("[data-cat-bubble]");
    const caption = page.locator("[data-cat-caption]");
    await expect(bubble).toBeVisible({ timeout: 15_000 });
    const meowBefore = await bubble.locator("p").first().textContent();
    const subBefore = await caption.locator("p").first().textContent();

    await page.getByRole("button", { name: "Next line" }).click();
    // Both halves of the beat change together — the meow the cat "says" and
    // the caption Thien translates it into.
    await expect(bubble.locator("p").first()).not.toHaveText(meowBefore ?? "");
    await expect(caption.locator("p").first()).not.toHaveText(subBefore ?? "");
  });

  /**
   * Start a scene by tapping the tabby — the only way to get one without
   * waiting out the cadence clock — at `#tree`, whose ambient scene opens on
   * her hopping (pinned in tests/lib/companion-dialogue.test.ts). Taps only
   * while no bubble is showing: a tap on a running scene advances it, so the
   * hello, if its fixed clock beats us to it, is left to finish rather than
   * skipped through.
   */
  async function startTreeScene(page: Page, until: () => Promise<boolean>, message: string) {
    await readTo(page, "#tree", [300, 500]);
    const bubble = page.locator("[data-companion] [data-cat-bubble]");
    const tabby = page.getByRole("button", { name: /Ask the cats about this section|Next line/i });
    await expect
      .poll(
        async () => {
          if (await until()) return true;
          if ((await bubble.count()) === 0) await tabby.click({ force: true, timeout: 5_000 }).catch(() => {});
          return until();
        },
        { timeout: 45_000, intervals: [250], message },
      )
      .toBe(true);
  }

  test("the meow bubble draws the beat's icon beside the meow, outside its one paragraph", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    test.setTimeout(60_000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);

    const bubble = page.locator("[data-companion] [data-cat-bubble]");
    // Every beat this can land on — the hello, the tree's scene or its
    // encore — carries an icon (pinned in tests/lib/companion-dialogue.test.ts),
    // so whichever is showing has one to draw.
    await startTreeScene(page, async () => (await bubble.count()) > 0, "no scene ever started");

    await expect(bubble).toHaveAttribute("aria-hidden", "true");
    await expect(bubble.locator("svg")).toHaveCount(1);
    await expect(bubble.locator('svg[aria-hidden="true"]')).toHaveCount(1);
    // The picture sits beside the paragraph, never inside it: the bubble's
    // one `<p>` still holds the meow and nothing else.
    await expect(bubble.locator("p")).toHaveCount(1);
    await expect(bubble.locator("p svg")).toHaveCount(0);
    expect(await bubble.locator("p").textContent()).toMatch(/^m[a-z!?.\- ]*$/i);
    // Ink, not a hue: the icon strokes in the bubble's own text colour.
    const ink = await bubble.evaluate((node) => {
      const svg = node.querySelector("svg")!;
      return {
        stroke: svg.getAttribute("stroke"),
        icon: getComputedStyle(svg).color,
        bubble: getComputedStyle(node).color,
      };
    });
    expect(ink.stroke).toBe("currentColor");
    expect(ink.icon).toBe(ink.bubble);
  });

  test("the speaking cat hops for a hop beat, and stops when the beat ends", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    test.setTimeout(90_000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);

    const hop = page.locator("[data-companion] svg[data-cat-hop]");
    await startTreeScene(page, async () => (await hop.count()) > 0, "no cat ever hopped");

    // Exactly one cat hops, it is the one speaking, and the stylesheet is
    // really bouncing it — not just carrying an attribute nothing reads.
    await expect(hop).toHaveCount(1);
    const seen = await page.evaluate(() => {
      const svg = document.querySelector("[data-companion] svg[data-cat-hop]")!;
      const control = svg.closest("button");
      const label = control?.textContent ?? "";
      const bubbleNode = document.querySelector("[data-companion] [data-cat-bubble]");
      return {
        hopper: /quick actions/i.test(label) ? "grey" : /next line|ask the cats/i.test(label) ? "tabby" : null,
        speaker: bubbleNode?.getAttribute("data-cat-bubble") ?? null,
        meow: bubbleNode?.querySelector("p")?.textContent ?? null,
        animation: getComputedStyle(svg).animationName,
      };
    });
    expect(seen.speaker, "a cat hopped with no line showing").not.toBeNull();
    expect(seen.hopper).toBe(seen.speaker);
    expect(seen.animation).toBe("cat-hop");

    // The beat ends on its own reading-time clock (at most `BEAT_MAX_MS`,
    // 5s), and the hop ends with it — within a commit or two, far inside the
    // shortest beat there is, not whenever something else next re-renders.
    // Read straight off the DOM: a locator would wait for a bubble that the
    // end of a scene has legitimately taken away.
    const beatKey = () =>
      page.evaluate(() => {
        const node = document.querySelector("[data-companion] [data-cat-bubble]");
        return `${node?.getAttribute("data-cat-bubble") ?? null}|${node?.querySelector("p")?.textContent ?? null}`;
      });
    const hopBeat = `${seen.speaker}|${seen.meow}`;
    await expect
      .poll(beatKey, { timeout: 8_000, intervals: [50], message: "the hop beat never ended" })
      .not.toBe(hopBeat);
    await expect(hop).toHaveCount(0, { timeout: 500 });
    // And stays gone for as long as whatever followed it lasts (sampled for a
    // second): no beat that follows a hop beat in the hello, the tree's scene
    // or its encore carries an act. If that next beat ends inside the second
    // the sampling stops there, since whatever plays after it is a new claim.
    const after = await beatKey();
    for (let sample = 0; sample < 5; sample += 1) {
      await page.waitForTimeout(200);
      if ((await beatKey()) !== after) break;
      expect(await hop.count(), `sample ${sample}`).toBe(0);
    }
  });

  test("scrolling to another section ends an ambient scene mid-beat", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    test.setTimeout(45_000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);

    // Park the pair at #tree the same way "settles where the visitor is
    // reading" does, then start that section's scene by asking for it rather
    // than waiting out the 75s±60s cadence clock — the tabby starts it the
    // moment she is tapped, quiet or not. `force` plus a retrying poll is the
    // same idiom `clickOpenToolkit` uses for a target the loop keeps moving.
    await readTo(page, "#tree", [300, 500]);
    const bubble = page.locator("[data-cat-bubble]");
    const tabby = page.getByRole("button", {
      name: /Ask the cats about this section|Next line/i,
    });
    await expect
      .poll(
        async () => {
          if ((await bubble.count()) > 0) return true;
          await tabby.click({ force: true, timeout: 5_000 }).catch(() => {});
          return (await bubble.count()) > 0;
        },
        { timeout: 15_000, message: "clicking the tabby never started the tree scene" },
      )
      .toBe(true);

    // Moving to another section is a stronger claim on the cats than a
    // beat's own reading-time clock: the scene the visitor was mid-way
    // through at #tree is about that section, not about #contact.
    await readTo(page, "#contact aside", [300, 500]);
    await expect(bubble).toBeHidden({ timeout: 10_000 });
    // Thien and his caption leave with the scene, not after it.
    await expect(page.locator("[data-thien]")).toHaveCount(0);
    await expect(page.locator("[data-cat-caption]")).toHaveCount(0);
  });

  /* --------------------------------------------------------- origin story: narration -- */

  test("narrates the origin story with a meow bubble and mini-Thien's caption while the cats roam", async ({
    page,
  }) => {
    test.skip(
      viewportWidth(page) !== DESKTOP_WIDTH,
      "the origin-story button only mounts at >=1024px; run once",
    );
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);

    const button = page.locator("#tree").getByRole("button", { name: "Watch how it grew" });
    // Round 18's second plan put this control on the *finished* tree: while the
    // pin is in force and the acts are still running, the stylesheet hides it so
    // it cannot compete with the scrubber. "Show me the whole tree" is the end
    // state. The locator above is unchanged; only the route to it is new.
    await page.locator("#tree").getByRole("button", { name: "Show me the whole tree" }).click();
    await button.click();
    await expect(page.locator("[data-origin-stage]")).toBeVisible();

    // `Companion.tsx`'s "start" handler answers `origin-story-ack`
    // synchronously and narrates the flight beat straight away, so a bubble
    // should appear well inside the flight beat's own 3s run.
    const bubble = page.locator("[data-cat-bubble]");
    await expect(bubble).toBeVisible({ timeout: 5_000 });
    await expect(bubble).toHaveAttribute("aria-hidden", "true");
    // One consistent rule applies to origin-story beats too: the cat meows,
    // mini-Thien translates.
    const thien = page.locator("[data-thien]");
    await expect(thien).toBeVisible({ timeout: 5_000 });
    const caption = page.locator("[data-cat-caption]");
    await expect(caption).toBeVisible();
    await expect(caption).toHaveAttribute("aria-hidden", "true");
  });

  /* ----------------------------------------------------------------- D2: nav intent -- */

  test("marks nav-link intent on hover dwell, and clears it on leaving the nav", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);

    const link = page.locator('header nav a[href$="#tree"]').first();
    await link.hover();
    await expect(page.locator("[data-companion][data-cat-intent='tree']")).toHaveCount(1, {
      timeout: 2_000,
    });

    await page.mouse.move(700, 700);
    await expect(page.locator("[data-companion][data-cat-intent]")).toHaveCount(0);
  });

  /* --------------------------------------------------------------------- D3: cheer -- */

  test("cheers briefly on a theme toggle", async ({ page }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);

    await page.getByRole("button", { name: /theme|day|night/i }).first().click();
    await expect(page.locator("[data-companion][data-cat-cheer='true']")).toHaveCount(1, {
      timeout: 2_000,
    });
    await expect(page.locator("[data-companion][data-cat-cheer]")).toHaveCount(0, {
      timeout: 3_000,
    });
  });

  /* --------------------------------------------------------- WP-E: the secret intent -- */

  test("creeps toward the form while data-cat-secret stands, and lets go once it clears", async ({
    page,
  }) => {
    test.skip(viewportWidth(page) !== DESKTOP_WIDTH, "roaming needs the desktop layout; run once");
    test.setTimeout(45_000);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await companionAwake(page);

    const secret = contactIntents.find((intent) => intent.id === "secret");
    if (!secret) throw new Error("The secret intent left the content layer — update this spec with it.");

    const contact = page.locator("#contact");
    await contact.scrollIntoViewIfNeeded();
    // #contact holds two forms — QuickConnect's one-field form above the
    // full one — so this has to be anchored on the full form specifically,
    // the same way e2e/contact.spec.ts's own data-cat-secret test does, or
    // Playwright's strict mode fails with "resolved to 2 elements".
    const form = contact.locator("form", { has: page.locator("#contact-name") });

    // WP-E declares the attribute; this is the companion's own half of the
    // contract — the same declarative shape `data-cat-nap` already uses (see
    // `SECRET_ATTR` in Companion.tsx), asserted here rather than in
    // contact.spec.ts, which only proves the attribute itself appears and
    // clears.
    await contact.getByRole("radio", { name: secret.label }).check();
    await expect(form).toHaveAttribute("data-cat-secret", "");

    // The pair creep toward it — polled the same way "settles where the
    // visitor is reading" polls an arrival, as the distance from the lead
    // cat's own centre to the nearest point on the form's box.
    await expect
      .poll(
        async () => {
          const catBox = await catButton(page).boundingBox();
          const formBox = await form.boundingBox();
          if (!catBox || !formBox) return Number.POSITIVE_INFINITY;
          const centre = { x: catBox.x + catBox.width / 2, y: catBox.y + catBox.height / 2 };
          const nearest = {
            x: Math.max(formBox.x, Math.min(centre.x, formBox.x + formBox.width)),
            y: Math.max(formBox.y, Math.min(centre.y, formBox.y + formBox.height)),
          };
          return Math.hypot(centre.x - nearest.x, centre.y - nearest.y);
        },
        { timeout: 15_000, message: "the cats never crept toward the secret form" },
      )
      .toBeLessThan(250);

    // Switching away from the secret intent lowers the attribute — and the
    // companion's own side lets go: nothing keeps the pair glued to the form
    // once it is gone, so a pointer move elsewhere carries them off again.
    const held = await catButton(page).boundingBox();
    await contact.getByRole("radio", { name: contactIntents[0].label }).check();
    await expect(form).not.toHaveAttribute("data-cat-secret");
    await page.mouse.move(200, 200);
    await page.mouse.move(900, 250);
    await expect
      .poll(
        async () => {
          const box = await catButton(page).boundingBox();
          if (!box || !held) return 0;
          return Math.hypot(box.x - held.x, box.y - held.y);
        },
        { timeout: 10_000, message: "the cats stayed put after data-cat-secret cleared" },
      )
      .toBeGreaterThan(40);
  });

  test("reduced motion skips the secret theatrics entirely", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: DESKTOP_WIDTH, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const secret = contactIntents.find((intent) => intent.id === "secret");
    if (!secret) throw new Error("The secret intent left the content layer — update this spec with it.");

    const contact = page.locator("#contact");
    await contact.scrollIntoViewIfNeeded();
    // #contact holds two forms — QuickConnect's one-field form above the
    // full one — so this has to be anchored on the full form specifically,
    // the same way e2e/contact.spec.ts's own data-cat-secret test does, or
    // Playwright's strict mode fails with "resolved to 2 elements".
    const form = contact.locator("form", { has: page.locator("#contact-name") });
    await contact.getByRole("radio", { name: secret.label }).check();
    await expect(form).toHaveAttribute("data-cat-secret", "");

    // The attribute stands, exactly as it does with motion allowed — but
    // there is no roaming loop here to react to it, so the cat button never
    // moves: the same "does not roam" contract this file already asserts for
    // every other reaction, now proved for this one too.
    const cat = catButton(page);
    const before = await cat.boundingBox();
    await page.waitForTimeout(600);
    const after = await cat.boundingBox();
    expect(before).not.toBeNull();
    expect(after).toEqual(before);

    await context.close();
  });
});
