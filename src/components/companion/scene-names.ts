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
 * list and the type follows it rather than the other way round.
 * `tests/lib/companion-scenes.test.ts` checks it against `ROAM_WEIGHTS`, the
 * engine's real registry, so a ninth scene added there fails loudly here
 * instead of quietly under-reporting on the globe.
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
