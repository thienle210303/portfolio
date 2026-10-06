import ExternalLink from "@/components/ui/ExternalLink";
import { validBookingUrl } from "@/lib/booking";
import { profile } from "@/content/portfolio";

/**
 * The ways out that need no form and that `BusinessCard` does not already
 * carry. The card holds the email (with its copy button), GitHub and
 * LinkedIn; repeating them here would put the same facts twice in one
 * section, so this row is the résumé PDF plus, when a booking URL is
 * configured, a link to book a call. Without a usable booking URL
 * (see `validBookingUrl`) there is no booking link and no placeholder for one.
 *
 * The PDF path is read from `profile.resumePdf` so it cannot drift from the
 * one the `/resume` page's "Download PDF" button uses. (The hero links the
 * `/resume` page, not the file.) Booking is a plain link, never an embedded
 * widget: the JS budget and the no-dependency rule both forbid a script.
 *
 * A Server Component: plain anchors, no client JS. Deliberately not blue-
 * filled: the send button is the one `bg-accent` control in Contact.
 */
interface DirectLinksProps {
  /** Read from `BOOKING_URL` in `page.tsx`; `undefined` or non-https renders no booking link. */
  readonly bookingUrl?: string;
}

const linkClass =
  "inline-flex min-h-11 items-center border border-rule bg-surface px-5 text-[length:var(--step--1)] text-fg hover:border-fg-muted";

export default function DirectLinks({ bookingUrl }: DirectLinksProps) {
  const resumePdf = profile.resumePdf;
  const booking = validBookingUrl(bookingUrl);
  if (!resumePdf && !booking) return null;
  return (
    <div className="no-print mt-8">
      <p id="direct-links-label" className="text-[length:var(--step--1)] text-fg-muted">
        Or skip the form
      </p>
      <ul role="list" aria-labelledby="direct-links-label" className="mt-3 flex flex-wrap gap-4">
        {booking ? (
          <li>
            <ExternalLink href={booking} className={linkClass}>
              Book a call
            </ExternalLink>
          </li>
        ) : null}
        {resumePdf ? (
          <li>
            <ExternalLink href={resumePdf} className={linkClass}>
              {profile.resumePdfLabel}
            </ExternalLink>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
