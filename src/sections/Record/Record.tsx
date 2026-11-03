/**
 * The Diary (the section's id is `record` still: the chat cites `#record`, and
 * the cats' tour and the nav visit it). Round 23 bound the Record as a book you
 * swipe left and right.
 *
 * - Page 1, the left page, "Pressed, waiting to dry." (`SummaryPage`): the
 *   lead, the tree slice whose rings go to their chapter, and the five
 *   featured entries taped around it, each going to its page.
 * - Page 2, the contents (drawn by the island, `DiaryBook`, because its page
 *   numbers follow the tab): chapters newest first, then 2018 – 2020, each
 *   entry with dotted leaders and its page, then the certificates.
 * - Then each chapter's pages: an entry with something to show has a page to
 *   itself (`EntryPage`); the ones with little to say share, up to three
 *   (`SharedPage`). No case studies: the owner found them boring.
 * - Last, the certificates as stamps (`CertificatesPage`).
 *
 * The pages are a scroll-snap track, so the book works with JavaScript off;
 * `DiaryBook` is the one client island and adds the index tabs, the
 * dog-eared corners and "p. 3 of 14". A server component otherwise.
 *
 * Every id the Journey's tags, the rings, the pressed cards and old bookmarks
 * name is a real element on its page: `journey-entry-<id>`, `work-<projectId>`,
 * `#work` (DoorDash), `#record-<year>` and `#diary` (`src/sections/CareerTree/anchors.ts`).
 */
import type { ReactNode } from "react";
import { Section } from "@/components/ui/Section";
import { careerEntries, record } from "@/content/portfolio";
import {
  contentsChapters,
  diaryChapters,
  diaryPageId,
  diaryPages,
  KIND_WORD,
  kindCounts,
  pageKinds,
  type DiaryPage,
} from "@/lib/record";
import { RECORD_ALIAS_IDS } from "@/sections/CareerTree/anchors";
import type { CareerEntry } from "@/types/portfolio";
import { CERTIFICATES_PAGE_ID } from "./CertificatesPage";
import CertificatesPage from "./CertificatesPage";
import { DiaryBook, type BookPage, type BookTab, type BookWords } from "./DiaryBook";
import EntryPage, { SharedPage } from "./EntryPage";
import SummaryPage, { HEADING_ID } from "./SummaryPage";

const ENTRIES: readonly CareerEntry[] = careerEntries;
const COUNTS = kindCounts();
const CHAPTERS = diaryChapters();
const PAGES = diaryPages();

const TABS: readonly BookTab[] = [
  { id: "all", label: "All", count: COUNTS.all },
  { id: "work", label: "Work", count: COUNTS.work },
  { id: "learning", label: "Study", count: COUNTS.learning },
  { id: "milestone", label: "Milestones", count: COUNTS.milestone },
];

const WORDS: BookWords = {
  book: record.bookLabel,
  tabs: record.tabsLabel,
  contents: record.contents.heading,
  contentsNote: record.contents.note,
  certificates: record.certificates,
  previous: "Previous page",
  next: "Next page",
  kindWords: KIND_WORD,
};

function drawPage(page: DiaryPage): { readonly node: ReactNode; readonly id: string } {
  const chapter = page.opens ? CHAPTERS.find((c) => c.id === page.opens) : undefined;
  const years = chapter?.years;
  switch (page.kind) {
    case "summary":
      return { node: <SummaryPage />, id: "diary-summary" };
    case "contents":
      return { node: null, id: "diary-contents" };
    case "certificates":
      return { node: <CertificatesPage />, id: CERTIFICATES_PAGE_ID };
    case "entry": {
      const entry = ENTRIES.find((e) => e.id === page.entryIds[0])!;
      return { node: <EntryPage entry={entry} years={years} />, id: diaryPageId(page) };
    }
    case "shared": {
      const entries = page.entryIds.map((id) => ENTRIES.find((e) => e.id === id)!);
      const home = CHAPTERS.find((c) => c.entries.some((e) => e.id === page.entryIds[0]));
      return {
        node: <SharedPage pageId={diaryPageId(page)} entries={entries} years={years} label={`Also in ${home?.label ?? ""}`} />,
        id: diaryPageId(page),
      };
    }
  }
}

export default function Record() {
  const pages: BookPage[] = PAGES.map((page) => ({
    key: page.key,
    kind: page.kind,
    kinds: pageKinds(page),
    ...drawPage(page),
  }));
  return (
    <Section id="record" labelledBy={HEADING_ID} tone="base" className="relative overflow-x-clip">
      {/* `#diary`, the section's new name, beside `#record`: a real,
          zero-size element, so it lands with JavaScript off. */}
      {RECORD_ALIAS_IDS.map((id) => (
        <span key={id} id={id} aria-hidden="true" className="sr-only scroll-mt-20" />
      ))}
      <DiaryBook pages={pages} chapters={contentsChapters()} tabs={TABS} words={WORDS} />
    </Section>
  );
}
