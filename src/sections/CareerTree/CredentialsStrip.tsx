import { ExternalLink } from "@/components/ui/ExternalLink";
import { careerEntries } from "@/content/portfolio";
import { cn } from "@/lib/cn";
import { isDemotedEntry } from "@/lib/knowledge-tree";
import type { CareerEntry } from "@/types/portfolio";

// Widened once: `careerEntries` keeps each entry as a literal, so `.link` is
// not on every member of the union it infers.
const ENTRIES: readonly CareerEntry[] = careerEntries;

/**
 * The nine demoted entries (`DEMOTED_ENTRY_IDS` in `src/lib/knowledge-tree.ts`)
 * as one wrapped line each of `role · organization · dateRange`, read from
 * `careerEntries` and never retyped. A Server Component with no interactivity
 * of its own — it takes a class name and nothing else.
 *
 * An entry that carries a `link` (two of the hackathon entries point at a real
 * repository) keeps it: the role is the anchor, and the link's own authored
 * `label` — the repository path — is set after the date. A sighted visitor
 * learns nothing from the label they could not get by hovering the anchor; it
 * is rendered because `careerEntry.link` is read in exactly this one file now
 * (`/resume` does not read it at all), so without this the authored string
 * would appear nowhere on the site. One extra run of muted mono at the end of
 * a line that already wraps — `wrap-anywhere` was there for the role before
 * this — is the whole cost. That is the whole of what the strip adds to a
 * line: it is not a re-expansion of the branch the entry used to be.
 */
export default function CredentialsStrip({ className }: { readonly className?: string }) {
  const entries = ENTRIES
    .filter((entry) => isDemotedEntry(entry.id))
    .toSorted((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0));

  return (
    <div data-credentials-strip="" className={cn("border-t border-rule pt-4", className)}>
      <p className="eyebrow">Credentials, in order</p>
      <ul role="list" aria-label="Credentials" className="mt-3 space-y-2">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="wrap-anywhere text-[length:var(--step--1)] leading-snug text-fg-muted"
          >
            {entry.link ? (
              <ExternalLink
                href={entry.link.href}
                className="text-accent underline underline-offset-4 hover:no-underline"
              >
                {entry.role}
              </ExternalLink>
            ) : (
              <span className="text-fg">{entry.role}</span>
            )}
            {entry.organization ? <> · {entry.organization}</> : null}
            {" · "}
            {entry.dateRange}
            {entry.link ? (
              <>
                {" · "}
                <span className="font-mono">{entry.link.label}</span>
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
