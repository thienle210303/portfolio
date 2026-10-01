import { careerEntries } from "@/content/portfolio";
import { cn } from "@/lib/cn";

/**
 * The entries that stop being branches in round 18 and become one line.
 *
 * They were padding the tree to twenty branches. Three are bare milestones
 * (a title, an organisation and a date and nothing else); the rest carry at
 * most a line or two of `built` or `impact`, which `/resume` still shows in
 * full. A branch has to earn the room it takes on a drawing that has to fit
 * one screen, and a one-line credential does not.
 *
 * They are not deleted from the content layer: `careerEntries` is unchanged,
 * `/resume` still reads all nine, and the globe and the answer corpus still
 * see them. Only the drawing stops giving each a limb.
 *
 * This list is a set, not a sequence: the strip sorts by `sortKey`, the same
 * way the tree does, so a reader sees the credentials in the order they
 * happened whatever order the ids are written in here.
 */
export const DEMOTED_ENTRY_IDS = [
  "usc-degree",
  "graduation",
  "cockyhacks",
  "code-to-give",
  "capstone",
  "llm-classifier",
  "magellan",
  "acm-webmaster",
  "deans-list",
] as const;

const DEMOTED: ReadonlySet<string> = new Set(DEMOTED_ENTRY_IDS);

/** Whether an entry is drawn as a credential rather than as a branch. Takes a
 *  plain `string` so a caller never needs a cast to ask the question. */
export function isDemotedEntry(entryId: string): boolean {
  return DEMOTED.has(entryId);
}

/**
 * The nine demoted entries as one wrapped line each of
 * `role · organization · dateRange`, read from `careerEntries` and never
 * retyped. A Server Component's worth of markup with no interactivity of its
 * own — it takes a class name and nothing else.
 */
export default function CredentialsStrip({ className }: { readonly className?: string }) {
  const entries = careerEntries
    .filter((entry) => DEMOTED.has(entry.id))
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
            <span className="text-fg">{entry.role}</span>
            {entry.organization ? <> · {entry.organization}</> : null}
            {" · "}
            {entry.dateRange}
          </li>
        ))}
      </ul>
    </div>
  );
}
