> **Status update, 5 November 2026:** Batches A, B and C have been implemented locally. This original design-only brief remains as historical context. Stage C delivered the nine-chapter illustrated tutorial and 14 locally created MP3 cues, plus optional browser speech. Genuine-stamp artwork, licensed fonts, studio-quality Northern Gavelby narration and Stage D device acceptance remain outstanding. See `STAGE6-BATCH-C-REPORT.md`.

> Historical design-only plan from the initial repair. The user subsequently approved the four concepts for Stage 6 **Batch A**, which is now implemented. The artwork/awards/tutorial phases remain separate; see `STAGE6-BATCH-A-REPORT.md` for the current status.

# FORGER'S FINGER — AAA UI & Presentation Upgrade Plan

**Stage 6 — DESIGN-ONLY STOP GATE. Not authorised for implementation.** The current release contains only narrow functional UI additions for bid/pass/ack/help/QR/audio. No major layout, visual identity, avatar, medal or illustration has been changed.

## Creative direction to preserve

**Victorian gallery grandeur with theatrical farce**, not a generic quiz dashboard. Keep the dark gilded gallery, tactile frames and typography hierarchy, Lord Gavelby, the approved logo, all eight distinctive portrait avatars, the eight existing character slots, Family and After Hours atmospheres, awards and rosette. New artwork must match existing supplied quality, lighting, ornament, colour and perspective. Do not use placeholder clip-art, flat CSS medals or generic stock characters.

## Proposed screen-by-screen upgrade, before → after

| Screen | Current problem | Proposed visual change (future phase only) | Test to accept |
|---|---|---|---|
| TV/PC lobby | Fixed 1920×1080 stage scales as a whole; text and code can become hard to read or clip on TVs | Responsive stage grid with 5% TV-safe inset, minimum 24–32 px sofa-distance text, logo in primary sightline, QR/code separated from player wall and balanced empty slots | 1080p, 4K, 720p TV overscan, PC browser window: no clipped controls/branding; QR scannable |
| TV intro/drawing | Very large headings and easel boxes compete for vertical space | Responsive headline limit, catalogue as a prominent framed label, timed easel states with large names and Master status; no layout shifts when a player reconnects | 3/4/6/8 players, once/twice, Family/18+: readable names and progress |
| Auction gallery | Frames currently 465 px high, 300 px in two rows; eight paintings risk overcrowding or clipping | Dynamic 3/4/6/8-lot layout using consistent canvas aspect ratios: 3 = one row; 4 = 2×2; 6 = 3×2; 8 = 4×2, with TV-safe responsive spacing and lot/guinea labels | No paintings, plaques or amounts cut off at 1080p/4K/overscan; no miniature text |
| TV reveal | Large fixed left-hand painting and huge question text cause overflow | Responsive framed spotlight + right-side reveal panel; clearly distinct GENUINE/FORGERY stamp and paid transfer ledger | For all lot counts, authentic art fully visible and text within safe margins |
| TV ledger | Scoring sometimes too dense for sofa readability | Large but proportionate net-delta, current/previous balance, Master bonus, favourite bonus and paid bid line; fixed row-height and auto-flow | Valid +/− deltas, 3–8 leaderboard entries without scroll clipping |
| Final ceremony | Existing medal display shrinks actual 256×256 art to 70×70; podium/genuine gallery compete | 160–220 px individual award badges with prominent winners; clear 3-person podium, full genuine gallery and separate slideshow stage | All medal, rosette, portrait and canvas art visible on small and large TV |
| Phone join/lobby | Multiple controls and text compete on narrow screens | Premium pocket invitation card, thumb-safe entry, prominent 4-letter code and original portrait; clear curator settings with one-action confirmation | 320/360/390/430 px portrait, landscape, tablet; no horizontal overflow |
| Phone painting | Responsive canvas fights the tools/footer for height | 3:4 easel-first layout, fixed safe-area Undo/Clear/Submit and large colour/brush controls; durable submission feedback without clearing strokes early | Single-touch and multitouch input, orientation change, Undo/Wash/Clear/Submit, iPhone notch and Android navigation |
| Phone auction/results | Bid units, money and Pass can be unclear | Large selected-lot preview; unambiguous 100/200/300 gns affordability; persistent Pass and one heart; clear acceptance toast, round delta and reason for genuine/forgery | Test balances 0/50/100/200/300/1000; all auction verdicts and ties |
| How to Play / audio | Functional help is basic text; source audio absent | Proper graphical 6–8 scene tutorial and optional Gavelby narration; always-visible **Play, Pause, Next, Previous, Back to Lobby**, independent music/SFX/voice/mute switches | TV and phone, all controls always reachable; no surprise reactivation of sound |

