// Run: node game.test.js
const assert = require('assert');
const G = require('./game');
G.setEvents(false); // random fires and disasters would make the checks below flaky; events are tested at the end
const s = G.newGame(1);
s.grid.fill('grass');
const W = G.W;
// one player: no real draw; a click at tile 0 takes the 12x12 square in the corner (x 0..11, y 0..11)
assert.strictEqual(G.act(s, 'A', 'claim', 0), 'сначала нажмите «Начать игру»');
assert.strictEqual(G.start(s, ['A']), null);
assert.strictEqual(G.act(s, 'A', 'claim', 0), null);
assert.strictEqual(s.phase, 'play');
s.players.A.res = { money: 9999, wood: 999, stone: 999, food: 50, iron: 0, gold: 0, ironbar: 999, asphalt: 999 };
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
// shop or park, power plant next door (noisy, but 2 tiles off its smoke is under DIRTY): room for 24 * (0.4 + 0.6 * 3/7)
const A = s.players.A;
assert.strictEqual(G.tierOf(s, 4), 3);
assert.strictEqual(A.cap, 16);
assert.ok(A.pop >= 1 && A.pop <= A.cap, 'people move in gradually'); // the first newcomers
// that tick's change: tax TAX_BASE per resident minus plant (3) and pump (2) upkeep; residents eat 0.2 each (with the side studies' bonuses)
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, a + ' ≈ ' + b);
near(A.delta.money, A.pop * G.TAX_BASE * 1.2 - 3 - 2); // normal taxes; banks: +20%
near(A.delta.food, -A.pop * 0.2 * 0.8); // preserving: 20% less food
// now the residents have 0 jobs, so the jobs need fails too
assert.deepStrictEqual(G.wants(s, 4), { food: true, jobs: false, work: false, shop: false, park: false, quiet: false, air: true });
s.grid[W * 2 + 7] = 'park'; s.grid[W * 2 + 9] = 'shop'; // the shop is 5 tiles away: counts as a shop nearby, too far to walk to as a job
assert.strictEqual(G.happiness(s, 4), 4 / 7);
// dirty air: right next to a factory the home loses that want, and the town gets more epidemics
s.grid[W * 2 + 5] = 'ind';
assert.strictEqual(G.wants(s, 4).air, false);
assert.strictEqual(G.dirtyShare(s, 'A'), 1);
s.grid[W * 2 + 5] = 'grass';
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
assert.strictEqual(G.actArea(s, 'A', 'house', 30, 31), 'выделять областью можно только зоны, расчистку, улучшение зданий и покупку земли');
// zone lots accept a road up to 3 tiles away, plain buildings need it adjacent (road is row 1)
s.grid[4 * W + 3] = 'zres'; s.grid[5 * W + 3] = 'zres'; s.grid[4 * W + 1] = 'farm';
const st = G.compute(s);
assert.ok(!st[4 * W + 3].includes('r') && st[5 * W + 3].includes('r') && st[4 * W + 1].includes('r'));
// a residential lot costs the lot and every home step up to the era's tier, so rebuilding never beats upgrading
const lot = G.buildCost(s.players.A, 'zres');
assert.strictEqual(lot.money, G.B.zres.cost.money + G.HOME_TIERS.slice(1, G.maxTier(s.players.A) + 1).reduce((n, h) => n + h.cost.money, 0));
assert.deepStrictEqual(G.buildCost(s.players.A, 'zind'), G.B.zind.cost, 'other zones keep their price');
s.players.A.res.money = lot.money + 5; // enough for one lot
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
for (const n of ['A', 'B']) Object.assign(t.players[n], { level: 3, tech: G.allTech(), res: { ...t.players[n].res, asphalt: 99, money: 1e4, wood: 999, stone: 999, ironbar: 99 } });
assert.strictEqual(t.phase, 'play');
assert.strictEqual(G.actArea(t, 'A', 'buy', 11, 12), 'в выделении есть чужая земля');
G.act(t, 'A', 'road', W + 10); G.act(t, 'A', 'plant', 10); G.act(t, 'A', 'power', 11);
G.act(t, 'B', 'road', W + 13); G.act(t, 'B', 'house', 13); // A's line at x 11 and B's at x 12 touch across the border
G.act(t, 'B', 'power', 12);
assert.ok(G.compute(t)[13].includes('p'), 'power must not cross into B');
t.players.B.res.iron = 50; t.players.B.res.ironbar = 50; t.hl[13] = 2; // a brick house is not modern: it lives without power and water in any era
assert.ok(!/[pw]/.test(G.compute(t)[13]), 'old homes need no utilities');
assert.strictEqual(G.act(t, 'B', 'improve', 13), null);
assert.ok(/p/.test(G.compute(t)[13]) && /w/.test(G.compute(t)[13]), 'the block of flats needs power and water');
G.act(t, 'B', 'farm', 14 + W * 2); G.act(t, 'B', 'road', 14 + W);
assert.ok(!/[pw]/.test(G.compute(t)[14 + W * 2]), 'other buildings never need them');
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
assert.strictEqual(G.act(v, 'V', 'upgrade', 0), 'для эпохи «Средневековье» нужно изучить: Письменность, Ремёсла, Община');
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
// market and clearing: trading needs a working market building
assert.strictEqual(G.trade(v, 'V', 'wood', 10), 'сначала постройте работающий рынок');
assert.strictEqual(G.act(v, 'V', 'path', 9), null); assert.strictEqual(G.act(v, 'V', 'market', 8), null);
V.res.money += 120; V.res.wood += 30; V.res.stone += 10; // the market's cost, so the sums below stay as they were
v.status = G.compute(v);
assert.strictEqual(G.trade(v, 'V', 'wood', 10), null);
assert.ok(G.mkOf(v, 'wood') > 1.03 && G.priceOf(v, V, 'wood') > 4, 'buying makes wood dearer');
const k0 = G.mkOf(v, 'wood'); G.tick(v); v.status = G.compute(v);
assert.ok(G.mkOf(v, 'wood') < k0, 'and the price drifts back'); v.mk = {};
assert.strictEqual(V.res.wood, 40 - 10 + 10); assert.strictEqual(Math.round(V.res.money), Math.round(700 - 100 - 3 - 1 - 40 + (V.delta.money || 0))); // shop 100 (+10 wood), 1 tile of land 3, then 10 wood at 4
assert.strictEqual(G.trade(v, 'V', 'gold', 1), 'неверная сделка');
assert.strictEqual(G.trade(v, 'V', 'food', 1.5), 'неверная сделка');
assert.strictEqual(G.trade(v, 'V', 'stone', 1000), 'не хватает денег: нужно 6000'); v.mk = {};
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
V.res.iron = 2; V.tech.globaltrade = true; v.mk = {}; // global trade sells 1.5 times dearer
assert.strictEqual(G.trade(v, 'V', 'iron', 2, true), null);
assert.strictEqual(V.res.money, m1 + 75 + 45);
assert.strictEqual(G.trade(v, 'V', 'iron', 1, true), 'не хватает железной руды');
V.pop = 120; V.res.money = 5000;
assert.strictEqual(G.act(v, 'V', 'upgrade', 0), 'для эпохи «Индустриальная эпоха» нужно 20 железной руды');
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
for (let k = 0; k < 8; k++) r.step();
assert.strictEqual(r.s.tick, 0, 'no time passes in the lobby');
assert.strictEqual(r.handle('Аня', { type: 'start' }), null);
assert.deepStrictEqual([...r.s.order].sort(), ['Аня', 'Боря']);
r.leave(r.s.order[0] === 'Аня' ? 'a' : 'b');
assert.strictEqual(r.step(), true);
assert.strictEqual(r.s.turn, 1, 'the player who left was skipped');
assert.strictEqual(r.s.tick, 0, 'nor while the land is being picked');
assert.strictEqual(r.handle('x', { type: 'nope' }), 'неизвестная команда');
assert.strictEqual(r.handle('Аня', { type: 'restart' }), null);
assert.strictEqual(r.s.phase, 'lobby'); assert.strictEqual(r.log[0], 'Аня: новый город');
// goods travel by truck: a farm fills its stock, without a depot nothing leaves, with one the load arrives later
const d = G.newGame(6);
d.grid.fill('grass');
G.start(d, ['D']); G.act(d, 'D', 'claim', 0);
const DP = d.players.D;
DP.res = { money: 1e5, wood: 1e3, stone: 1e3, food: 100, iron: 0, gold: 0, asphalt: 99, oil: 99, fuel: 99 }; DP.tech = G.allTech(); delete DP.tech.logistics; // oil keeps the asphalt in repair, fuel runs the trucks; logistics is tested below
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
assert.deepStrictEqual([sh.res, sh.from, sh.to, sh.at - sh.t0], ['food', W + 3, W + 10, 2]); // a truck: 7 tiles at 4 per tick
assert.ok(sh.n >= G.LOAD && sh.n <= G.TRUCK_LOAD, 'it takes what the farm has, up to a truck load');
for (let k = 0; k < 2; k++) G.tick(d);
assert.ok(DP.flow.food.some(([what, v]) => what.startsWith('Привезли') && v === sh.n), 'the load arrived on the 2nd tick');
assert.ok(!d.ships.some(x => x.id === sh.id));
d.ships = []; d.stock[3] = G.LOAD - 1; G.tick(d); // a truck takes what there is, from a cart load up
assert.ok(d.ships.length === 1 && d.ships[0].n >= G.LOAD && d.ships[0].n < G.TRUCK_LOAD, 'a part load goes too');
// logistics: a building's loads go to the depot the player chose, not the nearest one
assert.strictEqual(G.act(d, 'D', 'depot', 11), null);
assert.strictEqual(G.setRoute(d, 'D', 3, 4), 'возить можно только на свой склад');
assert.strictEqual(G.setRoute(d, 'D', 10, 11), 'это здание ничего не возит');
assert.strictEqual(G.setRoute(d, 'D', 3, 11), null);
d.ships = []; d.stock[3] = G.LOAD; G.tick(d);
assert.strictEqual(d.ships[0].dest, 11, 'the farm ships to its chosen depot');
assert.strictEqual(G.setRoute(d, 'D', 3, -1), null);
d.ships = []; d.stock[3] = G.LOAD; G.tick(d);
assert.strictEqual(d.ships[0].dest, 10, 'no choice: the nearest depot');
G.setRoute(d, 'D', 3, 11); d.grid[11] = 'grass'; G.tick(d);
assert.ok(!(d.route || {})[3], 'the chosen depot is gone: the choice goes too');
// depots: the town holds BASE_CAP of each resource, every depot DEPOT_CAP more; a load that doesn't fit waits
assert.strictEqual(G.capOf(d, 'D'), G.BASE_CAP + G.DEPOT_CAP);
d.ships = []; DP.res.food = G.capOf(d, 'D') - 4; d.stock[3] = G.LOAD; G.tick(d);
assert.ok(d.full.includes(3) && !d.ships.length, 'full depots: the farm keeps its load');
DP.res.food = 0; d.stock[3] = G.LOAD; G.tick(d);
assert.ok(!d.full.includes(3) && d.ships.length === 1, 'room again: it goes');
// demographics: kids grow up with school if there are seats, the university gives degrees, hospitals halve deaths
const dm = { kids: 30, none: 0, school: 80, higher: 0, old: 50 };
G.demographics(dm, G.popOf(dm), { school: 1, uni: 1, hospital: 1 }, 1); // homes exactly full: nobody arrives or leaves
assert.ok(dm.none < 1e-9 && dm.school > 78, 'the grown-up kid went to school');
assert.ok(dm.higher > 1.4, 'the university turned out graduates');
const dn = { kids: 30, none: 0, school: 0, higher: 0, old: 50 };
G.demographics(dn, G.popOf(dn), {}, 1);
assert.ok(dn.none > 0.99 && dn.school === 0, 'no school: kids grow up without education');
assert.ok(dn.old < dm.old, 'without a hospital more pensioners die');
const de = { kids: 0, none: 10, school: 0, higher: 0, old: 0 };
G.demographics(de, 100, {}, 1);
assert.ok(de.none > 10 && de.school === 0 && de.higher === 0, 'newcomers have no education without schools');
G.demographics(de, 200, { school: 1 }, 1);
assert.ok(de.school > 0 && de.higher === 0, 'with a school some come schooled, without a university nobody has a degree');
// production chain: a factory makes furniture from wood, trucks take it to the depot, then to the shop, which sells it
const f = G.newGame(8);
f.grid.fill('grass');
G.start(f, ['F']); G.act(f, 'F', 'claim', 0);
const FP = f.players.F;
FP.level = 2; FP.tech = G.allTech(); FP.res = { money: 1e5, wood: 500, stone: 1e3, food: 500, iron: 0, gold: 0, asphalt: 99, oil: 99, fuel: 99 }; // fuel for the trucks
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
// the metallurgical plant turns ore from the stock into bars, iron or gold as set
FP.res.fuel = 99; f.ships = []; f.stock = {};
f.grid[9] = 'grass'; assert.strictEqual(G.act(f, 'F', 'smelter', 9), null);
assert.strictEqual(G.setSpec(f, 'F', 9, 'silverbar'), 'неизвестный металл');
FP.res.iron = 40; FP.res.gold = 0; FP.res.ironbar = 0;
for (let k = 0; k < 40; k++) G.tick(f);
assert.ok(FP.res.iron < 40 && FP.flow.iron.some(([w]) => w === 'Заводы берут сырьё') || FP.res.ironbar > 0, 'iron ore goes into bars');
assert.ok(FP.res.ironbar > 0 || f.ships.some(x => x.res === 'ironbar'), 'iron bars reach the depot');
assert.strictEqual(G.setSpec(f, 'F', 9, 'goldbar'), null);
FP.res.iron = 0; FP.res.gold = 10; f.stock[9] = 0;
G.tick(f); G.tick(f);
assert.ok(FP.res.gold < 10, 'now it takes gold');
assert.ok(f.starved.includes(9) || FP.res.gold > 0, 'little ore: the plant runs short');
// trucks burn fuel; a level-up gives a depot more room
assert.ok(FP.flow.fuel.some(([w, v]) => w.startsWith('Грузовики') && v < 0) || FP.res.fuel < 99, 'trucks burn fuel');
assert.strictEqual(G.depotCap(f, 10), G.DEPOT_CAP * G.PROD_K[G.blOf(f, 10)]);
FP.level = 3; FP.res.ironbar = 99; const cap0 = G.capOf(f, 'F');
assert.strictEqual(G.act(f, 'F', 'improve', 10), null);
assert.strictEqual(G.capOf(f, 'F') - cap0, Math.round(G.DEPOT_CAP * G.PROD_K[G.blOf(f, 10)]) - Math.round(G.DEPOT_CAP * G.PROD_K[G.blOf(f, 10) - 1]), 'the better depot holds more');
// no fuel: the loads wait for horses
FP.res.fuel = 0; f.ships = []; f.stock[3] = G.LOAD; FP.res.furniture = 0; G.tick(f);
assert.ok(!f.ships.some(x => !x.horse) && f.noHorse.includes(3), 'no fuel, no trucks');
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
assert.strictEqual(h.ships.length, 1, 'any free horse takes the load');
assert.deepStrictEqual([G.horseUse(h, 'H').busy, G.horseUse(h, 'H').free], [1, 0]);
assert.strictEqual(h.ships[0].src, 2, 'the cart belongs to the farm');
assert.strictEqual(h.ships[0].n, G.LOAD, 'a cart takes a cart load');
h.stock[2] = G.LOAD; G.tick(h);
assert.ok(h.ships.length === 1 && h.noHorse.includes(2), 'its only horse is on the road: the next load waits');
assert.ok(h.ships[0].horse && h.ships[0].at - h.ships[0].t0 === 8, 'a cart over 8 path tiles takes 8 ticks'); // 16 cost units at 2 per tick
// livestock farms raise horses, two per farm at most
assert.strictEqual(G.setSpec(h, 'H', 2, 'livestock'), null);
HP.demo = { kids: 0, none: 40, school: 0, higher: 0, old: 0 }; // enough farm hands
for (let k = 0; k < 200; k++) G.tick(h);
assert.strictEqual(HP.res.horses, G.HORSES_PER_FARM, 'the herd stops at two');
// the livestock farm ships its food with its own carts even with no free horse
HP.res.horses = 0; h.ships = []; h.stock[2] = G.LOAD;
G.tick(h);
assert.ok(h.ships.length === 1 && h.ships[0].horse && h.ships[0].own && !h.noHorse.includes(2), 'own cart, no waiting');
HP.res.horses = 2;
assert.deepStrictEqual(G.horseUse(h, 'H'), { total: 2, trams: 0, carts: 0, busy: 0, free: 2, cap: 2 }, 'own carts keep the pool free');
// horses eat; hungry horses carry only food
HP.res.food = 50; G.tick(h);
assert.ok(HP.flow.food.some(([what, v]) => what.startsWith('Лошади едят') && Math.abs(v + 2 * G.HORSE_FOOD) < 1e-9), 'two horses eat');
h.grid[7] = 'tree'; G.act(h, 'H', 'sawmill', 5); h.status = G.compute(h);
HP.fed = false; HP.res.wood = 0; h.ships = []; h.stock[5] = G.LOAD; G.tick(h);
assert.ok(h.noHorse.includes(5) && !h.ships.some(x => x.res === 'wood'), 'a hungry horse leaves the wood');
HP.res.wood = 1e3; h.grid[5] = h.grid[7] = 'grass';
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
HP.res.iron = 50; HP.res.ironbar = 50; HP.res.oil = 30;
assert.strictEqual(G.act(h, 'H', 'refinery', 9), null);
for (let k = 0; k < 10; k++) G.tick(h);
assert.ok(HP.res.oil < 30 && h.stock[9] > 0, 'the refinery turned oil into asphalt');
assert.strictEqual(G.setSpec(h, 'H', 9, 'gas'), 'НПЗ делает асфальт или топливо');
assert.strictEqual(G.setSpec(h, 'H', 9, 'fuel'), null);
h.stock[9] = 0; HP.res.oil = 30; G.tick(h);
assert.ok(HP.res.oil < 30 && h.stock[9] > 0 && (h.spec || {})[9] === 'fuel', 'now it makes fuel');
assert.strictEqual(G.act(h, 'H', 'road', W + 5), 'не хватает асфальта');
HP.res.asphalt = 1;
assert.strictEqual(G.act(h, 'H', 'road', W + 5), null);
assert.strictEqual(h.grid[W + 5], 'road');
// home tiers: a home is built at the era's tier and older homes can be raised to it
const hm = G.newGame(11);
hm.grid.fill('grass');
G.start(hm, ['M']); G.act(hm, 'M', 'claim', 0);
const MP = hm.players.M;
MP.tech = G.allTech(); MP.tech.skyscrapers = false; MP.res = { ...MP.res, money: 1e5, wood: 1e3, stone: 1e3, iron: 1e3, ironbar: 1e3, goldbar: 1e3 };
assert.strictEqual(G.act(hm, 'M', 'house', 5), null);
assert.strictEqual(G.tierOf(hm, 5), 0, 'Древность builds huts');
assert.strictEqual(G.homeCap(hm, 5), 4);
assert.strictEqual(G.act(hm, 'M', 'improve', 5), '«Фахверковый дом» появится в эпоху «Средневековье»');
MP.level = 1;
const mm = MP.res.money;
assert.strictEqual(G.act(hm, 'M', 'improve', 5), null);
assert.deepStrictEqual([G.tierOf(hm, 5), G.homeCap(hm, 5), MP.res.money], [1, 8, mm - 40]);
assert.strictEqual(G.act(hm, 'M', 'improve', 6), 'улучшать можно жилые дома и производства');
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

