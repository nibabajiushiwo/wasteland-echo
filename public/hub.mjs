import {CLASSES,NAMES,clamp,dist} from './core.mjs';
export const HUB_ROOMS=[
 {id:'quarters',name:'幸存者生活区',code:'01 / QUARTERS',x:60,y:90,w:455,h:340,color:'#354a48'},
 {id:'command',name:'舰桥 · 主控室',code:'02 / COMMAND',x:545,y:90,w:420,h:340,color:'#374c46'},
 {id:'medical',name:'医疗舱',code:'03 / MEDICAL',x:995,y:90,w:405,h:340,color:'#34504e'},
 {id:'workshop',name:'武器工坊',code:'04 / WORKSHOP',x:60,y:605,w:455,h:340,color:'#51483b'},
 {id:'training',name:'训练区',code:'05 / TRAINING',x:545,y:605,w:420,h:340,color:'#424b45'},
 {id:'energy',name:'能源室',code:'06 / REACTOR',x:995,y:605,w:405,h:340,color:'#424f3d'}
];
export const HUB_STATIONS=[
 ...CLASSES.map((c,i)=>({id:'class-'+c,type:'class',key:c,name:NAMES[c]+'的装备柜',x:140+i*95,y:255,color:['#a793d2','#d6ad70','#7dc5e0','#b9ca89'][i]})),
 {id:'control',type:'facility',key:'control',name:'主控终端',x:750,y:245,color:'#c8dea2'},
 {id:'radio',type:'radio',name:'小队通讯台',x:875,y:355,color:'#d3c597'},
 {id:'medical',type:'facility',key:'medical',name:'医疗舱核心',x:1090,y:245,color:'#8adaca'},
 {id:'medkits',type:'item',key:'medkits',name:'治疗针工作台',x:1240,y:215,color:'#94dfc1'},
 {id:'antirads',type:'item',key:'antirads',name:'抗辐射药工作台',x:1320,y:355,color:'#b7d9ab'},
 {id:'workshop',type:'facility',key:'workshop',name:'工坊控制台',x:145,y:755,color:'#dcb17c'},
 {id:'weapon',type:'weapon',name:'武器锻造台',x:355,y:770,color:'#efbc76'},
 ...['hp','atk','def','crit'].map((stat,i)=>({id:'train-'+stat,type:'attribute',key:stat,name:['体能训练','攻击训练','防御训练','精准训练'][i],x:615+i*92,y:780,color:'#c3cda7'})),
 {id:'energy',type:'facility',key:'energy',name:'反应堆控制台',x:1115,y:780,color:'#d8de88'},
 {id:'airlock',type:'airlock',name:'出发气闸',x:1305,y:515,color:'#d8eaaa'}
];
// Door openings connect all six rooms to a central hallway. Same colliders on server and renderer.
export const HUB_WALLS=[
 {x:35,y:65,w:1390,h:22},{x:35,y:945,w:1390,h:22},{x:35,y:65,w:22,h:900},{x:1403,y:65,w:22,h:900},
 ...[515,965].flatMap(x=>[{x,y:87,w:30,h:343},{x,y:605,w:30,h:340}]),
 ...[{x:60,w:455,door:280},{x:545,w:420,door:755},{x:995,w:408,door:1190}].flatMap(({x,w,door})=>[425,585].flatMap(y=>[{x,y,w:door-55-x,h:20},{x:door+55,y,w:x+w-door-55,h:20}]))
];
export function stationNear(player,range=88){return HUB_STATIONS.filter(s=>dist(s,player)<range).sort((a,b)=>dist(a,player)-dist(b,player))[0]||null;}
export function canStand(x,y){const r=15;return !HUB_WALLS.some(w=>x+r>w.x&&x-r<w.x+w.w&&y+r>w.y&&y-r<w.y+w.h);}
export class BunkerWorld{
 constructor(id){this.id=id;this.kind='bunker';this.state='bunker';this.time=0;this.width=1460;this.height=1030;this.players=[];this.effects=[];}
 add(member){if(this.players.some(p=>p.id===member.id))return;const i=this.players.length;this.players.push({id:member.id,class:member.class,name:member.name,x:675+i*48,y:515,angle:0,moving:false,connected:true,ready:false,input:{},inputAt:0});}
 remove(id){this.players=this.players.filter(p=>p.id!==id);}
 returnPlayer(id){const p=this.players.find(p=>p.id===id);if(p){p.x=1190;p.y=515;p.input={};p.ready=false;p.moving=false;}}
 effect(station){this.effects.push({id:Date.now(),x:station.x,y:station.y,life:1.2});}
 tick(dt,now=Date.now()){this.time+=dt;this.effects=this.effects.filter(e=>(e.life-=dt)>0);for(const p of this.players){if(!p.connected||now-p.inputAt>400){p.moving=false;continue;}let {mx=0,my=0,angle=0}=p.input;let n=Math.hypot(mx,my);if(n>1){mx/=n;my/=n;}const speed=175;p.angle=angle;p.moving=n>.05;const x=clamp(p.x+mx*speed*dt,75,1380),y=clamp(p.y+my*speed*dt,105,925);if(canStand(x,p.y))p.x=x;if(canStand(p.x,y))p.y=y;}}
 snapshot(){return {id:this.id,kind:this.kind,state:this.state,time:this.time,width:this.width,height:this.height,players:this.players.map(({input,inputAt,...p})=>p),effects:this.effects};}
}
