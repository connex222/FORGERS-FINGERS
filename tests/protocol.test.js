'use strict';
const {test}=require('node:test');
const {startServer,tv,player,connect,submit,assert}=require('./helpers');
test('drawing ACK and duplicate idempotency, invalid stroke schemas and phase rejection',async t=>{
 const srv=await startServer();t.after(()=>srv.stop());const owner=await tv(srv.port);const ps=[];for(let i=0;i<3;i++)ps.push(await player(srv.port,owner.code,'Drawer'+i));
 t.after(()=>{ps.forEach(p=>p.c.close());owner.c.close();});
 ps[0].c.send({t:'cmd',cmd:'start'});await owner.c.wait('state',s=>s.phase==='intro');owner.c.send({t:'tv_cmd',cmd:'skip'});
 const d=await owner.c.wait('state',s=>s.phase==='draw');
 const p=ps[0];
 p.c.send({t:'drawing',round:d.round,submissionId:'bad_stroke',strokes:[{c:'1',w:1,p:[100,100]}]});await p.c.expectError('drawing_invalid');
 p.c.send({t:'drawing',round:d.round,submissionId:'bad_blank1',strokes:[]});await p.c.expectError('drawing_invalid');
 p.c.send({t:'drawing',round:d.round-1,submissionId:'bad_round',strokes:[{f:1}]});await p.c.expectError('drawing_id');
 const id=await submit(p,d.round,'valid_draw_1');
 p.c.send({t:'drawing',round:d.round,submissionId:id,strokes:[{f:1}]});await p.c.wait('drawing_received',m=>m.submissionId===id);
 p.c.send({t:'drawing',round:d.round,submissionId:'other_draw_1',strokes:[{f:1}]});await p.c.expectError('duplicate');
 const replacement=await connect(srv.port);t.after(()=>replacement.close());
 replacement.send({t:'join',code:owner.code,pid:p.pid,resumeToken:p.resumeToken});await replacement.wait('joined');
 const gotAck=await replacement.wait('drawing_received');assert.equal(gotAck.submissionId,id);
 for(const q of ps.slice(1))await submit(q,d.round);
 await owner.c.wait('state',s=>s.phase==='auction');
 replacement.send({t:'drawing',round:d.round,submissionId:id,strokes:[{f:1}]});await replacement.expectError('phase');
});
test('rate limit protects the server; multiple galleries stay isolated',async t=>{
 const srv=await startServer();t.after(()=>srv.stop());const one=await tv(srv.port),two=await tv(srv.port);
 t.after(()=>{one.c.close();two.c.close();});assert.notEqual(one.code,two.code);
 const p=await player(srv.port,one.code,'Shared Name');t.after(()=>p.c.close());
 const verifier=await connect(srv.port);t.after(()=>verifier.close());verifier.send({t:'tv_resume',code:two.code,token:two.token});await verifier.wait('tv_ok');const st=await verifier.wait('state');assert.equal(st.players.length,0);
 const attacker=await connect(srv.port);t.after(()=>attacker.close());
 for(let i=0;i<70;i++)attacker.send({t:'ping'});
 await attacker.expectError('rate');
 const health=await fetch(`http://127.0.0.1:${srv.port}/health`);assert.equal(health.status,200);
});
test('deterministic Head Curator handover; old disconnected Curator cannot seize role',async t=>{
 const srv=await startServer();t.after(()=>srv.stop());const owner=await tv(srv.port);
 const p1=await player(srv.port,owner.code,'First');const p2=await player(srv.port,owner.code,'Second');const p3=await player(srv.port,owner.code,'Third');
 t.after(()=>[owner.c,p1.c,p2.c,p3.c].forEach(c=>c.close()));
 p1.c.close();const s=await p2.c.wait('state',x=>x.players.some(p=>p.id===p2.pid&&p.isVip));
 assert.equal(s.players.filter(p=>p.isVip).length,1);
 const resume=await connect(srv.port);t.after(()=>resume.close());resume.send({t:'join',code:owner.code,pid:p1.pid,resumeToken:p1.resumeToken});await resume.wait('joined');
 const state=await resume.wait('state');assert.equal(state.you.isVip,false);
 resume.send({t:'settings',deck:'adult'});await resume.expectError('role');
});
test('void missing Master drawing and lobby drop/idle cleanup under test-shortened timers',async t=>{
 const srv=await startServer({env:{FF_TEST_GRACE_MS:'40',FF_TEST_HURRY_MS:'50',FF_TEST_VOID_MS:'200',FF_TEST_LOBBY_DROP_MS:'100',FF_TEST_ROOM_IDLE_MS:'300',FF_TEST_CLEAN_INTERVAL_MS:'80'}});
 t.after(()=>srv.stop());const owner=await tv(srv.port);const ps=[];for(let i=0;i<3;i++)ps.push(await player(srv.port,owner.code,'Painter'+i));
 t.after(()=>{owner.c.close();ps.forEach(p=>p.c.close());});
 ps[0].c.send({t:'cmd',cmd:'start'});await owner.c.wait('state',s=>s.phase==='intro');owner.c.send({t:'tv_cmd',cmd:'skip'});
 const draw=await owner.c.wait('state',s=>s.phase==='draw');
 for(const p of ps.filter(p=>p.pid!==draw.masterId))await submit(p,draw.round);
 owner.c.send({t:'tv_cmd',cmd:'skip'});
 const withdrawn=await owner.c.wait('state',s=>s.phase==='void',3000);assert.equal(withdrawn.voided,'master');
 // Cleanup a separate vacant gallery under shortened test deadlines.
 const room2=await tv(srv.port);const code2=room2.code;room2.c.close();
 await new Promise(r=>setTimeout(r,650));
 const visitor=await connect(srv.port);t.after(()=>visitor.close());
 visitor.send({t:'join',code:code2,name:'New'});await visitor.expectError('noroom');
});
