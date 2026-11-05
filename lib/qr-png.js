'use strict';
// Dependency-free, crisp lossless PNG rendering of the existing verified QR matrix.
// This is intentionally separate from the QR encoder so all QR route variants use
// the same byte sequence / room join URL, with no external QR service.
const zlib = require('node:zlib');
const { qr } = require('./qr');
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let i = 0; i < 8; i++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(name, data) {
  const type = Buffer.from(name, 'ascii');
  const size = Buffer.alloc(4); size.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([type, data])));
  return Buffer.concat([size, type, data, crc]);
}
function png(link, moduleSize = 9) {
  if (!Number.isInteger(moduleSize) || moduleSize < 3 || moduleSize > 16) throw Error('Invalid QR scale');
  const matrix = qr(link);
  const quietZone = 4;
  const side = (matrix.length + quietZone * 2) * moduleSize;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(side, 0); header.writeUInt32BE(side, 4);
  header[8] = 8; // 8-bit samples
  header[9] = 0; // greyscale
  const pixels = Buffer.alloc((side + 1) * side, 255);
  for (let y = 0; y < side; y++) {
    const row = y * (side + 1);
    pixels[row] = 0; // PNG filter None
    const my = Math.floor(y / moduleSize) - quietZone;
    for (let x = 0; x < side; x++) {
      const mx = Math.floor(x / moduleSize) - quietZone;
      pixels[row + 1 + x] = (my >= 0 && my < matrix.length && mx >= 0 && mx < matrix.length && matrix[my][mx]) ? 17 : 255;
    }
  }
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(pixels, { level: 8 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}
module.exports = { png };
