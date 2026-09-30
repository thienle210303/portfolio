import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WorkshopRun from "@/sections/Workshop/WorkshopRun";
import { defaultRunProjectId } from "@/content/workshop";
import { resolveRun, runnableProjects } from "@/lib/workshop";
import { problemSolvingLoop, projects } from "@/content/portfolio";

/**
 * The run is the section's argument, so these tests are about the argument
 * rather than about the markup: nine stations always, the chosen project's
 * own fields quoted into them, and the stations that project cannot fill left
 * standing with the missing field named. A rendering layer that hid an empty
 * station would pass a "does it render" test and fail every one of these.
 */

const RUNS = runnableProjects().map((project) => {
  const run = resolveRun(project.id);
  if (!run) throw new Error(`${project.id} did not resolve`);
  return run;
});

function renderRun() {
  return render(<WorkshopRun runs={RUNS} defaultProjectId={defaultRunProjectId} />);
}

describe("WorkshopRun", () => {
  it("renders all nine stations, labelled and numbered", () => {
    renderRun();
    for (const step of problemSolvingLoop) {
      expect(screen.getByText(step.label)).toBeInTheDocument();
      expect(screen.getByText(step.detail)).toBeInTheDocument();
    }
  });

  it("quotes the default project's own fields", () => {
    renderRun();
    const project = projects.find((candidate) => candidate.id === defaultRunProjectId);
    if (!project) throw new Error("the default project left the content layer");
    expect(screen.getByText(project.problem)).toBeInTheDocument();
  });

  it("switches the run and swaps every station's evidence", async () => {
    const user = userEvent.setup();
    renderRun();
    const other = RUNS.find((run) => run.projectId !== defaultRunProjectId);
    if (!other) throw new Error("there is only one project");

    // A chip's accessible name is its label plus its count, so match loosely.
    await user.click(screen.getByRole("radio", { name: new RegExp(other.title, "i") }));

    const observe = other.stations.find((station) => station.id === "observe");
    for (const line of observe?.evidence ?? []) {
      expect(screen.getByText(line)).toBeInTheDocument();
    }
  });

  it("keeps an empty station and says which field is missing", async () => {
    const user = userEvent.setup();
    renderRun();
    const withGap = RUNS.find((run) => run.stations.some((station) => station.gap !== null));
    if (!withGap) throw new Error("no project has a gap — the fixture has changed");

    await user.click(screen.getByRole("radio", { name: new RegExp(withGap.title, "i") }));

    const gaps = withGap.stations.filter((station) => station.gap !== null);
    for (const station of gaps) {
      expect(screen.getByText(station.label)).toBeInTheDocument();
      expect(screen.getByText(station.gap ?? "")).toBeInTheDocument();
    }
  });

  it("links to the case study rather than retelling it", () => {
    renderRun();
    const run = RUNS.find((candidate) => candidate.projectId === defaultRunProjectId);
    expect(screen.getByRole("link", { name: /the whole case study/i })).toHaveAttribute(
      "href",
      run?.href,
    );
  });

  it("keeps the switcher keyboard-reachable even when the default project does not resolve", () => {
    // The defect this pins was invisible to every other case here, and to the
    // e2e: `?? runs[0]` falls the *render* back when an id does not resolve,
    // but the raw state would still hold the unresolvable id. `FilterGroup`
    // would then match no option, leave every chip `aria-checked={false}`, and
    // — because it owns a single tab stop for the radiogroup
    // (`tabIndex={checked ? 0 : -1}`) — take the whole project switcher out of
    // the tab order with nothing visibly wrong. An e2e's `.focus()` forces
    // focus regardless of tabindex, so it cannot see this either.
    render(<WorkshopRun runs={RUNS} defaultProjectId="a-project-that-left-the-content-layer" />);

    const chips = screen.getAllByRole("radio");
    const checked = chips.filter((chip) => chip.getAttribute("aria-checked") === "true");
    expect(checked, "no chip is checked, so the radiogroup has no tab stop").toHaveLength(1);
    expect(checked[0]).toHaveAttribute("tabindex", "0");
    // And the checked chip is the run actually on screen, not merely *a* chip.
    const shown = RUNS[0];
    if (!shown) throw new Error("there are no runs");
    expect(checked[0]).toHaveAccessibleName(new RegExp(shown.title, "i"));
    expect(screen.getByText(shown.stations[0]?.evidence[0] ?? "")).toBeInTheDocument();
  });

  it("counts on each chip how many of the nine stations that project fills", () => {
    renderRun();
    // The count is the one number that makes switching worth doing, so it is
    // asserted as a real figure rather than as "a chip exists": a chip whose
    // count drifted from its run would still satisfy a name-only locator.
    for (const run of RUNS) {
      const chip = screen.getByRole("radio", { name: new RegExp(run.title, "i") });
      expect(chip).toHaveAccessibleName(new RegExp(`${run.authoredStations}`));
    }
  });

  it("names the field behind every station, filled or empty", async () => {
    const user = userEvent.setup();
    renderRun();
    // A run with both kinds of station, so one assertion covers both halves
    // of the rule rather than only whichever the default happens to show.
    const mixed = RUNS.find(
      (candidate) =>
        candidate.stations.some((station) => station.gap !== null) &&
        candidate.stations.some((station) => station.evidence.length > 0),
    );
    if (!mixed) throw new Error("no run has both a filled and an empty station");

    await user.click(screen.getByRole("radio", { name: new RegExp(mixed.title, "i") }));

    for (const station of mixed.stations) {
      if (station.evidence.length > 0) {
        // Provenance is per-station, not per-section: the intro claims only
        // that the *evidence* is quoted, so each station that quoted
        // something has to say which field it came out of.
        expect(
          screen.getAllByText(
            new RegExp(`projects\\.${mixed.projectId}\\s·\\s${station.field}`),
          ).length,
        ).toBeGreaterThan(0);
      } else {
        // An empty station attributes nothing — there is nothing to
        // attribute — so the field is named by the gap sentence instead.
        expect(station.gap).toContain(station.field);
        expect(screen.getByText(station.gap ?? "")).toBeInTheDocument();
      }
    }
  });

  it("never claims a quote on a station that has none", async () => {
    const user = userEvent.setup();
    renderRun();
    const withGap = RUNS.find((candidate) => candidate.stations.some((s) => s.gap !== null));
    if (!withGap) throw new Error("no project has a gap — the fixture has changed");

    await user.click(screen.getByRole("radio", { name: new RegExp(withGap.title, "i") }));

    // One provenance line per authored station, and one more for the closing
    // lesson — which is a quote from the same record and now says so. An
    // empty station still contributes none, which is the claim being made.
    const quoted = screen.queryAllByText(/^quoted from projects\./).length;
    expect(quoted).toBe(withGap.authoredStations + (withGap.learned === null ? 0 : 1));
  });
});
