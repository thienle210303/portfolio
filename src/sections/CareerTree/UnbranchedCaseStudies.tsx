import { projects } from "@/content/portfolio";
import CaseStudy from "./CaseStudy";
import { isDemotedEntry } from "@/lib/knowledge-tree";

const HEADING_ID = "unbranched-case-studies-heading";

/**
 * The case studies whose career entry is no longer a branch.
 *
 * A case study renders inside the branch of the role it was built in. Round 18
 * demotes nine entries to one credentials line, and five projects were built
 * under two of them — four course projects under the degree, and the
 * capstone — so there is no branch for them to open from. They are not
 * trimmed to make that tidy: the prose is the site's best writing. They render
 * here, after the stage, in the same component and with the same markup as
 * every other case study, and each still names the entry it came from in its
 * own masthead.
 *
 * Which projects these are is derived — a project whose `careerEntryId` is a
 * demoted entry — so adding a role to the drawing, or demoting one, moves its
 * projects between here and a branch without anyone editing a list. A Server
 * Component: nothing about it is interactive beyond the disclosure each case
 * study already owns.
 */
export default function UnbranchedCaseStudies() {
  const homeless = projects.filter((project) => isDemotedEntry(project.careerEntryId));
  if (homeless.length === 0) return null;

  return (
    <section data-unbranched-case-studies="" aria-labelledby={HEADING_ID} className="mt-16">
      <h3
        id={HEADING_ID}
        className="font-display text-[length:var(--step-2)] font-normal leading-snug tracking-(--tracking-display) text-fg"
      >
        Coursework and capstone
      </h3>
      <div className="mt-8">
        {homeless.map((project) => (
          <CaseStudy key={project.id} project={project} index={projects.indexOf(project)} />
        ))}
      </div>
    </section>
  );
}
