'use strict';
const {test}=require('node:test');
const {startServer,tv,player,submit,assert}=require('./helpers');
async function runMatch(size,laps,deck) {
 const srv=await startServer();
 const owner=await tv(srv.port);const ps=[];
 try {
  for(let i=0;i<size;i++)ps.push(await player(srv.port,owner.code,'Artist'+i));
  ps[0].c.send({t:'settings',laps,deck,drawTime:60});
  await owner.c.wait('state',s=>s.settings.laps===laps&&s.settings.deck===deck&&s.settings.drawTime===60);
  if(deck==='adult'){ps[0].c.send({t:'confirm_adult'});await owner.c.wait('state',s=>s.adultConfirmed);}
  ps[0].c.send({t:'cmd',cmd:'start'});
  const seen=[];
  for(let round=1;round<=size*laps;round++){
    const intro=await owner.c.wait('state',s=>s.phase==='intro'&&s.round===round);
    seen.push(intro.masterId);
    owner.c.send({t:'tv_cmd',cmd:'skip'});
    const draw=await owner.c.wait('state',s=>s.phase==='draw'&&s.round===round);
    for(const p of ps){
      const prev=await p.c.wait('state',s=>s.phase==='draw'&&s.round===round);
      assert.equal(Boolean(prev.you.secretTitle),p.pid===draw.masterId);
      await submit(p,round);
    }
    await owner.c.wait('state',s=>s.phase==='auction'&&s.round===round);
    for(const p of ps){await p.c.wait('state',s=>s.phase==='auction'&&s.round===round);await p.c.wait('lots',s=>s.round===round);}
    const master=ps.find(p=>p.pid===draw.masterId);
    const bidder=ps.find(p=>p.pid!==draw.masterId);
    // Passes are real auction decisions, not bids; the last pass must close the auction.
    master.c.send({t:'heart',lot:'A'===String.fromCharCode(65+ps.findIndex(p=>p.pid===draw.masterId))?'B':'A'});
    for(const p of ps.filter(p=>p!==master)){
      p.c.send({t:'pass'});await p.c.wait('pass_accepted',m=>m.round===round);
    }
    const reveal=await owner.c.wait('state',s=>s.phase==='reveal'&&s.round===round);
    assert.equal(reveal.results.verdict,'nobids');assert.equal(reveal.results.totalBids,0);
    assert.ok(Object.values(reveal.results.deltas).every(v=>Number.isSafeInteger(v)));
    owner.c.send({t:'tv_cmd',cmd:'next'});
    await owner.c.wait('state',s=>s.phase==='scores'&&s.round===round);
    owner.c.send({t:'tv_cmd',cmd:'next'});
  }
  const final=await owner.c.wait('state',s=>s.phase==='final');
  assert.equal(final.round,size*laps);
  assert.equal(final.final.ranking.length,size);
  for(const p of ps)assert.equal(seen.filter(id=>id===p.pid).length,laps);
  owner.c.clear();owner.c.send({t:'tv_cmd',cmd:'next'});
  const lobby=await owner.c.wait('state',s=>s.phase==='lobby');assert.equal(lobby.players.length,size);
  ps[0].c.send({t:'cmd',cmd:'start'});
  await owner.c.wait('state',s=>s.phase==='intro'&&s.round===1);
 } finally {ps.forEach(p=>p.c.close());owner.c.close();await srv.stop();}
}
test('3 players / Family / one lap: complete match, awards, rematch',()=>runMatch(3,1,'family'),{timeout:30000});
test('4 players / After Hours 18+ / two laps: complete match, rematch',()=>runMatch(4,2,'adult'),{timeout:30000});
test('6 players / Family / one lap: complete match, rematch',()=>runMatch(6,1,'family'),{timeout:30000});
test('8 players / Family / two laps: complete match, rematch',()=>runMatch(8,2,'family'),{timeout:30000});
