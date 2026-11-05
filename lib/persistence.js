'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dir = process.env.FF_DATA_DIR;
const secret = process.env.FF_PERSISTENCE_KEY;
if (!!dir !== !!secret) throw Error('FF_DATA_DIR and FF_PERSISTENCE_KEY must be set together');
if (secret && secret.length < 32) throw Error('FF_PERSISTENCE_KEY must be at least 32 characters');
if (dir) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
const key = secret && crypto.createHash('sha256').update(secret).digest();
function fileFor(code) { if (!/^[A-Z]{4}$/.test(code)) throw Error('Invalid room code'); return path.join(dir, code + '.room'); }
function snapshot(room) {
  return {
    version: 1, code: room.code, tvTokenHash: room.tvTokenHash,
    players: room.players.map(p => ({ id: p.id, tokenHash: p.tokenHash, name: p.name, avatar: p.avatar,
      isVip: p.isVip, score: p.score, stats: p.stats })),
    settings: room.settings, adultConfirmed: room.adultConfirmed,
    phase: room.phase, phaseEndsAt: room.phaseEndsAt, round: room.round, order: room.order,
    cur: room.cur, history: room.history, final: room.final,
    used: { family: [...room.used.family], adult: [...room.used.adult] },
    quip: room.quip, lastActive: room.lastActive,
  };
}
function save(room) {
  if (!dir) return;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(snapshot(room)))), cipher.final()]);
  const payload = Buffer.concat([iv, cipher.getAuthTag(), data]);
  const filename = fileFor(room.code), tmp = filename + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, payload, { mode: 0o600 });
  fs.renameSync(tmp, filename);
}
function loadAll() {
  if (!dir) return [];
  const rooms = [];
  for (const filename of fs.readdirSync(dir).filter(f => /^[A-Z]{4}\.room$/.test(f))) {
    try {
      const raw = fs.readFileSync(path.join(dir, filename));
      if (raw.length < 29) continue;
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
      decipher.setAuthTag(raw.subarray(12, 28));
      const object = JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString());
      if (object.version === 1 && object.code + '.room' === filename && Array.isArray(object.players)) rooms.push(object);
    } catch { /* corrupt / wrong key: fail closed without logging credentials */ }
  }
  return rooms;
}
function remove(code) { if (dir) { try { fs.unlinkSync(fileFor(code)); } catch (e) { if (e.code !== 'ENOENT') throw e; } } }
module.exports = { enabled: !!dir, save, loadAll, remove };
