# FORGER'S FINGER — Stage 6 Batch B Implementation Report

**Release:** `1.1.2-stage6b` (local, not deployed).  
**Source:** the complete tested Stage 6 Batch A ZIP.  
**Approval:** continuation of the four approved visual concepts, with Batch B limited to reveal, settled-score ledger, final awards, podium and genuine painting gallery.

## What changed

| Area | Implemented in Batch B | Key safeguard |
|---|---|---|
| TV reveal | Responsive original gilt frame beside a clear auction verdict; names, payments, genuine-bid bonuses and Master bonus explained. Existing genuine-stamp text fallback retained where the missing image is absent. | Real deductions come from server-settled `results.transfers`, not hypothetical amounts. No early exposure of the secret title. |
| People's Favourite | The original rosette on responsive 1–8 winning paintings, with tie bonuses and accurate true-title caption. | Existing `heartWinners` from server are authoritative; no client votes or awards generated. |
| Guinea ledger | Before/after balance, round delta, genuine-bid winnings, actual forger income/loss, Master bonus and tied Favourite bonus; 6–8 players use two columns. | `FF.roundLedger()` is a **display-only** reconciliation against the server's settled deltas. If data disagree, it shows a discrepancy instead of fabricating a balancing entry. |
| Final podium | Responsive three-place podium with all original approved portrait images; remaining standings retained in a compact ribbon. | Server ranking preserved. No client selection of winner. |
| Special awards | Four approved medal images enlarged (up to 200 CSS pixels) and shown with winning player and explanatory statistics. | Original `award-forger`, `award-gullible`, `award-favourite`, `award-eagle` files unchanged. The layout was reduced after browser rendering caught the bottom-row medals being clipped. |
| Genuine gallery | Large original gilt frame, submitted genuine drawings, true titles and Master names; automatic gallery rotation plus **Previous**, **Next**, **Pause/Play** controls. | Uses only server-provided final history, no invented or prefilled paintings. Timer cleared between phases. Empty-gallery state handled. |

## Files changed

- `public/tv.html`: existing reveal, favourite, scores and final render functions updated; gallery keyboard-accessible button controls included.
- `public/tv-stage6b.css`: **new** independent stylesheet for Stage B layouts, accessible controls and reduced-motion support. Existing Stage A CSS remains unchanged.
- `public/shared.js`: added pure `FF.roundLedger()` presentation/reconciliation helper. Drawing, sockets, avatar image paths and sound engine are unchanged.
- `tests/stage6b-ceremony.test.js`: **six** new automated tests: ledger transfers, Master bonus, mismatch detection, actual TV rendering HTML, original asset integrity, live stylesheet serving.
- `package.json` and `package-lock.json`: consistent release version `1.1.2-stage6b`; no new dependencies.
- Release documentation, Windows instructions, QA log and report refreshed.

**Not changed:** `server.js`, scoring rules, room authentication, encrypted room persistence, `decks.js`, `public/index.html`, `public/phone-stage6.css` and every original art asset. No new art was generated.

## QA outcome

- `npm ci --offline`: **PASS**, zero external dependencies.
- `npm run qa`: **PASS**, 11/11 gates; **35/35** tests.
- All 26 original asset SHA-256 hashes: **PASS** (byte-identical).
- CSS parsed with `tinycss2`: **PASS**; no syntax errors.
- Static Chromium render with injected test states: **PASS for checked elements** at 1280×720, 1366×768, 1920×1080 and 3840×2160. The test covered *final, scores and reveal* in all four sizes (12 snapshots, zero page errors, no tested cards or frames outside the TV content view). This is not a real server-driven browser E2E match.
- Full navigation-based Chromium integration test: **NOT RUN** — this environment blocks all browser navigations with `net::ERR_BLOCKED_BY_ADMINISTRATOR`, including localhost. Multiplayer browser/device acceptance remains required.
- Production Render restart persistence: **BLOCKED** pending durable hosting storage/adapter; unchanged from Stage A.

## Known remaining work and next stage

**Stage 6 Batch C (not started):** graphical How to Play tutorial (Play/Pause/Next/Previous/Back to Lobby), approved visual treatment for the missing genuine stamp, original redistributable music/SFX, optionally approved Lord Gavelby narration, and font/licence review. The 14 expected MP3 files, two font files and `stamp-genuine.png` remain missing. Do not call audio complete without actual tested assets.

**Stage 6 Batch D (not started):** live multiplayer/device acceptance with 3/4/6/8 players, both decks, single/double laps, TV overscan, actual phone cameras and real reconnects. Test all final layouts at home and confirm the user-approved appearance on the target TV before any deployment.

**GitHub and Render:** UNCHANGED. **No database migration.**
