'use strict';
const {test}=require('node:test');
const {strict:assert}=require('node:assert');
const fs=require('node:fs');const path=require('node:path');
const {png}=require('../lib/qr-png');
const root=path.resolve(__dirname,'..');
const tv=fs.readFileSync(path.join(root,'public/tv.html'),'utf8');
const phone=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'public/tv-lobby-premium.css'),'utf8');
test('real QR PNG contains a scan-ready PNG stream with quiet zone and stable pixel size',()=>{
 const link='https://forgers-fingers-1.onrender.com/?code=ABCD';const image=png(link);
 assert.equal(image.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 const width=image.readUInt32BE(16);const height=image.readUInt32BE(20);
 assert.equal(width,height);assert.ok(width>=300&&width<=1000);assert.ok(image.length>700);
});
test('TV lobby embeds QR PNG with SVG fallback, visible room code and original logo',()=>{
 assert.match(tv,/id="joinQr"[^>]+\/qr\.png\?code=|id="joinQr"[^>]+src="\/qr\.png/);
 assert.match(tv,/id="qrFallback"/);
 assert.match(tv,/qrImage\.addEventListener\('error'/);
 assert.match(tv,/\/qr\?code=/);
 assert.match(tv,/\/assets\/logo\.png/);
 assert.match(tv,/tv-lobby-premium\.css/);
 assert.match(tv,/Tonight’s <em>suspects<\/em>/);
 assert.match(css,/\.lobby-premium/);
});
test('desktop public homepage opens TV gallery; phone and code-bearing joins remain phone pages',()=>{
 assert.match(phone,/matchMedia\('\(min-width: 1000px\) and \(pointer: fine\)'\)/);
 assert.match(phone,/q\.has\('code'\)/);
 assert.match(phone,/q\.has\('player'\)/);
 assert.match(phone,/isReturningPlayer/);
 assert.match(phone,/location\.replace\('\/tv'\)/);
});
