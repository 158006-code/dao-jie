// ══════════════════════════════════════════
// 道劫：万法失控 — 实体系统 (entities.js)
// 敌人生成 · AI · 灵虫 · Boss触发
// ══════════════════════════════════════════

// ── 视角刷怪 ──
function randBetween(a,b){return a+Math.random()*(b-a);}
function getSpawnPos(G){
  const OFF=60;
  switch(G.viewMode){
    case'vertical':{
      const fromTop=Math.random()<0.5;
      return{x:randBetween(W*0.1,W*0.9),y:fromTop?-OFF:H+OFF};
    }
    case'horizontal':{
      return Math.random()<.5?{x:-OFF,y:randBetween(0,H)}:{x:W+OFF,y:randBetween(0,H)};
    }
    default:{
      const side=Math.floor(Math.random()*4);
      switch(side){
        case 0:return{x:randBetween(0,W),y:-OFF};
        case 1:return{x:randBetween(0,W),y:H+OFF};
        case 2:return{x:-OFF,y:randBetween(0,H)};
        case 3:return{x:W+OFF,y:randBetween(0,H)};
      }
    }
  }
}

// ── 敌人生成 ──
function getAvailableTypes(sec){return ENEMY_TYPES.filter(t=>sec>=t.unlockSec);}
function spawnEnemyAt(G, typeKey, x, y, enemyPhase){
  const def = ENEMY_TYPES.find(t => t.key === typeKey) || ENEMY_TYPES[0];
  const sec = Math.floor(G.elapsed / FPS);
  const earlyMult = sec<60 ? 0.8 : sec<120 ? 0.92 : 1;
  const lateScale = sec>240 ? 1+((sec-240)/100)*0.6 : 1;
  const diff = 1.3 * earlyMult * lateScale;

  const ep = enemyPhase || 'early';
  const phaseScale = ep==='late' ? 1.55 : ep==='mid' ? 1.22 : 1.0;
  const phaseSpdScale = ep==='late' ? 1.18 : ep==='mid' ? 1.08 : 1.0;
  const phaseSzAdd = ep==='late' ? 2 : ep==='mid' ? 1 : 0;

  G.enemies.push({
    id: enId++, x, y, vx:0, vy:0,
    hp:     def.hpBase * (1 + G.phase*0.6 + G.lv*0.18) * diff * phaseScale,
    maxhp:  def.hpBase * (1 + G.phase*0.6 + G.lv*0.18) * diff * phaseScale,
    spd:    def.spdBase * (1 + G.phase*0.07) * phaseSpdScale,
    sz:     def.sz + phaseSzAdd,
    poison:0, kbCd:0, slowTimer:0,
    hasKB: def.hasKB,
    atk:   def.atk * diff * phaseScale,
    typeKey: def.key,
    key:     def.key,
    enemyPhase: ep,
    col:   def.col,
    special:   def.special,
    defMult:   def.defMult  || 1,
    keepDist:  def.keepDist || 0,
    explodeR:  def.explodeR || 0,
    explodeDmg:def.explodeDmg || 0,
    rangedTimer:0, rangedCd:90,
    spawnTimer:0,  spawnInterval: def.spawnInterval || 180,
    regenRate: def.regenRate || 0,
    magnetR:   def.magnetR   || 0,
    stealthAlpha:1, stealthTimer:0,
    immuneDot: def.immuneDot || false,
    shield:    def.special==='shield' ? 1 : 0,
    shieldCd:  0,
    jumpTimer:0, jumpCd: 80+Math.random()*40,
    jumping:false, jumpVx:0, jumpVy:0,
    devourCount:0, enrageTimer:0,
    overloadStacks:0, hivebuff:0,
    _hitShake:0, _hitCount:0,
  });
}
function spawnEnemy(G){
  const pos = getSpawnPos(G);
  const stageKey = 's' + (G.stageId || 1);
  const rule = STAGE_ENEMY_RULES[stageKey] || STAGE_ENEMY_RULES['s1'];

  // 精英生成
  if(rule.eliteKeys.length > 0 && Math.random() < rule.eliteChance){
    const eKey = rule.eliteKeys[Math.floor(Math.random() * rule.eliteKeys.length)];
    spawnEnemyAt(G, eKey, pos.x, pos.y, 'late');
    const e = G.enemies[G.enemies.length-1];
    e.hp    *= rule.hpMult;
    e.maxhp *= rule.hpMult;
    e.atk   *= rule.hpMult;
    return;
  }

  // 按 typeLimit 截取可用怪池
  const pool = rule.pool.slice(0, rule.typeLimit);

  // 按 phaseWeights 决定 enemyPhase
  const pw = rule.phaseWeights;
  const totalW = pw.early + pw.mid + pw.late;
  let rp = Math.random() * totalW;
  let chosenPhase = 'early';
  if(rp < pw.early){
    chosenPhase = 'early';
  } else if(rp < pw.early + pw.mid){
    chosenPhase = 'mid';
  } else {
    chosenPhase = 'late';
  }

  // 在 pool 内按权重随机选取
  const baseW = {
    normal:35, lied:18, cute:25, hard:14,
    hikikomori:10, dainty_e:12, swift:22, poor:15, dumb:15, sly:14,
    slick:12, poser:10, runner:14, greedy:10,
  };
  const weights = pool.map(key => baseW[key] || 8);
  const totalWt = weights.reduce((a,b)=>a+b, 0);
  let r = Math.random() * totalWt;
  let chosenKey = pool[0];
  for(let i=0; i<pool.length; i++){
    r -= weights[i];
    if(r <= 0){ chosenKey = pool[i]; break; }
  }

  spawnEnemyAt(G, chosenKey, pos.x, pos.y, chosenPhase);

  const e = G.enemies[G.enemies.length-1];
  if(rule.hpMult !== 1.0){
    e.hp    *= rule.hpMult;
    e.maxhp *= rule.hpMult;
  }
}

