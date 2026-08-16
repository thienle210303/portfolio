"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowRight, CornerDownLeft, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { LAUNCHER_ATTRIBUTE } from "./guideFocus";
import { startSemanticSession } from "./semanticSession";
import { useSemanticSession } from "./useGuideState";
import { runGuideAction } from "@/lib/guide/actions";
import { blendHits, searchIndex } from "@/lib/guide/match";
import { MODEL_DOWNLOAD_LABEL } from "@/lib/guide/semantic";
import type { GuideHit, GuideIndex } from "@/lib/guide/types";

interface GuidePanelProps {
  readonly index: GuideIndex | null;
  readonly indexError: boolean;
  /**
   * Closes the panel. `restoreFocus` defaults to true — the panel traps focus,
   * so an Escape that did not restore it would strand a keyboard visitor. Pass
   * false only when the caller has already moved focus somewhere deliberate.
   */
  readonly onClose: (options?: { readonly restoreFocus?: boolean }) => void;
  readonly onDismissForever: () => void;
  readonly panelId: string;
}

/** Keystroke settling time before a semantic query runs. Lexical is
 *  synchronous and needs none; encoding a query does. */
const SEMANTIC_DEBOUNCE_MS = 220;

/**
 * Async results tagged with the query that produced them.
 *
 * Both of the panel's asynchronous outputs — semantic hits and an action's
 * confirmation message — become stale the moment the visitor types again.
 * Tagging them lets staleness be *derived* during render (`tag === query`)
 * rather than cleared by an effect, which is both fewer renders and harder to
 * get wrong: there is no ordering in which a stale value can be displayed.
 */
interface Tagged<T> {
  readonly query: string;
  readonly value: T;
}

/**
 * The guide's panel: a query box over the content index, and the small set of
 * commands that drive controls already on the page.
 *
 * ## Modal, deliberately
 *
 * It is an overlay card that covers content, so `role="dialog"` +
 * `aria-modal="true"` with a real focus trap is the honest description — a
 * non-modal panel that visually blocks the page but lets Tab wander behind it
 * is the worse pattern. Escape closes and returns focus to the launcher, and
 * activating any result closes it too, so it is never in the way for long.
 *
 * ## What it never does
 *
 * It does not speak first, it has no greeting, and it renders nothing until
 * the visitor types. The results are verbatim content quotes; there is no
 * summarisation step anywhere in this component.
 */
