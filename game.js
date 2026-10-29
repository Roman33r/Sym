// Shared game logic: used by the server and loaded by the browser for definitions.
const W = 120, H = 84;
// needs: r = road nearby, p = power, w = water, t = forest within 2, k = rock within 2, l = lake adjacent
const B = {
  path:    { cost: { money: 1 }, label: 'Тропинка (грузы идут вдвое медленнее)', icon: 'path' },
  cobble:  { cost: { money: 3, stone: 2 }, tech: 'architecture', label: 'Брусчатка (содержание — камень)', icon: 'cobble' },
  road:    { cost: { money: 5, asphalt: 1 }, tech: 'refining', label: 'Асфальтовая дорога (содержание — нефть)', icon: '' },
  power:   { cost: { money: 5, wood: 1 }, tech: 'electricity', label: 'ЛЭП', icon: '' },
  pipe:    { cost: { money: 5, stone: 1 }, tech: 'plumbing', label: 'Водопровод', icon: '' },
  // zones: cheap lots that develop on their own into res/off/ind once needs are met and there is demand
  zres:    { cost: { money: 10 }, needs: 'rpw', zone: 'res', label: 'Жилая зона', icon: 'zres' },
  zoff:    { cost: { money: 10 }, needs: 'rpw', zone: 'off', tech: 'business', label: 'Офисная зона', icon: 'zoff' },
  zind:    { cost: { money: 10 }, needs: 'rp', zone: 'ind', tech: 'industry', label: 'Промзона', icon: 'zind' },
  res:     { cost: { money: 10 }, needs: 'rpw', grown: true, home: true, label: 'Жилой дом', icon: '' }, // capacity: HOME_TIERS
  off:     { cost: { money: 10 }, needs: 'rpw', grown: true, jobs: 6, prod: { money: 4 }, label: 'Офис', icon: '' },
  ind:     { cost: { money: 10 }, needs: 'rp', grown: true, jobs: 8, label: 'Завод', icon: '' }, // makes a product, see PRODUCTS
  house:   { cost: { money: 50, wood: 10 }, needs: 'rpw', tech: 'crafts', home: true, label: 'Дом (ступени по эпохам)', icon: 'house' },
  improve: { cost: {}, label: 'Улучшить дома', icon: 'upgrade' }, // tool: raises homes to the era's tier
  farm:    { cost: { money: 40, wood: 5 }, needs: 'rw', jobs: 4, prod: { food: 5 }, label: 'Ферма (еда)', icon: 'farm' },
  sawmill: { cost: { money: 60 }, needs: 'rpt', jobs: 4, prod: { wood: 2 }, label: 'Лесопилка (дерево)', icon: 'sawmill' },
  quarry:  { cost: { money: 80, wood: 10 }, needs: 'rpk', jobs: 4, prod: { stone: 1.5 }, label: 'Каменоломня (камень)', icon: 'quarry' },
  plant:   { cost: { money: 200, stone: 20 }, needs: 'r', tech: 'electricity', upkeep: 3, label: 'Электростанция', icon: 'plant' },
  pump:    { cost: { money: 150, stone: 10 }, needs: 'rpl', tech: 'plumbing', upkeep: 2, label: 'Водокачка (у озера)', icon: 'pump' },
  shop:    { cost: { money: 100, wood: 10, stone: 10 }, needs: 'rpw', tech: 'architecture', jobs: 6, prod: { money: 1 }, label: 'Магазин (продаёт товары)', icon: 'shop' },
  park:    { cost: { money: 30 }, tech: 'ecology', label: 'Парк (радует жителей)', icon: 'park' },
  stop:    { cost: { money: 40 }, needs: 'r', tech: 'post', upkeep: 1, label: 'Остановка (автобус до работы)', icon: 'stop' },
  market:  { cost: { money: 120, wood: 30, stone: 10 }, needs: 'r', tech: 'trade', jobs: 4, label: 'Рынок (покупка и продажа ресурсов)', icon: 'market' },
  depot:   { cost: { money: 80, wood: 10 }, needs: 'r', label: 'Склад (сюда грузовики везут товары)', icon: 'depot' },
  // against fires: a well puts out fires within 5 tiles, a fire station within 12 (see FIRE_COVER)
  firewell: { cost: { money: 25, stone: 5 }, tech: 'community', label: 'Колодец (тушит пожары в 5 клетках)', icon: 'firewell' },
  firestation: { cost: { money: 220, stone: 30, iron: 5 }, needs: 'r', tech: 'firefighting', jobs: 4, upkeep: 3, label: 'Пожарная станция (тушит в 12 клетках)', icon: 'firestation' },
  healer:  { cost: { money: 60, wood: 15 }, needs: 'r', tech: 'herbalism', jobs: 1, upkeep: 1, label: 'Дом знахаря (лечит 40 жителей)', icon: 'healer' },
  // services: see SEATS for how many each serves
  kinder:  { cost: { money: 120, wood: 20 }, needs: 'rpw', tech: 'schools', jobs: 3, upkeep: 2, label: 'Детский сад (30 детей)', icon: 'kinder' },
  school:  { cost: { money: 200, stone: 20 }, needs: 'rpw', tech: 'schools', jobs: 4, upkeep: 3, label: 'Школа (40 учеников)', icon: 'school' },
  hospital: { cost: { money: 400, stone: 40 }, needs: 'rpw', tech: 'medicine', jobs: 6, upkeep: 5, label: 'Больница (150 жителей)', icon: 'hospital' },
  uni:     { cost: { money: 600, stone: 60, ironbar: 5 }, needs: 'rpw', tech: 'universities', jobs: 6, upkeep: 6, label: 'Университет (высшее образование)', icon: 'uni' },
  // a mine is built on an ore deposit and turns into the matching mine; demolishing it leaves the deposit
  mine:    { cost: { money: 150, wood: 20 }, tech: 'mechanics', label: 'Рудник (на месторождение)', icon: 'mine' },
  ironmine: { cost: { money: 150, wood: 20 }, needs: 'rp', grown: true, ore: 'iron', jobs: 5, prod: { iron: 1 }, label: 'Железный рудник', icon: 'mine' },
  // oil: a well goes on an oil deposit; the refinery turns oil into asphalt for roads
  well:    { cost: { money: 200, wood: 20 }, tech: 'geology', label: 'Нефтяная вышка (на месторождение нефти)', icon: 'oilwell' },
  oilwell: { cost: { money: 200, wood: 20 }, needs: 'r', grown: true, ore: 'oil', jobs: 4, prod: { oil: 0.8 }, label: 'Нефтяная вышка', icon: 'oilwell' },
  refinery: { cost: { money: 400, stone: 40, ironbar: 5 }, needs: 'rp', tech: 'refining', jobs: 6, upkeep: 2, label: 'НПЗ (нефть → асфальт)', icon: 'refinery' },
  goldmine: { cost: { money: 150, wood: 20 }, needs: 'rp', grown: true, ore: 'gold', jobs: 5, prod: { gold: 0.4 }, label: 'Золотой прииск', icon: 'mine' },
  // ore from the owner's stock into iron or gold bars (see SMELT), which later eras and goods need
  smelter: { cost: { money: 350, stone: 40, wood: 20 }, needs: 'rp', tech: 'industry', jobs: 6, upkeep: 2, label: 'Металлургический завод (руда → слитки)', icon: 'smelter' },
};
const NEED_TEXT = { f: 'горит!', h: 'нет свободной лошади на складе', r: 'нет дороги рядом', p: 'нет электричества', w: 'нет воды', t: 'нет леса рядом', k: 'нет камня рядом', l: 'нет озера рядом' };
const RES_TEXT = { money: 'денег', wood: 'дерева', stone: 'камня', food: 'еды', iron: 'железной руды', gold: 'золотой руды', ironbar: 'железных слитков', goldbar: 'золотых слитков', oil: 'нефти', asphalt: 'асфальта', horses: 'лошадей' };
const isRoad = t => t === 'road' || t === 'path' || t === 'cobble'; // a path is a road too, only slower
// paved roads cost upkeep per tile and tick; a player who can't pay has worn roads, as slow as a path
const ROAD_UPKEEP = { cobble: ['stone', 0.01], road: ['oil', 0.01] };
const wornAt = (s, j) => !!((s.players[ownerOf(s, j)] || {}).worn || {})[s.grid[j]];
const slowAt = (s, j) => s.grid[j] === 'path' || wornAt(s, j);
const POWER = 1, WATER = 2; // bits in s.util: lines/pipes lie on top of grass, roads and buildings

