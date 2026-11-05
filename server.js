'use strict';
/*
  FORGERS FINGER — game server
  TV opens /tv  •  Phones open /  •  WebSocket at /ws
*/
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('./lib/transport');
const { canAfford, isBidUnit, settle } = require('./lib/rules');
const STORE = require('./lib/persistence');
const QR = require('./lib/qr');
const QRPNG = require('./lib/qr-png');
const DECKS = require('./decks');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');

const CONFIG = {
  MIN_PLAYERS: 3,
  MAX_PLAYERS: 8,
  START_SCORE: 1000,
  INTRO_MS: 6000,
  GRACE_MS: Number(process.env.FF_TEST_GRACE_MS || 4000),          // extra time after the paint timer for auto-submits to arrive
  HURRY_MS: Number(process.env.FF_TEST_HURRY_MS || 5000),          // "last strokes" warning when the Head Curator ends painting early
  AUCTION_MS: 50000,
  REVEAL_STEP_MS: 5500,    // one step per painting on the TV reveal
  REVEAL_TAIL_MS: 7000,    // People's Favourite step
  SCORES_AUTO_MS: 30000,   // auto-continue if nobody presses Next
  VOID_MS: Number(process.env.FF_TEST_VOID_MS || 7000),
  BID_UNIT: 100,
  MASTER_PER_CORRECT: 200,
  HEART_BONUS: 100,
  AVATARS: 8,
  PALETTE_SIZE: 14,
  LOBBY_DROP_MS: Number(process.env.FF_TEST_LOBBY_DROP_MS || 45000),
  MAX_DRAWING_BYTES: 240000,
  MAX_MESSAGES_PER_SECOND: 55,
  ROOM_IDLE_MS: Number(process.env.FF_TEST_ROOM_IDLE_MS || (20 * 60 * 1000)),
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
const HEADERS = {
  'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:; media-src 'self' https://cdn.creativeclaw.co; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
};
const server = http.createServer((req, res) => {
  for (const [name, value] of Object.entries(HEADERS)) res.setHeader(name, value);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end('Method not allowed'); }
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, 'http://local').pathname); }
  catch { res.writeHead(400); return res.end('Bad request'); }

  if (urlPath === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }); return res.end('ok'); }
  if (urlPath === '/qr' || urlPath === '/qr.png') {
    const code = new URL(req.url, 'http://local').searchParams.get('code');
    const host = req.headers.host || '';
    if (!validCode(code) || !/^[A-Za-z0-9.\-:\[\]]{1,160}$/.test(host)) { res.writeHead(400); return res.end('Invalid QR request'); }
    try {
      const scheme = (req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https') ? 'https' : 'http';
      const joinLink = `${scheme}://${host}/?code=${code}`;
      const usePng = urlPath === '/qr.png';
      const content = usePng ? QRPNG.png(joinLink) : QR.svg(joinLink);
      res.writeHead(200, { 'Content-Type': usePng ? 'image/png' : 'image/svg+xml', 'Content-Length': content.length, 'Cache-Control': 'no-store' }); return res.end(content);
    } catch { res.writeHead(400); return res.end('QR could not be generated'); }
  }

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
      'Cache-Control': urlPath.startsWith('/assets/') ? 'public, max-age=604800' : 'no-store',
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

/* ---------------- Helpers ---------------- */
const rooms = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const rnd = n => crypto.randomInt(n);
const pick = arr => arr[rnd(arr.length)];
const makeId = () => crypto.randomBytes(12).toString('hex');
const makeToken = () => crypto.randomBytes(32).toString('base64url');
const tokenHash = token => crypto.createHash('sha256').update(token).digest('hex');
function checkToken(provided, hash) {
  if (typeof provided !== 'string' || provided.length < 32 || provided.length > 128 || !/^[A-Za-z0-9_-]+$/.test(provided) || typeof hash !== 'string') return false;
  const a = Buffer.from(tokenHash(provided), 'hex'), b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const validCode = code => typeof code === 'string' && /^[A-HJ-NP-Z]{4}$/.test(code);
const fail = (ws, code, msg) => send(ws, { t: 'error', code, msg });

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
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 800) return null;
  const out = []; let total = 0;
  for (const s of raw) {
    if (!s || typeof s !== 'object' || Array.isArray(s)) return null;
    if (Object.hasOwn(s, 'f')) {
      if (!Number.isInteger(s.f) || s.f < 0 || s.f >= CONFIG.PALETTE_SIZE) return null;
      out.push({ f: s.f }); continue;
    }
    if (!Number.isInteger(s.c) || s.c < 0 || s.c >= CONFIG.PALETTE_SIZE ||
        !Number.isInteger(s.w) || s.w < 0 || s.w > 3 || !Array.isArray(s.p) ||
        s.p.length < 2 || s.p.length > 4000 || s.p.length % 2) return null;
    const pts = [];
    for (const n of s.p) {
      if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 1000) return null;
      pts.push(Math.round(n));
    }
    total += pts.length;
    if (total > 60000) return null;
    out.push({ c: s.c, w: s.w, p: pts });
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
    code: makeCode(), tvTokenHash: null, tv: null,
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
  room.epoch = (room.epoch || 0) + 1;
  clearTimeout(room.timer);
  room.timer = null;
  room.phase = phase;
  room.phaseEndsAt = ms ? Date.now() + ms : 0;
  room.quip = pickQuip(room, phase);
}
function later(room, ms, fn) {
  clearTimeout(room.timer);
  const epoch = room.epoch;
  room.timer = setTimeout(() => {
    if (epoch !== room.epoch) return;
    room.timer = null;
    fn();
  }, Math.max(0, ms));
  room.timer.unref();
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
      bid: !!(cur && cur.bids[p.id]), passed: !!(cur && cur.bids[p.id]?.pass),
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
  room.lastActive = Date.now();
  STORE.save(room);
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
  if (connected(room).length < CONFIG.MIN_PLAYERS) {
    if (!room.shortageSince) room.shortageSince = Date.now();
    if (Date.now() - room.shortageSince < 15000) {
      later(room, 1000, () => nextRound(room));
      return; // 15 seconds for phones to recover before ending the match
    }
    endGame(room); return;
  }
  room.shortageSince = 0;
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
    drawings: {}, drawingIds: {}, lots: [], bids: {}, hearts: {}, results: null, voided: null,
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
  return room.players.length > 0 && room.players.every(p => room.cur.drawings[p.id]);
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

const buyers = room => room.players.filter(p => p.id !== room.cur.masterId);
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
  if (cur.results) return; // settle once, even for double-fired timers / commands
  const master = getPlayer(room, cur.masterId);
  const { results, scores, stats } = settle({ players: room.players, cur });
  for (const p of room.players) { p.score = scores[p.id]; p.stats = stats[p.id]; }
  cur.results = results;
  const original = cur.lots.find(l => l.ownerId === cur.masterId);
  if (original) room.history.push({ title: cur.entry.title,
    masterName: master ? master.name : 'A mystery artist', strokes: original.strokes });
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
  reassignVip(room);
  room.cur = null; room.order = []; room.round = 0; room.final = null; room.history = [];
  setPhase(room, 'lobby', 0);
  sync(room);
}

