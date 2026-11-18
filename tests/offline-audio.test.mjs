import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
function scan(dir){if(!fs.existsSync(dir))return [];
return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?scan(path.join(dir,e.name)):e.isFile()&&/\.(?:js|mjs|html|json|css)$/.test(e.name)?[path.join(dir,e.name)]:[]);}
test('runtime makes no remote MP3 or Creative Claw requests',()=>{
for(const file of [...scan(path.join(root,'public')),...scan(path.join(root,'server'))]){
const s=fs.readFileSync(file,'utf8');assert.doesNotMatch(s,/https?:\/\/[^\s"'<>]+?\.(?:mp3|ogg|wav|m4a|aac)/i,file);assert.doesNotMatch(s,/cdn\.creativeclaw\.co/i,file);}
});
test('every source-recorded original is actually bundled as a playable local MP3',()=>{
 const assets=JSON.parse(fs.readFileSync(path.join(root,'CREATIVE-CLAW-AUDIO-SOURCES.json'),'utf8')).assets;
 assert.ok(assets.length>=1);
 const paths=new Set();
 for(const a of assets){
   assert.ok(!paths.has(a.path),'duplicate file destination '+a.path);
   paths.add(a.path);
   const p=path.join(root,a.path);
   assert.ok(fs.existsSync(p),'missing '+a.path);
   const bytes=fs.readFileSync(p);
   assert.ok(bytes.length>4000,'incomplete '+a.path);
   assert.ok(bytes.toString('ascii',0,3)==='ID3' || bytes[0]===255&&(bytes[1]&224)===224,'invalid MP3 '+a.path);
 }
});
