// ══════════════════════════════════════════
// 道劫：万法失控 — 配置文件
// 修改名称/数值/平衡性只需改此文件
// ══════════════════════════════════════════

// ── 怒火境界系统配置 ──
const RAGE_TIERS = [
  { tier:0, name:'愤怒', threshold:0,   multiplier:1.0,  color:'#cccccc', glowColor:'rgba(200,200,200,0.15)', particleColor:'#cccccc' },
  { tier:1, name:'怒火愤怒', threshold:10,  multiplier:1.25, color:'#ffcc00', glowColor:'rgba(255,200,0,0.20)',   particleColor:'#ffdd44' },
  { tier:2, name:'失控愤怒', threshold:25,  multiplier:1.55, color:'#ff8800', glowColor:'rgba(255,136,0,0.25)',   particleColor:'#ff9922' },
  { tier:3, name:'暴怒', threshold:50,  multiplier:1.90, color:'#ff4400', glowColor:'rgba(255,68,0,0.30)',    particleColor:'#ff5500' },
  { tier:4, name:'炽怒', threshold:80,  multiplier:2.30, color:'#ff2200', glowColor:'rgba(255,34,0,0.35)',    particleColor:'#ff3300' },
  { tier:5, name:'狂怒', threshold:120, multiplier:2.80, color:'#cc0000', glowColor:'rgba(180,0,0,0.40)',     particleColor:'#ff0000' },
  { tier:6, name:'杀怒', threshold:200, multiplier:3.50, color:'#880000', glowColor:'rgba(140,0,0,0.50)',     particleColor:'#cc0000' },
  { tier:7, name:'绝怒', threshold:350, multiplier:4.20, color:'#440022', glowColor:'rgba(80,0,30,0.55)',     particleColor:'#880033' },
  { tier:8, name:'极怒', threshold:500, multiplier:5.00, color:'#220011', glowColor:'rgba(50,0,20,0.65)',     particleColor:'#660022' },
];

// 余怒窗口（帧数）
const RAGE_WINDOW_NORMAL = 120;  // 2秒
const RAGE_WINDOW_HIT    = 200;  // 受伤延长到3.3秒
const RAGE_DROP_IMMUNITY = 120;  // 掉级保护帧数

// ── 游戏常量 ──
const FPS=60,TOTAL=360; // 1-9关6分钟，第10关9分钟(由G.totalTime覆写)
const BOSS_AT=[180,330];
const STAGE_10_BOSS_AT=[180,360,540];
const SPEEDS=[1,1.5,2,3];

// ── THEME色板 ──
const THEME={
  primary:    '#6a8caf',
  accent:     '#b7d7f2',
  rage:       '#ff0000',
  rageMax:    '#ff2200',
  rageGod:    '#ffd700',
  text:       '#203040',
  textLight:  '#eef7ff',
  background: '#eef7ff',
  panel:      '#dce8f2',
  enemy:      '#6b7280',
  elite:      '#7c3aed',
  bossAlert:  '#ff8800',
  boss:       '#ff6600',
};

