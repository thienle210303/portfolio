"use client";

import { useState } from "react";
import { FilterGroup } from "@/components/ui/FilterGroup";
import { LEARNED_FIELD, type ResolvedRun } from "@/lib/workshop";

/**
 * The loop, run.
 *
 * Nine stations down the page, each carrying its own authored step (label and
 * detail, from `problemSolvingLoop`) and whatever the chosen project authored
 * for it. The switcher is the argument: the same nine steps against a
 * different project fill a different number of stations, and the ones that
 * stay empty say which field is missing. A visitor who switches twice has
 * learned something true about the record that no amount of prose would have
 * convinced them of.
 *
 * All five runs are resolved on the server and handed down as props, so
 * switching is instant and costs no request. They are small — nine stations of
 * quoted strings — and there are five of them, which is cheaper than one
 * round trip.
 *
 * Two visual rules carry the honesty the resolver already encodes, and they
 * are deliberately different from one another:
 *
 * - A quoted line gets the blue left rule. Blue is annotation on this site,
 *   and that is exactly what an evidence line is: the project's own words,
 *   marked as brought in from elsewhere.
 * - A gap gets a dashed rule in the ordinary rule colour, never blue and
 *   never red. It is not a warning and not a measured value; it is a station
 *   standing empty on purpose, and it should look like a blank left on a form
 *   rather than like something that failed to load.
 */

interface WorkshopRunProps {
  readonly runs: readonly ResolvedRun[];
  readonly defaultProjectId: string;
}

export function WorkshopRun({ runs, defaultProjectId }: WorkshopRunProps) {
  const [projectId, setProjectId] = useState(defaultProjectId);
  const run = runs.find((candidate) => candidate.projectId === projectId) ?? runs[0];
  if (!run) return null;

  return (
    <div className="mt-8">
      <FilterGroup
        label="Run the loop with"
        idPrefix="workshop-run"
        // `run.projectId`, not the raw `projectId` state. The two agree on
        // every path a visitor can reach, and the difference is an
        // accessibility defect rather than a cosmetic one: `?? runs[0]` above
        // falls the *render* back when an id does not resolve, but the state
        // would still hold the unresolvable id. `FilterGroup` would then find
        // no option matching `value`, leave every chip `aria-checked={false}`
        // — and because it owns a single tab stop for the radiogroup
        // (`tabIndex={checked ? 0 : -1}`, which is the correct pattern), the
        // whole project switcher would drop out of the tab order with no
        // visible symptom. Deriving the checked chip from the run actually
        // being shown makes "the checked chip is the run on screen" a
        // structural property rather than one the initial state has to get
        // right.
        value={run.projectId}
        onChange={setProjectId}
        // `count` is not decoration: it is how many of the nine stations that
        // project can fill, which is the one number that makes switching worth
        // doing. `FilterGroup` renders it inside each chip, which is also what
        // keeps its selection from being colour-only.
        options={runs.map((candidate) => ({
          id: candidate.projectId,
          label: candidate.title,
          count: candidate.authoredStations,
        }))}
      />

      {/*
        `FilterGroup` announces the chip that was chosen but has no idea what
        choosing it did — see its own doc comment, which makes the result count
        the consuming section's job. This is that announcement, and it is also
        the line that states the section's whole claim in one number.
      */}
      <p role="status" aria-live="polite" className="eyebrow mt-4">
        {run.authoredStations} of {run.stations.length} stations have something authored behind them
        {run.organization ? ` · ${run.organization}` : ""}
      </p>

      <ol className="mt-6 grid gap-px border border-rule bg-rule">
        {run.stations.map((station, index) => (
          <li key={station.id} className="bg-surface p-4 sm:p-5">
            {/* The numeral is `aria-hidden` and the label is its own element,
                for two reasons that happen to agree. This is an `<ol>`, so a
                screen reader already announces the position — printing "01"
                into the accessible name would say it twice. And a label in
                its own element is a label that can be located exactly, by a
                test or by in-page search, rather than only as a substring of
                "01 · Observe". */}
            <p className="eyebrow">
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")} · </span>
              <span>{station.label}</span>
            </p>
            <p className="prose-measure mt-1 text-[length:var(--step--1)] text-fg-subtle">
              {station.detail}
            </p>
            {station.evidence.length > 0 ? (
              <>
                {/* Named "Evidence" to match `workshopIntro`'s own claim —
                    every piece of evidence below is quoted. The step's label
                    and detail above it are the loop's method text, not the
                    project's, and are deliberately outside this list. */}
                <ul aria-label="Evidence" className="mt-3 grid gap-2">
                  {station.evidence.map((line) => (
                    <li
                      key={line}
                      className="prose-measure border-l-2 border-accent pl-3 text-[length:var(--step--1)] text-fg-muted"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
                {/* Provenance is per-station rather than per-section, and it
                    is rendered only where something was actually quoted: an
                    empty station has nothing to attribute, and its own gap
                    sentence already names the field. */}
                <p className="eyebrow mt-2 normal-case tracking-normal">
                  quoted from projects.{run.projectId} · {station.field}
                </p>
              </>
            ) : (
              <p className="prose-measure mt-3 border-l-2 border-dashed border-rule pl-3 text-[length:var(--step--1)] text-fg-subtle">
                {station.gap}
              </p>
            )}
          </li>
        ))}
      </ol>

      {/* The lesson is a quote like every other one on this page, so it
          carries its own provenance line — and it is rendered only when
          there is something to attribute. A project whose `learned` held a
          `[NEEDS INPUT: …]` marker resolves to `null`, and then the link
          stands on its own rather than trailing an empty sentence. */}
      <p className="prose-measure mt-6 text-[length:var(--step--1)] text-fg-muted">
        {run.learned ? `${run.learned} ` : null}
        <a href={run.href} className="ink-link">
          Read the whole case study →
        </a>
      </p>
      {run.learned ? (
        <p className="eyebrow mt-2 normal-case tracking-normal">
          quoted from projects.{run.projectId} · {LEARNED_FIELD}
        </p>
      ) : null}
    </div>
  );
}

export default WorkshopRun;
