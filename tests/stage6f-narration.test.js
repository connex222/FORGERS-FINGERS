'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const chapters=JSON.parse(read('public/tutorial-chapters.json'));
const assets=JSON.parse(read('PREMIUM-AUDIO-SOURCES.json'));
test('All nine Lord Gavelby chapters have complete, distinct recorded audio references and expanded accurate scripts',()=>{
 assert.equal(chapters.length,9);
 assert.equal(assets.chapters.length,9);
 assert.ok(chapters.reduce((n,c)=>n+c.script.split(/\s+/).length,0)>=800);
 for(let i=0;i<9;i++){
  assert.equal(chapters[i].audio,'/assets/narration/gavelby-'+String(i+1).padStart(2,'0')+'.mp3');
  assert.match(chapters[i].audio,/^\/assets\/narration\/gavelby-\d{2}\.mp3$/);
  assert.ok(chapters[i].script.length>400);
 }
 assert.equal(new Set(chapters.map(c=>c.audio)).size,9);
 const all=chapters.map(x=>x.script.toLowerCase()).join(' ');
 for(const term of ['three to eight','four-letter','after hours','one hundred','two hundred','three hundred','pass','hearts','master','forger']) assert.ok(all.includes(term),term);
});
test('Premium sound cues preserve local fallback MP3s and use allowlisted Creative Claw sources',()=>{
 const shared=read('public/shared.js');
 assert.equal(Object.keys(assets.effects).length,3);
 for(const [cue,url] of Object.entries(assets.effects)){
  assert.match(url,/^https:\/\/cdn\.creativeclaw\.co\//);
  assert.ok(shared.includes('/assets/premium-sfx/'+cue+'.mp3'));
  assert.ok(fs.existsSync(path.join(root,'public/assets/sfx',cue+'.mp3')));
 }
 assert.ok(read('server.js').includes("media-src 'self';"));
 assert.ok(shared.includes("FF.audio.enabled"));
});
test('Recorded tutorial respects mute and supports navigation, pause, completion and browser-speech fallback',()=>{
 const tut=read('public/tutorial.js');
 for(const token of ['FF.audio.enabled && FF.audio.voice','new Audio(c.audio)','run.recording.pause()','a.onended = next','a.onerror =','FF.speak(c.script','data-ff-prev','data-ff-next','data-ff-close','data-ff-play','run.voiceToken']) assert.ok(tut.includes(token),token);
 assert.ok(!tut.includes('localStorage.setItem'));
});
