import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),pause=ms=>new Promise(r=>setTimeout(r,ms));
test('multiplayer hub, ready gate, scene isolation, migration, reconnect, standby joining and persistence',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'echo-test-')),port=19000+Math.floor(Math.random()*1000),url=`http://127.0.0.1:${port}`;const server=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:dir},stdio:['ignore','pipe','pipe']});let err='';server.stderr.on('data',d=>err+=d);const clients=[];
 const call=async(c,a,b={})=>{const r=await fetch(url+'/api/'+a,{method:'POST',headers:{'Content-Type':'application/json',...(c?{Authorization:'Bearer '+c.token}:{})},body:JSON.stringify(b)});const out=await r.json();if(c&&out.view)c.view=out.view;return {status:r.status,...out};};
 const wait=async(fn,ms=6000)=>{const until=Date.now()+ms;while(!fn()){if(Date.now()>until)throw Error('Timed out waiting for state: '+err);await pause(25);}};
 const connect=async c=>{c.abort=new AbortController();const res=await fetch(url+'/api/events?token='+c.token,{signal:c.abort.signal});c.reader=res.body.getReader();c.task=(async()=>{let buf='';const decoder=new TextDecoder();while(true){const {value,done}=await c.reader.read();if(done)break;buf+=decoder.decode(value,{stream:true});let k;while((k=buf.indexOf('\n\n'))>=0){const line=buf.slice(0,k);buf=buf.slice(k+2);if(line.startsWith('data: '))c.view=JSON.parse(line.slice(6));if(line.startsWith('event: replaced'))c.replaced=true;}}})().catch(()=>{});await wait(()=>c.view);};
 const me=c=>(c.view.world||c.view.bunker).players.find(p=>p.id===c.id);
 const input=async(c,b)=>call(c,'input',{scene:(c.view.world||c.view.bunker).id,seq:++c.seq,...b});
 const walk=async(list,x,y)=>{const until=Date.now()+10000;while(list.some(c=>Math.hypot(me(c).x-x,me(c).y-y)>22)){if(Date.now()>until)throw Error('Navigation timed out '+JSON.stringify(list.map(c=>me(c))));await Promise.all(list.map(c=>{const p=me(c),d=Math.hypot(x-p.x,y-p.y);return input(c,{mx:d>20?(x-p.x)/d:0,my:d>20?(y-p.y)/d:0});}));await pause(75);}await Promise.all(list.map(c=>input(c,{mx:0,my:0})));};
 try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Server exited '+code+err)));});
 for(let i=0;i<5;i++){const a=await call(null,'session');const c={token:a.token,id:a.you,seq:0};clients.push(c);await connect(c);}
 const host=clients[0];assert.equal((await call(host,'create')).status,200);const code=host.view.room.code;for(let i=1;i<4;i++)assert.equal((await call(clients[i],'join',{code})).status,200);assert.equal((await call(clients[4],'join',{code})).status,400);
 await wait(()=>clients[3].view.bunker?.players.length===4);assert.equal(new Set(clients.slice(0,4).map(c=>c.view.bunker.id)).size,1);
 assert.equal((await call(host,'upgrade',{kind:'weapon',key:'gunner'})).status,400);assert.equal((await call(host,'class',{class:'guard'})).status,400);assert.equal((await call(host,'start')).status,400);assert.equal((await call(host,'interact')).status,400);
 // Walk through the right-hand doorway to the medicine workbench; server distance checks govern purchases.
 await walk([host],1190,515);await walk([host],1190,280);await walk([host],1240,265);const beforeKits=host.view.profile.medkits;assert.equal((await call(host,'interact')).status,200);assert.equal(host.view.profile.medkits,beforeKits+1);assert.equal(host.view.profile.coin,160);
 await walk([host],1190,300);await walk([host],1190,515);await walk(clients.slice(0,4),1270,515);
 for(const c of clients.slice(0,4))assert.equal((await call(c,'ready',{ready:true})).status,200);assert.equal((await call(clients[1],'start')).status,400);const oldScene=host.view.bunker.id;
 assert.equal((await call(host,'start')).status,200);await wait(()=>clients.slice(0,4).every(c=>c.view.world?.players.length===4));const run=host.view.world.id;assert.equal(new Set(clients.slice(0,4).map(c=>c.view.world.id)).size,1);assert.equal(host.view.profile.fuel,15);
 const initialX=me(host).x;await call(host,'input',{scene:oldScene,seq:999999,mx:1});await pause(150);assert.equal(me(host).x,initialX);
 const before=me(clients[1]).x;await input(clients[1],{mx:1});await pause(150);await wait(()=>me(clients[1]).x>before+5);await input(clients[1],{mx:0});
 host.abort.abort();await wait(()=>clients[1].view.room.host!==host.id);await wait(()=>clients[1].view.world.players.find(p=>p.id===host.id).connected===false);await connect(host);await wait(()=>host.view.world?.id===run&&me(host).connected);assert.equal(host.view.profile.fuel,15);
 for(let i=0;i<50;i++){await input(clients[1],{interact:true});await pause(60);}await wait(()=>host.view.world?.state==='ended');assert.equal(host.view.world.reason,'return');assert.equal(host.view.profile.settled.filter(x=>x===run).length,1);
 assert.equal((await call(host,'camp')).status,200);await wait(()=>!clients[1].view.world);assert.equal(me(host).x,1190);assert.notEqual(host.view.bunker.id,oldScene);assert.equal(host.view.room.members.some(m=>m.ready),false);
 // A new joiner can move in the shared bunker while the expedition is still active.
 await call(host,'create',{practice:true});await walk([host],1270,515);await call(host,'ready',{ready:true});assert.equal((await call(host,'start')).status,200);assert.equal((await call(clients[4],'join',{code:host.view.room.code})).status,200);assert.equal(clients[4].view.world,null);assert.equal(clients[4].view.room.members.find(m=>m.id===host.id).scene,'wasteland');
 const bx=me(clients[4]).x;await input(clients[4],{mx:1});await pause(150);await wait(()=>me(clients[4]).x>bx);assert.equal((await call(clients[4],'camp')).status,400);
 for(let i=0;i<50;i++){await input(host,{interact:true});await pause(60);}await wait(()=>host.view.world?.state==='ended');await call(clients[4],'camp');await wait(()=>!host.view.world);assert.equal(clients[4].view.profile.fuel,20);
 const existing=await call(null,'session',{token:host.token});assert.equal(existing.profile.settled.filter(x=>x===run).length,1);
 console.log('  Physical stations, four-player shared hub, ready checks, stale-input rejection, reconnect, standby and persistence verified.');
 }finally{for(const c of clients)c.abort?.abort();server.kill('SIGTERM');await new Promise(r=>server.once('exit',r));await rm(dir,{recursive:true,force:true});}
});