// ── 灵虫生成 ──
function spawnBug(n,x,y){
  n=n||1;
  for(let i=0;i<n;i++){
    const cap=10+G.lv*2+G.swarmBonus;
    if(G.bugs.length>=cap)break;
    const a=Math.random()*Math.PI*2,rr=16+Math.random()*12;
    const hp=(3+G.lv*0.25)*(G.bugHpMult||1);
    const isSwarm=G.activeBuild==='swarm';
    const role=isSwarm?(['fighter','bomber','guard'][Math.floor(Math.random()*3)]):'fighter';
    G.bugs.push({id:bugId++,
      x:x!=null?x+(Math.random()-0.5)*20:G.mx+Math.cos(a)*rr,
      y:y!=null?y+(Math.random()-0.5)*20:G.my+Math.sin(a)*rr,
      vx:0,vy:0,hp,maxhp:hp,atkTimer:0,age:0,targetId:null,
      elite:Math.random()<(G.eliteRate||0.1),
      role,
    });
  }
}

// ── 后期规则变化 ──
function updateLateGameRules(G,sec){
  if(sec>=240&&!G.bossMode){
    G.hatchTideTimer=(G.hatchTideTimer||0)+1;
    const hatchInterval=Math.max(540,1100-sec*0.8);
    if(G.hatchTideTimer>=hatchInterval){
      G.hatchTideTimer=0;
      const cx=Math.random()*W,cy=Math.random()*H;
      G.dangerCircles.push({x:cx,y:cy,r:80,life:90,color:'#ff8800'});
      showEcoAlert('💥 孵化潮爆发！');
      setTimeout(()=>{
        if(!G||G.dead||G.won)return;
        const n=4+Math.floor(sec/90);
        for(let i=0;i<n;i++){
          const a=Math.random()*Math.PI*2,rr=20+Math.random()*60;
          spawnEnemyAt(G,Math.random()<0.3?'berserker':'normal',cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,'late');
        }
        addExplosionWave(G,cx,cy,80,'#ff8800');addPt(G,cx,cy,'#E85D24',20,3);
        playSound('pulse');
      },90/SPEED*16);
    }
  }
  if(sec>=300||G.worldPulseActive){
    G.worldPulseTimer=(G.worldPulseTimer||0)+1;
    const pulseInterval=Math.max(420,660-sec);
    if(G.worldPulseTimer>=pulseInterval){
      G.worldPulseTimer=0;
      G.worldPulseFlash=40;
      playSound('pulse');
      G.enemies.forEach(e=>{e.rage=1.1;e.spd=Math.min(e.spd*1.03,e.spd*1.25);});
      G.enemies.forEach(e=>{if(e.special==='shield')e.shield=1;});
      showEcoAlert('🌊 世界脉冲！');
    }
    if(G.worldPulseFlash>0)G.worldPulseFlash--;
  }
}

