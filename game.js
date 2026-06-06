// ══════════════════════════════════════════
// 道劫：万法失控 — 主循环/渲染 (game.js)
// _update编排 · draw · HUD · GameOver · Victory
// ══════════════════════════════════════════

// ── 全局状态 ──
let G,mX,mY;
let buffToastTimer=0;
let _treasureFlashCd=0;

// ── Buff提示 ──
function showBuffToast(msg,color){
  const el=document.getElementById('buff-toast');
  el.textContent=msg;el.style.color=color||'#ffcc00';el.style.borderColor=color||'#ffcc00';
  el.style.opacity='1';buffToastTimer=120;
}
function updateBuffToast(){
  if(buffToastTimer>0){buffToastTimer--;
    if(buffToastTimer<=20)document.getElementById('buff-toast').style.opacity=(buffToastTimer/20).toFixed(2);
  }
  updateHudBuffStream();
}
function updateHudBuffStream(){}

// ── 法宝闪光 ──
function triggerTreasureFlash(){
  if(!G||(!G.vaultEquip&&!G.vaultEquip2))return;
  if(G.elapsed-_treasureFlashCd<90)return;
  _treasureFlashCd=G.elapsed;
  const el1=document.getElementById('h-vault-equip');
  const el2=document.getElementById('h-vault-equip2');
  const candidates=[];
  if(el1&&el1.style.display!=='none')candidates.push(el1);
  if(el2&&el2.style.display!=='none')candidates.push(el2);
  if(!candidates.length)return;
  const el=candidates[Math.floor(Math.random()*candidates.length)];
  el.classList.remove('treasure-flash');
  void el.offsetWidth;
  el.classList.add('treasure-flash');
  setTimeout(()=>el.classList.remove('treasure-flash'),220);
  const rect=el.getBoundingClientRect();
  const ft=document.createElement('div');
  ft.className='treasure-float-text';
  ft.textContent='法宝激活';
  ft.style.left=(rect.left+rect.width/2-20)+'px';
  ft.style.top=(rect.top-10)+'px';
  document.body.appendChild(ft);
  setTimeout(()=>ft.remove(),950);
}

// ── Boss触发 ──
function triggerBoss(i){
  clearAllEnemies(G);
  G.stagePhase+=1;
  G.bossMode=true;G.bossPhase=i+1;
  screenShake(6);playSound('boss');
  const def=JSON.parse(JSON.stringify(BOSS_DEFS[i]));
  def.update=BOSS_DEFS[i].update;def.phaseDesc=BOSS_DEFS[i].phaseDesc;
  G.boss={...def,x:W/2,y:-100,vx:0,vy:0,maxhp:def.hp,poison:0,puddles:def.puddles||[],_phase:0};
  document.getElementById('boss-name').textContent=def.name;
  document.getElementById('boss-wrap').classList.add('show');
  setTimeout(resizeCanvas,10);
  showAlert('⚡ BOSS出现：'+def.name);
}

// ── Boss更新（提取自_update）──
function updateBoss(G){
  const boss=G.boss;
  if(boss.poison>0){boss.poison--;if(boss.poison%18===0){boss.hp-=0.35;addPt(G,boss.x,boss.y,'#639922',2,0.8);}}
  if(boss.frostDot>0){boss.frostDot--;if(G.elapsed%30===0&&boss._frostDmg>0)boss.hp-=boss._frostDmg;}
  boss.vx*=0.9;boss.vy*=0.9;
  if(!boss.charging){const dx=G.mx-boss.x,dy=G.my-boss.y,d=Math.hypot(dx,dy)||1;boss.vx+=(dx/d)*boss.spd*0.07;boss.vy+=(dy/d)*boss.spd*0.07;}
  const bv=Math.hypot(boss.vx,boss.vy);if(bv>boss.spd*2){boss.vx=boss.vx/bv*boss.spd*2;boss.vy=boss.vy/bv*boss.spd*2;}
  boss.x+=boss.vx;boss.y+=boss.vy;
  boss.x=Math.max(-boss.sz,Math.min(W+boss.sz,boss.x));boss.y=Math.max(-boss.sz,Math.min(H+boss.sz,boss.y));
  if(boss.update)boss.update(G,boss);
  const phaseDots=boss.phaseDesc||[];const currentPhase=boss._phase||0;
  document.getElementById('boss-phase-dots').textContent=phaseDots.map((p,i)=>i===currentPhase?`[${p}]`:p).join(' → ');
  const bd=Math.hypot(G.mx-boss.x,G.my-boss.y);
  G.bossHitCd=(G.bossHitCd||0);if(G.bossHitCd>0)G.bossHitCd--;
  if(bd<boss.sz/2+12&&!boss.charging&&G.bossHitCd<=0){G.bossHitCd=25;applyPlayerDamage(G,0.5);applyReflect(G,0.5);addPt(G,G.mx,G.my,'#E24B4A',3,2);}
  document.getElementById('boss-bar').style.width=Math.max(0,boss.hp/boss.maxhp*100)+'%';
  if(boss.hp<=0){
    screenShake(18);triggerFlash();playSound('bossdeath');
    addExplosionWave(G,boss.x,boss.y,40,'#ff0000');
    addDamageText(G,boss.x,boss.y,'天道审判','#ff3300',34);
    addPt(G,boss.x,boss.y,'#EF9F27',25,4);addPt(G,boss.x,boss.y,'#E24B4A',15,3);
    G.kills+=boss.reward;G.xp+=boss.reward*8;
    if(G.leechLv>0){G.mhp=Math.min(G.mmaxhp,G.mhp+boss.reward*2);triggerTreasureFlash();}
    const bi=G.bossPhase-1;G.boss=null;G.bossMode=false;
    document.getElementById('boss-wrap').classList.remove('show');
    document.getElementById('boss-phase-dots').textContent='';
    setTimeout(resizeCanvas,10);
    const reqBoss=(G.activeBossAt||BOSS_AT).length-1;
    if(bi>=reqBoss){doVictory();return true;}
    showUpgrade();return true;
  }
  return false;
}

// ── HUD更新 ──
function updateHUD(){
  document.getElementById('h-kills-disp').textContent='☠ '+G.kills;
  document.getElementById('h-lv').textContent=G.lv;
  document.getElementById('xp-bar').style.width=Math.min(100,G.xp/G.xpNext*100)+'%';
  if(!G.bossMode){
    const bossAt=G.activeBossAt||BOSS_AT;
    const maxTime=G.timeLimit>0?G.timeLimit:bossAt[bossAt.length-1];
    const sl=Math.max(0,maxTime-Math.floor(G.elapsed/FPS));
    document.getElementById('h-time').textContent=`${Math.floor(sl/60)}:${(sl%60).toString().padStart(2,'0')}`+(G.timeLimit>0?' ⏳':'');
    if(G.timeLimit>0&&sl<=30)document.getElementById('h-time').style.color='#ff6644';
    else if(!G.bossMode)document.getElementById('h-time').style.color='#D4B8FF';
  } else {
    document.getElementById('h-time').textContent='⚡BOSS';
  }
  const tier=G.comboTier||0;
  const hpPct=G.mhp/G.mmaxhp;
  const tierColors=['','#aaff44','#ffcc00','#ff9900','#ff4400','#ff2200','#cc00ff','#ff00aa','#ff00ff'];
  const tc=tierColors[tier];
  if(tc&&tier>=3){
    document.getElementById('top-bar').style.borderBottomColor=tc+'66';
  } else {
    document.getElementById('top-bar').style.borderBottomColor='rgba(120,80,200,0.35)';
  }
  const _prog=getProgress();
  const _realm=REALMS[Math.min(_prog.realmIdx,REALMS.length-1)];
  document.getElementById('h-realm').textContent=_realm?_realm.name:'练气期';
  const hudEquip=document.getElementById('h-vault-equip');
  if(G.vaultEquip){
    hudEquip.style.display='block';
    const qDef=QUALITY_DEFS.find(x=>x.id===G.vaultEquip.quality);
    const col=qDef?qDef.color:'#ccc';
    hudEquip.textContent=`${G.vaultEquip.icon||'⚡'}${G.vaultEquip.qualityName||''}`;
    hudEquip.style.color=col;
    hudEquip.style.borderColor=col+'55';
  } else {
    hudEquip.style.display='none';
  }
  const hudEquip2=document.getElementById('h-vault-equip2');
  if(G.vaultEquip2){
    hudEquip2.style.display='block';
    const qDef2=QUALITY_DEFS.find(x=>x.id===G.vaultEquip2.quality);
    const col2=qDef2?qDef2.color:'#85B7EB';
    hudEquip2.textContent=`②${G.vaultEquip2.icon||'⚡'}${G.vaultEquip2.qualityName||''}`;
    hudEquip2.style.color=col2;
    hudEquip2.style.borderColor=col2+'55';
  } else {
    hudEquip2.style.display='none';
  }
  const vmEl=document.getElementById('h-viewmode');
  if(vmEl){const labels={free:'🌐 自由',vertical:'↕ 竖版',arena:'🏟 竞技场'};vmEl.textContent=labels[G.viewMode]||G.viewMode;}
}

// ── GameOver ──
function doGameover(){
  if(G.revive&&!G.reviveConsumed){
    G.reviveConsumed=true;G.mhp=G.mmaxhp*0.5;G.shieldHp=0;G.dead=false;
    showAlert('☯ 道心不灭·涅槃重生！','green');
    screenShake(10);playSound('ultra');
    addExplosionWave(G,G.mx,G.my,60,'#ff3322');
    addPt(G,G.mx,G.my,'#ff3322',30,4);
    addDamageText(G,G.mx,G.my-30,'☯ 涅槃重生','#ff3322',30);
    return;
  }
  G.dead=true;
  const p=getProgress();p.bossStreak=0;saveProgress(p);
  const wlist=G.slots.filter(s=>s.id).map(s=>`${WEAPONS[s.id].name}${s.stars?starStr(s.stars):''}Lv.${s.lv}`).join(' ');
  const {realm}=getCurrentStageInfo();
  document.getElementById('r-title').textContent='☠ 渡劫失败·道消魂散';
  document.getElementById('r-title').style.color='#E24B4A';
  document.getElementById('r-sub').textContent=`境界：${realm.name}\n消灭 ${G.kills} 个敌人 · Lv.${G.lv}\n最高连斩: ${G.combo||0}\n武器：${wlist||'无'}`;
  document.getElementById('drop-anim-stage').innerHTML='';
  document.getElementById('drop-post-btns').style.display='none';
  G.lastDrops=generateVictoryDrops(false);
  const hasPendingDrop=G.kills>0&&G.lastDrops.length>0;
  document.getElementById('btn-ad-save').style.display=hasPendingDrop?'block':'none';
  if(hasPendingDrop)startSaveCountdown(5);
  document.getElementById('btn-ad-double').style.display='none';
  document.getElementById('btn-restart').style.display='block';
  document.getElementById('btn-home').style.display='block';
  document.getElementById('result').classList.add('show');
}

// ── Victory ──
function doVictory(){
  G.won=true;
  const p=getProgress();
  p.totalWins=(p.totalWins||0)+1;
  if(G._isReplay&&G._origProg){
    saveProgress({...G._origProg,totalWins:p.totalWins,totalRuns:p.totalRuns});
  } else {
    const ri=Math.min(p.realmIdx,REALMS.length-1);
    const realm=REALMS[ri];
    p.stageCleared=(p.stageCleared||0)+1;
    p.bossStreak=(p.bossStreak||0)+1;
    if(p.stageCleared>=realm.stages){p.realmIdx=Math.min(ri+1,REALMS.length-1);p.stageCleared=0;}
    saveProgress(p);
    showBuffToast('💾 进度已保存','#44ee66');
    checkAchievements(G);
  }
  const newRealm=REALMS[Math.min(p.realmIdx,REALMS.length-1)];
  const wlist=G.slots.filter(s=>s.id).map(s=>`${WEAPONS[s.id].name}${s.stars?starStr(s.stars):''}Lv.${s.lv}`).join(' ');
  const firstRun=p.totalRuns<=1;
  const drops=generateVictoryDrops(firstRun);
  drops.forEach(d=>saveToVault(d.t,d.q,d.b));
  G.lastDrops=drops;
  document.getElementById('r-title').textContent='🌟 渡劫成功·境界提升！';
  document.getElementById('r-title').style.color='#1D9E75';
  document.getElementById('r-sub').textContent=`当前境界：${newRealm.name}\n消灭 ${G.kills} 个敌人 · Lv.${G.lv}\n最高连斩: ${G.combo||0}\n武器：${wlist||'无'}`;
  document.getElementById('btn-ad-save').style.display='none';
  document.getElementById('btn-restart').style.display='none';
  document.getElementById('btn-home').style.display='none';
  document.getElementById('result').classList.add('show');
  showDropAnimation(drops);
}

// ── 主更新 ──
function update(){
  const steps=SPEED>=3?3:SPEED>=2?2:SPEED>=1.5?Math.random()<0.5?1:2:1;
  for(let s=0;s<steps;s++) _update();
}