// ── 时间提示 ──
const TIME_ALERTS=[
  {at:60, text:'灵气初涌',       color:'#6a8caf'},
  {at:120,text:'风起云涌',       color:'#5a9fc0'},
  {at:180,text:'煞气冲天！',     color:'#ff8800'},
  {at:300,text:'天劫降临！！',   color:'#E24B4A'},
  {at:420,text:'万道崩毁！！！', color:'#ff2200'},
];
const WEAPONS={
  spore_cannon:{
    name:'蚀灵符',type:'attack',maxLv:3,
    desc:['追踪蚀灵符感染','三连射穿透','满阶可突破→'],
    evolve:'spore_storm',
    onFire(G,lv,stars){
      const t=nearestEnemy(G);if(!t)return;
      playSound('shoot');
      const atkMult=G.buffs.atk;
      const baseDmg=(2.4+lv)*atkMult;
      // v17 孢子流：sporeAtkMult倍伤害，感染范围扩大
      const sporeBonus=G.activeBuild==='spore'?(G.sporeAtkMult||1.5):1;
      const infRange=G.activeBuild==='spore'?(45*(G.infectionSpread||1.5)):45;
      const n=lv>=2?3:1;
      for(let i=0;i<n;i++){
        const ang=Math.atan2(t.y-G.my,t.x-G.mx)+(i-Math.floor(n/2))*0.2;
        addProj(G,G.mx,G.my,Math.cos(ang)*5.5,Math.sin(ang)*5.5,{dmg:baseDmg*sporeBonus,r:4,color:'#9FE1CB',life:70,homing:t,pierce:lv>=3,sporeInfect:G.activeBuild==='spore',sporeRange:infRange});
      }
    },
    cd:[72,58,44],
  },
  poison_spit:{
    name:'魔气吐息',type:'attack',maxLv:3,
    desc:['魔气侵蚀持续DOT','范围扩散','满阶可突破→'],
    evolve:'poison_cloud',
    onFire(G,lv,stars){
      const t=nearestEnemy(G);if(!t)return;
      playSound('poison');const atkMult=G.buffs.atk;
      const n=lv>=2?3:2;
      // v17 孢子流：毒液持续时间×poisonMult，伤害+sporeAtkMult
      const poisonDur=G.activeBuild==='spore'?Math.round(280*(G.poisonMult||2.0)):240;
      const poisonDmg=G.activeBuild==='spore'?(1.2*(G.sporeAtkMult||1.5)):1.2;
      for(let i=0;i<n;i++){
        const ang=Math.atan2(t.y-G.my,t.x-G.mx)+(i-Math.floor(n/2))*0.3;
        addProj(G,G.mx,G.my,Math.cos(ang)*4.5,Math.sin(ang)*4.5,{dmg:poisonDmg*atkMult,r:5,color:'#639922',life:65,poison:poisonDur,splash:lv>=2?25:0});
      }
    },
    cd:[75,58,42],
  },
  lightning_bug:{
    name:'九霄雷符',type:'attack',maxLv:3,
    desc:['九霄天雷跳链','雷链+1','满阶可突破→'],
    evolve:'thunder_swarm',
    onFire(G,lv,stars){
      const t=nearestEnemy(G);if(!t)return;
      playSound('thunder');const atkMult=G.buffs.atk;
      // v17 电浆流：plasmaAtkMult倍伤害，chainBonus额外连锁，plasmaSpeedMult攻速
      const dmg=(6+lv*3)*atkMult*(G.activeBuild==='plasma'?(G.plasmaAtkMult||1.8):1);
      const chainR=G.activeBuild==='plasma'?110:75;
      const chainN=G.activeBuild==='plasma'?(lv+(G.chainBonus||4)):(lv+2);
      const ang=Math.atan2(t.y-G.my,t.x-G.mx);
      addProj(G,G.mx,G.my,Math.cos(ang)*7,Math.sin(ang)*7,{dmg,r:3,color:'#C9E054',life:55,chain:chainN,chainR,isLightning:true,homing:t,overload:G.activeBuild==='plasma'});
    },
    cd:[70,55,40],
    cdMult(G){return G.activeBuild==='plasma'?1/(G.plasmaSpeedMult||1.4):1;},
  },
  orbit_bugs:{
    name:'御灵环',type:'orbit',maxLv:3,
    desc:['御灵护体旋转','灵数+2','满阶可突破→'],
    evolve:'orbit_storm',
    update(G,lv,ws,stars){
      const count=3+lv*2,speed=0.055+lv*0.01;
      ws.orbitAngle=(ws.orbitAngle||0)+speed;
      ws.orbs=ws.orbs||[];
      while(ws.orbs.length<count)ws.orbs.push({a:Math.random()*Math.PI*2});
      ws.orbs.length=count;
      const atkMult=G.buffs.atk;
      ws.orbs.forEach((o,i)=>{
        o.a=ws.orbitAngle+i/count*Math.PI*2;
        const r=35+lv*8;o.x=G.mx+Math.cos(o.a)*r;o.y=G.my+Math.sin(o.a)*r;
        G.enemies.forEach(e=>{if(Math.hypot(e.x-o.x,e.y-o.y)<e.sz/2+6){e.hp-=(0.5+lv*0.2)*atkMult+(G.buffs.dmgFlat||0);knockback(e,o.x,o.y,3);addPt(G,o.x,o.y,'#5DCAA5',2,1.5);}});
        if(G.boss&&Math.hypot(G.boss.x-o.x,G.boss.y-o.y)<G.boss.sz/2+6){G.boss.hp-=(0.35+lv*0.15)*atkMult+(G.buffs.dmgFlat||0);addPt(G,o.x,o.y,'#5DCAA5',2,1.5);}
      });
    },
  },
  flame_tower:{
    name:'丹火剑阵',type:'orbit',maxLv:3,
    desc:['旋转丹火剑阵·等距均匀分布','塔数+1（共3塔）','塔数+1（共4塔）可进化→'],
    evolve:'inferno_ring',
    update(G,lv,ws,stars){
      const count=1+lv; // lv1=2塔, lv2=3塔, lv3=4塔
      const orbitR=60+lv*8;
      // 全局共享旋转角，确保所有塔始终等距
      ws.baseAngle=(ws.baseAngle||0)+0.018;
      // 重建塔数组保持count一致
      if(!ws.towers||ws.towers.length!==count){
        ws.towers=Array.from({length:count},(_,i)=>({fireTimer:Math.floor(i/count*38),x:0,y:0}));
      }
      const atkMult=G.buffs.atk;
      ws.towers.forEach((t,i)=>{
        // 均匀分布：每个塔偏移 2π/count * i
        const a=ws.baseAngle+i/count*Math.PI*2;
        t.x=G.mx+Math.cos(a)*orbitR;
        t.y=G.my+Math.sin(a)*orbitR;
        t.fireTimer++;
        if(t.fireTimer>=38){
          t.fireTimer=0;
          const en=nearestEnemyTo(G,t.x,t.y);
          if(en&&Math.hypot(en.x-t.x,en.y-t.y)<130){
            const ang=Math.atan2(en.y-t.y,en.x-t.x);
            addProj(G,t.x,t.y,Math.cos(ang)*5.5,Math.sin(ang)*5.5,
              {dmg:(2.5+lv*0.8)*atkMult,r:4,color:'#E85D24',life:42,isFlameBolt:true});
          }
        }
      });
    },
  },
  hive_expand:{name:'洞府扩建',type:'passive',maxLv:3,desc:['魔军上限+8','再+8','精英魔率+30%'],evolve:'hive_fortress',
    onEquip(G,lv){if(!G._hiveBase){G._hiveBase=G.swarmBonus||0;}G.swarmBonus=G._hiveBase+8*Math.min(lv,2);}},
  shell_armor:{name:'金刚护体',type:'passive',maxLv:3,desc:['灵虫血量+80%','再+80%','减伤20%'],evolve:'iron_carapace',
    onEquip(G,lv){if(!G._shellBugBase){G._shellBugBase=G.bugHpMult||1;}G.bugHpMult=G._shellBugBase*Math.pow(1.8,Math.min(lv,2));G.dmgReduce=(G.dmgReduce||0);if(lv>=3&&!G._shellDmgDone){G.dmgReduce=Math.min(0.6,G.dmgReduce+0.2);G._shellDmgDone=true;}}},
  rapid_spawn:{name:'灵虫孵化',type:'passive',maxLv:3,desc:['孵化间隔-30%','再-25%','斩杀孵化+40%'],evolve:'swarm_surge',
    onEquip(G,lv){if(!G._spawnSpawnBase){G._spawnSpawnBase=G.spawnMult||1;}G.spawnMult=G._spawnSpawnBase*(lv===1?0.7:lv>=2?0.525:1);if(lv>=3&&!G._spawnKillDone){G.killSpawn=(G.killSpawn||0)+0.4;G._spawnKillDone=true;}}},
  bio_leech:{name:'汲灵诀',type:'passive',maxLv:3,desc:['斩敌汲灵回血','汲灵翻倍','攻伐汲灵'],evolve:'life_drain',
    onEquip(G,lv){G.leechLv=(G.leechLv||0)+1;}},
  // V13: 狂暴流专属被动
  berserker_soul:{name:'狂道之魂',type:'passive',maxLv:3,desc:['无伤时道力+10%','再+10%','受伤暴怒'],evolve:'death_sync',
    onEquip(G,lv){G.berserkerLv=(G.berserkerLv||0)+1;}},
  // 超武
  spore_storm:{name:'灵气风暴',type:'evolve',maxLv:3,sourceWeapon:'spore_cannon',
    desc:['全向爆射蚀灵符穿透'],
    onFire(G,lv,stars){screenShake(8);playSound('ultra');
      const n=8+(stars*6),dmg=5*(stars+1);
      for(let i=0;i<n;i++){const a=i/n*Math.PI*2;const col=stars>=2?'#FF00FF':stars>=1?'#00FF88':'#00FFB3';
        addProj(G,G.mx,G.my,Math.cos(a)*6,Math.sin(a)*6,{dmg,r:stars>=2?9:7,color:col,life:Math.floor(65*(G.evolveRangeBonus||1)),splash:stars>=2?70:50,sporeInfect:true});}
      // 孢子流：顺带扩张领域
      if(G.activeBuild==='spore'){G.infectionMap.push({x:G.mx,y:G.my,r:80+stars*20,life:600,pulse:0,hostile:false,fastGrow:true});}},
    cd:[42,34,26],},
  poison_cloud:{name:'魔气领域',type:'evolve',maxLv:3,sourceWeapon:'poison_spit',
    desc:['魔气笼罩全场侵染众生'],
    onFire(G,lv,stars){screenShake(8);playSound('poison');const dur=Math.floor(300*(stars+1)*(G.evolveRangeBonus||1));
      G.enemies.forEach(e=>{e.poison=Math.max(e.poison||0,dur);addPt(G,e.x,e.y,'#639922',2,0.8);});
      if(G.boss)G.boss.poison=Math.max(G.boss.poison||0,dur);
      addPt(G,G.mx,G.my,'#639922',stars>=1?35:20,3);},
    cd:[160,120,90],},
  thunder_swarm:{name:'九霄天雷',type:'evolve',maxLv:3,sourceWeapon:'lightning_bug',
    desc:['九道追踪天雷齐劈'],
    onFire(G,lv,stars){screenShake(8);playSound('thunder');
      const targets=[...G.enemies];if(G.boss)targets.push(G.boss);
      const bolts=8+stars*3,dmg=14+stars*5,chainCount=2+stars;
      targets.sort((a,b)=>Math.hypot(a.x-G.mx,a.y-G.my)-Math.hypot(b.x-G.mx,b.y-G.my));
      for(let i=0;i<bolts;i++){
        const t=targets[i%Math.max(1,targets.length)];if(!t)break;
        const ang=Math.atan2(t.y-G.my,t.x-G.mx)+(Math.random()-0.5)*0.3;
        addProj(G,G.mx,G.my,Math.cos(ang)*7,Math.sin(ang)*7,{dmg,r:3,color:'#C9E054',life:55,chain:chainCount,chainR:Math.floor((55+stars*20)*(G.evolveRangeBonus||1)),slowOnHit:true,isLightning:true,overload:G.activeBuild==='plasma'});
      }
      // 电浆流：额外EMP波
      if(G.activeBuild==='plasma'){
        G.enemies.forEach(e=>{if(Math.hypot(e.x-G.mx,e.y-G.my)<120){e.slowTimer=Math.max(e.slowTimer||0,240);addPt(G,e.x,e.y,'#7aadff',3,1);}});
      }
      const arcN=3+stars*2;for(let i=0;i<arcN;i++){const t=targets[i%Math.max(1,targets.length)];if(t)addArc(G,t.x,t.y,stars);}},
    cd:[90,70,55],},
  orbit_storm:{name:'御灵环风暴',type:'evolve',maxLv:3,sourceWeapon:'orbit_bugs',
    desc:['高速御灵旋转弹射'],
    update(G,lv,ws,stars){
      const speed=0.1+stars*0.05,count=8+stars*4,dmg=1.8*(stars+1),r=Math.floor((55+stars*15)*(G.evolveRangeBonus||1));
      ws.orbitAngle=(ws.orbitAngle||0)+speed;
      ws.orbs=ws.orbs||Array.from({length:count},(_,i)=>({a:i/count*Math.PI*2}));
      while(ws.orbs.length<count)ws.orbs.push({a:Math.random()*Math.PI*2});
      ws.orbs.length=count;const atkMult=G.buffs.atk;
      ws.orbs.forEach((o,i)=>{
        o.a=ws.orbitAngle+i/count*Math.PI*2;o.x=G.mx+Math.cos(o.a)*r;o.y=G.my+Math.sin(o.a)*r;
        G.enemies.forEach(e=>{if(Math.hypot(e.x-o.x,e.y-o.y)<e.sz/2+8){e.hp-=dmg*atkMult+(G.buffs.dmgFlat||0);knockback(e,o.x,o.y,5+stars*2);addPt(G,o.x,o.y,stars>=2?'#FF00FF':stars>=1?'#FF8800':'#00FFB3',3,2);}});
        if(G.boss&&Math.hypot(G.boss.x-o.x,G.boss.y-o.y)<G.boss.sz/2+8){G.boss.hp-=dmg*0.8*atkMult+(G.buffs.dmgFlat||0);addPt(G,o.x,o.y,'#00FFB3',2,2);}
      });},},
  inferno_ring:{name:'丹火剑环',type:'evolve',maxLv:3,sourceWeapon:'flame_tower',
    desc:['动态火焰光环灼烧·六塔环绕射击'],
    update(G,lv,ws,stars){
      ws.ringTimer=(ws.ringTimer||0)+1;
      ws.haloAngle=(ws.haloAngle||0)+0.028+stars*0.012;
      // 六个环绕丹火剑阵的位置
      const towerCount=6;
      const towerR=Math.floor((70+stars*20)*(G.evolveRangeBonus||1));
      if(!ws.infernoTowers){
        ws.infernoTowers=Array.from({length:towerCount},(_,i)=>({fireTimer:Math.floor(i/towerCount*28)}));
      }
      ws.infernoTowers.forEach((t,i)=>{
        const a=ws.haloAngle+i/towerCount*Math.PI*2;
        t.x=G.mx+Math.cos(a)*towerR;
        t.y=G.my+Math.sin(a)*towerR;
      });
      // 不规则火焰射击：从六个塔位随机发射
      ws.shootTimer=(ws.shootTimer||0)+1;
      const shootInterval=Math.max(10,28-stars*6-lv*2);
      if(ws.shootTimer>=shootInterval){
        ws.shootTimer=0+(Math.random()*6|0);
        const allT=[...G.enemies];if(G.boss)allT.push(G.boss);
        const near=allT.filter(e=>Math.hypot(e.x-G.mx,e.y-G.my)<150+stars*40);
        if(near.length>0){
          const fireN=1+(stars>0&&Math.random()<0.5?1:0)+(stars>=2&&Math.random()<0.4?1:0);
          for(let fi=0;fi<fireN;fi++){
            // 从随机塔位发射
            const srcTower=ws.infernoTowers[Math.floor(Math.random()*towerCount)];
            const tgt=near[Math.floor(Math.random()*near.length)];
            const baseAng=Math.atan2(tgt.y-srcTower.y,tgt.x-srcTower.x);
            const jitter=(Math.random()-0.5)*0.7;
            const spd=4.5+Math.random()*2.5;
            const dmgF=(2.5+stars*2.5)*(G.buffs.atk||1);
            addProj(G,srcTower.x,srcTower.y,Math.cos(baseAng+jitter)*spd,Math.sin(baseAng+jitter)*spd,
              {dmg:dmgF,r:5+stars*2,color:stars>=2?'#ff4400':stars>=1?'#ff7700':'#E85D24',
               life:38+stars*12,splash:18+stars*14,isFlameBolt:true});
          }
        }
      }
      // 持续范围灼烧
      const r=Math.floor((80+stars*40)*(G.evolveRangeBonus||1)),dmg=(1.4+stars*1.4),interval=Math.max(4,8-stars*2);
      if(ws.ringTimer%interval===0){const atkMult=G.buffs.atk;
        G.enemies.forEach(e=>{if(Math.hypot(e.x-G.mx,e.y-G.my)<r){e.hp-=dmg*atkMult+(G.buffs.dmgFlat||0);if(ws.ringTimer%12===0)addPt(G,e.x,e.y,'#E85D24',2,1.5);}});
        if(G.boss&&Math.hypot(G.boss.x-G.mx,G.boss.y-G.my)<r)G.boss.hp-=dmg*0.5+(G.buffs.dmgFlat||0);}
      ws.drawR=r;ws.stars=stars;},},
  hive_fortress:{name:'本命道宫',type:'evolvePassive',maxLv:3,sourceWeapon:'hive_expand',desc:['魔军上限大幅提升，精英灵虫比例+'],
    onEquip(G,lv,stars){G.swarmBonus=(G.swarmBonus||0)+16*(stars+1);G.eliteRate=(G.eliteRate||0.1)+0.1*(stars+1);}},
  iron_carapace:{name:'金刚真身',type:'evolvePassive',maxLv:3,sourceWeapon:'shell_armor',desc:['灵虫血量翻倍，减伤大幅提升'],
    onEquip(G,lv,stars){G.bugHpMult=(G.bugHpMult||1)*2*(stars+1);G.dmgReduce=Math.min(0.6,(G.dmgReduce||0)+0.15*(stars+1));}},
  swarm_surge:{name:'万魂幡',type:'evolvePassive',maxLv:3,sourceWeapon:'rapid_spawn',desc:['万魂幡旗展开，斩杀大量孵化'],
    onEquip(G,lv,stars){G.spawnMult=(G.spawnMult||1)*0.5;G.killSpawn=(G.killSpawn||0)+0.6*(stars+1);}},
  life_drain:{name:'吞灵噬魄',type:'evolvePassive',maxLv:3,sourceWeapon:'bio_leech',desc:['大幅增强汲灵，每秒自动回灵'],
    onEquip(G,lv,stars){G.leechLv=(G.leechLv||0)+3*(stars+1);G.regenRate=(G.regenRate||0)+0.05*(stars+1);}},
  // ══════ 新武器 (v7.1) ══════
  // —— 攻击·灵刃乱舞 ——
  blade_storm:{name:'灵刃乱舞',type:'attack',maxLv:3,
    desc:['每秒12道灵刃·高频切割'],
    evolve:'blade_vortex',
    onFire(G,lv,stars){playSound('hit');
      const n=12,dmg=(0.9+lv*0.4)*(G.buffs.atk||1);
      for(let i=0;i<n;i++){
        const a=Math.random()*Math.PI*2;
        addProj(G,G.mx,G.my,Math.cos(a)*4.5,Math.sin(a)*4.5,{dmg,r:2,color:'#cc88ff',life:25,pierce:false,isBlade:true});
      }
    },cd:[28,22,18],},
  blade_vortex:{name:'旋涡灵刃',type:'evolve',maxLv:3,sourceWeapon:'blade_storm',
    desc:['旋转刃环持续切割'],
    update(G,lv,ws,stars){
      const count=10+stars*5,dmg=(2.0+stars*1.5)*(G.buffs.atk||1),r=50+stars*20;
      ws.vortexAng=(ws.vortexAng||0)+0.04+stars*0.02;
      ws.blades=ws.blades||Array.from({length:count},(_,i)=>({a:i/count*Math.PI*2}));
      ws.blades.length=count;
      ws.blades.forEach((b,i)=>{
        b.a=ws.vortexAng+i/count*Math.PI*2;
        b.x=G.mx+Math.cos(b.a)*r;b.y=G.my+Math.sin(b.a)*r;
        G.enemies.forEach(e=>{if(Math.hypot(e.x-b.x,e.y-b.y)<e.sz/2+6){e.hp-=dmg/(e.defMult||1);addPt(G,b.x,b.y,'#cc88ff',1,1);}});
        if(G.boss&&Math.hypot(G.boss.x-b.x,G.boss.y-b.y)<G.boss.sz/2+6)G.boss.hp-=dmg*0.7;
      });
      ws.bladeR=r;ws.bladeCount=count;},},
  // —— 攻击·魂弹术 ——
  soul_bullet:{name:'魂弹术',type:'attack',maxLv:3,
    desc:['慢速大魂弹·命中爆裂'],
    evolve:'soul_burst',
    onFire(G,lv,stars){playSound('sync');
      const tgt=nearestEnemy(G);if(!tgt)return;
      const ang=Math.atan2(tgt.y-G.my,tgt.x-G.mx)+(Math.random()-0.5)*0.4;
      const dmg=(4+lv*2)*(G.buffs.atk||1);
      addProj(G,G.mx,G.my,Math.cos(ang)*3.5,Math.sin(ang)*3.5,{dmg,r:8,color:'#ffdd88',life:80,isSoulBullet:true,soulBurstDmg:dmg*0.4});
    },cd:[65,52,40],},
  soul_burst:{name:'魂爆',type:'evolve',maxLv:3,sourceWeapon:'soul_bullet',
    desc:['全场随机落雷魂爆'],
    onFire(G,lv,stars){screenShake(10);playSound('thunder');
      const bolts=16,dmg=(8+stars*4)*(G.buffs.atk||1),chainN=1+stars;
      for(let i=0;i<bolts;i++){
        const tx=Math.random()*W,ty=Math.random()*H;
        addExplosionWave(G,tx,ty,25,'#ffdd44');
        addPt(G,tx,ty,'#ffcc00',8,2);
        G.enemies.forEach(e=>{if(Math.hypot(e.x-tx,e.y-ty)<40){e.hp-=dmg/(e.defMult||1);e.slowTimer=Math.max(e.slowTimer||0,60);}});
        if(G.boss&&Math.hypot(G.boss.x-tx,G.boss.y-ty)<50)G.boss.hp-=dmg*0.8;
      }
      // Chain lightning between random pairs
      if(G.enemies.length>=2){
        for(let j=0;j<chainN*4;j++){
          const e1=G.enemies[Math.floor(Math.random()*G.enemies.length)];
          const e2=G.enemies[Math.floor(Math.random()*G.enemies.length)];
          if(e1&&e2&&e1!==e2){addArc(G,e2.x,e2.y,stars);e2.hp-=dmg*0.3/(e2.defMult||1);}
        }
      }
    },cd:[120,100,80],},
  // —— 攻击·虚空枪刺 ——
  void_lance:{name:'虚空枪刺',type:'attack',maxLv:3,
    desc:['超长穿透·Boss专克'],
    evolve:'void_ray',
    onFire(G,lv,stars){playSound('boss');screenShake(3);
      const ang=(nearestEnemy(G)?Math.atan2(nearestEnemy(G).y-G.my,nearestEnemy(G).x-G.mx):0);
      const dmg=(5+lv*3)*(G.buffs.atk||1);
      addProj(G,G.mx,G.my,Math.cos(ang)*12,Math.sin(ang)*12,{dmg,r:2,color:'#8844cc',life:100,pierce:true,isVoidLance:true});
    },cd:[180,150,120],},
  void_ray:{name:'虚空裂缝',type:'evolve',maxLv:3,sourceWeapon:'void_lance',
    desc:['持续横扫光束'],
    update(G,lv,ws,stars){
      ws.rayTimer=(ws.rayTimer||0)+1;
      if(ws.rayTimer%120===0||ws.rayAng==null){
        const tgt=nearestEnemy(G);
        ws.rayAng=tgt?Math.atan2(tgt.y-G.my,tgt.x-G.mx):(ws.rayAng!=null?ws.rayAng:0);
      }
      if(ws.rayAng==null)ws.rayAng=0;
      const ang=ws.rayAng;const len=300,width=12+stars*4;
      const dmgPerFrame=(0.4+stars*0.2)*(G.buffs.atk||1);
      G.enemies.forEach(e=>{
        const dx=e.x-G.mx,dy=e.y-G.my;
        const projDist=dx*Math.cos(ang)+dy*Math.sin(ang);
        const perpDist=Math.abs(-dx*Math.sin(ang)+dy*Math.cos(ang));
        if(projDist>0&&projDist<len&&perpDist<width+e.sz/2){
          e.hp-=dmgPerFrame/(e.defMult||1);
          if(G.elapsed%6===0)addPt(G,e.x,e.y,'#8844cc',2,1);
        }
      });
      if(G.boss){
        const b=G.boss;const dx=b.x-G.mx,dy=b.y-G.my;
        const projDist=dx*Math.cos(ang)+dy*Math.sin(ang);
        const perpDist=Math.abs(-dx*Math.sin(ang)+dy*Math.cos(ang));
        if(projDist>0&&projDist<len&&perpDist<width+b.sz/2)b.hp-=dmgPerFrame*0.6;
      }
      ws.rayLen=len;ws.rayW=width;},},
  // —— 攻击·寒冰封印 ——
  frost_seal:{name:'寒冰封印',type:'attack',maxLv:3,
    desc:['冻结控制·2秒冰封'],
    evolve:'blizzard_field',
    onFire(G,lv,stars){playSound('sync');
      const tgt=nearestEnemy(G);if(!tgt)return;
      const ang=Math.atan2(tgt.y-G.my,tgt.x-G.mx)+(Math.random()-0.5)*0.3;
      const dmg=(1.5+lv*0.6)*(G.buffs.atk||1);
      addProj(G,G.mx,G.my,Math.cos(ang)*3,Math.sin(ang)*3,{dmg,r:5,color:'#88CCFF',life:70,isFrost:true,freeze:120});
    },cd:[80,65,50],},
  blizzard_field:{name:'冰域领域',type:'evolve',maxLv:3,sourceWeapon:'frost_seal',
    desc:['旋转冰刃+全场减速'],
    update(G,lv,ws,stars){
      const count=6+stars*3,dmg=(1.5+stars*0.8)*(G.buffs.atk||1),r=60+stars*20;
      ws.orbitAngle=(ws.orbitAngle||0)+0.035+stars*0.015;
      ws.orbs=ws.orbs||Array.from({length:count},(_,i)=>({a:i/count*Math.PI*2}));
      ws.orbs.length=count;
      ws.orbs.forEach((o,i)=>{
        o.a=ws.orbitAngle+i/count*Math.PI*2;
        o.x=G.mx+Math.cos(o.a)*r;o.y=G.my+Math.sin(o.a)*r;
        G.enemies.forEach(e=>{if(Math.hypot(e.x-o.x,e.y-o.y)<e.sz/2+8){e.hp-=dmg/(e.defMult||1);e.slowTimer=Math.max(e.slowTimer||0,90);addPt(G,o.x,o.y,'#88CCFF',1,0.8);}});
        if(G.boss&&Math.hypot(G.boss.x-o.x,G.boss.y-o.y)<G.boss.sz/2+8){G.boss.hp-=dmg*0.6;G.boss.slowTimer=Math.max(G.boss.slowTimer||0,60);}
      });
    },},
  // —— 环绕·雷罡护体 ——
  thunder_ring:{name:'雷罡护体',type:'orbit',maxLv:3,
    desc:['闪电护体环·触链连诛'],
    evolve:'storm_cage',
    update(G,lv,ws,stars){
      const count=4+lv*2,dmg=(1.0+lv*0.5)*(G.buffs.atk||1),r=35+lv*5;
      ws.orbitAngle=(ws.orbitAngle||0)+0.06+lv*0.01;
      ws.orbs=ws.orbs||Array.from({length:count},(_,i)=>({a:i/count*Math.PI*2}));
      ws.orbs.length=count;
      ws.orbs.forEach((o,i)=>{
        o.a=ws.orbitAngle+i/count*Math.PI*2;
        o.x=G.mx+Math.cos(o.a)*r;o.y=G.my+Math.sin(o.a)*r;
        // 触碰跳链
        G.enemies.forEach(e=>{if(Math.hypot(e.x-o.x,e.y-o.y)<e.sz/2+8){
          e.hp-=dmg/(e.defMult||1);addPt(G,o.x,o.y,'#4488FF',3,2);
          // 跳链到附近敌人
          G.enemies.forEach(e2=>{if(e2!==e&&Math.hypot(e2.x-e.x,e2.y-e.y)<60){e2.hp-=dmg*0.6/(e2.defMult||1);addArc(G,e2.x,e2.y,0);}});
        }});
        if(G.boss&&Math.hypot(G.boss.x-o.x,G.boss.y-o.y)<G.boss.sz/2+8){G.boss.hp-=dmg*0.8;addPt(G,o.x,o.y,'#4488FF',3,2);}
      });
      ws.thunderOrbs=true;},},
  storm_cage:{name:'雷狱',type:'evolve',maxLv:3,sourceWeapon:'thunder_ring',
    desc:['呼吸式雷环·全场跳链'],
    update(G,lv,ws,stars){
      ws.cageTimer=(ws.cageTimer||0)+1;
      const period=120-stars*15;
      const phase=(ws.cageTimer%period)/period; // 0→1, 呼吸周期
      const minR=20,maxR=80+stars*30;
      const r=minR+(maxR-minR)*Math.sin(phase*Math.PI); // 正弦呼吸
      ws.cageRadius=r;
      // 每次呼吸完成（phase归零）触发全场跳链
      if(ws.cageTimer%period===0&&ws.cageTimer>0){
        playSound('thunder');screenShake(6);
        const chainDmg=(3+stars*2)*(G.buffs.atk||1);
        G.enemies.forEach(e=>{
          e.hp-=chainDmg/(e.defMult||1);e.slowTimer=Math.max(e.slowTimer||0,60);
          addPt(G,e.x,e.y,'#ffcc00',4,2);
          // 跳链到附近
          const near=G.enemies.filter(e2=>e2!==e&&Math.hypot(e2.x-e.x,e2.y-e.y)<80);
          near.slice(0,3+stars).forEach(e2=>{
            e2.hp-=chainDmg*0.5/(e2.defMult||1);addArc(G,e2.x,e2.y,stars);
          });
        });
        if(G.boss){G.boss.hp-=chainDmg*1.5;addPt(G,G.boss.x,G.boss.y,'#ffcc00',6,3);}
      }},},
  death_sync:{name:'道心归一',type:'evolvePassive',maxLv:3,sourceWeapon:'berserker_soul',desc:['道心不灭，低血量暴怒自愈'],
    onEquip(G,lv,stars){G.deathSync=true;G.berserkerLv=(G.berserkerLv||0)+2*(stars+1);}},
};

