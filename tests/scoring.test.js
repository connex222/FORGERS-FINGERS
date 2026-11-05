'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {settle,canAfford}=require('../lib/rules');
function setup(scores=[1000,1000,1000]) {
  const players=scores.map((score,i)=>({id:'p'+i,score,stats:{fooled:0,duped:0,hearts:0,found:0}}));
  const cur={masterId:'p0',lots:[{ownerId:'p0',letter:'A'},{ownerId:'p1',letter:'B'},{ownerId:'p2',letter:'C'}],bids:{},hearts:{},results:null};
  return {players,cur};
}
test('0, 50, 100, 200, 300, 1000 guineas: bid affordability exact and strict',()=>{
  for(const score of [0,50,100,200,300,1000]) for(const units of [1,2,3])assert.equal(canAfford(score,units),score>=100*units);
  for(const invalid of [0,-1,1.5,'2','300',null,{},Infinity,NaN])assert.equal(canAfford(1000,invalid),false);
});
test('correct bid bonus, no transfer on genuine',()=>{
 const v=setup();v.cur.bids.p1={lot:'A',amount:3};const r=settle(v);
 assert.equal(r.scores.p1,1300);assert.equal(r.results.correct,1);assert.equal(r.results.verdict,'obvious');assert.equal(r.results.masterEarned,0);
});
test('incorrect paid bid is strict zero-sum transfer; no negative balance',()=>{
 const v=setup([1000,300,0]);v.cur.bids.p1={lot:'C',amount:3};const r=settle(v);
 assert.equal(r.scores.p1,0);assert.equal(r.scores.p2,300);assert.deepEqual(r.results.transfers,[{from:'p1',to:'p2',amount:300}]);
 assert.equal(r.stats.p1.duped,300);assert.equal(r.stats.p2.fooled,300);
});
test('insufficient or zero balance cannot create guineas at settlement',()=>{
 for(const score of [0,50,100,200]) {
  const v=setup([1000,score,0]);v.cur.bids.p1={lot:'C',amount:3};const r=settle(v);
  assert.equal(r.scores.p1,score);assert.equal(r.scores.p2,0);assert.equal(r.results.totalBids,0);
 }
});
test('Master verdict: all correct, none correct, mixed, no bids and passes excluded',()=>{
 const all=setup();all.cur.bids={p1:{lot:'A',amount:1},p2:{lot:'A',amount:2}};
 assert.equal(settle(all).results.verdict,'obvious');
 const none=setup();none.cur.bids={p1:{lot:'C',amount:1},p2:{lot:'B',amount:2}};
 assert.equal(settle(none).results.verdict,'obscure');
 const mixed=setup();mixed.cur.bids={p1:{lot:'A',amount:1},p2:{lot:'B',amount:1}};
 const m=settle(mixed);assert.equal(m.results.verdict,'perfect');assert.equal(m.scores.p0,1200);
 const empty=setup();empty.cur.bids={p1:{pass:true},p2:{pass:true}};
 assert.equal(settle(empty).results.verdict,'nobids');
 const pass=setup();pass.cur.bids={p1:{lot:'A',amount:1},p2:{pass:true}};
 const r=settle(pass);assert.equal(r.results.verdict,'obvious');assert.equal(r.results.totalBids,1);
});
test('one heart per voter; ties awarded exactly once; no own-artwork hearts',()=>{
 const v=setup();v.cur.hearts={p0:'B',p1:'C',p2:'B'};
 const r=settle(v);assert.equal(r.results.heartWinners.length,1);assert.equal(r.scores.p1,1100);
 const tie=setup();tie.cur.hearts={p0:'B',p1:'C',p2:'B'}; // B wins 2, C has one
 tie.cur.hearts={p0:'B',p1:'C'};
 const t=settle(tie);assert.deepEqual(t.results.heartWinners.sort(),['B','C']);assert.equal(t.scores.p1,1100);assert.equal(t.scores.p2,1100);
 const own=setup();own.cur.hearts={p1:'B'};assert.deepEqual(settle(own).results.heartWinners,[]);
});
test('idempotent once-settled results cannot mint duplicate credits',()=>{
 const v=setup();v.cur.bids.p1={lot:'C',amount:3};
 const first=settle(v);v.players.forEach(p=>{p.score=first.scores[p.id];p.stats=first.stats[p.id];});v.cur.results=first.results;
 const next=settle(v);assert.deepEqual(next.scores,first.scores);assert.deepEqual(next.stats,first.stats);
});
test('deterministic 3–8 player, 1/2 lap simulated settlements uphold ledger invariants',()=>{
 for(let n=3;n<=8;n++)for(let laps=1;laps<=2;laps++)for(let seed=1;seed<=30;seed++) {
  let x=seed;const rnd=()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/0x100000000;};
  const players=Array.from({length:n},(_,i)=>({id:'p'+i,score:1000,stats:{fooled:0,duped:0,hearts:0,found:0}}));
  const played=Array(n).fill(0);
  for(let lap=0;lap<laps;lap++)for(let master=0;master<n;master++){
   played[master]++;
   const cur={masterId:'p'+master,lots:players.map((p,j)=>({letter:String.fromCharCode(65+j),ownerId:p.id})),bids:{},hearts:{},results:null};
   for(let i=0;i<n;i++)if(i!==master){const p=players[i];if(rnd()<.18||p.score<100)cur.bids[p.id]={pass:true};else{const amount=Math.min(3,1+Math.floor(rnd()*3),Math.floor(p.score/100));let target=Math.floor(rnd()*(n-1));if(target>=i)target++;cur.bids[p.id]={lot:cur.lots[target].letter,amount};}}
   const before=players.reduce((a,p)=>a+p.score,0);const r=settle({players,cur});
   assert.ok(Object.values(r.scores).every(s=>s>=0&&Number.isSafeInteger(s)));
   const delta=Object.values(r.results.deltas).reduce((a,d)=>a+d,0);
   assert.equal(players.reduce((a,p)=>a+r.scores[p.id],0)-before,delta);
   assert.equal(r.results.transfers.reduce((a,t)=>a+t.amount,0),r.results.transfers.reduce((a,t)=>a+t.amount,0));
   players.forEach(p=>{p.score=r.scores[p.id];p.stats=r.stats[p.id]});
  }
  assert.deepEqual(played,Array(n).fill(laps));
 }
});
