import { cn } from "@/lib/cn";
import { buildHighlights } from "@/lib/highlights";

const HIGHLIGHTS = buildHighlights();

/** "17h → 3m": the arrow is decoration; a screen reader hears "to". */
function Value({ value }: { value: string }) {
  const parts = value.split(" → ");
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && (
            <>
              <span aria-hidden="true"> → </span>
              <span className="sr-only"> to </span>
            </>
          )}
          {part}
        </span>
      ))}
    </>
  );
}

/**
 * Five measured cards that open the Journey. Each is one link to its entry's
 * timeline row; the figure and label are authored in `highlights`
 * (`src/content/portfolio.ts`) and test-traced to that entry. The first card
 * is the loud one and spans two of three columns at 1024px+.
 *
 * The `<a>` stays in the base tone and the card's paint is an inner
 * `tone-contrast` box: the focus outline is drawn outside the card, and
 * `tone-contrast` repoints `--ring-color` to a colour that fails 3:1 on the day
 * ground it would sit on.
 */
export default function JourneyHighlights({ className }: { className?: string }) {
  return (
    <ul
      aria-label="Highlights"
      className={cn("grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 lg:grid-cols-3", className)}
    >
      {HIGHLIGHTS.map((h, i) => (
        <li key={h.entryId} className={cn("flex", i === 0 && "col-span-full lg:col-span-2")}>
          <a href={h.href} className="flex w-full">
            <div
              className={cn(
                "flex w-full flex-col justify-between gap-3 rounded-lg border border-rule p-4 sm:p-5",
                i === 0 ? "tone-contrast bg-ground text-fg" : "bg-surface text-fg",
              )}
            >
              <span className="font-display text-[length:var(--step-4)] leading-none text-accent">
                <Value value={h.value} />
              </span>
              <span className="text-fg-muted">{h.label}</span>
              <span className="eyebrow">
                {h.year} · {h.organization}
              </span>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