// Land is owned tile by tile: a player starts with a START x START square placed anywhere on the grid,
// builds only on own land and buys more next to it.
const START = 12;
const ownerOf = (s, i) => s.owner[i];
const landOf = (s, who) => s.owner.reduce((n, o) => n + (o === who), 0);
const landPrice = (s, who) => 3 + Math.floor(landOf(s, who) / 300); // per tile, grows as the city spreads
// Eras: reaching the population, paying the cost and finishing the era's research moves a player on,
// allowing more land. Buildings open through research (B[t].tech). Power and water are needed only by homes of tier UTIL_ERA and up (blocks of flats, towers).
// area: most tiles of land an era may own; rare: rare resources the step costs on top of money
const LEVELS = [
  { name: 'Древность', icon: 'village', area: START * START },
  { name: 'Средневековье', icon: 'town', pop: 30, cost: 300, area: 400 },
  { name: 'Индустриальная эпоха', icon: 'ind', pop: 120, cost: 1000, rare: { iron: 20 }, area: 1000 },
  { name: 'Новое время', icon: 'city', pop: 300, cost: 3000, rare: { ironbar: 25 }, area: 2500 },
  { name: 'Современность', icon: 'metro', pop: 600, cost: 6000, rare: { ironbar: 50, goldbar: 10 }, area: 4000 },
];
const UTIL_ERA = 3;
// homes by era: built at the owner's current tier, older ones can be raised to it; the tower also needs skyscrapers
const HOME_TIERS = [
  { name: 'Хижина', cap: 4 },
  { name: 'Фахверковый дом', cap: 8, cost: { money: 40, wood: 15 } },
  { name: 'Кирпичный дом', cap: 14, cost: { money: 120, stone: 30 } },
  { name: 'Многоэтажка', cap: 24, cost: { money: 300, stone: 40, ironbar: 5 } },
  { name: 'Жилая башня', cap: 40, cost: { money: 800, stone: 60, ironbar: 10 }, tech: 'skyscrapers' },
];
const tierOf = (s, i) => (s.hl || {})[i] ?? 0;
// production buildings: built at the owner's era level, older ones can be raised to it; output grows with the level
const PROD_K = [1, 1.4, 1.8, 2.3, 2.9];
const UPGRADE = { farm: 1, sawmill: 1, quarry: 1, ironmine: 1, goldmine: 1, oilwell: 1, refinery: 1, smelter: 1, ind: 1, shop: 1, depot: 1 }; // a depot's level multiplies its room instead
const blOf = (s, i) => (s.bl || {})[i] ?? 0;
const prodK = (s, i) => PROD_K[blOf(s, i)];
const upCost = (t, L) => ({ money: Math.round(((B[t].cost.money || 60) + 60) * L * 3), ...(L < 2 ? { wood: 60 } : { stone: 48 * L }), ...(L >= 3 ? { ironbar: 8 * L } : {}) });
// can tile i be raised one step now (homes by tier, producers by level), and what does it take to its era's top
const canImprove = (s, i, p) => { const t = s.grid[i]; return !!p && (B[t] && B[t].home ? tierOf(s, i) < maxTier(p) : !!UPGRADE[t] && blOf(s, i) < Math.min(p.level || 0, PROD_K.length - 1)); };
function improveCost(s, i, p) {
  const t = s.grid[i], sum = {}, add = c => { for (const k in c) sum[k] = (sum[k] || 0) + c[k]; };
  if (B[t] && B[t].home) HOME_TIERS.slice(tierOf(s, i) + 1, maxTier(p) + 1).forEach(h => add(h.cost));
  else if (UPGRADE[t]) for (let L = blOf(s, i) + 1; L <= Math.min(p.level || 0, PROD_K.length - 1); L++) add(upCost(t, L));
  return sum;
}
const homeCap = (s, i) => HOME_TIERS[tierOf(s, i)].cap;
const maxTier = p => Math.min(p.level || 0, hasTech(p, 'skyscrapers') ? 4 : 3);
const levelOf = p => LEVELS[p.level || 0];
const BRANCHES = { world: 'Мир', science: 'Наука', edu: 'Образование', art: 'Искусство', social: 'Социальное' };
// one study per branch in each era; it needs the same branch's study of the era before
const TECH = [
  { id: 'explore', era: 0, branch: 'world', name: 'Разведка', desc: 'покупка новой земли' },
  { id: 'agriculture', era: 0, branch: 'science', name: 'Земледелие', desc: 'животноводство на фермах: лошади' },
  { id: 'writing', era: 0, branch: 'edu', name: 'Письменность', desc: 'исследования идут в 1,5 раза быстрее' },
  { id: 'crafts', era: 0, branch: 'art', name: 'Ремёсла', desc: 'жилые зоны застраиваются в 1,5 раза быстрее' },
  { id: 'community', era: 0, branch: 'social', name: 'Община', desc: 'колодец: тушит пожары рядом' },
  { id: 'trade', era: 1, branch: 'world', name: 'Торговые пути', desc: 'здание рынка: покупка и продажа ресурсов' },
  { id: 'mechanics', era: 1, branch: 'science', name: 'Механика', desc: 'рудник' },
  { id: 'schools', era: 1, branch: 'edu', name: 'Школы', desc: 'школа и детский сад' },
  { id: 'architecture', era: 1, branch: 'art', name: 'Зодчество', desc: 'магазин и брусчатка' },
  { id: 'post', era: 1, branch: 'social', name: 'Почта и конка', desc: 'остановка конки: лошадь возит людей на работу' },
  { id: 'geology', era: 2, branch: 'world', name: 'Геология', desc: 'нефтяная вышка' },
  { id: 'electricity', era: 2, branch: 'science', name: 'Электричество', desc: 'электростанция и ЛЭП' },
  { id: 'medicine', era: 2, branch: 'edu', name: 'Медицина', desc: 'больница: лечит лучше знахаря' },
  { id: 'industry', era: 2, branch: 'art', name: 'Промышленность', desc: 'промзона, заводы и металлургический завод' },
  { id: 'plumbing', era: 2, branch: 'social', name: 'Водопровод', desc: 'водокачка и трубы' },
  { id: 'refining', era: 3, branch: 'world', name: 'Нефтепереработка', desc: 'НПЗ и асфальтовые дороги' },
  { id: 'engine', era: 3, branch: 'science', name: 'Двигатель', desc: 'грузовики вместо телег: везут вдвое больше и вдвое быстрее, но жгут нефть; без неё грузы снова везут лошади' },
  { id: 'universities', era: 3, branch: 'edu', name: 'Университеты', desc: 'университет: высшее образование' },
  { id: 'business', era: 3, branch: 'art', name: 'Деловой центр', desc: 'офисная зона' },
  { id: 'transit', era: 3, branch: 'social', name: 'Общественный транспорт', desc: 'автобусы: остановкам не нужны лошади' },
  { id: 'globaltrade', era: 4, branch: 'world', name: 'Глобальная торговля', desc: 'на рынке продажа в 1,5 раза дороже' },
  { id: 'computers', era: 4, branch: 'science', name: 'Компьютеры', desc: 'исследования в 1,5 раза быстрее' },
  { id: 'elearning', era: 4, branch: 'edu', name: 'Онлайн-образование', desc: 'университеты выпускают вдвое больше' },
  { id: 'skyscrapers', era: 4, branch: 'art', name: 'Небоскрёбы', desc: 'жилая башня на 40 жителей' },
  { id: 'ecology', era: 4, branch: 'social', name: 'Экология', desc: 'парк; ваши заводы и станции загрязняют вдвое меньше' },
  // side branches (lane 1, 2 under the main line): not needed for the next era, each gives a bonus
  { id: 'herbalism', era: 0, branch: 'social', lane: 1, side: true, req: [], name: 'Травничество', desc: 'дом знахаря: лечит болезни' },
  { id: 'firefighting', era: 2, branch: 'social', lane: 2, side: true, req: ['post'], name: 'Пожарное дело', desc: 'пожарная станция: тушит в 12 клетках' },
  { id: 'quarantine', era: 3, branch: 'edu', lane: 1, side: true, req: ['medicine', 'printing'], name: 'Карантин', desc: 'эпидемии вдвое короче' },
  { id: 'seismic', era: 3, branch: 'art', lane: 1, side: true, req: ['industry', 'masonry'], name: 'Прочные постройки', desc: 'стихийные бедствия рушат вдвое меньше' },
  { id: 'forestry', era: 1, branch: 'world', lane: 1, side: true, req: ['explore'], name: 'Лесное хозяйство', desc: 'лесопилки дают на 30% больше дерева' },
  { id: 'irrigation', era: 1, branch: 'science', lane: 1, side: true, req: ['agriculture'], name: 'Орошение', desc: 'фермы +25% еды, засуха вдвое слабее' },
  { id: 'breeding', era: 1, branch: 'science', lane: 2, side: true, req: ['agriculture'], name: 'Коневодство', desc: 'до 3 лошадей на ферму, растут вдвое быстрее' },
  { id: 'masonry', era: 1, branch: 'art', lane: 1, side: true, req: ['crafts'], name: 'Каменотёсы', desc: 'каменоломни дают на 30% больше камня' },
  { id: 'banking', era: 2, branch: 'world', lane: 1, side: true, req: ['trade'], name: 'Банки', desc: 'налоги на 20% выше' },
  { id: 'printing', era: 2, branch: 'edu', lane: 1, side: true, req: ['schools', 'writing'], name: 'Книгопечатание', desc: 'исследования на 25% быстрее' },
  { id: 'preserving', era: 2, branch: 'social', lane: 1, side: true, req: ['post', 'irrigation'], name: 'Консервирование', desc: 'жители едят на 20% меньше' },
  { id: 'logistics', era: 3, branch: 'world', lane: 1, side: true, req: ['banking', 'mechanics'], name: 'Логистика', desc: 'грузы доезжают в 1,5 раза быстрее' },
  { id: 'automation', era: 4, branch: 'science', lane: 1, side: true, req: ['engine', 'industry'], name: 'Автоматизация', desc: 'заводы и НПЗ выпускают на 30% больше' },
];
// the main line of each branch: every study needs the one before it in its branch
for (const t of TECH) if (!t.req) { const b = TECH.find(x => x.branch === t.branch && x.era === t.era - 1 && !x.side); t.req = b ? [b.id] : []; }
const TECH_COST = [40, 100, 220, 400, 700]; // research points per era
const techOf = id => TECH.find(t => t.id === id);
const hasTech = (p, id) => !id || !!(p && p.tech && p.tech[id]);
const techLock = (p, id) => (hasTech(p, id) ? null : `нужно исследование «${techOf(id).name}»`);
const allTech = () => Object.fromEntries(TECH.map(t => [t.id, true]));
// what still blocks moving to the next era, or null when it can be done
function upgradeBlock(p) {
  const next = LEVELS[(p.level || 0) + 1];
  if (!next) return 'это последняя эпоха';
  const left = TECH.filter(t => t.era === (p.level || 0) && !t.side && !hasTech(p, t.id)); // side branches are optional
  if (left.length) return `для эпохи «${next.name}» нужно изучить: ${left.map(t => t.name).join(', ')}`;
  if (p.pop < next.pop) return `для эпохи «${next.name}» нужно ${next.pop} жителей`;
  if (p.res.money < next.cost) return `для эпохи «${next.name}» нужно ${next.cost} денег`;
  for (const [k, v] of Object.entries(next.rare || {})) if ((p.res[k] || 0) < v) return `для эпохи «${next.name}» нужно ${v} ${RES_TEXT[k]}`;
  return null;
}
// Picks what the player studies next; progress on each study is kept if they switch.
function setResearch(s, who, id) {
  const p = s.players[who], t = techOf(id);
  if (!p) return 'сначала выберите стартовый участок';
  if (!t) return 'неизвестное исследование';
  if (hasTech(p, id)) return 'уже изучено';
  if (t.era > (p.level || 0)) return `откроется в эпоху «${LEVELS[t.era].name}»`;
  const miss = t.req.map(techOf).filter(r => !hasTech(p, r.id));
  if (miss.length) return `сначала изучите ${miss.map(r => `«${r.name}»`).join(' и ')}`;
  p.research = id;
  return null;
}

