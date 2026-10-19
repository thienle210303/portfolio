import { describe, expect, it } from "vitest";
import { buildChapters, buildFieldTag, shortPlace } from "@/lib/hero";
import { currentEntry } from "@/lib/content";
import { buildDocuments } from "@/lib/answer-corpus";
import { careerEntries, companions, hero, origin, profile } from "@/content/portfolio";

describe("hero chapters", () => {
  const chapters = buildChapters();

  it("are the four stops, in order", () => {
    expect(chapters.map((c) => c.id)).toEqual(["origin", "eastside-high", "usc-degree", "doordash"]);
    expect(chapters.map((c) => c.year)).toEqual(["2003", "Dec 2018", "2021", "2025"]);
    expect(chapters.map((c) => c.place)).toEqual(["Kiên Giang", "Taylors", "USC", "DoorDash"]);
    expect(chapters.map((c) => c.drawing)).toEqual(["tag-rice", "tag-pine", "tag-palmetto", "tag-laptop"]);
    expect(chapters.map((c) => c.entryId)).toEqual([null, "eastside-high", "usc-degree", "doordash"]);
  });

  it("takes the Taylors line from the entry's own headline", () => {
    expect(chapters[1].line).toBe(careerEntries.find((e) => e.id === "eastside-high")!.headline);
  });

  it("takes the other lines from the authored ones", () => {
    expect(chapters[0].line).toBe(hero.chapterLines.origin);
    expect(chapters[2].line).toBe(hero.chapterLines["usc-degree"]);
    expect(chapters[3].line).toBe(hero.chapterLines.doordash);
  });

  it("shortPlace", () => {
    expect(shortPlace("Kiên Giang, Việt Nam")).toBe("Kiên Giang");
    expect(shortPlace("University of South Carolina")).toBe("USC");
    expect(shortPlace("DoorDash, Inc.")).toBe("DoorDash");
    expect(shortPlace("Taylors, South Carolina")).toBe("Taylors");
  });
});

describe("hero field tag", () => {
  const tag = buildFieldTag();

  it("rows come from content", () => {
    expect(tag.rows.map((r) => r.label)).toEqual(["Name", "Native to", "Transplanted", "Habitat", "Formerly", "Companions"]);
    expect(tag.rows[0].value).toBe(profile.name);
    expect(tag.rows[1]).toMatchObject({ value: origin.from, star: true });
    expect(tag.rows[2].value).toBe(origin.to);
    expect(tag.rows[5].value).toBe("Two cats, Moon and Mi");
    expect(tag.status).toBe("Still growing");
    expect(tag.motto).toBe(profile.motto);
    expect(tag.linkedin).toBe("https://www.linkedin.com/in/thienle210303");
  });

  it("flags only the Vietnamese value for the sans face", () => {
    expect(tag.rows.filter((r) => r.face === "sans").map((r) => r.value)).toEqual([origin.from]);
  });

  it("authored rows stay true to the record", () => {
    expect(hero.fieldTag.habitat.startsWith(currentEntry().organization.split(",")[0])).toBe(true);
    expect(careerEntries.find((e) => e.id === "fu-of-kyoto")!.role.startsWith("Chef")).toBe(true);
    expect(hero.fieldTag.formerly.startsWith("Chef")).toBe(true);
    expect(companions.length).toBe(2);
  });

  it("the off-duty cat is Moon", () => {
    expect(companions[0].id).toBe("moon");
  });
});

describe("hero copy", () => {
  it("is not indexed by the chat", () => {
    const text = buildDocuments().map((d) => JSON.stringify(d)).join("\n");
    for (const s of [hero.hint, hero.invitation, ...Object.values(hero.chapterLines)]) {
      expect(text).not.toContain(s);
    }
  });
});
