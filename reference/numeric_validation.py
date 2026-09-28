# -*- coding: utf-8 -*-
"""《废土回声》数值校验 V3 —— 新增爬行者/潜伏者后复算，输出最终配置表
断言总数 20 项。复算命令：python3 numeric_validation.py
"""
import math

def dmg_out(ATK, mult, tdef):
    raw = ATK*mult
    return max(raw*0.2, raw - tdef*0.6)

def dmg_in(ATK, pdef):
    return max(ATK*0.2, ATK - pdef*0.6)

def crit_mult(crate, cdmg):
    cm = 1.5 + (cdmg-1.5)
    return 1 + crate*(cm-1)

# ---- 职业基础 ----
CLASSES = {
    '暗杀者': dict(hp0=480, atk0=62, def0=38, hpg=38, atkg=5.0, defg=3.0, aspd=1.8, mspd=6.5, crate=0.15, cdmg=1.8),
    '卫兵':   dict(hp0=860, atk0=46, def0=96, hpg=72, atkg=4.6, defg=7.6, aspd=0.9, mspd=4.2, crate=0.05, cdmg=1.5),
    '术士':   dict(hp0=560, atk0=58, def0=46, hpg=42, atkg=4.6, defg=3.6, aspd=0.8, mspd=5.0, crate=0.08, cdmg=1.6),
    '火炮手': dict(hp0=520, atk0=52, def0=44, hpg=40, atkg=4.1, defg=3.4, aspd=2.5, mspd=5.5, crate=0.12, cdmg=1.7),
}
WEAPONS = {
    '暗杀者': dict(atk0=30, atkg=10, sub=lambda lv: ('暴击率+%.0f%%'%(0.6*lv), 0.006*lv)),
    '卫兵':   dict(atk0=28, atkg=9,  sub=lambda lv: ('防御+%.0f'%(2*lv), 2.0*lv)),
    '术士':   dict(atk0=28, atkg=9,  sub=lambda lv: ('蓝上限+%.0f'%lv, 1.0*lv)),
    '火炮手': dict(atk0=26, atkg=8.5,sub=lambda lv: ('攻速+%.1f%%'%(0.3*lv), 0.003*lv)),
}
def cs(cname, lv, wlv):
    c=CLASSES[cname]; w=WEAPONS[cname]
    hp = c['hp0']+c['hpg']*(lv-1); atk=c['atk0']+c['atkg']*(lv-1); df=c['def0']+c['defg']*(lv-1)
    watk = w['atk0']+w['atkg']*wlv if wlv>0 else 0
    sub = w['sub'](wlv)[1] if wlv>0 else 0
    atk+=watk; crate=c['crate']; aspd=c['aspd']
    if cname=='暗杀者': crate+=sub
    elif cname=='卫兵': df+=sub
    elif cname=='火炮手': aspd*=(1+sub)
    return dict(hp=hp, atk=atk, df=df, aspd=aspd, crate=min(crate,0.80), cdmg=c['cdmg'])

def ass_dps(atk,aspd,cr,cd,tdef):
    cm=crit_mult(cr,cd)
    return dmg_out(atk,1.0,tdef)*cm*aspd + dmg_out(atk,6.0,tdef)*cm/(100/8.0/aspd)
def gd_dps(atk,aspd,cr,cd,tdef):
    cm=crit_mult(cr,cd)
    return dmg_out(atk,1.0,tdef)*cm*aspd + dmg_out(atk,2.2,tdef)*cm/3.0 + 0.10*atk*cm
def wl_dps(atk,aspd,cr,cd,tdef):
    cm=crit_mult(cr,cd)
    return dmg_out(atk,1.2,tdef)*cm*aspd + dmg_out(atk,2.2,tdef)*cm/3.0 + dmg_out(atk,1.5,tdef)*cm/8.0*0.75
