// ══════════════════════════════════════════
// 道劫：万法失控 — 技能/Build系统 (skills.js)
// Build选择 · 法宝品质 · 升级面板 · Combo · 领域
// ══════════════════════════════════════════

// ── Build系统 ──
let selectedBuild='spore';
function selectBuild(b){
  selectedBuild=b;
  document.querySelectorAll('.build-card').forEach((el,i)=>{
    el.classList.toggle('selected',['spore','plasma','swarm','berserk'][i]===b);
  });
}
function applyBuildBonus(G){
  G.buildWeights={};
  G.buildLockedPool=null;
}

// ── 法宝品质 ──
function rollQuality(qmod=0){
  const pool=QUALITY_DEFS.map((q,i)=>{
    let w=q.weight;
    if(qmod>0){w=i>=3?w*(1+qmod*1.5):w*(1-qmod*0.3);}
    if(qmod<0){w=i<=2?w*(1-qmod*0.5):w*(1+qmod*0.3);}
    return {...q,w:Math.max(0.1,w)};
  });
  const total=pool.reduce((s,q)=>s+q.w,0);
  let r=Math.random()*total;
  for(const q of pool){r-=q.w;if(r<=0)return q;}
  return pool[pool.length-1];
}

// ── 抽卡界面 ──
function buildGachaCards(){
  const container=document.getElementById('gacha-cards');
  container.innerHTML='';
  const shuffled=[...TREASURE_POOL].sort(()=>Math.random()-0.5).slice(0,3);
  shuffled.forEach((t,idx)=>{
    const q=rollQuality(t.qmod+(idx===0?0.3:0));
    const b=QUALITY_BONUS[q.id];
    const card=document.createElement('div');
    card.className=`gacha-card ${q.cardClass}`;
    let effectLines=t.desc;
    if(b.extra) effectLines+=`<br><span style="color:${q.color};font-weight:700">${b.extra}</span>`;
    if(b.spdMult>1) effectLines+=`<br><span style="color:#aaddff">移速×${b.spdMult}</span>`;
    card.innerHTML=`
      <div class="gc-quality" style="color:${q.color}">${q.name}</div>
      <div class="gc-icon">${t.icon}</div>
      <div class="gc-name">${t.name}</div>
      <div class="gc-effect">${effectLines}</div>
      <div class="gc-power" style="color:${q.color}">品质加成 ×${b.atkMult.toFixed(1)}</div>`;
    card.onclick=()=>selectGacha(t,q);
    container.appendChild(card);
    if(q.id==='gold'){
      setTimeout(()=>{const fl=document.getElementById('gold-flash');fl.classList.add('show');setTimeout(()=>fl.classList.remove('show'),900);},idx*250);
    }
    if(q.id==='red'){
      setTimeout(()=>{const fl=document.getElementById('red-flash');fl.classList.add('show');setTimeout(()=>fl.classList.remove('show'),1200);screenShake(12);},idx*250);
    }
  });
}

function selectGacha(t,q){
  const b=QUALITY_BONUS[q.id];
  saveToVault(t,q,b);
  G.gachaStartWeapon=t.wid;
  G.gachaQuality=q.id;
  G.gachaAtkBonus=b.atkMult;
  G.gachaCdBonus=b.cdMult;
  G.gachaDmgFlat=b.dmgFlat;
  G.baseAtkMult=b.atkMult;
  G.baseSpdMult=b.spdMult;
  G.baseCdMult=b.cdMult;
  G.baseDmgFlat=b.dmgFlat||0;
  G.critRate=b.critRate||0;G.comboHit=b.comboHit||0;
  G.splashR=b.splashR||0;G.pierceCount=b.pierce||0;
  G.reflectRate=b.reflect||0;G.shieldHp=b.shield||0;
  G.leechRate=b.leechRate||0;G.dodgeFrames=b.dodgeFrames||0;
  G.dmgReduce=Math.min(0.6,(G.dmgReduce||0)+(b.dmgReduce||0));
  G.revive=G.revive||(b.revive||false);
  G.comboSpeedBonus=b.comboSpeed||1;G.comboDmgBonus=b.comboDmg||0;
  G.evolveRateBonus=b.evolveRate||1;G.xpBoost=b.xpBoost||1;
  G.starDmgBonus=b.starDmg||0;G.evolveRangeBonus=b.evolveRange||1;
  G.vaultEquipEffects=t.effects||[];G.vaultEquipQualityMult=b.qualityMult||1;
  G.vaultEquipQuality=q.id;G.vaultEquipWid=t.wid;
  G.buffs.atk=1.2*b.atkMult;
  G.buffs.spd=1.15*b.spdMult;
  G.buffs.dmgFlat=b.dmgFlat||0;
  equipWeaponById(t.wid);
  if(q.id==='red'){
    addDamageText(G,G.mx,G.my,'⚡ 神品降临！',q.color,24);
    playSound('ultra');screenShake(18);
    for(let i=0;i<6;i++)setTimeout(()=>{addExplosionWave(G,G.mx,G.my,20+i*15,'#ff3322');},i*120);
  } else if(q.id==='gold'){
    addDamageText(G,G.mx,G.my,'✦ 天品法宝！',q.color,20);
    playSound('ultra');screenShake(10);
  } else {
    playSound('sync');
  }
  showBuffToast(`获得 ${q.name}【${t.icon}${t.name}】${b.extra?'·'+b.extra:''}`,q.color);
  document.getElementById('gacha-overlay').classList.remove('show');
  finishGameStart();
}