const ENEMY_TYPES=[
  // ── 普通14种 ──
  // 初期
  {key:'normal',    name:'逊der',    phase:[{hpScale:1.0,spdScale:1.0,behavior:'chase'},{hpScale:1.22,spdScale:1.08,behavior:'chase_group3'},{hpScale:1.55,spdScale:1.18,behavior:'chase_group3'}],col:'#B04040',sz:10,hpBase:2.5, spdBase:0.58,atk:0.38,hasKB:false,unlockSec:0,special:null,quotes:['练气期永不为奴！','今天也要努力修炼！','道友留步！']},
  {key:'lied',      name:'躺der',    phase:[{hpScale:1.0,spdScale:1.0,behavior:'chase'},{hpScale:1.22,spdScale:1.08,behavior:'chase_group3'},{hpScale:1.55,spdScale:1.18,behavior:'burst_contact'}],col:'#8B5030',sz:14,hpBase:12,  spdBase:0.25,atk:0.80,hasKB:true, unlockSec:0,special:'lied',quotes:['让我躺会儿……','呼……呼……','别踩我！']},
  {key:'cute',      name:'萌der',    phase:[{hpScale:1.0,spdScale:1.0,behavior:'chase'},{hpScale:1.22,spdScale:1.08,behavior:'chase_group3'},{hpScale:1.55,spdScale:1.18,behavior:'dash_spawn'}],col:'#E06080',sz:7, hpBase:1.5, spdBase:0.90,atk:0.20,hasKB:false,unlockSec:0,special:'swarm',quotes:['啾啾！','不要打我嘛~','我超可爱的！']},
  {key:'hard',      name:'硬der',    phase:[{hpScale:1.0,spdScale:1.0,behavior:'chase'},{hpScale:1.22,spdScale:1.08,behavior:'chase_group3'},{hpScale:1.55,spdScale:1.18,behavior:'charge_invincible'}],col:'#607090',sz:16,hpBase:10,  spdBase:0.34,atk:0.65,hasKB:true, unlockSec:0,special:'armored',defMult:2.5,quotes:['来撞我啊！','铁甲无敌！','你打不动我！']},
  // 中期
  {key:'hikikomori',name:'宅der',    phase:[{hpScale:1.0,spdScale:1.0,behavior:'chase'},{hpScale:1.22,spdScale:1.08,behavior:'chase_group3'},{hpScale:1.55,spdScale:1.18,behavior:'dash_spawn'}],col:'#405060',sz:12,hpBase:9,   spdBase:0.20,atk:1.20,hasKB:false,unlockSec:0,special:'burst',burstR:55,burstDmg:20},
  {key:'dainty_e',  name:'娇der',    phase:[{hpScale:1.0,spdScale:1.0,behavior:'chase'},{hpScale:1.22,spdScale:1.08,behavior:'chase_group3'},{hpScale:1.55,spdScale:1.18,behavior:'dash_spawn'}],col:'#D060A0',sz:9, hpBase:5,   spdBase:0.50,atk:0.48,hasKB:false,unlockSec:0,special:'aura'},
  {key:'swift',     name:'快der',    phase:[{hpScale:1.0,spdScale:1.0,behavior:'chase'},{hpScale:1.22,spdScale:1.08,behavior:'chase_group3'},{hpScale:1.55,spdScale:1.18,behavior:'dash_spawn'}],col:'#E06030',sz:8, hpBase:1.2, spdBase:1.05,atk:0.24,hasKB:false,unlockSec:0,special:'fast',quotes:['嗖——！','你追不上我！','太快了看不清！']},
  {key:'poor',      name:'穷der',    phase:[{hpScale:1.0,spdScale:1.0,behavior:'chase'},{hpScale:1.22,spdScale:1.08,behavior:'chase_group3'},{hpScale:1.55,spdScale:1.18,behavior:'dash_spawn'}],col:'#806050',sz:10,hpBase:3,   spdBase:0.45,atk:0.35,hasKB:false,unlockSec:0,special:'fragile',quotes:['有没有人施舍点灵石……','我连法宝都修不起……','穷得快散架了……']},
  {key:'dumb',      name:'傻der',    phase:[{hpScale:1.0,spdScale:1.0,behavior:'chase'},{hpScale:1.22,spdScale:1.08,behavior:'chase_group3'},{hpScale:1.55,spdScale:1.18,behavior:'dash_spawn'}],col:'#9090A0',sz:11,hpBase:4,   spdBase:0.40,atk:0.38,hasKB:false,unlockSec:0,special:'random',quotes:['诶？那边是北？','今天星期几来着……','我刚才要干嘛？']},
  {key:'sly',       name:'苟der',    phase:[{hpScale:1.0,spdScale:1.0,behavior:'chase'},{hpScale:1.22,spdScale:1.08,behavior:'arc_surround'},{hpScale:1.55,spdScale:1.18,behavior:'triple_shot'}],col:'#7060A0',sz:9, hpBase:4,   spdBase:0.48,atk:0.42,hasKB:false,unlockSec:0,special:'ranged',keepDist:130,quotes:['嘿嘿……先躲一躲……','等你没技能了再说！','保存实力懂不懂？']},
  // 后期
  {key:'slick',     name:'油der',    phase:[{hpScale:1.0,spdScale:1.0,behavior:'chase'},{hpScale:1.22,spdScale:1.08,behavior:'chase_group3'},{hpScale:1.55,spdScale:1.18,behavior:'dash_spawn'}],col:'#607050',sz:10,hpBase:6,   spdBase:1.20,atk:0.60,hasKB:false,unlockSec:0,special:'void'},
  {key:'poser',     name:'装der',    phase:[{hpScale:1.0,spdScale:1.0,behavior:'chase'},{hpScale:1.22,spdScale:1.08,behavior:'chase_group3'},{hpScale:1.55,spdScale:1.18,behavior:'dash_spawn'}],col:'#C08000',sz:11,hpBase:5,   spdBase:0.55,atk:0.45,hasKB:false,unlockSec:0,special:'fake'},
  {key:'runner',    name:'跑der',    phase:[{hpScale:1.0,spdScale:1.0,behavior:'chase'},{hpScale:1.22,spdScale:1.08,behavior:'chase_group3'},{hpScale:1.55,spdScale:1.18,behavior:'dash_spawn'}],col:'#AA6040',sz:9, hpBase:3,   spdBase:0.55,atk:0.35,hasKB:false,unlockSec:0,special:'flee'},
  {key:'greedy',    name:'贪der',    phase:[{hpScale:1.0,spdScale:1.0,behavior:'chase'},{hpScale:1.22,spdScale:1.08,behavior:'chase_group3'},{hpScale:1.55,spdScale:1.18,behavior:'dash_spawn'}],col:'#806020',sz:12,hpBase:8,   spdBase:0.35,atk:0.52,hasKB:false,unlockSec:0,special:'devourer'},
  // ── 精英5种 ──
  {key:'roller',    name:'卷der精英',phase:[{hpScale:1.0,spdScale:1.0,behavior:'chase'},{hpScale:1.22,spdScale:1.08,behavior:'chase_group3'},{hpScale:1.55,spdScale:1.18,behavior:'dash_spawn'}],col:'#FF4500',sz:18,hpBase:28,  spdBase:0.72,atk:0.75,hasKB:true, unlockSec:0,special:'elite'},
  {key:'berserker', name:'狂der精英',phase:[{hpScale:1.0,spdScale:1.0,behavior:'chase'},{hpScale:1.22,spdScale:1.08,behavior:'chase_group3'},{hpScale:1.55,spdScale:1.18,behavior:'dash_spawn'}],col:'#FF2020',sz:18,hpBase:35,  spdBase:0.70,atk:0.85,hasKB:true, unlockSec:0,special:'elite'},
  {key:'rich',      name:'壕der精英',phase:[{hpScale:1.0,spdScale:1.0,behavior:'chase'},{hpScale:1.22,spdScale:1.08,behavior:'chase_group3'},{hpScale:1.55,spdScale:1.18,behavior:'dash_spawn'}],col:'#FFB800',sz:17,hpBase:18,  spdBase:0.52,atk:0.46,hasKB:false,unlockSec:0,special:'shield',immuneDot:true},
  {key:'lazy',      name:'废der精英',phase:[{hpScale:1.0,spdScale:1.0,behavior:'chase'},{hpScale:1.22,spdScale:1.08,behavior:'chase_group3'},{hpScale:1.55,spdScale:1.18,behavior:'dash_spawn'}],col:'#CC2020',sz:19,hpBase:38,  spdBase:0.30,atk:0.90,hasKB:false,unlockSec:0,special:'elite'},
  {key:'brute',     name:'猛der精英',phase:[{hpScale:1.0,spdScale:1.0,behavior:'chase'},{hpScale:1.22,spdScale:1.08,behavior:'chase_group3'},{hpScale:1.55,spdScale:1.18,behavior:'dash_spawn'}],col:'#CC1010',sz:22,hpBase:55,  spdBase:0.45,atk:1.10,hasKB:true, unlockSec:0,special:'elite',defMult:1.5},
];

