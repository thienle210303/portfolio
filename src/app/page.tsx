import Hero from "@/sections/Hero/Hero";
import CareerTree from "@/sections/CareerTree/CareerTree";
import Work from "@/sections/Work/Work";
import Record from "@/sections/Record/Record";
import Contact from "@/sections/Contact/Contact";
import { askLiveModeConfigured } from "@/lib/ask-live-config";
import { validBookingUrl } from "@/lib/booking";

export default function Home() {
  // Server-only check: this reads process.env directly in a Server
  // Component, so the three secrets never enter the client bundle — only
  // the resulting boolean is passed down as a prop. The card's lead form
  // uses it to decide whether to post to the /api/contact Route Handler or
  // fall back to an "open the visitor's email app" (mailto:) flow.
  const emailDeliveryConfigured = Boolean(
    process.env.RESEND_API_KEY && process.env.CONTACT_TO_EMAIL && process.env.CONTACT_FROM_EMAIL
  );

  // The same shape for the chat's live mode: `askLiveModeConfigured()` reads
  // ASK_LLM_API_KEY / ASK_LLM_MODEL here, on the server, and only the boolean
  // reaches the chat in Contact. The key never crosses.
  const liveModeConfigured = askLiveModeConfigured();

  // The owner's scheduling link. Anything that is not https:// followed by a
  // host (unset, empty, a typo, a bare "https://") becomes null and no
  // booking link renders.
  const bookingUrl = validBookingUrl(process.env.BOOKING_URL) ?? null;

  return (
    <>
      {/*
        Five sections, in the order a visitor needs them: who I am, what I
        built, where I have been, everything I have done, how to reach me.

        Work (round 32) is the case studies, right after About and shown, not
        told: each a sheet with a drawing made from its own numbers, the whole
        story on /work/<id>. Round 18 had taken Selected Work away and round 23
        hid the case studies inside the Diary; an outside audit and Thien
        brought them back ("I want to show case instead of bunch of text").

        Worlds (the globe) left the page in round 21; `#worlds` still lands on
        About (src/sections/Hero/anchors.ts). Skills as a section is gone, not
        the skills: `skillCategories` is still content, still in the answer
        corpus. There is deliberately no résumé section either; the résumé is
        the PDF (/resume, the business card, the header's slip).

        The Journey (`#tree`) follows Work: the work as it grew. The Diary
        (`#record`) follows it with the whole history, and is the last thing
        to read before being asked to get in touch.

        `navItems` in src/content/portfolio.ts must stay in this order: the nav
        doubles as the page's table of contents.
      */}
      <Hero bookingUrl={bookingUrl} />
      <Work />
      <CareerTree />
      <Record />
      <Contact
        emailDeliveryConfigured={emailDeliveryConfigured}
        askLiveModeConfigured={liveModeConfigured}
        bookingUrl={bookingUrl}
      />
    </>
  );
}
