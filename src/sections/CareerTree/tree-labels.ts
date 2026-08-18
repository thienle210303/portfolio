/**
 * `TreeBranch.kind` is the career entry's own `type` — `work` | `learning` |
 * `milestone` — carried through `buildKnowledgeTree()` verbatim. This is the
 * one place it becomes a word a reader sees, shared by both presentations of
 * the tree so the two can never drift into calling the same entry different
 * things.
 *
 * Keyed loosely (`string`) rather than by the union, because the tree hands
 * `kind` down as a plain string; an unmapped value falls through to itself at
 * the point of use rather than rendering an empty label.
 */
export const KIND_LABEL: Record<string, string> = {
  work: "Role",
  learning: "Study",
  milestone: "Milestone",
};
