"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";

/**
 * The chat's lazy boundary in Contact: a placeholder, a visibility trigger
 * and a plain `import()` of the actual chat (`AskThisSite.tsx`, beside this
 * file), the same idiom as `CareerTree/WatchOrigin.tsx`'s player chunk.
 *
 * This file is the reason the chat costs the page's initial JS nothing. It
 * imports only React — no `@/lib/answers`, no `AskThisSite` — so nothing that
 * module needs (the whole lexical index over the site's content, built at
 * module load) is pulled into the chunk Contact ships with. Through round 17
 * the boundary was the hero's "Ask Thien" tab, where mounting the tab was the
 * trigger; Contact has no tab, so the trigger is the block coming within
 * `LOAD_AHEAD` of the viewport. Loading a little ahead of arrival means a
 * visitor scrolling down normally finds the chat ready rather than watching a
 * loading line; a visitor who never scrolls this far never downloads it.
 *
 * Four states: waiting (out of view, nothing requested — a quiet placeholder,
 * deliberately not a `role="status"`, since nothing is in flight to announce),
 * `"loading"` (the chunk is in flight — a status line, `aria-busy` on its
 * wrapper), the chat itself once `Chat` is set, and a visible failure state
 * with a retry button. The failure path is not decorative: this is the site's
 * only chat, so a chunk that never arrives has to say so out loud instead of
 * leaving the visitor staring at an inert loading line.
 *
 * A browser without IntersectionObserver imports at once rather than never.
 *
 * Every state before the chat carries `data-ask-slot`, which globals.css
 * gives roughly the idle chat's height, so the swap does not shove the
 * closing section down under a reader who jumped straight to the bottom.
 */
type ChatComponent = ComponentType<{ readonly liveModeConfigured: boolean }>;

/** How far below the viewport the block starts loading. */
const LOAD_AHEAD = "600px 0px";

interface Props {
  /** Computed once, server-side, in `page.tsx`. Never mutates for the life
   *  of the page load. */
  readonly liveModeConfigured: boolean;
}

export function AskLoader({ liveModeConfigured }: Props) {
  const placeholderRef = useRef<HTMLDivElement | null>(null);
  const [Chat, setChat] = useState<ChatComponent | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let observer: IntersectionObserver | undefined;

    const load = () => {
      import("./AskThisSite")
        .then((mod) => {
          // Read `mod.default` here, synchronously inside `.then`, rather than
          // deferring it into the `setChat` updater function below: React may
          // not invoke a functional updater until a later render pass, by
          // which point it runs outside this promise chain and a throwing
          // getter (see the test file's mock) would become an unhandled
          // rejection instead of landing in `.catch()`.
          const component = mod.default;
          if (!cancelled) setChat(() => component);
        })
        .catch(() => {
          // Visible, not silent: this is the site's only chat, so a failed
          // chunk has to say so rather than sit on a loading line forever.
          // The rest of the page is unaffected either way.
          if (!cancelled) setFailed(true);
        });
    };

    const target = placeholderRef.current;
    if (attempt > 0 || !target || typeof IntersectionObserver === "undefined") {
      // A retry (the visitor is already here), or no way to watch for
      // arrival: load now.
      load();
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer?.disconnect();
          // Inside the observer's callback, not the effect body, so this
          // setState is not a synchronous one in an effect
          // (react-hooks/set-state-in-effect).
          setLoading(true);
          load();
        },
        { rootMargin: LOAD_AHEAD },
      );
      observer.observe(target);
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    // Reset here, in the click handler, rather than at the top of the
    // effect above: an effect body must not call setState synchronously
    // (react-hooks/set-state-in-effect) — only from inside an async
    // callback or, as here, an event handler. Clearing it on the click that
    // triggers the retry gives the same visible result — the failure line
    // disappears and "Loading…" takes its place while the new import is in
    // flight.
    setFailed(false);
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  if (Chat) return <Chat liveModeConfigured={liveModeConfigured} />;

  if (failed) {
    return (
      <div data-ask-slot="">
        <p role="status" className="text-[length:var(--step--1)] text-fg-muted">
          The chat didn&rsquo;t load. Everything else on this page still works.
        </p>
        <button
          type="button"
          onClick={retry}
          className="mt-3 inline-flex min-h-11 items-center border border-rule px-4 py-2 text-[length:var(--step--1)] text-fg transition-colors duration-150 hover:border-fg"
        >
          Try again
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div data-ask-slot="" aria-busy="true">
        <p role="status" className="text-[length:var(--step--1)] text-fg-muted">
          Loading&hellip;
        </p>
      </div>
    );
  }

  return (
    <div ref={placeholderRef} data-ask-slot="">
      <noscript>
        <p className="text-[length:var(--step--1)] text-fg-muted">The chat needs JavaScript.</p>
      </noscript>
    </div>
  );
}

export default AskLoader;