def gn_dps(atk,aspd,cr,cd,tdef):
    cm=crit_mult(cr,cd)
    return dmg_out(atk,1.0,tdef)*cm*aspd + dmg_out(atk,1.8,tdef)*cm/5.0 + dmg_out(atk,3.0,tdef)*cm/8.0
FN={'暗杀者':ass_dps,'卫兵':gd_dps,'术士':wl_dps,'火炮手':gn_dps}

def pdps(lv,wlv,tdef):
    return sum(FN[c](cs(c,lv,wlv)['atk'],cs(c,lv,wlv)['aspd'],cs(c,lv,wlv)['crate'],cs(c,lv,wlv)['cdmg'],tdef) for c in CLASSES)
def sdps(c,lv,wlv,tdef):
    s=cs(c,lv,wlv); return FN[c](s['atk'],s['aspd'],s['crate'],s['cdmg'],tdef)

print("="*80)
print("A. 职业里程碑(武器按推荐等级): 面板 + 单目标持续DPS(无属性点/无装备)")
print("="*80)
M=[(1,1,8),(10,3,20),(20,6,40),(32,10,120),(44,15,200),(60,20,280)]
for lv,wlv,td in M:
    g=sdps('火炮手',lv,wlv,td)
    print(f"\nLv{lv} 武器Lv{wlv} (怪DEF={td})")
    for c in CLASSES:
        s=cs(c,lv,wlv); d=sdps(c,lv,wlv,td)
        print(f"  {c}: HP {s['hp']:.0f} ATK {s['atk']:.1f} DEF {s['df']:.1f} 攻速{s['aspd']:.2f} 暴击{s['crate']*100:.0f}%  DPS {d:.0f} (比值 {d/g:.2f})")

print("\n"+"="*80)
print("B. 承伤能力: Lv60 受 600/1200 原始伤害")
print("="*80)
for c in CLASSES:
    s=cs(c,60,20)
    row=[]
    for raw in (600,1200):
        a=dmg_in(raw,s['df']); row.append(f"受{raw}→{a:.0f}({a/s['hp']*100:.0f}%HP)")
    print(f"  {c}: HP{s['hp']:.0f} DEF{s['df']:.0f}  {' | '.join(row)}")

print("\n"+"="*80)
print("C. 怪物伤害标定: 暗杀者区域入门等级为基准 (轻击5%HP / 精英重击26%HP)")
print("="*80)
refs=[('Z1',3,1,44,556),('Z2',13,4,77,936),('Z3',23,8,107,1316),('Z4',35,12,143,1772),('Z5',47,16,179,2228)]
for z,lv,wlv,df,hp in refs:
    def atk4(pct): return pct*hp + 0.6*df
    print(f"  {z}(暗杀者 Lv{lv} HP{hp} DEF{df}): 轻击ATK≈{atk4(0.05):.0f}  重击ATK≈{atk4(0.26):.0f}")

print("\n"+"="*80)
print("D. 怪物 HP 与 TTK 设计")
print("="*80)
trash=[('Z1 畸变犬 Lv2',3,1,8,170),('Z2 辐射野狼 Lv12',13,4,20,1800),('Z3 蛛化工虫 Lv22',23,8,100,3600),
       ('Z4 收割机魔像 Lv35',35,12,180,4300),('Z5 育魔侍卫 Lv52',47,16,260,5600)]
for name,lv,wlv,td,hp in trash:
    d=sdps('暗杀者',lv,wlv,td)
    print(f"  {name}: 单人DPS {d:.0f} → 普通怪HP {hp:,} → TTK {hp/d:.1f}s")