// Market: base money price per unit to buy (PRICES) or sell (SELL); rare resources can only be sold.
// Prices follow demand, shared by all players: buying pushes a resource's price up, selling pushes it down,
// and every tick it drifts back towards the base (s.mk holds the factor per resource).
const HIST_RES = ['money', 'wood', 'stone', 'food', 'iron', 'gold', 'ironbar', 'goldbar', 'oil', 'asphalt', 'horses'];
const PRICES = { wood: 4, stone: 6, food: 3 };
const SELL = { wood: 2, stone: 3, food: 1, iron: 15, gold: 40, ironbar: 40, goldbar: 100, oil: 8 };
const DEMAND = 0.004, MK_MIN = 0.3, MK_MAX = 3; // 50 units bought → +20%
const mkOf = (s, res) => (s.mk || {})[res] ?? 1;
const priceOf = (s, p, res, sell) => { const b = (sell ? SELL : PRICES)[res]; return b ? Math.round(b * mkOf(s, res) * (sell && hasTech(p, 'globaltrade') ? 1.5 : 1) * 10) / 10 : 0; };
const hasMarket = (s, who) => s.grid.some((t, i) => t === 'market' && ownerOf(s, i) === who && !(s.status && s.status[i]));
function trade(s, who, res, n, sell = false) {
  const p = s.players[who];
  if (!p) return 'сначала выберите стартовый участок';
  const price = priceOf(s, p, res, sell);
  if (!price || !Number.isInteger(n) || n < 1 || n > 1000) return 'неверная сделка';
  const lock = techLock(p, 'trade'); if (lock) return lock;
  if (!hasMarket(s, who)) return 'сначала постройте работающий рынок';
  const sum = Math.round(price * n * 10) / 10;
  if (sell) {
    if ((p.res[res] || 0) < n) return 'не хватает ' + RES_TEXT[res];
    p.res[res] -= n; p.res.money += sum;
  } else {
    if (p.res.money < sum) return `не хватает денег: нужно ${sum}`;
    if (res !== 'horses' && (p.res[res] || 0) + n > capOf(s, who)) return `на складах нет места: вмещают по ${capOf(s, who)} каждого товара`;
    p.res.money -= sum; p.res[res] += n;
  }
  (s.mk = s.mk || {})[res] = Math.min(MK_MAX, Math.max(MK_MIN, mkOf(s, res) * (1 + (sell ? -n : n) * DEMAND)));
  return null;
}
// Clearing forest or rock from a tile costs money and yields a little of the material.
const CLEAR = { tree: { cost: 5, res: 'wood' }, rock: { cost: 10, res: 'stone' } };
const COLORS = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6', '#bfef45'];

const isBuilding = t => !!(B[t] && B[t].needs);
const nb = i => { const x = i % W, y = (i / W) | 0, o = []; if (x > 0) o.push(i - 1); if (x < W - 1) o.push(i + 1); if (y > 0) o.push(i - W); if (y < H - 1) o.push(i + W); return o; };
const near = (g, i, type, rad) => {
  const x = i % W, y = (i / W) | 0;
  for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
    const X = x + dx, Y = y + dy;
    if (X >= 0 && Y >= 0 && X < W && Y < H && g[Y * W + X] === type) return true;
  }
  return false;
};

function newGame(seed = (Date.now() % 2147483646) + 1) {
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const grid = Array(W * H).fill('grass');
  const blob = (type, n, rad, density, base = 1.5) => { // base: smallest radius
    for (let k = 0; k < n; k++) {
      const cx = r() * W, cy = r() * H, rr = base + r() * rad;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 < rr * rr && r() < density) grid[y * W + x] = type;
    }
  };
  blob('lake', 22, 4, 1); blob('tree', 76, 3.5, 0.75); blob('rock', 40, 2, 0.7);
  blob('iron', 5, 0.6, 0.9, 0.7); blob('gold', 3, 0.4, 0.9, 0.6); blob('oil', 3, 0.6, 0.9, 0.8); // rare deposits: a few small clusters of 1–4 tiles
  // phase: lobby (waiting for start) → draft (players pick a starting area in drawn order) → play
  return { grid, util: Array(W * H).fill(0), owner: Array(W * H).fill(''), players: {}, phase: 'lobby', order: [], turn: 0, tick: 0, speed: 1 };
}

// Starts the game: a random draw sets the order of picking starting areas (one player just picks).
function start(s, names, rand = Math.random) {
  if (s.phase !== 'lobby') return 'игра уже идёт';
  const order = [...new Set(names)];
  if (!order.length) return 'нет игроков';
  for (let k = order.length - 1; k > 0; k--) { const j = Math.floor(rand() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; }
  Object.assign(s, { order, turn: 0, phase: 'draft' });
  return null;
}
function nextTurn(s) { if (++s.turn >= s.order.length) s.phase = 'play'; }

// top-left corner of the START x START square centred on tile i, kept inside the map
const startCorner = i => [Math.max(0, Math.min(W - START, i % W - START / 2)), Math.max(0, Math.min(H - START, (i / W | 0) - START / 2))];
const rectTiles = (x0, y0, x1, y1) => { const o = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) o.push(y * W + x); return o; };

// Takes the free starting square around tile i.
function claim(s, who, i) {
  if (s.players[who]) return 'стартовый участок уже выбран — расширяйтесь покупкой земли';
  if (s.phase === 'lobby') return 'сначала нажмите «Начать игру»';
  if (s.phase === 'draft' && s.order[s.turn] !== who) return 'сейчас выбирает ' + s.order[s.turn];
  const [x0, y0] = startCorner(i), tiles = rectTiles(x0, y0, x0 + START - 1, y0 + START - 1);
  if (tiles.some(k => s.owner[k])) return 'там уже чужая земля — выберите место правее, левее или дальше';
  for (const k of tiles) s.owner[k] = who;
  s.players[who] = { res: { money: 1000, wood: 40, stone: 50, food: 50, iron: 0, gold: 0, ironbar: 0, goldbar: 0, oil: 0, asphalt: 0, horses: 0 }, demo: newDemo(), hist: [], tech: {}, rpts: {}, research: null, level: 0, pop: 0, jobs: 0, fed: true, delta: {}, color: COLORS[Object.keys(s.players).length % COLORS.length] };
  if (s.phase === 'draft') nextTurn(s);
  return null;
}

// Buys the not-yet-owned tiles of the rectangle between corner tiles i and j; it must touch the player's land.
function buyArea(s, who, i, j) {
  const p = s.players[who];
  if (!p) return 'сначала выберите стартовый участок';
  const lock = techLock(p, 'explore'); if (lock) return lock;
  const tiles = rectTiles(Math.min(i % W, j % W), Math.min(i / W | 0, j / W | 0), Math.max(i % W, j % W), Math.max(i / W | 0, j / W | 0));
  if (tiles.some(k => s.owner[k] && s.owner[k] !== who)) return 'в выделении есть чужая земля';
  const fresh = tiles.filter(k => !s.owner[k]);
  if (!fresh.length) return 'эта земля уже ваша';
  if (!fresh.some(k => nb(k).some(n => s.owner[n] === who))) return 'новая земля должна примыкать к вашей';
  const lv = levelOf(p), have = landOf(s, who);
  if (have + fresh.length > lv.area) return `«${lv.name}» может владеть не больше ${lv.area} кл. земли (сейчас ${have}) — нужна следующая эпоха`;
  const cost = fresh.length * landPrice(s, who);
  if (p.res.money < cost) return `не хватает денег: ${fresh.length} кл. стоят ${cost}`;
  p.res.money -= cost;
  for (const k of fresh) s.owner[k] = who;
  return null;
}

// Flood a utility network from sources through tiles carrying that utility bit or any building, never onto another owner's land.
function flood(s, sources, bit) {
  const seen = new Set(sources), q = [...sources];
  while (q.length) {
    const i = q.pop();
    for (const j of nb(i)) if (!seen.has(j) && ownerOf(s, j) === ownerOf(s, i) && ((s.util[j] & bit) || isBuilding(s.grid[j]))) { seen.add(j); q.push(j); }
  }
  return seen;
}

// Tiles reached by electricity and by water.
function networks(s) {
  const g = s.grid, road = i => nb(i).some(j => isRoad(g[j])), lake = i => nb(i).some(j => g[j] === 'lake');
  const powered = flood(s, g.flatMap((t, i) => t === 'plant' && road(i) ? [i] : []), POWER);
  const watered = flood(s, g.flatMap((t, i) => t === 'pump' && road(i) && powered.has(i) && lake(i) ? [i] : []), WATER);
  return { powered, watered };
}