function skipGacha(){
  const cards=document.getElementById('gacha-cards').children;
  if(cards.length>0)cards[Math.floor(Math.random()*cards.length)].click();
}

function equipWeaponById(wid){
  const w=WEAPONS[wid];if(!w)return;
  const sl=G.slots.find(s=>!s.id);
  if(sl){sl.id=wid;sl.lv=1;sl.timer=0;sl.state={};sl.stars=0;if(w.onEquip)w.onEquip(G,1,0);}
  updateWeaponUI();
}

// ── 开局流程 ──
function finishGameStart(){
  G.paused=false;
  applyBuildBonus(G);
  spawnBug(3);
  for(let i=0;i<3;i++)setTimeout(()=>{if(G&&!G.dead&&!G.won)spawnEnemy(G);},i*300);
  setTimeout(()=>{if(G&&!G.dead&&!G.won)showUpgrade();},700);
}

function dismissBuildInfo(){
  document.getElementById('build-overlay').classList.remove('show');
  if(G.vaultEquip){
    const t=TREASURE_POOL.find(x=>x.wid===G.vaultEquip.wid)||TREASURE_POOL[0];
    const qDef=QUALITY_DEFS.find(x=>x.id===G.vaultEquip.quality)||QUALITY_DEFS[0];
    const b=QUALITY_BONUS[qDef.id];
    equipWeaponById(t.wid);
    showBuffToast(`携带【${t.icon}${t.name}】${G.vaultEquip.qualityName}·入局加成已生效`,qDef.color);
    if(qDef.id==='red'){addDamageText(G,G.mx,G.my,'⚡ 神品降临！',qDef.color,24);playSound('ultra');screenShake(18);}
    else if(qDef.id==='gold'){addDamageText(G,G.mx,G.my,'✦ 天品法宝！',qDef.color,20);playSound('ultra');screenShake(10);}
    else{playSound('sync');}
    if(G.vaultEquip2){
      const t2=TREASURE_POOL.find(x=>x.wid===G.vaultEquip2.wid)||TREASURE_POOL[0];
      const qDef2=QUALITY_DEFS.find(x=>x.id===G.vaultEquip2.quality)||QUALITY_DEFS[0];
      equipWeaponById(t2.wid);
      setTimeout(()=>{
        showBuffToast(`第二法宝【${t2.icon}${t2.name}】${G.vaultEquip2.qualityName}·加成叠加`,qDef2.color);
        playSound('sync');
      },400);
    }
    finishGameStart();
  } else {
    G.paused=true;
    buildGachaCards();
    document.getElementById('gacha-overlay').classList.add('show');
  }
}

