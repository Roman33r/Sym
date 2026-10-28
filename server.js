// Run: node server.js  → open http://localhost:3000 (others on the LAN use the printed address).
// The desktop app (electron/main.js) requires this file and calls start() itself.
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const G = require('./game');
const PORT = +process.env.PORT || 3000, SAVE = process.env.CITY_SAVE || path.join(__dirname, 'city.json'); // the app keeps saves in its user data folder

let s;
try { s = JSON.parse(fs.readFileSync(SAVE, 'utf8')); } catch {}
if (!s || s.grid.length !== G.W * G.H || !s.owner) s = G.newGame(); // saves from another map size or the old plot system start over
s.status = G.compute(s);
const R = G.room(s), clients = new Map(); // SSE response -> connection id
let ids = 0;

function broadcast() {
  const msg = `data: ${JSON.stringify(R.view())}\n\n`;
  for (const r of clients.keys()) r.write(msg);
}
const save = () => fs.writeFile(SAVE, JSON.stringify(R.s), () => {});
const saveNow = () => fs.writeFileSync(SAVE, JSON.stringify(R.s));

setInterval(() => { if (R.step()) { broadcast(); if (R.s.tick % 5 === 0) save(); } }, 500);

const send = (res, type, file) => { res.writeHead(200, { 'Content-Type': type }); fs.createReadStream(path.join(__dirname, file)).pipe(res); };

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/') return send(res, 'text/html; charset=utf-8', 'index.html');
  if (u.pathname === '/game.js') return send(res, 'text/javascript; charset=utf-8', 'game.js');
  if (/^\/icons\/[a-z]+\.svg$/.test(u.pathname)) { // name pattern keeps requests inside icons/
    if (!fs.existsSync(path.join(__dirname, u.pathname))) return res.writeHead(404).end();
    return send(res, 'image/svg+xml', u.pathname);
  }
  if (/^\/textures\/[a-z0-9_]+\.(png|json)$/.test(u.pathname)) { // same for the map textures and their anchors
    if (!fs.existsSync(path.join(__dirname, u.pathname))) return res.writeHead(404).end();
    return send(res, u.pathname.endsWith('.png') ? 'image/png' : 'application/json', u.pathname);
  }
  if (u.pathname === '/hello') return res.writeHead(200).end('city'); // lets the page know a server is running here
  if (u.pathname === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
    const id = ++ids;
    clients.set(res, id); R.join(id, u.searchParams.get('name'));
    req.on('close', () => { clients.delete(res); R.leave(id); broadcast(); });
    return broadcast();
  }
  if (u.pathname === '/msg' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1000) req.destroy(); });
    req.on('end', () => {
      let a;
      try { a = JSON.parse(body); } catch { return res.writeHead(400).end(); }
      const restart = a.type === 'restart', err = R.handle(a.name, a);
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ err }));
      if (restart) save();
      broadcast(); // also after errors: an area can be partly placed before resources run out
    });
    return;
  }
  res.writeHead(404).end();
});

// is something already answering on this port? (Windows may let a second server bind it without an error)
const busy = port => new Promise(ok => {
  const c = require('net').connect(port, '127.0.0.1', () => { c.destroy(); ok(true); });
  c.on('error', () => ok(false));
});

// Listens on port, or the next free one if it is taken; resolves with the port and addresses for players on the LAN.
async function start(port = PORT, tries = 10) {
  while (tries-- > 1 && await busy(port)) port++;
  return new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(port, () => {
      const lan = Object.values(os.networkInterfaces()).flat().filter(n => n.family === 'IPv4' && !n.internal).map(n => `http://${n.address}:${port}`);
      ok({ port, lan });
    });
  });
}
module.exports = { start, saveNow };

if (require.main === module) {
  start().then(({ port, lan }) => {
    console.log(`http://localhost:${port}`);
    for (const u of lan) console.log(`${u}  (для других игроков в сети)`);
  });
  process.on('SIGINT', () => { saveNow(); process.exit(); });
}
