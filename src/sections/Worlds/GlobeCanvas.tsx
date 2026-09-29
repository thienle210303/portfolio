/**
 * Placeholder only — Task 8 replaces this file with the real canvas.
 *
 * This file has to exist for a reason that has nothing to do with drawing a
 * globe: `WorldsStage.tsx` reaches it through `import("./GlobeCanvas")`, and
 * every bundler this project's tooling runs resolves a dynamic import's
 * specifier at *compile* time to build its chunk graph — confirmed directly,
 * not assumed. With this file absent, `pnpm build` failed outright:
 *
 *   Error: Module not found: Can't resolve './GlobeCanvas'
 *
 * and `pnpm vitest` failed the same way before a single test ran, because
 * Vite's import-analysis does the same resolution while transforming
 * `WorldsStage.tsx`, whether or not the code path that calls `import()` ever
 * executes. Neither failure is the runtime promise rejection the `.catch()`
 * in `WorldsStage.tsx` is written to catch: a missing module is a build-time
 * error, and no `.catch()` in application code runs in a build that never
 * finishes. A `.catch()` only ever sees a *real* runtime failure — a chunk
 * that exists but fails to load (offline, a flaky deploy, or
 * `e2e/worlds.spec.ts` deliberately blocking the request) — which is exactly
 * what this stub makes possible, because now there is a real chunk to block.
 *
 * Until Task 8 fills it in, this renders nothing and never reports controls,
 * so the stage looks exactly like the "no canvas yet" state this task ships:
 * the two flight/reset buttons stay `aria-disabled` because `onReady` is
 * never called. This file adds a seam, not a globe.
 *
 * Task 8's implementation should keep this default export's signature
 * compatible with `CanvasComponent` in `WorldsStage.tsx`:
 *   (props: {
 *     worlds: readonly ResolvedWorld[];
 *     currentId: string;
 *     onSelect: (id: string) => void;
 *     onLanded: () => void;
 *     onReady: (controls: GlobeControls | null) => void;
 *   }) => JSX.Element
 */
export default function GlobeCanvas(): null {
  return null;
}
