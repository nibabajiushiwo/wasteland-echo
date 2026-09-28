export function resolveLayout(choice,{coarse=false,touchPoints=0}={}){return choice==='pc'||choice==='touch'?choice:(coarse||touchPoints>0?'touch':'pc');}
export function stickVector(dx,dy,radius=38){let x=dx/radius,y=dy/radius,n=Math.hypot(x,y);if(n<.12)return {x:0,y:0};if(n>1){x/=n;y/=n;}return {x,y};}
// Independent pointer ownership: lifting a movement finger cannot release an attack finger.
export class PointerActions{
 constructor(){this.owners=new Map();}
 hold(action,id){if(this.owners.has(action))return false;this.owners.set(action,id);return true;}
 release(id){const released=[];for(const [action,owner] of this.owners)if(owner===id){this.owners.delete(action);released.push(action);}return released;}
 has(action){return this.owners.has(action);}
 reset(){this.owners.clear();}
}
