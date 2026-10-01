import Hero from "@/sections/Hero/Hero";
import Worlds from "@/sections/Worlds/Worlds";
import SelectedWork from "@/sections/SelectedWork/SelectedWork";
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

        Round 16 puts Playground Earth second, in the slot Philosophy used to
        hold: below the fold, before the evidence. It is the one section that
        is an argument about the person rather than the work, and it earns that
        position by being made entirely of the work's own facts.

        Who he is, what he built, where he has been, the formal record, then
        how to reach him.

        There is deliberately no résumé section. It was a 5,000px second
        telling of this same page — the experience is the timeline, the
        projects are Selected Work, the education and every award are already
        timeline entries. Only skills and certifications were unique to it, and
        those are now their own section. The résumé lives at /resume as a view
        to read or download, which is what a résumé is.

        The career tree comes after Work and Skills rather than after Work,
        Journey and Skills: round 10 folded the Journey section's own
        chronological timeline into the tree as its own "List" face (see
        src/sections/CareerTree/CareerTree.tsx and ViewToggle.tsx), so there is
        no longer a separate Journey section to place. What is left is the
        synthesis of the other two — the case studies and the inventory, shown
        as one shape alongside the chronology itself — so it can only be read
        after both, and it belongs to neither. Each of the two ends with a
        single link into it.

        `navItems` in src/content/portfolio.ts must stay in this order: the nav
        doubles as the page's table of contents.
      */}
      <Hero />
      <Worlds />
      <SelectedWork />
      <Skills />
      <CareerTree />
      <Contact emailDeliveryConfigured={emailDeliveryConfigured} />
      <Closing />
    </>
  );
}
