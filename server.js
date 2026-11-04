'use strict';
/*
  FORGERS FINGER — game server
  TV opens /tv  •  Phones open /  •  WebSocket at /ws
*/
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const DECKS = require('./decks');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const CONFIG = {
  MIN_PLAYERS: 3,
  MAX_PLAYERS: 8,
  START_SCORE: 1000,
  INTRO_MS: 6000,
  GRACE_MS: 4000,          // extra time after the paint timer for auto-submits to arrive
  HURRY_MS: 5000,          // "last strokes" warning when the Head Curator ends painting early
  AUCTION_MS: 50000,
  REVEAL_STEP_MS: 5500,    // one step per painting on the TV reveal
  REVEAL_TAIL_MS: 7000,    // People's Favourite step
  SCORES_AUTO_MS: 30000,   // auto-continue if nobody presses Next
  VOID_MS: 7000,
  BID_UNIT: 100,
  MASTER_PER_CORRECT: 200,
  HEART_BONUS: 100,
  AVATARS: 8,
  PALETTE_SIZE: 14,
  LOBBY_DROP_MS: 45000,
  ROOM_IDLE_MS: 20 * 60 * 1000,
  DRAW_TIMES: [60, 90, 120],
  LAPS: [1, 2],
};
const LETTERS = 'ABCDEFGH';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8',
};

/* ---------------- Static file server ---------------- */
const server = http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, 'http://local').pathname); }
  catch { res.writeHead(400); return res.end('Bad request'); }

  if (urlPath === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  if (urlPath === '/') urlPath = '/index.html';
  else if (urlPath === '/tv' || urlPath === '/tv/') urlPath = '/tv.html';

  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath));
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': urlPath.startsWith('/assets/') ? 'public, max-age=604800' : 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

/* ---------------- Helpers ---------------- */
const rooms = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const rnd = n => crypto.randomInt(n);
const pick = arr => arr[rnd(arr.length)];
const makeId = () => crypto.randomBytes(8).toString('hex');

