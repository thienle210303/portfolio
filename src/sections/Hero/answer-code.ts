import type { Answer, Citation } from "@/lib/answers";

/**
 * Renders an answer set as a TypeScript object literal, for the code view of
 * "Ask this site".
 *
 * This is a *presentation* of `answer()`'s output and nothing more. It adds no
 * field that the prose view does not already show, and every string it emits is
 * the exact string the prose view renders — the answer text, its source, the
 * section label and the section anchor (when it has one), plus the visitor's
 * own question. The one thing it will not carry is `score`, because the prose
 * view does not show it either and a number nobody can check is exactly the
 * kind of claim this panel exists to avoid.
 *
 * Two properties hold for arbitrary input, which is what makes it safe to point
 * at free text a visitor typed:
 *
 *  - **It always emits parseable TypeScript.** Every string is double-quoted
 *    with backslashes, quotes, control characters and the two exotic line
 *    terminators escaped, so no answer — however punctuated — can close a
 *    literal early or break a line in half.
 *  - **It never alters a string.** Long values are split across lines with `+`
 *    concatenation, and the split is a pure partition: joining the chunks of any
 *    value reproduces that value character for character. The chunk boundaries
 *    are chosen on whitespace already in the text, so nothing is inserted,
 *    trimmed or re-spaced. (The same round-trip discipline `highlight()`
 *    documents for its tokens.)
 *
 * Wrapping happens on the raw text and escaping happens per chunk, in that
 * order. The reverse would let a line break land inside a `\uXXXX` sequence.
 */

/**
 * One filename per turn in the thread, distinct from the hero artifact's
 * filenames and from every other turn's — CodeBlock derives its hidden
 * summary's id from its filename and assumes that id is unique among
 * mounted blocks, and a multi-turn thread can genuinely have more than one
 * turn's Code tab open at once (each turn owns its own `Tabs` state; see
 * `AskThisSite.tsx`). `turn` is the 1-based position of the question in the
 * visible thread.
 */
export function answerFilename(turn: number): string {
  return `answer-${turn}.ts`;
}

/**
 * Characters of string content per line before wrapping.
 *
 * Sized so the longest line this produces — six spaces of indent, a `source: `
 * key, two quotes and a comma — lands around 73 columns, which reads without
 * horizontal scrolling at the width this panel gets on a laptop. CodeBlock
 * scrolls sideways when a value has no break point in it (a URL, a long
 * hyphenated title), so overflow degrades rather than clips.
 */
const WRAP = 56;

const WHITESPACE = /\s/;

const ESCAPES = new Map<string, string>([
  ["\\", "\\\\"],
  ['"', '\\"'],
  ["\n", "\\n"],
  ["\r", "\\r"],
  ["\t", "\\t"],
  ["\b", "\\b"],
  ["\f", "\\f"],
  ["\v", "\\v"],
  // Legal inside a modern JS string literal but invisible on screen, so they
  // are spelled out rather than passed through.
  ["\u2028", "\\u2028"],
  ["\u2029", "\\u2029"],
]);

/** Wraps `value` in double quotes, escaping everything that would break out. */
function quote(value: string): string {
  let out = "";
  for (const char of value) {
    const escaped = ESCAPES.get(char);
    if (escaped !== undefined) {
      out += escaped;
      continue;
    }
    const code = char.codePointAt(0) ?? 0;
    out += code < 0x20 || code === 0x7f ? `\\u${code.toString(16).padStart(4, "0")}` : char;
  }
  return `"${out}"`;
}

/**
 * Partitions `text` into chunks of at most `width` characters, breaking on
 * whitespace already present in it.
 *
 * `chunks.join("") === text` for every input. Whitespace at a break point stays
 * attached to the chunk before it, so the rendered `"… ran " + "for weeks"`
 * still reads as one sentence and still *is* one sentence when concatenated.
 * A word longer than `width` is cut where it must be — never through a
 * surrogate pair, which would emit a lone half of an astral character.
 */
function wrap(text: string, width: number): string[] {
  if (text.length <= width) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (text.length - start > width) {
    let cut = -1;
    // Latest point in range where whitespace ends and a new word begins.
    for (let i = start + width; i > start + 1; i -= 1) {
      if (WHITESPACE.test(text.charAt(i - 1)) && !WHITESPACE.test(text.charAt(i))) {
        cut = i;
        break;
      }
    }

    if (cut < 0) {
      cut = start + width;
      const unit = text.charCodeAt(cut - 1);
      // High surrogate at the boundary: step back so the pair stays together.
      if (unit >= 0xd800 && unit <= 0xdbff) cut -= 1;
    }

    chunks.push(text.slice(start, cut));
    start = cut;
  }

  chunks.push(text.slice(start));
  return chunks;
}

