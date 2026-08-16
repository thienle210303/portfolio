import { Fragment } from "react";
import { formatIsoDate, stripNeedsInput } from "@/lib/content";
import { Tag } from "@/components/ui/Tag";
import type { LearningLog as LearningLogData } from "@/types/portfolio";

interface LearningLogProps {
  readonly learningLog: LearningLogData;
}

function cleanList(items: readonly string[]): readonly string[] {
  return items.map(stripNeedsInput).filter((item) => item.length > 0);
}

function SubHeading({ id, children }: { id: string; children: string }) {
  return (
    <h4
      id={id}
      className="font-mono text-[length:var(--step--1)] uppercase tracking-[0.08em] text-[color:var(--fg-subtle)]"
    >
      {children}
    </h4>
  );
}

/**
 * "Currently exploring": the learning log, directly after the experiments.
 * Every list is defensively run through `stripNeedsInput`/filtered for
 * emptiness, and `entries` is re-sorted newest-first by its ISO `date`
 * string (never `started`-style prose, never a `Date` object -- plain
 * string comparison on `YYYY-MM-DD` is already correct and stays
 * deterministic across server and client render).
 */
export function LearningLog({ learningLog }: LearningLogProps) {
  const exploringNow = cleanList(learningLog.exploringNow);
  const wantToTestNext = cleanList(learningLog.wantToTestNext);
  const changedMyThinking = learningLog.changedMyThinking
    .map((pair) => ({ before: stripNeedsInput(pair.before), after: stripNeedsInput(pair.after) }))
    .filter((pair) => pair.before.length > 0 && pair.after.length > 0);
  const entries = [...learningLog.entries].sort((a, b) =>
    a.date > b.date ? -1 : a.date < b.date ? 1 : 0,
  );

  return (
    <div>
      <h3
        id="lab-learning-log-heading"
        className="font-display text-[length:var(--step-3)] leading-tight tracking-[-0.01em] text-[color:var(--fg)]"
      >
        Currently exploring
      </h3>

      {exploringNow.length > 0 ? (
        <div className="mt-8">
          <SubHeading id="lab-exploring-now-heading">What I&rsquo;m learning now</SubHeading>
          <ul className="prose-measure mt-3 space-y-2" aria-labelledby="lab-exploring-now-heading">
            {exploringNow.map((item, index) => (
              <li key={index} className="text-[length:var(--step-0)] leading-relaxed text-[color:var(--fg)]">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {changedMyThinking.length > 0 ? (
        <div className="mt-10">
          <SubHeading id="lab-changed-thinking-heading">What changed my thinking</SubHeading>
          {/*
            The grid lives on the <dl> itself and each statement is its own
            <div><dt><dd></div> group. A <dl> permits exactly one level of
            <div> around a dt/dd group — an earlier version nested a column
            div inside a row div, which broke the content model and tripped
            three axe rules (dlitem, definition-list, only-dlitems) because
            the dt/dd no longer had a <dl> ancestor. Two columns of a pair
            sit on one grid row, so their shared bottom border still reads
            as a single rule.
          */}
          <dl
            className="mt-4 grid gap-x-10 border-t border-[color:var(--rule-color)] sm:grid-cols-2"
            aria-labelledby="lab-changed-thinking-heading"
          >
            {changedMyThinking.map((pair, index) => (
              <Fragment key={index}>
                <div className="border-b border-[color:var(--rule-color)] py-5">
                  <dt className="font-mono text-[length:var(--step--1)] uppercase tracking-[0.08em] text-[color:var(--fg-subtle)]">
                    I used to think
                  </dt>
                  <dd className="mt-2 text-[length:var(--step-0)] leading-relaxed text-[color:var(--fg-muted)]">
                    {pair.before}
                  </dd>
                </div>
                <div className="border-b border-[color:var(--rule-color)] py-5">
                  <dt className="font-mono text-[length:var(--step--1)] uppercase tracking-[0.08em] text-[color:var(--fg-subtle)]">
                    Now I think
                  </dt>
                  <dd className="mt-2 text-[length:var(--step-0)] leading-relaxed text-[color:var(--fg)]">
                    {pair.after}
                  </dd>
                </div>
              </Fragment>
            ))}
          </dl>
        </div>
      ) : null}

      {wantToTestNext.length > 0 ? (
        <div className="mt-10">
          <SubHeading id="lab-want-to-test-heading">What I want to test next</SubHeading>
          <ul className="prose-measure mt-3 space-y-2" aria-labelledby="lab-want-to-test-heading">
            {wantToTestNext.map((item, index) => (
              <li key={index} className="text-[length:var(--step-0)] leading-relaxed text-[color:var(--fg)]">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {entries.length > 0 ? (
        <div className="mt-10">
          <SubHeading id="lab-entries-heading">Entries</SubHeading>
          <ul className="mt-4 space-y-8" aria-labelledby="lab-entries-heading">
            {entries.map((entry) => {
              const title = stripNeedsInput(entry.title);
              const body = stripNeedsInput(entry.body);
              const tags = cleanList(entry.tags);
              return (
                <li key={entry.id} className="border-t border-[color:var(--rule-color)] pt-6 first:border-t-0 first:pt-0">
                  <time
                    dateTime={entry.date}
                    className="font-mono text-[length:var(--step--1)] text-[color:var(--fg-subtle)]"
                  >
                    {formatIsoDate(entry.date)}
                  </time>
                  <h5 className="mt-2 font-display text-[length:var(--step-1)] leading-snug text-[color:var(--fg)]">
                    {title}
                  </h5>
                  <p className="prose-measure mt-2 text-[length:var(--step-0)] leading-relaxed text-[color:var(--fg-muted)]">
                    {body}
                  </p>
                  {tags.length > 0 ? (
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <li key={tag}>
                          <Tag>{tag}</Tag>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <p className="mt-10 font-mono text-[length:var(--step--1)] text-[color:var(--fg-subtle)]">
        Last updated{" "}
        <time dateTime={learningLog.lastUpdated}>{formatIsoDate(learningLog.lastUpdated)}</time>
      </p>
    </div>
  );
}

export default LearningLog;
