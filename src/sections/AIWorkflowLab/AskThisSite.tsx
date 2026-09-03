"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CornerDownLeft, Loader2 } from "lucide-react";
import { answer, SUGGESTED_QUESTIONS, type Answer, type Citation } from "@/lib/answers";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Disclosure } from "@/components/ui/Disclosure";
import { Tabs } from "@/components/ui/Tabs";
import { cn } from "@/lib/cn";
import {
  answerFilename,
  answerLiteral,
  describeAnswerLiteral,
  describeLiveAnswerLiteral,
  liveAnswerLiteral,
} from "./answer-code";
import {
  SCORING_EXCERPT,
  SCORING_EXCERPT_FILENAME,
  SCORING_EXCERPT_SUMMARY,
  SCORING_MATH,
} from "./scoring-excerpt";

/**
 * "Ask this site" — a chat thread over the portfolio's own content, and the
 * AI Workflow Lab's lead feature now that the workflow explorer has retired.
 *
 * It looks unlike the sections around it on purpose. Everything else on the
 * page is a document being read; this is an instrument being operated, so it
 * gets a raised panel, a terminal-ish prompt line and answers that arrive as
 * quoted evidence rather than as prose. That contrast is the point: a visitor
 * should be able to tell at a glance that this is the one part of the page
 * that answers back.
 *
 * ## Two engines, one thread
 *
 * `liveModeConfigured` (a prop, computed once server-side in
 * `AIWorkflowLab.tsx` from `ASK_LLM_API_KEY` / `ASK_LLM_MODEL` / `ASK_LLM_URL`
 * — see `src/lib/ask-live-config.ts`) decides which engine every turn in the
 * thread uses, for the life of the page load:
 *
 *  - **Off (the default, free mode):** `answer()` from `src/lib/answers.ts`
 *    runs synchronously in the browser. No network, no key. Every answer is a
 *    verbatim string from `src/content`, shown with the source it already
 *    carried — there is no generation step, so there is nothing to
 *    hallucinate with.
 *  - **On:** the visitor's question, and only the passages `answer()`
 *    retrieves for it, are POSTed to `/api/ask`, which hands them to a real
 *    model over one plain `fetch` call. That answer is composed prose, not a
 *    quoted sentence, and the thread labels it "Live model" so the
 *    distinction is never ambiguous. When retrieval itself finds nothing,
 *    the route declines before it ever calls the model — the thread shows
 *    that decline plainly, distinct from "Live model", because no model
 *    actually ran.
 *
 * All state — the whole thread — lives in this component and nothing is
 * persisted; reloading the page starts a new conversation.
 *
 * ## The scroll window
 *
 * Round 12 (WP-K): the owner's report was literal — "if I click multiple
 * buttons it just keeps stacking up on the page" — because the thread used
 * to be an ordinary flow element, so the *page* grew by one turn's height
 * every time a question landed. `role="log"` now wraps the conversation
 * (`<ol aria-label="Conversation">` nests inside it, not the other way
 * round) with a fixed `max-h-*` and `overflow-y-auto`: a real chat-window
 * feel, and one the page's own height no longer answers to. See the JSX
 * comment at the region itself for the exact height and why. A "Clear
 * conversation" control (state only — nothing was ever persisted to begin
 * with) sits above it, visible only once there is something to clear, and
 * returns focus to the question field, the same "keep focus in hand"
 * contract every other action in this component already keeps.
 *
 * ## The second view
 *
 * An answer can also be read as the object it already is — the same strings,
 * rendered through the hero's own CodeBlock as a TypeScript literal. It is a
 * flourish, and it is built to stay one: prose is the first tab and the default,
 * the code adds no field the prose card does not already show, and it is
 * generated from the engine's own output rather than from anything new (see
 * `./answer-code.ts`). Every turn in the thread owns its own `Tabs` instance
 * and its own `CodeBlock` filename (`answerFilename`), so more than one
 * turn's Code tab can be open at once without two panels colliding.
 *
 * The shared `Tabs` primitive carries it, for two reasons beyond the keyboard
 * support it already has tested. Tabs is the exact semantic — one thing, two
 * renderings, one at a time — where a `FilterGroup` radiogroup is for narrowing
 * a set and would have to invent a per-option count to fit its API. And Tabs
 * mounts only the active panel, so the view you are not reading is genuinely
 * gone from the DOM: a screen reader is never handed the same answer twice.
 *
 * ## "How this answers"
 *
 * One more disclosure, collapsed by default so it costs nothing for a visitor
 * who never opens it: the actual scoring loop from `answer()`, hand-copied in
 * `./scoring-excerpt.ts`, the same rule restated as notation, and — when live
 * mode is on — one further paragraph naming the one thing that changes: the
 * same retrieval, handed to a model instead of read straight off the page.
 */

