'use strict';
// Minimal RFC 6455 text WebSocket transport for this zero-dependency Node server.
// Tests cover masking, fragmentation, oversized frames, ping/pong and stale sockets.
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');
const { TextDecoder } = require('node:util');
const MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
function writeFrame(socket, opcode, data = Buffer.alloc(0)) {
  if (socket.destroyed || !socket.writable) return;
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
  let h = payload.length < 126 ? Buffer.alloc(2) : payload.length < 65536 ? Buffer.alloc(4) : Buffer.alloc(10);
  h[0] = 0x80 | opcode;
  if (h.length === 2) h[1] = payload.length;
  else if (h.length === 4) { h[1] = 126; h.writeUInt16BE(payload.length, 2); }
  else { h[1] = 127; h.writeBigUInt64BE(BigInt(payload.length), 2); }
  socket.write(Buffer.concat([h, payload]));
}
class Connection extends EventEmitter {
  constructor(socket, maxPayload) {
    super(); this.socket = socket; this.readyState = 1;
    this.buf = Buffer.alloc(0); this.fragments = []; this.fragmentBytes = 0; this.fragmentOpcode = 0;
    this.maxPayload = maxPayload;
    socket.on('data', chunk => this.consume(chunk));
    socket.on('close', () => { if (this.readyState !== 3) { this.readyState = 3; this.emit('close'); } });
    socket.on('error', err => this.emit('error', err));
  }
  send(txt) { if (this.readyState === 1) writeFrame(this.socket, 1, txt); }
  ping() { if (this.readyState === 1) writeFrame(this.socket, 9); }
  close(code = 1000, reason = '') {
    if (this.readyState !== 1) return;
    this.readyState = 2;
    const r = Buffer.from(String(reason).slice(0, 100));
    writeFrame(this.socket, 8, Buffer.concat([Buffer.from([(code >> 8) & 255, code & 255]), r]));
    this.socket.end();
    setTimeout(() => this.socket.destroy(), 500).unref();
  }
  terminate() { this.socket.destroy(); }
  fail(code = 1002) { this.close(code); }
  consume(chunk) {
    if (this.readyState !== 1) return;
    this.buf = Buffer.concat([this.buf, chunk]);
    if (this.buf.length > this.maxPayload + 32) return this.fail(1009);
    while (this.buf.length >= 2 && this.readyState === 1) {
      const b0 = this.buf[0], b1 = this.buf[1], fin = !!(b0 & 128), opcode = b0 & 15;
      if ((b0 & 112) || !(b1 & 128)) return this.fail();
      let len = b1 & 127, p = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); p = 4; }
      if (len === 127) {
        if (this.buf.length < 10) return;
        const n = this.buf.readBigUInt64BE(2);
        if (n > BigInt(this.maxPayload)) return this.fail(1009);
        len = Number(n); p = 10;
      }
      if (len > this.maxPayload || len + this.fragmentBytes > this.maxPayload) return this.fail(1009);
      if (this.buf.length < p + 4 + len) return;
      const mask = this.buf.subarray(p, p + 4);
      const data = Buffer.from(this.buf.subarray(p + 4, p + 4 + len));
      for (let i = 0; i < len; i++) data[i] ^= mask[i & 3];
      this.buf = this.buf.subarray(p + 4 + len);
      if (opcode >= 8) {
        if (!fin || len > 125) return this.fail();
        if (opcode === 8) { this.close(); return; }
        if (opcode === 9) writeFrame(this.socket, 10, data);
        else if (opcode === 10) this.emit('pong');
        else return this.fail();
        continue;
      }
      if (opcode === 1) {
        if (this.fragmentOpcode) return this.fail();
        if (fin) this.deliver(data);
        else { this.fragmentOpcode = 1; this.fragments = [data]; this.fragmentBytes = len; }
      } else if (opcode === 0 && this.fragmentOpcode) {
        this.fragments.push(data); this.fragmentBytes += len;
        if (fin) { this.deliver(Buffer.concat(this.fragments)); this.fragments = []; this.fragmentBytes = 0; this.fragmentOpcode = 0; }
      } else return this.fail(1003);
    }
  }
  deliver(data) {
    try { new TextDecoder('utf-8', { fatal: true }).decode(data); }
    catch { this.fail(1007); return; }
    this.emit('message', data);
  }
}
class WebSocketServer extends EventEmitter {
  constructor({ server, path = '/ws', maxPayload = 262144, verifyClient }) {
    super(); this.clients = new Set(); this.maxPayload = maxPayload;
    server.on('upgrade', (req, socket, head) => {
      let pathname;
      try { pathname = new URL(req.url, 'http://localhost').pathname; } catch { socket.destroy(); return; }
      if (pathname !== path || req.method !== 'GET' || req.headers.upgrade?.toLowerCase() !== 'websocket' ||
          !String(req.headers.connection || '').toLowerCase().split(',').map(s=>s.trim()).includes('upgrade') ||
          req.headers['sec-websocket-version'] !== '13' ||
          !/^[A-Za-z0-9+/]{22}==$/.test(req.headers['sec-websocket-key'] || '') ||
          Buffer.from(req.headers['sec-websocket-key'] || '', 'base64').length !== 16 ||
          (verifyClient && !verifyClient(req))) {
        socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return;
      }
      const accept = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + MAGIC).digest('base64');
      socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
      socket.setNoDelay(true);
      const ws = new Connection(socket, this.maxPayload);
      this.clients.add(ws);
      ws.on('close', () => this.clients.delete(ws));
      this.emit('connection', ws, req);
      if (head.length) ws.consume(head);
    });
  }
}
module.exports = { WebSocketServer };
