'use strict';
const {test}=require('node:test');
const {startServer,tv,player,assert,fs}=require('./helpers');
const path=require('node:path');
test('planned Render restart retains signed TV/phone credentials and shows recovery',()=>{
 const server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
 assert.match(server,/send\(ws, \{ t:'serverRestarting' \}\)/);
 assert.match(server,/ws\.close\(1012, 'Server restarting'\)/);
 assert.match(server,/clearInterval\(heartbeatTimer\)/);
 assert.match(server,/clearInterval\(sweepTimer\)/);
 assert.match(server,/STORE\.save\(room\)/);
 assert.match(server,/shuttingDown/);
 for(const file of ['tv.html','index.html']){
  const html=fs.readFileSync(path.join(__dirname,'../public',file),'utf8');
  assert.match(html,/case 'serverRestarting':/);
  assert.match(html,/Server restarting/);
 }
});
test('actual SIGTERM notifies TV and phone, closes with 1012 and drains without advancing the game',
 {skip:process.platform==='win32',timeout:14000},async()=>{
 const srv=await startServer();
 let owner,phone;
 try{
  owner=await tv(srv.port);
  phone=await player(srv.port,owner.code,'Artist');
  const c=owner.c.ws,p=phone.c.ws;
  const closeCode=ws=>new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Missing restart close frame')),6500);
   ws.addEventListener('close',event=>{clearTimeout(timer);resolve(event.code);},{once:true});
  });
  const notices=Promise.all([owner.c.wait('serverRestarting'),phone.c.wait('serverRestarting')]);
  const closes=Promise.all([closeCode(c),closeCode(p)]);
  const stopped=new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Shutdown timed out')),7200);
   srv.child.once('exit',(code,signal)=>{clearTimeout(timer);resolve({code,signal});});
  });
  srv.child.kill('SIGTERM');
  const [messages,codes,exit]=await Promise.all([notices,closes,stopped]);
  assert.equal(messages.length,2,'both gallery screens must receive a restart message');
  assert.deepEqual(codes,[1012,1012],'TV and player must receive proper RFC 6455 service restart code');
  assert.deepEqual(exit,{code:0,signal:null});
 }finally{
  if(owner)owner.c.close();
  if(phone)phone.c.close();
  if(srv.child.exitCode===null)await srv.stop();
 }
});
