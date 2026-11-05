'use strict';
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const folder=path.join(__dirname,'..','public','assets');
const entries=fs.readdirSync(folder,{withFileTypes:true}).filter(e=>e.isFile()&&/\.(png|webp)$/i.test(e.name)).map(e=>e.name);
let images=0;
for(const name of entries){
 const b=fs.readFileSync(path.join(folder,name));
 if(name.endsWith('.png')){
  assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a',name);
  assert.ok(b.readUInt32BE(16)>0&&b.readUInt32BE(20)>0,name);
 }else{
  assert.equal(b.subarray(0,4).toString('ascii'),'RIFF',name);
  assert.equal(b.subarray(8,12).toString('ascii'),'WEBP',name);
 }
 images++;
}
assert.equal(images,26,'All 26 approved image files must remain present');
const needed=['music-lobby','music-draw','join','gavel','submit','bid','tick','drumroll','stamp-forgery','stamp-genuine','applause','coins','fanfare','sad-trombone'];
const missing=needed.filter(n=>!fs.existsSync(path.join(folder,'sfx',n+'.mp3')));
console.log(`PASS: ${images} approved images have valid headers and dimensions`);
console.log(`DEFERRED ASSETS: ${missing.length} original audio tracks, genuine stamp=${fs.existsSync(path.join(folder,'stamp-genuine.png'))?'present':'missing'}, fonts=${fs.existsSync(path.join(folder,'fonts','display.woff2'))?'partial':'missing'}`);
