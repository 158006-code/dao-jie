// ══════════════════════════════════════════
// 道劫：万法失控 — 引擎核心 (engine.js)
// 碰撞判定 · 伤害计算 · 粒子特效 · 工具函数
// ══════════════════════════════════════════

// ── zzfx 音效引擎 ──
let zzfxX;
function zzfx(...z){zzfxX=zzfxX||new AudioContext();let b=zzfxX,d=b.createBuffer(1,b.sampleRate*z[1],b.sampleRate),e=d.numberOfChannels;for(let f=e;f--;){let g=d.getChannelData(f),h=z[0]||1,i=z[2]*2*Math.PI/b.sampleRate||220*2*Math.PI/b.sampleRate,j=z[3]||0,k=z[4]||0,l=z[5]||0,m=z[6]||0,n=z[7]||0,o=z[8]||0,p=z[9]||0,q=z[10]||0,r=0,s=0,t=0,u=1,v=0,w=0;for(let x=d.numberOfChannels;x--;)for(let y=0,A=0,B,C;y<g.length;y++){B=i+(j*y/g.length);C=n?1-2*(y/g.length%1*2-1):k?Math.sign(Math.sin(i*(y+1)))*h:m?Math.random()*2-1:Math.sin((r+=B));s=((C*u+(l?C<0?1:-1:0)*u)*h+o*(Math.random()*2-1));s=Math.min(Math.max(s,-1),1);g[y]=s*Math.cos(v++*p*2*Math.PI/b.sampleRate);}}const c=b.createBufferSource();c.buffer=d;c.connect(b.destination);c.start();return c;}
let soundEnabled=true;
function playSound(type){
  if(!soundEnabled)return;
  try{
    switch(type){
      case'kill':zzfx(.5,.08,600,.02,.01,.06,1,2,0,0,0,0,0,0,0,.08,.02,0,0,.01);break;
      case'hit':zzfx(.6,.08,180,.03,.01,.04,1,.8,0,0,0,0,0,0,0,.2,.02,0,0,.01);break;
      case'hit_light':zzfx(.25,.03,900,.01,.005,.02,1,3,0,0,0,0,0,0,0,.02,.005,0,0,.005);break;
      case'hit_heavy':zzfx(.7,.12,90,.02,.01,.06,1,-1.5,0,0,0,0,0,0,0,.3,.02,.1,0,.02);break;
      case'rage_up':zzfx(.6,.35,180,.02,.05,.2,0,3,0,0,600,.05,.15,0,0,0,.05,.6,0,.15);break;
      case'boss_armor_break':zzfx(.8,.25,200,.01,.02,.1,1,-4,0,0,0,0,0,0,0,.5,.15,.4,.05,.08);break;
      case'levelup':zzfx(.5,.3,300,.05,.05,.15,0,1.5,0,0,200,.05,.1,0,0,0,.05,.5,0,.1);break;
      case'ultra':zzfx(.8,.4,80,.05,.1,.3,1,.5,-5,0,0,0,0,0,0,.3,.1,.3,0,.05);break;
      case'hurt':zzfx(.7,.12,160,.01,.01,.08,1,-.5,0,0,0,0,0,0,0,.4,.01,0,0,.02);break;
      case'boss':zzfx(1,.6,60,.05,.1,.5,1,-.2,-4,0,0,0,0,0,0,.3,.15,.3,0,.1);break;
      case'bossdeath':zzfx(1,.8,50,.05,.1,.7,1,-.3,-5,0,0,0,0,0,0,.4,.2,.5,.1,.1);break;
      case'shoot':zzfx(.3,.05,600,.02,.01,.05,0,1.2,0,0,0,0,0,0,0,.05,.01,0,0,.02);break;
      case'poison':zzfx(.3,.25,200,.01,.05,.2,1,0,0,0,0,0,0,5,0,.1,.05,0,.1,.05);break;
      case'thunder':zzfx(.5,.15,800,.01,.01,.08,1,-2,0,0,0,0,0,8,0,.15,.01,0,0,.02);break;
      case'danger':zzfx(.6,.15,220,.02,.03,.1,1,-.8,0,0,0,0,0,0,0,.3,.02,0,0,.02);break;
      case'sync':zzfx(.5,.2,440,.03,.05,.1,0,1.2,0,0,150,.04,.08,0,0,0,.04,.4,0,.06);break;
      case'mycel':zzfx(.4,.3,90,.03,.1,.25,1,-.4,0,0,0,0,0,0,0,.2,.08,0,0,.05);break;
      case'pulse':zzfx(.7,.4,40,.02,.05,.4,1,-.3,-3,0,0,0,0,0,0,.3,.1,.4,.05,.08);break;
    }
  }catch(e){}
}

