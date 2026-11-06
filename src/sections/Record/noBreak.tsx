import type { ReactNode } from "react";

/**
 * A title with its hyphenated words kept whole (round 25): "Software Engineer
 * Co-op" broke as "Co-" / "op" on a pressed card and in the contents. The
 * text is as written (it is copied, found and read out unchanged); only a word
 * with a hyphen in it is wrapped, so a line never ends inside it.
 */
export function noBreak(text: string): ReactNode {
  if (!text.includes("-")) return text;
  return text.split(/(\S*-\S*)/).map((part, i) =>
    i % 2 ? (
      <span key={i} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    ),
  );
}