// production buildings: built at the era's level, raised later; each level makes more
const lv = G.newGame(13);
lv.grid.fill('grass');
G.start(lv, ['L']); G.act(lv, 'L', 'claim', 0);
const LP = lv.players.L;
LP.res = { ...LP.res, money: 1e5, wood: 1e3, stone: 1e3, iron: 1e3, ironbar: 1e3, goldbar: 1e3 }; LP.tech = G.allTech();
assert.strictEqual(G.act(lv, 'L', 'sawmill', 2), null);
assert.strictEqual(G.blOf(lv, 2), 0, 'built in Antiquity: level 1');
assert.strictEqual(G.act(lv, 'L', 'improve', 2), 'уровень 2 откроется в эпоху «Средневековье»');
LP.level = 2;
const m2 = LP.res.money;
assert.strictEqual(G.act(lv, 'L', 'improve', 2), null);
assert.strictEqual(G.blOf(lv, 2), 1); assert.strictEqual(LP.res.money, m2 - G.upCost('sawmill', 1).money);
assert.strictEqual(G.act(lv, 'L', 'sawmill', 3), null);
assert.strictEqual(G.blOf(lv, 3), 2, 'a new one comes at the era level');
assert.strictEqual(G.act(lv, 'L', 'improve', 3), 'уровень 4 откроется в эпоху «Новое время»');
assert.ok(G.prodK(lv, 3) > G.prodK(lv, 2) && G.prodK(lv, 2) > 1, 'higher level, more output');
assert.ok(G.canImprove(lv, 2, LP) && !G.canImprove(lv, 3, LP));
assert.deepStrictEqual(G.improveCost(lv, 2, LP), G.upCost('sawmill', 2));
LP.level = 4;
assert.strictEqual(G.actArea(lv, 'L', 'improve', 2, 3), null);
assert.ok(G.blOf(lv, 2) === 4 && G.blOf(lv, 3) === 4, 'the area goes to the top level');
assert.strictEqual(G.act(lv, 'L', 'improve', 2), 'это здание уже на последнем уровне');
// the level multiplies a farm's food
const fk = (lvl) => { const f = G.newGame(14); f.grid.fill('grass'); G.start(f, ['F']); G.act(f, 'F', 'claim', 0); const P2 = f.players.F;
  P2.res = { ...P2.res, money: 1e4, wood: 100 }; P2.tech = G.allTech(); P2.level = lvl; P2.demo = { kids: 0, none: 40, school: 0, higher: 0, old: 0 };
  G.act(f, 'F', 'path', W + 2); G.act(f, 'F', 'path', W + 3); G.act(f, 'F', 'farm', 2); G.act(f, 'F', 'house', 3); // the house gives farm hands
  f.hl[3] = 0; f.stock = {}; G.tick(f); return f.stock[2] || 0; };
