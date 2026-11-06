# SDD ledger — plan: docs/superpowers/plans/2026-10-17-round-20-phase-6-contact.md
Spec §6 + owner requests 2026-10-11. Worktree .claude/worktrees/r20-contact, branch round-20/contact, base f268bd9. Push pre-approved.

## Preflight scan
| Pair / task | Shared | Finding |
|---|---|---|
| T1–T3 | lib/contact.ts (leadSchema, buildLeadMailto), route | T3's LeadForm consumes T1's schema/mailto; T1 keeps deprecated intent helpers alive for ContactForm until T3 deletes it. OK |
| T2–T3 | /contact.vcf | T3 links it; e2e for it lives in T3. OK |
| T3 | self | aspect ratio may relax if the back face doesn't fit — comment must be updated honestly. OK |
| T4 | self | lag A/B carried from Phase 5. OK |
Ruling: copy drafts in the plan (section lead, back heading, note, success) are authored by the controller in first person per docs/voice.md — the owner can reword — cost if wrong: copy edits.
Ruling: phone validation is loose (/^\+?[\d\s().-]{7,20}$/) — international numbers vary — cost if wrong: some junk numbers pass.
Task 1: DONE (3ef32d8). vitest 950; build ok. Interim: old ContactForm message/reason ignored by the route until Task 3. tsc LayoutProps error in layout.tsx (likely Next typegen state; verify passed on main).
Task 1: review Needs fixes (control chars in name → subject/body; phone \s allows newline; stale docblock). Ruling: phone regex uses a literal space instead of \s (spec's \s was a latent newline hole) — cost if wrong: tabs in phone numbers rejected.
Task 1: fix round 1/5 (3 addressed + minors, 0 open; a35c33f; controller read the validation diff).
Task 1: complete (commits f268bd9..a35c33f, review clean)
Task 2: DONE (7e2242c). vcard 7/7; build lists ○ /contact.vcf static; headers verified on :3160.
Ruling: Task 2 (one 25-line pure builder + static route) reviewed by the controller from the diff — escaping covers \ , ; (inputs are static profile strings, no newlines), N = family "Le"/given "Thien" — cost if wrong: one fewer independent look.
Task 2: complete (commits a35c33f..7e2242c, review clean)
Task 3: DONE_WITH_CONCERNS (f197976). unit 941; contact e2e 23 (default) / 28 (dummy Resend env); axe 20 incl. flipped form both themes; aspect 13/10 removed (back face ~449 px). Concern: ask.spec "chat landing does not move what follows" fails 3/3 @1024 — Phase 5 case-study content-visibility estimate (3655 vs 3736 px) shifts layout. Controller looked at screenshots: monogram watermark block overlaps LinkedIn row + "Let me reach you" (reads broken).
Task 3: fix round 1 (f1ccca5 ed6fb9a 6c44f2d ce84ad8 30af337): watermark removed; docs; screenshots.mjs; minors; content-visibility removed from case studies AND timeline (main also failed ask 1024 by 81.03 px); cats corpus doc (companions fields; 'belongs to my girlfriend'); eval unchanged 70.0/93.3/0.807; unit 950.
Task 3: fix round 1/5 (6 addressed, 0 open; f197976..30af337)
Ruling: drop content-visibility from timeline + case studies (placeholder heights shift layout up to 81 px; also failing on main) — keep only the tree box's data-far skip — cost if wrong: ~35 ms more paint in the Worlds band; re-measured in Task 4.
Task 3: complete (commits 7e2242c..30af337, review clean)
