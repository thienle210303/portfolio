"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Disclosure, type DisclosureProps } from "@/components/ui/Disclosure";

interface OpenRow {
  readonly openId: string | null;
  readonly setOpenId: (id: string | null) => void;
}

const OpenRowContext = createContext<OpenRow | null>(null);

/**
 * The timeline's one piece of state: which row is open. Rows are server
 * rendered and handed in as children, so the case-study prose inside them
 * stays out of the client bundle; only this wrapper and each row's
 * `TimelineRow` are client code.
 *
 * A fragment that names a row (`#journey-entry-<id>`) or anything inside one
 * (`#work-<projectId>`) opens that row, on load, on every `hashchange`, and on
 * a click on a link to the fragment already in the URL.
 * Until this has mounted, the stylesheet opens the targeted row from
 * `:target` alone (`[data-timeline]:not([data-live])` in `globals.css`), so a
 * reader with JavaScript off lands on an open row too; `data-live` hands the
 * job to React once it is here.
 *
 * The browser lands on a fragment before the row around it has finished
 * opening (Chromium does not re-match `:has(:target)` once scripts are
 * running, so a case study's row is still closed when it scrolls), and a row
 * above it may be closing at the same time. So the target is landed again once
 * its row is open: on the next frame, and again when the row's height
 * transition ends. Not after a reload or a history step, where the browser
 * restores the reader's own scroll position instead.
 */
export function TimelineAccordion({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  /** A fresh object per request, so landing on a second target in the row
   *  that is already open still runs the effect below. */
  const [landing, setLanding] = useState<{ readonly target: HTMLElement } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const targetedRow = () => {
      let id = window.location.hash.slice(1);
      try {
        id = decodeURIComponent(id);
      } catch {
        // A malformed escape is used as written, which names nothing.
      }
      const target = id ? document.getElementById(id) : null;
      if (!target || !root.contains(target)) return null;
      const row = target.closest<HTMLElement>("[data-tree-branch]");
      return row ? { target, rowId: row.dataset.treeBranch ?? null } : null;
    };
    const onHashChange = () => {
      const found = targetedRow();
      if (!found) return;
      setOpenId(found.rowId);
      setLanding({ target: found.target });
    };
    const initial = targetedRow();
    const navigation = performance.getEntriesByType?.("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    const restored = navigation?.type === "reload" || navigation?.type === "back_forward";
    // One commit for all three, so the stylesheet hands the targeted row to
    // React already open rather than closing it for a frame. Deferred a
    // microtask so the state change is not a synchronous write in the effect.
    queueMicrotask(() => {
      if (initial) {
        setOpenId(initial.rowId);
        if (!restored) setLanding({ target: initial.target });
      }
      setLive(true);
    });
    // A link to the fragment already in the URL fires no `hashchange`, so a
    // reader who closed the row and follows the same link again would land on
    // a closed row. Read before the default action, handled after it.
    const onClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href^='#']") : null;
      if (link && link.getAttribute("href") === window.location.hash) {
        requestAnimationFrame(onHashChange);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      document.removeEventListener("click", onClick);
    };
  }, []);

  useEffect(() => {
    if (!landing) return;
    const { target } = landing;
    const land = () => target.scrollIntoView({ block: "start" });
    const region = target
      .closest("[data-tree-branch]")
      ?.querySelector(":scope > div > [role='region']");
    const onEnd = (event: Event) => {
      if (event.target !== region || (event as TransitionEvent).propertyName !== "grid-template-rows") {
        return;
      }
      stop();
      land();
    };
    // Only this opening's transition: a later close of the same row must not
    // pull the reader back. A row that was already open has none, hence the
    // timeout, well past `--dur-reveal`.
    const stop = () => {
      region?.removeEventListener("transitionend", onEnd);
      clearTimeout(timeout);
    };
    const frame = requestAnimationFrame(land);
    region?.addEventListener("transitionend", onEnd);
    const timeout = setTimeout(stop, 1000);
    return () => {
      cancelAnimationFrame(frame);
      stop();
    };
  }, [landing]);

  return (
    <OpenRowContext.Provider value={{ openId, setOpenId }}>
      <div ref={rootRef} data-timeline="" data-live={live ? "" : undefined} className={className}>
        {children}
      </div>
    </OpenRowContext.Provider>
  );
}

/** A row's `Disclosure`, open only while it is the timeline's one open row. */
export function TimelineRow({
  rowId,
  ...props
}: Omit<DisclosureProps, "open" | "onOpenChange" | "defaultOpen"> & { readonly rowId: string }) {
  const context = useContext(OpenRowContext);
  return (
    <Disclosure
      {...props}
      open={context?.openId === rowId}
      onOpenChange={(open) => context?.setOpenId(open ? rowId : null)}
    />
  );
}