const NOTHING_FOUND =
  "Nothing on this page answers that. Everything here is drawn from what's actually written in the sections above — if it isn't there, I'd rather say so than guess.";

/** Shown before the first question — the thread's resting state, rather
 *  than a blank gap above the input. */
const IDLE_HINT =
  "No question asked yet. Pick one below, or type your own — the answer lands here, sourced, and linked back to the page it came from. Ask a follow-up any time; the whole conversation stays on screen.";

const LIVE_UPSTREAM_FAILED =
  "The live model didn't answer that time — nothing was sent anywhere that shouldn't have been, it just failed to respond. Try again, or ask something else.";
const LIVE_RATE_LIMITED =
  "That's enough questions for the live model for a few minutes. Static answers below still work with no limit.";
const LIVE_NOT_CONFIGURED =
  "Live mode reported itself unavailable mid-conversation. The static engine below still works.";
const LIVE_NETWORK_FAILED =
  "Couldn't reach the live model — the connection failed before an answer came back. Try again.";

interface Props {
  /** Computed once, server-side, in `AIWorkflowLab.tsx`. Never mutates for
   *  the life of the page load. */
  readonly liveModeConfigured: boolean;
}

/* -------------------------------------------------------------------------- */
/* Thread state                                                               */
/* -------------------------------------------------------------------------- */

type TurnAnswer =
  | { readonly kind: "pending" }
  | { readonly kind: "static"; readonly results: readonly Answer[] }
  | { readonly kind: "live"; readonly grounded: boolean; readonly text: string; readonly citations: readonly Citation[] }
  | { readonly kind: "failed"; readonly message: string };

interface Turn {
  readonly id: string;
  readonly question: string;
  readonly answer: TurnAnswer;
}

/** The API's own response shape (`src/app/api/ask/route.ts`'s `AskApiResponse`),
 *  mirrored locally rather than imported — a client component importing from
 *  a Route Handler module would pull a `"nodejs"`-runtime file into the
 *  browser bundle's module graph, even for a type-only import in most
 *  bundler configurations. Kept in sync by `tests/api/ask.test.ts` pinning
 *  the route's real response shapes. */
type AskApiResponse =
  | { readonly ok: true; readonly grounded: true; readonly text: string; readonly citations: readonly Citation[] }
  | { readonly ok: true; readonly grounded: false; readonly text: string }
  | { readonly ok: false; readonly reason: "invalid" | "not-configured" | "rate-limited" | "upstream-failed" };

function isAskApiResponse(value: unknown): value is AskApiResponse {
  return typeof value === "object" && value !== null && "ok" in value;
}

/** Same check `ContactForm.tsx` runs — `prefers-reduced-motion` skips the
 *  scroll window's smooth-scrolling and jumps straight to the newest turn
 *  instead. */
function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type AskFailureReason = Extract<AskApiResponse, { ok: false }>["reason"];

function failureMessage(reason: AskFailureReason): string {
  switch (reason) {
    case "rate-limited":
      return LIVE_RATE_LIMITED;
    case "not-configured":
      return LIVE_NOT_CONFIGURED;
    case "invalid":
    case "upstream-failed":
    default:
      return LIVE_UPSTREAM_FAILED;
  }
}

/** Last few live turns, as the compact shape `/api/ask` accepts for
 *  conversational context. Static-mode turns and declines carry nothing a
 *  model composed, so they are left out rather than sent as if they were. */
