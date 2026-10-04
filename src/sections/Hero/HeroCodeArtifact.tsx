/**
 * The hero's code artifact: the shared Tabs primitive over the three
 * codeTabs (each panel a CodeBlock) plus a fourth, "Ask Thien". No
 * typing/character animation of any kind — CodeBlock renders every token
 * directly, fully readable on first paint (SECTIONS.md §1). Tabs only ever
 * mounts the currently active tab's panel, so at most one CodeBlock (or the
 * mini chat) is ever in the DOM at once, matching CodeBlock's own documented
 * filename-uniqueness assumption and giving the fourth tab's lazy chunk its
 * mount-is-activation trigger (see `AskThienHeroTab.tsx`).
 *
 * The wrapper styles against the semantic aliases (`border-rule`/`bg-surface`),
 * so the whole artifact — tabs and code together — reads as one raised panel
 * that follows the active theme and the hero's tone. It deliberately shares
 * `--surface` with the CodeBlock inside it rather than stepping to a different
 * fill: two nested surfaces a half-step apart would read as a rendering fault
 * rather than as structure.
 *
 * Round 12 (WP-K) tightened this frame: the owner reported the artifact
 * "dominating" the hero column next to the identity copy. The wrapper's own
 * padding steps from `p-4` to `p-3`, and every CodeBlock here renders
 * `compact` (smaller type, smaller inner padding — see that component's own
 * doc comment). The three authored code tabs' `code`/`filename`/`summary`
 * content is untouched — only the rendering shrank.
 */
import { codeTabs } from "@/content/portfolio";
import { Tabs } from "@/components/ui/Tabs";
import { CodeBlock } from "@/components/ui/CodeBlock";
import AskThienHeroTab from "./AskThienHeroTab";

interface HeroCodeArtifactProps {
  /** Computed server-side in `Hero.tsx`; handed to the chat behind the
   *  fourth tab. */
  readonly liveModeConfigured: boolean;
}

export default function HeroCodeArtifact({ liveModeConfigured }: HeroCodeArtifactProps) {
  const tabs = [
    ...codeTabs.map((tab) => ({
      id: tab.id,
      label: tab.label,
      panel: (
        <>
          <CodeBlock code={tab.code} filename={tab.filename} summary={tab.summary} compact />
          <p className="mt-2 text-fg-subtle text-[length:var(--step--2)]">{tab.source}</p>
        </>
      ),
    })),
    {
      id: "ask",
      label: "Ask Thien",
      panel: <AskThienHeroTab liveModeConfigured={liveModeConfigured} />,
    },
  ];

  return (
    <div data-hero-step="code" className="min-w-0 border border-rule bg-surface p-3">
      <Tabs label="Code artifact tabs" tabs={tabs} idPrefix="hero-code" />
    </div>
  );
}
