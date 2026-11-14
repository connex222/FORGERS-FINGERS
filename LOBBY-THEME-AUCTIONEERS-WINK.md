# FORGER'S FINGER — Lobby Theme: The Auctioneer's Wink

## Original music
- Created using **Creative Claw** / **ElevenLabs Music v2.5**, November 2026.
- Title: **The Auctioneer's Wink**
- Length: **64 seconds**, MP3 44.1 kHz / 192 kbps, instrumental (no lyrics, no narration).
- Creative Claw audio asset: `7ee2b5d8-5d08-4fbd-a14b-15e3f5073d76`.
- Permanent hosted media: https://cdn.creativeclaw.co/u/f3e7a3b1/audio/3c8df6e7-1960-4b8b-9d88-16f69b5f036e.mp3

## Creative direction
An upbeat, friendly, gently mischievous British auction-gallery miniature: jaunty clarinet, pizzicato strings, nimble parlour piano, playful bassoon, quiet brushed percussion, occasional celesta, approximately 116 BPM. Intended to make a room smile while players join; **not circus music** and no aggressive drums, speech or licensed pre-existing theme.

## Safe integration
- `public/shared.js` maps **only** `music-lobby` to the new Creative Claw URL. The existing local `/assets/sfx/music-lobby.mp3` is retained as a fallback if the CDN audio fails.
- `public/tv.html` plays the lobby theme at volume **0.16** (instead of 0.27). Draw music, narration, sfx, avatars and gameplay have not been changed.
- The existing on/off controls remain active. Browser autoplay rules apply: the first audio playback normally needs a user gesture such as pressing **Turn sound on**; do not claim unconditional autoplay on TV or mobile.
- Phone background music remains off by default, avoiding a roomful of phones each playing the same theme.
- `tests/lobby-theme.test.js` checks mapping, fallback, looping flag, separate sound controls and mix level.

## Acceptance
Listen to one whole 64-second pass at normal TV volume and across the loop boundary. Confirm it feels cheerful rather than frantic, does not drown out Lord Gavelby or conversation, and stops when leaving the lobby. Test with sound enabled, sound off, and CDN/network failure. Audio-generation services can impose usage/licensing terms; check current Creative Claw / ElevenLabs terms before commercial distribution.

This branch is a prepared, reversible theme change. **It has not been merged or deployed.**