// ── 敌人协同AI ──
function updateEnemyCooperation(G){
  G.enemies.forEach(hive=>{
    if(hive.special!=='hivemind')return;
    G.enemies.forEach(e=>{
      if(e===hive)return;
      if(Math.hypot(e.x-hive.x,e.y-hive.y)<100){
        e.hivebuff=30;
        e.immuneDot=true;
      }
    });
  });
  G.enemies.forEach(sh=>{
    if(sh.special!=='shield'||sh.shield<=0)return;
    G.enemies.forEach(e=>{
      if(e===sh)return;
      if(Math.hypot(e.x-sh.x,e.y-sh.y)<60){e.shieldBubble=Math.max(e.shieldBubble||0,20);}
    });
  });
  G.enemies.forEach(q=>{
    if(q.special!=='spawner')return;
    q.spawnTimer=(q.spawnTimer||0)+1;
    if(q.spawnTimer>=q.spawnInterval){
      q.spawnTimer=0;
      spawnEnemyAt(G,'normal',q.x+(Math.random()-0.5)*30,q.y+(Math.random()-0.5)*30,'late');
      q.spawnInterval=Math.max(60,q.spawnInterval-5);
    }
  });
  G.enemies.forEach(e=>{if(e.hivebuff>0)e.hivebuff--;else{if(!e.immuneDot&&e.typeKey==='normal')e.immuneDot=false;}});
  G.enemies.forEach(e=>{if(e.shieldBubble>0)e.shieldBubble--;});
}

// ── 敌人生成调度（提取自_update）──
function updateEnemySpawning(G,sec){
  if(G.bossMode)return;
  G.spawnTimer++;
  const earlyReduction=sec<60?0.80:sec<120?0.90:1;
  const comboMult=G.combo>=300?0.45:1;
  const rate=Math.max(8,(75-G.phase*12-G.lv*1.5)*(G.spawnMult||1)/1.6*comboMult/earlyReduction);
  if(G.spawnTimer>=rate){
    G.spawnTimer=0;
    const baseSpawn=G.combo>=300?3:1;
    for(let i=0;i<baseSpawn;i++)spawnEnemy(G);
    if(G.phase>=2&&sec>120)spawnEnemy(G);
    if((G.phase>=4||G.combo>=300)&&sec>180){spawnEnemy(G);spawnEnemy(G);}
    if(G.combo>=300&&Math.random()<0.3)spawnEnemyAt(G,'berserker',Math.random()<0.5?-15:W+15,Math.random()*H,'late');
  }
}

// ── 灵虫生成调度（提取自_update）──
function updateBugSpawning(G){
  G.bugTimer++;
  const bugRate=Math.max(50,130*(G.spawnMult||1));
  const cap=10+G.lv*2+G.swarmBonus;
  if(G.bugTimer>=bugRate&&G.bugs.length<cap){G.bugTimer=0;spawnBug(1);}
}

