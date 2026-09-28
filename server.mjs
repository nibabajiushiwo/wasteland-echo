import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {World,CLASSES,NAMES,newProfile,regenerate,upgrade,settle,dist} from './public/core.mjs';
import {backupProfile,validateBackup} from './save.mjs';
import {BunkerWorld,stationNear,HUB_STATIONS,canStand} from './public/hub.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const config=JSON.parse(fs.readFileSync(path.join(root,'public/game_config.json'),'utf8'));
const dataDir=process.env.DATA_DIR||path.join(root,'data');fs.mkdirSync(dataDir,{recursive:true});
const saveFile=path.join(dataDir,'profiles.json');let saved={};try{saved=JSON.parse(fs.readFileSync(saveFile,'utf8'));}catch{}
const sessions=new Map(),rooms=new Map();let dirty=false,frame=0;
const RECONNECT_MS=Number(process.env.RECONNECT_MS||60000);
const roomsFile=path.join(dataDir,'rooms.json');
function persist(){for(const r of rooms.values())for(const m of r.members){const p=r.bunker.players.find(p=>p.id===m.id);if(p){m.session.profile.hub={x:p.x,y:p.y,class:m.class};m.session.profile.savedAt=Date.now();dirty=true;}}
 if(dirty){fs.writeFileSync(saveFile+'.tmp',JSON.stringify(saved));fs.renameSync(saveFile+'.tmp',saveFile);dirty=false;}
 const member=m=>({token:m.session.token,id:m.id,class:m.class,name:m.name,ready:false});const rows=[...rooms.values()].map(r=>({code:r.code,host:r.host,practice:r.practice,createdAt:r.createdAt,endedAt:r.endedAt,settled:r.settled,members:r.members.map(member),participants:r.participants.map(member),bunker:r.bunker.snapshot(),world:r.world?{...r.world,config:undefined,random:undefined}:null}));fs.writeFileSync(roomsFile+'.tmp',JSON.stringify({version:2,rooms:rows}));fs.renameSync(roomsFile+'.tmp',roomsFile);
} 
function session(token){if(!/^[a-f0-9]{48}$/.test(token||''))throw Error('无效身份，请刷新页面');let s=sessions.get(token);if(!s){if(!saved[token])saved[token]=newProfile();s={token,id:crypto.createHash('sha256').update(token).digest('hex').slice(0,12),profile:saved[token],room:null,stream:null,last:Date.now(),lastSeq:-1};sessions.set(token,s);dirty=true;}regenerate(s.profile);s.last=Date.now();return s;}
function isParticipant(r,s){return !!s&&!!r?.world?.players.some(p=>p.id===s.id);}
function active(r,s){return r?.world?.state==='exploring'&&isParticipant(r,s);}
function roomView(r){return {code:r.code,host:r.host,practice:r.practice,members:r.members.map(m=>({id:m.id,name:m.name,class:m.class,ready:!!m.ready,connected:!!m.session.stream,scene:active(r,m.session)?'wasteland':'bunker',reconnectLeft:m.session.stream?0:Math.max(0,Math.ceil((RECONNECT_MS-(Date.now()-(m.session.disconnected||Date.now())))/1000))})),state:r.world?.state||'bunker'};}
function view(s){const r=rooms.get(s.room);return {serverTime:Date.now(),tick:frame,profile:s.profile,you:s.id,room:r?roomView(r):null,bunker:r?.bunker.snapshot()||null,world:r&&isParticipant(r,s)?r.world.snapshot():null};}
function push(s){if(!s.stream||s.stream.writableLength>256000)return;s.stream.write('data: '+JSON.stringify(view(s))+'\n\n');}
function addMember(r,s,c){const member={id:s.id,session:s,class:c,name:NAMES[c],ready:false};r.members.push(member);r.bunker.add(member);s.room=r.code;s.lastSeq=-1;return member;}
function leave(s,expired=false){const r=rooms.get(s.room);if(!r)return;if(active(r,s)&&!expired)throw Error('探索中请先返回地堡；断线后 AI 会接管');const p=r.world?.players.find(p=>p.id===s.id);if(p&&expired){p.ai=true;p.connected=false;p.input={};}r.members=r.members.filter(m=>m.id!==s.id);r.bunker.remove(s.id);s.room=null;if(!r.members.length&&!r.world)rooms.delete(r.code);else if(r.host===s.id)r.host=r.members[0]?.id||null;}
function create(s,practice){leave(s);let code;do{code=crypto.randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));const r={code,host:s.id,practice:!!practice,members:[],world:null,bunker:new BunkerWorld(crypto.randomUUID()),participants:[],createdAt:Date.now()};rooms.set(code,r);addMember(r,s,CLASSES.includes(s.profile.hub?.class)?s.profile.hub.class:'gunner');const p=r.bunker.players.find(p=>p.id===s.id),pos=s.profile.hub;if(pos&&canStand(pos.x,pos.y)&&Number.isFinite(pos.x)&&Number.isFinite(pos.y)){p.x=pos.x;p.y=pos.y;}dirty=true;persist();return r;}
function conclude(r){const w=r.world;if(w.state!=='ended'||r.settled===w.id)return;r.settled=w.id;r.endedAt=Date.now();for(const m of r.participants){const p=w.players.find(p=>p.id===m.id);if(!p)continue;if(!r.practice){if(!settle(m.session.profile,m.class,w.loot,p.settlementRatio??w.ratio,w.id))continue;const pr=m.session.profile;pr.fuel=Math.max(0,pr.fuel-w.fuelSpent);pr.medkits=Math.max(0,pr.medkits-p.medUsed);pr.antirads=Math.max(0,pr.antirads-p.radUsed);dirty=true;}}persist();}
function toBunker(r){r.world=null;r.participants=[];for(const m of r.members){m.ready=false;r.bunker.returnPlayer(m.id);m.session.lastSeq=-1;}r.bunker.id=crypto.randomUUID();dirty=true;persist();}
function start(r,s){if(!r||r.host!==s.id)throw Error('由房主在出发气闸发起探索');if(r.world)throw Error('等待当前小队返回地堡');if(r.members.some(m=>!m.session.stream))throw Error('队友正在重连，请等待或移除离线席位');if(r.members.some(m=>!m.ready))throw Error('所有真人队员需先在气闸确认准备');if(r.bunker.players.some(p=>r.members.some(m=>m.id===p.id)&&dist(p,HUB_STATIONS.find(n=>n.id==='airlock'))>110))throw Error('请所有队员在气闸集合');const host=r.bunker.players.find(p=>p.id===s.id);if(!host||dist(host,HUB_STATIONS.find(n=>n.id==='airlock'))>88)throw Error('请走到出发气闸');
 const members=r.members.map(m=>{let p=m.session.profile;if(r.practice){p=newProfile();for(const c of CLASSES){p.characters[c].level=10;p.characters[c].weapon=3;}p.medkits=10;p.antirads=10;}if(p.fuel<5)throw Error(`${m.name}燃料不足 5，可进入演练房间`);return {id:m.id,name:m.name,class:m.class,profile:p};});for(const m of members)m.profile.fuel-=5;const lead=members.find(m=>m.id===s.id)||members[0];while(members.length<4){const c=CLASSES.find(c=>!members.some(m=>m.class===c))||CLASSES[members.length],p=structuredClone(lead.profile),source=lead.profile.characters[lead.class];p.characters[c].level=source.level;p.characters[c].weapon=source.weapon;members.push({id:'ai'+members.length,name:NAMES[c],class:c,profile:p,ai:true});}
 r.participants=r.members.map(m=>({...m}));r.world=new World(config,members,{id:crypto.randomUUID(),practice:r.practice});for(const m of r.members){m.ready=false;m.session.lastSeq=-1;}dirty=true;persist();}
