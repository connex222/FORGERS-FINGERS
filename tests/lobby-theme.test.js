'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('new auction-house lobby music is the original instrument-only Creative Claw asset', () => {
  const shared = read('public/shared.js');
  assert.match(shared, /"music-lobby": "https:\/\/cdn\.creativeclaw\.co\/u\/[^"]+\/audio\/[0-9a-f-]+\.mp3"/);
  assert.match(shared, /new Audio\(premiumSfx\[name\] \|\| `\/assets\/sfx\/\$\{name\}\.mp3`\)/);
  assert.match(shared, /node\.src = `\/assets\/sfx\/\$\{name\}\.mp3`/);
  assert.match(shared, /if \(!FF\.soundOn \|\| !FF\.audio\[category\]\) return/);
  assert.match(shared, /node\.loop = !!\(opts && opts\.loop\)/);
});

test('TV lobby plays at conversational level, other sound settings remain distinct', () => {
  const tv = read('public/tv.html');
  assert.match(tv, /FF\.music\(phase, phase === 'lobby' \? 0\.16 : phase === 'draw' \? 0\.23 : 0\.27\)/);
  assert.match(tv, /FF\.audio\.enabled = !FF\.audio\.enabled/);
  assert.match(tv, /FF\.saveAudio\(\)/);
  assert.match(tv, /function phaseSound\(phase\)/);
  const shared = read('public/shared.js');
  assert.match(shared, /FF\.stopSfx\('music-lobby'\)/);
  assert.match(shared, /FF\.stopSfx\('music-draw'\)/);
});