// ── 初始化游戏 ──
function initGame(){
  resizeCanvas();
  mX=W/2;mY=H/2;
  let _baseAtk=1,_baseSpd=1,_baseCd=1,_baseDmgFlat=0;
  let _baseCritRate=0,_baseComboHit=0,_baseSplashR=0,_basePierce=0,_baseReflect=0;
  let _baseHpMult=1,_baseShield=0,_baseLeechRate=0,_baseDodgeFrames=0,_baseDmgReduce=0;
  let _baseRevive=false;
  let _baseComboSpeed=1,_baseComboDmg=0,_baseEvolveRate=1,_baseXpBoost=1,_baseStarDmg=0,_baseEvolveRange=1;

  function _applyEquip(eq){
    if(!eq)return;
    const ef=eq.effects||[];const hasAll=!ef.length;
    function has(k){return hasAll||ef.includes(k);}
    if(has('atkMult'))_baseAtk*=(eq.atkMult||1);if(has('spdMult'))_baseSpd*=(eq.spdMult||1);if(has('cdMult'))_baseCd*=(eq.cdMult||1);
    if(has('hpMult'))_baseHpMult*=(eq.hpMult||1);if(has('comboSpeed'))_baseComboSpeed*=(eq.comboSpeed||1);
    if(has('evolveRate'))_baseEvolveRate*=(eq.evolveRate||1);if(has('xpBoost'))_baseXpBoost*=(eq.xpBoost||1);
    if(has('evolveRange'))_baseEvolveRange*=(eq.evolveRange||1);
    if(has('dmgFlat'))_baseDmgFlat+=(eq.dmgFlat||0);if(has('critRate'))_baseCritRate+=(eq.critRate||0);
    if(has('comboHit'))_baseComboHit+=(eq.comboHit||0);if(has('pierce'))_basePierce+=(eq.pierce||0);
    if(has('reflect'))_baseReflect+=(eq.reflect||0);if(has('shield'))_baseShield+=(eq.shield||0);
    if(has('leechRate'))_baseLeechRate+=(eq.leechRate||0);if(has('comboDmg'))_baseComboDmg+=(eq.comboDmg||0);
    if(has('starDmg'))_baseStarDmg+=(eq.starDmg||0);if(has('dmgReduce'))_baseDmgReduce+=(eq.dmgReduce||0);
    if(has('splashR'))_baseSplashR=Math.max(_baseSplashR,eq.splashR||0);
    if(has('revive'))_baseRevive=_baseRevive||(eq.revive||false);
    if(has('dodgeFrames')&&(eq.dodgeFrames||0)>0)_baseDodgeFrames=_baseDodgeFrames>0?Math.min(_baseDodgeFrames,eq.dodgeFrames):eq.dodgeFrames;
  }
  _applyEquip(pendingEquip);
  _applyEquip(pendingEquip2);
  const _totalHp=Math.round(60*_baseHpMult);
  _baseDmgReduce=Math.min(0.6,_baseDmgReduce);
  const _isReplay=!!_pendingReplayProgress;
  let _origProg=null;
  if(_isReplay){_origProg=getProgress();saveProgress({..._origProg,realmIdx:_pendingReplayProgress.realmIdx,stageCleared:_pendingReplayProgress.stageCleared});_pendingReplayProgress=null;}
  const _prog3=getProgress();
  const _currentRealm=Math.min(_prog3.realmIdx,REALMS.length-1);
  const _currentStage=Math.min(_prog3.stageCleared||0,REALMS[_currentRealm].stages-1);
  const _stageNode=STAGE_MAP.find(s=>s.realm===_currentRealm&&s.stage===_currentStage);
  const _stageCfg=_stageNode?STAGE_CONFIGS[_stageNode.type]:STAGE_CONFIGS.normal;

  const _prog=_prog3;_prog.totalRuns=(_prog.totalRuns||0)+1;saveProgress(_prog);
  const _bossEarly=_stageCfg.bossEarly||0;
  G={
    mx:W/2,my:H/2,mhp:_totalHp,mmaxhp:_totalHp,
    bugs:[],enemies:[],projs:[],pts:[],arcs:[],
    xp:0,xpNext:25,lv:1,kills:0,elapsed:0,
    combo:0,comboTimer:0,comboTier:0,damageTexts:[],waves:[],
    infection:0,eliteFlash:0,slimePools:[],infectionMap:[],
    comboMilestone:0,pendingUpgrade:0,
    keys:{},paused:true,dead:false,won:false,upgrading:false,
    slots:Array(10).fill(null).map(()=>({id:null,lv:0,timer:0,state:{},stars:0})),
    pendingStarFor:{},
    _bossAt:BOSS_AT,bossPhase:0,boss:null,bossMode:false,bossTriggered:Array(BOSS_AT.length).fill(false),
    spawnTimer:0,bugTimer:0,
    swarmBonus:0,bugHpMult:1*_stageCfg.enemyHpMult,spawnMult:1,killSpawn:0,leechLv:0,dmgReduce:_baseDmgReduce,regenRate:0,eliteRate:0.1*_stageCfg.eliteRateMult,
    baseAtkMult:_baseAtk,baseSpdMult:_baseSpd,baseCdMult:_baseCd,baseDmgFlat:_baseDmgFlat,
    phase:0,_raf:null,
    buffs:{atk:1.2*_baseAtk,spd:1.15*_baseSpd},
    worldCorrupt:false,overmind:false,worldPulseActive:false,worldPulseTimer:0,worldPulseFlash:0,
    noDmgTimer:0,
    dangerZones:[],dangerCircles:[],
    activeBuild:null,buildWeights:{},buildLockedPool:null,
    mycelBetray:0,visionCorrupt:0,hatchTideTimer:0,
    mycelWalls:[],uiCorrupt:0,
    berserkerLv:0,deathSync:false,
    stillTimer:0,
    vaultEquip:pendingEquip||null,
    vaultEquip2:pendingEquip2||null,
    vaultEquipEffects:pendingEquip?pendingEquip.effects||[]:[],
    vaultEquipQualityMult:pendingEquip?pendingEquip.qualityMult||1:1,
    vaultEquipQuality:pendingEquip?pendingEquip.quality||'white':'white',
    vaultEquipWid:pendingEquip?pendingEquip.wid||null:null,
    critRate:_baseCritRate,comboHit:_baseComboHit,splashR:_baseSplashR,
    pierceCount:_basePierce,reflectRate:_baseReflect,
    shieldHp:_baseShield,shieldBase:_baseShield,leechRate:_baseLeechRate,
    dodgeFrames:_baseDodgeFrames,dodgeCd:0,dodgeTimer:0,
    _isReplay,_origProg,timeLimit:_stageCfg.timeLimit,bossEarly:_bossEarly,revive:_baseRevive,reviveConsumed:false,blizzardFlash:0,
    comboSpeedBonus:_baseComboSpeed,comboDmgBonus:_baseComboDmg,
    evolveRateBonus:_baseEvolveRate,xpBoost:_baseXpBoost,
    starDmgBonus:_baseStarDmg,evolveRangeBonus:_baseEvolveRange,
    stagePhase:0,viewMode:'free',activeBossAt:null,totalTime:360,
  };
  // viewMode分区 + 阶段初始化
  const stageId=_currentRealm+1;
  const VM={1:'free',2:'free',3:'free',4:'vertical',5:'vertical',6:'free',7:'free',8:'free',9:'vertical',10:'arena'};
  G.viewMode=VM[stageId]||'free';
  G.stagePhase=0;
  G.activeBossAt=(stageId===10)?STAGE_10_BOSS_AT:BOSS_AT;
  G.totalTime=(stageId===10)?540:360;
  G.bossTriggered=Array(G.activeBossAt.length).fill(false);
  manualPaused=false;speedIdx=0;SPEED=1;buffToastTimer=0;
  document.getElementById('buff-toast').style.opacity='0';
  document.getElementById('speed-toggle-btn').textContent='1x ▶';
  document.getElementById('speed-toggle-btn').classList.remove('active');
  document.getElementById('pause-btn').textContent='暂停战斗';
  document.getElementById('pause-btn').classList.remove('paused');
  shownAlerts=new Set();
  ['upgrade-overlay','result','boss-wrap'].forEach(id=>document.getElementById(id).classList.remove('show'));
  document.getElementById('alert-banner').classList.remove('show');
  document.getElementById('eco-alert').classList.remove('show');
  document.getElementById('h-sync-disp').style.display='none';
  updateWeaponUI();
  loop();
  dismissBuildInfo();
}

