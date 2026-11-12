# FORGER'S FINGER — Forgery Auctions Improvement
Date: 12 November 2026 · Working branch: `improvement/forgery-auctions` · NOT MERGED OR DEPLOYED

## Source-of-truth baseline
- Official game title: **FORGER'S FINGER**, not "FORGERS FINGERS". Repository: `connex222/FORGERS-FINGERS`. Source baseline: `main`, `1.1.6-stage6f`.
- 3–8 players. Private gallery on TV, drawing/bidding on phones, one or two turns as Master per person.
- Master knows the genuine title while drawing. Forgers only see a catalogue description. Paintings are shuffled into anonymous lettered lots. Buyer sees only which painting is their own; server does not send creator identities during auction.
- **This is sealed bidding, NOT a rising-price auction:** each non-Master can buy exactly one other player's lot, for 100/200/300 guineas, or Pass. No speculative bidding wars. Each player may heart one other painting (optional).
- Correct buyer gets wager as bonus; wrong buyer transfers wager to the forger; Master receives 200 per correct buyer if some but not all actual bids were correct; each most-hearted painting earns 100 (ties all rewarded). Each starts at 1,000.
- The server owns phase timers and all scoring. The existing retry/receipt mechanism retains strokes and blocks duplicate submissions, bids and unauthorised resumes. Final gallery displays original submitted stroke data.
- Approved 26 image files, eight avatar mappings, gilt frame, Lord Gavelby narration/fallback, two decks and existing sound cues remain unchanged. The approved SHA-256 manifest remains authoritative.

## Audit and implementation
| Finding | Evidence | Change |
|---|---|---|
| Auction timer could receive bids for about 1.5 s after visible deadline | `endDraw` scheduled `endAuction` at AUCTION_MS + 1500, no timestamp check in bid/pass/heart | End precisely at deadline; enforce server timestamp in every sealed-auction action, including post-restart scheduling |
| Fixed reveal felt disproportionate at 6–8 lots | 5.5 s per painting plus 7 s favourite | 3.6 s per painting + 4.5 s favourite; synchronise server result and TV presentation, adjust stamp reveal beat |
| Ledger could idle 30 seconds after every round | `SCORES_AUTO_MS` | 20-second auto-advance; existing manual Next remains |
| Buyer did not see both financial outcomes before committing | Phone said 'Bid', without payoff preview | Explicit genuine win/forgery loss, sealed-bid language, affordability and dynamic stake preview |
| TV did not give explicit decision progress or concealed-bid explanation | Auction header displayed title, portraits and timer | Show decisions completed out of eligible buyers, without revealing lots or amounts; larger plain-English rules |
| Art or author identity might be inadvertently exposed in redesign | Server sends only letter/strokes/mine at auction; owner ID arrives in reveal results | Continue using existing stroke renderer, original gallery frames and existing per-player private data; no new rasterisation or asset replacement |

### Pacing arithmetic (maximum, not promised match duration)
| Lots | Old scheduled reveal | New scheduled reveal | Saved |
|---|---:|---:|---:|
| 3 | 23.5 s | 15.3 s | 8.2 s |
| 4 | 29.0 s | 18.9 s | 10.1 s |
| 6 | 40.0 s | 26.1 s | 13.9 s |
| 8 | 51.0 s | 33.3 s | 17.7 s |

The auction remains capped at 50 seconds **but auto-closes immediately when every eligible player has submitted a decision**. For fairness, disconnected players can still reconnect until the deadline. No additional waiting transition was added after each offer.

## Scoring: no rules changed
No bids, payout amounts, initial guineas, heart bonuses, Master bonuses, win conditions or collections were altered. All simulator scenarios run the actual `lib/rules.js` `settle` function. Reproduce using `node tools/forgery-balance-simulation.js`.

Simulation model: 1,000 matches per size, lap count and scenario; seed 20261112. Each eligible buyer passes 15% of the time; baseline correct identification chance is 35%. "Standout artist" stress case adds a 47% chance of identifying their genuine work when they are Master, 1.8× more attraction to their forgery among incorrect choices, and 2.5× greater heart selection weight. These are **illustrative behavioural assumptions, not observed playtest data**.