assert.ok(Math.abs(fk(2) / fk(0) - G.PROD_K[2]) < 0.01, 'a level-3 farm makes 1.8 times the food');
assert.strictEqual(G.act(lv, 'L', 'bulldoze', 2), null); G.tick(lv);
assert.ok(!(2 in lv.bl), 'a demolished building forgets its level');

// cobblestone costs stone to keep, asphalt costs oil; unpaid roads are as slow as a path
const rd = G.newGame(15);
rd.grid.fill('grass');
G.start(rd, ['R']); G.act(rd, 'R', 'claim', 0);
const RP = rd.players.R;
RP.res = { ...RP.res, money: 1e4, stone: 100, asphalt: 50, oil: 0 }; RP.tech = G.allTech();
assert.strictEqual(G.act(rd, 'R', 'path', 1), null);
assert.strictEqual(G.act(rd, 'R', 'cobble', 1), null, 'cobblestone goes over a path');
assert.strictEqual(G.act(rd, 'R', 'cobble', 2), null);
assert.strictEqual(G.act(rd, 'R', 'road', 3), null);
assert.strictEqual(G.act(rd, 'R', 'road', 2), null, 'asphalt goes over cobblestone');
assert.strictEqual(G.act(rd, 'R', 'cobble', 2), 'клетка занята');
const st0 = RP.res.stone; G.tick(rd);
assert.ok(Math.abs(st0 - RP.res.stone - 0.01) < 1e-9, 'one cobblestone tile takes 0.01 stone a tick');
assert.ok(RP.worn.road && !RP.worn.cobble, 'no oil: the asphalt wears out');
assert.ok(G.slowAt(rd, 2) && !G.slowAt(rd, 1));
RP.res.oil = 5; G.tick(rd);
assert.ok(!RP.worn.road && !G.slowAt(rd, 2), 'with oil it is repaired');

