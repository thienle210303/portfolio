/**
 * The problem-solving loop, drawn as a directed graph rather than listed as a
 * sequence: nine nodes on a trunk, two decision points that fan out into
 * labelled branches, one branch that terminates, and one dashed edge that
 * leaves the last node, runs back up the left margin and re-enters the first.
 * That shape — read, attempt, check, then either stop or feed what you learned
 * back in — is the shape of an agentic/dynamic workflow, which is the point
 * the section is making.
 *
 * WHAT IS AUTHORED AND WHAT IS DRAWN
 *
 * Every node label and every node detail comes from `problemSolvingLoop` in
 * the content layer, verbatim. Nothing here writes a new claim.
 *
 * The two decision points are NOT extra content: the content layer has no
 * "branch" concept, so the branches are drawn as *connector labels*, and each
 * label is a fragment of wording that already exists in the step it belongs to
 * or in the step immediately after it:
 *
 *   Test ("Try to break it on purpose") forks into "ruled out" / "confirmed" —
 *     both words are lifted from the next step, Learn: "Write down what the
 *     result ruled out, not just what it confirmed." Both outcomes rejoin,
 *     because the content says Learn happens either way; the fork marks Test
 *     as the check, not as a router.
 *   Iterate ("Feed it back in. Stop when it's useful, not when it's clever.")
 *     forks into "feed it back in" / "stop when it's useful" — its own two
 *     sentences. This one is a real router: the first branch is the loop-back
 *     edge, the second terminates.
 *
 * The loop-back edge returns to `steps[0]`, not to some chosen mid-point.
 * "Feed it back in" does not say where, and the content calls this a loop of
 * nine steps, so closing 09 → 01 is the reading that adds nothing.
 *
 * `FORKS` is keyed by content id. If an id disappears or the order changes,
 * the affected fork simply stops rendering and the diagram degrades to a plain
 * trunk — it never draws a branch off a step that isn't there, and the
 * loop-back rail is only drawn when the *last* step is the one that carries
 * the loop branch.
 *
 * ACCESSIBILITY
 *
 * The drawing is CSS borders on empty `aria-hidden` spans — hairlines, sharp
 * corners, `border-rule` so they follow theme and tone like everything else.
 * Not one character of the diagram lives in a graphic: every label is real DOM
 * text that selects, reflows, wraps and zooms.
 *
 * Assistive technology therefore gets an ordered list of nine items in
 * document order, and each decision step carries a labelled nested list naming
 * its branches — the decision expressed in text, with the loop branch also
 * naming the step it returns to (read from the data, so it can't drift). The
 * numerals are `aria-hidden`: the `<ol>` already conveys order, matching the
 * index treatment in PrincipleList and CaseStudy.
 *
 * REFLOW
 *
 * Two modes, one DOM. At `md` and up the branch band is a two-column grid and
 * the second branch is drawn as a bulge leaving the trunk and either rejoining
 * it or ending in a terminus cap. Below `md` the bulge is hidden and the
 * branches stack as two labelled taps off the trunk — the vertical list flow,
 * with the dashed loop-back rail still drawn down the left margin.
 *
 * Every offset is a fixed rem value or an `inset-*` against the element's own
 * box — never a measured or JS-computed length — so there is nothing to break
 * at 320px or under 200% zoom. Nothing extends past the right edge either: the
 * widest drawn element is the branch bulge at 13.25rem, inside a column that
 * is at least 40rem wide wherever it is visible.
 *
 * No animation, deliberately. A marching-ants loop edge would have to be
 * switched off under `prefers-reduced-motion` anyway, and it would be movement
 * beside body text that says nothing the dashes don't already say.
 */
import { cn } from "@/lib/cn";
import type { LoopStep } from "@/types/portfolio";

interface ProblemSolvingLoopProps {
  readonly steps: readonly LoopStep[];
}

/**
 * One labelled edge leaving a decision node.
 *
 * `rejoin` returns to the trunk (drawn closed); `loop` becomes the dashed
 * edge back to the first step; `stop` ends at a terminus cap.
 */
interface LoopBranch {
  readonly id: string;
  readonly label: string;
  readonly kind: "rejoin" | "loop" | "stop";
}

interface LoopFork {
  /** Mono eyebrow introducing the branch list — a UI label, like "The loop". */
  readonly label: string;
  /** Exactly two: the trunk branch, then the one drawn leaving the trunk. */
  readonly branches: readonly [LoopBranch, LoopBranch];
}

/* Keyed by content id — see the note on connector labels above. Typed with an
   explicit `| undefined` so an id that no longer exists reads as absent rather
   than as a fork this component would then try to draw. */
