"use client";

import { useEffect, useState, type ComponentType } from "react";

/**
 * The hero code artifact's fourth tab, "Ask Thien" — a plain `import()`
 * boundary around the actual mini chat (`AskThienMini.tsx`, under
 * `src/sections/AIWorkflowLab/`), same idiom as `CareerTree/WatchOrigin.tsx`'s
 * player chunk.
 *
 * This file is the reason the mini chat costs the hero's initial JS nothing.
 * It imports only React — no `@/lib/answers`, no `AskThienMini` — so nothing
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
 * Two states only, not three: `"loading"` (the chunk is in flight — a plain
 * status line, `aria-busy` on its wrapper) and the mini chat itself once
 * `Mini` is set. A failed import has no dedicated state or copy: it leaves
 * `Mini` null and the wrapper keeps announcing an inert loading line, which
 * is an honest (if quiet) failure mode for a feature that was never the
 * page's primary surface — the Lab's `AskThisSite` still works with no
 * network at all.
 */
type MiniChatComponent = ComponentType;

export function AskThienHeroTab() {
  const [Mini, setMini] = useState<MiniChatComponent | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("@/sections/AIWorkflowLab/AskThienMini")
      .then((mod) => {
        if (!cancelled) setMini(() => mod.default);
      })
      .catch(() => {
        // Nothing was promised yet — the loading line just stays put. See
        // the doc comment above.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (Mini) return <Mini />;

  return (
    <div aria-busy="true" className="min-h-[8rem]">
      <p role="status" className="text-[length:var(--step--1)] text-fg-muted">
        Loading&hellip;
      </p>
    </div>
  );
}

export default AskThienHeroTab;
