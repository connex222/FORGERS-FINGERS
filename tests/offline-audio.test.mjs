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
test('original lobby recording is bundled and legacy fallback is retained',()=>{
const assets=JSON.parse(fs.readFileSync(path.join(root,'CREATIVE-CLAW-AUDIO-SOURCES.json'))).assets;
assert.equal(assets.length,1);
for(const a of assets){const p=path.join(root,a.path);assert.ok(fs.existsSync(p),a.path);assert.ok(fs.statSync(p).size>4000,a.path);}
assert.ok(fs.statSync(path.join(root,'public/sounds/mus-lobby.ogg')).size>10000);
assert.match(fs.readFileSync(path.join(root,'public/shared/client.js'),'utf8'),/track\.addEventListener\('error'/);
});
