import {
  aiTools,
  careerEntryById,
  companions,
  origin,
  projects,
} from "@/content/portfolio";
import { worlds as authoredWorlds } from "@/content/worlds";
import {
  arcApex,
  arcKm,
  arcMidpoint,
  greatCircle,
  type GreatCircle,
} from "@/lib/globe";
import { buildCareerTree, stillGrowingCaption, totalTechnologies } from "@/lib/knowledge-tree";
import { seasonsFor } from "@/lib/origin-story";
import { SCENE_NAMES } from "@/components/companion/scene-names";
import {
  resolved as unwrap,
  type ComputedFactId,
  type GeoPoint,
  type GlyphId,
  type PlaqueRef,
  type World,
  type WorldAnchor,
} from "@/types/portfolio";

/**
 * Turns the seven worlds' *references* into the flat, serializable shape the
 * section renders — and drops, silently and deliberately, anything that does
 * not resolve.
 *
 * "Silently" is the design. A plaque whose field now holds a `[NEEDS INPUT]`
 * marker, whose list index is past the end, or whose record id was renamed is
 * not an error the visitor should be shown: it is a fact the site does not
 * currently have, and the honest rendering of a fact the site does not have is
 * nothing at all. The rail's counts fall by one and the panel is one line
 * shorter. `tests/lib/worlds.test.ts` proves each of those three cases drops
 * rather than printing `undefined` or the marker text.
 *
 * Every output is a plain object of strings and numbers. That is not
 * incidental: `Worlds.tsx` is a server component and `WorldsStage.tsx` is a
 * client one, so everything here crosses that boundary as props. Put a
 * function or a class in here and the section stops building.
 */

const CROSSING_SEGMENTS = 72;

function crossing(): GreatCircle {
  return greatCircle(origin.coordinates.from, origin.coordinates.to, CROSSING_SEGMENTS);
}

export function crossingKm(): number {
  return Math.round(arcKm(crossing().radians));
}

/** The one string every decoration's accessible name carries, so a visitor
 *  using a screen reader is told a drawing is a drawing. */
export const DECORATION_LABEL = "no plaque · decoration";

function anchorPoint(anchor: WorldAnchor): GeoPoint | null {
  switch (anchor.at) {
    case "origin-from":
      return origin.coordinates.from;
    case "origin-to":
      return origin.coordinates.to;
    case "arc-midpoint":
      return arcMidpoint(crossing());
    case "arc-apex":
      return arcApex(crossing());
    case "plinth":
    case "orbit":
      return null;
  }
}

function computedFact(id: ComputedFactId): { text: string; source: string } | null {
  switch (id) {
    case "tree-shape": {
      const branches = buildCareerTree();
      const leaves = branches.reduce((total, branch) => total + branch.leaves.length, 0);
      return {
        text: `${branches.length} branches · ${leaves} authored leaves · ${totalTechnologies()} distinct technologies`,
        source: "buildCareerTree() — computed, not typed",
      };
    }
    case "tree-still-growing":
      return {
        text: stillGrowingCaption(),
        source: "the drawing's own caption for the shoot that never resolves into a leaf",
      };
    case "crossing":
      return {
        text: `${origin.from} → ${origin.to} · ${origin.arrived}`,
        source: "origin — the only geography this site authors",
      };
    case "seasons":
      return {
        text: `${seasonsFor().length} seasons since ${origin.arrived}`,
        source: "seasonsFor() — one flight authored, every season since computed",
      };
    case "play-scenes":
      return {
        text: `${SCENE_NAMES.length} scenes: ${SCENE_NAMES.join(" · ")}`,
        source: "companion-play.ts — the scenes the pair actually play",
      };
    case "ai-tools":
      return {
        text: aiTools.map((tool) => tool.name).join(" · "),
        source: "aiTools — each links to its vendor's own docs",
      };
  }
}

export interface ResolvedPlaque {
  readonly glyph: GlyphId;
  /** `field` quotes one authored field; `computed` renders one named
   *  computation. The test branches on this, because the two have different
   *  things to be checked against. */
  readonly kind: "field" | "computed";
  readonly text: string;
  readonly source: string;
  /** Whole fields of the same record — never a fragment — joined with " · ".
   *  A milestone's award text means nothing without its organisation and
   *  date, and both are already authored beside it. */
  readonly attribution?: string;
  readonly link?: string;
}

export interface ResolvedDecoration {
  readonly glyph: GlyphId;
  readonly label: string;
}

export interface ResolvedWorld {
  readonly id: string;
  readonly name: string;
  readonly glyph: GlyphId;
  readonly where: string;
  readonly disclosure?: string;
  /** `null` for the two worlds that are not on the map. */
  readonly point: GeoPoint | null;
  readonly orbits: boolean;
  readonly plaques: readonly ResolvedPlaque[];
  readonly decorations: readonly ResolvedDecoration[];
}

function resolvePlaque(glyph: GlyphId, ref: PlaqueRef): ResolvedPlaque | null {
  switch (ref.of) {
    case "careerEntry": {
      const entry = careerEntryById(ref.id);
      if (!entry) return null;
      const value = ref.field === "role" ? entry.role : unwrap(entry[ref.field]);
      if (!value) return null;
      return {
        glyph,
        kind: "field",
        text: value,
        source: `careerEntries.${entry.id} · ${ref.field}`,
        attribution: `${entry.organization} · ${entry.dateRange}`,
      };
    }
    case "careerEntryLine": {
      const entry = careerEntryById(ref.id);
      const line = entry?.[ref.field][ref.index];
      if (!entry || line === undefined) return null;
      return {
        glyph,
        kind: "field",
        text: line,
        source: `careerEntries.${entry.id} · ${ref.field}[${ref.index}]`,
        attribution: `${entry.organization} · ${entry.dateRange}`,
      };
    }
    case "project": {
      const project = projects.find((candidate) => candidate.id === ref.id);
      const value = project ? unwrap(project[ref.field]) : undefined;
      if (!project || !value) return null;
      return {
        glyph,
        kind: "field",
        text: value,
        source: `projects.${project.id} · ${ref.field}`,
        attribution: project.title,
        link: ref.link,
      };
    }
    case "companion": {
      const cat = companions.find((candidate) => candidate.id === ref.id);
      if (!cat) return null;
      return {
        glyph,
        kind: "field",
        // Three whole fields, joined. Not a sentence written about her.
        text: `${cat.name}, ${cat.coat}. ${cat.habit}`,
        source: `companions.${cat.id} — a real animal, named ${cat.authoredOn}`,
      };
    }
    case "computed": {
      const fact = computedFact(ref.id);
      if (!fact) return null;
      return { glyph, kind: "computed", text: fact.text, source: fact.source };
    }
  }
}

/**
 * `list` exists for the tests, which need to resolve a deliberately broken
 * world without corrupting the real content to do it. Production callers pass
 * nothing.
 */
export function resolveWorlds(list: readonly World[] = authoredWorlds): readonly ResolvedWorld[] {
  return list.map((world) => ({
    id: world.id,
    name: world.name,
    glyph: world.glyph,
    where: world.where,
    ...(world.disclosure ? { disclosure: world.disclosure } : {}),
    point: anchorPoint(world.anchor),
    orbits: world.anchor.at === "orbit",
    plaques: world.plaques
      .map((plaque) => resolvePlaque(plaque.glyph, plaque.ref))
      .filter((plaque): plaque is ResolvedPlaque => plaque !== null),
    decorations: world.decorations.map((decoration) => ({
      glyph: decoration.glyph,
      label: `${decoration.draws} — ${DECORATION_LABEL}`,
    })),
  }));
}
