# Round 20 Phase 6 (Contact) — ledger

Branch `round-20/contact`, base `f268bd9`, tasks 1-3 `f268bd9..ce84ad8`, task 4 records. Not pushed.

## Per task
- **Task 1 — lead API** (`3ef32d8`..`a35c33f`): `leadSchema` {name, email?, phone?, website?} with a one-of-email/phone refine; subject `Portfolio lead — ${name}`; replyTo when email; `buildLeadMailto`. Review round 1 fixed control characters in the name, a newline hole in the phone regex, a stale docblock.
- **Task 2 — vCard** (`7e2242c`): vCard 3.0 builder from `profile`, static `/contact.vcf` (text/vcard, attachment `thien-le.vcf`), 7 unit tests.
- **Task 3 — card, form, Contact rework, cats** (`f197976`, fix round `f1ccca5`..`30af337`): flip business card with back-face lead form, ContactForm/IntentChooser/DirectLinks/contactIntents removed, monogram watermark dropped, form labelled by its heading with `data-delivery`, docs/README/.env.example/CLAUDE.md updated, cats indexed for the chat from the companions' fields, `content-visibility` removed from the timeline and unbranched case studies.
- **Task 4 — verify and record**: `pnpm verify` 5/5 (950 tests; eval 70.0 / 93.3 / 96.7 / 0.807, floors held); e2e default build 915 passed / 795 skipped / 0 failed; contact spec with dummy Resend env 30 passed / 0 failed; perf JS at load 234,637 B (+65,364 B vs R20-P5, zod in the client chunk); lag A/B run at 40-100% CPU, parity with `ae0cdc6` in the one lightly loaded pair. Rows in `docs/feedback-tracker.md`.

## Rulings (verbatim from progress.md)
Ruling: copy drafts in the plan (section lead, back heading, note, success) are authored by the controller in first person per docs/voice.md — the owner can reword — cost if wrong: copy edits.
Ruling: phone validation is loose (/^\+?[\d\s().-]{7,20}$/) — international numbers vary — cost if wrong: some junk numbers pass.
Ruling: phone regex uses a literal space instead of s (spec's s was a latent newline hole) — cost if wrong: tabs in phone numbers rejected.
Ruling: Task 2 (one 25-line pure builder + static route) reviewed by the controller from the diff — escaping covers \ , ; (inputs are static profile strings, no newlines), N = family "Le"/given "Thien" — cost if wrong: one fewer independent look.
Ruling: drop content-visibility from timeline + case studies (placeholder heights shift layout up to 81 px; also failing on main) — keep only the tree box's data-far skip — cost if wrong: ~35 ms more paint in the Worlds band; re-measured in Task 4.

## Deferred minors
- zod reaches the client bundle (JS at load +65 KB vs R20-P5) through `leadSchema` in `LeadForm`. Accepted by the plan, measured in Task 4, not reduced. A hand-written validator in the form (keeping zod server-side) would take it back; decision for Thien.
- The lag A/B ran with the machine saturated (the idle gate never opened in 60 minutes), so only the run-3 pair is near earlier conditions. Re-run on an idle machine if the Worlds-band question matters.
- Cat feet over the Email input: not reproduced in 120 samples (Task 3); no code change.
- `scripts/screenshots.mjs` flips the card and shoots its back; the script itself was not run end to end (Task 3 report).
- vCard N splits on the last word as family name ("Le"); social URLs limited to https.

## Owner notes
- **Copy drafts are mine, in first person per docs/voice.md; reword freely:** the Contact section lead, the back-of-card heading, the note "I'll only use this to get back to you.", and the success message.
- **GitHub is kept on the card** (front face links).
- **The résumé PDF link is dropped from Contact**; the card links the `/resume` route instead.
- **The chat's cat document says the cats belong to his girlfriend** (quoted from the companions' fields into the corpus).
- Case studies keep "Discuss this project" -> `#contact`, without a prefill.
