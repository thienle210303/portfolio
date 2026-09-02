# Foundation: the performance gate, and the chat moves into the code artifact

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the repo a real, repeatable performance measurement, then move
the full "Ask this site" chat out of the AI Workflow Lab and into the hero's
code artifact — Thien's explicit instruction, and the change that frees the
budget for everything after it.

**Architecture:** The chat component (`AskThisSite`) does not change what it
is; it changes where it is mounted. Today `AIWorkflowLab.tsx` imports it
*statically*, so its engine and the whole lexical index over the site's content
ship in the initial page chunk. After this plan it is reached only through
`AskThienHeroTab`'s existing dynamic `import()`, which fires the first time a
visitor selects the "Ask Thien" tab. The one behavioural addition is a
module-scoped thread cache, because `Tabs` unmounts the panel that is not
active and the conversation must survive a look at `builder.ts`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind
v4 via `@theme`, Vitest + Testing Library, Playwright, pnpm.

This is plan 1 of the Playground Earth redesign. Spec:
`docs/superpowers/specs/2026-09-02-playground-earth-design.md`.
Later plans cover the content layer and demolition, then the globe.

## Global Constraints

- **pnpm only.** Never introduce an npm or yarn lockfile.
- **No new runtime dependency** in this plan. None is needed.
- TypeScript is strict; keep it that way.
- Tailwind v4 is configured via `@theme` in `src/app/globals.css`. There is no
  `tailwind.config.js` and none may be created.
- Components style against the semantic aliases only — `text-fg`,
  `text-fg-muted`, `border-rule`, `bg-surface`, `text-accent`, `bg-ground`.
  Never a raw `--color-*` token, never a literal hex.
- Blue is the only hue and is reserved for annotation, links, measured values
  and the single primary control per screen.
- Targets: WCAG 2.2 AA, and Lighthouse 90+/95+/95+/95+.
- Everything factual lives in `src/content/portfolio.ts` and
  `src/content/ai-experiments.ts`. Components never restate a fact.
- Before calling anything done: `pnpm verify` (typecheck → lint → contrast →
  test → build), then `pnpm test:e2e`, then a real browser check in **both**
  themes.
- Node 22.12+ is required by `pnpm test`'s jsdom chain. The machine runs 26.7.
- A dev server may already hold port 3000. Do not assume it is free.

---

### Task 1: A performance script, and the baseline recorded

Today `scripts/` holds only `contrast.mjs` and `screenshots.mjs`. Every claim
about this redesign's cost is unverifiable until a measurement exists in the
repo. This task adds one.

**Files:**
- Create: `scripts/perf.mjs`
- Modify: `package.json` (scripts block)
- Modify: `docs/feedback-tracker.md` (append a new section at the end)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `pnpm perf` — starts nothing, expects a server already running at
  `PERF_URL` (default `http://localhost:3100`), prints a Markdown table row and
  a JSON blob to stdout. Task 5 re-runs it and compares.

- [ ] **Step 1: Write the script**

Create `scripts/perf.mjs`:

