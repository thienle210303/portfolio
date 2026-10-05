import { skins as authoredSkins, type SkinId } from "@/content/skins";
import { DECORATION_LABEL } from "@/lib/worlds";

// Kept out of `lib/worlds.ts` on purpose: that module is imported at runtime by
// client code (`WorldPanel`, the companion), so anything exported from it rides
// in the initial bundle. This one is imported by the server component, tests,
// and at runtime by `sections/Worlds/gl/shaders.ts` (for `SKIN_IDS`), which
// reaches the page only through the lazy globe chunk. Keep it that way.

/** The skin ids, derived from the content layer. */
export const SKIN_IDS: readonly SkinId[] = authoredSkins.map((skin) => skin.id);

/**
 * Exactly four fields, and no `plaques`: a skin is a look, and says so in its
 * own accessible name with the same label a decoration carries.
 */
export interface ResolvedSkin {
  readonly id: SkinId;
  readonly name: string;
  readonly draws: string;
  readonly label: string;
}

export function resolveSkins(): readonly ResolvedSkin[] {
  return authoredSkins.map((skin) => ({
    id: skin.id,
    name: skin.name,
    draws: skin.draws,
    label: `${skin.draws} — ${DECORATION_LABEL}`,
  }));
}