// ── Canvas ──
const CV=document.getElementById('c');
const ctx=CV.getContext('2d');
let W,H;
function resizeCanvas(){
  const vw=window.innerWidth;W=vw;
  const topH=document.querySelector('.top-bar').offsetHeight||26;
  const wepH=document.querySelector('.weapon-row').offsetHeight||50;
  const botH=document.querySelector('.bottom-bar').offsetHeight||34;
  const bossH=document.getElementById('boss-wrap').classList.contains('show')?(document.getElementById('boss-wrap').offsetHeight||22):0;
  H=Math.max(200,window.innerHeight-topH-wepH-botH-bossH);
  CV.width=W;CV.height=H;CV.style.width=W+'px';CV.style.height=H+'px';
}
resizeCanvas();
window.addEventListener('resize',resizeCanvas);

// ── 速度/暂停 ──
let SPEED=1,manualPaused=false;
let speedIdx=0;
function cycleSpeed(){
  speedIdx=(speedIdx+1)%SPEEDS.length;SPEED=SPEEDS[speedIdx];
  const labels=['1x ▶','1.5x ▶','2x ▶▶','3x ▶▶▶'];
  const btn=document.getElementById('speed-toggle-btn');
  btn.textContent=labels[speedIdx];btn.classList.toggle('active',speedIdx>0);
}
function quitBattle(){
  if(!G||G.dead||G.won)return;
  if(!confirm('确定退出当前战斗？\n本次进度不会保存。'))return;
  G.paused=true;G.dead=true;
  document.getElementById('result').classList.remove('show');
  document.getElementById('boss-wrap').classList.remove('show');
  cancelAnimationFrame(G._raf);
  G=null;
  showHomePage();
}
function togglePause(){
  if(G&&(G.dead||G.won))return;
  if(G&&G.upgrading)return;
  manualPaused=!manualPaused;
  if(G)G.paused=manualPaused;
  const btn=document.getElementById('pause-btn');
  btn.textContent=manualPaused?'继续渡劫':'暂停战斗';
  btn.classList.toggle('paused',manualPaused);
}

// ── 时间线提示 ──
let shownAlerts=new Set(),alertTimer=0;
function showAlert(msg,cls){
  const el=document.getElementById('alert-banner');
  el.textContent=msg;el.className='alert-banner show'+(cls?' '+cls:'');
  alertTimer=150;
}
let ecoAlertTimer=0;
function showEcoAlert(msg){
  const el=document.getElementById('eco-alert');
  el.textContent=msg;el.classList.add('show');ecoAlertTimer=100;
}

// ── 对象池 ──
const PtPool=[],ProjPool=[],DmgPool=[];
function getPt(){return PtPool.pop()||{};}
function getProj(){return ProjPool.pop()||{};}
function getDmg(){return DmgPool.pop()||{};}
function recyclePt(p){if(PtPool.length<120)PtPool.push(p);}
function recycleProj(p){if(ProjPool.length<100)ProjPool.push(p);}
function recycleDmg(d){if(DmgPool.length<100)DmgPool.push(d);}

// ── 粒子/投射物/伤害字 ──
function addPt(G,x,y,color,n,spd){
  const maxN=G.comboTier>=6?Math.ceil(n*0.5):n;
  for(let i=0;i<maxN;i++){
    const p=getPt();const a=Math.random()*Math.PI*2,s=(0.4+Math.random())*spd;
    p.x=x;p.y=y;p.vx=Math.cos(a)*s;p.vy=Math.sin(a)*s;p.life=1;p.color=color;p.r=1.5+Math.random()*1.5;
    G.pts.push(p);
  }
}
function addProj(G,x,y,vx,vy,opts){
  const p=getProj();Object.assign(p,{x,y,vx,vy,age:0,...opts});G.projs.push(p);
}
function addDamageText(G,x,y,text,color,size=16){
  const d=getDmg();d.x=x;d.y=y;d.text=text;d.color=color;d.size=size;d.life=40;d.vy=-0.7;
  G.damageTexts.push(d);
}