// Returns per-tile string of unmet needs ('' = working or not a building).
function compute(s) {
  const g = s.grid, road = i => nb(i).some(j => isRoad(g[j])), lake = i => nb(i).some(j => g[j] === 'lake');
  const { powered, watered } = networks(s), modern = i => B[g[i]].home && tierOf(s, i) >= UTIL_ERA;
  // zone lots only need a road within 3 tiles, so a big district fills in, not just its edge
  const ok = {
    r: i => B[g[i]].zone || B[g[i]].grown ? near(g, i, 'road', 3) || near(g, i, 'path', 3) || near(g, i, 'cobble', 3) : road(i),
    // only modern homes need power and water, so a new era or a power plant never switches the town off
    p: i => powered.has(i) || !modern(i), w: i => watered.has(i) || !modern(i),
    t: i => near(g, i, 'tree', 2), k: i => near(g, i, 'rock', 2), l: lake,
  };
  const st = g.map((t, i) => isBuilding(t) ? [...B[t].needs].filter(c => !ok[c](i)).join('') : '');
  // before public transport every stop is a horse tram and takes one of the owner's horses
  const horses = {};
  g.forEach((t, i) => {
    const p = s.players[ownerOf(s, i)];
    if (t !== 'stop' || !p || hasTech(p, 'transit')) return;
    const o = ownerOf(s, i), left = horses[o] ?? Math.floor(p.res.horses || 0);
    if (left < 1) st[i] += 'h'; else horses[o] = left - 1;
  });
  for (const i in s.fire || {}) if (st[i] !== undefined && B[g[i]]) st[i] += 'f';
  return st;
}

// Which working homes can get to a job of their owner: on foot within 4 tiles, or by bus between
// stops (one within 3 tiles of the home, one within 3 tiles of a workplace) that stand on the same road network.
// id of the connected road network for every road tile, -1 elsewhere
function roadNets(g) {
  const comp = new Array(g.length).fill(-1);
  let c = 0;
  g.forEach((t, i) => {
    if (!isRoad(t) || comp[i] >= 0) return;
    const q = [i]; comp[i] = c;
    while (q.length) { const k = q.pop(); for (const j of nb(k)) if (isRoad(g[j]) && comp[j] < 0) { comp[j] = c; q.push(j); } }
    c++;
  });
  return comp;
}

function commute(s, st = s.status || compute(s)) {
  const g = s.grid, comp = roadNets(g);
  const around = (i, rad, f) => {
    const x = i % W, y = i / W | 0;
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && Y >= 0 && X < W && Y < H && f(Y * W + X)) return true;
    }
    return false;
  };
  const work = (j, o) => B[g[j]] && B[g[j]].jobs && !st[j] && ownerOf(s, j) === o;
  const stop = (j, o) => g[j] === 'stop' && !st[j] && ownerOf(s, j) === o;
  const nets = j => nb(j).filter(k => comp[k] >= 0).map(k => comp[k]);
  const served = {}; // owner -> road networks with a stop near one of their workplaces
  g.forEach((t, i) => {
    const o = ownerOf(s, i);
    if (stop(i, o) && around(i, 3, j => work(j, o))) for (const n of nets(i)) (served[o] = served[o] || new Set()).add(n);
  });
  const ok = new Set();
  g.forEach((t, i) => {
    if (!B[t] || !B[t].home || st[i]) return;
    const o = ownerOf(s, i);
    if (around(i, 4, j => work(j, o)) || (served[o] && around(i, 3, j => stop(j, o) && nets(j).some(n => served[o].has(n))))) ok.add(i);
  });
  return ok;
}

// Soft needs of residents of home tile i; jobs/food use the owner's totals from the previous tick.
const WANT_TEXT = { food: 'Еда в городе', jobs: 'Работа для всех', work: 'Дорога до работы: пешком до 4 кл. или автобусом', shop: 'Магазин в 5 клетках', park: 'Парк в 4 клетках или лес рядом', quiet: 'Нет завода, станции или карьера в 3 клетках', air: 'Чистый воздух: загрязнение у дома ниже 0,6' };
const DIRTY = 0.6; // pollution at a home from which the air counts as dirty (see pollution())
const wants = (s, i, reach = commute(s)) => {
  const g = s.grid, p = s.players[ownerOf(s, i)] || { res: { food: 0 }, jobs: 0, pop: 1 };
  return {
    food: p.res.food > 0,
    jobs: p.jobs >= (p.demo ? p.demo.none + p.demo.school + p.demo.higher : p.pop), // enough jobs for the adults
    work: reach.has(i),
    shop: near(g, i, 'shop', 5),
    park: near(g, i, 'park', 4) || near(g, i, 'tree', 2),
    quiet: !['ind', 'plant', 'quarry'].some(t => near(g, i, t, 3)),
    air: polOf(s)[i] < DIRTY,
  };
};
const share = w => Object.values(w).filter(Boolean).length / Object.keys(WANT_TEXT).length;
const happiness = (s, i, reach) => share(wants(s, i, reach));
// a working home is 40% full when no needs are met and full when all are
const fill = (s, i, h) => s.status && s.status[i] ? 0 : Math.round(homeCap(s, i) * (0.4 + 0.6 * h));
const residents = (s, i, reach) => fill(s, i, happiness(s, i, reach));
const short = t => B[t].label.replace(/ \(.*\)/, '');

// Goods don't go straight to the treasury: a producer fills its own stock, a full load leaves by truck for the
// owner's nearest depot on the same road network and counts when it arrives (2 tiles per tick).
// Factories make products the same way; depots then send products on to shops, which sell them for money.
const CARGO_RES = ['food', 'wood', 'stone', 'iron', 'gold', 'oil', 'ironbar', 'goldbar'];
const LOAD = 8, STORE = 3 * LOAD; // a cart load; a producer with nowhere to send goods stops at STORE
const TRUCK_LOAD = 16, PACE = { cart: 2, truck: 4 }; // a truck takes twice a cart's load, twice as fast (route cost units a tick)
// what a factory (ind) can be set to make; input is taken from the owner's stock per unit made
const PRODUCTS = {
  clothes:   { label: 'Одежда', input: {}, price: 3 },
  furniture: { label: 'Мебель', input: { wood: 1 }, price: 5 },
  canned:    { label: 'Консервы', input: { food: 1 }, price: 4 },
  tools:     { label: 'Инструменты', input: { ironbar: 0.25 }, price: 9 },
  jewelry:   { label: 'Украшения', input: { goldbar: 0.2 }, price: 20 },
};
// what the metallurgical plant makes: one bar from `per` units of ore
const SMELT = { ironbar: { label: 'Железные слитки', ore: 'iron', per: 2 }, goldbar: { label: 'Золотые слитки', ore: 'gold', per: 2 } };
const PROD_TECH = { sawmill: 'forestry', quarry: 'masonry' }; // studies that make these 30% more
const FACTORY_RATE = 1, SHOP_SALES = 2; // units per tick with a full staff
// farm specializations; livestock farms raise horses, at most HORSES_PER_FARM each
const FARM = { crops: { label: 'Культуры', food: 5 }, livestock: { label: 'Животноводство', food: 2 } };
const HORSES_PER_FARM = 2;
const horsesPerFarm = p => HORSES_PER_FARM + (hasTech(p, 'breeding') ? 1 : 0);
// a player's horses: trams take theirs first (see compute), carts in transit keep theirs; a livestock farm's own carts don't count
function horseUse(s, who) {
  const p = s.players[who], mine = (t, i) => s.grid[i] === t && ownerOf(s, i) === who;
  const total = Math.floor(p.res.horses || 0), trams = Math.min(total, hasTech(p, 'transit') ? 0 : s.grid.filter(mine.bind(null, 'stop')).length);
  const carts = (s.ships || []).filter(sh => sh.who === who && sh.horse && !sh.own).length;
  const cap = s.grid.filter((t, i) => mine('farm', i) && (s.spec || {})[i] === 'livestock').length * horsesPerFarm(p);
  return { total, trams, carts, busy: Math.min(total, trams + carts), free: Math.max(0, total - trams - carts), cap };
}
// every horse eats HORSE_FOOD a tick; while the town has no food they only carry food (so the farms can still refill it)
const HORSE_FOOD = 0.1;
// the town keeps up to BASE_CAP of every resource and product, each working depot DEPOT_CAP more times its level's PROD_K;
// loads that don't fit wait at the producer
const BASE_CAP = 100, DEPOT_CAP = 200;
const depotCap = (s, d) => Math.round(DEPOT_CAP * prodK(s, d));
const capOf = (s, who) => BASE_CAP + s.grid.reduce((n, t, d) => n + (isDepot(s, who)(d) ? depotCap(s, d) : 0), 0);
// every truck on the road burns TRUCK_OIL a tick; with no oil in stock the loads go by the buildings' horses again
const TRUCK_OIL = 0.1;
// Logistics: the player may send a building's loads to one depot of their choice (s.route: building → depot);
// without a choice the nearest depot on the same roads takes them. Shops are supplied from their chosen depot.
const routable = (s, i) => !!UPGRADE[s.grid[i]] && s.grid[i] !== 'depot';
const depotFor = (s, who, i) => { const d = (s.route || {})[i]; return d === undefined ? isDepot(s, who) : k => k === d && isDepot(s, who)(k); };
function setRoute(s, who, i, d) {
  if (!Number.isInteger(i) || i < 0 || i >= W * H || !Number.isInteger(d) || d < -1 || d >= W * H) return 'неверная клетка';
  if (ownerOf(s, i) !== who) return 'это не ваш участок';
  if (!routable(s, i)) return 'это здание ничего не возит';
  const r = s.route = s.route || {};
  if (d === -1) { delete r[i]; return null; }
  if (s.grid[d] !== 'depot' || ownerOf(s, d) !== who) return 'возить можно только на свой склад';
  r[i] = d;
  return null;
}
const isDepot = (s, who) => d => s.grid[d] === 'depot' && !s.status[d] && ownerOf(s, d) === who;
// nearest tile passing isDest that shares a road network with tile i: { from, to, dest, dist } (from/to are road tiles)
function findRoute(s, comp, i, isDest) {
  const mine = nb(i).filter(k => comp[k] >= 0);
  if (!mine.length) return null;
  // travel cost from i's roads to every road tile: asphalt costs 1, a path 2 (it is twice as slow)
  const cost = new Map(mine.map(r => [r, 0])), buckets = [mine.slice()];
  for (let c = 0; c < buckets.length; c++) for (const k of buckets[c] || []) {
    if (cost.get(k) !== c) continue;
    for (const j of nb(k)) {
      if (!isRoad(s.grid[j])) continue;
      const nc = c + (slowAt(s, j) ? 2 : 1);
      if (!cost.has(j) || nc < cost.get(j)) { cost.set(j, nc); (buckets[nc] = buckets[nc] || []).push(j); }
    }
  }
  let best = null;
  s.grid.forEach((t, d) => {
    if (!isDest(d)) return;
    for (const rd of nb(d)) if (cost.has(rd) && (!best || cost.get(rd) < best.dist)) best = { from: mine[0], to: rd, dest: d, dist: cost.get(rd) };
  });
  return best;
}
// horse: the load goes by cart and keeps one of the owner's horses busy until it arrives; n: how much it carries
function sendTruck(s, who, res, route, kind, horse, own, src, n = LOAD) {
  const pace = PACE[horse ? 'cart' : 'truck'] * (hasTech(s.players[who], 'logistics') ? 1.5 : 1);
  s.ships.push({ id: ++s.shipSeq, who, res, n, from: route.from, to: route.to, dest: route.dest, kind, horse, own, src, t0: s.tick, at: s.tick + Math.max(1, Math.ceil(route.dist / pace)) });
}
// a load from producer i to its depot; vehicle() gives 'truck', 'horse' or 'own', or false when no horse is free;
// space: room left in the depots. A cart takes LOAD, a truck up to TRUCK_LOAD of what is there; returns how much went
function ship(s, comp, who, i, res, vehicle, space = Infinity) {
  const r = findRoute(s, comp, i, depotFor(s, who, i));
  if (!r) return 'depot';
  if (space < LOAD) return 'full';
  const v = vehicle(i, res);
  if (!v) return 'horse';
  const n = v === 'truck' ? Math.min(TRUCK_LOAD, Math.floor(s.stock[i]), Math.floor(space)) : LOAD;
  sendTruck(s, who, res, r, 'depot', v !== 'truck', v === 'own', i, n);
  return n;
}