// ── 小虫副炮系统（提取自_update）──
function updateBugSubCannons(G){
  if(G.bugs.length>0){
    G.bugShotTimer=(G.bugShotTimer||0)+1;
    if(G.bugShotTimer>=45){
      G.bugShotTimer=0;
      const attackSlots=G.slots.filter(sl=>{
        if(!sl.id)return false;
        const w=WEAPONS[sl.id];
        return w.onFire&&(w.type==='attack'||w.type==='evolve');
      });
      if(attackSlots.length>0){
        const sl=attackSlots[Math.floor(Math.random()*attackSlots.length)];
        const w=WEAPONS[sl.id];
        const srcBug=G.bugs[Math.floor(Math.random()*G.bugs.length)];
        const tgt=nearestEnemyTo(G,srcBug.x,srcBug.y);
        if(tgt){
          const dx=tgt.x-srcBug.x,dy=tgt.y-srcBug.y,dist=Math.hypot(dx,dy)||1;
          const atkMult=G.buffs.atk;
          const jitter=(Math.random()-0.5)*0.5;
          const ang=Math.atan2(dy,dx)+jitter;
          let bulletOpts;
          if(sl.id==='lightning_bug'||sl.id==='thunder_swarm'){
            bulletOpts={dmg:(3.5+sl.lv*1.5)*atkMult*0.2,r:3,color:'#C9E054',life:50,isLightning:true,isBugShot:true};
          } else if(sl.id==='poison_spit'||sl.id==='poison_cloud'){
            bulletOpts={dmg:1.2*atkMult*0.2,r:4,color:'#639922',life:55,poison:120,isBugShot:true};
          } else if(sl.id==='spore_cannon'||sl.id==='spore_storm'){
            bulletOpts={dmg:(2.4+sl.lv)*atkMult*0.2,r:4,color:'#9FE1CB',life:60,isBugShot:true};
          } else {
            bulletOpts={dmg:2*atkMult*0.2,r:3,color:'#aaddff',life:50,isBugShot:true};
          }
          addProj(G,srcBug.x,srcBug.y,Math.cos(ang)*5,Math.sin(ang)*5,bulletOpts);
        }
      }
    }
  } else {
    G.bugShotTimer=0;
  }
}

