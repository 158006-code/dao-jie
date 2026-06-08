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
  // 从STAGE_BOSS_MAP找Boss key
  const stageId=G.stageId||1;
  const bossCfg=STAGE_BOSS_MAP[stageId-1]||STAGE_BOSS_MAP[0];
  const bossKey=bossCfg.bosses[i];
  if(!bossKey)return; // 索引越界防御（不应触发）
  const hpMult=bossCfg.hpMult||1.0;
  const defSrc=BOSS_DEFS.find(b=>b.key===bossKey)||BOSS_DEFS[0];
  const def=JSON.parse(JSON.stringify(defSrc));
  def.update=defSrc.update;def.onDamage=defSrc.onDamage;def.dmgMult=defSrc.dmgMult;
  def.taunts=defSrc.taunts;
  def.hp=Math.floor(def.hp*hpMult);
  G.boss={...def,x:W/2,y:-100,vx:0,vy:0,maxhp:def.hp,poison:0,puddles:def.puddles||[],_phase:0};
  document.getElementById('boss-name').textContent=def.name;
  document.getElementById('boss-wrap').classList.add('show');
  showAlert('⚡ BOSS出现：'+def.name);
}

// ── Boss更新（提取自_update）──
function updateBoss(G){
  const boss=G.boss;
  if(boss.poison>0){boss.poison--;if(boss.poison%18===0){boss.hp-=0.35;addPt(G,boss.x,boss.y,'#639922',2,0.8);}}
  if(boss.frostDot>0){boss.frostDot--;if(G.elapsed%30===0&&boss._frostDmg>0)boss.hp-=boss._frostDmg;}
  boss.vx*=0.9;boss.vy*=0.9;
  if(!boss.charging&&!boss._charging&&!boss._down){const dx=G.mx-boss.x,dy=G.my-boss.y,d=Math.hypot(dx,dy)||1;boss.vx+=(dx/d)*boss.spd*0.07;boss.vy+=(dy/d)*boss.spd*0.07;}
  const bv=Math.hypot(boss.vx,boss.vy);if(bv>boss.spd*2){boss.vx=boss.vx/bv*boss.spd*2;boss.vy=boss.vy/bv*boss.spd*2;}
  boss.x+=boss.vx;boss.y+=boss.vy;
  boss.x=Math.max(-boss.sz,Math.min(W+boss.sz,boss.x));boss.y=Math.max(-boss.sz,Math.min(H+boss.sz,boss.y));
  if(boss.update)boss.update(G,boss);
  const phaseDots=boss.phaseDesc||[];const currentPhase=boss._phase||0;
  document.getElementById('boss-phase-dots').textContent=phaseDots.map((p,i)=>i===currentPhase?`[${p}]`:p).join(' → ');
  const bd=Math.hypot(G.mx-boss.x,G.my-boss.y);
  G.bossHitCd=(G.bossHitCd||0);if(G.bossHitCd>0)G.bossHitCd--;
  if(bd<boss.sz/2+12&&!boss.charging&&!boss._charging&&!boss._down&&G.bossHitCd<=0){G.bossHitCd=25;applyPlayerDamage(G,0.5);applyReflect(G,0.5);addPt(G,G.mx,G.my,'#E24B4A',3,2);}
  document.getElementById('boss-bar').style.width=Math.max(0,boss.hp/boss.maxhp*100)+'%';
  if(boss.hp<=0&&!boss._down){
    bossTaunt(boss,'death',G);
    screenShake(18);triggerFlash();playSound('bossdeath');
    addExplosionWave(G,boss.x,boss.y,40,'#ff0000');
    addDamageText(G,boss.x,boss.y,'天道审判','#ff3300',34);
    addPt(G,boss.x,boss.y,'#EF9F27',25,4);addPt(G,boss.x,boss.y,'#E24B4A',15,3);
    G.kills+=boss.reward;G.xp+=boss.reward*8;
    if(G.leechLv>0){G.mhp=Math.min(G.mmaxhp,G.mhp+boss.reward*2);triggerTreasureFlash();}
    const bi=G.bossPhase-1;G.boss=null;G.bossMode=false;
    document.getElementById('boss-wrap').classList.remove('show');
    document.getElementById('boss-phase-dots').textContent='';
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
    const elapsed=Math.floor(G.elapsed/FPS);
    const maxTime=G.totalTime||360;
    document.getElementById('h-time').textContent=`${Math.floor(elapsed/60)}:${(elapsed%60).toString().padStart(2,'0')}`;
    if(maxTime-elapsed<=30)document.getElementById('h-time').style.color='#ff6644';
    else document.getElementById('h-time').style.color='#D4B8FF';
  } else {
    document.getElementById('h-time').textContent='⚡BOSS';
  }
  const tier=G.rageTier||0;
  const hpPct=G.mhp/G.mmaxhp;
  const tc=RAGE_TIERS[tier]?RAGE_TIERS[tier].color:'';
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
    const cp=getProgress();
    saveProgress({...G._origProg,totalWins:cp.totalWins,totalRuns:cp.totalRuns,bossStreak:cp.bossStreak});
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
  // 开场过场：前3秒锁定输入，只播动画
  if(!G.introDone){
    G.introTimer--;
    if(G.introTimer<=0){G.introDone=true;G.paused=false;}
    return; // 过场期间不跑游戏逻辑
  }
  G.elapsed++;
  const sec=Math.floor(G.elapsed/FPS);

  updateDodge(G);
  updateShieldRegen(G);
  if(G.hurtInvTimer>0)G.hurtInvTimer--;
  updateCombo(G);
  updateArtifactCombo(G);
  updateDomainGrowth(G);

  updateLateGameRules(G,sec);
  if(G.elapsed%6===0)updateEnemyCooperation(G);
  updateDangerZones(G);

  G.noDmgTimer=(G.noDmgTimer||0)+1;
  TIME_ALERTS.forEach(a=>{if(!shownAlerts.has(a.at)&&sec>=a.at){shownAlerts.add(a.at);showAlert(a.text,a.color);}});
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
      addDamageText(G,G.mx+(Math.random()-0.5)*20,G.my-18,'停滞惩罚','#ff8800',15);
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
  for(let i=db.length-1;i>=0;i--){G.bugs.splice(db[i],1);}

  const de=[];
  G.enemies.forEach((e,i)=>{
    if(e.hp<=0){
      de.push(i);G.kills++;G.xp+=2+G.phase*2;
      // 吃不停Boss吞噬计数
      if(G.boss&&G.boss.key==='always_eat'){G.boss._devour=(G.boss._devour||0)+1;if(G.boss._devour%5===1)bossTaunt(G.boss,'devour',G);}
      if(G.comboTimer>0){G.combo++;}else{G.combo=1;}
      G.comboTimer=RAGE_WINDOW_NORMAL;
      screenShake(G.combo>=20?6:2);
      addExplosionWave(G,e.x,e.y,12,'#ff6633');
      if(G.combo>=2&&G.combo%10===0)addDamageText(G,e.x,e.y-18,G.combo+' 连斩！','#ff8800',20);
      G.enemies.forEach(other=>{if(other.special==='devourer'&&Math.hypot(other.x-e.x,other.y-e.y)<60)other.devourCount++;});
      if(G.combo===300){showBuffToast('☠ 300连杀 · 世界开始失控！','#ff2200');screenShake(8);for(let j=0;j<5;j++)spawnEnemy(G);}
      playSound(e.special==='elite'||e.special==='suicidal'?'hit_heavy':'kill');
      if(e.special==='elite'||e.special==='suicidal'){G.eliteFlash=35;if(G.rageTier>=4)G.impactFrames=2;}
      addPt(G,e.x,e.y,'#EF9F27',5,2.2);
      if(e.special==='spawner'){showEcoAlert('✓ 孵化核消灭！');G.enemies.forEach(other=>other.slowTimer=Math.max(other.slowTimer||0,120));}
      if(e.special==='bomber'||e.special==='suicidal'){
        addPt(G,e.x,e.y,'#E85D24',18,3);addExplosionWave(G,e.x,e.y,e.explodeR,'#E85D24');
        G.bugs.forEach(b=>{if(Math.hypot(b.x-e.x,b.y-e.y)<e.explodeR){b.hp-=e.explodeDmg*0.3;knockback(b,e.x,e.y,6);}});
        const edist=Math.hypot(G.mx-e.x,G.my-e.y);if(edist<e.explodeR){const exDmg=e.explodeDmg*(1-edist/e.explodeR);applyPlayerDamage(G,exDmg);applyReflect(G,exDmg);}
      }
      // dash_spawn: 死亡爆出2只小逊der
      if(e._behavior==='dash_spawn'){spawnEnemyAt(G,'normal',e.x,e.y,'early');spawnEnemyAt(G,'normal',e.x,e.y,'early');}
      // 娇der死亡·群体狂暴
      if(e.key==='dainty_e'){G.enemies.forEach(o=>{if(o!==e&&Math.hypot(o.x-e.x,o.y-e.y)<80)o._groupEnrage=300;});addExplosionWave(G,e.x,e.y,80,'#FF80C0');showEcoAlert('💢 娇der阵亡·群体狂暴5秒！');}
      // burst_contact: 死亡范围爆炸
      if(e._burstArmed){addExplosionWave(G,e.x,e.y,50,'#ff4400');if(Math.hypot(G.mx-e.x,G.my-e.y)<50)applyPlayerDamage(G,12);addPt(G,e.x,e.y,'#ff4400',15,4);}
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
  updateQiParticles(G);

  if(G.xp>=G.xpNext){G.xp-=G.xpNext;G.xpNext=Math.floor(G.xpNext*1.38/(G.xpBoost||1));G.lv++;screenShake(4);playSound('levelup');showUpgrade();return;}
  if(G.elapsed/FPS>=G.totalTime){G.won=false;doGameover();return;}
  if(G.mhp<=0){doGameover();return;}
  if(G.bugs.length===0&&G.enemies.length>10&&G.elapsed%90===0){applyPlayerDamage(G,0.06*90);if(G.elapsed%450===0)showEcoAlert('⚠ 灵虫已灭·天道侵蚀！');}
  updateBuffToast();
  updateHUD();
}

// ══════ 场景背景系统：离屏预渲染 + 动态层 + 粒子 ══════
const _sceneCache={};let _sceneCacheId=-1;
function _makeCanvas(w,h){
  try{const oc=new OffscreenCanvas(w,h);oc.getContext('2d');return oc;}
  catch(e){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
}
function drawSceneBackground(ctx,G){
  const id=G.stageId||1;
  if(_sceneCacheId!==id||!_sceneCache[id]||_sceneCache[id].width!==W||_sceneCache[id].height!==H)buildSceneCache(id);
  ctx.drawImage(_sceneCache[id],0,0);
  drawSceneAnimated(ctx,G,id);
  updateAndDrawEnvParticles(ctx,G,id);
}
function buildSceneCache(id){
  const oc=_makeCanvas(W,H);const c=oc.getContext('2d');_sceneCacheId=id;_sceneCache[id]=oc;
  const B={1:_b1,2:_b2,3:_b3,4:_b4,5:_b5,6:_b6,7:_b7,8:_b8,9:_b9,10:_b10};
  if(B[id])B[id](c);
}
// ── 工具函数 ──
function _noise(c,x,y,w,h,alpha,r,g,b){
  const img=c.createImageData(w,h);const d=img.data;
  for(let i=0;i<w*h;i++){const n=Math.random();d[i*4]=r;d[i*4+1]=g;d[i*4+2]=b;d[i*4+3]=n*alpha*255;}
  c.putImageData(img,x,y);
}
function _brickWall(c,bw,bh,r,g,b,alpha){
  c.save();
  for(let y=0;y<H;y+=bh){const off=Math.floor(y/bh)%2*(bw/2);for(let x=-bw+off;x<W+bw;x+=bw){const sh=0.85+Math.random()*0.3;c.fillStyle=`rgba(${Math.round(r*sh)},${Math.round(g*sh)},${Math.round(b*sh)},${alpha})`;c.fillRect(x+1,y+1,bw-2,bh-2);}}
  c.strokeStyle=`rgba(${Math.round(r*0.35)},${Math.round(g*0.35)},${Math.round(b*0.35)},${alpha*1.4})`;c.lineWidth=2;
  for(let y=0;y<=H;y+=bh){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
  for(let y=0;y<H;y+=bh){const off=Math.floor(y/bh)%2*(bw/2);for(let x=-bw+off;x<W+bw;x+=bw){c.beginPath();c.moveTo(x,y);c.lineTo(x,y+bh);c.stroke();}}
  c.restore();
}
function _stoneFloor(c,gs,r,g,b,alpha){
  c.save();
  for(let y=0;y<H;y+=gs){for(let x=0;x<W;x+=gs){const sh=0.80+Math.random()*0.40;c.fillStyle=`rgba(${Math.round(r*sh)},${Math.round(g*sh)},${Math.round(b*sh)},${alpha})`;c.fillRect(x+1,y+1,gs-2,gs-2);}}
  c.strokeStyle=`rgba(${Math.round(r*0.3)},${Math.round(g*0.3)},${Math.round(b*0.3)},${alpha*1.6})`;c.lineWidth=2;
  for(let x=0;x<=W;x+=gs){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();}
  for(let y=0;y<=H;y+=gs){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
  c.restore();
}
function _radialVignette(c,col1,col2){
  const vg=c.createRadialGradient(W/2,H/2,H*0.15,W/2,H/2,H*0.85);vg.addColorStop(0,col1);vg.addColorStop(1,col2);
  c.fillStyle=vg;c.fillRect(0,0,W,H);
}
// ── 第1关：废弃丹室 ──
function _b1(c){
  const bg=c.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#1a0d06');bg.addColorStop(0.5,'#140a04');bg.addColorStop(1,'#1f0e08');c.fillStyle=bg;c.fillRect(0,0,W,H);
  _brickWall(c,52,28,110,72,42,0.75);
  const burnGrad=c.createLinearGradient(0,0,0,H*0.4);burnGrad.addColorStop(0,'rgba(8,3,0,0.55)');burnGrad.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=burnGrad;c.fillRect(0,0,W,H*0.4);
  _noise(c,0,0,W,H,18,80,45,20);
  const fx=W*0.70,fy=H*0.28;c.save();
  const shadow=c.createRadialGradient(fx,fy+68,5,fx,fy+68,70);shadow.addColorStop(0,'rgba(0,0,0,0.7)');shadow.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=shadow;c.beginPath();c.ellipse(fx,fy+72,65,20,0,0,Math.PI*2);c.fill();
  for(let side of[-1,1]){const legGrad=c.createLinearGradient(fx+side*38,fy,fx+side*42,fy+52);legGrad.addColorStop(0,'#7a5830');legGrad.addColorStop(0.4,'#c09060');legGrad.addColorStop(1,'#4a3018');c.fillStyle=legGrad;c.fillRect(fx+side*38-4,fy,8,52);}
  const bodyGrad=c.createRadialGradient(fx-18,fy-18,8,fx,fy,48);bodyGrad.addColorStop(0,'#e0b878');bodyGrad.addColorStop(0.3,'#a07840');bodyGrad.addColorStop(0.7,'#604820');bodyGrad.addColorStop(1,'#301808');c.fillStyle=bodyGrad;c.beginPath();c.arc(fx,fy,46,0,Math.PI*2);c.fill();c.strokeStyle='#8a6030';c.lineWidth=3;c.beginPath();c.arc(fx,fy,46,0,Math.PI*2);c.stroke();
  const mouthGrad=c.createRadialGradient(fx,fy-38,4,fx,fy-38,22);mouthGrad.addColorStop(0,'rgba(255,80,10,0.9)');mouthGrad.addColorStop(0.4,'rgba(200,40,5,0.5)');mouthGrad.addColorStop(1,'rgba(100,10,0,0)');c.fillStyle=mouthGrad;c.beginPath();c.ellipse(fx,fy-38,22,10,0,0,Math.PI*2);c.fill();
  const rimGrad=c.createLinearGradient(fx-24,fy-46,fx+24,fy-46);rimGrad.addColorStop(0,'#5a3818');rimGrad.addColorStop(0.5,'#d0a060');rimGrad.addColorStop(1,'#5a3818');c.fillStyle=rimGrad;c.beginPath();c.ellipse(fx,fy-46,24,7,0,0,Math.PI*2);c.fill();
  for(let k=0;k<10;k++){const ka=k/10*Math.PI*2,rx=fx+Math.cos(ka)*44,ry=fy+Math.sin(ka)*44;const rg=c.createRadialGradient(rx-1.5,ry-1.5,0,rx,ry,5);rg.addColorStop(0,'#f0d080');rg.addColorStop(0.5,'#b08030');rg.addColorStop(1,'#402008');c.fillStyle=rg;c.beginPath();c.arc(rx,ry,5,0,Math.PI*2);c.fill();}
  c.strokeStyle='#2a1408';c.lineWidth=3;c.beginPath();c.moveTo(fx-12,fy-28);c.lineTo(fx+16,fy+8);c.lineTo(fx+8,fy+24);c.stroke();c.strokeStyle='rgba(255,200,100,0.3)';c.lineWidth=1;c.beginPath();c.moveTo(fx-12,fy-28);c.lineTo(fx+16,fy+8);c.stroke();
  c.restore();
  [[W*0.12,H*0.72],[W*0.25,H*0.58],[W*0.38,H*0.82],[W*0.18,H*0.88]].forEach(([cx,cy],i)=>{c.save();const cg=c.createRadialGradient(cx-3,cy-4,1,cx,cy,10);cg.addColorStop(0,'rgba(150,255,180,0.9)');cg.addColorStop(0.5,'rgba(60,180,90,0.7)');cg.addColorStop(1,'rgba(20,80,40,0.3)');c.fillStyle=cg;const ang=i*0.9;c.beginPath();c.moveTo(cx+Math.cos(ang)*2,cy-10);c.lineTo(cx+Math.cos(ang+2.2)*8,cy+6);c.lineTo(cx+Math.cos(ang+4.4)*7,cy+8);c.lineTo(cx+Math.cos(ang-2.2)*8,cy+6);c.closePath();c.fill();c.shadowBlur=12;c.shadowColor='rgba(80,255,120,0.6)';c.strokeStyle='rgba(120,255,150,0.5)';c.lineWidth=1;c.stroke();c.restore();});
  const scorch=c.createRadialGradient(fx,fy+68,5,fx,fy+68,90);scorch.addColorStop(0,'rgba(0,0,0,0.6)');scorch.addColorStop(0.5,'rgba(40,15,5,0.3)');scorch.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=scorch;c.beginPath();c.arc(fx,fy+68,90,0,Math.PI*2);c.fill();
  const fx2=W*0.20,fy2=H*0.68;c.save();const b2=c.createRadialGradient(fx2-8,fy2-8,4,fx2,fy2,24);b2.addColorStop(0,'#806040');b2.addColorStop(1,'#302010');c.fillStyle=b2;c.beginPath();c.arc(fx2,fy2,22,0,Math.PI*2);c.fill();c.strokeStyle='#604828';c.lineWidth=2;c.stroke();c.restore();
  _radialVignette(c,'rgba(0,0,0,0)','rgba(0,0,0,0.65)');
}
// ── 第2关：龟裂洞府 ──
function _b2(c){
  const bg=c.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#080c18');bg.addColorStop(0.6,'#060a12');bg.addColorStop(1,'#0a0e1a');c.fillStyle=bg;c.fillRect(0,0,W,H);
  for(let y=0;y<H;y+=18){const shade=0.6+Math.random()*0.5;c.fillStyle=`rgba(${Math.round(50*shade)},${Math.round(56*shade)},${Math.round(70*shade)},0.45)`;c.fillRect(0,y,W,16);}
  _noise(c,0,0,W,H,22,40,50,80);
  const cracks=[[[W*0.15,0],[W*0.22,H*0.18],[W*0.18,H*0.40],[W*0.28,H*0.65],[W*0.22,H]],[[W*0.60,0],[W*0.55,H*0.22],[W*0.62,H*0.50],[W*0.58,H*0.78],[W*0.65,H]],[[0,H*0.35],[W*0.30,H*0.42],[W*0.55,H*0.38],[W*0.80,H*0.45],[W,H*0.40]],[[W*0.40,H*0.55],[W*0.52,H*0.65],[W*0.44,H*0.80],[W*0.55,H]]];
  cracks.forEach(pts=>{c.strokeStyle='rgba(0,0,0,0.9)';c.lineWidth=8;c.lineJoin='round';c.beginPath();pts.forEach(([x,y],i)=>i===0?c.moveTo(x,y):c.lineTo(x,y));c.stroke();c.strokeStyle='rgba(10,20,50,0.95)';c.lineWidth=4;c.beginPath();pts.forEach(([x,y],i)=>i===0?c.moveTo(x,y):c.lineTo(x,y));c.stroke();const glowGrad=c.createLinearGradient(pts[0][0],pts[0][1],pts[pts.length-1][0],pts[pts.length-1][1]);glowGrad.addColorStop(0,'rgba(60,120,255,0)');glowGrad.addColorStop(0.5,'rgba(100,160,255,0.7)');glowGrad.addColorStop(1,'rgba(60,120,255,0)');c.strokeStyle=glowGrad;c.lineWidth=1.5;c.beginPath();pts.forEach(([x,y],i)=>i===0?c.moveTo(x,y):c.lineTo(x,y));c.stroke();c.strokeStyle='rgba(180,200,255,0.15)';c.lineWidth=0.5;c.beginPath();pts.forEach(([x,y],i)=>i===0?c.moveTo(x,y):c.lineTo(x,y));c.stroke();});
  const shards=[[W*0.42,H*0.18],[W*0.22,H*0.62],[W*0.72,H*0.45]];shards.forEach(([sx,sy],i)=>{c.save();const haloGrad=c.createRadialGradient(sx,sy,5,sx,sy,45);haloGrad.addColorStop(0,'rgba(80,130,255,0.25)');haloGrad.addColorStop(1,'rgba(80,130,255,0)');c.fillStyle=haloGrad;c.beginPath();c.arc(sx,sy,45,0,Math.PI*2);c.fill();const shardGrad=c.createRadialGradient(sx-4,sy-6,2,sx,sy,18);shardGrad.addColorStop(0,'rgba(200,230,255,0.95)');shardGrad.addColorStop(0.4,'rgba(100,160,255,0.7)');shardGrad.addColorStop(1,'rgba(40,80,200,0.2)');c.fillStyle=shardGrad;const sz=14+i*3;c.beginPath();c.moveTo(sx,sy-sz);c.lineTo(sx+sz*0.6,sy);c.lineTo(sx,sy+sz);c.lineTo(sx-sz*0.6,sy);c.closePath();c.fill();c.strokeStyle='rgba(150,200,255,0.8)';c.lineWidth=1.5;c.stroke();c.fillStyle='rgba(255,255,255,0.9)';c.beginPath();c.arc(sx-3,sy-4,3,0,Math.PI*2);c.fill();c.restore();});
  for(let i=0;i<8;i++){const sx=W*0.08+i*(W*0.12),sh=20+Math.sin(i*1.7)*16;const stGrad=c.createLinearGradient(sx,0,sx,sh);stGrad.addColorStop(0,'rgba(60,68,88,0.9)');stGrad.addColorStop(1,'rgba(30,36,50,0.3)');c.fillStyle=stGrad;c.beginPath();c.moveTo(sx-7,0);c.lineTo(sx,sh);c.lineTo(sx+7,0);c.closePath();c.fill();}
  const waterGrad=c.createLinearGradient(0,H*0.85,0,H);waterGrad.addColorStop(0,'rgba(30,50,100,0)');waterGrad.addColorStop(1,'rgba(30,50,100,0.35)');c.fillStyle=waterGrad;c.fillRect(0,H*0.85,W,H*0.15);
  c.strokeStyle='rgba(80,120,200,0.25)';c.lineWidth=1;for(let i=0;i<5;i++){const wy=H*0.88+i*5;c.beginPath();c.moveTo(W*0.1,wy);c.bezierCurveTo(W*0.3,wy-3,W*0.7,wy+3,W*0.9,wy);c.stroke();}
  _radialVignette(c,'rgba(0,0,0,0)','rgba(0,0,0,0.70)');
}
// ── 第3关：残破宗门广场 ──
function _b3(c){
  const bg=c.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0a0d08');bg.addColorStop(1,'#0e1208');c.fillStyle=bg;c.fillRect(0,0,W,H);
  _stoneFloor(c,58,115,108,90,0.80);_noise(c,0,0,W,H,15,80,88,60);
  const mossZones=[[W*0.08,H*0.62,70,22],[W*0.32,H*0.78,50,16],[W*0.62,H*0.55,80,18],[W*0.78,H*0.82,55,14],[W*0.18,H*0.92,90,20],[W*0.50,H*0.38,40,12],[W*0.85,H*0.30,45,15],[W*0.42,H*0.12,60,10]];
  mossZones.forEach(([mx,my,rw,rh])=>{const mg=c.createRadialGradient(mx,my,2,mx,my,rw);mg.addColorStop(0,'rgba(50,100,38,0.85)');mg.addColorStop(0.5,'rgba(38,80,28,0.65)');mg.addColorStop(1,'rgba(20,50,15,0)');c.fillStyle=mg;c.beginPath();c.ellipse(mx,my,rw,rh,0,0,Math.PI*2);c.fill();c.fillStyle='rgba(80,150,55,0.35)';c.beginPath();c.ellipse(mx-rw*0.2,my-rh*0.3,rw*0.5,rh*0.4,0,0,Math.PI*2);c.fill();});
  [[W*0.82,H*0.50,H*0.10,H*0.82],[W*0.91,H*0.48,H*0.15,H*0.80]].forEach(([cx,baseW,topY,botY],ci)=>{const pillarW=28;const pilGrad=c.createLinearGradient(cx-pillarW/2,0,cx+pillarW/2,0);pilGrad.addColorStop(0,'rgba(60,58,48,0.9)');pilGrad.addColorStop(0.4,'rgba(110,105,88,0.95)');pilGrad.addColorStop(0.7,'rgba(95,90,75,0.9)');pilGrad.addColorStop(1,'rgba(40,38,30,0.85)');c.fillStyle=pilGrad;c.fillRect(cx-pillarW/2,topY,pillarW,botY-topY);c.strokeStyle='rgba(40,38,30,0.6)';c.lineWidth=1;for(let y=topY+12;y<botY;y+=18){c.beginPath();c.moveTo(cx-pillarW/2+2,y);c.lineTo(cx+pillarW/2-2,y);c.stroke();}c.fillStyle='rgba(70,66,52,0.9)';c.beginPath();c.moveTo(cx-pillarW/2,topY);c.lineTo(cx-pillarW/2-8,topY-12);c.lineTo(cx-2,topY-6);c.lineTo(cx+6,topY-18);c.lineTo(cx+pillarW/2+4,topY-8);c.lineTo(cx+pillarW/2,topY);c.closePath();c.fill();c.fillStyle='rgba(0,0,0,0.4)';c.fillRect(cx+pillarW/2,topY,8,botY-topY);});
  const fp=W*0.14;const poleGrad=c.createLinearGradient(fp-3,0,fp+3,0);poleGrad.addColorStop(0,'#555');poleGrad.addColorStop(0.4,'#bbb');poleGrad.addColorStop(1,'#444');c.fillStyle=poleGrad;c.fillRect(fp-3,H*0.06,6,H*0.56);c.fillStyle='#cca030';c.beginPath();c.arc(fp,H*0.06,7,0,Math.PI*2);c.fill();
  const flagGrad=c.createLinearGradient(fp,H*0.10,fp+55,H*0.32);flagGrad.addColorStop(0,'rgba(180,50,30,0.95)');flagGrad.addColorStop(0.4,'rgba(210,60,35,0.9)');flagGrad.addColorStop(1,'rgba(130,35,18,0.85)');c.fillStyle=flagGrad;c.beginPath();c.moveTo(fp,H*0.10);c.bezierCurveTo(fp+30,H*0.11,fp+55,H*0.16,fp+52,H*0.22);c.bezierCurveTo(fp+54,H*0.28,fp+35,H*0.32,fp,H*0.30);c.closePath();c.fill();c.fillStyle='rgba(100,28,15,0.8)';c.beginPath();c.moveTo(fp,H*0.12);c.lineTo(fp-14,H*0.155);c.lineTo(fp-10,H*0.21);c.lineTo(fp,H*0.22);c.closePath();c.fill();
  c.strokeStyle='rgba(220,170,50,0.60)';c.lineWidth=2;for(let k=0;k<3;k++){const fy2=H*0.14+k*H*0.05;c.beginPath();c.moveTo(fp+4,fy2);c.lineTo(fp+44-k*4,fy2);c.stroke();}c.strokeStyle='rgba(80,20,10,0.35)';c.lineWidth=1;c.beginPath();c.moveTo(fp+15,H*0.11);c.lineTo(fp+18,H*0.30);c.stroke();c.beginPath();c.moveTo(fp+32,H*0.13);c.lineTo(fp+30,H*0.30);c.stroke();
  for(let i=0;i<18;i++){const lx=Math.random()*W,ly=H*0.55+Math.random()*H*0.40,lr=3+Math.random()*5,ang=Math.random()*Math.PI;c.fillStyle=['rgba(100,80,20,0.6)','rgba(120,70,15,0.55)','rgba(80,60,10,0.5)'][Math.floor(Math.random()*3)];c.beginPath();c.ellipse(lx,ly,lr,lr*0.4,ang,0,Math.PI*2);c.fill();}
  _radialVignette(c,'rgba(0,0,0,0)','rgba(0,0,0,0.60)');
}
// ── 第4关：法宝仓库 ──
function _b4(c){
  const bg=c.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#080810');bg.addColorStop(1,'#060610');c.fillStyle=bg;c.fillRect(0,0,W,H);
  for(let y=0;y<H;y+=48){for(let x=0;x<W;x+=48){const shade=0.7+Math.random()*0.4;const ev=(Math.floor(x/48)+Math.floor(y/48))%2===0;c.fillStyle=ev?`rgba(${Math.round(30*shade)},${Math.round(30*shade)},${Math.round(55*shade)},0.85)`:`rgba(${Math.round(22*shade)},${Math.round(22*shade)},${Math.round(42*shade)},0.85)`;c.fillRect(x+1,y+1,46,46);}}
  c.strokeStyle='rgba(60,80,140,0.55)';c.lineWidth=1.5;for(let x=0;x<=W;x+=48){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();}for(let y=0;y<=H;y+=48){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
  c.strokeStyle='rgba(100,140,220,0.30)';c.lineWidth=1;for(let y=24;y<H;y+=48){for(let x=24;x<W;x+=48){c.beginPath();c.moveTo(x-8,y);c.lineTo(x+8,y);c.moveTo(x,y-8);c.lineTo(x,y+8);c.stroke();c.beginPath();c.arc(x,y,5,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(x-5,y-5);c.lineTo(x+5,y+5);c.moveTo(x+5,y-5);c.lineTo(x-5,y+5);c.stroke();}}
  _noise(c,0,0,W,H,12,20,20,60);
  const shelves=[{x1:W*0.04,x2:W*0.46,rows:[H*0.20,H*0.38,H*0.56,H*0.74]},{x1:W*0.54,x2:W*0.96,rows:[H*0.20,H*0.38,H*0.56,H*0.74]}];
  shelves.forEach(sh=>{sh.rows.forEach(sy=>{const boardGrad=c.createLinearGradient(sh.x1,sy,sh.x1,sy+H*0.17);boardGrad.addColorStop(0,'rgba(140,100,55,0.90)');boardGrad.addColorStop(0.1,'rgba(180,130,70,0.85)');boardGrad.addColorStop(0.9,'rgba(100,70,35,0.80)');boardGrad.addColorStop(1,'rgba(60,40,18,0.75)');c.fillStyle=boardGrad;c.fillRect(sh.x1,sy,sh.x2-sh.x1,H*0.17);c.fillStyle='rgba(220,180,100,0.18)';c.fillRect(sh.x1,sy,sh.x2-sh.x1,4);c.fillStyle='rgba(0,0,0,0.40)';c.fillRect(sh.x1,sy+H*0.17-4,sh.x2-sh.x1,4);const slotW=(sh.x2-sh.x1)/4;for(let k=1;k<4;k++){const slotX=sh.x1+k*slotW;c.fillStyle='rgba(60,40,18,0.70)';c.fillRect(slotX-2,sy,4,H*0.17);c.fillStyle='rgba(180,130,70,0.25)';c.fillRect(slotX-1,sy,1,H*0.17);}});for(let side of[sh.x1,sh.x2]){const colGrad=c.createLinearGradient(side-4,0,side+4,0);colGrad.addColorStop(0,'rgba(80,55,25,0.9)');colGrad.addColorStop(0.5,'rgba(150,110,55,0.9)');colGrad.addColorStop(1,'rgba(60,40,18,0.85)');c.fillStyle=colGrad;c.fillRect(side-5,H*0.12,10,H*0.76);}});
  const artifacts=[{x:W*0.12,y:H*0.28,col:'#40ccee',col2:'rgba(40,180,220,'},{x:W*0.28,y:H*0.46,col:'#ee9940',col2:'rgba(220,140,40,'},{x:W*0.38,y:H*0.28,col:'#aa55ff',col2:'rgba(150,70,255,'},{x:W*0.62,y:H*0.46,col:'#44ee88',col2:'rgba(40,210,100,'},{x:W*0.72,y:H*0.28,col:'#ff5566',col2:'rgba(255,60,80,'},{x:W*0.85,y:H*0.64,col:'#ffee44',col2:'rgba(240,220,40,'}];
  artifacts.forEach(({x,y,col,col2})=>{c.save();c.fillStyle='rgba(80,60,25,0.7)';c.fillRect(x-12,y+10,24,8);c.fillStyle='rgba(140,110,50,0.5)';c.fillRect(x-10,y+10,20,2);const hg=c.createRadialGradient(x,y,4,x,y,28);hg.addColorStop(0,col2+'0.40)');hg.addColorStop(1,col2+'0)');c.fillStyle=hg;c.beginPath();c.arc(x,y,28,0,Math.PI*2);c.fill();c.fillStyle=col;c.shadowBlur=20;c.shadowColor=col;c.beginPath();for(let k=0;k<6;k++){const a=k/6*Math.PI*2-Math.PI/6;c.lineTo(x+Math.cos(a)*9,y+Math.sin(a)*9);}c.closePath();c.fill();c.fillStyle='rgba(255,255,255,0.50)';c.shadowBlur=0;c.beginPath();for(let k=0;k<6;k++){const a=k/6*Math.PI*2-Math.PI/6;c.lineTo(x-3+Math.cos(a)*5,y-4+Math.sin(a)*5);}c.closePath();c.fill();c.restore();});
  _radialVignette(c,'rgba(0,0,0,0)','rgba(0,0,0,0.65)');
}
// ── 第5关：豪华厅堂 ──
function _b5(c){
  const bg=c.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#1a0a05');bg.addColorStop(0.5,'#120804');bg.addColorStop(1,'#180a04');c.fillStyle=bg;c.fillRect(0,0,W,H);
  for(let y=0;y<H;y+=80){for(let x=0;x<W;x+=80){const shade=0.75+Math.random()*0.35;c.fillStyle=`rgba(${Math.round(90*shade)},${Math.round(18*shade)},${Math.round(12*shade)},0.85)`;c.fillRect(x+1,y+1,78,78);c.strokeStyle=`rgba(${Math.round(130*shade)},${Math.round(25*shade)},${Math.round(18*shade)},0.3)`;c.lineWidth=1;c.beginPath();c.moveTo(x+Math.random()*80,y+Math.random()*80);c.bezierCurveTo(x+Math.random()*80,y+Math.random()*80,x+Math.random()*80,y+Math.random()*80,x+Math.random()*80,y+Math.random()*80);c.stroke();}}
  c.strokeStyle='rgba(200,160,60,0.35)';c.lineWidth=1.5;for(let x=0;x<=W;x+=80){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();}for(let y=0;y<=H;y+=80){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
  _noise(c,0,0,W,H,14,80,15,8);
  const cL=W*0.28,cR=W*0.72;const carpetGrad=c.createLinearGradient(cL,0,cR,0);carpetGrad.addColorStop(0,'rgba(100,12,8,0.92)');carpetGrad.addColorStop(0.15,'rgba(140,16,10,0.88)');carpetGrad.addColorStop(0.5,'rgba(160,18,12,0.90)');carpetGrad.addColorStop(0.85,'rgba(140,16,10,0.88)');carpetGrad.addColorStop(1,'rgba(100,12,8,0.92)');c.fillStyle=carpetGrad;c.fillRect(cL,0,cR-cL,H);
  c.strokeStyle='rgba(80,8,5,0.20)';c.lineWidth=1;for(let y=0;y<H;y+=4){c.beginPath();c.moveTo(cL,y);c.lineTo(cR,y);c.stroke();}
  for(let x of[cL,cR]){const eg=c.createLinearGradient(x-6,0,x+6,0);eg.addColorStop(0,'rgba(160,120,30,0.5)');eg.addColorStop(0.5,'rgba(240,200,80,0.95)');eg.addColorStop(1,'rgba(160,120,30,0.5)');c.fillStyle=eg;c.fillRect(x-5,0,10,H);}
  c.strokeStyle='rgba(200,160,50,0.35)';c.lineWidth=1;c.beginPath();c.moveTo(cL+14,0);c.lineTo(cL+14,H);c.stroke();c.beginPath();c.moveTo(cR-14,0);c.lineTo(cR-14,H);c.stroke();
  c.strokeStyle='rgba(220,180,60,0.30)';c.lineWidth=1.5;for(let y=-60;y<H+60;y+=90){c.beginPath();c.moveTo(W*0.5,y-45);c.lineTo(cR-8,y);c.lineTo(W*0.5,y+45);c.lineTo(cL+8,y);c.closePath();c.stroke();}
  c.strokeStyle='rgba(200,160,40,0.15)';c.lineWidth=1;for(let y=90;y<H;y+=90){c.beginPath();c.arc(W*0.5,y,18,0,Math.PI*2);c.stroke();}
  [[W*0.05,1],[W*0.92,-1]].forEach(([bx,dir])=>{for(let py=H*0.08;py<H*0.85;py+=H*0.24){const panW=50,panH=H*0.20;c.strokeStyle='rgba(80,140,70,0.85)';c.lineWidth=3;c.strokeRect(dir>0?bx:bx-panW,py,panW,panH);c.fillStyle='rgba(20,45,20,0.55)';c.fillRect(dir>0?bx+3:bx-panW+3,py+3,panW-6,panH-6);c.strokeStyle='rgba(60,110,50,0.40)';c.lineWidth=1;for(let k=1;k<4;k++){const ky=py+panH*k/4;c.beginPath();c.moveTo(dir>0?bx+3:bx-panW+3,ky);c.lineTo(dir>0?bx+panW-3:bx-3,ky);c.stroke();}for(let k=1;k<4;k++){const kx=dir>0?bx+panW*k/4:bx-panW*k/4;c.beginPath();c.moveTo(kx,py+3);c.lineTo(kx,py+panH-3);c.stroke();}c.strokeStyle='rgba(70,110,60,0.65)';c.lineWidth=2.5;c.beginPath();c.moveTo(dir>0?bx+panW*0.3:bx-panW*0.7,py+panH);c.lineTo(dir>0?bx+panW*0.3:bx-panW*0.7,py+panH+18);c.stroke();c.beginPath();c.moveTo(dir>0?bx+panW*0.7:bx-panW*0.3,py+panH);c.lineTo(dir>0?bx+panW*0.7:bx-panW*0.3,py+panH+18);c.stroke();}});
  [W*0.18,W*0.38,W*0.50,W*0.62,W*0.82].forEach((lx,i)=>{const ly=22+(i%2)*8;c.strokeStyle='rgba(100,80,30,0.60)';c.lineWidth=1.5;c.beginPath();c.moveTo(lx,0);c.lineTo(lx,ly-18);c.stroke();const lGrad=c.createRadialGradient(lx-5,ly-6,3,lx,ly,18);lGrad.addColorStop(0,'rgba(255,180,100,0.95)');lGrad.addColorStop(0.3,'rgba(220,50,15,0.90)');lGrad.addColorStop(0.75,'rgba(160,20,8,0.85)');lGrad.addColorStop(1,'rgba(80,8,3,0.80)');c.fillStyle=lGrad;c.beginPath();c.ellipse(lx,ly,15,20,0,0,Math.PI*2);c.fill();c.strokeStyle='rgba(100,20,8,0.60)';c.lineWidth=1;for(let k=-2;k<=2;k++){const ky=ly+k*7;const rx=Math.sqrt(Math.max(0,1-((ky-ly)/20)**2))*15;c.beginPath();c.moveTo(lx-rx,ky);c.lineTo(lx+rx,ky);c.stroke();}c.fillStyle='rgba(255,220,150,0.35)';c.beginPath();c.ellipse(lx-4,ly-7,5,8,0,0,Math.PI*2);c.fill();c.strokeStyle='rgba(200,160,30,0.55)';c.lineWidth=1;for(let k=-2;k<=2;k++){c.beginPath();c.moveTo(lx+k*3,ly+20);c.lineTo(lx+k*3+Math.sin(k)*2,ly+34);c.stroke();}const floorGlow=c.createRadialGradient(lx,ly+20,5,lx,ly+20,50);floorGlow.addColorStop(0,'rgba(255,150,30,0.12)');floorGlow.addColorStop(1,'rgba(255,150,30,0)');c.fillStyle=floorGlow;c.beginPath();c.arc(lx,ly+20,50,0,Math.PI*2);c.fill();});
  _radialVignette(c,'rgba(0,0,0,0)','rgba(0,0,0,0.60)');
}
// ── 第6关：修仙食堂 ──
function _b6(c){
  const bg=c.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0e0b04');bg.addColorStop(1,'#120d05');c.fillStyle=bg;c.fillRect(0,0,W,H);
  const ts=44;for(let y=0;y<H;y+=ts){for(let x=0;x<W;x+=ts){const shade=0.75+Math.random()*0.40,ev=(Math.floor(x/ts)+Math.floor(y/ts))%2;c.fillStyle=`rgba(${ev?Math.round(120*shade):Math.round(90*shade)},${ev?Math.round(105*shade):Math.round(78*shade)},${ev?Math.round(60*shade):Math.round(45*shade)},0.85)`;c.fillRect(x+1,y+1,ts-2,ts-2);}}
  c.strokeStyle='rgba(60,45,18,0.65)';c.lineWidth=1.5;for(let x=0;x<=W;x+=ts){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();}for(let y=0;y<=H;y+=ts){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
  _noise(c,0,0,W,H,16,90,70,30);
  const px=W*0.78,py=H*0.62;const sh=c.createRadialGradient(px,py+48,8,px,py+48,70);sh.addColorStop(0,'rgba(0,0,0,0.7)');sh.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=sh;c.beginPath();c.ellipse(px,py+52,65,18,0,0,Math.PI*2);c.fill();
  [[px-25,py+28,px-28,py+58],[px+25,py+28,px+28,py+58]].forEach(([x1,y1,x2,y2])=>{const lg=c.createLinearGradient(x1-4,y1,x1+4,y1);lg.addColorStop(0,'#3a3a3a');lg.addColorStop(0.5,'#888');lg.addColorStop(1,'#2a2a2a');c.fillStyle=lg;c.fillRect(x1-4,y1,8,y2-y1);});
  const bg2=c.createRadialGradient(px-20,py-20,8,px,py,42);bg2.addColorStop(0,'#aaaaaa');bg2.addColorStop(0.3,'#666');bg2.addColorStop(0.7,'#333');bg2.addColorStop(1,'#111');c.fillStyle=bg2;c.beginPath();c.arc(px,py,40,0,Math.PI*2);c.fill();c.strokeStyle='#555';c.lineWidth=3;c.beginPath();c.arc(px,py,40,0,Math.PI*2);c.stroke();
  const rg=c.createLinearGradient(px-42,py-42,px+42,py-42);rg.addColorStop(0,'#333');rg.addColorStop(0.5,'#aaa');rg.addColorStop(1,'#333');c.fillStyle=rg;c.beginPath();c.ellipse(px,py-38,42,10,0,0,Math.PI*2);c.fill();c.fillStyle='rgba(80,130,40,0.65)';c.beginPath();c.ellipse(px,py-38,36,8,0,0,Math.PI*2);c.fill();
  for(let k=0;k<6;k++){const a=k/6*Math.PI*2,sx=px+Math.cos(a)*20,sy=py-38+Math.sin(a)*8;const stG=c.createRadialGradient(sx,sy-20,2,sx,sy-20,28);stG.addColorStop(0,'rgba(200,200,210,0.28)');stG.addColorStop(1,'rgba(200,200,210,0)');c.fillStyle=stG;c.beginPath();c.arc(sx,sy-20,28,0,Math.PI*2);c.fill();}
  for(let k=0;k<10;k++){const ka=k/10*Math.PI*2;const rg2=c.createRadialGradient(px+Math.cos(ka)*38-1,py+Math.sin(ka)*38-1,0,px+Math.cos(ka)*38,py+Math.sin(ka)*38,5);rg2.addColorStop(0,'#ddd');rg2.addColorStop(1,'#444');c.fillStyle=rg2;c.beginPath();c.arc(px+Math.cos(ka)*38,py+Math.sin(ka)*38,5,0,Math.PI*2);c.fill();}
  _radialVignette(c,'rgba(0,0,0,0)','rgba(0,0,0,0.60)');
}
// ── 第7关：美容内室 ──
function _b7(c){
  const bg=c.createRadialGradient(W*0.4,H*0.3,60,W*0.5,H*0.5,H);bg.addColorStop(0,'#1a0a18');bg.addColorStop(0.5,'#120810');bg.addColorStop(1,'#0d060c');c.fillStyle=bg;c.fillRect(0,0,W,H);
  for(let y=0;y<H;y+=72){for(let x=0;x<W;x+=72){const sh=0.7+Math.random()*0.5;c.fillStyle=`rgba(${Math.round(100*sh)},${Math.round(55*sh)},${Math.round(90*sh)},0.80)`;c.fillRect(x+1,y+1,70,70);c.strokeStyle=`rgba(${Math.round(140*sh)},${Math.round(80*sh)},${Math.round(120*sh)},0.25)`;c.lineWidth=0.8;c.beginPath();c.moveTo(x+Math.random()*72,y+Math.random()*72);c.bezierCurveTo(x+Math.random()*72,y+Math.random()*72,x+Math.random()*72,y+Math.random()*72,x+Math.random()*72,y+Math.random()*72);c.stroke();}}
  c.strokeStyle='rgba(180,120,160,0.30)';c.lineWidth=1.5;for(let x=0;x<=W;x+=72){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();}for(let y=0;y<=H;y+=72){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
  _noise(c,0,0,W,H,12,120,60,110);
  const softGlow=c.createRadialGradient(W*0.5,H*0.4,60,W*0.5,H*0.5,H*0.7);softGlow.addColorStop(0,'rgba(255,150,200,0.12)');softGlow.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=softGlow;c.fillRect(0,0,W,H);
  c.strokeStyle='rgba(240,160,210,0.10)';c.lineWidth=1;for(let x=-W;x<W*2;x+=60){c.beginPath();c.moveTo(x,0);c.lineTo(x+30,H);c.stroke();}
  const mx=W*0.12,my=H*0.46;const mirGrad=c.createLinearGradient(mx-32,my-48,mx+32,my+48);mirGrad.addColorStop(0,'#7a5060');mirGrad.addColorStop(0.5,'#ccaabc');mirGrad.addColorStop(1,'#5a3848');c.strokeStyle=mirGrad;c.lineWidth=8;c.beginPath();c.ellipse(mx,my,28,42,0,0,Math.PI*2);c.stroke();
  const mirFace=c.createLinearGradient(mx-24,my-38,mx+24,my+38);mirFace.addColorStop(0,'rgba(20,28,50,0.85)');mirFace.addColorStop(0.5,'rgba(30,40,70,0.75)');mirFace.addColorStop(1,'rgba(15,22,42,0.90)');c.fillStyle=mirFace;c.beginPath();c.ellipse(mx,my,22,36,0,0,Math.PI*2);c.fill();c.fillStyle='rgba(220,220,255,0.30)';c.beginPath();c.ellipse(mx-8,my-14,7,14,0.3,0,Math.PI*2);c.fill();c.fillStyle='rgba(255,255,255,0.15)';c.beginPath();c.ellipse(mx-10,my-20,3,5,-0.2,0,Math.PI*2);c.fill();
  c.strokeStyle='rgba(180,140,160,0.60)';c.lineWidth=3;c.beginPath();c.moveTo(mx,my+42);c.lineTo(mx,my+65);c.stroke();c.beginPath();c.moveTo(mx-18,my+65);c.lineTo(mx+18,my+65);c.stroke();
  const tx=W*0.80,ty=H*0.60;const tableGrad=c.createLinearGradient(tx-W*0.09,ty,tx+W*0.09,ty);tableGrad.addColorStop(0,'rgba(100,55,80,0.90)');tableGrad.addColorStop(0.5,'rgba(160,90,128,0.85)');tableGrad.addColorStop(1,'rgba(100,55,80,0.90)');c.fillStyle=tableGrad;c.fillRect(tx-W*0.09,ty,W*0.18,H*0.28);c.fillStyle='rgba(220,160,195,0.25)';c.fillRect(tx-W*0.09,ty,W*0.18,5);
  [[tx-30,ty-10,6,'#ff88bb'],[tx-10,ty-14,5,'#ffbbdd'],[tx+18,ty-8,4,'#ff66aa'],[tx+28,ty-12,3,'#ffccee']].forEach(([ox,oy,or,oc])=>{const og=c.createRadialGradient(ox-1,oy-2,1,ox,oy,or);og.addColorStop(0,'#fff');og.addColorStop(0.4,oc);og.addColorStop(1,'rgba(0,0,0,0.2)');c.fillStyle=og;c.beginPath();c.arc(ox,oy,or,0,Math.PI*2);c.fill();});
  c.fillStyle='rgba(80,44,64,0.80)';[[tx-W*0.07,ty+H*0.28],[tx+W*0.07-6,ty+H*0.28]].forEach(([lx,ly])=>c.fillRect(lx,ly,6,H*0.06));
  _radialVignette(c,'rgba(0,0,0,0)','rgba(0,0,0,0.65)');
}
// ── 第8关：紫府祠堂 ──
function _b8(c){
  const bg=c.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#100c00');bg.addColorStop(0.5,'#0c0900');bg.addColorStop(1,'#140e00');c.fillStyle=bg;c.fillRect(0,0,W,H);
  for(let y=0;y<H;y+=66){for(let x=0;x<W;x+=66){const sh=0.72+Math.random()*0.45;c.fillStyle=`rgba(${Math.round(100*sh)},${Math.round(85*sh)},${Math.round(20*sh)},0.82)`;c.fillRect(x+1,y+1,64,64);c.strokeStyle=`rgba(${Math.round(180*sh)},${Math.round(150*sh)},${Math.round(40*sh)},0.20)`;c.lineWidth=0.7;c.beginPath();c.moveTo(x+Math.random()*66,y+Math.random()*66);c.bezierCurveTo(x+Math.random()*66,y+Math.random()*66,x+Math.random()*66,y+Math.random()*66,x+Math.random()*66,y+Math.random()*66);c.stroke();}}
  c.strokeStyle='rgba(200,168,50,0.40)';c.lineWidth=1.5;for(let x=0;x<=W;x+=66){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();}for(let y=0;y<=H;y+=66){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
  c.strokeStyle='rgba(200,168,40,0.15)';c.lineWidth=1;for(let y=-H;y<H*2;y+=132){c.beginPath();c.moveTo(0,y);c.lineTo(W,y+W*0.6);c.stroke();}
  _noise(c,0,0,W,H,10,100,80,0);
  const ex=W*0.5,ey=H*0.22;const eHalo=c.createRadialGradient(ex,ey,20,ex,ey,80);eHalo.addColorStop(0,'rgba(220,180,60,0.22)');eHalo.addColorStop(1,'rgba(220,180,60,0)');c.fillStyle=eHalo;c.beginPath();c.arc(ex,ey,80,0,Math.PI*2);c.fill();
  const embGrad=c.createLinearGradient(ex-50,ey-50,ex+50,ey+50);embGrad.addColorStop(0,'#8a6820');embGrad.addColorStop(0.5,'#f0c860');embGrad.addColorStop(1,'#8a6820');c.strokeStyle=embGrad;c.lineWidth=4;c.beginPath();c.arc(ex,ey,50,0,Math.PI*2);c.stroke();c.strokeStyle='rgba(200,160,50,0.45)';c.lineWidth=1.5;c.beginPath();c.arc(ex,ey,44,0,Math.PI*2);c.stroke();
  c.strokeStyle=embGrad;c.lineWidth=2.5;for(let i=0;i<6;i++){const a1=i/6*Math.PI*2-Math.PI/6,a2=(i+2)/6*Math.PI*2-Math.PI/6;c.beginPath();c.moveTo(ex+Math.cos(a1)*38,ey+Math.sin(a1)*38);c.lineTo(ex+Math.cos(a2)*38,ey+Math.sin(a2)*38);c.stroke();}
  const coreGrad=c.createRadialGradient(ex-5,ey-5,3,ex,ey,16);coreGrad.addColorStop(0,'rgba(255,230,120,0.9)');coreGrad.addColorStop(1,'rgba(180,130,30,0.5)');c.fillStyle=coreGrad;c.beginPath();c.arc(ex,ey,14,0,Math.PI*2);c.fill();
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const dg=c.createRadialGradient(ex+Math.cos(a)*48,ey+Math.sin(a)*48,0,ex+Math.cos(a)*48,ey+Math.sin(a)*48,4);dg.addColorStop(0,'#f0c860');dg.addColorStop(1,'#8a6820');c.fillStyle=dg;c.beginPath();c.arc(ex+Math.cos(a)*48,ey+Math.sin(a)*48,3.5,0,Math.PI*2);c.fill();}
  [[W*0.08,H*0.30],[W*0.92,H*0.30],[W*0.08,H*0.72],[W*0.92,H*0.72]].forEach(([ppx,ppy])=>{const pilGrad=c.createLinearGradient(ppx,ppy-110,ppx,ppy);pilGrad.addColorStop(0,'rgba(220,180,60,0)');pilGrad.addColorStop(0.3,'rgba(240,200,80,0.50)');pilGrad.addColorStop(0.7,'rgba(220,180,60,0.45)');pilGrad.addColorStop(1,'rgba(200,160,50,0.15)');c.fillStyle=pilGrad;c.fillRect(ppx-7,ppy-110,14,110);const baseGrad=c.createLinearGradient(ppx-12,ppy,ppx+12,ppy);baseGrad.addColorStop(0,'#604818');baseGrad.addColorStop(0.5,'#c09040');baseGrad.addColorStop(1,'#604818');c.fillStyle=baseGrad;c.fillRect(ppx-12,ppy,24,12);const gemGrad=c.createRadialGradient(ppx-3,ppy-5,2,ppx,ppy,10);gemGrad.addColorStop(0,'rgba(255,230,120,0.95)');gemGrad.addColorStop(0.5,'rgba(220,180,60,0.8)');gemGrad.addColorStop(1,'rgba(150,110,20,0.4)');c.fillStyle=gemGrad;c.beginPath();c.arc(ppx,ppy,10,0,Math.PI*2);c.fill();});
  const shrX=W*0.5,shrY=H*0.84;c.strokeStyle='rgba(190,150,40,0.55)';c.lineWidth=2;c.strokeRect(shrX-W*0.08,shrY,W*0.16,H*0.14);c.beginPath();c.moveTo(shrX-W*0.08,shrY);c.lineTo(shrX,shrY-H*0.06);c.lineTo(shrX+W*0.08,shrY);c.stroke();c.fillStyle='rgba(180,140,30,0.12)';c.fillRect(shrX-W*0.08,shrY,W*0.16,H*0.14);
  _radialVignette(c,'rgba(0,0,0,0)','rgba(0,0,0,0.62)');
}
// ── 第9关：vlog基地 ──
function _b9(c){
  const bg=c.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#05001a');bg.addColorStop(0.5,'#020010');bg.addColorStop(1,'#080020');c.fillStyle=bg;c.fillRect(0,0,W,H);
  for(let y=H*0.45;y<H;y+=40){for(let x=0;x<W;x+=40){const alpha=0.08+(y-H*0.45)/(H*0.55)*0.22,ev=(Math.floor(x/40)+Math.floor(y/40))%2;c.fillStyle=`rgba(${ev?40:20},${ev?0:0},${ev?80:60},${alpha})`;c.fillRect(x+1,y+1,38,38);}}
  const vpX=W*0.5,vpY=H*0.40;c.strokeStyle='rgba(40,200,240,0.28)';c.lineWidth=1.5;for(let x=-W*0.5;x<W*1.5;x+=50){c.beginPath();c.moveTo(x,H);c.lineTo(vpX+(x-vpX)*0.08,vpY);c.stroke();}
  for(let frac=0;frac<1;frac+=0.10){const y=vpY+(H-vpY)*frac;c.strokeStyle=`rgba(160,50,200,${0.06+frac*0.22})`;c.lineWidth=1+frac*2;c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
  _noise(c,0,0,W,H,14,10,0,60);
  c.font='bold 18px monospace';c.textAlign='center';c.fillStyle='rgba(60,220,255,0.20)';c.shadowBlur=12;c.shadowColor='#40ccff';c.fillText('LIVE',W*0.5,H*0.15);c.shadowBlur=0;
  [[W*0.18,H*0.26],[W*0.50,H*0.18],[W*0.82,H*0.30]].forEach(([cx,cy],i)=>{c.save();const cHalo=c.createRadialGradient(cx,cy,4,cx,cy,45);cHalo.addColorStop(0,'rgba(60,200,240,0.20)');cHalo.addColorStop(1,'rgba(60,200,240,0)');c.fillStyle=cHalo;c.beginPath();c.arc(cx,cy,45,0,Math.PI*2);c.fill();for(let r=10,a=0.55;r<=38;r+=7,a-=0.12){c.strokeStyle=`rgba(60,210,245,${a})`;c.lineWidth=1.5;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.stroke();}c.strokeStyle='rgba(60,220,255,0.70)';c.lineWidth=1.5;c.beginPath();c.moveTo(cx-6,cy);c.lineTo(cx+6,cy);c.moveTo(cx,cy-6);c.lineTo(cx,cy+6);c.stroke();const recX=cx+32,recY=cy-24;const recG=c.createRadialGradient(recX,recY,1,recX,recY,6);recG.addColorStop(0,'#ff8888');recG.addColorStop(0.5,'#ff2222');recG.addColorStop(1,'rgba(200,0,0,0.3)');c.fillStyle=recG;c.beginPath();c.arc(recX,recY,5,0,Math.PI*2);c.fill();c.restore();});
  const refGrad=c.createLinearGradient(0,H*0.7,0,H);refGrad.addColorStop(0,'rgba(30,0,80,0)');refGrad.addColorStop(1,'rgba(30,0,80,0.35)');c.fillStyle=refGrad;c.fillRect(0,H*0.7,W,H*0.3);
  _radialVignette(c,'rgba(0,0,0,0)','rgba(0,0,0,0.72)');
}
// ── 第10关：八角擂台 ──
function _b10(c){
  const bg=c.createRadialGradient(W*0.5,H*0.5,60,W*0.5,H*0.5,H);bg.addColorStop(0,'#1a1010');bg.addColorStop(0.5,'#0e0808');bg.addColorStop(1,'#060404');c.fillStyle=bg;c.fillRect(0,0,W,H);
  const cx=W*0.5,cy=H*0.5,pR=Math.min(W,H)*0.43;
  const outerFog=c.createRadialGradient(cx,cy,pR*0.7,cx,cy,pR*1.8);outerFog.addColorStop(0,'rgba(0,0,0,0)');outerFog.addColorStop(0.6,'rgba(180,160,200,0.08)');outerFog.addColorStop(1,'rgba(150,130,180,0.18)');c.fillStyle=outerFog;c.fillRect(0,0,W,H);
  c.save();c.beginPath();for(let i=0;i<8;i++){const a=i/8*Math.PI*2-Math.PI/8;i===0?c.moveTo(cx+Math.cos(a)*pR,cy+Math.sin(a)*pR):c.lineTo(cx+Math.cos(a)*pR,cy+Math.sin(a)*pR);}c.closePath();c.clip();
  for(let y=cy-pR;y<cy+pR;y+=60){for(let x=cx-pR;x<cx+pR;x+=60){const sh=0.6+Math.random()*0.5;c.fillStyle=`rgba(${Math.round(80*sh)},${Math.round(30*sh)},${Math.round(25*sh)},0.90)`;c.fillRect(x,y,60,60);}}
  c.strokeStyle='rgba(180,140,50,0.12)';c.lineWidth=1;for(let i=0;i<16;i++){const a=i/16*Math.PI*2;c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+Math.cos(a)*pR,cy+Math.sin(a)*pR);c.stroke();}
  for(let r=pR*0.25;r<pR;r+=pR*0.25){c.strokeStyle=`rgba(180,140,50,${0.08+r/pR*0.10})`;c.lineWidth=1;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.stroke();}
  _noise(c,Math.round(cx-pR),Math.round(cy-pR),Math.round(pR*2),Math.round(pR*2),18,80,30,20);c.restore();
  for(let[lw,alpha]of[[8,0.25],[4,0.65],[1.5,0.90]]){const edgeGrad=c.createLinearGradient(cx-pR,cy-pR,cx+pR,cy+pR);edgeGrad.addColorStop(0,'#7a5820');edgeGrad.addColorStop(0.5,'#f0c860');edgeGrad.addColorStop(1,'#7a5820');c.strokeStyle=edgeGrad;c.lineWidth=lw;c.globalAlpha=alpha;c.beginPath();for(let i=0;i<8;i++){const a=i/8*Math.PI*2-Math.PI/8;i===0?c.moveTo(cx+Math.cos(a)*pR,cy+Math.sin(a)*pR):c.lineTo(cx+Math.cos(a)*pR,cy+Math.sin(a)*pR);}c.closePath();c.stroke();}c.globalAlpha=1;
  c.strokeStyle='rgba(200,160,50,0.35)';c.lineWidth=1.5;c.setLineDash([8,10]);c.beginPath();for(let i=0;i<8;i++){const a=i/8*Math.PI*2-Math.PI/8;i===0?c.moveTo(cx+Math.cos(a)*pR*0.55,cy+Math.sin(a)*pR*0.55):c.lineTo(cx+Math.cos(a)*pR*0.55,cy+Math.sin(a)*pR*0.55);}c.closePath();c.stroke();c.setLineDash([]);
  c.strokeStyle='rgba(220,180,60,0.45)';c.lineWidth=2.5;c.beginPath();for(let i=0;i<8;i++){const a=i/8*Math.PI*2-Math.PI/8;i===0?c.moveTo(cx+Math.cos(a)*32,cy+Math.sin(a)*32):c.lineTo(cx+Math.cos(a)*32,cy+Math.sin(a)*32);}c.closePath();c.stroke();
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2-Math.PI/8,ppx=cx+Math.cos(a)*pR,ppy=cy+Math.sin(a)*pR;const pilGrad=c.createLinearGradient(ppx,ppy-100,ppx,ppy);pilGrad.addColorStop(0,'rgba(255,220,80,0)');pilGrad.addColorStop(0.3,'rgba(255,200,60,0.55)');pilGrad.addColorStop(0.7,'rgba(240,180,50,0.50)');pilGrad.addColorStop(1,'rgba(200,150,30,0.20)');c.fillStyle=pilGrad;c.fillRect(ppx-6,ppy-100,12,100);const gemG=c.createRadialGradient(ppx-3,ppy-5,2,ppx,ppy,10);gemG.addColorStop(0,'rgba(255,240,150,0.98)');gemG.addColorStop(0.4,'rgba(240,200,60,0.85)');gemG.addColorStop(1,'rgba(180,130,20,0.3)');c.fillStyle=gemG;c.shadowBlur=20;c.shadowColor='rgba(255,200,60,0.6)';c.beginPath();c.arc(ppx,ppy,9,0,Math.PI*2);c.fill();c.shadowBlur=0;const baseG=c.createLinearGradient(ppx-14,ppy,ppx+14,ppy);baseG.addColorStop(0,'#503810');baseG.addColorStop(0.5,'#b08030');baseG.addColorStop(1,'#503810');c.fillStyle=baseG;c.fillRect(ppx-14,ppy,28,10);}
  for(let i=0;i<32;i++){const ca=i/32*Math.PI*2,cr=pR+25+Math.sin(i*0.9)*20,ccx=cx+Math.cos(ca)*cr,ccy=cy+Math.sin(ca)*cr;const cloudGrad=c.createRadialGradient(ccx,ccy,2,ccx,ccy,22+Math.sin(i*1.5)*8);cloudGrad.addColorStop(0,'rgba(220,215,235,0.20)');cloudGrad.addColorStop(1,'rgba(200,195,220,0)');c.fillStyle=cloudGrad;c.beginPath();c.arc(ccx,ccy,22+Math.sin(i*1.5)*8,0,Math.PI*2);c.fill();}
  _radialVignette(c,'rgba(0,0,0,0)','rgba(0,0,0,0.70)');
}

// ══════ 动态叠加层 ══════
function drawSceneAnimated(ctx,G,id){
  const t=G.elapsed;ctx.save();
  if(id===1){const fx=W*0.70,fy=H*0.28,pulse=0.18+Math.sin(t*0.08)*0.10;const fg=ctx.createRadialGradient(fx,fy-38,4,fx,fy-38,40);fg.addColorStop(0,`rgba(255,80,10,${pulse})`);fg.addColorStop(1,'rgba(255,60,0,0)');ctx.fillStyle=fg;ctx.beginPath();ctx.arc(fx,fy-38,40,0,Math.PI*2);ctx.fill();}
  if(id===2){ctx.globalAlpha=0.10+Math.sin(t*0.045)*0.06;const wg=ctx.createRadialGradient(W*0.5,H*0.92,10,W*0.5,H*0.92,W*0.4);wg.addColorStop(0,'rgba(40,80,180,0.35)');wg.addColorStop(1,'rgba(40,80,180,0)');ctx.fillStyle=wg;ctx.fillRect(0,H*0.80,W,H*0.20);}
  if(id===4){[{x:W*0.15,y:H*0.32,c:'rgba(40,180,220,'},{x:W*0.38,y:H*0.28,c:'rgba(150,70,255,'},{x:W*0.62,y:H*0.46,c:'rgba(40,210,100,'},{x:W*0.85,y:H*0.64,c:'rgba(240,220,40,'}].forEach(({x,y,c},i)=>{const p=0.12+Math.sin(t*0.04+i*1.5)*0.08;const g=ctx.createRadialGradient(x,y,4,x,y,30);g.addColorStop(0,c+p+')');g.addColorStop(1,c+'0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,30,0,Math.PI*2);ctx.fill();});}
  if(id===5){[W*0.18,W*0.38,W*0.50,W*0.62,W*0.82].forEach((lx,i)=>{const p=0.06+Math.sin(t*0.025+i*1.2)*0.03;const lg=ctx.createRadialGradient(lx,80,8,lx,80,90);lg.addColorStop(0,`rgba(255,130,30,${p})`);lg.addColorStop(1,'rgba(255,130,30,0)');ctx.fillStyle=lg;ctx.beginPath();ctx.arc(lx,80,90,0,Math.PI*2);ctx.fill();});}
  if(id===6){const px=W*0.78,py=H*0.62,p=0.10+Math.sin(t*0.06)*0.05;const sg=ctx.createRadialGradient(px,py-45,5,px,py-45,55);sg.addColorStop(0,`rgba(200,200,215,${p})`);sg.addColorStop(1,'rgba(200,200,215,0)');ctx.fillStyle=sg;ctx.beginPath();ctx.arc(px,py-45,55,0,Math.PI*2);ctx.fill();}
  if(id===7){const p=0.06+Math.sin(t*0.02)*0.03;const fg=ctx.createRadialGradient(W*0.5,H*0.4,40,W*0.5,H*0.5,H*0.6);fg.addColorStop(0,`rgba(255,140,190,${p})`);fg.addColorStop(1,'rgba(255,140,190,0)');ctx.fillStyle=fg;ctx.fillRect(0,0,W,H);}
  if(id===8){const ex=W*0.5,ey=H*0.22,p=0.10+Math.sin(t*0.022)*0.05;const eg=ctx.createRadialGradient(ex,ey,15,ex,ey,75);eg.addColorStop(0,`rgba(220,180,50,${p})`);eg.addColorStop(1,'rgba(220,180,50,0)');ctx.fillStyle=eg;ctx.beginPath();ctx.arc(ex,ey,75,0,Math.PI*2);ctx.fill();[[W*0.08,H*0.30],[W*0.92,H*0.30],[W*0.08,H*0.72],[W*0.92,H*0.72]].forEach(([ppx,ppy],i)=>{const pp=0.22+Math.sin(t*0.03+i*0.8)*0.10;const pg=ctx.createLinearGradient(ppx,ppy-110,ppx,ppy);pg.addColorStop(0,`rgba(240,200,80,0)`);pg.addColorStop(0.4,`rgba(240,200,80,${pp})`);pg.addColorStop(1,'rgba(200,160,50,0.10)');ctx.fillStyle=pg;ctx.fillRect(ppx-6,ppy-110,12,110);});}
  if(id===9){const scanY=((t*2)%H);ctx.globalAlpha=0.14;ctx.strokeStyle='rgba(60,240,200,0.5)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,scanY);ctx.lineTo(W,scanY);ctx.stroke();ctx.globalAlpha=0.06;ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(0,scanY);ctx.lineTo(W,scanY);ctx.stroke();[[W*0.18+32,H*0.26-24],[W*0.50+32,H*0.18-24],[W*0.82+32,H*0.30-24]].forEach(([rx,ry],i)=>{const blink=Math.sin(t*0.10+i*2.5)>0;ctx.globalAlpha=blink?0.90:0.20;ctx.fillStyle='#ff2222';ctx.shadowBlur=blink?12:0;ctx.shadowColor='#ff0000';ctx.beginPath();ctx.arc(rx,ry,5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;});}
  if(id===10){const cx=W*0.5,cy=H*0.5,pR=Math.min(W,H)*0.43;for(let i=0;i<8;i++){const a=i/8*Math.PI*2-Math.PI/8,ppx=cx+Math.cos(a)*pR,ppy=cy+Math.sin(a)*pR,pp=0.22+Math.sin(t*0.04+i*0.8)*0.12;ctx.globalAlpha=pp;ctx.shadowBlur=25;ctx.shadowColor='rgba(255,200,60,0.8)';ctx.fillStyle='rgba(255,230,100,0.70)';ctx.beginPath();ctx.arc(ppx,ppy,9,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}ctx.globalAlpha=1;ctx.globalAlpha=0.06+Math.sin(t*0.015)*0.03;const ag=ctx.createRadialGradient(cx,cy,20,cx,cy,pR*0.52);ag.addColorStop(0,'rgba(220,80,30,0.25)');ag.addColorStop(0.7,'rgba(200,60,20,0.08)');ag.addColorStop(1,'rgba(200,60,20,0)');ctx.fillStyle=ag;ctx.beginPath();ctx.arc(cx,cy,pR*0.52,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;ctx.restore();
}

// ══════ 环境粒子系统 ══════
function updateAndDrawEnvParticles(ctx,G,id){
  if(!G.envParticles)G.envParticles=[];
  G.envParticles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life--;if(p.vx)p.vx*=0.99;});
  G.envParticles=G.envParticles.filter(p=>p.life>0);
  function _esp(x,y,vx,vy,life,color,size){if(G.envParticles.length>=50)return;G.envParticles.push({x,y,vx,vy,life,maxLife:life,color,size});}
  function _maybeSpawn(maxN,prob,fn){if(G.envParticles.length<maxN&&Math.random()<prob)fn();}
  if(id===1){
    _maybeSpawn(18,0.055,()=>_esp(Math.random()*W,H*0.6+Math.random()*H*0.35,(Math.random()-.5)*0.5,-0.35-Math.random()*0.65,180+Math.random()*200,['rgba(80,255,120,0.80)','rgba(120,255,160,0.70)','rgba(60,200,90,0.75)'][Math.floor(Math.random()*3)],1.5+Math.random()*3.0));
    const fx=W*0.70,fy=H*0.28;_maybeSpawn(22,0.08,()=>_esp(fx+(Math.random()-.5)*20,fy-44,(Math.random()-.5)*1.5,-1.5-Math.random()*2.5,40+Math.random()*60,['rgba(255,200,50,0.90)','rgba(255,140,20,0.85)','rgba(255,80,10,0.80)'][Math.floor(Math.random()*3)],1+Math.random()*2));
  }
  if(id===2){_maybeSpawn(14,0.04,()=>_esp(Math.random()*W,Math.random()*H,(Math.random()-.5)*0.8,(Math.random()-.5)*0.8,120+Math.random()*160,'rgba(80,140,255,0.65)',1+Math.random()*2));_maybeSpawn(10,0.03,()=>_esp(Math.random()*W,H*0.82,0,0.4+Math.random()*0.8,60+Math.random()*100,'rgba(60,100,200,0.55)',1+Math.random()*1.5));}
  if(id===3){_maybeSpawn(16,0.04,()=>_esp(Math.random()*W,-5,(Math.random()-.5)*0.6,0.4+Math.random()*0.8,200+Math.random()*250,['rgba(100,75,20,0.70)','rgba(120,80,18,0.65)','rgba(80,55,12,0.60)'][Math.floor(Math.random()*3)],2+Math.random()*4));_maybeSpawn(10,0.025,()=>_esp(Math.random()*W,H*0.7+Math.random()*H*0.3,(Math.random()-.5)*0.4,-0.2-Math.random()*0.4,80+Math.random()*120,'rgba(160,140,100,0.30)',1+Math.random()*2));}
  if(id===4){_maybeSpawn(16,0.04,()=>_esp(Math.random()*W,Math.random()*H,(Math.random()-.5)*0.3,(Math.random()-.5)*0.3,100+Math.random()*150,['rgba(80,140,220,0.70)','rgba(100,180,255,0.60)','rgba(60,100,200,0.65)'][Math.floor(Math.random()*3)],1+Math.random()*2));}
  if(id===5){_maybeSpawn(14,0.04,()=>_esp(Math.random()*W,Math.random()*H,(Math.random()-.5)*0.4,(Math.random()-.5)*0.3,120+Math.random()*180,'rgba(220,180,50,0.50)',1+Math.random()*2));}
  if(id===6){
    const px=W*0.78,py=H*0.62;
    _maybeSpawn(24,0.10,()=>_esp(px+(Math.random()-.5)*30,py-38,(Math.random()-.5)*0.7,-0.5-Math.random()*1.0,120+Math.random()*160,'rgba(210,210,220,0.55)',3+Math.random()*5.5));
    _maybeSpawn(28,0.05,()=>_esp(W*0.22+(Math.random()-.5)*20,H*0.72-16,(Math.random()-.5)*0.4,-0.3-Math.random()*0.7,90+Math.random()*120,'rgba(200,200,215,0.45)',2+Math.random()*3.5));
    _maybeSpawn(32,0.03,()=>_esp(Math.random()*W,Math.random()*H,(Math.random()-.5)*0.3,-0.2-Math.random()*0.3,120+Math.random()*140,['rgba(220,170,55,0.60)','rgba(190,110,40,0.55)','rgba(150,200,55,0.55)'][Math.floor(Math.random()*3)],1.5+Math.random()*2.5));
  }
  if(id===7){_maybeSpawn(28,0.07,()=>_esp(Math.random()*W,-8,(Math.random()-.5)*0.8,0.35+Math.random()*0.90,200+Math.random()*280,['rgba(255,120,165,0.80)','rgba(255,180,205,0.72)','rgba(255,150,185,0.75)','rgba(245,100,155,0.68)'][Math.floor(Math.random()*4)],2.5+Math.random()*4.0));}
  if(id===8){_maybeSpawn(16,0.04,()=>_esp(Math.random()*W,Math.random()*H,(Math.random()-.5)*0.4,(Math.random()-.5)*0.3,140+Math.random()*200,'rgba(220,185,50,0.55)',1+Math.random()*2));}
  if(id===9){_maybeSpawn(22,0.06,()=>_esp(Math.random()*W,H*0.4+Math.random()*H*0.6,(Math.random()-.5)*0.4,-0.25-Math.random()*0.5,80+Math.random()*130,['rgba(255,50,50,0.85)','rgba(50,255,80,0.85)','rgba(50,80,255,0.85)','rgba(255,220,30,0.80)'][Math.floor(Math.random()*4)],2+Math.random()*3));}
  if(id===10){
    _maybeSpawn(20,0.04,()=>{const cx=W*0.5,cy=H*0.5,pR=Math.min(W,H)*0.43,a=Math.random()*Math.PI*2,r=pR+10+Math.random()*40;_esp(cx+Math.cos(a)*r,cy+Math.sin(a)*r,(Math.random()-.5)*0.3,(Math.random()-.5)*0.3,200+Math.random()*250,'rgba(210,205,230,0.35)',4+Math.random()*7);});
    _maybeSpawn(30,0.05,()=>{const cx=W*0.5,cy=H*0.5,pR=Math.min(W,H)*0.43,a=Math.random()*Math.PI*2,r=Math.random()*pR*0.9;_esp(cx+Math.cos(a)*r,cy+Math.sin(a)*r,(Math.random()-.5)*0.3,-0.2-Math.random()*0.4,100+Math.random()*160,'rgba(255,210,60,0.60)',1+Math.random()*2);});
  }
  ctx.save();
  G.envParticles.forEach(p=>{const r=p.life/p.maxLife;ctx.globalAlpha=Math.min(1,r*2)*0.85;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,Math.max(0.5,p.size*r*0.6+p.size*0.4),0,Math.PI*2);ctx.fill();});
  ctx.globalAlpha=1;ctx.restore();
}

// ── 玩家粒子辅助（文件作用域，避免每帧重定义）──
function _addParticle(G,x,y,vx,vy,life,color,size,text){
  if(!G.playerParticles)G.playerParticles=[];
  if(G.playerParticles.length>=50)return;
  G.playerParticles.push({x,y,vx,vy,life,maxLife:life,color,size,text:text||null});
}

// ══════ 绘制 ══════
function draw(){
  // ── 冲击帧（冻帧+灰度，跳过clearRect保留上帧画面）──
  if(G.impactFrames>0){
    ctx.save();
    ctx.fillStyle='rgba(30,30,30,0.55)';ctx.fillRect(0,0,W,H);
    if(G.impactFrames===1){ctx.fillStyle='rgba(255,50,0,0.18)';ctx.fillRect(0,0,W,H);}
    G.impactFrames--;
    ctx.restore();
    return;
  }
  ctx.save();
  if(shakePower>0){ctx.translate((Math.random()-0.5)*shakePower,(Math.random()-0.5)*shakePower);shakePower*=0.84;if(shakePower<0.2)shakePower=0;}
  ctx.clearRect(0,0,W,H);

  // ── 背景 ──
  drawSceneBackground(ctx,G);

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

  // 粒子（形状多样性）
  G.pts.forEach((p,i)=>{
    if(G.comboTier<4&&i%2===0)return;
    if(G.comboTier>=4&&i%3!==0)return;
    ctx.save();
    ctx.globalAlpha=p.life*0.65;ctx.fillStyle=p.color;
    const r=Math.max(0.5,p.r);
    if(p.shape==='diamond'){
      ctx.beginPath();ctx.moveTo(p.x,p.y-r);ctx.lineTo(p.x+r,p.y);ctx.lineTo(p.x,p.y+r);ctx.lineTo(p.x-r,p.y);ctx.closePath();ctx.fill();
    } else if(p.shape==='line'){
      ctx.strokeStyle=p.color;ctx.lineWidth=r*0.7;ctx.globalAlpha=p.life*0.5;
      const ang=Math.atan2(p.vy,p.vx);ctx.beginPath();
      ctx.moveTo(p.x-Math.cos(ang)*r*2,p.y-Math.sin(ang)*r*2);
      ctx.lineTo(p.x+Math.cos(ang)*r*2,p.y+Math.sin(ang)*r*2);ctx.stroke();
    } else {
      ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  });
  ctx.globalAlpha=1;

  // 灵气粒子
  drawQiParticles(ctx, G);

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
    if(e.special==='suicidal'){ctx.save();ctx.shadowBlur=18;ctx.shadowColor='#ff1111';}
    if(e.shield>0){ctx.save();ctx.strokeStyle='rgba(68,136,204,0.7)';ctx.lineWidth=2;ctx.shadowBlur=8;ctx.shadowColor='#4488CC';ctx.beginPath();ctx.arc(e.x,e.y,e.sz/2+5,0,Math.PI*2);ctx.stroke();ctx.restore();}
    if((e.shieldBubble||0)>0){ctx.save();ctx.globalAlpha=0.4;ctx.strokeStyle='#44aacc';ctx.lineWidth=1;ctx.beginPath();ctx.arc(e.x,e.y,e.sz/2+8,0,Math.PI*2);ctx.stroke();ctx.restore();}
    if(e._frostFlash>0){e._frostFlash--;ctx.save();ctx.globalAlpha=0.5;ctx.fillStyle='#aaddff';ctx.shadowBlur=12;ctx.shadowColor='#88CCFF';ctx.beginPath();ctx.arc(e.x,e.y,e.sz/2+5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=0.3;ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(e.x,e.y,e.sz/2,0,Math.PI*2);ctx.fill();ctx.restore();}
    if(e.freezeTimer>0){ctx.save();ctx.globalAlpha=0.6;ctx.strokeStyle='#88CCFF';ctx.lineWidth=3;ctx.shadowBlur=10;ctx.shadowColor='#88CCFF';ctx.beginPath();ctx.arc(e.x,e.y,e.sz/2+4,0,Math.PI*2);ctx.stroke();ctx.restore();}
    if(e.frostDot>0){ctx.save();ctx.globalAlpha=0.12+Math.sin(G.elapsed*0.08)*0.06;ctx.fillStyle='#88CCFF';ctx.beginPath();ctx.arc(e.x,e.y,e.sz/2+6,0,Math.PI*2);ctx.fill();ctx.restore();}
    // ── 大头人形分派 ──
    let _drawnAsHuman = true;
    switch(e.typeKey || e.key){
      case 'normal':  drawEnemy_normal(ctx,e,G); break;
      case 'lied':    drawEnemy_lied(ctx,e,G); break;
      case 'sly':     drawEnemy_sly(ctx,e,G); break;
      case 'hard':    drawEnemy_hard(ctx,e,G); break;
      case 'cute':    drawEnemy_cute(ctx,e,G); break;
      case 'hikikomori': drawEnemy_hikikomori(ctx,e,G); break;
      case 'dainty_e':drawEnemy_dainty_e(ctx,e,G); break;
      case 'swift':   drawEnemy_swift(ctx,e,G); break;
      case 'poor':    drawEnemy_poor(ctx,e,G); break;
      case 'dumb':    drawEnemy_dumb(ctx,e,G); break;
      case 'slick':   drawEnemy_slick(ctx,e,G); break;
      case 'poser':   drawEnemy_poser(ctx,e,G); break;
      case 'runner':  drawEnemy_runner(ctx,e,G); break;
      case 'greedy':  drawEnemy_greedy(ctx,e,G); break;
      case 'roller':  drawEnemy_roller(ctx,e,G); break;
      case 'berserker': drawEnemy_berserker(ctx,e,G); break;
      case 'rich':    drawEnemy_rich(ctx,e,G); break;
      case 'lazy':    drawEnemy_lazy(ctx,e,G); break;
      case 'brute':   drawEnemy_brute(ctx,e,G); break;
      default: _drawnAsHuman = false;
    }
    if(_drawnAsHuman){
      // 人形已绘制，只补HP条
      const pct2=e.hp/e.maxhp;
      ctx.fillStyle='rgba(0,0,0,0.45)';ctx.fillRect(e.x-e.sz/2,e.y-e.sz/2-7,e.sz,2);
      ctx.fillStyle=pct2>0.5?'#1D9E75':'#E24B4A';ctx.fillRect(e.x-e.sz/2,e.y-e.sz/2-7,e.sz*pct2,2);
      drawBubble(ctx, e);
      ctx.globalAlpha=1;
      return;
    }
    // 以下是原有几何图形绘制（保留不动）
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
    if(e.special==='suicidal')ctx.restore();
    ctx.globalAlpha=alpha;
    ctx.fillStyle='rgba(0,0,0,0.45)';ctx.fillRect(e.x-e.sz/2,e.y-e.sz/2-7,e.sz,2);
    ctx.fillStyle=pct>0.5?'#1D9E75':'#E24B4A';ctx.fillRect(e.x-e.sz/2,e.y-e.sz/2-7,e.sz*pct,2);
    drawBubble(ctx, e);
    ctx.globalAlpha=1;
  });

  // ══════ 玩家Q版人形 ══════
  function drawPlayer(ctx, G){
    const tier=G.rageTier||0;
    const rt=RAGE_TIERS[tier]||RAGE_TIERS[0];
    const hpPct=G.mhp/G.mmaxhp;
    const dodgeAlpha=G.dodgeTimer>0?0.55:1;
    const hurtShakeX=(G._hurtFrames||0)>0?(Math.random()-0.5)*6:0;
    if(G._hurtFrames>0)G._hurtFrames--;
    const mx=G.mx+hurtShakeX,my=G.my;
    // 行走摆动
    const moved=Math.hypot(G._pmx!==undefined?mx-G._pmx:0,G._pmy!==undefined?my-G._pmy:0)>0.3;
    const bob=moved?Math.sin(G.elapsed*0.18)*1.8:Math.sin(G.elapsed*0.06)*0.5;
    const lean=moved?Math.atan2(my-(G._pmy||my),mx-(G._pmx||mx))*0.12:0;
    G._pmx=mx;G._pmy=my;
    ctx.save();
    ctx.globalAlpha*=dodgeAlpha;
    // 闪避倾斜
    if(G.dodgeTimer>0){ctx.translate(mx,my);ctx.rotate(0.087);ctx.translate(-mx,-my);}
    // ── 境界光晕（底层）──
    if(tier>=1){
      const halo=ctx.createRadialGradient(mx,my-4,6,mx,my-4,30);
      halo.addColorStop(0,rt.glowColor);halo.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=halo;ctx.fillRect(mx-30,my-34,60,60);
    }
    // ── 主体绘制 ──
    ctx.save();
    ctx.translate(mx,my);
    ctx.rotate(lean);
    const boby=bob;
    // 身体发光
    const bodyGlow=tier>=8?80:tier>=7?64:tier>=6?52:tier>=5?36:8+tier*8;
    const glowCol=tier>=8?'#aa0033':tier>=7?'#cc0044':tier>=6?'#ff2200':tier>=3?'#ff4400':rt.color;
    ctx.shadowBlur=bodyGlow;ctx.shadowColor=glowCol;
    // 袍子（主体椭圆）
    const robeCol=tier>=5?'#992222':tier>=3?'#bb2a1a':'#cc3322';
    ctx.fillStyle=robeCol;
    ctx.beginPath();ctx.ellipse(0,6+boby,8,11,0,0,Math.PI*2);ctx.fill();
    // 袍子暗色下半
    ctx.fillStyle=tier>=5?'#661010':'#882020';
    ctx.beginPath();ctx.ellipse(0,12+boby,7,6,0,0,Math.PI*2);ctx.fill();
    // 袖子（左）
    ctx.fillStyle=robeCol;
    ctx.beginPath();ctx.ellipse(-10,6+boby,4,7,-0.25,0,Math.PI*2);ctx.fill();
    // 袖子（右）
    ctx.beginPath();ctx.ellipse(10,6+boby,4,7,0.25,0,Math.PI*2);ctx.fill();
    // 手（肤色小圆）
    ctx.fillStyle='#f5d5a0';ctx.shadowBlur=0;
    ctx.beginPath();ctx.arc(-13,9+boby,2.8,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(13,9+boby,2.8,0,Math.PI*2);ctx.fill();
    // 腿（袍子下方）
    ctx.fillStyle='#442020';
    ctx.beginPath();ctx.ellipse(-4,18+boby,3,4,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(4,18+boby,3,4,0,0,Math.PI*2);ctx.fill();
    // 鞋
    ctx.fillStyle='#1a1008';
    ctx.beginPath();ctx.ellipse(-4,22+boby,3.5,2.2,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(4,22+boby,3.5,2.2,0,0,Math.PI*2);ctx.fill();
    // ── 飘带（后）──
    ctx.fillStyle='#ffcc44';ctx.shadowBlur=6;ctx.shadowColor='#ffcc44';
    const ribbonPhase=Math.sin(G.elapsed*0.12)*2.5;
    ctx.beginPath();ctx.moveTo(-8,4+boby);ctx.quadraticCurveTo(-16+ribbonPhase,10+boby,-14+ribbonPhase,18+boby);
    ctx.lineTo(-10+ribbonPhase,16+boby);ctx.quadraticCurveTo(-10,9+boby,-6,5+boby);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(8,4+boby);ctx.quadraticCurveTo(16-ribbonPhase,10+boby,14-ribbonPhase,18+boby);
    ctx.lineTo(10-ribbonPhase,16+boby);ctx.quadraticCurveTo(10,9+boby,6,5+boby);ctx.closePath();ctx.fill();
    ctx.shadowBlur=bodyGlow;ctx.shadowColor=glowCol;
    // ── 头部（大圆）──
    ctx.fillStyle='#f5d5a0';
    ctx.beginPath();ctx.arc(0,-6+boby,10,0,Math.PI*2);ctx.fill();
    // 头部描边
    if(tier>=4){ctx.strokeStyle=glowCol;ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(0,-6+boby,10.5,0,Math.PI*2);ctx.stroke();}
    // ── 发髻 ──
    ctx.fillStyle='#1a1008';ctx.shadowBlur=0;
    ctx.beginPath();ctx.arc(0,-16+boby,5.5,0,Math.PI);ctx.fill();
    // 发髻小球
    ctx.beginPath();ctx.arc(0,-20+boby,3,0,Math.PI*2);ctx.fill();
    // 发带
    ctx.strokeStyle='#ffcc44';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-5,-18+boby);ctx.lineTo(5,-18+boby);ctx.stroke();
    // 两侧鬓发
    ctx.fillStyle='#1a1008';
    ctx.beginPath();ctx.ellipse(-9,-10+boby,2.5,5,-0.3,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(9,-10+boby,2.5,5,0.3,0,Math.PI*2);ctx.fill();
    // ── 面部 ──
    // 眼白
    ctx.fillStyle='#ffffff';ctx.shadowBlur=0;
    ctx.beginPath();ctx.arc(-4,-7+boby,2.3,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(4,-7+boby,2.3,0,Math.PI*2);ctx.fill();
    // 眼珠（随tier变色+发光）
    const eyeCol=tier>=7?'#ff0044':tier>=5?'#ff1100':tier>=3?'#ff4400':tier>=1?'#ff8800':'#442222';
    const eyeGlow=tier>=6?14:tier>=3?8:0;
    ctx.fillStyle=eyeCol;ctx.shadowBlur=eyeGlow;ctx.shadowColor=eyeCol;
    ctx.beginPath();ctx.arc(-4,-7+boby,1.3,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(4,-7+boby,1.3,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    // 眼高光
    ctx.fillStyle='#ffffff';
    ctx.beginPath();ctx.arc(-4.5,-7.8+boby,0.6,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(3.5,-7.8+boby,0.6,0,Math.PI*2);ctx.fill();
    // 眉毛
    const browY=moved?-8.2+boby+Math.sin(G.elapsed*0.4+tier)*0.5:-8.2+boby;
    ctx.strokeStyle=tier>=3?glowCol:'#333';ctx.lineWidth=1.8;
    if(tier<=1){
      ctx.beginPath();ctx.moveTo(-6,browY-2);ctx.lineTo(-1,browY-2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(1,browY-2);ctx.lineTo(6,browY-2);ctx.stroke();
    }else{
      ctx.beginPath();ctx.moveTo(-6,browY-1);ctx.lineTo(-1,browY+0.5);ctx.stroke();
      ctx.beginPath();ctx.moveTo(6,browY-1);ctx.lineTo(1,browY+0.5);ctx.stroke();
    }
    // 嘴巴
    ctx.strokeStyle=tier===0?'#553322':tier<=2?'#553322':glowCol;ctx.lineWidth=1.5;
    if(tier===0){
      ctx.beginPath();ctx.arc(0,-2+boby,3.5,0.15*Math.PI,0.85*Math.PI);ctx.stroke();
    }else if(tier<=2){
      ctx.beginPath();ctx.moveTo(-3,-2+boby);ctx.lineTo(3,-2+boby);ctx.stroke();
    }else{
      ctx.beginPath();ctx.arc(0,2+boby,4,1.15*Math.PI,1.85*Math.PI);ctx.stroke();
    }
    // 怒气纹（tier3+ 额头纹路）
    if(tier>=3){
      ctx.strokeStyle=glowCol;ctx.lineWidth=1;ctx.shadowBlur=tier>=5?8:4;ctx.shadowColor=glowCol;
      const veinOff=tier>=6?Math.sin(G.elapsed*0.25)*0.8:0;
      ctx.beginPath();ctx.moveTo(-3+veinOff,-12+boby);ctx.lineTo(1+veinOff,-14+boby);ctx.stroke();
      ctx.beginPath();ctx.moveTo(3-veinOff,-12+boby);ctx.lineTo(-1-veinOff,-14+boby);ctx.stroke();
    }
    ctx.shadowBlur=0;
    // ── 武器 ──
    const atkSlot=G.slots.find(s=>s.id&&WEAPONS[s.id]&&WEAPONS[s.id].type==='attack');
    if(atkSlot&&WEAPONS[atkSlot.id]){
      const w=WEAPONS[atkSlot.id];
      const wCol=w.color||(atkSlot.stars>=2?'#ff4400':atkSlot.stars>=1?'#ffaa00':'#1D9E75');
      ctx.fillStyle=wCol;ctx.shadowBlur=8;ctx.shadowColor=wCol;
      // 武器在右手
      ctx.beginPath();ctx.arc(15,8+boby,3.5,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=wCol;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(13,8+boby);ctx.lineTo(16,0+boby);ctx.stroke();
      ctx.shadowBlur=0;
    }
    ctx.restore(); // translate(mx,my)
    // ── tier特效（在translate外部）──
    if(tier>=2&&G.elapsed%30===0)_addParticle(G,mx,my-22,(Math.random()-0.5)*0.5,-1.2-Math.random(),50,'#ffcc00',10,'?');
    if(tier>=3&&G.elapsed%20===0){for(let i=0;i<4;i++){const a=Math.random()*Math.PI*2,d=8+Math.random()*14;_addParticle(G,mx+Math.cos(a)*d,my+6+Math.sin(a)*d,(Math.random()-0.5)*0.8,(Math.random()-0.5)*0.8,30,'#ff8800',2,null);}}
    if(tier>=4){const n=tier>=5?2:1;for(let k=0;k<n;k++){const a=Math.random()*Math.PI*2,d=5+Math.random()*20;_addParticle(G,mx+Math.cos(a)*d,my+6+Math.sin(a)*d,(Math.random()-0.5)*0.6,(Math.random()-0.5)*0.6,25,'#ff4400',2.5,null);}}
    if(tier>=5){const intens=tier>=7?2:1;for(let k=0;k<2+intens;k++){if(Math.random()<0.5)_addParticle(G,mx+(Math.random()-0.5)*10,my-20,(Math.random()-0.5)*0.4,-1-Math.random()*1.5,40,'#ff2200',3,null);}}
    if(tier>=6&&G.elapsed%60===0)_addParticle(G,mx+(Math.random()-0.5)*16,my-24,(Math.random()-0.5)*1,-2-Math.random(),50,'#ff0000',14,'杀！');
    if(tier>=8){ctx.globalAlpha=0.15;ctx.fillStyle='#440022';ctx.shadowBlur=24;ctx.shadowColor='#aa0033';ctx.beginPath();ctx.ellipse(mx,my+6,20,28,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=dodgeAlpha;}
    // 低血红线
    if(hpPct<0.3){ctx.strokeStyle='#ff3333';ctx.lineWidth=1;ctx.shadowBlur=0;ctx.beginPath();ctx.arc(mx,my+6,30,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
  }

  // ══════ 大头人形基础绘制 ══════
  function drawMonsterBase(ctx, x, y, opts){
    const {
      color='#B04040', headR=9, bodyW=5, bodyH=7,
      eyeL={x:-3,y:-1}, eyeR={x:3,y:-1},
      expression='angry', glow=0, glowColor=color,
      lean=0, shake=0, isElite=false
    } = opts;
    ctx.save();
    // 精英外发光环
    if(isElite){ctx.shadowBlur=22;ctx.shadowColor='#ff2200';}
    ctx.translate(x + shake, y);
    ctx.rotate(lean);
    if(glow>0){ ctx.shadowBlur=glow; ctx.shadowColor=glowColor; }
    // 头部
    ctx.fillStyle=color;
    ctx.beginPath(); ctx.arc(0, -bodyH-headR, headR, 0, Math.PI*2); ctx.fill();
    // 眼白
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(eyeL.x, -bodyH-headR+eyeL.y, 2.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeR.x, -bodyH-headR+eyeR.y, 2.2, 0, Math.PI*2); ctx.fill();
    // 眼珠 — 精英红眼
    ctx.fillStyle=isElite?'#ff2200':'#111';
    ctx.beginPath(); ctx.arc(eyeL.x+0.5, -bodyH-headR+eyeL.y+0.3, 1.1, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeR.x+0.5, -bodyH-headR+eyeR.y+0.3, 1.1, 0, Math.PI*2); ctx.fill();
    // 表情线
    ctx.strokeStyle=color; ctx.lineWidth=1.3;
    if(expression==='angry'){
      ctx.beginPath(); ctx.moveTo(-headR*0.55,-bodyH-headR+headR*0.35);
      ctx.lineTo(-headR*0.15,-bodyH-headR+headR*0.55); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(headR*0.55,-bodyH-headR+headR*0.35);
      ctx.lineTo(headR*0.15,-bodyH-headR+headR*0.55); ctx.stroke();
    } else if(expression==='smug'){
      ctx.beginPath(); ctx.moveTo(-headR*0.5,-bodyH-headR+headR*0.3);
      ctx.lineTo(-headR*0.1,-bodyH-headR+headR*0.45); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(headR*0.5,-bodyH-headR+headR*0.45);
      ctx.lineTo(headR*0.1,-bodyH-headR+headR*0.45); ctx.stroke();
    } else if(expression==='scared'){
      ctx.beginPath(); ctx.moveTo(-headR*0.55,-bodyH-headR+headR*0.55);
      ctx.lineTo(-headR*0.15,-bodyH-headR+headR*0.3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(headR*0.55,-bodyH-headR+headR*0.55);
      ctx.lineTo(headR*0.15,-bodyH-headR+headR*0.3); ctx.stroke();
    } else if(expression==='blank'){
      ctx.beginPath(); ctx.moveTo(-headR*0.5,-bodyH-headR+headR*0.4);
      ctx.lineTo(-headR*0.1,-bodyH-headR+headR*0.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(headR*0.5,-bodyH-headR+headR*0.4);
      ctx.lineTo(headR*0.1,-bodyH-headR+headR*0.4); ctx.stroke();
    }
    // 身体椭圆
    ctx.fillStyle=color; ctx.shadowBlur=0;
    ctx.beginPath(); ctx.ellipse(0, 0, bodyW, bodyH, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    // 精英头顶★标识
    if(isElite){
      ctx.save();
      ctx.fillStyle='#ff2200';ctx.font='bold 11px Arial';ctx.textAlign='center';
      ctx.shadowBlur=8;ctx.shadowColor='#ff2200';
      ctx.fillText('★',x,y-bodyH-headR-10);
      ctx.restore();
    }
  }

  // ── 逊der（初期·破旧道袍+愤怒扭曲眉）──────────────────
  function drawEnemy_normal(ctx, e, G){
    const ep = e.enemyPhase || 'early';
    const shake = e._hitShake>0 ? (Math.random()-0.5)*4 : 0;
    if(e._hitShake>0) e._hitShake--;
    const col = ep==='late'?'#6a1010':ep==='mid'?'#922828':'#B04040';
    const glow = ep==='late'?10:ep==='mid'?4:0;
    const headR = ep==='late'?11:ep==='mid'?10:9;
    const lean = 0.18;
    drawMonsterBase(ctx, e.x, e.y, {
      color:col, headR, bodyW:5+(ep==='late'?2:ep==='mid'?1:0),
      bodyH:7, expression:'angry', lean, shake,
      glow, glowColor:'#ff2200'
    });
    // ── 破旧道袍 ──
    ctx.save();ctx.translate(e.x+shake,e.y);ctx.rotate(lean);
    ctx.fillStyle=ep==='late'?'#2a1010':ep==='mid'?'#5a2a1a':'#8B4020';
    ctx.beginPath();ctx.ellipse(0,3,7,10,0.15,0,Math.PI*2);ctx.fill();
    // 袍子补丁
    ctx.fillStyle=ep==='late'?'#1a0a08':'#6a3020';
    ctx.beginPath();ctx.arc(-3,7,2.5,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(4,3,2,0,Math.PI*2);ctx.fill();
    // 扭曲愤怒眉（后期精英）
    if(ep==='late'){
      ctx.strokeStyle='#ff2200';ctx.lineWidth=2;ctx.shadowBlur=8;ctx.shadowColor='#ff2200';
      ctx.beginPath();ctx.moveTo(-7,-15);ctx.lineTo(-2,-12);ctx.lineTo(0,-10);ctx.stroke();
      ctx.beginPath();ctx.moveTo(7,-15);ctx.lineTo(2,-12);ctx.lineTo(0,-10);ctx.stroke();
      ctx.shadowBlur=0;
      // 红色气势光圈
      for(let i=0;i<3;i++){
        const a=G.elapsed*0.06+i*2.09;
        ctx.fillStyle=`rgba(255,60,0,${0.25+Math.sin(G.elapsed*0.1+i)*0.1})`;
        ctx.beginPath();ctx.arc(Math.cos(a)*15,Math.sin(a)*15,2.5,0,Math.PI*2);ctx.fill();
      }
    }
    ctx.restore();
    // 头发粒子
    if(!e._hairPts) e._hairPts=[];
    if(G.elapsed%120===0) e._hairPts.push({x:e.x+(Math.random()-0.5)*6, y:e.y-headR-7, vy:-0.4, life:60});
    e._hairPts = e._hairPts.filter(p=>{
      p.y+=p.vy; p.life--;
      if(p.life>0){
        ctx.save(); ctx.globalAlpha=p.life/60; ctx.fillStyle='#884422';
        ctx.beginPath(); ctx.arc(p.x,p.y,1.2,0,Math.PI*2); ctx.fill(); ctx.restore();
      }
      return p.life>0;
    });
    if(ep==='late'){
      ctx.save(); ctx.globalAlpha=0.25; ctx.strokeStyle='#ff4400'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.sz/2+4, 0, Math.PI*2); ctx.stroke(); ctx.restore();
    }
  }

  // ── 躺der（初期·平躺+拖鞋+破布垫）──────────────────
  function drawEnemy_lied(ctx, e, G){
    const ep = e.enemyPhase || 'early';
    const shake = e._hitShake>0 ? (Math.random()-0.5)*3 : 0;
    if(e._hitShake>0) e._hitShake--;
    const bodyCol=ep==='late'?'#52301c':ep==='mid'?'#6e4026':'#8B5030';
    const headCol=ep==='late'?'#6e3020':ep==='mid'?'#8a4a30':'#A06040';
    const glow=ep==='late'?10:ep==='mid'?4:0;
    ctx.save();
    if(glow>0){ctx.shadowBlur=glow;ctx.shadowColor='#ff2200';}
    ctx.translate(e.x + shake, e.y);
    ctx.rotate(Math.PI*0.5);
    // ── 破布垫（底层）──
    ctx.fillStyle='rgba(60,40,20,0.5)';
    ctx.beginPath();ctx.ellipse(0,0,16,9,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=bodyCol;
    ctx.beginPath(); ctx.ellipse(0, 0, 12, 7, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle=headCol;
    ctx.beginPath(); ctx.arc(14, 0, 7+(ep==='late'?2:ep==='mid'?1:0), 0, Math.PI*2); ctx.fill();
    // ── 拖鞋 ──
    ctx.fillStyle='#D4A060';ctx.shadowBlur=0;
    ctx.beginPath();ctx.ellipse(-10,4,5,2.5,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#8B6020';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(-12,5);ctx.lineTo(-12,7);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-10,5);ctx.lineTo(-10,7);ctx.stroke();
    // 眼睛（一条线=闭眼）
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(14, -2.5, 2, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='#111';
    ctx.beginPath(); ctx.arc(14, -2, 1, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.ellipse(0, -3, 8, 4, 0, 0, Math.PI*2); ctx.fill();
    // Zzz 文字
    if(G.elapsed%120<60){
      ctx.fillStyle='rgba(200,200,255,0.6)';ctx.font='bold 8px Arial';ctx.textAlign='center';
      ctx.fillText('Z',18,-8);ctx.fillText('z',22,-14);ctx.fillText('z',26,-19);
    }
    ctx.restore();
  }

  // ── 苟der（初期·兜帽+斜眼+卷轴）──────────────────
  function drawEnemy_sly(ctx, e, G){
    const ep = e.enemyPhase || 'early';
    const shake = e._hitShake>0 ? (Math.random()-0.5)*3 : 0;
    if(e._hitShake>0) e._hitShake--;
    const col=ep==='late'?'#423060':ep==='mid'?'#5a4a80':'#7060A0';
    const glow=ep==='late'?10:ep==='mid'?4:0;
    const headR=ep==='late'?10:ep==='mid'?9:8;
    drawMonsterBase(ctx, e.x, e.y, {
      color:col, headR, bodyW:4+(ep==='late'?2:ep==='mid'?1:0), bodyH:8,
      expression:'smug', lean:0.1, shake, glow, glowColor:'#ff2200'
    });
    ctx.save(); ctx.translate(e.x+shake, e.y);
    // ── 兜帽 ──
    const hoodCol=ep==='late'?'#2a1840':'#4a3070';
    ctx.fillStyle=hoodCol;
    ctx.beginPath();ctx.arc(0,-8,headR+4,Math.PI,0);ctx.fill();
    ctx.beginPath();ctx.ellipse(0,-8,headR+2,headR+6,0,Math.PI,0);ctx.fill();
    // 兜帽边缘
    ctx.strokeStyle=ep==='late'?'#6a50a0':'#9a80c0';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(0,-8,headR+2,0,Math.PI);ctx.stroke();
    // ── 斜眼（向右偷瞄）──
    ctx.fillStyle='#fff';
    ctx.beginPath();ctx.arc(-3,-6,2.2,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(4,-6,2.2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#111';
    ctx.beginPath();ctx.arc(-2.5,-6.5,1.1,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(4.5,-6.5,1.1,0,Math.PI*2);ctx.fill();
    // ── 卷轴（手持）──
    ctx.fillStyle='#ffeeaa';ctx.strokeStyle='#aa8800';ctx.lineWidth=1;
    ctx.fillRect(8, -16, 7, 9); ctx.strokeRect(8, -16, 7, 9);
    ctx.strokeStyle='#aa6600';ctx.lineWidth=0.5;
    for(let i=1;i<3;i++){ ctx.beginPath(); ctx.moveTo(9,-16+i*3); ctx.lineTo(14,-16+i*3); ctx.stroke(); }
    ctx.restore();
  }

  // ── 硬der（初期·铁甲+盾牌+铆钉）──────────────────
  function drawEnemy_hard(ctx, e, G){
    const ep = e.enemyPhase || 'early';
    const shake = e._hitShake>0 ? (Math.random()-0.5)*3 : 0;
    if(e._hitShake>0) e._hitShake--;
    const dashing = e._dashing>0;
    const col=ep==='late'?'#354050':ep==='mid'?'#4a5870':(dashing?'#8090C0':'#607090');
    const glow=ep==='late'?10:ep==='mid'?4:0;
    const headR=ep==='late'?14:ep==='mid'?13:12;
    drawMonsterBase(ctx, e.x, e.y, {
      color:col, headR, bodyW:7+(ep==='late'?2:ep==='mid'?1:0), bodyH:8,
      expression:'smug', lean: dashing?0.35:0.15, shake, glow, glowColor:'#ff2200'
    });
    ctx.save(); ctx.translate(e.x+shake, e.y);
    // ── 头盔（替换drawMonsterBase默认眼）──
    ctx.fillStyle='#505870'; ctx.strokeStyle='#8090A0'; ctx.lineWidth=1.5;
    ctx.fillRect(-8, -26, 16, 10); ctx.strokeRect(-8, -26, 16, 10);
    // 铆钉
    ctx.fillStyle='#a0b0c0';
    [[-6,-23],[6,-23],[-6,-18],[6,-18]].forEach(([rx,ry])=>{
      ctx.beginPath(); ctx.arc(rx,ry,1.5,0,Math.PI*2); ctx.fill();
    });
    // ── 盾牌（左手）──
    const shieldX=-14,shieldY=-2;
    ctx.fillStyle='#4a5870';ctx.strokeStyle='#a0b0c0';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.ellipse(shieldX,shieldY,6,8,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#c0d0e0';ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(shieldX,shieldY,6,8,0,0,Math.PI*2);ctx.stroke();
    // 盾牌中心十字
    ctx.strokeStyle='#FFD700';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(shieldX-4,shieldY);ctx.lineTo(shieldX+4,shieldY);ctx.stroke();
    ctx.beginPath();ctx.moveTo(shieldX,shieldY-5);ctx.lineTo(shieldX,shieldY+5);ctx.stroke();
    // 冲刺时盾牌发光
    if(dashing){ctx.fillStyle='rgba(255,255,200,0.3)';ctx.beginPath();ctx.ellipse(shieldX,shieldY,7,9,0,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }

  // ── 萌der（初期·蝴蝶结+星星眼）──────────────────
  function drawEnemy_cute(ctx, e, G){
    const ep = e.enemyPhase || 'early';
    const shake = e._hitShake>0 ? (Math.random()-0.5)*2 : 0;
    if(e._hitShake>0) e._hitShake--;
    if(e._seed===undefined) e._seed = Math.random()*999;
    const bounce = Math.sin(G.elapsed*0.2 + e._seed)*2;
    const col=ep==='late'?'#903050':ep==='mid'?'#c05070':'#E06080';
    const glow=ep==='late'?10:ep==='mid'?4:0;
    const headR=ep==='late'?9:ep==='mid'?8:7;
    drawMonsterBase(ctx, e.x, e.y+bounce, {
      color:col, headR, bodyW:3+(ep==='late'?2:ep==='mid'?1:0), bodyH:3,
      expression:'blank', shake, glow, glowColor:'#ff2200'
    });
    ctx.save();ctx.translate(e.x,e.y+bounce);
    // ── 蝴蝶结 ──
    ctx.fillStyle='#ff88aa';
    ctx.beginPath();ctx.ellipse(-6,-16,3,2.5,-0.5,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(6,-16,3,2.5,0.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ff4466';ctx.beginPath();ctx.arc(0,-16,2,0,Math.PI*2);ctx.fill();
    // ── 星星眼 ──
    ctx.fillStyle='#ffff88';ctx.shadowBlur=6;ctx.shadowColor='#ffff88';
    ctx.beginPath();for(let k=0;k<5;k++){const a=k/5*Math.PI*2-Math.PI/2;if(k===0)ctx.moveTo(-4+Math.cos(a)*2.5,-6+Math.sin(a)*2.5);else ctx.lineTo(-4+Math.cos(a)*2.5,-6+Math.sin(a)*2.5);}ctx.closePath();ctx.fill();
    ctx.beginPath();for(let k=0;k<5;k++){const a=k/5*Math.PI*2-Math.PI/2;if(k===0)ctx.moveTo(4+Math.cos(a)*2.5,-6+Math.sin(a)*2.5);else ctx.lineTo(4+Math.cos(a)*2.5,-6+Math.sin(a)*2.5);}ctx.closePath();ctx.fill();
    ctx.shadowBlur=0;
    // ── 泡泡 ──
    if(G.elapsed%80<40){
      ctx.globalAlpha=0.3;ctx.strokeStyle='rgba(255,255,255,0.6)';ctx.lineWidth=0.5;
      ctx.beginPath();ctx.arc(8,-14,3,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.arc(11,-18,2,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=1;
    }
    ctx.restore();
    if(e._hitShake>4){
      ctx.save(); ctx.translate(e.x, e.y+bounce);
      ctx.fillStyle='#ffff88'; ctx.font='8px Arial'; ctx.textAlign='center';
      ctx.fillText('★', -8, -20); ctx.fillText('★', 8, -18);
      ctx.restore();
    }
  }

  // ── 宅der（中期·斗篷+围巾+爆发预兆）──────────────────
  function drawEnemy_hikikomori(ctx, e, G){
    const ep = e.enemyPhase || 'early';
    const shake = e._hitShake>0 ? (Math.random()-0.5)*3 : 0;
    if(e._hitShake>0) e._hitShake--;
    const col=ep==='late'?'#243040':ep==='mid'?'#324050':'#405060';
    const glow=ep==='late'?10:ep==='mid'?4:0;
    const headR=ep==='late'?12:ep==='mid'?11:10;
    drawMonsterBase(ctx, e.x, e.y, {
      color:col, headR, bodyW:6+(ep==='late'?2:ep==='mid'?1:0), bodyH:9,
      expression:'blank', lean:0.05, shake, glow, glowColor:'#ff2200'
    });
    ctx.save(); ctx.translate(e.x+shake, e.y);
    // ── 斗篷 ──
    ctx.fillStyle=ep==='late'?'#1a2838':ep==='mid'?'#283850':'#384860';
    ctx.beginPath();ctx.ellipse(0,4,9,12,0,0,Math.PI*2);ctx.fill();
    // ── 围巾 ──
    ctx.strokeStyle='#cc4444';ctx.lineWidth=2.5;
    ctx.beginPath();ctx.moveTo(-8,-5);ctx.quadraticCurveTo(0,-2,8,-5);ctx.stroke();
    const scarfWave=Math.sin(G.elapsed*0.15)*3;
    ctx.beginPath();ctx.moveTo(8,-5);ctx.lineTo(12+scarfWave,2);ctx.stroke();
    // ── 眼睛（无神/圈圈眼）──
    ctx.strokeStyle=col;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(-4,-7,2,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(4,-7,2,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#111';ctx.beginPath();ctx.arc(-4,-7,0.8,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(4,-7,0.8,0,Math.PI*2);ctx.fill();
    // 爆发预兆环
    const d = Math.hypot(e.x-G.mx, e.y-G.my);
    if(d<60){
      ctx.globalAlpha=0.3*(1-d/60);
      ctx.fillStyle='#ff2200';
      ctx.beginPath(); ctx.arc(0,-9,10,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  // ── 娇der（中期·裙子+蝴蝶结+香水瓶）──────────────────
  function drawEnemy_dainty_e(ctx, e, G){
    const ep = e.enemyPhase || 'early';
    const shake = e._hitShake>0 ? (Math.random()-0.5)*2 : 0;
    if(e._hitShake>0) e._hitShake--;
    const col=ep==='late'?'#803060':ep==='mid'?'#b05088':'#D060A0';
    const glow=ep==='late'?10:ep==='mid'?4:0;
    const headR=ep==='late'?11:ep==='mid'?10:9;
    drawMonsterBase(ctx, e.x, e.y, {
      color:col, headR, bodyW:5+(ep==='late'?2:ep==='mid'?1:0), bodyH:7,
      expression:'smug', lean:0.2, shake, glow, glowColor:'#ff2200'
    });
    ctx.save(); ctx.translate(e.x+shake, e.y);
    // ── 裙子（三角形）──
    ctx.fillStyle=ep==='late'?'#602040':'#c05088';
    ctx.beginPath();ctx.moveTo(-7,3);ctx.lineTo(0,16);ctx.lineTo(7,3);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#FF80C0';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(-7,3);ctx.lineTo(0,16);ctx.lineTo(7,3);ctx.closePath();ctx.stroke();
    // ── 头顶蝴蝶结 ──
    ctx.fillStyle='#FF80C0';
    ctx.beginPath();ctx.ellipse(-5,-18,3.5,2.5,-0.5,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(5,-18,3.5,2.5,0.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ff4488';ctx.beginPath();ctx.arc(0,-18,2,0,Math.PI*2);ctx.fill();
    // ── 香水瓶（手提）──
    ctx.fillStyle='#aaeeff';ctx.strokeStyle='#6699aa';ctx.lineWidth=1;
    ctx.fillRect(10,-12,5,7);ctx.strokeRect(10,-12,5,7);
    ctx.fillStyle='#88ccff';ctx.beginPath();ctx.arc(12.5,-12,2.5,0,Math.PI*2);ctx.fill();
    if(G.elapsed%40===0){
      e._pinkPts=(e._pinkPts||[]);
      e._pinkPts.push({x:e.x+(Math.random()-0.5)*12, y:e.y-16, vx:(Math.random()-0.5)*0.8, vy:-0.6, life:50});
    }
    ctx.restore();
    e._pinkPts=(e._pinkPts||[]).filter(p=>{
      p.x+=p.vx; p.y+=p.vy; p.life--;
      if(p.life>0){
        ctx.save(); ctx.globalAlpha=p.life/50; ctx.fillStyle='#FF80C0';
        ctx.beginPath(); ctx.arc(p.x,p.y,1.5,0,Math.PI*2); ctx.fill(); ctx.restore();
      }
      return p.life>0;
    });
  }

  // ── 快der（中期·头带+跑鞋+速度线）──────────────────
  function drawEnemy_swift(ctx, e, G){
    const ep = e.enemyPhase || 'early';
    if(e._hitShake>0) e._hitShake--;
    const spd = Math.hypot(e.vx||0, e.vy||0);
    const lean = Math.min(0.5, spd*0.15);
    const col=ep==='late'?'#903018':ep==='mid'?'#c05028':'#E06030';
    const glow=ep==='late'?10:ep==='mid'?4:0;
    const headR=ep==='late'?9:ep==='mid'?8:7;
    drawMonsterBase(ctx, e.x, e.y, {
      color:col, headR, bodyW:4+(ep==='late'?2:ep==='mid'?1:0), bodyH:7,
      expression:'smug', lean, shake:0, glow, glowColor:'#ff2200'
    });
    // ── 速度拖尾 ──
    if(!e._trail) e._trail=[];
    e._trail.push({x:e.x,y:e.y});
    if(e._trail.length>3) e._trail.shift();
    e._trail.forEach((p,i)=>{
      ctx.save();
      ctx.globalAlpha=[0.05,0.12,0.22][i]||0.05;
      ctx.fillStyle='#E06030';
      ctx.beginPath(); ctx.arc(p.x,p.y,5,0,Math.PI*2); ctx.fill();
      ctx.restore();
    });
    ctx.save(); ctx.translate(e.x, e.y);
    // ── 头带 ──
    ctx.fillStyle='#ffcc00';ctx.strokeStyle='#cc8800';ctx.lineWidth=1;
    ctx.fillRect(-headR-1,-17,headR*2+2,4);ctx.strokeRect(-headR-1,-17,headR*2+2,4);
    // 头带飘带
    ctx.fillStyle='#ff8800';ctx.beginPath();ctx.moveTo(headR-1,-16);ctx.lineTo(headR+5,-18);ctx.lineTo(headR-1,-15);ctx.fill();
    // 跑鞋
    ctx.fillStyle='#ffffff';ctx.strokeStyle='#444';ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(-4,12,4,3,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(4,12,4,3,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#ff4444';ctx.beginPath();ctx.ellipse(-4,12,2,1.5,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(4,12,2,1.5,0,0,Math.PI*2);ctx.fill();
    // 速度线
    if(spd>0.8){
      ctx.globalAlpha=0.4;ctx.strokeStyle='rgba(255,220,200,0.6)';ctx.lineWidth=1;
      for(let k=0;k<3;k++){ctx.beginPath();ctx.moveTo(-15+k*4,8+k*3);ctx.lineTo(-20+k*4,8+k*3);ctx.stroke();}
    }
    // 摆动腿
    ctx.strokeStyle='rgba(220,80,40,0.5)'; ctx.lineWidth=2;
    const legSwing = Math.sin(G.elapsed*0.5)*8;
    ctx.beginPath(); ctx.moveTo(-3,7); ctx.lineTo(-3+legSwing,18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3,7); ctx.lineTo(3-legSwing,18); ctx.stroke();
    ctx.restore();
  }

  // ── 穷der（中期·破碗+补丁袍）──────────────────
  function drawEnemy_poor(ctx, e, G){
    const ep = e.enemyPhase || 'early';
    const shake = e._hitShake>0?(Math.random()-0.5)*4:Math.sin(G.elapsed*0.3+(e._seed||0))*1.5;
    if(e._hitShake>0) e._hitShake--;
    const col=ep==='late'?'#4c3028':ep==='mid'?'#664840':'#806050';
    const glow=ep==='late'?10:ep==='mid'?4:0;
    ctx.save(); if(glow>0){ctx.shadowBlur=glow;ctx.shadowColor='#ff2200';}
    ctx.translate(e.x+shake, e.y);
    ctx.fillStyle=col;
    ctx.beginPath();
    const pts=12, r=8;
    for(let i=0;i<pts;i++){
      const a=i/pts*Math.PI*2;
      const ri=r+(i%3===0?-2:1);
      i===0?ctx.moveTo(Math.cos(a)*ri,-9+Math.sin(a)*ri)
            :ctx.lineTo(Math.cos(a)*ri,-9+Math.sin(a)*ri);
    }
    ctx.closePath(); ctx.fill();
    // ── 补丁 ──
    ctx.fillStyle=ep==='late'?'#6a4840':'#a07868';
    ctx.beginPath();ctx.arc(5,2,3,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#887060';ctx.lineWidth=0.8;
    ctx.beginPath();ctx.moveTo(3,1);ctx.lineTo(7,3);ctx.stroke();
    ctx.beginPath();ctx.moveTo(5,0);ctx.lineTo(5,4);ctx.stroke();
    ctx.fillStyle=ep==='late'?'#5a3830':'#907868';
    ctx.beginPath();ctx.arc(-3,6,2.2,0,Math.PI*2);ctx.fill();
    // ── 破碗（手中）──
    ctx.fillStyle='#c0a080';ctx.strokeStyle='#886040';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(10,-4,4.5,Math.PI,0);ctx.fill();ctx.stroke();
    ctx.fillStyle='rgba(200,160,100,0.4)';ctx.beginPath();ctx.arc(10,-4,3.5,Math.PI,0);ctx.fill();
    // 缺口
    ctx.fillStyle=col;ctx.beginPath();ctx.arc(13,-6,2,0,Math.PI*2);ctx.fill();
    // 原有面部
    ctx.save(); ctx.globalCompositeOperation='destination-out';
    [[2,2],[-3,-1],[1,-4]].forEach(([bx,by])=>{
      ctx.beginPath(); ctx.arc(bx,by,1.5,0,Math.PI*2); ctx.fill();
    });
    ctx.restore();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-2.5,-10,1.8,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(2.5,-10,1.8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#333'; ctx.beginPath(); ctx.arc(-2,-9.5,0.9,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(2.5,-9.5,0.9,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // ── 傻der（中期·问号帽+歪眼+口水泡）──────────────────
  function drawEnemy_dumb(ctx, e, G){
    const ep = e.enemyPhase || 'early';
    const shake = e._hitShake>0?(Math.random()-0.5)*4:0;
    if(e._hitShake>0) e._hitShake--;
    const col=ep==='late'?'#545460':ep==='mid'?'#727280':'#9090A0';
    const glow=ep==='late'?10:ep==='mid'?4:0;
    const headR=ep==='late'?12:ep==='mid'?11:10;
    drawMonsterBase(ctx, e.x, e.y, {
      color:col, headR, bodyW:5+(ep==='late'?2:ep==='mid'?1:0), bodyH:7,
      expression:'blank', shake, glow, glowColor:'#ff2200'
    });
    ctx.save(); ctx.translate(e.x+shake, e.y);
    // ── 问号帽 ──
    ctx.fillStyle='#ff8844';ctx.strokeStyle='#cc6622';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(0,-22,6,Math.PI,0);ctx.fill();ctx.stroke();
    ctx.fillStyle='#ffaa66';ctx.beginPath();ctx.arc(0,-22,6,0,Math.PI);ctx.fill();ctx.stroke();
    // 帽子问号
    ctx.fillStyle='#ffffff';ctx.font='bold 8px Arial';ctx.textAlign='center';
    ctx.fillText('?',0,-20);
    // ── 歪眼 ──
    ctx.fillStyle=col;ctx.fillRect(-6,-20,5,5);ctx.fillRect(1,-20,5,5);
    ctx.fillStyle='#fff';
    ctx.beginPath();ctx.arc(-3,-17,2.5,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(3.5,-16,2.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#222';
    ctx.beginPath();ctx.arc(-4.5,-17,1.2,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(4.5,-15.5,1.2,0,Math.PI*2);ctx.fill();
    // ── 口水泡 ──
    if(G.elapsed%120<60){
      ctx.strokeStyle='rgba(150,200,255,0.5)';ctx.lineWidth=0.8;
      ctx.beginPath();ctx.arc(5,2,2.5,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle='rgba(150,200,255,0.3)';
      ctx.beginPath();ctx.arc(7,4,1.5,0,Math.PI*2);ctx.stroke();
    }
    if(G.elapsed%180<60){
      ctx.fillStyle='#cccccc';ctx.font='bold 10px Arial';ctx.textAlign='center';
      ctx.fillText('?', 0, -26);
    }
    ctx.restore();
  }

  // ── 油der（中期·墨镜+发胶反光+皮衣）──────────────────
  function drawEnemy_slick(ctx, e, G){
    const ep = e.enemyPhase || 'early';
    if(e._hitShake>0) e._hitShake--;
    const col=ep==='late'?'#344028':ep==='mid'?'#4a5840':'#607050';
    const glow=ep==='late'?10:ep==='mid'?4:0;
    const headR=ep==='late'?11:ep==='mid'?10:9;
    drawMonsterBase(ctx, e.x, e.y, {
      color:col, headR, bodyW:5+(ep==='late'?2:ep==='mid'?1:0), bodyH:8,
      expression:'smug', lean:0.05, glow, glowColor:'#ff2200'
    });
    ctx.save(); ctx.translate(e.x, e.y);
    // ── 发胶反光（顶部高光）──
    ctx.fillStyle='rgba(255,255,255,0.25)';
    ctx.beginPath();ctx.arc(0,-20,4,Math.PI,0);ctx.fill();
    // ── 墨镜 ──
    ctx.fillStyle='#111';ctx.strokeStyle='#333';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.ellipse(-4,-12,4,2.5,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(4,-12,4,2.5,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    // 墨镜高光
    ctx.fillStyle='rgba(255,255,255,0.20)';
    ctx.beginPath();ctx.ellipse(-4.5,-13,2,1,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(3.5,-13,2,1,0,0,Math.PI*2);ctx.fill();
    // ── 皮衣翻领 ──
    ctx.fillStyle='#2a3a20';ctx.strokeStyle='#4a5a40';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(-7,2);ctx.lineTo(-3,8);ctx.lineTo(3,8);ctx.lineTo(7,2);ctx.closePath();ctx.fill();ctx.stroke();
    // 闪现残影
    (e._blinkTrail||[]).forEach((p,i)=>{
      ctx.globalAlpha=[0.08,0.18][i]||0.05;
      ctx.fillStyle='#607050';
      ctx.beginPath(); ctx.arc(p.x-e.x,p.y-e.y-9,9,0,Math.PI*2); ctx.fill();
    });
    ctx.restore();
  }

  // ── 装der（后期·华丽披风+权杖+项链）──────────────────
  function drawEnemy_poser(ctx, e, G){
    const ep = e.enemyPhase || 'early';
    const shake = e._hitShake>0?(Math.random()-0.5)*3:0;
    if(e._hitShake>0) e._hitShake--;
    const col=ep==='late'?'#805000':ep==='mid'?'#a06800':'#C08000';
    const glow=ep==='late'?10:ep==='mid'?4:0;
    const headR=ep==='late'?12:ep==='mid'?11:10;
    drawMonsterBase(ctx, e.x, e.y, {
      color:col, headR, bodyW:6+(ep==='late'?2:ep==='mid'?1:0), bodyH:8,
      expression:'smug', lean:-0.15, shake, glow, glowColor:'#ff2200'
    });
    ctx.save(); ctx.translate(e.x+shake, e.y);
    // ── 光环（头顶）──
    ctx.strokeStyle='rgba(255,220,0,0.6)'; ctx.lineWidth=2;
    ctx.shadowBlur=8; ctx.shadowColor='#ffdd00';
    ctx.beginPath(); ctx.ellipse(0,-26,10,3,0,0,Math.PI*2); ctx.stroke();
    ctx.shadowBlur=0;
    // ── 华丽披风 ──
    const capeWave=Math.sin(G.elapsed*0.08)*3;
    ctx.fillStyle=ep==='late'?'#601010':ep==='mid'?'#802020':'#A03030';
    ctx.beginPath();ctx.moveTo(-7,0);ctx.quadraticCurveTo(-14+capeWave,10,-12+capeWave,18);
    ctx.lineTo(12+capeWave,18);ctx.quadraticCurveTo(14+capeWave,10,7,0);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#FFD700';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(-7,0);ctx.quadraticCurveTo(-14+capeWave,10,-12+capeWave,18);ctx.stroke();
    ctx.beginPath();ctx.moveTo(7,0);ctx.quadraticCurveTo(14+capeWave,10,12+capeWave,18);ctx.stroke();
    // ── 项链 ──
    ctx.strokeStyle='#FFD700';ctx.lineWidth=1.5;ctx.shadowBlur=3;ctx.shadowColor='#FFD700';
    ctx.beginPath();ctx.arc(0,-4,8,Math.PI*0.2,Math.PI*0.8);ctx.stroke();
    ctx.fillStyle='#FF4444';ctx.shadowBlur=6;ctx.shadowColor='#FF4444';
    ctx.beginPath();ctx.arc(0,-10,3,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    // ── 权杖（右手）──
    ctx.fillStyle='#FFD700';ctx.strokeStyle='#cc8800';ctx.lineWidth=1.5;
    ctx.fillRect(14,-14,3,14);ctx.strokeRect(14,-14,3,14);
    ctx.fillStyle='#ff4444';ctx.beginPath();ctx.arc(15.5,-16,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(15.5,-14,1.5,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

  // ── 跑der（后期·头巾+跑鞋+汗珠）──────────────────
  function drawEnemy_runner(ctx, e, G){
    const ep = e.enemyPhase || 'early';
    const shake = e._hitShake>0?(Math.random()-0.5)*3:0;
    if(e._hitShake>0) e._hitShake--;
    const fleeing = e.hp/e.maxhp < 0.3;
    const colBase=ep==='late'?'#6a3020':ep==='mid'?'#8a4a30':'#AA6040';
    const col=fleeing?'#dd4422':colBase;
    const glow=ep==='late'?10:ep==='mid'?4:0;
    const headR=ep==='late'?10:ep==='mid'?9:8;
    drawMonsterBase(ctx, e.x, e.y, {
      color:col, headR, bodyW:4+(ep==='late'?2:ep==='mid'?1:0), bodyH:8,
      expression: fleeing?'scared':'angry',
      lean: fleeing?0.4:0.1, shake, glow, glowColor:'#ff2200'
    });
    ctx.save(); ctx.translate(e.x+shake, e.y);
    // ── 头巾 ──
    ctx.fillStyle=fleeing?'#ff6644':'#4488cc';
    ctx.beginPath();ctx.arc(0,-14,headR+3,Math.PI,0);ctx.fill();
    ctx.strokeStyle=fleeing?'#cc4422':'#2266aa';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.arc(0,-14,headR+3,Math.PI,0);ctx.stroke();
    if(fleeing){
      // ── 惊愕眼 ──
      ctx.fillStyle='rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(-6,-18,2,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#333';ctx.beginPath(); ctx.arc(-7,-18,1,0,Math.PI*2); ctx.fill();
      // ── 汗珠 ──
      ctx.fillStyle='#88aaff';ctx.globalAlpha=0.7;
      ctx.beginPath();ctx.arc(8,-20,2,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(10,-18,1.5,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=1;
      // 逃跑腿
      ctx.strokeStyle=colBase; ctx.lineWidth=2.5;
      const ls=Math.sin(G.elapsed*0.6)*14;
      ctx.beginPath(); ctx.moveTo(-3,8); ctx.lineTo(-3+ls,22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3,8); ctx.lineTo(3-ls,22); ctx.stroke();
    }
    // ── 跑鞋 ──
    ctx.fillStyle='#ffffff';ctx.strokeStyle='#444';ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(-4,11,3.5,2.5,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(4,11,3.5,2.5,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#ff4444';ctx.beginPath();ctx.ellipse(-4,11,1.8,1.2,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(4,11,1.8,1.2,0,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }

  // ── 贪der（后期·金链+算盘+钱袋）──────────────────
  function drawEnemy_greedy(ctx, e, G){
    const ep = e.enemyPhase || 'early';
    const shake = e._hitShake>0?(Math.random()-0.5)*3:0;
    if(e._hitShake>0) e._hitShake--;
    const col=ep==='late'?'#4c3410':ep==='mid'?'#664a18':'#806020';
    const glow=ep==='late'?10:ep==='mid'?4:0;
    const headR=ep==='late'?12:ep==='mid'?11:10;
    drawMonsterBase(ctx, e.x, e.y, {
      color:col, headR, bodyW:7+(ep==='late'?2:ep==='mid'?1:0), bodyH:10,
      expression:'smug', shake, glow, glowColor:'#ff2200'
    });
    ctx.save(); ctx.translate(e.x+shake, e.y);
    // ── 金链 ──
    const chainWave=Math.sin(G.elapsed*0.05)*2;
    ctx.strokeStyle='#FFD700';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-8,-3+chainWave);ctx.quadraticCurveTo(0,-8+chainWave,8,-3+chainWave);ctx.stroke();
    // ── 算盘（左手）──
    ctx.fillStyle='#8B4513';ctx.strokeStyle='#5C2D0A';ctx.lineWidth=1;
    ctx.fillRect(-16,-10,6,10);ctx.strokeRect(-16,-10,6,10);
    ctx.fillStyle='#D2B48C';ctx.lineWidth=0.5;
    for(let i=1;i<3;i++){ctx.beginPath();ctx.moveTo(-15,-10+i*3);ctx.lineTo(-11,-10+i*3);ctx.stroke();}
    // ── 散布金币 ──
    const coins=[[-8,-3],[8,-2],[-6,5],[7,6],[0,-8]];
    coins.forEach(([cx,cy],i)=>{
      ctx.fillStyle='#FFD700'; ctx.strokeStyle='#AA8800'; ctx.lineWidth=1;
      ctx.shadowBlur=3; ctx.shadowColor='#FFD700';
      ctx.beginPath(); ctx.arc(cx,cy,3.5,0,Math.PI*2);
      ctx.fill(); ctx.stroke();
      ctx.shadowBlur=0;
      ctx.fillStyle='#886600'; ctx.font='4px Arial'; ctx.textAlign='center';
      ctx.fillText('¥',cx,cy+1.5);
    });
    // ── 钱袋（右手拎着）──
    ctx.fillStyle='#6B3300';ctx.strokeStyle='#442200';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(14,-4,5,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#886600';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(11,-8);ctx.lineTo(14,-4);ctx.stroke();
    ctx.fillStyle='#FFD700';ctx.font='bold 5px Arial';ctx.textAlign='center';
    ctx.fillText('$',14,-3);
    ctx.restore();
  }

  // ── 卷der精英（眼镜+书+红气光圈）──────────────────
  function drawEnemy_roller(ctx, e, G){
    const ep = e.enemyPhase || 'early';
    const shake = e._hitShake>0?(Math.random()-0.5)*5:0;
    if(e._hitShake>0) e._hitShake--;
    const col=ep==='late'?'#804000':ep==='mid'?'#a85000':'#C86000';
    const glowVal=ep==='late'?26:ep==='mid'?20:16;
    const headR=ep==='late'?12:ep==='mid'?11:10;
    ctx.save();
    drawMonsterBase(ctx, e.x, e.y, {
      color:col, headR, bodyW:5+(ep==='late'?2:ep==='mid'?1:0), bodyH:8,
      expression:'angry', lean:0.25, shake,
      glow:glowVal, glowColor:'#ff8800', isElite:true
    });
    ctx.translate(e.x+shake, e.y);
    // ── 红色气势光圈（精英专属）──
    for(let i=0;i<4;i++){
      const a=G.elapsed*0.05+i*1.57;
      ctx.strokeStyle=`rgba(255,100,0,${0.25+Math.sin(G.elapsed*0.1+i)*0.1})`;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(Math.cos(a)*16,Math.sin(a)*16-9,2.5,0,Math.PI*2);ctx.stroke();
    }
    // ── 眼镜 ──
    ctx.strokeStyle='#333';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.arc(-4,-11,4,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(4,-11,4,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(0,-11);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-8,-11);ctx.lineTo(-10,-13);ctx.stroke();
    ctx.beginPath();ctx.moveTo(8,-11);ctx.lineTo(10,-13);ctx.stroke();
    // ── 书（手持）──
    ctx.fillStyle='#8B4513'; ctx.strokeStyle='#5C2D0A'; ctx.lineWidth=1;
    ctx.fillRect(-18,-16,10,13); ctx.strokeRect(-18,-16,10,13);
    ctx.strokeStyle='#D2B48C'; ctx.lineWidth=0.5;
    for(let i=1;i<4;i++){ ctx.beginPath(); ctx.moveTo(-17,-16+i*3); ctx.lineTo(-9,-16+i*3); ctx.stroke(); }
    ctx.restore();
  }

  // ── 狂der精英（锁链+筋肉+叠层数字）──────────────────
  function drawEnemy_berserker(ctx, e, G){
    const ep = e.enemyPhase || 'early';
    const shake = e._hitShake>0?(Math.random()-0.5)*6:0;
    if(e._hitShake>0) e._hitShake--;
    const stacks = e._hitCount||0;
    const redness = Math.min(1, stacks/10);
    const colBase=ep==='late'?'#6a1010':ep==='mid'?'#8a1818':'#AA2020';
    const col = 'rgb('+Math.floor(parseInt(colBase.slice(1,3),16)+redness*60)+','+Math.max(0,Math.floor(parseInt(colBase.slice(3,5),16)-redness*20))+','+Math.max(0,Math.floor(parseInt(colBase.slice(5,7),16)-redness*20))+')';
    const glowVal=ep==='late'?(stacks*2+10):ep==='mid'?(stacks*2+4):stacks*2;
    const headR=ep==='late'?13:ep==='mid'?12:11;
    drawMonsterBase(ctx, e.x, e.y, {
      color: col, headR, bodyW:6+(ep==='late'?2:ep==='mid'?1:0), bodyH:9,
      expression:'angry', shake, glow:glowVal, glowColor:'#ff2200', isElite:true
    });
    ctx.save(); ctx.translate(e.x+shake, e.y);
    // ── 锁链 ──
    ctx.strokeStyle='#888';ctx.lineWidth=2;
    const chainA=Math.sin(G.elapsed*0.1)*0.5;
    ctx.beginPath();ctx.moveTo(-12,-5+chainA);ctx.lineTo(-16,2);ctx.lineTo(-12,8-chainA);ctx.stroke();
    ctx.beginPath();ctx.moveTo(12,-5-chainA);ctx.lineTo(16,2);ctx.lineTo(12,8+chainA);ctx.stroke();
    // ── 筋肉纹理 ──
    ctx.strokeStyle='rgba(255,80,30,0.4)';ctx.lineWidth=1.2;
    ctx.beginPath();ctx.moveTo(-5,2);ctx.quadraticCurveTo(-3,6,-1,4);ctx.stroke();
    ctx.beginPath();ctx.moveTo(5,2);ctx.quadraticCurveTo(3,6,1,4);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-3,6);ctx.quadraticCurveTo(0,10,3,6);ctx.stroke();
    // 叠层数字
    if(stacks>0){
      ctx.fillStyle='#ffdd00'; ctx.font='bold '+(9+stacks)+'px Arial'; ctx.textAlign='center';
      ctx.shadowBlur=6; ctx.shadowColor='#ff4400';
      ctx.fillText('×'+stacks, 0, -28);
      ctx.shadowBlur=0;
    }
    // ── 红色气势光圈 ──
    for(let i=0;i<3;i++){
      const a=G.elapsed*0.07+i*2.09;
      ctx.strokeStyle=`rgba(255,40,0,${0.3+Math.sin(G.elapsed*0.12+i)*0.15})`;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(Math.cos(a)*18,Math.sin(a)*18-9,3,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
  }

  // ── 壕der精英（金链+钻石戒+金盾）──────────────────
  function drawEnemy_rich(ctx, e, G){
    const ep = e.enemyPhase || 'early';
    const shake = e._hitShake>0?(Math.random()-0.5)*4:0;
    if(e._hitShake>0) e._hitShake--;
    const col=ep==='late'?'#806010':ep==='mid'?'#a07818':'#C09020';
    const glowVal=ep==='late'?20:ep==='mid'?14:10;
    const headR=ep==='late'?13:ep==='mid'?12:11;
    drawMonsterBase(ctx, e.x, e.y, {
      color:col, headR, bodyW:6+(ep==='late'?2:ep==='mid'?1:0), bodyH:9,
      expression:'smug', shake, glow:glowVal, glowColor:'#FFD700', isElite:true
    });
    ctx.save(); ctx.translate(e.x+shake, e.y);
    // ── 金链项链 ──
    ctx.strokeStyle='#FFD700';ctx.lineWidth=2.5;ctx.shadowBlur=8;ctx.shadowColor='#FFD700';
    ctx.beginPath();ctx.moveTo(-8,-5);ctx.quadraticCurveTo(0,-2,8,-5);ctx.stroke();
    // 钻石吊坠
    ctx.fillStyle='#ffffff';ctx.shadowBlur=10;ctx.shadowColor='#88ccff';
    ctx.beginPath();ctx.arc(0,-8,3,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    // ── 金盾光环 ──
    ctx.strokeStyle='#FFD700'; ctx.lineWidth=2.5;
    ctx.shadowBlur=10; ctx.shadowColor='#FFD700';
    ctx.beginPath(); ctx.arc(0,-9,15,0,Math.PI*2); ctx.stroke();
    ctx.shadowBlur=0;
    // ── 钻石戒指（手上）──
    ctx.fillStyle='#DAA520'; ctx.strokeStyle='#8B6914'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(16,-4,6,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#ffffff';ctx.shadowBlur=6;ctx.shadowColor='#88ccff';
    ctx.beginPath();ctx.arc(14,-5,1.8,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    ctx.strokeStyle='#8B6914'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(11,-4); ctx.lineTo(11,-8); ctx.stroke();
    // 金盾护体
    if(e.shield>0){
      ctx.globalAlpha=0.35+Math.sin(G.elapsed*0.1)*0.1;
      ctx.fillStyle='#FFD700';
      ctx.beginPath(); ctx.arc(0,-9,18,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
    }
    ctx.restore();
  }

  // ── 废der精英（横躺+枕头+零食）──────────────────
  function drawEnemy_lazy(ctx, e, G){
    const ep = e.enemyPhase || 'early';
    const shake = e._hitShake>0?(Math.random()-0.5)*4:0;
    if(e._hitShake>0) e._hitShake--;
    const bodyCol=ep==='late'?'#521010':ep==='mid'?'#6e1818':'#8B2020';
    const headCol=ep==='late'?'#6a1818':ep==='mid'?'#8a2525':'#AA3030';
    const glowVal=ep==='late'?22:ep==='mid'?16:12;
    const headR=ep==='late'?11:ep==='mid'?10:9;
    ctx.save();
    ctx.translate(e.x+shake, e.y);
    // ── 枕头（底层）──
    ctx.fillStyle='#ddeeff';ctx.strokeStyle='#aabbcc';ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(10,8,8,5,-0.3,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#ffffff';ctx.beginPath();ctx.ellipse(8,7,4,3,-0.3,0,Math.PI*2);ctx.fill();
    // 身体（横躺）
    ctx.rotate(Math.PI*0.5);
    ctx.fillStyle=bodyCol;
    ctx.shadowBlur=glowVal; ctx.shadowColor='#ff1111';
    ctx.beginPath(); ctx.ellipse(0,0,14+(ep==='late'?2:ep==='mid'?1:0),8,0,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle=headCol;
    ctx.beginPath(); ctx.arc(17,0,headR,0,Math.PI*2); ctx.fill();
    // ── 零食（手中）──
    ctx.fillStyle='#ff8844';ctx.beginPath();ctx.ellipse(-8,4,4,3,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ffff88';ctx.beginPath();ctx.ellipse(-7,3,2.5,2,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#ff6600';ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(-10,3);ctx.lineTo(-5,3);ctx.stroke();
    // 闭眼
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(17,-3,2.2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#111';
    ctx.beginPath(); ctx.arc(17,-2.5,1.1,0,Math.PI*2); ctx.fill();
    // 红色气场环
    ctx.strokeStyle='#ff4400'; ctx.lineWidth=2; ctx.globalAlpha=0.7;
    ctx.beginPath(); ctx.arc(5,0,20,0,Math.PI*2); ctx.stroke();
    ctx.globalAlpha=1;
    ctx.restore();
    // 精英★标识
    ctx.save();ctx.fillStyle='#ff2200';ctx.font='bold 11px Arial';ctx.textAlign='center';
    ctx.shadowBlur=8;ctx.shadowColor='#ff2200';
    ctx.fillText('★',e.x,e.y-headR-8);ctx.restore();
  }

  // ── 猛der精英（肩甲+铁链+肌肉感）──────────────────
  function drawEnemy_brute(ctx, e, G){
    const ep = e.enemyPhase || 'early';
    const shake = e._hitShake>0?(Math.random()-0.5)*6:0;
    if(e._hitShake>0) e._hitShake--;
    const col=ep==='late'?'#401010':ep==='mid'?'#581818':'#702020';
    const glowVal=ep==='late'?24:ep==='mid'?18:14;
    const headR=ep==='late'?18:ep==='mid'?17:16;
    drawMonsterBase(ctx, e.x, e.y, {
      color:col, headR, bodyW:11+(ep==='late'?2:ep==='mid'?1:0), bodyH:13,
      expression:'angry', shake, glow:glowVal, glowColor:'#ff2200', isElite:true
    });
    ctx.save(); ctx.translate(e.x+shake, e.y);
    // ── 肩甲 ──
    ctx.fillStyle='#505868';ctx.strokeStyle='#889098';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.ellipse(-15,-4,7,5,Math.PI*0.3,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(15,-4,7,5,-Math.PI*0.3,0,Math.PI*2);ctx.fill();ctx.stroke();
    // 肩甲铆钉
    ctx.fillStyle='#c0d0e0';
    [[-15,-4],[15,-4]].forEach(([sx,sy])=>{
      ctx.beginPath();ctx.arc(sx-2,sy-1,1.2,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(sx+2,sy-1,1.2,0,Math.PI*2);ctx.fill();
    });
    // ── 铁链 ──
    ctx.strokeStyle='#666';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-12,4);ctx.quadraticCurveTo(0,10,12,4);ctx.stroke();
    ctx.fillStyle='#888';ctx.beginPath();ctx.arc(-12,4,2.5,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(12,4,2.5,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(0,7,2.5,0,Math.PI*2);ctx.fill();
    // ── 红色气场环 ──
    ctx.strokeStyle='#ff2200'; ctx.lineWidth=2.5; ctx.globalAlpha=0.6;
    ctx.shadowBlur=14; ctx.shadowColor='#ff2200';
    ctx.beginPath(); ctx.arc(0,-13,22,0,Math.PI*2); ctx.stroke();
    ctx.globalAlpha=1; ctx.shadowBlur=0;
    // ── 愤怒青筋 ──
    ctx.strokeStyle='rgba(100,180,255,0.6)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(-5,-18);ctx.quadraticCurveTo(-3,-22,1,-20);ctx.stroke();
    ctx.beginPath();ctx.moveTo(5,-18);ctx.quadraticCurveTo(3,-22,-1,-20);ctx.stroke();
    ctx.restore();
  }

  // ── Boss ──
  if(G.boss){
    const b=G.boss,pct=b.hp/b.maxhp,pulse=Math.sin(G.elapsed*0.1)*2.5;
    ctx.save();ctx.fillStyle='rgba(0,0,0,0.4)';ctx.beginPath();ctx.ellipse(b.x,b.y+b.sz*0.55,b.sz*0.75,b.sz*0.28,0,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.save();ctx.shadowColor=b.col;ctx.shadowBlur=32+pulse*3;ctx.fillStyle=b.col;ctx.beginPath();ctx.arc(b.x,b.y,b.sz/2+pulse,0,Math.PI*2);ctx.fill();ctx.restore();
    if(b._phase>=1){ctx.save();ctx.strokeStyle=b._phase>=2?'#ff2200':'#EF9F27';ctx.lineWidth=2;ctx.globalAlpha=0.5;ctx.beginPath();ctx.arc(b.x,b.y,b.sz/2+8+pulse*0.5,0,Math.PI*2);ctx.stroke();ctx.restore();}
    ctx.fillStyle='rgba(0,0,0,0.55)';ctx.fillRect(b.x-b.sz/2,b.y-b.sz/2-14,b.sz,6);
    ctx.fillStyle=pct>0.5?'#EF9F27':'#E24B4A';ctx.fillRect(b.x-b.sz/2,b.y-b.sz/2-14,b.sz*pct,6);
    // 壕气护甲层数
    if(b.armorStack>0){ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.fillStyle='#FFD700';ctx.fillText('🛡×'+b.armorStack,b.x,b.y-b.sz/2-20);}
    // vlogger录像机
    if(b.key==='vlogger'&&b.vlogging>0){ctx.save();ctx.translate(b.x+b.sz/2+8,b.y-b.sz/2-8);ctx.fillStyle='#333';ctx.fillRect(-6,-5,12,10);ctx.strokeStyle='#888';ctx.lineWidth=1.5;ctx.strokeRect(-6,-5,12,10);ctx.fillStyle='#111';ctx.fillRect(-4,-3,8,6);ctx.fillStyle='#666';ctx.beginPath();ctx.arc(0,0,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#555';ctx.fillRect(-8,-3,3,6);if(G.elapsed%30<15){ctx.fillStyle='#ff0000';ctx.beginPath();ctx.arc(8,-4,2,0,Math.PI*2);ctx.fill();}ctx.restore();}
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
    const bd=Math.hypot(b.x-G.mx,b.y-G.my);
    if(bd>250){ctx.fillStyle='rgba(77,191,160,0.5)';ctx.beginPath();ctx.arc(b.x,b.y,2.5,0,Math.PI*2);ctx.fill();return;}
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

  // ── 玩家（怒火境界视觉）──
  const hpPct=G.mhp/G.mmaxhp;
  const tier=G.rageTier||0;
  const rt=RAGE_TIERS[tier];
  const tc=rt.color;
  const pc=rt.particleColor;

  // 低血警告环
  if(hpPct<0.4){
    const dangerAlpha=0.18+Math.sin(G.elapsed*0.12)*0.1;
    ctx.save();ctx.strokeStyle='#E24B4A';ctx.lineWidth=2.5;
    ctx.globalAlpha=dangerAlpha*2;ctx.shadowBlur=10;ctx.shadowColor='#E24B4A';
    ctx.beginPath();ctx.arc(G.mx,G.my,20+Math.sin(G.elapsed*0.08)*1.5,0,Math.PI*2);ctx.stroke();ctx.restore();
  }

  // 静止警告
  if((G.stillTimer||0)>90){
    const sp=Math.min(1,(G.stillTimer-90)/90);
    const maxRingR=Math.max(W,H)*0.72,minRingR=38;
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

  // ── 境界粒子光环（tier1起） ──
  if(tier>=1){
    // 旋转弧线（tier1-5每档+1条）
    const arcCount=Math.min(tier,5);
    for(let ri=0;ri<arcCount;ri++){
      const angOffset=G.elapsed*0.04*(1+ri*0.3)+ri*Math.PI*0.5;
      const arcR=18+ri*7,arcLen=0.4+ri*0.1;
      const blur = tier>=6 ? 18+tier*8 : 6;
      const shadowCol = tier>=6
        ? (tier===8?'#aa0033':tier===7?'#cc0044':'#ff2200')
        : tc;
      ctx.save();ctx.strokeStyle=tc;ctx.lineWidth=1.5-ri*0.15;
      ctx.globalAlpha=0.5-ri*0.06;ctx.shadowBlur=blur;ctx.shadowColor=shadowCol;
      ctx.beginPath();ctx.arc(G.mx,G.my,arcR,angOffset,angOffset+arcLen*Math.PI);ctx.stroke();
      ctx.beginPath();ctx.arc(G.mx,G.my,arcR,angOffset+Math.PI,angOffset+Math.PI+arcLen*Math.PI);ctx.stroke();
      ctx.restore();
    }

    // tier5+ 脉冲扩散环
    if(tier>=5){
      const pulseR=16+(G.elapsed*1.2)%24,pulseAlpha=1-(pulseR-16)/24;
      ctx.save();ctx.strokeStyle=tc;ctx.lineWidth=1.5;ctx.globalAlpha=pulseAlpha*0.4;
      ctx.shadowBlur=tier>=6?40:12;ctx.shadowColor=tier>=6?'#ff2200':tc;
      ctx.beginPath();ctx.arc(G.mx,G.my,pulseR,0,Math.PI*2);ctx.stroke();ctx.restore();
    }

    // tier6杀怒：第二脉冲环（错相位）
    if(tier>=6){
      const pulseR2=16+(G.elapsed*1.2+12)%24,pulseAlpha2=1-(pulseR2-16)/24;
      ctx.save();ctx.strokeStyle='#ff2200';ctx.lineWidth=1;ctx.globalAlpha=pulseAlpha2*0.3;
      ctx.shadowBlur=52;ctx.shadowColor='#ff2200';
      ctx.beginPath();ctx.arc(G.mx,G.my,pulseR2+6,0,Math.PI*2);ctx.stroke();ctx.restore();
    }

    // tier7绝怒：暗红填充光晕
    if(tier>=7){
      ctx.save();ctx.globalAlpha=0.18+Math.sin(G.elapsed*0.08)*0.06;
      ctx.fillStyle='#440022';
      ctx.shadowBlur=64;ctx.shadowColor='#cc0044';
      ctx.beginPath();ctx.arc(G.mx,G.my,24+Math.sin(G.elapsed*0.05)*4,0,Math.PI*2);ctx.fill();ctx.restore();
    }

    // tier8极怒：双层暗红 + 外圈慢速脉冲
    if(tier>=8){
      ctx.save();ctx.globalAlpha=0.22+Math.sin(G.elapsed*0.06)*0.08;
      ctx.fillStyle='#220011';
      ctx.shadowBlur=80;ctx.shadowColor='#aa0033';
      ctx.beginPath();ctx.arc(G.mx,G.my,28+Math.sin(G.elapsed*0.04)*5,0,Math.PI*2);ctx.fill();ctx.restore();
      // 外圈慢速脉冲环
      const outerR=36+(G.elapsed*0.6)%20,outerAlpha=1-(outerR-36)/20;
      ctx.save();ctx.strokeStyle='#660022';ctx.lineWidth=2;ctx.globalAlpha=outerAlpha*0.35;
      ctx.shadowBlur=80;ctx.shadowColor='#aa0033';
      ctx.beginPath();ctx.arc(G.mx,G.my,outerR,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
  }

  // ── 玩家Q版人形 + 粒子 ──
  if(!G.playerParticles)G.playerParticles=[];
  G.playerParticles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life--;p.size*=0.92;});
  G.playerParticles=G.playerParticles.filter(p=>p.life>0);

  drawPlayer(ctx, G);

  // ── 绘制玩家粒子 ──
  G.playerParticles.forEach(p=>{
    const alpha=p.life/p.maxLife;
    ctx.save();ctx.globalAlpha=Math.min(1,alpha*1.5);
    if(p.text){
      ctx.fillStyle=p.color;ctx.font='bold '+Math.ceil(p.size)+'px Arial';
      ctx.textAlign='center';ctx.shadowColor=p.color;ctx.shadowBlur=4;
      ctx.fillText(p.text,p.x,p.y);
    } else {
      ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,Math.max(0.3,p.size),0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  });

  // HP条
  const hbw=48,hbh=5;
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(G.mx-hbw/2,G.my-50,hbw,hbh);
  const hbCol=hpPct<0.3?'#ff3333':hpPct<0.6?'#EF9F27':'#44ee66';
  ctx.fillStyle=hbCol;ctx.fillRect(G.mx-hbw/2,G.my-50,hbw*hpPct,hbh);
  if(hpPct>0.05){ctx.fillStyle='rgba(255,255,255,0.2)';ctx.fillRect(G.mx-hbw/2,G.my-50,hbw*hpPct,hbh/2);}

  // 护盾环
  if(G.shieldHp>0){
    ctx.save();ctx.globalAlpha=0.25+0.1*Math.sin(G.elapsed*0.08);
    ctx.strokeStyle='#4488CC';ctx.lineWidth=3;ctx.shadowBlur=12;ctx.shadowColor='#4488CC';
    ctx.beginPath();ctx.arc(G.mx,G.my,18,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  if(G.shieldHp>0){
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(G.mx-hbw/2,G.my-54,hbw,2);
    ctx.fillStyle='#4488CC';ctx.fillRect(G.mx-hbw/2,G.my-54,hbw,2);
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

  // ── 怒火连斩 UI ──
  if(G.combo>=2){
    const rt=RAGE_TIERS[G.rageTier||0];
    const tc=rt.color;
    const tierLabel=G.rageTier>0?' 【'+rt.name+'】':'';
    const timerRatio=Math.max(0,Math.min(1,(G.comboTimer||0)/RAGE_WINDOW_NORMAL));
    // 快耗尽时字体抖动
    const urgencyShake=timerRatio<0.3?(1-timerRatio/0.3)*Math.sin(G.elapsed*0.6)*2.5:0;
    const scale=1+Math.sin(G.elapsed*0.2)*0.07*(1+G.rageTier*0.05);
    // tier6-8 shadowBlur加大
    const textBlur=G.rageTier>=6?(16+G.rageTier*8):16+G.rageTier*4;
    const textShadow=G.rageTier>=6?'#ff2200':tc;
    ctx.save();
    ctx.translate(W/2+urgencyShake,78);ctx.scale(scale,scale);
    ctx.textAlign='center';ctx.shadowColor=textShadow;ctx.shadowBlur=textBlur;ctx.fillStyle=tc;
    ctx.font='bold 26px Arial';
    ctx.fillText(G.combo+' 怒火连斩'+tierLabel,0,0);
    // 余怒倒计时条
    if(G.comboTimer>0){
      const barW=90,barH=3;
      const filled=barW*timerRatio;
      const barColor=timerRatio<0.25?'#ff2200':timerRatio<0.55?'#ff8800':tc;
      ctx.fillStyle='rgba(0,0,0,0.45)';ctx.fillRect(-barW/2,14,barW,barH);
      ctx.fillStyle=barColor;ctx.shadowBlur=6;ctx.shadowColor=barColor;
      ctx.fillRect(-barW/2,14,filled,barH);
    }
    ctx.restore();
  }

  ctx.restore();

  // ── 开场过场动画 ──
  if(!G.introDone){
    const t=G.introTimer; // 180→0
    const progress=1-(t/180); // 0→1

    // 黑色蒙版（前0.5秒淡入，后0.5秒淡出）
    const overlayAlpha=t>150?((180-t)/30):t<30?(t/30):1;
    ctx.save();
    ctx.fillStyle=`rgba(0,0,0,${overlayAlpha*0.88})`;
    ctx.fillRect(0,0,W,H);

    // 台词文字（第30帧后出现，第150帧前消失）
    if(t<150&&t>30){
      const textAlpha=t>120?((150-t)/30):t<60?(t-30)/30:1;
      ctx.globalAlpha=textAlpha;
      ctx.textAlign='center';
      ctx.fillStyle='#ff2200';
      ctx.shadowColor='#ff4400';
      ctx.shadowBlur=24;
      ctx.font='bold 18px Arial';
      ctx.fillText('今天，谁都别想让我冷静下来。',W/2,H/2-18);
      // 副行小字
      ctx.fillStyle='rgba(255,100,50,0.7)';
      ctx.shadowBlur=10;
      ctx.font='13px Arial';
      ctx.fillText('— 练气期第一天',W/2,H/2+10);
      ctx.globalAlpha=1;
    }

    // 拳头攥紧动画（Canvas简版：圆→握拳椭圆，居中偏下）
    if(t<140&&t>20){
      const fistProgress=Math.min(1,(140-t)/80); // 0→1 握拳过程
      const fistAlpha=t<40?(t-20)/20:t>120?(140-t)/20:1;
      const cx=W/2, cy=H/2+55;
      ctx.save();
      ctx.globalAlpha=fistAlpha*0.9;
      ctx.shadowBlur=30+fistProgress*20;
      ctx.shadowColor='#ff3300';

      // 手掌（椭圆，随progress从圆变扁）
      const pw=18+fistProgress*4, ph=22-fistProgress*6;
      ctx.fillStyle='#cc4422';
      ctx.beginPath();ctx.ellipse(cx,cy,pw,ph,0,0,Math.PI*2);ctx.fill();

      // 四根手指（顶部，随progress弯曲）
      for(let fi=0;fi<4;fi++){
        const fx=cx-12+fi*8;
        const fingerLen=12-fistProgress*9; // 握拳时手指缩短
        const fiy=cy-ph;
        ctx.fillStyle='#bb3311';
        ctx.beginPath();ctx.ellipse(fx,fiy-fingerLen/2,3,fingerLen/2+1,0,0,Math.PI*2);ctx.fill();
      }

      // 拇指（侧面）
      ctx.fillStyle='#bb3311';
      const thumbX=cx+pw-2,thumbY=cy+2;
      const thumbLen=8-fistProgress*5;
      ctx.beginPath();ctx.ellipse(thumbX,thumbY,thumbLen/2+1,3,Math.PI*0.3,0,Math.PI*2);ctx.fill();

      // 握紧时爆出粒子（fistProgress>0.8时）
      if(fistProgress>0.8&&G.elapsed%4===0){
        const sparks=3;
        for(let si=0;si<sparks;si++){
          const sa=Math.random()*Math.PI*2;
          const sr=pw+Math.random()*12;
          ctx.globalAlpha=fistAlpha*(1-fistProgress)*3;
          ctx.fillStyle='#ff6633';
          ctx.shadowBlur=8;ctx.shadowColor='#ff4400';
          ctx.beginPath();ctx.arc(cx+Math.cos(sa)*sr,cy+Math.sin(sa)*sr,1.5,0,Math.PI*2);ctx.fill();
        }
      }
      ctx.restore();
    }

    // Boss台词气泡
    drawBossDialogue(ctx, G);

    // 跳过提示
    if(t<160){
      ctx.save();
      ctx.globalAlpha=0.35+Math.sin(G.elapsed*0.15)*0.15;
      ctx.fillStyle='#ffffff';
      ctx.font='11px Arial';
      ctx.textAlign='center';
      ctx.fillText('点击跳过',W/2,H-28);
      ctx.restore();
    }
    ctx.restore(); // 匹配line 1884的ctx.save()
  }
}

// ── 怒气需求检查（Boss绑定空架子）──
function checkRageRequirement(G, boss){
  const required = boss._rageRequire||0;
  const met = (G.rageTier||0)>=required;
  return {
    met,
    required: RAGE_TIERS[required]?RAGE_TIERS[required].name:'无',
    current:  RAGE_TIERS[G.rageTier||0].name,
  };
}

// ── Boss台词系统 ──
function bossTaunt(boss, trigger, G){
  const lines = boss.taunts?.[trigger];
  if(!lines||!lines.length) return;
  const text = lines[Math.floor(Math.random()*lines.length)];
  showBossDialogue(boss, text);
}

function showBossDialogue(boss, text){
  if(!G) return;
  G.bossDialogue = { text, timer: 240, maxTimer: 240, bossName: boss.name };
}

function drawBossDialogue(ctx, G){
  if(!G.bossDialogue||G.bossDialogue.timer<=0) return;
  G.bossDialogue.timer--;
  const d = G.bossDialogue;
  const alpha = d.timer > 30 ? 1 : d.timer/30;
  const bossY = G.boss ? G.boss.y : H/2;

  ctx.save();
  ctx.font='bold 13px Arial';ctx.textAlign='center';
  ctx.globalAlpha = alpha;
  const tw = ctx.measureText(d.text).width + 24;
  const bx = Math.max(tw/2+8, Math.min(W-tw/2-8, G.boss ? G.boss.x : W/2));
  const by = bossY - (G.boss ? G.boss.sz/2 : 30) - 36;
  ctx.fillStyle = 'rgba(0,0,0,0.82)';
  ctx.beginPath();
  const r=8, x=bx-tw/2, y=by-22;
  ctx.moveTo(x+r,y);ctx.lineTo(x+tw-r,y);ctx.arcTo(x+tw,y,x+tw,y+r,r);
  ctx.lineTo(x+tw,y+18);ctx.arcTo(x+tw,y+22,x+tw-r,y+22,r);
  ctx.lineTo(bx+6,y+22);ctx.lineTo(bx,y+30);ctx.lineTo(bx-6,y+22);
  ctx.lineTo(x+r,y+22);ctx.arcTo(x,y+22,x,y+22-r,r);
  ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();ctx.fill();
  ctx.fillStyle='#ffffff';
  ctx.shadowColor='rgba(0,0,0,0)';ctx.shadowBlur=0;
  ctx.fillText(d.text, bx, by-5);
  ctx.restore();
}

// ── 小怪出场气泡 ──
function drawBubble(ctx, e){
  if(!e._bubble||e._bubble.timer<=0) return;
  e._bubble.timer--;
  const d=e._bubble;
  const alpha=d.timer>30?1:d.timer/30;
  const sz=e.sz||10;
  ctx.save();ctx.globalAlpha=alpha;
  ctx.font='9px Arial';ctx.textAlign='center';
  const tw=ctx.measureText(d.text).width+12;
  const bx=e.x, by=e.y-sz-14;
  ctx.fillStyle='rgba(0,0,0,0.72)';
  const r=5,w=tw,h=14,x=bx-tw/2,y=by-h/2;
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+tw-r,y);ctx.arcTo(x+tw,y,x+tw,y+r,r);
  ctx.lineTo(x+tw,y+h);ctx.arcTo(x+tw,y+h,x+tw-r,y+h,r);
  ctx.lineTo(bx+4,y+h);ctx.lineTo(bx,y+h+5);ctx.lineTo(bx-4,y+h);
  ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();ctx.fill();
  ctx.fillStyle='#ffffff';
  ctx.fillText(d.text,bx,by+4);
  ctx.restore();
}

// ── 装备实际加成计算（初版）──
function applyEquipBonuses(G){
  // 读取装备的 rageUnlock 字段，未达到tier时该装备bonus×0
  // 目前 TREASURE_POOL 尚未有 rageUnlock 字段，此函数预留接口
  // 后续 config.js 给每件装备加 rageUnlock:{tier:X} 后，在此计算生效
  const equips=[G.vaultEquip,G.vaultEquip2].filter(Boolean);
  equips.forEach(eq=>{
    if(!eq.rageUnlock)return; // 无解锁要求，正常生效
    const reqTier=eq.rageUnlock.tier||0;
    if((G.rageTier||0)<reqTier){
      // 未达到境界：本帧该装备加成归零（不改原始数据，只影响buffs）
      // 具体属性归零逻辑在各weapon的onEquip之后处理，此处记录标记
      eq._bonusActive=false;
    } else {
      eq._bonusActive=true;
    }
  });
}

// ── 主循环 ──
function loop(){if(!G._sceneBuilt){buildSceneCache(G.stageId||1);G._sceneBuilt=true;}update();draw();G._raf=requestAnimationFrame(loop);}

// ── 输入 ──
window.addEventListener('keydown',e=>{
  G&&(G.keys[e.key]=true);
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();
  if(e.key==='Escape'||e.key==='p'||e.key==='P'||e.key===' ')togglePause();
});
window.addEventListener('keyup',e=>{G&&(G.keys[e.key]=false);});
CV.addEventListener('mousemove',e=>{if(!G||G.paused)return;const r=CV.getBoundingClientRect();mX=e.clientX-r.left;mY=e.clientY-r.top;});
let dpadState={u:false,d:false,l:false,r:false};
function bindDpad(id,key,sk){const el=document.getElementById(id);if(!el)return;const press=e=>{e.preventDefault();dpadState[sk]=true;if(G&&!G.paused)G.keys[key]=true;};const release=e=>{e.preventDefault();dpadState[sk]=false;if(G&&!G.paused)G.keys[key]=false;};el.addEventListener('touchstart',press,{passive:false});el.addEventListener('touchend',release,{passive:false});el.addEventListener('mousedown',press);el.addEventListener('mouseup',release);el.addEventListener('mouseleave',release);}
bindDpad('du','ArrowUp','u');bindDpad('dd','ArrowDown','d');bindDpad('dl','ArrowLeft','l');bindDpad('dr','ArrowRight','r');
let touchStart=null;
let lastTapTime=0;
CV.addEventListener('mousedown',e=>{if(G&&!G.introDone){G.introTimer=0;G.introDone=true;G.paused=false;return;}});
CV.addEventListener('touchstart',e=>{
  e.preventDefault();
  if(G&&!G.introDone){G.introTimer=0;G.introDone=true;G.paused=false;return;}
  const now=Date.now();
  if(now-lastTapTime<300){togglePause();lastTapTime=0;return;}
  lastTapTime=now;
  const r=CV.getBoundingClientRect();touchStart={x:e.touches[0].clientX-r.left,y:e.touches[0].clientY-r.top};
},{passive:false});
CV.addEventListener('touchmove',e=>{e.preventDefault();if(!touchStart||!G||G.paused)return;const r=CV.getBoundingClientRect();const tx=e.touches[0].clientX-r.left,ty=e.touches[0].clientY-r.top;G.mx=Math.max(14,Math.min(W-14,G.mx+(tx-touchStart.x)*0.5));G.my=Math.max(14,Math.min(H-14,G.my+(ty-touchStart.y)*0.5));touchStart={x:tx,y:ty};},{passive:false});
CV.addEventListener('touchend',e=>{e.preventDefault();touchStart=null;},{passive:false});
