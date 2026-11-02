"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { cn } from "@/lib/cn";
import { navItems } from "@/content/portfolio";
import { useActiveSection } from "@/hooks/useActiveSection";
import { glide } from "@/lib/glide";

// Built once at module scope so the array identity never changes across
// renders — useActiveSection re-subscribes its observer whenever the
// array it's given changes identity.
const SECTION_IDS = navItems.map((item) => item.sectionId);

const MOBILE_PANEL_ID = "mobile-nav-panel";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Glide to a section (a View Transition); a plain scroll where it cannot. */
function goTo(target: HTMLElement): void {
  if (glide(target, () => target.scrollIntoView({ block: "start" }))) return;
  target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
}

/** The ink swash under the current section (round 23). Always in the DOM at
 * its full size; the stylesheet draws it on from the left when its link gains
 * `aria-current` and wipes it off when it loses it (instantly under reduced
 * motion), so it never shifts layout and never carries the state alone: the
 * link says `aria-current` too. The drawing is `nav-swash.svg`, painted in
 * the paper's `--accent`. */
function Swash() {
  return <span aria-hidden="true" className="nav-swash" />;
}

/** "01" for the first stop: the nav is the page's table of contents. */
const stopNumber = (index: number) => String(index + 1).padStart(2, "0");

