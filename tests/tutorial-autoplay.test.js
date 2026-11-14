'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/tutorial.js'), 'utf8');

function makeHarness({ enabled = true, voice = true } = {}) {
  const playback = [];
  const paused = [];
  const listeners = {};
  let activeDialog;
  let nextTimer = 1;
  const timers = new Map();
  const originalFocus = { isConnected: true, focus() {} };
  const document = {
    activeElement: originalFocus,
    body: {
      appendChild(node) { node.isConnected = true; activeDialog = node; }
    },
    createElement() {
      const nodes = new Map();
      function node(selector) {
        if (!nodes.has(selector)) {
          const listeners = {};
          const n = {
            textContent: '', src: '', alt: '', disabled: false, style: {},
            setAttribute(key, val) { this[key] = val; },
            addEventListener(type, cb) { listeners[type] = cb; },
            click() { assert.ok(listeners.click, 'Missing click handler: ' + selector); listeners.click(); },
            focus() { document.activeElement = this; }
          };
          nodes.set(selector, n);
        }
        return nodes.get(selector);
      }
      return {
        id: '', className: '', innerHTML: '', isConnected: false,
        setAttribute() {},
        querySelector: node,
        querySelectorAll() { return []; },
        remove() { this.isConnected = false; if (activeDialog === this) activeDialog = null; }
      };
    },
    addEventListener(type, cb) { listeners[type] = cb; },
    removeEventListener(type, cb) { if (listeners[type] === cb) delete listeners[type]; }
  };
  class AudioMock {
    constructor(url) { this.url = url; this.playing = false; this.onended = null; this.onerror = null; }
    play() { this.playing = true; playback.push(this.url); return Promise.resolve(); }
    pause() { this.playing = false; paused.push(this.url); }
  }
  const ff = {
    audio: { enabled, voice },
    stopVoice() {},
    speak() { throw Error('Unexpected browser voice fallback'); }
  };
  vm.runInNewContext(source, {
    FF: ff, window: { FF: ff }, document, Audio: AudioMock,
    setTimeout(cb) { const id = nextTimer++; timers.set(id, cb); return id; },
    clearTimeout(id) { timers.delete(id); }
  }, { filename: 'tutorial.js' });
  return {
    ff, playback, paused, timers,
    get dialog() { return activeDialog; },
    click(selector) { assert.ok(activeDialog, 'Tutorial is closed'); activeDialog.querySelector(selector).click(); },
    get(selector) { assert.ok(activeDialog); return activeDialog.querySelector(selector); }
  };
}

test('How to Play opens directly in Play mode and immediately begins recorded chapter one', () => {
  const h = makeHarness();
  h.ff.showTutorial();
  assert.equal(h.playback.length, 1, 'Opening must play without a separate click');
  assert.match(h.playback[0], /\.mp3$/);
  assert.equal(h.get('[data-ff-chapter]').textContent, 'Chapter 1 of 9');
  assert.equal(h.get('[data-ff-play]').textContent, 'Pause');
  assert.equal(h.get('[data-ff-play]')['aria-pressed'], 'true');
  h.click('[data-ff-close]');
  assert.equal(h.dialog, null);
  assert.equal(h.paused.length, 1);
});

test('Next and Previous immediately narrate when playing, without forcing a second Play click', () => {
  const h = makeHarness();
  h.ff.showTutorial();
  h.click('[data-ff-next]');
  assert.equal(h.get('[data-ff-chapter]').textContent, 'Chapter 2 of 9');
  assert.equal(h.playback.length, 2);
  assert.notEqual(h.playback[1], h.playback[0]);
  h.click('[data-ff-prev]');
  assert.equal(h.get('[data-ff-chapter]').textContent, 'Chapter 1 of 9');
  assert.equal(h.playback.length, 3);
  assert.equal(h.get('[data-ff-play]').textContent, 'Pause');
  h.click('[data-ff-close]');
});

test('Pausing is respected across navigation; resuming starts current chapter; reopening restarts chapter one', () => {
  const h = makeHarness();
  h.ff.showTutorial();
  h.click('[data-ff-play]');
  assert.equal(h.get('[data-ff-play]').textContent, 'Play');
  assert.equal(h.get('[data-ff-play]')['aria-pressed'], 'false');
  assert.equal(h.paused.length, 1);
  h.click('[data-ff-next]');
  assert.equal(h.get('[data-ff-chapter]').textContent, 'Chapter 2 of 9');
  assert.equal(h.playback.length, 1, 'Paused browsing must not restart sound');
  h.click('[data-ff-play]');
  assert.equal(h.playback.length, 2);
  assert.equal(h.get('[data-ff-play]').textContent, 'Pause');
  h.click('[data-ff-close]');
  h.ff.showTutorial();
  assert.equal(h.get('[data-ff-chapter]').textContent, 'Chapter 1 of 9');
  assert.equal(h.playback.length, 3);
  h.click('[data-ff-close]');
});

test('Muted narration is respected even though tutorial visuals start automatically', () => {
  const h = makeHarness({ enabled: false, voice: true });
  h.ff.showTutorial();
  assert.equal(h.playback.length, 0);
  assert.equal(h.get('[data-ff-play]').textContent, 'Pause');
  assert.match(h.get('[data-ff-voice-status]').textContent, /Voice or sound is off/);
  h.click('[data-ff-next]');
  assert.equal(h.get('[data-ff-chapter]').textContent, 'Chapter 2 of 9');
  h.click('[data-ff-close]');
});
