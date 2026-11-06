# Round 25 audit — what is wrong, in order

Captured 2026-11-05 from a production build of `round-24/polish` with
`pnpm shots before`: nine widths (320, 375, 390, 430, 768, 1024, 1280, 1440,
1920), day and night, plus states at 390 and 1440. Chromium only; phone and
tablet widths are touch contexts. Reviewed section by section against the
source audit. **Seen** means it is in a screenshot; **source** means it follows
from the code and still needs a look in a browser.

The short version: phones and 1440 are in good shape. The problems are one
real crop at 1280, the two middle bands (640 – 1279), a form field pair that
is cramped at almost every width, and Diary pages that are all as tall as the
tallest one.

## P0 — broken

| # | Where | Widths | What | Cause | Evidence |
|---|---|---|---|---|---|
| 1 | Journey | 1280 – ~1400 | The board is wider than the window: the lantern is cut in half at the left edge, the swing's caption reads "…hi, in love", the left limb runs off. | The board is laid out in fixed pixels for 1440 (`TAG_SPOTS`, `HangingTags.tsx:19-25`; `--fx` goes to −144px, `CareerTree.tsx:48`; swing at `globals.css:946`). | Seen: `tree-1280`, both themes |
| 2 | Header on `/resume` | all | The TL tag and the "Let's talk" stamp link to bare `#about` / `#contact`, which do nothing off the home page. The nav links are right (`/#…`). | `SiteHeader.tsx:50,80` | Source |

## P1 — awkward

| # | Where | Widths | What | Cause | Evidence |
|---|---|---|---|---|---|
| 3 | Contact form | 390 – 1920 | Email and phone sit side by side at 100 – 150px each (135px even at 1920). A typed address does not fit. They only stack at 375 and below. | The pair follows the postcard's width (`@min-[32rem]/postcard`, `LeadForm.tsx:241`), not the form side's own. | Seen: every `contact-*` |
| 4 | Contact | 1024 – 1279 | Postcard and card squeezed side by side: form column ~220px, "No message needed. I'll / write first.", the send note on three lines. | Two-column grid from `lg` (`Contact.tsx:119`) | Seen: `contact-1024` |
| 5 | Contact | 640 – 1023 | The card is a 420px portrait block centred between a full-width postcard and a full-width Ask. | No tablet arrangement for the card | Seen: `contact-768` |
| 6 | Journey | 640 – 1279 | The phone zigzag, stretched: 236px tags down a centred trunk, 27% of the width empty at 768 and 45% at 1024; 1.9 and 2.7 screens tall. 230 – 330px of bare band between the button and the crown; the crown is cut by its box on the left. | One layout for 640 – 1279 (`globals.css:852-890`) | Seen: `tree-768`, `tree-1024` |
| 7 | Hero | 640 – 1023 | The headline uses the width; everything under it is a 360px phone column adrift in the middle, 1700px tall. | `PhoneLine` capped at 560px below `lg` | Seen: `about-768` |
| 8 | Diary | all, worst on phones | Every page is as tall as the tallest. On a phone, page 3 has ~580px of blank paper between its chart and its sticky note; page 1 ends in 300 – 380px of blank; the arrows sit 400 – 700px under the content. | `--page-h` (`DiaryBook.tsx:270-289`, `globals.css:3825`) | Seen: `state-diary-next-390`, `record-390/430/768` |
| 9 | Diary | 1024 – 1279 | One page ~920px wide. Page 1 is well composed; entry pages run to an ~800px measure. Two 450px pages would fit. | Spread starts at `xl` (`globals.css:3579`, `DiaryBook.tsx:78`) | Seen: `record-1024`; measure from source |
| 10 | Diary | 1280 | The left page uses the phone arrangement of page 1 (stacked notes, no leader lines) while 1024 and 1440 use the leader lines. | Page width at 1280 falls under the leader layout's threshold | Seen: `record-1280` |
| 11 | Diary | 320, 375 | "Milestones 9" wraps to a second row and sits on the book's top board. | Tab row has no narrow arrangement | Seen: `record-320/375` |
| 12 | Touch cats | 390, 430 | The resting cats sit on entry text ("CockyHacks, ACM@USC", "2024 / Engineer"). They do not cover a control in any capture. | Fixed cluster (`RestingBox.tsx:299`) with no regard for what is under it | Seen: `record-390/430` |
| 13 | Ask | 390 | The answer window shows ~130px of answer and cuts "More on this in About" through its text. | Fixed 17rem window (`AskThisSite.tsx:943`) minus the stub and the tabs | Seen: `state-ask-answered-390` |
| 14 | Ask | 1024+ | The strip is as big as the form above it and mostly empty: ~200px blank under the intro, ~300px under the suggestions. It outweighs the postcard. | Fixed 23rem window, `--ask-room` min-heights | Seen: `contact-1024…1920` |
| 15 | `/resume` | phones | The PDF sits in an `<iframe>`; phones show one page or nothing. Blank in every capture (headless Chromium does not render PDFs, so unproven). | `app/resume/page.tsx:54` | Source |