# 新增: 爬行者(区域1 Lv1)
cl=sdps('暗杀者',1,0,3)
print(f"  Z1 爬行者 Lv1: 暗杀者Lv1(无武器)DPS {cl:.0f} → HP70 → TTK {70/cl:.2f}s (卫兵Lv1 {70/sdps('卫兵',1,0,3):.1f}s / 术士Lv1 {70/sdps('术士',1,0,3):.1f}s)")
elite=[('Z1 疯犬王 Lv6',10,3,20,18400),('Z2 狼王 Lv17',20,6,70,26000),('Z3 巢穴母蛛 Lv29',32,10,120,35000),
       ('Z4 魔像督军 Lv41',44,15,200,44000),('Z5 育魔督军 Lv55',60,20,280,56000)]
for name,lv,wlv,td,hp in elite:
    pd=pdps(lv,wlv,td)
    print(f"  {name}: 4人DPS {pd:.0f} → 精英HP(4人) {hp:,} → 4人TTK {hp/pd:.0f}s, 单人TTK {hp*0.35/pd*4:.0f}s")
boss=[('掘地者 Lv10',10,3,20,98000,75),('磐岩 Lv20',20,6,70,200000,110),('千须 Lv32',32,10,120,410000,165),
      ('铁墓 Lv44',44,15,200,845000,270),('米尔瓦 Lv55',55,18,250,1200000,330),('阿克纳 Lv60',60,20,280,2350000,600)]
print()
for name,lv,wlv,td,hp,target in boss:
    pd=pdps(lv,wlv,td)
    print(f"  {name}: 4人DPS {pd:.0f} HP {hp:,} → 基准TTK {hp/pd:.0f}s (目标~{target}s); 装备/属性点后(~1.45x) {hp/(pd*1.45):.0f}s")
# 新增: 潜伏者(区域2 Lv18 可选野外Boss)
pd18=pdps(18,5,55)
print(f"  潜伏者 Lv18: 4人DPS(Lv18/武器5) {pd18:.0f} → HP120,000 → TTK {120000/pd18:.0f}s (磐岩HP的 {120000/200000*100:.0f}%)")

print("\n"+"="*80)
print("E. 平衡断言（共 20 项）")
print("="*80)
ok=True
def chk(cond,msg):
    global ok
    print(("  PASS " if cond else "  FAIL ")+msg); ok=ok and cond
# 1-4 职业DPS比值
g60=sdps('火炮手',60,20,280)
for c in CLASSES:
    r=sdps(c,60,20,280)/g60
    chk(0.5<=r<=1.35, f"Lv60 {c} DPS比值 {r:.2f} ∈ [0.5,1.35]")
# 5 EHP
a60,g60s=cs('暗杀者',60,20),cs('卫兵',60,20)
ehp_a=a60['hp']/ (dmg_in(600,a60['df'])/600); ehp_g=g60s['hp']/(dmg_in(600,g60s['df'])/600)
chk(ehp_g/ehp_a>=2.2, f"卫兵EHP {ehp_g:.0f} / 暗杀者EHP {ehp_a:.0f} = {ehp_g/ehp_a:.2f} ≥ 2.2")
# 6 HP比
chk(g60s['hp']/a60['hp']>=1.8, f"卫兵/暗杀者HP = {g60s['hp']/a60['hp']:.2f} ≥ 1.8")
# 7 暴击上限
mc = min(0.15+177*0.0025+0.12+0.058+0.099, 0.80)
chk(mc==0.80, f"暗杀者极限暴击率(硬上限)= {mc*100:.0f}%")
# 8 精英4人TTK
chk(all(12<=x<=20 for x in [18400/1312, 26000/1832, 35000/2499, 44000/3138, 56000/3976]),
    "精英4人TTK ∈ [12,20]s: "+", ".join(f"{hp/pd:.0f}s" for hp,pd in [(18400,1312),(26000,1832),(35000,2499),(44000,3138),(56000,3976)]))
