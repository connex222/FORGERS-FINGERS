# FORGER'S FINGER — Non-Visual Repair Report

**Release:** v1.1.0-prealpha | **Date:** 4 November 2026 | **Source:** supplied `forgers-finger(4).zip`, v1.0.0 | **Scope:** Stages 0–5 of supplied Master Repair Prompt | **Stage 6:** plan only, awaiting approval.

## Stage 0 — original baseline

The supplied archive contained `server.js` (original single-file rules/socket/HTTP engine), `decks.js`, `package.json`, `public/index.html`, `public/tv.html`, `public/shared.js`, `README.md`, `GRAPHICS_PROMPT.md` and `public/assets`. The 26 supplied `.png`/`.webp` image files were well formed; the missing genuine seal, two font files and 14 sound files were not present. Family had 54 records; After Hours had 54; exact catalogue/title pair duplicates: 0 in each. The source declared `ws` but had no lockfile or installed dependency; the network package registry was unavailable. Node syntax checks of `server.js`, `decks.js`, `shared.js` passed before edits. Untouched user source ZIP retained separately in the working environment; asset checksums are included in `ARTWORK-CHECKSUMS.sha256`.

Original message types: `tv_create`, `tv_resume`, `join`, `ping`, `avatar`, `settings`, `confirm_adult`, `cmd`, `tv_cmd`, `drawing`, `bid`, `heart`; server replies: `tv_ok`, `joined`, `error`, `state`, `lots`, `toast`, `sfx`, `pong`. New controlled messages: `pass`, `drawing_received`, `bid_accepted`, `pass_accepted`. Phase flow stays `lobby → intro → draw → auction → reveal → scores → next round/final → lobby`, with `void` on missing art. The original server generated the order once/twice, skipped disconnected Masters and used in-memory timeouts.

## Severity-sorted implementation matrix

| Gate/severity | Identified defect / risk | Changed files | Corrective action | Automated test evidence | Result |
|---|---|---|---|---|---|
| 1 — CRITICAL | Public `pid` took over any phone/Curator | `server.js`, `public/index.html` | Private 256-bit per-phone token; hashed verification, owner binding, safe legacy migration | `security.test.js`, `recovery.test.js` | **PASS** |
| 1 — CRITICAL | TV resume wrong token created new gallery / allowed stolen session | `server.js`, `public/tv.html` | Explicit TV resume rejection; token hash; active TV ownership | `security.test.js`, `recovery.test.js` | **PASS** |
| 1 — CRITICAL | Stale sockets, cross-room controls, malformed commands | `server.js`, `lib/transport.js` | Ownership guard, roles/phases, typed values, limits, strict drawing parser, origin check, heartbeat, HTTP headers | `security.test.js`, `protocol.test.js`, `http.test.js` | **PASS** |
| 2 — CRITICAL | Unaffordable 300-gns bid created guineas out of nothing | `lib/rules.js`, `server.js` | Exact affordability check at server acceptance; actual buyer/forger transfer; no debt clamp exploit | `scoring.test.js`, `protocol.test.js` | **PASS** |
| 2 — CRITICAL | Pass, repeated bids, duplicate payout, Master/pass verdict error | `server.js`, `lib/rules.js`, phone HTML | Pass counts as decision, not a bid; one-time settlement, explicit acceptance; stable verdict/heart awards and transfer statistics | `scoring.test.js`, `flow.test.js` | **PASS** |
| 3 — HIGH | Reconnect dropped strokes, duplicated submissions, timer overlap | `server.js`, `public/index.html` | Round-specific drawing IDs, ACK, local persistence until ACK, retry, phase timer epochs | `protocol.test.js`, `recovery.test.js` | **PASS** |
| 3 — HIGH | Lost in-process room state on local restart | `lib/persistence.js`, `server.js`, launcher | AES-256-GCM atomic local snapshots; restore deadlines, all scores, history, votes, bids; no live socket serialization | `recovery.test.js` | **PASS — local only** |
| 3 — HIGH | Production instance restart durability | Persistence integration | **Not configured**: Render's default filesystem is not a durable store; explicit external adapter/provider and hosted restart test required | No real production restart test | **BLOCKED** |
| 3 — HIGH | Temporary Wi-Fi loss / Curator races / low-player ending | `server.js` | Deterministic first-connected Curator, obsolete socket revocation, phase recovery and 15 s low-player grace | `recovery.test.js`, `protocol.test.js` | **PASS — automated** |
| 4 — HIGH | No npm lock, executable QA, testable rules | `package.json`, `package-lock.json`, `lib/`, `tests/`, `tools/` | Node 22+ with no external npm dependencies, offline `npm ci`, pure rules and automated tests | `npm ci --offline`, `npm test`, `npm run qa` | **PASS** |
| 4 — HIGH | Browser-level end-to-end acceptance | `tools/browser-qa.py` | Browser automation implemented and attempted; local browser policy blocks navigation | Chromium `ERR_BLOCKED_BY_ADMINISTRATOR` | **NOT RUN / environment blocked** |
| 5 — MEDIUM | No QR / manual join only | `lib/qr.js`, `server.js`, `public/tv.html` | On-origin QR SVG with exact room link, no private credentials in URL | `qr.test.js`, `http.test.js`, independent QR decoder check | **PASS** |
| 5 — MEDIUM | Wrong bid display, no Pass, no instructions | `public/index.html`, `public/tv.html`, `public/shared.js` | Minimal balance/affordability and acceptance indicators, Pass, accurate How to Play modal | Script syntax and protocol tests | **PASS — code; browser manual pending** |
| 5 — MEDIUM | Audio mute state reverted on reload | `public/shared.js`, `public/tv.html` | Persist enabled/music/effects/voice selections; don't turn sound on automatically after opting out | Static QA; browser runtime blocked | **PARTIAL** |
| 5 — MEDIUM | Missing sound/seal/fonts / licensing | No original assets changed | Honest present/missing inventory and future sound cue plan | Header/dimension tests, file inventory | **PARTIAL / DEFERRED** |
| 5 — MEDIUM | Deck correctness / feature scope | `decks.js` unchanged | Exact-pair duplicate scan (0/54 and 0/54), no editorial rewrite, no new modes | Node content scan | **PARTIAL — editorial certification not claimed** |

