/**
 * The eight play scenes, by name, with no `"use client"` on this file.
 *
 * That last part is the only reason this module exists. `companion-play.ts`
 * is a client module, and the globe's Animals world needs to *cite* this list
 * from a server resolver (`src/lib/worlds.ts`) rather than restate it — the
 * site's rule is that a fact lives in exactly one place. A directive-free
 * list both sides import is the smallest thing that satisfies both.
 *
 * `companion-play.ts` derives its own `SceneKind` from this, so there is one
 * list and the type follows it rather than the other way round. That
 * derivation is what makes `WANDER_WEIGHTS`, `ROAM_WEIGHTS` and `PROP` —
 * each typed `Record<SceneKind, …>` — exhaustive over this list at compile
 * time: TypeScript's exact-literal checking rejects any of them that is
 * missing a key or carries an extra one, so a scene added or removed here
 * without updating those three tables fails `tsc`, not silently. `tsc` runs
 * before `test` in `pnpm verify`, which is why typecheck is the real gate.
 * `tests/lib/companion-scenes.test.ts` also checks this list against
 * `ROAM_WEIGHTS` directly — redundant under `pnpm verify`, but it is the
 * backstop for a standalone `pnpm vitest run`, which has no typecheck ahead
 * of it.
 *
 * That compile-time guarantee does not reach `openPlay`: its dispatch on
 * `kind` is a chain of `if (kind === "…")` checks that ends in an
 * unconditional `gift` fallback, not a `Record` and not an
 * exhaustiveness-checked `switch`. A hypothetical ninth scene would compile
 * cleanly, reach that function, match none of the `if`s, and silently run as
 * a gift scene — no compile error, and nothing here would catch it either.
 * That's a pre-existing property of `openPlay`, not something fixed by this
 * module; this note exists so nobody reads the paragraph above and assumes
 * the whole engine is exhaustive.
 */
export const SCENE_NAMES = [
  "yarn",
  "moth",
  "bowl",
  "chase",
  "gift",
  "peek",
  "scratch",
  "stalk",
] as const;

export type SceneName = (typeof SCENE_NAMES)[number];
