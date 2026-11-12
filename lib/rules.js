'use strict';
// Pure, testable settlement: all bids are validated at acceptance, then checked again here.
const BID_UNIT = 100;
const MASTER_BONUS = 200;
const HEART_BONUS = 100;
const isBidUnit = amount => Number.isInteger(amount) && amount >= 1 && amount <= 3;
const canAfford = (score, amount) => Number.isSafeInteger(score) && isBidUnit(amount) && score >= amount * BID_UNIT;
function settle({ players, cur }) {
  if (cur.results) return { results: cur.results, scores: Object.fromEntries(players.map(p => [p.id, p.score])), stats: Object.fromEntries(players.map(p => [p.id, {...p.stats}])) };
  const byId = Object.fromEntries(players.map(p => [p.id, p]));
  const balances = Object.fromEntries(players.map(p => [p.id, p.score]));
  const stats = Object.fromEntries(players.map(p => [p.id, {...p.stats}]));
  const deltas = Object.fromEntries(players.map(p => [p.id, 0]));
  const lots = cur.lots.map(l => ({ letter: l.letter, ownerId: l.ownerId, genuine: l.ownerId === cur.masterId, buyers: [], hearts: 0 }));
  const byLetter = Object.fromEntries(lots.map(l => [l.letter, l]));
  const genuine = lots.find(l => l.genuine);
  let correct = 0, totalBids = 0;
  const transfers = [];
  for (const [buyerId, b] of Object.entries(cur.bids)) {
    if (!b || b.pass) continue;
    const lot = byLetter[b.lot];
    const buyer = byId[buyerId];
    if (!buyer || buyerId === cur.masterId || !lot || lot.ownerId === buyerId || !canAfford(balances[buyerId], b.amount)) continue;
    const amt = b.amount * BID_UNIT;
    totalBids++;
    lot.buyers.push({ id: buyerId, amount: amt });
    if (lot.genuine) {
      deltas[buyerId] += amt;
      balances[buyerId] += amt;
      correct++;
      stats[buyerId].found++;
    } else {
      balances[buyerId] -= amt;
      balances[lot.ownerId] += amt;
      deltas[buyerId] -= amt;
      deltas[lot.ownerId] += amt;
      stats[buyerId].duped += amt;
      stats[lot.ownerId].fooled += amt;
      transfers.push({ from: buyerId, to: lot.ownerId, amount: amt });
    }
  }
  let verdict = totalBids === 0 ? 'nobids' : correct === 0 ? 'obscure' : correct === totalBids ? 'obvious' : 'perfect';
  if (verdict === 'perfect' && byId[cur.masterId]) {
    const bonus = correct * MASTER_BONUS;
    balances[cur.masterId] += bonus;
    deltas[cur.masterId] += bonus;
  }
  for (const [voter, letter] of Object.entries(cur.hearts)) {
    const lot = byLetter[letter];
    if (byId[voter] && lot && voter !== lot.ownerId) lot.hearts++;
  }
  const maxHearts = Math.max(0, ...lots.map(l => l.hearts));
  const heartWinners = maxHearts ? lots.filter(l => l.hearts === maxHearts).map(l => l.letter) : [];
  for (const letter of heartWinners) {
    const ownerId = byLetter[letter].ownerId;
    if (byId[ownerId]) { balances[ownerId] += HEART_BONUS; deltas[ownerId] += HEART_BONUS; stats[ownerId].hearts++; }
  }
  if (Object.values(balances).some(v => !Number.isSafeInteger(v) || v < 0)) throw Error('Invalid settlement balance');
  const results = {
    genuine: genuine ? genuine.letter : null, masterId: cur.masterId, verdict,
    correct, totalBids, lots, heartWinners, deltas, transfers,
    masterEarned: verdict === 'perfect' ? correct * MASTER_BONUS : 0,
    stepMs: 3600, tailMs: 4500,
  };
  return { results, scores: balances, stats };
}
module.exports = { BID_UNIT, canAfford, isBidUnit, settle };
