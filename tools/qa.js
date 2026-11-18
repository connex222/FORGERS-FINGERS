'use strict';
const cp=require('node:child_process');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const root=path.resolve(__dirname,'..');const temp=fs.mkdtempSync(path.join(os.tmpdir(),'forgers-qa-'));
let failures=0;let steps=0;
// Build and test subprocesses must never read or overwrite real gallery secrets,
// even if Render exposes production environment variables during its build.
const qaEnv={...process.env};
delete qaEnv.FF_DATA_DIR;
delete qaEnv.FF_PERSISTENCE_KEY;
for(const key of Object.keys(qaEnv))if(key.startsWith('FF_TEST_'))delete qaEnv[key];
function run(name,exe,args){
 steps++;
 console.log(`\n=== ${name} ===`);
 const r=cp.spawnSync(exe,args,{cwd:root,env:qaEnv,encoding:'utf8',timeout:120000,maxBuffer:10*1024*1024});
 if(r.stdout)process.stdout.write(r.stdout);
 if(r.stderr)process.stderr.write(r.stderr);
 if(r.error||r.status!==0){failures++;console.error(`FAIL: ${name} (${r.error||r.status})`);}else console.log(`PASS: ${name}`);
}
for(const file of ['server.js','decks.js','public/shared.js','public/tutorial.js','lib/rules.js','lib/transport.js','lib/persistence.js','lib/qr.js','lib/qr-png.js'])run(`syntax ${file}`,process.execPath,['--check',file]);
for(const name of ['index.html','tv.html']){
 const html=fs.readFileSync(path.join(root,'public',name),'utf8');
 // Parse only inline script contents: later external fullscreen scripts are not JS source.
 // The previous lastIndexOf approach accidentally included literal </script> HTML
 // whenever <script src="..."></script> followed the inline gameplay script.
 const src=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
   .map(m=>m[1]).filter(Boolean).join('\n;\n');
 if(!src){failures++;continue;}
 const file=path.join(temp,name+'.js');fs.writeFileSync(file,src);
 run(`inline browser-script syntax ${name}`,process.execPath,['--check',file]);
}
run('asset authenticity and presence',process.execPath,['tools/asset-audit.js']);
run('unit, protocol, scoring, HTTP, recovery and full-match integration tests',process.execPath,['--test',...fs.readdirSync(path.join(root,'tests')).filter(f=>f.endsWith('.test.js')).map(f=>'tests/'+f)]);
fs.rmSync(temp,{recursive:true,force:true});
console.log(`\nQA RESULT: ${failures===0?'PASS':'FAIL'} — ${steps-failures}/${steps} gates passed`);
console.log('Native Chromium navigation to localhost is blocked here. Optional Stage 6D browser tests use an explicitly labelled real-server WebSocket bridge; see STAGE6-BATCH-D-QA.md. Physical devices remain NOT RUN.');
process.exitCode=failures?1:0;