function _update(){
  if(G.paused||G.dead||G.won)return;
  G.elapsed++;
  const sec=Math.floor(G.elapsed/FPS);

  updateDodge(G);
  updateShieldRegen(G);
  updateCombo(G);
  updateArtifactCombo(G);
  updateDomainGrowth(G);

  updateLateGameRules(G,sec);
  if(G.elapsed%6===0)updateEnemyCooperation(G);
  updateDangerZones(G);

  G.noDmgTimer=(G.noDmgTimer||0)+1;
  TIME_ALERTS.forEach(a=>{if(!shownAlerts.has(a.sec)&&sec>=a.sec){shownAlerts.add(a.sec);showAlert(a.msg,a.cls);}});
  if(alertTimer>0){alertTimer--;if(alertTimer<=0)document.getElementById('alert-banner').classList.remove('show');}
  if(ecoAlertTimer>0){ecoAlertTimer--;if(ecoAlertTimer<=0)document.getElementById('eco-alert').classList.remove('show');}

  const phaseTime=sec;
  const phaseNames=['前期·孵化','中期·扩张','后期·失控','末期·背叛'];
  const phaseIdx=phaseTime<120?0:phaseTime<360?1:phaseTime<480?2:3;
  const phaseLabelEl=document.getElementById('phase-label');
  if(phaseLabelEl)phaseLabelEl.textContent=phaseNames[phaseIdx];

  if(!G.bossMode){
    const bossAt=G.activeBossAt||BOSS_AT;
    for(let i=0;i<bossAt.length;i++){if(!G.bossTriggered[i]&&sec>=bossAt[i]-(G.bossEarly||0)){G.bossTriggered[i]=true;triggerBoss(i);return;}}
  }

  const ms=1.9*G.buffs.spd;
  const prevMx=G.mx,prevMy=G.my;
  if(G.keys['a']||G.keys['A']||G.keys['ArrowLeft'])G.mx=Math.max(14,G.mx-ms);
  if(G.keys['d']||G.keys['D']||G.keys['ArrowRight'])G.mx=Math.min(W-14,G.mx+ms);
  if(G.keys['w']||G.keys['W']||G.keys['ArrowUp'])G.my=Math.max(14,G.my-ms);
  if(G.keys['s']||G.keys['S']||G.keys['ArrowDown'])G.my=Math.min(H-14,G.my+ms);
  applyViewMode(G);

  const moved=Math.hypot(G.mx-prevMx,G.my-prevMy)>0.5;
  if(moved){G.stillTimer=0;}else{G.stillTimer=(G.stillTimer||0)+1;}
  if(G.stillTimer===150)showBuffToast('⚠ 天道压制 · 速移勿停！','#ff8800');
  const stillPressure=Math.min(1,(G.stillTimer||0)/300);
  if(stillPressure>0){
    G.enemies.forEach(e=>{
      const dx=G.mx-e.x,dy=G.my-e.y,d=Math.hypot(dx,dy)||1;
      const surge=1+stillPressure*2.5;
      e.vx+=(dx/d)*e.spd*0.06*surge;
      e.vy+=(dy/d)*e.spd*0.06*surge;
    });
    if(G.stillTimer===180||G.stillTimer===360||G.stillTimer===540){
      for(let i=0;i<3;i++)spawnEnemy(G);
    }
    if(stillPressure>=1&&G.elapsed%90===0){
      applyPlayerDamage(G,0.3);
      addDamageText(G,G.mx+(Math.random()-0.5)*20,G.my-18,'停滞惩罚','#ff8800',11);
    }
  }

  G.phase=G.kills<12?0:G.kills<35?1:G.kills<70?2:G.kills<130?3:4;

  updateEnemySpawning(G,sec);
  updateBugSpawning(G);

  if(G.regenRate&&G.elapsed%60===0)G.mhp=Math.min(G.mmaxhp,G.mhp+G.regenRate*G.mmaxhp);

  updateAllWeapons(G);
  updateBugSubCannons(G);
  updateBugAI(G);
  updateEnemyAI(G,sec);

  if(G.boss){if(updateBoss(G))return;}

  updateProjectiles(G);

  const db=[];
  G.bugs.forEach((b,i)=>{if(b.hp<=0){db.push(i);addPt(G,b.x,b.y,'#5DCAA5',4,1.8);}});
  for(let i=db.length-1;i>=0;i--){recyclePt(G.bugs[db[i]]);G.bugs.splice(db[i],1);}

  const de=[];
  G.enemies.forEach((e,i)=>{
    if(e.hp<=0){
      de.push(i);G.kills++;G.xp+=2+G.phase*2;
      if(G.comboTimer>0){G.combo++;}else{G.combo=1;}
      G.comboTimer=190;
      screenShake(G.combo>=20?6:2);
      addExplosionWave(G,e.x,e.y,12,'#ff6633');
      if(G.combo>=2&&G.combo%10===0)addDamageText(G,e.x,e.y-18,G.combo+' 连斩！','#ff8800',20);
      G.enemies.forEach(other=>{if(other.special==='devourer'&&Math.hypot(other.x-e.x,other.y-e.y)<60)other.devourCount++;});
      const milestoneStep=G.combo>=300?100:80;
      const milestone=Math.floor(G.combo/milestoneStep);
      if(milestone>G.comboMilestone){G.comboMilestone=milestone;const reward=milestone*milestoneStep;screenShake(6);playSound('levelup');showAlert('🔥 '+reward+' 连杀！奖励技能！','green');G.pendingUpgrade=(G.pendingUpgrade||0)+1;}
      if(G.combo===300){showBuffToast('☠ 300连杀 · 世界开始失控！','#ff2200');screenShake(8);for(let j=0;j<5;j++)spawnEnemy(G);}
      playSound(e.special==='elite'||e.special==='suicidal'?'hit':'kill');
      if(e.special==='elite'||e.special==='suicidal')G.eliteFlash=35;
      addPt(G,e.x,e.y,'#EF9F27',5,2.2);
      if(e.special==='spawner'){showEcoAlert('✓ 孵化核消灭！');G.enemies.forEach(other=>other.slowTimer=Math.max(other.slowTimer||0,120));}
      if(e.special==='bomber'||e.special==='suicidal'){
        addPt(G,e.x,e.y,'#E85D24',18,3);addExplosionWave(G,e.x,e.y,e.explodeR,'#E85D24');
        G.bugs.forEach(b=>{if(Math.hypot(b.x-e.x,b.y-e.y)<e.explodeR){b.hp-=e.explodeDmg*0.3;knockback(b,e.x,e.y,6);}});
        const edist=Math.hypot(G.mx-e.x,G.my-e.y);if(edist<e.explodeR){const exDmg=e.explodeDmg*(1-edist/e.explodeR);applyPlayerDamage(G,exDmg);applyReflect(G,exDmg);}
      }
      if(Math.random()<(G.killSpawn||0))spawnBug(1,e.x,e.y);
      if(G.leechLv>=1){G.mhp=Math.min(G.mmaxhp,G.mhp+0.8*G.leechLv);triggerTreasureFlash();}
      if(G.leechRate>0){G.mhp=Math.min(G.mmaxhp,G.mhp+e.maxhp*G.leechRate);triggerTreasureFlash();}
      if(G.deathSync&&G.mhp/G.mmaxhp<0.3)G.mhp=Math.min(G.mmaxhp,G.mhp+3);
    }
  });
  for(let i=de.length-1;i>=0;i--)G.enemies.splice(de[i],1);

  if(G.arcs){G.arcs.forEach(a=>a.life--);G.arcs=G.arcs.filter(a=>a.life>0);}
  G.pts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vx*=0.9;p.vy*=0.9;p.life-=0.022;p.r*=0.96;});
  G.pts=G.pts.filter(p=>{if(p.life<=0){recyclePt(p);return false;}return true;});

  if(G.xp>=G.xpNext){G.xp-=G.xpNext;G.xpNext=Math.floor(G.xpNext*1.38/(G.xpBoost||1));G.lv++;screenShake(4);playSound('levelup');showUpgrade();return;}
  if((G.pendingUpgrade||0)>0&&!G.upgrading){G.pendingUpgrade--;showUpgrade();return;}
  if(G.timeLimit>0&&G.elapsed/FPS>=G.timeLimit){G.won=false;doGameover();return;}
  if(G.mhp<=0){doGameover();return;}
  if(G.bugs.length===0&&G.enemies.length>10)applyPlayerDamage(G,0.06);
  updateBuffToast();
  updateHUD();
}

