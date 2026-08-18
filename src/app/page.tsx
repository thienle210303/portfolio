import Hero from "@/sections/Hero/Hero";
import Philosophy from "@/sections/Philosophy/Philosophy";
import SelectedWork from "@/sections/SelectedWork/SelectedWork";
import AIWorkflowLab from "@/sections/AIWorkflowLab/AIWorkflowLab";
import CareerJourney from "@/sections/CareerJourney/CareerJourney";
import Skills from "@/sections/Skills/Skills";
import CareerTree from "@/sections/CareerTree/CareerTree";
import Contact from "@/sections/Contact/Contact";
import Closing from "@/sections/Footer/Closing";

export default function Home() {
  // Server-only check: this reads process.env directly in a Server
  // Component, so the three secrets never enter the client bundle — only
  // the resulting boolean is passed down as a prop. Contact uses it to
  // decide whether to submit through the /api/contact Route Handler or
  // fall back to an "open the visitor's email app" (mailto:) flow.
  const emailDeliveryConfigured = Boolean(
    process.env.RESEND_API_KEY && process.env.CONTACT_TO_EMAIL && process.env.CONTACT_FROM_EMAIL
  );

  return (
    <>
      {/*
        Order is an argument about what a visitor needs, in what order.

        Who he is, how he works, what he built, where he has been, the formal
        record, then the specialist material, then how to reach him.

        The AI Workflow Lab used to sit between Selected Work and the career
        timeline. It is the single largest section on the page and putting it
        there split the career story down the middle: proof, a long detour into
        agent experiments, then back to the timeline. It now comes last of the
        substantive sections, where an interested reader still finds it and a
        hiring manager can stop before it.

        There is deliberately no résumé section. It was a 5,000px second
        telling of this same page — the experience is the timeline, the
        projects are Selected Work, the education and every award are already
        timeline entries. Only skills and certifications were unique to it, and
        those are now their own section. The résumé lives at /resume as a view
        to read or download, which is what a résumé is.

        The career tree comes after Work, Journey and Skills rather than
        inside the Journey section, where it used to render below the timeline.
        It is the synthesis of those three — the case studies, the chronology
        and the inventory, shown as one shape — so it can only be read after
        all three, and it belongs to none of them. Each of those three ends
        with a single link into it.

        `navItems` in src/content/portfolio.ts must stay in this order: the nav
        doubles as the page's table of contents.
      */}
      <Hero />
      <Philosophy />
      <SelectedWork />
      <CareerJourney />
      <Skills />
      <CareerTree />
      <AIWorkflowLab />
      <Contact emailDeliveryConfigured={emailDeliveryConfigured} />
      <Closing />
    </>
  );
}
