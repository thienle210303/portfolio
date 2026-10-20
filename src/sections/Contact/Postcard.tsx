import { contactCopy } from "@/content/portfolio";
import { Drawing } from "@/components/scenery/Drawing";
import LeadForm from "./LeadForm";

/**
 * The lead form as a postcard home (round 21's postcard board). The picture
 * side is Taylors (pines, a palmetto, a heron, rice) under "Greetings from";
 * the address side carries the Vietnam-flag stamp, a TAYLORS SC postmark and
 * the form, written on lines. A server component around the one client
 * island, `LeadForm`.
 *
 * Laid out by its own width, not the viewport's: from 32rem the two sides
 * stand side by side as on the board; narrower, it turns portrait, the
 * picture a 300px band on top, cut from the top of the drawing. The postmark's words are HTML, not part of the
 * drawing: an SVG used as an image cannot load the site's fonts.
 *
 * `.no-print`: a printed page cannot send a postcard.
 */
export default function Postcard({ emailDeliveryConfigured }: { readonly emailDeliveryConfigured: boolean }) {
  const postmark = contactCopy.postcard.place.replace(",", "").toUpperCase();

  return (
    <div data-postcard="" className="no-print @container relative rotate-[0.6deg] lg:rotate-[1.2deg]">
      <div className="paper-lift grid bg-surface p-[15px] text-fg @min-[32rem]:min-h-[470px] @min-[32rem]:grid-cols-[minmax(0,0.47fr)_minmax(0,0.53fr)]">
        <div className="relative h-[300px] overflow-hidden bg-ground @min-[32rem]:h-auto">
          <Drawing
            name="postcard-scene"
            className="absolute inset-0 bg-cover bg-top @min-[32rem]:bg-bottom"
          />
          <p className="relative px-[18px] pt-4 font-serif text-[22px] leading-[1.15] italic">
            {contactCopy.postcard.greetings}
            <br />
            <span className="font-display text-[30px] font-semibold tracking-[-0.02em] not-italic">
              {contactCopy.postcard.place}
            </span>
          </p>
        </div>

        <div className="relative flex flex-col pt-[118px] pb-2.5 @min-[32rem]:ml-3.5 @min-[32rem]:border-l @min-[32rem]:border-rule @min-[32rem]:pr-2 @min-[32rem]:pl-[30px]">
          <Drawing name="flag-stamp" className="stamp-lift absolute top-4 right-0 h-[92px] w-[77px] @min-[32rem]:top-1.5 @min-[32rem]:right-1.5" />
          <div aria-hidden="true" className="absolute top-7 right-[70px] h-[72px] w-[120px] -rotate-6 @min-[32rem]:top-[26px] @min-[32rem]:right-[56px]">
            <Drawing name="postmark" className="h-full w-full text-fg-muted" />
            <span className="absolute top-[36px] left-[36px] -translate-1/2 font-mono text-[9px] tracking-[0.02em] whitespace-nowrap text-fg-muted">
              {postmark}
            </span>
          </div>
          <LeadForm emailDeliveryConfigured={emailDeliveryConfigured} />
        </div>
      </div>
    </div>
  );
}
