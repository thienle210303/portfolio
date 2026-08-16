import Hero from "@/sections/Hero/Hero";
import Philosophy from "@/sections/Philosophy/Philosophy";
import SelectedWork from "@/sections/SelectedWork/SelectedWork";
import AIWorkflowLab from "@/sections/AIWorkflowLab/AIWorkflowLab";
import CareerJourney from "@/sections/CareerJourney/CareerJourney";
import ResumeExplorer from "@/sections/ResumeExplorer/ResumeExplorer";
import Contact from "@/sections/Contact/Contact";
import Closing from "@/sections/Footer/Closing";

export default function Home() {
  // Server-only check: this reads process.env directly in a Server
  // Component, so the three secrets never enter the client bundle — only
  // the resulting boolean is passed down as a prop. Contact uses it to
  // decide whether to submit through the server action or fall back to an
  // "open the visitor's email app" (mailto:) flow.
  const emailDeliveryConfigured = Boolean(
    process.env.RESEND_API_KEY && process.env.CONTACT_TO_EMAIL && process.env.CONTACT_FROM_EMAIL
  );

  return (
    <>
      <Hero />
      <Philosophy />
      <SelectedWork />
      <AIWorkflowLab />
      <CareerJourney />
      <ResumeExplorer />
      <Contact emailDeliveryConfigured={emailDeliveryConfigured} />
      <Closing />
    </>
  );
}