function makeCode() {
  let c;
  do { c = Array.from({ length: 4 }, () => CODE_CHARS[rnd(CODE_CHARS.length)]).join(''); }
  while (rooms.has(c));
  return c;
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function send(ws, obj) {
  if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify(obj)); } catch { /* ignore */ } }
}
function cleanName(raw) {
  return String(raw || '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12);
}
function cleanStrokes(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  let total = 0;
  for (const s of raw.slice(0, 800)) {
    if (!s || typeof s !== 'object') continue;
    if (s.f !== undefined) {
      const f = s.f | 0;
      if (f >= 0 && f < CONFIG.PALETTE_SIZE) out.push({ f });
      continue;
    }
    const c = s.c | 0, w = s.w | 0;
    if (c < 0 || c >= CONFIG.PALETTE_SIZE || w < 0 || w > 3 || !Array.isArray(s.p)) continue;
    const lim = Math.min(s.p.length - (s.p.length % 2), 4000);
    if (lim < 2) continue;
    const p = new Array(lim);
    for (let i = 0; i < lim; i++) {
      let v = Math.round(Number(s.p[i]));
      if (!Number.isFinite(v)) v = 0;
      p[i] = v < 0 ? 0 : v > 1000 ? 1000 : v;
    }
    total += lim;
    if (total > 60000) break;
    out.push({ c, w, p });
  }
  return out;
}
const getPlayer = (room, id) => room.players.find(p => p.id === id);
const connected = room => room.players.filter(p => p.connected);

function pickQuip(room, phase) {
  const base = DECKS.quips[phase] || [];
  const extra = room.settings.deck === 'adult' ? (DECKS.adultQuips[phase] || []) : [];
  const pool = base.concat(extra, extra); // adult lines get a little extra weight
  return pool.length ? pick(pool) : '';
}

/* ---------------- Rooms ---------------- */
function createRoom() {
  const room = {
    code: makeCode(), tvToken: makeId(), tv: null,
    players: [],
    settings: { deck: 'family', drawTime: 90, laps: 1 },
    adultConfirmed: false,
    phase: 'lobby', round: 0, order: [], cur: null, history: [], final: null,
    used: { family: new Set(), adult: new Set() },
    timer: null, phaseEndsAt: 0, quip: '', lastActive: Date.now(),
  };
  room.quip = pickQuip(room, 'lobby');
  rooms.set(room.code, room);
  return room;
}

function setPhase(room, phase, ms) {
  clearTimeout(room.timer);
  room.timer = null;
  room.phase = phase;
  room.phaseEndsAt = ms ? Date.now() + ms : 0;
  room.quip = pickQuip(room, phase);
}
function later(room, ms, fn) {
  clearTimeout(room.timer);
  room.timer = setTimeout(() => { room.timer = null; fn(); }, ms);
}

/* ---------------- State broadcasting ---------------- */
function baseState(room) {
  const cur = room.cur;
  const s = {
    t: 'state', code: room.code, phase: room.phase,
    settings: room.settings, adultConfirmed: room.adultConfirmed,
    round: room.round, totalRounds: room.order.length,
    min: CONFIG.MIN_PLAYERS, max: CONFIG.MAX_PLAYERS,
    timeLeft: room.phaseEndsAt ? Math.max(0, room.phaseEndsAt - Date.now()) : 0,
    quip: room.quip,
    players: room.players.map(p => ({
      id: p.id, name: p.name, avatar: p.avatar, score: p.score,
      connected: p.connected, isVip: p.isVip,
      submitted: !!(cur && cur.drawings[p.id]),
      bid: !!(cur && cur.bids[p.id]),
    })),
  };
  if (cur) {
    s.masterId = cur.masterId;
    s.catalogue = cur.entry.cat;
    s.voided = cur.voided || null;
    if (['auction', 'reveal', 'scores'].includes(room.phase)) s.title = cur.entry.title;
    if (room.phase === 'reveal' || room.phase === 'scores') s.results = cur.results;
  }
  if (room.phase === 'final') s.final = room.final;
  return s;
}

function stateFor(room, p, base) {
  const cur = room.cur;
  const s = Object.assign({}, base);
  if (s.final) s.final = Object.assign({}, s.final, { gallery: [] }); // phones don't need the paintings
  s.you = {
    id: p.id, name: p.name, avatar: p.avatar, isVip: p.isVip, score: p.score,
    isMaster: !!(cur && cur.masterId === p.id),
  };
  if (cur) {
    if (cur.masterId === p.id && room.phase === 'draw') s.you.secretTitle = cur.entry.title;
    s.you.submitted = !!cur.drawings[p.id];
    s.you.bid = cur.bids[p.id] || null;
    s.you.heart = cur.hearts[p.id] || null;
    const mine = cur.lots.find(l => l.ownerId === p.id);
    s.you.lot = mine ? mine.letter : null;
  }
  return s;
}

function sync(room) {
  const base = baseState(room);
  send(room.tv, base);
  for (const p of room.players) if (p.connected) send(p.ws, stateFor(room, p, base));
}

function sendLots(room, target) {
  const cur = room.cur;
  if (!cur || !cur.lots.length) return;
  const reveal = room.phase === 'reveal' || room.phase === 'scores';
  const forTv = cur.lots.map(l => ({ letter: l.letter, strokes: l.strokes }));
  const msgFor = p => ({
    t: 'lots', round: room.round,
    lots: cur.lots.map(l => ({ letter: l.letter, strokes: l.strokes, mine: l.ownerId === p.id })),
  });
  if (target === 'tv' || target === undefined) send(room.tv, { t: 'lots', round: room.round, lots: forTv, reveal });
  if (target && target !== 'tv') { send(target.ws, msgFor(target)); return; }
  if (target === undefined) for (const p of room.players) if (p.connected) send(p.ws, msgFor(p));
}

/* ---------------- Game flow ---------------- */
function drawEntry(room) {
  const deck = room.settings.deck;
  const pool = DECKS[deck];
  const used = room.used[deck];
  if (used.size >= pool.length) used.clear();
  let i;
  do { i = rnd(pool.length); } while (used.has(i));
  used.add(i);
  return { cat: pool[i][0], title: pool[i][1] };
}

function startGame(room) {
  const live = connected(room);
  if (room.phase !== 'lobby' && room.phase !== 'final') return 'The game has already started.';
  if (live.length < CONFIG.MIN_PLAYERS) return `You need at least ${CONFIG.MIN_PLAYERS} players.`;
  if (room.settings.deck === 'adult' && !room.adultConfirmed) return 'Confirm everyone is 18 or over to use the After Hours Collection.';

  // Drop anyone who left during the lobby
  room.players = room.players.filter(p => p.connected);
  for (const p of room.players) {
    p.score = CONFIG.START_SCORE;
    p.stats = { fooled: 0, duped: 0, hearts: 0, found: 0 };
  }
  room.history = [];
  room.final = null;
  room.round = 0;
  room.order = [];
  let last = null;
  for (let lap = 0; lap < room.settings.laps; lap++) {
    const ids = shuffle(room.players.map(p => p.id));
    if (ids.length > 1 && ids[0] === last) [ids[0], ids[1]] = [ids[1], ids[0]];
    room.order.push(...ids);
    last = ids[ids.length - 1];
  }
  nextRound(room);
  return null;
}

function nextRound(room) {
  if (connected(room).length < CONFIG.MIN_PLAYERS) { endGame(room); return; }
  while (room.round < room.order.length) {
    const master = getPlayer(room, room.order[room.round]);
    room.round++;
    if (master && master.connected) { beginRound(room, master); return; }
  }
  endGame(room);
}

function beginRound(room, master) {
  room.cur = {
    masterId: master.id, entry: drawEntry(room),
    drawings: {}, lots: [], bids: {}, hearts: {}, results: null, voided: null,
  };
  setPhase(room, 'intro', CONFIG.INTRO_MS);
  later(room, CONFIG.INTRO_MS, () => beginDraw(room));
  sync(room);
}

function beginDraw(room) {
  const ms = room.settings.drawTime * 1000;
  setPhase(room, 'draw', ms);
  later(room, ms + CONFIG.GRACE_MS, () => endDraw(room));
  sync(room);
}

function hurryDraw(room) {
  if (room.phase !== 'draw') return;
  const left = room.phaseEndsAt - Date.now();
  if (left <= CONFIG.HURRY_MS) return;
  room.phaseEndsAt = Date.now() + CONFIG.HURRY_MS;
  later(room, CONFIG.HURRY_MS + CONFIG.GRACE_MS, () => endDraw(room));
  sync(room);
}

function allDrawn(room) {
  const live = connected(room);
  return live.length > 0 && live.every(p => room.cur.drawings[p.id]);
}

function endDraw(room) {
  if (room.phase !== 'draw') return;
  const cur = room.cur;
  const entries = Object.entries(cur.drawings);
  if (!cur.drawings[cur.masterId]) return voidRound(room, 'master');
  if (entries.length < 2) return voidRound(room, 'few');

  cur.lots = shuffle(entries.map(([ownerId, strokes]) => ({ ownerId, strokes })));
  cur.lots.forEach((l, i) => { l.letter = LETTERS[i]; });
  setPhase(room, 'auction', CONFIG.AUCTION_MS);
  later(room, CONFIG.AUCTION_MS + 1500, () => endAuction(room));
  sendLots(room);
  sync(room);
}

function voidRound(room, reason) {
  room.cur.voided = reason;
  setPhase(room, 'void', CONFIG.VOID_MS);
  later(room, CONFIG.VOID_MS, () => nextRound(room));
  sync(room);
}

const buyers = room => connected(room).filter(p => p.id !== room.cur.masterId);
const allBid = room => { const b = buyers(room); return b.length > 0 && b.every(p => room.cur.bids[p.id]); };

function endAuction(room) {
  if (room.phase !== 'auction') return;
  computeResults(room);
  const steps = room.cur.lots.length;
  const ms = steps * CONFIG.REVEAL_STEP_MS + CONFIG.REVEAL_TAIL_MS;
  setPhase(room, 'reveal', ms);
  later(room, ms, () => showScores(room));
  sendLots(room, 'tv');
  sync(room);
}

function showScores(room) {
  if (room.phase !== 'reveal') return;
  setPhase(room, 'scores', CONFIG.SCORES_AUTO_MS);
  later(room, CONFIG.SCORES_AUTO_MS, () => nextRound(room));
  sync(room);
}

function computeResults(room) {
  const cur = room.cur;
  const master = getPlayer(room, cur.masterId);
  const raw = {};
  room.players.forEach(p => { raw[p.id] = 0; });

  const lots = cur.lots.map(l => ({
    letter: l.letter, ownerId: l.ownerId, genuine: l.ownerId === cur.masterId, buyers: [], hearts: 0,
  }));
  const byLetter = Object.fromEntries(lots.map(l => [l.letter, l]));
  const genuine = lots.find(l => l.genuine);

  const bidList = Object.entries(cur.bids);
  let correct = 0;
  for (const [buyerId, b] of bidList) {
    const lot = byLetter[b.lot];
    const buyer = getPlayer(room, buyerId);
    if (!lot || !buyer) continue;
    const amt = b.amount * CONFIG.BID_UNIT;
    lot.buyers.push({ id: buyerId, amount: amt });
    if (lot.genuine) {
      raw[buyerId] += amt;
      correct++;
      buyer.stats.found++;
    } else {
      raw[buyerId] -= amt;
      raw[lot.ownerId] = (raw[lot.ownerId] || 0) + amt;
      buyer.stats.duped += amt;
      const forger = getPlayer(room, lot.ownerId);
      if (forger) forger.stats.fooled += amt;
    }
  }

  let verdict;
  if (bidList.length === 0) verdict = 'nobids';
  else if (correct === 0) verdict = 'obscure';
  else if (correct === bidList.length) verdict = 'obvious';
  else {
    verdict = 'perfect';
    raw[cur.masterId] += correct * CONFIG.MASTER_PER_CORRECT;
  }

  for (const [, letter] of Object.entries(cur.hearts)) if (byLetter[letter]) byLetter[letter].hearts++;
  const maxHearts = Math.max(0, ...lots.map(l => l.hearts));
  const heartWinners = maxHearts > 0 ? lots.filter(l => l.hearts === maxHearts).map(l => l.letter) : [];
  for (const letter of heartWinners) {
    const owner = getPlayer(room, byLetter[letter].ownerId);
    if (owner) { raw[owner.id] += CONFIG.HEART_BONUS; owner.stats.hearts++; }
  }

  // Apply, never dropping below zero (the gallery quietly covers bad debts)
  const deltas = {};
  for (const p of room.players) {
    const before = p.score;
    p.score = Math.max(0, p.score + (raw[p.id] || 0));
    deltas[p.id] = p.score - before;
  }

  cur.results = {
    genuine: genuine ? genuine.letter : null, masterId: cur.masterId, verdict,
    correct, totalBids: bidList.length, lots, heartWinners, deltas,
    masterEarned: verdict === 'perfect' ? correct * CONFIG.MASTER_PER_CORRECT : 0,
    stepMs: CONFIG.REVEAL_STEP_MS, tailMs: CONFIG.REVEAL_TAIL_MS,
  };
  if (genuine) {
    room.history.push({
      title: cur.entry.title, masterName: master ? master.name : 'A mystery artist',
      strokes: cur.lots.find(l => l.ownerId === cur.masterId).strokes,
    });
  }
}

function endGame(room) {
  const ranking = [...room.players].sort((a, b) => b.score - a.score)
    .map(p => ({ id: p.id, score: p.score }));
  const award = (key, stat) => {
    let best = null;
    for (const p of room.players) if (p.stats && p.stats[stat] > 0 && (!best || p.stats[stat] > best.stats[stat])) best = p;
    return best ? { key, id: best.id, value: best.stats[stat] } : null;
  };
  room.final = {
    ranking,
    awards: [award('forger', 'fooled'), award('gullible', 'duped'), award('favourite', 'hearts'), award('eagle', 'found')].filter(Boolean),
    gallery: room.history,
  };
  room.cur = null;
  setPhase(room, 'final', 0);
  sync(room);
}

function backToLobby(room) {
  clearTimeout(room.timer);
  room.players = room.players.filter(p => p.connected);
  room.players.forEach(p => { p.score = CONFIG.START_SCORE; });
  if (!room.players.some(p => p.isVip) && room.players[0]) room.players[0].isVip = true;
  room.cur = null; room.order = []; room.round = 0; room.final = null; room.history = [];
  setPhase(room, 'lobby', 0);
  sync(room);
}

function checkProgress(room) {
  if (room.phase === 'draw' && allDrawn(room)) endDraw(room);
  else if (room.phase === 'auction' && allBid(room)) endAuction(room);
}

function reassignVip(room) {
  if (room.players.some(p => p.isVip && p.connected)) return;
  room.players.forEach(p => { p.isVip = false; });
  const next = room.players.find(p => p.connected);
  if (next) next.isVip = true;
}

/* ---------------- Commands (Head Curator or TV) ---------------- */
function command(room, cmd, replyTo) {
  const toast = msg => send(replyTo, { t: 'toast', msg });
  switch (cmd) {
    case 'start': {
      const err = room.phase === 'final' ? null : startGame(room);
      if (room.phase === 'final') backToLobby(room);
      if (err) toast(err);
      break;
    }
    case 'next':
      if (room.phase === 'reveal') showScores(room);
      else if (room.phase === 'scores' || room.phase === 'void') nextRound(room);
      else if (room.phase === 'final') backToLobby(room);
      break;
    case 'skip':
      if (room.phase === 'draw') hurryDraw(room);
      else if (room.phase === 'auction') endAuction(room);
      else if (room.phase === 'intro') beginDraw(room);
      break;
    case 'lobby':
      if (room.phase !== 'lobby') backToLobby(room);
      break;
  }
}

/* ---------------- Message handling ---------------- */
function bindPlayer(ws, room, p) {
  if (p.dropTimer) { clearTimeout(p.dropTimer); p.dropTimer = null; }
  if (p.ws && p.ws !== ws) { try { p.ws.close(4000, 'replaced'); } catch { /* ignore */ } }
  p.ws = ws; p.connected = true;
  ws._room = room.code; ws._pid = p.id; ws._role = 'player';
  reassignVip(room);
  send(ws, { t: 'joined', pid: p.id, code: room.code, name: p.name });
  sync(room);
  if (room.cur && room.cur.lots.length && ['auction', 'reveal', 'scores'].includes(room.phase)) sendLots(room, p);
}

function onJoin(ws, msg) {
  const code = String(msg.code || '').toUpperCase().trim();
  const room = rooms.get(code);
  if (!room) return send(ws, { t: 'error', code: 'noroom', msg: 'No gallery with that code. Check the code on the TV.' });

  if (msg.pid) {
    const existing = getPlayer(room, msg.pid);
    if (existing) return bindPlayer(ws, room, existing);
  }
  if (room.phase !== 'lobby') return send(ws, { t: 'error', code: 'started', msg: 'This game has already started. Wait for the next one.' });
  if (room.players.length >= CONFIG.MAX_PLAYERS) return send(ws, { t: 'error', code: 'full', msg: `The gallery is full (${CONFIG.MAX_PLAYERS} players).` });

  let name = cleanName(msg.name);
  if (!name) return send(ws, { t: 'error', code: 'name', msg: 'Type a name first.' });
  const taken = new Set(room.players.map(p => p.name.toLowerCase()));
  if (taken.has(name.toLowerCase())) {
    let n = 2;
    while (taken.has(`${name.slice(0, 10)} ${n}`.toLowerCase())) n++;
    name = `${name.slice(0, 10)} ${n}`;
  }
  const usedAv = new Set(room.players.map(p => p.avatar));
  let avatar = 1;
  while (usedAv.has(avatar) && avatar < CONFIG.AVATARS) avatar++;

  const p = {
    id: makeId(), name, avatar, ws: null, connected: false,
    isVip: !room.players.some(x => x.isVip), score: CONFIG.START_SCORE,
    stats: { fooled: 0, duped: 0, hearts: 0, found: 0 }, dropTimer: null,
  };
  room.players.push(p);
  bindPlayer(ws, room, p);
  send(room.tv, { t: 'sfx', name: 'join' });
}

function onTv(ws, msg) {
  let room = msg.t === 'tv_resume' ? rooms.get(String(msg.code || '').toUpperCase()) : null;
  if (room && room.tvToken !== msg.token) room = null;
  if (!room) room = createRoom();
  if (room.tv && room.tv !== ws) { try { room.tv.close(4000, 'replaced'); } catch { /* ignore */ } }
  room.tv = ws;
  ws._room = room.code; ws._role = 'tv';
  send(ws, { t: 'tv_ok', code: room.code, token: room.tvToken });
  sync(room);
  if (room.cur && room.cur.lots.length && ['auction', 'reveal', 'scores'].includes(room.phase)) sendLots(room, 'tv');
}

function onMessage(ws, data) {
  let msg;
  try { msg = JSON.parse(data); } catch { return; }
  if (!msg || typeof msg.t !== 'string') return;
  if (msg.t === 'ping') return send(ws, { t: 'pong' });
  if (msg.t === 'tv_create' || msg.t === 'tv_resume') return onTv(ws, msg);
  if (msg.t === 'join') return onJoin(ws, msg);

  const room = rooms.get(ws._room);
  if (!room) return;
  room.lastActive = Date.now();

  if (ws._role === 'tv') {
    if (msg.t === 'tv_cmd') command(room, msg.cmd, ws);
    return;
  }

  const p = getPlayer(room, ws._pid);
  if (!p || p.ws !== ws) return;
  const cur = room.cur;

  switch (msg.t) {
    case 'avatar': {
      if (room.phase !== 'lobby') return;
      const used = new Set(room.players.filter(x => x !== p).map(x => x.avatar));
      let a = p.avatar;
      for (let i = 0; i < CONFIG.AVATARS; i++) {
        a = (a % CONFIG.AVATARS) + 1;
        if (!used.has(a)) break;
      }
      p.avatar = a;
      sync(room);
      break;
    }
    case 'settings': {
      if (!p.isVip || room.phase !== 'lobby') return;
      if (msg.deck === 'family' || msg.deck === 'adult') {
        if (msg.deck !== room.settings.deck) room.adultConfirmed = false;
        room.settings.deck = msg.deck;
        room.quip = pickQuip(room, 'lobby');
      }
      if (CONFIG.DRAW_TIMES.includes(msg.drawTime)) room.settings.drawTime = msg.drawTime;
      if (CONFIG.LAPS.includes(msg.laps)) room.settings.laps = msg.laps;
      sync(room);
      break;
    }
    case 'confirm_adult':
      if (!p.isVip || room.phase !== 'lobby' || room.settings.deck !== 'adult') return;
      room.adultConfirmed = true;
      sync(room);
      break;
    case 'cmd':
      if (p.isVip) command(room, msg.cmd, ws);
      break;
    case 'drawing':
      if (room.phase !== 'draw' || !cur || cur.drawings[p.id]) return;
      cur.drawings[p.id] = cleanStrokes(msg.strokes);
      send(room.tv, { t: 'sfx', name: 'submit' });
      sync(room);
      if (allDrawn(room)) endDraw(room);
      break;
    case 'bid': {
      if (room.phase !== 'auction' || !cur || p.id === cur.masterId || cur.bids[p.id]) return;
      const lot = cur.lots.find(l => l.letter === msg.lot);
      const amount = msg.amount | 0;
      if (!lot || lot.ownerId === p.id || amount < 1 || amount > 3) return;
      cur.bids[p.id] = { lot: lot.letter, amount };
      if (msg.heart) {
        const h = cur.lots.find(l => l.letter === msg.heart);
        if (h && h.ownerId !== p.id) cur.hearts[p.id] = h.letter;
      }
      send(room.tv, { t: 'sfx', name: 'bid' });
      sync(room);
      if (allBid(room)) endAuction(room);
      break;
    }
    case 'heart': {
      // Master (or anyone before bidding) can admire a painting
      if (room.phase !== 'auction' || !cur) return;
      if (p.id !== cur.masterId && cur.bids[p.id]) return;
      if (msg.lot === null) { delete cur.hearts[p.id]; sync(room); return; }
      const h = cur.lots.find(l => l.letter === msg.lot);
      if (h && h.ownerId !== p.id) { cur.hearts[p.id] = h.letter; sync(room); }
      break;
    }
  }
}

function onClose(ws) {
  const room = rooms.get(ws._room);
  if (!room) return;
  if (ws._role === 'tv') { if (room.tv === ws) room.tv = null; return; }
  const p = getPlayer(room, ws._pid);
  if (!p || p.ws !== ws) return;
  p.connected = false;
  p.ws = null;
  if (p.isVip) reassignVip(room);
  if (room.phase === 'lobby') {
    p.dropTimer = setTimeout(() => {
      if (p.connected) return;
      room.players = room.players.filter(x => x !== p);
      reassignVip(room);
      sync(room);
    }, CONFIG.LOBBY_DROP_MS);
  } else {
    checkProgress(room);
  }
  sync(room);
}

/* ---------------- WebSocket server ---------------- */
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 1024 * 1024 });
wss.on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', data => onMessage(ws, data));
  ws.on('close', () => onClose(ws));
  ws.on('error', () => { /* handled by close */ });
});

setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    try { ws.ping(); } catch { /* ignore */ }
  }
}, 30000);

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const empty = !room.tv && !room.players.some(p => p.connected);
    if (empty && now - room.lastActive > CONFIG.ROOM_IDLE_MS) {
      clearTimeout(room.timer);
      room.players.forEach(p => clearTimeout(p.dropTimer));
      rooms.delete(code);
    }
  }
}, 60000);

server.listen(PORT, () => console.log(`Forgers Finger running on port ${PORT}`));