export default function SiteNav({ facts }: { readonly facts: Readonly<Record<string, string>> }) {
  const [open, setOpen] = useState(false);
  const activeId = useActiveSection(SECTION_IDS);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Set by handleNavLinkClick when a link is activated while the scroll
  // lock below is active. Read (and cleared) by that same lock's cleanup —
  // see the comments in both places for why this hand-off exists.
  const pendingScrollIdRef = useRef<string | null>(null);

  // Everything that only matters while the mobile menu is open: lock
  // background scroll (restored without a jump on close), move focus into
  // the panel, close on Escape (returning focus to the toggle), and trap
  // Tab/Shift+Tab inside the toggle + panel while open.
  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const body = document.body;
    const previousStyle = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      width: body.style.width,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.width = "100%";

    // The cats float above the header, but never above the open menu.
    document.documentElement.setAttribute("data-menu-open", "");

    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("a")?.focus();

    function focusableElements(): HTMLElement[] {
      const toggle = toggleRef.current;
      const panelItems = panel
        ? Array.from(panel.querySelectorAll<HTMLElement>("a, button"))
        : [];
      return toggle ? [toggle, ...panelItems] : panelItems;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = focusableElements();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    // If the viewport crosses into the desktop breakpoint while open (a
    // resize or orientation change), the toggle and panel both disappear
    // via `lg:hidden` — close the menu too, so the scroll lock above
    // doesn't get stranded on with no visible control left to release it.
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    function onDesktopChange(event: MediaQueryListEvent) {
      if (event.matches) setOpen(false);
    }
    desktopQuery.addEventListener("change", onDesktopChange);

    return () => {
      document.documentElement.removeAttribute("data-menu-open");
      document.removeEventListener("keydown", onKeyDown);
      desktopQuery.removeEventListener("change", onDesktopChange);
      body.style.position = previousStyle.position;
      body.style.top = previousStyle.top;
      body.style.left = previousStyle.left;
      body.style.width = previousStyle.width;

      // A nav link was activated while locked (see handleNavLinkClick
      // below): `body` had no scrollable overflow at that moment, so its
      // scrollIntoView call was a no-op, and the real scroll has to happen
      // here instead, now that normal flow — and therefore scrolling — is
      // restored. Skip the old-position restore in that case; doing both
      // would scroll to the target and then immediately scroll back.
      const pendingId = pendingScrollIdRef.current;
      if (pendingId) {
        pendingScrollIdRef.current = null;
        const pending = document.getElementById(pendingId);
        if (pending) goTo(pending);
      } else {
        // A fixup, not a navigation: `body` was pinned at `position: fixed`
        // for the lock, which reset its scroll offset to 0, so this is
        // putting the page back where it visually already was rather than
        // moving it anywhere new. It must never animate — explicit `auto`
        // rather than the default, which would otherwise pick up whatever
        // `scroll-behavior` the page happens to have (see globals.css's `html`
        // rule for why that is deliberately not "smooth").
        window.scrollTo({ top: scrollY, left: 0, behavior: "auto" });
      }
    };
  }, [open]);

  /*
   * Hrefs are root-relative (`/#tree`), not bare fragments (`#tree`).
   *
   * The header renders on /resume too, where none of these sections exist. A
   * bare fragment there just rewrites the hash and goes nowhere; the
   * root-relative form navigates home and lands on the section. On the home
   * page the handler below intercepts before the browser ever follows the
   * href, so the smooth scroll and focus move are unchanged — and when the
   * target is genuinely absent it deliberately does not preventDefault, which
   * is what lets the browser do the right thing instead.
   */
  function handleNavLinkClick(sectionId: string) {
    return (event: ReactMouseEvent<HTMLAnchorElement>) => {
      const target = document.getElementById(sectionId);
      if (target) {
        event.preventDefault();

        // Sections aren't natively focusable; make the destination a valid
        // programmatic focus target so keyboard/SR users land where the
        // page visually moved to, instead of losing their place. Focusing
        // never scrolls on its own (`preventScroll`), so this is always
        // safe to do immediately, independent of the branch below.
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
        window.history.pushState(null, "", `#${sectionId}`);

        if (open) {
          // The mobile scroll lock has put `body` at `position: fixed`
          // (see the effect above), which leaves nothing for the document
          // to scroll — calling scrollIntoView here would silently do
          // nothing. Hand the target off to the lock's own cleanup
          // instead, which fires once `body` is back in normal flow
          // (triggered by setOpen(false) below).
          pendingScrollIdRef.current = sectionId;
        } else {
          // Desktop: no scroll lock in play, so go immediately.
          goTo(target);
        }
      }
      // Escape restores focus to the toggle button (nothing navigated);
      // a link click already moved focus to the destination section above,
      // so closing here must not steal it back.
      if (open) setOpen(false);
    };
  }

  return (
    <>
      <nav aria-label="Primary" className="hidden lg:block">
        <ul className="flex items-center gap-0.5">
          {navItems.map((item) => {
            const isActive = item.sectionId === activeId;
            return (
              <li key={item.id}>
                <a
                  href={`/#${item.sectionId}`}
                  aria-current={isActive ? "true" : undefined}
                  onClick={handleNavLinkClick(item.sectionId)}
                  className={cn(
                    "nav-link relative inline-flex min-h-11 items-center px-3 font-display text-[length:var(--step-0)] font-semibold transition-colors duration-150",
                    isActive ? "text-fg" : "text-fg-muted hover:text-fg"
                  )}
                >
                  {item.label}
                  <Swash />
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* A paper tag with a punched hole, like the TL tag; the word is the
          label, `aria-label` says what pressing it does. No box. */}
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls={MOBILE_PANEL_ID}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
        className="nav-menu-tag inline-flex min-h-11 min-w-11 items-center gap-2 px-2.5 font-display text-[length:var(--step-0)] font-semibold text-fg active:translate-y-px lg:hidden"
      >
        <span aria-hidden="true" className="nav-hole" />
        <span aria-hidden="true">{open ? "Close" : "Menu"}</span>
      </button>

      {open ? (
        <>
        {/* The notebook page's torn top edge: paper, flipped, hung from the foot
            of the header. */}
        <span aria-hidden="true" className="nav-notebook-edge bg-surface lg:hidden" />
        <div
          id={MOBILE_PANEL_ID}
          ref={panelRef}
          className="nav-notebook pointer-events-auto fixed inset-x-0 top-[calc(var(--header-h)+9px)] bottom-0 z-40 overflow-y-auto bg-surface lg:hidden"
        >
          {/* The menu is a trail map (round 22): the four pages are stops on a
              dashed path, the one you are on filled in and marked "you are
              here", each with one fact computed from the content
              (`SiteHeader`). Every decoration is `aria-hidden`, so a link's
              name is still just its label. TL bleeds off the foot, as on the
              card. */}
          <nav
            aria-label="Mobile"
            className="shell relative isolate min-h-full overflow-hidden py-8"
            style={{
              // Left of the gutter is the notebook's margin, where the holes are.
              paddingLeft: "max(calc(var(--gutter) + 1.75rem), env(safe-area-inset-left))",
              paddingRight: "max(var(--gutter), env(safe-area-inset-right))",
              paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
            }}
          >
            <p aria-hidden="true" className="font-mono text-[12px] tracking-[0.16em] text-fg-muted uppercase">
              The trail &middot; {navItems.length} stops
            </p>
            <ol role="list" className="relative mt-5">
              <span
                aria-hidden="true"
                className="absolute top-9 bottom-9 left-[11px] border-l-[1.5px] border-dashed border-[color:var(--twine)]"
              />
              {navItems.map((item, index) => {
                const isActive = item.sectionId === activeId;
                return (
                  <li key={item.id}>
                    <a
                      href={`/#${item.sectionId}`}
                      aria-current={isActive ? "true" : undefined}
                      onClick={handleNavLinkClick(item.sectionId)}
                      className="group grid min-h-[4.75rem] grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-4 py-2"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "relative grid size-6 place-items-center rounded-full border-[1.5px] bg-surface transition-colors duration-150",
                          isActive ? "border-accent" : "border-[color:var(--twine)] group-hover:border-accent",
                        )}
                      >
                        <span className={cn("size-2.5 rounded-full bg-accent", isActive ? "opacity-100" : "opacity-0")} />
                      </span>
                      <span className="min-w-0">
                        <span aria-hidden="true" className="block font-mono text-[11.5px] text-fg-muted">
                          {stopNumber(index)}
                          {isActive ? <span className="text-accent"> &middot; you are here</span> : null}
                        </span>
                        <span
                          className={cn(
                            "block font-display text-[length:var(--step-3)] leading-[1.1] font-semibold tracking-[-0.02em] transition-colors duration-150",
                            isActive ? "text-fg" : "text-fg-muted group-hover:text-fg",
                          )}
                        >
                          {item.label}
                        </span>
                      </span>
                      <span aria-hidden="true" className="text-right font-mono text-[12.5px] text-fg-muted">
                        {facts[item.sectionId]}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>
            <span
              aria-hidden="true"
              data-monogram="TL"
              className="pointer-events-none absolute right-[var(--gutter)] -bottom-[0.18em] -z-10 font-display text-[clamp(9rem,42vw,15rem)] leading-[0.8] font-semibold tracking-[-0.02em] text-fg opacity-[0.06] before:content-[attr(data-monogram)]"
            />
          </nav>
        </div>
        </>
      ) : null}
    </>
  );
}
