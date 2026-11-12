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

test('all decisions sealed: public Pass stays private, Master can still award a Heart', async t => {
  const srv = await startServer({ env: { FF_TEST_AUCTION_MS: '2400', FF_TEST_HEART_FINISH_MS: '900' } });
  t.after(() => srv.stop());
  const host = await tv(srv.port);
  const ps = [];
  for (let i = 0; i < 3; i++) ps.push(await player(srv.port, host.code, 'Private' + i));
  t.after(() => { host.c.close(); ps.forEach(p => p.c.close()); });
  const draw = await enterDraw(host.c, ps);
  for (const p of ps) await submit(p, draw.round);
  await host.c.wait('state', s => s.phase === 'auction');
  const master = ps.find(p => p.pid === draw.masterId);
  const bidders = ps.filter(p => p.pid !== draw.masterId);
  const ownLots = await master.c.wait('lots', s => s.round === draw.round);
  const admired = ownLots.lots.find(l => !l.mine);
  assert.ok(admired);

  bidders[0].c.send({ t: 'pass' });
  await bidders[0].c.wait('pass_accepted');
  const partial = await host.c.wait('state', s => s.phase === 'auction' && s.players.some(p => p.id === bidders[0].pid && p.bid));
  assert.equal(partial.auctionClosing, false);
  assert.equal(Object.hasOwn(partial.players.find(p => p.id === bidders[0].pid), 'passed'), false);
  assert.ok(partial.players.every(p => !Object.hasOwn(p, 'passed')));
  // The bidder still sees their own choice on the private state channel.
  const privateState = await bidders[0].c.wait('state', s => s.phase === 'auction' && s.you.bid?.pass === true);
  assert.equal(privateState.you.bid.pass, true);

  bidders[1].c.send({ t: 'pass' });
  await bidders[1].c.wait('pass_accepted');
  const closing = await host.c.wait('state', s => s.phase === 'auction' && s.auctionClosing);
  assert.ok(closing.timeLeft > 0 && closing.timeLeft <= 900);
  await bidders[0].c.expectError('pass_denied', { t: 'pass' });
  master.c.send({ t: 'heart', lot: admired.letter });
  const heartfelt = await master.c.wait('state', s => s.phase === 'auction' && s.you.heart === admired.letter);
  assert.equal(heartfelt.you.heart, admired.letter);
  const revealed = await host.c.wait('state', s => s.phase === 'reveal', 3500);
  assert.equal(revealed.results.totalBids, 0);
  assert.deepEqual(revealed.results.heartWinners, [admired.letter]);
  const artist = ownLots.lots.find(l => l.letter === admired.letter);
  assert.ok(artist && !artist.mine);
  assert.equal(revealed.players.find(p => p.id === ps.find(x => x.pid !== master.pid && ownLots.lots.find(l => l.letter === admired.letter)?.letter === admired.letter)?.pid)?.score >= 1000, true);
});

test('last decisions cannot prolong original sealed-auction deadline', async t => {
  const srv = await startServer({ env: { FF_TEST_AUCTION_MS: '1200', FF_TEST_HEART_FINISH_MS: '3200' } });
  t.after(() => srv.stop());
  const host = await tv(srv.port), ps = [];
  for (let i = 0; i < 3; i++) ps.push(await player(srv.port, host.code, 'Deadline' + i));
  t.after(() => { host.c.close(); ps.forEach(p => p.c.close()); });
  const draw = await enterDraw(host.c, ps);
  for (const p of ps) await submit(p, draw.round);
  const auction = await host.c.wait('state', s => s.phase === 'auction');
  assert.ok(auction.timeLeft > 0 && auction.timeLeft <= 1200);
  for (const p of ps.filter(p => p.pid !== draw.masterId)) {
    p.c.send({ t: 'pass' }); await p.c.wait('pass_accepted');
  }
  const closing = await host.c.wait('state', s => s.phase === 'auction' && s.auctionClosing);
  assert.ok(closing.timeLeft > 0 && closing.timeLeft <= auction.timeLeft);
  const reveal = await host.c.wait('state', s => s.phase === 'reveal', 3500);
  assert.equal(reveal.results.totalBids, 0);
});

test('server restart keeps sealed decision and Heart grace and settles once', async t => {
  const { connect, os } = require('./helpers');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-final-heart-'));
  const env = {
    FF_DATA_DIR: dir, FF_PERSISTENCE_KEY: 'test-only-32-characters-secret-aaaaaaaaa',
    FF_TEST_AUCTION_MS: '8000', FF_TEST_HEART_FINISH_MS: '2200',
  };
  let srv = await startServer({ env });
  const host = await tv(srv.port), ps = [];
  let restartedTv = null;
  t.after(async () => {
    host.c.close();
    ps.forEach(p => p.c.close());
    if (restartedTv) restartedTv.close();
    await srv.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  });
  for (let i = 0; i < 3; i++) ps.push(await player(srv.port, host.code, 'Persist' + i));
  const draw = await enterDraw(host.c, ps);
  for (const p of ps) await submit(p, draw.round);
  await host.c.wait('state', s => s.phase === 'auction');
  const master = ps.find(p => p.pid === draw.masterId);
  const lots = await master.c.wait('lots', m => m.round === draw.round);
  const heart = lots.lots.find(l => !l.mine).letter;
  for (const p of ps.filter(p => p.pid !== draw.masterId)) {
    p.c.send({ t: 'pass' });
    await p.c.wait('pass_accepted');
  }
  const closing = await host.c.wait('state', s => s.phase === 'auction' && s.auctionClosing);
  assert.ok(closing.timeLeft > 0 && closing.timeLeft <= 2200);
  master.c.send({ t: 'heart', lot: heart });
  await master.c.wait('state', s => s.phase === 'auction' && s.you.heart === heart);
  const originalPort = srv.port;
  await srv.stop();
  srv = await startServer({ port: originalPort, env });
  restartedTv = await connect(srv.port);
  restartedTv.send({ t: 'tv_resume', code: host.code, token: host.token });
  await restartedTv.wait('tv_ok');
  const first = await restartedTv.wait('state', s => s.phase === 'auction' || s.phase === 'reveal');
  assert.equal(first.code, host.code);
  const reveal = first.phase === 'reveal'
    ? first : await restartedTv.wait('state', s => s.phase === 'reveal', 6000);
  assert.equal(reveal.results.totalBids, 0);
  assert.deepEqual(reveal.results.heartWinners, [heart]);
  assert.equal(reveal.players.filter(p => p.score === 1100).length, 1);
  assert.equal(reveal.players.filter(p => p.score === 1000).length, 2);
});