const FORKS: Readonly<Record<string, LoopFork | undefined>> = {
  test: {
    label: "Outcomes",
    branches: [
      { id: "ruled-out", label: "ruled out", kind: "rejoin" },
      { id: "confirmed", label: "confirmed", kind: "rejoin" },
    ],
  },
  iterate: {
    label: "Then",
    branches: [
      { id: "feed-back", label: "feed it back in", kind: "loop" },
      { id: "stop", label: "stop when it's useful", kind: "stop" },
    ],
  },
};

const LABEL_ID = "philosophy-loop-label";
const forkLabelId = (stepId: string) => `philosophy-loop-${stepId}-branches`;

/* ---------------------------------------------------------------------------
 * Geometry. Every value is a plain utility so the whole drawing is auditable
 * from the class names; the three that matter have to agree with each other:
 *
 *   TRUNK_X   0.875rem / 1.25rem   the trunk, measured inside a step <li>
 *   RETURN_X  2.375rem / 3.75rem   the same line measured from the frame, i.e.
 *                                  TRUNK_X plus the frame's own left padding
 *                                  (pl-6 / md:pl-10) — this is where the rail's
 *                                  arms and the entry stub have to land
 *   BULGE     left-5 + w-48        the branch arm at `md`, so its vertical run
 *                                  sits at 13.25rem, which is also where the
 *                                  terminus cap is centred
 * ------------------------------------------------------------------------ */
const TRUNK_X = "left-3.5 md:left-5";
const RETURN_X = "left-[2.375rem] md:left-[3.75rem]";
const BRANCH_INDENT = "pl-[2.125rem] md:pl-10";
const HAIRLINE = "border-rule";

interface ForkProps {
  readonly fork: LoopFork;
  readonly stepId: string;
  /** Label of the step the loop edge returns to. Undefined = no loop branch. */
  readonly loopTarget?: string;
}

