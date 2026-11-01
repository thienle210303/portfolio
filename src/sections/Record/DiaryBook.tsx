"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/cn";
import type { ContentsChapter, DiaryPageKind } from "@/lib/record";
import type { CareerEntryType } from "@/types/portfolio";
import { KindDot } from "./KindDot";

export type FilterId = "all" | CareerEntryType;

export interface BookPage {
  readonly key: string;
  readonly kind: DiaryPageKind;
  /** The kinds of entry on the page; empty for the fixed pages, which always show. */
  readonly kinds: readonly CareerEntryType[];
  /** What the server drew. The contents page is drawn here, from its numbers. */
  readonly node: ReactNode;
  /** The fragment the contents link to for the certificates page. */
  readonly id: string;
}

export interface BookTab {
  readonly id: FilterId;
  readonly label: string;
  readonly count: number;
}

export interface BookWords {
  readonly book: string;
  readonly tabs: string;
  readonly contents: string;
  readonly contentsNote: string;
  readonly certificates: string;
  readonly previous: string;
  readonly next: string;
  readonly kindWords: Readonly<Record<CareerEntryType, string>>;
}

const TAB_DOT: Record<FilterId, CareerEntryType | null> = { all: null, work: "work", learning: "learning", milestone: "milestone" };
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const SPREAD = "(min-width: 80rem)";

/**
 * The Diary: a book you swipe left and right (round 23).
 *
 * The pages are a horizontal scroll-snap track, one page to a view below
 * 1280px and a spread of two from there. Native scrolling is the swipe (touch,
 * trackpad, the scrollbar, the keyboard), so with JavaScript off every page is
 * reachable and every fragment lands on its page; this island adds what the
 * browser does not: the index tabs, the dog-eared corners, ← and → when the
 * book has focus, and "p. 3 of 14".
 *
 * The tabs re-bind the book to one kind: the other kinds' pages are hidden
 * (still in the document, so a fragment to one can find it) and the rest are
 * numbered again, here and in the contents. A link to a page the tab has
 * hidden clears the tab first, so the jump always lands.
 *
 * The server draws the pages and passes them in; the contents page is drawn
 * here because its page numbers depend on the tab.
 */
