// Shared game logic: used by the server and loaded by the browser for definitions.
const W = 120, H = 84;
// needs: r = road nearby, p = power, w = water, t = forest within 2, k = rock within 2, l = lake adjacent
const B = {
  road:    { cost: { money: 5 }, label: 'Дорога', icon: '' },
  power:   { cost: { money: 5, wood: 1 }, label: 'ЛЭП', icon: '' },
  pipe:    { cost: { money: 5, stone: 1 }, label: 'Водопровод', icon: '' },
  // zones: cheap lots that develop on their own into res/off/ind once needs are met and there is demand
  zres:    { cost: { money: 10 }, needs: 'rpw', zone: 'res', label: 'Жилая зона', icon: 'zres' },
  zoff:    { cost: { money: 10 }, needs: 'rpw', zone: 'off', lvl: 2, label: 'Офисная зона', icon: 'zoff' },
  zind:    { cost: { money: 10 }, needs: 'rp', zone: 'ind', lvl: 1, label: 'Промзона', icon: 'zind' },
  res:     { cost: { money: 10 }, needs: 'rpw', grown: true, home: 6, label: 'Жилой дом', icon: '' },
  off:     { cost: { money: 10 }, needs: 'rpw', grown: true, jobs: 6, prod: { money: 4 }, label: 'Офис', icon: '' },
  ind:     { cost: { money: 10 }, needs: 'rp', grown: true, jobs: 8, prod: { money: 3 }, label: 'Завод', icon: '' },
  house:   { cost: { money: 50, wood: 10 }, needs: 'rpw', home: 8, label: 'Дом (до 8 жителей)', icon: 'house' },
  farm:    { cost: { money: 40, wood: 5 }, needs: 'rw', jobs: 4, prod: { food: 5 }, label: 'Ферма (еда)', icon: 'farm' },
  sawmill: { cost: { money: 60 }, needs: 'rpt', jobs: 4, prod: { wood: 2 }, label: 'Лесопилка (дерево)', icon: 'sawmill' },
  quarry:  { cost: { money: 80, wood: 10 }, needs: 'rpk', jobs: 4, prod: { stone: 1.5 }, label: 'Каменоломня (камень)', icon: 'quarry' },
  plant:   { cost: { money: 200, stone: 20 }, needs: 'r', upkeep: 3, label: 'Электростанция', icon: 'plant' },
  pump:    { cost: { money: 150, stone: 10 }, needs: 'rpl', upkeep: 2, label: 'Водокачка (у озера)', icon: 'pump' },
  shop:    { cost: { money: 100, wood: 10, stone: 10 }, needs: 'rpw', lvl: 1, jobs: 6, prod: { money: 6 }, label: 'Магазин (деньги)', icon: 'shop' },
  park:    { cost: { money: 30 }, label: 'Парк (радует жителей)', icon: 'park' },
  stop:    { cost: { money: 40 }, needs: 'r', upkeep: 1, label: 'Остановка (автобус до работы)', icon: 'stop' },
  // a mine is built on an ore deposit and turns into the matching mine; demolishing it leaves the deposit
  mine:    { cost: { money: 150, wood: 20 }, lvl: 1, label: 'Рудник (на месторождение)', icon: 'mine' },
  ironmine: { cost: { money: 150, wood: 20 }, needs: 'rp', grown: true, ore: 'iron', jobs: 5, prod: { iron: 1 }, label: 'Железный рудник', icon: 'mine' },
  goldmine: { cost: { money: 150, wood: 20 }, needs: 'rp', grown: true, ore: 'gold', jobs: 5, prod: { gold: 0.4 }, label: 'Золотой прииск', icon: 'mine' },
};
const NEED_TEXT = { r: 'нет дороги рядом', p: 'нет электричества', w: 'нет воды', t: 'нет леса рядом', k: 'нет камня рядом', l: 'нет озера рядом' };
const RES_TEXT = { money: 'денег', wood: 'дерева', stone: 'камня', food: 'еды', iron: 'железа', gold: 'золота' };
const POWER = 1, WATER = 2; // bits in s.util: lines/pipes lie on top of grass, roads and buildings

