import type { ScrapingPlaybookMove } from "@/types/portfolio";

interface ScrapingPlaybookProps {
  readonly intro: string;
  readonly moves: readonly ScrapingPlaybookMove[];
}

/**
 * "How I solve problems with scraping knowledge" — the owner's approved
 * prose from `src/content/ai-experiments.ts`, rendered between the chat and
 * the experiments. A Server Component with no state: it is a reading, not a
 * widget.
 *
 * Each move's evidence link points at the in-page case study already making
 * the same claim with sourced metrics — the playbook adds the owner's
 * judgement, never a new number. Ordered-list semantics without ordinal
 * decoration: the moves read in the order they were learned, but nothing
 * about them is a numbered procedure, so painting `01/02/03` on them would
 * claim a sequence the content doesn't have.
 */
export function ScrapingPlaybook({ intro, moves }: ScrapingPlaybookProps) {
  return (
    <div>
      <h3
        id="lab-playbook-heading"
        className="font-display text-[length:var(--step-3)] leading-tight tracking-[-0.01em] text-[color:var(--fg)]"
      >
        How I solve problems with scraping knowledge
      </h3>

      <p className="prose-measure mt-4 text-[length:var(--step-0)] leading-relaxed text-[color:var(--fg-muted)]">
        {intro}
      </p>

      <ul role="list" aria-labelledby="lab-playbook-heading" className="mt-8 space-y-8">
        {moves.map((move) => (
          <li key={move.id} className="prose-measure border-l-2 border-[color:var(--rule-color)] pl-5 sm:pl-6">
            <h4 className="text-[length:var(--step-1)] font-medium leading-snug text-[color:var(--fg)]">
              {move.title}
            </h4>
            <p className="mt-2 text-[length:var(--step-0)] leading-relaxed text-[color:var(--fg-muted)]">
              {move.body}
            </p>
            <p className="mt-2 font-mono text-[length:var(--step--1)] text-[color:var(--fg-subtle)]">
              Proven above:{" "}
              <a href={move.evidenceHref} className="ink-link text-accent">
                {move.evidenceLabel}
              </a>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ScrapingPlaybook;
