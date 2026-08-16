import type { ResumeDepth } from "@/types/portfolio";
import { FilterGroup, type FilterOption } from "@/components/ui/FilterGroup";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { cn } from "@/lib/cn";

interface ResumeControlsProps {
  readonly lensOptions: readonly FilterOption[];
  readonly lens: string;
  readonly onLensChange: (id: string) => void;
  readonly activeLensDescription: string | undefined;
  readonly depth: ResumeDepth;
  readonly onDepthChange: (depth: ResumeDepth) => void;
  readonly onReset: () => void;
  readonly resetDisabled: boolean;
  readonly email: string;
  readonly resumePdf: string | undefined;
  readonly onPrint: () => void;
}

const DEPTH_OPTIONS: ReadonlyArray<{ readonly id: ResumeDepth; readonly label: string }> = [
  { id: "quick-scan", label: "Quick Scan" },
  { id: "deep-dive", label: "Deep Dive" },
];

// Matches CopyButton's own hand-rolled chip style, for visual consistency
// between the utility controls in this row (Button's variants are a
// sans-serif, non-uppercase style meant for primary/secondary actions).
const CHIP_CLASSES =
  "inline-flex min-h-11 items-center gap-2 border border-[color:var(--rule-color)] px-4 py-2 font-mono text-[length:var(--step--1)] uppercase tracking-[0.05em] text-[color:var(--fg-muted)] transition-colors duration-200 hover:border-[color:var(--fg)] hover:text-[color:var(--fg)]";

/**
 * The résumé's controls row: lens filter, depth toggle, reset, and the
 * copy/download/print actions. Purely presentational — `lens`/`depth`
 * state and every handler live in `ResumeExplorerClient`, the section's one
 * client island. The whole block carries `.no-print` so it disappears from
 * the print stylesheet (globals.css owns the actual print rules).
 */
export default function ResumeControls({
  lensOptions,
  lens,
  onLensChange,
  activeLensDescription,
  depth,
  onDepthChange,
  onReset,
  resetDisabled,
  email,
  resumePdf,
  onPrint,
}: ResumeControlsProps) {
  return (
    <div className="no-print space-y-8">
      <div>
        <h3 className="font-mono text-[length:var(--step--1)] uppercase tracking-[0.08em] text-[color:var(--fg-subtle)]">
          Lens
        </h3>
        <FilterGroup
          label="Filter résumé by lens"
          options={lensOptions}
          value={lens}
          onChange={onLensChange}
          idPrefix="resume-lens"
          className="mt-3"
        />
        {activeLensDescription ? (
          <p className="mt-2 text-[length:var(--step--1)] leading-relaxed text-[color:var(--fg-subtle)]">
            {activeLensDescription}
          </p>
        ) : null}
      </div>

      <div>
        <h3 className="font-mono text-[length:var(--step--1)] uppercase tracking-[0.08em] text-[color:var(--fg-subtle)]">
          Detail level
        </h3>
        <div role="group" aria-label="Résumé detail level" className="mt-3 flex gap-2">
          {DEPTH_OPTIONS.map((option) => {
            const active = option.id === depth;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => onDepthChange(option.id)}
                className={cn(CHIP_CLASSES, active && "border-[color:var(--fg)] text-[color:var(--fg)]")}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <Button type="button" variant="secondary" size="sm" onClick={onReset} disabled={resetDisabled}>
        Reset filters
      </Button>

      <div className="flex flex-wrap gap-3 border-t border-[color:var(--rule-color)] pt-6">
        <CopyButton value={email} label="Copy email address" copiedLabel="Email copied" />
        {resumePdf ? (
          <ExternalLink href={resumePdf} className={CHIP_CLASSES}>
            Download résumé (PDF)
          </ExternalLink>
        ) : null}
        <Button type="button" variant="secondary" size="sm" onClick={onPrint}>
          Print résumé
        </Button>
      </div>
    </div>
  );
}