// ── 关卡小怪阶段规则 ──
const STAGE_ENEMY_RULES={
  s1:{pool:['normal','lied','cute','hard','swift','poor','dumb','sly'],phaseWeights:{early:0.85,mid:0.15,late:0},eliteKeys:[],eliteChance:0,hpMult:1.0,typeLimit:8},
  s2:{pool:['normal','lied','cute','hard','swift','poor','dumb','sly','hikikomori','dainty_e'],phaseWeights:{early:0.80,mid:0.20,late:0},eliteKeys:[],eliteChance:0,hpMult:1.12,typeLimit:10},
  s3:{pool:['normal','lied','cute','hard','swift','poor','dumb','sly','hikikomori','dainty_e','slick','poser'],phaseWeights:{early:0.70,mid:0.28,late:0.02},eliteKeys:['roller'],eliteChance:0.04,hpMult:1.12,typeLimit:12},
  s4:{pool:['normal','lied','cute','hard','swift','poor','dumb','sly','hikikomori','dainty_e','slick','poser','runner','greedy'],phaseWeights:{early:0.50,mid:0.50,late:0},eliteKeys:['roller','rich'],eliteChance:0.06,hpMult:1.20,typeLimit:14},
  s5:{pool:['normal','lied','cute','hard','swift','poor','dumb','sly','hikikomori','dainty_e','slick','poser','runner','greedy'],phaseWeights:{early:0.20,mid:0.80,late:0},eliteKeys:['roller','rich','berserker'],eliteChance:0.08,hpMult:1.25,typeLimit:16},
  s6:{pool:['normal','lied','cute','hard','swift','poor','dumb','sly','hikikomori','dainty_e','slick','poser','runner','greedy'],phaseWeights:{early:0.10,mid:0.90,late:0},eliteKeys:['roller','rich','berserker'],eliteChance:0.10,hpMult:1.30,typeLimit:18},
  s7:{pool:['normal','lied','cute','hard','swift','poor','dumb','sly','hikikomori','dainty_e','slick','poser','runner','greedy'],phaseWeights:{early:0.05,mid:0.85,late:0.10},eliteKeys:['roller','rich','berserker','lazy'],eliteChance:0.12,hpMult:1.38,typeLimit:18},
  s8:{pool:['normal','lied','cute','hard','swift','poor','dumb','sly','hikikomori','dainty_e','slick','poser','runner','greedy'],phaseWeights:{early:0,mid:0.50,late:0.50},eliteKeys:['roller','rich','berserker','lazy','brute'],eliteChance:0.15,hpMult:1.50,typeLimit:19},
  s9:{pool:['swift','poor','dumb','sly','hikikomori','dainty_e','slick','poser','runner','greedy'],phaseWeights:{early:0,mid:0.30,late:0.70},eliteKeys:['rich','berserker','lazy','brute'],eliteChance:0.18,hpMult:1.65,typeLimit:19},
  s10:{pool:['slick','poser','runner','greedy','hikikomori','dainty_e','swift','sly','dumb'],phaseWeights:{early:0,mid:0,late:1.0},eliteKeys:['berserker','lazy','brute','rich'],eliteChance:0.22,hpMult:1.80,typeLimit:19},
};

