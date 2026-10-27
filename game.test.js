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
s.players.A.res = { money: 9999, wood: 999, stone: 999, food: 50, iron: 0, gold: 0 };
s.players.A.level = 2; // a city: all buildings and up to 1000 tiles, levels are tested separately below
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
// during the tick: food and jobs (0 >= 0) met; no workplace, shop or park, power plant next door: 8 * (0.4 + 0.6 * 2/6)
assert.strictEqual(s.players.A.pop, 5);
// that tick's change: tax 5 * 0.5 minus plant (3) and pump (2) upkeep; 5 residents eat 0.2 each
assert.strictEqual(s.players.A.delta.money, 5 * 0.5 - 3 - 2);
assert.strictEqual(s.players.A.delta.food, -5 * 0.2);
// now 5 residents have 0 jobs, so the jobs need fails too
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
assert.ok(s.players.A.pop >= 3 && s.players.A.pop <= 6,'zone home holds 40..100% of its 6 places');
// an office zone grows once there are free workers
assert.strictEqual(G.act(s, 'A', 'zoff', 5), null);
for (let k = 0; k < 50 && s.grid[5] !== 'off'; k++) G.tick(s);
assert.strictEqual(s.grid[5], 'off');
// area zoning skips occupied tiles: row 2 cols 0..6 holds 7 free grass tiles
assert.strictEqual(G.actArea(s, 'A', 'zind', 2 * W + 6, 2 * W), null);
assert.strictEqual(s.grid.slice(2 * W, 2 * W + 7).filter(t => t === 'zind').length, 7);
assert.strictEqual(G.actArea(s, 'A', 'zind', 2 * W, 2 * W + 6), 'нет свободных клеток на вашей земле');
assert.strictEqual(G.actArea(s, 'A', 'house', 30, 31), 'выделять областью можно только зоны, расчистку и покупку земли');
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
assert.strictEqual(G.act(v, 'V', 'shop', 5), 'откроется на уровне «Посёлок»');
assert.strictEqual(G.act(v, 'V', 'buy', 12), '«Деревня» может владеть не больше 144 кл. земли (сейчас 144) — повысьте уровень');
assert.strictEqual(G.act(v, 'V', 'upgrade', 0), 'для уровня «Посёлок» нужно 30 жителей');
V.pop = 30; V.res.money = 299;
assert.strictEqual(G.act(v, 'V', 'upgrade', 0), 'для уровня «Посёлок» нужно 300 денег');
V.res.money = 1000;
assert.strictEqual(G.act(v, 'V', 'upgrade', 0), null);
assert.strictEqual(V.level, 1); assert.strictEqual(V.res.money, 700);
assert.strictEqual(G.act(v, 'V', 'shop', 5), null);
assert.strictEqual(G.act(v, 'V', 'buy', 12), null);
assert.strictEqual(G.act(v, 'V', 'upgrade', 0), 'для уровня «Город» нужно 120 жителей');
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
V.res.iron = 5; const m1 = V.res.money;
assert.strictEqual(G.trade(v, 'V', 'iron', 5, true), null);
assert.strictEqual(V.res.money, m1 + 75); assert.strictEqual(V.res.iron, 0);
assert.strictEqual(G.trade(v, 'V', 'iron', 1, true), 'не хватает железа');
V.pop = 120; V.res.money = 5000;
assert.strictEqual(G.act(v, 'V', 'upgrade', 0), 'для уровня «Город» нужно 20 железа');
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
console.log('ok');
