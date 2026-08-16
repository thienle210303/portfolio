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
  socialLinks,
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
      {/* Paper only. Printing drops every other section, including the hero
          that normally carries the name and contact details, so without
          this the printed résumé would be anonymous. Hidden on screen
          because the hero already says all of it. */}
      <header className="print-only mb-6">
        <p className="text-[length:var(--step-2)] font-semibold">{profile.name}</p>
        <p className="text-[length:var(--step-0)]">{profile.title}</p>
        <p className="text-[length:var(--step--1)]">
          {[profile.email, ...socialLinks.filter((l) => l.platform !== "Email").map((l) => l.handle)].join(" · ")}
        </p>
      </header>

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
