import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  achievements,
  careerEntries,
  certifications,
  education,
  profile,
  projects,
  resumeLenses,
  resumeSummary,
  skillCategories,
} from "@/content/portfolio";
import ResumeExplorerClient from "./ResumeExplorerClient";

/**
 * Server Component wrapper (interactivity lives in the client island only,
 * per the section spec). Reads every résumé-relevant content export once
 * and hands it down to `ResumeExplorerClient`, which owns the lens/depth
 * filtering state — this component itself takes no props and holds none.
 */
export default function ResumeExplorer() {
  return (
    <Section id="resume" labelledBy="resume-heading" eyebrow="06 / RÉSUMÉ" tone="charcoal">
      <SectionHeading id="resume-heading" lead={resumeSummary}>
        Résumé
      </SectionHeading>
      <div className="mt-10 md:mt-12">
        <ResumeExplorerClient
          profile={profile}
          resumeLenses={resumeLenses}
          careerEntries={careerEntries}
          projects={projects}
          skillCategories={skillCategories}
          education={education}
          certifications={certifications}
          achievements={achievements}
        />
      </div>
    </Section>
  );
}
