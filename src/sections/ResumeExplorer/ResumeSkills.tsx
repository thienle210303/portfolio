import type { SkillCategory } from "@/types/portfolio";
import { Disclosure } from "@/components/ui/Disclosure";
import { Tag } from "@/components/ui/Tag";

interface ResumeSkillsProps {
  readonly categories: readonly SkillCategory[];
}

/**
 * Skills, résumé-style: category label, skill names as tags, and the
 * `evidence` line showing where the category actually shows up in real
 * work. No percentages, proficiency bars or star ratings — the previous
 * portfolio had exactly that as unmeasured decoration and it was
 * deliberately removed; only names and sourced evidence render here.
 *
 * Receives an already lens-filtered list from the client island and holds
 * no state of its own (`Disclosure`'s internal open/closed state is its
 * own concern, not this component's).
 */
export default function ResumeSkills({ categories }: ResumeSkillsProps) {
  return (
    <Disclosure id="resume-group-skills" summary={`Skills (${categories.length})`} defaultOpen>
      {categories.length === 0 ? (
        <p className="text-[length:var(--step-0)] text-[color:var(--fg-muted)]">
          No skill categories match this lens. Choose a different lens above.
        </p>
      ) : (
        <ul role="list" className="grid gap-6 sm:grid-cols-2">
          {categories.map((category) => (
            <li
              key={category.id}
              className="print-avoid-break border border-[color:var(--rule-color)] p-5"
            >
              <h4 className="font-display text-[length:var(--step-1)] text-[color:var(--fg)]">
                {category.label}
              </h4>
              <ul role="list" className="mt-3 flex flex-wrap gap-2">
                {category.skills.map((skill) => (
                  <li key={skill}>
                    <Tag className="wrap-anywhere">{skill}</Tag>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[length:var(--step--1)] leading-relaxed text-[color:var(--fg-muted)]">
                {category.evidence}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Disclosure>
  );
}
