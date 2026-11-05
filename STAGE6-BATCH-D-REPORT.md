# FORGER'S FINGER — Stage 6 Batch D Report

**Version:** `1.1.4-stage6d` — complete local source ZIP, based on `1.1.3-stage6c`.  
**Approval scope:** final non-deployed Stage 6 test/reliability pass; existing visual identity maintained.

## Changes made

| File | Purpose | Result |
|---|---|---|
| `public/phone-stage6.css` | Move painting masthead content clear of the fixed Sound control, without hiding the logo or changing approved artwork | Chromium 320px/390px/landscape/tablet geometry PASS |
| `tools/start-local-recovery.ps1` | Display private-LAN TV URL so the original QR points to a reachable PC rather than `localhost` | LAN and HTTPS QR contents decoded correctly; native Windows execution NOT RUN |
| `README.md` | Clearer, simple launcher/LAN/QR/acceptance instructions | Documentation updated |
| `tools/browser-stage6d-*.py`, `tools/qr-stage6d-test.py` | Reproducible browser, protocol, layout, phone and decoded QR acceptance scenarios | See Stage D QA report; optional Python/Chromium packages only, not launch dependencies |
| `tools/qa.js`, `package.json`, `package-lock.json` | Version and accurate reporting boundary | Locked install / 12 QA gates / 42 Node tests PASS |
| `STAGE6-BATCH-D-QA.md`, `DEVICE-ACCEPTANCE-CHECKLIST.md`, `STAGE6D-BROWSER-EVIDENCE/` | Technical handover and physical acceptance checklist/evidence | Delivered |

## Full-game checks

- Real server code/protocol tested through three-browser clients for joining, tutorials, painting strokes/acknowledgement, auction, reveal and guinea ledger.
- Separate real-server three-round game reached final, including a losing 100-guinea bid (genuine transfer), favourite-vote points, final podium/medals and original gallery with Next/Pause.
- Framed paintings rendered for **3, 4, 6 and 8** players at **720p, 1080p and 4K**: all 12 combinations within viewport and non-overlapping.
- Phone drawing controls and canvas rendered at **320×568, 390×844, 844×390 and 768×1024**. Fixed the discovered Sound/logo overlap.
- Decoded the dynamically generated QR into correct local LAN and HTTPS joining URLs. No tokens in QR.
- All **26 approved artwork files unchanged**. Existing two collections, bidding, scoring, tutorials and 14 MP3 assets retained. No replacements or paid integrations.

## Explicit acceptance boundary

This is a **local Batch D acceptance candidate**, not a remotely deployed or hardware-certified Alpha. Chromium network navigation is administratively blocked; browser interactions were bridged into a real local Node WebSocket server, while protocol tests separately use real WebSockets. True phone/casting/overscan and sound quality tests require devices. Windows launcher behaviour requires a Windows run. Hosted restart recovery requires a durable adapter.

**No GitHub push, merge, branch deletion, Render deployment, production database change or paid service.**

## Next physical test

Use the included `START-FORGERS-FINGER.bat` and follow `DEVICE-ACCEPTANCE-CHECKLIST.md`, beginning with TV opened at the LAN address printed by the launcher. Report only failures/screenshots so we can fix specific issues, not redesign everything. Do not deploy until the hardware and durable-store acceptance gates are addressed.
