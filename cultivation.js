// ══════════════════════════════════════════
// 道劫：万法失控 — 修炼/灵河系统 (cultivation.js)
// 河流动画 · 点击暴击 · 品质光柱 · 掉落弹窗
// ══════════════════════════════════════════

let riverCanvas, riverCtx, riverAnim = null;
let riverPillars = [];        // 品质光柱
let riverRipples = [];        // 点击涟漪
let riverParticles = [];      // 掉落粒子
let riverDropItem = null;     // 当前掉落物品
let riverDropType = null;     // 'equip' | 'weapon' | 'gold' | 'stones'
let isRiverAnimating = false;
let riverClickCd = 0;         // 点击冷却

// ── 灵河 Canvas 初始化 ──
function initRiverCanvas() {
  riverCanvas = document.getElementById('river-canvas');
  if (!riverCanvas) return;
  riverCtx = riverCanvas.getContext('2d');
  resizeRiverCanvas();
  window.addEventListener('resize', resizeRiverCanvas);
  riverCanvas.addEventListener('click', onRiverClick);
  riverCanvas.addEventListener('touchend', e => { e.preventDefault(); onRiverClick(e); });
  startRiverAnimation();
}

function resizeRiverCanvas() {
  if (!riverCanvas) return;
  const rect = riverCanvas.parentElement.getBoundingClientRect();
  riverCanvas.width = rect.width;
  riverCanvas.height = rect.height;
}

// ── 河流动画循环 (30fps) ──
function startRiverAnimation() {
  if (riverAnim) return;
  isRiverAnimating = true;
  let lastTime = 0;
  function loop(ts) {
    if (!isRiverAnimating) { riverAnim = null; return; }
    if (ts - lastTime >= 33) { // ~30fps
      lastTime = ts;
      drawRiverScene();
    }
    riverAnim = requestAnimationFrame(loop);
  }
  riverAnim = requestAnimationFrame(loop);
}

function stopRiverAnimation() {
  isRiverAnimating = false;
  if (riverAnim) { cancelAnimationFrame(riverAnim); riverAnim = null; }
}

