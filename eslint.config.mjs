import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent worktrees: whole checkouts (with their own .next/ build
    // artifacts, which the ".next/**" pattern above cannot reach nested)
    // live under here while a background session works. Never lintable
    // source from this checkout's point of view.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
