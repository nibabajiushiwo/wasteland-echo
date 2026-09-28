import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import {World,newProfile,CLASSES,dist} from '../public/core.mjs';
test('level 10 squad completes exploration, digger boss and blueprint extraction',()=>{
const cfg=JSON.parse(fs.readFileSync(new URL('../public/game_config.json',import.meta.url)));
let seed=35;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const members=['gunner','guard','warlock','assassin'].map((c,i)=>{const p=newProfile();p.fuel=15;for(const k of CLASSES){p.characters[k].level=10;p.characters[k].weapon=3;}p.medkits=10;p.antirads=10;return {id:'p'+i,class:c,profile:p,ai:i>0};});
const w=new World(cfg,members,{random}),p=w.players[0];let phase=0;
const objectives=[w.nodes.find(n=>n.id==='ore0'),w.nodes.find(n=>n.id==='tower1'),w.nodes.find(n=>n.id==='tower2'),w.nodes.find(n=>n.id==='boss')];
for(let i=0;i<30*900&&w.state==='exploring';i++){
 let goal=phase<4?objectives[phase]:w.bossDead?w.base:w.nodes.find(n=>n.id==='tower2');
 if(phase<4&&dist(p,goal)<70){p.input={interact:true};w.interact(p,1/30);phase++;}
 const d=dist(p,goal)||1;const enemy=w.nearest(p,550);p.input={mx:d>40?(goal.x-p.x)/d:0,my:d>40?(goal.y-p.y)/d:0,interact:d<85,attack:!!enemy,angle:enemy?Math.atan2(enemy.y-p.y,enemy.x-p.x):0,heal:p.hp<p.maxHp*.6,antirad:w.radiation>60};
 if(enemy&&p.cd[i%3]===0)p.input.skill=i%3;
 const danger=w.warnings.find(a=>dist(p,a)<a.radius+10);if(danger){const dd=dist(p,danger)||1;p.input.mx=(p.x-danger.x)/dd||1;p.input.my=(p.y-danger.y)/dd;p.input.dodge=true;}
 w.tick(1/30);
}
assert.equal(w.state,'ended');assert.equal(w.reason,'return');assert.ok(w.bossDead);assert.ok(w.loot.blueprints.includes('掘地者'));assert.ok(w.loot.crystal>100);assert.ok(w.players.every(p=>p.hp>0));
});