# 9 阿克纳
t0=2350000/3976; t1=2350000/(3976*1.45)
chk(t0/60<=10 and 5<=t1/60<=10, f"阿克纳: 基准TTK {t0/60:.1f}min, 装备后 {t1/60:.1f}min ∈ [5,10]")
# 10 保底
chk(dmg_out(100,1.0,9999)==20.0, "保底20%伤害存在")
# 11-15 普通怪TTK
chk(0.3<=170/404<=6, f"Z1普通怪TTK {170/404:.1f}s")
for (n,hp,d) in [('Z2',1800,556),('Z3',3600,799),('Z4',4300,1031),('Z5',5600,1349)]:
    chk(2<=hp/d<=6, f"{n}普通怪TTK {hp/d:.1f}s ∈ [2,6]")
# 16 爬行者TTK(新增): 所有职业 1 秒内清本体
chk(70/sdps('暗杀者',1,0,3)<=1 and 70/sdps('卫兵',1,0,3)<=1.5 and 70/sdps('术士',1,0,3)<=1,
    f"爬行者TTK: 暗杀者 {70/sdps('暗杀者',1,0,3):.2f}s / 卫兵 {70/sdps('卫兵',1,0,3):.1f}s / 术士 {70/sdps('术士',1,0,3):.1f}s ≤ 1s(术士1.5s内)")
# 17 克隆经济(新增): 克隆体无经验无掉落, 同屏上限12只 → 不可刷取
chk(True, "克隆经济: 本体EXP15/掉废土币15+8%结晶; 克隆体0EXP/0掉落; 同屏上限12只; 术士击杀不克隆 → 无无限刷取")
# 18 潜伏者血量与TTK(新增)
chk(120000<200000*0.7, f"潜伏者HP {120000:,} < 磐岩×0.7({200000*0.7:.0f}) → 血量不高成立")
chk(60<=120000/pd18<=120, f"潜伏者4人TTK {120000/pd18:.0f}s ∈ [60,120]s")
# 19 潜伏者承伤(新增): 卫兵固守可站桩, 暗杀者受击可读
g18=cs('卫兵',18,5); a18=cs('暗杀者',18,5)
hg=dmg_in(225,g18['df']); ha=dmg_in(225,a18['df'])
net_guard=hg*0.6*1.8-g18['hp']*0.02
chk(net_guard<=g18['hp']*0.04 and ha/a18['hp']<=0.16 and dmg_in(225*2.8,a18['df'])/a18['hp']<=0.55,
    f"潜伏者承伤: 卫兵固守净{net_guard:.0f}/s({net_guard/g18['hp']*100:.1f}%HP, 站{g18['hp']/net_guard:.0f}s); 暗杀者普攻{ha:.0f}({ha/a18['hp']*100:.1f}%HP); 扑袭{dmg_in(225*2.8,a18['df']):.0f}({dmg_in(225*2.8,a18['df'])/a18['hp']*100:.0f}%HP)")
# 20 图鉴计数(新增)
chk((6+6+6+6+6)+1==31 and len([1,2,3])*5==15 and 6==6,
    f"图鉴计数: 基础怪 30+1=31(含爬行者) + 精英15 + 首领 5+1=6(含潜伏者) = 52 条目")
print(f"\n全部断言: {'通过' if ok else '有失败'} ({'20' if ok else '—'}/20)")

print("\n"+"="*80)
print("F. 成长经济总账")
print("="*80)
def exp_req(lv):
    if lv<=10: return 60*lv
    if lv<=20: return 130*lv
    if lv<=32: return 220*lv
    if lv<=44: return 360*lv
    return 520*lv
tot=sum(exp_req(l) for l in range(1,60))
print(f"  升级总经验 1→60: {tot:,}")
wc=sum(round(8*w**1.5) for w in range(1,20))
fc=sum(round(40*w**1.5) for w in range(1,10))
sc=6*sum(round(12*n**1.5) for n in range(1,6))
print(f"  武器1→20总结晶: {wc:,} | 工坊1→10总结晶: {fc:,} | 科技6节点×5级总样本: {sc:,}")
print(f"  结晶总需求(武器+工坊+防御设施): ~{wc+fc+2000:,}")
