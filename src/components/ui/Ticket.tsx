import type { ReactNode } from "react";
import { ArrowRight, Mail, Play } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The one primary control, drawn as a printed ticket (round 29,
 * design/round-29-craft/v1/boards/controls.html): two punched notches, a
 * perforation, and a stub with the arrow. Hover tears the stub a little; a
 * press punches the whole ticket 1px.
 *
 * Two parts, because the notches are a mask and a mask would also cut the
 * focus ring: the pressable element (an `<a>` or `<button>`, given
 * `TICKET_CLASSES`) stays unmasked and carries the ring, and `TicketFace`
 * inside it carries the --control fill and the mask. The stub's glyph is an
 * `aria-hidden` icon, so the control's name and its text stay its words.
 */
export const TICKET_CLASSES = "ticket group relative inline-flex min-h-11 items-stretch active:translate-y-px";

export type TicketStub = "go" | "play" | "send";

const STUB_ICONS = { go: ArrowRight, play: Play, send: Mail } as const;

export function TicketFace({
  children,
  stub = "go",
  className,
}: {
  readonly children: ReactNode;
  readonly stub?: TicketStub;
  readonly className?: string;
}) {
  const Icon = STUB_ICONS[stub];
  return (
    <span
      className={cn(
        "ticket-face inline-flex items-center bg-[color:var(--control)] text-[color:var(--fg-inverse)] transition-colors duration-200 group-hover:bg-[color:var(--accent)]",
        className,
      )}
    >
      <span className="ticket-label">{children}</span>
      <span className="ticket-stub" aria-hidden="true">
        <Icon focusable="false" size={stub === "play" ? 14 : 17} strokeWidth={2.25} />
      </span>
    </span>
  );
}