// ══════ 场景环境绘制 ══════
function drawMapEnvironment(ctx,G){
  const id=G.stageId||1;const t=G.elapsed;

  // 固定随机偏移（存入G，避免每帧重算抖动）
  if(!G._mapSeed){
    G._mapSeed=true;
    G._cracks=[[W*0.15,H*0.1,W*0.45,H*0.55],[W*0.55,H*0.2,W*0.75,H*0.7],[W*0.3,H*0.65,W*0.6,H*0.85],[W*0.7,H*0.15,W*0.4,H*0.5]];
    G._crackOff=G._cracks.map(()=>[(Math.random()-.5)*35,(Math.random()-.5)*35]);
    G._stoneBreaks=Array.from({length:6},()=>[Math.floor(Math.random()*12)*55,Math.floor(Math.random()*8)*55]);
    G._mossPos=Array.from({length:8},()=>[Math.random()*W,Math.random()*H,8+Math.random()*14,3+Math.random()*5,Math.random()*Math.PI]);
    G._wallCracks=Array.from({length:12},()=>[Math.floor(Math.random()*(W/60))*60+(Math.random()*20),Math.sin(Math.random()*10)*8,6+Math.random()*18]);
  }

  // 环境粒子系统
  if(!G.envParticles)G.envParticles=[];
  G.envParticles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life--;});
  G.envParticles=G.envParticles.filter(p=>p.life>0);

  function _esp(x,y,vx,vy,life,color,size,scene){
    if(G.envParticles.length>=40)return;
    G.envParticles.push({x,y,vx,vy,life,maxLife:life,color,size,_scene:scene});
  }
  function _spawn(scene,maxN,fn){
    if(G.envParticles.filter(p=>p._scene===scene).length<maxN&&Math.random()<0.04)fn();
  }
  function _drawP(scene){
    ctx.save();
    G.envParticles.forEach(p=>{
      if(p._scene!==scene)return;
      const a=Math.min(1,p.life/p.maxLife*1.5)*0.75;
      ctx.globalAlpha=a;ctx.fillStyle=p.color;
      ctx.beginPath();ctx.arc(p.x,p.y,p.size*(0.4+0.6*p.life/p.maxLife),0,Math.PI*2);ctx.fill();
    });
    ctx.restore();
  }

  // ── 第1关：废弃丹室 ── 错缝砖墙+破损炼丹炉+灵石粒子
  function _s1(){
    ctx.save();
    // 错缝砖墙（竖缝）
    ctx.strokeStyle='rgba(200,140,70,0.32)';ctx.lineWidth=1;
    for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    // 横缝（错缝）
    ctx.strokeStyle='rgba(200,140,70,0.28)';
    for(let y=0;y<H;y+=28){
      ctx.beginPath();ctx.moveTo(y%56===0?20:0,y);ctx.lineTo(W,y);ctx.stroke();
    }
    // 砖缝阴影（偶数列加深）
    ctx.strokeStyle='rgba(80,40,10,0.12)';ctx.lineWidth=2;
    for(let x=0;x<W;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}

    // 破损炼丹炉（右上，明显大）
    const fx=W*0.72,fy=H*0.24;
    ctx.globalAlpha=0.45;ctx.strokeStyle='#9B8060';ctx.lineWidth=3;
    // 炉身上半
    ctx.beginPath();ctx.arc(fx,fy,36,Math.PI,0);ctx.stroke();
    // 炉腿
    ctx.beginPath();ctx.moveTo(fx-36,fy);ctx.lineTo(fx-40,fy+44);ctx.stroke();
    ctx.beginPath();ctx.moveTo(fx+36,fy);ctx.lineTo(fx+40,fy+44);ctx.stroke();
    // 炉底
    ctx.beginPath();ctx.arc(fx,fy+44,40,0,Math.PI);ctx.stroke();
    // 炉口环
    ctx.globalAlpha=0.3;ctx.strokeStyle='#7a6040';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.ellipse(fx,fy,36,10,0,Math.PI,0);ctx.stroke();
    // 破损裂缝
    ctx.globalAlpha=0.35;ctx.strokeStyle='#604020';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(fx-10,fy-20);ctx.lineTo(fx+14,fy+6);ctx.stroke();
    ctx.beginPath();ctx.moveTo(fx+6,fy-26);ctx.lineTo(fx-8,fy+2);ctx.stroke();
    // 炉底阴影填充
    ctx.globalAlpha=0.12;ctx.fillStyle='#3a2010';
    ctx.beginPath();ctx.arc(fx,fy+44,38,0,Math.PI);ctx.fill();

    // 左侧小丹炉残骸
    const fx2=W*0.18,fy2=H*0.62;
    ctx.globalAlpha=0.28;ctx.strokeStyle='#8a7050';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(fx2,fy2,18,Math.PI,0);ctx.stroke();
    ctx.beginPath();ctx.moveTo(fx2-18,fy2);ctx.lineTo(fx2-20,fy2+22);ctx.stroke();
    ctx.beginPath();ctx.moveTo(fx2+18,fy2);ctx.lineTo(fx2+20,fy2+22);ctx.stroke();

    // 地面焦痕
    ctx.globalAlpha=0.10;ctx.fillStyle='#201008';
    ctx.beginPath();ctx.ellipse(fx,fy+60,50,14,0,0,Math.PI*2);ctx.fill();

    // 灵石粒子（数量翻倍，更亮）
    _spawn(1,12,()=>_esp(
      Math.random()*W,Math.random()*H,
      (Math.random()-.5)*0.4,-0.25-Math.random()*0.55,
      160+Math.random()*200,
      ['rgba(100,255,140,0.75)','rgba(140,255,180,0.65)','rgba(80,220,120,0.70)'][Math.floor(Math.random()*3)],
      1.5+Math.random()*2.8,1
    ));
    _drawP(1);
    ctx.restore();
  }

  // ── 第2关：龟裂洞府 ── 大裂缝+结界残片+蓝光渗出
  function _s2(){
    ctx.save();

    // 裂缝（固定位置，不抖动）
    ctx.strokeStyle='rgba(140,120,100,0.45)';ctx.lineWidth=2;
    G._cracks.forEach(([x1,y1,x2,y2],[off])=>{
      const [ox,oy]=G._crackOff[G._cracks.indexOf([x1,y1,x2,y2])]||[0,0];
      ctx.beginPath();
      ctx.moveTo(x1,y1);
      ctx.lineTo((x1+x2)/2+ox,(y1+y2)/2+oy);
      ctx.lineTo(x2,y2);
      ctx.stroke();
    });
    // 直接用固定偏移绘制
    ctx.strokeStyle='rgba(140,120,100,0.45)';ctx.lineWidth=2.5;
    G._cracks.forEach(([x1,y1,x2,y2],i)=>{
      const [ox,oy]=G._crackOff[i];
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo((x1+x2)/2+ox,(y1+y2)/2+oy);ctx.lineTo(x2,y2);ctx.stroke();
      // 分支
      ctx.strokeStyle='rgba(120,100,80,0.30)';ctx.lineWidth=1.2;
      ctx.beginPath();ctx.moveTo((x1+x2)/2+ox,(y1+y2)/2+oy);ctx.lineTo((x1+x2)/2+ox+G._crackOff[(i+1)%4][0]*0.5,(y1+y2)/2+oy+G._crackOff[(i+1)%4][1]*0.5);ctx.stroke();
      ctx.strokeStyle='rgba(140,120,100,0.45)';ctx.lineWidth=2.5;
    });

    // 裂缝内蓝光渗出
    ctx.globalAlpha=0.12+Math.sin(t*0.04)*0.06;
    G._cracks.forEach(([x1,y1,x2,y2],i)=>{
      const [ox,oy]=G._crackOff[i];
      const grd=ctx.createLinearGradient(x1,y1,x2,y2);
      grd.addColorStop(0,'rgba(80,140,255,0)');grd.addColorStop(0.5,'rgba(100,160,255,0.4)');grd.addColorStop(1,'rgba(80,140,255,0)');
      ctx.strokeStyle=grd;ctx.lineWidth=4;
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo((x1+x2)/2+ox,(y1+y2)/2+oy);ctx.lineTo(x2,y2);ctx.stroke();
    });

    // 墙壁裂纹（顶部，固定）
    ctx.globalAlpha=0.28;ctx.strokeStyle='#706860';ctx.lineWidth=1;
    G._wallCracks.forEach(([x,bx,h])=>{
      ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+bx,h);ctx.stroke();
    });

    // 结界残片（三处，明亮闪烁）
    const shards=[[W*0.2,H*0.15],[W*0.55,H*0.3],[W*0.78,H*0.62]];
    shards.forEach(([dx,dy],i)=>{
      ctx.globalAlpha=0.30+Math.sin(t*0.05+i*1.5)*0.18;
      ctx.strokeStyle='rgba(120,170,255,0.9)';ctx.lineWidth=1.5;
      // 菱形残片
      ctx.beginPath();ctx.moveTo(dx,dy-10);ctx.lineTo(dx+7,dy);ctx.lineTo(dx,dy+10);ctx.lineTo(dx-7,dy);ctx.closePath();ctx.stroke();
      // 内光
      ctx.globalAlpha=0.15+Math.sin(t*0.05+i*1.5)*0.10;
      ctx.fillStyle='rgba(100,160,255,0.5)';ctx.fill();
      // 光晕
      ctx.globalAlpha=0.08+Math.sin(t*0.05+i*1.5)*0.05;
      ctx.beginPath();ctx.arc(dx,dy,20,0,Math.PI*2);
      const grd=ctx.createRadialGradient(dx,dy,2,dx,dy,20);
      grd.addColorStop(0,'rgba(80,140,255,0.25)');grd.addColorStop(1,'rgba(80,140,255,0)');
      ctx.fillStyle=grd;ctx.fill();
    });

    _drawP(2);ctx.restore();
  }

  // ── 第3关：残破宗门广场 ── 大石板+青苔+断旗+柱子
  function _s3(){
    ctx.save();
    const gs=58;
    // 大块石板格
    ctx.strokeStyle='rgba(160,148,128,0.35)';ctx.lineWidth=1.5;
    for(let x=0;x<W;x+=gs){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=gs){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    // 石板凹陷（固定位置）
    ctx.globalAlpha=0.18;ctx.fillStyle='rgba(40,34,24,0.6)';
    G._stoneBreaks.forEach(([rx,ry])=>ctx.fillRect(rx+5,ry+5,gs-10,gs-10));
    // 石板缝深色
    ctx.globalAlpha=0.12;ctx.strokeStyle='rgba(20,16,10,0.8)';ctx.lineWidth=2;
    for(let x=0;x<W;x+=gs*2){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}

    // 青苔（固定位置，明显椭圆）
    ctx.globalAlpha=0.30;ctx.fillStyle='#3a7a38';
    G._mossPos.forEach(([mx,my,rw,rh,ang])=>{
      ctx.beginPath();ctx.ellipse(mx,my,rw,rh,ang,0,Math.PI*2);ctx.fill();
    });
    // 青苔高光
    ctx.globalAlpha=0.12;ctx.fillStyle='#5aaa50';
    G._mossPos.forEach(([mx,my,rw,rh,ang])=>{
      ctx.beginPath();ctx.ellipse(mx-rw*0.2,my-rh*0.3,rw*0.5,rh*0.4,ang,0,Math.PI*2);ctx.fill();
    });

    // 断裂旗帜（左侧，明显）
    const fp=W*0.15;
    ctx.globalAlpha=0.55;ctx.strokeStyle='#999';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(fp,H*0.08);ctx.lineTo(fp,H*0.52);ctx.stroke();
    // 旗帜布料
    ctx.globalAlpha=0.38;ctx.fillStyle='#cc5533';
    ctx.beginPath();ctx.moveTo(fp,H*0.10);ctx.lineTo(fp+46,H*0.15);ctx.lineTo(fp+40,H*0.30);ctx.lineTo(fp,H*0.28);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#aa3311';ctx.lineWidth=1;ctx.stroke();
    // 撕裂碎片
    ctx.globalAlpha=0.25;ctx.fillStyle='#cc5533';
    ctx.beginPath();ctx.moveTo(fp,H*0.13);ctx.lineTo(fp-16,H*0.17);ctx.lineTo(fp-12,H*0.24);ctx.lineTo(fp,H*0.22);ctx.closePath();ctx.fill();
    // 旗帜纹样
    ctx.globalAlpha=0.15;ctx.strokeStyle='#ffaa44';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(fp+8,H*0.14);ctx.lineTo(fp+36,H*0.17);ctx.moveTo(fp+6,H*0.20);ctx.lineTo(fp+34,H*0.23);ctx.stroke();

    // 右侧残破石柱
    const col1x=W*0.82,col1y=H*0.5;
    ctx.globalAlpha=0.22;ctx.fillStyle='#7a7060';
    ctx.fillRect(col1x-14,H*0.15,28,H*0.7);
    ctx.globalAlpha=0.10;ctx.fillStyle='#aaa090';
    ctx.fillRect(col1x-12,H*0.15,12,H*0.7); // 高光边
    ctx.globalAlpha=0.18;ctx.strokeStyle='#5a5040';ctx.lineWidth=1;
    for(let cy2=H*0.2;cy2<H*0.8;cy2+=22){ctx.beginPath();ctx.moveTo(col1x-14,cy2);ctx.lineTo(col1x+14,cy2);ctx.stroke();}
    // 柱顶破损
    ctx.globalAlpha=0.20;ctx.fillStyle='#6a6050';
    ctx.beginPath();ctx.moveTo(col1x-14,H*0.15);ctx.lineTo(col1x-20,H*0.08);ctx.lineTo(col1x+8,H*0.12);ctx.lineTo(col1x+14,H*0.15);ctx.closePath();ctx.fill();

    _drawP(3);ctx.restore();
  }

  // ── 第4关：法宝仓库 ── 符文地板+明亮货架+发光法器
  function _s4(){
    ctx.save();
    // 符文地板网格
    ctx.strokeStyle='rgba(120,160,210,0.28)';ctx.lineWidth=1;
    for(let y=0;y<H;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    for(let x=0;x<W;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    // 符文十字（每格中心）
    ctx.strokeStyle='rgba(100,150,200,0.22)';ctx.lineWidth=1;
    for(let y=25;y<H;y+=50){
      for(let x=25;x<W;x+=50){
        ctx.beginPath();ctx.moveTo(x-6,y);ctx.lineTo(x+6,y);ctx.moveTo(x,y-6);ctx.lineTo(x,y+6);ctx.stroke();
        // 小圆
        ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.stroke();
      }
    }
    // 格子对角线符文
    ctx.globalAlpha=0.10;ctx.strokeStyle='rgba(80,130,180,0.5)';ctx.lineWidth=0.5;
    for(let y=0;y<H;y+=50){
      for(let x=0;x<W;x+=50){
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+50,y+50);ctx.stroke();
      }
    }

    // 货架（双列，更粗更亮）
    ctx.globalAlpha=0.45;ctx.strokeStyle='rgba(180,148,100,0.75)';ctx.lineWidth=3;
    const shelfYs=[H*0.22,H*0.40,H*0.58,H*0.76];
    shelfYs.forEach(sy=>{
      // 左列
      ctx.beginPath();ctx.moveTo(W*0.06,sy);ctx.lineTo(W*0.44,sy);ctx.stroke();
      ctx.beginPath();ctx.moveTo(W*0.06,sy);ctx.lineTo(W*0.06,sy+H*0.16);ctx.stroke();
      ctx.beginPath();ctx.moveTo(W*0.44,sy);ctx.lineTo(W*0.44,sy+H*0.16);ctx.stroke();
      // 右列
      ctx.beginPath();ctx.moveTo(W*0.56,sy);ctx.lineTo(W*0.94,sy);ctx.stroke();
      ctx.beginPath();ctx.moveTo(W*0.56,sy);ctx.lineTo(W*0.56,sy+H*0.16);ctx.stroke();
      ctx.beginPath();ctx.moveTo(W*0.94,sy);ctx.lineTo(W*0.94,sy+H*0.16);ctx.stroke();
    });
    // 货架木纹
    ctx.globalAlpha=0.15;ctx.strokeStyle='rgba(120,88,44,0.5)';ctx.lineWidth=1;
    shelfYs.forEach(sy=>{
      for(let gx=W*0.1;gx<W*0.44;gx+=W*0.08){ctx.beginPath();ctx.moveTo(gx,sy);ctx.lineTo(gx,sy+H*0.16);ctx.stroke();}
      for(let gx=W*0.62;gx<W*0.94;gx+=W*0.08){ctx.beginPath();ctx.moveTo(gx,sy);ctx.lineTo(gx,sy+H*0.16);ctx.stroke();}
    });

    // 发光法器（更大更亮，有晕圈）
    const artifacts=[
      {x:W*0.15,y:H*0.32,col:'#44ccee',col2:'rgba(40,180,220,'},
      {x:W*0.30,y:H*0.50,col:'#ee9944',col2:'rgba(220,140,40,'},
      {x:W*0.68,y:H*0.28,col:'#aa66ff',col2:'rgba(150,80,255,'},
      {x:W*0.82,y:H*0.65,col:'#44ee88',col2:'rgba(40,210,100,'},
    ];
    artifacts.forEach((a,i)=>{
      const pulse=0.55+Math.sin(t*0.035+i*1.2)*0.25;
      // 光晕
      ctx.globalAlpha=pulse*0.22;
      const grd=ctx.createRadialGradient(a.x,a.y,2,a.x,a.y,22);
      grd.addColorStop(0,a.col2+'0.5)');grd.addColorStop(1,a.col2+'0)');
      ctx.fillStyle=grd;ctx.beginPath();ctx.arc(a.x,a.y,22,0,Math.PI*2);ctx.fill();
      // 核心
      ctx.globalAlpha=pulse*0.85;
      ctx.fillStyle=a.col;ctx.shadowBlur=14;ctx.shadowColor=a.col;
      ctx.beginPath();ctx.arc(a.x,a.y,6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      // 十字光芒
      ctx.globalAlpha=pulse*0.40;ctx.strokeStyle=a.col;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(a.x-14,a.y);ctx.lineTo(a.x+14,a.y);ctx.moveTo(a.x,a.y-14);ctx.lineTo(a.x,a.y+14);ctx.stroke();
    });

    _drawP(4);ctx.restore();
  }

  // ── 第5关：豪华厅堂 ── 红毯+大灯笼+屏风+菱形花纹
  function _s5(){
    ctx.save();
    const carpetL=W*0.28,carpetR=W*0.72;
    // 红毯主体（更深更亮）
    ctx.globalAlpha=0.32;ctx.fillStyle='#7a1010';
    ctx.fillRect(carpetL,0,carpetR-carpetL,H);
    // 红毯渐变叠加（中央更亮）
    ctx.globalAlpha=0.12;
    const cg=ctx.createLinearGradient(carpetL,0,carpetR,0);
    cg.addColorStop(0,'rgba(0,0,0,0)');cg.addColorStop(0.5,'rgba(180,20,20,0.3)');cg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=cg;ctx.fillRect(carpetL,0,carpetR-carpetL,H);

    // 地毯金边线（粗）
    ctx.globalAlpha=0.55;ctx.strokeStyle='#D9B060';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(carpetL,0);ctx.lineTo(carpetL,H);ctx.stroke();
    ctx.beginPath();ctx.moveTo(carpetR,0);ctx.lineTo(carpetR,H);ctx.stroke();
    // 内侧细金线
    ctx.globalAlpha=0.25;ctx.strokeStyle='#C9A050';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(carpetL+8,0);ctx.lineTo(carpetL+8,H);ctx.stroke();
    ctx.beginPath();ctx.moveTo(carpetR-8,0);ctx.lineTo(carpetR-8,H);ctx.stroke();

    // 菱形花纹（大而清晰）
    ctx.globalAlpha=0.22;ctx.strokeStyle='#C9A050';ctx.lineWidth=1.5;
    for(let y=-40;y<H+40;y+=80){
      ctx.beginPath();ctx.moveTo(W*0.5,y-40);ctx.lineTo(carpetR-6,y);ctx.lineTo(W*0.5,y+40);ctx.lineTo(carpetL+6,y);ctx.closePath();ctx.stroke();
    }
    // 菱形内小点
    ctx.globalAlpha=0.12;ctx.fillStyle='#D9B060';
    for(let y=0;y<H;y+=80){ctx.beginPath();ctx.arc(W*0.5,y,3,0,Math.PI*2);ctx.fill();}

    // 屏风（更明显）
    const screenX=W*0.06;
    ctx.globalAlpha=0.35;ctx.strokeStyle='#7aaa7a';ctx.lineWidth=2;
    for(let py=H*0.10;py<H*0.80;py+=H*0.23){
      ctx.strokeRect(screenX,py,44,65);
      // 横档
      ctx.beginPath();ctx.moveTo(screenX,py+22);ctx.lineTo(screenX+44,py+22);ctx.stroke();
      ctx.beginPath();ctx.moveTo(screenX,py+44);ctx.lineTo(screenX+44,py+44);ctx.stroke();
      // 腿
      ctx.beginPath();ctx.moveTo(screenX+22,py+65);ctx.lineTo(screenX+22,py+80);ctx.stroke();
      // 竹节纹
      ctx.globalAlpha=0.15;ctx.strokeStyle='#5a8a5a';ctx.lineWidth=1;
      for(let bx=screenX+10;bx<screenX+44;bx+=10){ctx.beginPath();ctx.moveTo(bx,py);ctx.lineTo(bx,py+65);ctx.stroke();}
      ctx.globalAlpha=0.35;ctx.strokeStyle='#7aaa7a';ctx.lineWidth=2;
    }

    // 灯笼（顶部，大而亮）
    const lanternY=26;
    for(let lx=W*0.18;lx<W*0.92;lx+=W*0.22){
      // 挂绳
      ctx.globalAlpha=0.40;ctx.strokeStyle='#886644';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(lx,0);ctx.lineTo(lx,lanternY-14);ctx.stroke();
      // 灯笼主体
      const lpulse=0.55+Math.sin(t*0.025+lx)*0.20;
      ctx.globalAlpha=lpulse*0.70;ctx.fillStyle='#CC3311';
      ctx.beginPath();ctx.ellipse(lx,lanternY,13,16,0,0,Math.PI*2);ctx.fill();
      // 灯笼高光
      ctx.globalAlpha=lpulse*0.25;ctx.fillStyle='#FF8855';
      ctx.beginPath();ctx.ellipse(lx-3,lanternY-4,5,7,0,0,Math.PI*2);ctx.fill();
      // 灯笼边框线
      ctx.globalAlpha=lpulse*0.50;ctx.strokeStyle='#882200';ctx.lineWidth=1;
      ctx.beginPath();ctx.ellipse(lx,lanternY,13,16,0,0,Math.PI*2);ctx.stroke();
      // 横筋
      ctx.globalAlpha=lpulse*0.35;ctx.strokeStyle='#AA4422';ctx.lineWidth=1;
      for(let k=-1;k<=1;k++){ctx.beginPath();ctx.moveTo(lx-13,lanternY+k*5);ctx.lineTo(lx+13,lanternY+k*5);ctx.stroke();}
      // 流苏
      ctx.globalAlpha=lpulse*0.45;ctx.strokeStyle='#DD8833';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(lx,lanternY+16);ctx.lineTo(lx,lanternY+28);ctx.stroke();
      // 光晕
      ctx.globalAlpha=lpulse*0.08;
      const lg=ctx.createRadialGradient(lx,lanternY,4,lx,lanternY,30);
      lg.addColorStop(0,'rgba(255,120,40,0.3)');lg.addColorStop(1,'rgba(255,120,40,0)');
      ctx.fillStyle=lg;ctx.beginPath();ctx.arc(lx,lanternY,30,0,Math.PI*2);ctx.fill();
    }

    _drawP(5);ctx.restore();
  }

  // ── 第6关：修仙食堂 ── 棋盘方砖+大锅炉+蒸汽柱
  function _s6(){
    ctx.save();
    const ts=44;
    // 方砖竖线
    ctx.strokeStyle='rgba(180,158,110,0.30)';ctx.lineWidth=1;
    for(let x=0;x<W;x+=ts){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    // 横线
    ctx.strokeStyle='rgba(180,158,110,0.25)';
    for(let y=0;y<H;y+=ts){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    // 棋盘暗格
    ctx.globalAlpha=0.12;ctx.fillStyle='rgba(80,60,20,0.5)';
    for(let y=0;y<H;y+=ts*2){for(let x=0;x<W;x+=ts*2){ctx.fillRect(x,y,ts,ts);ctx.fillRect(x+ts,y+ts,ts,ts);}}

    // 大锅炉（右侧，主角级）
    const potX=W*0.80,potY=H*0.62;
    // 炉体阴影
    ctx.globalAlpha=0.18;ctx.fillStyle='#000';
    ctx.beginPath();ctx.ellipse(potX,potY+42,40,12,0,0,Math.PI*2);ctx.fill();
    // 炉腿
    ctx.globalAlpha=0.50;ctx.strokeStyle='#666';ctx.lineWidth=4;
    ctx.beginPath();ctx.moveTo(potX-22,potY+26);ctx.lineTo(potX-26,potY+52);ctx.stroke();
    ctx.beginPath();ctx.moveTo(potX+22,potY+26);ctx.lineTo(potX+26,potY+52);ctx.stroke();
    // 炉身
    ctx.globalAlpha=0.55;ctx.strokeStyle='#555';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(potX,potY,32,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=0.20;ctx.fillStyle='#333';
    ctx.beginPath();ctx.arc(potX,potY,30,0,Math.PI*2);ctx.fill();
    // 锅沿
    ctx.globalAlpha=0.45;ctx.strokeStyle='#666';ctx.lineWidth=5;
    ctx.beginPath();ctx.ellipse(potX,potY,32,8,0,Math.PI*1.1,Math.PI*1.9);ctx.stroke();
    // 锅内液面
    ctx.globalAlpha=0.22;ctx.fillStyle='#88aa44';
    ctx.beginPath();ctx.ellipse(potX,potY,26,7,0,0,Math.PI*2);ctx.fill();
    // 铆钉
    ctx.globalAlpha=0.35;ctx.fillStyle='#888';
    for(let k=0;k<8;k++){const ka=k/8*Math.PI*2;ctx.beginPath();ctx.arc(potX+Math.cos(ka)*30,potY+Math.sin(ka)*30,2.5,0,Math.PI*2);ctx.fill();}

    // 第二个小锅（左侧）
    const pot2X=W*0.22,pot2Y=H*0.72;
    ctx.globalAlpha=0.35;ctx.strokeStyle='#555';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(pot2X,pot2Y,18,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=0.12;ctx.fillStyle='#333';ctx.beginPath();ctx.arc(pot2X,pot2Y,16,0,Math.PI*2);ctx.fill();

    // 蒸汽（大量，从两个锅出发）
    _spawn(6,16,()=>{
      const fromMain=Math.random()<0.7;
      const bx=fromMain?potX:pot2X,by=fromMain?potY-32:pot2Y-18;
      _esp(bx+(Math.random()-.5)*24,by,(Math.random()-.5)*0.5,-0.45-Math.random()*0.85,140+Math.random()*180,'rgba(210,210,220,0.50)',3+Math.random()*5,6);
    });
    // 食材碎屑
    _spawn(6,6,()=>_esp(Math.random()*W,Math.random()*H,(Math.random()-.5)*0.25,-0.15-Math.random()*0.25,140+Math.random()*140,['rgba(220,170,60,0.55)','rgba(190,110,40,0.55)','rgba(150,200,60,0.55)'][Math.floor(Math.random()*3)],1.5+Math.random()*2.5,6));

    _drawP(6);ctx.restore();
  }

  // ── 第7关：美容修炼室 ── 浓粉雾气+大花瓣+镜子+地纹
  function _s7(){
    ctx.save();
    // 整体粉色底色晕染
    ctx.globalAlpha=0.18+Math.sin(t*0.012)*0.06;
    const fog=ctx.createRadialGradient(W*0.4,H*0.35,40,W*0.5,H*0.5,H*0.85);
    fog.addColorStop(0,'rgba(255,160,190,0.45)');fog.addColorStop(0.6,'rgba(200,100,150,0.12)');fog.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=fog;ctx.fillRect(0,0,W,H);

    // 地面斜向光纹
    ctx.globalAlpha=0.18;ctx.strokeStyle='rgba(240,180,200,0.4)';ctx.lineWidth=1;
    for(let x=-W;x<W*2;x+=55){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+25,H);ctx.stroke();}

    // 大镜子（左侧，椭圆框）
    const mirX=W*0.14,mirY=H*0.45;
    ctx.globalAlpha=0.35;ctx.strokeStyle='#ddbbcc';ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(mirX,mirY,22,34,0,0,Math.PI*2);ctx.stroke();
    // 镜面反光线
    ctx.globalAlpha=0.20+Math.sin(t*0.03)*0.08;ctx.strokeStyle='rgba(255,240,248,0.6)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(mirX-12,mirY-18);ctx.lineTo(mirX+12,mirY-18);ctx.stroke();
    ctx.globalAlpha=0.12;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(mirX-10,mirY-10);ctx.lineTo(mirX+10,mirY-10);ctx.stroke();
    // 镜子支架
    ctx.globalAlpha=0.28;ctx.strokeStyle='#ccaaaa';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(mirX,mirY+34);ctx.lineTo(mirX,mirY+54);ctx.stroke();
    ctx.beginPath();ctx.moveTo(mirX-16,mirY+54);ctx.lineTo(mirX+16,mirY+54);ctx.stroke();

    // 梳妆台（右侧）
    ctx.globalAlpha=0.22;ctx.strokeStyle='#ccaaaa';ctx.lineWidth=2;
    ctx.strokeRect(W*0.78,H*0.55,W*0.16,H*0.3);
    ctx.beginPath();ctx.moveTo(W*0.78,H*0.62);ctx.lineTo(W*0.94,H*0.62);ctx.stroke();
    // 台面小物件
    ctx.globalAlpha=0.18;ctx.fillStyle='#dd99bb';
    ctx.beginPath();ctx.arc(W*0.82,H*0.58,4,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(W*0.89,H*0.59,3,0,Math.PI*2);ctx.fill();

    // 大量花瓣飘落
    _spawn(7,20,()=>{
      const sx=Math.random()*W,sy=-8;
      const colors=['rgba(255,130,170,0.72)','rgba(255,190,210,0.65)','rgba(255,160,190,0.68)','rgba(240,120,160,0.60)'];
      _esp(sx,sy,(Math.random()-.5)*0.6,0.3+Math.random()*0.7,220+Math.random()*260,colors[Math.floor(Math.random()*colors.length)],2.5+Math.random()*3.5,7);
    });

    _drawP(7);ctx.restore();
  }

  // ── 第8关：紫府祠堂 ── 金纹地板+大族徽+光柱+神龛
  function _s8(){
    ctx.save();
    // 金色网格（60px）
    ctx.strokeStyle='rgba(200,168,88,0.28)';ctx.lineWidth=1;
    for(let x=0;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    // 对角金纹
    ctx.strokeStyle='rgba(200,168,80,0.14)';ctx.lineWidth=1;
    for(let y=-H;y<H*2;y+=120){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y+W*0.5);ctx.stroke();}

    // 族徽（中央上方，大而亮）
    const ex=W*0.5,ey=H*0.20;
    // 外圆
    ctx.globalAlpha=0.40+Math.sin(t*0.018)*0.12;
    ctx.strokeStyle='#D9A840';ctx.lineWidth=2.5;
    ctx.beginPath();ctx.arc(ex,ey,38,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=0.20+Math.sin(t*0.018)*0.06;
    ctx.beginPath();ctx.arc(ex,ey,32,0,Math.PI*2);ctx.stroke();
    // 六芒星
    ctx.globalAlpha=0.38+Math.sin(t*0.018)*0.10;ctx.strokeStyle='#D9A840';ctx.lineWidth=2;
    for(let i=0;i<6;i++){
      const a1=i/6*Math.PI*2-Math.PI/6,a2=(i+2)/6*Math.PI*2-Math.PI/6;
      ctx.beginPath();ctx.moveTo(ex+Math.cos(a1)*28,ey+Math.sin(a1)*28);ctx.lineTo(ex+Math.cos(a2)*28,ey+Math.sin(a2)*28);ctx.stroke();
    }
    // 中心圆
    ctx.globalAlpha=0.30;ctx.beginPath();ctx.arc(ex,ey,10,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=0.15;ctx.fillStyle='#D9A840';ctx.beginPath();ctx.arc(ex,ey,8,0,Math.PI*2);ctx.fill();
    // 外围装饰点
    ctx.globalAlpha=0.28;ctx.fillStyle='#C9A050';
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2;ctx.beginPath();ctx.arc(ex+Math.cos(a)*36,ey+Math.sin(a)*36,2,0,Math.PI*2);ctx.fill();}

    // 四角护盾光柱（更粗更亮）
    const pillars=[[W*0.08,H*0.28],[W*0.92,H*0.28],[W*0.08,H*0.72],[W*0.92,H*0.72]];
    pillars.forEach(([px,py],i)=>{
      const pp=0.30+Math.sin(t*0.03+i*0.8)*0.12;
      ctx.globalAlpha=pp;
      const grad=ctx.createLinearGradient(px,py-100,px,py+100);
      grad.addColorStop(0,'rgba(200,160,60,0)');grad.addColorStop(0.5,'rgba(220,180,80,0.55)');grad.addColorStop(1,'rgba(200,160,60,0)');
      ctx.fillStyle=grad;ctx.fillRect(px-6,py-100,12,200);
      // 光柱顶圆
      ctx.globalAlpha=pp*0.8;ctx.fillStyle='#ffdd88';ctx.shadowBlur=18;ctx.shadowColor='#ffaa44';
      ctx.beginPath();ctx.arc(px,py,7,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      // 底座
      ctx.globalAlpha=pp*0.5;ctx.strokeStyle='#C9A050';ctx.lineWidth=2;
      ctx.strokeRect(px-10,py-5,20,10);
    });

    // 中央神龛轮廓（底部中央）
    ctx.globalAlpha=0.25;ctx.strokeStyle='#B09040';ctx.lineWidth=2;
    ctx.strokeRect(W*0.42,H*0.78,W*0.16,H*0.18);
    ctx.beginPath();ctx.moveTo(W*0.42,H*0.78);ctx.lineTo(W*0.50,H*0.72);ctx.lineTo(W*0.58,H*0.78);ctx.stroke(); // 三角顶

    _drawP(8);ctx.restore();
  }

  // ── 第9关：vlog直播基地 ── 霓虹透视+大光圈+扫描线+RGB粒子
  function _s9(){
    ctx.save();
    // 霓虹地面透视线（消失点中央）
    const vpX=W*0.5,vpY=H*0.38;
    ctx.strokeStyle='rgba(60,220,240,0.28)';ctx.lineWidth=1.5;
    for(let x=-W*0.5;x<W*1.5;x+=55){
      ctx.beginPath();ctx.moveTo(x,H);ctx.lineTo(vpX+(x-vpX)*0.12,vpY);ctx.stroke();
    }
    // 透视横线（远近感）
    for(let frac=0;frac<1;frac+=0.12){
      const y=vpY+(H-vpY)*frac;
      const alpha=0.08+frac*0.18;
      ctx.strokeStyle=`rgba(180,60,220,${alpha})`;ctx.lineWidth=1+frac*1.5;
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();
    }
    // 地面格子（近处）
    ctx.strokeStyle='rgba(40,180,220,0.15)';ctx.lineWidth=1;
    for(let y=H*0.6;y<H;y+=36){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}

    // 扫描线（从上往下循环）
    const scanY=((t*2)%H);
    ctx.globalAlpha=0.12;ctx.strokeStyle='rgba(100,255,200,0.5)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(0,scanY);ctx.lineTo(W,scanY);ctx.stroke();
    ctx.globalAlpha=0.05;ctx.strokeStyle='rgba(100,255,200,0.3)';ctx.lineWidth=8;
    ctx.beginPath();ctx.moveTo(0,scanY);ctx.lineTo(W,scanY);ctx.stroke();

    // 大摄像光圈（3个，清晰）
    const rings=[{x:W*0.18,y:H*0.28},{x:W*0.5,y:H*0.20},{x:W*0.82,y:H*0.32}];
    rings.forEach((r,i)=>{
      const rp=0.28+Math.sin(t*0.04+i*1.8)*0.14;
      ctx.globalAlpha=rp;
      // 多环光圈
      for(let rr=10;rr<=36;rr+=8){
        ctx.strokeStyle=`rgba(80,210,240,${0.6-rr/60})`;ctx.lineWidth=1.5;
        ctx.beginPath();ctx.arc(r.x,r.y,rr,0,Math.PI*2);ctx.stroke();
      }
      // 十字准星
      ctx.strokeStyle='rgba(80,210,240,0.7)';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(r.x-6,r.y);ctx.lineTo(r.x+6,r.y);ctx.moveTo(r.x,r.y-6);ctx.lineTo(r.x,r.y+6);ctx.stroke();
      // REC指示灯
      ctx.globalAlpha=0.6+Math.sin(t*0.08+i)*0.4;
      ctx.fillStyle='#ff4444';ctx.shadowBlur=8;ctx.shadowColor='#ff0000';
      ctx.beginPath();ctx.arc(r.x+30,r.y-22,4,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    });

    // RGB粒子（大量，鲜艳）
    _spawn(9,18,()=>_esp(
      Math.random()*W,Math.random()*H*0.7+H*0.3,
      (Math.random()-.5)*0.35,-0.15,
      90+Math.random()*130,
      ['rgba(255,60,60,0.80)','rgba(60,255,80,0.80)','rgba(60,80,255,0.80)','rgba(255,220,40,0.70)'][Math.floor(Math.random()*4)],
      2+Math.random()*3,9
    ));

    _drawP(9);ctx.restore();
  }

  // ── 第10关：八角擂台 ── 大地板+金边+光柱+云雾+中心纹
  function _s10(){
    ctx.save();
    const cx=W*0.5,cy=H*0.5,pR=Math.min(W,H)*0.42;

    // 擂台外的云雾底色
    ctx.globalAlpha=0.10;
    const outerFog=ctx.createRadialGradient(cx,cy,pR*0.8,cx,cy,pR*1.6);
    outerFog.addColorStop(0,'rgba(0,0,0,0)');outerFog.addColorStop(1,'rgba(180,160,220,0.15)');
    ctx.fillStyle=outerFog;ctx.fillRect(0,0,W,H);

    // 八角形地板主体（明显填充）
    ctx.globalAlpha=0.22;
    ctx.fillStyle='#2c2416';
    ctx.beginPath();
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2-Math.PI/8;i===0?ctx.moveTo(cx+Math.cos(a)*pR,cy+Math.sin(a)*pR):ctx.lineTo(cx+Math.cos(a)*pR,cy+Math.sin(a)*pR);}
    ctx.closePath();ctx.fill();

    // 地板内放射纹（从中心到顶点）
    ctx.globalAlpha=0.10;ctx.strokeStyle='rgba(180,150,80,0.4)';ctx.lineWidth=1;
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2-Math.PI/8;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*pR,cy+Math.sin(a)*pR);ctx.stroke();}

    // 八角形边缘金线（粗亮）
    ctx.globalAlpha=0.55;ctx.strokeStyle='#D9B050';ctx.lineWidth=3;
    ctx.beginPath();
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2-Math.PI/8;i===0?ctx.moveTo(cx+Math.cos(a)*pR,cy+Math.sin(a)*pR):ctx.lineTo(cx+Math.cos(a)*pR,cy+Math.sin(a)*pR);}
    ctx.closePath();ctx.stroke();

    // 内圈虚线
    ctx.globalAlpha=0.28;ctx.strokeStyle='#B09040';ctx.lineWidth=1.5;ctx.setLineDash([8,10]);
    ctx.beginPath();ctx.arc(cx,cy,pR*0.55,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);

    // 中心八角纹（小）
    ctx.globalAlpha=0.20;ctx.strokeStyle='#C9A050';ctx.lineWidth=2;
    ctx.beginPath();
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2-Math.PI/8;i===0?ctx.moveTo(cx+Math.cos(a)*28,cy+Math.sin(a)*28):ctx.lineTo(cx+Math.cos(a)*28,cy+Math.sin(a)*28);}
    ctx.closePath();ctx.stroke();
    // 中心圆
    ctx.globalAlpha=0.15;ctx.beginPath();ctx.arc(cx,cy,16,0,Math.PI*2);ctx.stroke();

    // 8个顶角光柱（高亮）
    for(let i=0;i<8;i++){
      const a=i/8*Math.PI*2-Math.PI/8;
      const px=cx+Math.cos(a)*pR,py=cy+Math.sin(a)*pR;
      const pp=0.35+Math.sin(t*0.04+i*0.8)*0.15;
      // 光柱
      ctx.globalAlpha=pp;
      const grad=ctx.createLinearGradient(px,py-80,px,py);
      grad.addColorStop(0,'rgba(255,220,80,0)');grad.addColorStop(0.4,'rgba(255,200,60,0.55)');grad.addColorStop(1,'rgba(255,180,40,0.15)');
      ctx.fillStyle=grad;ctx.fillRect(px-5,py-80,10,80);
      // 顶点宝珠
      ctx.globalAlpha=pp*0.90;ctx.fillStyle='#ffe888';ctx.shadowBlur=20;ctx.shadowColor='#ffcc44';
      ctx.beginPath();ctx.arc(px,py,6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      // 底座方台
      ctx.globalAlpha=pp*0.55;ctx.strokeStyle='#D9B050';ctx.lineWidth=1.5;
      ctx.strokeRect(px-8,py-4,16,8);
    }

    // 云雾环绕（更多更大）
    for(let i=0;i<24;i++){
      const ca=i/24*Math.PI*2;
      const cr=pR+22+Math.sin(t*0.013+i*0.7)*16;
      const clx=cx+Math.cos(ca)*cr,cly=cy+Math.sin(ca)*cr;
      const cp=0.14+Math.sin(t*0.018+i)*0.06;
      ctx.globalAlpha=cp;ctx.fillStyle='rgba(210,205,225,0.45)';
      ctx.beginPath();ctx.arc(clx,cly,12+Math.sin(i*1.8)*5,0,Math.PI*2);ctx.fill();
    }

    _drawP(10);ctx.restore();
  }

  // 执行当前关卡场景
  const scenes={1:_s1,2:_s2,3:_s3,4:_s4,5:_s5,6:_s6,7:_s7,8:_s8,9:_s9,10:_s10};
  if(scenes[id])scenes[id]();
}

// ══════ 绘制 ══════
function draw(){
  ctx.save();
  if(shakePower>0){ctx.translate((Math.random()-0.5)*shakePower,(Math.random()-0.5)*shakePower);shakePower*=0.84;if(shakePower<0.2)shakePower=0;}
  ctx.clearRect(0,0,W,H);

  // ── 背景 ──
  const BG_COLORS={1:'#100a06',2:'#070c14',3:'#080d07',4:'#07080f',5:'#120806',6:'#0d0a04',7:'#110610',8:'#0c0900',9:'#05001a',10:'#0a0808'};
  ctx.fillStyle=BG_COLORS[G&&G.stageId||1]||'#050a05';ctx.fillRect(0,0,W,H);

  // ── 场景环境 ──
  drawMapEnvironment(ctx,G);

  // ── 视角边界可视 ──
  if(G.viewMode==='vertical'){
    ctx.fillStyle='rgba(80,0,0,0.35)';ctx.fillRect(0,0,W*0.25,H);ctx.fillRect(W*0.75,0,W*0.25,H);
    ctx.strokeStyle='rgba(255,60,30,0.6)';ctx.lineWidth=2;ctx.setLineDash([8,4]);
    ctx.beginPath();ctx.moveTo(W*0.25,0);ctx.lineTo(W*0.25,H);ctx.stroke();
    ctx.beginPath();ctx.moveTo(W*0.75,0);ctx.lineTo(W*0.75,H);ctx.stroke();ctx.setLineDash([]);
  }else if(G.viewMode==='arena'){
    ctx.strokeStyle='rgba(255,120,30,0.5)';ctx.lineWidth=3;ctx.setLineDash([10,4]);
    ctx.strokeRect(6,6,W-12,H-12);ctx.setLineDash([]);
  }

  // ── 世界脉冲闪光 ──
  if((G.worldPulseFlash||0)>0){
    const pf=G.worldPulseFlash;
    ctx.fillStyle=`rgba(255,60,0,${(pf/40)*0.2})`;ctx.fillRect(0,0,W,H);
  }

  // ── 领域地面 ──
  const inf=Math.min(1,G.infection||0);
  if(inf>0){ctx.fillStyle=`rgba(18,55,18,${0.04+inf*0.1})`;ctx.fillRect(0,0,W,H);}

  (G.infectionMap||[]).forEach(z=>{
    const pulse=Math.sin(z.pulse)*0.12+0.88;
    const alpha=(z.life/1200)*0.15*pulse*(inf+0.25);
    const g2=ctx.createRadialGradient(z.x,z.y,2,z.x,z.y,z.r*pulse);
    if(z.hostile){
      g2.addColorStop(0,`rgba(180,60,30,${Math.min(0.3,alpha*2.5)})`);
      g2.addColorStop(0.6,`rgba(100,30,15,${alpha*1.5})`);
      g2.addColorStop(1,'rgba(0,0,0,0)');
    } else {
      g2.addColorStop(0,`rgba(40,160,70,${Math.min(0.3,alpha*2)})`);
      g2.addColorStop(0.6,`rgba(22,90,35,${alpha})`);
      g2.addColorStop(1,'rgba(0,0,0,0)');
    }
    ctx.fillStyle=g2;ctx.beginPath();ctx.arc(z.x,z.y,z.r*pulse,0,Math.PI*2);ctx.fill();
  });

  // ── 危险区域 ──
  (G.dangerZones||[]).forEach(z=>{
    const pulse=Math.sin(G.elapsed*0.08)*0.15+0.85;
    let zColor;
    switch(z.type){case'plasma':zColor='rgba(100,160,255,';break;case'spore':zColor='rgba(100,255,50,';break;case'corrosion':zColor='rgba(200,120,30,';break;default:zColor='rgba(200,50,50,';}
    if(!z.active){
      const warnAlpha=0.15+Math.sin(G.elapsed*0.2)*0.1;
      ctx.save();ctx.strokeStyle=zColor+'0.8)';ctx.lineWidth=2;ctx.setLineDash([5,5]);
      ctx.globalAlpha=warnAlpha*2;
      ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();
    } else {
      const g2=ctx.createRadialGradient(z.x,z.y,z.r*0.3,z.x,z.y,z.r);
      g2.addColorStop(0,zColor+'0.12)');g2.addColorStop(0.7,zColor+'0.08)');g2.addColorStop(1,zColor+'0)');
      ctx.fillStyle=g2;ctx.beginPath();ctx.arc(z.x,z.y,z.r*pulse,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=zColor+'0.5)';ctx.lineWidth=1.5;ctx.globalAlpha=0.4+Math.sin(G.elapsed*0.1)*0.2;
      ctx.beginPath();ctx.arc(z.x,z.y,z.r*pulse,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
    }
  });
  (G.dangerCircles||[]).forEach(c=>{
    const alpha=c.life/90;
    ctx.save();ctx.globalAlpha=Math.min(0.8,alpha*0.7);ctx.strokeStyle=c.color||'#9B4AFF';ctx.lineWidth=2;
    ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(c.x,c.y,c.r,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();
  });

  // ── 世界状态背景 ──
  if(G.bossMode){ctx.fillStyle='rgba(140,15,40,0.05)';ctx.fillRect(0,0,W,H);}
  if(G.worldCorrupt){const a=0.04+Math.sin(G.elapsed*0.02)*0.02;ctx.fillStyle=`rgba(160,0,100,${a})`;ctx.fillRect(0,0,W,H);}
  if(G.overmind){
    ctx.fillStyle='rgba(220,0,130,0.05)';ctx.fillRect(0,0,W,H);
    ctx.save();ctx.globalAlpha=0.12+Math.sin(G.elapsed*0.05)*0.06;ctx.strokeStyle='#ff00aa';ctx.lineWidth=8;ctx.strokeRect(4,4,W-8,H-8);ctx.restore();
  }
  if((G.uiCorrupt||0)>0){
    const uc=G.uiCorrupt;
    ctx.save();ctx.globalAlpha=uc*0.5;
    for(let i=0;i<3;i++){
      ctx.strokeStyle=`rgba(${Math.floor(100+Math.random()*100)},0,${Math.floor(100+Math.random()*80)},0.7)`;
      ctx.lineWidth=3+i*2;
      ctx.strokeRect(i*3+Math.sin(G.elapsed*0.05+i)*3,i*3+Math.cos(G.elapsed*0.04+i)*3,W-i*6,H-i*6);
    }
    ctx.restore();
  }

  if(G.eliteFlash>0){ctx.fillStyle=`rgba(0,0,0,${G.eliteFlash/35*0.28})`;ctx.fillRect(0,0,W,H);G.eliteFlash--;}

  // 毒液水洼
  (G.slimePools||[]).forEach(s=>{
    const g=ctx.createRadialGradient(s.x,s.y,2,s.x,s.y,s.r);
    g.addColorStop(0,'rgba(70,230,110,0.20)');g.addColorStop(1,'rgba(70,230,110,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();s.life--;
  });
  G.slimePools=(G.slimePools||[]).filter(s=>s.life>0);

  // 丹火剑环：动态火焰光环
  G.slots.forEach(sl=>{
    if(sl.id&&sl.id==='inferno_ring'&&sl.state.drawR){
      const r=sl.state.drawR,stars=sl.state.stars||0,ha=sl.state.haloAngle||0;
      const rt=sl.state.ringTimer||0;
      const innerCol=stars>=2?'rgba(255,68,0,':stars>=1?'rgba(255,120,0,':'rgba(232,93,36,';
      ctx.save();
      ctx.strokeStyle=innerCol+'0.35)';ctx.lineWidth=stars>=2?3:2;
      ctx.setLineDash([10+stars*4,8-stars*2]);ctx.lineDashOffset=-ha*r;
      ctx.beginPath();ctx.arc(G.mx,G.my,r,0,Math.PI*2);ctx.stroke();
      ctx.setLineDash([]);
      const pulseR=r*0.6+Math.sin(rt*0.18)*8;
      ctx.strokeStyle=innerCol+'0.18)';ctx.lineWidth=1.5;
      ctx.setLineDash([6,10]);ctx.lineDashOffset=ha*r*0.7;
      ctx.beginPath();ctx.arc(G.mx,G.my,pulseR,0,Math.PI*2);ctx.stroke();
      ctx.setLineDash([]);
      const nodeCount=6+stars*3;
      for(let ni=0;ni<nodeCount;ni++){
        const na=ha+ni/nodeCount*Math.PI*2;
        const nx=G.mx+Math.cos(na)*r,ny=G.my+Math.sin(na)*r;
        const flicker=0.6+Math.sin(rt*0.25+ni*1.3)*0.4;
        ctx.globalAlpha=0.7*flicker;
        ctx.fillStyle=ni%3===0?(stars>=1?'#ff4400':'#ff6600'):'#ffaa00';
        ctx.beginPath();ctx.arc(nx,ny,3+stars+flicker*2,0,Math.PI*2);ctx.fill();
        if(stars>=1){
          ctx.strokeStyle='rgba(255,80,0,0.5)';ctx.lineWidth=1.5;
          ctx.beginPath();ctx.moveTo(nx,ny);
          ctx.lineTo(nx+Math.cos(na)*6*flicker,ny+Math.sin(na)*6*flicker);ctx.stroke();
        }
      }
      ctx.globalAlpha=1;ctx.restore();
      if(sl.state.infernoTowers){
        sl.state.infernoTowers.forEach((t,i)=>{
          ctx.save();
          const flicker=0.75+Math.sin(G.elapsed*0.28+i*1.1)*0.25;
          ctx.globalAlpha=0.85*flicker;
          ctx.shadowBlur=10;ctx.shadowColor=stars>=2?'#ff4400':stars>=1?'#ff7700':'#E85D24';
          ctx.fillStyle=stars>=2?'#ff4400':stars>=1?'#ff7700':'#E85D24';
          ctx.beginPath();ctx.arc(t.x,t.y,6+stars,0,Math.PI*2);ctx.fill();
          ctx.globalAlpha=0.6*flicker;ctx.fillStyle='#ffeeaa';
          ctx.beginPath();ctx.arc(t.x,t.y,3,0,Math.PI*2);ctx.fill();
          ctx.restore();
        });
      }
    }
  });

  if(G.boss&&G.boss.puddles){
    G.boss.puddles.forEach(p=>{ctx.globalAlpha=Math.min(0.35,p.life/400*0.35);ctx.fillStyle='#2a5a12';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;});
  }
  if(G.boss&&G.boss.beamActive){
    ctx.save();ctx.globalAlpha=0.3;ctx.strokeStyle='#9B4AFF';ctx.lineWidth=14;ctx.shadowColor='#9B4AFF';ctx.shadowBlur=20;
    ctx.beginPath();ctx.moveTo(G.boss.x,G.boss.y);ctx.lineTo(G.boss.x+Math.cos(G.boss.beamAngle)*250,G.boss.y+Math.sin(G.boss.beamAngle)*250);ctx.stroke();ctx.restore();
  }

  if(G.arcs){G.arcs.forEach(a=>{ctx.save();ctx.globalAlpha=a.life/30*0.8;ctx.strokeStyle='#C9E054';ctx.lineWidth=1.5;
    ctx.beginPath();let cx=a.x,cy=a.y;for(let i=0;i<4;i++){const nx=cx+(Math.random()-0.5)*20,ny=cy+(Math.random()-0.5)*20;ctx.moveTo(cx,cy);ctx.lineTo(nx,ny);cx=nx;cy=ny;}ctx.stroke();ctx.restore();});}

  // 粒子
  const showAllPt=G.comboTier<6;
  G.pts.forEach((p,i)=>{
    if(!showAllPt&&i%2===0)return;
    ctx.globalAlpha=p.life*0.65;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,Math.max(0.5,p.r),0,Math.PI*2);ctx.fill();
  });
  ctx.globalAlpha=1;

  // ── 敌人 ──
  G.enemies.forEach(e=>{
    const pct=e.hp/e.maxhp;
    const baseFade=G.comboTier>=5?0.65:0.85;
    const alpha=(e.special==='stealth'?(e.stealthAlpha||1):1)*baseFade;
    ctx.globalAlpha=alpha;
    if((e.overloadStacks||0)>=2){ctx.save();ctx.strokeStyle='#7aadff';ctx.lineWidth=2;ctx.globalAlpha=0.6+Math.sin(G.elapsed*0.3)*0.4;ctx.beginPath();ctx.arc(e.x,e.y,e.sz/2+4,0,Math.PI*2);ctx.stroke();ctx.restore();}
    let col=e.poison>0&&!e.immuneDot?'#3a6a1a':e.slowTimer>60?'#3050A0':e.col;
    if(e.special==='hivemind'){
      ctx.save();ctx.strokeStyle='rgba(204,68,136,0.3)';ctx.lineWidth=1;ctx.setLineDash([4,4]);
      ctx.beginPath();ctx.arc(e.x,e.y,100,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();
    }
    if(e.special==='elite'||e.special==='suicidal'){ctx.save();ctx.shadowBlur=18;ctx.shadowColor='#ff1111';}
    if(e.shield>0){ctx.save();ctx.strokeStyle='rgba(68,136,204,0.7)';ctx.lineWidth=2;ctx.shadowBlur=8;ctx.shadowColor='#4488CC';ctx.beginPath();ctx.arc(e.x,e.y,e.sz/2+5,0,Math.PI*2);ctx.stroke();ctx.restore();}
    if((e.shieldBubble||0)>0){ctx.save();ctx.globalAlpha=0.4;ctx.strokeStyle='#44aacc';ctx.lineWidth=1;ctx.beginPath();ctx.arc(e.x,e.y,e.sz/2+8,0,Math.PI*2);ctx.stroke();ctx.restore();}
    if(e._frostFlash>0){e._frostFlash--;ctx.save();ctx.globalAlpha=0.5;ctx.fillStyle='#aaddff';ctx.shadowBlur=12;ctx.shadowColor='#88CCFF';ctx.beginPath();ctx.arc(e.x,e.y,e.sz/2+5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=0.3;ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(e.x,e.y,e.sz/2,0,Math.PI*2);ctx.fill();ctx.restore();}
    if(e.freezeTimer>0){ctx.save();ctx.globalAlpha=0.6;ctx.strokeStyle='#88CCFF';ctx.lineWidth=3;ctx.shadowBlur=10;ctx.shadowColor='#88CCFF';ctx.beginPath();ctx.arc(e.x,e.y,e.sz/2+4,0,Math.PI*2);ctx.stroke();ctx.restore();}
    if(e.frostDot>0){ctx.save();ctx.globalAlpha=0.12+Math.sin(G.elapsed*0.08)*0.06;ctx.fillStyle='#88CCFF';ctx.beginPath();ctx.arc(e.x,e.y,e.sz/2+6,0,Math.PI*2);ctx.fill();ctx.restore();}
    ctx.fillStyle=col;
    if(e.special==='armored'){ctx.strokeStyle='#7080A0';ctx.lineWidth=2;ctx.beginPath();ctx.rect(e.x-e.sz/2,e.y-e.sz/2,e.sz,e.sz);ctx.fill();ctx.stroke();}
    else if(e.special==='bomber'||e.special==='suicidal'){
      ctx.beginPath();for(let i=0;i<6;i++){const a=i/6*Math.PI*2;ctx.lineTo(e.x+Math.cos(a)*e.sz/2,e.y+Math.sin(a)*e.sz/2);}ctx.closePath();ctx.fill();
    }
    else if(e.special==='spawner'){ctx.beginPath();ctx.ellipse(e.x,e.y,e.sz/2,e.sz/2*0.75,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#8040B0';ctx.lineWidth=2;ctx.stroke();}
    else if(e.special==='jumper'){
      ctx.beginPath();for(let i=0;i<3;i++){const a=i/3*Math.PI*2-Math.PI/2;ctx.lineTo(e.x+Math.cos(a)*e.sz/2,e.y+Math.sin(a)*e.sz/2);}ctx.closePath();ctx.fill();
    }
    else if(e.special==='devourer'){
      ctx.beginPath();ctx.arc(e.x,e.y,e.sz/2,0,Math.PI*2);ctx.fill();
      if(e.devourCount>0){ctx.strokeStyle='#886633';ctx.lineWidth=1;ctx.beginPath();ctx.arc(e.x,e.y,e.sz/2+3,0,Math.PI*2);ctx.stroke();}
    }
    else if(e.special==='magnetic'){ctx.beginPath();ctx.arc(e.x,e.y,e.sz/2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(50,100,200,0.5)';ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(e.x,e.y,e.magnetR||0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    else if(e.special==='void'){ctx.fillStyle='#6030A0';ctx.beginPath();for(let i=0;i<5;i++){const a=i/5*Math.PI*2-Math.PI/2;ctx.lineTo(e.x+Math.cos(a)*e.sz/2,e.y+Math.sin(a)*e.sz/2);}ctx.closePath();ctx.fill();}
    else if(e.special==='regen'){ctx.beginPath();ctx.arc(e.x,e.y,e.sz/2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#18A050';ctx.lineWidth=1;ctx.stroke();}
    else if(e.special==='reflector'){
      ctx.beginPath();ctx.arc(e.x,e.y,e.sz/2,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(0,136,204,0.8)';ctx.lineWidth=2;ctx.stroke();
      ctx.save();ctx.strokeStyle='rgba(100,200,255,0.5)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(e.x-e.sz/2*0.6,e.y);ctx.lineTo(e.x+e.sz/2*0.6,e.y);
      ctx.moveTo(e.x,e.y-e.sz/2*0.6);ctx.lineTo(e.x,e.y+e.sz/2*0.6);ctx.stroke();ctx.restore();
    }
    else if(e.special==='hivemind'){
      ctx.beginPath();for(let i=0;i<4;i++){const a=i/4*Math.PI*2+G.elapsed*0.02;ctx.lineTo(e.x+Math.cos(a)*e.sz/2,e.y+Math.sin(a)*e.sz/2);}ctx.closePath();ctx.fill();
      ctx.strokeStyle='#CC4488';ctx.lineWidth=2;ctx.stroke();
    }
    else if(e.special==='corruptor'){
      ctx.beginPath();ctx.arc(e.x,e.y,e.sz/2,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(100,180,80,0.7)';ctx.lineWidth=1.5;ctx.stroke();
      ctx.save();ctx.globalAlpha=0.4;for(let i=0;i<4;i++){
        const a=i/4*Math.PI*2+G.elapsed*0.03;
        ctx.strokeStyle='#4aa840';ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+Math.cos(a)*e.sz,e.y+Math.sin(a)*e.sz);ctx.stroke();
      }ctx.restore();
    }
    else{ctx.beginPath();ctx.arc(e.x,e.y,e.sz/2,0,Math.PI*2);ctx.fill();}
    if(e.special==='elite'||e.special==='suicidal')ctx.restore();
    ctx.globalAlpha=alpha;
    ctx.fillStyle='rgba(0,0,0,0.45)';ctx.fillRect(e.x-e.sz/2,e.y-e.sz/2-7,e.sz,2);
    ctx.fillStyle=pct>0.5?'#1D9E75':'#E24B4A';ctx.fillRect(e.x-e.sz/2,e.y-e.sz/2-7,e.sz*pct,2);
    ctx.globalAlpha=1;
  });

  // ── Boss ──
  if(G.boss){
    const b=G.boss,pct=b.hp/b.maxhp,pulse=Math.sin(G.elapsed*0.1)*2.5;
    ctx.save();ctx.fillStyle='rgba(0,0,0,0.4)';ctx.beginPath();ctx.ellipse(b.x,b.y+b.sz*0.55,b.sz*0.75,b.sz*0.28,0,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.save();ctx.shadowColor=b.col;ctx.shadowBlur=32+pulse*3;ctx.fillStyle=b.col;ctx.beginPath();ctx.arc(b.x,b.y,b.sz/2+pulse,0,Math.PI*2);ctx.fill();ctx.restore();
    if(b._phase>=1){ctx.save();ctx.strokeStyle=b._phase>=2?'#ff2200':'#EF9F27';ctx.lineWidth=2;ctx.globalAlpha=0.5;ctx.beginPath();ctx.arc(b.x,b.y,b.sz/2+8+pulse*0.5,0,Math.PI*2);ctx.stroke();ctx.restore();}
    ctx.fillStyle='rgba(0,0,0,0.55)';ctx.fillRect(b.x-b.sz/2,b.y-b.sz/2-14,b.sz,6);
    ctx.fillStyle=pct>0.5?'#EF9F27':'#E24B4A';ctx.fillRect(b.x-b.sz/2,b.y-b.sz/2-14,b.sz*pct,6);
  }

  // 环绕武器
  G.slots.forEach(sl=>{
    if(!sl.id)return;
    if(sl.state.orbs){const isThunder=sl.id==='thunder_ring'||sl.id==='storm_cage';const isIce=sl.id==='blizzard_field';sl.state.orbs.forEach(o=>{const col=isIce?'#88CCFF':isThunder?'#4488FF':sl.stars>=2?'#FF00FF':sl.stars>=1?'#FF8800':sl.id==='orbit_storm'?'#00FFB3':'#5DCAA5';ctx.fillStyle=col;ctx.shadowBlur=isThunder||isIce?8:0;ctx.shadowColor=isIce?'#88CCFF':isThunder?'#4488FF':'';ctx.globalAlpha=0.9;ctx.beginPath();ctx.arc(o.x,o.y,sl.stars>=1?7:5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.shadowBlur=0;});}
    if(sl.id==='blade_vortex'&&sl.state.blades){const r=sl.state.bladeR||50;const blades=sl.state.blades;ctx.save();ctx.globalAlpha=0.7;ctx.strokeStyle='#cc88ff';ctx.lineWidth=1.5;ctx.shadowBlur=5;ctx.shadowColor='#cc88ff';ctx.beginPath();ctx.arc(G.mx,G.my,r,0,Math.PI*2);ctx.stroke();ctx.restore();blades.forEach(b=>{ctx.save();ctx.globalAlpha=0.85;ctx.fillStyle='#cc88ff';ctx.shadowBlur=4;ctx.shadowColor='#cc88ff';ctx.beginPath();ctx.arc(b.x,b.y,3,0,Math.PI*2);ctx.fill();ctx.restore();});}
    if(sl.id==='storm_cage'&&sl.state.cageRadius){const cr=sl.state.cageRadius;ctx.save();ctx.globalAlpha=0.3+0.1*Math.sin(G.elapsed*0.1);ctx.strokeStyle='#ffaa00';ctx.lineWidth=2.5;ctx.shadowBlur=12;ctx.shadowColor='#ffaa00';ctx.setLineDash([8,4]);ctx.beginPath();ctx.arc(G.mx,G.my,cr,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();}
    if(sl.id==='void_ray'&&sl.state.rayLen){const ang=sl.state.rayAng||0;const len=sl.state.rayLen||300;const w=sl.state.rayW||12;ctx.save();ctx.globalAlpha=0.35+0.08*Math.sin(G.elapsed*0.15);ctx.strokeStyle='#8844cc';ctx.lineWidth=w*0.5;ctx.shadowBlur=20;ctx.shadowColor='#8844cc';ctx.beginPath();ctx.moveTo(G.mx,G.my);ctx.lineTo(G.mx+Math.cos(ang)*len,G.my+Math.sin(ang)*len);ctx.stroke();ctx.globalAlpha=0.15;ctx.lineWidth=w;ctx.stroke();ctx.restore();}
    if(sl.state.towers){
      const towers=sl.state.towers;
      if(towers.length>0){
        const r=Math.hypot(towers[0].x-G.mx,towers[0].y-G.my);
        ctx.save();ctx.globalAlpha=0.12;ctx.strokeStyle='#E85D24';ctx.lineWidth=1;ctx.setLineDash([4,6]);
        ctx.beginPath();ctx.arc(G.mx,G.my,r,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();
      }
      towers.forEach(t=>{
        ctx.save();ctx.globalAlpha=0.18;ctx.strokeStyle='#ff8844';ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(G.mx,G.my);ctx.lineTo(t.x,t.y);ctx.stroke();ctx.restore();
        ctx.save();
        const flicker=0.8+Math.sin(G.elapsed*0.25+t.x)*0.2;
        ctx.globalAlpha=0.92*flicker;
        ctx.fillStyle='#E85D24';ctx.beginPath();ctx.arc(t.x,t.y,7,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=0.7*flicker;ctx.fillStyle='#ffcc44';ctx.beginPath();ctx.arc(t.x,t.y,3.5,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=0.22*flicker;ctx.strokeStyle='#ff6600';ctx.lineWidth=3;
        ctx.beginPath();ctx.arc(t.x,t.y,11,0,Math.PI*2);ctx.stroke();
        ctx.restore();
      });
    }
  });

  // 抛射物
  G.projs.forEach(p=>{
    if(p.isBossBullet||p.isEnemyBullet){ctx.globalAlpha=0.85;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;return;}
    ctx.save();
    if(p.isFlameBolt){
      const ang=Math.atan2(p.vy,p.vx),len=10+p.r;
      const g2=ctx.createLinearGradient(p.x-Math.cos(ang)*len,p.y-Math.sin(ang)*len,p.x,p.y);
      g2.addColorStop(0,'rgba(0,0,0,0)');g2.addColorStop(1,p.color.replace(')',',0.7)').replace('rgb','rgba'));
      ctx.strokeStyle=p.color;ctx.lineWidth=p.r*1.2;ctx.globalAlpha=0.5;
      ctx.beginPath();ctx.moveTo(p.x-Math.cos(ang)*len,p.y-Math.sin(ang)*len);ctx.lineTo(p.x,p.y);ctx.stroke();
      ctx.globalAlpha=0.9;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#ffeeaa';ctx.globalAlpha=0.7;ctx.beginPath();ctx.arc(p.x,p.y,p.r*0.5,0,Math.PI*2);ctx.fill();
      ctx.restore();return;
    }
    if(p.isLightning){
      const len=10+p.r*2,ang=Math.atan2(p.vy,p.vx);
      ctx.strokeStyle=p.color;ctx.lineWidth=1.5;ctx.shadowColor=p.color;ctx.shadowBlur=6;
      ctx.beginPath();let cx2=p.x-Math.cos(ang)*len,cy2=p.y-Math.sin(ang)*len;ctx.moveTo(cx2,cy2);
      for(let i=1;i<=4;i++){const t2=i/4,nx=p.x-Math.cos(ang)*len*(1-t2),ny=p.y-Math.sin(ang)*len*(1-t2);const perp=ang+Math.PI/2,jitter=(Math.random()-0.5)*5;ctx.lineTo(nx+Math.cos(perp)*jitter,ny+Math.sin(perp)*jitter);}ctx.stroke();
      ctx.globalAlpha=0.5;ctx.strokeStyle='rgba(180,220,255,0.6)';ctx.lineWidth=1;for(let i=0;i<2;i++){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+(Math.random()-0.5)*18,p.y+(Math.random()-0.5)*18);ctx.stroke();}
      ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fill();
    } else if(p.poison){
      ctx.strokeStyle='rgba(70,190,70,0.3)';ctx.lineWidth=p.r*1.5;ctx.beginPath();ctx.moveTo(p.x-p.vx*3,p.y-p.vy*3);ctx.lineTo(p.x,p.y);ctx.stroke();
      ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
    } else {
      ctx.globalAlpha=0.9;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  });
  ctx.globalAlpha=1;

  // ── 虫子 ──
  G.bugs.forEach(b=>{
    const pulse=Math.sin(b.age*0.13)*0.1;ctx.save();
    if(b.elite){ctx.shadowBlur=12;ctx.shadowColor='#EF9F27';}
    let bugColor='#4DBFA0';
    if(G.activeBuild==='swarm'){
      if(b.role==='guard')bugColor='#44AAFF';
      else if(b.role==='bomber')bugColor='#FF8844';
    }
    if(b.elite)bugColor='#EF9F27';
    ctx.fillStyle=bugColor;ctx.globalAlpha=0.9+pulse;
    ctx.beginPath();ctx.ellipse(b.x,b.y,5,3,Math.atan2(b.vy,b.vx),0,Math.PI*2);ctx.fill();
    ctx.restore();ctx.globalAlpha=1;
  });

  // ── 玩家 ──
  const hpPct=G.mhp/G.mmaxhp;
  const tier=G.comboTier||0;

  if(hpPct<0.4){
    const dangerAlpha=0.18+Math.sin(G.elapsed*0.12)*0.1;const dangerR=20+Math.sin(G.elapsed*0.08)*1.5;
    ctx.save();ctx.strokeStyle='#E24B4A';ctx.lineWidth=2.5;ctx.globalAlpha=dangerAlpha*2;ctx.shadowBlur=10;ctx.shadowColor='#E24B4A';
    ctx.beginPath();ctx.arc(G.mx,G.my,dangerR,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  if((G.stillTimer||0)>90){
    const sp=Math.min(1,(G.stillTimer-90)/90);
    const maxRingR=Math.max(W,H)*0.72;
    const minRingR=38;
    const warnR=maxRingR-(maxRingR-minRingR)*sp;
    const warnAlpha=(0.25+Math.sin(G.elapsed*0.28)*0.15)*sp;
    ctx.save();ctx.strokeStyle='#ff8800';ctx.lineWidth=2.5;ctx.globalAlpha=warnAlpha;
    ctx.setLineDash([8,6]);ctx.beginPath();ctx.arc(G.mx,G.my,warnR,0,Math.PI*2);ctx.stroke();
    const warnR2=Math.max(minRingR+10,(maxRingR*0.6)-(maxRingR*0.6-minRingR*1.4)*sp);
    ctx.strokeStyle='#ff6600';ctx.lineWidth=1.5;ctx.globalAlpha=warnAlpha*0.6;
    ctx.setLineDash([5,8]);ctx.beginPath();ctx.arc(G.mx,G.my,warnR2,0,Math.PI*2);ctx.stroke();
    ctx.setLineDash([]);ctx.restore();
    if(G.stillTimer===90)showEcoAlert('⚠ 停留原地会被包围！');
  }
  if(G.activeBuild==='berserk'&&tier>=4){
    const distortR=20+tier*6;
    ctx.save();ctx.globalAlpha=0.15+tier*0.04;
    ctx.strokeStyle='#ff2200';ctx.lineWidth=2;
    for(let i=0;i<3;i++){
      const a=G.elapsed*0.03*(1+i*0.3)+i*Math.PI*0.7;
      ctx.beginPath();ctx.arc(G.mx,G.my,distortR+i*8,a,a+Math.PI);ctx.stroke();
    }
    ctx.restore();
  }
  if(tier>=1){
    const tierColors=['','#aaff44','#ffcc00','#ff9900','#ff4400','#ff2200','#cc00ff','#ff00aa','#ff00ff'];
    const tc=tierColors[tier]||'#ff8800';
    for(let ri=0;ri<Math.min(tier,4);ri++){
      const angOffset=G.elapsed*0.04*(1+ri*0.3)+ri*Math.PI*0.5,arcR=18+ri*7,arcLen=0.4+ri*0.1;
      ctx.save();ctx.strokeStyle=tc;ctx.lineWidth=1.5-ri*0.2;ctx.globalAlpha=0.5-ri*0.08;ctx.shadowBlur=6;ctx.shadowColor=tc;
      ctx.beginPath();ctx.arc(G.mx,G.my,arcR,angOffset,angOffset+arcLen*Math.PI);ctx.stroke();
      ctx.beginPath();ctx.arc(G.mx,G.my,arcR,angOffset+Math.PI,angOffset+Math.PI+arcLen*Math.PI);ctx.stroke();ctx.restore();
    }
    if(tier>=5){const pulseR=16+(G.elapsed*1.2)%24,pulseAlpha=1-(pulseR-16)/24;ctx.save();ctx.strokeStyle=tc;ctx.lineWidth=1.5;ctx.globalAlpha=pulseAlpha*0.4;ctx.beginPath();ctx.arc(G.mx,G.my,pulseR,0,Math.PI*2);ctx.stroke();ctx.restore();}
  }
  if(tier>=7){const tc7=tier>=8?'#ff00ff':'#ff00aa';ctx.save();ctx.globalAlpha=0.22+Math.sin(G.elapsed*0.08)*0.08;ctx.fillStyle=tc7;ctx.beginPath();ctx.arc(G.mx,G.my,24+Math.sin(G.elapsed*0.05)*4,0,Math.PI*2);ctx.fill();ctx.restore();}

  const dodgeAlpha=G.dodgeTimer>0?0.5+0.2*Math.sin(G.elapsed*0.3):1;

  const tierColors2=['#1D9E75','#1D9E75','#aaee44','#ffcc00','#ff8800','#ff3300','#cc00ff','#ff00aa','#ff00ff'];
  const bodyColor=hpPct<0.3?'#E24B4A':(tierColors2[tier]||'#1D9E75');
  const glowStr=14+tier*7+(hpPct<0.3?12:0);
  ctx.save();ctx.globalAlpha*=dodgeAlpha;ctx.shadowBlur=glowStr;ctx.shadowColor=bodyColor;
  ctx.fillStyle=`rgba(29,158,117,${0.1+0.06*Math.sin(G.elapsed*0.05)})`;
  ctx.beginPath();ctx.arc(G.mx,G.my,14,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=bodyColor;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(G.mx,G.my,12,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle=tier>=3?bodyColor:'#9FE1CB';ctx.beginPath();ctx.arc(G.mx,G.my,4,0,Math.PI*2);ctx.fill();
  ctx.restore();
  if(G.shieldHp>0){
    ctx.save();ctx.globalAlpha=0.25+0.1*Math.sin(G.elapsed*0.08);
    ctx.strokeStyle='#4488CC';ctx.lineWidth=3;ctx.shadowBlur=12;ctx.shadowColor='#4488CC';
    ctx.beginPath();ctx.arc(G.mx,G.my,18,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  const hbw=48,hbh=5;
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(G.mx-hbw/2,G.my-36,hbw,hbh);
  const hbCol=hpPct<0.3?'#ff3333':hpPct<0.6?'#EF9F27':'#44ee66';
  ctx.fillStyle=hbCol;ctx.fillRect(G.mx-hbw/2,G.my-36,hbw*hpPct,hbh);
  if(hpPct>0.05){ctx.fillStyle='rgba(255,255,255,0.2)';ctx.fillRect(G.mx-hbw/2,G.my-36,hbw*hpPct,hbh/2);}
  if(G.shieldHp>0){
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(G.mx-hbw/2,G.my-40,hbw,2);
    ctx.fillStyle='#4488CC';ctx.fillRect(G.mx-hbw/2,G.my-40,hbw,2);
  }

  const vg=ctx.createRadialGradient(W/2,H/2,H*0.3,W/2,H/2,H*0.9);
  vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.5)');
  ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);

  (G.waves||[]).forEach(w=>{ctx.save();ctx.globalAlpha=w.life/20;ctx.strokeStyle=w.color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(w.x,w.y,w.r,0,Math.PI*2);ctx.stroke();ctx.restore();w.r+=5;w.life--;});
  G.waves=(G.waves||[]).filter(w=>w.life>0);

  const dmgThreshold=G.comboTier>=4?5:0;
  (G.damageTexts||[]).forEach(t=>{
    if(parseInt(t.text)<dmgThreshold&&G.comboTier>=4)return;
    ctx.save();ctx.globalAlpha=t.life/40;ctx.fillStyle=t.color;ctx.font='bold '+t.size+'px Arial';ctx.textAlign='center';ctx.shadowColor=t.color;ctx.shadowBlur=6;ctx.fillText(t.text,t.x,t.y);ctx.restore();t.y+=t.vy;t.life--;
  });
  G.damageTexts=(G.damageTexts||[]).filter(t=>{if(t.life<=0){recycleDmg(t);return false;}return true;});

  // ── Combo UI ──
  if(G.combo>=2){
    ctx.save();const tc=G.comboTier>=7?'#ff00aa':G.comboTier>=5?'#ff3300':G.comboTier>=3?'#ff8800':G.comboTier>=1?'#ffcc00':'#ffff44';
    const scale=1+Math.sin(G.elapsed*0.2)*0.07*(1+G.comboTier*0.05);
    ctx.translate(W/2,78);ctx.scale(scale,scale);ctx.textAlign='center';ctx.shadowColor=tc;ctx.shadowBlur=16+G.comboTier*4;ctx.fillStyle=tc;
    const tierNames=['','热身','狩猎','侵蚀','暴走','母巢同步','污染扩张','世界侵蚀','灵虫暴走'];
    const tierLabel=G.comboTier>0?' ['+tierNames[G.comboTier]+']':'';
    ctx.font='bold 26px Arial';ctx.fillText(G.combo+' 连斩'+tierLabel,0,0);ctx.restore();
  }

  ctx.restore();
}

// ── 主循环 ──
function loop(){update();draw();G._raf=requestAnimationFrame(loop);}

// ── 输入 ──
window.addEventListener('keydown',e=>{
  G&&(G.keys[e.key]=true);
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();
  if(e.key==='Escape'||e.key==='p'||e.key==='P'||e.key===' ')togglePause();
});
window.addEventListener('keyup',e=>{G&&(G.keys[e.key]=false);});
CV.addEventListener('mousemove',e=>{const r=CV.getBoundingClientRect();mX=e.clientX-r.left;mY=e.clientY-r.top;});
let dpadState={u:false,d:false,l:false,r:false};
function bindDpad(id,key,sk){const el=document.getElementById(id);if(!el)return;const press=e=>{e.preventDefault();dpadState[sk]=true;if(G)G.keys[key]=true;};const release=e=>{e.preventDefault();dpadState[sk]=false;if(G)G.keys[key]=false;};el.addEventListener('touchstart',press,{passive:false});el.addEventListener('touchend',release,{passive:false});el.addEventListener('mousedown',press);el.addEventListener('mouseup',release);el.addEventListener('mouseleave',release);}
bindDpad('du','ArrowUp','u');bindDpad('dd','ArrowDown','d');bindDpad('dl','ArrowLeft','l');bindDpad('dr','ArrowRight','r');
let touchStart=null;
let lastTapTime=0;
CV.addEventListener('touchstart',e=>{
  e.preventDefault();
  const now=Date.now();
  if(now-lastTapTime<300){togglePause();lastTapTime=0;return;}
  lastTapTime=now;
  const r=CV.getBoundingClientRect();touchStart={x:e.touches[0].clientX-r.left,y:e.touches[0].clientY-r.top};
},{passive:false});
CV.addEventListener('touchmove',e=>{e.preventDefault();if(!touchStart||!G)return;const r=CV.getBoundingClientRect();const tx=e.touches[0].clientX-r.left,ty=e.touches[0].clientY-r.top;G.mx=Math.max(14,Math.min(W-14,G.mx+(tx-touchStart.x)*0.5));G.my=Math.max(14,Math.min(H-14,G.my+(ty-touchStart.y)*0.5));touchStart={x:tx,y:ty};},{passive:false});
CV.addEventListener('touchend',e=>{e.preventDefault();touchStart=null;},{passive:false});