```js
/**
 * Measures what a phone actually downloads and how long it waits, against a
 * running production build. Deliberately NOT part of `pnpm verify`: it needs
 * a server, and `verify` must stay hermetic.
 *
 * Usage:
 *   pnpm build
 *   PORT=3100 pnpm start &
 *   pnpm perf
 *
 * Throttling matches the Lighthouse mobile preset's shape: 4x CPU slowdown
 * and roughly 1.6 Mbps down with 150 ms latency. Numbers are comparable
 * between runs on the same machine; they are not Lighthouse scores.
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");

const URL = process.env.PERF_URL || "http://localhost:3100/";

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 412, height: 823 },
  deviceScaleFactor: 2.625,
  isMobile: true,
  hasTouch: true,
});

// Observers must exist before the document runs, or LCP and long tasks that
// happen during load are simply never seen.
await context.addInitScript(() => {
  window.__perf = { lcp: 0, lcpEl: "", longTasks: [], cls: 0 };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      window.__perf.lcp = entry.startTime;
      window.__perf.lcpEl = entry.element
        ? entry.element.tagName + "#" + (entry.element.id || "") + "." + String(entry.element.className || "").slice(0, 30)
        : "?";
    }
  }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) window.__perf.longTasks.push(Math.round(entry.duration));
  }).observe({ type: "longtask", buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__perf.cls += entry.value;
  }).observe({ type: "layout-shift", buffered: true });
});

const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send("Network.enable");
// NOTE: the parameter is `latency`, not `latencyMs`. The other spelling is
// rejected as "Invalid parameters" with no further explanation.
await cdp.send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 150,
  downloadThroughput: Math.round((1.6 * 1024 * 1024) / 8),
  uploadThroughput: Math.round((750 * 1024) / 8),
});
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

const bytes = { script: 0, stylesheet: 0, font: 0, other: 0 };
page.on("response", async (response) => {
  const type = response.request().resourceType();
  try {
    const sizes = await response.request().sizes();
    const n = sizes.responseBodySize || 0;
    if (type in bytes) bytes[type] += n;
    else bytes.other += n;
  } catch {
    // A response that never finished has no sizes. Skipping it under-reports
    // rather than crashing the run, which is the right trade for a metric.
  }
});

await page.goto(URL, { waitUntil: "load" });
await page.waitForTimeout(8000);

const metrics = await page.evaluate(() => {
  const nav = performance.getEntriesByType("navigation")[0];
  const fcp = performance.getEntriesByName("first-contentful-paint")[0];
  return {
    fcp: Math.round(fcp ? fcp.startTime : 0),
    load: Math.round(nav.loadEventEnd),
    lcp: Math.round(window.__perf.lcp),
    lcpEl: window.__perf.lcpEl,
    tbt: window.__perf.longTasks.reduce((sum, d) => sum + Math.max(0, d - 50), 0),
    cls: Number(window.__perf.cls.toFixed(4)),
    domNodes: document.querySelectorAll("body *").length,
  };
});

const kb = (n) => (n / 1024).toFixed(1);
const row = [
  kb(bytes.script) + " KB",
  kb(bytes.stylesheet) + " KB",
  kb(bytes.font) + " KB",
  metrics.lcp + " ms",
  metrics.tbt + " ms",
  String(metrics.cls),
  String(metrics.domNodes),
].join(" | ");

console.log("| JS | CSS | Fonts | LCP | TBT | CLS | DOM nodes |");
console.log("|---|---|---|---|---|---|---|");
console.log("| " + row + " |");
console.log("");
console.log("LCP element: " + metrics.lcpEl);
console.log(JSON.stringify({ bytes, ...metrics }, null, 2));

await browser.close();
```

- [ ] **Step 2: Register the script**

In `package.json`, inside `"scripts"`, add one line after `"contrast"`:

```json
    "perf": "node scripts/perf.mjs",
```

- [ ] **Step 3: Run it against a production build and capture the baseline**

```bash
pnpm build
```

Then, in a second shell:

```bash
PORT=3100 pnpm start
```

Then:

```bash
pnpm perf
```

Expected: a Markdown table and a JSON blob. On this machine on 2026-09-02 the
numbers were JS 207.4 KB, CSS 14.2 KB, fonts 331.4 KB, LCP 3884 ms, TBT
359 ms, CLS 0. If your run differs by more than about 15% on LCP or TBT,
something else is loading the machine — close it and run again before
recording.

- [ ] **Step 4: Record the baseline**

Append to the end of `docs/feedback-tracker.md`:

```markdown
## Round 16 (2026-09-02) — Playground Earth

Design: `docs/superpowers/specs/2026-09-02-playground-earth-design.md`.

### Performance baseline

Measured with `pnpm perf` against a production build, Chromium at 4x CPU and
~1.6 Mbps. Re-run after every step that touches the initial chunk set.

| When | JS | CSS | Fonts | LCP | TBT | CLS | DOM nodes |
|---|---|---|---|---|---|---|---|
| Before round 16 | 207.4 KB | 14.2 KB | 331.4 KB | 3884 ms | 359 ms | 0 | (record it) |

LCP element is the hero intro paragraph. Two standing facts this table exists
to keep honest:

- LCP is already past the 2.5 s "good" threshold on a phone. Nothing new may
  be added to the first screen.
- Newsreader **italic** is 143.6 KB of the 331.4 KB and is used in exactly two
  places (`BusinessCard.tsx:275`, `Closing.tsx:76`). Dropping that one axis is
  the single largest win available and is tracked as its own decision, not
  bundled into this work.
```