function nearby(r,s){if(!r||active(r,s)||r.world?.state==='ended'&&isParticipant(r,s))throw Error('请先返回地堡');const p=r.bunker.players.find(p=>p.id===s.id);if(!p)throw Error('未进入地堡');const station=stationNear(p);if(!station)throw Error('走近工作台，再按互动');return {p,station};}
function useStation(r,s){const {p,station:n}=nearby(r,s),m=r.members.find(m=>m.id===s.id);let message='';
 if(n.type==='airlock'){if(r.world)throw Error('队友仍在探索，返航后即可一起出发');if(!m.ready){m.ready=true;message='已准备。所有队员准备后，房主再次互动即可出发。';}else if(r.host===s.id){start(r,s);return {message:'气闸开启，前往边缘废土。'};}else{m.ready=false;message='已取消准备';}}
 else if(n.type==='radio')return {panel:'room'};
 else if(n.type==='class'){m.class=n.key;m.name=NAMES[n.key];m.ready=false;p.class=n.key;p.name=m.name;message=`已装备${m.name}的武装`;}
 else{const kind=n.type,key=kind==='weapon'?m.class:kind==='attribute'?{class:m.class,stat:n.key}:n.key;upgrade(s.profile,kind,key);m.ready=false;message=kind==='item'?'补给制作完成':kind==='attribute'?'训练完成，属性已提升':`${n.name}升级完成`;dirty=true;persist();}
 r.bunker.effect(n);return {message};}