// ── 绘制河流场景 ──
function drawRiverScene() {
  if (!riverCtx || !riverCanvas) return;
  const ctx = riverCtx, W = riverCanvas.width, H = riverCanvas.height;
  const t = Date.now() / 1000;

  // 天空渐变
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.55);
  skyGrad.addColorStop(0, '#0a0a1a');
  skyGrad.addColorStop(0.5, '#1a1a3a');
  skyGrad.addColorStop(1, '#2a1a3a');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // 星星
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 30; i++) {
    const sx = (i * 137.5 + 50) % W, sy = (i * 89.3 + 30) % (H * 0.45);
    const twinkle = 0.3 + 0.7 * Math.sin(t * 3 + i) * Math.cos(t * 2 + i * 0.7);
    ctx.globalAlpha = twinkle * 0.8;
    ctx.beginPath(); ctx.arc(sx, sy, 0.8 + twinkle * 0.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 远山
  ctx.fillStyle = '#0d0d20';
  ctx.beginPath(); ctx.moveTo(0, H * 0.5);
  for (let x = 0; x <= W; x += 20) {
    ctx.lineTo(x, H * 0.48 + Math.sin(x * 0.008 + 1.5) * 25 + Math.sin(x * 0.02) * 12);
  }
  ctx.lineTo(W, H * 0.55); ctx.lineTo(0, H * 0.55); ctx.fill();

  // 河面
  const riverTop = H * 0.55;
  const riverGrad = ctx.createLinearGradient(0, riverTop, 0, H);
  riverGrad.addColorStop(0, '#0a1a3a');
  riverGrad.addColorStop(0.3, '#0d2040');
  riverGrad.addColorStop(0.6, '#0a1840');
  riverGrad.addColorStop(1, '#060d28');
  ctx.fillStyle = riverGrad;
  ctx.fillRect(0, riverTop, W, H - riverTop);

  // 水面波纹
  for (let i = 0; i < 8; i++) {
    const wy = riverTop + 20 + i * (H - riverTop) / 8;
    ctx.strokeStyle = `rgba(80,140,220,${0.06 + i * 0.02})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 4) {
      const y = wy + Math.sin(x * 0.015 + t * 1.2 + i * 0.8) * 5 + Math.sin(x * 0.03 + t * 0.7) * 3;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // 河面光泽
  for (let i = 0; i < 5; i++) {
    const gx = (t * 20 + i * W * 0.25) % (W + 100) - 50;
    const glowGrad = ctx.createRadialGradient(gx, riverTop + 20, 0, gx, riverTop + 20, 60 + i * 20);
    glowGrad.addColorStop(0, `rgba(100,180,255,${0.04 - i * 0.006})`);
    glowGrad.addColorStop(1, 'rgba(100,180,255,0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(gx - 80, riverTop, 160, 120);
  }

  // 涟漪
  riverRipples = riverRipples.filter(r => { r.life--; return r.life > 0; });
  riverRipples.forEach(r => {
    r.r += 1.2;
    const alpha = r.life / r.maxLife;
    ctx.strokeStyle = `rgba(150,200,255,${alpha * 0.6})`;
    ctx.lineWidth = 2 * alpha;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
  });

  // 品质光柱
  riverPillars = riverPillars.filter(p => { p.life--; return p.life > 0; });
  riverPillars.forEach(p => {
    const progress = 1 - p.life / p.maxLife;
    const alpha = progress < 0.3 ? progress / 0.3 : progress > 0.7 ? (1 - progress) / 0.3 : 1;
    const w = p.width * (0.5 + 0.5 * Math.min(1, progress * 2));
    // 光柱主体
    const pillarGrad = ctx.createLinearGradient(0, 0, 0, p.y);
    pillarGrad.addColorStop(0, p.color.replace(')', `,${alpha * 0.1})`).replace('rgb', 'rgba'));
    pillarGrad.addColorStop(0.6, p.color.replace(')', `,${alpha * 0.8})`).replace('rgb', 'rgba'));
    pillarGrad.addColorStop(1, p.color.replace(')', ',0)').replace('rgb', 'rgba'));
    ctx.fillStyle = pillarGrad;
    ctx.fillRect(p.x - w / 2, 0, w, p.y);
    // 光晕
    const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, w * 2);
    glowGrad.addColorStop(0, p.color.replace(')', `,${alpha * 0.9})`).replace('rgb', 'rgba'));
    glowGrad.addColorStop(1, p.color.replace(')', ',0)').replace('rgb', 'rgba'));
    ctx.fillStyle = glowGrad;
    ctx.fillRect(p.x - w * 3, p.y - w * 3, w * 6, w * 6);
  });

  // 掉落粒子
  riverParticles = riverParticles.filter(pt => { pt.life -= 0.03; return pt.life > 0; });
  riverParticles.forEach(pt => {
    pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.1;
    ctx.fillStyle = `rgba(${pt.r},${pt.g},${pt.b},${pt.life})`;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.rSize * pt.life, 0, Math.PI * 2); ctx.fill();
  });

  // 河面文字提示
  const hintEl = document.getElementById('river-hint');
  if (hintEl && riverClickCd <= 0) {
    hintEl.style.opacity = (0.5 + 0.5 * Math.sin(t * 1.5)).toString();
  }
}

// ── 点击灵河 ──
function onRiverClick(e) {
  if (riverClickCd > 0) return;
  if (document.getElementById('drop-popup')?.classList.contains('show')) return;

  const rect = riverCanvas.getBoundingClientRect();
  const x = (e.clientX || (e.touches && e.touches[0]?.clientX) || e.changedTouches?.[0]?.clientX) - rect.left;
  const y = (e.clientY || (e.touches && e.touches[0]?.clientY) || e.changedTouches?.[0]?.clientY) - rect.top;

  // 只响应河面点击 (下方55%)
  if (y < riverCanvas.height * 0.55) return;

  riverClickCd = 30; // 0.5秒冷却
  const count = addCultivationCount();
  if (typeof updateTopBar === 'function') updateTopBar();

  // 涟漪
  riverRipples.push({ x, y, r: 5, life: 40, maxLife: 40 });

  // 1/10 超时空暴击
  const isUltraCrit = Math.random() < 0.1;
  if (isUltraCrit) {
    handleUltraCrit(x, y);
  } else {
    handleNormalCrit(x, y);
  }

  // 播放音效
  if (typeof playSound === 'function') {
    playSound(isUltraCrit ? 'ultra' : 'water_click');
  }
}

// ── 超时空暴击 ──
function handleUltraCrit(x, y) {
  const quality = rollRiverQuality();
  const item = generateEquipment('weapon', quality);

  if (typeof screenShake === 'function') screenShake(12);
  spawnQualityPillar(quality, x, y);
  spawnRiverParticles(x, y, quality, 40);
  showDropPopup(item, 'weapon');
}

// ── 普通暴击 ──
function handleNormalCrit(x, y) {
  const quality = rollRiverQuality();
  const roll = Math.random();
  let dropType, item;

  if (roll < 0.5) {
    // 50% 防具
    const slots = ['helmet', 'armor', 'pants', 'shoes', 'gloves'];
    const slot = slots[Math.floor(Math.random() * slots.length)];
    item = generateEquipment(slot, quality);
    dropType = 'equip';
  } else if (roll < 0.6) {
    // 10% 灵石
    dropType = 'stones';
    const amount = 1 + Math.floor(Math.random() * 5) + QUALITY_DEFS.findIndex(q => q.id === quality) * 2;
    item = { name: '灵石', icon: '💎', quality, amount };
  } else {
    // 40% 金币
    dropType = 'gold';
    const amount = 5 + Math.floor(Math.random() * 20) + QUALITY_DEFS.findIndex(q => q.id === quality) * 10;
    item = { name: '金币', icon: '🪙', quality, amount };
  }

  spawnQualityPillar(quality, x, y);
  spawnRiverParticles(x, y, quality, 20);
  showDropPopup(item, dropType);
}

// ── 品质光柱 ──
function spawnQualityPillar(quality, x, y) {
  const colors = {
    white:  'rgb(200,200,200)',
    green:  'rgb(74,224,144)',
    blue:   'rgb(90,175,255)',
    purple: 'rgb(204,85,255)',
    gold:   'rgb(239,159,39)',
    red:    'rgb(255,51,34)',
  };
  const widths = { white: 6, green: 10, blue: 14, purple: 18, gold: 22, red: 28 };
  riverPillars.push({
    x, y,
    color: colors[quality] || colors.white,
    width: widths[quality] || 6,
    life: 60, maxLife: 60, // 1秒 @30fps
  });
}

// ── 掉落粒子 ──
function spawnRiverParticles(x, y, quality, count) {
  const colorMap = {
    white:  [200,200,200], green: [74,224,144], blue: [90,175,255],
    purple: [204,85,255],  gold: [239,159,39],  red: [255,51,34],
  };
  const [r, g, b] = colorMap[quality] || colorMap.white;
  for (let i = 0; i < count; i++) {
    riverParticles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6 - 2,
      r, g, b,
      rSize: 2 + Math.random() * 4,
      life: 0.6 + Math.random() * 0.4,
    });
  }
}

// ── 掉落弹窗 ──
function showDropPopup(item, dropType) {
  riverDropItem = item;
  riverDropType = dropType;

  const popup = document.getElementById('drop-popup');
  if (!popup) return;

  const qDef = QUALITY_DEFS.find(q => q.id === item.quality) || QUALITY_DEFS[0];
  const qColor = qDef ? qDef.color : '#ccc';

  let iconHtml, nameHtml, statsHtml;
  if (dropType === 'gold' || dropType === 'stones') {
    iconHtml = `<span style="font-size:40px">${item.icon}</span>`;
    nameHtml = `<span style="color:${qColor}">${item.name} ×${item.amount}</span>`;
    statsHtml = '';
  } else {
    iconHtml = `<span style="font-size:40px">${item.icon}</span>`;
    nameHtml = `<span style="color:${qColor};font-weight:700">${item.name}</span>`;
    const s = item.stats;
    const parts = [];
    if (s.atk > 0) parts.push(`+${s.atk}攻击`);
    if (s.def > 0) parts.push(`+${s.def}防御`);
    if (s.hp > 0) parts.push(`+${s.hp}生命`);
    if (s.critRate > 0) parts.push(`+${Math.round(s.critRate * 100)}%暴击率`);
    if (s.critDmg > 0) parts.push(`+${Math.round(s.critDmg * 100)}%爆伤`);
    if (s.speed > 0) parts.push(`+${Math.round(s.speed * 100)}%移速`);
    statsHtml = parts.join(' · ');
  }

  const currentEquip = (dropType === 'equip' || dropType === 'weapon') ? getEquippedItem(item.slot) : null;
  const isBetter = currentEquip ? calcItemScore(item) > calcItemScore(currentEquip) : true;

  popup.innerHTML = `
    <div class="drop-popup-bg"></div>
    <div class="drop-popup-card" style="border-color:${qColor}">
      <div class="drop-popup-quality" style="color:${qColor}">${qDef.name}</div>
      <div class="drop-popup-icon">${iconHtml}</div>
      <div class="drop-popup-name">${nameHtml}</div>
      <div class="drop-popup-stats">${statsHtml}</div>
      <div class="drop-popup-btns">
        <button class="drop-btn auto-equip ${isBetter ? 'primary' : ''}" onclick="onDropEquip()">
          ${isBetter ? '⚡ 自动最优装备' : '⚔ 装备（替换当前）'}
        </button>
        <button class="drop-btn vault" onclick="onDropVault()">📦 收入仓库</button>
      </div>
    </div>
  `;
  popup.classList.add('show');
}

function hideDropPopup() {
  const popup = document.getElementById('drop-popup');
  if (popup) popup.classList.remove('show');
  riverDropItem = null;
  riverDropType = null;
}

function onDropEquip() {
  if (!riverDropItem) return;
  if (riverDropType === 'gold') {
    addGold(riverDropItem.amount);
  } else if (riverDropType === 'stones') {
    addStones(riverDropItem.amount);
  } else {
    const result = compareAndAutoEquip(riverDropItem);
    if (typeof showBuffToast === 'function') {
      showBuffToast(result.action === 'replace' ? `⚡ 装备替换: ${riverDropItem.name}` : `✅ 装备: ${riverDropItem.name}`, '#ffcc00');
    }
  }
  hideDropPopup();
  if (typeof renderEquipBar === 'function') renderEquipBar();
  if (typeof updateTopBar === 'function') updateTopBar();
}

function onDropVault() {
  if (!riverDropItem) return;
  if (riverDropType === 'gold') {
    addGold(riverDropItem.amount);
  } else if (riverDropType === 'stones') {
    addStones(riverDropItem.amount);
  } else {
    addToEqVault(riverDropItem);
    if (typeof showBuffToast === 'function') {
      showBuffToast(`📦 ${riverDropItem.name} 已入库`, '#aaa');
    }
  }
  hideDropPopup();
  if (typeof updateTopBar === 'function') updateTopBar();
}

// ── 修炼页冷却 ──
function updateRiverCooldown() {
  if (riverClickCd > 0) riverClickCd--;
  if (riverClickCd === 0) {
    const hint = document.getElementById('river-hint');
    if (hint) hint.style.opacity = '1';
  }
}

// ── 全局帧更新 (在 game.js update 或独立 setInterval 中调用) ──
function updateCultivationFrame() {
  updateRiverCooldown();
}
