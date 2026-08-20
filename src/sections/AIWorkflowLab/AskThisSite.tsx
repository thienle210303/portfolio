"use client";

import { useId, useState } from "react";
import { CornerDownLeft } from "lucide-react";
import { answer, SUGGESTED_QUESTIONS, type Answer } from "@/lib/answers";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Disclosure } from "@/components/ui/Disclosure";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/cn";
import { ANSWER_FILENAME, answerLiteral, describeAnswerLiteral } from "./answer-code";
import {
  SCORING_EXCERPT,
  SCORING_EXCERPT_FILENAME,
  SCORING_EXCERPT_SUMMARY,
  SCORING_MATH,
} from "./scoring-excerpt";

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
 * `./answer-code.ts`). The Code tab opens on a one-line caption above the
 * panel — the same claim as this comment, in visitor-facing words, not a new
 * one — so the tab reads as a deliberate feature rather than a bare view
 * switch.
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
 *
 * ## "How this answers"
 *
 * One more disclosure, collapsed by default so it costs nothing for a visitor
 * who never opens it: the actual scoring loop from `answer()`, hand-copied in
 * `./scoring-excerpt.ts` (that file explains why it is a copy and not an
 * import), the same rule restated as notation, and two sentences naming what
 * this is — lexical, IDF-weighted term overlap — and what it is not: a
 * language model. It sits below the intro paragraph rather than beside any one
 * answer, because it explains the mechanism, not a result.
 */

const NOTHING_FOUND =
  "Nothing on this page answers that. Everything here is drawn from what's actually written in the sections above — if it isn't there, I'd rather say so than guess.";

/** Shown before the first question — the results region's resting state,
 *  rather than a blank gap under the form. */
const IDLE_HINT =
  "No question asked yet. Pick one above, or type your own, and the answer will land here — sourced, and linked back to the page it came from.";

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
    <div>
      {/* The eyebrow + one-line caption are what turn this into a labelled
          sub-section rather than a bare panel behind a tab. The line names
          what the panel already is — the same words as the Prose tab, in a
          different shape — and adds no claim beyond that (see the file-level
          doc comment above). */}
      <p className="eyebrow">This answer, as data</p>
      <p className="prose-measure mt-2 text-[length:var(--step--1)] leading-relaxed text-fg-muted">
        The exact sentences from the Prose tab, written out as the TypeScript object they already
        are.
      </p>
      <div className="mt-4">
        <CodeBlock
          code={answerLiteral(question, results)}
          filename={ANSWER_FILENAME}
          summary={describeAnswerLiteral(results)}
        />
      </div>
    </div>
  );
}

/**
 * The honest mechanism, collapsed by default. See the file-level doc comment
 * above; the excerpt itself and why it is a hand copy live in
 * `./scoring-excerpt.ts`.
 */
function HowThisAnswers({ id }: { readonly id: string }) {
  return (
    <Disclosure
      id={id}
      summary={<span className="eyebrow">How this answers</span>}
      expandLabel="Show the ranking code"
      collapseLabel="Hide the ranking code"
    >
      <div className="prose-measure">
        <p className="text-[length:var(--step--1)] leading-relaxed text-fg-muted">
          This is lexical retrieval: each candidate passage is scored by summing the IDF weight of
          every query term it contains — full weight if the term is in the passage text, 0.6&times;
          if it only matches the passage&rsquo;s label — then ranked by that score. It is not a
          language model: there is no embedding, no generation step, and no LLM or SLM anywhere in
          this feature — the excerpt below is the actual mechanism, not a retelling of one.
        </p>
        <p className="mt-3 whitespace-pre-line font-mono text-[length:var(--step--1)] leading-relaxed text-fg">
          {SCORING_MATH}
        </p>
      </div>
      <div className="mt-4">
        <CodeBlock
          code={SCORING_EXCERPT}
          filename={SCORING_EXCERPT_FILENAME}
          summary={SCORING_EXCERPT_SUMMARY}
        />
      </div>
    </Disclosure>
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

        <div className="mt-4">
          <HowThisAnswers id={`${viewId}-how-this-answers`} />
        </div>

        <div className="mt-6">
          <p className="eyebrow">Try asking</p>
          <ul className="mt-3 flex flex-wrap gap-2">
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
        </div>

        <form
          className="mt-6"
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
            ever sits inside it — see the note on Tabs at the top of the file.
            The hairline above frames it as its own sub-section from first
            paint, with a resting-state line rather than a blank gap under
            the form, so the panel reads as one deliberate instrument rather
            than a prompt with an afterthought bolted underneath. */}
        <div
          id={resultsId}
          aria-live="polite"
          className="mt-8 min-w-0 border-t border-rule pt-6"
        >
          {asked === null ? (
            <p className="prose-measure text-[length:var(--step-0)] leading-relaxed text-fg-subtle">
              {IDLE_HINT}
            </p>
          ) : results.length === 0 ? (
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
