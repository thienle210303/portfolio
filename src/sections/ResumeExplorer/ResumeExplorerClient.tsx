"use client";

/**
 * Client island: owns `lens` and `depth` state and lays out the two-pane
 * explorer. `FilterGroup` only renders the chip selector — it has no
 * visibility into how many results the current lens actually matched, so
 * this component owns a polite `aria-live` region announcing the filtered
 * count on every change, copying the pattern from `CareerJourney/Timeline.tsx`.
 *
 * No URL state: it was optional in the brief and adds a hydration-mismatch
 * and history-pollution risk that isn't worth it for a same-page filter. That
 * still holds — `lens` now lives in a module-scope store (./lensStore) rather
 * than in `useState` purely so the site guide can offer "show the résumé
 * through the X lens" as a command. The store keeps both properties this note
 * was protecting: its initial value is a constant on server and client alike,
 * and nothing touches history. `depth` has no such external driver and stays
 * ordinary component state.
 */
import { useState, useSyncExternalStore } from "react";
import type {
  Achievement,
  CareerEntry,
  Certification,
  EducationEntry,
  Profile,
  Project,
  ResumeDepth,
  ResumeLens,
  ResumeLensId,
  SkillCategory,
} from "@/types/portfolio";
import type { FilterOption } from "@/components/ui/FilterGroup";
import { getLens, getLensServerSnapshot, setLens, subscribeToLens } from "./lensStore";
import ResumeControls from "./ResumeControls";
import ResumeSkills from "./ResumeSkills";
import ResumeEntries from "./ResumeEntries";
import ResumeCredentials from "./ResumeCredentials";

interface ResumeExplorerClientProps {
  readonly profile: Profile;
  readonly resumeLenses: readonly ResumeLens[];
  readonly careerEntries: readonly CareerEntry[];
  readonly projects: readonly Project[];
  readonly skillCategories: readonly SkillCategory[];
  readonly education: readonly EducationEntry[];
  readonly certifications: readonly Certification[];
  readonly achievements: readonly Achievement[];
}

/** Descending sort on `sortKey`, compared as plain strings (some keys carry
 * an `-a`/`-b` suffix specifically for this) — never parsed as a date.
 * Copies before sorting so the shared content array is never mutated. */
function sortByKeyDescending(entries: readonly CareerEntry[]): CareerEntry[] {
  return [...entries].sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0));
}

/**
 * "all" is the unfiltered state, not a lens every item happens to carry —
 * entries with an empty `lenses` array (`deans-list`) must still show up
 * under "All". Only a specific lens id actually filters by membership, so
 * that entry only ever disappears under a specific lens, never under "All".
 */
function matchesLens<T extends { readonly lenses: readonly ResumeLensId[] }>(
  item: T,
  lens: ResumeLensId | "all",
): boolean {
  return lens === "all" || item.lenses.includes(lens);
}

export default function ResumeExplorerClient({
  profile,
  resumeLenses,
  careerEntries,
  projects,
  skillCategories,
  education,
  certifications,
  achievements,
}: ResumeExplorerClientProps) {
  const lens = useSyncExternalStore(subscribeToLens, getLens, getLensServerSnapshot);
  const [depth, setDepth] = useState<ResumeDepth>("quick-scan");

  const workEntriesAll = sortByKeyDescending(careerEntries.filter((entry) => entry.type === "work"));
  const milestoneEntriesAll = sortByKeyDescending(
    careerEntries.filter((entry) => entry.type === "learning" || entry.type === "milestone"),
  );

  const filteredWork = workEntriesAll.filter((entry) => matchesLens(entry, lens));
  const filteredMilestones = milestoneEntriesAll.filter((entry) => matchesLens(entry, lens));
  const filteredSkills = skillCategories.filter((category) => matchesLens(category, lens));

  const lensOptions: FilterOption[] = [
    { id: "all", label: "All", count: careerEntries.length + skillCategories.length },
    ...resumeLenses.map((option) => ({
      id: option.id,
      label: option.label,
      count:
        careerEntries.filter((entry) => matchesLens(entry, option.id)).length +
        skillCategories.filter((category) => matchesLens(category, option.id)).length,
    })),
  ];

  const activeLens = lens === "all" ? undefined : resumeLenses.find((option) => option.id === lens);
  const filteredCount = filteredWork.length + filteredMilestones.length + filteredSkills.length;
  const totalCount = workEntriesAll.length + milestoneEntriesAll.length + skillCategories.length;
  const noun = filteredCount === 1 ? "entry" : "entries";
  const resultText =
    lens === "all"
      ? `Showing all ${totalCount} résumé ${noun}`
      : `Showing ${filteredCount} of ${totalCount} résumé ${noun} for ${activeLens?.label ?? "this lens"}`;

  const isDefault = lens === "all" && depth === "quick-scan";

  function isLensValue(id: string): id is ResumeLensId | "all" {
    return id === "all" || resumeLenses.some((option) => option.id === id);
  }

  function handleLensChange(id: string) {
    if (isLensValue(id)) setLens(id);
  }

  function handleReset() {
    setLens("all");
    setDepth("quick-scan");
  }

  function handlePrint() {
    if (typeof window === "undefined") return;
    window.print();
  }

  return (
    // `resume-layout` is a stable hook for the print stylesheet, which
    // collapses this to a single column. Without it the hidden controls
    // column keeps its 280px grid track and the printed résumé sits
    // indented from its own heading.
    <div className="resume-layout lg:grid lg:grid-cols-[280px_1fr] lg:items-start lg:gap-12">
      <div className="no-print lg:sticky lg:top-24 lg:max-h-[calc(100svh-6rem)] lg:overflow-y-auto">
        <ResumeControls
          lensOptions={lensOptions}
          lens={lens}
          onLensChange={handleLensChange}
          activeLensDescription={activeLens?.description}
          depth={depth}
          onDepthChange={setDepth}
          onReset={handleReset}
          resetDisabled={isDefault}
          email={profile.email}
          resumePdf={profile.resumePdf}
          onPrint={handlePrint}
        />
      </div>

      <div className="mt-10 space-y-10 lg:mt-0">
        {/* Screen-only: this announces filter results to assistive tech.
            On paper there is no filtering, so a "showing all N entries"
            line is noise at the top of a résumé. */}
        <p
          role="status"
          aria-live="polite"
          className="no-print font-mono text-[length:var(--step--1)] uppercase tracking-[0.06em] text-[color:var(--fg-subtle)]"
        >
          {resultText}
        </p>

        <ResumeSkills categories={filteredSkills} />
        <ResumeEntries
          depth={depth}
          workEntries={filteredWork}
          milestoneEntries={filteredMilestones}
          projects={projects}
        />
        <ResumeCredentials education={education} certifications={certifications} achievements={achievements} />
      </div>
    </div>
  );
}
