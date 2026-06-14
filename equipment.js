// ══════════════════════════════════════════
// 道劫：万法失控 — 装备系统 (equipment.js)
// 8槽装备 · 生成/存取 · 自动装备 · 战力计算
// ══════════════════════════════════════════

// ── 装备槽定义 ──
const EQUIP_SLOTS = [
  {key:'weapon',  name:'武器', icon:'⚔', dropSource:'ultra_crit'},
  {key:'helmet',  name:'帽子', icon:'🎩', dropSource:'river'},
  {key:'armor',   name:'衣服', icon:'👕', dropSource:'river'},
  {key:'pants',   name:'裤子', icon:'👖', dropSource:'river'},
  {key:'shoes',   name:'鞋靴', icon:'👟', dropSource:'river'},
  {key:'gloves',  name:'手套', icon:'🧤', dropSource:'river'},
  {key:'treasure',name:'法宝', icon:'🏺', dropSource:'boss'},
  {key:'bug',     name:'灵虫', icon:'🐛', dropSource:'battle'},
];

// ── 武器名称表 (按品质) ──
const WEAPON_NAMES = {
  white:  ['菜刀','小刀','柴刀','锈刃','钝刀'],
  green:  ['砍刀','猎刀','短刀','锋刃','快刀'],
  blue:   ['九环大刀','斩马刀','虎头刀','青龙刀','寒月刃'],
  purple: ['屠龙战刀','破天刃','碎星刃','裂空刀','灭世刃'],
  gold:   ['量子刃','光子切割刃','暗物质刃','虚空之刃','超新星'],
  red:    ['混沌裂天斩','万劫不灭斩','太初开天刃','鸿蒙辟地斩','大道归宗刃'],
};

// ── 防具名称表 (按品质) ──
const ARMOR_NAMES = {
  white:  ['粗布', '麻布', '旧', '破损', '简陋'],
  green:  ['棉', '皮革', '结实', '坚韧', '厚实'],
  blue:   ['精铁', '锁子', '玄铁', '灵纹', '寒铁'],
  purple: ['秘银', '暗金', '龙鳞', '凤羽', '星辰'],
  gold:   ['量子', '纳米', '暗物质', '虚空', '超新星'],
  red:    ['混沌', '万劫不灭', '太初', '鸿蒙', '大道归宗'],
};

const ARMOR_SLOT_SUFFIX = {
  helmet: ['头巾','冠','盔','头盔','战盔'],
  armor:  ['布衣','甲','铠','战甲','神甲'],
  pants:  ['裤','护腿','腿甲','战裤','神裤'],
  shoes:  ['草鞋','靴','战靴','神行靴','虚空靴'],
  gloves: ['护手','手套','铁掌','战拳','神掌'],
};

// ── 品质对应属性范围 ──
const QUALITY_STAT_RANGES = {
  white:  { atk:[1,4],    def:[0,2],   hp:[2,8],    critRate:[0,0.01], critDmg:[0,0.02] },
  green:  { atk:[3,8],    def:[1,4],   hp:[5,15],   critRate:[0,0.02], critDmg:[0.01,0.05] },
  blue:   { atk:[6,15],   def:[3,8],   hp:[10,30],  critRate:[0.01,0.04], critDmg:[0.03,0.10] },
  purple: { atk:[12,25],  def:[6,15],  hp:[20,50],  critRate:[0.02,0.07], critDmg:[0.05,0.18] },
  gold:   { atk:[20,40],  def:[12,25], hp:[35,80],  critRate:[0.04,0.10], critDmg:[0.08,0.28] },
  red:    { atk:[30,60],  def:[20,40], hp:[50,120], critRate:[0.06,0.15], critDmg:[0.12,0.40] },
};

// ── 生成装备 ──
function rollStat(min, max) { return Math.round((min + Math.random() * (max - min)) * 100) / 100; }

