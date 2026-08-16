import { describe, expect, it } from "vitest";
import { highlight } from "@/lib/highlight";
import { codeTabs } from "@/content/portfolio";
import type { CodeTokenKind } from "@/types/portfolio";

/**
 * The load-bearing property (SPEC section 7): concatenating every token's
 * `value`, in order, always reproduces the input exactly. Everything else
 * the tokenizer does (which `kind` it assigns) is presentation on top of
 * this guarantee, so this file tests the round-trip property first and
 * hardest.
 *
 * A scratch experiment run for this suite (not part of the delivered test
 * files) proves the assertion actually discriminates: a realistic naive
 * tokenizer bug -- scanning a `//` comment with `code.indexOf("\n", pos)`
 * and forgetting that an *unterminated* comment makes `indexOf` return -1 --
 * silently drops the final character of `"// unterminated comment with no
 * trailing newline"` (48 chars in, 47 out, last char "e" lost). `rebuilt ===
 * input` catches that immediately (`false`), which is exactly why every case
 * below is written as this same equality, including inputs the real
 * tokenizer has no dedicated branch for.
 */
function reconstruct(code: string): string {
  return highlight(code)
    .map((token) => token.value)
    .join("");
}

// Every non-ASCII / control / zero-width code point used below is built from
// its numeric code point via String.fromCharCode/fromCodePoint (never pasted
// as a literal character) so this source file is plain ASCII throughout --
// unambiguous under any editor, terminal, or diff, and with no risk of a
// stray literal control character landing in the file.
const NUL = String.fromCharCode(0x0000); // U+0000 NULL
const ZWJ = String.fromCharCode(0x200d); // U+200D ZERO WIDTH JOINER
const ZWNJ = String.fromCharCode(0x200c); // U+200C ZERO WIDTH NON-JOINER
const BOM = String.fromCharCode(0xfeff); // U+FEFF ZERO WIDTH NO-BREAK SPACE / BOM
const HIGH_SURROGATE = String.fromCharCode(0xd800); // valid only when paired with a low surrogate
const LOW_SURROGATE = String.fromCharCode(0xdc00);
const E_ACUTE = String.fromCharCode(0x00e9); // "e" with acute accent
const GREEK_PI = String.fromCharCode(0x03c0);
const BACKSLASH = String.fromCharCode(0x005c);
const GRINNING_FACE = String.fromCodePoint(0x1f600); // astral (surrogate-pair) code point
const ROCKET = String.fromCodePoint(0x1f680);
const PARTY_POPPER = String.fromCodePoint(0x1f389);
const MAN = String.fromCodePoint(0x1f468);
const WOMAN = String.fromCodePoint(0x1f469);
const GIRL = String.fromCodePoint(0x1f467);
const BOY = String.fromCodePoint(0x1f466);

describe("highlight - round-trip property", () => {
  describe("real content (src/content/portfolio.ts codeTabs)", () => {
    for (const tab of codeTabs) {
      it(`reproduces ${tab.filename} exactly`, () => {
        expect(reconstruct(tab.code)).toBe(tab.code);
      });
    }
  });

  const adversarialCases: Record<string, string> = {
    "empty string": "",
    "unterminated double-quoted string": 'const s = "never closed',
    "unterminated single-quoted string": "const s = 'never closed",
    "unterminated template literal": "const s = `never closed",
    "unterminated block comment": "/* never closed either",
    "unterminated block comment ending in a lone trailing asterisk": "/* trailing star *",
    "lone double quote": '"',
    "lone single quote": "'",
    "lone backtick": "`",
    "lone slash": "/",
    "lone asterisk": "*",
    "astral emoji inside a string": `const face = "${GRINNING_FACE}${PARTY_POPPER}";`,
    "astral characters outside any string": `${GRINNING_FACE} + ${ROCKET} === ${PARTY_POPPER}`,
    "ZWJ-joined family emoji sequence": `${MAN}${ZWJ}${WOMAN}${ZWJ}${GIRL}${ZWJ}${BOY}`,
    "CRLF line endings throughout": "const a = 1;\r\nconst b = 2;\r\n// done\r\n",
    "lone unpaired high surrogate": `a${HIGH_SURROGATE}b`,
    "lone unpaired low surrogate": `a${LOW_SURROGATE}b`,
    "unpaired high surrogate at the very end of input": `abc${HIGH_SURROGATE}`,
    "unpaired low surrogate at the very start of input": `${LOW_SURROGATE}abc`,
    "string with a trailing backslash right before EOF (unterminated)": `"abc${BACKSLASH}`,
    "string with an escaped quote right before EOF (still unterminated)": `"abc${BACKSLASH}"`,
    "string ending in a doubled backslash immediately before the real closing quote": `"a${BACKSLASH}${BACKSLASH}"`,
    "adjacent nested-looking block comment (closes at the first */)": "/* outer /* inner */ still(code) */",
    "single slash that looks like it could start a comment": "a / b // real comment",
    "lone trailing dot (not a number)": "a.",
    "number immediately followed by a dotted method call": "1.5.toString()",
    "mixed tabs/newlines and non-ASCII identifiers": `\tconst caf${E_ACUTE} = 'ok';\n let ${GREEK_PI} = 3;`,
    "embedded NUL byte inside a string": `const a = '${NUL}end';`,
    "zero-width joiner / non-joiner / BOM soup": `${ZWJ}${ZWNJ}${BOM}`,
    "whitespace only": "   \n\t  \r\n",
    "deeply nested punctuation": "((([{<>}])))" + ";".repeat(50),
    "long run of identifier chars then an unterminated string": "x".repeat(500) + '"' + "y".repeat(500),
    "template literal with ${} left untokenized specially": "`hello ${name}!`",
    "keyword-shaped property key": "return: 1",
    "every declared punctuation character back to back": "{}()[].,;:?<>=+-*/%!&|^~@",
  };

  for (const [label, code] of Object.entries(adversarialCases)) {
    it(`round-trips: ${label}`, () => {
      expect(reconstruct(code)).toBe(code);
    });
  }

  it("never throws across the full real-content + adversarial corpus", () => {
    const allInputs = [...codeTabs.map((tab) => tab.code), ...Object.values(adversarialCases)];
    for (const code of allInputs) {
      expect(() => highlight(code)).not.toThrow();
    }
  });

  it("round-trips a large sweep of single code units without throwing", () => {
    // A cheap fuzz pass: BMP code units from 0 to 0x2FFF in steps of 37
    // (covers control chars, ASCII, Latin-1 supplement, and a wide swath of
    // multilingual planes), each embedded inside real surrounding syntax,
    // must always round-trip and never throw.
    for (let code = 0; code < 0x3000; code += 37) {
      const ch = String.fromCharCode(code);
      const sample = `const x = "${ch}"; // ${ch}`;
      expect(() => highlight(sample)).not.toThrow();
      expect(reconstruct(sample)).toBe(sample);
    }
  });
});

