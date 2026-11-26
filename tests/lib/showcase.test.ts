import { describe, expect, it } from "vitest";
import { careerEntryById, highlights, projects } from "@/content/portfolio";
import { neighbours, SHOWN, shownPlace, workHref } from "@/lib/showcase";
import type { Highlight, Project, Showcase } from "@/types/portfolio";
import { figures } from "./figures";

/** Every digit run a showcase shows must come from its own project's facts or
 *  its entry's: metrics, proof, the tagline, the entry's headline and impact. */
function sources(p: Project): Set<string> {
  const entry = careerEntryById(p.careerEntryId);
  const text = [
    p.tagline,
    ...p.proof,
    ...(p.metrics ?? []).flatMap((m) => [m.label, m.before, m.after]),
    entry?.headline ?? "",
    ...(entry?.impact ?? []),
  ].join(" ");
  return new Set(figures(text));
}

/** The words of a showcase (and of the workflow round 32 drew for it). */
function shownText(p: Project & { showcase: Showcase }): string {
  const s = p.showcase;
  return [
    s.big,
    s.small ?? "",
    s.caption,
    ...(s.numbers ?? []).flatMap((n) => [n.value, n.caption]),
    ...s.figures.flatMap((f) =>
      f.kind === "before-after"
        ? [f.caption, f.before.label, f.after.label]
        : f.kind === "share"
          ? [f.caption, f.before?.label ?? "", f.after.label]
          : [f.caption],
    ),
    ...(p.workflow ? [...p.workflow.before, ...p.workflow.after].flatMap((step) => [step.label, step.note ?? ""]) : []),
  ].join(" ");
}

describe("the shown case studies (round 32)", () => {
  it("are the four featured projects, in the content file's order, each with a showcase", () => {
    expect(SHOWN.map((p) => p.id)).toEqual([
      "dd-feasibility-agent",
      "dd-scraper-platform",
      "usc-research-collection",
      "schaeffler-setup-sheets",
    ]);
    for (const p of projects as readonly Project[]) {
      if (p.featured) expect(p.showcase, `${p.id} is featured but has nothing to show`).toBeDefined();
    }
  });

  it("show only figures their own record holds", () => {
    for (const p of SHOWN) {
      const known = sources(p);
      for (const n of figures(shownText(p))) expect(known.has(n), `${p.id}: ${n}`).toBe(true);
      for (const f of p.showcase.figures) {
        if (f.kind === "count") expect(known.has(String(f.total)), `${p.id}: ${f.total}`).toBe(true);
        if (f.kind === "share") {
          for (const side of [f.before, f.after]) {
            if (side && side.percent > 0) expect(known.has(String(side.percent)), `${p.id}: ${side.percent}%`).toBe(true);
          }
        }
      }
    }
  });

  it("keeps the words few: a short caption, three short calls, a tagline a search result shows whole", () => {
    for (const p of SHOWN) {
      expect(p.showcase.caption.split(/\s+/).length, p.id).toBeLessThanOrEqual(8);
      expect(p.showcase.calls).toHaveLength(3);
      for (const call of p.showcase.calls) expect(call.split(/\s+/).length, call).toBeLessThanOrEqual(8);
      // The tagline is the page's description.
      expect(p.tagline.length, p.id).toBeLessThanOrEqual(160);
    }
  });

  it("opens each from the oak, and names it as the oak's tag does", () => {
    const tags = (highlights as readonly Highlight[]).filter((h) => h.projectId);
    expect(tags.map((h) => h.projectId).sort()).toEqual(SHOWN.map((p) => p.id).sort());
    expect(SHOWN.map(shownPlace)).toEqual([
      "DoorDash · 2026",
      "DoorDash · 2025",
      "USC research · 2022",
      "Schaeffler · 2024",
    ]);
  });

  it("links pages in a ring", () => {
    expect(workHref("x")).toBe("/work/x");
    const first = neighbours(SHOWN[0]!.id)!;
    expect(first.previous.id).toBe(SHOWN.at(-1)!.id);
    expect(first.next.id).toBe(SHOWN[1]!.id);
    expect(neighbours("chess-minmax")).toBeUndefined();
  });
});