const BOSS_DEFS=[
  // ── Boss1：假筑基 ──
  {
    key:'fake_zhuji',name:'筑基失败的假筑基',hp:800,spd:0.55,sz:32,col:'#C97B3A',reward:4,
    _rageRequire:0,
    taunts:{spawn:['我是筑基了！你们练气期的根本打不过我！'],half:['哼，还没结束呢……'],fake_death:['……（装死）'],revive:['你别想杀我！'],death:['不公平！一定是灵根的问题！']},
    fakeDeathTriggered:false,fakeDeathTimer:0,
    update(G,boss){
      const pct=boss.hp/boss.maxhp;
      if(boss.hp<=0&&!boss.fakeDeathTriggered){boss.fakeDeathTriggered=true;boss.invincible=true;boss.hp=1;boss.fakeDeathTimer=180;boss._down=true;bossTaunt(boss,'fake_death',G);screenShake(8);showEcoAlert('⚠ 假筑基·假死！');}
      if(boss.fakeDeathTimer>0){boss.fakeDeathTimer--;boss.vx=0;boss.vy=0;if(boss.fakeDeathTimer===0){boss._down=false;boss.invincible=false;boss.hp=boss.maxhp*1.0;boss.spd*=1.5;bossTaunt(boss,'revive',G);screenShake(12);addExplosionWave(G,boss.x,boss.y,60,'#ff6600');showEcoAlert('💀 假筑基·复活！速度提升！');}return;}
      if(pct<0.5&&!boss._halfTaunt){boss._halfTaunt=true;bossTaunt(boss,'half',G);}
      boss._chargeT=(boss._chargeT||0)+1;
      if(boss._chargeT>=150&&!boss._charging){boss._chargeT=0;boss._charging=true;const dx=G.mx-boss.x,dy=G.my-boss.y,d=Math.hypot(dx,dy)||1;boss._chargeVx=dx/d*7;boss._chargeVy=dy/d*7;}
      if(boss._charging){boss.x+=boss._chargeVx;boss.y+=boss._chargeVy;boss._chargeVx*=0.88;boss._chargeVy*=0.88;if(Math.hypot(boss._chargeVx,boss._chargeVy)<0.4)boss._charging=false;}
      if(!boss._spawnTaunt){boss._spawnTaunt=true;bossTaunt(boss,'spawn',G);}
    }
  },
  // ── Boss2：伪筑基 ──
  {
    key:'fake_skill',name:'卡瓶颈的伪筑基',hp:1100,spd:0.68,sz:30,col:'#8040A8',reward:5,
    _rageRequire:0,
    taunts:{spawn:['我的大招蓄力中……'],half:['我的必杀马上就好了！'],empty_skill:['……怎么没效果？','不对不对，再来一次！','功法问题，怪不得我'],death:['是功法的问题！绝对是！']},
    emptySkillCd:0,charging:0,
    update(G,boss){
      const pct=boss.hp/boss.maxhp;
      if(!boss._spawnTaunt){boss._spawnTaunt=true;bossTaunt(boss,'spawn',G);}
      if(pct<0.5&&!boss._halfTaunt){boss._halfTaunt=true;bossTaunt(boss,'half',G);}
      boss.emptySkillCd++;if(boss.emptySkillCd>=1200){boss.emptySkillCd=0;boss.charging3=90;playSound('sync');showEcoAlert('⚡ 伪筑基·大招蓄力！！');}
      if(boss.charging3>0){boss.charging3--;boss.vx=0;boss.vy=0;if(boss.charging3%4===0)addPt(G,boss.x+(Math.random()-0.5)*40,boss.y+(Math.random()-0.5)*40,'#aa88ff',3,2);if(boss.charging3===0){addExplosionWave(G,boss.x,boss.y,80,'#aa88ff');addExplosionWave(G,boss.x,boss.y,50,'#8855ff');screenShake(6);setTimeout(()=>bossTaunt(boss,'empty_skill',G),500);}}
      boss._bulletT=(boss._bulletT||0)+1;if(boss._bulletT>=90){boss._bulletT=0;for(let i=0;i<4;i++){const a=i/4*Math.PI*2+G.elapsed*0.02;addProj(G,boss.x,boss.y,Math.cos(a)*2.5,Math.sin(a)*2.5,{dmg:5,r:5,color:'#aa88ff',life:80,isBossBullet:true});}}
    }
  },
  // ── Boss3：老掉牙 ──
  {
    key:'old_teeth',name:'老掉牙的筑基初期',hp:1350,spd:0.35,sz:34,col:'#888870',reward:5,
    _rageRequire:0,
    taunts:{spawn:['当年老夫筑基的时候……'],taunt:['当年老夫筑基时，那灵气……','你们年轻人不懂……','这世道真的变了……','再让我说一句话……'],half:['老夫还有话要说！'],death:['老夫话还没说完……']},
    _dmgSinceTaunt:0,taunting:0,
    update(G,boss){
      const pct=boss.hp/boss.maxhp;
      if(!boss._spawnTaunt){boss._spawnTaunt=true;bossTaunt(boss,'spawn',G);}
      if(pct<0.5&&!boss._halfTaunt){boss._halfTaunt=true;bossTaunt(boss,'half',G);}
      if(boss.taunting>0){boss.taunting--;boss.vx=0;boss.vy=0;return;}
      boss._aoeT=(boss._aoeT||0)+1;if(boss._aoeT>=200){boss._aoeT=0;addExplosionWave(G,boss.x,boss.y,70,'#888870');if(Math.hypot(G.mx-boss.x,G.my-boss.y)<70)applyPlayerDamage(G,8);}
    },
    onDamage(G,boss,dmg){boss._dmgSinceTaunt=(boss._dmgSinceTaunt||0)+dmg;if(boss._dmgSinceTaunt>=300&&boss.taunting<=0){boss._dmgSinceTaunt=0;boss.taunting=180;bossTaunt(boss,'taunt',G);showEcoAlert('💬 老掉牙·絮叨中！趁机猛打！');}}
  },
  // ── Boss4：带法宝 ──
  {
    key:'has_treasure',name:'带法宝的筑基初期',hp:1600,spd:0.60,sz:32,col:'#C0901A',reward:6,
    _rageRequire:0,
    taunts:{spawn:['我有法宝！你们练气期的算什么！'],treasure_break:['我的宝贝！','那是家传的！','你赔！'],all_broken:['……没有法宝我也能打！'],death:['法宝质量太差了……']},
    treasures:[],_treasureTimer:0,
    update(G,boss){
      const pct=boss.hp/boss.maxhp;
      if(!boss._spawnTaunt){boss._spawnTaunt=true;bossTaunt(boss,'spawn',G);}
      boss._treasureTimer++;if(boss._treasureTimer>=600&&boss.treasures.length<3){boss._treasureTimer=0;boss.treasures.push({angle:Math.random()*Math.PI*2,hp:120,maxHp:120,r:65});}
      boss.treasures.forEach(t=>{t.angle+=0.025;});
      if(boss.treasures.length===0&&!boss._allBrokenTaunt&&boss._spawnTaunt){boss._allBrokenTaunt=true;bossTaunt(boss,'all_broken',G);}
      const bulletCd=boss.treasures.length>0?120:70;
      boss._bulletT=(boss._bulletT||0)+1;if(boss._bulletT>=bulletCd){boss._bulletT=0;const n=3+(3-boss.treasures.length);const ang=Math.atan2(G.my-boss.y,G.mx-boss.x);for(let i=0;i<n;i++){const a=ang+(i-(n-1)/2)*0.28;addProj(G,boss.x,boss.y,Math.cos(a)*3.5,Math.sin(a)*3.5,{dmg:7,r:5,color:'#C0901A',life:75,isBossBullet:true});}}
    }
  },
  // ── Boss5：有后台 ──
  {
    key:'has_backing',name:'有后台的筑基初期',hp:1900,spd:0.65,sz:34,col:'#4060A0',reward:7,
    _rageRequire:0,
    taunts:{spawn:['我后台硬！你打不了我！'],call_backup:['兄弟们！上！'],backup_dead:['没用的废物！'],no_backup:['……不管了，我自己上！'],death:['等我上面知道了……']},
    _backupWaves:0,
    update(G,boss){
      const pct=boss.hp/boss.maxhp;
      if(!boss._spawnTaunt){boss._spawnTaunt=true;bossTaunt(boss,'spawn',G);}
      const waveThresh=[0.75,0.50,0.25,0.05];
      waveThresh.forEach((t,i)=>{if(pct<t&&(boss._backupWaves||0)<=i){boss._backupWaves=(boss._backupWaves||0)+1;bossTaunt(boss,'call_backup',G);const backupTypes=['roller','berserker','rich'];for(let j=0;j<4;j++){const angle=Math.random()*Math.PI*2;const bt=backupTypes[Math.floor(Math.random()*backupTypes.length)];spawnEnemyAt(G,bt,boss.x+Math.cos(angle)*80,boss.y+Math.sin(angle)*80,'late');const e2=G.enemies[G.enemies.length-1];if(e2)e2._isBackup=true;}showEcoAlert('🚨 援军到来！先清援军再打Boss！');}});
      const hasBackup=G.enemies.some(e=>e._isBackup);boss._hasBackup=hasBackup;
      if(!hasBackup&&boss._backupWaves>0&&!boss._noBackupTaunt){boss._noBackupTaunt=true;bossTaunt(boss,'backup_dead',G);setTimeout(()=>bossTaunt(boss,'no_backup',G),2000);}
      boss._bulletT=(boss._bulletT||0)+1;const cd=hasBackup?150:90;if(boss._bulletT>=cd){boss._bulletT=0;const a2=Math.atan2(G.my-boss.y,G.mx-boss.x);addProj(G,boss.x,boss.y,Math.cos(a2)*4,Math.sin(a2)*4,{dmg:9,r:6,color:'#4060A0',life:80,isBossBullet:true});}
    }
  },
  // ── Boss6：吃不停 ──
  {
    key:'always_eat',name:'吃不停的筑基中期',hp:2200,spd:0.58,sz:36,col:'#A05828',reward:8,
    _rageRequire:1,
    taunts:{spawn:['还不够……我还没吃够……'],devour:['好吃！','嗝——','再来一个！'],enrage:['吃饱了！打！','能量补满了！'],death:['……减肥明天再说……']},
    _devour:0,enrage:0,
    update(G,boss){
      const pct=boss.hp/boss.maxhp;
      if(!boss._spawnTaunt){boss._spawnTaunt=true;bossTaunt(boss,'spawn',G);}
      if(boss.enrage>0){boss.enrage--;boss.spd=boss._baseSpd*1.6;}else{boss.spd=boss._baseSpd||0.58;boss._baseSpd=boss._baseSpd||boss.spd;}
      if(boss._devour>=5){boss._devour=0;boss.enrage=480;boss.hp=Math.min(boss.maxhp,boss.hp+200);bossTaunt(boss,'enrage',G);screenShake(10);addExplosionWave(G,boss.x,boss.y,50,'#A05828');showEcoAlert('😤 吃不停·吃饱狂暴8秒！少让小怪死！');}
      if(G.elapsed%300===0)bossTaunt(boss,'devour',G);
      boss.sz=36+Math.floor((1-pct)*16);
    }
  },
  // ── Boss7：娇滴滴 ──
  {
    key:'dainty',name:'娇滴滴的筑基中期',hp:2000,spd:0.62,sz:30,col:'#E060A0',reward:8,
    _rageRequire:0,
    taunts:{spawn:['你、你干嘛……人家还没准备好……'],jiaoqi:['哇呜……你好过分……','为什么要这么打人家……'],counter:['你惹我生气了！','哼！'],death:['哼！']},
    jiaoDun:0,_counterTimer:0,
    update(G,boss){
      const pct=boss.hp/boss.maxhp;
      if(!boss._spawnTaunt){boss._spawnTaunt=true;bossTaunt(boss,'spawn',G);}
      if(pct<0.5&&!boss._halfTaunt){boss._halfTaunt=true;}
      if(boss.jiaoDun>0){boss.jiaoDun--;const dx2=G.mx-boss.x,dy2=G.my-boss.y,d2=Math.hypot(dx2,dy2)||1;boss.x-=dx2/d2*1.2;boss.y-=dy2/d2*1.2;}
      if(boss._counterTimer>0){boss._counterTimer--;boss.spd=boss._baseSpd*2.0;}else{boss.spd=boss._baseSpd||0.62;boss._baseSpd=boss._baseSpd||boss.spd;}
      if(boss.jiaoDun<=0){boss._bulletT=(boss._bulletT||0)+1;if(boss._bulletT>=80){boss._bulletT=0;const n2=boss._counterTimer>0?8:4;for(let i2=0;i2<n2;i2++){const a3=i2/n2*Math.PI*2+G.elapsed*0.03;addProj(G,boss.x,boss.y,Math.cos(a3)*3,Math.sin(a3)*3,{dmg:6,r:5,color:'#E060A0',life:70,isBossBullet:true});}}}
    },
    onDamage(G,boss,dmg){if(dmg>80&&boss.jiaoDun<=0){boss.jiaoDun=1200;bossTaunt(boss,'jiaoqi',G);showEcoAlert('💔 娇滴滴·护盾！用小伤害磨！');setTimeout(()=>{boss._counterTimer=180;bossTaunt(boss,'counter',G);},20000);}}
  },
  // ── Boss8：我爸是紫府 ──
  {
    key:'dad_zifu',name:'我爸是紫府的筑基中期',hp:2600,spd:0.60,sz:34,col:'#6030C0',reward:9,
    _rageRequire:2,
    taunts:{spawn:['我爸是紫府！你打我试试！'],shield_on:['护盾开了！你打不穿的！'],shield_break:['怎么……怎么可能！'],half:['我爸听到了你完蛋！'],death:['我爸……会为我报仇的……']},
    _shieldTimer:0,shield:false,
    update(G,boss){
      const pct=boss.hp/boss.maxhp;
      if(!boss._spawnTaunt){boss._spawnTaunt=true;bossTaunt(boss,'spawn',G);}
      if(pct<0.5&&!boss._halfTaunt){boss._halfTaunt=true;bossTaunt(boss,'half',G);}
      boss._shieldTimer++;if(boss._shieldTimer>=1800&&!boss.shield){boss._shieldTimer=0;boss.shield=true;bossTaunt(boss,'shield_on',G);showEcoAlert('🛡 我爸护盾！需暴怒(50连)才能打破！');}
      boss._bulletT=(boss._bulletT||0)+1;if(boss._bulletT>=100){boss._bulletT=0;const ang2=Math.atan2(G.my-boss.y,G.mx-boss.x);for(let i2=-2;i2<=2;i2++){const a3=ang2+i2*0.2;addProj(G,boss.x,boss.y,Math.cos(a3)*4,Math.sin(a3)*4,{dmg:9,r:5,color:'#6030C0',life:80,isBossBullet:true});}}
    },
    onDamage(G,boss,dmg){if(boss.shield){if((G.rageTier||0)>=2){boss.shield=false;boss._shieldTimer=0;bossTaunt(boss,'shield_break',G);screenShake(12);addExplosionWave(G,boss.x,boss.y,60,'#6030C0');return dmg;}else{addDamageText(G,boss.x,boss.y-25,'怒气不足！','#aaaaaa',14);return 0;}}return dmg;}
  },
  // ── Boss9：爱发vlog ──
  {
    key:'vlogger',name:'爱发vlog的筑基后期',hp:2500,spd:0.65,sz:30,col:'#E04020',reward:10,
    _rageRequire:0,
    taunts:{spawn:['等一下，我开个播——'],vlog_start:['大家好！今天来打个练气期！','关注一下哦～'],vlog_hit:['停！这帧不好看！','哎这镜头歪了！'],vlog_end:['这条发布了哦～'],death:['这条……不发了……']},
    _vlogTimer:0,vlogging:0,
    update(G,boss){
      const pct=boss.hp/boss.maxhp;
      if(!boss._spawnTaunt){boss._spawnTaunt=true;bossTaunt(boss,'spawn',G);}
      boss._vlogTimer++;if(boss._vlogTimer>=1500&&boss.vlogging<=0){boss._vlogTimer=0;boss.vlogging=480;bossTaunt(boss,'vlog_start',G);showEcoAlert('📱 直播中！周围敌人攻击+30%！打Boss中断直播！');}
      if(boss.vlogging>0){boss.vlogging--;if(G.elapsed%30===0){G.enemies.forEach(e=>{if(Math.hypot(e.x-boss.x,e.y-boss.y)<150)e.vlogBuff=60;});}if(boss.vlogging===0)bossTaunt(boss,'vlog_end',G);}
      boss._bulletT=(boss._bulletT||0)+1;if(boss._bulletT>=85){boss._bulletT=0;const ang2=Math.atan2(G.my-boss.y,G.mx-boss.x)+((Math.random()-0.5)*0.4);addProj(G,boss.x,boss.y,Math.cos(ang2)*4.5,Math.sin(ang2)*4.5,{dmg:10,r:5,color:'#E04020',life:75,isBossBullet:true});}
    },
    onDamage(G,boss,dmg){if(boss.vlogging>0){boss.vlogging=0;bossTaunt(boss,'vlog_hit',G);}return dmg;}
  },
  // ── Boss10：功法霸道 ──
  {
    key:'dominator',name:'功法霸道的筑基后期',hp:3000,spd:0.55,sz:36,col:'#203080',reward:11,
    _rageRequire:3,
    taunts:{spawn:['功法天下第一！你的攻击在我面前毫无意义！'],rage_break:['怎么……反而变强了！这不可能！'],half:['继续！我的功法无敌！'],death:['……功法有……问题……']},
    update(G,boss){
      const pct=boss.hp/boss.maxhp;
      if(!boss._spawnTaunt){boss._spawnTaunt=true;bossTaunt(boss,'spawn',G);}
      if(pct<0.5&&!boss._halfTaunt){boss._halfTaunt=true;bossTaunt(boss,'half',G);}
      if((G.rageTier||0)>=3&&!boss._rageBroken){boss._rageBroken=true;bossTaunt(boss,'rage_break',G);showEcoAlert('🔥 炽怒突破霸道！伤害+20%！');}
      if((G.rageTier||0)<3)boss._rageBroken=false;
      boss._bulletT=(boss._bulletT||0)+1;if(boss._bulletT>=70){boss._bulletT=0;const ang2=Math.atan2(G.my-boss.y,G.mx-boss.x);addProj(G,boss.x,boss.y,Math.cos(ang2)*5,Math.sin(ang2)*5,{dmg:11,r:6,color:'#203080',life:90,isBossBullet:true});if(pct<0.5){for(let i2=1;i2<=2;i2++){addProj(G,boss.x,boss.y,Math.cos(ang2+i2*0.35)*3.5,Math.sin(ang2+i2*0.35)*3.5,{dmg:7,r:4,color:'#4060C0',life:70,isBossBullet:true});addProj(G,boss.x,boss.y,Math.cos(ang2-i2*0.35)*3.5,Math.sin(ang2-i2*0.35)*3.5,{dmg:7,r:4,color:'#4060C0',life:70,isBossBullet:true});}}}
    },
    dmgMult(G){if((G.rageTier||0)>=3)return 1.20;return 0.85;}
  },
  // ── Boss11：壕气冲天 ──
  {
    key:'rich_armor',name:'壕气冲天的筑基后期',hp:3200,spd:0.58,sz:38,col:'#C8A000',reward:12,
    _rageRequire:0,
    taunts:{spawn:['钱能解决一切！你伤不了我！'],recharge:['再充一次！','钱不是问题！'],armor_break:['退款！','我要投诉！'],death:['……钱也不是万能的……']},
    armorStack:3,_armorTimer:0,_critStreak:0,
    update(G,boss){
      const pct=boss.hp/boss.maxhp;
      if(!boss._spawnTaunt){boss._spawnTaunt=true;bossTaunt(boss,'spawn',G);}
      boss._armorTimer++;if(boss._armorTimer>=1200&&boss.armorStack<3){boss._armorTimer=0;boss.armorStack++;bossTaunt(boss,'recharge',G);addExplosionWave(G,boss.x,boss.y,40,'#C8A000');showEcoAlert('💰 壕气充值护甲！连续暴击5次击碎一层！');}
      boss._bulletT=(boss._bulletT||0)+1;const cd2=Math.max(50,90-boss.armorStack*15);if(boss._bulletT>=cd2){boss._bulletT=0;const n3=3+boss.armorStack;for(let i3=0;i3<n3;i3++){const a4=i3/n3*Math.PI*2+G.elapsed*0.015;addProj(G,boss.x,boss.y,Math.cos(a4)*3.5,Math.sin(a4)*3.5,{dmg:10,r:5,color:'#C8A000',life:80,isBossBullet:true});}}
    },
    onDamage(G,boss,dmg){const armorRes=1.0-boss.armorStack*0.15;const actualDmg=dmg*armorRes;if(dmg>50){boss._critStreak=(boss._critStreak||0)+1;if(boss._critStreak>=5){boss._critStreak=0;if(boss.armorStack>0){boss.armorStack--;bossTaunt(boss,'armor_break',G);playSound('boss_armor_break');screenShake(8);addExplosionWave(G,boss.x,boss.y,45,'#ff8800');}}}else{boss._critStreak=0;}return actualDmg;}
  },
  // ── Boss12：作威作福（终Boss）──
  {
    key:'tyrant',name:'作威作福的半步紫府',hp:3800,spd:0.50,sz:44,col:'#802010',reward:20,
    _rageRequire:4,
    taunts:{spawn:['区区练气期……你们也配？'],phase2:['威压！让你看看真正的差距！'],phase3_norage:['怎么，你还想赢？就这点怒气？'],phase3_rage:['这……不可能……你……'],death:['不可能……我半步紫府……怎么……']},
    _phase:0,
    update(G,boss){
      if(!boss._spawnTaunt){boss._spawnTaunt=true;bossTaunt(boss,'spawn',G);}
      const pct=boss.hp/boss.maxhp;const newPhase=pct>0.6?0:pct>0.3?1:2;
      if(newPhase!==boss._phase){boss._phase=newPhase;if(newPhase===1){bossTaunt(boss,'phase2',G);showEcoAlert('⚠ 作威作福·威压！你的攻击-40%！');}if(newPhase===2){const rageOk=(G.rageTier||0)>=4;bossTaunt(boss,rageOk?'phase3_rage':'phase3_norage',G);if(!rageOk)showEcoAlert('❗ 需狂怒(120连)！否则伤害×0.25！');else showEcoAlert('🔥 狂怒压制！全力输出！');}}
      boss._bulletT=(boss._bulletT||0)+1;const cd=newPhase===2?50:newPhase===1?65:80;if(boss._bulletT>=cd){boss._bulletT=0;const ang=Math.atan2(G.my-boss.y,G.mx-boss.x);const n=newPhase===2?8:newPhase===1?6:4;for(let i=0;i<n;i++){const a=ang+i/n*Math.PI*2;const spd2=newPhase>=1?5:4;addProj(G,boss.x,boss.y,Math.cos(a)*spd2,Math.sin(a)*spd2,{dmg:12+newPhase*3,r:6,color:'#ff2200',life:85,isBossBullet:true});}}
      if(newPhase>=2){boss._chargeT=(boss._chargeT||0)+1;if(boss._chargeT>=100&&!boss._charging){boss._chargeT=0;boss._charging=true;const dx=G.mx-boss.x,dy=G.my-boss.y,d2=Math.hypot(dx,dy)||1;boss._chargeVx=dx/d2*9;boss._chargeVy=dy/d2*9;}if(boss._charging){boss.x+=boss._chargeVx;boss.y+=boss._chargeVy;boss._chargeVx*=0.87;boss._chargeVy*=0.87;if(Math.hypot(boss._chargeVx,boss._chargeVy)<0.5)boss._charging=false;}}
    },
    dmgMult(G,boss){const pct=boss.hp/boss.maxhp;if(pct<0.6)return 0.60;if(pct<0.3){if((G.rageTier||0)>=4)return 1.0;if(G.elapsed%60===0)addDamageText(G,boss.x,boss.y-30,'怒气不足！','#ff8844',16);return 0.25;}return 1.0;}
  },
];