async function api(req,res,url){let body={};if(req.method==='POST'){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>12000)throw Error('请求过大');}body=JSON.parse(raw||'{}');}
 if(url.pathname==='/api/session'){const token=body.token&&/^[a-f0-9]{48}$/.test(body.token)?body.token:crypto.randomBytes(24).toString('hex');const s=session(token);return {token,you:s.id,profile:s.profile};}
 const token=req.headers.authorization?.replace('Bearer ','')||url.searchParams.get('token');const s=session(token);
 if(url.pathname==='/api/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','X-Accel-Buffering':'no'});if(s.stream){s.stream.write('event: replaced\ndata: {}\n\n');s.stream.end();}s.stream=res;s.disconnected=null;s.lastSeq=-1;const stream=res;push(s);req.on('close',()=>{if(s.stream===stream){s.stream=null;s.disconnected=Date.now();const r=rooms.get(s.room),m=r?.members.find(m=>m.id===s.id);if(m)m.ready=false;}});return 'stream';}
 const r=rooms.get(s.room),member=r?.members.find(m=>m.id===s.id);let result={ok:true};
 switch(url.pathname){
 case '/api/ping':return {serverTime:Date.now()};
 case '/api/save':dirty=true;persist();result.message='已保存角色、地堡位置与当前探索检查点';break;
 case '/api/backup':persist();return backupProfile(s.profile);
 case '/api/restore':{if(active(r,s)||r?.world?.state==='ended')throw Error('请返回地堡后读取存档');const clean=validateBackup(body.backup),settled=s.profile.settled;Object.assign(s.profile,clean,{settled});if(member){member.class=clean.hub.class;member.name=NAMES[member.class];member.ready=false;const p=r.bunker.players.find(p=>p.id===s.id);Object.assign(p,{x:clean.hub.x,y:clean.hub.y,class:member.class,name:member.name});}dirty=true;persist();result.message='备份已恢复';break;}
 case '/api/network':return {urls:Object.values(os.networkInterfaces()).flat().filter(n=>n&&n.family==='IPv4'&&!n.internal&&(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(n.address))).map(n=>`http://${n.address}:${process.env.PORT||8788}`)};
 case '/api/create':create(s,body.practice);break;
 case '/api/join':{const dest=rooms.get(String(body.code).toUpperCase());if(!dest)throw Error('房间不存在');if(dest===r)break;if(dest.members.length>=4)throw Error('房间已满（掉线席位保留 60 秒）');leave(s);const c=CLASSES.find(c=>!dest.members.some(m=>m.class===c))||'gunner';addMember(dest,s,c);result.message=dest.world?'已进入地堡，等待探索中的队友返航':'已进入队友地堡';break;}
 case '/api/leave':leave(s);break;
 case '/api/remove':{if(!r||r.host!==s.id)throw Error('仅房主可移除离线席位');const m=r.members.find(m=>m.id===body.id);if(!m||m.session.stream)throw Error('只能移除离线队友');leave(m.session,true);break;}
 case '/api/ready':{if(!member||r.world)throw Error('等待队友返航');const {station}=nearby(r,s);if(station.type!=='airlock')throw Error('请在气闸集合准备');member.ready=!!body.ready;break;}
 case '/api/start':start(r,s);break;
 case '/api/interact':result={ok:true,...useStation(r,s)};break;
 // All advancement now requires walking to a physical station. No remote upgrade or class switch endpoint.
 case '/api/upgrade':case '/api/class':throw Error('请走到地堡对应工作台或装备柜，使用互动');
 case '/api/input':{if(!member)break;const world=active(r,s)?r.world:r.world?.state==='ended'&&isParticipant(r,s)?null:r.bunker;if(!world||body.scene!==world.id)break;if(!Number.isSafeInteger(body.seq)||body.seq<=s.lastSeq)break;s.lastSeq=body.seq;const p=world.players.find(p=>p.id===s.id);if(!p)break;const b=body,i={mx:Number.isFinite(b.mx)?Math.max(-1,Math.min(1,b.mx)):0,my:Number.isFinite(b.my)?Math.max(-1,Math.min(1,b.my)):0,angle:Number.isFinite(b.angle)?b.angle:0,attack:!!b.attack,interact:!!b.interact,dodge:!!b.dodge};if(Number.isInteger(b.skill)&&b.skill>=0&&b.skill<3)i.skill=b.skill;if(b.heal)i.heal=true;if(b.antirad)i.antirad=true;p.input=i;p.inputAt=Date.now();break;}
 case '/api/camp':if(r?.world?.state==='exploring')throw Error('探索尚未结束');if(r?.world)toBunker(r);break;
 default:throw Error('未知接口');}
 for(const ss of sessions.values())if(ss===s||ss.room===s.room)push(ss);return url.pathname==='/api/input'?result:{...result,view:view(s)};
}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/')){if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)throw Error('跨域请求不允许');const result=await api(req,res,url);if(result!=='stream'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(result));}return;}const file=path.resolve(root,'public','.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(path.join(root,'public')+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});fs.createReadStream(file).pipe(res);}catch(e){if(!res.headersSent)res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}});
// A restored expedition is paused until a participant reconnects; elapsed offline time is not simulated.
try{const archive=JSON.parse(fs.readFileSync(roomsFile,'utf8'));if(archive.version===2)for(const raw of archive.rooms){const hydrate=x=>{const ss=session(x.token);ss.disconnected=Date.now();return {...x,session:ss,ready:false};};const r={...raw,members:raw.members.map(hydrate),participants:raw.participants.map(hydrate),recovered:true};r.bunker=Object.assign(new BunkerWorld(raw.bunker.id),raw.bunker);r.bunker.players.forEach(p=>Object.assign(p,{input:{},inputAt:0,connected:false,ready:false}));if(raw.world){r.world=Object.assign(Object.create(World.prototype),raw.world,{config,random:Math.random});r.world.players.forEach(p=>Object.assign(p,{input:{},inputAt:0,connected:false}));}for(const m of r.members)m.session.room=r.code;rooms.set(r.code,r);}}catch(e){if(e.code!=='ENOENT')console.warn('Room checkpoint could not be restored:',e.message);}
setInterval(()=>{const now=Date.now();for(const r of rooms.values()){
 if(r.recovered){if(!r.members.some(m=>m.session.stream))continue;r.recovered=false;for(const m of r.members)if(!m.session.stream)m.session.disconnected=now;}

 for(const p of r.bunker.players){const m=r.members.find(m=>m.id===p.id);p.connected=!!m?.session.stream&&!active(r,m?.session);if(m?.ready&&dist(p,HUB_STATIONS.find(n=>n.id==='airlock'))>140)m.ready=false;p.ready=!!m?.ready;if(active(r,m?.session))p.moving=false;}
 r.bunker.tick(1/30,now);
 if(r.world?.state==='exploring'){for(const p of r.world.players){const m=r.members.find(m=>m.id===p.id);p.connected=!!m?.session.stream;if(now-(p.inputAt||0)>400)p.input={};}r.world.tick(1/30);if(r.participants.every(m=>!m.session.stream&&now-(m.session.disconnected||now)>RECONNECT_MS))r.world.finish('wipe');conclude(r);}
 for(const m of [...r.members])if(!m.session.stream&&m.session.disconnected&&now-m.session.disconnected>RECONNECT_MS)leave(m.session,true);
 const connected=r.members.filter(m=>m.session.stream);if(connected.length&&!connected.some(m=>m.id===r.host))r.host=connected.find(m=>active(r,m.session))?.id||connected[0].id;
 if(r.world?.state==='ended'&&now-r.endedAt>15000)toBunker(r);
 if(!r.members.length&&!r.world)rooms.delete(r.code);
 }if(++frame%3===0)for(const s of sessions.values())push(s);},1000/30);
setInterval(()=>{persist();for(const s of sessions.values())if(s.stream)s.stream.write(': heartbeat\n\n');},5000).unref();process.on('SIGINT',()=>{persist();process.exit();});process.on('SIGTERM',()=>{persist();process.exit();});
const port=Number(process.env.PORT||8788);server.listen(port,process.env.HOST||'0.0.0.0',()=>console.log(`废土回声 http://localhost:${port} — shared bunker + co-op`));