export function GuidePanel({
  index,
  indexError,
  onClose,
  onDismissForever,
  panelId,
}: GuidePanelProps) {
  const [query, setQuery] = useState("");
  // Read from the shared store, not owned here: the model outlives this panel.
  const semantic = useSemanticSession();
  const [semanticResult, setSemanticResult] = useState<Tagged<readonly GuideHit[]> | null>(null);
  const [actionMessage, setActionMessage] = useState<Tagged<string> | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingId = useId();

  const trimmed = query.trim();

  /* --- Retrieval -------------------------------------------------------- */

  // Lexical is pure and fast enough to run inline on every render; memoising
  // on [query, index] is all the throttling it needs.
  const lexicalHits = useMemo(
    () => (index ? searchIndex(index.entries, query) : []),
    [index, query],
  );

  const hits = useMemo(() => {
    // Semantic hits count only while they still describe the current query.
    // Derived inside the memo rather than above it so the fresh `[]` on a
    // stale-or-absent result does not re-key the memo on every render.
    const semanticHits = semanticResult?.query === trimmed ? semanticResult.value : [];
    return semanticHits.length > 0 ? blendHits(lexicalHits, semanticHits) : lexicalHits;
  }, [lexicalHits, semanticResult, trimmed]);

  // Semantic pass, debounced and cancellable. Runs *in addition* to the lexical
  // pass, never instead of it — `blendHits` keeps exact-term matches
  // competitive, which matters because technology names are both the most
  // likely query and the encoder's weakest spot.
  useEffect(() => {
    // No state is written on these paths: a stale result is already excluded by
    // the tag check above, so there is nothing to clear.
    if (semantic.status !== "ready" || trimmed.length === 0) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      void semantic.searcher
        .search(trimmed)
        .then((results) => {
          if (!cancelled) setSemanticResult({ query: trimmed, value: results });
        })
        .catch(() => {
          if (!cancelled) setSemanticResult({ query: trimmed, value: [] });
        });
    }, SEMANTIC_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, semantic]);

  /* --- Announcement ----------------------------------------------------- */

  // Derived during render, not pushed from an effect. Empty while there is no
  // query, which is the "never speaks first" rule expressed in the live
  // region: an untouched panel announces nothing at all.
  const countMessage =
    trimmed.length === 0
      ? ""
      : hits.length === 0
        ? "No matches on this page."
        : `${hits.length} ${hits.length === 1 ? "match" : "matches"}.`;

  // An action's confirmation outranks the count until the visitor types again,
  // at which point the tag stops matching and the count takes over.
  const status = actionMessage?.query === trimmed ? actionMessage.value : countMessage;

  /* --- Focus management ------------------------------------------------- */

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = [
        ...panel.querySelectorAll<HTMLElement>("input, button:not([disabled]), a[href]"),
      ].filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Click outside closes. `pointerdown` rather than `click` so a drag that
  // starts outside and releases inside does not count as an outside click.
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const panel = panelRef.current;
      if (!panel || !(event.target instanceof Node)) return;
      if (panel.contains(event.target)) return;

      // A launcher is "outside" the panel but must not be treated as an
      // outside click: this handler runs on pointerdown and would close the
      // panel *before* the launcher's own click handler fired, which would
      // then see `open === false` and immediately reopen it. Clicking the cats
      // to close the panel would visibly flicker and stay open. The launcher
      // owns its own toggle; this bows out.
      if (event.target instanceof Element && event.target.closest(`[${LAUNCHER_ATTRIBUTE}]`)) {
        return;
      }

      onClose();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [onClose]);

  /* --- Actions ---------------------------------------------------------- */

  async function activate(hit: GuideHit) {
    const outcome = await runGuideAction(hit.entry.action);
    if (outcome.message) setActionMessage({ query: trimmed, value: outcome.message });
    // Closing keeps the guide from covering the destination it just navigated
    // to. Actions that stay put (a copy) leave the panel open so their
    // confirmation is readable. `keepFocus` is forwarded because a navigation
    // has already placed focus on the destination section, and the default
    // restore-to-launcher would drag it straight back out — see ActionOutcome.
    if (outcome.close) onClose({ restoreFocus: !outcome.keepFocus });
  }

  function enableSemantic() {
    if (!index) return;
    // Everything else — the guard against double-starting, progress reporting,
    // and settling to ready or failed — belongs to the session store, so it all
    // keeps working if this panel unmounts mid-download.
    startSemanticSession(index);
  }

  /* --- Render ----------------------------------------------------------- */

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      id={panelId}
      className={cn(
        // z-60 clears the sticky header (z-50): a dialog that slid under the
        // page chrome would look like a rendering fault.
        "no-print fixed bottom-6 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col",
        // Starts exactly where the cats' lane ends, so the panel sits beside
        // them rather than on top — covering your own launcher looks like a bug,
        // and keeping them visible makes the relationship obvious. Read from `--gutter` because the lane's width *is*
        // `--gutter`; a hardcoded offset here was correct at 1024px and wrong
        // by 20px at 1600px, where the gutter grows to its 5rem maximum.
        "left-4 lg:left-[var(--gutter)]",
        // Never tall enough to reach the sticky header. The results list has
        // its own limit, but the sections around it can grow too, and a dialog
        // that fills the viewport is exactly the spotlight-hogging this design
        // exists to avoid.
        "max-h-[calc(100vh-7rem)]",
        "border border-hairline bg-ink text-paper shadow-2xl",
      )}
    >
      <div className="flex flex-none items-start justify-between gap-3 border-b border-hairline px-4 py-3">
        <div>
          {/*
            A real heading, inside the dialog, so `aria-labelledby` points at
            something that is unambiguously part of it. Naming the dialog from
            the launcher instead would reach across into a subtree that is
            `display: none` at some widths.
          */}
          <h2 id={headingId} className="eyebrow">
            Guide
          </h2>
          <p className="mt-1 text-[length:var(--step--1)] text-muted">
            Every result is a quote from this page.
          </p>
        </div>
        <button
          type="button"
          // Wrapped rather than passed directly: `onClose` takes an options
          // object, and handing it straight to onClick would pass a MouseEvent
          // into that slot.
          onClick={() => onClose()}
          className="-mr-2 -mt-1 inline-flex h-11 w-11 flex-none items-center justify-center text-muted transition-colors duration-150 hover:text-paper"
        >
          <X aria-hidden="true" focusable="false" size={18} />
          <span className="sr-only">Close the guide</span>
        </button>
      </div>

      <div className="flex-none px-4 py-3">
        <label htmlFor={`${panelId}-input`} className="sr-only">
          Search this page
        </label>
        <input
          ref={inputRef}
          id={`${panelId}-input`}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder="scrapers, what failed, copy email…"
          aria-describedby={`${panelId}-hint`}
          className="w-full border border-hairline bg-charcoal px-3 py-2.5 font-mono text-[length:var(--step--1)] text-paper placeholder:text-silver"
        />
        <p id={`${panelId}-hint`} className="mt-2 text-[length:var(--step--1)] text-silver">
          {indexError
            ? "The page index could not be loaded, so search is unavailable."
            : index
              ? `${index.entries.length} passages indexed.`
              : "Loading the page index…"}
        </p>
      </div>

      {/*
        `role="status"` + polite. It is written to only after a query exists
        or an action completes, so it never announces anything unprompted.
      */}
      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>

      {trimmed.length > 0 ? (
        <ul className="max-h-[min(20rem,38vh)] min-h-0 overflow-y-auto border-t border-hairline">
          {hits.map((hit) => (
            <li key={hit.entry.id} className="border-b border-hairline last:border-b-0">
              <button
                type="button"
                onClick={() => void activate(hit)}
                className="group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-charcoal"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="font-mono text-[length:var(--step--1)] uppercase tracking-[0.12em] text-silver">
                      {hit.entry.source}
                    </span>
                    {hit.entry.kind === "command" ? (
                      <span className="border border-hairline px-1.5 font-mono text-[length:var(--step--1)] uppercase tracking-[0.08em] text-muted">
                        Do
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-[length:var(--step-0)] text-paper">
                    {hit.entry.title}
                  </span>
                  {/*
                    `line-clamp-3` and not a JS truncation: cutting the string
                    would misquote it. This shows the opening of the real
                    passage and the section itself carries the rest.
                  */}
                  <span className="mt-1 block line-clamp-3 text-[length:var(--step--1)] leading-relaxed text-muted">
                    {hit.entry.quote}
                  </span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  focusable="false"
                  size={16}
                  className="mt-1 flex-none text-silver transition-colors duration-150 group-hover:text-paper"
                />
              </button>
            </li>
          ))}

          {hits.length === 0 ? (
            <li className="px-4 py-4 text-[length:var(--step--1)] leading-relaxed text-muted">
              Nothing on this page matches that. The guide only searches what is
              actually written here — it does not answer from anywhere else.
            </li>
          ) : null}
        </ul>
      ) : null}

      {/* --- Tier 1 opt-in ------------------------------------------------ */}

      <div className="flex-none border-t border-hairline px-4 py-3">
        {semantic.status === "off" ? (
          <>
            <button
              type="button"
              onClick={enableSemantic}
              disabled={!index}
              className="inline-flex min-h-11 items-center gap-2 border border-hairline px-3 font-mono text-[length:var(--step--1)] uppercase tracking-[0.08em] text-paper transition-colors duration-150 hover:border-muted disabled:opacity-50"
            >
              <CornerDownLeft aria-hidden="true" focusable="false" size={14} />
              Enable meaning-based search
            </button>
            {/*
              Three facts, kept short. Earlier copy said the same thing in a
              paragraph and pushed the panel to nearly full viewport height,
              which undercut the whole point of a guide that stays out of the
              way. Brevity here is a design constraint, not a style preference
              — but none of the three disclosures may be dropped to get it.
            */}
            <p className="mt-2 text-[length:var(--step--1)] leading-relaxed text-silver">
              {MODEL_DOWNLOAD_LABEL} · runs in this browser, nothing is sent
              anywhere · finds passages, never writes answers.
            </p>
          </>
        ) : null}

        {semantic.status === "loading" ? (
          <p className="text-[length:var(--step--1)] text-muted">
            {semantic.progress.phase === "downloading"
              ? `Downloading the model${semantic.progress.percent === null ? "" : ` — ${semantic.progress.percent}%`}…`
              : `Indexing this page locally${semantic.progress.percent === null ? "" : ` — ${semantic.progress.percent}%`}…`}
          </p>
        ) : null}

        {semantic.status === "ready" ? (
          <p className="text-[length:var(--step--1)] text-muted">
            Meaning-based search is on, running locally in this browser.
          </p>
        ) : null}

        {semantic.status === "failed" ? (
          <p className="text-[length:var(--step--1)] text-muted">
            The model could not be loaded, so search is still keyword-based.
            Everything else works as before.
          </p>
        ) : null}
      </div>

      <div className="flex-none border-t border-hairline px-4 py-2">
        <button
          type="button"
          onClick={onDismissForever}
          className="inline-flex min-h-11 items-center text-[length:var(--step--1)] text-silver transition-colors duration-150 hover:text-paper"
        >
          Hide the guide for good
        </button>
      </div>
    </div>
  );
}

export default GuidePanel;
