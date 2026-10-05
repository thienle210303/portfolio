import Hero from "@/sections/Hero/Hero";
import Worlds from "@/sections/Worlds/Worlds";
import CareerTree from "@/sections/CareerTree/CareerTree";
import Contact from "@/sections/Contact/Contact";
import Closing from "@/sections/Footer/Closing";
import { validBookingUrl } from "@/lib/booking";

export default function Home() {
  // Server-only check: this reads process.env directly in a Server
  // Component, so the three secrets never enter the client bundle — only
  // the resulting boolean is passed down as a prop. Contact uses it to
  // decide whether to submit through the /api/contact Route Handler or
  // fall back to an "open the visitor's email app" (mailto:) flow.
  const emailDeliveryConfigured = Boolean(
    process.env.RESEND_API_KEY && process.env.CONTACT_TO_EMAIL && process.env.CONTACT_FROM_EMAIL
  );

  // The owner's scheduling link. Anything that is not an https:// URL (unset,
  // empty, a typo) becomes undefined and Contact renders no booking link.
  const bookingUrl = validBookingUrl(process.env.BOOKING_URL);

  return (
    <>
      {/*
        Four sections, in the order a visitor needs them: who he is, the world
        his work lives in, where he has been, how to reach him.

        Round 18 took the page from six sections to four. Selected Work and
        Skills are gone because nothing needs them any more: the case studies
        render inside the branches of the roles that produced them, in the
        Journey, and the globe's plaques point at the Journey's act anchors.
        Skills as a section is gone, not the skills — `skillCategories` is
        still content, still rendered by /resume and still in the answer
        corpus.

        There is deliberately no résumé section either. It was a second
        telling of this same page. The résumé lives at /resume as a view to
        read or download, which is what a résumé is.

        The Journey (`#tree`) follows the globe and precedes Contact: it is the
        chronology the rest of the page's claims hang from, and the last thing
        to read before being asked to get in touch.

        `navItems` in src/content/portfolio.ts must stay in this order: the nav
        doubles as the page's table of contents.
      */}
      <Hero />
      <Worlds />
      <CareerTree />
      <Contact emailDeliveryConfigured={emailDeliveryConfigured} bookingUrl={bookingUrl} />
      <Closing />
    </>
  );
}
