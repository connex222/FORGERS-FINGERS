# FORGER'S FINGER — Stage 6 Batch C QA Report

**Test date:** 5 November 2026. **Environment:** Linux; Node.js 22.16.0; ffmpeg/ffprobe; optional system Chromium with Playwright for isolated DOM rendering. **Build:** 1.1.3-stage6c. No external npm dependencies.

| Test gate | Status | Evidence |
|---|---|---|
| Locked install, `npm ci --offline` | **PASS** | Package has no external dependencies |
| `npm run qa` | **PASS** | **12/12** static and integrated QA gates, full log `QA-EXECUTION-STAGE6-BATCH-C.log` |
| `npm test` (also included in QA) | **PASS** | **42/42** Node tests, 0 failed, 0 skipped; includes all 35 Batch B tests |
| Tutorial cross-platform inclusion/content/audio settings | **PASS** | Seven added Node tests in `tests/stage6c-audio-tutorial.test.js` |
| New audio bitstream validity | **PASS** | All **14/14** genuine MP3 bitstreams, size >4.5KB, distinct SHA digests |
| MP3 decoder check | **PASS** | All **14/14** files decoded by FFmpeg without error; detailed `STAGE6C-AUDIO-DECODE.log` |
| HTTP service and MIME | **PASS** | Tutorial HTML assets + all 14 MP3s served as 200 OK and correct type |
| Original approved artwork byte integrity | **PASS** | **26/26** original SHA-256 checks match `ARTWORK-CHECKSUMS.sha256` |
| CSS syntax | **PASS** | `tinycss2` parsed tutorial + three existing Batch A/B stylesheets; no parse errors |
| Isolated Chromium tutorial interactivity | **PASS** | Play, Pause, Next, Previous, Escape/Back, no page JS exceptions in 4 viewports: TV 1920×1080, phone 390×844, phone 320×568, tablet 768×1024 |
| Isolated viewport controls clipping | **PASS** | Tutorial controls inside all four test viewports; 4 example screenshots in `STAGE6C-BROWSER-PREVIEWS/` |
| Full browser-to-WebSocket multiplayer acceptance | **NOT RUN** | Chromium navigation to localhost blocked by administrator (`net::ERR_BLOCKED_BY_ADMINISTRATOR`), despite Node HTTP/WebSocket tests passing |
| Actual TV speaker, phone audio playback and Gavelby accent | **NOT RUN** | Devices/approved regional voice unavailable; MP3 decoder checks are not a listening test |
| Real cross-device QR, Wi-Fi drop, casting, overscan | **NOT RUN** | Requires user's own devices |
| Production Render durable restart recovery | **BLOCKED** | No durable DB/storage adapter configured; unchanged from previous release |

**Automated gate breakdown:** 7 JS syntax/static checks, 2 inline browser-script syntax checks, 1 tutorial JS syntax check, 1 asset audit, 1 integration test runner = 12/12. The Node test runner executes all 42 individual tests, spanning critical server identity, scoring, recovery, gameplay and Stage 6 layouts/audio.

**How to reproduce (Windows):** Double-click `RUN-QA.bat`; it uses the installed Node.js and requires no additional packages. The separate optional `tools/browser-stage6c-qa.py` needs Python, Playwright and Chromium, but was executed here and is *not* required to launch the game. `tools/generate-original-audio.py` requires NumPy and FFmpeg if you want to regenerate audio; MP3s are already bundled and runnable without either tool.

**Scope limitation:** Passing 42 automated tests and isolated render checks does not establish a production release or a physically accepted theatrical sound mix. Stage D is still required. GitHub and Render were not changed.
