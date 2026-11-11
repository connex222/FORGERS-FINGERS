# CLAUDE.md - Forger's Finger

Instructions for AI assistants working in this repository.

## What this is

Forger's Finger is a comedic Victorian art-forgery auction party game for 3 to 8 players. The TV is the gallery; phones are paintbrushes and auction paddles. Each round one Master paints the genuine work while the others paint forgeries, then everyone bids guineas. There are Family and After Hours (18+) collections.

- Live game (as linked from Games Night): https://forgers-fingers-1.onrender.com
- Gameplay and scoring rules: `README.md`
- Art prompts: `GRAPHICS_PROMPT.md`; narrator (Lord Gavelby) script and brief: `LORD-GAVELBY-*.md`
- QA and release history: `CHANGELOG.md`, `QA-REPORT.md`, `STAGE6*.md`

## Architecture

| Part | Location |
|---|---|
| Server (Node 22+, zero npm dependencies) | `server.js` |
| Rules and scoring | `lib/rules.js` |
| Network transport | `lib/transport.js` |
| Encrypted room saving and recovery | `lib/persistence.js` |
| QR codes | `lib/qr.js`, `lib/qr-png.js` |
| Word and painting decks | `decks.js` |
| TV and phone pages | `public/tv.html`, `public/index.html` |
| Tutorial | `public/tutorial.*` |
| QA tools | `tools/` |

## Commands

```
npm ci --offline
npm test
npm run qa
npm start
```

On Windows, Shaun uses `START-FORGERS-FINGER.bat` to play and `RUN-QA.bat` to test.

## Project rules

- Keep **zero external npm dependencies**. Do not add packages.
- Never commit `.local-data/`; it holds encrypted saved rooms and is in `.gitignore`.
- Player avatars must be people, not animals.
- Bids are 100, 200 or 300 guineas and can never exceed a player's balance; an incorrect bid can never create an unaffordable payout. Scoring tests in `tests/scoring.test.js` must keep passing.
- Shaun makes the art with plain ChatGPT (not Creative Claw).
## Working with Shaun (the owner)

- Shaun is not a programmer. Explain every step in plain English, in order, and assume no prior knowledge.
- Give complete, ready-to-use files, never partial snippets or "..." placeholders.
- Use UK English in all player-facing text.
- Before changing anything, read this file, `README.md` and the design document named below.
- Never delete files to "tidy up". Move old notes into `docs/` instead, and say what you moved.
- Never force-push, rewrite history, or rename the repository.

## Hosting rules (Render)

- The game runs on Render's free plan in Frankfurt and auto-deploys from `main`.
- Game rooms live in server memory. **Any push to `main` restarts the server and ends every live game.** Never push during a game night, and warn Shaun before any change that will deploy.
- The free plan sleeps when idle; the first visit can take up to a minute to wake.
- The server must listen on `process.env.PORT`.

## Party-game conventions

- The TV is the shared screen; phones are private controllers. Secret information must never be sent to the TV or to spectators.
- Text on the TV must be readable from a sofa; phone controls must work one-handed in portrait.
- Art and sound are made by Shaun with ChatGPT. Keep the exact filenames listed in the asset manifest so new files drop in without code changes, and keep a working code-drawn fallback for anything missing.