function generateEquipment(slot, quality) {
  const slotDef = EQUIP_SLOTS.find(s => s.key === slot) || EQUIP_SLOTS[0];
  const ranges = QUALITY_STAT_RANGES[quality] || QUALITY_STAT_RANGES.white;

  // 生成名称
  let name;
  if (slot === 'weapon') {
    const pool = WEAPON_NAMES[quality] || WEAPON_NAMES.white;
    name = pool[Math.floor(Math.random() * pool.length)];
  } else if (slot === 'treasure') {
    // 法宝用现有 TREASURE_POOL
    const t = TREASURE_POOL[Math.floor(Math.random() * TREASURE_POOL.length)];
    name = t.name;
  } else if (slot === 'bug') {
    name = QUALITY_DEFS.find(q => q.id === quality)?.name + '灵虫' || '灵虫';
  } else {
    // 防具: 品质前缀 + 部位后缀
    const prePool = ARMOR_NAMES[quality] || ARMOR_NAMES.white;
    const prefix = prePool[Math.floor(Math.random() * prePool.length)];
    const suffixPool = ARMOR_SLOT_SUFFIX[slot] || ['装备'];
    const suffix = suffixPool[Math.min(Math.floor(Math.random() * suffixPool.length), quality === 'white' ? 0 : quality === 'green' ? 1 : quality === 'blue' ? 2 : quality === 'purple' ? 3 : 4)];
    name = prefix + suffix;
  }

  const icon = slotDef.icon;
  const stats = {
    atk: slot === 'weapon' ? rollStat(ranges.atk[0] * 1.5, ranges.atk[1] * 1.5) : (slot === 'gloves' ? rollStat(ranges.atk[0] * 0.5, ranges.atk[1] * 0.5) : rollStat(ranges.atk[0] * 0.2, ranges.atk[1] * 0.2)),
    def: (slot === 'armor' ? rollStat(ranges.def[0] * 1.5, ranges.def[1] * 1.5) : (slot === 'helmet' || slot === 'pants' ? rollStat(ranges.def[0], ranges.def[1]) : rollStat(ranges.def[0] * 0.3, ranges.def[1] * 0.3))),
    hp: (slot === 'armor' || slot === 'pants' ? rollStat(ranges.hp[0] * 1.5, ranges.hp[1] * 1.5) : rollStat(ranges.hp[0], ranges.hp[1])),
    critRate: (slot === 'weapon' || slot === 'gloves' ? rollStat(ranges.critRate[0], ranges.critRate[1]) : rollStat(ranges.critRate[0] * 0.3, ranges.critRate[1] * 0.3)),
    critDmg: (slot === 'weapon' ? rollStat(ranges.critDmg[0], ranges.critDmg[1]) : rollStat(ranges.critDmg[0] * 0.3, ranges.critDmg[1] * 0.3)),
    speed: (slot === 'shoes' ? rollStat(0.02, 0.08 + QUALITY_DEFS.findIndex(q => q.id === quality) * 0.02) : 0),
  };

  // 法宝和灵虫使用现有系统
  const effects = [];
  if (slot === 'treasure') {
    const tDef = TREASURE_POOL.find(t => t.name === name);
    if (tDef) effects.push(...(tDef.effects || []));
  }

  return {
    id: 'eq_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    slot,
    name,
    quality,
    icon,
    stats,
    effects,
    date: new Date().toLocaleDateString('zh-CN'),
  };
}

// ── 装备存取 ──
function loadEquipment() {
  try { return JSON.parse(localStorage.getItem('daojie_equipment') || '{}'); } catch (e) { return {}; }
}
function saveEquipment(map) {
  try { localStorage.setItem('daojie_equipment', JSON.stringify(map)); } catch (e) {}
}

function getEquippedItem(slotKey) {
  const map = loadEquipment();
  return map[slotKey] || null;
}

function getEquippedItems() {
  const map = loadEquipment();
  const result = {};
  EQUIP_SLOTS.forEach(s => { result[s.key] = map[s.key] || null; });
  return result;
}

function equipItem(item) {
  if (!item || !item.slot) return;
  const map = loadEquipment();
  map[item.slot] = item;
  saveEquipment(map);
}

function unequipSlot(slotKey) {
  const map = loadEquipment();
  delete map[slotKey];
  saveEquipment(map);
}

