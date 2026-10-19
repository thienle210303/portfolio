/**
 * The hero's terminal card, as data. Every value is a field of
 * `src/content/portfolio.ts`, read by reference — nothing here is authored.
 * `tests/lib/terminal.test.ts` checks each value against its source field.
 */
import { aiTools, careerEntries, companions, origin, profile } from "@/content/portfolio";
import { resolved, type CareerEntry } from "@/types/portfolio";
import { currentEntry } from "./content";

// Kept for the old Hero and its e2e spec until they are deleted.
export { currentEntry } from "./content";

export interface TerminalLine {
  readonly key: string;
  readonly value: string | readonly string[];
}

export interface TerminalTab {
  readonly id: "whoami" | "now" | "exploring";
  readonly command: string;
  readonly lines: readonly TerminalLine[];
}

// Optional fields drop their line rather than print an empty value.
function lines(pairs: ReadonlyArray<readonly [string, string | readonly string[] | undefined]>): TerminalLine[] {
  return pairs.flatMap(([key, value]) => (value === undefined ? [] : [{ key, value }]));
}

export function buildTerminal(entries: readonly CareerEntry[] = careerEntries): readonly TerminalTab[] {
  const current = currentEntry(entries);
  return [
    {
      id: "whoami",
      command: "whoami",
      lines: lines([
        ["role", profile.title],
        ["employer", current.organization],
        ["based", resolved(profile.location)],
        ["from", origin.from],
        ["focus", profile.focus],
        ["cats", companions.map((cat) => cat.name)],
        ["motto", profile.motto],
      ]),
    },
    {
      id: "now",
      command: "now",
      lines: lines([
        ["role", current.role],
        ["at", current.organization],
        ["shipping", current.headline],
      ]),
    },
    {
      id: "exploring",
      command: "ls exploring/",
      lines: lines([["tools", aiTools.map((tool) => tool.name)]]),
    },
  ];
}