let _gameFirstLoad=true;

// ── 武器UI ──
function starStr(n){return n===0?'★':n===1?'★★':'★★★';}
function updateWeaponUI(){
  G.slots.forEach((sl,i)=>{
    const el=document.getElementById('ws'+i);
    if(!sl.id){el.innerHTML='<div class="ws-empty">法宝槽</div>';el.className='weapon-slot';return;}
    const w=WEAPONS[sl.id];
    const isEv=w.type==='evolve'||w.type==='evolvePassive';
    const isPassive=w.type==='passive'||w.type==='evolvePassive';
    const stars=sl.stars||0;const pct=sl.lv/w.maxLv*100;
    let cls='weapon-slot';
    if(stars>=2)cls+=' evolved3';else if(stars>=1)cls+=' evolved2';else if(isEv)cls+=' evolved';
    if(isPassive&&!isEv)cls+=' passive-active';
    el.className=cls;
    let badge='';
    if(isEv){if(stars>=2)badge=`<div class="evolved3-badge">★★★</div>`;else if(stars>=1)badge=`<div class="evolved2-badge">★★</div>`;else badge=`<div class="evolved-badge">★</div>`;}
    const barClass=stars>=2?' evolved3':stars>=1?' evolved2':isEv?' evolved':'';
    const sLabel=isEv?' '+starStr(stars):'';
    const isPending=sl.id&&w.evolve&&G.pendingStarFor&&G.pendingStarFor[w.evolve]===i;
    const passiveDot=isPassive?'<div class="ws-passive-dot"></div>':'';
    el.innerHTML=`${badge}<div class="ws-name">${w.name}${sLabel}${isPending?'⊕':''}</div><div class="ws-lv">Lv.${sl.lv}/${w.maxLv}</div><div class="ws-bar-wrap"><div class="ws-bar${barClass}" style="width:${pct}%"></div></div>${passiveDot}`;
  });
}

