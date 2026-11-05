# FORGER'S FINGER — Stage 6 Batch D QA

**Date:** 5 November 2026  
**Build:** `1.1.4-stage6d`  
**Scope:** local QA/acceptance; no GitHub or Render changes  
**Environment:** Linux, Node.js 22.16.0, Python 3.13, system Chromium with Playwright, FFmpeg/FFprobe. A Windows console, physical TV and physical phones were not available.

## Exact executed checks

| Check | Result | Evidence / qualification |
|---|---|---|
| Locked dependencies `npm ci --offline --ignore-scripts --no-audit --no-fund` | **PASS** | Zero third-party npm dependencies; `FINAL-LOCKED-INSTALL.log` |
| `npm run qa` (includes `npm test`) | **PASS** | **12/12 technical gates** and **42/42 Node automated tests**, zero failed/skipped; `FINAL-QA.log` |
| Source assets `sha256sum -c ARTWORK-CHECKSUMS.sha256` | **PASS** | **26/26 approved original files** identical to baseline |
| MP3 decode via `ffmpeg -loglevel error -i FILE -f null -` | **PASS** | **14/14** files decode without error; this is not an acoustic listening test |
| CSS parse with `tinycss2` | **PASS** | 4/4 tested stylesheets, zero parser errors |
| Native Chromium local game navigation | **NOT RUN** | Browser reports `net::ERR_BLOCKED_BY_ADMINISTRATOR` for local HTTP/file URLs; not an application HTTP failure |
| Real Chromium UI + real Node WebSocket game, **bridged transport** | **PASS** | TV creates room; three actual browser phone clients join; After Hours confirmation, Family reset, tutorial, pointer painting, draw acknowledgements, auction, reveal, ledger and sound on/off. `BROWSER-TEST-RESULTS.txt`; separate direct-browser networking **NOT RUN** |
| 3/4/6/8-player framed auction | **PASS** | Real Node room sessions rendered in Chromium at 1280×720, 1920×1080 and 3840×2160: **12/12 layout combinations**, no painting-frame overlap/out-of-screen bounding boxes. `GALLERY-TEST-RESULTS.txt` |
| 3-player complete multiplayer match to grand final | **PASS** | Real Node server, three rounds, correct and incorrect actions, one actual 100-guinea transfer, favourite votes, final awards, 3 genuine paintings, gallery next/pause; `FINAL-BRIDGE.log` |
| Grand final simulated TV dimensions | **PASS** | Three tested Chromium viewport sizes (720p/1080p/4K), gallery/podium/medals visible in rendered evidence |
| Phone drawing viewport, controls and logo | **PASS** | 320×568, 390×844, 844×390, 768×1024: canvas, Submit, Help and Sound button within viewport, all canvases at least 115×80, and **no logo/Sound overlap** after fix; `PHONE-RENDER-RETEST.log` |
| QR content decoded from **real server-generated SVG** | **PASS** | OpenCV QRCodeDetector reads generated PNG of SVG as both local-LAN URL and HTTPS URL; no private token in code; `tools/qr-stage6d-test.py` |
| Live cross-device QR camera scanning | **NOT RUN** | Requires actual phone camera and LAN connection |
| Native browser-to-server WebSocket handshake | **NOT RUN** | Chromium sandbox restriction. The Python browser bridge forwards browser-generated messages to a real Node WebSocket server but does not validate Chromium's native WebSocket handshake. Node protocol integration checks run independently. |
| Physical phone multi-touch, rotation and background/resume | **NOT RUN** | Requires physical devices; browser emulation is not physical phone testing |
| Real TV/casting/overscan and sofa legibility | **NOT RUN** | Requires TV/casting device and observation |
| Sound quality, audio mixing, loudness and browser-specific voice | **NOT RUN** | Audio decoding verified, listening/voice quality unverified; Gavelby narration remains browser-generated and device-dependent |
| Windows PowerShell launcher execution on Windows | **NOT RUN** | Launch script updated to print LAN TV URL; this container is Linux |
| Render/production process restart with durable storage | **BLOCKED** | No production durable-store adapter configured; local encrypted snapshots cannot guarantee restart recovery on ephemeral hosts |

**Automated test counts are independent checks, not one combined count.** `42/42` refers to Node tests; `12/12` refers to QA gates; `12/12` refers separately to live-server Chromium layout combinations. The gallery and final reports test the actual server's state and scores; Chromium's network traffic was bridged only because the environment blocks native browser navigation.

### Browser-run implementation

`tools/browser-stage6d-qa.py`, `tools/browser-stage6d-gallery.py`, `tools/browser-stage6d-final.py`, `tools/browser-stage6d-phone.py` and `tools/qr-stage6d-test.py` are **optional advanced test scripts**. They were run here using a Linux Chromium executable and Python optional packages, and are not needed for Windows play or normal `RUN-QA.bat`. Browser screenshots are in `STAGE6D-BROWSER-EVIDENCE/`; `.jpg` files are QA render evidence, not replacement artwork.

### Defects discovered and fixed during Batch D

1. **Drawing screen: logo and Sound button overlap** on small phones. Scoped CSS change to `public/phone-stage6.css`, verified at 320px and larger.
2. **Local QR setup risk:** a TV opened as `localhost` produces a QR pointing to each phone's own device, not the Windows PC. Updated the launcher to display the PC's suitable LAN TV address and revised `README.md` to insist on that URL for phone/TV play. Tested QR encoding at both LAN and HTTPS origins; real Windows/IP discovery still needs device acceptance.

### Known limitations before Alpha sign-off

- Physical TV + phone testing remains outstanding (see `DEVICE-ACCEPTANCE-CHECKLIST.md`). Until then, do **not** label this Alpha hardware-tested or commercially production-ready.
- Production durable restart recovery is **BLOCKED** pending a real durable provider/adapter and deployment test.
- Commercially authorised Northern English Gavelby narration, a genuine stamp PNG and licensed font files remain **NOT PRESENT**; existing functional text and font fallbacks remain.
- Original procedural music and SFX are functional MP3s but their artistic balance is **NOT YET LISTENING-APPROVED**.

**Outcome:** LOCAL AUTOMATED ACCEPTANCE **PASS**; PHYSICAL/PRODUCTION ACCEPTANCE **NOT RUN/BLOCKED**. GitHub and Render unchanged.
