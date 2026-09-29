import { describe, expect, it, vi } from "vitest";
import { workflowStages } from "@/content/ai-experiments";
import { problemSolvingLoop, projects } from "@/content/portfolio";
import { agentLaneIntro, defaultRunProjectId, workshopStations } from "@/content/workshop";
import { resolveRun, runnableProjects } from "@/lib/workshop";
import { caseStudyAnchorId } from "@/sections/SelectedWork/anchors";
import type { Project } from "@/types/portfolio";

describe("the station map", () => {
  it("has one station per authored loop step, in the loop's own order", () => {
    expect(workshopStations.map((station) => station.step)).toEqual(
      problemSolvingLoop.map((step) => step.id),
    );
  });

  it("names a real project field for every station", () => {
    // Every project's keys, not the first project's. An object literal omits
    // the fields it does not author, so any single project can lack a field
    // that is perfectly real — `whatFailed` is missing from four of the five.
    const authoredFields = new Set(projects.flatMap((project) => Object.keys(project)));
    for (const station of workshopStations) {
      expect(
        authoredFields.has(station.field),
        `${station.step} names ${station.field}, which no project authors`,
      ).toBe(true);
    }
  });

  it("uses each field at most once, so no line is evidence for two steps", () => {
    const fields = workshopStations.map((station) => station.field);
    expect(new Set(fields).size).toBe(fields.length);
  });
});

describe("resolveRun", () => {
  it("runs the default project and quotes its fields verbatim", () => {
    const run = resolveRun(defaultRunProjectId);
    if (!run) throw new Error(`${defaultRunProjectId} is not a runnable project`);
    const project = projects.find((candidate) => candidate.id === defaultRunProjectId);
    if (!project) throw new Error("the default project left the content layer");

    expect(run.stations).toHaveLength(problemSolvingLoop.length);

    const observe = run.stations.find((station) => station.id === "observe");
    expect(observe?.evidence).toEqual([project.problem]);
    expect(observe?.gap).toBeNull();

    const constraints = run.stations.find((station) => station.id === "constraints");
    expect(constraints?.evidence).toEqual([...project.constraints]);
  });

  it("carries each step's own label and detail, unchanged", () => {
    const run = resolveRun(defaultRunProjectId);
    if (!run) throw new Error("no run");
    for (const step of problemSolvingLoop) {
      const station = run.stations.find((candidate) => candidate.id === step.id);
      expect(station?.label).toBe(step.label);
      expect(station?.detail).toBe(step.detail);
    }
  });

  it("returns null for a project that does not exist", () => {
    expect(resolveRun("no-such-project")).toBeNull();
  });

  it("offers every project as a possible run", () => {
    expect(runnableProjects().map((project) => project.id)).toEqual(
      projects.map((project) => project.id),
    );
  });

  it("opens on the one run that fills every station", () => {
    // `defaultRunProjectId`'s comment names it as the run where all nine
    // stations are filled. Hold it to that: if a content edit changes the fact,
    // the default should be chosen again on purpose, not drift.
    expect(resolveRun(defaultRunProjectId)?.authoredStations).toBe(problemSolvingLoop.length);
  });

  it("points each run at its case study by the one spelling of the anchor", () => {
    // The leading `#` is the contract: `run.href` goes straight into an
    // `<a href>`, and without it the link is a relative URL that navigates away
    // from the page instead of down it.
    for (const project of projects) {
      expect(resolveRun(project.id)?.href).toBe(`#${caseStudyAnchorId(project.id)}`);
    }
  });

  it("hands back nothing but plain data, so it can cross into a client component", () => {
    // `structuredClone` throws on a function and quietly flattens a class
    // instance into a plain object, which `toStrictEqual` then rejects on type
    // — between them, the two things that would break the server-to-client
    // hand-off at build time.
    for (const project of projects) {
      const run = resolveRun(project.id);
      expect(structuredClone(run)).toStrictEqual(run);
    }
  });
});

