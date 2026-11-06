import type { ReactNode } from "react";

/**
 * The Ask's sheet of paper, as layout only (round 25).
 *
 * Two files draw the same idle notepad: `AskThisSite` (the chat, a lazy chunk)
 * and `AskLoader` (what holds its place until that chunk lands). They used to
 * agree by a table of hand-measured min-heights, one per width range, which
 * went stale whenever the promise or a suggestion was reworded. Now both build
 * the sheet from the pieces in this file, so the placeholder is as tall as the
 * idle chat because it is the same boxes holding the same words, at every
 * width, with nothing measured (`e2e/ask.spec.ts` walks the widths and fails if
 * the two ever differ).
 *
 * Nothing here may import the engine (`@/lib/answers`) or anything else the
 * chat's chunk owns: this module rides in Contact's own JavaScript. It has no
 * state, no effects and no handlers.
 */

/** Shown before the first question: the thread's resting state. */
export const IDLE_HINT = "No question asked yet.";

/** The thread's resting answer: what I promise about every answer. */
export const PROMISE =
  "Pick a question or ask your own. Every answer is something I’ve written here, as written or a few lines of it joined into one, with where it came from. No model, nothing generated. If I haven’t written it down, I’ll say so.";
export const PROMISE_LIVE =
  "Pick a question or ask your own. I find what I’ve written here the same way as always; a live model then writes the answer from exactly that, and says so.";

/** The sheet. From 1024 the notepad and the compose side stand side by side,
 *  the notepad a little the wider (it holds sentences, the other side a line
 *  and four tags); below, they stack in that order. */
export const SHEET = "grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]";
export const THREAD_SIDE = "min-w-0 px-5 pt-[18px] pb-5 sm:px-[26px] lg:border-r lg:border-dashed lg:border-rule";
export const COMPOSE_SIDE = "flex min-w-0 flex-col gap-3 bg-ground px-5 pt-[18px] pb-5 sm:px-[26px]";

/** The notepad's window. Idle it is as tall as what is written on it; with a
 *  turn in it (`data-open`) it is one fixed height (`.ask-window`, globals.css).
 *  It reaches 8px past the column either side so a tilted clipping, its tape
 *  and its tab are never cut by the edge. */
export const WINDOW = "ask-window relative -mx-2 mt-2 min-w-0 px-2";

/** "How this answers": the row under the notepad (a `Disclosure` in the chat). */
export const HOW_ROW = "mt-4";
export const HOW_LABEL = "How this answers";

/** The question line and the Ask beside it. */
export const QUESTION_ROW = "flex items-end gap-3";
export const QUESTION_FIELD = "flex min-w-0 flex-1 flex-col gap-0.5";
export const QUESTION_LABEL = "font-mono text-[12px] text-fg-muted";
export const QUESTION_LABEL_TEXT = "Your question";
export const QUESTION_INPUT =
  "min-h-11 w-full min-w-0 border-0 border-b-[1.5px] border-fg bg-transparent px-0.5 text-[16px] text-fg placeholder:text-fg-muted";
export const QUESTION_PLACEHOLDER = "Ask about my work";
/** Button's `secondary` recipe by hand, squared like the postcard's Send: that
 *  is Contact's one primary control, and `--accent` is for links, values and
 *  annotation, not a fill (round 22). */
export const ASK_BUTTON =
  "inline-flex h-11 shrink-0 items-center rounded-[3px] border border-rule bg-transparent px-[22px] text-[15px] font-semibold text-fg";

/** "or try", and the questions as paper tags. The paper is a span inside the
 *  button: a clipped element would clip its own focus ring. The button keeps a
 *  44px target; the tag is 32px to the eye. */
export const TRY_ROW = "flex flex-wrap items-center gap-x-2 gap-y-1";
export const TRY_LABEL = "font-serif text-[14px] text-fg-muted italic";
export const TRY_LIST = "ask-try contents";
export const TRY_BUTTON = "group inline-flex min-h-11 items-center text-left";
export const TRY_TAG = "ask-tag inline-flex min-h-8 items-center py-1 pr-3 pl-[22px] text-[13.5px] text-fg";

/** "Clear", top right of the notepad: always laid out (round 22), so the
 *  heading beside it wraps the same before and after the first question. */
export const CLEAR = "min-h-11 shrink-0 px-1 font-mono text-[12px] text-fg-muted";

/** The notepad's top line: "Ask me" and its note, Clear at the far end, and
 *  under them the live-mode label when a model is answering. */
export function SheetTop({
  heading,
  clear,
  liveModeConfigured,
}: {
  readonly heading: ReactNode;
  readonly clear: ReactNode;
  readonly liveModeConfigured: boolean;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-x-3">
        <div className="min-w-0 pt-2.5">{heading}</div>
        {clear}
      </div>
      {liveModeConfigured ? (
        <p className="font-mono text-[12px] tracking-[0.08em] text-accent">Live mode</p>
      ) : null}
    </>
  );
}

/** "I said": the mono label over every answer, annotation in `--accent`. A
 *  paragraph of its own, so the words are exactly "I said". */
export function Said({ children }: { readonly children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2.5">
      <p className="font-mono text-[12px] text-accent">I said</p>
      {children}
    </div>
  );
}

/**
 * Your question as a ticket stub: a perforated stub on the left numbered by
 * the turn's place in the thread (the same count as `answer-N.ts`), your
 * words in the hand of the tags. It sits to the right, on the side it was
 * handed over from, in the compose side's tint. The number is the stub's, not
 * news: it is hidden from assistive tech, which hears "you asked" and the
 * question.
 */
export function QuestionSlip({ number, children }: { readonly number?: number; readonly children: ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="ask-slip-lift max-w-[min(100%,26rem)]">
        <p className="ask-slip flex min-w-0 bg-ground">
          <span aria-hidden="true" className="ask-slip-stub font-mono text-[12px] leading-[1.15] text-fg-muted">
            No.
            <br />
            {number === undefined ? "––" : String(number).padStart(2, "0")}
          </span>
          <span className="flex min-w-0 flex-col py-2 pr-4 pl-3">
            <span className="font-mono text-[12px] tracking-(--tracking-caps) text-fg-muted uppercase">you asked</span>
            {children}
          </span>
        </p>
      </div>
    </div>
  );
}

/** The notepad before anything is asked: a blank slip, and the promise written
 *  on ruled lines under "I said". */
export function IdleThread({ liveModeConfigured }: { readonly liveModeConfigured: boolean }) {
  return (
    <div className="pt-2">
      <QuestionSlip>
        <span className="font-serif text-[17px] leading-snug text-fg-muted italic">{IDLE_HINT}</span>
      </QuestionSlip>
      <div className="mt-2">
        <Said />
        <p className="ask-lined mt-1 font-serif text-[17px] leading-7 text-fg italic">
          {liveModeConfigured ? PROMISE_LIVE : PROMISE}
        </p>
      </div>
    </div>
  );
}
