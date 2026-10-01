# Round 18 Plan B — About and Contact: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make About a sixty-second introduction that opens on a real fact, and make Contact produce a finished message instead of a blank textarea.

**Architecture:** Both sections are mostly copy and layout, and both depend on Plan A having landed the content layer. About loses three of its four layouts and gains real code in its artifact. Contact inverts its reward: choosing an intent hands the visitor a complete, sendable draft, with four no-form escapes beside it and the Ask chat as a fifth way to make contact.

**Tech Stack:** Next.js 16 App Router, TypeScript (strict), Tailwind v4 via `@theme`, vitest + jsdom + @testing-library/react, Playwright + axe-core, pnpm only.

**Spec:** [docs/superpowers/specs/2026-09-30-round-18-design.md](../specs/2026-09-30-round-18-design.md) — §4 and §7.

**Depends on:** Plan A, complete. `profile.about`, `profile.location`, `profile.availability` and the deleted invented layer all come from there.

## Global Constraints

- **pnpm only.** Never introduce an npm or yarn lockfile.
- **TypeScript is strict.**
- **Tailwind v4 via `@theme` in `src/app/globals.css`.** No `tailwind.config.js`.
- **Semantic aliases only:** `text-fg`, `text-fg-muted`, `text-fg-subtle`, `border-rule`, `bg-surface`, `bg-ground`, `text-accent`. Never a raw `--color-*`, never a hex.
- **Blue is the only hue**, reserved for annotation, links, measured values and **the single primary control per screen**. In Contact that control is "Send it as written" and nothing else.
- **The margin rail carries facts already true in the content layer.** It never restates the prose beside it.
- **No new runtime dependency.** Cal.com is a plain `<a href>`, never an embedded widget or script.
- **The Resend-to-`mailto:` fallback is intentional, not a bug.** Every path added here must work in both modes, and `emailDeliveryConfigured` stays the only thing that crosses from the server.
- **Secrets never cross to the client.** `process.env` is read in Server Components only; booleans cross, keys do not.
- **WCAG 2.2 AA.** Touch targets ≥44px. Every control is a real `<button>`, `<a href>`, or `<input>` with a `<label>`.

## Review Focus

1. **A visitor sends a draft they did not read.** The whole design hands them prewritten words over their own signature. If the textarea is collapsed by default and the draft is not plainly visible, they send something they never saw. → Task 4 asserts the draft text is in the accessible tree before any expansion, not behind a disclosure.
2. **`mailto:` with a long body.** The fallback path encodes the whole draft into a URL. Long drafts plus some clients hit length limits and silently truncate or fail to open. → Task 4 asserts the encoded `mailto:` href stays under 2,000 characters for every intent.
3. **Cal.com not configured.** The spec says the control is not rendered without a URL. A half-rendered button linking to `undefined` is worse than no button. → Task 6 asserts nothing renders when the env var is absent.
4. **The Ask chat moved sections and its anchor went with it.** `#ask` or an in-hero id may be linked from elsewhere, and the corpus answers questions about sections that no longer exist. → Task 7 asserts the Ask panel is reachable at a stable id inside Contact.
5. **Submitting with an empty reply-to.** Two fields is the whole ask; if `email` is optional or unvalidated, a message arrives with no way to answer it. → Task 4 asserts the form does not submit without a valid reply address, in both delivery modes.

---

## File Structure

**About (Tasks 1–2)**
- Modify `src/content/portfolio.ts` — `codeTabs` gets real code.
- Modify `src/sections/Hero/Hero.tsx` — one fold, two columns, `HeroAbout` merged in.
- Modify `src/sections/Hero/HeroIdentity.tsx` — the rewritten copy, the rail.
- Delete `src/sections/Hero/HeroAbout.tsx`, `src/sections/Hero/AskThienHeroTab.tsx`.

**Contact (Tasks 3–7)**
- Modify `src/types/portfolio.ts` — `ContactIntent.messageStarter` → `messageDraft`.
- Modify `src/content/portfolio.ts` — four complete drafts.
- Modify `src/sections/Contact/ContactForm.tsx` — draft panel, send-as-written, add-a-line.
- Create `src/sections/Contact/DirectLinks.tsx` — the four no-form escapes.
- Create `src/sections/Contact/BookACall.tsx` — Cal.com, conditionally.
- Move `src/sections/Hero/AskThisSite.tsx` → `src/sections/Contact/AskThisSite.tsx`.
- Modify `src/sections/Contact/Contact.tsx` — the new arrangement.
- Add `public/thien-le-resume.pdf` — the current résumé.

