import { describe, expect, it } from "vitest";
import { buildTerminal, currentEntry } from "@/lib/terminal";
import { aiTools, careerEntries, companions, origin, profile } from "@/content/portfolio";

function tab(id: "whoami" | "now" | "exploring") {
  const found = buildTerminal().find((t) => t.id === id);
  if (!found) throw new Error(`no ${id} tab`);
  return found;
}

function line(id: "whoami" | "now" | "exploring", key: string) {
  return tab(id).lines.find((l) => l.key === key)?.value;
}

describe("buildTerminal", () => {
  it("whoami carries the motto verbatim", () => {
    expect(line("whoami", "motto")).toBe("Practice makes AI.");
    expect(line("whoami", "motto")).toBe(profile.motto);
  });

  it("every value is a content string", () => {
    const doordash = careerEntries.find((e) => e.id === "doordash");
    const sources = new Set<string>([
      profile.title,
      profile.focus,
      profile.motto,
      profile.location as string,
      origin.from,
      doordash!.role,
      doordash!.organization,
      doordash!.headline!,
      ...companions.map((c) => c.name),
      ...aiTools.map((t) => t.name),
    ]);
    const tabs = buildTerminal();
    expect(tabs.map((t) => t.id)).toEqual(["whoami", "now", "exploring"]);
    for (const t of tabs) {
      expect(t.lines.length, t.id).toBeGreaterThan(0);
      for (const l of t.lines) {
        const values = typeof l.value === "string" ? [l.value] : l.value;
        for (const value of values) expect(sources.has(value), `${t.id}.${l.key}: ${value}`).toBe(true);
      }
    }
    expect(line("whoami", "cats")).toEqual(companions.map((c) => c.name));
  });

  it("exploring lists every ai tool in order", () => {
    expect(line("exploring", "tools")).toEqual(aiTools.map((t) => t.name));
  });

  it("now is the current role", () => {
    const doordash = careerEntries.find((e) => e.id === "doordash");
    expect(line("now", "at")).toBe(doordash!.organization);
    expect(currentEntry().id).toBe("doordash");
  });

  it("throws without a current entry", () => {
    const past = careerEntries.filter((e) => !e.dateRange.endsWith("Present"));
    expect(() => buildTerminal(past)).toThrow();
  });

  it("no source-code framing", () => {
    for (const t of buildTerminal()) {
      expect(t.command).not.toContain(".ts");
      for (const l of t.lines) expect(l.key).not.toContain(".ts");
      expect(JSON.stringify(t).toLowerCase()).not.toContain("source code");
    }
  });
});
