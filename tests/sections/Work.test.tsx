import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { work } from "@/content/portfolio";
import { SHOWN } from "@/lib/showcase";
import { caseStudyAnchorId } from "@/sections/CareerTree/anchors";
import CaseStudy from "@/sections/Work/CaseStudy";
import Work from "@/sections/Work/Work";

const SECTION_IDS = ["about", "work", "tree", "record", "contact"];

describe("Work (round 32)", () => {
  it("is a section with its heading and one sheet per shown case study", () => {
    render(<Work />);
    const section = document.getElementById("work")!;
    expect(section.tagName).toBe("SECTION");
    expect(within(section).getByRole("heading", { level: 2, name: work.heading })).toBeInTheDocument();
    const items = section.querySelectorAll("ul.work-sheets > li");
    expect([...items].map((li) => li.id)).toEqual(SHOWN.map((p) => caseStudyAnchorId(p.id)));
    for (const item of items) {
      // The fragment lands on the untilted item; the tilted sheet inside it plays its drawing when seen.
      expect(item.className).toMatch(/\bscroll-mt-20\b/);
      expect(item.querySelector("article")).toHaveAttribute("data-ink-root");
    }
  });

  it("makes each sheet one link, named by its title, to its page", () => {
    render(<Work />);
    for (const [i, project] of SHOWN.entries()) {
      const sheet = document.getElementById(caseStudyAnchorId(project.id))!;
      const links = within(sheet).getAllByRole("link");
      expect(links, project.id).toHaveLength(1);
      expect(links[0]).toHaveAttribute("href", `/work/${project.id}`);
      expect(links[0]).toHaveAccessibleName(project.title);
      // What it shows, in words: the drawing itself is decoration.
      expect(sheet).toHaveTextContent(project.showcase.big);
      expect(sheet).toHaveTextContent(project.showcase.caption);
      expect(sheet).toHaveTextContent(`${i + 1} of ${SHOWN.length}`);
      for (const drawing of sheet.querySelectorAll(".work-draw")) expect(drawing).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("ships no client code", () => {
    for (const file of ["Work.tsx", "Exhibit.tsx", "CaseStudy.tsx"]) {
      expect(readFileSync(`src/sections/Work/${file}`, "utf8"), file).not.toMatch(/^["']use client["']/m);
    }
  });
});

describe("a case study's page (round 32)", () => {
  it.each(SHOWN.map((p) => [p.id, p] as const))("%s: shows first, tells only when asked", (_id, project) => {
    render(<CaseStudy project={project} />);
    expect(screen.getByRole("heading", { level: 1, name: project.title })).toBeInTheDocument();
    expect(document.querySelector(".work-lead .work-big")).toHaveTextContent(project.showcase.big);
    // The write-up is all there, closed.
    const long = document.querySelector("details")!;
    expect(long).not.toHaveAttribute("open");
    expect(within(long).getByText(work.long)).toBeInTheDocument();
    expect(long).toHaveTextContent(project.problem);
    // My three calls, as notes.
    for (const call of project.showcase.calls) expect(screen.getByText(call)).toBeInTheDocument();
    // Back to the section; the neighbours and the postcard at the foot.
    expect(screen.getAllByRole("link")[0]).toHaveAttribute("href", "/#work");
    const ring = screen.getByRole("navigation", { name: "Case studies" });
    expect(within(ring).getAllByRole("link").map((a) => a.getAttribute("href"))).toContain("/#contact");
    // None of the page's section ids: the nav, its scrollspy and the cats key off them.
    for (const id of SECTION_IDS) expect(document.getElementById(id), id).toBeNull();
  });
});