// Land is owned tile by tile: a player starts with a START x START square placed anywhere on the grid,
// builds only on own land and buys more next to it.
const START = 12;
const ownerOf = (s, i) => s.owner[i];
const landOf = (s, who) => s.owner.reduce((n, o) => n + (o === who), 0);
const landPrice = (s, who) => 3 + Math.floor(landOf(s, who) / 300); // per tile, grows as the city spreads
// Settlement levels: reaching the population and paying the cost moves a player up, allowing more land and new buildings (B[t].lvl).
// area: most tiles of land a level may own; rare: rare resources the upgrade costs on top of money
const LEVELS = [
  { name: 'Деревня', icon: 'village', area: START * START },
  { name: 'Посёлок', icon: 'town', pop: 30, cost: 300, area: 400 },
  { name: 'Город', icon: 'city', pop: 120, cost: 1000, rare: { iron: 20 }, area: 1000 },
  { name: 'Мегаполис', icon: 'metro', pop: 400, cost: 3000, rare: { iron: 50, gold: 20 }, area: 2500 },
];
const levelOf = p => LEVELS[p.level || 0];
// what still blocks moving to the next level, or null when it can be done
function upgradeBlock(p) {
  const next = LEVELS[(p.level || 0) + 1];
  if (!next) return 'это высший уровень';
  if (p.pop < next.pop) return `для уровня «${next.name}» нужно ${next.pop} жителей`;
  if (p.res.money < next.cost) return `для уровня «${next.name}» нужно ${next.cost} денег`;
  for (const [k, v] of Object.entries(next.rare || {})) if ((p.res[k] || 0) < v) return `для уровня «${next.name}» нужно ${v} ${RES_TEXT[k]}`;
  return null;
}
// Market: fixed money price per unit to buy (PRICES) or sell (SELL); rare resources can only be sold.
const PRICES = { wood: 4, stone: 6, food: 3 };
const SELL = { wood: 2, stone: 3, food: 1, iron: 15, gold: 40 };
function trade(s, who, res, n, sell = false) {
  const p = s.players[who], price = (sell ? SELL : PRICES)[res];
  if (!p) return 'сначала выберите стартовый участок';
  if (!price || !Number.isInteger(n) || n < 1 || n > 1000) return 'неверная сделка';
  if (sell) {
    if ((p.res[res] || 0) < n) return 'не хватает ' + RES_TEXT[res];
    p.res[res] -= n; p.res.money += price * n;
    return null;
  }
  if (p.res.money < price * n) return `не хватает денег: нужно ${price * n}`;
  p.res.money -= price * n; p.res[res] += n;
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
  const blob = (type, n, rad, density) => {
    for (let k = 0; k < n; k++) {
      const cx = r() * W, cy = r() * H, rr = 1.5 + r() * rad;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 < rr * rr && r() < density) grid[y * W + x] = type;
    }
  };
  blob('lake', 22, 4, 1); blob('tree', 76, 3.5, 0.75); blob('rock', 40, 2, 0.7);
  blob('iron', 12, 0.6, 0.7); blob('gold', 6, 0.3, 0.7); // rare deposits: small scattered clusters
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
  s.players[who] = { res: { money: 1000, wood: 40, stone: 50, food: 50, iron: 0, gold: 0 }, level: 0, pop: 0, jobs: 0, fed: true, delta: {}, color: COLORS[Object.keys(s.players).length % COLORS.length] };
  if (s.phase === 'draft') nextTurn(s);
  return null;
}