function Fork({ fork, stepId, loopTarget }: ForkProps) {
  const labelId = forkLabelId(stepId);
  const hasLoop = fork.branches.some((branch) => branch.kind === "loop");

  return (
    <div className="relative">
      {/* Lead-in: the trunk is still a single solid edge here — the split
          happens at the branch band below, not at the eyebrow. */}
      <div className="relative pb-2 pt-6">
        <span aria-hidden="true" className={cn("absolute inset-y-0 border-l", HAIRLINE, TRUNK_X)} />
        <p id={labelId} className={cn("eyebrow", BRANCH_INDENT)}>
          {fork.label}
        </p>
      </div>

      {/* The branch band. `inset-y-0` on every drawn edge means the band's own
          height — i.e. however tall the two labels wrap to — is what the arms
          measure against, at any width and any zoom. */}
      <div className="relative">
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-0 border-l",
            HAIRLINE,
            TRUNK_X,
            // Dashed only where the bulge is actually drawn: below `md` the
            // two branches are stacked taps off this one line, and dashing it
            // there would claim the terminating branch is on the loop edge.
            hasLoop && "md:border-dashed",
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-0 left-5 hidden w-48 border-r border-t md:block",
            HAIRLINE,
            // A rejoining branch closes back onto the trunk; a terminating one
            // stops at the cap below instead.
            !hasLoop && "border-b",
          )}
        />
        {hasLoop ? (
          <span
            aria-hidden="true"
            className={cn(
              "absolute bottom-0 left-[13.25rem] hidden h-0 w-5 -translate-x-1/2 border-t md:block",
              HAIRLINE,
            )}
          />
        ) : null}

        <ul
          role="list"
          aria-labelledby={labelId}
          className={cn(
            "flex flex-col gap-3",
            BRANCH_INDENT,
            "md:grid md:grid-cols-[9.5rem_minmax(0,1fr)] md:gap-x-8 md:gap-y-0",
          )}
        >
          {fork.branches.map((branch) => (
            <li key={branch.id} className="relative">
              {/* Below `md` only: the short tap that ties this label to the
                  trunk, standing in for the bulge that is hidden there — and,
                  on the branch that terminates, the same cap the bulge ends in
                  at wider widths, so "this one stops" survives the collapse. */}
              <span
                aria-hidden="true"
                className={cn("absolute -left-5 top-[0.6em] w-4 border-t md:hidden", HAIRLINE)}
              />
              {branch.kind === "stop" ? (
                <span
                  aria-hidden="true"
                  className={cn("absolute -left-1 top-[0.25em] h-[0.7em] border-l md:hidden", HAIRLINE)}
                />
              ) : null}
              <p className="font-mono text-[length:var(--step--1)] leading-[1.6] text-[color:var(--fg)]">
                {branch.label}
              </p>
              {branch.kind === "loop" && loopTarget !== undefined ? (
                // The drawn rail says this to sighted readers; this line says
                // it to everyone else. The target is read from the data, so it
                // cannot drift from where the rail actually points.
                <p className="mt-1 font-mono text-[length:var(--step--1)] leading-[1.6] text-[color:var(--fg-subtle)]">
                  Back to {loopTarget}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {/* Tail: the run below the branches. On the loop fork this is the edge
          leaving the diagram, so it is dashed at every width and reaches the
          bottom of the frame, where the rail's lower arm picks it up. */}
      <div aria-hidden="true" className={cn("relative", hasLoop ? "h-12" : "h-6")}>
        <span
          className={cn("absolute inset-y-0 border-l", HAIRLINE, TRUNK_X, hasLoop && "border-dashed")}
        />
      </div>
    </div>
  );
}

export default function ProblemSolvingLoop({ steps }: ProblemSolvingLoopProps) {
  const lastStep = steps.length > 0 ? steps[steps.length - 1] : undefined;
  const loopTarget = steps.length > 0 ? steps[0].label : undefined;
  /* The rail is only honest if the step it leaves from is the last one drawn —
     otherwise it would run past nodes it does not connect. */
  const closesTheLoop =
    lastStep !== undefined &&
    (FORKS[lastStep.id]?.branches.some((branch) => branch.kind === "loop") ?? false);

  return (
    <div>
      <p id={LABEL_ID} className="eyebrow">
        The loop
      </p>

      <div
        className={cn(
          "relative mt-6 max-w-4xl pl-6 md:pl-10",
          // Headroom for the return edge to come back down into the first node.
          closesTheLoop && "pt-8",
        )}
      >
        {closesTheLoop ? (
          <>
            {/* The loop-back edge: one bracket whose two arms both end at the
                trunk's x, so it meets the tail above and the stub below with
                no measurement anywhere. Dashed throughout — it is the one edge
                that runs against the reading direction. */}
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-y-0 left-1.5 w-8 border-y border-l border-dashed md:left-3 md:w-12",
                HAIRLINE,
              )}
            />
            <span
              aria-hidden="true"
              className={cn("absolute top-0 h-8 border-l border-dashed", HAIRLINE, RETURN_X)}
            />
            {/* Hairline arrowhead — two borders on a rotated square, so it is
                drawn from the same alias as every other edge. */}
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-6 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r",
                HAIRLINE,
                RETURN_X,
              )}
            />
          </>
        ) : null}

        <ol role="list" aria-labelledby={LABEL_ID}>
          {steps.map((step, index) => {
            const fork = FORKS[step.id];
            const isLast = index === steps.length - 1;

            return (
              <li key={step.id} className={cn("relative", isLast ? "pb-0" : "pb-10")}>
                {/* The node. `bg-surface` rather than the section's ground:
                    --surface is the alias that stays one readable step off the
                    ground in both themes, which a raw token would not. */}
                <div className={cn("relative border bg-surface px-4 py-4 md:px-5 md:py-5", HAIRLINE)}>
                  <p aria-hidden="true" className="eyebrow flex items-center gap-2">
                    {String(index + 1).padStart(2, "0")}
                    {fork ? (
                      /* Schematic shorthand for a decision: a hairline diamond,
                         drawn rather than set, so it needs no glyph coverage in
                         the mono face and reads identically in both themes. */
                      <span className={cn("inline-block h-2 w-2 rotate-45 border", HAIRLINE)} />
                    ) : null}
                  </p>
                  <p className="mt-2 font-sans text-[length:var(--step-0)] font-medium leading-snug text-[color:var(--fg)]">
                    {step.label}
                  </p>
                  <p className="mt-1.5 text-[length:var(--step--1)] leading-[1.6] text-[color:var(--fg-muted)]">
                    {step.detail}
                  </p>
                </div>

                {fork ? (
                  <Fork
                    fork={fork}
                    stepId={step.id}
                    loopTarget={
                      fork.branches.some((branch) => branch.kind === "loop") ? loopTarget : undefined
                    }
                  />
                ) : null}

                {isLast ? null : (
                  <>
                    <span
                      aria-hidden="true"
                      className={cn("absolute bottom-0 h-10 border-l", HAIRLINE, TRUNK_X)}
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute bottom-0 h-1.5 w-1.5 -translate-x-1/2 rotate-45 border-b border-r",
                        HAIRLINE,
                        TRUNK_X,
                      )}
                    />
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