// research is a tree: a study may need several others, from other branches too; side branches are optional for eras
const tr = G.newGame(16);
tr.grid.fill('grass');
G.start(tr, ['T']); G.act(tr, 'T', 'claim', 0);
const TP = tr.players.T;
TP.level = 2; TP.tech = { explore: true, writing: true, crafts: true, community: true };
assert.deepStrictEqual(G.techOf('trade').req, ['explore'], 'the main line needs the study before it');
assert.strictEqual(G.setResearch(tr, 'T', 'printing'), 'сначала изучите «Школы»');
assert.strictEqual(G.setResearch(tr, 'T', 'preserving'), 'сначала изучите «Почта и конка» и «Орошение»', 'two branches meet');
assert.strictEqual(G.setResearch(tr, 'T', 'irrigation'), null);
TP.level = 1; TP.pop = 1e3; TP.res.money = 1e5; TP.res.iron = 100;
Object.assign(TP.tech, { trade: true, mechanics: true, schools: true, architecture: true, post: true });
assert.strictEqual(G.upgradeBlock(TP), null, 'no side study is needed for the next era');
assert.strictEqual(G.horsesPerFarm(TP), 2); TP.tech.breeding = true; assert.strictEqual(G.horsesPerFarm(TP), 3, 'breeding: three horses a farm');
assert.ok(G.TECH.every(t => t.req.every(r => G.techOf(r) && G.techOf(r).era <= t.era)), 'every study needs only known, not later ones');

