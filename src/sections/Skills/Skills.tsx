import { Section, type RailNote } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Tag } from "@/components/ui/Tag";
import { certifications, skillCategories } from "@/content/portfolio";
import { TreeCrossLink } from "@/sections/CareerTree/cross-link";
import { resolved } from "@/types/portfolio";

/**
 * Skills, as a section of the page rather than a group inside a résumé.
 *
 * This content used to render only inside the résumé explorer. When that
 * section was removed — it was a second telling of the timeline and the case
 * studies, which the page already shows in full — these two lists were the
 * only things in it with no other home. So they got one.
 *
 * No proficiency bars, percentages or star ratings. Every one of those is an
 * unmeasured number, and this site does not publish figures it cannot source;
 * `evidence` says where the category actually shows up in real work, which is
 * the honest version of the same claim.
 *
 * The career tree, the section after this one, answers the neighbouring
 * question — which technologies were used in which role. This answers what he
 * works with at all, including the things that predate any role listed here.
 * Each category carries an id so the tree's root labels can link straight to
 * the group they name.
 *
 * `category.lenses` (used only by the tree, not by anything rendered in this
 * file) is a second authored edge set living on this same data — category →
 * lens, sitting beside the entry → lens edges `careerEntries[].lenses`
 * carries. It is what lets the tree's root labels say what each skill group
 * *feeds* without joining skill names against technology strings; see the
 * header of `src/lib/knowledge-tree.ts` for why that join is refused.
 */

const HEADING_ID = "skills-heading";

const totalSkills = new Set(skillCategories.flatMap((category) => category.skills)).size;

const RAIL: readonly RailNote[] = [
  { term: "Categories", detail: `${skillCategories.length}` },
  { term: "Distinct skills", detail: `${totalSkills}` },
  ...(certifications.length > 0
    ? [{ term: "Certifications", detail: `${certifications.length}` }]
    : []),
  { term: "Not shown", detail: "Proficiency scores — nothing here is self-rated" },
];

export default function Skills() {
  return (
    <Section id="skills" labelledBy={HEADING_ID} eyebrow="Skills" tone="deep" rail={RAIL}>
      <SectionHeading
        id={HEADING_ID}
        lead="What I actually work with, and where each group of it has shown up. The line under each category is the evidence, not a rating."
      >
        What I work with
      </SectionHeading>

      <ul role="list" className="mt-12 grid gap-px border border-rule bg-rule sm:grid-cols-2">
        {skillCategories.map((category) => (
          <li
            key={category.id}
            // The landing target for the career tree's root labels, which name
            // these same categories and link one each to the group they name.
            // `scroll-mt-24` clears the 4rem sticky header, the same offset a
            // case-study row uses for the jump from its own index.
            id={`skills-${category.id}`}
            className="flex scroll-mt-24 flex-col gap-3 bg-ground p-5"
          >
            <h3 className="font-display text-[length:var(--step-1)] text-fg">{category.label}</h3>

            <ul role="list" className="flex flex-wrap gap-2">
              {category.skills.map((skill) => (
                <li key={skill}>
                  <Tag className="wrap-anywhere">{skill}</Tag>
                </li>
              ))}
            </ul>

            <p className="mt-auto text-[length:var(--step--1)] leading-relaxed text-fg-muted">
              {category.evidence}
            </p>
          </li>
        ))}
      </ul>

      {certifications.length > 0 ? (
        <div className="mt-12">
          <h3 className="eyebrow">Certifications</h3>
          <ul role="list" className="mt-4 flex flex-col gap-3">
            {certifications.map((certification) => {
              // `date` is Maybe<string> and can hold a [NEEDS INPUT] marker, so
              // it resolves to undefined rather than rendering the marker.
              const date = resolved(certification.date);
              return (
                <li
                  key={certification.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule pb-3 last:border-b-0"
                >
                  <span className="text-[length:var(--step-0)] text-fg">{certification.name}</span>
                  <span className="text-[length:var(--step--1)] text-fg-muted">
                    {certification.issuer}
                  </span>
                  {date ? <span className="eyebrow">{date}</span> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* One pointer at the career tree, whose roots carry these same category
          names. It is a link and nothing more: which of these groups produced
          which piece of work is not a relationship anyone has authored, and
          the tree is careful not to draw it either. */}
      <TreeCrossLink />
    </Section>
  );
}