// ── 连斩系统（提取自_update）──
function updateCombo(G){
  if(G.comboTimer>0){G.comboTimer--;}else{G.combo=0;}
  if(G.combo>(G._maxCombo||0))G._maxCombo=G.combo;
  const prevTier=G.comboTier||0;
  G.comboTier=0;
  if(G.combo>=10)G.comboTier=1;if(G.combo>=25)G.comboTier=2;if(G.combo>=50)G.comboTier=3;
  if(G.combo>=80)G.comboTier=4;if(G.combo>=120)G.comboTier=5;if(G.combo>=200)G.comboTier=6;
  if(G.combo>=350)G.comboTier=7;if(G.combo>=500)G.comboTier=8;

  if(G.comboTier>prevTier){
    const tierNames=['','初鸣','连斩','破势','狂斩','剑意大成','道力爆发','失控冲天','万法归一'];
    const tierColors=['','#aaff44','#ffcc00','#ff9900','#ff4400','#ff2200','#cc00ff','#ff00aa','#ff00ff'];
    const tierBuffs=['','攻速+5%','攻速+10%','道力+15%','道力+25%','道力+40%','领域失控','天地共鸣','万法失控'];
    const tc=tierColors[G.comboTier]||'#ff8800';
    showBuffToast('⚡ '+tierNames[G.comboTier]+' · '+tierBuffs[G.comboTier],tc);
    screenShake(G.comboTier*1);playSound('sync');
    for(let i=0;i<G.comboTier;i++){setTimeout(()=>{if(!G||G.dead)return;addExplosionWave(G,G.mx,G.my,14+i*6,tc);},i*80);}
    triggerTreasureFlash();
    document.getElementById('h-sync-disp').style.display='block';
    document.getElementById('h-sync-disp').textContent='⚡ '+tierNames[G.comboTier]+' ×'+G.combo;
    document.getElementById('h-sync-disp').style.color=tc;
    if(G.comboTier>=6){if(Math.random()<0.3)G.infectionMap.push({x:Math.random()*W,y:Math.random()*H,r:60,life:500,pulse:0,hostile:false});}
    if(G.comboTier>=6){G.infection=Math.min(1,(G.infection||0)+0.08);}
    if(G.comboTier>=7){G.worldCorrupt=true;}
    if(G.comboTier>=8){G.overmind=true;}
  }
  if(G.comboTier===0)document.getElementById('h-sync-disp').style.display='none';

  const berserkBonus=G.activeBuild==='berserk'&&G.noDmgTimer>300?1+(G.berserkerLv||0)*0.12:1;
  const baseAtk=G.baseAtkMult||1,baseSpd=G.baseSpdMult||1;
  G.buffs={atk:1.2*berserkBonus*baseAtk,spd:1.15*baseSpd,dmgFlat:G.baseDmgFlat||0};
  switch(G.comboTier){
    case 1:G.buffs.spd=1.2*baseSpd;break;
    case 2:G.buffs.spd=1.25*baseSpd;break;
    case 3:G.buffs.atk=1.35*berserkBonus*baseAtk;G.buffs.spd=1.2*baseSpd;break;
    case 4:G.buffs.atk=1.45*berserkBonus*baseAtk;G.buffs.spd=1.3*baseSpd;break;
    case 5:G.buffs.atk=1.6*berserkBonus*baseAtk;G.buffs.spd=1.3*baseSpd;break;
    case 6:G.buffs.atk=1.8*berserkBonus*baseAtk;G.buffs.spd=1.4*baseSpd;G.infection=Math.min(1,(G.infection||0)+0.002);break;
    case 7:G.buffs.atk=2.0*berserkBonus*baseAtk;G.worldCorrupt=true;break;
    case 8:G.buffs.atk=2.5*berserkBonus*baseAtk;G.overmind=true;break;
  }
  if(G.activeBuild==='berserk'&&G.comboTier>=5){
    G.dmgReduce=Math.max(0,G.dmgReduce);
  }
}

// ── 法宝combo效果（提取自_update）──
function updateArtifactCombo(G){
  if(G.comboTier>=2&&G.comboSpeedBonus>1)G.buffs.atk*=G.comboSpeedBonus;
  if(G.comboDmgBonus>0)G.buffs.atk*=(1+Math.floor(G.combo/10)*G.comboDmgBonus);
  if(G.starDmgBonus>0){
    let ts=0;G.slots.forEach(s=>{if(s.id){const w=WEAPONS[s.id];if(w.type==='evolve'||w.type==='evolvePassive')ts+=s.stars||0;}});
    if(ts>0)G.buffs.atk*=(1+ts*G.starDmgBonus);
  }
}

