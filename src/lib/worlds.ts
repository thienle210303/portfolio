import {
  aiTools,
  careerEntryById,
  companions,
  origin,
  projects,
} from "@/content/portfolio";
import { worlds as authoredChapters } from "@/content/worlds";
import {
  arcApex,
  arcKm,
  arcMidpoint,
  greatCircle,
  type GreatCircle,
} from "@/lib/globe";
import { buildDrawnTree, stillGrowingCaption, totalLeaves, treeTechnologies } from "@/lib/knowledge-tree";
import { seasonsFor } from "@/lib/origin-story";
import { SCENE_NAMES } from "@/components/companion/scene-names";
import { actAnchorId, actForProject } from "@/lib/anchors";
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
 * Turns the six chapters' *references* into the flat, serializable shape the
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
      // The drawn tree, not every career entry: nine entries are one credentials
      // line on the Journey now, and this plaque must say what the section
      // beside it draws.
      const branches = buildDrawnTree();
      return {
        text: `${branches.length} branches · ${totalLeaves(branches)} authored leaves · ${treeTechnologies(branches)} distinct technologies`,
        source: "buildDrawnTree() — computed, not typed",
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
        source: "scene-names.ts — the scenes the pair actually play",
      };
    case "ai-tools":
      return {
        text: aiTools.map((tool) => tool.name).join(" · "),
        source: "aiTools — the name of every tool in the reference",
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

export interface ResolvedChapter {
  readonly id: string;
  readonly name: string;
  readonly glyph: GlyphId;
  readonly where: string;
  readonly disclosure?: string;
  /** Empty for the two chapters that are not on the map; two for Living
   *  Earth, which owns both ends of the crossing. */
  readonly points: readonly GeoPoint[];
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
        // Round 18: the Selected Work section is gone, so a case study is no
        // longer a thing with its own anchor — it is rendered inside the
        // Journey act of the role that produced it. Computed from the id
        // already in hand, never carried on the content layer as a second
        // hand-typed string.
        ...(() => {
          const act = actForProject(project.id);
          return act ? { link: `#${actAnchorId(act)}` } : {};
        })(),
      };
    }
    case "companion": {
      const cat = companions.find((candidate) => candidate.id === ref.id);
      if (!cat) return null;
      return {
        glyph,
        kind: "field",
        // Just the name — a single authored field, not a sentence the
        // resolver composes about her. `coat` and `habit` ride in
        // `attribution`, the slot that exists for exactly this shape.
        text: cat.name,
        attribution: `${cat.coat} · ${cat.habit}`,
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

/** The chapter ids, in story order, derived from the content layer. The globe
 *  hard-codes `"tech"` for the satellite's hit, so renaming it there is a
 *  string change no compiler sees — this is the one list to check against. */
export const CHAPTER_IDS: readonly string[] = authoredChapters.map((chapter) => chapter.id);

/**
 * `list` exists for the tests, which need to resolve a deliberately broken
 * world without corrupting the real content to do it. Production callers pass
 * nothing.
 */
export function resolveChapters(list: readonly World[] = authoredChapters): readonly ResolvedChapter[] {
  return list.map((world) => ({
    id: world.id,
    name: world.name,
    glyph: world.glyph,
    where: world.where,
    ...(world.disclosure ? { disclosure: world.disclosure } : {}),
    points: world.anchors
      .map(anchorPoint)
      .filter((point): point is GeoPoint => point !== null),
    orbits: world.anchors.some((anchor) => anchor.at === "orbit"),
    plaques: world.plaques
      .map((plaque) => resolvePlaque(plaque.glyph, plaque.ref))
      .filter((plaque): plaque is ResolvedPlaque => plaque !== null),
    decorations: world.decorations.map((decoration) => ({
      glyph: decoration.glyph,
      label: `${decoration.draws} — ${DECORATION_LABEL}`,
    })),
  }));
}

/**
 * The ids of chapters whose map point an earlier chapter in the list already
 * claimed — the ones a renderer has to step aside.
 *
 * `living-earth` (its second pin) and `plants` both anchor `origin-to`, and
 * that is authored rather than a mistake: the sapling grows *on* the arrival pin. Drawn naively they
 * overprint — the second glyph hides the first, and two left-aligned names land
 * on one baseline and composite into neither of them. Worse, and quieter: a
 * canvas hit list scanned backwards and broken on the first match makes the
 * *earlier* marker unreachable by tap altogether, so `usa` could not be opened
 * from the globe at all.
 *
 * Coordinates are compared rather than ids matched against a list, so this
 * keeps working when the content layer moves a pin or lands a third chapter on
 * one — and compared *exactly*, not by projected proximity, which would
 * falsely pair two genuinely distant places that happen to crowd together near
 * the limb.
 *
 * Order is load-bearing: the first chapter to claim a point keeps it, so
 * `src/content/worlds.ts`'s order decides which marker stays put and which one
 * moves. The two chapters that are not on the map (`plinth`, `orbit`) have no
 * points and are never flagged.
 *
 * This lives here rather than inside `GlobeCanvas.tsx` for one reason: there it
 * could not be tested without a canvas. See `tests/lib/worlds.test.ts`.
 */
export function coLocatedWorldIds(
  list: readonly Pick<ResolvedChapter, "id" | "points">[],
): ReadonlySet<string> {
  const claimed: GeoPoint[] = [];
  const ids = new Set<string>();
  for (const chapter of list) {
    // Judged against what *earlier* chapters claimed, never against the
    // chapter's own points: a chapter does not step aside from itself.
    const taken = chapter.points.some((point) =>
      claimed.some((other) => other.lat === point.lat && other.lon === point.lon),
    );
    if (taken) ids.add(chapter.id);
    claimed.push(...chapter.points);
  }
  return ids;
}
