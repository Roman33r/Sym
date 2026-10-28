// Run: node game.test.js
const assert = require('assert');
const G = require('./game');
const s = G.newGame(1);
s.grid.fill('grass');
const W = G.W;
// one player: no real draw; a click at tile 0 takes the 12x12 square in the corner (x 0..11, y 0..11)
assert.strictEqual(G.act(s, 'A', 'claim', 0), 'сначала нажмите «Начать игру»');
assert.strictEqual(G.start(s, ['A']), null);
assert.strictEqual(G.act(s, 'A', 'claim', 0), null);
assert.strictEqual(s.phase, 'play');
s.players.A.res = { money: 9999, wood: 999, stone: 999, food: 50, iron: 0, gold: 0, asphalt: 999 };
s.players.A.level = 3; s.players.A.tech = G.allTech(); // Новое время, everything researched: power and water are hard needs; eras are tested below
s.grid[0] = 'lake';
for (let x = 0; x < 6; x++) assert.strictEqual(G.act(s, 'A', 'road', W + x), null);
assert.strictEqual(G.act(s, 'A', 'pump', 1), null);
assert.strictEqual(G.act(s, 'A', 'plant', 2), null);
assert.strictEqual(G.act(s, 'A', 'house', 4), null);
assert.strictEqual(s.status[4], 'pw', 'house without lines lacks power and water');
G.act(s, 'A', 'power', 3); G.act(s, 'A', 'pipe', 3);
assert.strictEqual(G.act(s, 'A', 'pipe', 3), 'уже проложено');
assert.strictEqual(G.act(s, 'A', 'house', 2), 'клетка занята');
G.tick(s);
assert.deepStrictEqual([s.status[1], s.status[2], s.status[4]], ['', '', '']);
// homes: built in Новое время the house is a block of flats (24); food and jobs (0 >= 0) met, no workplace,
// shop or park, power plant next door: room for 24 * (0.4 + 0.6 * 2/6)
const A = s.players.A;
assert.strictEqual(G.tierOf(s, 4), 3);
assert.strictEqual(A.cap, 14);
assert.ok(A.pop >= 1 && A.pop <= A.cap, 'people move in gradually'); // the first newcomers
// that tick's change: tax 0.5 per resident minus plant (3) and pump (2) upkeep; residents eat 0.2 each
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, a + ' ≈ ' + b);
near(A.delta.money, A.pop * 0.5 - 3 - 2);
near(A.delta.food, -A.pop * 0.2);
// now the residents have 0 jobs, so the jobs need fails too
assert.deepStrictEqual(G.wants(s, 4), { food: true, jobs: false, work: false, shop: false, park: false, quiet: false });
s.grid[W * 2 + 7] = 'park'; s.grid[W * 2 + 9] = 'shop'; // the shop is 5 tiles away: counts as a shop nearby, too far to walk to as a job
assert.strictEqual(G.happiness(s, 4), 0.5);
s.grid[W * 2 + 7] = s.grid[W * 2 + 9] = 'grass';
const money = s.players.A.res.money;
assert.strictEqual(G.act(s, 'A', 'bulldoze', 4), null);
assert.strictEqual(s.players.A.res.money, money - 2 + 25);
assert.strictEqual(G.act(s, 'A', 'res', 6), 'неизвестный инструмент');
// residential zone next to the powered/watered house slot grows into a home
assert.strictEqual(G.act(s, 'A', 'zres', 4), null);
for (let k = 0; k < 50 && s.grid[4] !== 'res'; k++) G.tick(s);
assert.strictEqual(s.grid[4], 'res');
G.tick(s);
assert.strictEqual(G.tierOf(s, 4), 3, 'a zone home grows at the tier of the era');
assert.ok(A.cap >= 10 && A.cap <= 24, 'and has room for 40..100% of its 24 places');
// an office zone grows once there are free workers
assert.strictEqual(G.act(s, 'A', 'zoff', 5), null);
for (let k = 0; k < 50 && s.grid[5] !== 'off'; k++) G.tick(s);
assert.strictEqual(s.grid[5], 'off');
// area zoning skips occupied tiles: row 2 cols 0..6 holds 7 free grass tiles
assert.strictEqual(G.actArea(s, 'A', 'zind', 2 * W + 6, 2 * W), null);
assert.strictEqual(s.grid.slice(2 * W, 2 * W + 7).filter(t => t === 'zind').length, 7);
assert.deepStrictEqual(s.status, G.compute(s), 'status is recomputed once after the whole rectangle');
assert.strictEqual(G.actArea(s, 'A', 'zind', 2 * W, 2 * W + 6), 'нет свободных клеток на вашей земле');
assert.strictEqual(G.actArea(s, 'A', 'house', 30, 31), 'выделять областью можно только зоны, расчистку, улучшение домов и покупку земли');
// zone lots accept a road up to 3 tiles away, plain buildings need it adjacent (road is row 1)
s.grid[4 * W + 3] = 'zres'; s.grid[5 * W + 3] = 'zres'; s.grid[4 * W + 1] = 'farm';
const st = G.compute(s);
assert.ok(!st[4 * W + 3].includes('r') && st[5 * W + 3].includes('r') && st[4 * W + 1].includes('r'));
s.players.A.res.money = 15;
assert.strictEqual(G.actArea(s, 'A', 'zres', 3 * W, 3 * W + 3), 'не хватает денег');
assert.strictEqual(s.grid[3 * W], 'zres');
s.players.A.res.money = 0;
assert.strictEqual(G.act(s, 'A', 'road', 6 * W + 6), 'не хватает денег');
assert.strictEqual(G.act(s, 'A', 'road', 30), 'это не ваш участок');