function recentHistory(turns: readonly Turn[]): Array<{ question: string; answer: string }> {
  return turns
    .filter((turn): turn is Turn & { answer: { kind: "live"; grounded: true; text: string } } =>
      turn.answer.kind === "live" && turn.answer.grounded,
    )
    .slice(-3)
    .map((turn) => ({ question: turn.question, answer: turn.answer.text }));
}

/* -------------------------------------------------------------------------- */
/* Answer views                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The prose reading: quoted evidence, its source, and a way back to it.
 *
 * `role="list"` is required, not decorative: Tailwind's preflight sets
 * `list-style: none` on every `ol`/`ul`, and Chromium (matching WebKit)
 * drops the implicit ARIA `list` role the moment native markers are gone,
 * unless a role is stated explicitly — the same fix every other list in this
 * codebase already carries (see `CaseStudy.tsx`'s `ProseList`). Without it,
 * `aria-label="Sourced answers"` has no role to attach an accessible name
 * to, and `getByRole("list", { name: "Sourced answers" })` — real assistive
 * tech's exact query shape, and `e2e/ask.spec.ts`'s — finds nothing.
 */
function ProseAnswers({ results }: { readonly results: readonly Answer[] }) {
  return (
    <ol role="list" aria-label="Sourced answers" className="flex flex-col gap-5">
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

/** The composed reading for a grounded live answer: the model's prose, then
 *  exactly the passages it was allowed to use — the same shape a static
 *  answer's source line carries, just gathered under one paragraph instead
 *  of quoting each passage verbatim. */
function LiveProseAnswer({ text, citations }: { readonly text: string; readonly citations: readonly Citation[] }) {
  return (
    <div>
      <p className="prose-measure border-l-2 border-accent pl-4 text-[length:var(--step-0)] leading-relaxed text-fg">
        {text}
      </p>
      {citations.length > 0 ? (
        <div className="mt-4">
          <p className="eyebrow">Grounded in</p>
          <ul role="list" aria-label="Grounded in" className="prose-measure mt-2 flex flex-col gap-2">
            {citations.map((citation) => (
              <li key={citation.text} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[length:var(--step--1)] text-fg-muted">{citation.source}</span>
                <a
                  href={`#${citation.sectionId}`}
                  className="font-mono text-[length:var(--step--1)] text-accent underline-offset-4 hover:underline"
                >
                  Read it in {citation.sectionLabel} &rarr;
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** A component rather than an inline element so the literal is only built
 *  when this tab is the one being rendered. */
function CodeAnswer({
  question,
  results,
  filename,
}: {
  readonly question: string;
  readonly results: readonly Answer[];
  readonly filename: string;
}) {
  return (
    <div>
      <p className="eyebrow">This answer, as data</p>
      <p className="prose-measure mt-2 text-[length:var(--step--1)] leading-relaxed text-fg-muted">
        The exact sentences from the Prose tab, written out as the TypeScript object they already
        are.
      </p>
      <div className="mt-4">
        <CodeBlock
          code={answerLiteral(question, results)}
          filename={filename}
          summary={describeAnswerLiteral(results)}
        />
      </div>
    </div>
  );
}

function LiveCodeAnswer({
  question,
  grounded,
  text,
  citations,
  filename,
}: {
  readonly question: string;
  readonly grounded: boolean;
  readonly text: string;
  readonly citations: readonly Citation[];
  readonly filename: string;
}) {
  return (
    <div>
      <p className="eyebrow">This answer, as data</p>
      <p className="prose-measure mt-2 text-[length:var(--step--1)] leading-relaxed text-fg-muted">
        What the live model returned and what it was grounded in, written out as the TypeScript
        object they already are.
      </p>
      <div className="mt-4">
        <CodeBlock
          code={liveAnswerLiteral(question, grounded, text, citations)}
          filename={filename}
          summary={describeLiveAnswerLiteral(grounded, citations)}
        />
      </div>
    </div>
  );
}

/**
 * The honest mechanism, collapsed by default and shown once above the
 * thread rather than per turn — it explains the mechanism, not a result.
 */
function HowThisAnswers({ id, liveModeConfigured }: { readonly id: string; readonly liveModeConfigured: boolean }) {
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
          language model on its own: there is no embedding and no generation step in this part —
          the excerpt below is the actual mechanism, not a retelling of one.
        </p>
        {liveModeConfigured ? (
          <p className="mt-3 text-[length:var(--step--1)] leading-relaxed text-fg-muted">
            Live mode changes exactly one thing: the same ranked passages are handed to a real
            model instead of quoted straight onto the page. The model sees only what retrieval
            found — nothing else about this site, and nothing from outside it — and is told to
            decline rather than guess when the passages don&rsquo;t actually answer the question.
          </p>
        ) : null}
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

/* -------------------------------------------------------------------------- */
/* One turn                                                                    */
/* -------------------------------------------------------------------------- */

function TurnItem({
  turn,
  turnNumber,
  viewId,
}: {
  readonly turn: Turn;
  readonly turnNumber: number;
  readonly viewId: string;
}) {
  const idPrefix = `${viewId}-answer-view-${turn.id}`;
  const filename = answerFilename(turnNumber);

  return (
    <li className="min-w-0 border-t border-rule pt-6 first:border-t-0 first:pt-0">
      <p className="prose-measure font-mono text-[length:var(--step-0)] text-fg">
        <span aria-hidden="true" className="mr-2 text-accent">
          &rsaquo;
        </span>
        {turn.question}
      </p>

      <div className="mt-4">
        {turn.answer.kind === "pending" ? (
          <p className="flex items-center gap-2 text-[length:var(--step-0)] text-fg-muted">
            <Loader2 aria-hidden="true" focusable="false" size={16} className="animate-spin motion-reduce:animate-none" />
            Asking the live model&hellip;
          </p>
        ) : turn.answer.kind === "failed" ? (
          <p className="prose-measure border-l-2 border-rule pl-4 text-[length:var(--step-0)] leading-relaxed text-fg-muted">
            {turn.answer.message}
          </p>
        ) : turn.answer.kind === "static" ? (
          turn.answer.results.length === 0 ? (
            <p className="prose-measure text-[length:var(--step-0)] leading-relaxed text-fg-muted">
              {NOTHING_FOUND}
            </p>
          ) : (
            <Tabs
              label="Answer view"
              idPrefix={idPrefix}
              tabs={[
                { id: "prose", label: "Prose", panel: <ProseAnswers results={turn.answer.results} /> },
                {
                  id: "code",
                  label: "Code",
                  panel: (
                    <CodeAnswer question={turn.question} results={turn.answer.results} filename={filename} />
                  ),
                },
              ]}
            />
          )
        ) : !turn.answer.grounded ? (
          <div>
            <p className="mb-2">
              <span className="eyebrow">Declined — nothing to ground it in</span>
            </p>
            <p className="prose-measure text-[length:var(--step-0)] leading-relaxed text-fg-muted">
              {turn.answer.text}
            </p>
          </div>
        ) : (
          <div>
            <p className="mb-2">
              <span className="eyebrow text-accent">Live model</span>
            </p>
            <Tabs
              label="Answer view"
              idPrefix={idPrefix}
              tabs={[
                {
                  id: "prose",
                  label: "Prose",
                  panel: <LiveProseAnswer text={turn.answer.text} citations={turn.answer.citations} />,
                },
                {
                  id: "code",
                  label: "Code",
                  panel: (
                    <LiveCodeAnswer
                      question={turn.question}
                      grounded={turn.answer.grounded}
                      text={turn.answer.text}
                      citations={turn.answer.citations}
                      filename={filename}
                    />
                  ),
                },
              ]}
            />
          </div>
        )}
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* The thread                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The thread, hoisted out of the component on purpose.
 *
 * This component's only mount is now the hero code artifact's "Ask Thien"
 * tab, and `Tabs` (src/components/ui/Tabs.tsx) renders only the active
 * panel — so looking at `builder.ts` and coming back is a real unmount and
 * remount. Component state would be thrown away by that, which would make
 * the tab strip feel like it eats conversations. Module scope survives it,
 * and still resets on a page load, which is the honesty contract this
 * component already had: nothing is persisted anywhere.
 */
let cachedTurns: readonly Turn[] = [];
let cachedLastAsked: string | null = null;

/** Empties the module-scoped thread. The component's own "Clear
 *  conversation" control calls this; tests call it between cases. */
export function clearThreadCache(): void {
  cachedTurns = [];
  cachedLastAsked = null;
}

export default function AskThisSite({ liveModeConfigured }: Props) {
  const fieldId = useId();
  const threadId = useId();
  const viewId = useId();
  const nextTurnId = useRef(0);
  const fieldRef = useRef<HTMLInputElement | null>(null);
  /** The scroll window itself — see the scroll-to-bottom effect below. */
  const logRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState("");
  const [turns, setTurns] = useState<readonly Turn[]>(() => cachedTurns);
  const [lastAsked, setLastAsked] = useState<string | null>(() => cachedLastAsked);

  // Mirror every thread change into module scope, so the next mount starts
  // from where this one left off. Deliberately an effect rather than a write
  // inside `ask()`: `updateTurn` and `askLive` both mutate turns too, and
  // this way there is exactly one place that has to stay in sync.
  useEffect(() => {
    cachedTurns = turns;
    cachedLastAsked = lastAsked;
  }, [turns, lastAsked]);

  const isBusy = turns.some((turn) => turn.answer.kind === "pending");

  // Runs after every commit that touches `turns` — a turn being added *and*
  // a pending turn resolving into its answer both replace the array, so an
  // answer that lands taller than the question it followed still ends up
  // fully in view rather than clipped at the scroll window's edge from the
  // moment the question was asked.
  //
  // `logRef.current.scrollTo(...)` rather than `lastTurn.scrollIntoView(...)`
  // on purpose, and this is not a stylistic choice: `scrollIntoView` walks
  // *every* scrollable ancestor in the containing-block chain, including the
  // page itself, and — verified directly in a real browser, not assumed —
  // Chromium's algorithm for a target inside a nested `overflow:auto` box
  // will happily satisfy "bring it into view" by scrolling the *page* by
  // several thousand pixels instead of (or as well as) the inner box,
  // whenever the inner box alone wouldn't make the target visible in the
  // outer viewport. That is exactly the failure mode this window exists to
  // end: a click that yanks the whole page around. `Element.scrollTo()` is
  // scoped to the single scrolling box it is called on and never touches an
  // ancestor, so the page's own scroll position is now untouched by asking
  // a question, full stop. Smooth under ordinary motion, instant (`"auto"`)
  // under `prefers-reduced-motion`.
  useEffect(() => {
    if (turns.length === 0) return;
    const node = logRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [turns]);

  function handleClear() {
    clearThreadCache();
    setTurns([]);
    setLastAsked(null);
    // Nothing was persisted to begin with, so "clear" is just resetting this
    // component's own state — but focus still needs somewhere sensible to
    // land, and the question field is exactly where a visitor who just
    // cleared the thread would want to start typing again.
    fieldRef.current?.focus();
  }

  // Writes through the module cache rather than through `setTurns`'s updater
  // callback, and that is load-bearing, not a style choice: this is the
  // resolution of `askLive`'s fetch, which can land long after a tab switch
  // has unmounted this instance. A `setState` dispatched on an unmounted
  // component in React 18+ is silently dropped before the fiber tree is ever
  // re-rendered, which means an updater *function* passed to it is never
  // invoked either — so a version of this that computed the next array from
  // `prev` inside `setTurns(prev => ...)` would only ever run while mounted,
  // and a live answer that arrives after the visitor has looked away would
  // vanish, leaving that turn stuck on its "pending" spinner forever once
  // they switch back. `cachedTurns` is instead treated as the one
  // authoritative copy: it is always current (the effect below keeps it in
  // step with `turns` on every render this component is mounted for), so
  // computing the next value from it and assigning back to it works whether
  // or not a component instance exists to receive it. `setTurns` is still
  // called after, as a no-op if this instance is gone and a real update if
  // it is still mounted and watching.
  function updateTurn(id: string, next: TurnAnswer) {
    cachedTurns = cachedTurns.map((turn) => (turn.id === id ? { ...turn, answer: next } : turn));
    setTurns(cachedTurns);
  }

  async function askLive(id: string, question: string, historySoFar: readonly Turn[]) {
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history: recentHistory(historySoFar) }),
      });

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        updateTurn(id, { kind: "failed", message: LIVE_UPSTREAM_FAILED });
        return;
      }

      if (!isAskApiResponse(data)) {
        updateTurn(id, { kind: "failed", message: LIVE_UPSTREAM_FAILED });
        return;
      }

      if (!data.ok) {
        updateTurn(id, { kind: "failed", message: failureMessage(data.reason) });
        return;
      }

      updateTurn(
        id,
        data.grounded
          ? { kind: "live", grounded: true, text: data.text, citations: data.citations }
          : { kind: "live", grounded: false, text: data.text, citations: [] },
      );
    } catch {
      updateTurn(id, { kind: "failed", message: LIVE_NETWORK_FAILED });
    }
  }

  function ask(question: string) {
    const trimmed = question.trim();
    if (trimmed === "" || isBusy) return;

    setQuery("");
    setLastAsked(trimmed);

    const id = `turn-${nextTurnId.current}`;
    nextTurnId.current += 1;

    if (!liveModeConfigured) {
      const results = answer(trimmed);
      setTurns((prev) => [...prev, { id, question: trimmed, answer: { kind: "static", results } }]);
    } else {
      // The side effect (the fetch) happens outside the state updater, using
      // `turns` as captured by this render — a state updater function must
      // stay pure, or React (StrictMode's double-invoke, or a future
      // concurrent-render replay) can fire the network call twice for one
      // question. `isBusy` already prevents a second `ask()` from running
      // while one is in flight, so `turns` here is exactly the history that
      // existed before this question.
      const historySoFar = turns;
      setTurns((prev) => [...prev, { id, question: trimmed, answer: { kind: "pending" as const } }]);
      void askLive(id, trimmed, historySoFar);
    }

    // Keep focus in the input rather than wherever the triggering control
    // was (a suggestion button, or the field itself after submit) — a chat
    // thread invites a follow-up, and the visitor should be able to type one
    // without reaching for the mouse.
    fieldRef.current?.focus();
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
        {liveModeConfigured ? (
          <span className="ml-auto font-mono text-[length:var(--step--2)] uppercase tracking-[0.08em] text-accent">
            Live mode
          </span>
        ) : null}
      </div>

      <div className="p-4 sm:p-6">
        <p className="prose-measure text-[length:var(--step-0)] leading-relaxed text-fg-muted">
          {liveModeConfigured
            ? "Ask about the work, his background, or how he thinks. Retrieval runs the same way it always does; a live model composes the answer from exactly what it found, and says so."
            : "Every answer below is a sentence lifted straight out of this page, shown with where it came from. No model, nothing generated — if the answer isn’t written somewhere on the site, you get told so."}
        </p>

        <div className="mt-4">
          <HowThisAnswers id={`${viewId}-how-this-answers`} liveModeConfigured={liveModeConfigured} />
        </div>

        <div className="mt-8 border-t border-rule pt-6">
          {turns.length > 0 ? (
            <div className="flex items-center justify-between gap-4">
              <p className="eyebrow">Conversation</p>
              <button
                type="button"
                onClick={handleClear}
                className="min-h-11 px-2 font-mono text-[length:var(--step--1)] text-fg-muted transition-colors duration-200 hover:text-accent"
              >
                Clear conversation
              </button>
            </div>
          ) : null}

          {/*
            The scroll window itself. `max-h-[22rem]` (352px) is sized to
            what one turn actually takes up at this type scale: the question
            line (~step-0, one row) plus its `mt-4`, the Prose/Code tablist
            (`min-h-11` row plus its own `pt-6`), and one short answer — a
            couple of lines of prose plus its source/link line — run close
            to 210px end to end. 352px comfortably shows the newest turn in
            full plus roughly half of the one above it: enough to read as a
            conversation rather than a single flashcard, and short enough
            that the thread never grows past a fixed patch of the page no
            matter how many questions get asked — the owner's report this
            round was literal: "if I click multiple buttons it just keeps
            stacking up on the page".

            `role="log"` is the ARIA role built for a region whose new
            content is worth announcing (`aria-live="polite"`, same reason
            the whole thread carried it before this became scrollable) but
            whose already-read content a screen reader should not repeat.
            `tabIndex={0}` only once there is something to scroll — an idle,
            empty log is just the hint paragraph below, with nothing to
            reach by keyboard that isn't already reachable — and gives the
            region its own stop in the tab order without trapping focus:
            Tab still moves on to whatever a turn's own content makes
            focusable (a source link, an "Answer view" tab), then past the
            region entirely to the compose area below, same as any other
            element in normal document order. `id={threadId}` keeps the
            input's `aria-controls` pointed at the region it actually
            updates, now that "the rest of the page below the form" is no
            longer an accurate description of it.
          */}
          <div
            ref={logRef}
            id={threadId}
            role="log"
            aria-label="Conversation thread"
            aria-live="polite"
            tabIndex={turns.length > 0 ? 0 : undefined}
            className={cn(
              "mt-4 min-w-0 overflow-y-auto overscroll-contain",
              turns.length > 0 && "max-h-[22rem]",
            )}
          >
            {turns.length === 0 ? (
              <p className="prose-measure text-[length:var(--step-0)] leading-relaxed text-fg-subtle">
                {IDLE_HINT}
              </p>
            ) : (
              <ol role="list" aria-label="Conversation" className="flex flex-col gap-6">
                {turns.map((turn, index) => (
                  <TurnItem key={turn.id} turn={turn} turnNumber={index + 1} viewId={viewId} />
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* The compose area: quick-start suggestions and the input, together
            at the bottom of the panel — a visitor arriving fresh sees them
            immediately below the idle hint, and a visitor mid-thread finds
            them exactly where a chat app keeps its input. */}
        <div className="mt-8 border-t border-rule pt-6">
          <p className="eyebrow">Try asking</p>
          <ul role="list" aria-label="Try asking" className="mt-3 flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((question) => (
              <li key={question}>
                <button
                  type="button"
                  onClick={() => ask(question)}
                  disabled={isBusy}
                  className={cn(
                    "min-h-11 border border-rule px-3 py-1.5 text-left text-[length:var(--step--1)]",
                    "text-fg-muted transition-colors duration-200",
                    "hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50",
                    lastAsked === question && "border-accent text-accent",
                  )}
                >
                  {question}
                </button>
              </li>
            ))}
          </ul>

          <form
            className="mt-4"
            onSubmit={(event) => {
              event.preventDefault();
              ask(query);
            }}
          >
            <label htmlFor={fieldId} className="sr-only">
              Ask a question about this portfolio
            </label>
            <div className="flex items-center gap-2 border border-rule bg-ground px-3 focus-within:border-accent">
              <span aria-hidden="true" className="font-mono text-[length:var(--step-0)] text-accent">
                &rsaquo;
              </span>
              {/* Not `disabled` while a live request is in flight, on purpose:
                  a disabled input is auto-blurred by the browser, which would
                  throw focus out of the visitor's hands mid-request — exactly
                  what "keep focus in hand" means to avoid. `ask()` itself
                  already no-ops while `isBusy`, so Enter here is inert rather
                  than queuing a second question; the submit button below
                  still shows the disabled state visually. */}
              <input
                id={fieldId}
                ref={fieldRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={turns.length === 0 ? "or ask your own" : "ask a follow-up"}
                aria-controls={threadId}
                className="min-h-12 w-full bg-transparent font-mono text-[length:var(--step-0)] text-fg outline-none placeholder:text-fg-subtle"
              />
              <button
                type="submit"
                disabled={isBusy}
                className="grid h-11 w-11 shrink-0 place-items-center text-fg-muted transition-colors duration-200 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CornerDownLeft aria-hidden="true" focusable="false" size={17} />
                <span className="sr-only">Ask</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
