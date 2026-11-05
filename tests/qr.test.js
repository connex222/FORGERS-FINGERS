'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const {qr,svg}=require('../lib/qr');
test('join QR is self-contained SVG and never includes private reconnect secrets',()=>{
 for(const link of ['http://localhost:3000/?code=ABCD','https://forgers-finger.onrender.com/?code=WXYZ',`https://gallery.example.org/?code=TEST&x=${'a'.repeat(75)}`]){
  const m=qr(link);assert.ok(m.length>=21);assert.equal(m.length,m[0].length);const text=svg(link);
  assert.match(text,/^<svg /);assert.ok(text.includes('<path'));assert.ok(!text.includes('token='));
 }
});
const crypto=require('node:crypto');
test('QR binary matrix matches independently generated ISO reference vectors (versions 3, 4, 8 and 9)',()=>{
 const cases=[
 ['http://localhost:3000/?code=ABCD','1d53067bf6009774770d685f7bf29954ebc2d416d88f13b2f6798a319cc845ca'],
 ['https://forgers-finger.onrender.com/?code=WXYZ','d0c4f269425694d1177968b5d3b0007d95d14a8969918188b8e5ad66c07cb027'],
 ['https://really-long-gallery-name-for-someone-who-uses-this-service.example.org/very/long/route/for/invite/?code=ABCD&source=qr','1e14049d9569a44e7321bf9d690dac29cb439e3f63d1c82e091dc8e5bbbe5be3'],
 ['https://example.com/?code=ABCD&'+'x'.repeat(136),'46c72918bb9eafd6e55538a14c5ebdd242a347c1f43bf7f28737ca6a669ad870'],
 ];
 for(const [url,hash] of cases){const bits=qr(url).map(row=>row.map(v=>v?'1':'0').join('')).join('\n');assert.equal(crypto.createHash('sha256').update(bits).digest('hex'),hash);}
});