// ── 关卡Boss配置 ──
const STAGE_BOSS_MAP=[
  {bosses:['fake_zhuji','fake_skill'], hpMult:1.00},
  {bosses:['fake_skill','old_teeth'], hpMult:1.12},
  {bosses:['old_teeth','has_treasure'], hpMult:1.25},
  {bosses:['has_treasure','has_backing'], hpMult:1.40},
  {bosses:['has_backing','always_eat'], hpMult:1.55},
  {bosses:['always_eat','dainty'], hpMult:1.72},
  {bosses:['dainty','dad_zifu'], hpMult:1.90},
  {bosses:['dad_zifu','vlogger'], hpMult:2.10},
  {bosses:['vlogger','dominator'], hpMult:2.32},
  {bosses:['dominator','rich_armor','tyrant'], hpMult:2.60},
];

const QUALITY_DEFS=[
  {id:'white', name:'凡品', color:'#cccccc', cardClass:'q-white-card', weight:40},
  {id:'green', name:'灵品', color:'#4ae090', cardClass:'q-green-card', weight:28},
  {id:'blue',  name:'玄品', color:'#5aafff', cardClass:'q-blue-card',  weight:18},
  {id:'purple',name:'地品', color:'#cc55ff', cardClass:'q-purple-card',weight:9},
  {id:'gold',  name:'天品', color:'#EF9F27', cardClass:'q-gold-card',  weight:4},
  {id:'red',   name:'神品', color:'#ff3322', cardClass:'q-red-card',   weight:1},
];

