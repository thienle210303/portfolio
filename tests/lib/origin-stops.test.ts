import { describe, expect, it } from "vitest";
import { careerEntryById, origin, originStops } from "@/content/portfolio";
import { buildStops, crossingKm, crossingLabel } from "@/lib/origin-stops";
import { buildDocuments } from "@/lib/answer-corpus";
import { answer } from "@/lib/answers";

const stops = buildStops();
const byId = Object.fromEntries(stops.map((stop) => [stop.id, stop]));

describe("buildStops", () => {
  it("three stops in order", () => {
    expect(stops.map((stop) => stop.id)).toEqual(["kien-giang", "taylors", "usc"]);
  });

  it("stop values trace to content", () => {
    const usc = careerEntryById("usc-degree")!;

    expect(byId["kien-giang"].place).toBe(origin.from);
    expect(byId["kien-giang"].when).toBe(`${origin.born.slice(0, 4)}–${origin.arrivedYear}`);
    expect(byId["kien-giang"].caption).toBe(originStops["kien-giang"].caption);
    expect(byId["kien-giang"].coordinates).toBe(origin.coordinates.from);

    expect(byId.taylors.place).toBe(origin.to);
    expect(byId.taylors.when).toBe(origin.arrived);
    expect(byId.taylors.coordinates).toBe(origin.coordinates.to);

    expect(byId.usc.place).toBe(usc.organization);
    expect(byId.usc.when).toBe(usc.dateRange);
    expect(byId.usc.caption).toBe(originStops.usc.caption);
    expect(byId.usc.coordinates).toBe(originStops.usc.coordinates);
  });

  it("taylors caption is the high-school headline verbatim", () => {
    const headline = careerEntryById("eastside-high")?.headline;
    expect(headline).toBeTruthy();
    expect(byId.taylors.caption).toBe(headline);
  });

  it("usc has coordinates", () => {
    expect(byId.usc.coordinates).toEqual({ lat: 33.9938, lon: -81.03 });
  });
});

describe("crossingKm", () => {
  it("crossingKm unchanged", () => {
    // Recorded from `src/lib/worlds.ts` before the move (2026-10-17).
    expect(crossingKm()).toBe(14_960);
  });
});

describe("the chat corpus", () => {
  const docs = buildDocuments();

  it("corpus has no plaque documents", () => {
    for (const doc of docs) {
      expect(doc.source, doc.text).not.toMatch(/careerEntries\.|projects\.|companions\.|computed/);
    }
    const captions = new Set(stops.map((stop) => stop.caption));
    for (const doc of docs.filter((candidate) => candidate.sectionId === "worlds")) {
      expect(captions.has(doc.text), doc.text).toBe(true);
    }
  });

  it("indexes no stop caption under Worlds (the chat no longer cites the globe)", () => {
    expect(docs.filter((doc) => doc.sectionId === "worlds")).toEqual([]);
  });
});

describe("stop vocabulary", () => {
  const captions = new Set(stops.map((stop) => stop.caption));

  // The globe's old vocabulary (cat, moon, Việt Nam…) was earned by plaques
  // that are gone; left on the stops, it retrieved a caption for every cat
  // question and the USC caption for "vietnam".
  it.each(["what are his cats called", "does he have cats"])("%s returns no stop caption", (query) => {
    for (const result of answer(query, 10)) {
      expect(captions.has(result.text), result.text).toBe(false);
    }
  });

  it("vietnam does not return the USC caption", () => {
    expect(answer("vietnam", 10).map((result) => result.text)).not.toContain(byId.usc.caption);
  });
});

describe("crossingLabel", () => {
  it("prints the crossing once, grouped, in km", () => {
    expect(crossingLabel()).toBe("14,960 km");
  });
});
