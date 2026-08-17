"use client";

import { useId, useState } from "react";
import { CornerDownLeft } from "lucide-react";
import { answer, SUGGESTED_QUESTIONS, type Answer } from "@/lib/answers";
import { cn } from "@/lib/cn";

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
 */

const NOTHING_FOUND =
  "Nothing on this page answers that. Everything here is drawn from what's actually written in the sections above — if it isn't there, I'd rather say so than guess.";

export default function AskThisSite() {
  const fieldId = useId();
  const resultsId = useId();
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
            announced rather than missed. */}
        <div id={resultsId} aria-live="polite" className="mt-6">
          {asked === null ? null : results.length === 0 ? (
            <p className="prose-measure text-[length:var(--step-0)] leading-relaxed text-fg-muted">
              {NOTHING_FOUND}
            </p>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
