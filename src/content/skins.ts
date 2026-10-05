import type { Skin } from "@/types/portfolio";

/**
 * Five skins: looks for the planet, and nothing else.
 *
 * A skin changes what the globe looks like and carries no fact. That is the
 * section's honesty rule applied to the whole planet, the same allowance the
 * jellyfish already uses. `Skin` has no field for a plaque, so a future edit
 * cannot give one a fact without failing the typecheck.
 *
 * Any skin wears over any chapter.
 */
export const skins = [
  { id: "ice-age", name: "Ice Age", draws: "the poles meet and the colour drains away" },
  { id: "night-side", name: "Night side", draws: "the planet turned into the dark, with every city a point of light" },
  { id: "volcanic", name: "Volcanic", draws: "fissures cracking along every coastline" },
  { id: "underwater", name: "Underwater", draws: "the globe seen from below the surface" },
  { id: "desert", name: "Desert", draws: "the oceans retreated and the surface gone to sand" },
] as const satisfies readonly Skin[];

export type SkinId = (typeof skins)[number]["id"];
