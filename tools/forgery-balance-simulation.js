'use strict';
// Reproducible sensitivity simulation against the real lib/rules.js settlement.
// These are ASSUMED player behaviours, not empirical playtest measurements.
const { settle } = require('../lib/rules');
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(1664525, s) + 1013904223) >>> 0) / 0x100000000);
}
function weightedPick(options, weight, random) {
  const sum = options.reduce((a, x) => a + weight(x), 0);
  let r = random() * sum;
  for (const x of options) { r -= weight(x); if (r < 0) return x; }
  return options[options.length - 1];
}
function run({ trials = 1000, seed = 20261112 } = {}) {
  const random = rng(seed);
  const cases = [];
  for (const n of [3, 4, 6, 8]) for (const laps of [1, 2]) for (const skilledArtist of [false, true]) {
    let wins = 0, ties = 0, finalGap = 0, negative = 0, ledgerErrors = 0;
    let masterTurns = 0, madeBids = 0, passes = 0, transfers = 0, correct = 0;
    for (let match = 0; match < trials; match++) {
      const players = Array.from({ length: n }, (_, i) => ({
        id: 'p' + i, score: 1000, stats: { fooled: 0, duped: 0, found: 0, hearts: 0 },
      }));
      for (let lap = 0; lap < laps; lap++) for (let m = 0; m < n; m++) {
        masterTurns++;
        const masterId = 'p' + m;
        const lots = players.map((p, i) => ({ letter: String.fromCharCode(65 + i), ownerId: p.id }));
        const cur = { masterId, lots, bids: {}, hearts: {}, results: null };
        for (let i = 0; i < n; i++) {
          const who = players[i], candidates = lots.filter(l => l.ownerId !== who.id);
          const hearts = weightedPick(candidates, l => skilledArtist && l.ownerId === 'p0' ? 2.5 : 1, random);
          cur.hearts[who.id] = hearts.letter;
          if (i === m) continue;
          if (who.score < 100 || random() < 0.15) { cur.bids[who.id] = { pass: true }; passes++; continue; }
          const accurate = random() < (skilledArtist && m === 0 ? 0.47 : 0.35);
          const target = accurate
            ? lots[m]
            : weightedPick(candidates.filter(l => l.ownerId !== masterId),
              l => skilledArtist && l.ownerId === 'p0' ? 1.8 : 1, random);
          const max = Math.min(3, Math.floor(who.score / 100));
          const amount = 1 + Math.floor(random() * max);
          cur.bids[who.id] = { lot: target.letter, amount };
        }
        const before = players.reduce((a, p) => a + p.score, 0);
        const res = settle({ players, cur });
        const difference = Object.values(res.results.deltas).reduce((a,b)=>a+b,0);
        if (players.reduce((a,p)=>a+res.scores[p.id],0) - before !== difference) ledgerErrors++;
        for (const p of players) {
          p.score = res.scores[p.id]; p.stats = res.stats[p.id];
          if (p.score < 0 || !Number.isSafeInteger(p.score)) negative++;
        }
        madeBids += res.results.totalBids;
        correct += res.results.correct;
        transfers += res.results.transfers.length;
      }
      const peak = Math.max(...players.map(p => p.score));
      const leaders = players.filter(p => p.score === peak);
      if (leaders.some(p => p.id === 'p0')) { wins += 1 / leaders.length; if (leaders.length > 1) ties++; }
      finalGap += players[0].score - players.slice(1).reduce((a,p)=>a+p.score,0)/(n-1);
    }
    cases.push({ players: n, laps, standoutArtist: skilledArtist, matches: trials,
      p0WinShare: Number((wins/trials).toFixed(3)), equalSkillBenchmark: Number((1/n).toFixed(3)),
      p0VsPeersAverageGuineas: Math.round(finalGap/trials), masterTurns, madeBids,
      passes, correct, transfers, negative, ledgerErrors, ties });
  }
  return { seed, trialsPerCase: trials, assumptions: {
    passChance: 0.15, baselineCorrectChance: 0.35, standoutMasterCorrectChance: 0.47,
    standoutForgeryAttractionWeight: 1.8, standoutHeartWeight: 2.5,
    everyPlayerMastersEqually: true, economicRulesChanged: false,
  }, cases };
}
if (require.main === module) console.log(JSON.stringify(run(), null, 2));
module.exports = { run };
