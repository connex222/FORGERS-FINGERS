'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const pub=path.join(root,'public');
const chapters=JSON.parse(fs.readFileSync(path.join(pub,'tutorial-chapters.json'),'utf8'));
const tv=fs.readFileSync(path.join(pub,'tv.html'),'utf8');
const phone=fs.readFileSync(path.join(pub,'index.html'),'utf8');
const tut=fs.readFileSync(path.join(pub,'tutorial.js'),'utf8');
const rules=fs.readFileSync(path.join(pub,'shared.js'),'utf8');
const css=fs.readFileSync(path.join(pub,'tutorial.css'),'utf8');
const names=['music-lobby','music-draw','join','gavel','submit','bid','tick','drumroll',
 'stamp-forgery','stamp-genuine','applause','coins','fanfare','sad-trombone'];

test('Batch C illustrated tutorial contains nine original-art chapters with matching gameplay/scoring explanations',()=>{
 assert.equal(chapters.length,9);
 const joined=chapters.map(x=>x.script.toLowerCase()).join(' ');
 for(const term of ['head curator','master','forger','one hundred','two hundred','three hundred','pass','heart','twice','adult'])assert.ok(joined.includes(term),`Missing ${term}`);
 for(const c of chapters){
  assert.ok(c.title.length>8&&c.script.length>60);
  assert.ok(/^\/assets\/[a-z0-9-]+\.(png|webp)$/.test(c.image));
  assert.ok(fs.existsSync(path.join(pub,c.image.slice(1))),c.image);
  assert.ok(fs.existsSync(path.join(pub,c.background.slice(1))),c.background);
  assert.ok(tut.includes(c.title),c.title);
  assert.ok(tut.includes(c.script),c.eyebrow);
 }
});

test('Both screens load tutorial JS after shared helpers and expose accessible navigation and return controls',()=>{
 for(const html of [tv,phone]){
  const a=html.indexOf('<script src="/shared.js"');
  const b=html.indexOf('<script src="/tutorial.js"');
  assert.ok(a>0&&b>a);
  assert.ok(html.includes('/tutorial.css'));
  assert.ok(html.includes('How to Play'));
 }
 for(const name of ['data-ff-prev','data-ff-play','data-ff-next','data-ff-close','aria-modal','aria-pressed','Back to lobby / game'])assert.ok(tut.includes(name),name);
 for(const q of ['max-width:750px','max-height:490px','prefers-reduced-motion','focus-visible','100dvh'])assert.ok(css.includes(q),q);
});

test('Tutorial never modifies room phases, auctions, private reconnect credentials or server state',()=>{
 for(const term of ['tv_cmd','t: \'bid\'','resumeToken','localStorage.setItem(\'ff-player\'','location.assign','fetch('])assert.ok(!tut.includes(term),term);
 assert.ok(tut.includes('FF.stopVoice()'));
 assert.ok(tut.includes("e.key === 'Escape'"));
});

test('All 14 expected sound files are real MP3 bitstreams, distinct and nonempty',()=>{
 const digests=new Set();
 for(const name of names){
  const data=fs.readFileSync(path.join(pub,'assets','sfx',name+'.mp3'));
  assert.ok(data.length>4500,`${name} only ${data.length}`);
  assert.ok(data.subarray(0,3).toString('ascii')==='ID3'||(data[0]===255&&(data[1]&0xe0)===0xe0),`${name} not MPEG/ID3`);
  digests.add(require('node:crypto').createHash('sha256').update(data).digest('hex'));
 }
 assert.equal(digests.size,14,'All 14 sounds must be individually authored, not aliases');
});

test('TV sound preferences correctly advertise recorded Lord Gavelby with a browser fallback',()=>{
 assert.ok(tv.includes('Voice (recorded Lord Gavelby)'));
 for(const kind of ['music','effects','voice'])assert.ok(tv.includes(`data-audio="${kind}"`));
 for(const kind of ['enabled','music','effects','voice'])assert.ok(phone.includes(`data-phone-audio="${kind}"`));
 assert.ok(phone.includes("if (!localStorage.getItem('ff-audio')) { FF.audio.music = false"));
 assert.ok(rules.includes('FF.stopVoice'));
 assert.ok(tut.includes('Lord Gavelby — recorded Northern English narration'));
 assert.ok(tut.includes('browser-voice fallback if unavailable'));
});

test('Mute, per-category controls and saved preferences gate actual sound events',()=>{
 let played=0,paused=0;
 const store={};
 class AudioMock {
  constructor(src){this.src=src;this.paused=true;this.volume=1;}
  cloneNode(){return new AudioMock(this.src)}
  play(){this.paused=false;played++;return Promise.resolve()}
  pause(){paused++;this.paused=true;}
 }
 const context={window:{devicePixelRatio:1},localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=v}},Audio:AudioMock,console};
 vm.createContext(context);vm.runInContext(rules,context);
 const ff=context.window.FF;
 ff.sfx('bid');assert.equal(played,0);
 ff.audio.enabled=true;ff.saveAudio();ff.sfx('bid');assert.equal(played,1);
 ff.audio.effects=false;ff.saveAudio();ff.sfx('bid');assert.equal(played,1);
 ff.audio.effects=true;ff.audio.music=true;ff.saveAudio();ff.music('lobby');assert.equal(played,2);
 ff.audio.enabled=false;ff.saveAudio();assert.ok(paused>0);
 assert.ok(store['ff-audio'].includes('"enabled":false'));
 ff.music('draw');assert.equal(played,2);
});


test('HTTP serves actual tutorial and all sound files with correct content types',async t=>{
 const {startServer}=require('./helpers');
 const srv=await startServer();t.after(()=>srv.stop());
 const base=`http://127.0.0.1:${srv.port}`;
 for (const filename of ['/tutorial.js','/tutorial.css','/tutorial-chapters.json',...names.map(n=>`/assets/sfx/${n}.mp3`)]) {
  const response=await fetch(base+filename);
  assert.equal(response.status,200,filename);
  const type=response.headers.get('content-type');
  assert.equal(type,filename.endsWith('.mp3')?'audio/mpeg':filename.endsWith('.css')?'text/css; charset=utf-8':filename.endsWith('.json')?'application/json':'text/javascript; charset=utf-8',filename);
  assert.ok((await response.arrayBuffer()).byteLength>100,filename);
 }
});
