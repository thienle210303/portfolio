import type { TreeBranch } from "@/lib/knowledge-tree";

/**
 * `TreeBranch.kind` is the career entry's own `type` — `work` | `learning` |
 * `milestone` — carried through `buildCareerTree()` verbatim. This is the
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

/**
 * The branches on the drawing that ran at the same time as `branch`, read off
 * `branch.concurrentWith` (which comes from the entries' own dates) and
 * limited to branches actually in `tree`.
 *
 * Limited because `concurrentWith` can name an entry that is not drawn — the
 * demoted degree names every role inside it, being a spine those roles happen
 * within rather than a sibling beside them — and a sibling that is not on the
 * page is nothing to be beside. Both presentations ask here, so the drawing's
 * side-by-side limbs and the list's note can never disagree about who overlapped
 * whom.
 */
export function drawnSiblings(
  branch: TreeBranch,
  tree: readonly TreeBranch[],
): readonly TreeBranch[] {
  const drawn = new Map(tree.map((candidate) => [candidate.id, candidate]));
  return branch.concurrentWith.flatMap((id) => {
    const sibling = drawn.get(id);
    return sibling ? [sibling] : [];
  });
}

/** "Role (Organisation) · Role (Organisation)" — the siblings, named so two
 *  entries that share a job title are still told apart. */
export function siblingsLabel(siblings: readonly TreeBranch[]): string {
  return siblings
    .map((sibling) =>
      sibling.organization ? `${sibling.label} (${sibling.organization})` : sibling.label,
    )
    .join(" · ");
}
