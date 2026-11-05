/* FORGERS FINGER — shared client helpers (TV + phone) */
(function () {
  'use strict';

  const FF = {};

  // Must match CONFIG.PALETTE_SIZE on the server (14 colours). Index 0 is the bare canvas (used as the rubber).
  FF.PALETTE = ['#F3EAD7', '#1B1712', '#FFFFFF', '#C8102E', '#F28C28', '#E8B923', '#2E8B3E',
                '#7EC8E3', '#1F4FA8', '#6B3FA0', '#F49AC1', '#7A4A23', '#F1C6A0', '#8C8C8C'];
  FF.PALETTE_NAMES = ['Rubber', 'Ink', 'White', 'Crimson', 'Orange', 'Ochre', 'Green',
                      'Sky', 'Royal blue', 'Purple', 'Pink', 'Umber', 'Peach', 'Grey'];
  FF.SIZES = [5, 12, 26, 56];          // brush widths, in thousandths of the canvas width
  FF.SIZE_NAMES = ['Fine', 'Medium', 'Thick', 'Huge'];

  // Stage 6 Batch A: tested, deterministic TV gallery row/column policy.
  FF.galleryGrid = function (count) {
    if (!Number.isInteger(count) || count < 1 || count > 8) throw new RangeError('Gallery count must be 1–8');
    const columns = count <= 3 ? count : count === 4 ? 2 : count <= 6 ? 3 : 4;
    const rows = count <= 3 ? 1 : 2;
    return { columns, rows };
  };

  // Stage 6 Batch B: auditable presentation arithmetic. The server still owns scoring.
  // Build every ledger line from *settled* result values, never unconfirmed bids.
  FF.roundLedger = function (players, results) {
    const r = results || {}, transfers = r.transfers || [], lots = r.lots || [];
    const winners = new Set(r.heartWinners || []);
    const deltas = r.deltas || {};
    return [...players].sort((a, b) => b.score - a.score).map(p => {
      const genuine = lots.filter(l => l.genuine).flatMap(l => l.buyers || [])
        .filter(b => b.id === p.id).reduce((total, b) => total + b.amount, 0);
      const forgeryIn = transfers.filter(t => t.to === p.id).reduce((total, t) => total + t.amount, 0);
      const forgeryOut = transfers.filter(t => t.from === p.id).reduce((total, t) => total + t.amount, 0);
      const master = p.id === r.masterId ? (r.masterEarned || 0) : 0;
      const favourite = lots.filter(l => winners.has(l.letter) && l.ownerId === p.id).length * 100;
      const delta = deltas[p.id] || 0;
      const before = p.score - delta;
      return { player: p, before, after: p.score, delta,
        breakdown: { genuine, forgeryIn, forgeryOut, master, favourite },
        consistent: before >= 0 && genuine + forgeryIn - forgeryOut + master + favourite === delta };
    });
  };

  FF.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  FF.drawStroke = function (ctx, s, w, h) {
    if (s.f !== undefined) { ctx.fillStyle = FF.PALETTE[s.f] || FF.PALETTE[0]; ctx.fillRect(0, 0, w, h); return; }
    const p = s.p;
    if (!p || p.length < 2) return;
    const col = FF.PALETTE[s.c] || FF.PALETTE[1];
    const lw = Math.max(1, FF.SIZES[s.w] * w / 1000);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const X = i => p[i] * w / 1000, Y = i => p[i + 1] * h / 1000;
    if (p.length === 2) { ctx.beginPath(); ctx.arc(X(0), Y(0), lw / 2, 0, Math.PI * 2); ctx.fill(); return; }
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    if (p.length === 4) ctx.lineTo(X(2), Y(2));
    else {
      for (let i = 2; i < p.length - 2; i += 2) {
        ctx.quadraticCurveTo(X(i), Y(i), (X(i) + X(i + 2)) / 2, (Y(i) + Y(i + 2)) / 2);
      }
      ctx.lineTo(X(p.length - 2), Y(p.length - 2));
    }
    ctx.stroke();
  };

  // Paint a full set of strokes onto a canvas, sized to its CSS box.
  FF.paint = function (canvas, strokes) {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth || 300, ch = canvas.clientHeight || 400;
    const W = Math.round(cw * dpr), H = Math.round(ch * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = FF.PALETTE[0];
    ctx.fillRect(0, 0, W, H);
    for (const s of strokes || []) FF.drawStroke(ctx, s, W, H);
  };

  // Paint every canvas with a data-lot attribute once layout has settled.
  FF.paintAll = function (root, lotsByLetter) {
    requestAnimationFrame(() => {
      root.querySelectorAll('canvas[data-lot]').forEach(c => {
        const lot = lotsByLetter[c.dataset.lot];
        if (lot) FF.paint(c, lot.strokes);
      });
    });
  };

  // Portrait with a lettered fallback underneath (image replaces it when the art exists)
  FF.avatar = function (index, name, cls) {
    const initial = FF.esc((name || '?').trim().charAt(0).toUpperCase() || '?');
    return `<span class="av av-${index} ${cls || ''}"><b>${initial}</b>` +
      `<img src="/assets/avatar-${index}.png" alt="" onload="this.parentNode.classList.add('img-ok')" onerror="this.remove()"></span>`;
  };

  // Image that silently disappears if the file has not been made yet
  // When the image loads, its parent gets .img-ok (so CSS can hide the text fallback)
  FF.img = (src, cls, alt) =>
    `<img class="${cls || ''}" src="${src}" alt="${FF.esc(alt || '')}" ` +
    `onload="this.parentNode.classList.add('img-ok')" onerror="this.remove()">`;

  /* ---------- Persistent, user-controlled sound settings ---------- */
  const cache = {};
  const activeEffects = new Set();
  const defaults = { enabled: false, music: true, effects: true, voice: true };
  try { FF.audio = { ...defaults, ...JSON.parse(localStorage.getItem('ff-audio') || '{}') }; }
  catch { FF.audio = { ...defaults }; }
  FF.soundOn = !!FF.audio.enabled;
  FF.saveAudio = function () {
    FF.soundOn = !!FF.audio.enabled;
    try { localStorage.setItem('ff-audio', JSON.stringify(FF.audio)); } catch { /* private mode */ }
    if (!FF.soundOn || !FF.audio.music) { FF.stopSfx('music-lobby'); FF.stopSfx('music-draw'); }
    if (!FF.soundOn || !FF.audio.voice) FF.stopVoice();
    if (!FF.soundOn || !FF.audio.effects) {
      for (const node of activeEffects) { try { node.pause(); node.currentTime = 0; } catch {} }
      activeEffects.clear();
    }
    if (typeof FF.audioChanged === 'function') FF.audioChanged();
  };
  FF.sfx = function (name, opts) {
    const category = name.startsWith('music-') ? 'music' : 'effects';
    if (!FF.soundOn || !FF.audio[category]) return;
    try {
      let a = cache[name];
      if (!a) { a = new Audio(`/assets/sfx/${name}.mp3`); a.preload = 'none'; cache[name] = a; }
      if (opts && opts.loop && !a.paused) return a;
      const node = (opts && opts.loop) ? a : a.cloneNode();
      node.volume = (opts && opts.volume) ?? 0.8;
      node.loop = !!(opts && opts.loop);
      if (!node.loop) {
        activeEffects.add(node);
        if (typeof node.addEventListener === 'function') node.addEventListener('ended', () => activeEffects.delete(node), {once:true});
      }
      node.play().catch(() => { activeEffects.delete(node); }); // browsers require a user gesture to unlock audio
      return node;
    } catch { return null; }
  };
  FF.stopSfx = function (name) { const a = cache[name]; if (a) { a.pause(); a.currentTime = 0; } };
  FF.stopMusic = function () { FF.stopSfx('music-lobby'); FF.stopSfx('music-draw'); };
  FF.music = function (phase, volume = 0.27) {
    if (!FF.soundOn || !FF.audio.music) { FF.stopMusic(); return; }
    const name = phase === 'draw' ? 'music-draw' : phase === 'lobby' ? 'music-lobby' : null;
    if (name !== 'music-lobby') FF.stopSfx('music-lobby');
    if (name !== 'music-draw') FF.stopSfx('music-draw');
    if (name) FF.sfx(name, { loop: true, volume });
  };
  FF.audioCapabilities = () => ({ recordedNarration: false, browserSpeech: typeof window.speechSynthesis !== 'undefined' });
  FF.rules = [
    'The Head Curator chooses Family or After Hours (18+), painting time and whether each artist is Master once or twice.',
    'One Master secretly receives the true painting title. Everyone else sees only a vague catalogue description.',
    'Every artist paints a picture. The Master paints the genuine masterpiece; the others are forgeries. Sign to submit.',
    'At auction the true title becomes visible. Collectors can bid 100, 200 or 300 guineas on another artist’s painting, provided they have enough money. You may Pass instead.',
    'You can give one heart to a painting you admire, including when you Pass, but never to your own picture.',
    'Finding the genuine painting wins you your bid as a bonus. An incorrect bid transfers its full value from you to its forger.',
    'The Master earns 200 guineas for each correct buyer only when some, but not all, real bids find the genuine painting. Passes are not bids.',
    'The most-admired painting earns its artist 100 guineas; ties each receive 100.',
    'After every artist’s Master turn (once or twice), the largest guinea balance wins. The TV also shows special awards and the genuine masterpieces.',
  ];
  // The illustrated tutorial lives in /tutorial.js and replaces the basic rules modal.
  // A safe text-only fallback is retained if the optional script failed to load.
  FF.showRules = function () {
    if (typeof FF.showTutorial === 'function') return FF.showTutorial();
    alert(FF.rules.map((rule, i) => `${i+1}. ${rule}`).join('\n\n'));
  };

  FF.stopVoice = function () {
    try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch { /* unsupported */ }
  };
  FF.speak = function (text, onFinished, onFailed) {
    if (!FF.audio.enabled || !FF.audio.voice || !('speechSynthesis' in window) ||
        !('SpeechSynthesisUtterance' in window)) return false;
    try {
      FF.stopVoice();
      const utterance = new SpeechSynthesisUtterance(String(text));
      utterance.lang = 'en-GB'; utterance.rate = 0.94; utterance.pitch = 0.82; utterance.volume = 0.92;
      const choices = window.speechSynthesis.getVoices();
      const british = choices.filter(v => /^en[-_]GB$/i.test(v.lang));
      const preferred = british.find(v => /male|george|daniel|ryan|arthur|oliver/i.test(v.name));
      if (preferred || british[0]) utterance.voice = preferred || british[0];
      utterance.onend = () => { if (typeof onFinished === 'function') onFinished(); };
      utterance.onerror = () => { if (typeof onFailed === 'function') onFailed(); };
      window.speechSynthesis.speak(utterance);
      return true;
    } catch { return false; }
  };

  /* ---------- WebSocket with automatic reconnect ---------- */
  FF.socket = function (handlers) {
    let ws = null, retry = 0, pingTimer = null;
    const api = {
      send(obj) { if (ws && ws.readyState === 1) { ws.send(JSON.stringify(obj)); return true; } return false; },
      get open() { return !!ws && ws.readyState === 1; },
    };
    function open() {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${proto}://${location.host}/ws`);
      ws.onopen = () => {
        retry = 0;
        clearInterval(pingTimer);
        pingTimer = setInterval(() => api.send({ t: 'ping' }), 20000);
        handlers.open && handlers.open();
      };
      ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } handlers.message(m); };
      ws.onclose = () => {
        clearInterval(pingTimer);
        handlers.close && handlers.close();
        setTimeout(open, Math.min(8000, 600 * Math.pow(2, retry++)));
      };
      ws.onerror = () => { try { ws.close(); } catch { /* ignore */ } };
    }
    open();
    return api;
  };

  /* ---------- Countdown (uses server's remaining time, so clocks needn't match) ---------- */
  FF.deadline = 0;
  FF.setTimeLeft = ms => { FF.deadline = ms > 0 ? Date.now() + ms : 0; };
  FF.secondsLeft = () => FF.deadline ? Math.max(0, Math.ceil((FF.deadline - Date.now()) / 1000)) : 0;

  FF.money = n => `${Number(n).toLocaleString('en-GB')} gns`;
  FF.signed = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n).toLocaleString('en-GB');

  window.FF = FF;
})();
