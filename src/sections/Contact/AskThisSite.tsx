"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
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
 * "Ask this site" — a chat thread over the portfolio's own content. Through
 * round 15 this lived as a static import inside the AI Workflow Lab section;
 * rounds 16 and 17 put it behind an "Ask Thien" tab in the hero's code
 * artifact (deleted in round 20); since round 18
 * it lives in Contact, under "Ask me" (`#ask`), because a visitor
 * asking the record a question is making contact with less effort. Either
 * way it is reached by a dynamic `import()` (see `AskLoader.tsx`), so the
 * chat engine never rides along in the page's initial JavaScript.
 *
 * Round 21 lays it out as the postcard board's strip, two halves on one
 * sheet of paper: on the left, the heading `AskLoader` hands down and the
 * thread, each turn a "you asked / I said" pair with the answer's source; on
 * the right, the question line, a round Ask and "or try" questions as small
 * paper tags. Below 1024px the halves stack in that order.
 *
 * ## Two engines, one thread
 *
 * `liveModeConfigured` (a prop, computed once server-side in `page.tsx` from
 * `ASK_LLM_API_KEY` / `ASK_LLM_MODEL` / `ASK_LLM_URL` — see
 * `src/lib/ask-live-config.ts`) decides which engine every turn in the
 * thread uses, for the life of the page load:
 *
 *  - **Off (the default, free mode):** `answer()` from `src/lib/answers.ts`
 *    runs synchronously in the browser. No network, no key. Every answer is
 *    a string the content layer produces — an authored field as written or
 *    a mechanical join of a record's fields — shown with its source. There is no generation step, so there is nothing to
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
 * The whole thread is component state, `useState` in this very component —
 * but since round 16 it is mirrored into a module-scoped cache (see
 * `threadCache` below) so that an unmount and remount — today, a client-side
 * trip to `/resume` and back — does not throw the conversation away. Nothing
 * is ever sent anywhere to persist it: a hard reload of the page still
 * starts a new conversation, exactly as it always did. See the doc comment on
 * `threadCache` for what does and does not survive, and why.
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
 * rendered through the same CodeBlock the hero uses, as a TypeScript literal.
 * It is a flourish, and it is built to stay one: prose is the first tab and
 * the default, the code adds no field the prose card does not already show,
 * and it is generated from the engine's own output rather than from anything
 * new (see `./answer-code.ts`). Every turn in the thread owns its own `Tabs` instance
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

const NOTHING_FOUND = "I haven’t written anything here that answers that, so I’d rather say so than guess.";

/** Shown before the first question — the thread's resting state, rather
 *  than a blank gap above the input. */
const IDLE_HINT = "No question asked yet.";

/** The thread's resting answer: what I promise about every answer. */
const PROMISE =
  "Pick a question or ask your own. Every answer is something I’ve written here, as written or a few lines of it joined into one, with where it came from. No model, nothing generated. If I haven’t written it down, I’ll say so.";
const PROMISE_LIVE =
  "Pick a question or ask your own. I find what I’ve written here the same way as always; a live model then writes the answer from exactly that, and says so.";

const LIVE_UPSTREAM_FAILED =
  "The live model didn't answer that time — nothing was sent anywhere that shouldn't have been, it just failed to respond. Try again, or ask something else.";
const LIVE_RATE_LIMITED =
  "That's enough questions for the live model for a few minutes. Static answers below still work with no limit.";
const LIVE_NOT_CONFIGURED =
  "Live mode reported itself unavailable mid-conversation. The static engine below still works.";
const LIVE_NETWORK_FAILED =
  "Couldn't reach the live model — the connection failed before an answer came back. Try again.";