function checkProgress(room) {
  if (room.phase === 'draw' && allDrawn(room)) endDraw(room);
  else if (room.phase === 'auction' && allBid(room)) endAuction(room);
}

function reassignVip(room) {
  const active = room.players.find(p => p.isVip && p.connected && p.ws);
  if (active) {
    for (const p of room.players) if (p !== active) p.isVip = false;
    return;
  }
  room.players.forEach(p => { p.isVip = false; });
  const next = room.players.find(p => p.connected && p.ws);
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
function bindPlayer(ws, room, p, freshToken) {
  if (p.dropTimer) { clearTimeout(p.dropTimer); p.dropTimer = null; }
  const old = p.ws;
  p.ws = ws; p.connected = true;
  ws._room = room.code; ws._pid = p.id; ws._role = 'player';
  if (old && old !== ws) { old._role = 'revoked'; try { old.close(4000, 'replaced'); } catch { /* ignore */ } }
  reassignVip(room);
  // The token is never included in broadcasts, telemetry or public URLs.
  send(ws, { t: 'joined', pid: p.id, code: room.code, name: p.name, ...(freshToken ? { resumeToken: freshToken } : {}) });
  sync(room);
  if (room.cur && room.cur.lots.length && ['auction', 'reveal', 'scores'].includes(room.phase)) sendLots(room, p);
  if (room.cur && room.cur.drawings[p.id]) send(ws, { t: 'drawing_received', round: room.round, submissionId: room.cur.drawingIds?.[p.id] });
}
function onJoin(ws, msg) {
  if (ws._role) return fail(ws, 'bound', 'This connection is already assigned.');
  const code = typeof msg.code === 'string' ? msg.code.trim().toUpperCase() : '';
  if (!validCode(code)) return fail(ws, 'code', 'Enter the four-letter gallery code.');
  const room = rooms.get(code);
  if (!room) return fail(ws, 'noroom', 'No gallery with that code. Check the code on the TV.');
  if (msg.pid !== undefined || msg.resumeToken !== undefined) {
    const existing = typeof msg.pid === 'string' ? getPlayer(room, msg.pid) : null;
    if (!existing || !checkToken(msg.resumeToken, existing.tokenHash))
      return fail(ws, 'resume_denied', 'Saved session not recognised. To join afresh, enter a name while the gallery is in the lobby.');
    return bindPlayer(ws, room, existing);
  }
  if (room.phase !== 'lobby') return fail(ws, 'started', 'This game has already started. Wait for the next one.');
  if (room.players.length >= CONFIG.MAX_PLAYERS) return fail(ws, 'full', `The gallery is full (${CONFIG.MAX_PLAYERS} players).`);
  if (typeof msg.name !== 'string') return fail(ws, 'name', 'Type a name first.');
  let name = cleanName(msg.name);
  if (!name) return fail(ws, 'name', 'Type a name first.');
  const taken = new Set(room.players.map(p => p.name.toLowerCase()));
  if (taken.has(name.toLowerCase())) {
    let n = 2;
    while (taken.has(`${name.slice(0, 10)} ${n}`.toLowerCase())) n++;
    name = `${name.slice(0, 10)} ${n}`;
  }
  const usedAv = new Set(room.players.map(p => p.avatar));
  let avatar = 1;
  while (usedAv.has(avatar) && avatar < CONFIG.AVATARS) avatar++;
  const token = makeToken();
  const p = { id: makeId(), tokenHash: tokenHash(token), name, avatar, ws: null, connected: false,
    isVip: false, score: CONFIG.START_SCORE,
    stats: { fooled: 0, duped: 0, hearts: 0, found: 0 }, dropTimer: null };
  room.players.push(p);
  bindPlayer(ws, room, p, token);
  send(room.tv, { t: 'sfx', name: 'join' });
}
function onTv(ws, msg) {
  if (ws._role) return fail(ws, 'bound', 'This connection is already assigned.');
  let room, token;
  if (msg.t === 'tv_resume') {
    const code = typeof msg.code === 'string' ? msg.code.trim().toUpperCase() : '';
    room = validCode(code) ? rooms.get(code) : null;
    if (!room || !checkToken(msg.token, room.tvTokenHash))
      return fail(ws, 'tv_resume_denied', 'The gallery cannot be resumed with these TV credentials. No replacement gallery was created.');
    token = msg.token;
  } else {
    room = createRoom(); token = makeToken(); room.tvTokenHash = tokenHash(token);
  }
  const old = room.tv;
  room.tv = ws;
  ws._room = room.code; ws._role = 'tv';
  if (old && old !== ws) { old._role = 'revoked'; try { old.close(4000, 'replaced'); } catch { /* ignore */ } }
  send(ws, { t: 'tv_ok', code: room.code, token });
  sync(room);
  if (room.cur && room.cur.lots.length && ['auction', 'reveal', 'scores'].includes(room.phase)) sendLots(room, 'tv');
}
function onMessage(ws, data) {
  let msg;
  try { msg = JSON.parse(data.toString()); } catch { return fail(ws, 'json', 'Malformed message.'); }
  if (!msg || typeof msg !== 'object' || Array.isArray(msg) || typeof msg.t !== 'string' || msg.t.length > 40) return fail(ws, 'schema', 'Invalid message.');
  const now = Date.now();
  if (!ws.rate || now - ws.rate.start >= 1000) ws.rate = { start: now, count: 0 };
  if (++ws.rate.count > CONFIG.MAX_MESSAGES_PER_SECOND) return fail(ws, 'rate', 'Too many messages; slow down.');
  if (msg.t === 'ping') return send(ws, { t: 'pong' });
  if (msg.t === 'tv_create' || msg.t === 'tv_resume') return onTv(ws, msg);
  if (msg.t === 'join') return onJoin(ws, msg);
  const room = rooms.get(ws._room);
  if (!room || (ws._role !== 'tv' && ws._role !== 'player')) return fail(ws, 'auth', 'Join a gallery first.');
  if (ws._role === 'tv') {
    if (room.tv !== ws) return fail(ws, 'stale', 'That TV connection has been replaced.');
    if (msg.t === 'tv_cmd' && typeof msg.cmd === 'string') command(room, msg.cmd, ws);
    else fail(ws, 'role', 'TV command not permitted.');
    return;
  }
  const p = getPlayer(room, ws._pid);
  if (!p || p.ws !== ws || !p.connected) return fail(ws, 'stale', 'That phone connection has been replaced.');
  const cur = room.cur;
  switch (msg.t) {
    case 'avatar': {
      if (room.phase !== 'lobby') return fail(ws, 'phase', 'Portraits can only change in the lobby.');
      const used = new Set(room.players.filter(x => x !== p).map(x => x.avatar));
      let a = p.avatar;
      for (let i = 0; i < CONFIG.AVATARS; i++) { a = (a % CONFIG.AVATARS) + 1; if (!used.has(a)) break; }
      p.avatar = a; sync(room); break;
    }
    case 'settings': {
      if (!p.isVip || room.phase !== 'lobby') return fail(ws, 'role', 'Only the Head Curator sets the lobby options.');
      if (Object.hasOwn(msg, 'deck') && !['family', 'adult'].includes(msg.deck)) return fail(ws, 'schema', 'Invalid collection.');
      if (Object.hasOwn(msg, 'drawTime') && !CONFIG.DRAW_TIMES.includes(msg.drawTime)) return fail(ws, 'schema', 'Invalid painting time.');
      if (Object.hasOwn(msg, 'laps') && !CONFIG.LAPS.includes(msg.laps)) return fail(ws, 'schema', 'Invalid lap count.');
      if (msg.deck && msg.deck !== room.settings.deck) { room.settings.deck = msg.deck; room.adultConfirmed = false; room.quip = pickQuip(room, 'lobby'); }
      if (msg.drawTime !== undefined) room.settings.drawTime = msg.drawTime;
      if (msg.laps !== undefined) room.settings.laps = msg.laps;
      sync(room); break;
    }
    case 'confirm_adult':
      if (!p.isVip || room.phase !== 'lobby' || room.settings.deck !== 'adult') return fail(ws, 'role', 'Adults-only approval requires the Head Curator.');
      room.adultConfirmed = true; sync(room); break;
    case 'cmd':
      if (!p.isVip || typeof msg.cmd !== 'string') return fail(ws, 'role', 'Only the Head Curator can control the gallery.');
      command(room, msg.cmd, ws); break;
    case 'drawing': {
      if (room.phase !== 'draw' || !cur) return fail(ws, 'phase', 'Painting has closed.');
      const id = msg.submissionId;
      if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{8,80}$/.test(id) || !Number.isInteger(msg.round) || msg.round !== room.round)
        return fail(ws, 'drawing_id', 'Drawing must identify the current lot.');
      if (cur.drawings[p.id]) {
        if (cur.drawingIds[p.id] === id) return send(ws, { t: 'drawing_received', round: room.round, submissionId: id });
        return fail(ws, 'duplicate', 'A different painting was already signed for this lot.');
      }
      if (!Array.isArray(msg.strokes) || Buffer.byteLength(JSON.stringify(msg.strokes)) > CONFIG.MAX_DRAWING_BYTES) return fail(ws, 'drawing_size', 'Drawing is too large.');
      const strokes = cleanStrokes(msg.strokes);
      if (!strokes) return fail(ws, 'drawing_invalid', 'Add at least one valid stroke before signing.');
      cur.drawings[p.id] = strokes; cur.drawingIds[p.id] = id;
      send(ws, { t: 'drawing_received', round: room.round, submissionId: id });
      send(room.tv, { t: 'sfx', name: 'submit' }); sync(room);
      if (allDrawn(room)) endDraw(room);
      break;
    }
    case 'bid': {
      if (room.phase !== 'auction' || !cur || p.id === cur.masterId || cur.bids[p.id]) return fail(ws, 'bid_denied', 'Bidding is not available.');
      const lot = cur.lots.find(l => l.letter === msg.lot);
      if (!lot || lot.ownerId === p.id || !isBidUnit(msg.amount) || !canAfford(p.score, msg.amount)) return fail(ws, 'bid_denied', 'Choose another artist’s lot and a bid you can afford.');
      if (msg.heart !== null && msg.heart !== undefined && !cur.lots.some(l => l.letter === msg.heart && l.ownerId !== p.id)) return fail(ws, 'heart_denied', 'You cannot admire your own painting.');
      cur.bids[p.id] = { lot: lot.letter, amount: msg.amount };
      if (msg.heart) cur.hearts[p.id] = msg.heart;
      send(ws, { t: 'bid_accepted', round: room.round, lot: lot.letter, amount: msg.amount });
      send(room.tv, { t: 'sfx', name: 'bid' }); sync(room);
      if (allBid(room)) endAuction(room);
      break;
    }
    case 'pass': {
      if (room.phase !== 'auction' || !cur || p.id === cur.masterId || cur.bids[p.id]) return fail(ws, 'pass_denied', 'Cannot pass now.');
      if (msg.heart !== null && msg.heart !== undefined) {
        const favourite = cur.lots.find(l => l.letter === msg.heart && l.ownerId !== p.id);
        if (!favourite) return fail(ws, 'heart_denied', 'You cannot admire your own painting.');
        cur.hearts[p.id] = favourite.letter;
      }
      cur.bids[p.id] = { pass: true }; send(ws, { t: 'pass_accepted', round: room.round });
      sync(room); if (allBid(room)) endAuction(room); break;
    }
    case 'heart': {
      if (room.phase !== 'auction' || !cur) return fail(ws, 'phase', 'Admiration is closed.');
      if (msg.lot === null) delete cur.hearts[p.id];
      else {
        const lot = cur.lots.find(l => l.letter === msg.lot);
        if (!lot || lot.ownerId === p.id) return fail(ws, 'heart_denied', 'You cannot admire your own painting.');
        cur.hearts[p.id] = lot.letter;
      }
      sync(room); break;
    }
    default: return fail(ws, 'unknown', 'Unsupported action.');
  }
}
function onClose(ws) {
  const room = rooms.get(ws._room);
  if (!room) return;
  if (ws._role === 'tv') { if (room.tv === ws) { room.tv = null; sync(room); } return; }
  const p = getPlayer(room, ws._pid);
  if (!p || p.ws !== ws) return;
  p.connected = false; p.ws = null;
  if (p.isVip) reassignVip(room);
  if (room.phase === 'lobby') {
    p.dropTimer = setTimeout(() => {
      if (p.connected || !rooms.has(room.code)) return;
      room.players = room.players.filter(x => x !== p);
      reassignVip(room); sync(room);
    }, CONFIG.LOBBY_DROP_MS);
    p.dropTimer.unref();
  } else checkProgress(room);
  sync(room);
}

