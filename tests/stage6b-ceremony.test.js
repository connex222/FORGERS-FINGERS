'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname,'..');
const load = f => fs.readFileSync(path.join(ROOT,f),'utf8');
function shared() {
  const sandbox = {window:{},localStorage:{getItem(){return null}},setItem(){}};
  vm.runInNewContext(load('public/shared.js'),sandbox,{filename:'shared.js'});
  return sandbox.window.FF;
}
function sample() {
  const players = [
    {id:'a',name:'Alice',avatar:1,score:1200},
    {id:'b',name:'Bob',avatar:2,score:800},
    {id:'c',name:'Cleo',avatar:3,score:1300},
    {id:'d',name:'Dan',avatar:4,score:1100},
  ];
  // Before: each player 1000. Alice correct bid +200, Bob fooled -200,
  // Cleo (forger) pockets +200 plus a tied +100 favourite, Dan favourite +100.
  const results = {
    genuine:'A', masterId:'d', masterEarned:0, heartWinners:['B','D'],
    lots:[
      {letter:'A',ownerId:'d',genuine:true,buyers:[{id:'a',amount:200}]},
      {letter:'B',ownerId:'c',genuine:false,buyers:[{id:'b',amount:200}]},
      {letter:'D',ownerId:'d',genuine:true,buyers:[]},
    ],
    transfers:[{from:'b',to:'c',amount:200}],
    deltas:{a:200,b:-200,c:300,d:100},
  };
  return {players,results};
}

test('round ledger: correct bid, actual forgery transfer, favourite tie, before/after and no invented funds',()=>{
  const FF = shared(),{players,results}=sample(),lines=FF.roundLedger(players,results);
  assert.deepEqual(Array.from(lines, p => p.player.id),['c','a','d','b']);
  for(const p of lines){assert.equal(p.before,1000); assert.equal(p.consistent,true);}
  const b=Object.fromEntries(lines.map(x=>[x.player.id,x]));
  assert.equal(b.a.breakdown.genuine,200);
  assert.equal(b.b.breakdown.forgeryOut,200);
  assert.equal(b.c.breakdown.forgeryIn,200);
  assert.equal(b.c.breakdown.favourite,100);
  assert.equal(b.d.breakdown.favourite,100);
});
test('Master bonus only from settled amount, 3–8 players and zero / no-bid rounds stay consistent',()=>{
  const FF=shared();
  for (let count=3;count<=8;count++) {
    const players=Array.from({length:count},(_,i)=>({id:'p'+i,name:'P'+i,avatar:i%8+1,score:1000}));
    const base=FF.roundLedger(players,{deltas:{},transfers:[],lots:[],heartWinners:[],masterEarned:0});
    assert.equal(base.length,count);
    assert.ok(base.every(p=>p.consistent&&p.delta===0));
  }
  const {players,results}=sample();results.masterId='d';results.masterEarned=400;
  results.deltas.d=500;players[3].score=1500;
  assert.equal(FF.roundLedger(players,results).find(p=>p.player.id==='d').breakdown.master,400);
  assert.equal(FF.roundLedger(players,results).find(p=>p.player.id==='d').consistent,true);
});
test('inconsistent supplied client presentation ledger is conspicuously flagged, never quietly rebalanced',()=>{
  const FF=shared(),{players,results}=sample();
  results.transfers[0].amount=100;
  const lines=FF.roundLedger(players,results);
  assert.equal(lines.find(p=>p.player.id==='b').consistent,false);
  assert.equal(lines.find(p=>p.player.id==='c').consistent,false);
});

