# FORGER'S FINGER — Technical QA Report

**Build:** 1.1.0-prealpha | **Test date:** 4 November 2026 | **Environment:** Linux x86_64, Node.js v22.16.0, npm 10.9.2.

**Scope:** Local authorised non-visual repair testing. No GitHub push, Render deploy, database changes or live production galleries.

## Executed commands and results

| Command / gate | Result | Details |
|---|---|---|
| Baseline `node --check server.js`, `node --check decks.js`, `node --check public/shared.js` | **PASS** | Original files parse; gameplay defects still present in baseline. |
| Baseline npm registry resolution | **NOT RUN (network unavailable)** | Registry lookup returned `EAI_AGAIN`; original `ws` dependency was not installed and original archive lacked a lockfile. |
| `npm ci --offline` | **PASS** | Repaired package has lockfile v3 and no external npm dependencies. |
| `npm test` | **PASS** | **23 passed / 0 failed / 0 skipped**, Node built-in test runner. |
| `npm run qa` | **PASS** | **11 of 11 scripted gates**: 7 Node JS syntax, 2 inline browser-script syntax, 1 asset audit, 1 full test suite. The suite again reported **23/23 passing tests**. |
| Direct QR conformance and decoding | **PASS** | Independently cross-checked QR matrix against Python `qrcode` for multiple data lengths and decoded a generated join QR with OpenCV. |
| Original approved image checksum comparison | **PASS** | All **26 source image files** retained byte-for-byte. Dimensions/formats verified using Pillow. |
| Automated browser end-to-end: `python tools/browser-qa.py` | **NOT RUN / BLOCKED** | Chromium launched but page navigation to `http://127.0.0.1:<testport>/tv` was denied by environment policy: `net::ERR_BLOCKED_BY_ADMINISTRATOR`. This is not a browser/gameplay PASS. |
| Real Android/iOS phones, Windows launcher, casting/TV | **NOT RUN** | Actual devices and Windows execution were unavailable in the test environment. |
| Hosted durable storage and live host restart | **NOT RUN / BLOCKED** | No authorised durable production provider/configuration; local disk snapshots cannot guarantee Render restart durability. |

`npm run qa` checks the Node test suite, but does **not** count browser acceptance as passing. A successful technical QA command does not certify the complete product for public production use.

## Automated coverage actually executed

The 23 `tests/*.test.js` cases exercise these security, scoring and multiplayer paths:

- Public player-ID impersonation rejection, bad cross-room tokens, illegal TV resume and active-socket revocation.
- Message validation, Origin checks, rate limits, HTTP health/static responses, missing routes, and QR join links.
- Affordability for 0/50/100/200/300/1,000-guinea balances; invalid and repeated bids; unaffordable settlement prevention; Pass versus real bids.
- Correct and incorrect auction decisions, Master verdict edge cases, People's Favourite ties, transfer/stat invariants and one-time settlement.
- Drawing acknowledgement and idempotent retries, invalid/late submissions, isolated simultaneous galleries and Curator handover.
- Valid phone and TV resumptions at all phases, encrypted local restart restoration, expired-deadline restoration, no duplicated payment, voided rounds, lobby cleanup.
- 3, 4, 6 and 8 players, one- and two-lap rounds, both Family and After Hours collections, final awards and rematch; additional deterministic seeded rule checks.

Tests assert network/state output rather than only syntax. They are local simulations, **not** proof of a full Android/iOS, Wi-Fi or Chromecast/TV acceptance run. `tools/browser-qa.py` is supplied as a starting point for later permitted browser testing.

## Remaining reproducible acceptance and release checks

1. **Manual multi-device browser check — NOT RUN:** On the same private Wi-Fi, open the TV gallery in a browser and join 3, 4, 6 and 8 phones. Test QR scanning and manual code, responsive screens, canvas drawing/Undo/Clear/Submit, painting ACK after a Wi-Fi interruption, bid/Pass/favourite voting, reveal, guineas, final awards, rematch and audio settings. Repeat with Family and After Hours. Test portrait and landscape, desktop and casting to TV, and autoplay/mute persistence.
2. **Windows launcher — NOT RUN:** Double-click `START-FORGERS-FINGER.bat`, accept a Private-network firewall prompt if needed, reload TV/phone while playing, stop/restart with the same `.local-data`, and check that recovery succeeds. Test `RUN-QA.bat` too.
3. **Hosted restart durability — BLOCKED:** Select and configure a genuinely durable provider/adapter, then restart the actual host mid-drawing, mid-auction and after settlement and confirm no duplicate guineas. Do not count local AES-256-GCM snapshots on a potentially ephemeral disk as production persistence.
4. **Independent WebSocket audit — NOT RUN:** The zero-third-party RFC 6455 transport is exercised by integration tests, but was not protocol-fuzzed or independently security-audited.
5. **Asset/sound verification — PARTIAL:** All 26 original image assets verify. `stamp-genuine.png`, 14 MP3 files and two `.woff2` fonts were absent; playable music, sound effects and Lord Gavelby narration cannot be signed off. No empty/silent substitutes used.
6. **Content and licensing audit — NOT RUN:** Family and After Hours each have 54 entries and no identical catalogue/title pair duplications; independent editorial approval and redistribution rights have not been verified.

## Gate sign-off

| Area | Status | Qualification |
|---|---|---|
| Critical security | **PASS — local automated** | Impersonation, stale sockets, roles and sessions tested; independent external audit outstanding. |
| Critical scoring | **PASS — local automated** | No unaffordable bids or artificial losing transfers, scoring once, supported player counts. |
| High multiplayer and recovery | **BLOCKED for hosted release** | Local reconnect/restart tests PASS; durable hosted restart unconfigured. |
| High automated QA | **PASS — available tests** | Node 23/23; browser/device acceptance NOT RUN. |
| Medium functional completeness | **PARTIAL** | QR/Pass/help/sound-state code present, browser interaction testing pending; original missing assets remain absent. |
| Original art | **VERIFIED** | All 26 images retained unchanged. |
| AAA UI redesign | **NOT STARTED** | Separate plan only; requires approval. |
| GitHub/Render | **UNCHANGED** | No live changes. |

**Conclusion:** This is a technically repaired **pre-Alpha candidate**, not a fully accepted, hosted Alpha. All executable core automated checks passed; the explicitly listed browser, hosted recovery and media blockers remain.
