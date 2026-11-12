# FORGER'S FINGER — Auction Release 1.1.7 (12 November 2026)

**Source:** `connex222/FORGERS-FINGERS`, [PR #3](https://github.com/connex222/FORGERS-FINGERS/pull/3), prepared on `improvement/forgery-auctions`.
**Release target:** Render `FORGERS-FINGERS-1`, GitHub `main`, auto-deploy enabled.
**Live URL:** https://forgers-fingers-1.onrender.com/tv
**Build:** `1.1.7-auctions` (package and lockfile agree). Check GitHub PR, Actions and Render deployment record for completed release status; this note does not itself assert that a deployment has succeeded.

## Consolidated gameplay improvements
- **Sealed bidding:** each collector still chooses a single 100/200/300-guinea wager or Pass, but the TV only reports decision completion. Pass versus bid, bid value and lot remain confidential until the reveal.
- **Clear choice:** the handset shows the two possible money outcomes and affordability before sealing.
- **Pacing:** auction deadline never extends beyond 50 seconds, Heart can be cast/changed for at most 3 final seconds once decisions are complete, reveal reduced to 3.6 seconds per painting plus 4.5 seconds for favourite, and the score hold reduced to 20 seconds (manual advance remains).
- **Shared ranks:** tied final guinea totals share ranks (1,1,3) on TV and phones; no scoring tiebreaker is introduced.
- **Reliability:** server timestamps reject late actions; duplicate and unauthorised actions stay blocked; temporary network rejection cannot permanently disable the phone bid/pass controls; encrypted local restart retains the Heart window and settles once.
- **Art:** all 26 approved image hashes, eight avatars, approved gilt frames and licensed/original audio paths remain unchanged.

## Technical verification
Latest passing development CI before release: [Actions #43206547375](https://github.com/connex222/FORGERS-FINGERS/actions/runs/43206547375): **57/57 Node tests, 13/13 project QA gates**, 16 deterministic balance scenarios. Additional tests cover a Master Heart cast after all sealed bids, sealed Pass privacy, shared positions, deadline clamping and local restart recovery. After the version/document-only commits, verify the final development SHA in GitHub Actions. The workflow continues to run on `main`.

## Release / deployment audit
- GitHub canonical branch: `main` (through PR #3, not a force push).
- Render service: `srv-dblqsf0n74is73ceodig` (`FORGERS-FINGERS-1`), `main` auto-deploy. **Do not manually trigger a second deployment** when the push is detected.
- Confirm successful Render `live` deployment for the resulting merge SHA and check `/health`, `/tv` and phone entry.
- Keep the development branch until GitHub and Render are verified, then consolidate redundant branches if possible.

## Explicit outstanding acceptance and hosting limitation
**This release is an automated-QA-passed build, not a certified full multiplayer physical acceptance.** Test uncoached family groups and actual iPhone/Android touch input, strokes, TV overscan/legibility, mixed Wi-Fi reconnect, narration and full 3/4/6/8-player matches.

**Hosted durability is not solved:** Render's ephemeral filesystem does not provide persistent recoverable rooms across service replacements, and the game has no certified durable external room store. Avoid assuming restoration after an instance is replaced. Local AES-256-GCM recovery remains available only where an actual persistent directory is configured.

**Economy caveat:** a synthetic standout-artist model won disproportionately often in some 6–8-player scenarios. These are model assumptions, not observed player outcomes; monetary payouts and rules are unchanged until real sessions justify balance alterations.
