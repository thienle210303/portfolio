import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Unit/primitive test harness (Agent 3A). Playwright owns `e2e/**` with its
 * own runner (`playwright.config.ts`) — it must never be picked up here, or
 * `vitest run` fails with confusing "test.describe() is not a function"
 * style errors when it tries to execute a Playwright spec as a Vitest one.
 *
 * `.mts` (not `.ts`): Vitest/Vite's native `configLoader` treats a plain
 * `vitest.config.ts` as CommonJS unless the nearest `package.json` sets
 * `"type": "module"` — which this project deliberately does not do, since
 * that flag affects how Next.js itself loads config/scripts too. `.mts`
 * declares ESM unambiguously at the file level instead, with no blast
 * radius outside this one file. Vitest resolves `vitest.config.mts`
 * automatically, so `"test": "vitest run"` in package.json is unchanged.
 *
 * `@/*` resolution: previously via the `vite-tsconfig-paths` plugin; now via
 * Vite 8's native `resolve.tsconfigPaths` (confirmed present in this
 * project's installed vite@8.2.1 types), which reads the same
 * `compilerOptions.paths` from tsconfig.json without a dependency. Verified
 * directly, not assumed: every test file in `tests/**` imports through `@/`
 * and the full suite (139 tests) still passes with the plugin removed.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    // Vitest's default is 5s, which was never calibrated for this suite and
    // produced a flake that looked like three unrelated bugs.
    //
    // Several tests legitimately take 0.9-1.7s: they render a large React tree
    // through jsdom, and one `user.type()` of a ~33-character question is a
    // re-render per keystroke at ~25ms each. Alone, every file passes. Run as
    // 31 files in parallel, wall-clock inflates 3-6x on this machine, and
    // whichever file happens to hold the slowest test crosses 5s at random --
    // observed in `tests/api/ask.test.ts`, `tests/sections/AskThisSite.test.tsx`
    // and `tests/sections/WorldsStage.test.tsx` in turn, always as
    // "Test timed out in 5000ms", never as a failed assertion.
    //
    // Raising the budget per file just moves the failure to the next-slowest
    // file, so it is set once here: ~12x the slowest test observed, which
    // contention cannot reach, while a genuinely hung test still fails
    // promptly rather than hanging the suite.
    testTimeout: 20_000,
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