export function DiaryBook({
  pages,
  chapters,
  tabs,
  words,
}: {
  readonly pages: readonly BookPage[];
  readonly chapters: readonly ContentsChapter[];
  readonly tabs: readonly BookTab[];
  readonly words: BookWords;
}) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [view, setView] = useState({ index: 0, perView: 1, atStart: true, atEnd: false });
  const [spoken, setSpoken] = useState("");
  // Stamped once the island is live, so a test (or anything else) can tell a
  // book that handles a press from one that is still only HTML.
  const frameRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    frameRef.current?.setAttribute("data-live", "");
  }, []);
  const trackRef = useRef<HTMLDivElement>(null);

  const shown = pages.map((p) => filter === "all" || p.kinds.length === 0 || p.kinds.includes(filter));
  const numbers: number[] = [];
  let count = 0;
  for (const on of shown) numbers.push(on ? ++count : 0);
  const total = count;
  const numberOf = new Map(pages.map((p, i) => [p.key, numbers[i]]));

  const read = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const slots = track.querySelectorAll<HTMLElement>(".diary-slot:not([data-hidden]):not(.diary-slot-blank)");
    let index = 0;
    let best = Infinity;
    slots.forEach((slot, i) => {
      const d = Math.abs(slot.offsetLeft - track.scrollLeft);
      if (d < best) {
        best = d;
        index = i;
      }
    });
    const atStart = track.scrollLeft <= 1;
    const atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 1;
    const perView = window.matchMedia?.(SPREAD).matches ? 2 : 1;
    setView((v) => (v.index === index && v.perView === perView && v.atStart === atStart && v.atEnd === atEnd ? v : { index, perView, atStart, atEnd }));
  }, []);

  // Follow the scroll; say the page only once it has stopped.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(read);
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    read();
    return () => {
      track.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [read]);

  // A tab re-binds the book: start again from its first page. (Compared with
  // the last filter rather than "is this the first run", so React's
  // development double-run cannot scroll a book that opened on a fragment.)
  const lastFilter = useRef(filter);
  useEffect(() => {
    if (lastFilter.current === filter) return;
    lastFilter.current = filter;
    trackRef.current?.scrollTo?.({ left: 0, behavior: "auto" });
    read();
  }, [filter, read]);

  // Links to a page a tab has hidden clear the tab first; and browsers
  // without invoker commands (`commandfor`, see `ImageDialog.tsx`) get the
  // same `showModal()` / `close()` from this one listener.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const href = target?.closest("a[href^='#']")?.getAttribute("href");
      if (href && href.length > 1) {
        let id = href.slice(1);
        try {
          id = decodeURIComponent(id);
        } catch {
          // A malformed escape names nothing.
        }
        const el = document.getElementById(id);
        if (el?.closest(".diary-slot[data-hidden]")) flushSync(() => setFilter("all"));
      }
      const invoker = target?.closest<HTMLButtonElement>("button[commandfor]");
      if (invoker && !("commandForElement" in HTMLButtonElement.prototype)) {
        const dialog = document.getElementById(invoker.getAttribute("commandfor") ?? "");
        if (dialog instanceof HTMLDialogElement) {
          if (invoker.getAttribute("command") === "show-modal") dialog.showModal();
          else dialog.close();
        }
      }
    };
    // Capture, so the tab clears before the browser scrolls to the link.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const turn = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const behavior = window.matchMedia?.(REDUCED_MOTION).matches ? "auto" : "smooth";
    track.scrollBy?.({ left: direction * track.clientWidth, behavior });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if ((event.target as Element).closest("dialog, input, textarea, select")) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      turn(event.key === "ArrowLeft" ? -1 : 1);
    } else if ((event.key === "Home" || event.key === "End") && event.target === event.currentTarget) {
      event.preventDefault();
      const track = trackRef.current;
      track?.scrollTo?.({ left: event.key === "Home" ? 0 : track.scrollWidth, behavior: "auto" });
    }
  };

  const from = view.index + 1;
  const to = Math.min(from + view.perView - 1, total);
  const where = view.perView === 2 && to > from ? `pp. ${from}–${to} of ${total}` : `p. ${from} of ${total}`;
  const picked = tabs.find((t) => t.id === filter);
  const status = filter === "all" ? "" : `${picked?.label}: ${picked?.count} ${picked?.count === 1 ? "entry" : "entries"}, ${total} pages.`;

  // The page is said once the book has stopped on it, not on every frame.
  useEffect(() => {
    const t = window.setTimeout(() => setSpoken(where), 200);
    return () => window.clearTimeout(t);
  }, [where]);

  return (
    <div ref={frameRef} data-diary="" className="diary-frame">
      <div
        role="group"
        aria-label={words.tabs}
        className="diary-tabs [html:not([data-motion])_&]:hidden"
      >
        {tabs.map((tab) => {
          const pressed = tab.id === filter;
          const dot = TAB_DOT[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={pressed}
              onClick={() => setFilter(tab.id)}
              className={cn(
                "diary-tab inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 border border-rule px-3 font-mono text-[length:var(--step--1)] transition-colors duration-(--dur-quick) max-sm:gap-1 max-sm:px-2 max-sm:text-[length:var(--step--2)]",
                pressed ? "border-fg bg-fg text-fg-inverse" : "bg-surface text-fg-muted hover:border-fg-muted hover:text-fg",
              )}
            >
              {dot ? <KindDot kind={dot} className={pressed ? "ring-1 ring-fg-inverse" : undefined} /> : null}
              {tab.label}
              <span className={pressed ? "" : "text-fg-muted"}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      <div className="diary-book relative bg-surface paper-lift">
        <div
          ref={trackRef}
          role="region"
          aria-label={words.book}
          tabIndex={0}
          data-filter={filter}
          onKeyDown={onKeyDown}
          className="diary-track"
        >
          {pages.map((page, i) => {
            const n = numbers[i];
            return (
              <div
                key={page.key}
                className="diary-slot bg-surface"
                data-page={page.key}
                data-side={n ? (n % 2 === 1 ? "left" : "right") : undefined}
                data-hidden={n ? undefined : ""}
              >
                {page.kind === "contents" ? (
                  <ContentsPage chapters={chapters} filter={filter} numberOf={numberOf} words={words} certificatesId={pages.find((p) => p.kind === "certificates")?.id ?? ""} />
                ) : (
                  page.node
                )}
                {n ? (
                  <span aria-hidden="true" className="diary-folio">
                    {n}
                  </span>
                ) : null}
              </div>
            );
          })}
          {total % 2 === 1 ? <div aria-hidden="true" className="diary-slot diary-slot-blank bg-surface" data-side="right" /> : null}
        </div>
        <button
          type="button"
          aria-label={words.previous}
          aria-disabled={view.atStart}
          onClick={() => !view.atStart && turn(-1)}
          className="diary-corner diary-corner-prev [html:not([data-motion])_&]:hidden"
        >
          <span aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={words.next}
          aria-disabled={view.atEnd}
          onClick={() => !view.atEnd && turn(1)}
          className="diary-corner diary-corner-next [html:not([data-motion])_&]:hidden"
        >
          <span aria-hidden="true" />
        </button>
      </div>

      <p aria-live="polite" data-diary-page="" className="diary-where [html:not([data-motion])_&]:hidden">
        {spoken || where}
      </p>
      <p aria-live="polite" className="sr-only">
        {status}
      </p>
    </div>
  );
}

function ContentsPage({
  chapters,
  filter,
  numberOf,
  words,
  certificatesId,
}: {
  readonly chapters: readonly ContentsChapter[];
  readonly filter: FilterId;
  readonly numberOf: ReadonlyMap<string, number>;
  readonly words: BookWords;
  readonly certificatesId: string;
}) {
  return (
    <article
      id="diary-contents"
      aria-labelledby="diary-contents-title"
      className="diary-page @container relative flex min-h-full scroll-mt-20 flex-col bg-surface px-5 pt-9 pb-16 sm:px-8 sm:pt-10"
    >
      <h3 id="diary-contents-title" className="font-display text-[length:var(--step-3)] leading-[1.08] font-semibold tracking-(--tracking-display) text-fg">
        {words.contents}
      </h3>
      <p className="mt-1 font-serif text-[length:var(--step-0)] italic text-fg-muted">{words.contentsNote}</p>
      <div className="mt-5 space-y-4">
        {chapters.map((chapter) => {
          const lines = chapter.lines.filter((l) => filter === "all" || l.type === filter);
          if (lines.length === 0) return null;
          return (
            <section key={chapter.id} aria-label={chapter.label} className="grid gap-x-3 @min-[28rem]:grid-cols-[6rem_minmax(0,1fr)]">
              {/* Wraps at its spaces: "2018 – 2020" is wider than the column. */}
              <h4 aria-hidden="true" className="pt-1.5 font-mono text-[length:var(--step--1)] font-bold text-fg lg:pt-1">
                {chapter.label}
              </h4>
              <ol role="list" className="m-0 list-none p-0">
                {lines.map((line) => (
                  <li key={line.entryId}>
                    <ContentsLine href={`#journey-entry-${line.entryId}`} page={numberOf.get(line.pageKey)}>
                      <KindDot kind={line.type} className="shrink-0" />
                      <span className="min-w-0">
                        <span className="sr-only">{words.kindWords[line.type]}: </span>
                        <span className="text-fg">{line.title}</span>
                        <span className="text-fg-muted">, {line.organization}</span>
                      </span>
                    </ContentsLine>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
        <ol role="list" className="m-0 list-none p-0 @min-[28rem]:pl-[6.75rem]">
          <li>
            <ContentsLine href={`#${certificatesId}`} page={numberOf.get("certificates")}>
              <span className="font-serif text-[length:var(--step-0)] italic text-fg">{words.certificates}</span>
            </ContentsLine>
          </li>
        </ol>
      </div>
    </article>
  );
}

/** One line of the contents: the title, dotted leaders, the page number. The
 *  whole line is the link. */
function ContentsLine({ href, page, children }: { readonly href: string; readonly page: number | undefined; readonly children: ReactNode }) {
  return (
    <a
      href={href}
      className="group flex min-h-11 items-baseline gap-2 py-1.5 text-[length:var(--step--1)] leading-snug underline-offset-4 hover:text-accent lg:min-h-7 lg:py-0.5"
    >
      <span className="flex min-w-0 items-baseline gap-2.5">{children}</span>
      <span aria-hidden="true" className="diary-leader" />
      <span className="shrink-0 font-mono text-fg-muted group-hover:text-accent">
        <span className="sr-only">page </span>
        {page ?? ""}
      </span>
    </a>
  );
}