test('TV reveal + scores + final render their actual approved artwork and use escaped names',()=>{
  const FF=shared();
  const elements=new Map();
  const element=(name)=>{
    if(!elements.has(name)) elements.set(name,{
      innerHTML:'',textContent:'',dataset:{},style:{},hidden:false,classList:{add(){},remove(){},toggle(){}},
      addEventListener(){},setAttribute(){},querySelector(){return {insertAdjacentHTML(){}};},
    });
    return elements.get(name);
  };
  const sandbox={
    FF,window:{},
    document:{querySelector:element,querySelectorAll:()=>[],body:{classList:{toggle(){}},dataset:{}},},
    sessionStorage:{getItem(){return null},setItem(){},removeItem(){}},
    addEventListener(){},setInterval(){return 5},clearInterval(){},clearTimeout(){},setTimeout(){return 8},
    requestAnimationFrame(callback){callback();},
    Image:class{set src(v){this._src=v;}get src(){return this._src;}},
    Date,console,
  };
  // Browser socket is a stub; game state is injected for the render-only test.
  FF.socket=()=>({send(){}});FF.audio={enabled:false,music:false,effects:false,voice:false};
  FF.showRules=()=>{};FF.sfx=()=>{};FF.stopSfx=()=>{};
  FF.paint=()=>{};FF.paintAll=()=>{};FF.saveAudio=()=>{};
  FF.setTimeLeft=()=>{};
  let inline=load('public/tv.html').split('<script>').at(-1).split('</script>')[0];
  inline=inline.replace(/\}\)\(\);\s*$/,`window._stage6b={setState(s){S=s;},setLots(r){lotsRound=r;},scores,final,reveal,renderFavourite,revealTick,showGallery};})();`);
  vm.runInNewContext(inline,sandbox,{filename:'public/tv.html'});
  const api=sandbox.window._stage6b;assert.ok(api);
  const {players,results}=sample();
  players[2].name='<img src=x onerror=alert(1)>';
  api.setState({phase:'scores',code:'TEST',round:1,totalRounds:4,players,results});api.scores();
  let html=element('#view').innerHTML;
  assert.match(html,/The Guinea Ledger/);
  assert.match(html,/Correct bid/);assert.match(html,/Forgery takings/);assert.match(html,/Favourite/);
  assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html,/<img src=x onerror=alert\(1\)>/);
  assert.match(html,/Before: 1,000 gns/);
  const f={ranking:players.map(p=>({id:p.id,score:p.score})).sort((a,b)=>b.score-a.score),
    awards:[{key:'forger',id:'c',value:200},{key:'gullible',id:'b',value:200},
      {key:'favourite',id:'d',value:1},{key:'eagle',id:'a',value:1}],
    gallery:[{title:'A \"Rather\" Magnificent Scene',masterName:'<b>Gavel</b>',strokes:[]},
      {title:'Second Canvas',masterName:'Alice',strokes:[]}]};
  api.setState({phase:'final',players,final:f});api.final();
  html=element('#view').innerHTML;
  for(const a of ['award-forger.png','award-gullible.png','award-favourite.png','award-eagle.png','avatar-'])
    assert.ok(html.includes(a),a);
  assert.match(html,/Tonight’s Grand Reckoning/);
  assert.match(html,/Tonight’s Genuine Masterpieces/);
  assert.match(html,/data-gallery-nav="previous"/);
  assert.match(html,/data-gallery-nav="next"/);
  assert.match(html,/data-gallery-nav="toggle"/);
  assert.match(element('#gallerySlide').innerHTML,/&lt;b&gt;Gavel&lt;\/b&gt;/);
  api.showGallery(1);
  assert.match(element('#gallerySlide').innerHTML,/Second Canvas/);
  assert.equal(element('#galleryCount').textContent,'2 of 2');
  api.showGallery(-1);assert.equal(element('#galleryCount').textContent,'1 of 2');
  api.setState({phase:'reveal',round:1,totalRounds:4,players,results:{...results,stepMs:5500,tailMs:7000},timeLeft:27500});
  api.setLots(1);api.reveal();
  assert.match(element('#revealRoot').innerHTML,/Genuine or forgery\?/);
  const root=element('#revealRoot');api.renderFavourite(root);
  assert.match(root.innerHTML,/People’s Favourite/);
  assert.match(root.innerHTML,/--fav-cols:2;--fav-rows:1/);
  assert.equal((root.innerHTML.match(/\/assets\/rosette.png/g)||[]).length,2);
});

test('approved assets are byte-for-byte original; 4 medals and podium/gilt frame available',()=>{
  let amount=0;
  for(const line of load('ARTWORK-CHECKSUMS.sha256').trim().split(/\r?\n/)){
    const match=line.match(/^([a-f0-9]{64})\s+\*?(.+)$/);
    assert.ok(match);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,match[2]))).digest('hex'),match[1]);
    amount++;
  }
  assert.equal(amount,26);
  for(const key of ['forger','gullible','favourite','eagle'])
    assert.ok(fs.statSync(path.join(ROOT,`public/assets/award-${key}.png`)).size>1000);
});
test('Batch B CSS is served and contains responsive enlarged medals, safe reveal, ledger and gallery navigation',async()=>{
  const html=load('public/tv.html'),css=load('public/tv-stage6b.css');
  assert.match(html,/href="\/tv-stage6b\.css"/);
  assert.match(css,/\.final-b \.award \.medal/);
  assert.match(css,/200px/);
  assert.match(css,/\.reveal-b/);
  assert.match(css,/\.scores-b/);
  assert.match(css,/\.fav-grid/);
  assert.match(css,/\.gallery-slide/);
  assert.match(css,/prefers-reduced-motion/);
  const {startServer}=require('./helpers');const server=await startServer();
  try {
    const res=await fetch(`http://127.0.0.1:${server.port}/tv-stage6b.css`);
    assert.equal(res.status,200);assert.match(res.headers.get('content-type'),/text\/css/);
    assert.match(await res.text(),/Stage 6 Batch B/);
  } finally {await server.stop();}
});