## Decisions and changes that affect existing clients

- A `pid` is a **public identifier**, not an authentication secret. New `resumeToken` stays on its owner's phone only. Legacy pid-only sessions must rejoin from the lobby; this intentional migration prevents the original takeover flaw.
- `tv_resume` never creates a new gallery when the supplied code/token is invalid. Reloading without stale credentials explicitly starts a new gallery.
- One eligible Head Curator at a time: the first **connected** person by original join order inherits the role. Reconnected former Curators do not automatically reclaim it; no dual leadership after socket handover.
- Every permitted bid is one integer unit (100/200/300 gns) with sufficient balance. Passing is allowed regardless of balance. A completed Pass is **not a bid** and leaves hearts available. A winning genuine guess wins its bid; a wrong guess produces an exact, traceable transfer; the Master earns a bonus only when some but not all genuine *actual* bids are correct.
- Settlement happens once per current round. Payout, `fooled`, `duped`, final awards and displayed delta all arise from the same pure calculation; no negative scores.
- Drawing ACKs use a per-round client submission ID. Before ACK the device retains the drawing; after an accepted submission its same ID can be retried safely. Blank/malformed/out-of-round drawings are rejected.
- Player-to-server actions are validated by live session/phase. Local room data is written only when explicitly configured, encrypted and never includes live socket handles or plaintext resume tokens. Browser local storage contains its own token only.
- The prior `ws` third-party dependency was replaced with an intentionally small RFC 6455 transport so `npm ci --offline` and network tests work without any external dependency. This transport is tested but **has not been independently protocol-fuzzed or security-audited**. Production review of its protocol implementation is recommended before public release.

## Remaining risks / blockers

1. **Hosted restart recovery BLOCKED** until a real durable provider is selected, configured and tested on the intended single-instance host. Current `.room` files are protected locally but Render filesystem persistence must not be assumed. Multi-instance clustering is outside this delivery.
2. **Browser/user acceptance NOT RUN.** Headless Chromium launched but its administrator policy rejected `http://127.0.0.1:<port>/tv` (`net::ERR_BLOCKED_BY_ADMINISTRATOR`). Real Windows/Android/iOS phone and TV/casting checks, browser autoplay and drawing touch gestures remain outstanding. Static JavaScript syntax and Node protocol/flow tests pass.
3. **Assets missing**: `stamp-genuine.png`, 14 original MP3 files, both `.woff2` fonts. No silent placeholders or unauthorised generic artwork were inserted. Source artwork licensing/redistribution rights require independent confirmation.
4. **Voice and AAA UI deferred**. Lord Gavelby audio is a design brief, not a supplied voiced narration. A Quick Game mode would change established pacing and is deferred pending explicit rules approval.
5. **Editorial completion**: all approved Family/18+ content preserved, but only exact-pair duplicate scans were run; no independent proofread/suitability or licensing certification is claimed.

## Files modified and added

**Changed:** `server.js`, `package.json`, `README.md`, `.gitignore`, `public/index.html`, `public/tv.html`, `public/shared.js`.

**New:** `package-lock.json`; `lib/rules.js`, `lib/transport.js`, `lib/persistence.js`, `lib/qr.js`; `tests/*.test.js`, `tests/helpers.js`; `tools/qa.js`, `tools/asset-audit.js`, `tools/browser-qa.py`, `tools/start-local-recovery.ps1`; Windows launcher/QA `.bat`; `CHANGELOG.md`, `REPAIR-REPORT.md`, `QA-REPORT.md`, `ASSET-MANIFEST.md`, `UI-UPGRADE-BRIEF.md`, `ARTWORK-CHECKSUMS.sha256`.

**Unchanged:** `decks.js`, `GRAPHICS_PROMPT.md`, all 26 original image files, original collection data and premium character artwork.

**Release instruction:** Keep the current production repository and service untouched. Examine reports, complete manual/device and provider checks, then authorise any deployment explicitly.
