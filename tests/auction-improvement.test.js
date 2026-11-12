'use strict';
const { test } = require('node:test');
const { startServer, tv, player, enterDraw, submit, assert } = require('./helpers');
const { run } = require('../tools/forgery-balance-simulation');
const fs = require('node:fs');
const path = require('node:path');

test('sealed auction: private lot authorship, one accepted bid, no repeat, auditable reveal', async t => {
  const srv = await startServer({ env: { FF_TEST_AUCTION_MS: '2500' } });
  t.after(() => srv.stop());
  const host = await tv(srv.port);
  const ps = [];
  for (let i = 0; i < 3; i++) ps.push(await player(srv.port, host.code, 'Collector' + i));
  t.after(() => { host.c.close(); ps.forEach(p => p.c.close()); });
  const draw = await enterDraw(host.c, ps);
  for (const p of ps) await submit(p, draw.round);
  const atAuction = await host.c.wait('state', s => s.phase === 'auction');
  assert.ok(atAuction.timeLeft > 0 && atAuction.timeLeft <= 2500);
  assert.equal(atAuction.results, undefined);
  assert.ok(atAuction.title);
  const master = ps.find(p => p.pid === draw.masterId);
  const buyers = ps.filter(p => p.pid !== draw.masterId);
  const lots = await buyers[0].c.wait('lots', m => m.round === draw.round);
  assert.ok(lots.lots.every(l => !('ownerId' in l) && !('genuine' in l)));
  const own = lots.lots.find(l => l.mine);
  assert.ok(own);
  await buyers[0].c.expectError('bid_denied', { t: 'bid', lot: own.letter, amount: 1 });
  const selected = lots.lots.find(l => !l.mine);
  buyers[0].c.send({ t: 'bid', lot: selected.letter, amount: 2 });
  await buyers[0].c.wait('bid_accepted');
  await buyers[0].c.expectError('bid_denied', { t: 'bid', lot: selected.letter, amount: 3 });
  await buyers[0].c.expectError('pass_denied', { t: 'pass' });
  await master.c.expectError('bid_denied', { t: 'bid', lot: selected.letter, amount: 1 });
  buyers[1].c.send({ t: 'pass' });
  await buyers[1].c.wait('pass_accepted');
  const result = await host.c.wait('state', s => s.phase === 'reveal');
  assert.equal(result.results.totalBids, 1);
  assert.equal(result.results.stepMs, 3600);
  assert.equal(result.results.tailMs, 4500);
  assert.ok(result.results.lots.some(l => l.genuine));
});

test('auction timeout: unsubmitted buyers cannot bid after the server deadline', async t => {
  const srv = await startServer({ env: { FF_TEST_AUCTION_MS: '350' } });
  t.after(() => srv.stop());
  const host = await tv(srv.port);
  const ps = [];
  for (let i = 0; i < 3; i++) ps.push(await player(srv.port, host.code, 'Late' + i));
  t.after(() => { host.c.close(); ps.forEach(p => p.c.close()); });
  const draw = await enterDraw(host.c, ps);
  for (const p of ps) await submit(p, draw.round);
  await host.c.wait('state', s => s.phase === 'auction');
  const last = ps.find(p => p.pid !== draw.masterId);
  const entry = await last.c.wait('lots', m => m.round === draw.round);
  const selected = entry.lots.find(l => !l.mine);
  const reveal = await host.c.wait('state', s => s.phase === 'reveal', 3500);
  assert.equal(reveal.results.totalBids, 0);
  last.c.send({ t: 'bid', lot: selected.letter, amount: 3 });
  await last.c.expectError('bid_denied');
  assert.ok(reveal.results.lots.every(l => l.buyers.length === 0));
});

test('drawing and gallery never rasterise/rewrite the original artwork', () => {
  const phone = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  const tvHtml = fs.readFileSync(path.join(__dirname, '../public/tv.html'), 'utf8');
  const shared = fs.readFileSync(path.join(__dirname, '../public/shared.js'), 'utf8');
  assert.match(phone, /setPointerCapture\(e\.pointerId\)/);
  assert.match(phone, /pointercancel/);
  assert.match(phone, /saveDraft\(\)/);
  assert.match(tvHtml, /frame-gilt\.png/);
  assert.match(phone, /One secret bid only/);
  assert.match(tvHtml, /One sealed wager per collector/);
  assert.match(shared, /FF\.drawStroke/);
});

test('simulation uses real rules with no impossible money or mismatched ledger', () => {
  const sim = run({ trials: 40, seed: 20261112 });
  assert.equal(sim.cases.length, 16);
  assert.ok(sim.cases.every(c => c.negative === 0 && c.ledgerErrors === 0));
  assert.ok(sim.cases.every(c => c.masterTurns === c.matches * c.players * c.laps));
});

test('joint winner ranks are equal, deterministic and do not alter guinea balances', () => {
  const { rankScores } = require('../lib/rules');
  const sample = [
    { id: 'z', score: 2000 }, { id: 'q', score: 1500 },
    { id: 'a', score: 2000 }, { id: 'x', score: 1200 }, { id: 'w', score: 1200 },
  ];
  const snapshot = JSON.stringify(sample);
  assert.deepEqual(rankScores(sample), [
    { id: 'a', score: 2000, rank: 1 }, { id: 'z', score: 2000, rank: 1 },
    { id: 'q', score: 1500, rank: 3 }, { id: 'w', score: 1200, rank: 4 },
    { id: 'x', score: 1200, rank: 4 },
  ]);
  assert.equal(JSON.stringify(sample), snapshot);
});

test('all-pass full match keeps joint-first place for every player without a tiebreaker', async t => {
  const srv = await startServer();
  t.after(() => srv.stop());
  const host = await tv(srv.port);
  const ps = [];
  for (let i = 0; i < 3; i++) ps.push(await player(srv.port, host.code, 'Equal' + i));
  t.after(() => { host.c.close(); ps.forEach(p => p.c.close()); });
  ps[0].c.send({ t: 'cmd', cmd: 'start' });
  for (let round = 1; round <= 3; round++) {
    await host.c.wait('state', s => s.phase === 'intro' && s.round === round);
    host.c.send({ t: 'tv_cmd', cmd: 'skip' });
    const drawing = await host.c.wait('state', s => s.phase === 'draw' && s.round === round);
    for (const p of ps) await submit(p, round);
    await host.c.wait('state', s => s.phase === 'auction' && s.round === round);
    for (const p of ps.filter(p => p.pid !== drawing.masterId)) {
      p.c.send({ t: 'pass' });
      await p.c.wait('pass_accepted', s => s.round === round);
    }
    await host.c.wait('state', s => s.phase === 'reveal' && s.round === round);
    host.c.send({ t: 'tv_cmd', cmd: 'next' });
    await host.c.wait('state', s => s.phase === 'scores' && s.round === round);
    host.c.send({ t: 'tv_cmd', cmd: 'next' });
  }
  const completed = await host.c.wait('state', s => s.phase === 'final');
  assert.equal(completed.final.ranking.length, 3);
  assert.ok(completed.final.ranking.every(r => r.score === 1000 && r.rank === 1));
  assert.equal(new Set(completed.final.ranking.map(r => r.id)).size, 3);
  const tvHtml = fs.readFileSync(path.join(__dirname, '../public/tv.html'), 'utf8');
  const phone = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
  assert.match(tvHtml, /joint-tag/);
  assert.match(tvHtml, /Joint /);
  assert.match(phone, /Joint /);
});
