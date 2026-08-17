import { highlight } from "@/lib/highlight";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { cn } from "@/lib/cn";

interface CodeBlockProps {
  readonly code: string;
  readonly filename: string;
  readonly summary: string;
  readonly className?: string;
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
export function CodeBlock({ code, filename, summary, className }: CodeBlockProps) {
  const tokens = highlight(code);
  const summaryId = summaryIdFor(filename);

  return (
    <figure className={cn("min-w-0 max-w-full border border-rule bg-surface", className)}>
      <figcaption className="flex items-center justify-between gap-4 border-b border-rule px-4 py-3">
        <span className="wrap-anywhere font-mono text-[length:var(--step--1)] text-fg-muted">
          {filename}
        </span>
      </figcaption>
      <pre
        tabIndex={0}
        role="region"
        aria-label={filename}
        aria-describedby={summaryId}
        className="code-scroll max-w-full overflow-x-auto p-4 [-webkit-overflow-scrolling:touch]"
      >
        <code className="font-mono text-[length:var(--step--1)] leading-relaxed">
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