// ── 领域成长（提取自_update）──
function updateDomainGrowth(G){
  const phaseTime=G.elapsed/60;
  G.infection=Math.min(1,(G.infection||0)+0.0008);
  if(phaseTime<120&&G.elapsed%90===0&&G.infectionMap.length<20){
    G.infectionMap.push({x:Math.random()*W,y:Math.random()*H,r:35+Math.random()*45,life:900+Math.random()*300,pulse:Math.random()*999,hostile:false});
  }
  if(phaseTime>=120&&phaseTime<360&&G.elapsed%60===0&&G.infectionMap.length<35){
    if(G.infectionMap.length>0){
      const src=G.infectionMap[Math.floor(Math.random()*G.infectionMap.length)];
      const ang=Math.random()*Math.PI*2,dist=50+Math.random()*80;
      G.infectionMap.push({x:src.x+Math.cos(ang)*dist,y:src.y+Math.sin(ang)*dist,r:30+Math.random()*35,life:700,pulse:Math.random()*999,hostile:false});
    }
  }
  if(phaseTime>=480&&G.elapsed%60===0&&G.infectionMap.length<40){
    G.infectionMap.push({x:Math.random()*W,y:Math.random()*H,r:40+Math.random()*50,life:600,pulse:Math.random()*999,hostile:true});
  }

  G.infectionMap.forEach(z=>{
    z.life--;z.pulse+=0.05;
    if(z.fastGrow)z.r=Math.min(z.r*1.002,180);
    const pdx=G.mx-z.x,pdy=G.my-z.y;
    if(pdx*pdx+pdy*pdy<z.r*z.r){
      if(z.hostile){
        applyPlayerDamage(G,0.008);
        if(G.elapsed%60===0)addDamageText(G,G.mx+(Math.random()-0.5)*16,G.my-12,'领域侵蚀','#ff4422',10);
      }
      else if(phaseTime<180){G.mhp=Math.min(G.mmaxhp,G.mhp+0.025);}
    }
    G.enemies.forEach(e=>{
      const dx=e.x-z.x,dy=e.y-z.y;
      if(dx*dx+dy*dy<z.r*z.r){
        if(!z.hostile&&phaseTime<180){e.slowTimer=Math.max(e.slowTimer||0,8);}
        else if(z.hostile){e.rage=1.1;}
      }
    });
    G.enemies.forEach(e=>{if(e.special==='corruptor'&&!z.hostile&&Math.hypot(e.x-z.x,e.y-z.y)<z.r*0.5){z.r=Math.min(z.r+0.05,120);z.hostile=phaseTime>180;}});
  });
  G.infectionMap=G.infectionMap.filter(z=>z.life>0);
}

// ── 武器开火调度（提取自_update）──
function updateAllWeapons(G){
  G.slots.forEach(sl=>{
    if(!sl.id)return;const w=WEAPONS[sl.id];
    if(w.update)w.update(G,sl.lv,sl.state,sl.stars);
    if(w.onFire){
      sl.timer++;const cd=w.cd?w.cd[Math.min(sl.lv-1,w.cd.length-1)]:60;
      const starMult=sl.stars>=2?0.5:sl.stars>=1?0.7:1;
      const buildCdMult=(w.cdMult?w.cdMult(G):1)*(G.baseCdMult||1);
      if(sl.timer>=cd*starMult*buildCdMult){sl.timer=0;w.onFire(G,sl.lv,sl.stars);}
    }
  });
}

// ── 升级面板 ──
function typeName(t){return{attack:'攻伐',orbit:'御灵',passive:'道法',evolve:'神通突破',evolvePassive:'超道法'}[t]||t;}
function pickNew(wid){const sl=G.slots.find(s=>!s.id);if(!sl)return closeUpgrade();sl.id=wid;sl.lv=1;sl.timer=0;sl.state={};sl.stars=0;const w=WEAPONS[wid];if(w.onEquip)w.onEquip(G,1);closeUpgrade();}
function closeUpgrade(){document.getElementById('upgrade-overlay').classList.remove('show');updateWeaponUI();G.upgrading=false;G.paused=manualPaused;}

