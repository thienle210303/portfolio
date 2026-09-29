import { highlight } from "@/lib/highlight";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { cn } from "@/lib/cn";

interface CodeBlockProps {
  readonly code: string;
  readonly filename: string;
  readonly summary: string;
  readonly className?: string;
  /**
   * Tightens the figcaption/code padding and steps the code type down one
   * notch (`--step--1` → `--step--2`) without touching the content or the
   * token markup. Added for the hero code artifact (round 12, WP-K), which
   * needed to stop "dominating the hero column" next to the identity copy —
   * every other caller is unaffected by default (`compact` defaults to
   * `false`, matching every existing usage).
   */
  readonly compact?: boolean;
}

function summaryIdFor(filename: string): string {
  const slug = filename
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `code-summary-${slug || "block"}`;
}

/**
 * A syntax-"highlighted" code panel that never relies on colour alone:
 * every CodeTokenKind pairs a colour with weight/style (bold keywords,
 * italic strings/comments — see the `[data-token]` rules in globals.css).
 * That pairing is what keeps the panel readable in greyscale and in print.
 *
 * The panel used to be a fixed dark artifact regardless of section tone. It is
 * not any more: it sits on `--surface` and its tokens are the semantic
 * aliases, so it follows the theme and the tone like everything else — a white
 * card in day, a raised panel in night. Do not reintroduce a raw `--color-*`
 * token here; it would render dark-on-white the moment the theme changes.
 *
 * Assumes `filename` is unique among CodeBlocks simultaneously present in
 * the DOM (it derives the hidden-summary id from it). True for the actual
 * content today; flagged in Agent 1A's report for anyone composing this
 * with more than one CodeBlock visible at once.
 */
export function CodeBlock({ code, filename, summary, className, compact = false }: CodeBlockProps) {
  const tokens = highlight(code);
  const summaryId = summaryIdFor(filename);

  return (
    // No `data-cat-hide` here, and it is worth saying why not: this figure
    // carried it for one commit. A cat hides by standing in the clear band
    // *above* a panel's top edge, and every code figure on this page has
    // something in that band — the hero's has its tab buttons, and the AI
    // Workflow Lab's (removed round 16) had the ask form painting over it.
    // Swept every 40px of the page at 1440 and 1024, the attribute here
    // produced zero usable hiding places out of 695 and 735 scroll positions.
    // A contract that is declared and never once satisfied is worse than no
    // contract: it reads as coverage.
    <figure className={cn("min-w-0 max-w-full border border-rule bg-surface", className)}>
      <figcaption
        className={cn(
          "flex items-center justify-between gap-4 border-b border-rule",
          compact ? "px-3 py-2" : "px-4 py-3",
        )}
      >
        <span
          className={cn(
            "wrap-anywhere font-mono text-fg-muted",
            compact ? "text-[length:var(--step--2)]" : "text-[length:var(--step--1)]",
          )}
        >
          {filename}
        </span>
      </figcaption>
      {/*
       * Long lines wrap instead of scrolling sideways: `whitespace-pre-wrap`
       * keeps the preformatted line breaks/indentation but lets the line
       * itself break, and `wrap-anywhere` (`overflow-wrap: anywhere`) is the
       * belt-and-braces part — it lets a single unbreakable token (a long
       * hash, URL, or identifier with no spaces) break mid-token rather than
       * stretch this panel, and the panel, past the viewport.
       *
       * A hanging indent for wrapped continuation lines (padding-left +
       * negative text-indent) was considered and dropped: `text-indent`
       * only offsets the very first line of the whole block, and the
       * standards-track fix for "reset it after every hard break" —
       * `text-indent: <len> each-line` — isn't implemented in
       * Chromium/WebKit, so it would silently no-op on most engines. The
       * alternative, indenting per source line, needs each line to be its
       * own block box, which means splitting on the `\n`s embedded inside
       * token values (a blank-line run is one `whitespace` token; a block
       * comment is one `comment` token spanning several lines) — exactly
       * the token-span markup this change is asked to leave untouched.
       */}
      <pre
        role="region"
        aria-label={filename}
        aria-describedby={summaryId}
        className={cn(
          "max-w-full whitespace-pre-wrap wrap-anywhere",
          compact ? "p-3" : "p-4",
        )}
      >
        <code
          className={cn(
            "font-mono leading-relaxed",
            compact ? "text-[length:var(--step--2)]" : "text-[length:var(--step--1)]",
          )}
        >
          {tokens.map((token, index) => (
            // Tokens are a fixed, freshly computed array from a pure
            // function on every render — no reordering/insertion ever
            // happens to this list, so an index key is safe here.
            <span key={index} data-token={token.kind}>
              {token.value}
            </span>
          ))}
        </code>
      </pre>
      <VisuallyHidden as="p" id={summaryId}>
        {summary}
      </VisuallyHidden>
    </figure>
  );
}

export default CodeBlock;
