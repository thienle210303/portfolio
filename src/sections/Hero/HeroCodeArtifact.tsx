/**
 * The hero's code artifact: the shared Tabs primitive over the three
 * codeTabs, each panel a CodeBlock. No typing/character animation of any
 * kind — CodeBlock renders every token directly, fully readable on first
 * paint (SECTIONS.md §1). Tabs only ever mounts the currently active tab's
 * panel, so at most one CodeBlock is ever in the DOM at once, matching that
 * component's own documented filename-uniqueness assumption.
 *
 * The wrapper below uses the raw --color-hairline/--color-surface tokens
 * (the `border-hairline`/`bg-surface` utilities), not the semantic
 * `--rule-color`/`.on-light` aliases — matching CodeBlock's own documented
 * choice to always render as a fixed dark panel regardless of section tone,
 * since the whole artifact (tabs + code) reads as one dark "window" and
 * Hero itself is always tone="ink" besides.
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
    <div className="min-w-0 border border-hairline bg-surface p-6">
      <Tabs label="Code artifact tabs" tabs={tabs} idPrefix="hero-code" />
    </div>
  );
}