Replace `(record it)` with the DOM node count your run printed.

- [ ] **Step 5: Commit**

```bash
git add scripts/perf.mjs package.json docs/feedback-tracker.md
git commit -m "Add a performance script, and record the baseline it measures"
```

---

### Task 2: The conversation survives a tab switch

`Tabs` renders only the active panel, so once the chat lives behind a tab, a
visitor who glances at `builder.ts` and comes back would find their
conversation gone. State moves to module scope.

**Files:**
- Modify: `src/sections/AIWorkflowLab/AskThisSite.tsx`
- Test: `tests/sections/AskThisSite.test.tsx`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: a new named export from `src/sections/AIWorkflowLab/AskThisSite.tsx`:
  `export function clearThreadCache(): void` — empties the module-scoped
  thread. The component's own "Clear conversation" button calls it, and tests
  call it between cases. The default export's props are unchanged:
  `AskThisSite({ liveModeConfigured }: { readonly liveModeConfigured: boolean })`.

- [ ] **Step 1: Write the failing test**

Append to `tests/sections/AskThisSite.test.tsx`:

```tsx
describe("thread persistence across unmount", () => {
  afterEach(() => {
    clearThreadCache();
  });

  it("keeps the conversation when the component is unmounted and mounted again", async () => {
    const user = userEvent.setup();
    const first = render(<AskThisSite liveModeConfigured={false} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "What did Thien build at DoorDash?");
    await user.keyboard("{Enter}");

    const question = await screen.findByText("What did Thien build at DoorDash?");
    expect(question).toBeInTheDocument();

    // The tab switch: Tabs unmounts the panel that is not active.
    first.unmount();
    render(<AskThisSite liveModeConfigured={false} />);

    expect(screen.getByText("What did Thien build at DoorDash?")).toBeInTheDocument();
  });

  it("clearThreadCache empties the thread for the next mount", async () => {
    const user = userEvent.setup();
    const first = render(<AskThisSite liveModeConfigured={false} />);
    await user.type(screen.getByRole("textbox"), "What did Thien build at DoorDash?");
    await user.keyboard("{Enter}");
    await screen.findByText("What did Thien build at DoorDash?");

    first.unmount();
    clearThreadCache();
    render(<AskThisSite liveModeConfigured={false} />);

    expect(screen.queryByText("What did Thien build at DoorDash?")).not.toBeInTheDocument();
  });
});
```

Add `clearThreadCache` to that file's import of the component, and make sure
`afterEach` and `userEvent` are imported. The file's existing header imports
become:

```tsx
import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AskThisSite, { clearThreadCache } from "@/sections/AIWorkflowLab/AskThisSite";
```

If the file already imports some of these, merge rather than duplicating.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run tests/sections/AskThisSite.test.tsx`
Expected: FAIL — `clearThreadCache` is not exported, and the remounted
component shows an empty thread.

- [ ] **Step 3: Implement the cache**

In `src/sections/AIWorkflowLab/AskThisSite.tsx`, directly above
`export default function AskThisSite(...)`, add:

```tsx
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
```

Change the two state initialisers inside the component from:

```tsx
  const [turns, setTurns] = useState<readonly Turn[]>([]);
  const [lastAsked, setLastAsked] = useState<string | null>(null);
```

to:

```tsx
  const [turns, setTurns] = useState<readonly Turn[]>(() => cachedTurns);
  const [lastAsked, setLastAsked] = useState<string | null>(() => cachedLastAsked);
