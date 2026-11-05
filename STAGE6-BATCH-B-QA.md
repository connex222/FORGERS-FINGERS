# FORGER'S FINGER — Stage 6 Batch B QA Report

Release: `1.1.2-stage6b`. Environment: Linux, Node.js 22.16.0, npm, no external npm dependencies.

## Executed checks

| Command / check | Result | Evidence |
|---|---|---|
| `npm ci --offline` | **PASS** | Locked dependency installation, 0 vulnerabilities reported; `LOCKED-INSTALL-STAGE6-BATCH-B.log` |
| `npm run qa` | **PASS** | 11/11 QA gates; 35/35 tests; `QA-EXECUTION-STAGE6-BATCH-B.log` |
| `node --test tests/stage6b-ceremony.test.js` | **PASS** | 6/6 new tests (included in full run) |
| Asset SHA-256 manifest comparison | **PASS** | All 26 approved image assets byte-for-byte unchanged |
| CSS syntax parsing (`tinycss2`) | **PASS** | No parser errors in `public/tv-stage6b.css` |
| Chromium `set_content` with rendered project HTML/CSS and injected mock states | **PASS, limited scope** | 4 viewports × 3 TV phases = 12 render measurements; checked medal cards, gallery frame/controls, ledger cards, reveal frame/verdict; zero detected out-of-view cards and zero JS page errors |
| Chromium actual local-server navigation (`goto`) | **NOT RUN / BLOCKED** | `net::ERR_BLOCKED_BY_ADMINISTRATOR`, including `data:` and `file:` navigations; no genuine end-to-end match run |
| Physical TV, tablet and phones | **NOT RUN** | Requires user device acceptance |
| Hosted Render restart persistence | **BLOCKED** | No durable backend connected; existing local encrypted recovery is not a Render durability guarantee |

## Test coverage

Existing Stage A and core test sets cover WebSocket security, room permissions, reconnection, scoring, bid affordability, favourites, round completion, persistence abstraction, HTTP serving, QR join, retained drawing, all 26 asset hashes, 3/4/6/8 auction lot arrangements, and phone painting controls. The **six Batch B tests** cover arithmetic consistency in settled ledger lines, Master bonus/no bids/3–8 player rows, detection of inconsistent client presentation data, escaped user-supplied strings, actual render templates for reveal/favourites/medals/gallery navigation, and live serving of the new CSS.

The Chromium static render is a **layout test** with realistic injected game data and approved art; it cannot verify real sockets, server updates, round deadlines, browser reload or touch input. The rendering check first detected a clipped second row of awards on 1080p/768p; layout was corrected and the same measurements rerun successfully.

## Acceptance still needed

- 3/4/6/8 live players and once/twice Master rotations; Family and After Hours.
- Real auction outcome combinations: none correct, all correct, some correct, no bids, unaffordable pass, tied favourites.
- Check 720p, 768p, 1080p and 4K with TV overscan, and confirm labels/medals/painting gallery against actual photographs/screenshots.
- Gallery Next/Previous/Pause on a real browser; long titles and names, missing drawings and early Curator actions.
- Reconnect in every phase and genuine session recovery across a local restart; hosted durable recovery remains blocked.

**QA result:** Automated core **PASS**. Browser E2E and physical-device acceptance **NOT RUN**. Do not label this as fully release-certified Alpha.