/* ---------------- Recovery / expiry ---------------- */
function recoverRoom(raw) {
  if (Date.now() - raw.lastActive > CONFIG.ROOM_IDLE_MS) { STORE.remove(raw.code); return; }
  const room = {
    ...raw, tv: null, timer: null, epoch: 0,
    used: { family: new Set(raw.used?.family || []), adult: new Set(raw.used?.adult || []) },
    players: raw.players.map(p => ({ ...p, connected: false, ws: null, dropTimer: null })),
  };
  rooms.set(room.code, room);
  scheduleRecovered(room);
}
function scheduleRecovered(room) {
  const next = {
    intro: () => beginDraw(room), draw: () => endDraw(room), auction: () => endAuction(room),
    reveal: () => showScores(room), scores: () => nextRound(room), void: () => nextRound(room),
  }[room.phase];
  if (!next || !room.phaseEndsAt) return;
  const grace = room.phase === 'draw' ? CONFIG.GRACE_MS : room.phase === 'auction' ? 1500 : 0;
  later(room, Math.max(0, room.phaseEndsAt + grace - Date.now()), next);
}
for (const raw of STORE.loadAll()) recoverRoom(raw);

/* ---------------- WebSocket server ---------------- */

function allowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // non-browser clients still need a secret to resume
  try {
    const u = new URL(origin);
    const allow = new Set(String(process.env.FF_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean));
    return (['http:', 'https:'].includes(u.protocol) && u.host === req.headers.host) || allow.has(u.origin);
  } catch { return false; }
}
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 262144, verifyClient: allowedOrigin });
wss.on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', data => { try { onMessage(ws, data); } catch { fail(ws, 'server', 'Action rejected.'); } });
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
      STORE.remove(code);
    }
  }
}, Number(process.env.FF_TEST_CLEAN_INTERVAL_MS || 60000));

function shutdown() {
  for (const room of rooms.values()) { clearTimeout(room.timer); STORE.save(room); }
  server.close(() => process.exit(0));
  for (const client of wss.clients) client.terminate();
  setTimeout(() => process.exit(0), 2500).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
server.listen(PORT, () => console.log(`Forgers Finger running on port ${server.address().port}`));
