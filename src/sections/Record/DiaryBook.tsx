"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/cn";
import {
  completes,
  dragProgress,
  easeOut,
  faceAngles,
  faceLight,
  leafProgress,
  leafZ,
  openingOf,
  RIFFLE_MAX,
  riffleLeaves,
  shadeOn,
  stackLeaves,
  TURN_MS,
  turnMs,
  turnRoom,
  type TurnDir,
} from "@/lib/diary-turn";
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
  /** The running head: the chapter's years (none on the summary and contents). */
  readonly head?: string;
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
/** Blank sheets a riffle flicks between the real pages it leaves and lands on. */
const SHEETS = 2 * RIFFLE_MAX;

/** `track`: the scroll-snap track (no JavaScript, reduced motion). `leaf`: pages that turn. */
type Mode = "track" | "leaf";

/** One turning leaf: the face it starts with and the one it lands showing. */
interface Leaf {
  readonly start: HTMLElement;
  readonly arrive: HTMLElement;
}

/** A turn in the air. `p` is each leaf's progress (see `src/lib/diary-turn.ts`). */
interface Flight {
  readonly dir: TurnDir;
  readonly from: number;
  readonly to: number;
  readonly leaves: readonly Leaf[];
  /** The shadows on the pages lying under the start side and the arrive side. */
  readonly shades: readonly [HTMLElement | null, HTMLElement | null];
  /** Every element the turn styled, to put back when it lands. */
  readonly touched: readonly HTMLElement[];
  p: number[];
  raf: number;
  /** Following a pointer or a trackpad, not a clock. */
  dragging: boolean;
  /** Where it ends: turned (true) or fallen back (false). */
  goal: boolean;
  quick: boolean;
  then?: () => void;
}

/** The element a fragment (`#id`, as written in an href or the URL) names. */
function byHash(hash: string): HTMLElement | null {
  if (hash.length < 2) return null;
  let id = hash.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    // A malformed escape names nothing.
  }
  return document.getElementById(id);
}