// events: a fire burns a building down unless a well (or a fire station) is near; epidemics kill fewer with healers
const ev = G.newGame(17);
ev.grid.fill('grass');
G.start(ev, ['E']); G.act(ev, 'E', 'claim', 0);
const EP = ev.players.E;
EP.res = { ...EP.res, money: 1e5, wood: 1e3, stone: 1e3, iron: 1e3, ironbar: 1e3, goldbar: 1e3 }; EP.tech = G.allTech();
G.act(ev, 'E', 'path', W + 1); G.act(ev, 'E', 'farm', 1); G.act(ev, 'E', 'sawmill', 11);
ev.events = []; G.startFire(ev, 1);
assert.ok(G.compute(ev)[1].includes('f'), 'a burning building does not work');
for (let k = 0; k < G.FIRE_T; k++) G.tick(ev);
assert.strictEqual(ev.grid[1], 'grass', 'no well: the farm burned down');
assert.strictEqual(G.act(ev, 'E', 'firewell', 9), null);
ev.events = []; G.startFire(ev, 11); for (let k = 0; k < G.FIRE_PUT - 1; k++) G.tick(ev);
assert.ok(11 in ev.fire, 'still burning while the buckets come');
G.tick(ev);
assert.ok(ev.grid[11] === 'sawmill' && !(11 in ev.fire), 'the well put it out in FIRE_PUT ticks');
assert.strictEqual(G.act(ev, 'E', 'firestation', 1), null); // next to the path
assert.ok(G.covered(ev, 11 * W + 11), 'a fire station reaches 12 tiles'); // the station stands at (1, 0)
assert.ok(!G.covered(ev, 13 * W + 13), 'and no further');
// epidemics: healers and hospitals save a share of the sick
assert.strictEqual(G.cureOf({}, 100), 0);
assert.strictEqual(G.cureOf({ healer: 1 }, 40), 0.5, 'a healer saves half of his 40');
assert.strictEqual(G.cureOf({ hospital: 1 }, 150), 0.9, 'a hospital saves 90% of its 150');
EP.demo = { kids: 0, none: 100, school: 0, higher: 0, old: 0 }; EP.sick = 5; G.tick(ev);
assert.ok(EP.died > 0 && EP.sick === 4, 'the epidemic kills and wears off');
EP.sick = 6; EP.cure = 0.5; G.tick(ev);
assert.strictEqual(EP.sick, 4.5, 'half the sick treated: it wears off 1.5 ticks a tick');
assert.strictEqual(G.sickLeft({ sick: 9, cure: 0.5 }), 6);
assert.strictEqual(G.sickLeft({ sick: G.SICK_T, cure: 0 }), G.SICK_T, 'untreated it runs its full length');
const workersSick = EP.workers; EP.sick = 0; EP.demo = { kids: 0, none: 100, school: 0, higher: 0, old: 0 }; G.tick(ev);
assert.ok(!workersSick || EP.workers >= workersSick, 'the sick stay off work');
// drought: farms give DROUGHT_K of their food, with irrigation DROUGHT_IRR
const fd = (dr, irr) => { const f = G.newGame(18); f.grid.fill('grass'); G.start(f, ['F']); G.act(f, 'F', 'claim', 0); const P3 = f.players.F;
  P3.res = { ...P3.res, money: 1e4, wood: 100 }; P3.tech = G.allTech(); if (!irr) delete P3.tech.irrigation; P3.demo = { kids: 0, none: 40, school: 0, higher: 0, old: 0 };
  G.act(f, 'F', 'path', W + 2); G.act(f, 'F', 'path', W + 3); G.act(f, 'F', 'farm', 2); G.act(f, 'F', 'house', 3); f.hl[3] = 0; f.bl[2] = 0;
  P3.drought = dr ? 10 : 0; f.stock = {}; G.tick(f); return f.stock[2]; };