// ── 特效 ──
let shakePower=0,flashTimer=0;
function screenShake(power){shakePower=Math.max(shakePower,power);}
function addExplosionWave(G,x,y,r,color){G.waves.push({x,y,r,life:20,color});}
function addArc(G,x,y,stars){G.arcs.push({x,y,life:20+stars*10,stars});}
function triggerFlash(){/* 白屏闪烁已关闭 */}

// ── 工具函数 ──
let bugId=0,enId=0;
function nearestEnemy(G){
  let best=null,bd=Infinity;
  G.enemies.forEach(e=>{if(e.stealth&&e.stealthAlpha<0.3)return;const d=Math.hypot(e.x-G.mx,e.y-G.my);if(d<bd){bd=d;best=e;}});
  if(G.boss){const d=Math.hypot(G.boss.x-G.mx,G.boss.y-G.my);if(d<bd)best=G.boss;}
  return best;
}
function nearestEnemyTo(G,x,y){
  let best=null,bd=Infinity;
  G.enemies.forEach(e=>{const d=Math.hypot(e.x-x,e.y-y);if(d<bd){bd=d;best=e;}});
  if(G.boss){const d=Math.hypot(G.boss.x-x,G.boss.y-y);if(d<bd)best=G.boss;}
  return best;
}
function knockback(obj,fx,fy,force){const dx=obj.x-fx,dy=obj.y-fy,d=Math.hypot(dx,dy)||1;obj.vx+=(dx/d)*force;obj.vy+=(dy/d)*force;}

// ── 伤害计算 ──
function applyPlayerDamage(G,amount){
  if(!amount||amount<=0)return;
  amount*=(1-(G.dmgReduce||0));
  if(G.dodgeTimer>0)return;
  if(G.shieldHp>0){
    if(G.shieldHp>=amount){G.shieldHp-=amount;return;}
    amount-=G.shieldHp;G.shieldHp=0;
  }
  G.mhp-=amount;
  G._hurtFrames=3; // 玩家绘制抖动触发器
  // 受伤时：延长余怒窗口到6秒（不清零combo，激怒效果）
  if(G.comboTimer>0){
    G.comboTimer=Math.max(G.comboTimer, RAGE_WINDOW_HIT);
  }
}
function applyReflect(G,dmgAmount){
  if(!G.reflectRate||dmgAmount<=0)return;
  const rd=dmgAmount*G.reflectRate;
  G.enemies.forEach(en=>{
    if(Math.hypot(en.x-G.mx,en.y-G.my)<80){en.hp-=rd/(en.defMult||1);addPt(G,en.x,en.y,'#ff6644',1,1);}
  });
  if(G.boss&&Math.hypot(G.boss.x-G.mx,G.boss.y-G.my)<80){G.boss.hp-=rd;addPt(G,G.boss.x,G.boss.y,'#ff6644',2,1.5);}
}

// ── Boss受伤统一处理 ──
function applyBossDamage(G, boss, rawDmg){
  if(boss.invincible)return 0;
  let dmg = rawDmg;
  if(boss.shield&&boss.onDamage){dmg = boss.onDamage(G, boss, dmg) ?? dmg;if(dmg===0)return 0;}
  if(boss.key==='has_treasure'&&boss.treasures&&boss.treasures.length>0){dmg=Math.min(dmg,50);}
  if(boss.key==='has_backing'&&boss._hasBackup){dmg*=0.5;}
  if(boss.key==='rich_armor'&&boss.onDamage){dmg = boss.onDamage(G, boss, dmg) ?? dmg;}
  if(boss.dmgMult&&boss.key==='dominator'){dmg*=boss.dmgMult(G);}
  if(boss.dmgMult&&boss.key==='tyrant'){dmg*=boss.dmgMult(G,boss);}
  if(boss.onDamage&&boss.key==='vlogger'){boss.onDamage(G,boss,dmg);}
  if(boss.onDamage&&boss.key==='old_teeth'){boss.onDamage(G,boss,dmg);}
  if(boss.onDamage&&boss.key==='dainty'){dmg = boss.onDamage(G,boss,dmg) ?? dmg;}
  boss.hp -= dmg;
  // 大伤害burst粒子（>100）
  if(dmg>100){for(let i=0;i<10;i++){const a=Math.random()*Math.PI*2;addPt(G,boss.x+Math.cos(a)*boss.sz/2,boss.y+Math.sin(a)*boss.sz/2,'#ffaa00',1,2.5+Math.random()*3);}}
  return dmg;
}