interface Props {
  /** Computed once, server-side, in `page.tsx`. Never mutates for the life
   *  of the page load. */
  readonly liveModeConfigured: boolean;
  /** "Ask me" and its note, rendered on the server by Contact and handed
   *  down through `AskLoader`, so it shows before the chat arrives. */
  readonly heading?: ReactNode;
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

/** `prefers-reduced-motion` skips the
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
 * ## Why the link does not say "Read it in …"
 *
 * It used to, and that was a claim the corpus cannot keep. A document's
 * `sectionId` promises that the named section renders **the subject** the quoted
 * sentence belongs to — the role, the project, the stop — not that the sentence
 * itself is printed there, and for 38 of the 54 career and education documents it
 * is not (the measurement and the reason are on `Document.sectionId` in
 * `src/lib/answer-corpus.ts`). "Read **it** in Journey" names the sentence, so on
 * those answers the product was promising something the contract had already
 * disowned.
 *
 * "More on this in …" is true of all three cases this component renders: a
 * passage whose sentence is in the section it names, a passage whose subject is
 * there but whose sentence is not, and a passage with no section at all — which
 * renders no link, because there is nothing honest to point at. Both call sites
 * below use the same words for the same reason.
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
    <ol role="list" aria-label="Sourced answers" className="flex flex-col gap-3">
      {results.map((result) => (
        <li key={result.text}>
          <p className="text-[15px] leading-[1.45] text-fg">{result.text}</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono text-[11.5px] text-fg-muted">
              from: <span>{result.source}</span>
            </span>
            {result.sectionId !== undefined && result.sectionLabel !== undefined ? (
              <a
                href={`#${result.sectionId}`}
                className="font-mono text-[11.5px] text-accent underline underline-offset-4 hover:decoration-2"
              >
                More on this in {result.sectionLabel} &rarr;
              </a>
            ) : null}
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
      <p className="text-[15px] leading-[1.45] text-fg">{text}</p>
      {citations.length > 0 ? (
        <div className="mt-4">
          <p className="eyebrow">Grounded in</p>
          <ul role="list" aria-label="Grounded in" className="prose-measure mt-2 flex flex-col gap-2">
            {citations.map((citation) => (
              <li key={citation.text} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[length:var(--step--1)] text-fg-muted">{citation.source}</span>
                {citation.sectionId !== undefined && citation.sectionLabel !== undefined ? (
                  <a
                    href={`#${citation.sectionId}`}
                    className="font-mono text-[length:var(--step--1)] text-accent underline-offset-4 hover:underline"
                  >
                    More on this in {citation.sectionLabel} &rarr;
                  </a>
                ) : null}
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
            found — nothing else about me, and nothing from outside this page — and is told to
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

/** "you asked" / "I said": the mono labels down the left of every turn. */
const TURN_LABEL = "font-mono text-[12px] text-fg-muted";

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
    <li className="grid min-w-0 grid-cols-[4.75rem_minmax(0,1fr)] items-baseline gap-y-1.5 border-t border-dashed border-rule pt-4 first:border-t-0 first:pt-0">
      <span className={TURN_LABEL}>you asked</span>
      <p className="text-[15px] font-semibold text-fg">{turn.question}</p>
      <span className={`${TURN_LABEL} text-accent`}>I said</span>