describe("highlight - token kinds", () => {
  function kindsFor(code: string): CodeTokenKind[] {
    return highlight(code).map((token) => token.kind);
  }

  it("classifies every SPEC-mandated keyword as 'keyword'", () => {
    for (const word of ["const", "let", "return", "true", "false", "null"]) {
      expect(highlight(word)).toEqual([{ kind: "keyword", value: word }]);
    }
  });

  it("does not classify an arbitrary identifier as a keyword", () => {
    expect(highlight("returning")).toEqual([{ kind: "identifier", value: "returning" }]);
  });

  it("classifies a double-quoted string as 'string' when it is not a property key", () => {
    expect(highlight('"hello world"')).toEqual([{ kind: "string", value: '"hello world"' }]);
  });

  it("classifies a single-quoted string as 'string' too", () => {
    expect(highlight("'hello world'")).toEqual([{ kind: "string", value: "'hello world'" }]);
  });

  it("classifies a '//' line comment as 'comment'", () => {
    expect(highlight("// a note")).toEqual([{ kind: "comment", value: "// a note" }]);
  });

  it("classifies a '/* */' block comment as 'comment'", () => {
    expect(highlight("/* a note */")).toEqual([{ kind: "comment", value: "/* a note */" }]);
  });

  it("classifies an unquoted identifier followed by ':' as a 'property' key", () => {
    const tokens = highlight("role: 1");
    expect(tokens[0]).toEqual({ kind: "property", value: "role" });
  });

  it("classifies a quoted key followed by ':' as 'property', not 'string'", () => {
    const tokens = highlight('"role-name": 1');
    expect(tokens[0]).toEqual({ kind: "property", value: '"role-name"' });
  });

  it("prioritises the property check over the keyword check for a keyword-shaped key", () => {
    // "return" is in KEYWORDS, but "return:" must still read as a property
    // key -- this only holds if the source checks isFollowedByColon() before
    // it checks KEYWORDS.has(); swapping that order is a real, catchable bug.
    expect(highlight("return: 1")[0]).toEqual({ kind: "property", value: "return" });
  });

  it("does not let a colon reached later in the input leak 'property' onto an unrelated token", () => {
    const tokens = highlight("role : 1");
    expect(tokens[0]).toEqual({ kind: "property", value: "role" });
    const numberToken = tokens.find((t) => t.value === "1");
    expect(numberToken?.kind).toBe("identifier");
  });

  it("classifies each declared punctuation character as its own 'punctuation' token", () => {
    expect(kindsFor("{}();")).toEqual([
      "punctuation",
      "punctuation",
      "punctuation",
      "punctuation",
      "punctuation",
    ]);
  });

  it("classifies a plain, non-keyword identifier as 'identifier'", () => {
    expect(highlight("myVariable")).toEqual([{ kind: "identifier", value: "myVariable" }]);
  });

  it("classifies a numeric literal as 'identifier' (CodeTokenKind has no dedicated number kind)", () => {
    expect(highlight("42")).toEqual([{ kind: "identifier", value: "42" }]);
  });

  it("classifies whitespace as 'plain'", () => {
    expect(highlight("  \n\t")).toEqual([{ kind: "plain", value: "  \n\t" }]);
  });

  it("classifies an unrecognised symbol as 'plain', not throwing or silently dropping it", () => {
    expect(highlight(GRINNING_FACE)).toEqual([{ kind: "plain", value: GRINNING_FACE }]);
  });
});
