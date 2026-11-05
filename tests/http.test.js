'use strict';
const {test}=require('node:test');const {startServer,tv,player,connect,assert}=require('./helpers');
test('HTTP routes, security headers, static artwork and QR input validation',async t=>{
 const srv=await startServer();t.after(()=>srv.stop());const base=`http://127.0.0.1:${srv.port}`;
 const health=await fetch(base+'/health');assert.equal(await health.text(),'ok');assert.equal(health.headers.get('x-content-type-options'),'nosniff');
 assert.equal(health.headers.get('x-frame-options'),'DENY');
 for(const p of ['/','/tv','/shared.js','/assets/logo.png','/assets/bg-gallery.webp']){const r=await fetch(base+p);assert.equal(r.status,200,p);assert.ok((await r.arrayBuffer()).byteLength>0);}
 const home=await fetch(base+'/');assert.ok((await home.text()).includes('How to Play'));
 const bad=await fetch(base+'/server.js');assert.equal(bad.status,404);
 const notAllowed=await fetch(base+'/tv',{method:'POST'});assert.equal(notAllowed.status,405);
 for(const code of ['A1BC','AB','ABCD?token=hack','AAAAA','']){const r=await fetch(base+'/qr?code='+encodeURIComponent(code));assert.equal(r.status,400);}
 const r=await fetch(base+'/qr?code=ABCD');assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/svg+xml');
 const svg=await r.text();assert.match(svg,/^<svg/);assert.ok(!svg.includes('resumeToken'));
});
test('malicious WebSocket Origin rejected; normal game client still works',async t=>{
 const srv=await startServer();t.after(()=>srv.stop());
 const net=require('node:net');
 const response=await new Promise((resolve,reject)=>{
  const sock=net.connect(srv.port,'127.0.0.1');let buf='';
  sock.on('connect',()=>sock.write(`GET /ws HTTP/1.1\r\nHost: 127.0.0.1:${srv.port}\r\nOrigin: https://attacker.example\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==\r\n\r\n`));
  sock.on('data',chunk=>buf+=chunk);sock.on('end',()=>resolve(buf));sock.on('error',reject);
 });
 assert.match(response,/403 Forbidden/);
 const owner=await tv(srv.port);owner.c.close();
});