assert.ok(Math.abs(fd(true, false) / fd(false, false) - G.DROUGHT_K) < 0.01, 'a drought cuts the food');
assert.ok(Math.abs(fd(true, true) / fd(false, true) - G.DROUGHT_IRR) < 0.01, 'irrigation cuts the loss');
// a disaster takes one or two buildings, sturdy buildings at most one
const dz = G.newGame(19); dz.grid.fill('grass'); G.start(dz, ['Z']); G.act(dz, 'Z', 'claim', 0); const ZP = dz.players.Z;
ZP.res = { ...ZP.res, money: 1e5, wood: 1e3, stone: 1e3 }; ZP.tech = {};
for (let k = 0; k < 6; k++) dz.grid[k] = 'farm';
dz.events = []; G.disaster(dz, 'Z', ZP, () => 0.1); // the roll asks for two
assert.strictEqual(dz.grid.slice(0, 6).filter(t => t === 'farm').length, 4, 'two buildings fell');
ZP.tech.seismic = true; G.disaster(dz, 'Z', ZP, () => 0.9);
assert.strictEqual(dz.grid.slice(0, 6).filter(t => t === 'farm').length, 3, 'sturdy: at most one');
console.log('ok');

// every upgrade costs exactly the price its button shows (upCost): with just that much it goes through and leaves nothing
for (const t of Object.keys(G.UPGRADE)) for (let L = 1; L < G.PROD_K.length; L++) {
  const u = G.newGame(1); u.grid.fill('grass'); G.start(u, ['U']); G.act(u, 'U', 'claim', 0);
  const UP = u.players.U, c = G.upCost(t, L);
  UP.level = L; UP.tech = G.allTech(); u.grid[5] = t; u.bl = { 5: L - 1 };
  for (const k in UP.res) UP.res[k] = 0;
  Object.assign(UP.res, c);
  assert.strictEqual(G.act(u, 'U', 'improve', 5), null, `${t} to level ${L + 1}`);
  assert.ok(Object.keys(c).every(k => UP.res[k] === 0), `${t} to level ${L + 1} takes its price`);
}
console.log('ok');