// Events: rare fires, epidemics, droughts and disasters, at most one new one per player at a time of each kind.
// Chances are per player and tick (a tick is 2 seconds at ×1), none in the first EVENT_CALM ticks of a game.
// A fire burns FIRE_T ticks and then destroys the building, sometimes catching a neighbour; a well or a fire station
// nearby puts it out in FIRE_PUT ticks (its people run there with buckets, see the client). An epidemic kills a share of the residents each tick unless healers and hospitals
// treat them; a drought halves the farms' food; a disaster destroys one or two buildings.
const EVENT_P = { fire: 0.0015, sick: 0.0009, drought: 0.0009, disaster: 0.00045 }, EVENT_CALM = 120, FIRE_T = 8, FIRE_PUT = 6;
const FIRE_COVER = { firewell: 5, firestation: 12 };
let eventsOn = true; // tests switch the random part off
const setEvents = on => { eventsOn = on; };
const flammable = t => !!B[t] && !isRoad(t) && !B[t].zone && !FIRE_COVER[t] && t !== 'park' && t !== 'power' && t !== 'pipe';
const covered = (s, i) => Object.entries(FIRE_COVER).some(([t, r]) => near(s.grid, i, t, r));
function startFire(s, i) { (s.fire = s.fire || {})[i] = FIRE_T; s.events.push(`${ownerOf(s, i)}: пожар! Горит ${short(s.grid[i]).toLowerCase()} (${i % W}, ${i / W | 0})`); }
function burnDown(s, i) { s.events.push(`${ownerOf(s, i)}: сгорело здание «${short(s.grid[i])}»`); s.grid[i] = (B[s.grid[i]] && B[s.grid[i]].ore) || 'grass'; }
// what to destroy, for a fire or a disaster: the player's flammable buildings
const buildingsOf = (s, who) => s.grid.reduce((a, t, i) => (flammable(t) && ownerOf(s, i) === who ? (a.push(i), a) : a), []);
function events(s) {
  s.fire = s.fire || {};
  for (const i in s.fire) {
    const left = --s.fire[i];
    if (!flammable(s.grid[i])) { delete s.fire[i]; continue; }
    if (covered(s, i)) { if (left <= FIRE_T - FIRE_PUT) { delete s.fire[i]; s.events.push(`${ownerOf(s, i)}: пожар потушен`); } continue; }
    if (left <= 0) { delete s.fire[i]; burnDown(s, i); continue; }
    if (eventsOn && Math.random() < 0.06) { // the flames reach a neighbour
      const j = nb(+i).find(k => flammable(s.grid[k]) && !(k in s.fire));
      if (j !== undefined) startFire(s, j);
    }
  }
  for (const [who, p] of Object.entries(s.players)) {
    if (p.sick > 0) p.sick--; if (p.drought > 0) p.drought--;
    if (!eventsOn || s.tick < EVENT_CALM) continue;
    const bs = () => buildingsOf(s, who);
    if (Math.random() < EVENT_P.fire) { const b = bs(); if (b.length) startFire(s, b[Math.random() * b.length | 0]); }
    // epidemics come up to 3 times as often in a dirty town
    if (!p.sick && p.pop > 20 && Math.random() < EVENT_P.sick * (1 + 2 * dirtyShare(s, who))) { p.sick = hasTech(p, 'quarantine') ? 12 : 25; s.events.push(`${who}: эпидемия! Нужны знахари и больницы`); }
    if (!p.drought && Math.random() < EVENT_P.drought) { p.drought = 30; s.events.push(`${who}: засуха — фермы дают меньше еды`); }
    if (Math.random() < EVENT_P.disaster) disaster(s, who, p);
  }
}
// share of the player's homes that breathe dirty air
function dirtyShare(s, who) {
  const pol = polOf(s); let homes = 0, dirty = 0;
  s.grid.forEach((t, i) => { if (B[t] && B[t].home && ownerOf(s, i) === who) { homes++; if (pol[i] >= DIRTY) dirty++; } });
  return homes ? dirty / homes : 0;
}
function disaster(s, who, p, roll = Math.random) {
  const b = buildingsOf(s, who);
  let n = Math.min(b.length, roll() < 0.4 ? 2 : 1);
  if (hasTech(p, 'seismic')) n = roll() < 0.5 ? 0 : Math.min(1, n); // sturdy buildings: half the time nothing falls, never two
  const kind = ['Буря', 'Землетрясение', 'Наводнение'][roll() * 3 | 0];
  if (!n) { s.events.push(`${who}: ${kind.toLowerCase()} прошло без разрушений`); return; }
  const hit = [];
  for (let k = 0; k < n; k++) { const i = b.splice(roll() * b.length | 0, 1)[0]; hit.push(short(s.grid[i])); s.grid[i] = (B[s.grid[i]] && B[s.grid[i]].ore) || 'grass'; }
  s.events.push(`${who}: ${kind.toLowerCase()} разрушило: ${hit.join(', ')}`);
}
// share of the sick that healers and hospitals save this tick: a hospital place saves 90%, a healer's 50%
const cureOf = (cnt, pop) => Math.min(1, ((cnt.hospital || 0) * SEATS.hospital * 0.9 + (cnt.healer || 0) * SEATS.healer * 0.5) / Math.max(1, pop));

// Residents by age and education; schools, kindergartens, hospitals and universities change how the groups move.
const GROUPS = { kids: 'Дети', none: 'Без образования', school: 'Школьное образование', higher: 'Высшее образование', old: 'Пенсионеры' };
const SEATS = { kinder: 30, school: 40, hospital: 150, healer: 40, uni: 1.5 }; // kids / pupils / patients per building; uni: graduates per tick
const popOf = d => d.kids + d.none + d.school + d.higher + d.old;
const newDemo = () => ({ kids: 0, none: 0, school: 0, higher: 0, old: 0 });
// one tick of births, newcomers, growing up, studying, ageing and deaths; cap is how many the homes can hold
// nobody arrives with schooling the town can't give: school graduates need a school, specialists a university
function demographics(d, cap, cnt, hap, uniK = 1) { // uniK: online education doubles graduates
  const now = popOf(d), adults = d.none + d.school + d.higher, room = cap - now;
  const kinderCov = Math.min(1, (cnt.kinder || 0) * SEATS.kinder / Math.max(1, d.kids));
  const schoolCov = Math.min(1, (cnt.school || 0) * SEATS.school / Math.max(1, d.kids));
  const hospCov = Math.min(1, (cnt.hospital || 0) * SEATS.hospital / Math.max(1, now));
  if (room > 0) {
    d.kids += Math.min(room, adults * 0.004 * (0.5 + hap) * (1 + kinderCov)); // births, more with kindergartens
    const inn = Math.min(room, 1 + room * 0.15) * (0.3 + 0.7 * hap); // newcomers, mostly without a degree
    const sch = cnt.school ? 0.4 : 0, hi = cnt.uni ? 0.1 : 0;
    d.none += inn * (1 - sch - hi); d.school += inn * sch; d.higher += inn * hi;
  } else if (room < 0) { // too many people for the homes: some leave
    const k = Math.min(1, -room * 0.2 / now);
    for (const g in d) d[g] -= d[g] * k;
  }
  const grow = d.kids / 30; // kids grow up, with school if there are seats for them
  d.kids -= grow; d.school += grow * schoolCov; d.none += grow * (1 - schoolCov);
  const study = Math.min(d.school / 40, (cnt.uni || 0) * SEATS.uni * uniK); // university turns school graduates into specialists
  d.school -= study; d.higher += study;
  for (const g of ['none', 'school', 'higher']) { const a = d[g] / 150; d[g] -= a; d.old += a; }
  d.old -= d.old / 50 * (1 - 0.5 * hospCov); // hospitals halve deaths
  d.kids -= d.kids * 0.001 * (1 - hospCov);
  return { kinderCov, schoolCov, hospCov };
}