/** `key: "value",` on one line, or a `+`-joined run of lines when it is long. */
function field(indent: number, key: string, value: string): string[] {
  const pad = " ".repeat(indent);
  const chunks = wrap(value, WRAP);

  const first = chunks[0];
  if (chunks.length === 1 && first !== undefined) return [`${pad}${key}: ${quote(first)},`];

  const continuation = " ".repeat(indent + 2);
  return [
    `${pad}${key}:`,
    ...chunks.map(
      (chunk, index) =>
        `${continuation}${quote(chunk)}${index === chunks.length - 1 ? "," : " +"}`,
    ),
  ];
}

/**
 * The answer, as the object literal it already is underneath the prose.
 *
 * The leading comment is the same promise the panel makes in prose above the
 * field, not a new claim — and it earns its place in the artifact, because
 * every quoted string below it is a real sentence from the page rather than
 * sample data. (globals.css tints string literals with the accent for exactly
 * that reason.)
 */
export function answerLiteral(question: string, results: readonly Answer[]): string {
  const lines: string[] = [
    "// Quoted from this page. No model, no generation step.",
    "const answer = {",
    ...field(2, "question", question),
  ];

  if (results.length === 0) {
    lines.push("  results: [],");
  } else {
    lines.push("  results: [");
    for (const result of results) {
      lines.push("    {");
      lines.push(...field(6, "text", result.text));
      lines.push(...field(6, "source", result.source));
      if (result.sectionId !== undefined && result.sectionLabel !== undefined) {
        lines.push(...field(6, "section", result.sectionLabel));
        lines.push(...field(6, "href", `#${result.sectionId}`));
      }
      lines.push("    },");
    }
    lines.push("  ],");
  }

  lines.push("};");
  return lines.join("\n");
}

/**
 * The CodeBlock's visually hidden description (`aria-describedby`).
 *
 * Describes the *shape* of the literal, never its contents: the code itself is
 * already in the accessibility tree as text, and a description that repeated
 * the answers would hand a screen-reader user the same sentences twice — the
 * thing the single-panel toggle is there to prevent.
 */
export function describeAnswerLiteral(results: readonly Answer[]): string {
  const count = results.length;
  if (count === 0) {
    return "A TypeScript object literal named answer, holding the question that was asked and an empty list of results.";
  }
  const noun = count === 1 ? "one result object" : `${count} result objects`;
  return `A TypeScript object literal named answer, holding the question that was asked and ${noun}, each carrying the answer text, the source it came from and, where the page renders what the passage is about, the section that does. The same answers as the prose view, written as code.`;
}

/**
 * Live mode's version of `answerLiteral` above — same escaping and wrapping
 * discipline, same refusal to alter a string, different shape underneath:
 * a live answer is one composed `text` plus the `citations` it was grounded
 * in, rather than a list of quoted results. `grounded` is a plain boolean
 * literal, never a quoted string, so it reads unambiguously as the same
 * field `/api/ask` returned rather than as prose.
 */
export function liveAnswerLiteral(
  question: string,
  grounded: boolean,
  text: string,
  citations: readonly Citation[],
): string {
  const lines: string[] = [
    "// Composed by a live model, grounded only in the cited passages below.",
    "const answer = {",
    ...field(2, "question", question),
    `  grounded: ${grounded},`,
    ...field(2, "text", text),
  ];

  if (citations.length === 0) {
    lines.push("  citations: [],");
  } else {
    lines.push("  citations: [");
    for (const citation of citations) {
      lines.push("    {");
      lines.push(...field(6, "text", citation.text));
      lines.push(...field(6, "source", citation.source));
      if (citation.sectionId !== undefined && citation.sectionLabel !== undefined) {
        lines.push(...field(6, "section", citation.sectionLabel));
        lines.push(...field(6, "href", `#${citation.sectionId}`));
      }
      lines.push("    },");
    }
    lines.push("  ],");
  }

  lines.push("};");
  return lines.join("\n");
}

/** The live-mode counterpart to `describeAnswerLiteral`. */
export function describeLiveAnswerLiteral(grounded: boolean, citations: readonly Citation[]): string {
  if (!grounded) {
    return "A TypeScript object literal named answer, holding the question that was asked, grounded set to false, the model's decline, and an empty list of citations.";
  }
  const count = citations.length;
  const noun = count === 1 ? "one citation object" : `${count} citation objects`;
  return `A TypeScript object literal named answer, holding the question that was asked, grounded set to true, the model's composed text, and ${noun} it was grounded in, each carrying the passage text, its source and, where the page renders what the passage is about, the section that does.`;
}
