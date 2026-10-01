/**
 * The case-study identifiers moved to `src/sections/CareerTree/anchors.ts`
 * with `CaseStudy.tsx`, which now renders inside the Journey's branches. This
 * file re-exports them so `SelectedWork.tsx` keeps compiling until the section
 * itself is deleted; nothing new should import from here.
 */
export { caseStudyAnchorId, caseStudyNumeral } from "@/sections/CareerTree/anchors";