// buying land: a rectangle touching own land, priced per new tile
s.players.A.res.money = 500;
assert.strictEqual(G.act(s, 'A', 'buy', 30), 'новая земля должна примыкать к вашей');
assert.strictEqual(G.actArea(s, 'A', 'buy', 12, W + 13), null); // 2x2 right of the start square
assert.strictEqual(s.players.A.res.money, 500 - 4 * 3);
assert.strictEqual(G.landOf(s, 'A'), 148);
assert.strictEqual(G.actArea(s, 'A', 'buy', 0, 13), 'эта земля уже ваша');
// power stops at the border with someone else's land
const t = G.newGame(2);
t.grid.fill('grass');
G.start(t, ['A', 'B'], () => 0); // draw with fixed random: order becomes [B, A]
assert.deepStrictEqual(t.order, ['B', 'A']);
assert.strictEqual(G.act(t, 'A', 'claim', 0), 'сейчас выбирает B');
assert.strictEqual(G.act(t, 'B', 'claim', 18), null); // square x 12..23
assert.strictEqual(G.act(t, 'A', 'claim', 18), 'там уже чужая земля — выберите место правее, левее или дальше');
assert.strictEqual(G.act(t, 'A', 'claim', 0), null); // square x 0..11, right next to B
for (const n of ['A', 'B']) Object.assign(t.players[n], { level: 3, tech: G.allTech(), res: { ...t.players[n].res, asphalt: 99 } });
assert.strictEqual(t.phase, 'play');
assert.strictEqual(G.actArea(t, 'A', 'buy', 11, 12), 'в выделении есть чужая земля');
G.act(t, 'A', 'road', W + 10); G.act(t, 'A', 'plant', 10); G.act(t, 'A', 'power', 11);
G.act(t, 'B', 'road', W + 13); G.act(t, 'B', 'house', 13); // A's line at x 11 and B's at x 12 touch across the border
G.act(t, 'B', 'power', 12);
assert.ok(G.compute(t)[13].includes('p'), 'power must not cross into B');
// levels: a village owns only its start square and has no shops; upgrading needs residents and money
const v = G.newGame(3);
v.grid.fill('grass');
G.start(v, ['V']); G.act(v, 'V', 'claim', 0);
const V = v.players.V;
assert.strictEqual(G.act(v, 'V', 'shop', 5), 'нужно исследование «Зодчество»');
assert.strictEqual(G.act(v, 'V', 'road', 7), 'нужно исследование «Нефтепереработка»');
assert.strictEqual(G.act(v, 'V', 'path', 7), null); // the first eras only have paths
assert.strictEqual(G.act(v, 'V', 'buy', 12), 'нужно исследование «Разведка»');
V.tech.explore = true;
assert.strictEqual(G.act(v, 'V', 'buy', 12), '«Древность» может владеть не больше 144 кл. земли (сейчас 144) — нужна следующая эпоха');
assert.strictEqual(G.act(v, 'V', 'upgrade', 0), 'для эпохи «Средневековье» нужно изучить: Земледелие, Письменность, Ремёсла, Община');
V.tech = G.allTech(); // research itself is tested below
assert.strictEqual(G.act(v, 'V', 'upgrade', 0), 'для эпохи «Средневековье» нужно 30 жителей');
V.pop = 30; V.res.money = 299;
assert.strictEqual(G.act(v, 'V', 'upgrade', 0), 'для эпохи «Средневековье» нужно 300 денег');
V.res.money = 1000;
assert.strictEqual(G.act(v, 'V', 'upgrade', 0), null);
assert.strictEqual(V.level, 1); assert.strictEqual(V.res.money, 700);
assert.strictEqual(G.act(v, 'V', 'shop', 5), null);
assert.strictEqual(G.act(v, 'V', 'buy', 12), null);
assert.strictEqual(G.act(v, 'V', 'upgrade', 0), 'для эпохи «Индустриальная эпоха» нужно 120 жителей');
// market and clearing
assert.strictEqual(G.trade(v, 'V', 'wood', 10), null);
assert.strictEqual(V.res.wood, 40 - 10 + 10); assert.strictEqual(V.res.money, 700 - 100 - 3 - 40); // shop 100 (+10 wood), 1 tile of land 3, then 10 wood at 4
assert.strictEqual(G.trade(v, 'V', 'gold', 1), 'неверная сделка');
assert.strictEqual(G.trade(v, 'V', 'food', 1.5), 'неверная сделка');
assert.strictEqual(G.trade(v, 'V', 'stone', 1000), 'не хватает денег: нужно 6000');
assert.strictEqual(G.trade(v, 'nobody', 'wood', 1), 'сначала выберите стартовый участок');
v.grid[2 * W + 1] = 'tree'; v.grid[2 * W + 2] = 'tree'; v.grid[2 * W + 3] = 'rock';
assert.strictEqual(G.act(v, 'V', 'bulldoze', 2 * W + 1), 'лес и камни убирает «Расчистить»');
assert.strictEqual(G.act(v, 'V', 'clear', 2 * W + 1), null);
assert.strictEqual(v.grid[2 * W + 1], 'grass'); assert.strictEqual(V.res.wood, 43);
assert.strictEqual(G.act(v, 'V', 'clear', 2 * W + 1), 'тут нечего расчищать');
const m0 = V.res.money;
assert.strictEqual(G.actArea(v, 'V', 'clear', 2 * W, 2 * W + 7), null); // one tree (5) and one rock (10)
assert.strictEqual(V.res.money, m0 - 15); assert.strictEqual(v.grid[2 * W + 3], 'grass');
assert.strictEqual(G.actArea(v, 'V', 'clear', 2 * W, 2 * W + 7), 'нечего расчищать на вашей земле');
// rare resources: a mine goes on a deposit, demolishing it leaves the deposit; ore sells on the market and pays for levels
assert.strictEqual(G.act(v, 'V', 'mine', 5 * W + 5), 'рудник ставится на месторождение железа или золота');
v.grid[5 * W + 5] = 'iron';
assert.strictEqual(G.act(v, 'V', 'mine', 5 * W + 5), null);
assert.strictEqual(v.grid[5 * W + 5], 'ironmine');
assert.strictEqual(G.act(v, 'V', 'bulldoze', 5 * W + 5), null);
assert.strictEqual(v.grid[5 * W + 5], 'iron');
V.res.iron = 5; const m1 = V.res.money; V.tech.globaltrade = false;
assert.strictEqual(G.trade(v, 'V', 'iron', 5, true), null);
assert.strictEqual(V.res.money, m1 + 75); assert.strictEqual(V.res.iron, 0);
V.res.iron = 2; V.tech.globaltrade = true; // global trade sells 1.5 times dearer
assert.strictEqual(G.trade(v, 'V', 'iron', 2, true), null);
assert.strictEqual(V.res.money, m1 + 75 + 45);
assert.strictEqual(G.trade(v, 'V', 'iron', 1, true), 'не хватает железа');
V.pop = 120; V.res.money = 5000;
assert.strictEqual(G.act(v, 'V', 'upgrade', 0), 'для эпохи «Индустриальная эпоха» нужно 20 железа');
V.res.iron = 20;
assert.strictEqual(G.act(v, 'V', 'upgrade', 0), null);
assert.strictEqual(V.res.iron, 0); assert.strictEqual(V.res.money, 4000);
// commuting: a home 7 tiles from the only workplace needs a bus between two stops on one road network
const c = G.newGame(4);
c.grid.fill('grass');
G.start(c, ['C']); G.act(c, 'C', 'claim', 0);
const ok = c.grid.map(() => ''); // pretend every building has power, water and road, to test only the trip
c.grid[0] = 'house'; c.grid[7 * W + 7] = 'farm';
assert.ok(!G.commute(c, ok).has(0), 'too far to walk');
c.grid[3 * W + 3] = 'farm';
assert.ok(G.commute(c, ok).has(0), 'walks to a farm 3 tiles away');
c.grid[3 * W + 3] = 'grass';
for (let x = 0; x < 8; x++) c.grid[W + x] = 'road';
for (let y = 1; y < 8; y++) c.grid[y * W + 6] = 'road';
c.grid[2] = 'stop'; c.grid[6 * W + 5] = 'stop';
assert.ok(G.commute(c, ok).has(0), 'rides the bus');
c.grid[W + 4] = 'grass';
assert.ok(!G.commute(c, ok).has(0), 'stops on separate road networks');
// room: commands, speed and the draft skip for players who left
const r = G.room(G.newGame(5));
r.join('a', 'Аня'); r.join('b', 'Боря');
assert.strictEqual(r.handle('Аня', { type: 'speed', v: 3 }), 'неверная скорость');
assert.strictEqual(r.handle('Аня', { type: 'speed', v: 0 }), null);
assert.strictEqual(r.step() || r.step() || r.step() || r.step(), false, 'paused game does not tick');
assert.strictEqual(r.handle('Аня', { type: 'speed', v: 4 }), null);
assert.strictEqual(r.handle('Аня', { type: 'start' }), null);
assert.deepStrictEqual([...r.s.order].sort(), ['Аня', 'Боря']);
r.leave(r.s.order[0] === 'Аня' ? 'a' : 'b');
assert.strictEqual(r.step(), true);
assert.strictEqual(r.s.turn, 1, 'the player who left was skipped');
assert.strictEqual(r.handle('x', { type: 'nope' }), 'неизвестная команда');
assert.strictEqual(r.handle('Аня', { type: 'restart' }), null);
assert.strictEqual(r.s.phase, 'lobby'); assert.strictEqual(r.log[0], 'Аня: новый город');
// goods travel by truck: a farm fills its stock, without a depot nothing leaves, with one the load arrives later
const d = G.newGame(6);
d.grid.fill('grass');
G.start(d, ['D']); G.act(d, 'D', 'claim', 0);
const DP = d.players.D;
DP.res = { money: 1e5, wood: 1e3, stone: 1e3, food: 100, iron: 0, gold: 0, asphalt: 99 }; DP.tech = G.allTech();
d.grid[0] = 'lake';
for (let x = 0; x < 12; x++) G.act(d, 'D', 'road', W + x);
G.act(d, 'D', 'pump', 1); G.act(d, 'D', 'plant', 2); G.act(d, 'D', 'farm', 3); G.act(d, 'D', 'house', 4);
for (let k = 0; k < 4; k++) G.tick(d);
assert.ok(d.undelivered.includes(3) && !d.ships.length, 'no depot: the farm keeps its goods');
assert.ok(d.stock[3] >= G.LOAD);
assert.strictEqual(G.act(d, 'D', 'depot', 10), null);
G.tick(d);
assert.strictEqual(d.ships.length, 1);
const sh = d.ships[0];
assert.deepStrictEqual([sh.res, sh.n, sh.from, sh.to, sh.at - sh.t0], ['food', 8, W + 3, W + 10, 4]); // 7 tiles at 2 per tick
for (let k = 0; k < 4; k++) G.tick(d);
assert.ok(DP.flow.food.some(([what, v]) => what.startsWith('Привезли') && v === 8), 'the load arrived on the 4th tick');
assert.ok(!d.ships.some(x => x.id === sh.id));
// demographics: kids grow up with school if there are seats, the university gives degrees, hospitals halve deaths
const dm = { kids: 30, none: 0, school: 80, higher: 0, old: 50 };
G.demographics(dm, G.popOf(dm), { school: 1, uni: 1, hospital: 1 }, 1); // homes exactly full: nobody arrives or leaves
assert.ok(dm.none < 1e-9 && dm.school > 78, 'the grown-up kid went to school');
assert.ok(dm.higher > 1.4, 'the university turned out graduates');
const dn = { kids: 30, none: 0, school: 0, higher: 0, old: 50 };
G.demographics(dn, G.popOf(dn), {}, 1);
assert.ok(dn.none > 0.99 && dn.school === 0, 'no school: kids grow up without education');
assert.ok(dn.old < dm.old, 'without a hospital more pensioners die');
// production chain: a factory makes furniture from wood, trucks take it to the depot, then to the shop, which sells it
const f = G.newGame(8);
f.grid.fill('grass');
G.start(f, ['F']); G.act(f, 'F', 'claim', 0);
const FP = f.players.F;
FP.level = 2; FP.tech = G.allTech(); FP.res = { money: 1e5, wood: 500, stone: 1e3, food: 500, iron: 0, gold: 0, asphalt: 99 };
f.grid[0] = 'lake';
for (let x = 0; x < 12; x++) G.act(f, 'F', 'road', W + x);
G.act(f, 'F', 'pump', 1); G.act(f, 'F', 'plant', 2); f.grid[3] = 'ind';
for (const x of [4, 5, 6, 7]) G.act(f, 'F', 'house', x);
G.act(f, 'F', 'shop', 8); G.act(f, 'F', 'depot', 10);
assert.strictEqual(G.setSpec(f, 'F', 3, 'gold-bars'), 'неизвестный товар');
assert.strictEqual(G.setSpec(f, 'F', 4, 'furniture'), 'выпуск настраивается только у завода или фермы');
assert.strictEqual(G.setSpec(f, 'Z', 3, 'furniture'), 'это не ваш участок');
assert.strictEqual(G.setSpec(f, 'F', 3, 'furniture'), null);
let toDepot = false, toShop = false, sale = false;
for (let k = 0; k < 120 && !sale; k++) {
  G.tick(f);
  toDepot = toDepot || FP.flow.furniture.some(([w]) => w.startsWith('Привезли'));
  toShop = toShop || FP.flow.furniture.some(([w]) => w === 'Отправлено в магазины');
  sale = FP.flow.money.some(([w]) => w.startsWith('Магазины продали'));
}
assert.ok(toDepot && toShop && sale, `furniture reached the depot (${toDepot}), went to the shop (${toShop}) and sold (${sale})`);
assert.ok(FP.res.wood < 500, 'the factory used wood');
assert.ok(FP.hist.length > 0 && 'higher' in FP.hist[0], 'population history is kept for the chart');
// offices only take people with a degree
const o = { ...FP, demo: { kids: 0, none: 50, school: 50, higher: 0, old: 0 } };
f.players.F = o; f.grid[9] = 'off'; G.tick(f);
assert.strictEqual(o.wr.off, 0, 'nobody with a degree, so offices stay empty');
// pollution fades with distance from the factory
o.tech.ecology = false;
const pl = G.pollution(f);
assert.ok(pl[3] >= 1 && pl[3 + 7] < pl[3] && pl[6 * W + 60] === 0);
o.tech.ecology = true; // ecology halves the owner's pollution
assert.ok(Math.abs(G.pollution(f)[3] - pl[3] / 2) < 1e-6);
// research: points pile up each tick; a study needs its era and the same branch's study before it
const rs = G.room(G.newGame(9));
rs.s.grid.fill('grass'); rs.join('x', 'R');
rs.handle('R', { type: 'start' }); rs.handle('R', { type: 'act', tool: 'claim', i: 0 });
assert.strictEqual(rs.handle('R', { type: 'research', v: 'trade' }), 'откроется в эпоху «Средневековье»');
assert.strictEqual(rs.handle('R', { type: 'research', v: 'nope' }), 'неизвестное исследование');
assert.strictEqual(rs.handle('R', { type: 'research', v: 'explore' }), null);
for (let k = 0; k < 400 && !G.hasTech(rs.s.players.R, 'explore'); k++) { rs.s.speed = 4; rs.step(); }
assert.ok(G.hasTech(rs.s.players.R, 'explore'), 'the study finished');
assert.ok(rs.log.some(l => l.includes('изучено «Разведка»')), 'and the log says so');
rs.s.players.R.level = 1;
assert.strictEqual(rs.handle('R', { type: 'research', v: 'post' }), 'сначала изучите «Община»');
assert.strictEqual(rs.handle('R', { type: 'research', v: 'explore' }), 'уже изучено');