// ── 灵虫AI（提取自_update）──
function updateBugAI(G){
  const allTargets=[...G.enemies];if(G.boss)allTargets.push(G.boss);
  const comboScale=1+(G.comboTier||0)*0.12;
  const phaseScale=1+G.phase*0.15;

  G.bugs.forEach((b,bi)=>{
    b.age++;
    if(!b._orbitR)b._orbitR=30+Math.random()*35+(bi%3)*12;
    if(!b._orbitSpd)b._orbitSpd=0.015+Math.random()*0.025;
    if(!b._orbitAng)b._orbitAng=Math.random()*Math.PI*2;
    if(!b._wobblePh)b._wobblePh=Math.random()*Math.PI*2;
    b._wobblePh+=0.04+Math.random()*0.02;

    let tgt=null;
    if(b.targetId!=null){tgt=allTargets.find(e=>e.id===b.targetId&&e.hp>0);if(!tgt)b.targetId=null;}
    if(!tgt&&allTargets.length>0){
      const nearest=allTargets.filter(e=>e.hp>0).sort((a,b2)=>Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(b2.x-b.x,b2.y-b.y));
      if(nearest.length>0){tgt=nearest[0];b.targetId=tgt.id;}
    }
    if(tgt){
      const nd=Math.hypot(tgt.x-b.x,tgt.y-b.y);
      const spd=(1.6+(b.elite?0.7:0));
      const wobble=Math.sin(b._wobblePh)*Math.min(nd*0.06,1.8);
      const dx=(tgt.x-b.x)/nd,dy=(tgt.y-b.y)/nd;
      b.vx=b.vx*0.80+(dx+(-dy)*wobble)*spd*0.20;
      b.vy=b.vy*0.80+(dy+(dx)*wobble)*spd*0.20;
      if(nd<20){b.atkTimer++;const atkCd=Math.max(8,22-G.comboTier*1.5);if(b.atkTimer>=atkCd){
        b.atkTimer=0;const atkMult=G.buffs.atk*(G.activeBuild==='swarm'?(G.bugAtkMult||1.6):1);
        const dmg=(b.elite?3.0:1.6)*atkMult*comboScale*phaseScale/(tgt.defMult||1)/(tgt.shield?3:1)/(tgt.shieldBubble>0?2:1);
        tgt.hp-=dmg+(G.buffs.dmgFlat||0);
        if(tgt.shield>0&&!tgt.immuneDot)tgt.shield=Math.max(0,tgt.shield-0.15);
        if(G.leechLv>=3){G.mhp=Math.min(G.mmaxhp,G.mhp+0.3);triggerTreasureFlash();}
        if(Math.random()<0.4)addDamageText(G,tgt.x+(Math.random()-0.5)*8,tgt.y-2,Math.ceil(dmg)+'','#5DCAA5',13);
        addPt(G,tgt.x,tgt.y,'#1D9E75',2,1.2);
        if(tgt.hp<=0)b.targetId=null;
      }}
    } else {
      b._orbitAng+=b._orbitSpd;
      const tx=G.mx+Math.cos(b._orbitAng)*b._orbitR;
      const ty=G.my+Math.sin(b._orbitAng)*b._orbitR*0.7;
      const dx=tx-b.x,dy=ty-b.y,dd=Math.hypot(dx,dy)||1;
      const attract=dd>60?0.22:dd>20?0.12:0.04;
      b.vx=b.vx*0.86+(dx/dd+Math.sin(b._wobblePh)*0.5)*attract;
      b.vy=b.vy*0.86+(dy/dd+Math.cos(b._wobblePh)*0.5)*attract;
    }
    const mv=Math.hypot(b.vx,b.vy);const maxSpd=3.2+comboScale*0.3;
    if(mv>maxSpd){b.vx=b.vx/mv*maxSpd;b.vy=b.vy/mv*maxSpd;}
    b.x=Math.max(5,Math.min(W-5,b.x+b.vx));b.y=Math.max(5,Math.min(H-5,b.y+b.vy));
    allTargets.forEach(e=>{
      if(e.hp>0&&Math.hypot(b.x-e.x,b.y-e.y)<e.sz/2+b.sz+2){
        const contactDmg=(0.2+b.sz*0.1)*G.buffs.atk*comboScale/(e.defMult||1);
        e.hp-=contactDmg;
        if(G.elapsed%8===0)addPt(G,e.x,e.y,'#3DCAC5',1,0.6);
      }
    });
  });
}

