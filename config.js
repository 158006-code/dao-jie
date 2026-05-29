// ══════════════════════════════════════════
// 道劫：万法失控 — 配置文件
// 修改名称/数值/平衡性只需改此文件
// ══════════════════════════════════════════

// ── 游戏常量 ──
const FPS=60,TOTAL=540;
const BOSS_AT=[180,360,540]; // 3/6/9分钟各一个Boss
const SPEEDS=[1,1.5,2,3];

// ── 时间提示 ──
const TIME_ALERTS=[
  {at:60,text:'乱流初现',color:'green'},
  {at:120,text:'灵力涌动',color:'green'},
  {at:180,text:'魔潮来临！',color:'orange'},
  {at:300,text:'天道崩裂！！',color:'#E24B4A'},
  {at:420,text:'万法失控！！！',color:'#ff2200'},
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
    onEquip(G,lv){G.swarmBonus=(G.swarmBonus||0)+8;}},
  shell_armor:{name:'金刚护体',type:'passive',maxLv:3,desc:['灵虫血量+80%','再+80%','减伤20%'],evolve:'iron_carapace',
    onEquip(G,lv){G.bugHpMult=(G.bugHpMult||1)*1.8;if(lv>=3)G.dmgReduce=(G.dmgReduce||0)+0.2;}},
  rapid_spawn:{name:'灵虫孵化',type:'passive',maxLv:3,desc:['孵化间隔-30%','再-25%','斩杀孵化+40%'],evolve:'swarm_surge',
    onEquip(G,lv){G.spawnMult=(G.spawnMult||1)*(lv===1?0.7:0.75);if(lv>=3)G.killSpawn=(G.killSpawn||0)+0.4;}},
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
  {key:'normal',name:'邪修残念',col:'#B04040',sz:10,hpBase:2.5,spdBase:0.58,atk:0.38,hasKB:false,unlockSec:0,special:null},
  {key:'swift',name:'游魂刀客',col:'#E06030',sz:8,hpBase:1.2,spdBase:1.05,atk:0.24,hasKB:false,unlockSec:25,special:'fast'},
  {key:'armored',name:'铁甲傀儡',col:'#607090',sz:16,hpBase:10,spdBase:0.34,atk:0.65,hasKB:true,unlockSec:50,special:'armored',defMult:2.5},
  {key:'ranged',name:'御剑散修',col:'#A060C0',sz:9,hpBase:3.5,spdBase:0.50,atk:0.44,hasKB:false,unlockSec:80,special:'ranged',keepDist:120},
  {key:'bomber',name:'自爆走火',col:'#C09020',sz:11,hpBase:4.5,spdBase:0.46,atk:0.55,hasKB:false,unlockSec:130,special:'bomber',explodeR:50,explodeDmg:18},
  {key:'elite',name:'魔道精英',col:'#C83030',sz:13,hpBase:16,spdBase:0.72,atk:0.75,hasKB:true,unlockSec:90,special:'elite'},
  {key:'queen',name:'召魂法师',col:'#8030A0',sz:18,hpBase:28,spdBase:0.28,atk:0.9,hasKB:false,unlockSec:200,special:'spawner',spawnInterval:160},
  {key:'regen',name:'不死邪灵',col:'#206040',sz:14,hpBase:18,spdBase:0.44,atk:0.58,hasKB:false,unlockSec:300,special:'regen',regenRate:0.05},
  {key:'void',name:'虚空裂隙',col:'#8040C0',sz:11,hpBase:7,spdBase:1.10,atk:0.65,hasKB:false,unlockSec:400,special:'void'},
  {key:'shield',name:'护道金盾',col:'#4488CC',sz:12,hpBase:8,spdBase:0.52,atk:0.46,hasKB:false,unlockSec:100,special:'shield',immuneDot:true},
  {key:'jumper',name:'凌空刺客',col:'#FF6644',sz:9,hpBase:4,spdBase:0.58,atk:0.52,hasKB:false,unlockSec:150,special:'jumper'},
  {key:'devourer',name:'噬魂魔兽',col:'#664422',sz:11,hpBase:6,spdBase:0.46,atk:0.56,hasKB:false,unlockSec:280,special:'devourer'},
  {key:'suicidal',name:'玉碎魔君',col:'#FF2200',sz:14,hpBase:20,spdBase:0.65,atk:0.80,hasKB:false,unlockSec:350,special:'suicidal',explodeR:65,explodeDmg:24},
  // V13 新增
  {key:'hivemind',name:'天机巢核',col:'#CC4488',sz:14,hpBase:22,spdBase:0.32,atk:0.68,hasKB:false,unlockSec:310,special:'hivemind'},
  {key:'corruptor',name:'领域腐蚀',col:'#448844',sz:12,hpBase:8,spdBase:0.52,atk:0.56,hasKB:false,unlockSec:270,special:'corruptor'},
];

