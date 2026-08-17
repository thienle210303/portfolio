"use client";

import { useId, useState } from "react";
import { CornerDownLeft } from "lucide-react";
import { answer, SUGGESTED_QUESTIONS, type Answer } from "@/lib/answers";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/cn";
import { ANSWER_FILENAME, answerLiteral, describeAnswerLiteral } from "./answer-code";

/**
 * "Ask this site" — a grounded question box over the portfolio's own content.
 *
 * It looks unlike the sections around it on purpose. Everything else on the
 * page is a document being read; this is an instrument being operated, so it
 * gets a raised panel, a terminal-ish prompt line and answers that arrive as
 * quoted evidence rather than as prose. That contrast is the point: a visitor
 * should be able to tell at a glance that this is the one part of the page
 * that answers back.
 *
 * What it is not is a chatbot. There is no model here and no generation step,
 * which is why the notice at the top of this section — "nothing on it executes
 * an agent" — is still true. Every answer is a verbatim string from
 * `src/content` shown with the source it already carried, so the feature
 * cannot invent a claim even in principle. See `src/lib/answers.ts`.
 *
 * The common case needs no typing at all: five real questions sit above the
 * field as one-tap buttons, and a test asserts each of them actually returns
 * something rather than shipping a dead control.
 *
 * ## The second view
 *
 * An answer can also be read as the object it already is — the same strings,
 * rendered through the hero's own CodeBlock as a TypeScript literal. It is a
 * flourish, and it is built to stay one: prose is the first tab and the default,
 * the code adds no field the prose card does not already show, and it is
 * generated from `answer()`'s output rather than from anything new (see
 * `./answer-code.ts`).
 *
 * The shared `Tabs` primitive carries it, for two reasons beyond the keyboard
 * support it already has tested. Tabs is the exact semantic — one thing, two
 * renderings, one at a time — where a `FilterGroup` radiogroup is for narrowing
 * a set and would have to invent a per-option count to fit its API. And Tabs
 * mounts only the active panel, so the view you are not reading is genuinely
 * gone from the DOM: a screen reader is never handed the same answer twice,
 * which a merely-hidden second copy would do.
 *
 * That single-panel rule is also what keeps the live region honest. An arriving
 * answer inserts exactly one rendering of itself into the polite region below,
 * so it is announced once rather than once per view. Switching view afterwards
 * is a deliberate act by the reader, and announces only the panel they asked
 * for — the tab strip itself stays mounted between questions, so it is never
 * re-read either.
 */

const NOTHING_FOUND =
  "Nothing on this page answers that. Everything here is drawn from what's actually written in the sections above — if it isn't there, I'd rather say so than guess.";

/** The prose reading: quoted evidence, its source, and a way back to it. */
function ProseAnswers({ results }: { readonly results: readonly Answer[] }) {
  return (
    <ol className="flex flex-col gap-5">
      {results.map((result) => (
        <li key={result.text} className="border-l-2 border-accent pl-4">
          <p className="prose-measure text-[length:var(--step-0)] leading-relaxed text-fg">
            {result.text}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="eyebrow">{result.source}</span>
            <a
              href={`#${result.sectionId}`}
              className="font-mono text-[length:var(--step--1)] text-accent underline-offset-4 hover:underline"
            >
              Read it in {result.sectionLabel} &rarr;
            </a>
          </p>
        </li>
      ))}
    </ol>
  );
}

/**
 * The code reading. A component rather than an inline element so the literal is
 * only built when this tab is the one being rendered.
 */
function CodeAnswer({
  question,
  results,
}: {
  readonly question: string;
  readonly results: readonly Answer[];
}) {
  return (
    <CodeBlock
      code={answerLiteral(question, results)}
      filename={ANSWER_FILENAME}
      summary={describeAnswerLiteral(results)}
    />
  );
}

export default function AskThisSite() {
  const fieldId = useId();
  const resultsId = useId();
  const viewId = useId();
  const [query, setQuery] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [results, setResults] = useState<readonly Answer[]>([]);

  function ask(question: string) {
    const trimmed = question.trim();
    if (trimmed === "") return;
    setQuery(trimmed);
    setAsked(trimmed);
    setResults(answer(trimmed));
  }

  return (
    <div className="border border-rule bg-surface">
      {/* Prompt bar. The one place on the site that borrows a terminal's
          vocabulary, because this is the one place that takes a command. */}
      <div className="flex items-center gap-2 border-b border-rule px-4 py-2.5">
        <span aria-hidden="true" className="font-mono text-[length:var(--step--1)] text-accent">
          ?
        </span>
        <span className="eyebrow">Ask this site</span>
      </div>

      <div className="p-4 sm:p-6">
        <p className="prose-measure text-[length:var(--step-0)] leading-relaxed text-fg-muted">
          Every answer below is a sentence lifted straight out of this page, shown with where it
          came from. No model, nothing generated — if the answer isn&rsquo;t written somewhere on
          the site, you get told so.
        </p>

        <ul className="mt-5 flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((question) => (
            <li key={question}>
              <button
                type="button"
                onClick={() => ask(question)}
                className={cn(
                  "min-h-11 border border-rule px-3 py-1.5 text-left text-[length:var(--step--1)]",
                  "text-fg-muted transition-colors duration-200",
                  "hover:border-accent hover:text-accent",
                  asked === question && "border-accent text-accent",
                )}
              >
                {question}
              </button>
            </li>
          ))}
        </ul>

        <form
          className="mt-5"
          onSubmit={(event) => {
            event.preventDefault();
            ask(query);
          }}
        >
          <label htmlFor={fieldId} className="sr-only">
            Ask a question about this portfolio
          </label>
          <div className="flex items-center gap-2 border border-rule bg-ground px-3 focus-within:border-accent">
            <span
              aria-hidden="true"
              className="font-mono text-[length:var(--step-0)] text-accent"
            >
              &rsaquo;
            </span>
            <input
              id={fieldId}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="or ask your own"
              aria-controls={resultsId}
              className="min-h-12 w-full bg-transparent font-mono text-[length:var(--step-0)] text-fg outline-none placeholder:text-fg-subtle"
            />
            <button
              type="submit"
              className="grid h-11 w-11 shrink-0 place-items-center text-fg-muted transition-colors duration-200 hover:text-accent"
            >
              <CornerDownLeft aria-hidden="true" focusable="false" size={17} />
              <span className="sr-only">Ask</span>
            </button>
          </div>
        </form>

        {/* Live region is always present, so an answer arriving into it is
            announced rather than missed. Exactly one rendering of the answer
            ever sits inside it — see the note on Tabs at the top of the file. */}
        <div id={resultsId} aria-live="polite" className="mt-6 min-w-0">
          {asked === null ? null : results.length === 0 ? (
            <p className="prose-measure text-[length:var(--step-0)] leading-relaxed text-fg-muted">
              {NOTHING_FOUND}
            </p>
          ) : (
            <Tabs
              label="Answer view"
              idPrefix={`${viewId}-answer-view`}
              tabs={[
                {
                  id: "prose",
                  label: "Prose",
                  panel: <ProseAnswers results={results} />,
                },
                {
                  id: "code",
                  label: "Code",
                  panel: <CodeAnswer question={asked} results={results} />,
                },
              ]}
            />
          )}
        </div>
      </div>
    </div>
  );
}