// a quarry goes on the rocks themselves and leaves them when knocked down; islands get no deposits or rocks
const qz = G.newGame(21); qz.grid.fill('grass'); G.start(qz, ['Q']); G.act(qz, 'Q', 'claim', 0);
qz.players.Q.res = { ...qz.players.Q.res, money: 1e4, wood: 100 };
qz.grid[3] = 'rock';
assert.strictEqual(G.act(qz, 'Q', 'quarry', 2), 'каменоломня ставится прямо на камни');
assert.strictEqual(G.act(qz, 'Q', 'quarry', 3), null);
assert.strictEqual(G.act(qz, 'Q', 'bulldoze', 3), null);
assert.strictEqual(qz.grid[3], 'rock');
for (let seed = 1; seed < 12; seed++) {
  const m = G.newGame(seed), part = new Int32Array(W * G.H).fill(-1), size = [];
  for (let i = 0; i < m.grid.length; i++) {
    if (m.grid[i] === 'lake' || part[i] >= 0) continue;
    const q = [i]; part[i] = size.length; let n = 0;
    while (q.length) { const k = q.pop(); n++; for (const j of [k - 1, k + 1, k - W, k + W]) if (j >= 0 && j < m.grid.length && Math.abs(j % W - k % W) <= 1 && m.grid[j] !== 'lake' && part[j] < 0) { part[j] = size.length; q.push(j); } }
    size.push(n);
  }
  const main = size.indexOf(Math.max(...size));
  assert.ok(m.grid.every((t, i) => part[i] === main || !['iron', 'gold', 'oil', 'rock'].includes(t)), `map ${seed}: nothing to mine on an island`);
}
console.log('ok');

