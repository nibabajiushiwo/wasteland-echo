import {HUB_ROOMS,HUB_STATIONS,HUB_WALLS,stationNear} from './hub.mjs';
export function drawHub(r,w,you,time,drawSurvivor,colors){
 const ctx=r.ctx,me=w.players.find(p=>p.id===you)||{x:755,y:515};r.zoom=r.w<600?.93:r.h<550?.82:1.04;
 r.camera.x+=(me.x-r.camera.x)*.16;r.camera.y+=(me.y-r.camera.y)*.16;
 ctx.fillStyle='#101b20';ctx.fillRect(0,0,r.w,r.h);
 const project=(x,y)=>r.project(x,y),rect=(x,y,width,height,c)=>{const p=project(x,y);ctx.fillStyle=c;ctx.fillRect(p.x,p.y,width*r.zoom,height*r.zoom*.68);};
 const text=(s,x,y,size=11,c='#9fae99')=>{const p=project(x,y);ctx.font=`${size}px "PingFang SC","Microsoft YaHei",sans-serif`;ctx.textAlign='center';ctx.fillStyle=c;ctx.fillText(s,p.x,p.y);};
 const floor=(x,y,width,height,c)=>{rect(x,y,width,height,c);for(let xx=x;xx<x+width;xx+=48){rect(xx,y,1,height,'#93b09909');}for(let yy=y;yy<y+height;yy+=48)rect(x,yy,width,1,'#93b09909');};
 floor(35,65,1390,900,'#27383a');floor(57,445,1346,140,'#394646');
 // Central corridor: illuminated tracks and route markings.
 rect(57,461,1346,3,'#60796c');rect(57,568,1346,3,'#60796c');for(let x=100;x<1350;x+=62)rect(x,507,22,3,'#84917365');
 text('← 生活区 / 工坊',340,540,10,'#97a68d');text('医疗 / 能源 →',1040,540,10,'#97a68d');
 for(const room of HUB_ROOMS){floor(room.x,room.y,room.w,room.h,room.color);text(room.code,room.x+room.w/2,room.y+42,10,'#a0b49a');text(room.name,room.x+room.w/2,room.y+76,16,'#d2ddbd');}
 // Windows look onto the wasteland, making the shelter distinct from its exterior world.
 for(const room of HUB_ROOMS.slice(0,3)){rect(room.x+30,95,room.w-60,21,'#18282f');rect(room.x+35,98,room.w-70,10,'#6e8d8180');for(let x=room.x+60;x<room.x+room.w-30;x+=75)rect(x,95,5,21,'#3d5350');}
 // Beds, storage, repair equipment and reactor plumbing are fixed in the world.
 for(let i=0;i<3;i++){rect(110+i*126,344,82,52,'#1f3238');rect(115+i*126,348,70,44,'#617376');rect(119+i*126,350,20,34,'#a9b9aa');}
 rect(660,313,118,61,'#1d3536');rect(668,319,102,47,'#548376');for(let i=0;i<3;i++)rect(680+i*27,329,17,4,'#b7d9a0');
 rect(1080,340,132,56,'#243b3c');rect(1087,347,118,41,'#7a9c94');rect(1092,349,28,35,'#cee3cd');
 rect(240,862,180,33,'#263839');for(let i=0;i<5;i++){rect(250+i*33,867,23,20,'#8b7e58');rect(260+i*33,862,3,30,'#b6a074');}
 rect(1230,678,88,184,'#253c3c');rect(1242,694,63,151,'#647855');rect(1253,705,42,128,'#c1d980');rect(1260,713,10,110,'#e2edb1');
 const near=stationNear(me);
 for(const n of HUB_STATIONS){const p=project(n.x,n.y),s=r.zoom;ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.scale(s,s);
 if(n.id===near?.id){ctx.fillStyle=n.color+'1a';ctx.strokeStyle=n.color+'88';ctx.beginPath();ctx.ellipse(0,7,49,25,0,0,7);ctx.fill();ctx.stroke();}
 if(n.type==='airlock'){ctx.fillStyle='#172b2e';ctx.fillRect(-44,-56,88,74);ctx.fillStyle='#617566';ctx.fillRect(-38,-50,76,61);ctx.fillStyle='#c4d7a6';ctx.fillRect(-33,-44,29,47);ctx.fillRect(4,-44,29,47);ctx.fillStyle='#1d352e';ctx.fillRect(-29,-21,19,6);ctx.fillRect(10,-21,19,6);ctx.fillStyle='#9aac7b';ctx.fillRect(-44,21,88,4);}
 else if(n.type==='class'){ctx.fillStyle='#172a2d';ctx.fillRect(-23,-51,46,62);ctx.fillStyle=n.color;ctx.fillRect(-20,-48,40,54);ctx.fillStyle='#26363c';ctx.fillRect(-14,-40,28,35);ctx.fillStyle=n.color;ctx.fillRect(-9,-34,18,21);ctx.fillStyle='#d5dfc3';ctx.fillRect(11,-11,3,8);}
 else if(n.id==='weapon'){ctx.fillStyle='#283332';ctx.fillRect(-43,-22,86,38);ctx.fillStyle='#a78a5b';ctx.fillRect(-46,-29,92,15);ctx.fillStyle='#313c3f';ctx.fillRect(-22,-40,45,14);ctx.fillStyle='#ccd5b9';ctx.fillRect(-16,-43,43,4);ctx.fillStyle='#d89a56';ctx.fillRect(27,-42,6,18);}
 else if(n.type==='attribute'){ctx.fillStyle='#202f32';ctx.fillRect(-23,-28,46,43);ctx.fillStyle='#72806c';ctx.fillRect(-20,-24,40,32);ctx.fillStyle=n.color;ctx.fillRect(-14,-45,28,23);ctx.fillStyle='#364947';ctx.fillRect(-4,-37,8,8);}
 else{ctx.fillStyle='#182c30';ctx.fillRect(-26,-43,52,58);ctx.fillStyle='#52695f';ctx.fillRect(-23,-39,46,48);ctx.fillStyle='#172e32';ctx.fillRect(-18,-34,36,22);ctx.fillStyle=n.color;ctx.fillRect(-15,-31,30,16);ctx.fillStyle='#233b37';ctx.fillRect(-10,-26,20,3);ctx.fillStyle=n.color;ctx.fillRect(-16,-4,5,4);ctx.fillRect(-4,-4,5,4);ctx.fillStyle='#8b9880';ctx.fillRect(8,-4,5,4);}
 ctx.restore();text(n.name,n.x,n.y+(n.type==='airlock'?-103:['radio','antirads'].includes(n.id)?30:48),near?.id===n.id?12:10,near?.id===n.id?'#e0f1bf':'#b5c4a6');}
 // Short, translucent partition faces do not hide people standing behind them.
 for(const wall of HUB_WALLS){const p=project(wall.x,wall.y);ctx.fillStyle='#182a2ef0';ctx.fillRect(p.x,p.y-16,wall.w*r.zoom,wall.h*r.zoom*.68+16);ctx.fillStyle='#667e70';ctx.fillRect(p.x,p.y-18,wall.w*r.zoom,4);ctx.fillStyle='#3c5650';ctx.fillRect(p.x,p.y-14,wall.w*r.zoom,5);}
 const people=[...w.players.filter(p=>p.connected),{id:'npc-eng',class:'guard',name:'机械师 · 赫尔',x:210,y:840,connected:true},{id:'npc-med',class:'warlock',name:'医官 · 米娅',x:1170,y:285,connected:true}].sort((a,b)=>a.y-b.y);
 for(const p of people){const q=project(p.x,p.y);if(p.id===you){ctx.strokeStyle='#dbedac';ctx.beginPath();ctx.ellipse(q.x,q.y,22*r.zoom,11*r.zoom,0,0,7);ctx.stroke();}drawSurvivor(ctx,p.class,q.x,q.y,.9*r.zoom,time,{walk:p.moving,flip:Math.cos(p.angle||0)<0});text(p.name+(p.ready?' ✓':''),p.x,p.y-88,10,p.id===you?'#e0eebe':colors[p.class]);}
 for(const e of w.effects){const p=project(e.x,e.y);ctx.globalAlpha=e.life/1.2;ctx.strokeStyle='#d4f3b4';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,40+(1.2-e.life)*30,20+(1.2-e.life)*15,0,0,7);ctx.stroke();ctx.globalAlpha=1;}
}
export function drawHubMap(canvas,w,you){const c=canvas.getContext('2d'),sx=190/w.width,sy=140/w.height;c.clearRect(0,0,190,140);c.fillStyle='#11232a';c.fillRect(0,0,190,140);c.fillStyle='#536b59';c.fillRect(7,60,176,20);for(const room of HUB_ROOMS){c.fillStyle=room.color;c.fillRect(room.x*sx,room.y*sy,room.w*sx,room.h*sy);}for(const s of HUB_STATIONS){c.fillStyle=s.color;c.fillRect(s.x*sx-1,s.y*sy-1,3,3);}for(const p of w.players){if(!p.connected)continue;c.fillStyle=p.id===you?'#f1f6ce':'#89cbd3';c.beginPath();c.arc(p.x*sx,p.y*sy,p.id===you?3:2,0,7);c.fill();}}