```

Immediately after those two lines, add the write-back effect:

```tsx
  // Mirror every thread change into module scope, so the next mount starts
  // from where this one left off. Deliberately an effect rather than a write
  // inside `ask()`: `updateTurn` and `askLive` both mutate turns too, and
  // this way there is exactly one place that has to stay in sync.
  useEffect(() => {
    cachedTurns = turns;
    cachedLastAsked = lastAsked;
  }, [turns, lastAsked]);
```

In `handleClear()`, add `clearThreadCache();` as the first statement, so
clearing empties the cache as well as the state.

- [ ] **Step 4: Run the tests and watch them pass**

Run: `pnpm vitest run tests/sections/AskThisSite.test.tsx`
Expected: PASS, including every test that already existed in the file.

- [ ] **Step 5: Commit**

```bash
git add src/sections/AIWorkflowLab/AskThisSite.tsx tests/sections/AskThisSite.test.tsx
git commit -m "Keep the conversation when the chat's panel unmounts"
```

---

### Task 3: The hero's fourth tab hosts the full chat

`AskThienHeroTab` currently imports `AskThienMini`, a one-turn cut-down of the
chat. It imports the real thing instead, and gains the `liveModeConfigured`
prop it must thread through. The silent-failure path becomes visible, because
after this change the hero tab is the only chat on the site.

**Files:**
- Modify: `src/sections/Hero/Hero.tsx`
- Modify: `src/sections/Hero/HeroCodeArtifact.tsx`
- Modify: `src/sections/Hero/AskThienHeroTab.tsx`
- Test: `tests/sections/AskThienHeroTab.test.tsx`
- Test: `tests/sections/HeroCodeArtifact.test.tsx`

**Interfaces:**
- Consumes: `clearThreadCache` is not needed here. `askLiveModeConfigured():
  boolean` from `@/lib/ask-live-config`. `AskThisSite` from
  `@/sections/AIWorkflowLab/AskThisSite`, default export, props
  `{ readonly liveModeConfigured: boolean }`.
- Produces:
  `HeroCodeArtifact({ liveModeConfigured }: { readonly liveModeConfigured: boolean })`
  and
  `AskThienHeroTab({ liveModeConfigured }: { readonly liveModeConfigured: boolean })`,
  both required props. Task 4 relies on nothing from here.

- [ ] **Step 1: Write the failing tests**

Replace the whole body of `tests/sections/AskThienHeroTab.test.tsx` with:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AskThienHeroTab from "@/sections/Hero/AskThienHeroTab";

/**
 * `AskThienHeroTab` is the always-in-the-hero-bundle half of the "Ask Thien"
 * tab: a loading line plus one `import()` of `AskThisSite`, the module that
 * pulls in `@/lib/answers` (the lexical index over the whole site). Mounting
 * *is* activation — `HeroCodeArtifact`'s `Tabs` renders only the active
 * panel — so this component's body first runs when a visitor selects the
 * tab. What this file pins: the mount-triggers-import contract, that the
 * live-mode flag reaches the chat, and that a failed import says so out loud
 * and offers a retry.
 */

/*
 * The mock's `default` is a GETTER on purpose, and `chunkState` is created
 * with `vi.hoisted` because `vi.mock` factories are hoisted above ordinary
 * `const`s.
 *
 * Why a getter rather than a factory that throws: a module that fails to
 * evaluate is cached as failed, so a second `import()` of it never re-runs
 * the factory — a retry test written that way passes or fails for reasons
 * that have nothing to do with the component. A getter is re-evaluated on
 * every `mod.default` access, and because the component reads `mod.default`
 * inside its `.then()`, a throwing getter rejects that promise chain and
 * lands in the same `.catch()` a real network failure would.
 */
const chunkState = vi.hoisted(() => ({ fail: false }));

vi.mock("@/sections/AIWorkflowLab/AskThisSite", () => ({
  get default() {
    if (chunkState.fail) throw new Error("chunk failed");
    return function Chat({ liveModeConfigured }: { readonly liveModeConfigured: boolean }) {
      return <div data-testid="chat">chat live={String(liveModeConfigured)}</div>;
    };
  },
}));

beforeEach(() => {
  chunkState.fail = false;
});

describe("AskThienHeroTab", () => {
  it("shows an announced loading state immediately on mount", () => {
    render(<AskThienHeroTab liveModeConfigured={false} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("imports and renders the full chat once the import resolves", async () => {
    render(<AskThienHeroTab liveModeConfigured={false} />);
    expect(screen.queryByTestId("chat")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("chat")).toBeInTheDocument());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("passes the live-mode flag through to the chat", async () => {
    render(<AskThienHeroTab liveModeConfigured={true} />);
    await waitFor(() => expect(screen.getByTestId("chat")).toHaveTextContent("live=true"));
  });
});

describe("AskThienHeroTab when the chunk cannot be fetched", () => {
  it("says so out loud instead of sitting on a loading line", async () => {
    chunkState.fail = true;
    render(<AskThienHeroTab liveModeConfigured={false} />);

    // Gate on the button, not on the status text: the loading line is ALSO
    // a `role="status"` and also contains "load", so asserting on the text
    // first would pass while the chunk was merely still in flight. The retry
    // button exists in the failure branch and nowhere else.
    await screen.findByRole("button", { name: /try again/i });

    // Now the status region can only be the failure line. Matched by regex
    // because the copy uses a curly apostrophe (`&rsquo;`) — a straight-
    // quoted "didn't" would never match.
    expect(screen.getByRole("status")).toHaveTextContent(/didn.t load/i);
  });

  it("retrying asks for the chunk again and shows it when it arrives", async () => {
    chunkState.fail = true;
    render(<AskThienHeroTab liveModeConfigured={false} />);
    const retry = await screen.findByRole("button", { name: /try again/i });

    chunkState.fail = false;
    await userEvent.setup().click(retry);

    await waitFor(() => expect(screen.getByTestId("chat")).toBeInTheDocument());
  });
});
```

