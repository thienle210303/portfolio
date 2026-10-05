import ExternalLink from "@/components/ui/ExternalLink";
import { profile } from "@/content/portfolio";

/**
 * The ways out that need no form and that `BusinessCard` does not already
 * carry. The card holds the email (with its copy button), GitHub and
 * LinkedIn; repeating them here would put the same facts twice in one
 * section, so this row is only the résumé PDF. Booking a call joins it when a
 * booking URL is configured.
 *
 * The PDF path is read from `profile.resumePdf` so it cannot drift from the
 * one the `/resume` page's "Download PDF" button uses. (The hero links the
 * `/resume` page, not the file.)
 *
 * A Server Component: a plain anchor, no client JS. Deliberately not blue-
 * filled: the send button is the one `bg-accent` control in Contact.
 */
export default function DirectLinks() {
  const resumePdf = profile.resumePdf;
  if (!resumePdf) return null;
  return (
    <ul role="list" className="no-print mt-8 flex flex-wrap gap-4">
      <li>
        <ExternalLink
          href={resumePdf}
          className="inline-flex min-h-11 items-center border border-rule bg-surface px-5 text-[length:var(--step--1)] text-fg hover:border-fg-muted"
        >
          {profile.resumePdfLabel}
        </ExternalLink>
      </li>
    </ul>
  );
}