// taxes: 0..200% of the normal rate; dearer taxes bring more money and fewer residents
const tx = G.room(G.newGame(22)); tx.join('t', 'T'); tx.handle('T', { type: 'start' });
const tt = tx.s; tt.grid.fill('grass'); G.act(tt, 'T', 'claim', 0);
assert.strictEqual(G.setTax(tt, 'T', 2.5), 'налог от 0 до 200%');
assert.strictEqual(G.setTax(tt, 'T', 'x'), 'налог от 0 до 200%');
assert.strictEqual(tx.handle('T', { type: 'tax', v: 1.52 }), null);
assert.strictEqual(tt.players.T.tax, 1.5, 'steps of 5%');
assert.ok(Math.abs(G.taxMood(tt.players.T) + 0.15) < 1e-9, '150%: happiness down by 0.15');
G.setTax(tt, 'T', 0); assert.ok(Math.abs(G.taxMood(tt.players.T) - G.TAX_MOOD) < 1e-9, 'no taxes: happier');
const taxed = v => { const g = G.newGame(23); g.grid.fill('grass'); G.start(g, ['P']); G.act(g, 'P', 'claim', 0); const P4 = g.players.P;
  P4.res = { ...P4.res, money: 1e4, wood: 999, stone: 999 }; P4.tech = {}; P4.tax = v; P4.demo = { kids: 0, none: 20, school: 0, higher: 0, old: 0 };
  for (let x = 0; x < 6; x++) G.act(g, 'P', 'path', W + x);
  for (let x = 0; x < 6; x++) g.grid[x] = 'zres';
  for (let k = 0; k < 40; k++) G.tick(g);
  return [P4.flow.money.find(([w]) => w.startsWith('Налоги'))[1] / Math.max(1, P4.pop), P4.happy]; };
const [low, lowHap] = taxed(0.5), [high, highHap] = taxed(1.5);
assert.ok(Math.abs(high / low - 3) < 0.01, 'three times the rate, three times the tax per resident');
assert.ok(highHap < lowHap, 'high taxes, unhappier town');
console.log('ok');

// happiness drives production: 81–100% ×1.5, 71–80 ×1.2, 51–70 ×1, 31–50 ×0.5, 10–30 ×0.2
assert.deepStrictEqual([100, 81, 80, 71, 70, 51, 50, 31, 30, 10].map(G.moodK), [1.5, 1.5, 1.2, 1.2, 1, 1, 0.5, 0.5, 0.2, 0.2]);
assert.strictEqual(G.strikeP(50), 0, 'no strikes above 49%');
assert.ok(G.strikeP(49) > 0 && G.strikeP(10) > G.strikeP(40), 'the unhappier, the likelier a strike');
// a strike stops every building of its kind; very unhappy for LOSE_T ticks, the town is lost
const mt = G.newGame(24); mt.grid.fill('grass'); G.start(mt, ['M']); G.act(mt, 'M', 'claim', 0); const MP2 = mt.players.M;
MP2.res = { ...MP2.res, money: 1e5, wood: 999, stone: 999, food: 0 }; MP2.tech = { crafts: true }; MP2.tax = 2;
for (let x = 0; x < 8; x++) G.act(mt, 'M', 'path', W + x);
G.act(mt, 'M', 'farm', 0); G.act(mt, 'M', 'farm', 1);
for (let x = 2; x < 8; x++) G.act(mt, 'M', 'house', x);
MP2.demo = { kids: 0, none: 30, school: 0, higher: 0, old: 0 };
MP2.strike = { t: 'farm', left: 3 }; mt.stock = {}; G.tick(mt);
assert.ok(!mt.stock[0] && !mt.stock[1], 'striking farms make nothing');
assert.strictEqual(MP2.strike.left, 2);
for (let k = 0; k < G.LOSE_T + 2 && !MP2.lost; k++) { MP2.demo = { kids: 0, none: 30, school: 0, higher: 0, old: 0 }; MP2.res.food = 0; G.tick(mt); }
assert.ok(MP2.lost, `taxed at 200% with nothing to live for, the town rises (happiness ${Math.round(MP2.happy * 100)}%)`);
assert.strictEqual(G.act(mt, 'M', 'path', W + 9), 'жители восстали — начните новый город');
console.log('ok');

// the first depot needs no wood (wood only comes in through a depot); the next ones do
const dp = G.newGame(25); dp.grid.fill('grass'); G.start(dp, ['D']); G.act(dp, 'D', 'claim', 0);
dp.players.D.res = { ...dp.players.D.res, money: 1e4, wood: 0 };
for (let x = 0; x < 6; x++) G.act(dp, 'D', 'path', W + x);
assert.deepStrictEqual(G.buildCost(dp.players.D, 'depot', dp, 'D'), { money: G.B.depot.cost.money });
assert.strictEqual(G.act(dp, 'D', 'depot', 1), null, 'the first one without wood');
assert.strictEqual(G.act(dp, 'D', 'depot', 3), 'не хватает дерева', 'the second one needs it');
console.log('ok');