describe("the gaps are disclosed, never hidden and never borrowed", () => {
  it("keeps the station and states the gap when the project authors nothing for it", () => {
    // Four of the five projects author no `whatFailed`. The station stays —
    // dropping it would make the loop look more complete than the record is,
    // and filling it from another project would be a quiet lie about which
    // project failed how.
    const withoutFailure = projects.filter((project) => !project.whatFailed);
    expect(withoutFailure.length).toBeGreaterThan(0);

    for (const project of withoutFailure) {
      const run = resolveRun(project.id);
      const station = run?.stations.find((candidate) => candidate.id === "test");
      expect(station, `${project.id} lost its test station`).toBeDefined();
      expect(station?.evidence).toEqual([]);
      expect(station?.gap).toBeTruthy();
      expect(station?.gap).toContain("whatFailed");
    }
  });

  it("keeps all nine stations for every project, each one quoted or disclosed", () => {
    // The `test` station above is one case of a rule about every station of
    // every project: `automotive-genai` also authors no `assumption` and an
    // empty `pathsExplored`, and those two stay too.
    for (const project of projects) {
      const run = resolveRun(project.id);
      if (!run) throw new Error(`${project.id} did not resolve`);

      expect(
        run.stations.map((station) => station.id),
        `${project.id} lost a station`,
      ).toEqual(problemSolvingLoop.map((step) => step.id));

      for (const station of run.stations) {
        const quoted = station.evidence.length > 0;
        // Exactly one of the two: a station that quotes nothing must say why,
        // and one that quotes something must not also apologise.
        expect(station.gap === null, `${project.id}/${station.id}`).toBe(quoted);
        if (station.gap !== null) {
          expect(station.gap, `${project.id}/${station.id} does not name its field`).toContain(
            station.field,
          );
        }
      }
    }
  });

  it("never borrows a line: everything a station quotes was written by that project", () => {
    // Stated independently of the resolver's field map — from the project's own
    // record — so a fallback that filled `whatFailed` or `failureLesson` from
    // the default project would have nowhere to hide.
    for (const project of projects) {
      const wrote = new Set<string>();
      for (const value of Object.values(project)) {
        if (typeof value === "string") wrote.add(value);
        if (Array.isArray(value)) {
          for (const entry of value) {
            if (typeof entry === "string") wrote.add(entry);
          }
        }
      }

      const run = resolveRun(project.id);
      for (const station of run?.stations ?? []) {
        for (const line of station.evidence) {
          expect(
            wrote.has(line),
            `${project.id}/${station.id} quotes a line ${project.id} never wrote`,
          ).toBe(true);
        }
      }
    }
  });

  it("treats an unauthored Maybe field as a gap rather than printing anything", () => {
    // `automotive-genai` authors `assumption: undefined`, which is the same
    // branch a `[NEEDS INPUT: …]` marker takes once `resolved()` has unwrapped
    // it. Neither may ever reach the page.
    for (const project of projects) {
      const run = resolveRun(project.id);
      for (const station of run?.stations ?? []) {
        for (const line of station.evidence) {
          expect(line).not.toContain("[NEEDS INPUT");
        }
        expect(station.gap ?? "").not.toContain("[NEEDS INPUT");
      }
    }
  });

  it("drops a [NEEDS INPUT] marker wherever it sits, so a half-authored field is a gap", () => {
    // No project holds a marker today, so the test above can only pass on the
    // content as it stands. This one makes the resolver meet the three shapes a
    // half-authored field can take — a marker in a `Maybe` field, a marker
    // typed into a list, and an empty string — using a stand-in for the one
    // lookup `resolveRun` makes, rather than editing the real content.
    const base = projects.find((project) => project.id === defaultRunProjectId);
    if (!base) throw new Error("the default project left the content layer");
    const halfAuthored: Project = {
      ...base,
      id: "half-authored",
      assumption: "[NEEDS INPUT: what this project assumed]",
      constraints: ["[NEEDS INPUT: the real constraints]", "a real constraint"],
      whatFailed: "",
    };

    // `projects` is typed as the five authored shapes, and a half-authored
    // project is by definition none of them, so it is asserted to that type
    // here, once, at the boundary the spy owns.
    const lookup = vi
      .spyOn(projects, "find")
      .mockReturnValueOnce(halfAuthored as (typeof projects)[number]);
    try {
      const run = resolveRun("half-authored");
      if (!run) throw new Error("the stand-in project was never looked up");
      const station = (id: string) => run.stations.find((candidate) => candidate.id === id);

      expect(station("question")?.evidence).toEqual([]);
      expect(station("question")?.gap).toContain("assumption");
      expect(station("constraints")?.evidence).toEqual(["a real constraint"]);
      expect(station("test")?.evidence).toEqual([]);
      expect(station("test")?.gap).toContain("whatFailed");
      expect(JSON.stringify(run)).not.toContain("[NEEDS INPUT");
    } finally {
      lookup.mockRestore();
    }
  });

  it("counts how many of the nine stations this run can actually fill", () => {
    for (const project of projects) {
      const run = resolveRun(project.id);
      if (!run) throw new Error(`${project.id} did not resolve`);
      const filled = run.stations.filter((station) => station.evidence.length > 0).length;
      expect(run.authoredStations).toBe(filled);
      expect(run.authoredStations).toBeGreaterThan(0);
      expect(run.authoredStations).toBeLessThanOrEqual(run.stations.length);
    }
  });

  it("never renders the string 'undefined' anywhere in a run", () => {
    for (const project of projects) {
      expect(JSON.stringify(resolveRun(project.id))).not.toContain("undefined");
    }
  });
});

describe("the agent lane's intro", () => {
  it("counts the stages the lane actually holds", () => {
    // The sentence spells the count out in words, so nothing computes it. If a
    // stage is added to or removed from `workflowStages` this fails until the
    // sentence catches up, instead of the page claiming ten of eleven.
    expect(workflowStages).toHaveLength(10);
    expect(agentLaneIntro).toContain("ten stages");
  });
});
