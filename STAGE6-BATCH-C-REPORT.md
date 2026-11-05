# FORGER'S FINGER — Stage 6 Batch C Implementation Report

**Date:** 5 November 2026. **Release:** `1.1.3-stage6c` (LOCAL, NOT DEPLOYED). **Based on:** the complete Stage 6 Batch B ZIP. All previous Batch A/B layouts and 26 approved images remain untouched.

## Completed in this batch

| Workstream | Implemented | Verification |
|---|---|---|
| Graphical tutorial | Nine chapter tutorial using only the original logo, Lord Gavelby character art, backgrounds, frame, rosette, stamp and medal. TV and phone can open it from How to Play. | 4 isolated Chromium viewport render checks; Node tests |
| Tutorial navigation | Always-present Play / Pause (same control), Previous, Next / Finish and Back to lobby / game. Keyboard Left/Right/Escape, focus loop, responsive portrait/landscape and captions. | Automated structural and isolated-browser interaction checks |
| Tutorial content | Accurate Head Curator, Family/After Hours, secret Master title, painting and drawing acknowledgement, bidding/pass, hearts, honest transfers, Master conditional bonus and final rankings. | Content consistency tests |
| Music | Two newly composed procedural tracks: original salon-style lobby waltz (~36.7 s) and faster drawing cue (~32.0 s). User controls music independently. | Real non-silent MP3 files; full ffmpeg decode 2/2 PASS |
| Sound effects | Twelve locally synthesised, distinct audio files for join, gavel, submission, bid, tick, drumroll, fake/genuine stamps, applause, guineas, awards fanfare and comic defeat. No external music samples, third-party recordings or paid-credit generation. | Full ffmpeg decode 12/12 PASS; files individually nonempty and distinct |
| TV sound | Music, effects and voice toggles persist; user must switch sound on. Gavelby can speak TV quips in a browser-provided British English voice. Sound stops when disabled, including active effects. | Node storage/audio tests, static UI inspection |
| Phone sound | New Sound button with separate music, effects, voice and enable controls. Phone music initially disabled to avoid multiple devices playing the TV music; joining, acknowledged painting and accepted bids can play effects after user opt-in. | Node source/logic tests; actual phone speakers not available |
| Basic narration | Voice optionally reads tutorial chapters and selected Gavelby TV quips through the **browser Web Speech API**. Captions remain when voices are unavailable or muted. | DOM and JS checks; actual installed voice/pronunciation quality NOT RUN |
| Preservation | Server, bids, rules, game order, secure reconnect, local persistence, original deck data and artwork are unchanged. | 42/42 existing/new Node tests; 26/26 original SHA-256 checks |

**Audio honesty:** These are *new original, algorithmically synthesised* cues supplied as actual MP3s, not realistic studio Foley or mastered orchestral recordings. All 14 cues decode successfully; artistic/TV-speaker sound quality has **not** been signed off. No provider account credits were spent. `tools/generate-original-audio.py` records the reproducible composition/synthesis method. The release does not bundle or redistribute external music recordings or third-party soundfont files.

**Lord Gavelby voice limitation:** Browser TTS is functional where available, but the installed voice varies by Windows, phone and browser. There is **no custom Northern English / Lancashire audio recording** in this ZIP, and no claim of a commercially cleared specific voice actor. A custom, approval-tested narrator remains a separate creative task; the tutorial script is supplied now.

## Files modified or created

- `public/shared.js` — audio engine categories, active-effect mute, speech helpers and tutorial fallback.
- `public/tv.html` — tutorial loading, real audio controls, phase music, optional on-screen Gavelby quip narration.
- `public/index.html` — tutorial loading, independent phone sound panel, opt-in event cues.
- `public/tutorial.js`, `public/tutorial.css`, `public/tutorial-chapters.json` — new, original-art graphical tutorial and script.
- `public/assets/sfx/*.mp3` — 14 new real sound files.
- `tools/generate-original-audio.py`, `tools/browser-stage6c-qa.py` — reproducible local generation script (optional NumPy/FFmpeg) and optional Playwright DOM QA.
- `tests/stage6c-audio-tutorial.test.js`, `tools/qa.js` — seven new Node tests, tutorial JS syntax gate, updated QA text.
- `package.json`, `package-lock.json`, `README.md` and release reports — version, launch and validation instructions.

## Explicitly deferred

- **Approved genuine stamp image** `public/assets/stamp-genuine.png` is still absent; the existing text stamp works. A matching new rendered sample requires its own art approval.
- **Fonts:** `display.woff2` and `body.woff2` are absent. The existing CSS font fallbacks remain. No font files redistributed.
- **Premium Lord Gavelby narration:** original, commercially cleared Northern English recordings are not generated. Browser speech is optional and device-dependent.
- **Physical phone/TV multiplayer acceptance:** not available in the current container; real navigation in Chromium returns `ERR_BLOCKED_BY_ADMINISTRATOR`. The isolated DOM layout checks are **not** a replacement for end-to-end gameplay.
- **Render restart recovery:** needs a configured shared, durable persistence adapter; encrypted local snapshots are not enough on ephemeral hosting.

## Next stage: Batch D acceptance

Live 3/4/6/8-player sessions on the actual PC/TV/phone devices, both collections, once/twice rotations, all phases, real QR scanning and reconnect; visual overscan and touch testing; artistic sign-off on the music and SFX; separate sign-off on missing stamp and professionally voiced Gavelby before production deployment. **No GitHub pushes, merges or Render deployment were performed.**