// 品质对各武器的真实加成（装备后持续生效）
const QUALITY_BONUS={
  white:  {qualityMult:1.0,atkMult:1.0,  cdMult:1.0,  dmgFlat:0,   spdMult:1.0,  critRate:0,    comboHit:0, splashR:0,  pierce:0, reflect:0,    hpMult:1.0,  shield:0,  leechRate:0,    dodgeFrames:0, dmgReduce:0,    revive:false, comboSpeed:1.0,  comboDmg:0,    evolveRate:1.0,  xpBoost:1.0,  starDmg:0,    evolveRange:1.0,  extra:''},
  green:  {qualityMult:1.15,atkMult:1.15, cdMult:0.92, dmgFlat:0.5, spdMult:1.0,  critRate:0.02, comboHit:1, splashR:25, pierce:1, reflect:0.03,  hpMult:1.10, shield:3,  leechRate:0.01,  dodgeFrames:0, dmgReduce:0.02,  revive:false, comboSpeed:1.02, comboDmg:0.01,  evolveRate:1.05,  xpBoost:1.05, starDmg:0.02,  evolveRange:1.0,   extra:'攻伐+15%'},
  blue:   {qualityMult:1.3, atkMult:1.3,  cdMult:0.85, dmgFlat:1.2, spdMult:1.05, critRate:0.04, comboHit:1, splashR:40, pierce:1, reflect:0.05,  hpMult:1.20, shield:7,  leechRate:0.02,  dodgeFrames:0, dmgReduce:0.04,  revive:false, comboSpeed:1.04, comboDmg:0.02,  evolveRate:1.10,  xpBoost:1.10, starDmg:0.04,  evolveRange:1.0,   extra:'攻伐+30%·冷却-15%'},
  purple: {qualityMult:1.55,atkMult:1.55, cdMult:0.75, dmgFlat:2.5, spdMult:1.1,  critRate:0.07, comboHit:1, splashR:55, pierce:1, reflect:0.08,  hpMult:1.35, shield:15, leechRate:0.04,  dodgeFrames:900,dmgReduce:0.07,  revive:false, comboSpeed:1.06, comboDmg:0.03,  evolveRate:1.18,  xpBoost:1.18, starDmg:0.07,  evolveRange:1.0,   extra:'攻伐+55%·冷却-25%·移速+10%'},
  gold:   {qualityMult:1.9, atkMult:1.9,  cdMult:0.62, dmgFlat:5.0, spdMult:1.15, critRate:0.10, comboHit:2, splashR:70, pierce:2, reflect:0.12,  hpMult:1.50, shield:25, leechRate:0.07,  dodgeFrames:750,dmgReduce:0.10,  revive:false, comboSpeed:1.09, comboDmg:0.05,  evolveRate:1.30,  xpBoost:1.30, starDmg:0.10,  evolveRange:1.05,  extra:'攻伐+90%·冷却-38%·移速+15%'},
  red:    {qualityMult:2.5, atkMult:2.6,  cdMult:0.45, dmgFlat:10,  spdMult:1.25, critRate:0.14, comboHit:2, splashR:80, pierce:3, reflect:0.18,  hpMult:1.80, shield:40, leechRate:0.12,  dodgeFrames:600,dmgReduce:0.15,  revive:true,  comboSpeed:1.12, comboDmg:0.08,  evolveRate:1.50,  xpBoost:1.50, starDmg:0.15,  evolveRange:1.10,  extra:'⚡全属性暴涨·冷却砍半·移速+25%'},
};

