/**
 * The hero's terminal card, as data. Every value is a field of
 * `src/content/portfolio.ts`, read by reference — nothing here is authored.
 * `tests/lib/terminal.test.ts` checks each value against its source field.
 */
import { aiTools, careerEntries, companions, origin, profile } from "@/content/portfolio";
import { resolved, type CareerEntry } from "@/types/portfolio";

export interface TerminalLine {
  readonly key: string;
  readonly value: string | readonly string[];
}

export interface TerminalTab {
  readonly id: "whoami" | "now" | "exploring";
  readonly command: string;
  readonly lines: readonly TerminalLine[];
}

/** The entry whose `dateRange` ends in "Present"; with several, the latest
 *  `sortKey`. Throws when there is none, so a build cannot ship a terminal
 *  that names no current role. */
export function currentEntry(entries: readonly CareerEntry[] = careerEntries): CareerEntry {
  const open = entries.filter((entry) => entry.dateRange.endsWith("Present"));
  if (open.length === 0) throw new Error("terminal: no career entry ends in Present");
  return open.reduce((latest, entry) => (entry.sortKey > latest.sortKey ? entry : latest));
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
