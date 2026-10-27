// Run: node server.js  → open http://localhost:3000 (others on the LAN use the printed address)
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const G = require('./game');
const PORT = process.env.PORT || 3000, SAVE = path.join(__dirname, 'city.json');

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

setInterval(() => { if (R.step()) { broadcast(); if (R.s.tick % 5 === 0) save(); } }, 500);

const send = (res, type, file) => { res.writeHead(200, { 'Content-Type': type }); fs.createReadStream(path.join(__dirname, file)).pipe(res); };

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/') return send(res, 'text/html; charset=utf-8', 'index.html');
  if (u.pathname === '/game.js') return send(res, 'text/javascript; charset=utf-8', 'game.js');
  if (/^\/icons\/[a-z]+\.svg$/.test(u.pathname)) { // name pattern keeps requests inside icons/
    if (!fs.existsSync(path.join(__dirname, u.pathname))) return res.writeHead(404).end();
    return send(res, 'image/svg+xml', u.pathname);
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
}).listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
  for (const n of Object.values(os.networkInterfaces()).flat())
    if (n.family === 'IPv4' && !n.internal) console.log(`http://${n.address}:${PORT}  (для других игроков в сети)`);
});
process.on('SIGINT', () => { fs.writeFileSync(SAVE, JSON.stringify(R.s)); process.exit(); });
