import { careerEntryById, origin, originStops } from "@/content/portfolio";
import { arcKm, greatCircle } from "@/lib/globe";
import type { GeoPoint } from "@/types/portfolio";

/**
 * The globe's origin story as three stops. Every field is read from the
 * content layer — `origin`, two career entries and `originStops` — and the
 * first stop's `when` is computed from `origin`, never typed.
 *
 * Plain strings and numbers only: `Worlds.tsx` is a server component and hands
 * these to a client one as props.
 */
export interface OriginStop {
  readonly id: "kien-giang" | "taylors" | "usc";
  readonly place: string;
  readonly when: string;
  readonly caption: string;
  readonly coordinates: GeoPoint;
}

function entry(id: string) {
  const found = careerEntryById(id);
  if (!found) throw new Error(`origin stops: career entry "${id}" is missing`);
  return found;
}

export function buildStops(): readonly OriginStop[] {
  const highSchool = entry("eastside-high");
  const usc = entry("usc-degree");
  if (!highSchool.headline) throw new Error('origin stops: "eastside-high" has no headline');
  return [
    {
      id: "kien-giang",
      place: origin.from,
      when: `${origin.born.slice(0, 4)}–${origin.arrivedYear}`,
      caption: originStops["kien-giang"].caption,
      coordinates: origin.coordinates.from,
    },
    {
      id: "taylors",
      place: origin.to,
      when: origin.arrived,
      caption: highSchool.headline,
      coordinates: origin.coordinates.to,
    },
    {
      id: "usc",
      place: usc.organization,
      when: usc.dateRange,
      caption: originStops.usc.caption,
      coordinates: originStops.usc.coordinates,
    },
  ];
}

/** Length of the flight, Kiên Giang to Taylors, in whole kilometres. */
export function crossingKm(): number {
  return Math.round(arcKm(greatCircle(origin.coordinates.from, origin.coordinates.to, 72).radians));
}
