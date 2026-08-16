"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { navItems } from "@/content/portfolio";
import { useActiveSection } from "@/hooks/useActiveSection";

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

/** Shared underline element for the active-state indicator. Always in the
 * DOM at a fixed size; only its opacity changes, so it never shifts layout
 * and never relies on colour alone (paired with `aria-current`). */
function ActiveIndicator({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 -bottom-px h-px bg-paper transition-opacity duration-150",
        active ? "opacity-100" : "opacity-0"
      )}
    />
  );
}

export default function SiteNav() {
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
        document.getElementById(pendingId)?.scrollIntoView({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          block: "start",
        });
      } else {
        window.scrollTo(0, scrollY);
      }
    };
  }, [open]);

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
          // Desktop: no scroll lock in play, so scroll immediately.
          target.scrollIntoView({
            behavior: prefersReducedMotion() ? "auto" : "smooth",
            block: "start",
          });
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
        <ul className="flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = item.sectionId === activeId;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.sectionId}`}
                  aria-current={isActive ? "true" : undefined}
                  onClick={handleNavLinkClick(item.sectionId)}
                  className={cn(
                    "relative inline-flex min-h-11 items-center py-2 text-[length:var(--step--1)] transition-colors duration-150",
                    isActive ? "text-paper" : "text-muted hover:text-paper"
                  )}
                >
                  {item.label}
                  <ActiveIndicator active={isActive} />
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls={MOBILE_PANEL_ID}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-11 w-11 items-center justify-center border border-hairline text-paper lg:hidden"
      >
        {open ? (
          <X aria-hidden="true" focusable="false" size={20} />
        ) : (
          <Menu aria-hidden="true" focusable="false" size={20} />
        )}
      </button>

      {open ? (
        <div
          id={MOBILE_PANEL_ID}
          ref={panelRef}
          className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-ink lg:hidden"
        >
          <nav
            aria-label="Mobile"
            className="shell py-6"
            style={{
              paddingLeft: "max(var(--gutter), env(safe-area-inset-left))",
              paddingRight: "max(var(--gutter), env(safe-area-inset-right))",
              paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
            }}
          >
            <ul>
              {navItems.map((item) => {
                const isActive = item.sectionId === activeId;
                return (
                  <li key={item.id} className="border-b border-hairline first:border-t">
                    <a
                      href={`#${item.sectionId}`}
                      aria-current={isActive ? "true" : undefined}
                      onClick={handleNavLinkClick(item.sectionId)}
                      className={cn(
                        "flex min-h-11 items-center justify-between py-3 text-[length:var(--step-1)]",
                        isActive ? "text-paper" : "text-muted"
                      )}
                    >
                      {item.label}
                      <span
                        aria-hidden="true"
                        className={cn(
                          "h-px w-6 bg-paper transition-opacity duration-150",
                          isActive ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      ) : null}
    </>
  );
}
