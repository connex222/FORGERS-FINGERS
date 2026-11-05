'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname,'..');
const load = file => fs.readFileSync(path.join(ROOT,file),'utf8');
function shared() {
  const ctx = {window: {}, localStorage:{getItem(){return null}}};
  vm.runInNewContext(load('public/shared.js'),ctx,{filename:'public/shared.js'});
  return ctx.window.FF;
}
test('approved Stage 6 gallery grid uses exact 3, 4, 6 and 8 player layouts',()=>{
  const grid=shared().galleryGrid;
  const cases=[[3,3,1],[4,2,2],[6,3,2],[8,4,2]];
  for(const [count,cols,rows] of cases){const g=grid(count);assert.equal(g.columns,cols);assert.equal(g.rows,rows);assert.ok(cols*rows>=count);}
});
test('partial painting galleries 1, 2, 5 and 7 never exceed eight cells or omit a painting',()=>{
  const grid=shared().galleryGrid;
  for(const count of [1,2,5,7]){const g=grid(count);assert.ok(g.columns*g.rows>=count);assert.ok(g.columns*g.rows<=8);}
  for(const invalid of [0,9,-1,2.5,undefined,'8'])assert.throws(()=>grid(invalid));
});
test('TV layout is full viewport and QR/lobby controls are preserved',()=>{
  const tv=load('public/tv.html'),css=load('public/tv-stage6.css');
  assert.match(tv,/href="\/tv-stage6\.css"/);
  assert.match(css,/#stage\s*\{[^}]*width:100%;\s*height:100vh;\s*height:100dvh/);
  assert.doesNotMatch(tv,/scale\(\$\{s\}\)/);
  assert.match(tv,/id="joinQr"[^>]*\/qr\?code=/);
  assert.match(tv,/\-\-lot-cols:\$\{cols\};\-\-lot-rows:\$\{rows\}/);
  assert.match(tv,/id="ctl"/);
  assert.match(tv,/Tonight’s questionable reputations/);
  assert.match(css, /grid-template-rows:repeat\(2,minmax\(0,1fr\)\)/);
});
test('painting UI preserves full 3:4 canvas, all editing controls, status and drawing receipt',()=>{
  const phone=load('public/index.html'),css=load('public/phone-stage6.css');
  assert.match(phone,/href="\/phone-stage6\.css"/);
  for(const id of ['cv','undo','wash','clear','submit','drawHelp'])assert.match(phone,new RegExp('id="'+id+'"'));
  assert.match(phone,/sessionStorage\.setItem\(draftKey\(\)/);
  assert.match(phone,/case 'drawing_received'/);
  assert.match(phone,/Your painting stays on this device until the gallery confirms receipt/);
  assert.match(phone,/setPointerCapture/);
  assert.match(css,/max-height:680px/);
  assert.match(css,/orientation:landscape/);
});
test('all 26 approved artwork files remain byte-identical',()=>{
  const expected=load('ARTWORK-CHECKSUMS.sha256');
  let verified=0;
  for(const line of expected.trim().split(/\r?\n/)){
    const m=line.match(/^([a-f0-9]{64})\s+\*?(.+)$/i);
    assert.ok(m,'checksum manifest record '+line);
    const item=path.join(ROOT,m[2]);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(item)).digest('hex'),m[1],item);
    verified++;
  }
  assert.equal(verified,26);
});

test('live HTTP server serves both Stage 6 stylesheets and keeps original assets reachable', async()=>{
  const {startServer} = require('./helpers');
  const server = await startServer();
  try {
    for(const file of ['tv-stage6.css','phone-stage6.css']){
      const response=await fetch(`http://127.0.0.1:${server.port}/${file}`);
      assert.equal(response.status,200,file);
      assert.match(response.headers.get('content-type'),/text\/css/,file);
      assert.match(await response.text(),/Stage 6/,file);
    }
    for(const file of ['logo.png','frame-gilt.png','avatar-1.png']){
      const response=await fetch(`http://127.0.0.1:${server.port}/assets/${file}`);
      assert.equal(response.status,200,file);
      assert.match(response.headers.get('content-type'),/image\/png/,file);
    }
  } finally {await server.stop();}
});