// ── 危险区域 ──
function updateDangerZones(G){
  G.dangerZones=G.dangerZones||[];
  G.dangerCircles=G.dangerCircles||[];
  const sec=Math.floor(G.elapsed/FPS);
  if(sec>=180&&G.elapsed%300===0&&G.dangerZones.length<3){
    const types=['plasma','spore','corrosion'];
    const t=types[Math.floor(Math.random()*types.length)];
    const x=60+Math.random()*(W-120),y=60+Math.random()*(H-120);
    G.dangerZones.push({x,y,r:45+Math.random()*30,type:t,life:600+Math.random()*300,warn:60,active:false});
    playSound('danger');
  }
  G.dangerZones.forEach(z=>{
    if(z.warn>0){z.warn--;return;}
    z.active=true;z.life--;
    const dx=G.mx-z.x,dy=G.my-z.y;
    const inZone=dx*dx+dy*dy<z.r*z.r;
    if(inZone){
      switch(z.type){
        case'plasma':applyPlayerDamage(G,0.035);if(G.elapsed%20===0)addPt(G,G.mx,G.my,'#7aadff',3,1.5);break;
        case'spore':if(G.elapsed%40===0){applyPlayerDamage(G,0.025);addPt(G,G.mx,G.my,'#7fff44',2,1);}break;
        case'corrosion':applyPlayerDamage(G,0.04);break;
      }
    }
    if(z.type==='spore'&&z.active&&G.elapsed%90===0){
      spawnEnemyAt(G,'normal',z.x+(Math.random()-0.5)*z.r,z.y+(Math.random()-0.5)*z.r,'late');
    }
  });
  G.dangerZones=G.dangerZones.filter(z=>z.life>0);
  G.dangerCircles.forEach(c=>c.life--);
  G.dangerCircles=G.dangerCircles.filter(c=>c.life>0);
  const hasPlasma=G.dangerZones.some(z=>z.type==='plasma'&&z.active);
  const hasSpore=G.dangerZones.some(z=>z.type==='spore'&&z.active);
  const hasCorr=G.dangerZones.some(z=>z.type==='corrosion'&&z.active);
  const hasMycel=false;
  document.getElementById('di-plasma').classList.toggle('show',hasPlasma);
  document.getElementById('di-spore').classList.toggle('show',hasSpore);
  document.getElementById('di-hatch').classList.toggle('show',hasCorr);
  document.getElementById('di-mycel').classList.toggle('show',hasMycel);
}

// ── 闪避系统（提取自_update）──
function updateDodge(G){
  if(G.dodgeFrames>0){
    G.dodgeCd++;
    if(G.dodgeCd>=G.dodgeFrames){G.dodgeCd=0;G.dodgeTimer=30;showBuffToast('⚡ 道心闪避·无敌0.5秒','#4488CC');}
  }
  if(G.dodgeTimer>0)G.dodgeTimer--;
}

// ── 护盾回复（提取自_update）──
function updateShieldRegen(G){
  if(G.shieldBase>0&&G.elapsed%1800===0&&G.shieldHp<G.shieldBase){
    G.shieldHp=Math.min(G.shieldBase,G.shieldHp+G.shieldBase*0.2);
  }
}

