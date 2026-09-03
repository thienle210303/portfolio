"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";

/**
 * The hero code artifact's fourth tab, "Ask Thien" — a plain `import()`
 * boundary around the actual full chat (`AskThisSite.tsx`, under
 * `src/sections/AIWorkflowLab/`), same idiom as `CareerTree/WatchOrigin.tsx`'s
 * player chunk.
 *
 * This file is the reason the chat costs the hero's initial JS nothing. It
 * imports only React — no `@/lib/answers`, no `AskThisSite` — so nothing
 * that module needs (the whole lexical index over the site's content, built
 * at module load) is ever pulled into the hero's own chunk. `HeroCodeArtifact`
 * imports *this* component statically, but `Tabs` (`src/components/ui/Tabs.tsx`)
 * only ever mounts the currently active panel — so on first paint, with
 * "Profile" active by default, this component's function body has not run at
 * all. It runs, and its one effect fires the dynamic `import()`, the instant
 * a visitor actually selects the "Ask Thien" tab: mounting *is* "first
 * activation" here, so there is no second trigger (a button inside the
 * panel) to build, unlike `WatchOrigin`'s explicit press — selecting the tab
 * already is the press.
 *
 * Three states: `"loading"` (the chunk is in flight — a plain status line,
 * `aria-busy` on its wrapper), the chat itself once `Chat` is set, and a
 * visible failure state with a retry button. The failure path is not
 * decorative: after this change the hero tab is the site's only chat (the
 * Lab's own copy is gone), so a chunk that never arrives has to say so out
 * loud instead of leaving the visitor staring at an inert loading line.
 */
type ChatComponent = ComponentType<{ readonly liveModeConfigured: boolean }>;

interface Props {
  /** Computed once, server-side, in `Hero.tsx`. Never mutates for the life
   *  of the page load. */
  readonly liveModeConfigured: boolean;
}

export function AskThienHeroTab({ liveModeConfigured }: Props) {
  const [Chat, setChat] = useState<ChatComponent | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    import("@/sections/AIWorkflowLab/AskThisSite")
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
        // Visible, not silent: this tab is now the site's only chat, so a
        // failed chunk has to say so rather than sit on a loading line
        // forever. The rest of the page is unaffected either way.
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    // Reset here, in the click handler, rather than at the top of the
    // effect above: an effect body must not call setState synchronously
    // (react-hooks/set-state-in-effect) — only from inside an async
    // callback (the `.then`/`.catch` above) or, as here, an event handler.
    // Clearing it on the click that triggers the retry gives the same
    // visible result — the failure line disappears and "Loading…" takes
    // its place while the new import is in flight.
    setFailed(false);
    setAttempt((n) => n + 1);
  }, []);

  if (Chat) return <Chat liveModeConfigured={liveModeConfigured} />;

  if (failed) {
    return (
      <div className="min-h-[8rem]">
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

  return (
    <div aria-busy="true" className="min-h-[8rem]">
      <p role="status" className="text-[length:var(--step--1)] text-fg-muted">
        Loading&hellip;
      </p>
    </div>
  );
}

export default AskThienHeroTab;
