# FORGER'S FINGER — Stage 6 Batch A Implementation Report

**Release:** `1.1.1-stage6a` (local development ZIP; no deployment).
**Source:** tested `FORGERS-FINGER-PRE-ALPHA-REPAIRED.zip` and user-approved four-screen Stage 6 design pack.
**Scope authorised by approval notes:** Batch A only — TV shell/lobby, responsive 3–8 painting auction gallery, phone drawing interface. Stage B awards/reveal makeover and new graphics/audio remain separate.

## Implemented

| Screen | Changes | Retained unchanged |
|---|---|---|
| TV shell | Viewport-sized stage; no permanent 1920×1080 JavaScript transform. Responsive safe insets, top bar, controls and Gavelby footer; provisional overflow guards for legacy phases. | TV message protocol, control permissions, auctioneer image and backgrounds |
| TV lobby | Enlarged original logo; live QR, legible four-letter code, compact collection/settings panel, 4×2 portrait wall with connected/disconnected status, Head Curator and Start controls. | Eight approved avatars, QR server, actual room code, player state |
| TV gallery | Dynamic rows/columns (3→3×1; 4→2×2; 5/6→3×2; 7/8→4×2), CSS height-fit 3:4 original gilt frames; safe lot labels. The data remains live, not a static image. | Original frame asset, player-submitted canvases, bidding, timer, privacy |
| Phone painting | Dark Victorian studio presentation, original logo/portrait, confidential prompt, live timer, larger responsive 3:4 canvas, palette/brush/Undo/Wash/Clear/Submit and retained-ink acknowledgement note. Portrait and landscape rules, explicit Help control. | Drawing protocol, draft in session storage, server ACK, retry, pointer capture, Master secret restrictions |
| Non-visual core | **No changes.** | Server, room state/recovery, scoring, permissions, decks, reconnect tokens |

## Files changed or added

- Modified `public/tv.html`: new lobby markup, responsive gallery CSS-grid parameters, removed fixed stage scaling.
- Modified `public/index.html`: drawing header/prompt/artist controls and local layout state, without changing drawing submissions or acknowledgements.
- Modified `public/shared.js`: pure `FF.galleryGrid()` layout helper.
- Added `public/tv-stage6.css` and `public/phone-stage6.css` (styles separated from original).
- Added `tests/stage6-layout.test.js` (six executable tests).
- Updated release documentation and reports. All 26 art assets remain byte-for-byte unchanged.

## Technical QA summary

- `npm run qa`: **PASS** — 11/11 gates; 29/29 Node tests; syntax, HTTP/static files, drawing, security, scoring, recovery, QR, deterministic match invariants and gallery grid checks.
- Stage 6 custom tests: 6/6 PASS, including 26/26 original PNG/WebP asset hashes.
- Additional CSS parsing (`tinycss2`): both new CSS files parsed without error.
- `tools/browser-qa.py`: **BLOCKED / NOT RUN**. Chromium starts but any local page navigation returns `net::ERR_BLOCKED_BY_ADMINISTRATOR`; this is not a screenshot or pixel-overflow PASS.
- Hosted Render recovery: **BLOCKED** pending truly durable configured storage; unchanged from prior release.

## Manual acceptance on own devices (not falsely marked PASS)

1. Launch `.bat`, open TV at 1280×720, 1920×1080 and 3840×2160 (and a TV with overscan). Confirm lobby code/QR, eight portrait slots, Gavelby, How to Play and Start never clip.
2. Join 3/4/6/8 players. During auction confirm row/column layouts, all original frames, lot plaque visibility and correct drawing-to-lot mapping. Repeat with a disconnected artist.
3. Test phone painting at 320×568, 360×800, 390×844, 430×932 and landscape/tablet: make strokes, Undo/Wash/Clear; rotate; refresh; ensure ink remains and submits exactly once after server acknowledgement.
4. Complete a match in Family and After Hours with both rotation settings; inspect legacy reveal, ledger, final and rematch for no crop. Stage B will redesign these screens once Batch A is accepted.

**Known residual work:** Stage B styled reveal/ledger/final awards, Stage C graphical tutorial/new original art and licensed audio, Stage D full device regression. Existing missing 14 MP3s, two fonts and `stamp-genuine.png` were not fabricated.

**GitHub/Render:** unchanged. **Approved original art:** unchanged. **New art:** none generated.