      <div className="min-w-0">
        {turn.answer.kind === "pending" ? (
          <p className="flex items-center gap-2 text-[15px] text-fg-muted">
            <Loader2 aria-hidden="true" focusable="false" size={16} className="animate-spin motion-reduce:animate-none" />
            Asking the live model&hellip;
          </p>
        ) : turn.answer.kind === "failed" ? (
          <p className="text-[15px] leading-[1.45] text-fg-muted">{turn.answer.message}</p>
        ) : turn.answer.kind === "static" ? (
          turn.answer.results.length === 0 ? (
            <p className="text-[15px] leading-[1.45] text-fg-muted">{NOTHING_FOUND}</p>
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
            <p className="text-[15px] leading-[1.45] text-fg-muted">{turn.answer.text}</p>
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
 * Through round 17 this component's only mount was the "Ask Thien" tab of the
 * hero code artifact (deleted in round 20), and `Tabs` (src/components/ui/Tabs.tsx) renders only the
 * active panel — so looking at another tab and coming back was a real
 * unmount and remount, and component state alone would have eaten the
 * conversation. Since round 18 it mounts once, in Contact's `#ask`, and
 * stays mounted for as long as the home page is; the case that still
 * unmounts it is the one below. Module scope survives it.
 *
 * What that module scope does and does not survive is worth being exact
 * about, because it is not simply "a page load": a hard reload (typing the
 * URL again, hitting the browser's reload button) tears down the whole JS
 * module graph and does clear it — a fresh conversation, same as always.
 * But `/` and `/resume` link to each other with `next/link`
 * (`BusinessCard.tsx`'s "Résumé", `resume/page.tsx`), and the App Router's client-side
 * navigation between two routes in the same build does *not* reload the
 * page or reset the webpack module registry — so `threadCache` (and
 * whatever conversation is in it) survives a `/` → `/resume` → `/` round
 * trip intact. That is a deliberate trade, not an oversight: treating a
 * same-build route change as a fresh session would mean re-fetching and
 * re-evaluating this module's own dynamically-imported chunk for no reason
 * other than the visitor glanced at the résumé, and the thread is transient
 * scratch state, not anything sensitive, so there is nothing at risk in
 * letting it ride along.
 *
 * This repo's lint config (`react-hooks/globals`, `react-hooks/immutability`
 * — the React Compiler's rules) refuses to let component or hook *body* code
 * touch a module-scoped value directly, because that is a side effect whose
 * timing the render model no longer controls once the compiler may memoize
 * or reorder things. An effect body is a different story — it already runs
 * outside that model, on its own schedule, which is why the thread-mirroring
 * effect a little further down is allowed to assign into
 * `threadCache.turns` and `threadCache.lastAsked` directly. `updateTurn`,
 * below, is the case the linter actually blocks: a plain function invoked
 * from component-body event handlers, but one that also needs to keep
 * writing long after this component has unmounted, resolving `askLive`'s
 * fetch. `writeCachedTurns` is how it gets there — a plain top-level
 * function, which the linter doesn't consider "component or hook" code at
 * all. Every read of the current thread, from anywhere, still goes through
 * `threadCache.turns` directly; only a write from component-body code is
 * funneled through it.
 */
const threadCache: { turns: readonly Turn[]; lastAsked: string | null; nextId: number } = {
  turns: [],
  lastAsked: null,
  nextId: 0,
};

/** Assigns the next thread into the cache and hands it back, so a caller can
 *  turn around and pass the same array to `setTurns` in one line. */
function writeCachedTurns(turns: readonly Turn[]): readonly Turn[] {
  threadCache.turns = turns;
  return turns;
}

/**
 * Mints the next turn id and advances the counter, both against the cache
 * rather than a per-mount `useRef`. A `useRef(0)` here would reset to 0 on
 * every mount, but the thread restored from `threadCache.turns` keeps its
 * old ids -- so the very first question asked after a remount would mint
 * `turn-0` again, colliding with the `turn-0` already sitting in the
 * restored thread. That collision is a duplicate React key at the call site
 * (`<TurnItem key={turn.id}>`), which makes React reconcile the two turns
 * against one fiber and lose or share the per-turn "Answer view" `Tabs`
 * state between them -- and, in live mode, makes `updateTurn(id, ...)` match
 * *both* turns, so one response overwrites an already-answered turn as well
 * as the pending one it was actually meant for. Counting from the cache
 * instead means the id space is as durable as the thread it labels.
 */
function nextCachedTurnId(): string {
  const id = `turn-${threadCache.nextId}`;
  threadCache.nextId += 1;
  return id;
}

/** Empties the module-scoped thread. The component's own "Clear
 *  conversation" control calls this; tests call it between cases. */
export function clearThreadCache(): void {
  threadCache.turns = [];
  threadCache.lastAsked = null;
  threadCache.nextId = 0;
}

export default function AskThisSite({ liveModeConfigured, heading }: Props) {
  const fieldId = useId();
  const threadId = useId();
  const viewId = useId();
  const fieldRef = useRef<HTMLInputElement | null>(null);
  /** The scroll window itself — see the scroll-to-bottom effect below. */
  const logRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState("");
  const [turns, setTurns] = useState<readonly Turn[]>(() => threadCache.turns);
  const [lastAsked, setLastAsked] = useState<string | null>(() => threadCache.lastAsked);

  // Mirror every thread change into module scope, so the next mount starts
  // from where this one left off. Deliberately an effect rather than a write
  // inside `ask()`: `updateTurn` and `askLive` both mutate turns too, and
  // this way there is exactly one place that has to stay in sync.
  useEffect(() => {
    threadCache.turns = turns;
    threadCache.lastAsked = lastAsked;
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
  // resolution of `askLive`'s fetch, which can land long after a navigation
  // has unmounted this instance. A `setState` dispatched on an unmounted
  // component in React 18+ is silently dropped before the fiber tree is ever
  // re-rendered, which means an updater *function* passed to it is never
  // invoked either — so a version of this that computed the next array from
  // `prev` inside `setTurns(prev => ...)` would only ever run while mounted,
  // and a live answer that arrives after the visitor has looked away would
  // vanish, leaving that turn stuck on its "pending" spinner forever once
  // they switch back. `threadCache.turns` is instead treated as the one
  // authoritative copy: it is always current (the effect above keeps it in
  // step with `turns` on every render this component is mounted for), so
  // computing the next value from it and assigning back to it works whether
  // or not a component instance exists to receive it. `setTurns` is still
  // called after, as a no-op if this instance is gone and a real update if
  // it is still mounted and watching. If the visitor cleared the thread
  // first (`handleClear`, below), `threadCache.turns` is already `[]` by the
  // time a late `updateTurn` call lands, `id` no longer matches anything in
  // it, and `.map` returns that same empty array unchanged — so a late
  // arrival can never resurrect a cleared conversation. The assignment back
  // into `threadCache.turns` happens inside `writeCachedTurns`, a plain
  // top-level function — see the doc comment above `threadCache` for why
  // this can't be written inline here, in the component's own body.
  function updateTurn(id: string, next: TurnAnswer) {
    const updated = threadCache.turns.map((turn) => (turn.id === id ? { ...turn, answer: next } : turn));
    setTurns(writeCachedTurns(updated));
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

    const id = nextCachedTurnId();

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
    // `data-ask-chat`: globals.css gives this root the same min-height the
    // loader's placeholder had, so the chat landing does not move the page.
    // Below 1024 the halves stack and whatever room is left over goes to the
    // compose half (`1fr`), never as a gap inside the thread.
    <div data-ask-chat="" className="grid grid-rows-[auto_1fr] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:grid-rows-none">
      <div className="min-w-0 px-5 pt-[18px] pb-5 sm:px-[26px] lg:border-r lg:border-dashed lg:border-rule">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          {heading}
          {liveModeConfigured ? (
            <span className="font-mono text-[11.5px] tracking-[0.08em] text-accent uppercase">Live mode</span>
          ) : null}
        </div>

        {turns.length > 0 ? (
          <div className="mt-1 flex justify-end">
            <button
              type="button"
              onClick={handleClear}
              className="min-h-11 px-1 font-mono text-[12px] text-fg-muted transition-colors duration-200 hover:text-accent"
            >
              Clear conversation
            </button>
          </div>
        ) : null}

        {/*
          The scroll window. A fixed 22rem (352px) shows the newest turn in
          full and a little of the one above it, so the thread reads as a
          conversation and never grows the page however many questions are
          asked, not even while the first few turns fill it (round 12: "if I click multiple buttons it just keeps
          stacking up on the page").

          `role="log"` announces new turns politely without repeating the
          old ones. `tabIndex={0}` only once there is something to scroll,
          which gives the region its own tab stop without trapping focus;
          the field's `aria-controls` points here.
        */}
        <div
          ref={logRef}
          id={threadId}
          role="log"
          aria-label="Conversation thread"
          aria-live="polite"
          tabIndex={turns.length > 0 ? 0 : undefined}
          className={cn("min-w-0 overflow-y-auto overscroll-contain", turns.length > 0 ? "h-[22rem] max-h-[22rem]" : "mt-3")}
        >
          {turns.length === 0 ? (
            <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-baseline gap-y-1.5">
              <span className={TURN_LABEL}>you asked</span>
              <p className="text-[15px] text-fg-muted">{IDLE_HINT}</p>
              <span className={`${TURN_LABEL} text-accent`}>I said</span>
              <p className="text-[15px] leading-[1.45] text-fg">{liveModeConfigured ? PROMISE_LIVE : PROMISE}</p>
            </div>
          ) : (
            <ol role="list" aria-label="Conversation" className="flex flex-col gap-4">
              {turns.map((turn, index) => (
                <TurnItem key={turn.id} turn={turn} turnNumber={index + 1} viewId={viewId} />
              ))}
            </ol>
          )}
        </div>

        <div className="mt-4">
          <HowThisAnswers id={`${viewId}-how-this-answers`} liveModeConfigured={liveModeConfigured} />
        </div>
      </div>

      {/* The question line, the round Ask, and "or try" questions as paper tags. */}
      <div className="flex min-w-0 flex-col gap-3 bg-ground px-5 pt-[18px] pb-5 sm:px-[26px]">
        <form
          className="flex items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            ask(query);
          }}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <label htmlFor={fieldId} className="font-mono text-[12px] text-fg-muted">
              Your question
            </label>
            {/* Not `disabled` while a live request is in flight, on purpose:
                a disabled input is auto-blurred by the browser, which would
                throw focus out of the visitor's hands mid-request. `ask()`
                no-ops while `isBusy`, so Enter here is inert rather than
                queuing a second question; the Ask button shows the state. */}
            <input
              id={fieldId}
              ref={fieldRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={turns.length === 0 ? "Ask about my work" : "Ask a follow-up"}
              aria-controls={threadId}
              className="min-h-11 w-full min-w-0 border-0 border-b-[1.5px] border-fg bg-transparent px-0.5 text-[16px] text-fg placeholder:text-fg-muted"
            />
          </div>
          {/* Moss, not the moss-deep control fill: the postcard's Send is
              Contact's one primary control. */}
          <button
            type="submit"
            disabled={isBusy}
            className="inline-flex h-11 shrink-0 items-center rounded-full bg-accent px-[22px] text-[15px] font-semibold text-fg-inverse transition-opacity duration-200 hover:opacity-90 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ask
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-serif text-[14px] text-fg-muted italic">or try</span>
          <ul role="list" aria-label="Try asking" className="contents">
            {SUGGESTED_QUESTIONS.map((question) => (
              <li key={question}>
                {/* The paper is a span inside the button: a clipped
                    element would clip its own focus ring. The button keeps
                    a 44px target; the tag is 32px to the eye. */}
                <button
                  type="button"
                  onClick={() => ask(question)}
                  disabled={isBusy}
                  className="group inline-flex min-h-11 items-center text-left disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span
                    className={cn(
                      "ask-tag inline-flex min-h-8 items-center py-1 pr-3 pl-[22px] text-[13.5px] text-fg transition-colors duration-200 group-hover:text-accent",
                      lastAsked === question && "text-accent",
                    )}
                  >
                    {question}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