## Production specifications (subject to approval)

- **TV layout:** CSS responsive grid rather than enlarging the absolute stage; safe area inset minimum 5% at edges; support 1280×720, 1920×1080 and 3840×2160 plus a cast-TV overscan mode. Minimum readable major labels 28 px at 1080p; maintain artwork aspect ratio without stretching.
- **Gallery:** framed canvases maintain a 3:4 portrait ratio and gilded frame thickness. Use full screen real estate by changing row/column count, not shrinking every painting to illegibility. Include lot A–H labels large enough from a sofa. Testing at different player counts required before final choice.
- **Phone:** design around 320×568 through large modern phones and 768 px tablets; ensure 44×44 CSS px minimum touch targets, 16 px or larger body text, mobile safe-area insets, portrait/landscape, orientation change during painting and no loss of draft strokes.
- **Accessibility:** high contrast, labelled buttons and canvases, visible keyboard focus, reduced motion, proper text alternatives, timed progress not indicated only by colour, no content behind headers.
- **Performance:** lazy-load non-critical gallery artwork, cache static source images, avoid repeated canvas redraw on every state, cap paint frame rendering and visual effects, profile slower phone GPUs. Maintain reconnect correctness while animations run.

## Artwork and audio proposal (do not generate yet)

**Must preserve unchanged:** `logo.png`, `avatar-1.png` through `avatar-8.png`, `auctioneer.png`, `auctioneer-shock.png`, `frame-gilt.png`, five provided backgrounds, `badge-18.png`, `award-forger.png`, `award-gullible.png`, `award-favourite.png`, `award-eagle.png`, `rosette.png`, `stamp-forgery.png` and both supplied icons.

**Creative proposals for approval:** a matching `stamp-genuine.png` (900×450 with useful alpha); 2–4 Victorian decorative UI edge/engraving layers (transparent, no text embedded where possible); unique scene plates for a graphical tutorial; optional final-night animated frame overlay that does not hide art. Generate one sample per new type, present it and stop for approval before batch work. Existing art must not be overwritten.

**Audio cue sheet:** 14 original, redistributable MP3s matching existing documented filenames:

| Cue file | Intended original sound |
|---|---|
| `music-lobby.mp3` | Gently comic Victorian salon/waltz bed; seamless loop |
| `music-draw.mp3` | Light instrumental urgency, no vocals; seamless loop |
| `join.mp3` | Tiny gallery-door bell and admission flourish |
| `gavel.mp3` | Wooden auctioneer's gavel impact |
| `submit.mp3` | Quill signing and wax seal snap |
| `bid.mp3` | Solid raised-paddle chime |
| `tick.mp3` | Brief mechanical clock tick (never overpowering) |
| `drumroll.mp3` | Dramatic comedic rolling tension |
| `stamp-forgery.mp3` | Deflating reject stamp |
| `stamp-genuine.mp3` | Satisfying authentic stamp and brass shine |
| `applause.mp3` | Short theatre applause |
| `coins.mp3` | Distinct guinea clink/coin spill |
| `fanfare.mp3` | Original celebratory brass flourish |
| `sad-trombone.mp3` | Original short comic downslide |

**Gavelby voice direction:** distinctive Northern English (Lancashire/Yorkshire flavour), mature, amused, cheeky yet legible; consistent title pronunciation. New narration needs user authorisation, commercial usage confirmation, recorded chapter mapping and actual playback verification. Fonts may be added only with documented redistribution licences; never bundle unlicensed typefaces.

## Visual acceptance matrix to run after approval

- **Devices:** desktop at 1366×768 and 1920×1080; TV 720p/1080p/4K plus 5% overscan; tablet 768×1024 portrait/landscape; phone 320×568, 390×844, 430×932 portrait/landscape.
- **Player counts:** 3, 4, 6, 8; **rotations:** once, twice; **collections:** Family, After Hours.
- **Phases:** lobby, intro, drawing, auction, reveal, ledger, void, final ceremony, back to lobby; capture each in screenshots before release.
- **States:** genuine and forgery, no bids/all bids/some correct, pass, insufficient guineas, 3-way favourite tie, missing painting, disconnections and reconnect during every phase.
- **Required passes:** no avatar, painting, medal, stamp, caption or button clipping; readable from sofa; QR tested with actual phone camera; no browser console errors; no stuck sound or voice controls; pause/resume/cancel tutorial works; no drawing loss; reasonable loading and frame rate.

## Authorisation boundary

**STOP.** No UI rebuild, new image generation, sound production or GitHub/Render upload is authorised by this brief. First obtain approval of this layout strategy and sample-asset briefs; then proceed in separate bounded visual batches while preserving all 26 approved original assets.
