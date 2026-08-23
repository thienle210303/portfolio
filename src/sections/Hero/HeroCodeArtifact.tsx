/**
 * The hero's code artifact: the shared Tabs primitive over the three
 * codeTabs, each panel a CodeBlock. No typing/character animation of any
 * kind — CodeBlock renders every token directly, fully readable on first
 * paint (SECTIONS.md §1). Tabs only ever mounts the currently active tab's
 * panel, so at most one CodeBlock is ever in the DOM at once, matching that
 * component's own documented filename-uniqueness assumption.
 *
 * The wrapper styles against the semantic aliases (`border-rule`/`bg-surface`),
 * so the whole artifact — tabs and code together — reads as one raised panel
 * that follows the active theme and the hero's tone. It deliberately shares
 * `--surface` with the CodeBlock inside it rather than stepping to a different
 * fill: two nested surfaces a half-step apart would read as a rendering fault
 * rather than as structure.
 */
import { codeTabs } from "@/content/portfolio";
import { Tabs } from "@/components/ui/Tabs";
import { CodeBlock } from "@/components/ui/CodeBlock";

export default function HeroCodeArtifact() {
  const tabs = codeTabs.map((tab) => ({
    id: tab.id,
    label: tab.label,
    panel: <CodeBlock code={tab.code} filename={tab.filename} summary={tab.summary} />,
  }));

  return (
    <div data-hero-step="code" className="min-w-0 border border-rule bg-surface p-4">
      <Tabs label="Code artifact tabs" tabs={tabs} idPrefix="hero-code" />
    </div>
  );
}
