import {newProfile,CLASSES,expRequired,fuelCap} from './public/core.mjs';
import {canStand} from './public/hub.mjs';
export function backupProfile(profile){const {settled,...rest}=structuredClone(profile);return {format:'wasteland-echo-save',version:2,createdAt:Date.now(),profile:rest};}
export function validateBackup(input){if(input?.format!=='wasteland-echo-save'||input.version!==2||!input.profile)throw Error('不是有效的废土回声 v2 备份');const p=input.profile,out=newProfile();
 const number=(v,min,max,name,integer=true)=>{if(!Number.isFinite(v)||v<min||v>max||(integer&&!Number.isInteger(v)))throw Error('存档字段无效：'+name);return v;};
 for(const k of ['coin','crystal','sample','kills','dogs','boxes','medkits','antirads'])out[k]=number(p[k],0,1000000000,k);
 for(const k of Object.keys(out.facilities))out.facilities[k]=number(p.facilities?.[k],1,10,k);
 for(const k of ['workshop','medical','energy'])if(out.facilities[k]>out.facilities.control)throw Error('设施等级超过主控上限');
 out.fuel=number(p.fuel,0,fuelCap(out),'fuel');out.fuelAt=Date.now();out.quest=number(p.quest,0,3,'quest');
 for(const c of CLASSES){const v=p.characters?.[c],d=out.characters[c];d.level=number(v?.level,1,60,'level');d.xp=number(v?.xp,0,expRequired(d.level)-1,'xp');d.weapon=number(v?.weapon,1,Math.min(20,out.facilities.workshop*2),'weapon');d.points=number(v?.points,0,177,'points');let spent=0;for(const k of Object.keys(d.allocated)){d.allocated[k]=number(v?.allocated?.[k],0,177,k);spent+=d.allocated[k];}if(spent+d.points>(d.level-1)*3)throw Error('属性点总量不符合等级');}
 for(const k of ['blueprints','seen']){if(!Array.isArray(p[k])||p[k].length>100||p[k].some(n=>typeof n!=='string'||n.length>40))throw Error('图鉴或蓝图字段无效');out[k]=[...new Set(p[k])];}
 out.hub={class:CLASSES.includes(p.hub?.class)?p.hub.class:'gunner',x:755,y:515};if(Number.isFinite(p.hub?.x)&&Number.isFinite(p.hub?.y)&&p.hub.x>=75&&p.hub.x<=1380&&p.hub.y>=105&&p.hub.y<=925&&canStand(p.hub.x,p.hub.y)){out.hub.x=p.hub.x;out.hub.y=p.hub.y;}out.savedAt=Date.now();return out;
}