// ── 敌人AI（提取自_update）──
function updateEnemyAI(G,sec){
  G.enemies.forEach(e=>{
    if(e.poison>0&&!e.immuneDot){e.poison--;if(e.poison%16===0){e.hp-=0.6/e.defMult;addPt(G,e.x,e.y,'#639922',2,0.7);}}
    if(e.kbCd>0)e.kbCd--;if(e.slowTimer>0)e.slowTimer--;if(e.freezeTimer>0)e.freezeTimer--;
    if(e.frostDot>0){e.frostDot--;if(G.elapsed%30===0&&e._frostDmg>0){e.hp-=e._frostDmg;if(G.elapsed%60===0)addPt(G,e.x,e.y,'#88CCFF',2,0.8);}}
    const spdMult=e.slowTimer>0?0.3:1;
    if(e.freezeTimer>0){e.vx*=0.3;e.vy*=0.3;}else{e.vx*=0.88;e.vy*=0.88;}
    if(e.rage&&e.rage>1){e.spd=Math.min(e.spd*1.0006,e.spd*1.45);}

    if(e.special==='shield'){
      e.shieldCd=(e.shieldCd||0)+1;
      if(e.shield<=0&&e.shieldCd>180){e.shield=1;e.shieldCd=0;addPt(G,e.x,e.y,'#4488CC',5,1.5);}
    }
    if(e.special==='jumper'){
      e.jumpTimer=(e.jumpTimer||0)+1;
      if(!e.jumping&&e.jumpTimer>=e.jumpCd){
        e.jumpTimer=0;e.jumping=true;
        const dx=G.mx-e.x,dy=G.my-e.y,d=Math.hypot(dx,dy)||1;
        e.jumpVx=(dx/d)*8;e.jumpVy=(dy/d)*8;
        addPt(G,e.x,e.y,'#FF6644',5,2);
        const landX=e.x+e.jumpVx*6,landY=e.y+e.jumpVy*6;
        setTimeout(()=>{if(!G||G.dead)return;addExplosionWave(G,landX,landY,30,'#FF6644');if(Math.hypot(G.mx-landX,G.my-landY)<30){applyPlayerDamage(G,4);applyReflect(G,4);}},250/SPEED);
      }
      if(e.jumping){e.vx+=e.jumpVx*0.15;e.vy+=e.jumpVy*0.15;e.jumpVx*=0.88;e.jumpVy*=0.88;
        if(Math.hypot(e.jumpVx,e.jumpVy)<0.5)e.jumping=false;}
    }
    if(e.special==='devourer'){
      if(e.devourCount>=3){e.sz=Math.min(24,e.sz+2);e.hp+=8;e.maxhp+=8;e.devourCount=0;e.atk*=1.05;addPt(G,e.x,e.y,'#AA7744',8,2);
        if(e.sz>=22)e.special='elite';
      }
    }
    if(e.special==='regen'&&e.hp<e.maxhp)e.hp=Math.min(e.maxhp,e.hp+e.regenRate);
    if(e.special==='corruptor'&&G.elapsed%120===0){
      G.infectionMap.push({x:e.x,y:e.y,r:25+Math.random()*20,life:400,pulse:Math.random()*999,hostile:Math.floor(G.elapsed/60)>360});
    }

    if(e.special==='ranged'){
      const dx=G.mx-e.x,dy=G.my-e.y,d=Math.hypot(dx,dy)||1;
      if(d<e.keepDist){let fx=-(dx/d)*e.spd*spdMult*0.15,fy=-(dy/d)*e.spd*spdMult*0.15;if(G.viewMode==='vertical'){fx=0;fy*=1.4;}e.vx+=fx;e.vy+=fy;}
      else{e.vx+=(dx/d)*e.spd*spdMult*0.08;e.vy+=(dy/d)*e.spd*spdMult*0.08;}
      e.rangedTimer++;if(e.rangedTimer>=e.rangedCd&&d<200){e.rangedTimer=0;e.rangedCd=70+Math.floor(Math.random()*20);addProj(G,e.x,e.y,(dx/d)*3.5,(dy/d)*3.5,{dmg:e.atk*5,r:4,color:'#A060C0',life:80,isEnemyBullet:true});}
    } else if(e.special==='suicidal'){
      const dx=G.mx-e.x,dy=G.my-e.y,d=Math.hypot(dx,dy)||1;
      const urgency=1+Math.min(3,(1-e.hp/e.maxhp)*2);
      e.vx+=(dx/d)*e.spd*spdMult*0.14*urgency;e.vy+=(dy/d)*e.spd*spdMult*0.14*urgency;
    } else if(e.special==='void'){
      const dx=G.mx-e.x,dy=G.my-e.y,d=Math.hypot(dx,dy)||1;
      e.vx+=(dx/d)*e.spd*spdMult*0.12;e.vy+=(dy/d)*e.spd*spdMult*0.12;
    } else if(e.special==='spawner'){
      const dx=G.mx-e.x,dy=G.my-e.y,d=Math.hypot(dx,dy)||1;
      e.vx+=(dx/d)*e.spd*spdMult*0.06;e.vy+=(dy/d)*e.spd*spdMult*0.06;
    } else if(e.special==='hivemind'){
      let cx=0,cy=0,cnt=0;
      G.enemies.forEach(o=>{if(o!==e&&Math.hypot(o.x-e.x,o.y-e.y)<120){cx+=o.x;cy+=o.y;cnt++;}});
      if(cnt>0){cx/=cnt;cy/=cnt;const dx=cx-e.x,dy=cy-e.y,d=Math.hypot(dx,dy)||1;e.vx+=(dx/d)*e.spd*spdMult*0.05;}
      else{const dx=G.mx-e.x,dy=G.my-e.y,d=Math.hypot(dx,dy)||1;e.vx+=(dx/d)*e.spd*spdMult*0.08;e.vy+=(dy/d)*e.spd*spdMult*0.08;}
    } else {
      const dx=G.mx-e.x,dy=G.my-e.y,d=Math.hypot(dx,dy)||1;
      let cx=(dx/d)*e.spd*spdMult*0.1,cy=(dy/d)*e.spd*spdMult*0.1;
      if(G.viewMode==='vertical'){cx*=0.2;cy*=1.3;}
      e.vx+=cx;e.vy+=cy;
    }
    const ev=Math.hypot(e.vx,e.vy);if(ev>e.spd*2.2){e.vx=e.vx/ev*e.spd*2.2;e.vy=e.vy/ev*e.spd*2.2;}
    if(e.special==='void'){e.x+=e.vx;e.y+=e.vy;}
    else{e.x=Math.max(-e.sz,Math.min(W+e.sz,e.x+e.vx));e.y=Math.max(-e.sz,Math.min(H+e.sz,e.y+e.vy));}
    if(G.viewMode==='arena'){e.x=clamp(e.x,e.sz,W-e.sz);e.y=clamp(e.y,e.sz,H-e.sz);}
    const d2=Math.hypot(G.mx-e.x,G.my-e.y);
    e.hitCd=(e.hitCd||0);if(e.hitCd>0)e.hitCd--;
    if(d2<14&&e.hitCd<=0){e.hitCd=35;const dmgDealt=e.atk;applyPlayerDamage(G,dmgDealt);applyReflect(G,dmgDealt);G.noDmgTimer=0;screenShake(4);playSound('hurt');addPt(G,G.mx,G.my,'#E24B4A',3,1.5);addDamageText(G,G.mx+(Math.random()-0.5)*12,G.my-14,'-'+Math.ceil(dmgDealt),'#ff3333',15);}
    if(e.hasKB&&e.kbCd<=0){G.bugs.forEach(b=>{if(Math.hypot(b.x-e.x,b.y-e.y)<e.sz/2+6){knockback(b,e.x,e.y,4);e.kbCd=45;addPt(G,b.x,b.y,'#EF9F27',3,1.5);}});}
  });
}

// ── Boss出场清场 ──
function spawnDissipateParticles(G,x,y,opts){
  const {count,color,duration,spread}=opts;
  for(let i=0;i<count;i++){
    const p=getPt();const a=Math.random()*Math.PI*2;
    p.x=x;p.y=y;p.vx=(Math.random()-0.5)*spread;p.vy=(Math.random()-0.5)*spread-20;
    p.life=1;p.color=color;p.r=3+Math.random()*4;
    G.pts.push(p);
  }
}
function clearAllEnemies(G){
  G.enemies.forEach(e=>spawnDissipateParticles(G,e.x,e.y,{count:12,color:'#aaddff',duration:800,spread:40}));
  G.enemies.length=0;
}