// 法宝池（映射到真实weapon id）
const TREASURE_POOL=[
  {wid:'spore_cannon', name:'蚀灵玉佩',  icon:'🌿', qmod:0,  desc:'追踪蚀灵符·感染·穿透',       effects:['atkMult','pierce']},
  {wid:'poison_spit',  name:'魔渊魂珠',icon:'💀', qmod:0,  desc:'持续魔气DOT·范围扩散',        effects:['dmgFlat','splashR']},
  {wid:'lightning_bug',name:'九霄雷印',icon:'⚡', qmod:0,  desc:'跳链天雷·连锁清场',           effects:['critRate','comboDmg']},
  {wid:'orbit_bugs',   name:'御灵法镯',  icon:'🌀', qmod:0,  desc:'御灵护体·旋转撞击',          effects:['spdMult','dodgeFrames']},
  {wid:'flame_tower',  name:'丹火剑匣',icon:'🔥', qmod:0,  desc:'丹火剑台·等距环绕',           effects:['dmgFlat','critRate']},
  {wid:'bio_leech',    name:'汲灵血玉',icon:'💉', qmod:-1, desc:'斩敌汲灵·持续回血',            effects:['leechRate','comboDmg']},
  {wid:'berserker_soul',name:'狂道血晶',icon:'🩸',qmod:1,  desc:'无伤道力暴涨·受伤暴怒',         effects:['comboSpeed','starDmg']},
  {wid:'shell_armor',  name:'金刚法盾',icon:'🛡', qmod:-1, desc:'灵虫血量+80%·减伤',            effects:['hpMult','shield']},
  {wid:'hive_expand',  name:'洞府宝鉴',icon:'🏯', qmod:-1, desc:'魔军上限+8·精英魔率+',          effects:['xpBoost','evolveRate']},
  {wid:'rapid_spawn',  name:'灵虫灵卵',icon:'🥚', qmod:-1, desc:'孵化间隔-30%·斩杀孵化',         effects:['hpMult','reflect']},
  {wid:'blade_storm',  name:'灵刃玉符',icon:'🔪', qmod:1,  desc:'每秒12道灵刃·高频切割',         effects:['atkMult','comboHit']},
  {wid:'soul_bullet',  name:'魂弹法珠',icon:'💫', qmod:1,  desc:'慢速大魂弹·命中爆裂8向',        effects:['critRate','splashR']},
  {wid:'void_lance',   name:'虚空刺枪',icon:'🗡', qmod:1,  desc:'超长穿透·Boss专克·CD长',       effects:['pierce','dmgReduce']},
  {wid:'frost_seal',   name:'寒冰道符',icon:'❄️', qmod:0,  desc:'冻结控制·2秒冰封·稳场',         effects:['shield','dodgeFrames']},
  {wid:'thunder_ring', name:'雷罡法环',icon:'⚡', qmod:0,  desc:'闪电护体环·触链连诛',          effects:['reflect','comboSpeed']},
];

const VICTORY_DROP_WEIGHTS=[
  {id:'white', w:55},{id:'green',w:28},{id:'blue',w:12},
  {id:'purple',w:4},{id:'gold',w:0.9},{id:'red',w:0.1},
];

const REALMS=[
  {name:'筑基失败现场', sub:'废弃丹室·砖缝灵石', stages:1, icon:'🧪', stageNames:['丹室残骸'], enemyTypes:['mortal','qi_refine'], bossType:'outer_elder'},
  {name:'关卡瓶颈修炼房', sub:'龟裂洞府·结界残片', stages:1, icon:'🕳️', stageNames:['洞府裂缝'], enemyTypes:['qi_refine','foundation'], bossType:'foundation_guard'},
  {name:'老掉牙的道场', sub:'荒弃广场·石板青苔', stages:1, icon:'⛩️', stageNames:['道场青苔'], enemyTypes:['foundation'], bossType:'core_disciple'},
  {name:'法宝仓库', sub:'储物间·符文货架', stages:1, icon:'✨', stageNames:['库房符文'], enemyTypes:['foundation','golden_core'], bossType:'golden_core'},
  {name:'后台会客厅', sub:'豪华厅堂·红毯屏风', stages:1, icon:'🏛️', stageNames:['会厅红毯'], enemyTypes:['golden_core'], bossType:'mine_warden'},
  {name:'修仙食堂', sub:'灵厨房·锅炉蒸汽', stages:1, icon:'🍲', stageNames:['食堂锅炉'], enemyTypes:['golden_core','nascent_soul'], bossType:'war_general'},
  {name:'美容修炼室', sub:'奢华内室·花瓣雾气', stages:1, icon:'🪞', stageNames:['内室花瓣'], enemyTypes:['nascent_soul'], bossType:'soul_guardian'},
  {name:'紫府家族祠堂', sub:'权贵厅·族徽金纹', stages:1, icon:'🏯', stageNames:['祠堂金纹'], enemyTypes:['nascent_soul','deity_transform'], bossType:'rift_elder'},
  {name:'vlog直播基地', sub:'现代外景·霓虹光圈', stages:1, icon:'🎬', stageNames:['外景霓虹'], enemyTypes:['deity_transform'], bossType:'seal_keeper'},
  {name:'擂台·半步紫府领地', sub:'八角高台·光柱云雾', stages:1, icon:'🏟️', stageNames:['紫府擂台'], enemyTypes:['deity_transform','mahayana'], bossType:'heavenly_sovereign', isFinalStage:true},
];

const stageNames=REALMS.map(r=>r.name);

// 关卡地图（按境界展开的线性节点）
const STAGE_MAP=[
  {id:'s1',  realm:0,stage:0,type:'normal', dropMin:'white',dropMax:'green'},
  {id:'s2',  realm:1,stage:0,type:'normal', dropMin:'white',dropMax:'green'},
  {id:'s3',  realm:2,stage:0,type:'elite',  dropMin:'green',dropMax:'blue'},
  {id:'s4',  realm:3,stage:0,type:'elite',  dropMin:'green',dropMax:'blue'},
  {id:'s5',  realm:4,stage:0,type:'special',dropMin:'green',dropMax:'gold'},
  {id:'s6',  realm:5,stage:0,type:'special',dropMin:'green',dropMax:'gold'},
  {id:'s7',  realm:6,stage:0,type:'boss',   dropMin:'blue', dropMax:'purple'},
  {id:'s8',  realm:7,stage:0,type:'boss',   dropMin:'purple',dropMax:'gold'},
  {id:'s9',  realm:8,stage:0,type:'boss',   dropMin:'purple',dropMax:'gold'},
  {id:'s10', realm:9,stage:0,type:'boss',   dropMin:'purple',dropMax:'red'},
];

// 关卡差异化规则
const STAGE_CONFIGS={
  normal:  {enemyHpMult:1.0, eliteRateMult:1.0, bossEarly:0, timeLimit:0,    desc:'标准'},
  elite:   {enemyHpMult:1.5, eliteRateMult:3.0, bossEarly:0, timeLimit:0,    desc:'敌人HP×1.5·精英率×3'},
  boss:    {enemyHpMult:1.2, eliteRateMult:1.5, bossEarly:30,timeLimit:0,    desc:'Boss提前30秒'},
  special: {enemyHpMult:1.0, eliteRateMult:2.0, bossEarly:0, timeLimit:120,  desc:'限时120秒·击杀达标解锁成就'},
};

// 成就系统
const ACHIEVEMENTS=[
  {id:'first_win',  name:'破劫初显', icon:'🌟', desc:'首次通关',           reward:'灵品法宝×1',quality:'green', check(p,stats){return (p.totalWins||0)>=1;}},
  {id:'kill_500',   name:'魔军灭世', icon:'💀', desc:'单局击杀500',        reward:'玄品×1',     quality:'blue',  check(p,stats){return (stats.kills||0)>=500;}},
  {id:'hoard_30',   name:'法宝巨贾', icon:'💎', desc:'收集30件法宝',        reward:'玄品×1',     quality:'blue',  check(p,stats){return (p.totalTreasures||0)>=30;}},
  {id:'combo_200',  name:'连斩三千', icon:'🔥', desc:'单局连斩≥200',        reward:'地品×1',     quality:'purple',check(p,stats){return (stats.maxCombo||0)>=200;}},
  {id:'realm_3',    name:'金丹飞升', icon:'⚡', desc:'首次到达金丹期',       reward:'天品×1',     quality:'gold',   check(p,stats){return (p.realmIdx||0)>=2;}},
  {id:'boss_5',     name:'万法归一', icon:'👑', desc:'连续5次通关',          reward:'神品×1',     quality:'red',    check(p,stats){return (p.bossStreak||0)>=5;}},
];

// ══════ 配置校验器 ══════
(function validateConfig(){
  const errors=[];
  // 武器校验
  Object.entries(WEAPONS).forEach(([id,w])=>{
    if(!w.name){errors.push('WEAPONS.'+id+': missing name');}
    if(!w.type){errors.push('WEAPONS.'+id+': missing type');}
    if(w.maxLv==null){errors.push('WEAPONS.'+id+': missing maxLv');}
    if(w.type==='attack'||w.type==='evolve'){
      if(w.onFire&&!w.cd){errors.push('WEAPONS.'+id+': has onFire but missing cd');}
    }
    if(w.evolve&&!WEAPONS[w.evolve]){errors.push('WEAPONS.'+id+': evolve target "'+w.evolve+'" not found');}
  });
  // 敌人校验
  ENEMY_TYPES.forEach((e,i)=>{
    if(!e.key){errors.push('ENEMY_TYPES['+i+']: missing key');}
    if(!e.name){errors.push('ENEMY_TYPES['+i+']: missing name');}
    if(e.hpBase==null){errors.push('ENEMY_TYPES['+i+']: missing hpBase');}
    if(e.spdBase==null){errors.push('ENEMY_TYPES['+i+']: missing spdBase');}
  });
  // 法宝校验
  TREASURE_POOL.forEach((t,i)=>{
    if(!t.wid){errors.push('TREASURE_POOL['+i+']: missing wid');}
    if(!t.name){errors.push('TREASURE_POOL['+i+']: missing name');}
    if(t.wid&&!WEAPONS[t.wid]){errors.push('TREASURE_POOL['+i+']: wid "'+t.wid+'" not in WEAPONS');}
    if(!t.effects){errors.push('TREASURE_POOL['+i+']: missing effects');}
  });
  // 品质校验
  ['white','green','blue','purple','gold','red'].forEach(id=>{
    if(!QUALITY_BONUS[id]){errors.push('QUALITY_BONUS: missing tier "'+id+'"');}
    else if(QUALITY_BONUS[id].qualityMult==null){errors.push('QUALITY_BONUS.'+id+': missing qualityMult');}
  });
  if(errors.length>0){
    console.error('CONFIG VALIDATION FAILED ('+errors.length+' errors):');
    errors.forEach(e=>console.error('  - '+e));
  }
})();