function showUpgrade(){
  G.paused=true;G.upgrading=true;
  const equippedIds=G.slots.filter(s=>s.id).map(s=>s.id);
  const hasEmpty=G.slots.some(s=>!s.id);
  const pendingMerge=[];
  Object.entries(G.pendingStarFor||{}).forEach(([evolveId,slotIdx])=>{
    const srcSl=G.slots[slotIdx];if(!srcSl||!srcSl.id)return;
    const sw=WEAPONS[srcSl.id];if(!sw||sw.type==='evolve'||sw.type==='evolvePassive')return;
    if(sw.evolve!==evolveId)return;if(srcSl.lv<sw.maxLv)return;
    const targetSl=G.slots.find(s=>s.id===evolveId);if(!targetSl||targetSl.stars>=2)return;
    pendingMerge.push({srcSlot:srcSl,srcIdx:slotIdx,targetSlot:targetSl,evolveId});
  });
  const pendingSlotIdxs=new Set(Object.values(G.pendingStarFor||{}));
  const upgradeable=G.slots.filter((s,i)=>{
    if(!s.id)return false;const w=WEAPONS[s.id];
    if(w.type==='evolve'||w.type==='evolvePassive')return false;
    if(s.lv>=w.maxLv)return false;return true;
  });
  const evolveable=G.slots.filter((s,i)=>{
    if(!s.id)return false;const w=WEAPONS[s.id];
    if(w.type==='evolve'||w.type==='evolvePassive')return false;
    if(s.lv<w.maxLv)return false;if(!w.evolve)return false;
    if(equippedIds.includes(w.evolve))return false;if(pendingSlotIdxs.has(i))return false;return true;
  });
  const stackSource=[];
  if(hasEmpty){
    G.slots.forEach((sl)=>{
      if(!sl.id)return;const w=WEAPONS[sl.id];
      if(w.type!=='evolve'&&w.type!=='evolvePassive')return;if(sl.stars>=2)return;if(!w.sourceWeapon)return;
      const alreadyPending=Object.values(G.pendingStarFor||{}).some(idx=>G.slots[idx]&&G.slots[idx].id===w.sourceWeapon);
      if(alreadyPending)return;const srcInSlot=G.slots.some(s=>s.id===w.sourceWeapon);if(srcInSlot)return;
      stackSource.push({evolveSlot:sl,evolveId:sl.id,sourceId:w.sourceWeapon,sourceW:WEAPONS[w.sourceWeapon]});
    });
  }
  const lockedPool=G.buildLockedPool||null;
  const newPool=Object.keys(WEAPONS).filter(k=>{const w=WEAPONS[k];if(w.type==='evolve'||w.type==='evolvePassive')return false;if(equippedIds.includes(k))return false;if(lockedPool&&!lockedPool.includes(k))return false;return true;});
  const buildPriorityPool=newPool.sort((a,b)=>{
    const wa=G.buildWeights[a]||1,wb=G.buildWeights[b]||1;
    return (Math.random()<wb/(wa+wb)?1:-1);
  });
  let choices=[];
  if(pendingMerge.length>0)choices.push({kind:'merge',m:pendingMerge[0]});
  if(choices.length<3&&evolveable.length>0&&Math.random()<0.75*(G.evolveRateBonus||1))choices.push({kind:'evolve',slot:evolveable[Math.floor(Math.random()*evolveable.length)]});
  if(choices.length<3&&stackSource.length>0){const ss=stackSource[Math.floor(Math.random()*stackSource.length)];choices.push({kind:'stackSrc',ss});}
  const upShuffled=upgradeable.sort(()=>Math.random()-0.5);upShuffled.slice(0,2).forEach(sl=>{if(choices.length<3)choices.push({kind:'upgrade',slot:sl});});
  if(hasEmpty){const newShuffled=[...buildPriorityPool];while(choices.length<3&&newShuffled.length>0)choices.push({kind:'new',wid:newShuffled.pop()});}
  while(choices.length<3&&upgradeable.length>0)choices.push({kind:'upgrade',slot:upgradeable[Math.floor(Math.random()*upgradeable.length)]});
  choices=choices.slice(0,3);
  const vQual=G.vaultEquipQuality||'white';
  const vWid=G.vaultEquipWid;
  if(vQual!=='white'&&vQual!=='green'&&vWid){
    const vWeapon=WEAPONS[vWid];
    if(vWeapon&&vWeapon.evolve&&!equippedIds.includes(vWeapon.evolve)&&!choices.some(c=>c.kind==='evolve'&&G.slots[c.slot?G.slots.indexOf(c.slot):-1]&&G.slots[G.slots.indexOf(c.slot)].id===vWid)){
      const vSlot=G.slots.find(s=>s.id===vWid);
      if(vSlot&&vSlot.lv>=vWeapon.maxLv){
        const exclusiveCard={kind:'evolve',slot:G.slots.indexOf(vSlot),exclusive:true};
        const isGold=vQual==='purple'||vQual==='gold'||vQual==='red';
        if(isGold)exclusiveCard.gold=true;
        if(choices.length>=3&&Math.random()<0.75){choices[2]=exclusiveCard;}
        else if(choices.length<3){choices.push(exclusiveCard);}
      }
    }
  }
  choices=choices.slice(0,3);
  const seen=new Set();choices=choices.filter(c=>{const k=c.kind==='new'?'n'+c.wid:c.kind==='upgrade'?'u'+G.slots.indexOf(c.slot):c.kind;if(seen.has(k))return false;seen.add(k);return true;});
  if(choices.length===0){G.paused=false;G.upgrading=false;return;}
  const el=document.getElementById('up-cards');el.innerHTML='';
  const hasMerge=choices.some(c=>c.kind==='merge'),hasEv=choices.some(c=>c.kind==='evolve'),hasStack=choices.some(c=>c.kind==='stackSrc');
  document.getElementById('up-title').textContent=hasMerge?'⚡ 叠星进化！':hasEv?'⚡ 超武进化时机！':hasStack?'★ 叠星路线开启！':'⚡ 悟道突破';
  choices.forEach(c=>{
    const card=document.createElement('div');card.className='upgrade-card';
    if(c.kind==='new'){const w=WEAPONS[c.wid];card.innerHTML=`<div class="uc-name">${w.name}</div><span class="uc-type type-${w.type}">${typeName(w.type)}</span><div class="uc-desc">${w.desc[0]}</div><div class="uc-lv">新获得</div>`;card.onclick=()=>pickNew(c.wid);}
    else if(c.kind==='upgrade'){const sl=c.slot;const w=WEAPONS[sl.id];const nl=sl.lv+1;const willEvolve=nl>=w.maxLv&&w.evolve&&!equippedIds.includes(w.evolve);card.innerHTML=`<div class="uc-name">↑ ${w.name}</div><span class="uc-type type-${w.type}">${typeName(w.type)}</span><div class="uc-desc">${w.desc[Math.min(sl.lv,w.desc.length-1)]}</div><div class="uc-lv">Lv.${sl.lv}→${nl}${willEvolve?'（满级可进化）':''}</div>`;
      card.onclick=()=>{const wCheck=WEAPONS[sl.id];if(wCheck.type==='evolve'||wCheck.type==='evolvePassive'){closeUpgrade();return;}sl.lv++;const w2=WEAPONS[sl.id];if(w2.onEquip)w2.onEquip(G,sl.lv);closeUpgrade();};}
    else if(c.kind==='evolve'){const sl=c.slot;const w=WEAPONS[sl.id];const ew=WEAPONS[w.evolve];card.className+=' evolved-card'+(c.gold?' exclusive-gold':'');card.innerHTML=`<div class="uc-name">${c.gold?'👑 ':''}★ 进化：${ew.name}</div><span class="uc-type type-evolve">${c.exclusive?'⚔ 法宝专属·':''}超武进化</span><div class="uc-desc">${ew.desc[0]}</div><div class="uc-lv">${w.name} 满级 → 超武★${c.gold?' · 品质加成':''}</div>`;
      card.onclick=()=>{sl.id=w.evolve;sl.lv=1;sl.timer=0;sl.state={};sl.stars=0;const ew2=WEAPONS[w.evolve];if(ew2.onEquip)ew2.onEquip(G,1,0);closeUpgrade();};}
    else if(c.kind==='stackSrc'){const ss=c.ss;const sw=ss.sourceW;const ew=WEAPONS[ss.evolveId];const curStar=G.slots.find(s=>s.id===ss.evolveId)?.stars||0;const nextStar=curStar+1;card.className+=' evolved2-card';card.innerHTML=`<div class="uc-name">${sw.name}</div><span class="uc-type type-${sw.type}">${typeName(sw.type)}</span><div class="uc-desc">${sw.desc[0]}<br><span style="color:#ff8844">叠加至 ${ew.name} → ${starStr(nextStar)}</span></div><div class="uc-lv">新获得（叠星路线）</div>`;
      card.onclick=()=>{const emptySl=G.slots.find(s=>!s.id);if(!emptySl){closeUpgrade();return;}const idx=G.slots.indexOf(emptySl);emptySl.id=ss.sourceId;emptySl.lv=1;emptySl.timer=0;emptySl.state={};emptySl.stars=0;const sw2=WEAPONS[ss.sourceId];if(sw2.onEquip)sw2.onEquip(G,1);if(!G.pendingStarFor)G.pendingStarFor={};G.pendingStarFor[ss.evolveId]=idx;closeUpgrade();};}
    else if(c.kind==='merge'){const {srcSlot,srcIdx,targetSlot,evolveId}=c.m;const sw=WEAPONS[srcSlot.id];const ew=WEAPONS[evolveId];const nextStar=targetSlot.stars+1;card.className+=' evolved2-card';card.innerHTML=`<div class="uc-name">⚡ 叠星：${ew.name} ${starStr(nextStar)}</div><span class="uc-type type-evolve2">${nextStar===1?'二星':'三星'}超武</span><div class="uc-desc">效果×${nextStar+1}，冷却-${nextStar===1?30:50}%<br>槽位释放！</div><div class="uc-lv">${sw.name} 满级叠加</div>`;
      card.onclick=()=>{targetSlot.stars=nextStar;const ew2=WEAPONS[evolveId];if(ew2.onEquip)ew2.onEquip(G,targetSlot.lv,nextStar);srcSlot.id=null;srcSlot.lv=0;srcSlot.timer=0;srcSlot.state={};srcSlot.stars=0;delete G.pendingStarFor[evolveId];showAlert(`⚡ ${ew.name} ${starStr(nextStar)} 叠星！`,'green');closeUpgrade();};}
    el.appendChild(card);
  });
  document.getElementById('upgrade-overlay').classList.add('show');
}