---

### Task 1: real code in the hero artifact

The owner asked to keep the code panel and make it real if possible. It currently ships three fabricated TypeScript object literals — `mindset: ["curious", "practical", "always learning"]` — presented as if they were code from the work. That is the single clearest instance of the problem this round exists to fix.

**Files:**
- Modify: `src/content/portfolio.ts` (`codeTabs`)
- Test: `tests/lib/content.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `codeTabs` with three real excerpts. Task 2's hero renders them unchanged.

- [ ] **Step 1: Write the failing test**

```ts
describe("the hero's code artifact", () => {
  it("shows code that exists somewhere real, not an object about his personality", () => {
    const code = codeTabs.map((tab) => tab.code).join("\n");
    // The fabricated literals claimed to describe him. Real code describes
    // what it does, which is the only thing code is evidence of.
    expect(code).not.toContain("mindset");
    expect(code).not.toContain("always learning");
    expect(code).not.toContain("Unsolved is not the same as unsolvable");
  });

  it("says where every excerpt came from", () => {
    // An excerpt with no provenance is indistinguishable from an invented
    // one, which is the whole problem being fixed.
    for (const tab of codeTabs) {
      expect(tab.source, tab.id).toBeTruthy();
    }
  });

  it("keeps every excerpt short enough to read in the hero", () => {
    // The panel is ~494px of inner width and the hero is budgeted to one
    // screen. A 40-line excerpt turns the fold into a scroll.
    for (const tab of codeTabs) {
      expect(tab.code.split("\n").length, tab.id).toBeLessThanOrEqual(14);
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/lib/content.test.ts -t "code artifact"`
Expected: FAIL — the code contains `mindset`.

- [ ] **Step 3: Add `source` to the type**

In `src/types/portfolio.ts`, inside `CodeTab`:

```ts
  /** Where this excerpt actually comes from — a file in a real repository.
   *  An excerpt with no provenance cannot be told apart from an invented one,
   *  which is exactly what round 18 removed from this artifact. */
  readonly source: string;
```

- [ ] **Step 4: Replace the three tabs with real excerpts**

```ts
export const codeTabs = [
  {
    id: "projector",
    label: "The globe",
    filename: "src/lib/globe.ts",
    source: "This site. The orthographic projector the Worlds section draws with.",
    summary:
      "A TypeScript function named project that converts a latitude and longitude into x and y screen coordinates using an orthographic projection, returning null for any point on the far side of the sphere so the renderer can skip it.",
    code: `export function project(point: GeoPoint, view: View): Screen | null {
  const phi = toRadians(point.lat);
  const lambda = toRadians(point.lon - view.centerLon);
  const cosC = Math.sin(view.phi0) * Math.sin(phi)
    + Math.cos(view.phi0) * Math.cos(phi) * Math.cos(lambda);
  // Far side of the sphere: not clipped, absent.
  if (cosC < 0) return null;
  return {
    x: view.cx + view.r * Math.cos(phi) * Math.sin(lambda),
    y: view.cy - view.r * (Math.cos(view.phi0) * Math.sin(phi)
      - Math.sin(view.phi0) * Math.cos(phi) * Math.cos(lambda)),
  };
}`,
  },
  {
    id: "search",
    label: "A chess bot",
    filename: "Chess/engine.py",
    source: "github.com/thienle210303/Chess — built for no reason at all.",
    summary:
      "A Python min-max search function that walks every legal move to a fixed depth, negating the score at each ply, and returns the best score found for the side to move.",
    code: `def minmax(board, depth, white_to_move):
    if depth == 0:
        return evaluate(board)
    best = -INF
    for move in board.legal_moves():
        board.push(move)
        # One search, negated each ply — the side to move always maximises.
        best = max(best, -minmax(board, depth - 1, not white_to_move))
        board.pop()
    return best`,
  },
  {
    id: "honesty",
    label: "The rule",
    filename: "tests/lib/worlds.test.ts",
    source: "This site. The test that fails if the globe ever invents a fact.",
    summary:
      "A TypeScript test asserting that every plaque rendered on the globe is a member of the set of strings the content layer actually authored, rather than similar to one or derived from one.",
    code: `it("renders every field plaque verbatim", () => {
  for (const world of resolved) {
    for (const plaque of world.plaques) {
      if (plaque.kind !== "field") continue;
      // A member of the set. Not similar to one. Not derived from one.
      expect(AUTHORED).toContain(plaque.text);
    }
  }
});`,
  },
] satisfies readonly CodeTab[];
```

Every excerpt must be **checked against its real file** before committing. If `project()`'s signature in `src/lib/globe.ts` differs, use the real one — an excerpt that does not match the file it names is a fabrication with a filename on it, which is worse than the objects being replaced.

- [ ] **Step 5: Render the provenance**

In `src/sections/Hero/HeroCodeArtifact.tsx`, show `tab.source` under the panel in `text-fg-subtle` at `--step--2`. The claim being made is "this is real code from a real place", and the place has to be visible for that claim to mean anything.

- [ ] **Step 6: Run the tests**

Run: `pnpm test`
Expected: PASS. `tests/lib/highlight.test.ts` and `e2e/sections.spec.ts` reference `codeTabs` — update expectations to the new content; do not revert the content to satisfy a stale assertion.

- [ ] **Step 7: Commit**

```bash
git add src/types/portfolio.ts src/content/portfolio.ts src/sections/Hero/HeroCodeArtifact.tsx tests/
git commit -m "Put real code in the hero, and say where it came from

The artifact shipped three fabricated TypeScript objects claiming to describe
him — mindset: [\"curious\", \"practical\", \"always learning\"] — presented as
code from the work. It was the clearest instance of the problem this round
exists to fix.

Three real excerpts replace them: the orthographic projector this site's globe
draws with, the min-max search from a chess engine he built for no reason, and
the test that fails if the globe ever invents a fact. Each one names its file,
because an excerpt with no provenance cannot be told apart from an invented
one."
```

---

### Task 2: one fold, two columns

Spec §4. Four layouts stood between a visitor and the first real fact: a full-height fold, a three-column grid, a margin rail, and a second full-width band below.

**Files:**
- Modify: `src/sections/Hero/Hero.tsx`, `HeroIdentity.tsx`
- Delete: `src/sections/Hero/HeroAbout.tsx`, `src/sections/Hero/AskThienHeroTab.tsx`
- Test: `tests/ui/Hero.test.tsx`

**Interfaces:**
- Consumes: `profile.about`, `.headline`, `.intro`, `.positioning`, `.location`, `.availability` (Plan A); `codeTabs` (Task 1).
- Produces: nothing other tasks consume.

- [ ] **Step 1: Write the failing test**

Create `tests/ui/Hero.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Hero from "@/sections/Hero/Hero";
import { profile } from "@/content/portfolio";

describe("About", () => {
  it("opens on where he came from", () => {
    render(<Hero />);
    expect(screen.getByText(/Kiên Giang/)).toBeInTheDocument();
  });

  it("carries the location and availability in the rail", () => {
    render(<Hero />);
    expect(screen.getByText(/Taylors, South Carolina/)).toBeInTheDocument();
    expect(screen.getByText(/Open to remote/)).toBeInTheDocument();
  });

  it("has exactly one h1 and no h2 of its own", () => {
    // Hero owns the page's only h1, and nothing here may be an h2 — every
    // other section's h2 comes from SectionHeading, so a stray one here
    // breaks the document-wide heading order check in e2e.
    render(<Hero />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
  });

  it("no longer renders the Ask panel", () => {
    // It moved to Contact in Task 7.
    render(<Hero />);
    expect(screen.queryByRole("tab", { name: /ask/i })).toBeNull();
  });

  it("keeps About to three paragraphs", () => {
    // Sixty seconds, not a biography. The owner asked for a "quick less
    // introduction".
    expect(profile.about).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/ui/Hero.test.tsx`
Expected: FAIL — the Ask tab is present, and `Kiên Giang` may not be (depending on Plan A's copy landing).

- [ ] **Step 3: Merge `HeroAbout` into the fold**

The band existed because the paragraphs were too long for the identity column. With About cut to three short paragraphs it no longer needs one. Move the paragraphs into `HeroIdentity` under the headline, delete `HeroAbout.tsx`, and remove its render from `Hero.tsx`.

Keep from `HeroAbout`: nothing. Its "By the numbers" and "Where it shows up" blocks are rail material, and the rail rule says a fact goes in exactly one place — the Journey's own rail already counts branches and leaves. Delete them rather than duplicating.

`buildKnowledgeTree()` in `src/lib/knowledge-tree.ts` existed **only** for `HeroAbout`'s "Where it shows up" list; its banner says so. With the band gone it has no consumer. Delete `buildKnowledgeTree`, `TreeRoot`, and the `resumeLenses` import if nothing else uses it — `grep -rn "buildKnowledgeTree\|TreeRoot" src/ tests/` first, and update `tests/lib/knowledge-tree.test.ts`.

- [ ] **Step 4: Rebuild the rail**

```ts
const RAIL: readonly RailNote[] = [
  ...(currentRole
    ? [{ term: "Now", detail: `${currentRole.role}, ${currentRole.organization}` }]
    : []),
  ...(resolved(profile.location) ? [{ term: "Based", detail: resolved(profile.location)! }] : []),
  ...(resolved(profile.availability)
    ? [{ term: "Open to", detail: resolved(profile.availability)! }]
    : []),
  { term: "Holds", detail: profile.philosophy },
  { term: "Reach me", detail: profile.email },
];
```

`resolved()` guards each one, so a field that goes back to `undefined` drops its row rather than printing a marker — the behaviour the round-17 comment described and the reason the row existed conditionally in the first place.

- [ ] **Step 5: Collapse to two columns**

In `Hero.tsx`, keep the `min-h-[calc(100svh-var(--header-h)-var(--section-y)*2)]` fold wrapper and the `min-[1360px]` two-column split with the measuring-bar hairline — both are measured and both still hold. Remove the `<HeroAbout />` sibling. Keep the `Scroll` affordance and its `data-cat-perch`.

The `1360px` and `5.25fr / 6.75fr` numbers stay: the longest line in the new artifact is still roughly 48 monospace characters, so the measurement that produced them is still the right one. Verify in the browser at 1360px before trusting this paragraph.

- [ ] **Step 6: Run the tests**

Run: `pnpm test`
Expected: PASS after Task 7 removes the Ask tab. If run before Task 7, the "no longer renders the Ask panel" case fails — that is expected ordering, not a bug; do Task 7 before closing this one, or mark the case `it.todo` and restore it in Task 7. **Do not delete it.**

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "One fold, two columns, opening on the crossing

Four layouts stood between a visitor and the first real fact: a full-height
fold, a three-column grid, a margin rail, and a second full-width band under
all of it. The band existed because the About paragraphs were too long for the
identity column; with About cut to three short paragraphs it is not needed.

The rail now carries where he is and what he is open to, both guarded by
resolved() so an unset field drops its row instead of printing a marker.

buildKnowledgeTree() goes with the band — its own banner said it survived
solely for that list, and the list is gone."
```

---

### Task 3: an intent produces a whole message

Spec §7. `messageStarter` is an opening line the visitor still has to finish. `messageDraft` is a message they can send.

**Files:**
- Modify: `src/types/portfolio.ts` (`ContactIntent`)
- Modify: `src/content/portfolio.ts` (`contactIntents`)
- Test: `tests/lib/content.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `ContactIntent.messageDraft: string`. Task 4's form renders it.

- [ ] **Step 1: Write the failing test**

```ts
describe("contact drafts", () => {
  it("gives every intent a message that can be sent unedited", () => {
    for (const intent of contactIntents) {
      // A draft, not an opening. The old messageStarter ended mid-sentence
      // on purpose and left the visitor holding a blank textarea.
      expect(intent.messageDraft, intent.id).toMatch(/\n\n/);
      expect(intent.messageDraft.trimEnd(), intent.id).not.toMatch(/[:,]$/);
      expect(intent.messageDraft.length, intent.id).toBeGreaterThan(120);
    }
  });

  it("never puts words in the sender's mouth about how they feel", () => {
    // A template may say what someone wants. It may not claim admiration
    // they have not expressed — that is the sender's to write, and a draft
    // that fakes it is the same dishonesty this round removed elsewhere.
    for (const intent of contactIntents) {
      expect(intent.messageDraft.toLowerCase(), intent.id).not.toContain("impressed");
      expect(intent.messageDraft.toLowerCase(), intent.id).not.toContain("love your");
    }
  });

  it("keeps every draft short enough for a mailto: URL", () => {
    // The Resend fallback encodes the whole body into a href. Long bodies
    // silently truncate in some clients.
    for (const intent of contactIntents) {
      const href = `mailto:${profile.email}?subject=${encodeURIComponent(
        intent.subject
      )}&body=${encodeURIComponent(intent.messageDraft)}`;
      expect(href.length, intent.id).toBeLessThan(2000);
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/lib/content.test.ts -t "contact drafts"`
Expected: FAIL — `messageDraft` is undefined.

- [ ] **Step 3: Rename the field and write the four drafts**

In `src/types/portfolio.ts`, rename `messageStarter` to `messageDraft` and document it:

```ts
  /** A complete message the visitor can send without editing a word. Round 18
   *  replaced `messageStarter` — an opening line that ended mid-sentence and
   *  left a blank textarea behind it, so choosing an intent promised less work
   *  and then asked for more. A draft may say what the sender wants; it may
   *  not claim feelings they have not expressed. */
  readonly messageDraft: string;
```

In `src/content/portfolio.ts`:

```ts
    // opportunity
    messageDraft:
      "Hi Thien,\n\nI'd like to talk to you about a role on my team. I'll send the details — what the work actually involves, the team, and where it's based — and if it looks interesting we can find twenty minutes.\n\nBest,",
```
```ts
    // crazy-idea
    messageDraft:
      "Hi Thien,\n\nI have an idea I'd like to think through with someone, and nobody has asked for it yet. I'll explain what it is and what I think the hard part is. Tell me if it's interesting or if it's nonsense.\n\nBest,",
```
```ts
    // hello
    messageDraft:
      "Hi Thien,\n\nNo agenda — I came across your site and wanted to say hello. I'll tell you a bit about what I do, and if there's a reason to keep talking we will find it.\n\nBest,",
```
```ts
    // secret
    messageDraft:
      "Hi Thien,\n\nI can't say much here. What I can say is that it's worth a reply, and that I'd rather explain it somewhere other than a contact form.\n\nBest,",
```

Each ends on `Best,` with no name: the sender's name is the form's own field, so the draft must not pretend to carry a signature it does not have.

- [ ] **Step 4: Update every consumer**

`grep -rn "messageStarter" src/ tests/ e2e/` and rename each. `ContactForm.tsx` is the main one.

- [ ] **Step 5: Run the tests**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Give each contact intent a message, not an opening

Choosing an intent used to earn a starter sentence that ended mid-sentence and
a blank textarea — the choice promised less work and then asked for more. Each
intent now carries a complete message the visitor can send unedited.

Tests assert three things a template must not do: end on a colon, claim
feelings the sender has not expressed, or grow long enough to truncate inside
a mailto: href on the Resend fallback path."
```

---

### Task 4: the form hands over a finished message

**Files:**
- Modify: `src/sections/Contact/ContactForm.tsx`, `IntentChooser.tsx`
- Test: `tests/ui/ContactForm.test.tsx`

**Interfaces:**
- Consumes: `contactIntents[].messageDraft` (Task 3), `emailDeliveryConfigured` prop.
- Produces: nothing other tasks consume.

- [ ] **Step 1: Write the failing tests**

Create `tests/ui/ContactForm.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactForm from "@/sections/Contact/ContactForm";
import { contactIntents } from "@/content/portfolio";

describe("the contact form", () => {
  it("shows the whole draft as readable text once an intent is chosen", async () => {
    // Review Focus 1: the visitor is about to send prewritten words over
    // their own name. Those words must be plainly visible, not folded into a
    // disclosure they have to open.
    const user = userEvent.setup();
    render(<ContactForm emailDeliveryConfigured={true} />);
    await user.click(screen.getByRole("radio", { name: /career opportunity/i }));
    const draft = contactIntents.find((i) => i.id === "opportunity")!.messageDraft;
    expect(screen.getByText(draft.split("\n\n")[1])).toBeVisible();
  });

  it("offers one primary send and one optional expansion", async () => {
    const user = userEvent.setup();
    render(<ContactForm emailDeliveryConfigured={true} />);
    await user.click(screen.getByRole("radio", { name: /career opportunity/i }));
    expect(screen.getByRole("button", { name: /send it as written/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add a line/i })).toBeInTheDocument();
  });

  it("will not send without somewhere to reply", async () => {
    // Review Focus 5: two fields is the whole ask. A message with no reply
    // address cannot be answered, so it must not be sendable.
    const user = userEvent.setup();
    render(<ContactForm emailDeliveryConfigured={true} />);
    await user.click(screen.getByRole("radio", { name: /career opportunity/i }));
    await user.click(screen.getByRole("button", { name: /send it as written/i }));
    expect(await screen.findByText(/where to reply/i)).toBeInTheDocument();
    const email = screen.getByLabelText(/where to reply/i);
    expect(email).toBeRequired();
    expect(email).toHaveAttribute("type", "email");
  });

  it("works the same way when delivery is not configured", async () => {
    // The mailto: fallback is intentional. Choosing an intent and sending
    // must behave identically from the visitor's side.
    const user = userEvent.setup();
    render(<ContactForm emailDeliveryConfigured={false} />);
    await user.click(screen.getByRole("radio", { name: /career opportunity/i }));
    expect(screen.getByRole("button", { name: /send it as written/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm vitest run tests/ui/ContactForm.test.tsx`
Expected: FAIL — no "send it as written" button.

- [ ] **Step 3: Build the draft panel**

The part of `ContactForm.tsx` this task adds, between the intent chooser and the submit:

```tsx
{selected ? (
  <>
    {/*
      The draft, as plain readable text.

      Not inside a <textarea>: one that is prefilled and editable looks like
      work to do, which is the exact impression this redesign removes. Not
      behind a <Disclosure> either — the visitor is about to send these words
      over their own name, so they have to be in front of them without an
      interaction first. `whitespace-pre-line` renders the draft's own
      paragraph breaks without parsing anything.
    */}
    <div className="mt-8 border border-rule bg-surface p-6">
      <p className="flex items-baseline gap-3 border-b border-rule pb-4">
        <span className="eyebrow shrink-0">Subject</span>
        <span className="font-mono text-[length:var(--step--1)] text-fg">
          {selected.subject}
        </span>
      </p>
      {expanded ? (
        <label className="mt-4 block">
          <span className="eyebrow">Your message</span>
          <textarea
            name="message"
            rows={9}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="mt-2 w-full border border-rule bg-ground p-3 text-[length:var(--step-0)] leading-[1.7] text-fg"
          />
        </label>
      ) : (
        <p className="mt-4 whitespace-pre-line text-[length:var(--step-0)] leading-[1.7] text-fg">
          {selected.messageDraft}
        </p>
      )}
    </div>

    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className="eyebrow">Your name</span>
        <input
          type="text"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-2 min-h-11 w-full border border-rule bg-ground px-3 text-[length:var(--step-0)] text-fg"
        />
      </label>
      {/*
        Required, and `type="email"`, in both delivery modes. The name is
        optional because a message with no name is still answerable; one with
        no reply address is not a contact, it is a note to nobody.
      */}
      <label className="block">
        <span className="eyebrow">Where to reply</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 min-h-11 w-full border border-rule bg-ground px-3 text-[length:var(--step-0)] text-fg"
        />
      </label>
    </div>

    <div className="mt-6 flex flex-wrap items-center gap-4">
      {/* The page's one primary control, and the only blue button on it. */}
      <button
        type="submit"
        className="min-h-12 bg-accent px-6 text-[length:var(--step-0)] font-medium text-fg-inverse"
      >
        Send it as written
      </button>
      <button
        type="button"
        onClick={() => {
          setBody(selected.messageDraft);
          setExpanded(true);
        }}
        className="min-h-12 border border-rule px-5 text-[length:var(--step-0)] text-fg hover:border-fg-muted"
      >
        Add a line of my own
      </button>
      <p className="text-[length:var(--step--1)] text-fg-muted">
        Nothing is sent until you press send.
      </p>
    </div>
  </>
) : null}
```

The body submitted is `expanded ? body : selected.messageDraft`, so before the expansion the draft goes out verbatim and after it the textarea is the single source of truth. On the `mailto:` fallback path the same value is `encodeURIComponent`-ed into the href — which is what Task 3's URL-length test protects.

- [ ] **Step 4: Run them to verify they pass**

Run: `pnpm vitest run tests/ui/ContactForm.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Hand the visitor a finished message

Choosing an intent now produces a complete, sendable draft shown as plain
readable text — not inside a textarea that looks editable, and not behind a
disclosure. A visitor is about to send prewritten words over their own name,
so those words have to be in front of them.

Two fields, one primary button, and \"add a line of my own\" for the people
who do want to write. The reply address is required in both delivery modes: a
message nobody can answer is not a contact."
```

---

### Task 5: four ways out with no form at all

**Files:**
- Create: `src/sections/Contact/DirectLinks.tsx`
- Modify: `src/sections/Contact/Contact.tsx`
- Add: `public/thien-le-resume.pdf`
- Test: `tests/ui/DirectLinks.test.tsx`

- [ ] **Step 1: Refresh the résumé PDF**

The owner confirmed `C:\Users\thien\Downloads\Thien_Le_Software_Engineering_Resume.pdf` is current. Copy it to `public/thien-le-resume.pdf` — the path `profile.resumePdf` already names.

```bash
cp "/c/Users/thien/Downloads/Thien_Le_Software_Engineering_Resume.pdf" public/thien-le-resume.pdf
```

Confirm the served file is the September 2026 revision by checking it contains `$2.8M`:

```bash
pdftotext -layout public/thien-le-resume.pdf - | grep -c '2.8M'
```

Expected: `1` or more. If `0`, the wrong file was copied.

- [ ] **Step 2: Write the failing test**

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import DirectLinks from "@/sections/Contact/DirectLinks";
import { profile, socialLinks } from "@/content/portfolio";

describe("the no-form row", () => {
  it("offers every social link the content layer authors", () => {
    render(<DirectLinks />);
    for (const link of socialLinks) {
      expect(screen.getByRole("link", { name: new RegExp(link.label, "i") })).toHaveAttribute(
        "href",
        link.href
      );
    }
  });

  it("offers the résumé at the path the profile names", () => {
    render(<DirectLinks />);
    expect(screen.getByRole("link", { name: /résumé/i })).toHaveAttribute(
      "href",
      profile.resumePdf!
    );
  });

  it("marks external links as external and leaves mailto alone", () => {
    render(<DirectLinks />);
    const github = screen.getByRole("link", { name: /github/i });
    expect(github).toHaveAttribute("rel", expect.stringContaining("noopener"));
    const email = screen.getByRole("link", { name: /email/i });
    expect(email).not.toHaveAttribute("target");
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm vitest run tests/ui/DirectLinks.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 4: Build it**

```tsx
import { profile, socialLinks } from "@/content/portfolio";
import { resolved } from "@/types/portfolio";

/**
 * Four ways out that need no form at all.
 *
 * The section buried these under three stacked asks, which meant the lightest
 * path was the smallest thing on screen. A Server Component: every one is a
 * plain anchor and none needs a byte of client JavaScript.
 *
 * The résumé is read from `profile.resumePdf` rather than typed, so the path
 * cannot drift from the one the hero's download link uses.
 */
export default function DirectLinks() {
  const resumePdf = profile.resumePdf;
  return (
    <ul role="list" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {socialLinks.map((link) => (
        <li key={link.id}>
          <a
            href={link.href}
            // `external` is authored on the content layer. mailto: is not
            // external in this sense — opening the visitor's mail client in a
            // new tab leaves them an empty one to close.
            {...(link.external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className="flex min-h-11 flex-col gap-1.5 border border-rule bg-surface p-5 hover:border-fg-muted"
          >
            <span className="eyebrow">{link.label}</span>
            <span className="wrap-anywhere text-[length:var(--step--1)] text-accent">
              {link.handle}
            </span>
          </a>
        </li>
      ))}
      {resumePdf ? (
        <li>
          <a
            href={resumePdf}
            className="flex min-h-11 flex-col gap-1.5 border border-rule bg-surface p-5 hover:border-fg-muted"
          >
            <span className="eyebrow">Take the</span>
            <span className="text-[length:var(--step--1)] text-accent">
              {resolved(profile.resumePdfLabel) ?? "Résumé, as a PDF"}
            </span>
          </a>
        </li>
      ) : null}
    </ul>
  );
}
```

`wrap-anywhere` on the handle is load-bearing, not defensive: at 320px under 200% zoom the email address is the longest unbreakable string in the row, and a box overflowing a grid cell is scrollable overflow rather than just ink. `e2e/responsive.spec.ts` holds that line.

- [ ] **Step 5: Run it to verify it passes**

Run: `pnpm vitest run tests/ui/DirectLinks.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Promote the four no-form escapes, and refresh the résumé

Copy the email, message on LinkedIn, read the code, take the PDF. The section
buried these under three stacked asks; they are a row now. The served PDF is
the September 2026 revision — verified by grepping it for the \$2.8M figure
the old one did not have."
```

---

### Task 6: book twenty minutes, or render nothing

Review Focus 3. The owner approved a Cal.com link but has not created the event. A button linking to `undefined` is worse than no button.

**Files:**
- Create: `src/sections/Contact/BookACall.tsx`
- Modify: `src/sections/Contact/Contact.tsx`, `.env.example`
- Test: `tests/ui/BookACall.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
describe("book a call", () => {
  it("renders nothing when no booking URL is configured", () => {
    const { container } = render(<BookACall bookingUrl={undefined} />);
    // The same rule the rest of the site follows: a fact the site does not
    // have renders as nothing, never as a broken control.
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a plain link when one is", () => {
    render(<BookACall bookingUrl="https://cal.com/thienle/20min" />);
    const link = screen.getByRole("link", { name: /twenty minutes/i });
    expect(link).toHaveAttribute("href", "https://cal.com/thienle/20min");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("never injects a third-party script", () => {
    const { container } = render(<BookACall bookingUrl="https://cal.com/thienle/20min" />);
    // A plain href, not an embed. The JS budget and the no-dependency rule
    // both forbid the widget.
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/ui/BookACall.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Build it**

```tsx
interface BookACallProps {
  /** The owner's scheduling link, read from `BOOKING_URL` in a Server
   *  Component and passed down. `undefined` renders nothing — the same rule
   *  the content layer follows for an unauthored fact. */
  readonly bookingUrl: string | undefined;
}

export default function BookACall({ bookingUrl }: BookACallProps) {
  if (!bookingUrl) return null;
  return (
    <a
      href={bookingUrl}
      rel="noopener noreferrer"
      target="_blank"
      className="inline-flex min-h-11 items-center border border-rule px-5 text-[length:var(--step-0)] text-fg hover:border-fg-muted"
    >
      Book twenty minutes
    </a>
  );
}
```

Read `process.env.BOOKING_URL` in `Contact.tsx` (a Server Component) and pass it down — the same shape as `emailDeliveryConfigured`. Add `BOOKING_URL=` to `.env.example` with a comment saying the control does not render without it.

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm vitest run tests/ui/BookACall.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add a booking link that renders nothing until it exists

Cal.com as a plain href, never an embedded widget — the JS budget and the
no-dependency rule both forbid the script. With no BOOKING_URL set the control
renders nothing at all, which is the same rule the content layer follows for a
fact the site does not have. A broken button is worse than no button."
```

---

### Task 7: Ask moves to Contact

Spec §7.1. The owner loves it and did not know where to put it. A visitor who wants to interrogate the record rather than email is making contact with less effort, which is what the four drafts are for.

**Files:**
- Move: `src/sections/Hero/AskThisSite.tsx` → `src/sections/Contact/AskThisSite.tsx`
- Delete: `src/sections/Hero/AskThienHeroTab.tsx`
- Modify: `src/sections/Contact/Contact.tsx`, `src/sections/Hero/HeroCodeArtifact.tsx`
- Test: `tests/ui/Contact.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
describe("Ask, in Contact", () => {
  it("is reachable at a stable id", () => {
    // Review Focus 4: the panel moved sections. #ask has to keep working
    // wherever it lives.
    render(<Contact emailDeliveryConfigured={true} bookingUrl={undefined} />);
    expect(document.getElementById("ask")).not.toBeNull();
  });

  it("sits beside the drafts as a fifth way to make contact", () => {
    render(<Contact emailDeliveryConfigured={true} bookingUrl={undefined} />);
    expect(
      screen.getByRole("heading", { name: /ask about my work/i })
    ).toBeInTheDocument();
  });

  it("is not the section's primary control", () => {
    // One primary control per screen, and it is "Send it as written".
    render(<Contact emailDeliveryConfigured={true} bookingUrl={undefined} />);
    const buttons = screen.getAllByRole("button");
    const primary = buttons.filter((b) => b.className.includes("bg-accent"));
    expect(primary).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/ui/Contact.test.tsx`
Expected: FAIL — `#ask` is null.

- [ ] **Step 3: Move it**

```bash
git mv src/sections/Hero/AskThisSite.tsx src/sections/Contact/AskThisSite.tsx
git rm src/sections/Hero/AskThienHeroTab.tsx
```

Fix imports. Remove the Ask tab from `HeroCodeArtifact.tsx`'s tab set — the artifact goes back to three code tabs, which Task 1 authored.

In `Contact.tsx`, render `<AskThisSite>` under a heading *"Ask about my work"* with `id="ask"`, below the drafts and beside the no-form row. `askLiveModeConfigured()` is still read server-side in `Contact.tsx` and the boolean passed down — the key must not cross.

- [ ] **Step 4: Restore Task 2's deferred assertion**

If `tests/ui/Hero.test.tsx`'s "no longer renders the Ask panel" case was marked `it.todo`, un-mark it now and run it.

- [ ] **Step 5: Run the full suite**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 6: Verify, both themes**

```bash
pnpm dev
```

Walk About and Contact in `day` and `night`. Confirm: the hero is one screen, the drafts are readable, the primary button is the only blue one, Ask answers a question, and the booking control is absent (no `BOOKING_URL` yet).

- [ ] **Step 7: Run the accessibility suite**

```bash
pnpm test:e2e
```

Expected: PASS across both themes and all three tones. Never pipe it through `tail`. Re-run with `--workers=2` if it fails at default workers — documented saturation flake.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Move Ask into Contact, as a fifth way to get in touch

He loves the panel and did not know where it belonged. A visitor who wants to
interrogate the record instead of writing an email is doing what the four
drafts do — making contact with less effort — so it sits with them, at a
stable #ask id.

The hero artifact goes back to three tabs, all real code. One primary control
per screen still holds: the only blue button in Contact is \"Send it as
written\"."
```
