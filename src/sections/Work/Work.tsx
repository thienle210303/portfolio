import type { CSSProperties } from "react";
import { Section } from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import { work } from "@/content/portfolio";
import { SHOWN, shownPlace, workHref, type ShownProject } from "@/lib/showcase";
import { caseStudyAnchorId } from "@/sections/CareerTree/anchors";
import { ShowDrawing, ShowFigureView } from "./Exhibit";

const HEADING_ID = "work-heading";

/** Each sheet lies a little crooked, never the same way twice (like the
 *  oak's `TAG_LOOKS`: authored, not random). */
const TILTS = ["-0.5deg", "0.6deg", "0.4deg", "-0.7deg"] as const;

/**
 * Work (round 32): the case studies, right after About, shown rather than
 * told. Thien, reviewing the text cards first drawn for this: "I want to show
 * case instead of bunch of text… Nobody is read it". So each is one sheet of
 * computation paper with a drawing made from its own numbers, a title, one
 * number and a line; the whole story is its own page, `/work/<id>`.
 *
 * Each sheet's item is `work-<id>`, the id old links to a case study already
 * use (`caseStudyAnchorId`); the sheet is its own `[data-ink-root]`, so its drawing
 * plays when it comes into view. Server-rendered; plain links, no prefetch.
 */
export default function Work() {
  return (
    <Section id="work" labelledBy={HEADING_ID} tone="base" className="relative">
      <SectionHeading id={HEADING_ID} size="chapter" lead={<span className="font-serif italic">{work.lead}</span>}>
        {work.heading}
      </SectionHeading>
      <ul className="work-sheets mt-10 lg:mt-12">
        {SHOWN.map((project, i) => (
          // The id is on the untilted item, not the tilted sheet: a browser lands
          // a fragment on the box it sees, and Safari sees the tilted one.
          <li key={project.id} id={caseStudyAnchorId(project.id)} className="scroll-mt-20">
            <WorkSheet project={project} n={i + 1} total={SHOWN.length} tilt={TILTS[i % TILTS.length]!} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

function WorkSheet({
  project,
  n,
  total,
  tilt,
}: {
  readonly project: ShownProject;
  readonly n: number;
  readonly total: number;
  readonly tilt: string;
}) {
  const { showcase } = project;
  // A diagram and the first figure, or, with no diagram, the first two figures.
  const figures = showcase.figures.slice(0, showcase.drawing ? 1 : 2);
  return (
    <article
      data-ink-root=""
      // The title is the link, stretched over the sheet; the ring goes round
      // the sheet it opens, not the title's line box.
      className="work-sheet group relative bg-surface has-[.work-link:focus-visible]:outline-2 has-[.work-link:focus-visible]:outline-offset-[3px] has-[.work-link:focus-visible]:outline-(--ring-color)"
      style={{ "--tilt": tilt } as CSSProperties}
    >
      <span aria-hidden="true" className="work-clip" />
      <p className="work-block">
        <span>{shownPlace(project)}</span>
        <span>{work.sheetOf.replace("{n}", String(n)).replace("{total}", String(total))}</span>
      </p>
      <div className="work-body">
        <h3 className="font-display text-[length:var(--step-2)] leading-tight font-semibold tracking-(--tracking-display) text-fg">
          <a href={workHref(project.id)} className="work-link focus-visible:outline-none">
            {project.title}
          </a>
        </h3>
        <div aria-hidden="true" className="work-draw">
          {showcase.drawing ? <ShowDrawing drawing={showcase.drawing} /> : null}
          {figures.map((figure) => (
            <ShowFigureView key={figure.caption} figure={figure} />
          ))}
        </div>
        <p className="work-big">
          {showcase.big}
          {showcase.small ? <small> {showcase.small}</small> : null}
        </p>
        <p className="font-mono text-[length:var(--step--1)] leading-snug text-fg-muted">{showcase.caption}</p>
        <span aria-hidden="true" className="work-more">
          {work.more} <span>→</span>
        </span>
      </div>
    </article>
  );
}