| Players / laps | Equal-skill p0 win share | Standout-artist p0 win share | Fair-skill reference |
|---|---:|---:|---:|
| 3 / 1 | 32.1% | 40.3% | 33.3% |
| 3 / 2 | 32.4% | 44.8% | 33.3% |
| 4 / 1 | 26.4% | 41.9% | 25.0% |
| 4 / 2 | 24.2% | 51.9% | 25.0% |
| 6 / 1 | 15.8% | 46.4% | 16.7% |
| 6 / 2 | 18.2% | 58.9% | 16.7% |
| 8 / 1 | 12.0% | 49.5% | 12.5% |
| 8 / 2 | 13.4% | 63.6% | 12.5% |

Across these synthetic matches there were **0 negative balances and 0 inconsistent aggregate ledger deltas**. The asymmetry is a stress warning, not proof of actual skill dominance: the standout model deliberately gives the same person three correlated advantages. Before any scoring change, measure whether real buyers choose skilled forgeries more often and whether 100-guinea favourite rewards materially amplify skill. Potential mitigation requires its own simulations plus explicit approval; do not silently nerf forgers, bonuses or high bids.

## Automated verification
`npm run qa` runs the existing rules, protocols, resumptions, full matches, security, tutorial, artwork hash and presentation assertions plus:
- One sealed decision per buyer; no self-purchase, Master bid or duplicate bid/pass.
- Pre-reveal lot privacy and exact buyer/fraud transfer tally.
- Server-owned deadline expiry and refusal of late offers.
- Checks for phone pointer capture/cancel, stroke preservation, original gilt frame and accessible on-screen stake instructions.
- 16 deterministic 3/4/6/8-player one-/two-lap economic stress cases with nonnegative balances and ledger invariants.
- GitHub Actions workflow `.github/workflows/forgery-auctions-qa.yml` runs the project QA and archives a full economics JSON. A CI green check is a code verification, **not** physical touch certification.

## Real-world acceptance — still required (no coaching)
1. On a physical TV and 3–8 mixed-experience phones, have a group start one complete match; let them read the opening auction screen without verbal coaching.
2. Ask each person afterwards: "What happens if your painting is genuine? What happens if it is fake? Can you buy your own?" Target: at least 80% correct after the first lot, and every player able to act within the displayed timer.
3. On iOS Safari and Android Chrome, test finger, stylus (if available), fast strokes, rotating screen, accidental second touch, Undo, Wash, Clear, Submit, forced disconnect, and rejoin. Compare the resulting original stroke drawing on the TV with the phone before submission; **no cropping, stretching or lost strokes**.
4. Force a phone offline before/after signing, during bidding and at the last 2 seconds. On reconnect ensure unchanged role/identity and only one sealed action and settlement; check Pass, hearts, duplicate bids and unaffordable amounts.
5. Run 3-, 4-, 6- and 8-person rooms with one and two Master rotations, including one all-Pass round and a round where all buyers choose the genuine. Finish results, medals, final genuine gallery and Back to Lobby.
6. From several metres away, verify every letter, timer, bid-progress marker, genuine/fake stamp and per-player ledger is readable. Check 720p, 1080p, 4K, reduced-motion settings, TV overscan and phone narrow screens. Listen to gavel/stamps/voice and make sure no one experiences overlapping cues.

**Release gate:** collect physical-device evidence, run uncoached group test, revisit skill fairness using observations, and obtain an explicit approval before merge or deployment. Do not treat simulated wallets, CI tests or previous browser-layout snapshots as device acceptance.

## Existing unrelated release limitations
The repository's earlier reports still warn that Render's ephemeral storage is not durable restart persistence; a production storage adapter has not been certified. Stage 6F recorded narration may depend on external audio URLs unless downloaded locally. Neither issue is hidden or silently altered in this branch.
