# MentorHub recording: BLOCKED (no clean stretch of 5 s)

Source: D:/Project/Portfolio-v2/src/assets/experience/mentorhub.mp4 (1920x1080 with pillarbox, 15.367 s, 30 fps). Never modified.
Frames: D:/Project/portfolio/reports/mentorhub-frames/ (f001..f031 = 2 fps, t = (n-1)*0.5 s; dense/ = 10 fps from 11.5 s; sheetN.png = contact sheets).

## Frame verdicts (2 fps)
| n | t (s) | content | verdict |
|---|---|---|---|
| 1-2 | 0.0-0.5 | Welcome page | clean |
| 3 | 1.0 | About Us, Our Team: Aarsh Patel, Thien Le, Maximus Fernandez, roles | DIRTY (names) |
| 4-8 | 1.5-3.5 | About Us scrolling, team names, years, bios | DIRTY (names, bios) |
| 9 | 4.0 | About Us bottom, names and bios | DIRTY |
| 10 | 4.5 | Welcome page | clean |
| 11 | 5.0 | Login, empty fields | clean |
| 12 | 5.5 | Login, "thien" typed in email | DIRTY (partial email) |
| 13-14 | 6.0-6.5 | Login, thien@gmail.com, then password dots | DIRTY (email) |
| 15-16 | 7.0-7.5 | Login, thien@gmail.com, 401 "Failed to login" | DIRTY (email, 401) |
| 17-18 | 8.0-8.5 | Login, email, 401 | DIRTY |
| 19 | 9.0 | Dashboard, "Change your password ... found in a data breach" dialog, Name: Thien Le, Email | DIRTY (breach dialog, name, email) |
| 20 | 9.5 | Dashboard, profile card Name + Email | DIRTY |
| 21 | 10.0 | Discovery categories | clean (single frame, under 1 s) |
| 22 | 10.5 | Mentors list: Aarsh Patel, Aarsh Patel - 2/3 | DIRTY (teammate name) |
| 23 | 11.0 | Dashboard, Name + Email | DIRTY |
| 24 | 11.5 | About Us, team names | DIRTY |
| 25 | 12.0 | About Us, team names (dense: About Us until 12.4 s) | DIRTY |
| 26-28 | 12.5-13.5 | Welcome page | clean |
| 29-31 | 14.0-15.0 | Login, empty fields (dense scan to 15.3 s: all clean) | clean |

Dense scan 11.5-15.3 s (10 fps): dashboard with Email at 11.5, About Us with names 11.6-12.4, Welcome from 12.5, Login empty from 14.0 to the last frame. No dialog, email or names after 12.5 s.

## Chosen stretch
None. The longest contiguous clean stretch is 12.5 s to 15.367 s, about 2.87 s, under the 5 s minimum. Other clean runs are about 1 s (0.0-0.9 welcome; 4.1-5.4 welcome/login; 10.0 discovery). Cropping cannot help: the data is inside the app content. Per instructions nothing was encoded, no content/test changes made, nothing committed.

## Options for Thien
1. Re-record or edit the source so it contains 5 s or more of clean flow (for example: Welcome, Get Started, empty Login, Discovery), with no teammate pages, no signed-in dashboard and a throwaway email.
2. Approve a shorter clip: the 2.87 s tail (Welcome, click Get Started, empty Login) is clean but shows almost nothing of the product.
3. Approve blurring or covering the data (email, names) in a longer cut. That edits pixels and needs an explicit decision.

Concerns: the 5 s floor is a ruling I could not meet without altering pixels. Test counts, perf: not run (nothing changed).

## Ship (unedited)

Status: shipped on branch round-18/mentorhub, commit 6d25c67. Owner consent of 2026-10-09 recorded in docs/feedback-tracker.md beside the Food Route trim note.
- Encode: public/media/mentorhub.mp4, 385,641 B, 1280x720, 15.37 s, crf 30 (under 1.5 MB, nothing cut). Poster public/media/mentorhub.jpg, 18,671 B, frame at 0.2 s (Welcome page). Commands are in the tracker.
- Description: "A mentorship app's welcome page and About Us page, then a login, a dashboard with a profile card, a Discovery page of eight subject buttons, and a Mentors list with a search box."
- Tests: the unit list test failed first (expected ["foodroute"] vs both), then passed. `pnpm verify` 5/5 (939 unit tests). sections, axe and responsive e2e: 151 passed, 0 failed, including the MentorHub press test (nothing under /media/ before the press, then exactly one mp4 and one jpg) at all six widths.
- Perf x3: initial JS 205,534 B (+119 B over 205,415), 0 skipped. LCP 3164-5084 ms and TBT 740-885 ms are higher than Plan D (machine load, unverified).
- Cleanup: server on :3151 killed by exact PID; throwaway playwright config and perf copy deleted.
