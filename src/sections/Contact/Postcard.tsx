import { contactCopy } from "@/content/portfolio";
import { Drawing } from "@/components/scenery/Drawing";
import LeadForm from "./LeadForm";
import { BoardStamp, PostcardStamps } from "./SentStamp";

/**
 * The lead form as a postcard home (round 21's postcard board). The picture
 * side is Taylors (pines, a palmetto, a heron, rice) under "Greetings from";
 * the address side carries the Vietnam-flag stamp, a TAYLORS SC postmark and
 * the form, written on lines. A server component around the one client
 * island, `LeadForm`.
 *
 * The address side comes first in the markup (round 22): the form is what
 * this section asks for, so it leads in reading and tab order. Laid out by its
 * own width, never the viewport's (round 25 moved the turn from 32rem to
 * 40rem, so a form column is never squeezed beside the picture):
 *  - from 40rem the two sides stand side by side, the board mirrored (the
 *    address side left). The drawing is contained, never cropped: it sits on
 *    the bottom edge and the spare sky above it holds "Greetings from".
 *  - narrower, it is a postcard held upright: the picture over the address
 *    side, the form the full width of the card. Under 30rem the picture is the
 *    top of the drawing, cut just under the heron's feet; from 30rem (a laptop's
 *    column, a small tablet) it is a landscape band, the whole drawing standing
 *    at its right and "Greetings from" in the sky beside it.
 *
 * The postmark's words are HTML, not part of the drawing: an SVG used as an
 * image cannot load the site's fonts. They are set on two lines so they sit
 * inside the inner ring (one line of ten letters is wider than the ring), and
 * the whole mark is `aria-hidden`: it is texture, the place is said beside it.
 *
 * The picture sits in a scene box of its own (`.postcard-scene`, globals.css,
 * "Round 24, builder A"): exactly the drawing's 340 x 440, so the SENT stamp
 * can be placed against the drawing's empty sky (`BoardStamp`) and stay there
 * at every width. The sky left of the sun is the stamp's: nothing is drawn
 * there, and the heading sits above it. Stacked, the stamp is on the address
 * side instead (`SentStamp.tsx`).
 *
 * `.no-print`: a printed page cannot send a postcard.
 */
export default function Postcard({ emailDeliveryConfigured }: { readonly emailDeliveryConfigured: boolean }) {
  const postmark = contactCopy.postcard.place.replace(",", "").toUpperCase();

  return (
    <div data-postcard="" className="no-print @container/postcard relative rotate-[0.6deg] lg:-rotate-[1.2deg]">
      <PostcardStamps>
        <div className="paper-lift grid bg-surface p-[15px] text-fg @min-[40rem]:min-h-[470px] @min-[40rem]:grid-cols-[minmax(0,0.53fr)_minmax(0,0.47fr)]">
          <div
            data-postcard-side="address"
            className="relative flex flex-col pt-[118px] pb-2.5 @min-[30rem]:pt-8 @min-[40rem]:mr-3.5 @min-[40rem]:pt-[118px] @min-[40rem]:border-r @min-[40rem]:border-rule @min-[40rem]:pr-[30px] @min-[40rem]:pl-2"
          >
            <Drawing name="flag-stamp" className="stamp-lift absolute top-4 right-0 h-[92px] w-[77px] @min-[40rem]:top-1.5 @min-[40rem]:right-[30px]" />
            <div aria-hidden="true" className="absolute top-7 right-[70px] h-[72px] w-[120px] -rotate-6 @min-[40rem]:top-[26px] @min-[40rem]:right-[84px]">
              <Drawing name="postmark" className="h-full w-full text-fg-muted" />
              {/* Centred on the rings (36, 36 in this box); 44px wide, so the
                  two words break onto two lines inside the 54px inner ring. */}
              <span className="absolute top-[36px] left-[36px] w-[44px] -translate-1/2 text-center font-mono text-[9px] leading-[1.25] tracking-[0.04em] text-fg-muted">
                {postmark}
              </span>
            </div>
            <LeadForm emailDeliveryConfigured={emailDeliveryConfigured} />
          </div>

          <div
            data-postcard-side="picture"
            className="postcard-sky relative order-first mb-4 overflow-hidden bg-ground @min-[40rem]:order-none @min-[40rem]:mb-0"
          >
            <div className="postcard-scene">
              <Drawing name="postcard-scene" className="absolute inset-0" />
              <BoardStamp />
            </div>
            {/* Lettering on a drawing scales with the drawing: sized by the
                panel's width (`cqw`), so on the narrowest phone the place
                name still ends short of the sun. 22px and 30px from a
                300px panel up. */}
            <p className="relative px-[18px] pt-4 font-serif text-[clamp(1rem,7.3cqw,1.375rem)] leading-[1.15] italic">
              {contactCopy.postcard.greetings}
              <br />
              <span className="font-display text-[clamp(1.375rem,10cqw,1.875rem)] font-semibold tracking-[-0.02em] not-italic">
                {contactCopy.postcard.place}
              </span>
            </p>
          </div>
        </div>
      </PostcardStamps>
    </div>
  );
}
