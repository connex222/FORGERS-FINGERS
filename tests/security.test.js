'use strict';
const {test}=require('node:test');
const {startServer,connect,tv,player,enterDraw,submit,assert}=require('./helpers');
test('player identity, authenticated TV/phone resumes, cross-room and malformed request controls',async t=>{
 const srv=await startServer();t.after(()=>srv.stop());
 const owner=await tv(srv.port);const a=await player(srv.port,owner.code,'Alice');const b=await player(srv.port,owner.code,'Bob');const c=await player(srv.port,owner.code,'Cat');
 t.after(()=>[a.c,b.c,c.c,owner.c].forEach(x=>x.close()));
 assert.equal(a.resumeToken.length>32,true);
 const outsider=await connect(srv.port);t.after(()=>outsider.close());
 outsider.send({t:'join',code:owner.code,pid:a.pid,name:'Intruder'});
 await outsider.expectError('resume_denied');
 outsider.send({t:'join',code:owner.code,pid:a.pid,resumeToken:'incorrect'.repeat(8),name:'Intruder'});
 await outsider.expectError('resume_denied');
 outsider.send({t:'tv_resume',code:owner.code,token:'wrong'.repeat(12)});
 await outsider.expectError('tv_resume_denied');
 await outsider.expectError('auth',{t:'tv_cmd',cmd:'start'});
 const other=await tv(srv.port);t.after(()=>other.c.close());
 const cross=await connect(srv.port);t.after(()=>cross.close());
 cross.send({t:'join',code:other.code,pid:a.pid,resumeToken:a.resumeToken});await cross.expectError('resume_denied');
 other.c.send({t:'tv_resume',code:owner.code,token:owner.token});await other.c.expectError('bound');
 b.c.send({t:'tv_cmd',cmd:'start'});await b.c.expectError('unknown');
 b.c.send({t:'settings',deck:'adult'});await b.c.expectError('role');
 a.c.send({t:'settings',drawTime:'90'});await a.c.expectError('schema');
 outsider.ws.send('not json');await outsider.expectError('json');
 outsider.ws.send(JSON.stringify({t:'unknown',text:'a'.repeat(260000)}));
 await new Promise(r=>setTimeout(r,80));
 // Credentials only in the private joined and TV-ok messages (never state broadcasts).
 for(const cl of [owner.c,a.c,b.c,c.c])for(const msg of cl.inbox)if(msg.t==='state'||msg.t==='lots'){
  assert.ok(!JSON.stringify(msg).includes(a.resumeToken));assert.ok(!JSON.stringify(msg).includes(owner.token));
 }
 const oldA=a.c;
 const resumed=await connect(srv.port);t.after(()=>resumed.close());
 resumed.send({t:'join',code:owner.code,pid:a.pid,resumeToken:a.resumeToken});
 const joined=await resumed.wait('joined');assert.equal(joined.pid,a.pid);
 const state=await resumed.wait('state');assert.equal(state.you.isVip,true);assert.equal(state.you.score,1000);
 try{oldA.send({t:'settings',laps:2});}catch{};
 await new Promise(r=>setTimeout(r,90));
 resumed.send({t:'settings',laps:2});await resumed.wait('state',s=>s.settings.laps===2);
 // Active TV session replacement immediately revokes old controller.
 const tv2=await connect(srv.port);t.after(()=>tv2.close());
 tv2.send({t:'tv_resume',code:owner.code,token:owner.token});const tvok=await tv2.wait('tv_ok');assert.equal(tvok.code,owner.code);
 await tv2.wait('state');
 try{owner.c.send({t:'tv_cmd',cmd:'start'});}catch{};
 // The Master-only title remains unseen until auction.
 const participants=[{...a,c:resumed},b,c];
 const drawing=await enterDraw(tv2,participants,owner.code);
 const others=await Promise.all(participants.map(p=>p.c.wait('state',s=>s.phase==='draw')));
 for(let i=0;i<participants.length;i++){
  const st=others[i]; assert.equal(Boolean(st.you.secretTitle),participants[i].pid===drawing.masterId);
 }
 for(const p of participants)await submit(p,drawing.round);
 const auction=await tv2.wait('state',s=>s.phase==='auction');assert.ok(auction.title);
 for(const p of participants)await p.c.wait('state',s=>s.phase==='auction');
 const bidder=participants.find(p=>p.pid!==drawing.masterId);
 const lotState=await bidder.c.wait('lots');const mine=lotState.lots.find(l=>l.mine);
 bidder.c.send({t:'bid',lot:mine.letter,amount:3});await bidder.c.expectError('bid_denied');
 bidder.c.send({t:'bid',lot:lotState.lots.find(l=>!l.mine).letter,amount:'3'});await bidder.c.expectError('bid_denied');
 bidder.c.send({t:'drawing',round:drawing.round,submissionId:'wrong_late_1',strokes:[{f:1}]});await bidder.c.expectError('phase');
});
