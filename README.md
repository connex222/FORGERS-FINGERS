# FORGER'S FINGER

**Private games-night game for 3–8 people.** One TV/browser is the gallery; phones are paintbrushes and auction paddles. UK English. Family and After Hours (18+) collections retained.

**Live game (as linked from Games Night):** https://forgers-fingers-1.onrender.com

Current version: `1.1.7-auctions` (see `package.json` and `AUCTION-RELEASE-1.1.7.md`). Automated verification is complete; physical-device acceptance and durable hosted restart recovery remain outstanding.

The steps below are for playing on your own PC over home Wi-Fi.

## Latest auction release

The sealed-auction update shortens reveals, explains both financial outcomes before bidding, conceals Pass versus wager until the reveal, adds a bounded optional Heart window, fixes joint-winner ranking, and hardens reconnection retries. **All 26 approved art assets and original scoring payouts remain unchanged.** Read `AUCTION-RELEASE-1.1.7.md` for the deployment evidence and remaining physical-acceptance limitations. The older Stage 6F notes below are historical build records, not the current deployment status.

## Windows: the easy way (no individual code lines)

1. Download the complete Stage 6 Batch D ZIP and right-click **Extract All**.
2. Install **Node.js 22 or newer** from <https://nodejs.org/> if it is not already installed.
3. Open the extracted `forgers-finger` folder.
4. Double-click **`START-FORGERS-FINGER.bat`**. If Windows asks permission for Node.js on your **private** home network, allow it for Private networks only.
5. For phone/TV play, use the **LAN TV address printed in the launcher window** (for example **http://192.168.1.42:3000/tv**) in your TV or PC browser. **Do not open the TV using localhost if you want to scan the QR code with phones**: that QR would incorrectly point to each phone’s own device. For one-PC testing without phones, **http://localhost:3000/tv** is fine.
6. On each phone, scan the large QR code (now a built-in PNG with an SVG fallback) or enter **`http://YOUR-PC-IP:3000`** and type the gallery code. Phones need to be on the **same private Wi-Fi/LAN**, and Windows Firewall must allow Node.js on **Private networks only**. If several PC addresses are shown (e.g. VPNs), choose the Wi-Fi or Ethernet IPv4 address under Windows **Settings → Network & internet → Properties**.
7. Join 3–8 people. The Head Curator chooses the collection, painting time and rotations, then starts.
8. To stop the game, return to the black console window and press **Ctrl+C**, then close it. Do not close that window during a match.

`START-FORGERS-FINGER.bat` performs the offline locked installation automatically. There are **zero external npm dependencies**, so an npm-registry connection is not required. It uses a Windows user-protected local recovery key and encrypts saved rooms in the local `.local-data` directory. Protect this folder; do not upload it to GitHub. If you delete it, saved galleries cannot be recovered. The private reconnect credential lives in each phone's local browser storage; clearing browser data loses that device's ability to resume.

If the launcher is blocked by local PowerShell policy, open a command prompt in this folder, run `npm ci --offline` once, then `npm start` (these are the fallback steps only). This fallback has no durable room recovery unless you configure the variables below.

## Run the complete technical QA

Double-click **`RUN-QA.bat`**. It runs syntax, asset and integrated tests automatically. Alternatively:

```shell
npm ci --offline
npm run qa
```

`npm test` runs the shipped automated tests independently; the current number and exact results are recorded in `STAGE6-BATCH-D-QA.md`. Browser-based acceptance requires a locally permitted Chromium/phone testing environment; see `QA-REPORT.md`.

## Gameplay and scoring

Each artist begins with **1,000 guineas**. The Master sees the secret genuine painting title during drawing; forgers see only the catalogue description. At auction the title is revealed and every eligible collector can **bid 100, 200 or 300 guineas**, provided their current balance covers the full bid, or **Pass**. The Master cannot bid. A heart can be given to one other artist's painting, even when passing.

A correct genuine bid **wins the amount bid**. An incorrect bid **transfers the amount bid** from buyer to the forger; it never creates an unaffordable payout. When **some but not all actual bids** identify the genuine painting, the Master gets **200 guineas per correct buyer**. The most-loved artwork receives **100 guineas** for its artist; ties each receive 100. The player with the most guineas after every Master's turn wins. The TV also awards the existing four medals.

Tap **How to Play** on the TV or phone to open nine illustrated chapters. **Play** starts the chapters, **Pause** stops them, **Next/Previous** move around, and **Back to lobby / game** returns you to the same screen without changing the game phase.

The 14 newly generated, actual MP3 files are included: two music pieces and twelve sound cues. **Sound is off until you enable it.** On TV, choose **Turn sound on** and use **Audio options** for separate Music, Effects and Voice preferences. On the phone, use **Sound off/on** near the top left, then choose the components you want. Phone background music starts off by default to avoid every phone playing music at once. All toggles remember your choices between rounds and page refreshes.

**Voice:** If your browser supplies speech synthesis, the optional Voice setting reads tutorial chapters and certain Lord Gavelby lines using a device-provided English voice (British voices preferred). It is **not** a recorded Northern English professional narrator; the exact voice depends on your device. Captions always remain available. If audio does not start automatically, use a sound button/tap first — browsers restrict unrequested playback.

## Security / reconnect behaviour

On first join, the server privately sends a random token to that phone. The visible `pid` and four-letter room code are **not** credentials. The device stores its reconnect token locally. The old server's pid-only resume is **not compatible**: previously joined phones must join again **with a name, in a fresh lobby**, once after this update. A previously opened TV without valid stored credentials also needs a new gallery code; an invalid resume never silently hijacks or creates another gallery.

If the Head Curator disconnects, the role passes to the **first connected player in original joining order**. A previous Curator who reconnects does not automatically take back the role. Players who disconnect during a game may rejoin with valid credentials. A drawing is retained locally until the server acknowledges it, and a retried submission cannot count twice. Round deadlines are authoritative on the server, not on clients.

## Local recovery / hosting limitations

The Windows launcher enables local restart recovery by setting `FF_DATA_DIR` and `FF_PERSISTENCE_KEY` to a user-protected value. You can enable the same mechanism manually by setting **both** environment variables before `npm start`; the secret must be at least 32 characters. Never commit a key or `.room` files. The store uses AES-256-GCM encryption and atomic writes. The server restores the same room code, stable player IDs, settings, painting data, phase/deadline, scoring history, bids, votes and awards where the stored snapshot is intact.

**Render's ephemeral filesystem is not a durable store.** Do not assume local encrypted files make Render restarts recoverable. To enable production restart recovery, first select a truly persistent provider and implement/configure its adapter (for example a durable managed PostgreSQL database) and run restart tests on the real deployment. This project does **not** connect to any production database or create a paid service. Multiple server instances also require a shared state/room routing design. See the recovery blocker in `REPAIR-REPORT.md`.

## File map

- `server.js` — authoritative room/game server and security gates
- `lib/rules.js` — pure scoring / bid affordability
- `lib/transport.js` — small zero-dependency RFC 6455 WebSocket transport
- `lib/qr.js`, `lib/qr-png.js` — offline, scan-tested QR join links (PNG primary, SVG fallback)
- `lib/persistence.js` — opt-in encrypted local snapshot store
- `public/index.html` — responsive, approved Stage 6 phone painting layout
- `public/tv.html` — Stage 6 TV lobby, auction, reveal, ledger, final podium, medals and gallery
- `public/tv-lobby-premium.css` — Stage 6E gallery entrance makeover, preserving 26 approved artworks
- `public/phone-stage6.css`, `public/tv-stage6.css` — Batch A presentation overrides
- `public/tv-stage6b.css` — Batch B reveal/ledger/final presentation overrides
- `public/tutorial.js`, `public/tutorial.css`, `public/tutorial-chapters.json` — Batch C graphical tutorial
- `public/assets/sfx/` — 14 genuine original MP3 assets, locally synthesised, no external recordings
- `public/shared.js` — client session, sound and tested gallery layout helper
- `public/assets/` — **unchanged approved source artwork**
- `decks.js` — all original Family/After Hours content and Gavelby lines unchanged
- `tests/`, `tools/` — repeatable QA
- `REPAIR-REPORT.md`, `QA-REPORT.md`, `ASSET-MANIFEST.md`, `UI-UPGRADE-BRIEF.md` — handover

**Stage 6 Batches A, B and C are implemented and QA-tested locally.** The four preview designs were approved. The optional professionally recorded Northern voice, genuine-stamp artwork and licensed fonts remain deferred; physical device acceptance (Batch D) is next. All 26 original art files are unchanged. The final screen now includes Previous/Next/Pause controls for the genuine painting gallery. See `STAGE6-BATCH-C-REPORT.md` and `STAGE6-BATCH-C-QA.md` for current status.


## Stage 6 Batch D — acceptance boundary

The Browser/Node verification in `STAGE6-BATCH-D-QA.md` includes real server sessions, a real Chromium DOM via an isolated WebSocket bridge (necessary because this container blocks Chromium network navigation), 3/4/6/8-player paintings at simulated 720p/1080p/4K, and real MP3 decoder checks. **It is not a substitute for actual phone touchscreens, TV overscan, casting or listening tests.** For the simple physical checklist, see `DEVICE-ACCEPTANCE-CHECKLIST.md`.

No GitHub push, Render deployment or changes to the 26 approved images were made. No paid services were created. Production persistence remains blocked pending a real durable hosting adapter.

## Stage 6E: the gallery entrance and QR code

On a **desktop** (with mouse/trackpad), opening the public root URL without a room code now automatically opens `/tv` so the front page shows the gallery, private four-letter code and a prominent QR image. On a **phone**, opening the same root URL shows the phone join form, allowing manual entry. The QR link itself contains `?code=ABCD`, so phones **always stay on the join form** with the code entered. The **Join on this computer** link on the TV lobby opens `/?player=1`, which also stays on the phone/player controller view. An authenticated returning player is never redirected away from their saved session.

For testing, open **`https://forgers-fingers-1.onrender.com/tv`** directly in a TV/desktop browser. The QR image comes from `/qr.png?code=ABCD` on that host and points back to the same host. It contains **no private reconnect credential**. Do not use `localhost` on a remote phone or TV.

The Stage 6E lobby uses all eight existing, approved avatar portraits **as dimmed previews of vacant seats**; these preview images are not real connected players. When a player joins, the real player portrait and status replace the corresponding vacant seat. All 26 original artwork image files and the underlying multiplayer/scoring logic are unmodified.

## Stage 6F — Recorded Lord Gavelby (5 November 2026)

This release has nine Creative Claw / ElevenLabs Northern-English narration chapters and three premium auction effects. To use it locally, extract the ZIP and double-click `START-FORGERS-FINGER.bat`. Turn **Sound on**, then enable **Voice** in Audio options. The first playback needs internet access to Creative Claw unless you first double-click `DOWNLOAD-PREMIUM-AUDIO.bat` to save all 12 recordings in your extracted game folder. That download script does not deploy or upload anything.

See `STAGE6F-RELEASE-NOTES.md`, `STAGE6F-QA-REPORT.md` and `LORD-GAVELBY-STAGE6F-SCRIPT.md`. This build has not been deployed to GitHub or Render.