// ── 装备仓库 (身体装备) ──
function getEqVault() {
  try { return JSON.parse(localStorage.getItem('daojie_eq_vault') || '[]'); } catch (e) { return []; }
}
function saveEqVault(vault) {
  try { localStorage.setItem('daojie_eq_vault', JSON.stringify(vault)); } catch (e) {}
  if (typeof updateVaultDot === 'function') updateVaultDot();
}
function addToEqVault(item) {
  const vault = getEqVault();
  vault.push(item);
  saveEqVault(vault);
}

// ── 货币 ──
function getCurrency() {
  try { return JSON.parse(localStorage.getItem('daojie_currency') || '{"gold":0,"stones":0}'); } catch (e) { return { gold: 0, stones: 0 }; }
}
function saveCurrency(c) {
  try { localStorage.setItem('daojie_currency', JSON.stringify(c)); } catch (e) {}
}
function addGold(n) { const c = getCurrency(); c.gold = (c.gold || 0) + n; saveCurrency(c); }
function addStones(n) { const c = getCurrency(); c.stones = (c.stones || 0) + n; saveCurrency(c); }

// ── 战力计算 ──
function calcCombatPower(map) {
  let power = 0;
  Object.values(map || {}).forEach(item => {
    if (!item) return;
    const s = item.stats;
    const qIdx = QUALITY_DEFS.findIndex(q => q.id === item.quality);
    power += (s.atk || 0) * 2 + (s.def || 0) * 1.5 + (s.hp || 0) * 0.5 + (s.critRate || 0) * 100 + (s.critDmg || 0) * 50 + (s.speed || 0) * 200;
    power += qIdx * 10; // 品质加成
  });
  return Math.floor(power);
}

// ── 物品综合评分 (用于自动比较) ──
function calcItemScore(item) {
  if (!item || !item.stats) return 0;
  const s = item.stats;
  const qMult = (QUALITY_DEFS.findIndex(q => q.id === item.quality) + 1);
  return (s.atk || 0) * 1.0 + (s.critRate || 0) * 50 + (s.def || 0) * 0.3 + (s.speed || 0) * 30 + qMult * 5;
}

// ── 自动装备比较 ──
function compareAndAutoEquip(newItem) {
  const current = getEquippedItem(newItem.slot);
  if (!current) {
    equipItem(newItem);
    return { action: 'equip', reason: '空槽装备' };
  }
  const newScore = calcItemScore(newItem);
  const curScore = calcItemScore(current);
  if (newScore > curScore) {
    // 旧装备入库
    addToEqVault(current);
    equipItem(newItem);
    return { action: 'replace', reason: '综合评分更优 (新:' + newScore.toFixed(1) + ' > 旧:' + curScore.toFixed(1) + ')', oldItem: current };
  }
  return { action: 'vault', reason: '当前装备更优' };
}

// ── 掉落品质随机 ──
function rollRiverQuality() {
  // 灵河暴击品质权重
  const weights = [
    { q: 'white',  w: 40 },
    { q: 'green',  w: 30 },
    { q: 'blue',   w: 18 },
    { q: 'purple', w: 8 },
    { q: 'gold',   w: 3 },
    { q: 'red',    w: 1 },
  ];
  const total = weights.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const w of weights) { r -= w.w; if (r <= 0) return w.q; }
  return 'white';
}

function rollBossQuality() {
  // Boss掉落品质偏高
  const weights = [
    { q: 'green',  w: 20 },
    { q: 'blue',   w: 30 },
    { q: 'purple', w: 28 },
    { q: 'gold',   w: 15 },
    { q: 'red',    w: 7 },
  ];
  const total = weights.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const w of weights) { r -= w.w; if (r <= 0) return w.q; }
  return 'green';
}

// ── 修炼次数 (用于升级) ──
function getCultivationCount() {
  const p = typeof getProgress === 'function' ? getProgress() : {};
  return p.cultivationCount || 0;
}
function addCultivationCount() {
  if (typeof getProgress !== 'function' || typeof saveProgress !== 'function') return 0;
  const p = getProgress();
  p.cultivationCount = (p.cultivationCount || 0) + 1;
  saveProgress(p);
  return p.cultivationCount;
}