The file's imports must include `beforeEach`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
```

In `tests/sections/HeroCodeArtifact.test.tsx`, change the mock and every
`render(<HeroCodeArtifact />)` call. The mock becomes:

```tsx
vi.mock("@/sections/Hero/AskThienHeroTab", () => ({
  default: ({ liveModeConfigured }: { liveModeConfigured: boolean }) => (
    <div data-testid="ask-thien-mock">Ask Thien panel live={String(liveModeConfigured)}</div>
  ),
}));
```

Every render call becomes `render(<HeroCodeArtifact liveModeConfigured={false} />)`
(there are four of them, including the two that destructure `container`). Then
add one test at the end of the `describe`:

```tsx
  it("hands the live-mode flag to the Ask Thien panel", async () => {
    render(<HeroCodeArtifact liveModeConfigured={true} />);
    await userEvent.setup().click(screen.getByRole("tab", { name: "Ask Thien" }));
    expect(screen.getByTestId("ask-thien-mock")).toHaveTextContent("live=true");
  });
```

Add `import userEvent from "@testing-library/user-event";` to that file.

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm vitest run tests/sections/AskThienHeroTab.test.tsx tests/sections/HeroCodeArtifact.test.tsx`
Expected: FAIL — the components take no props yet, and there is no retry
button.

- [ ] **Step 3: Rewrite the hero tab**

Replace the body of `src/sections/Hero/AskThienHeroTab.tsx` below its imports
with this. Keep the existing doc comment's explanation of *why* the boundary
exists, and update the two sentences that name `AskThienMini`:

```tsx
"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";

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
    setFailed(false);
    import("@/sections/AIWorkflowLab/AskThisSite")
      .then((mod) => {
        if (!cancelled) setChat(() => mod.default);
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

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

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
```

- [ ] **Step 4: Thread the prop through the artifact and the hero**

In `src/sections/Hero/HeroCodeArtifact.tsx`, change the signature and the one
tab entry:

```tsx
interface HeroCodeArtifactProps {
  /** Computed server-side in `Hero.tsx`; handed to the chat behind the
   *  fourth tab. */
  readonly liveModeConfigured: boolean;
}

export default function HeroCodeArtifact({ liveModeConfigured }: HeroCodeArtifactProps) {
```

