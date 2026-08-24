"use client";

import { useId, useRef, useState } from "react";
import { CornerDownLeft } from "lucide-react";
import { answer, type Answer } from "@/lib/answers";
import { heroAskCaption } from "@/content/ai-experiments";

/**
 * The hero's "Ask Thien" tab, mounted through `AskThienHeroTab.tsx`'s dynamic
 * `import()` (see that file for why it lives in its own module: this one
 * statically imports `@/lib/answers`, and that import is exactly what must
 * stay out of the hero's initial JS).
 *
 * A mini version of `AskThisSite.tsx`, not a second engine — same `answer()`
 * index, same static-only honesty, deliberately smaller in every other way:
 *
 *  - **One turn, not a thread.** Asking a new question replaces the one on
 *    screen rather than appending to a list. The full multi-turn
 *    conversation, with its own scrolling window and a "Clear conversation"
 *    control, is the Lab's `AskThisSite` — this tab links there rather than
 *    reimplementing it.
 *  - **Prose only, no Code tab.** The Lab's "answer as data" flourish earns
 *    its keep once, in the surface built to hold a second view of the same
 *    answer; a second copy of it here would just be more hero weight for a
 *    feature already trying to take up less room.
 *  - **No live mode, ever.** `AskThisSite` picks its engine from
 *    `liveModeConfigured` (computed server-side from `ASK_LLM_*`); this tab
 *    never receives that prop and never calls `/api/ask` — the Lab is the
 *    one surface allowed to be the full thing. `heroAskCaption` says so in
 *    plain language, mirroring `labIntro[0]`'s framing of the same fact.
 */

const IDLE_HINT =
  "No question asked yet. Type one below — same index as the Lab's chat, just the newest answer.";

const NOTHING_FOUND =
  "Nothing on this page answers that. Try a different question, or open the full conversation in the Lab.";

interface Turn {
  readonly question: string;
  readonly results: readonly Answer[];
}

export default function AskThienMini() {
  const fieldId = useId();
  const statusId = useId();
  const fieldRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState("");
  const [turn, setTurn] = useState<Turn | null>(null);

  function ask(question: string) {
    const trimmed = question.trim();
    if (trimmed === "") return;

    setQuery("");
    setTurn({ question: trimmed, results: answer(trimmed, 3) });

    // Same reasoning as AskThisSite.ask(): keep focus in the field itself
    // rather than wherever the triggering control was, so a follow-up needs
    // no mouse.
    fieldRef.current?.focus();
  }

  return (
    <div className="min-w-0">
      <p className="prose-measure text-[length:var(--step--1)] leading-relaxed text-fg-muted">
        {heroAskCaption}
      </p>

      <form
        className="mt-3"
        onSubmit={(event) => {
          event.preventDefault();
          ask(query);
        }}
      >
        <label htmlFor={fieldId} className="sr-only">
          Ask Thien a question about this portfolio
        </label>
        <div className="flex items-center gap-2 border border-rule bg-ground px-3 focus-within:border-accent">
          <span aria-hidden="true" className="font-mono text-[length:var(--step--1)] text-accent">
            &rsaquo;
          </span>
          <input
            id={fieldId}
            ref={fieldRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ask a question"
            aria-controls={statusId}
            className="min-h-11 w-full bg-transparent font-mono text-[length:var(--step--1)] text-fg outline-none placeholder:text-fg-subtle"
          />
          <button
            type="submit"
            className="grid h-11 w-11 shrink-0 place-items-center text-fg-muted transition-colors duration-200 hover:text-accent"
          >
            <CornerDownLeft aria-hidden="true" focusable="false" size={16} />
            <span className="sr-only">Ask</span>
          </button>
        </div>
      </form>

      {/* `role="status"` carries its own implicit `aria-live="polite"` —
          the newest answer is announced without re-reading the question the
          visitor just typed themselves. */}
      <div id={statusId} role="status" className="mt-4 min-w-0">
        {turn === null ? (
          <p className="text-[length:var(--step--1)] leading-relaxed text-fg-subtle">{IDLE_HINT}</p>
        ) : turn.results.length === 0 ? (
          <div>
            <p className="prose-measure font-mono text-[length:var(--step--1)] text-fg">
              <span aria-hidden="true" className="mr-2 text-accent">
                &rsaquo;
              </span>
              {turn.question}
            </p>
            <p className="mt-2 text-[length:var(--step--1)] leading-relaxed text-fg-muted">
              {NOTHING_FOUND}
            </p>
          </div>
        ) : (
          <div>
            <p className="prose-measure font-mono text-[length:var(--step--1)] text-fg">
              <span aria-hidden="true" className="mr-2 text-accent">
                &rsaquo;
              </span>
              {turn.question}
            </p>
            <ol role="list" aria-label="Sourced answers" className="mt-3 flex flex-col gap-3">
              {turn.results.map((result) => (
                <li key={result.text} className="border-l-2 border-accent pl-3">
                  <p className="prose-measure text-[length:var(--step--1)] leading-relaxed text-fg">
                    {result.text}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="eyebrow">{result.source}</span>
                    <a
                      href={`#${result.sectionId}`}
                      className="font-mono text-[length:var(--step--2)] text-accent underline-offset-4 hover:underline"
                    >
                      Read it in {result.sectionLabel} &rarr;
                    </a>
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <p className="mt-4 border-t border-rule pt-4">
        <a
          href="#lab"
          className="font-mono text-[length:var(--step--1)] text-accent underline-offset-4 hover:underline"
        >
          Full conversation in the Lab &rarr;
        </a>
      </p>
    </div>
  );
}