// ── 投射物更新（提取自_update）──
function updateProjectiles(G){
  const dp=[];
  G.projs.forEach((p,i)=>{
    p.age++;
    if(p.homing&&p.homing.hp>0){const dx=p.homing.x-p.x,dy=p.homing.y-p.y,d=Math.hypot(dx,dy)||1;p.vx=p.vx*0.88+(dx/d)*6*0.12;p.vy=p.vy*0.88+(dy/d)*6*0.12;}
    p.x+=p.vx;p.y+=p.vy;p.life--;
    if(p.life<=0||p.x<-10||p.x>W+10||p.y<-10||p.y>H+10){dp.push(i);recycleProj(p);return;}
    if(p.isBossBullet||p.isEnemyBullet){
      G.bugs.forEach(b=>{if(Math.hypot(b.x-p.x,b.y-p.y)<8){b.hp-=p.dmg*0.4;}});
      if(!p._hitPlayer&&Math.hypot(G.mx-p.x,G.my-p.y)<14){p._hitPlayer=true;const ebDmg=p.dmg*0.5;applyPlayerDamage(G,ebDmg);applyReflect(G,ebDmg);G.noDmgTimer=0;screenShake(5);triggerFlash();playSound('hurt');addDamageText(G,G.mx+(Math.random()-0.5)*12,G.my-14,'-'+Math.ceil(ebDmg),'#ff3333',15);dp.push(i);recycleProj(p);}
      return;
    }
    if(p.isBugShot){
      let bsHit=false;
      const bsCheck=(e)=>{
        if(bsHit)return;
        const ddx=e.x-p.x,ddy=e.y-p.y;
        const ccr=e.sz/2+p.r+2;
        if(Math.abs(ddx)>ccr||Math.abs(ddy)>ccr)return;
        if(ddx*ddx+ddy*ddy<ccr*ccr){
          bsHit=true;
          const actualDmg=p.dmg/(e.defMult||1)/(e.shield>0?3:1);
          let bsFinalDmg=actualDmg+(G.buffs.dmgFlat||0);
          if(G.critRate>0&&Math.random()<G.critRate){bsFinalDmg*=2;}
          if(e===G.boss){bsFinalDmg=applyBossDamage(G,G.boss,bsFinalDmg);}
          else{e.hp-=bsFinalDmg;}
          if(bsFinalDmg>0){e._hitShake=(e._hitShake||0)+4;}
          if(bsFinalDmg>0&&e.key==='berserker') e._hitCount=(e._hitCount||0)+1;
          if(p.poison&&!e.immuneDot){e.poison=Math.max(e.poison||0,p.poison);}
          addDamageText(G,e.x+(Math.random()-0.5)*10,e.y-4,Math.ceil(bsFinalDmg)+'','#88ddaa',13);
          addPt(G,e.x,e.y,'#9FE1CB',1,1);
          dp.push(i);recycleProj(p);
        }
      };
      G.enemies.forEach(bsCheck);
      if(!bsHit&&G.boss)bsCheck(G.boss);
      return;
    }
    let hit=false;
    const check=(e)=>{
      p._pierced=(p._pierced||0);
      const totalPierce=(p.pierce?99:0)+(G.pierceCount||0);
      if(hit&&p._pierced>=totalPierce)return;
      // 快速AABB预检，避免远距离hypot
      const dx2=e.x-p.x,dy2=e.y-p.y;
      const cr=e.sz/2+p.r+2;
      if(Math.abs(dx2)>cr||Math.abs(dy2)>cr)return;
      if(dx2*dx2+dy2*dy2<cr*cr){
        const shieldDiv=e.shield>0?3:1;
        const bubbleDiv=e.shieldBubble>0?1.5:1;
        const actualDmg=p.dmg/(e.defMult||1)/shieldDiv/bubbleDiv;
        let finalDmg=actualDmg+(G.buffs.dmgFlat||0);
        if(G.critRate>0&&Math.random()<G.critRate){finalDmg*=2;addDamageText(G,e.x+(Math.random()-0.5)*10,e.y-16,'暴击!','#ffcc00',18);}
        if(e===G.boss){finalDmg=applyBossDamage(G,G.boss,finalDmg);}
        else{e.hp-=finalDmg;}
        if(finalDmg>0){e._hitShake=(e._hitShake||0)+6;}
        if(finalDmg>0&&e.key==='berserker') e._hitCount=(e._hitCount||0)+1;
        if(G.comboHit>0){e._comboHitCnt=(e._comboHitCnt||0)+1;if(e._comboHitCnt>=3){e._comboHitCnt=0;for(let ci=0;ci<G.comboHit;ci++){e.hp-=(p.dmg*0.5)/(e.defMult||1);addDamageText(G,e.x+(Math.random()-0.5)*10,e.y-8,'连击!','#ff8800',14);}playSound('hit');}}
        if(e._invincible2){hit=true;p._pierced++;addPt(G,e.x,e.y,'#aaaacc',2,1);if(p._pierced>totalPierce){dp.push(i);recycleProj(p);}return;}
        if(e.shield>0&&!p.poison){e.shield=Math.max(0,e.shield-0.3);addPt(G,e.x,e.y,'#4488CC',3,1.5);hit=true;p._pierced++;if(p._pierced>totalPierce){dp.push(i);recycleProj(p);}return;}
        hit=true;
        const isBig=actualDmg>=10,isMed=actualDmg>=5;
        addDamageText(G,e.x+(Math.random()-0.5)*12,e.y-4,Math.ceil(actualDmg)+'',isBig?'#ff2200':isMed?'#ff7700':'#ffcc44',isBig?26:isMed?20:15);
        if(isBig)screenShake(3);
        if(p.poison&&!e.immuneDot){G.slimePools.push({x:p.x,y:p.y,r:18,life:220});e.poison=Math.max(e.poison||0,p.poison);}
        if(p.slowOnHit)e.slowTimer=Math.max(e.slowTimer||0,180);
        if(p.sporeInfect&&!e.immuneDot){
          e.poison=Math.max(e.poison||0,120);
          G.enemies.forEach(e2=>{if(e2!==e&&!e2.immuneDot&&Math.hypot(e2.x-e.x,e2.y-e.y)<45){e2.poison=Math.max(e2.poison||0,60);}});
        }
        if(p.overload){e.overloadStacks=(e.overloadStacks||0)+1;if(e.overloadStacks>=3){e.overloadStacks=0;addExplosionWave(G,e.x,e.y,40,'#7aadff');G.enemies.forEach(e2=>{if(Math.hypot(e2.x-e.x,e2.y-e.y)<40)e2.hp-=p.dmg*2;});addPt(G,e.x,e.y,'#7aadff',12,3);}}
        if(p.splash)[...G.enemies,G.boss].filter(Boolean).forEach(e2=>{if(e2!==e&&Math.hypot(e2.x-p.x,e2.y-p.y)<p.splash)e2.hp-=p.dmg*0.5/(e2.defMult||1);});
        else if(G.splashR>0)[...G.enemies,G.boss].filter(Boolean).forEach(e2=>{if(e2!==e&&Math.hypot(e2.x-e.x,e2.y-e.y)<G.splashR)e2.hp-=p.dmg*0.6/(e2.defMult||1);});
        if(p.chain&&p.chain>0){
          const chainTargets=G.enemies.filter(c=>c!==e&&c.hp>0&&Math.hypot(c.x-e.x,c.y-e.y)<(p.chainR||55));
          if(chainTargets.length>0){
            const ct=chainTargets[0];const ang2=Math.atan2(ct.y-e.y,ct.x-e.x);
            addProj(G,e.x,e.y,Math.cos(ang2)*7,Math.sin(ang2)*7,{dmg:p.dmg*0.7,r:p.r,color:p.color,life:40,chain:p.chain-1,chainR:p.chainR,isLightning:p.isLightning,slowOnHit:p.slowOnHit,overload:p.overload});
            addArc(G,ct.x,ct.y,0);
          }
        }
        if(p.isSoulBullet){
          const burstDmg=p.soulBurstDmg||p.dmg*0.4;
          for(let si=0;si<8;si++){
            const sa=si/8*Math.PI*2;const ss=3+Math.random()*2;
            addProj(G,p.x,p.y,Math.cos(sa)*ss,Math.sin(sa)*ss,{dmg:burstDmg,r:2,color:'#ffdd44',life:25});
          }
          addExplosionWave(G,p.x,p.y,30,'#ffdd88');
        }
        if(p.isFrost&&p.freeze>0){e.freezeTimer=Math.max(e.freezeTimer||0,p.freeze);e.slowTimer=Math.max(e.slowTimer||0,p.freeze+60);addPt(G,e.x,e.y,'#88CCFF',6,2);}
        p._pierced++;if(p._pierced>totalPierce){dp.push(i);recycleProj(p);}
      }
    };
    G.enemies.forEach(check);
    if(G.boss)check(G.boss);
  });
  for(let i=dp.length-1;i>=0;i--)G.projs.splice(dp[i],1);
}

// ── 视角/运动模式 ──
function clamp(val,min,max){return Math.max(min,Math.min(max,val));}
function applyViewMode(G){
  switch(G.viewMode){
    case'free':
      G.bounds=null;break;
    case'vertical':
      G.bounds={left:W*0.25,right:W*0.75,top:null,bottom:null};
      G.mx=clamp(G.mx,W*0.25+12,W*0.75-12);break;
    case'arena':
      G.bounds={left:0,right:W,top:0,bottom:H};
      G.mx=clamp(G.mx,12,W-12);G.my=clamp(G.my,12,H-12);break;
  }
}