and, inside the `tabs` array, replace the fourth entry's panel:

```tsx
    {
      id: "ask",
      label: "Ask Thien",
      panel: <AskThienHeroTab liveModeConfigured={liveModeConfigured} />,
    },
```

In `src/sections/Hero/Hero.tsx`, add the import beside the existing content
imports:

```tsx
import { askLiveModeConfigured } from "@/lib/ask-live-config";
```

and, inside `export default function Hero()`, before the `return`:

```tsx
  // Server-only: reads ASK_LLM_* directly in a Server Component, so the key
  // never enters the client bundle — only this boolean crosses. Same shape
  // as `emailDeliveryConfigured` in page.tsx.
  const liveModeConfigured = askLiveModeConfigured();
```

and change the artifact's call site:

```tsx
            <HeroCodeArtifact liveModeConfigured={liveModeConfigured} />
```

- [ ] **Step 5: Run the tests and watch them pass**

Run: `pnpm vitest run tests/sections/AskThienHeroTab.test.tsx tests/sections/HeroCodeArtifact.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/sections/Hero tests/sections/AskThienHeroTab.test.tsx tests/sections/HeroCodeArtifact.test.tsx
git commit -m "Move the full chat into the hero's Ask Thien tab"
```

---

### Task 4: The Lab lets the chat go, and the mini chat is deleted

With the chat living in the hero, the Lab's static import is what still drags
the engine into the initial chunk. Removing it is the whole point of the move.
`AskThienMini` has no remaining caller.

**Files:**
- Modify: `src/sections/AIWorkflowLab/AIWorkflowLab.tsx`
- Delete: `src/sections/AIWorkflowLab/AskThienMini.tsx`
- Delete: `tests/sections/AskThienMini.test.tsx`
- Modify: `e2e/ask.spec.ts`

**Interfaces:**
- Consumes: the hero tab from Task 3, reached in e2e by clicking the tab named
  "Ask Thien" inside the tablist named "Code artifact tabs".
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Take the chat out of the Lab**

In `src/sections/AIWorkflowLab/AIWorkflowLab.tsx`:

- Delete line 18, `import AskThisSite from "./AskThisSite";`.
- Delete the block that renders the "Ask about it" heading (`id="lab-ask-heading"`)
  and `<AskThisSite liveModeConfigured={liveModeConfigured} />` on line 140,
  including the surrounding wrapper element that exists only to hold them.
- Keep `askLiveModeConfigured()` and the `liveModeConfigured` const: the
  section still uses it to choose between `labIntro[0]` and `labLiveNotice`
  for its callout.
- Update the file's doc comment where it says the only client island in the
  section is `AskThisSite` — after this change the section has no client
  island at all. Say that instead.

- [ ] **Step 2: Delete the mini chat and its test**

```bash
git rm src/sections/AIWorkflowLab/AskThienMini.tsx tests/sections/AskThienMini.test.tsx
```

Then check nothing still references it:

```bash
grep -rn "AskThienMini" src tests e2e docs
```

Expected: no matches outside this plan and the spec. If `heroAskCaption` in
`src/content/ai-experiments.ts` is now unreferenced, leave the string in
place — it is authored content, and Task 5 of the *next* plan handles the
authored strings that become false. Note it in the commit message.

- [ ] **Step 3: Point the e2e suite at the new home**

In `e2e/ask.spec.ts`, every test that reaches the chat must first open the
hero tab. Add this helper at the top of the file, below the imports:

```ts
/**
 * The chat moved out of the Lab and into the hero's code artifact (round 16).
 * Reaching it is now: load the page, select the fourth tab. The panel is a
 * lazily imported chunk, so the wait is for the question field, not for the
 * tab's own click to settle.
 */
async function openHeroChat(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("tab", { name: "Ask Thien" }).click();
  await expect(page.getByRole("textbox").first()).toBeVisible({ timeout: 15_000 });
}
```