// Pollution per tile from factories, power plants, quarries and mines, fading over 5 tiles.
const POLLUTERS = { smelter: 1.2, ind: 1, plant: 0.8, quarry: 0.5, ironmine: 0.6, goldmine: 0.6, oilwell: 0.6, refinery: 1.2 };
// pollution of the state, worked out once per state (the rules ask for it home by home)
const polCache = new WeakMap();
const polSig = s => { let h = 0; for (let i = 0; i < s.grid.length; i++) if (POLLUTERS[s.grid[i]]) h = (h * 31 + i + 1) | 0; return h; }; // where the polluters stand
const polOf = s => { let c = polCache.get(s); const sig = polSig(s); if (!c || c.sig !== sig) polCache.set(s, c = { sig, map: pollution(s) }); return c.map; };
function pollution(s) {
  const p = new Float32Array(W * H);
  s.grid.forEach((t, i) => {
    const o = s.players[ownerOf(s, i)], k = (POLLUTERS[t] || 0) * (hasTech(o, 'ecology') ? 0.5 : 1); if (!k) return;
    const x = i % W, y = i / W | 0;
    for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && Y >= 0 && X < W && Y < H) p[Y * W + X] += k * Math.max(0, 1 - Math.max(Math.abs(dx), Math.abs(dy)) / 6);
    }
  });
  return p;
}

// Sets what an owned factory makes.
function setSpec(s, who, i, v) {
  if (!Number.isInteger(i) || i < 0 || i >= W * H) return 'неверная клетка';
  if (ownerOf(s, i) !== who) return 'это не ваш участок';
  if (s.grid[i] === 'farm') {
    if (!FARM[v]) return 'неизвестная специализация';
    if (v === 'livestock') { const lock = techLock(s.players[who], 'agriculture'); if (lock) return lock; }
  } else if (s.grid[i] === 'smelter') { if (!SMELT[v]) return 'неизвестный металл'; }
  else if (s.grid[i] !== 'ind') return 'выпуск настраивается только у завода или фермы';
  else if (!PRODUCTS[v]) return 'неизвестный товар';
  (s.spec = s.spec || {})[i] = v;
  return null;
}

