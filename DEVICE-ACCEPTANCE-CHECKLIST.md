# FORGER'S FINGER — Real TV & Phone Acceptance Checklist

These checks require **your own Windows PC/TV and phones**. They were **NOT RUN** in ChatGPT's Linux test environment. The game is not hardware-signed-off until you do them. No need to type commands one line at a time.

## Start in five simple steps

1. Extract the **Stage 6 Batch D** ZIP to a folder on your Windows PC.
2. Make sure Node.js 22 or newer is installed, then double-click **`START-FORGERS-FINGER.bat`**.
3. In the black launcher window, find **`FOR THE TV: Open http://...:3000/tv`**. Open **that LAN address** on the TV/PC browser, **not `localhost`** (otherwise phone QR scanning will not work).
4. Put the phones on the same private Wi-Fi as the PC. Scan the gallery QR, enter each name, and join. If prompted by Windows Firewall, allow Node.js on **Private networks** only. Turn off phone mobile-data VPNs for this test if they interfere with LAN access.
5. To stop, return to the black launcher window, press **Ctrl+C**, then close it. Keep that window open during a game.

## Physical acceptance to tick off

- [ ] **QR joining:** scan the TV QR on two different phones. Both see the **same four-letter gallery code** and join without typing it manually.
- [ ] **Three players / Family:** one complete game; each gets a Master turn. Confirm drawing, auction, reveal, guineas, awards and rematch.
- [ ] **Four players / After Hours:** verify the Head Curator has to confirm adults-only before starting; play once through.
- [ ] **Six players:** check all framed paintings fit; phone portraits and player names are readable.
- [ ] **Eight players:** inspect the complete two-row gallery on the actual TV, labels and timer, then play through one auction.
- [ ] **Two-lap game:** ensure each participant gets two Master turns (no repeated or skipped Master).
- [ ] **Bidding:** try to bid more guineas than the available balance; it must be rejected. Passing must not block the auction. Verify money lost by a fooled collector equals money gained by the forger.
- [ ] **Drawing:** on small phones, check Undo, Wash, Clear, Sign and Submit. Nothing overlaps the logo, Sound button, question or painting area.
- [ ] **Phone rotation:** check a phone in landscape and portrait during painting, without a missing/hidden Submit button.
- [ ] **TV and phone refresh:** refresh both in the lobby, painting, auction, scores and final. Players must remain themselves and settled scores must not change twice.
- [ ] **Wi-Fi interruption:** briefly disconnect/reconnect a phone while drawing and when bidding. A signed painting should not vanish before acknowledgement.
- [ ] **TV overscan / casting:** check the full outer frame, timers, buttons, podium, medals and all art on the actual TV. Try 1080p and 4K if available.
- [ ] **Tutorial:** on TV and phone, check Play, Pause, Previous, Next and Back. All controls must remain visible.
- [ ] **Sound:** turn Music/Effects/Voice on or off during a match, refresh and play the next round. They must never unexpectedly turn back on. Listen for clipping, harshness, volume jumps and multiple phone tracks playing.
- [ ] **Final awards:** see podium, individual medal art, the genuine paintings and the gallery's Previous/Next/Pause buttons. Ensure nothing is cut off.

**Record any failure** by taking a picture/screenshot and writing which device, browser, game phase and player count it occurred on. Do not deploy until the failures are corrected. **Production restart recovery is separately blocked** until a real durable hosting store is configured and tested.