## P2 — polish

| # | Where | Widths | What | Evidence |
|---|---|---|---|---|
| 16 | Type | all | Text under 12px: 9px postmark, ~10px companion labels (`0.62rem` ×7), 11 / 11.5px in Ask, the menu and the card. | Source |
| 17 | Hero | 320 | The hint is three lines in ~100px; the field tag stacks label over value and is ~620px tall; "My LinkedIn" breaks. | Seen: `about-320` |
| 18 | Hero | 320 – 1023 | The bamboo pole ends in mid-air above the field tag while the string carries on. | Seen: `about-390/768` |
| 19 | Hero | 1024, 1280 | The pine is half off the right edge; at 1024 the nón lá is clipped at the left and the hint starts inside the bamboo leaves. | Seen: `fold-1024/1280` |
| 20 | Hero | 1024 | Four ~125px tags beside a 385px field tag; the field tag out-shouts the headline. | Seen: `about-1024` |
| 21 | Hero | 1920 | The paddy spans ~820 – 1565 and fades; the bottom corners are bare. | Seen: `fold-1920` |
| 22 | Journey | 1920 | The board stays 1440 wide, ~240px bare each side. | Seen: `tree-1920` |
| 23 | Journey | 320 – 430 | The trunk is hard against the right edge with its boughs clipped; tags 4 – 8px from it at 320. | Seen: `tree-320/375` |
| 24 | Journey | 640 – 1023 | The DoorDash stub overlaps the trunk by 5 – 8px. | Seen: `tree-768` |
| 25 | Journey | 1280+ | "Watch it grow" sits on the trunk's foot and the grass and reads as art. Below 1280 it is under the subtitle. | Seen: `tree-1280` |
| 26 | Diary | 768, 1024 | "Software Engineer Co-op" breaks as "Co- / op". | Seen: `record-768/1024` |
| 27 | Diary | 320 | Taped notes are ~120px wide: "by" alone on a line, a three-line company. | Seen: `record-320` |
| 28 | Diary | 1024+ | Contents rows are 28px tall, small for a touch laptop. | Source (`DiaryBook.tsx:1262`) |
| 29 | Contact | all | The postmark's "TAYLORS SC" is clipped by its ring; the bracket under the email/phone pair reads as an empty box. | Seen: `contact-*` |
| 30 | Contact | 320 | The card's email is ellipsised. | Seen: `contact-320` |
| 31 | Contact | 1280+ | The card is ~400px shorter than the postcard beside it. | Seen: `contact-1440` |
| 32 | Ask | all | A question already asked is still offered as a suggestion. | Seen: `state-ask-answered-1440` |
| 33 | Menu | phones | The open menu has ~400px of blank lined paper under "Contact". | Seen: `state-menu-open-390` |
| 34 | Fragile | — | Hand-measured `--ask-room` heights at six widths (`globals.css:2597-2634`); fitted string drops (`ChapterTags.tsx:18-24`, `Hero.tsx:34-37`). Both break when copy changes. | Source |
| 35 | System | — | ~13 breakpoint values in rem, px and Tailwind names; 23 ad hoc font sizes; three section titles at three sizes; no spacing, radius, shadow or layer tokens. Dead: `FilterGroup`, `--code-scrim`, `--tracking-caps-lg`, the unused `rail` / `eyebrow` paths; `--gutter` reused as a gradient direction inside the Diary. | Source |
| 36 | Tests | — | No e2e project at 1280 (where #1 and #10 live), none at 430 or 1920; `responsive.spec.ts:66-76` skips anything under a clipping ancestor, so #1 passes. | Source |

## To confirm in a browser before fixing

- On a phone, the Diary's page 3 shows its running head and then a gap where
  the entry's title should be (`state-diary-next-390`). It may be a reveal that
  had not run when the shot was taken.
- At night below 1024 the oak's trunk nearly disappears into the sky
  (`night/tree-768`). The night bark is meant to be a silhouette; whether it is
  too dark is Thien's call.

## Checked and fine

The header at every width, at rest and with the menu open; focus rings; the
turned tag; the footer; the hero and Contact at 1440; the Diary spread at 1440
and 1920; `/resume`'s own header. No horizontal overflow anywhere. Nothing
clipped inside a Journey tag. The cats never cover the send or Ask buttons.

## Not covered

Real devices (Chromium emulation only), Safari and Firefox, the Diary's turn
mid-air (round 24 covered it), and the live-model Ask (no key in this build).
