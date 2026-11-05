# FORGER'S FINGER Stage 6F — Lord Gavelby voice and auction sound

**Current deliverable:** Complete local working source ZIP, version 1.1.6-stage6f. **Not deployed.**

## Changed

- Expanded the existing nine chapters to an 892-word theatrical Lord Gavelby narration, retaining all rules, numbers and age limitations.
- Generated all nine chapter recordings using Creative Claw / ElevenLabs v4 with one Northern-English stock voice.
- Generated three new premium cues: gavel, genuine stamp and forgery stamp. Retained 14 pre-existing local MP3 tracks and original fallback effects.
- Tutorial now prefers recorded audio, advances automatically when the chapter ends, handles Play/Pause/Previous/Next/Back and reconnect-safe modal cleanup, and falls back to browser speech if CDN audio fails.
- Preserved the pre-existing mute, separate music/effects/voice settings and localStorage persistence. Voice stays disabled until the user enables audio.
- All other original approved artwork preserved. No security, scoring or multiplayer game rules modified.
- Added Creative Claw CDN to the narrow audio-only CSP allowlist. No scripts, styles or images are trusted from that host.
- Supplied traceable file URLs and a one-click Windows download kit to make audio self-contained in a user environment.

## Remaining limitations

- **Recorded MP3 files are not physically inside this ZIP.** They are hosted externally and referenced by URL. Run `DOWNLOAD-PREMIUM-AUDIO.bat` to retrieve and localise them before redistribution or offline use.
- The voice has not been listened to or signed off by the user, and was not custom voice-designed due to the account's existing designed voice limit.
- Browser streaming and hardware tests were not performed; provider generation completion and local regression tests passed.
- No GitHub push, Render deployment or changes to production databases were performed.
