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

  /* ---------- Sound (files are optional; silence if missing) ---------- */
  const cache = {};
  FF.soundOn = false;
  FF.sfx = function (name, opts) {
    if (!FF.soundOn) return;
    try {
      let a = cache[name];
      if (!a) { a = new Audio(`/assets/sfx/${name}.mp3`); a.preload = 'auto'; cache[name] = a; }
      const node = (opts && opts.loop) ? a : a.cloneNode();
      node.volume = (opts && opts.volume) || 0.8;
      node.loop = !!(opts && opts.loop);
      node.play().catch(() => {});
      return node;
    } catch { return null; }
  };
  FF.stopSfx = function (name) { const a = cache[name]; if (a) { a.pause(); a.currentTime = 0; } };

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