/**
 * The Diary: a book whose pages turn (round 24; round 23 slid them).
 *
 * With JavaScript off, and under reduced motion, the pages are a horizontal
 * scroll-snap track, one page to a view below 1280px and a spread of two from
 * there: native scrolling is the swipe and every fragment lands on its page.
 *
 * With JavaScript, the same pages are stacked into one opening (`data-mode=
 * "leaf"`) and turn. The right page lifts at its fore-edge and turns over the
 * spine in 3D, its back the next left page, with a shadow sweeping the page
 * under it and light running across its curl; back turns the other way; below
 * 1280 one page turns about its bound edge. The dog-eared corners are handles
 * (drag one and the leaf follows; past halfway it turns, short of it it falls
 * back), touch swipes and trackpad swipes do the same, and ← → still turn
 * when the book has focus. A jump of more than a turn (a contents line, a
 * ring, a tab, Home, End) riffles: a few leaves flick over fast.
 *
 * Pages not on show are `hidden="until-found"`, which takes them out of the
 * tab order and the accessibility tree; the browser's find (and a fragment)
 * reveals one with `beforematch`, and the book opens there. Pages under a turn
 * in the air are `inert`. (Not the hidden ones: Chrome's find skips inert
 * text, so `beforematch` would never fire.)
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
  /** The pressed tab, and the kind the pages are bound to: the same, except
   *  while the book riffles back to its first page to re-bind. */
  const [filter, setFilter] = useState<FilterId>("all");
  const [bound, setBound] = useState<FilterId>("all");
  const [mode, setMode] = useState<Mode | null>(null);
  const [spread, setSpread] = useState(false);
  /** Leaf mode: the first page on show. Track mode reads the scroll instead. */
  const [at, setAt] = useState(0);
  const [view, setView] = useState({ index: 0, atStart: true, atEnd: false });
  const [spoken, setSpoken] = useState("");

  const frameRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const ribbonRef = useRef<HTMLSpanElement>(null);
  const modeRef = useRef<Mode | null>(null);
  const spreadRef = useRef(false);
  const atRef = useRef(0);
  const flight = useRef<Flight | null>(null);
  /** Turns pressed while one is in the air, net (+ forward, − back). */
  const pending = useRef(0);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    dir: 0 | TurnDir;
    corner: boolean;
    f: Flight | null;
    trail: [number, number][];
  } | null>(null);
  /** A drag just ended: swallow the click it would otherwise make. */
  const dragged = useRef(false);

  const shown = pages.map((p) => bound === "all" || p.kinds.length === 0 || p.kinds.includes(bound));
  const numbers: number[] = [];
  let count = 0;
  for (const on of shown) numbers.push(on ? ++count : 0);
  const total = count;
  const numberOf = new Map(pages.map((p, i) => [p.key, numbers[i]]));
  const per: 1 | 2 = spread ? 2 : 1;
  const leafCount = total + (spread && total % 2 === 1 ? 1 : 0);
  const opening = openingOf(at, per, leafCount);

  /* ---------------------------------------------------------------- */
  /* The pages, as elements                                            */
  /* ---------------------------------------------------------------- */

  /** The slots the book is bound to, in page order; on a spread with an odd
   *  count, the blank page that faces the last one. */
  const leaves = (): HTMLElement[] => {
    const track = trackRef.current;
    if (!track) return [];
    const all = Array.from(track.querySelectorAll<HTMLElement>(":scope > .diary-slot:not([data-hidden])"));
    return spreadRef.current ? all : all.filter((s) => !s.classList.contains("diary-slot-blank"));
  };
  const slotOf = (el: Element | null) => el?.closest<HTMLElement>(".diary-slot") ?? null;
  const perNow = (): 1 | 2 => (spreadRef.current ? 2 : 1);
  const lastOpening = () => {
    const n = leaves().length;
    return openingOf(n - 1, perNow(), n);
  };
  /** A page's width: the book's, or half of it on a spread. (Not the
   *  track's, which is padded with the room a turning leaf needs.) */
  const pageWidth = () => {
    const w = trackRef.current?.parentElement?.clientWidth ?? 0;
    return spreadRef.current ? w / 2 : w;
  };

  /** Show these slots and hide the rest until found; `busy` ones are inert.
   *  `null` shows every page (the track). */
  const show = (on: ReadonlySet<HTMLElement> | null, busy?: ReadonlySet<HTMLElement>) => {
    const track = trackRef.current;
    if (!track) return;
    for (const slot of track.querySelectorAll<HTMLElement>(":scope > .diary-slot")) {
      if (!on || on.has(slot)) slot.removeAttribute("hidden");
      else if (slot.getAttribute("hidden") !== "until-found") slot.setAttribute("hidden", "until-found");
      slot.inert = !!busy?.has(slot);
    }
  };

  /** The opening at rest: its pages and no others. */
  const rest = () => {
    if (modeRef.current !== "leaf" || flight.current) return;
    const ls = leaves();
    show(new Set(ls.slice(atRef.current, atRef.current + perNow())));
  };

  /** Every page as tall as the tallest, as a real book's are: measured with
   *  the hidden pages laid out for the moment it takes to read them. Then the
   *  perspective and the room a turning leaf needs, from the page's size. */
  const measure = () => {
    const track = trackRef.current;
    const book = track?.parentElement;
    if (!track || !book || modeRef.current !== "leaf" || flight.current) return;
    track.style.setProperty("--page-h", "0px");
    const hidden = Array.from(track.querySelectorAll<HTMLElement>(":scope > .diary-slot[hidden]"));
    for (const slot of hidden) slot.removeAttribute("hidden");
    // The track is padded with the room (and pulled back by as much margin),
    // so the pages' height is its box less that padding.
    const style = getComputedStyle(track);
    const height = track.getBoundingClientRect().height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    for (const slot of hidden) slot.setAttribute("hidden", "until-found");
    const page = book.getBoundingClientRect();
    const { depth, room } = turnRoom(pageWidth(), height, spreadRef.current, page.left);
    track.style.setProperty("--page-h", `${Math.ceil(height)}px`);
    track.style.setProperty("--depth", `${depth}px`);
    track.style.setProperty("--room", `${room}px`);
    track.scrollTo?.(0, 0);
  };

  /* ---------------------------------------------------------------- */
  /* Turning                                                           */
  /* ---------------------------------------------------------------- */

  /** Lift `n` leaves off the opening toward `to`, and show what they need. */
  const begin = (dir: TurnDir, to: number, n: number): Flight | null => {
    const track = trackRef.current;
    const frame = frameRef.current;
    if (!track || !frame) return null;
    const ls = leaves();
    const from = atRef.current;
    const sheets = Array.from(track.querySelectorAll<HTMLElement>(":scope > .diary-sheet"));
    let used = 0;
    const startSide = dir === 1 ? "right" : "left";
    const arriveSide = dir === 1 ? "left" : "right";
    const sheet = (side: "left" | "right") => {
      const el = sheets[used++];
      el.dataset.at = side;
      return el;
    };
    // The real pages: on a spread, the page leaving (its back the page
    // arriving) and the pages under them; on one page, the page itself and
    // the page under it, and a blank back.
    let realStart: HTMLElement | undefined;
    let realArrive: HTMLElement | undefined;
    let underStart: HTMLElement | undefined;
    let underArrive: HTMLElement | undefined;
    if (perNow() === 2) {
      realStart = ls[dir === 1 ? from + 1 : from];
      realArrive = ls[dir === 1 ? to : to + 1];
      underStart = ls[dir === 1 ? to + 1 : to];
      underArrive = ls[dir === 1 ? from : from + 1];
    } else if (dir === 1) {
      realStart = ls[from];
      underStart = ls[to];
    } else {
      realArrive = ls[to];
      underArrive = ls[from];
    }
    const list: Leaf[] = [];
    for (let k = 0; k < n; k += 1) {
      list.push({
        start: k === 0 && realStart ? realStart : sheet(startSide),
        arrive: k === n - 1 && realArrive ? realArrive : sheet(arriveSide),
      });
    }
    const shadeEls = Array.from(track.querySelectorAll<HTMLElement>(":scope > .diary-shade"));
    const shades: [HTMLElement | null, HTMLElement | null] = [
      underStart ? shadeEls[0] : null,
      underArrive ? shadeEls[1] : null,
    ];
    if (shades[0]) shades[0].dataset.on = startSide;
    if (shades[1]) shades[1].dataset.on = arriveSide;

    const faces = list.flatMap((l) => [l.start, l.arrive]);
    const unders = [underStart, underArrive].filter((x): x is HTMLElement => !!x);
    for (const el of faces) el.setAttribute("data-face", "");
    for (const el of unders) el.setAttribute("data-under", "");
    // Focus never goes down with a page: it waits on the book.
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== track && track.contains(active)) track.focus({ preventScroll: true });
    const real = new Set([...faces, ...unders].filter((el) => el.classList.contains("diary-slot")));
    show(real, real);
    frame.setAttribute("data-flight", "");
    const f: Flight = {
      dir,
      from,
      to,
      leaves: list,
      shades,
      touched: [...faces, ...unders],
      p: list.map(() => 0),
      raf: 0,
      dragging: false,
      goal: true,
      quick: false,
    };
    flight.current = f;
    paint(f);
    return f;
  };

  /** Pose every face, its light, and the shadows, for the flight's progress. */
  const paint = (f: Flight) => {
    const n = f.leaves.length;
    f.leaves.forEach((leaf, k) => {
      const p = f.p[k] ?? 0;
      const angle = faceAngles(p, f.dir);
      const z = String(leafZ(p, k, n));
      pose(leaf.start, angle.start, z, p);
      pose(leaf.arrive, angle.arrive, z, 1 - p);
    });
    // The page under the start side shows once the last leaf has gone; the
    // page under the arrive side is covered first by the first leaf.
    shade(f.shades[0], shadeOn("start", f.p[n - 1] ?? 0));
    shade(f.shades[1], shadeOn("arrive", f.p[0] ?? 0));
  };
  const pose = (el: HTMLElement, angle: number, z: string, lift: number) => {
    el.style.transform = `rotateY(${angle.toFixed(2)}deg)`;
    if (el.style.zIndex !== z) el.style.zIndex = z;
    const glint = el.querySelector<HTMLElement>(":scope > .diary-glint");
    if (glint) {
      const light = faceLight(lift);
      glint.style.setProperty("--dim", light.dim.toFixed(3));
      glint.style.setProperty("--gl", light.glint.toFixed(3));
      glint.style.setProperty("--gx", `${(light.at * 100).toFixed(1)}%`);
    }
  };
  const shade = (el: HTMLElement | null, s: { edge: number; width: number; alpha: number }) => {
    const band = el?.firstElementChild;
    if (!el || !(band instanceof HTMLElement)) return;
    const away = el.dataset.on === "left" ? -1 : 1;
    el.style.opacity = s.alpha.toFixed(3);
    // A little inside the edge: perspective throws the leaf's edge further out.
    band.style.transform = `translateX(${(away * s.edge * 92).toFixed(2)}%) scaleX(${s.width.toFixed(3)})`;
  };

  /** Run a flight on the clock to its goal. */
  const fly = (f: Flight, ms: number, progress: (elapsed: number) => number[]) => {
    // The clock starts at the first frame (`paint` has already posed it at 0).
    let t0 = -1;
    const step = (now: number) => {
      if (t0 < 0) t0 = now;
      const elapsed = Math.min(now - t0, ms);
      f.p = progress(elapsed);
      paint(f);
      if (elapsed >= ms) land(f);
      else f.raf = requestAnimationFrame(step);
    };
    f.raf = requestAnimationFrame(step);
  };

  /** Lay the leaves down: put back every style, open at the goal, then take
   *  the next pressed turn, if any. */
  const land = (f: Flight) => {
    cancelAnimationFrame(f.raf);
    if (flight.current !== f) return;
    for (const el of f.touched) {
      el.style.transform = "";
      el.style.zIndex = "";
      el.removeAttribute("data-face");
      el.removeAttribute("data-under");
      if (el.classList.contains("diary-sheet")) delete el.dataset.at;
    }
    for (const el of f.shades) {
      if (!el) continue;
      el.style.opacity = "";
      delete el.dataset.on;
    }
    frameRef.current?.removeAttribute("data-flight");
    flight.current = null;
    const next = f.goal ? f.to : f.from;
    flushSync(() => setAt(next));
    atRef.current = next;
    rest();
    if (!f.goal) return;
    // The ribbon swings as the leaf lands.
    ribbonRef.current?.animate?.(
      [{ transform: "rotate(0deg)" }, { transform: `rotate(${f.dir * 7}deg)` }, { transform: `rotate(${-f.dir * 3}deg)` }, { transform: "rotate(0deg)" }],
      { duration: 900, easing: "ease-out" },
    );
    f.then?.();
    if (pending.current !== 0 && !flight.current) {
      const dir: TurnDir = pending.current > 0 ? 1 : -1;
      pending.current -= dir;
      const to = atRef.current + dir * perNow();
      if (to >= 0 && to <= lastOpening()) launch(dir, to, 1, true);
      else pending.current = 0;
    }
  };

  /** Bring any turn in the air down at once, where it was going. */
  const finish = () => {
    pending.current = 0;
    const f = flight.current;
    if (!f) return;
    if (f.dragging) f.goal = false;
    drag.current = null;
    land(f);
  };

  const launch = (dir: TurnDir, to: number, n: number, quick: boolean, then?: () => void) => {
    const f = begin(dir, to, n);
    if (!f) return;
    f.quick = quick;
    f.then = then;
    fly(f, turnMs(n, quick), (elapsed) => f.leaves.map((_, k) => leafProgress(elapsed, k, n, quick)));
  };

  /** Open at page `target`: turned to (a riffle if it is more than one turn
   *  away) or, when `animate` is false, at once. */
  const go = (target: number, animate: boolean, then?: () => void) => {
    finish();
    const p = perNow();
    const to = openingOf(target, p, leaves().length);
    const from = atRef.current;
    if (to === from || !animate || modeRef.current !== "leaf") {
      if (to !== from) {
        flushSync(() => setAt(to));
        atRef.current = to;
        rest();
      }
      then?.();
      return;
    }
    launch(to > from ? 1 : -1, to, riffleLeaves(Math.abs(to - from) / p), false, then);
  };

  /** One turn: a corner pressed, or ← →. Pressed again mid-turn, it follows. */
  const turn = (dir: TurnDir) => {
    const track = trackRef.current;
    if (!track) return;
    if (modeRef.current !== "leaf") {
      const behavior = window.matchMedia?.(REDUCED_MOTION).matches ? "auto" : "smooth";
      track.scrollBy?.({ left: dir * track.clientWidth, behavior });
      return;
    }
    const f = flight.current;
    if (f?.dragging) return;
    const p = perNow();
    const base = f ? (f.goal ? f.to : f.from) + pending.current * p : atRef.current;
    const to = base + dir * p;
    if (to < 0 || to > lastOpening()) return;
    if (f) pending.current += dir;
    else launch(dir, to, 1, false);
  };

  /** Re-bind the book to a kind, keeping the page that was open if it stays. */
  const rebind = (next: FilterId) => {
    const was = leaves()[atRef.current];
    flushSync(() => {
      setFilter(next);
      setBound(next);
    });
    const i = was ? leaves().indexOf(was) : -1;
    const to = openingOf(Math.max(i, 0), perNow(), leaves().length);
    flushSync(() => setAt(to));
    atRef.current = to;
    rest();
  };

  /** A tab: the book riffles back to its first page and re-binds there. */
  const pick = (next: FilterId) => {
    if (modeRef.current !== "leaf" || atRef.current === 0) {
      finish();
      setFilter(next);
      setBound(next);
      setAt(0);
      return;
    }
    setFilter(next);
    go(0, true, () => setBound(next));
  };

  // The latest of these for listeners added once.
  const api = useRef({ go, turn, finish, rebind, measure, rest });
  useLayoutEffect(() => {
    api.current = { go, turn, finish, rebind, measure, rest };
  });

  /* ---------------------------------------------------------------- */
  /* Track mode: follow the scroll                                     */
  /* ---------------------------------------------------------------- */

  const read = () => {
    const track = trackRef.current;
    if (!track || modeRef.current === "leaf") return;
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
    setView((v) => (v.index === index && v.atStart === atStart && v.atEnd === atEnd ? v : { index, atStart, atEnd }));
  };
  const readRef = useRef(read);
  useLayoutEffect(() => {
    readRef.current = read;
  });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const onScroll = () => {
      // The leaves never scroll: the track stays a scroll container only so
      // binding the book moves nothing on the page (a box that stops being
      // one is a layout shift), but focus, find, `scrollIntoView` or a leaf
      // in the air could still scroll it. Put it straight back.
      if (modeRef.current === "leaf") {
        if (track.scrollLeft !== 0 || track.scrollTop !== 0) track.scrollTo(0, 0);
        return;
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => readRef.current());
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    readRef.current();
    return () => {
      track.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Choosing the book: leaves where motion is welcome, else the track */
  /* ---------------------------------------------------------------- */

  useLayoutEffect(() => {
    frameRef.current?.setAttribute("data-live", "");
    const reduce = window.matchMedia?.(REDUCED_MOTION);
    const wide = window.matchMedia?.(SPREAD);
    const choose = () => {
      const track = trackRef.current;
      if (!track) return;
      const nextSpread = !!wide?.matches;
      const leaf = !!reduce && !reduce.matches;
      if (leaf && modeRef.current !== "leaf") {
        // Open where the track was: at the fragment's page if the URL names
        // one in the book, else at the page the track shows.
        spreadRef.current = nextSpread;
        const ls = leaves();
        const target = byHash(window.location.hash);
        let i = target && track.contains(target) ? ls.indexOf(slotOf(target)!) : -1;
        if (i < 0) {
          let best = Infinity;
          ls.forEach((slot, k) => {
            const d = Math.abs(slot.offsetLeft - track.scrollLeft);
            if (d < best) {
              best = d;
              i = k;
            }
          });
        }
        // The track's height is the tallest page's: the book keeps it.
        track.style.setProperty("--page-h", `${track.offsetHeight}px`);
        const to = openingOf(Math.max(i, 0), nextSpread ? 2 : 1, ls.length);
        modeRef.current = "leaf";
        atRef.current = to;
        setSpread(nextSpread);
        setAt(to);
        setMode("leaf");
      } else if (!leaf && modeRef.current !== "track") {
        api.current.finish();
        modeRef.current = "track";
        spreadRef.current = nextSpread;
        setSpread(nextSpread);
        setMode("track");
      } else {
        // A spread becoming one page (or back) mid-turn: land it first.
        if (nextSpread !== spreadRef.current) api.current.finish();
        spreadRef.current = nextSpread;
        setSpread(nextSpread);
      }
    };
    choose();
    reduce?.addEventListener?.("change", choose);
    wide?.addEventListener?.("change", choose);
    return () => {
      reduce?.removeEventListener?.("change", choose);
      wide?.removeEventListener?.("change", choose);
    };
  }, []);

  // At rest: show the opening.
  const lastMode = useRef<Mode | null>(null);
  useLayoutEffect(() => {
    atRef.current = opening;
    const track = trackRef.current;
    if (mode === "leaf") {
      rest();
    } else if (mode === "track" && lastMode.current === "leaf" && track) {
      // Back to the track (reduced motion asked for mid-visit): every page
      // shown, scrolled to the one that was open.
      show(null);
      for (const name of ["--page-h", "--depth", "--room"]) track.style.removeProperty(name);
      const slot = leaves()[opening];
      track.scrollTo?.({ left: slot?.offsetLeft ?? 0, behavior: "instant" });
      read();
    }
    lastMode.current = mode;
    // `rest`, `measure`, `show`, `read` and `leaves` read refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, opening, spread, bound]);

  // On the track, a tab re-binds the book from its first page. (Compared with
  // the last binding rather than "is this the first run", so React's
  // development double-run cannot scroll a book that opened on a fragment.)
  const lastBound = useRef(bound);
  useLayoutEffect(() => {
    if (lastBound.current === bound) return;
    lastBound.current = bound;
    if (modeRef.current === "leaf") return;
    trackRef.current?.scrollTo?.({ left: 0, behavior: "auto" });
    readRef.current();
  }, [bound]);

  // Every page as tall as the tallest: on opening, and again whenever the
  // pages change shape (a spread, a tab).
  useLayoutEffect(() => {
    if (mode === "leaf") measure();
  }, [mode, spread, bound]);

  // A new width re-flows every page: measure them again.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return;
    let width = track.clientWidth;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      if (track.clientWidth === width) return;
      width = track.clientWidth;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => api.current.measure());
    });
    observer.observe(track);
    document.fonts?.ready.then(() => api.current.measure());
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Fragments, links and the browser's find                           */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const inBook = (el: HTMLElement | null): el is HTMLElement => !!el && track.contains(el);
    const onScreen = () => {
      const r = track.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight;
    };

    // A link in the book (a contents line, a ring, a pressed card) turns, or
    // riffles, to its page while the window glides to where it will land, then
    // lands on it as the browser would; a link from outside the book (a tag on
    // the oak, the chat) opens it there at once and lands, like any fragment.
    // Links to a page a tab has hidden clear the tab first.
    // And browsers without invoker commands (`commandfor`, see
    // `ImageDialog.tsx`) get the same `showModal()` / `close()` from here.
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest("a[href^='#']");
      const href = link?.getAttribute("href") ?? "";
      const el = byHash(href);
      const plain = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
      if (inBook(el) && plain && !event.defaultPrevented) {
        if (el.closest(".diary-slot[data-hidden]")) api.current.rebind("all");
        if (modeRef.current === "leaf") {
          event.preventDefault();
          const page = slotOf(el);
          const index = page ? Array.from(track.querySelectorAll(":scope > .diary-slot:not([data-hidden])")).indexOf(page) : -1;
          const turned = !!link && track.contains(link) && onScreen();
          api.current.go(index, turned, () => {
            if (window.location.hash === href) el.scrollIntoView({ block: "start" });
            else window.location.hash = href;
          });
          if (flight.current) {
            // Lifted, every page in the turn lies flat or face down, so the
            // target's top is where it will rest.
            const top = el.getBoundingClientRect().top - parseFloat(getComputedStyle(el).scrollMarginTop || "0");
            if (Math.abs(top) > 2) window.scrollBy({ top, behavior: "smooth" });
          }
        }
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

    // A fragment the book did not turn to itself (typed, or back and
    // forward): open at its page.
    const onHash = () => {
      const el = byHash(window.location.hash);
      if (!inBook(el)) return;
      const hidden = !!el.closest(".diary-slot[data-hidden]");
      if (hidden) api.current.rebind("all");
      if (modeRef.current === "leaf") {
        const page = slotOf(el);
        const index = page ? Array.from(track.querySelectorAll(":scope > .diary-slot:not([data-hidden])")).indexOf(page) : -1;
        const before = atRef.current;
        api.current.go(index, false);
        if (hidden || atRef.current !== before) el.scrollIntoView({ block: "start" });
      } else if (hidden) {
        el.scrollIntoView({ block: "start" });
      }
    };

    // The browser found something on a page not on show (find in page, or a
    // fragment): open there before it reveals and scrolls to it.
    const onMatch = (event: Event) => {
      if (modeRef.current !== "leaf") return;
      const page = slotOf(event.target instanceof Element ? event.target : null);
      const index = page ? Array.from(track.querySelectorAll(":scope > .diary-slot:not([data-hidden])")).indexOf(page) : -1;
      if (index >= 0) api.current.go(index, false);
    };

    // Capture, so the tab clears before the browser scrolls to the link.
    document.addEventListener("click", onClick, true);
    window.addEventListener("hashchange", onHash);
    track.addEventListener("beforematch", onMatch);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("hashchange", onHash);
      track.removeEventListener("beforematch", onMatch);
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Hands: corners, swipes, trackpads, keys                           */
  /* ---------------------------------------------------------------- */

  /** Start following a hand: a leaf lifted, ready to follow it. */
  const lift = (dir: TurnDir): Flight | null => {
    if (flight.current) return null;
    const to = atRef.current + dir * perNow();
    if (to < 0 || to > lastOpening()) return null;
    const f = begin(dir, to, 1);
    if (f) f.dragging = true;
    return f;
  };
  /** Let go: past halfway, or flicked, it turns; short of it, it falls back. */
  const release = (f: Flight, velocity: number, cancelled = false) => {
    const p0 = f.p[0] ?? 0;
    f.dragging = false;
    f.goal = !cancelled && completes(p0, velocity, !spreadRef.current);
    const goal = f.goal ? 1 : 0;
    const ms = Math.max(180, Math.abs(goal - p0) * TURN_MS * 0.9);
    fly(f, ms, (elapsed) => [p0 + (goal - p0) * easeOut(elapsed / ms)]);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (modeRef.current !== "leaf" || !event.isPrimary || event.button !== 0) return;
    const el = event.target as Element;
    const corner = el.closest<HTMLElement>(".diary-corner");
    if (corner?.getAttribute("aria-disabled") === "true") return;
    // A mouse turns by a corner; a finger or a pen anywhere on a page.
    if (!corner && (event.pointerType === "mouse" || !el.closest(".diary-track") || el.closest("dialog, input, textarea, select, video"))) return;
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      dir: corner ? (corner.classList.contains("diary-corner-next") ? 1 : -1) : 0,
      corner: !!corner,
      f: null,
      trail: [[event.timeStamp, event.clientX]],
    };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const dx = event.clientX - d.x;
    const dy = event.clientY - d.y;
    if (!d.f) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.2) {
        // Mostly down the page: that is scrolling, not turning.
        if (!d.corner && Math.abs(dy) > 12) drag.current = null;
        return;
      }
      const dir: TurnDir = d.dir || (dx < 0 ? 1 : -1);
      // A forward turn pulls the page to the left; a back turn, to the right.
      const f = -dir * dx > 0 ? lift(dir) : null;
      if (!f) {
        drag.current = null;
        return;
      }
      d.dir = dir;
      d.f = f;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    d.f.p = [dragProgress(-(d.dir || 1) * dx, pageWidth())];
    paint(d.f);
    d.trail.push([event.timeStamp, event.clientX]);
    if (d.trail.length > 6) d.trail.shift();
  };
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    drag.current = null;
    if (!d.f || d.dir === 0) return;
    dragged.current = true;
    window.setTimeout(() => {
      dragged.current = false;
    }, 0);
    // How fast the hand was going over its last ~100ms, in the turn's direction.
    const recent = d.trail.filter(([t]) => event.timeStamp - t < 100);
    const [t0, x0] = recent[0] ?? [event.timeStamp, event.clientX];
    const velocity = event.timeStamp > t0 ? (-d.dir * (event.clientX - x0)) / (event.timeStamp - t0) : 0;
    release(d.f, velocity, event.type === "pointercancel");
  };
  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!dragged.current) return;
    dragged.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  // A trackpad's sideways swipe turns the leaf as it goes, like a finger. Not
  // passive: the browser would otherwise take the swipe for "back".
  useEffect(() => {
    const book = frameRef.current?.querySelector<HTMLElement>(".diary-book");
    if (!book) return;
    let swipe: { f: Flight; dir: TurnDir; travel: number; timer: number } | null = null;
    let quietUntil = 0;
    const letGo = () => {
      const s = swipe;
      swipe = null;
      // A trackpad's momentum runs on after the fingers lift: let its tail
      // die away before a swipe can start another turn.
      quietUntil = performance.now() + 220;
      if (s && flight.current === s.f) release(s.f, 0);
    };
    const onWheel = (event: WheelEvent) => {
      if (modeRef.current !== "leaf") return;
      const dx = event.deltaMode === 1 ? event.deltaX * 16 : event.deltaX;
      if (!swipe) {
        if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) || Math.abs(dx) < 1) return;
        event.preventDefault();
        if (flight.current || performance.now() < quietUntil) return;
        const dir: TurnDir = dx > 0 ? 1 : -1;
        const f = lift(dir);
        if (!f) return;
        swipe = { f, dir, travel: 0, timer: 0 };
      }
      event.preventDefault();
      swipe.travel += swipe.dir * dx;
      swipe.f.p = [dragProgress(swipe.travel, pageWidth())];
      paint(swipe.f);
      window.clearTimeout(swipe.timer);
      swipe.timer = window.setTimeout(letGo, 160);
    };
    book.addEventListener("wheel", onWheel, { passive: false });
    return () => book.removeEventListener("wheel", onWheel);
    // `lift`, `release`, `paint` and `pageWidth` read refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if ((event.target as Element).closest("dialog, input, textarea, select")) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      turn(event.key === "ArrowLeft" ? -1 : 1);
    } else if ((event.key === "Home" || event.key === "End") && event.target === event.currentTarget) {
      event.preventDefault();
      const track = trackRef.current;
      if (modeRef.current === "leaf") go(event.key === "Home" ? 0 : leaves().length - 1, true);
      else track?.scrollTo?.({ left: event.key === "Home" ? 0 : track.scrollWidth, behavior: "auto" });
    }
  };

  /* ---------------------------------------------------------------- */
  /* What it says                                                      */
  /* ---------------------------------------------------------------- */

  const leaf = mode === "leaf";
  const index = leaf ? opening : view.index;
  const atStart = leaf ? opening === 0 : view.atStart;
  const atEnd = leaf ? opening + per >= leafCount : view.atEnd;
  const from = index + 1;
  const to = Math.min(from + per - 1, total);
  const where = per === 2 && to > from ? `pp. ${from}–${to} of ${total}` : `p. ${from} of ${total}`;
  const picked = tabs.find((t) => t.id === filter);
  const status = filter === "all" ? "" : `${picked?.label}: ${picked?.count} ${picked?.count === 1 ? "entry" : "entries"}, ${total} pages.`;
  const stack = stackLeaves(index, per, total);

  // The page is said once the book has stopped on it, not on every frame.
  useEffect(() => {
    const t = window.setTimeout(() => setSpoken(where), 200);
    return () => window.clearTimeout(t);
  }, [where]);

  return (
    <div ref={frameRef} data-diary="" data-mode={mode ?? undefined} className="diary-frame">
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
              onClick={() => pick(tab.id)}
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

      <div
        className="diary-book relative bg-surface"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={onClickCapture}
      >
        {/* The object: cloth boards around the block, the leaves stacked on
            either side of the opening, the ribbon out of the foot. */}
        <span aria-hidden="true" className="diary-cover" />
        <span aria-hidden="true" className="diary-stack diary-stack-read" style={{ "--leaves": stack.read } as CSSProperties} />
        <span aria-hidden="true" className="diary-stack diary-stack-left" style={{ "--leaves": stack.left } as CSSProperties} />
        <div
          ref={trackRef}
          role="region"
          aria-label={words.book}
          tabIndex={0}
          data-filter={bound}
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
                {page.head ? (
                  <span aria-hidden="true" className="diary-head">
                    {page.head}
                  </span>
                ) : null}
                {page.kind === "contents" ? (
                  <ContentsPage chapters={chapters} filter={bound} numberOf={numberOf} words={words} certificatesId={pages.find((p) => p.kind === "certificates")?.id ?? ""} />
                ) : (
                  page.node
                )}
                {n ? (
                  <span aria-hidden="true" className="diary-folio">
                    {n}
                  </span>
                ) : null}
                <span aria-hidden="true" className="diary-glint" />
              </div>
            );
          })}
          {total % 2 === 1 ? (
            <div aria-hidden="true" className="diary-slot diary-slot-blank bg-surface" data-side="right">
              <span className="diary-glint" />
            </div>
          ) : null}
          {/* Blank leaves for a riffle to flick, and the shadows a turning
              leaf throws: only ever shown by a turn. */}
          {Array.from({ length: SHEETS }, (_, i) => (
            <div key={`sheet-${i}`} aria-hidden="true" className="diary-sheet">
              <span className="diary-glint" />
            </div>
          ))}
          <div aria-hidden="true" className="diary-shade">
            <span />
          </div>
          <div aria-hidden="true" className="diary-shade">
            <span />
          </div>
        </div>
        <span ref={ribbonRef} aria-hidden="true" className="diary-ribbon" />
        <button
          type="button"
          aria-label={words.previous}
          aria-disabled={atStart}
          onClick={() => !atStart && turn(-1)}
          className="diary-corner diary-corner-prev [html:not([data-motion])_&]:hidden"
        >
          <span aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={words.next}
          aria-disabled={atEnd}
          onClick={() => !atEnd && turn(1)}
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