Replace every `await page.goto("/")` followed by a scroll or locator aimed at
`#lab`'s chat with a single `await openHeroChat(page);`. Any assertion that
the chat sits inside `#lab` must be deleted, not adjusted. Add one new test:

```ts
test("the conversation survives switching to another code tab and back", async ({ page }) => {
  await openHeroChat(page);
  const input = page.getByRole("textbox").first();
  await input.fill("What did Thien build at DoorDash?");
  await input.press("Enter");
  await expect(page.getByText("What did Thien build at DoorDash?")).toBeVisible();

  await page.getByRole("tab", { name: "Profile" }).click();
  await expect(page.getByText("What did Thien build at DoorDash?")).toHaveCount(0);

  await page.getByRole("tab", { name: "Ask Thien" }).click();
  await expect(page.getByText("What did Thien build at DoorDash?")).toBeVisible();
});
```

- [ ] **Step 4: Run the scoped suites**

```bash
pnpm vitest run
```

Expected: PASS, with the `AskThienMini` file's tests gone from the count.

```bash
pnpm test:e2e ask
```

Expected: PASS. If a test fails on a timeout waiting for the panel, raise that
one `timeout` rather than adding a fixed wait — the chunk compiles on demand in
dev and is slower under parallel workers.

- [ ] **Step 5: Commit**

```bash
git add -A src/sections/AIWorkflowLab e2e/ask.spec.ts
git commit -m "Retire the Lab's chat block and the mini chat it fed"
```

---

### Task 5: Prove it got faster, and record the number

**Files:**
- Modify: `docs/feedback-tracker.md`

**Interfaces:**
- Consumes: `pnpm perf` from Task 1; the change from Tasks 3 and 4.
- Produces: the second row of the tracker's performance table.

- [ ] **Step 1: Run the full gate**

```bash
pnpm verify
```

Expected: typecheck, lint, contrast, tests and build all green.

- [ ] **Step 2: Measure again**

```bash
PORT=3100 pnpm start
```

then, in another shell:

```bash
pnpm perf
```

Expected: the JS figure is **lower** than the 207.4 KB baseline, because the
engine and corpus have left the initial chunk. If it is not lower, stop and
find out why before recording anything — the most likely cause is a remaining
static import of `@/lib/answers` or `AskThisSite` somewhere in the initial
graph. Find it with:

```bash
grep -rn "from \"@/lib/answers\"\|from \"./AskThisSite\"\|AskThisSite" src --include=*.tsx --include=*.ts
```

- [ ] **Step 3: Record it**

Add a row to the table in `docs/feedback-tracker.md`:

```markdown
| After the chat moved into the hero tab | (JS) | (CSS) | (fonts) | (LCP) | (TBT) | (CLS) | (nodes) |
```

Fill every cell from the run. Below the table, add one sentence naming what
changed and by how much, in the form: *"Moving the chat into the hero's fourth
tab took N KB off the initial JavaScript; nothing else in the table moved
materially."*

- [ ] **Step 4: Run the full browser matrix**

```bash
pnpm test:e2e
```

Expected: PASS across all six viewports, both themes, all tones, including the
axe audits. Then open `pnpm dev` and check the hero's fourth tab by hand in
**both** themes: the chat opens, answers, keeps its thread across a tab switch,
and the panel does not push the hero's layout around at 390px.

- [ ] **Step 5: Commit**

```bash
git add docs/feedback-tracker.md
git commit -m "Record what moving the chat bought"
```

---

## What this plan deliberately does not do

- It does not delete the AI Workflow Lab. That is the next plan, together with
  the content-layer changes (`origin.from` becoming "Kiên Giang, Việt Nam", the
  `worlds.ts` schema) and the companion re-key. Doing them together keeps the
  demolition to one green pull request.
- It does not touch the fonts. Newsreader italic is the biggest single asset on
  the site and dropping it is worth more than everything in this plan, but it
  is Thien's call and a separate change, so it stays out of this before/after
  comparison.
- It does not rewrite the four authored strings that become false when the chat
  moves. They are still true enough while the Lab exists; the next plan
  rewrites them with Thien's approval.
