import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const assets=JSON.parse(fs.readFileSync(path.join(root,'CREATIVE-CLAW-AUDIO-SOURCES.json'),'utf8')).assets;
let added=0, original=0;
const staging=[];
async function fetchMP3(url) {
 let last;
 for(let i=0;i<3;i++){
   try{
     const response=await fetch(url,{signal:AbortSignal.timeout(90000)});
     if(!response.ok)throw Error('HTTP '+response.status);
     const buf=Buffer.from(await response.arrayBuffer());
     if(buf.length<4000 || !(buf.toString('ascii',0,3)==='ID3' || (buf[0]===255&&(buf[1]&224)===224)))throw Error('Invalid MP3');
     return buf;
   }catch(e){last=e;console.error('Download '+(i+1)+'/3: '+e.message);}
 }
 throw last;
}
function check(f){
 const format=execFileSync('ffprobe',['-v','error','-select_streams','a:0','-show_entries','stream=codec_name','-of','default=noprint_wrappers=1:nokey=1',f],{encoding:'utf8'}).trim();
 if(format!=='mp3')throw Error('Invalid MP3 codec at '+f);
}
try{
 for(const a of assets){
   if(!/^https:\/\/cdn\.creativeclaw\.co\/u\/[\w-]+\/audio\/[\da-f-]+\.mp3$/.test(a.source))throw Error('Invalid Creative Claw source');
   if(!/^(public\/sounds|public\/assets\/premium-sfx|public\/assets\/narration|assets\/audio)\/[a-z0-9-]+\.mp3$/.test(a.path))throw Error('Invalid destination');
   const f=path.resolve(root,a.path);
   if(!f.startsWith(path.resolve(root)+path.sep))throw Error('Path traversal');
   fs.mkdirSync(path.dirname(f),{recursive:true});
   const temp=f+'.partial';
   fs.writeFileSync(temp,await fetchMP3(a.source));check(temp);
   staging.push({...a,f,temp,original_bytes:fs.statSync(temp).size});
 }
 original=staging.reduce((n,a)=>n+a.original_bytes,0);
 const compressed=original>15*1024*1024;
 for(const a of staging){
   if(compressed){
     const enc=a.f+'.encoded.mp3';
     execFileSync('ffmpeg',['-y','-v','error','-i',a.temp,'-vn','-codec:a','libmp3lame','-b:a','128k',enc],{stdio:'inherit'});
     check(enc);fs.renameSync(enc,a.f);fs.rmSync(a.temp,{force:true});
   } else fs.renameSync(a.temp,a.f);
   a.bytes=fs.statSync(a.f).size;a.sha256=createHash('sha256').update(fs.readFileSync(a.f)).digest('hex');
   added+=a.bytes;delete a.f;delete a.temp;
 }
 fs.writeFileSync(path.join(root,'AUDIO_VENDOR_REPORT.json'),JSON.stringify({original_total_bytes:original,added_total_bytes:added,transcoded_to_128kbps:compressed,assets:staging},null,2)+'\n');
 console.log('Added '+(added/1048576).toFixed(2)+' MiB of local MP3 music, re-encoded='+compressed);
}catch(e){for(const a of staging)if(fs.existsSync(a.temp))fs.rmSync(a.temp,{force:true});throw e;}
