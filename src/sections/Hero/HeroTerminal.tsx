/**
 * The hero's terminal card. Every value comes from `buildTerminal()`, which
 * reads `src/content/portfolio.ts`; this file only lays it out. No "use
 * client": `Tabs` and `TypeOnce` carry their own boundaries.
 *
 * `tone-contrast` repoints the semantic aliases, so the card is dark in both
 * themes without a literal colour. Only `whoami` types, once, on load — see
 * `TypeOnce` for why a re-mount does not type it again. The text is in the DOM
 * from the first paint; the animation only clips it.
 */
import type { CSSProperties } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { buildTerminal, type TerminalTab } from "@/lib/terminal";
import TypeOnce from "./TypeOnce";

function show(value: string | readonly string[]): string {
  return typeof value === "string" ? value : `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
}

function Screen({ tab, typed }: { readonly tab: TerminalTab; readonly typed: boolean }) {
  const rows = [
    <>
      <span className="text-fg-muted">$ </span>
      {tab.command}
    </>,
    ...tab.lines.map((line) => (
      <>
        <span className="text-fg-muted">{line.key}:</span> {show(line.value)}
      </>
    )),
  ];
  return (
    <pre className="whitespace-pre-wrap font-mono text-[length:var(--step--1)] leading-relaxed [overflow-wrap:anywhere]">
      {rows.map((row, index) => (
        <span
          key={index}
          className="block"
          data-type-line={typed ? "" : undefined}
          style={typed ? ({ "--line": index } as CSSProperties) : undefined}
        >
          {row}
        </span>
      ))}
    </pre>
  );
}

export default function HeroTerminal() {
  const tabs = buildTerminal().map((tab, index) => ({
    id: tab.id,
    label: tab.id,
    panel:
      index === 0 ? (
        <TypeOnce>
          <Screen tab={tab} typed />
        </TypeOnce>
      ) : (
        <Screen tab={tab} typed={false} />
      ),
  }));

  return (
    <div data-hero-step="code" className="tone-contrast min-w-0 border border-rule bg-ground p-4 text-fg">
      <div className="mb-3 flex items-center gap-3">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="size-2.5 rounded-full border border-rule" />
          <span className="size-2.5 rounded-full border border-rule" />
          <span className="size-2.5 rounded-full border border-rule" />
        </span>
        <span aria-hidden="true" className="font-mono text-[length:var(--step--2)] text-fg-muted">
          thien@portfolio
        </span>
      </div>
      <Tabs label="Terminal" tabs={tabs} idPrefix="hero-terminal" />
    </div>
  );
}