const BOSS_DEFS=[
  {
    name:'上古邪修',hp:600,spd:0.85,sz:36,col:'#C97B3A',reward:5,
    chargeTimer:0,chargeCd:160,charging:false,chargeDir:{x:0,y:0},chargeSpd:0,
    splitTimer:0,splitCd:200,bulletTimer:0,bulletCd:80,bulletAngle:0,
    phaseDesc:['降魔阶段','领域展开','道魔合一'],
    update(G,boss){
      const pct=boss.hp/boss.maxhp;
      const phase=pct>0.66?0:pct>0.33?1:2;
      boss._phase=phase;
      boss.splitTimer++;
      const splitCd=phase===0?160:phase===1?120:80;
      if(boss.splitTimer>=splitCd){boss.splitTimer=0;
        const n=phase===0?3:phase===1?4:6;
        for(let i=0;i<n;i++)spawnEnemyAt(G,Math.random()<0.3?'elite':'normal',boss.x+(Math.random()-0.5)*60,boss.y+(Math.random()-0.5)*60);}
      // 阶段2：领域扩散
      if(phase>=1&&G.elapsed%45===0){
        G.infectionMap.push({x:boss.x+(Math.random()-0.5)*80,y:boss.y+(Math.random()-0.5)*80,r:50+Math.random()*30,life:600,pulse:Math.random()*999,hostile:true});
      }
      // 阶段3：高速冲锋
      boss.chargeTimer++;
      const chargeCd=phase>=2?100:200;
      if(boss.chargeTimer>=chargeCd&&!boss.charging){
        boss.chargeTimer=0;boss.charging=true;
        const dx=G.mx-boss.x,dy=G.my-boss.y,d=Math.hypot(dx,dy)||1;
        boss.chargeDir={x:dx/d,y:dy/d};boss.chargeSpd=phase>=2?9:6;
        addPt(G,boss.x,boss.y,'#EF9F27',10,3);
      }
      if(boss.charging){
        boss.x+=boss.chargeDir.x*boss.chargeSpd;boss.y+=boss.chargeDir.y*boss.chargeSpd;
        boss.chargeSpd*=0.9;if(boss.chargeSpd<0.5)boss.charging=false;
        if(Math.hypot(G.mx-boss.x,G.my-boss.y)<boss.sz/2+12){applyPlayerDamage(G,2);applyReflect(G,2);}
      }
      boss.bulletTimer++;
      if(boss.bulletTimer>=boss.bulletCd){
        boss.bulletTimer=0;boss.bulletAngle+=0.5;
        const bulletN=phase>=2?6:4;
        for(let i=0;i<bulletN;i++){const a=boss.bulletAngle+i/bulletN*Math.PI*2;addProj(G,boss.x,boss.y,Math.cos(a)*3.5,Math.sin(a)*3.5,{dmg:7,r:5,color:'#E85D24',life:80,isBossBullet:true});}
      }
    }
  },
  {
    name:'天道化身',hp:1200,spd:0.60,sz:44,col:'#3A7B3A',reward:8,
    spitTimer:0,spitCd:100,puddleTimer:0,puddleCd:160,puddles:[],
    phaseDesc:['灵脉侵染','魔气封域','领域失控'],
    update(G,boss){
      const pct=boss.hp/boss.maxhp;const phase=pct>0.66?0:pct>0.33?1:2;boss._phase=phase;
      if(G.elapsed%30===0){
        G.infectionMap.push({x:Math.random()*W,y:Math.random()*H,r:40+Math.random()*40,life:500+Math.random()*200,pulse:Math.random()*999,hostile:phase>=1});
      }
      if(G.elapsed%35===0)G.bugs.forEach(b=>{if(Math.hypot(b.x-boss.x,b.y-boss.y)<130){b.hp-=0.7;addPt(G,b.x,b.y,'#639922',1,0.5);}});
      boss.spitTimer++;
      if(boss.spitTimer>=boss.spitCd){
        boss.spitTimer=0;const ang=Math.atan2(G.my-boss.y,G.mx-boss.x);
        const n=phase>=2?7:phase>=1?5:3;
        for(let i=-(Math.floor(n/2));i<=Math.floor(n/2);i++){
          const a=ang+i*0.22;addProj(G,boss.x,boss.y,Math.cos(a)*4,Math.sin(a)*4,{dmg:4,r:6,color:'#639922',life:70,poison:200,isBossBullet:true,splash:25});
        }
      }
      boss.puddleTimer++;
      if(boss.puddleTimer>=boss.puddleCd){boss.puddleTimer=0;boss.puddles.push({x:boss.x,y:boss.y,r:50+phase*15,life:400});}
      boss.puddles.forEach(p=>{p.life--;if(G.elapsed%16===0)G.bugs.forEach(b=>{if(Math.hypot(b.x-p.x,b.y-p.y)<p.r){b.hp-=0.3;}});});
      boss.puddles=boss.puddles.filter(p=>p.life>0);
      // V13阶段3：强制领域反噬
      if(phase>=2){G.mycelBetray=Math.min(1,(G.mycelBetray||0)+0.003);}
    }
  },
  {
    name:'域外天魔',hp:2800,spd:0.52,sz:58,col:'#7B3AC9',reward:15,
    spawnT:0,beamTimer:0,beamCd:130,beamActive:false,beamAngle:0,beamDur:0,
    meteorTimer:0,meteorCd:220,
    phaseDesc:['古神苏醒','天道封印','古神降临'],
    update(G,boss){
      const pct=boss.hp/boss.maxhp;const phase=pct>0.66?0:pct>0.33?1:2;boss._phase=phase;
      boss.spawnT++;const spawnCd=phase>=2?45:phase>=1?55:70;
      if(boss.spawnT>=spawnCd){boss.spawnT=0;spawnEnemyAt(G,Math.random()<0.4?'elite':'normal',boss.x+(Math.random()-0.5)*80,boss.y+(Math.random()-0.5)*80);}
      boss.beamTimer++;
      if(!boss.beamActive&&boss.beamTimer>=boss.beamCd){boss.beamTimer=0;boss.beamActive=true;boss.beamDur=90+phase*20;boss.beamAngle=Math.atan2(G.my-boss.y,G.mx-boss.x);}
      if(boss.beamActive){
        boss.beamDur--;boss.beamAngle+=0.022+phase*0.008;if(boss.beamDur<=0)boss.beamActive=false;
        G.bugs.forEach(b=>{const ang=Math.atan2(b.y-boss.y,b.x-boss.x);let diff=Math.abs(ang-boss.beamAngle);if(diff>Math.PI)diff=Math.PI*2-diff;if(diff<0.15&&Math.hypot(b.x-boss.x,b.y-boss.y)<220){b.hp-=1.8;}});
        const mAng=Math.atan2(G.my-boss.y,G.mx-boss.x);let diff=Math.abs(mAng-boss.beamAngle);if(diff>Math.PI)diff=Math.PI*2-diff;if(diff<0.15&&Math.hypot(G.mx-boss.x,G.my-boss.y)<220){applyPlayerDamage(G,0.9);applyReflect(G,0.9);}
      }
      boss.meteorTimer++;if(boss.meteorTimer>=boss.meteorCd){
        boss.meteorTimer=0;const n=4+phase*2;
        for(let i=0;i<n;i++){
          const tx=Math.random()*W,ty=Math.random()*H;
          G.dangerCircles.push({x:tx,y:ty,r:55,life:60,warn:true,color:'#9B4AFF'});
          setTimeout(()=>{if(!G||G.dead||G.won)return;addPt(G,tx,ty,'#E85D24',18,3);addExplosionWave(G,tx,ty,50,'#9B4AFF');
            G.bugs.forEach(b=>{if(Math.hypot(b.x-tx,b.y-ty)<55){b.hp-=5;knockback(b,tx,ty,5);}});
            if(Math.hypot(G.mx-tx,G.my-ty)<55){applyPlayerDamage(G,12);applyReflect(G,12);}},i*350/SPEED);
        }
      }
      // V13阶段3：UI腐蚀 + 世界脉冲加速
      if(phase>=2){G.worldCorrupt=true;G.uiCorrupt=Math.min(1,(G.uiCorrupt||0)+0.004);}
      if(phase>=1){G.worldPulseActive=true;}
    }
  },
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
  {name:'练气期',sub:'初入修行',stages:3,icon:'🌊',stageNames:['乱流试炼','魔潮初临','妖核降世']},
  {name:'筑基期',sub:'灵根初凝',stages:3,icon:'⚡',stageNames:['雷劫洗礼','道魔对决','天道审判']},
  {name:'金丹期',sub:'丹炉炼心',stages:4,icon:'🔥',stageNames:['丹炉试炼','魔火领域','天地灵脉','万法失控']},
  {name:'元婴期',sub:'神识出窍',stages:4,icon:'🌀',stageNames:['元婴渡世','道心磨砺','古神苏醒','天地共鸣']},
  {name:'化神期',sub:'道法自然',stages:5,icon:'💫',stageNames:['化神渡劫','万象归一','天魔降临','道心归一','飞升证道']},
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
