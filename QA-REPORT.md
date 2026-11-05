# Latest QA: Stage 6 Batch C — 5 November 2026

**`npm run qa`: PASS — 12/12 gates, 42/42 automated tests.** Original images 26/26 unchanged. Original 14 new MP3 files decoded by FFmpeg. Isolated interactive Chromium tutorial check: 4/4 viewports PASS. Full live-browser multiplayer, real audio playback, fixed Northern narration and hosted durable restart are **NOT RUN/BLOCKED**. Full Batch C report: `STAGE6-BATCH-C-QA.md`.

---

# Latest QA: Stage 6 Batch B — 4 November 2026

**npm run qa: PASS — 11/11 gates, 35/35 automated tests.**
**Locked npm ci --offline: PASS.** Original art: 26/26 verified.
**Chromium mock-state layout checks: PASS** (12 viewport/phase snapshots; see `STAGE6-BATCH-B-QA.md`).
**Real browser end-to-end and physical phone/TV acceptance: NOT RUN**, owing to browser navigation policy and lack of physical devices.
**Durable hosted restart recovery: BLOCKED** as before.

The full original non-visual repair report follows for historical reference. Stage 6 Batch B detail is in `STAGE6-BATCH-B-QA.md`.

---

# FORGER'S FINGER — Stage 6 Batch A QA

**Date:** 4 November 2026  
**Environment:** Linux, Node.js v22.16.0, npm 10.9.2.  
**Build:** `1.1.1-stage6a`, based on the repaired pre-Alpha build.

| Check | Result | Evidence |
|---|---|---|
| Node `npm run qa` | **PASS** | 11/11 gates, includes JS/inline script syntax checks and asset checks |
| Node `npm test` (run within QA) | **PASS** | 29 tests, 29 passed, 0 failed, 0 skipped |
| Stage 6 grid test for 3/4/6/8 players | **PASS** | 3×1, 2×2, 3×2, 4×2 |
| Stage 6 layout test for partial counts 1/2/5/7 | **PASS** | Every lot has capacity |
| TV responsive markup/static control checks | **PASS** | Live QR, proper room code, no fixed scale transform, responsive CSS |
| Phone control/ACK regression test | **PASS** | Palette/Undo/Wash/Clear/Submit/Help, retry/draft protocol still present |
| Original 26 artwork hashes | **PASS** | 26/26 hash matches from approved manifest |
| HTTP service of CSS and key art | **PASS** | 200 OK, expected MIME for two CSS and three PNG files |
| CSS syntax parsing | **PASS** | `tinycss2` parsed 2 new stylesheets, 0 syntax/declaration errors |
| Chromium E2E browser walkthrough | **NOT RUN — BLOCKED** | Launch works, but navigation to local server returns `net::ERR_BLOCKED_BY_ADMINISTRATOR` |
| Cross-device clipping/screenshots and live touch | **NOT RUN** | Real phone/TV interactive acceptance required |
| Render durable restart recovery | **BLOCKED** | No configured external durable store; local encrypted recovery only |
| New original audio/voice/font/stamp creation | **NOT RUN** | Deferred; existing assets still absent |

Exact full execution output: `QA-EXECUTION-STAGE6-BATCH-A.log`. Failed browser attempt: `BROWSER-ATTEMPT-STAGE6-BATCH-A.log`. The earlier non-visual QA evidence is preserved in `QA-REPORT-STAGES-0-5.md`.

**What these results mean:** The game starts and the tested server/game/scoring/security protocols pass. UI layout code and asset integrity checks pass. Actual pixel-level layout, touch and television overscan are **not yet certified**. This ZIP is for acceptance of Stage 6 Batch A, not a production-final Alpha.