function tick(s) {
  const st = compute(s), own = s.grid.map((_, i) => ownerOf(s, i));
  s.status = st;
  const reach = commute(s, st), comp = roadNets(s.grid);
  s.ships = s.ships || []; s.stock = s.stock || {}; s.shipSeq = s.shipSeq || 0; s.spec = s.spec || {}; s.shopStock = s.shopStock || {};
  const undelivered = [], starved = [], noHorse = [], full = [];
  s.breed = s.breed || {}; s.bl = s.bl || {}; s.events = [];
  events(s);
  for (const k in s.mk || {}) s.mk[k] += (1 - s.mk[k]) * 0.02; // prices drift back to the base
  if (!s.hl) { // saves from before home tiers: houses were half-timbered, zone homes take the owner's era
    s.hl = {};
    s.grid.forEach((t, i) => { const o = s.players[ownerOf(s, i)]; if (t === 'house') s.hl[i] = 1; if (t === 'res') s.hl[i] = o ? maxTier(o) : 0; });
  }
  for (const [who, p] of Object.entries(s.players)) {
    if (!p.tech) { p.tech = {}; for (const t of TECH) if (t.era < (p.level || 0)) p.tech[t.id] = true; p.rpts = {}; } // saves from before research
    const cnt = {}, needs = Object.fromEntries(Object.keys(WANT_TEXT).map(k => [k, 0]));
    let cap = 0, reachCap = 0, places = 0, happy = 0;
    s.grid.forEach((t, i) => {
      if (own[i] !== who || st[i] || !B[t]) return;
      cnt[t] = (cnt[t] || 0) + 1;
      if (!B[t].home) return;
      const w = wants(s, i, reach), h = share(w), n = fill(s, i, h);
      cap += n; if (w.work) reachCap += n;
      const room = homeCap(s, i);
      places += room; happy += h * room;
      for (const k in w) needs[k] += w[k] ? room : 0;
    });
    const hap = places ? happy / places : 0;
    // saves from before demographics: everyone counts as an adult without a degree
    const d = p.demo || (p.demo = { ...newDemo(), none: p.pop || 0 });
    if (!p.eduFix) { // saves from before: newcomers came educated even without schools
      p.eduFix = true;
      if (!cnt.uni) { (cnt.school ? (d.school += d.higher) : (d.none += d.higher)); d.higher = 0; }
      if (!cnt.school) { d.none += d.school; d.school = 0; }
    }
    const before0 = popOf(d), cov = demographics(d, cap, cnt, hap, hasTech(p, 'elearning') ? 2 : 1);
    if (p.sick > 0) { // an epidemic: up to 1.5% of the residents a tick, fewer with healers and hospitals
      const k = 0.015 * (1 - cureOf(cnt, popOf(d)));
      p.died = Math.round(popOf(d) * k * 10) / 10;
      for (const g in d) d[g] -= d[g] * k * (g === 'old' ? 2 : 1); // the old suffer most
    } else p.died = 0;
    const pop = Math.round(popOf(d));
    // who can work where: offices need a degree, every other job takes anyone; only people who can get to work count
    const r = cap ? reachCap / cap : 0, jobs = Object.entries(cnt).reduce((n, [t, c]) => n + c * (B[t].jobs || 0), 0);
    const offJobs = (cnt.off || 0) * B.off.jobs, otherJobs = jobs - offJobs;
    const fo = Math.min(offJobs, d.higher * r), fOther = Math.min(otherJobs, (d.none + d.school + d.higher) * r - fo);
    const wrOff = offJobs ? fo / offJobs : 0, wrOther = otherJobs ? Math.max(0, fOther) / otherJobs : 0;
    const wrOf = t => (t === 'off' ? wrOff : wrOther);
    const R = p.res;
    for (const k of [...CARGO_RES, ...Object.keys(PRODUCTS), 'asphalt', 'horses']) R[k] = R[k] || 0;
    // horses: trams take theirs first (see compute), carts use what is left; with engines and oil everything goes by truck
    const engine = hasTech(p, 'engine'), auto = hasTech(p, 'automation') ? 1.3 : 1;
    let freeHorses = horseUse(s, who).free;
    const fuel = () => engine && R.oil > 0;
    const vehicle = (i, res) => (fuel() ? 'truck' : p.fed === false && res !== 'food' ? false : freeHorses >= 1 ? (freeHorses--, 'horse') : false);
    const room = capOf(s, who), inbound = {};
    for (const sh of s.ships) if (sh.who === who && sh.kind === 'depot') inbound[sh.res] = (inbound[sh.res] || 0) + sh.n;
    // research: points from adults, schools and universities; writing speeds it up
    const rp = (0.5 + (d.none + d.school + d.higher) * 0.01 + (cnt.school || 0) + (cnt.uni || 0) * 3) * (hasTech(p, 'writing') ? 1.5 : 1) * (hasTech(p, 'computers') ? 1.5 : 1) * (hasTech(p, 'printing') ? 1.25 : 1);
    p.rp = rp; p.rpts = p.rpts || {};
    if (p.research && !hasTech(p, p.research)) {
      p.rpts[p.research] = (p.rpts[p.research] || 0) + rp;
      if (p.rpts[p.research] >= TECH_COST[techOf(p.research).era]) { p.tech[p.research] = true; s.events.push(`${who}: изучено «${techOf(p.research).name}»`); p.research = null; }
    }
    const before = { ...R }, flow = Object.fromEntries(Object.keys(R).map(k => [k, []]));
    const add = (k, what, v) => { if (v) { R[k] += v; flow[k].push([what, v]); } };
    p.worn = {};
    for (const [t, [k, v]] of Object.entries(ROAD_UPKEEP)) {
      const n = s.grid.reduce((c, x, j) => c + (x === t && own[j] === who), 0), need = n * v;
      if (!n) continue;
      if (R[k] >= need) add(k, `Содержание: ${short(t)} (${n} кл.)`, -need); else p.worn[t] = true;
    }
    for (const [t, n] of Object.entries(cnt)) {
      for (const [k, v] of Object.entries(B[t].prod || {})) if (!CARGO_RES.includes(k)) add(k, `${short(t)} ×${n}`, n * v * wrOf(t));
      if (B[t].upkeep) add('money', `Содержание: ${short(t)} ×${n}`, -n * B[t].upkeep);
    }
    // raw goods and factory products: fill each producer's stock, send full loads to a depot
    const used = {};
    s.grid.forEach((t, i) => {
      if (own[i] !== who || st[i] || !B[t]) return;
      let res = null, made = 0;
      if (t === 'smelter') { // ore from the owner's stock into bars
        res = s.spec[i] || 'ironbar';
        const m = SMELT[res], full = FACTORY_RATE * wrOther * prodK(s, i) * auto;
        made = Math.min(full, R[m.ore] / m.per);
        if (made < full * 0.99) starved.push(i);
        R[m.ore] -= made * m.per; used[m.ore] = (used[m.ore] || 0) + made * m.per;
      } else if (t === 'refinery') { // oil from the owner's stock into asphalt
        res = 'asphalt';
        made = Math.min(FACTORY_RATE * wrOther * prodK(s, i) * auto, R.oil);
        if (made < FACTORY_RATE * wrOther * prodK(s, i) * auto * 0.99) starved.push(i);
        R.oil -= made; used.oil = (used.oil || 0) + made;
      } else if (t === 'farm') {
        const f = FARM[s.spec[i] || 'crops'];
        res = 'food'; made = f.food * wrOther * prodK(s, i) * (hasTech(p, 'irrigation') ? 1.25 : 1) * (p.drought > 0 ? (hasTech(p, 'irrigation') ? 0.75 : 0.5) : 1);
        if (s.spec[i] === 'livestock') { // horses grow slowly; each livestock farm keeps at most horsesPerFarm
          const herd = s.grid.reduce((n, x, k) => n + (x === 'farm' && own[k] === who && s.spec[k] === 'livestock'), 0) * horsesPerFarm(p);
          s.breed[i] = Math.min(1, (s.breed[i] || 0) + 0.04 * wrOther * (hasTech(p, 'breeding') ? 2 : 1));
          if (s.breed[i] >= 1 && R.horses < herd && p.fed !== false) { s.breed[i] = 0; add('horses', 'Ферма вырастила лошадь', 1); }
        }
      } else if (t === 'ind') {
        res = s.spec[i] || 'clothes';
        made = FACTORY_RATE * wrOther * prodK(s, i) * auto;
        for (const [k, v] of Object.entries(PRODUCTS[res].input)) made = Math.min(made, R[k] / v); // limited by raw material
        if (made < FACTORY_RATE * wrOther * prodK(s, i) * auto * 0.99) starved.push(i);
        for (const [k, v] of Object.entries(PRODUCTS[res].input)) { R[k] -= v * made; used[k] = (used[k] || 0) + v * made; }
      } else if (B[t].prod) {
        res = Object.keys(B[t].prod).find(k => CARGO_RES.includes(k));
        if (res) made = B[t].prod[res] * wrOther * prodK(s, i) * (hasTech(p, PROD_TECH[t]) && PROD_TECH[t] ? 1.3 : 1);
      }
      if (!res) return;
      s.stock[i] = Math.min(STORE, (s.stock[i] || 0) + made);
      // a livestock farm carries its own food with its own carts, so it never waits for a free horse
      const veh = t === 'farm' && s.spec[i] === 'livestock' ? () => (fuel() ? 'truck' : 'own') : vehicle;
      if (s.stock[i] < LOAD) return;
      const r = ship(s, comp, who, i, res, veh, room - R[res] - (inbound[res] || 0));
      if (typeof r === 'number') { s.stock[i] -= r; inbound[res] = (inbound[res] || 0) + r; } else ({ horse: noHorse, full }[r] || undelivered).push(i);
    });
    for (const [k, v] of Object.entries(used)) { R[k] += v; add(k, 'Заводы берут сырьё', -v); } // re-run through add() for the breakdown
    // shops: sell what they have, order a load of the most stocked product from the nearest depot when running low
    let sold = 0, income = 0;
    s.grid.forEach((t, i) => {
      if (t !== 'shop' || own[i] !== who || st[i]) return;
      const box = s.shopStock[i] = s.shopStock[i] || {};
      let left = SHOP_SALES * wrOther * prodK(s, i);
      for (const k of Object.keys(box)) { const n = Math.min(left, box[k]); box[k] -= n; left -= n; sold += n; income += n * PRODUCTS[k].price; if (!box[k]) delete box[k]; }
      const have = Object.values(box).reduce((a, b) => a + b, 0);
      if (have >= LOAD || s.ships.some(sh => sh.kind === 'shop' && sh.dest === i)) return;
      const best = Object.keys(PRODUCTS).filter(k => R[k] >= LOAD).sort((a, b) => R[b] - R[a])[0];
      if (!best) return;
      const route = findRoute(s, comp, i, depotFor(s, who, i));
      if (!route) { undelivered.push(i); return; }
      const v = vehicle(i); if (!v) { noHorse.push(i); return; }
      const n = v === 'truck' ? Math.min(TRUCK_LOAD, Math.floor(R[best])) : LOAD;
      sendTruck(s, who, best, { from: route.to, to: route.from, dest: i, dist: route.dist }, 'shop', v === 'horse', false, i, n); // depot → shop
      add(best, 'Отправлено в магазины', -n);
    });
    if (income) add('money', `Магазины продали товары (${Math.round(sold)} шт.)`, income);
    const came = {};
    s.ships = s.ships.filter(sh => {
      if (sh.who !== who || sh.at > s.tick) return true;
      if (sh.kind === 'shop') { if (s.grid[sh.dest] === 'shop') { const box = s.shopStock[sh.dest] = s.shopStock[sh.dest] || {}; box[sh.res] = (box[sh.res] || 0) + sh.n; } }
      else { const c = came[sh.res] = came[sh.res] || [0, 0]; c[0]++; c[1] += sh.n; }
      return false;
    });
    for (const [k, [c, n]] of Object.entries(came)) add(k, `Привезли грузовики ×${c}`, n);
    add('food', `Жители едят (${pop})`, -pop * 0.2 * (hasTech(p, 'preserving') ? 0.8 : 1));
    const trucks = s.ships.filter(sh => sh.who === who && !sh.horse).length;
    if (trucks) add('oil', `Грузовики жгут топливо (${trucks})`, -Math.min(R.oil, trucks * TRUCK_OIL));
    if (R.horses >= 1) add('food', `Лошади едят (${Math.floor(R.horses)})`, -Math.floor(R.horses) * HORSE_FOOD);
    const fed = R.food > 0; if (!fed) R.food = 0;
    add('money', `Налоги (${pop} жит.)${fed ? '' : ' — голод, ×0.3'}`, pop * 0.5 * (fed ? 1 : 0.3) * (hasTech(p, 'banking') ? 1.2 : 1));
    p.delta = Object.fromEntries(Object.keys(R).map(k => [k, R[k] - before[k]])); // economy only, not player spending
    // residents move in while there are jobs (plus a starting pull); businesses open while there are free workers
    const want = { res: jobs + 16 - pop, biz: pop - jobs };
    s.grid.forEach((t, i) => {
      const z = own[i] === who && B[t] && B[t].zone, k = z === 'res' ? 'res' : 'biz';
      if (z && !st[i] && want[k] > 0 && Math.random() < (z === 'res' && hasTech(p, 'crafts') ? 0.45 : 0.3)) { s.grid[i] = z; want[k] -= 6; if (z === 'res') s.hl[i] = maxTier(p); if (UPGRADE[z]) s.bl[i] = Math.min(p.level || 0, PROD_K.length - 1); }
    });
    for (const k in needs) needs[k] = places ? needs[k] / places : 0;
    p.hist = p.hist || [];
    if (s.tick % 5 === 0) { // population groups and resources (r) for the charts
      p.hist.push({ t: s.tick, ...Object.fromEntries(Object.keys(GROUPS).map(g => [g, Math.round(d[g] * 10) / 10])), r: Object.fromEntries(HIST_RES.map(k => [k, Math.round((R[k] || 0) * 10) / 10])) });
      if (p.hist.length > 120) p.hist.shift();
    }
    Object.assign(p, { cure: cureOf(cnt, popOf(d)), pop, cap, growth: popOf(d) - before0, jobs, workers: Math.round(fo + Math.max(0, fOther)), wr: { off: wrOff, other: wrOther }, cov, fed, flow, needs, happy: hap });
  }
  for (const i in s.stock) if (!B[s.grid[i]] || !(B[s.grid[i]].prod || s.grid[i] === 'ind' || s.grid[i] === 'refinery' || s.grid[i] === 'smelter')) delete s.stock[i]; // building gone
  for (const i in s.spec) if (s.grid[i] !== 'ind' && s.grid[i] !== 'farm' && s.grid[i] !== 'smelter') delete s.spec[i];
  for (const i in s.breed) if (s.grid[i] !== 'farm') delete s.breed[i];
  for (const i in s.hl) if (!B[s.grid[i]] || !B[s.grid[i]].home) delete s.hl[i];
  for (const i in s.bl) if (!UPGRADE[s.grid[i]]) delete s.bl[i];
  for (const i in s.fire) if (!flammable(s.grid[i])) delete s.fire[i];
  for (const i in s.shopStock) if (s.grid[i] !== 'shop') delete s.shopStock[i];
  for (const i in s.route || {}) { const d = s.route[i]; if (!routable(s, +i) || s.grid[d] !== 'depot' || ownerOf(s, d) !== ownerOf(s, +i)) delete s.route[i]; } // a building or its depot gone
  delete s.hrs; // saves from when horses were assigned to buildings by hand
  s.ships = s.ships.filter(sh => isRoad(s.grid[sh.from]) && isRoad(s.grid[sh.to])); // a removed road loses the load
  s.undelivered = undelivered; s.starved = starved; s.noHorse = noHorse; s.full = full;
  s.status = compute(s); s.tick++;
}

// land changes move network borders, so the status is recomputed after a successful claim or purchase
const withStatus = (s, e) => { if (!e) s.status = compute(s); return e; };

