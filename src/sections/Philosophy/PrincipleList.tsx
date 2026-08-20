/**
 * The three working principles as a numbered editorial list: a big mono
 * index numeral (decorative — the surrounding <ol> already conveys order to
 * assistive technology, matching the index treatment in
 * SelectedWork/CaseStudy.tsx), a display-serif title, a prominent summary
 * and a muted detail line. `evidence` is optional on the `Principle` type —
 * all three entries happen to carry one today, but this renders nothing for
 * a principle that doesn't, rather than an empty bordered box.
 *
 * The numeral treatment (large structural mono in `--fg-subtle`, hidden from
 * assistive technology) matches CaseStudy's chapter-opener masthead, so the
 * two numbered lists on the page read as one consistent system. CaseStudy no
 * longer uses a 2/12 numeral gutter — that column now pays for the section's
 * sticky index — so the *proportions* here are this list's own.
 */
import { cn } from "@/lib/cn";
import type { Principle } from "@/types/portfolio";
import { Button } from "@/components/ui/Button";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";

interface PrincipleListProps {
  readonly principles: readonly Principle[];
}

const LABEL_ID = "philosophy-principles-label";

const titleId = (id: string) => `principle-${id}-title`;

const PROSE_CLASS = "prose-measure text-[length:var(--step-0)] leading-[1.6] text-[color:var(--fg-muted)]";

export default function PrincipleList({ principles }: PrincipleListProps) {
  return (
    <div>
      <p id={LABEL_ID} className="eyebrow">
        Principles
      </p>
      <ol role="list" aria-labelledby={LABEL_ID} className="mt-6">
        {principles.map((principle) => (
          <li
            key={principle.id}
            aria-labelledby={titleId(principle.id)}
            className={cn(
              "border-t border-[color:var(--rule-color)] py-10 first:border-t-0 first:pt-0",
              "md:grid md:grid-cols-12 md:gap-x-8",
            )}
          >
            <p
              aria-hidden="true"
              className="font-mono text-[length:var(--step-4)] leading-none text-[color:var(--fg-subtle)] md:col-span-2 md:col-start-1"
            >
              {String(principle.index).padStart(2, "0")}
            </p>

            <div className="mt-4 md:col-span-10 md:col-start-3 md:mt-0">
              <h3
                id={titleId(principle.id)}
                className="font-display text-[length:var(--step-2)] font-normal leading-[1.1] tracking-[-0.01em] text-[color:var(--fg)]"
              >
                {principle.title}
              </h3>
              <p className="prose-measure mt-3 text-[length:var(--step-1)] leading-[1.6] text-[color:var(--fg)]">
                {principle.summary}
              </p>
              <p className={cn(PROSE_CLASS, "mt-3")}>{principle.detail}</p>

              {principle.evidence ? (
                <div className="prose-measure mt-6 border border-[color:var(--rule-color)] p-5">
                  <p className="eyebrow">{principle.evidence.context}</p>
                  <p className={cn(PROSE_CLASS, "mt-3")}>{principle.evidence.body}</p>
                  {principle.evidence.projectId ? (
                    <div className="mt-4">
                      <Button href="#work" variant="quiet" size="sm">
                        See the case study
                        <VisuallyHidden> — {principle.evidence.context}</VisuallyHidden>
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