// Buys the not-yet-owned tiles of the rectangle between corner tiles i and j; it must touch the player's land.
function buyArea(s, who, i, j) {
  const p = s.players[who];
  if (!p) return 'сначала выберите стартовый участок';
  const tiles = rectTiles(Math.min(i % W, j % W), Math.min(i / W | 0, j / W | 0), Math.max(i % W, j % W), Math.max(i / W | 0, j / W | 0));
  if (tiles.some(k => s.owner[k] && s.owner[k] !== who)) return 'в выделении есть чужая земля';
  const fresh = tiles.filter(k => !s.owner[k]);
  if (!fresh.length) return 'эта земля уже ваша';
  if (!fresh.some(k => nb(k).some(n => s.owner[n] === who))) return 'новая земля должна примыкать к вашей';
  const lv = levelOf(p), have = landOf(s, who);
  if (have + fresh.length > lv.area) return `«${lv.name}» может владеть не больше ${lv.area} кл. земли (сейчас ${have}) — повысьте уровень`;
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

// Returns per-tile string of unmet needs ('' = working or not a building).
function compute(s) {
  const g = s.grid, road = i => nb(i).some(j => g[j] === 'road'), lake = i => nb(i).some(j => g[j] === 'lake');
  const powered = flood(s, g.flatMap((t, i) => t === 'plant' && road(i) ? [i] : []), POWER);
  const watered = flood(s, g.flatMap((t, i) => t === 'pump' && road(i) && powered.has(i) && lake(i) ? [i] : []), WATER);
  // zone lots only need a road within 3 tiles, so a big district fills in, not just its edge
  const ok = { r: i => B[g[i]].zone || B[g[i]].grown ? near(g, i, 'road', 3) : road(i), p: i => powered.has(i), w: i => watered.has(i), t: i => near(g, i, 'tree', 2), k: i => near(g, i, 'rock', 2), l: lake };
  return g.map((t, i) => isBuilding(t) ? [...B[t].needs].filter(c => !ok[c](i)).join('') : '');
}

// Which working homes can get to a job of their owner: on foot within 4 tiles, or by bus between
// stops (one within 3 tiles of the home, one within 3 tiles of a workplace) that stand on the same road network.
function commute(s, st = s.status || compute(s)) {
  const g = s.grid, comp = new Array(g.length).fill(-1);
  let c = 0;
  g.forEach((t, i) => { // label connected road networks
    if (t !== 'road' || comp[i] >= 0) return;
    const q = [i]; comp[i] = c;
    while (q.length) { const k = q.pop(); for (const j of nb(k)) if (g[j] === 'road' && comp[j] < 0) { comp[j] = c; q.push(j); } }
    c++;
  });
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
const WANT_TEXT = { food: 'Еда в городе', jobs: 'Работа для всех', work: 'Дорога до работы: пешком до 4 кл. или автобусом', shop: 'Магазин в 5 клетках', park: 'Парк в 4 клетках или лес рядом', quiet: 'Нет завода, станции или карьера в 3 клетках' };
const wants = (s, i, reach = commute(s)) => {
  const g = s.grid, p = s.players[ownerOf(s, i)] || { res: { food: 0 }, jobs: 0, pop: 1 };
  return {
    food: p.res.food > 0,
    jobs: p.jobs >= p.pop,
    work: reach.has(i),
    shop: near(g, i, 'shop', 5),
    park: near(g, i, 'park', 4) || near(g, i, 'tree', 2),
    quiet: !['ind', 'plant', 'quarry'].some(t => near(g, i, t, 3)),
  };
};
const share = w => Object.values(w).filter(Boolean).length / Object.keys(WANT_TEXT).length;
const happiness = (s, i, reach) => share(wants(s, i, reach));
// a working home is 40% full when no needs are met and full when all are
const fill = (s, i, h) => s.status && s.status[i] ? 0 : Math.round(B[s.grid[i]].home * (0.4 + 0.6 * h));
const residents = (s, i, reach) => fill(s, i, happiness(s, i, reach));
const short = t => B[t].label.replace(/ \(.*\)/, '');

function tick(s) {
  const st = compute(s), own = s.grid.map((_, i) => ownerOf(s, i));
  s.status = st;
  const reach = commute(s, st);
  for (const [who, p] of Object.entries(s.players)) {
    const cnt = {}, needs = Object.fromEntries(Object.keys(WANT_TEXT).map(k => [k, 0]));
    let pop = 0, workers = 0, places = 0, happy = 0;
    s.grid.forEach((t, i) => {
      if (own[i] !== who || st[i] || !B[t]) return;
      cnt[t] = (cnt[t] || 0) + 1;
      if (!B[t].home) return;
      const w = wants(s, i, reach), h = share(w), n = fill(s, i, h);
      pop += n; if (w.work) workers += n;
      places += B[t].home; happy += h * B[t].home;
      for (const k in w) needs[k] += w[k] ? B[t].home : 0;
    });
    const jobs = Object.entries(cnt).reduce((n, [t, c]) => n + c * (B[t].jobs || 0), 0);
    const wr = jobs ? Math.min(1, workers / jobs) : 0, R = p.res; // share of jobs filled by residents who can get there
    const before = { ...R }, flow = Object.fromEntries(Object.keys(R).map(k => [k, []]));
    const add = (k, what, v) => { if (v) { R[k] += v; flow[k].push([what, v]); } };
    for (const [t, n] of Object.entries(cnt)) {
      for (const [k, v] of Object.entries(B[t].prod || {})) add(k, `${short(t)} ×${n}`, n * v * wr);
      if (B[t].upkeep) add('money', `Содержание: ${short(t)} ×${n}`, -n * B[t].upkeep);
    }
    add('food', `Жители едят (${pop})`, -pop * 0.2);
    const fed = R.food > 0; if (!fed) R.food = 0;
    add('money', `Налоги (${pop} жит.)${fed ? '' : ' — голод, ×0.3'}`, pop * 0.5 * (fed ? 1 : 0.3));
    p.delta = Object.fromEntries(Object.keys(R).map(k => [k, R[k] - before[k]])); // economy only, not player spending
    // residents move in while there are jobs (plus a starting pull); businesses open while there are free workers
    const want = { res: jobs + 16 - pop, biz: pop - jobs };
    s.grid.forEach((t, i) => {
      const z = own[i] === who && B[t] && B[t].zone, k = z === 'res' ? 'res' : 'biz';
      if (z && !st[i] && want[k] > 0 && Math.random() < 0.3) { s.grid[i] = z; want[k] -= 6; }
    });
    for (const k in needs) needs[k] = places ? needs[k] / places : 0;
    Object.assign(p, { pop, jobs, workers, fed, flow, needs, happy: places ? happy / places : 0 });
  }
  s.status = compute(s); s.tick++;
}

// Applies a player action; returns an error string or null.
function act(s, who, tool, i) {
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
  if (tool === 'claim') return claim(s, who, i);
  if (tool === 'buy') return buyArea(s, who, i, i);
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
  } else if (tool === 'mine') {
    if (t !== 'iron' && t !== 'gold') return 'рудник ставится на месторождение железа или золота';
    if ((p.level || 0) < B.mine.lvl) return `откроется на уровне «${LEVELS[B.mine.lvl].name}»`;
    const e = pay(B.mine.cost); if (e) return e;
    g[i] = t + 'mine';
  } else if (tool === 'clear') {
    const c = CLEAR[t];
    if (!c) return 'тут нечего расчищать';
    const e = pay({ money: c.cost }); if (e) return e;
    R[c.res] += 3; g[i] = 'grass';
  } else if (tool === 'power' || tool === 'pipe') {
    const bit = tool === 'power' ? POWER : WATER;
    if (t === 'lake' || t === 'tree' || t === 'rock') return 'здесь нельзя прокладывать';
    if (s.util[i] & bit) return 'уже проложено';
    const e = pay(B[tool].cost); if (e) return e;
    s.util[i] |= bit;
  } else {
    if (!B[tool] || B[tool].grown) return 'неизвестный инструмент';
    if ((B[tool].lvl || 0) > (p.level || 0)) return `откроется на уровне «${LEVELS[B[tool].lvl].name}»`;
    if (t !== 'grass') return 'клетка занята';
    const e = pay(B[tool].cost); if (e) return e;
    g[i] = tool;
  }
  s.status = compute(s);
  return null;
}

// Zones (or clears) every fitting tile of the player's land in the rectangle between corner tiles i and j; stops when resources run out.
function actArea(s, who, tool, i, j) {
  if (tool === 'buy') return buyArea(s, who, i, j);
  const clear = tool === 'clear';
  if (!clear && (!B[tool] || !B[tool].zone)) return 'выделять областью можно только зоны, расчистку и покупку земли';
  if (![i, j].every(k => Number.isInteger(k) && k >= 0 && k < W * H)) return 'неверная клетка';
  const x0 = Math.min(i % W, j % W), x1 = Math.max(i % W, j % W), y0 = Math.min(i / W | 0, j / W | 0), y1 = Math.max(i / W | 0, j / W | 0);
  let n = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const k = y * W + x;
    if ((clear ? !CLEAR[s.grid[k]] : s.grid[k] !== 'grass') || ownerOf(s, k) !== who) continue;
    const e = act(s, who, tool, k);
    if (e) return e;
    n++;
  }
  return n ? null : clear ? 'нечего расчищать на вашей земле' : 'нет свободных клеток на вашей земле';
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
      const what = tool === 'upgrade' ? 'теперь ' + (s.players[who] && levelOf(s.players[who]).name)
        : { bulldoze: 'снос', claim: 'занял стартовый участок', buy: 'купил участок' }[tool] || (B[tool] && B[tool].needs && B[tool].label);
      if (!err && what) r.say(`${who}: ${what}`);
      return err;
    }
    return 'неизвестная команда';
  };
  return r;
}

const api = { W, H, B, NEED_TEXT, WANT_TEXT, POWER, WATER, START, LEVELS, levelOf, upgradeBlock, PRICES, SELL, RES_TEXT, trade, CLEAR, startCorner, landOf, landPrice, newGame, start, nextTurn, compute, tick, act, actArea, wants, happiness, residents, commute, ownerOf, room, SPEEDS };
if (typeof module !== 'undefined') module.exports = api; else window.Game = api;
