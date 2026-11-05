'use strict';
const {spawn} = require('node:child_process');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const assert = require('node:assert/strict');
async function port() {
  return new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
}
async function startServer(options={}) {
  const p = options.port || await port();
  const cp=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),
    env:{...process.env,PORT:String(p),...options.env}, stdio:['ignore','pipe','pipe']});
  let out='',err=''; cp.stdout.on('data',d=>{out+=d;});cp.stderr.on('data',d=>{err+=d;});
  await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error('Server startup timed out: '+err+' '+out)),5000);
    const loop=async()=>{
      if(cp.exitCode!==null){clearTimeout(timeout);reject(new Error('Exited early: '+err+' '+out));return;}
      try{const r=await fetch(`http://127.0.0.1:${p}/health`);if(r.status===200){clearTimeout(timeout);resolve();return;}}catch{}
      setTimeout(loop,40);
    };loop();
  });
  return {port:p,child:cp,get stderr(){return err;},get stdout(){return out;},async stop(){if(cp.exitCode!==null)return;cp.kill('SIGTERM');await Promise.race([new Promise(r=>cp.once('exit',r)),new Promise(r=>setTimeout(r,2500))]);if(cp.exitCode===null)cp.kill('SIGKILL');}};
}
class Client {
  constructor(ws) {
    this.ws=ws;this.inbox=[];this.waiters=[];
    ws.addEventListener('message',e=>{
      let m;try{m=JSON.parse(e.data);}catch{return;}
      const i=this.waiters.findIndex(w=>w.check(m));
      if(i>=0){const [w]=this.waiters.splice(i,1);clearTimeout(w.timer);w.resolve(m);}
      else this.inbox.push(m);
    });
  }
  send(m){this.ws.send(JSON.stringify(m));}
  wait(t,filter=()=>true,timeout=4000){
    const check=m=>m.t===t&&filter(m);
    const i=this.inbox.findIndex(check);
    if(i>=0)return Promise.resolve(this.inbox.splice(i,1)[0]);
    return new Promise((resolve,reject)=>{const w={check,resolve};w.timer=setTimeout(()=>{this.waiters=this.waiters.filter(x=>x!==w);reject(new Error('Timeout waiting '+t+'; inbox='+JSON.stringify(this.inbox.slice(-10)).slice(0,1300)));},timeout);this.waiters.push(w);});
  }
  async expectError(code, action){if(action)this.send(action);return this.wait('error',m=>m.code===code);}
  close(){try{this.ws.close();}catch{}}
  clear(){this.inbox.length=0;}
}
async function connect(portNumber) {
  const ws=new WebSocket(`ws://127.0.0.1:${portNumber}/ws`);
  const client = new Client(ws);
  await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('WebSocket connection timeout')),3500);ws.addEventListener('open',()=>{clearTimeout(t);resolve();},{once:true});ws.addEventListener('error',()=>{clearTimeout(t);reject(new Error('WebSocket failed'));},{once:true});});
  return client;
}
async function tv(portNumber){const c=await connect(portNumber);c.send({t:'tv_create'});const ok=await c.wait('tv_ok');await c.wait('state',s=>s.phase==='lobby');return{c,...ok};}
async function player(portNumber,code,name){const c=await connect(portNumber);c.send({t:'join',code,name});const joined=await c.wait('joined');await c.wait('state');return{c,...joined};}
async function latestState(client, pred=()=>true){return client.wait('state',pred);}
async function enterDraw(tvClient,players,code){
  const vip=players[0];vip.c.send({t:'cmd',cmd:'start'});
  await tvClient.wait('state',s=>s.phase==='intro');
  tvClient.send({t:'tv_cmd',cmd:'skip'});
  const state=await tvClient.wait('state',s=>s.phase==='draw');
  return state;
}
async function submit(p,round,id){
  const submissionId=id||'submit_'+round+'_'+p.pid.slice(0,8);
  p.c.send({t:'drawing',round,submissionId,strokes:[{f:1}]});
  await p.c.wait('drawing_received',m=>m.submissionId===submissionId);
  return submissionId;
}
module.exports={startServer,connect,tv,player,enterDraw,submit,latestState,port,assert,fs,os,path};
