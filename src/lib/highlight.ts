import type { CodeTokenKind } from "@/types/portfolio";

/**
 * A single lexical span from `highlight()`. Concatenating every token's
 * `value`, in order, always reproduces the original input exactly — see the
 * round-trip property documented on `highlight()` below.
 */
export interface Token {
  readonly kind: CodeTokenKind;
  readonly value: string;
}

/**
 * The small TypeScript subset this tokenizer recognises as keywords. Any
 * other identifier — including reserved words not on this list — falls
 * through to `identifier` (or `property`, see below).
 */
const KEYWORDS = new Set([
  "const",
  "let",
  "var",
  "return",
  "true",
  "false",
  "null",
  "undefined",
  "function",
  "if",
  "else",
  "new",
]);

/** Single-character punctuation/operators. Each is emitted as its own token. */
const PUNCTUATION_CHARS = new Set([
  "{",
  "}",
  "(",
  ")",
  "[",
  "]",
  ".",
  ",",
  ";",
  ":",
  "?",
  "<",
  ">",
  "=",
  "+",
  "-",
  "*",
  "/",
  "%",
  "!",
  "&",
  "|",
  "^",
  "~",
  "@",
]);

const WHITESPACE = /\s/;
const DIGIT = /[0-9]/;
// Unicode-aware identifier grammar (close enough to JS's ID_Start/ID_Continue
// for a "small subset" highlighter) so identifiers in non-ASCII scripts are
// still classified as identifiers rather than falling through per-character
// to the plain-text fallback.
const IDENTIFIER_START = /[\p{L}_$]/u;
const IDENTIFIER_CONTINUE = /[\p{L}\p{N}_$]/u;
// Deliberately permissive: covers decimal, hex/octal/binary prefixes,
// exponents, numeric separators and the bigint suffix without needing a
// full numeric grammar. Never mis-parses in a way that breaks the
// round-trip guarantee — at worst it groups a malformed "number" too
// generously, which is still just text.
const NUMBER_CONTINUE = /[0-9a-zA-Z_.]/;

/**
 * Tokenizes `code` as the small TypeScript subset used by the hero code
 * artifact (see SPEC §7). Total and dependency-free: it never throws,
 * including on the empty string, unterminated strings/comments, and
 * arbitrary unicode.
 *
 * Round-trip property (relied on by an integration test):
 *
 *   highlight(code).map(t => t.value).join("") === code
 *
 * for every possible `code` input. Every branch below consumes at least one
 * UTF-16 code unit per iteration and pushes back exactly the slice it
 * consumed, so this holds unconditionally — nothing is dropped, rewritten,
 * or invented.
 *
 * CodeTokenKind has no dedicated "number" variant, so numeric literals are
 * classified as `identifier` (both are atomic, non-string, non-keyword
 * value tokens with identical styling per the SPEC §7 table).
 *
 * Property-key detection ("identifier or quoted string immediately
 * followed by optional whitespace then `:`") is a lexical heuristic, not a
 * parser: it will also match a colon that is actually a ternary or a type
 * annotation. That only affects which of two same-weight muted/bold tones a
 * token renders in — never correctness of the output text — and the actual
 * code samples in content are plain object literals where it is unambiguous.
 */
export function highlight(code: string): Token[] {
  const tokens: Token[] = [];
  const length = code.length;
  let pos = 0;

  const push = (kind: CodeTokenKind, value: string): void => {
    if (value.length > 0) tokens.push({ kind, value });
  };

  while (pos < length) {
    const ch = code[pos];

    // Whitespace — always plain, per SPEC §7.
    if (ch !== undefined && WHITESPACE.test(ch)) {
      const start = pos;
      pos += 1;
      while (pos < length && WHITESPACE.test(code[pos] as string)) pos += 1;
      push("plain", code.slice(start, pos));
      continue;
    }

    // Line comment.
    if (ch === "/" && code[pos + 1] === "/") {
      const start = pos;
      pos += 2;
      while (pos < length && code[pos] !== "\n") pos += 1;
      push("comment", code.slice(start, pos));
      continue;
    }

    // Block comment. Unterminated input just runs to the end — never throws.
    if (ch === "/" && code[pos + 1] === "*") {
      const start = pos;
      pos += 2;
      while (pos < length && !(code[pos] === "*" && code[pos + 1] === "/")) pos += 1;
      if (pos < length) pos += 2;
      push("comment", code.slice(start, pos));
      continue;
    }

    // Double- or single-quoted string, honouring backslash escapes.
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const start = pos;
      pos += 1;
      while (pos < length && code[pos] !== quote) {
        pos += code[pos] === "\\" && pos + 1 < length ? 2 : 1;
      }
      if (pos < length) pos += 1;
      const value = code.slice(start, pos);
      push(isFollowedByColon(code, pos) ? "property" : "string", value);
      continue;
    }

    // Template literal. No dedicated token kind, so it renders as a string;
    // `${...}` interpolation is not tokenized separately (out of scope for
    // this "small subset" tokenizer, and unused by the actual content).
    if (ch === "`") {
      const start = pos;
      pos += 1;
      while (pos < length && code[pos] !== "`") {
        pos += code[pos] === "\\" && pos + 1 < length ? 2 : 1;
      }
      if (pos < length) pos += 1;
      push("string", code.slice(start, pos));
      continue;
    }

    // Number (see NUMBER_CONTINUE comment above for scope/limits).
    if (ch !== undefined && (DIGIT.test(ch) || (ch === "." && DIGIT.test(code[pos + 1] ?? "")))) {
      const start = pos;
      pos += 1;
      while (pos < length && NUMBER_CONTINUE.test(code[pos] as string)) pos += 1;
      push("identifier", code.slice(start, pos));
      continue;
    }

    // Identifier / keyword / property key.
    if (ch !== undefined && IDENTIFIER_START.test(ch)) {
      const start = pos;
      pos += 1;
      while (pos < length && IDENTIFIER_CONTINUE.test(code[pos] as string)) pos += 1;
      const value = code.slice(start, pos);
      if (isFollowedByColon(code, pos)) {
        push("property", value);
      } else if (KEYWORDS.has(value)) {
        push("keyword", value);
      } else {
        push("identifier", value);
      }
      continue;
    }

    // Punctuation.
    if (ch !== undefined && PUNCTUATION_CHARS.has(ch)) {
      push("punctuation", ch);
      pos += 1;
      continue;
    }

    // Fallback: any other character (stray symbols, unrecognised unicode).
    // Keeps surrogate pairs intact so astral characters aren't split across
    // two tokens; always advances by at least one unit either way, so the
    // scan is guaranteed to terminate.
    const unit = code.charCodeAt(pos);
    const isHighSurrogate = unit >= 0xd800 && unit <= 0xdbff;
    const nextUnit = code.charCodeAt(pos + 1);
    const isLowSurrogate = nextUnit >= 0xdc00 && nextUnit <= 0xdfff;
    const size = isHighSurrogate && isLowSurrogate ? 2 : 1;
    push("plain", code.slice(pos, pos + size));
    pos += size;
  }

  return tokens;
}

/** True when, skipping whitespace, the next character at/after `from` is `:`. */
function isFollowedByColon(code: string, from: number): boolean {
  let i = from;
  while (i < code.length && WHITESPACE.test(code[i] as string)) i += 1;
  return code[i] === ":";
}