// Applies a player action; returns an error string or null. recompute = false lets a caller placing many tiles recompute once.
function act(s, who, tool, i, recompute = true) {
  if (tool === 'upgrade') {
    const p = s.players[who];
    if (!p) return 'сначала выберите стартовый участок';
    const e = upgradeBlock(p); if (e) return e;
    p.level = (p.level || 0) + 1;
    const lv = levelOf(p);
    p.res.money -= lv.cost;
    for (const [k, v] of Object.entries(lv.rare || {})) p.res[k] -= v;
    return null;
  }
  if (!Number.isInteger(i) || i < 0 || i >= W * H) return 'неверная клетка';
  if (tool === 'claim') return withStatus(s, claim(s, who, i));
  if (tool === 'buy') return withStatus(s, buyArea(s, who, i, i));
  const p = s.players[who];
  if (!p || ownerOf(s, i) !== who) return 'это не ваш участок';
  const g = s.grid, t = g[i], R = p.res;
  const pay = cost => {
    for (const [k, v] of Object.entries(cost)) if (R[k] < v) return 'не хватает ' + RES_TEXT[k];
    for (const [k, v] of Object.entries(cost)) R[k] -= v;
    return null;
  };
  if (tool === 'bulldoze') {
    if (CLEAR[t]) return 'лес и камни убирает «Расчистить»';
    if (t === 'lake' || (t === 'grass' && !s.util[i])) return 'нечего сносить';
    const e = pay({ money: 2 }); if (e) return e;
    if (B[t]) for (const [k, v] of Object.entries(B[t].cost)) R[k] += Math.floor(v / 2);
    g[i] = (B[t] && B[t].ore) || 'grass'; s.util[i] = 0;
  } else if (tool === 'improve' && UPGRADE[t]) {
    const L = blOf(s, i) + 1;
    if (L >= PROD_K.length) return 'это здание уже на последнем уровне';
    if (L > (p.level || 0)) return `уровень ${L + 1} откроется в эпоху «${LEVELS[L].name}»`;
    const e = pay(upCost(t, L)); if (e) return e;
    (s.bl = s.bl || {})[i] = L;
  } else if (tool === 'improve') {
    if (!B[t] || !B[t].home) return 'улучшать можно жилые дома и производства';
    const next = HOME_TIERS[tierOf(s, i) + 1];
    if (!next) return 'это уже лучший дом';
    if (tierOf(s, i) + 1 > (p.level || 0)) return `«${next.name}» появится в эпоху «${LEVELS[tierOf(s, i) + 1].name}»`;
    const lock = techLock(p, next.tech); if (lock) return lock;
    const e = pay(next.cost); if (e) return e;
    (s.hl = s.hl || {})[i] = tierOf(s, i) + 1;
  } else if (tool === 'mine' || tool === 'well') {
    if (tool === 'mine' && t !== 'iron' && t !== 'gold') return 'рудник ставится на месторождение железа или золота';
    if (tool === 'well' && t !== 'oil') return 'нефтяная вышка ставится на месторождение нефти';
    const lock = techLock(p, B[tool].tech); if (lock) return lock;
    const e = pay(B[tool].cost); if (e) return e;
    g[i] = tool === 'well' ? 'oilwell' : t + 'mine';
    (s.bl = s.bl || {})[i] = Math.min(p.level || 0, PROD_K.length - 1);
  } else if (tool === 'clear') {
    const c = CLEAR[t];
    if (!c) return 'тут нечего расчищать';
    const e = pay({ money: c.cost }); if (e) return e;
    R[c.res] += 3; g[i] = 'grass';
  } else if (tool === 'power' || tool === 'pipe') {
    const bit = tool === 'power' ? POWER : WATER;
    const lock = techLock(p, B[tool].tech); if (lock) return lock;
    if (t === 'lake' || t === 'tree' || t === 'rock') return 'здесь нельзя прокладывать';
    if (s.util[i] & bit) return 'уже проложено';
    const e = pay(B[tool].cost); if (e) return e;
    s.util[i] |= bit;
  } else {
    if (!B[tool] || B[tool].grown) return 'неизвестный инструмент';
    const lock = techLock(p, B[tool].tech); if (lock) return lock;
    const over = (tool === 'cobble' && t === 'path') || (tool === 'road' && (t === 'path' || t === 'cobble'));
    if (t !== 'grass' && !over) return 'клетка занята'; // paving goes over a path, asphalt over cobblestone too
    const e = pay(B[tool].cost); if (e) return e;
    g[i] = tool;
    if (B[tool].home) (s.hl = s.hl || {})[i] = maxTier(p);
    if (UPGRADE[tool]) (s.bl = s.bl || {})[i] = Math.min(p.level || 0, PROD_K.length - 1);
  }
  if (recompute) s.status = compute(s);
  return null;
}

// Zones (or clears) every fitting tile of the player's land in the rectangle between corner tiles i and j; stops when resources run out.
function actArea(s, who, tool, i, j) {
  if (tool === 'buy') return withStatus(s, buyArea(s, who, i, j));
  const clear = tool === 'clear', improve = tool === 'improve';
  if (!clear && !improve && (!B[tool] || !B[tool].zone)) return 'выделять областью можно только зоны, расчистку, улучшение зданий и покупку земли';
  if (![i, j].every(k => Number.isInteger(k) && k >= 0 && k < W * H)) return 'неверная клетка';
  const x0 = Math.min(i % W, j % W), x1 = Math.max(i % W, j % W), y0 = Math.min(i / W | 0, j / W | 0), y1 = Math.max(i / W | 0, j / W | 0);
  let n = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const k = y * W + x;
    const fits = clear ? CLEAR[s.grid[k]] : improve ? canImprove(s, k, s.players[who]) : s.grid[k] === 'grass';
    if (!fits || ownerOf(s, k) !== who) continue;
    do { // homes go all the way up to the era's tier
      const e = act(s, who, tool, k, false);
      if (e) { if (n) s.status = compute(s); return e; }
      n++;
    } while (improve && canImprove(s, k, s.players[who])); // all the way up to the era's level
  }
  if (n) s.status = compute(s); // once for the whole rectangle, not per tile
  return n ? null : clear ? 'нечего расчищать на вашей земле' : improve ? 'тут нет зданий, которые можно улучшить в этой эпохе' : 'нет свободных клеток на вашей земле';
}

// A room runs one game for whoever hosts it (the Node server or a player's browser):
// who is online, the event log, game speed, and the commands players send.
const SPEEDS = [0, 1, 2, 4];
function room(s) {
  const r = { s, log: [], online: new Map(), carry: 0 }; // online: connection id -> { name, color }
  r.say = m => { r.log.unshift(m); r.log.length = Math.min(r.log.length, 10); };
  r.names = () => [...new Set([...r.online.values()].map(c => c.name))];
  r.join = (id, name) => r.online.set(id, { name: String(name || 'Гость').slice(0, 20), color: `hsl(${Math.random() * 360 | 0},70%,60%)` });
  r.leave = id => r.online.delete(id);
  // state for clients; one row per name even with several tabs open
  r.view = () => ({ ...r.s, log: r.log, online: [...new Map([...r.online.values()].map(c => [c.name, { name: c.name, color: r.s.players[c.name] ? r.s.players[c.name].color : c.color }])).values()] });
  // call every 500 ms; at speed 1 a tick happens every 2 s. Returns true if the game advanced.
  r.step = () => {
    r.carry += (r.s.speed ?? 1) / 4;
    if (r.carry < 1) return false;
    for (; r.carry >= 1; r.carry--) {
      // a player who left during the draft loses the turn, so the others aren't stuck waiting
      while (r.s.phase === 'draft' && !r.names().includes(r.s.order[r.s.turn])) { r.say(`${r.s.order[r.s.turn]} не в игре — ход переходит дальше`); nextTurn(r.s); }
      tick(r.s);
      for (const e of r.s.events) r.say(e);
    }
    return true;
  };
  r.handle = (who, m) => {
    who = String(who || 'Гость').slice(0, 20);
    m = m || {};
    const s = r.s;
    if (m.type === 'restart') {
      r.s = newGame(); r.s.status = compute(r.s); r.log.length = 0; r.say(`${who}: новый город`);
      return null;
    }
    if (m.type === 'start') {
      const names = r.names(), err = start(s, names);
      if (!err) r.say(names.length > 1 ? `Жеребьёвка! Порядок выбора участков: ${s.order.join(' → ')}` : 'Игра началась: выберите стартовый участок');
      return err;
    }
    if (m.type === 'spec') {
      const err = setSpec(s, who, m.i, String(m.v));
      if (!err) r.say(`${who}: ${FARM[m.v] ? 'ферма — ' + FARM[m.v].label.toLowerCase() : SMELT[m.v] ? 'металлургический завод выпускает ' + SMELT[m.v].label.toLowerCase() : 'завод выпускает ' + PRODUCTS[m.v].label.toLowerCase()}`);
      return err;
    }
    if (m.type === 'route') return setRoute(s, who, m.i, m.d);
    if (m.type === 'research') {
      const err = setResearch(s, who, String(m.v));
      if (!err) r.say(`${who}: исследует «${techOf(m.v).name}»`);
      return err;
    }
    if (m.type === 'speed') {
      if (!SPEEDS.includes(m.v)) return 'неверная скорость';
      s.speed = m.v; r.say(`${who}: ${m.v ? 'скорость ×' + m.v : 'пауза'}`);
      return null;
    }
    if (m.type === 'trade') {
      const err = trade(s, who, String(m.res), m.n, !!m.sell);
      if (!err) r.say(`${who}: ${m.sell ? 'продал' : 'купил'} на рынке ${m.n} ${RES_TEXT[m.res]}`);
      return err;
    }
    if (m.type === 'act') {
      const tool = String(m.tool), err = m.j !== undefined ? actArea(s, who, tool, m.i, m.j) : act(s, who, tool, m.i);
      const what = tool === 'upgrade' ? 'новая эпоха: ' + (s.players[who] && levelOf(s.players[who]).name)
        : { bulldoze: 'снос', claim: 'занял стартовый участок', buy: 'купил участок' }[tool] || (B[tool] && B[tool].needs && B[tool].label);
      if (!err && what) r.say(`${who}: ${what}`);
      return err;
    }
    return 'неизвестная команда';
  };
  return r;
}

const api = { W, H, B, NEED_TEXT, WANT_TEXT, POWER, WATER, START, LEVELS, levelOf, upgradeBlock, PRICES, SELL, RES_TEXT, trade, priceOf, mkOf, hasMarket, HIST_RES, CLEAR, startCorner, landOf, landPrice, newGame, start, nextTurn, compute, tick, act, actArea, wants, happiness, residents, commute, ownerOf, room, SPEEDS, LOAD, TRUCK_LOAD, PACE, roadNets, networks, PRODUCTS, SMELT, GROUPS, SEATS, pollution, polOf, DIRTY, dirtyShare, setSpec, popOf, demographics, TECH, TECH_COST, BRANCHES, techOf, hasTech, setResearch, allTech, FARM, HORSES_PER_FARM, horsesPerFarm, UTIL_ERA, isRoad, EVENT_P, FIRE_T, FIRE_PUT, FIRE_COVER, setEvents, startFire, disaster, cureOf, covered, slowAt, wornAt, ROAD_UPKEEP, PROD_K, UPGRADE, blOf, prodK, upCost, canImprove, improveCost, horseUse, setRoute, routable, depotFor, findRoute, HORSE_FOOD, BASE_CAP, DEPOT_CAP, depotCap, capOf, TRUCK_OIL, HOME_TIERS, tierOf, homeCap, maxTier };
if (typeof module !== 'undefined') module.exports = api; else window.Game = api;
