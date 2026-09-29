import { test, expect } from "@playwright/test";
import { problemSolvingLoop } from "../src/content/portfolio";
import { workflowStages } from "../src/content/ai-experiments";
import { defaultRunProjectId } from "../src/content/workshop";
import { resolveRun, runnableProjects } from "../src/lib/workshop";

/**
 * `#workshop` — the loop, run against a real project.
 *
 * Two properties are worth a browser rather than a unit test. The first is
 * that the empty stations survive a real render: the resolver keeps them and
 * `WorkshopRun` renders them, but only a page can prove the gap sentence is
 * actually on screen rather than clipped, collapsed or scrolled out of a
 * container. The second is the agent lane, whose panels stay in the DOM while
 * collapsed (see `Disclosure`'s own doc comment) — which is exactly why the
 * stage test below *clicks* each one open instead of asserting its text is
 * already there, a check that would pass on a lane that never opened at all.
 *
 * Every locator that names a filter chip is a regex, never an exact string:
 * `FilterGroup` builds each chip's accessible name from its label *plus* its
 * count, so "DD Feasibility Agent" is a substring of the real name, not the
 * whole of it.
 */

test.describe("#workshop", () => {
  test("renders all nine stations with the default run's evidence", async ({ page }) => {
    await page.goto("/#workshop");
    const section = page.locator("#workshop");
    for (const step of problemSolvingLoop) {
      await expect(section.getByText(step.label, { exact: true })).toBeVisible();
    }
    const run = resolveRun(defaultRunProjectId);
    const observe = run?.stations.find((station) => station.id === "observe");
    expect(observe?.evidence.length ?? 0).toBeGreaterThan(0);
    for (const line of observe?.evidence ?? []) {
      await expect(section.getByText(line, { exact: true })).toBeVisible();
    }
  });

  test("switching the project swaps the evidence and keeps the empty stations", async ({ page }) => {
    await page.goto("/#workshop");
    const section = page.locator("#workshop");
    const other = runnableProjects().find((project) => project.id !== defaultRunProjectId);
    if (!other) throw new Error("there is only one project");

    await section.getByRole("radio", { name: new RegExp(other.title, "i") }).click();

    const run = resolveRun(other.id);
    const gaps = run?.stations.filter((station) => station.gap !== null) ?? [];
    // The whole point of the section: at least one station stays empty, and
    // says so. A run with no gaps would make the rest of this test vacuous.
    expect(gaps.length).toBeGreaterThan(0);
    for (const station of gaps) {
      await expect(section.getByText(station.gap ?? "", { exact: true })).toBeVisible();
      // The step itself is still standing, not dropped along with its
      // evidence — an empty station is a station, not an omission.
      await expect(section.getByText(station.label, { exact: true })).toBeVisible();
    }

    // And the new run's own evidence really did arrive.
    const firstFilled = run?.stations.find((station) => station.evidence.length > 0);
    const line = firstFilled?.evidence[0];
    if (line) await expect(section.getByText(line, { exact: true })).toBeVisible();
  });

  test("every agent stage opens, and carries its failure mode", async ({ page }) => {
    await page.goto("/#workshop");
    const section = page.locator("#workshop");
    for (const stage of workflowStages) {
      await section.getByRole("button", { name: new RegExp(stage.label, "i") }).click();
      await expect(section.getByText(stage.watchFor, { exact: false })).toBeVisible();
    }
  });

  test("the whole section is reachable by keyboard", async ({ page }) => {
    await page.goto("/#workshop");
    const section = page.locator("#workshop");
    const first = section.getByRole("radio").first();
    await first.focus();
    await expect(first).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Tab");
    await expect(section.locator(":focus")).toBeVisible();
  });

  test("no horizontal overflow at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/#workshop");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