// paths are roads but twice as slow; without engines every load needs a free horse
const h = G.newGame(10);
h.grid.fill('grass');
G.start(h, ['H']); G.act(h, 'H', 'claim', 0);
const HP = h.players.H;
HP.res = { ...HP.res, money: 1e5, wood: 1e3, stone: 1e3 };
for (let x = 0; x < 12; x++) G.act(h, 'H', 'path', W + x);
G.act(h, 'H', 'farm', 2); G.act(h, 'H', 'depot', 10); h.grid[3] = 'zres'; h.grid[4] = 'zres';
h.stock = {}; h.stock[2] = G.LOAD;
G.tick(h);
assert.ok(h.noHorse.includes(2) && !h.ships.length, 'no horse: the load waits');
HP.res.horses = 1; h.stock[2] = G.LOAD;
G.tick(h);
assert.strictEqual(h.ships.length, 1);
assert.ok(h.ships[0].horse && h.ships[0].at - h.ships[0].t0 === 8, 'a cart over 8 path tiles takes 8 ticks'); // 16 cost units at 2 per tick
// livestock farms raise horses, two per farm at most
assert.strictEqual(G.setSpec(h, 'H', 2, 'livestock'), 'нужно исследование «Земледелие»');
HP.tech.agriculture = true;
assert.strictEqual(G.setSpec(h, 'H', 2, 'livestock'), null);
HP.demo = { kids: 0, none: 40, school: 0, higher: 0, old: 0 }; // enough farm hands
for (let k = 0; k < 200; k++) G.tick(h);
assert.strictEqual(HP.res.horses, G.HORSES_PER_FARM, 'the herd stops at two');
// the livestock farm ships its food with its own carts even with no free horse
HP.res.horses = 0; h.ships = []; h.stock[2] = G.LOAD;
G.tick(h);
assert.ok(h.ships.length === 1 && h.ships[0].horse && h.ships[0].own && !h.noHorse.includes(2), 'own cart, no waiting');
HP.res.horses = 2;
assert.deepStrictEqual(G.horseUse(h, 'H'), { total: 2, trams: 0, carts: 0, free: 2, cap: 2 }, 'own carts keep the pool free');
// a horse-tram stop needs one of those horses
h.grid[8] = 'stop';
HP.res.horses = 0;
assert.ok(G.compute(h)[8].includes('h'));
HP.res.horses = 1;
assert.ok(!G.compute(h)[8].includes('h'));
// oil: the well goes on a deposit, the refinery makes asphalt, asphalt roads can replace paths
HP.tech = G.allTech();
h.grid[6] = 'oil';
assert.strictEqual(G.act(h, 'H', 'well', 7), 'нефтяная вышка ставится на месторождение нефти');
assert.strictEqual(G.act(h, 'H', 'well', 6), null);
assert.strictEqual(h.grid[6], 'oilwell');
HP.res.iron = 50; HP.res.oil = 30;
assert.strictEqual(G.act(h, 'H', 'refinery', 9), null);
for (let k = 0; k < 10; k++) G.tick(h);
assert.ok(HP.res.oil < 30 && h.stock[9] > 0, 'the refinery turned oil into asphalt');
assert.strictEqual(G.act(h, 'H', 'road', W + 5), 'не хватает асфальта');
HP.res.asphalt = 1;
assert.strictEqual(G.act(h, 'H', 'road', W + 5), null);
assert.strictEqual(h.grid[W + 5], 'road');
// home tiers: a home is built at the era's tier and older homes can be raised to it
const hm = G.newGame(11);
hm.grid.fill('grass');
G.start(hm, ['M']); G.act(hm, 'M', 'claim', 0);
const MP = hm.players.M;
MP.tech = G.allTech(); MP.tech.skyscrapers = false; MP.res = { ...MP.res, money: 1e5, wood: 1e3, stone: 1e3, iron: 1e3 };
assert.strictEqual(G.act(hm, 'M', 'house', 5), null);
assert.strictEqual(G.tierOf(hm, 5), 0, 'Древность builds huts');
assert.strictEqual(G.homeCap(hm, 5), 4);
assert.strictEqual(G.act(hm, 'M', 'improve', 5), '«Фахверковый дом» появится в эпоху «Средневековье»');
MP.level = 1;
const mm = MP.res.money;
assert.strictEqual(G.act(hm, 'M', 'improve', 5), null);
assert.deepStrictEqual([G.tierOf(hm, 5), G.homeCap(hm, 5), MP.res.money], [1, 8, mm - 40]);
assert.strictEqual(G.act(hm, 'M', 'improve', 6), 'улучшать можно только жилые дома');
G.act(hm, 'M', 'house', 7); G.act(hm, 'M', 'house', 8); // built in Средневековье: already half-timbered
assert.strictEqual(G.tierOf(hm, 7), 1);
MP.level = 4;
assert.strictEqual(G.actArea(hm, 'M', 'improve', 0, 10), null); // the whole row up to the era's tier
assert.deepStrictEqual([5, 7, 8].map(i => G.tierOf(hm, i)), [3, 3, 3], 'without skyscrapers the block of flats is the top');
assert.strictEqual(G.act(hm, 'M', 'improve', 5), 'нужно исследование «Небоскрёбы»');
MP.tech.skyscrapers = true;
assert.strictEqual(G.act(hm, 'M', 'improve', 5), null);
assert.strictEqual(G.homeCap(hm, 5), 40);
assert.strictEqual(G.act(hm, 'M', 'improve', 5), 'это уже лучший дом');
assert.strictEqual(G.act(hm, 'M', 'bulldoze', 5), null);
G.tick(hm);
assert.ok(!(5 in hm.hl), 'a demolished home forgets its tier');
console.log('ok');
