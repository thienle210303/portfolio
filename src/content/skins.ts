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
  { id: "ice-age", name: "Ice Age", draws: "the poles meet and the planet fades to pale" },
  { id: "night-side", name: "Night side", draws: "the planet turned to the dark, its coastlines lit" },
  { id: "volcanic", name: "Volcanic", draws: "fissures cracking along every coastline" },
  { id: "underwater", name: "Underwater", draws: "the limb turned inside out, light falling from above" },
  { id: "desert", name: "Desert", draws: "the oceans drained to a pale, grainy surface, dust hazing the limb" },
] as const satisfies readonly Skin[];

export type SkinId = (typeof skins)[number]["id"];
