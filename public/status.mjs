export function playerStatuses(p,home=false){if(!p)return [];if(home)return [{id:'safe',icon:'⌂',label:'地堡安全区',tone:'good'}];const out=[],add=(id,icon,label,left,tone='good')=>out.push({id,icon,label,left,tone});
 if(p.hp<=0)add('down','✚','倒地 · 等待救援',p.down,'bad');
 if(p.guard)add('guard','▣','固守 · 减伤 40% / 持续恢复',null);
 if(p.barrier>0)add('barrier','⬡','壁垒减伤',p.barrier);
 if(p.invuln>0)add('dodge','↯','闪避无敌',p.invuln);
 if(p.buff>0)add('buff','✦',p.class==='gunner'?'集火 · 攻速提升':'魔力涌动',p.buff);
 if(p.poisonBlade>0)add('blade','⚔','毒刃已准备',p.poisonBlade);
 if(p.shadow>0)add('shadow','◈','影步 · 下次普攻强化',p.shadow);
 if(p.radProtection>0)add('radprotect','☢','抗辐射保护',p.radProtection);
 if(p.poisoned>0)add('poison','♨','中毒 · 持续失血',p.poisoned,'bad');
 if(p.slow>0)add('slow','≋','减速',p.slow,'bad');
 if(p.radiation>60)add('radiation','☢','高辐射 · 持续失血',null,'bad');
 if(p.charge>0)add('charge','◎','吟唱蓄力',p.charge);
 return out;
}
