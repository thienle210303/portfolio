import type { ReactNode } from "react";
import {
  ASK_BUTTON,
  CLEAR,
  COMPOSE_SIDE,
  HOW_LABEL,
  HOW_ROW,
  IdleThread,
  QUESTION_FIELD,
  QUESTION_INPUT,
  QUESTION_LABEL,
  QUESTION_LABEL_TEXT,
  QUESTION_PLACEHOLDER,
  QUESTION_ROW,
  SHEET,
  SheetTop,
  THREAD_SIDE,
  TRY_BUTTON,
  TRY_LABEL,
  TRY_LIST,
  TRY_ROW,
  TRY_TAG,
  WINDOW,
} from "./ask-sheet";

/**
 * The idle notepad, standing in for the chat until its chunk lands (round 25).
 *
 * A Server Component: Contact renders it and hands it to `AskLoader`, which
 * shows it while it waits and loads. So it costs the page's JavaScript
 * nothing, and it is in the server's HTML, laid out before any script runs.
 *
 * It is the chat's idle sheet built from the chat's own pieces
 * (`ask-sheet.tsx`): the blank slip, the promise, "How this answers", the
 * question line and the "or try" tags. That is why the chat landing does not
 * move the page: the two are the same height because they are the same boxes
 * holding the same words, at every width, with nothing measured (through
 * round 24 it was `--ask-room`, a min-height measured by hand at six width
 * ranges, wrong whenever a line of copy changed). `e2e/ask.spec.ts` walks the
 * widths and fails if they differ.
 *
 * It is paper with nothing live on it yet. Every part but the heading is
 * `inert` and `aria-hidden` (`data-ask-shell`) and holds no field, button or
 * link, only boxes shaped like them, so there is nothing to tab to, press or
 * hear until the real one lands in the same place. The heading is the real
 * one and stays readable throughout.
 *
 * With JavaScript off the chat never comes, so globals.css does not show the
 * shell there (`html:not([data-motion])`, the attribute layout.tsx's pre-paint
 * script stamps) and the `<noscript>` line stands alone under the heading.
 */

/** Marks a part of the idle notepad that is drawn but not live. */
const SHELL = { "data-ask-shell": "", inert: true, "aria-hidden": true } as const;

interface Props {
  /** Computed once, server-side, in `page.tsx`: it picks the promise. */
  readonly liveModeConfigured: boolean;
  /** "Ask me" and its note. */
  readonly heading?: ReactNode;
  /** The "or try" questions (`SUGGESTED_QUESTIONS`). */
  readonly suggestions: readonly string[];
}

export default function AskPlaceholder({ liveModeConfigured, heading, suggestions }: Props) {
  return (
    <div data-ask-sheet="idle" className={SHEET}>
      <div className={THREAD_SIDE}>
        <SheetTop
          heading={heading}
          liveModeConfigured={liveModeConfigured}
          clear={
            <span aria-hidden="true" className={`${CLEAR} invisible`}>
              Clear
            </span>
          }
        />
        <noscript>
          <p className="mt-3 text-[length:var(--step--1)] text-fg-muted">The chat needs JavaScript.</p>
        </noscript>
        <div {...SHELL} className={WINDOW}>
          <IdleThread liveModeConfigured={liveModeConfigured} />
        </div>
        <div {...SHELL} className={HOW_ROW}>
          {/* `Disclosure`'s closed trigger: the label, and its chevron. */}
          <div className="flex min-h-11 w-full items-center justify-between gap-4 py-2 text-fg">
            <span>
              <span className="eyebrow">{HOW_LABEL}</span>
            </span>
            <svg
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
      </div>

      <div {...SHELL} className={COMPOSE_SIDE}>
        <div className={QUESTION_ROW}>
          <div className={QUESTION_FIELD}>
            <span className={QUESTION_LABEL}>{QUESTION_LABEL_TEXT}</span>
            <div className={`${QUESTION_INPUT} flex items-center`}>
              <span className="text-fg-muted">{QUESTION_PLACEHOLDER}</span>
            </div>
          </div>
          <span className={ASK_BUTTON}>Ask</span>
        </div>
        {suggestions.length > 0 ? (
          <div className={TRY_ROW}>
            <span className={TRY_LABEL}>or try</span>
            <ul role="list" className={TRY_LIST}>
              {suggestions.map((question) => (
                <li key={question}>
                  <span className={TRY_BUTTON}>
                    <span className={TRY_TAG}>{question}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
