import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Unit/primitive test harness (Agent 3A). Playwright owns `e2e/**` with its
 * own runner (`playwright.config.ts`) — it must never be picked up here, or
 * `vitest run` fails with confusing "test.describe() is not a function"
 * style errors when it tries to execute a Playwright spec as a Vitest one.
 */
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
