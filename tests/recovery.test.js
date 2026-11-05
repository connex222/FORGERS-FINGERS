'use strict';
const {test}=require('node:test');
const {startServer,connect,tv,player,enterDraw,submit,assert,fs,os,path}=require('./helpers');
async function resume(port,person) {
 const c=await connect(port);c.send({t:'join',code:person.code,pid:person.pid,resumeToken:person.resumeToken});
 const j=await c.wait('joined');assert.equal(j.pid,person.pid);const state=await c.wait('state');person.c.close();person.c=c;
 return state;
}
async function resumeTv(port,person) {
 const c=await connect(port);c.send({t:'tv_resume',code:person.code,token:person.token});await c.wait('tv_ok');const st=await c.wait('state');person.c.close();person.c=c;return st;
}
test('phone and TV resumes through lobby, painting, auction, reveal, scores and final',async t=>{
 const srv=await startServer();t.after(()=>srv.stop());
 const owner=await tv(srv.port);const ps=[];for(let i=0;i<3;i++)ps.push(await player(srv.port,owner.code,'Rejoin'+i));
 t.after(()=>{owner.c.close();ps.forEach(p=>p.c.close());});
 let st=await resume(srv.port,ps[0]);assert.equal(st.phase,'lobby');assert.equal(st.you.isVip,true);
 st=await resumeTv(srv.port,owner);assert.equal(st.phase,'lobby');
 ps[0].c.send({t:'cmd',cmd:'start'});await owner.c.wait('state',s=>s.phase==='intro');
 owner.c.send({t:'tv_cmd',cmd:'skip'});const first=await owner.c.wait('state',s=>s.phase==='draw');
 st=await resume(srv.port,ps[1]);assert.equal(st.phase,'draw');assert.equal(st.you.isMaster,first.masterId===ps[1].pid);
 st=await resumeTv(srv.port,owner);assert.equal(st.phase,'draw');
 for(const p of ps)await submit(p,1);
 await owner.c.wait('state',s=>s.phase==='auction');
 st=await resume(srv.port,ps[2]);assert.equal(st.phase,'auction');
 st=await resumeTv(srv.port,owner);assert.equal(st.phase,'auction');
 for(const p of ps.filter(p=>p.pid!==first.masterId)){p.c.send({t:'pass'});await p.c.wait('pass_accepted');}
 await owner.c.wait('state',s=>s.phase==='reveal');
 st=await resume(srv.port,ps[0]);assert.equal(st.phase,'reveal');
 st=await resumeTv(srv.port,owner);assert.equal(st.phase,'reveal');
 owner.c.send({t:'tv_cmd',cmd:'next'});await owner.c.wait('state',s=>s.phase==='scores');
 st=await resume(srv.port,ps[1]);assert.equal(st.phase,'scores');
 st=await resumeTv(srv.port,owner);assert.equal(st.phase,'scores');
 for(let round=2;round<=3;round++){
  owner.c.send({t:'tv_cmd',cmd:'next'});await owner.c.wait('state',s=>s.phase==='intro'&&s.round===round);
  owner.c.send({t:'tv_cmd',cmd:'skip'});const d=await owner.c.wait('state',s=>s.phase==='draw'&&s.round===round);
  for(const p of ps)await submit(p,round);
  await owner.c.wait('state',s=>s.phase==='auction'&&s.round===round);
  for(const p of ps.filter(p=>p.pid!==d.masterId)){p.c.send({t:'pass'});await p.c.wait('pass_accepted');}
  await owner.c.wait('state',s=>s.phase==='reveal'&&s.round===round);
  owner.c.send({t:'tv_cmd',cmd:'next'});await owner.c.wait('state',s=>s.phase==='scores'&&s.round===round);
 }
 owner.c.send({t:'tv_cmd',cmd:'next'});await owner.c.wait('state',s=>s.phase==='final');
 st=await resume(srv.port,ps[2]);assert.equal(st.phase,'final');
 st=await resumeTv(srv.port,owner);assert.equal(st.phase,'final');
});
test('encrypted local restart restores identifiers, balances, phases and one-time settlement',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ff-recovery-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const env={FF_DATA_DIR:dir,FF_PERSISTENCE_KEY:'test-only-32-characters-secret-aaaaaaaaa'};
 let srv=await startServer({env});
 const owner=await tv(srv.port);const ps=[];
 try{
  for(let i=0;i<3;i++)ps.push(await player(srv.port,owner.code,'Saved'+i));
  const d=await enterDraw(owner.c,ps);for(const p of ps)await submit(p,1);
  await owner.c.wait('state',s=>s.phase==='auction');
  const lotList={};for(const p of ps){const lots=await p.c.wait('lots',m=>m.round===1);lotList[p.pid]=lots.lots.find(l=>l.mine).letter;}
  const buyer=ps.find(p=>p.pid!==d.masterId);const forger=ps.find(p=>p.pid!==d.masterId&&p.pid!==buyer.pid);
  buyer.c.send({t:'bid',lot:lotList[forger.pid],amount:3});await buyer.c.wait('bid_accepted');
  forger.c.send({t:'pass'});await forger.c.wait('pass_accepted');
  const reveal=await owner.c.wait('state',s=>s.phase==='reveal');
  const before = reveal.players.map(p=>({id:p.id,score:p.score}));
  assert.equal(reveal.results.transfers.length,1);
  assert.equal(reveal.results.transfers[0].amount,300);
  assert.equal(reveal.results.deltas[buyer.pid],-300);
  const raw=fs.readFileSync(path.join(dir,owner.code+'.room'));
  assert.ok(!raw.toString().includes(owner.token));assert.ok(!raw.toString().includes(ps[0].resumeToken));
  await srv.stop();ps.forEach(p=>p.c.close());owner.c.close();
  srv=await startServer({port:srv.port,env});
  const st=await resumeTv(srv.port,owner);assert.equal(st.phase,'reveal');
  const resumed=await resume(srv.port,ps[0]);assert.equal(resumed.phase,'reveal');
  assert.deepEqual(st.players.map(p=>({id:p.id,score:p.score})),before);
  assert.deepEqual(st.results.deltas,reveal.results.deltas);
  owner.c.send({t:'tv_cmd',cmd:'next'});await owner.c.wait('state',s=>s.phase==='scores');
  owner.c.send({t:'tv_cmd',cmd:'next'}); // shortage recovery protects disconnected phone
  await resume(srv.port,ps[1]);await resume(srv.port,ps[2]);
  const next=await owner.c.wait('state',s=>s.phase==='intro'&&s.round===2,6000);
  assert.equal(next.round,2);
  assert.deepEqual(next.players.map(p=>({id:p.id,score:p.score})),before);
 } finally {ps.forEach(p=>p.c.close());owner.c.close();await srv.stop();}
});
